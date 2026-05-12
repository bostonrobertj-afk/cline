import type { ToolUse } from "@core/assistant-message"
import { PreToolUseHookCancellationError } from "@core/hooks/PreToolUseHookCancellationError"
import { formatResponse } from "@core/prompts/responses"
import { getWorkspaceBasename } from "@core/workspace"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { WorkflowStoryStatus } from "../../workflow-runtime/storyArtifacts"
import { getBackendWorkflowToolContract } from "../backendWorkflowToolContracts"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { ToolValidator } from "../ToolValidator"
import type { TaskConfig } from "../types/TaskConfig"
import { ToolHookUtils } from "../utils/ToolHookUtils"
import { ToolResultUtils } from "../utils/ToolResultUtils"

interface UpdateStoryIndexStatusRequest {
	storiesIndex: string
	storyIdentity: string
	status: WorkflowStoryStatus
	expectedCurrentStatus: WorkflowStoryStatus | undefined
}

type RequestParseResult = { kind: "succeeded"; request: UpdateStoryIndexStatusRequest } | { kind: "failed"; message: string }

const UPDATE_STORY_INDEX_STATUS_ALLOWED_PARAM_NAMES = new Set([
	"stories_index",
	"story_identity",
	"status",
	"expected_current_status",
])

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
		.filter((paramName) => UPDATE_STORY_INDEX_STATUS_ALLOWED_PARAM_NAMES.has(paramName) === false)
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

function isWorkflowStoryStatus(value: string): value is WorkflowStoryStatus {
	switch (value) {
		case "draft":
		case "backlog":
		case "review":
		case "complete":
			return true
		default:
			return false
	}
}

function parseStatusParam(block: ToolUse, paramName: string): WorkflowStoryStatus | undefined {
	const value = parseNonEmptyStringParam(block, paramName)
	if (value === undefined || isWorkflowStoryStatus(value) === false) {
		return undefined
	}

	return value
}

function parseRequest(block: ToolUse): RequestParseResult {
	if (block.partial === true) {
		return { kind: "failed", message: "update_story_index_status cannot execute partial tool blocks." }
	}

	const unsupportedParams = findUnsupportedParams(block)
	if (unsupportedParams.length > 0) {
		return {
			kind: "failed",
			message: `Unsupported parameter(s) for update_story_index_status: ${unsupportedParams.join(
				", ",
			)}. Accepted parameters are stories_index, story_identity, status, and expected_current_status.`,
		}
	}

	const storiesIndex = parseNonEmptyStringParam(block, "stories_index")
	if (storiesIndex === undefined) {
		return { kind: "failed", message: "Missing required parameter 'stories_index'. Provide a non-empty string value." }
	}

	const storyIdentity = parseNonEmptyStringParam(block, "story_identity")
	if (storyIdentity === undefined) {
		return { kind: "failed", message: "Missing required parameter 'story_identity'. Provide a non-empty string value." }
	}

	const status = parseStatusParam(block, "status")
	if (status === undefined) {
		return {
			kind: "failed",
			message: "Missing or invalid parameter 'status'. Provide draft, backlog, review, or complete.",
		}
	}

	const expectedCurrentStatusRawValue = readRawParam(block, "expected_current_status")
	let expectedCurrentStatus: WorkflowStoryStatus | undefined
	if (expectedCurrentStatusRawValue !== undefined) {
		expectedCurrentStatus = parseStatusParam(block, "expected_current_status")
		if (expectedCurrentStatus === undefined) {
			return {
				kind: "failed",
				message: "Parameter 'expected_current_status' must be draft, backlog, review, or complete when provided.",
			}
		}
	}

	return {
		kind: "succeeded",
		request: {
			storiesIndex,
			storyIdentity,
			status,
			expectedCurrentStatus,
		},
	}
}

export class UpdateStoryIndexStatusToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.UPDATE_STORY_INDEX_STATUS

	constructor(private readonly validator: ToolValidator) {}

	getDescription(block: ToolUse): string {
		const storyIdentity = parseNonEmptyStringParam(block, "story_identity")
		return storyIdentity === undefined ? `[${block.name}]` : `[${block.name} ${storyIdentity}]`
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			if (!getBackendWorkflowToolContract(ClineDefaultTool.UPDATE_STORY_INDEX_STATUS)) {
				return formatResponse.toolError("Backend workflow tool contract missing for update_story_index_status.")
			}

			const parsedRequest = parseRequest(block)
			if (parsedRequest.kind === "failed") {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError(parsedRequest.message)
			}

			const accessValidation = this.validator.checkClineIgnorePath(parsedRequest.request.storiesIndex)
			if (!accessValidation.ok) {
				return formatResponse.toolError(formatResponse.clineIgnoreError(parsedRequest.request.storiesIndex))
			}

			const completeMessage = JSON.stringify({
				tool: "updateStoryIndexStatus",
				path: getReadablePath(config.cwd, parsedRequest.request.storiesIndex),
				content: `Story ${parsedRequest.request.storyIdentity} status -> ${parsedRequest.request.status}`,
				operationIsLocatedInWorkspace: await isLocatedInWorkspace(parsedRequest.request.storiesIndex),
			})
			let shouldAutoApprove = config.isSubagentExecution
			if (!config.isSubagentExecution) {
				shouldAutoApprove = await config.callbacks.shouldAutoApproveToolWithPath(
					block.name,
					parsedRequest.request.storiesIndex,
				)
			}

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to update ${getWorkspaceBasename(
						parsedRequest.request.storiesIndex,
						"UpdateStoryIndexStatus.notification",
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

			const result = await config.workflowRuntime.updateStoryIndexStatus({
				taskState: config.taskState,
				storiesIndex: parsedRequest.request.storiesIndex,
				storyIdentity: parsedRequest.request.storyIdentity,
				status: parsedRequest.request.status,
				expectedCurrentStatus: parsedRequest.request.expectedCurrentStatus,
			})

			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(result.storiesIndex.toLowerCase())
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: true,
					stories_index: result.storiesIndex,
					story_identity: result.storyIdentity,
					previous_status: result.previousStatus,
					status: result.status,
				}),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
