import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { getWorkspaceBasename } from "@core/workspace"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import fs from "fs/promises"
import path from "path"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { ToolResultUtils } from "../utils/ToolResultUtils"
import { codeReviewSpecUpdateMerge } from "./codeReviewSpecUpdateMerge"

function createSwapPaths(filePath: string): { tempFilePath: string; backupFilePath: string } {
	const parentDir = path.dirname(filePath)
	const baseName = path.basename(filePath)
	const suffix = `${process.pid}.${Date.now()}`

	return {
		tempFilePath: path.join(parentDir, `.${baseName}.${suffix}.tmp`),
		backupFilePath: path.join(parentDir, `.${baseName}.${suffix}.bak`),
	}
}

async function removeIfExists(filePath: string): Promise<void> {
	try {
		await fs.unlink(filePath)
	} catch {
		// Ignore cleanup failures for missing temp or restored files.
	}
}

async function restoreBackupIfPresent(backupPath: string, destinationPath: string): Promise<void> {
	try {
		await removeIfExists(destinationPath)
		await fs.rename(backupPath, destinationPath)
	} catch {
		// Ignore restore failures and allow the original error to surface.
	}
}

async function atomicReplaceTwoTextFiles(args: {
	specFilePath: string
	specFileContent: string
	reviewInputPath: string
	reviewInputContent: string
}): Promise<void> {
	const specSwapPaths = createSwapPaths(args.specFilePath)
	const reviewSwapPaths = createSwapPaths(args.reviewInputPath)
	let specBackupCreated = false
	let reviewBackupCreated = false

	await fs.mkdir(path.dirname(args.specFilePath), { recursive: true })
	await fs.mkdir(path.dirname(args.reviewInputPath), { recursive: true })

	try {
		await fs.writeFile(specSwapPaths.tempFilePath, args.specFileContent, "utf8")
		await fs.writeFile(reviewSwapPaths.tempFilePath, args.reviewInputContent, "utf8")

		await fs.rename(args.specFilePath, specSwapPaths.backupFilePath)
		specBackupCreated = true

		await fs.rename(args.reviewInputPath, reviewSwapPaths.backupFilePath)
		reviewBackupCreated = true

		await fs.rename(specSwapPaths.tempFilePath, args.specFilePath)
		await fs.rename(reviewSwapPaths.tempFilePath, args.reviewInputPath)

		await removeIfExists(specSwapPaths.backupFilePath)
		await removeIfExists(reviewSwapPaths.backupFilePath)
	} catch (error) {
		if (specBackupCreated) {
			await restoreBackupIfPresent(specSwapPaths.backupFilePath, args.specFilePath)
		}
		if (reviewBackupCreated) {
			await restoreBackupIfPresent(reviewSwapPaths.backupFilePath, args.reviewInputPath)
		}

		await removeIfExists(specSwapPaths.tempFilePath)
		await removeIfExists(reviewSwapPaths.tempFilePath)

		throw error
	}
}

export class CodeReviewSpecUpdateToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE

	getDescription(_block: ToolUse): string {
		return `[code_review_spec_update]`
	}

	async handlePartialBlock(_block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		await uiHelpers.say("tool", JSON.stringify({ tool: "codeReviewSpecUpdate" }), undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const workflowValues = config.taskState.activeWorkflowSession?.workflowValues ?? {}

		const reviewInputRaw = workflowValues.review_input?.trim()
		const storyPathRaw = workflowValues.story_path?.trim()

		if (!reviewInputRaw) {
			return formatResponse.toolError("Could not resolve workflow value 'review_input' from the active workflow values.")
		}

		if (!storyPathRaw) {
			return formatResponse.toolError("Could not resolve workflow value 'story_path' from the active workflow values.")
		}

		const resolutionBase =
			workflowValues.cwd?.trim() ||
			workflowValues.project_root?.trim() ||
			workflowValues["project-root"]?.trim() ||
			config.cwd
		const reviewInputPath = path.isAbsolute(reviewInputRaw) ? reviewInputRaw : path.resolve(resolutionBase, reviewInputRaw)
		const storyFilePath = path.isAbsolute(storyPathRaw) ? storyPathRaw : path.resolve(resolutionBase, storyPathRaw)

		try {
			const reviewInputMarkdown = await fs.readFile(reviewInputPath, "utf8")
			const specFileMarkdown = await fs.readFile(storyFilePath, "utf8")
			const mergeResult = codeReviewSpecUpdateMerge({
				specFileMarkdown,
				reviewInputMarkdown,
			})

			if (mergeResult.kind === "error") {
				return formatResponse.toolError(mergeResult.message)
			}

			const completeMessage = JSON.stringify({
				tool: "codeReviewSpecUpdate",
				path: getReadablePath(config.cwd, storyFilePath),
				content: `Story file: ${getReadablePath(config.cwd, storyFilePath)}\nReview input: ${getReadablePath(config.cwd, reviewInputPath)}`,
				operationIsLocatedInWorkspace:
					(await isLocatedInWorkspace(storyFilePath)) && (await isLocatedInWorkspace(reviewInputPath)),
			})

			const shouldAutoApprove =
				config.isSubagentExecution ||
				((await config.callbacks.shouldAutoApproveToolWithPath(block.name, storyFilePath)) &&
					(await config.callbacks.shouldAutoApproveToolWithPath(block.name, reviewInputPath)))

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to update ${getWorkspaceBasename(storyFilePath, "CodeReviewSpecUpdate.notification")}`,
					config.autoApprovalSettings.enableNotifications,
				)

				await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")

				const didApprove = await ToolResultUtils.askApprovalAndPushFeedback("tool", completeMessage, config)
				if (!didApprove) {
					return formatResponse.toolDenied()
				}
			}

			try {
				const { ToolHookUtils } = await import("../utils/ToolHookUtils")
				await ToolHookUtils.runPreToolUseIfEnabled(config, block)
			} catch (error) {
				const { PreToolUseHookCancellationError } = await import("@core/hooks/PreToolUseHookCancellationError")
				if (error instanceof PreToolUseHookCancellationError) {
					return formatResponse.toolDenied()
				}
				throw error
			}

			await atomicReplaceTwoTextFiles({
				specFilePath: storyFilePath,
				specFileContent: mergeResult.updatedSpecFileMarkdown,
				reviewInputPath,
				reviewInputContent: mergeResult.clearedReviewInputMarkdown,
			})
			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(storyFilePath.toLowerCase())
			config.taskState.fileReadCache.delete(reviewInputPath.toLowerCase())
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: true,
					story_path_updated: true,
					review_input_cleared: true,
					story_path_path: storyFilePath,
					review_input_path: reviewInputPath,
				}),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
