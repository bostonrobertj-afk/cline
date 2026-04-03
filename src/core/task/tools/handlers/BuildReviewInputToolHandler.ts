import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { getPlaceholderWorkflowValueMap } from "@core/workflows/placeholder-workflow-rendering"
import { buildWorkflowStablePlaceholders, resolveWorkflowPlaceholderText } from "@core/workflows/workflow-placeholders"
import { getWorkspaceBasename } from "@core/workspace"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import fs from "fs/promises"
import path from "path"
import simpleGit from "simple-git"
import { recordAndPersistPlaceholderWorkflowWriteProof } from "@/core/task/focus-chain/placeholderWorkflowWriteProofs"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { ToolResultUtils } from "../utils/ToolResultUtils"
import { buildReviewInputExtraction } from "./buildReviewInputExtraction"

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

export class BuildReviewInputToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.BUILD_REVIEW_INPUT

	getDescription(_block: ToolUse): string {
		return "[build_review_input]"
	}

	async handlePartialBlock(_block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		await uiHelpers.say("tool", JSON.stringify({ tool: "buildReviewInput" }), undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const params = block.params as Record<string, unknown>
		const placeholders =
			getPlaceholderWorkflowValueMap(
				config.taskState.activePlaceholderWorkflowStableValues,
				config.taskState.activePlaceholderWorkflowValues,
			) ?? {}
		const explicitStoryPath = typeof params.story_path === "string" ? params.story_path.trim() : ""
		const storyPathRaw = placeholders.story_path?.trim() || explicitStoryPath

		if (!storyPathRaw) {
			return formatResponse.toolError(
				"Could not resolve workflow placeholder 'story_path' from the active placeholder workflow state.",
			)
		}

		const stablePlaceholders = await buildWorkflowStablePlaceholders({ cwd: config.cwd })
		const diffOutputRaw =
			stablePlaceholders.diff_output ??
			resolveWorkflowPlaceholderText("{output_folder}/review-input.diff", stablePlaceholders)
		const reviewInputRaw =
			stablePlaceholders.review_input ??
			resolveWorkflowPlaceholderText("{output_folder}/review-input.md", stablePlaceholders)

		if (!diffOutputRaw) {
			return formatResponse.toolError(
				"Could not resolve stable placeholder 'diff_output' or 'output_folder' from .cline/workflow-config.yaml.",
			)
		}

		if (!reviewInputRaw) {
			return formatResponse.toolError(
				"Could not resolve stable placeholder 'review_input' or 'output_folder' from .cline/workflow-config.yaml.",
			)
		}

		const resolutionBase =
			placeholders.cwd?.trim() || placeholders.project_root?.trim() || placeholders["project-root"]?.trim() || config.cwd
		const storyAbsolutePath = path.isAbsolute(storyPathRaw) ? storyPathRaw : path.resolve(resolutionBase, storyPathRaw)
		const diffOutputPath = path.isAbsolute(diffOutputRaw) ? diffOutputRaw : path.resolve(config.cwd, diffOutputRaw)
		const reviewInputPath = path.isAbsolute(reviewInputRaw) ? reviewInputRaw : path.resolve(config.cwd, reviewInputRaw)

		try {
			const storyMarkdown = await fs.readFile(storyAbsolutePath, "utf8")
			const diffArtifactMarkdown = await fs.readFile(diffOutputPath, "utf8")

			const storyRelativePaths = [path.relative(config.cwd, storyAbsolutePath).replaceAll(path.sep, "/")]

			try {
				const gitRoot = (await simpleGit(config.cwd).revparse(["--show-toplevel"])).trim()
				if (gitRoot) {
					storyRelativePaths.push(path.relative(gitRoot, storyAbsolutePath).replaceAll(path.sep, "/"))
				}
			} catch {
				// Ignore git-root lookup failures and fall back to cwd-relative resolution.
			}

			const extraction = buildReviewInputExtraction({
				storyMarkdown,
				storyAbsolutePath,
				storyRelativePaths: Array.from(new Set(storyRelativePaths.filter((candidate) => candidate.length > 0))),
				diffArtifactMarkdown,
			})

			if (extraction.kind === "no_recent_story_changes") {
				return formatResponse.toolResult(
					JSON.stringify({
						persisted: false,
						review_input_available: false,
						recent_story_changes_detected: false,
						reason: "diff_output does not identify recent changes to the story file.",
					}),
				)
			}

			const completeMessage = JSON.stringify({
				tool: "buildReviewInput",
				path: getReadablePath(config.cwd, reviewInputPath),
				content: `Story: ${getReadablePath(config.cwd, storyAbsolutePath)}\nDiff artifact: ${getReadablePath(config.cwd, diffOutputPath)}`,
				operationIsLocatedInWorkspace: await isLocatedInWorkspace(reviewInputPath),
			})

			const shouldAutoApprove =
				config.isSubagentExecution || (await config.callbacks.shouldAutoApproveToolWithPath(block.name, reviewInputPath))

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to build ${getWorkspaceBasename(reviewInputPath, "BuildReviewInput.notification")}`,
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

			await atomicReplaceTextFile(reviewInputPath, extraction.markdown)
			await recordAndPersistPlaceholderWorkflowWriteProof({
				taskId: config.taskId,
				taskState: config.taskState,
				filePath: reviewInputPath,
			})
			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(reviewInputPath.toLowerCase())
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: true,
					review_input_available: true,
					artifact_path: reviewInputPath,
					story_path: storyAbsolutePath,
					recent_story_changes_detected: true,
				}),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
