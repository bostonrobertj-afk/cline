import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import fs from "fs/promises"
import path from "path"
import { completeStoryChecklistItem, resolveActiveStoryPath } from "@/core/task/story-tools/storyTaskDocument"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"

async function atomicReplaceTextFile(filePath: string, content: string): Promise<void> {
	const parentDir = path.dirname(filePath)
	const tempFilePath = path.join(parentDir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`)

	await fs.mkdir(parentDir, { recursive: true })

	try {
		await fs.writeFile(tempFilePath, content, "utf8")
		await fs.rename(tempFilePath, filePath)
	} catch (error) {
		try {
			await fs.unlink(tempFilePath)
		} catch {
			// Ignore temp-file cleanup failures.
		}
		throw error
	}
}

export function resolveStoryPathFromTaskState(
	config: TaskConfig,
): { storyPath: string; readablePath: string } | { errorMessage: string } {
	const resolvedStoryPath = resolveActiveStoryPath({
		cwd: config.cwd,
		workflowValues: config.taskState.activeWorkflowSession?.workflowValues,
	})
	if (!resolvedStoryPath.ok) {
		return { errorMessage: resolvedStoryPath.message }
	}

	return {
		storyPath: resolvedStoryPath.storyPath,
		readablePath: getReadablePath(config.cwd, resolvedStoryPath.storyPath),
	}
}

export async function runStoryWritePreToolHook(config: TaskConfig, block: ToolUse): Promise<ToolResponse | undefined> {
	try {
		const { ToolHookUtils } = await import("../utils/ToolHookUtils")
		await ToolHookUtils.runPreToolUseIfEnabled(config, block)
		return undefined
	} catch (error) {
		const { PreToolUseHookCancellationError } = await import("@core/hooks/PreToolUseHookCancellationError")
		if (error instanceof PreToolUseHookCancellationError) {
			return formatResponse.toolDenied()
		}
		throw error
	}
}

export async function buildStoryWriteCompleteMessage(args: {
	config: TaskConfig
	storyPath: string
	tool: string
	content: string
}): Promise<string> {
	return JSON.stringify({
		tool: args.tool,
		path: getReadablePath(args.config.cwd, args.storyPath),
		content: args.content,
		operationIsLocatedInWorkspace: await isLocatedInWorkspace(args.storyPath),
	})
}

export async function finalizeSuccessfulStoryWrite(args: {
	config: TaskConfig
	storyPath: string
	completeMessage: string
}): Promise<void> {
	args.config.taskState.fileReadCache.delete(args.storyPath.toLowerCase())
	args.config.taskState.didEditFile = true
	args.config.taskState.consecutiveMistakeCount = 0

	if (!args.config.isSubagentExecution) {
		await args.config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
		await args.config.callbacks.say("tool", args.completeMessage, undefined, undefined, false)
	}
}

export async function writeStoryFileWithRetry(args: { storyPath: string; updatedMarkdown: string }): Promise<boolean> {
	for (let attempt = 0; attempt < 2; attempt += 1) {
		await atomicReplaceTextFile(args.storyPath, args.updatedMarkdown)
		const readBackMarkdown = await fs.readFile(args.storyPath, "utf8")
		if (readBackMarkdown === args.updatedMarkdown) {
			return true
		}
	}

	return false
}

export async function askForManualStoryUpdate(args: {
	config: TaskConfig
	readablePath: string
	manualPatch: string
	failureIntro: string
}): Promise<void> {
	await args.config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
	await args.config.callbacks.ask(
		"followup",
		JSON.stringify({
			question: `${args.failureIntro}\n\nFile: ${args.readablePath}\n\nApply this exact manual update:\n${args.manualPatch}\n\nReply continue when the file has been updated.`,
			options: ["continue"],
		}),
		false,
	)
}

export class StoryTaskCompleteToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.STORY_TASK_COMPLETE

	getDescription(_block: ToolUse): string {
		return "[story_task_complete]"
	}

	async handlePartialBlock(_block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		await uiHelpers.say("tool", JSON.stringify({ tool: "storyTaskComplete" }), undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const params = block.params as Record<string, unknown>
		const storyTaskId = typeof params.storyTaskId === "string" ? params.storyTaskId.trim() : ""
		const storySubtaskId = typeof params.storySubtaskId === "string" ? params.storySubtaskId.trim() : undefined
		const resolvedStoryPath = resolveStoryPathFromTaskState(config)
		if ("errorMessage" in resolvedStoryPath) {
			return formatResponse.toolError(resolvedStoryPath.errorMessage)
		}

		try {
			const storyMarkdown = await fs.readFile(resolvedStoryPath.storyPath, "utf8")
			const completionResult = completeStoryChecklistItem({
				storyMarkdown,
				storyTaskId,
				storySubtaskId,
			})
			if ("error" in completionResult) {
				return formatResponse.toolError(completionResult.error)
			}

			const preToolHookResponse = await runStoryWritePreToolHook(config, block)
			if (preToolHookResponse) {
				return preToolHookResponse
			}

			const didWriteSucceed = await writeStoryFileWithRetry({
				storyPath: resolvedStoryPath.storyPath,
				updatedMarkdown: completionResult.updatedMarkdown,
			})
			if (!didWriteSucceed) {
				await askForManualStoryUpdate({
					config,
					readablePath: resolvedStoryPath.readablePath,
					manualPatch: completionResult.manualPatch,
					failureIntro: "Automatic story checklist update failed.",
				})
				return formatResponse.toolResult(
					JSON.stringify({
						completed: false,
						awaiting_manual_update: true,
					}),
				)
			}

			const completeMessage = await buildStoryWriteCompleteMessage({
				config,
				storyPath: resolvedStoryPath.storyPath,
				tool: "storyTaskComplete",
				content: `Story file: ${resolvedStoryPath.readablePath}`,
			})
			await finalizeSuccessfulStoryWrite({
				config,
				storyPath: resolvedStoryPath.storyPath,
				completeMessage,
			})

			return formatResponse.toolResult(
				JSON.stringify({
					completed: true,
					target: storySubtaskId ? "subtask" : "task",
				}),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
