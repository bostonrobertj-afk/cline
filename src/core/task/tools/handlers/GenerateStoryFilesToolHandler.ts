import type { ToolUse } from "@core/assistant-message"
import { PreToolUseHookCancellationError } from "@core/hooks/PreToolUseHookCancellationError"
import { formatResponse } from "@core/prompts/responses"
import { getWorkspaceBasename } from "@core/workspace"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import { getBackendWorkflowToolContract } from "../backendWorkflowToolContracts"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { ToolValidator } from "../ToolValidator"
import type { TaskConfig } from "../types/TaskConfig"
import { ToolHookUtils } from "../utils/ToolHookUtils"
import { ToolResultUtils } from "../utils/ToolResultUtils"

interface GenerateStoryFilesRequest {
	epicIdentity: string
}

type RequestParseResult = { kind: "succeeded"; request: GenerateStoryFilesRequest } | { kind: "failed"; message: string }

const GENERATE_STORY_FILES_ALLOWED_PARAM_NAMES = new Set(["epic_identity"])

function readRawParam(block: ToolUse, paramName: string): unknown {
	for (const [key, value] of Object.entries(block.params)) {
		if (key === paramName) {
			return value
		}
	}

	return undefined
}

function findUnsupportedParams(block: ToolUse): readonly string[] {
	return Object.keys(block.params)
		.filter((paramName) => GENERATE_STORY_FILES_ALLOWED_PARAM_NAMES.has(paramName) === false)
		.sort()
}

function parseNonEmptyStringParam(block: ToolUse, paramName: string): string | undefined {
	const rawValue = readRawParam(block, paramName)
	if (typeof rawValue !== "string") {
		return undefined
	}

	const trimmedValue = rawValue.trim()
	return trimmedValue.length === 0 ? undefined : trimmedValue
}

function parseRequest(block: ToolUse): RequestParseResult {
	if (block.partial === true) {
		return { kind: "failed", message: "generate_story_files cannot execute partial tool blocks." }
	}

	const unsupportedParams = findUnsupportedParams(block)
	if (unsupportedParams.length > 0) {
		return {
			kind: "failed",
			message: `Unsupported parameter(s) for generate_story_files: ${unsupportedParams.join(
				", ",
			)}. Accepted parameter is epic_identity.`,
		}
	}

	const epicIdentity = parseNonEmptyStringParam(block, "epic_identity")
	if (epicIdentity === undefined) {
		return { kind: "failed", message: "Missing required parameter 'epic_identity'. Provide a non-empty string value." }
	}

	return {
		kind: "succeeded",
		request: {
			epicIdentity,
		},
	}
}

async function areAllPathsLocatedInWorkspace(paths: readonly string[]): Promise<boolean> {
	for (const path of paths) {
		if ((await isLocatedInWorkspace(path)) === false) {
			return false
		}
	}

	return true
}

export class GenerateStoryFilesToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.GENERATE_STORY_FILES

	constructor(private readonly validator: ToolValidator) {}

	getDescription(block: ToolUse): string {
		const epicIdentity = parseNonEmptyStringParam(block, "epic_identity")
		return epicIdentity === undefined ? `[${block.name}]` : `[${block.name} Epic ${epicIdentity}]`
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			if (!getBackendWorkflowToolContract(ClineDefaultTool.GENERATE_STORY_FILES)) {
				return formatResponse.toolError("Backend workflow tool contract missing for generate_story_files.")
			}

			const parsedRequest = parseRequest(block)
			if (parsedRequest.kind === "failed") {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError(parsedRequest.message)
			}

			const preparation = await config.workflowRuntime.prepareGenerateStoryFiles({
				taskState: config.taskState,
				epicIdentity: parsedRequest.request.epicIdentity,
			})
			const approvalPaths = [preparation.storyIndexAbsolutePath, ...preparation.draftStoryFileAbsolutePaths]
			for (const approvalPath of approvalPaths) {
				const accessValidation = this.validator.checkClineIgnorePath(approvalPath)
				if (!accessValidation.ok) {
					return formatResponse.toolError(formatResponse.clineIgnoreError(approvalPath))
				}
			}

			const completeMessage = JSON.stringify({
				tool: "generateStoryFiles",
				path: getReadablePath(config.cwd, preparation.storyIndexAbsolutePath),
				draftStoryFilePaths: preparation.draftStoryFileAbsolutePaths.map((draftStoryFilePath) =>
					getReadablePath(config.cwd, draftStoryFilePath),
				),
				content: `Epic ${parsedRequest.request.epicIdentity} draft story files`,
				operationIsLocatedInWorkspace: await areAllPathsLocatedInWorkspace(approvalPaths),
			})

			let allPathsAutoApproved = true
			for (const approvalPath of approvalPaths) {
				const pathAutoApproved = await config.callbacks.shouldAutoApproveToolWithPath(block.name, approvalPath)
				if (pathAutoApproved === false) {
					allPathsAutoApproved = false
				}
			}
			const shouldAutoApprove = config.isSubagentExecution || allPathsAutoApproved

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to create ${getWorkspaceBasename(
						preparation.storyIndexAbsolutePath,
						"GenerateStoryFiles.notification",
					)}`,
					config.autoApprovalSettings.enableNotifications,
				)
				await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
				const didApprove = await ToolResultUtils.askApprovalAndPushFeedback("tool", completeMessage, config)
				if (didApprove === false) {
					return formatResponse.toolDenied()
				}
			}

			try {
				await ToolHookUtils.runPreToolUseIfEnabled(config, block)
			} catch (error) {
				if (error instanceof PreToolUseHookCancellationError) {
					return formatResponse.toolDenied()
				}
				throw error
			}

			const result = await config.workflowRuntime.generateStoryFiles({
				taskState: config.taskState,
				epicIdentity: parsedRequest.request.epicIdentity,
				expectedStoryIndexAbsolutePath: preparation.storyIndexAbsolutePath,
				expectedDraftStoryFileAbsolutePaths: preparation.draftStoryFileAbsolutePaths,
			})

			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(result.storyIndexAbsolutePath.toLowerCase())
			for (const createdDraftStoryFileAbsolutePath of result.createdDraftStoryFileAbsolutePaths) {
				config.taskState.fileReadCache.delete(createdDraftStoryFileAbsolutePath.toLowerCase())
			}
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: true,
					epic_identity: parsedRequest.request.epicIdentity,
					story_index_absolute_path: result.storyIndexAbsolutePath,
					draft_story_file_absolute_paths: result.draftStoryFileAbsolutePaths,
					created_draft_story_file_absolute_paths: result.createdDraftStoryFileAbsolutePaths,
					existing_draft_story_file_absolute_paths: result.existingDraftStoryFileAbsolutePaths,
					stories: result.storyIndex.stories,
				}),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
