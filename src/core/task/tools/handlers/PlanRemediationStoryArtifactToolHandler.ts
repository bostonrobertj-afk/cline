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

interface PlanRemediationStoryArtifactRequest {
	epicIdentity: string
	targetStoryIdentity: string
}

type RequestParseResult =
	| { kind: "succeeded"; request: PlanRemediationStoryArtifactRequest }
	| { kind: "failed"; message: string }

const PLAN_REMEDIATION_STORY_ARTIFACT_ALLOWED_PARAM_NAMES = new Set(["epic_identity", "target_story_identity"])

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
		.filter((paramName) => PLAN_REMEDIATION_STORY_ARTIFACT_ALLOWED_PARAM_NAMES.has(paramName) === false)
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
		return { kind: "failed", message: "plan_remediation_story_artifact cannot execute partial tool blocks." }
	}

	const unsupportedParams = findUnsupportedParams(block)
	if (unsupportedParams.length > 0) {
		return {
			kind: "failed",
			message: `Unsupported parameter(s) for plan_remediation_story_artifact: ${unsupportedParams.join(
				", ",
			)}. Accepted parameters are epic_identity and target_story_identity.`,
		}
	}

	const epicIdentity = parseNonEmptyStringParam(block, "epic_identity")
	if (epicIdentity === undefined) {
		return { kind: "failed", message: "Missing required parameter 'epic_identity'. Provide a non-empty string value." }
	}

	const targetStoryIdentity = parseNonEmptyStringParam(block, "target_story_identity")
	if (targetStoryIdentity === undefined) {
		return {
			kind: "failed",
			message: "Missing required parameter 'target_story_identity'. Provide a non-empty string value.",
		}
	}

	return {
		kind: "succeeded",
		request: {
			epicIdentity,
			targetStoryIdentity,
		},
	}
}

export class PlanRemediationStoryArtifactToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT

	constructor(private readonly validator: ToolValidator) {}

	getDescription(block: ToolUse): string {
		const targetStoryIdentity = parseNonEmptyStringParam(block, "target_story_identity")
		return targetStoryIdentity === undefined ? `[${block.name}]` : `[${block.name} Story ${targetStoryIdentity}]`
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			if (!getBackendWorkflowToolContract(ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT)) {
				return formatResponse.toolError("Backend workflow tool contract missing for plan_remediation_story_artifact.")
			}

			const parsedRequest = parseRequest(block)
			if (parsedRequest.kind === "failed") {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError(parsedRequest.message)
			}

			const preparation = await config.workflowRuntime.preparePlanRemediationStoryArtifact({
				taskState: config.taskState,
				epicIdentity: parsedRequest.request.epicIdentity,
			})
			const accessValidation = this.validator.checkClineIgnorePath(preparation.storyIndexAbsolutePath)
			if (!accessValidation.ok) {
				return formatResponse.toolError(formatResponse.clineIgnoreError(preparation.storyIndexAbsolutePath))
			}

			const completeMessage = JSON.stringify({
				tool: "planRemediationStoryArtifact",
				path: getReadablePath(config.cwd, preparation.storyIndexAbsolutePath),
				content: `Remediation story for ${parsedRequest.request.targetStoryIdentity}`,
				operationIsLocatedInWorkspace: await isLocatedInWorkspace(preparation.storyIndexAbsolutePath),
			})
			const shouldAutoApprove =
				config.isSubagentExecution ||
				(await config.callbacks.shouldAutoApproveToolWithPath(block.name, preparation.storyIndexAbsolutePath))

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to update ${getWorkspaceBasename(
						preparation.storyIndexAbsolutePath,
						"PlanRemediationStoryArtifact.notification",
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

			const result = await config.workflowRuntime.planRemediationStoryArtifact({
				taskState: config.taskState,
				epicIdentity: parsedRequest.request.epicIdentity,
				targetStoryIdentity: parsedRequest.request.targetStoryIdentity,
				expectedStoryIndexAbsolutePath: preparation.storyIndexAbsolutePath,
			})

			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(result.storyIndexAbsolutePath.toLowerCase())
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: true,
					epic_identity: parsedRequest.request.epicIdentity,
					target_story_identity: parsedRequest.request.targetStoryIdentity,
					story_index_absolute_path: result.storyIndexAbsolutePath,
					appended_story_identity: result.appendedStoryIdentity,
					stories: result.storyIndex.stories,
				}),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
