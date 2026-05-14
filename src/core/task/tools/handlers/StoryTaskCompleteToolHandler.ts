import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import fs from "fs/promises"
import path from "path"
import {
	completeStoryChecklistItem,
	DEV_STORY_WORKFLOW_NAME,
	type ParsedStorySubtask,
	type ParsedStoryTask,
	type ParsedTasksSection,
	parseDevStoryTasks,
	resolveActiveStoryPath,
	type StoryCompletionProgress,
	type StoryTaskAllowedFileEntry,
} from "@/core/task/story-tools/storyTaskDocument"
import type { WorkflowValue, WorkflowValues } from "@/core/task/workflow-runtime/types"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"

const STORY_TASK_INVENTORY_WORKFLOW_VALUE_KEY = "story_task_inventory"
const CURRENT_STORY_TASK_ID_WORKFLOW_VALUE_KEY = "current_story_task_id"

interface WorkflowValueWriteResult {
	changedValues: WorkflowValues
	unchangedValues: WorkflowValues
	clearedKeys: readonly string[]
	unchangedClearKeys: readonly string[]
}

type StoryTaskInventoryPersistenceResult =
	| {
			ok: true
			firstIncompleteTaskId: string | undefined
	  }
	| {
			ok: false
			message: string
	  }

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
	const session = config.taskState.activeWorkflowSession
	if (config.taskState.activeWorkflowName !== DEV_STORY_WORKFLOW_NAME || session === undefined) {
		return { errorMessage: "requires an active dev-story workflow session." }
	}

	const resolvedStoryPath = resolveActiveStoryPath({
		cwd: config.cwd,
		workflowValues: session.workflowValues,
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

function shouldTriggerStoryTaskCompletionProgression(progress: StoryCompletionProgress): boolean {
	return progress.parentTaskComplete || progress.allStoryTasksComplete
}

function buildAllowedFileInventoryValue(allowedFile: StoryTaskAllowedFileEntry): WorkflowValue {
	return {
		path: allowedFile.path,
		rawLine: allowedFile.rawLine,
		lineIndex: allowedFile.lineIndex,
		ownerId: allowedFile.ownerId,
		ownerKind: allowedFile.ownerKind,
	}
}

function buildSubtaskInventoryValue(subtask: ParsedStorySubtask): WorkflowValue {
	return {
		id: subtask.id,
		lineIndex: subtask.lineIndex,
		rawLine: subtask.rawLine,
		completed: subtask.completed,
		allowedFiles: subtask.allowedFiles.map((allowedFile) => buildAllowedFileInventoryValue(allowedFile)),
	}
}

function buildTaskInventoryValue(task: ParsedStoryTask): WorkflowValue {
	return {
		id: task.id,
		lineIndex: task.lineIndex,
		rawLine: task.rawLine,
		completed: task.completed,
		allowedFiles: task.allowedFiles.map((allowedFile) => buildAllowedFileInventoryValue(allowedFile)),
		subtasks: task.subtasks.map((subtask) => buildSubtaskInventoryValue(subtask)),
	}
}

function buildStoryTaskInventoryValue(parsedTasks: ParsedTasksSection): WorkflowValue {
	return {
		tasks: parsedTasks.tasks.map((task) => buildTaskInventoryValue(task)),
	}
}

function findFirstIncompleteTaskId(parsedTasks: ParsedTasksSection): string | undefined {
	const firstIncompleteTask = parsedTasks.tasks.find(
		(task) => !task.completed || task.subtasks.some((subtask) => !subtask.completed),
	)
	return firstIncompleteTask?.id
}

function hasWorkflowValueKey(values: WorkflowValues, key: string): boolean {
	return Object.hasOwn(values, key)
}

function validateStoryTaskInventoryPersistence(args: {
	result: WorkflowValueWriteResult
	expectedCurrentStoryTaskId: string | undefined
}): StoryTaskInventoryPersistenceResult {
	if (!hasWorkflowValueKey(args.result.changedValues, STORY_TASK_INVENTORY_WORKFLOW_VALUE_KEY)) {
		return {
			ok: false,
			message: "story_task_complete failed: workflow value story_task_inventory was not applied through changedValues.",
		}
	}

	if (args.expectedCurrentStoryTaskId === undefined) {
		if (!args.result.clearedKeys.includes(CURRENT_STORY_TASK_ID_WORKFLOW_VALUE_KEY)) {
			return {
				ok: false,
				message: "story_task_complete failed: workflow value current_story_task_id was not cleared through clearedKeys.",
			}
		}
		return { ok: true, firstIncompleteTaskId: undefined }
	}

	if (!hasWorkflowValueKey(args.result.changedValues, CURRENT_STORY_TASK_ID_WORKFLOW_VALUE_KEY)) {
		return {
			ok: false,
			message: "story_task_complete failed: workflow value current_story_task_id was not applied through changedValues.",
		}
	}

	return { ok: true, firstIncompleteTaskId: args.expectedCurrentStoryTaskId }
}

async function persistUpdatedStoryTaskInventory(args: {
	config: TaskConfig
	updatedMarkdown: string
}): Promise<StoryTaskInventoryPersistenceResult> {
	const parsedUpdatedTasks = parseDevStoryTasks(args.updatedMarkdown)
	if (!parsedUpdatedTasks.ok) {
		throw new Error(parsedUpdatedTasks.message)
	}

	const firstIncompleteTaskId = findFirstIncompleteTaskId(parsedUpdatedTasks.parsed)
	const values: WorkflowValues = {
		[STORY_TASK_INVENTORY_WORKFLOW_VALUE_KEY]: buildStoryTaskInventoryValue(parsedUpdatedTasks.parsed),
	}
	const clearKeys: string[] = []
	if (firstIncompleteTaskId === undefined) {
		clearKeys.push(CURRENT_STORY_TASK_ID_WORKFLOW_VALUE_KEY)
	} else {
		clearKeys.push(CURRENT_STORY_TASK_ID_WORKFLOW_VALUE_KEY)
		values[CURRENT_STORY_TASK_ID_WORKFLOW_VALUE_KEY] = firstIncompleteTaskId
	}

	const workflowValueWriteResult = await args.config.workflowRuntime.applyWorkflowValueWrites({
		taskState: args.config.taskState,
		values,
		clearKeys,
	})

	return validateStoryTaskInventoryPersistence({
		result: workflowValueWriteResult,
		expectedCurrentStoryTaskId: firstIncompleteTaskId,
	})
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
		const storyItemId = block.params.storyItemId?.trim() ?? ""
		if (storyItemId === "") {
			return formatResponse.toolError("story_task_complete failed: storyItemId is required.")
		}

		const resolvedStoryPath = resolveStoryPathFromTaskState(config)
		if ("errorMessage" in resolvedStoryPath) {
			return formatResponse.toolError(`story_task_complete failed: ${resolvedStoryPath.errorMessage}`)
		}

		try {
			const storyMarkdown = await fs.readFile(resolvedStoryPath.storyPath, "utf8")
			const completionResult = completeStoryChecklistItem({
				storyMarkdown,
				storyItemId,
			})
			if ("error" in completionResult) {
				return formatResponse.toolError(`story_task_complete failed: ${completionResult.error}`)
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
			config.taskState.fileReadCache.delete(resolvedStoryPath.storyPath.toLowerCase())

			const persistenceResult = await persistUpdatedStoryTaskInventory({
				config,
				updatedMarkdown: completionResult.updatedMarkdown,
			})
			if (!persistenceResult.ok) {
				return formatResponse.toolError(persistenceResult.message)
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

			if (shouldTriggerStoryTaskCompletionProgression(completionResult.progress)) {
				const nextAction = await config.workflowRuntime.handleModelToolResult({
					taskState: config.taskState,
					toolName: ClineDefaultTool.STORY_TASK_COMPLETE,
				})
				if (nextAction.kind !== "no_op") {
					config.callbacks.queueWorkflowNextAction(nextAction)
				}
			}

			return formatResponse.toolResult(
				JSON.stringify({
					completedStoryItemId: completionResult.progress.completedStoryItemId,
					completedItemKind: completionResult.progress.completedItemKind,
					...("parentTaskId" in completionResult.progress
						? { parentTaskId: completionResult.progress.parentTaskId }
						: {}),
					parentTaskComplete: completionResult.progress.parentTaskComplete,
					allStoryTasksComplete: completionResult.progress.allStoryTasksComplete,
				}),
			)
		} catch (error) {
			return formatResponse.toolError(
				`story_task_complete failed: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
}
