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

interface PlanStoryArtifactsRequest {
	epicIdentity: string
	storyCount: number
}

type RequestParseResult = { kind: "succeeded"; request: PlanStoryArtifactsRequest } | { kind: "failed"; message: string }

const PLAN_STORY_ARTIFACTS_ALLOWED_PARAM_NAMES = new Set(["epic_identity", "story_count"])

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
		.filter((paramName) => PLAN_STORY_ARTIFACTS_ALLOWED_PARAM_NAMES.has(paramName) === false)
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

function parsePositiveIntegerParam(block: ToolUse, paramName: string): number | undefined {
	const rawValue = readRawParam(block, paramName)
	const numericValue =
		typeof rawValue === "number" ? rawValue : typeof rawValue === "string" ? Number(rawValue.trim()) : Number.NaN
	if (Number.isInteger(numericValue) === false || numericValue <= 0) {
		return undefined
	}

	return numericValue
}

function parseRequest(block: ToolUse): RequestParseResult {
	if (block.partial === true) {
		return { kind: "failed", message: "plan_story_artifacts cannot execute partial tool blocks." }
	}

	const unsupportedParams = findUnsupportedParams(block)
	if (unsupportedParams.length > 0) {
		return {
			kind: "failed",
			message: `Unsupported parameter(s) for plan_story_artifacts: ${unsupportedParams.join(
				", ",
			)}. Accepted parameters are epic_identity and story_count.`,
		}
	}

	const epicIdentity = parseNonEmptyStringParam(block, "epic_identity")
	if (epicIdentity === undefined) {
		return { kind: "failed", message: "Missing required parameter 'epic_identity'. Provide a non-empty string value." }
	}

	const storyCount = parsePositiveIntegerParam(block, "story_count")
	if (storyCount === undefined) {
		return { kind: "failed", message: "Missing required parameter 'story_count'. Provide a positive integer value." }
	}

	return {
		kind: "succeeded",
		request: {
			epicIdentity,
			storyCount,
		},
	}
}

export class PlanStoryArtifactsToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.PLAN_STORY_ARTIFACTS

	constructor(private readonly validator: ToolValidator) {}

	getDescription(block: ToolUse): string {
		const epicIdentity = parseNonEmptyStringParam(block, "epic_identity")
		return epicIdentity === undefined ? `[${block.name}]` : `[${block.name} Epic ${epicIdentity}]`
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			if (!getBackendWorkflowToolContract(ClineDefaultTool.PLAN_STORY_ARTIFACTS)) {
				return formatResponse.toolError("Backend workflow tool contract missing for plan_story_artifacts.")
			}

			const parsedRequest = parseRequest(block)
			if (parsedRequest.kind === "failed") {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError(parsedRequest.message)
			}

			const preparation = await config.workflowRuntime.preparePlanStoryArtifacts({
				taskState: config.taskState,
				epicIdentity: parsedRequest.request.epicIdentity,
			})
			const preparedPaths = [preparation.storyIndexAbsolutePath, preparation.epicsIndexAbsolutePath] as const
			for (const preparedPath of preparedPaths) {
				const accessValidation = this.validator.checkClineIgnorePath(preparedPath)
				if (!accessValidation.ok) {
					return formatResponse.toolError(formatResponse.clineIgnoreError(preparedPath))
				}
			}

			const completeMessage = JSON.stringify({
				tool: "planStoryArtifacts",
				path: getReadablePath(config.cwd, preparation.storyIndexAbsolutePath),
				content: `Epic ${parsedRequest.request.epicIdentity} story inventory`,
				operationIsLocatedInWorkspace: await isLocatedInWorkspace(preparation.storyIndexAbsolutePath),
			})
			let shouldAutoApprove = config.isSubagentExecution
			if (!config.isSubagentExecution) {
				const [storyIndexAutoApproved, epicsIndexAutoApproved] = await Promise.all(
					preparedPaths.map((preparedPath) => config.callbacks.shouldAutoApproveToolWithPath(block.name, preparedPath)),
				)
				shouldAutoApprove = storyIndexAutoApproved && epicsIndexAutoApproved
			}

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to update ${getWorkspaceBasename(
						preparation.storyIndexAbsolutePath,
						"PlanStoryArtifacts.notification",
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

			const result = await config.workflowRuntime.planStoryArtifacts({
				taskState: config.taskState,
				epicIdentity: parsedRequest.request.epicIdentity,
				storyCount: parsedRequest.request.storyCount,
				expectedStoryIndexAbsolutePath: preparation.storyIndexAbsolutePath,
				expectedEpicsIndexAbsolutePath: preparation.epicsIndexAbsolutePath,
			})

			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(result.storyIndexAbsolutePath.toLowerCase())
			config.taskState.fileReadCache.delete(result.epicsIndexAbsolutePath.toLowerCase())
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: true,
					epic_identity: parsedRequest.request.epicIdentity,
					story_count: parsedRequest.request.storyCount,
					story_index_absolute_path: result.storyIndexAbsolutePath,
					appended_story_identities: result.appendedStoryIdentities,
					stories: result.storyIndex.stories,
				}),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
