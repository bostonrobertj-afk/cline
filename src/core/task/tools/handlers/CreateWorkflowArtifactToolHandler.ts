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
import type { TaskConfig } from "../types/TaskConfig"
import { ToolResultUtils } from "../utils/ToolResultUtils"

function readArtifactId(block: ToolUse): string | undefined {
	const artifactIdEntry = Object.entries(block.params).find(([key]) => key === "artifact_id")
	const artifactId = artifactIdEntry?.[1]
	if (typeof artifactId !== "string" || artifactId.trim() === "") {
		return undefined
	}

	return artifactId.trim()
}

export class CreateWorkflowArtifactToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT

	getDescription(block: ToolUse): string {
		const artifactId = readArtifactId(block)
		if (artifactId) {
			return `[${block.name} ${artifactId}]`
		}

		return `[${block.name}]`
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			if (!getBackendWorkflowToolContract(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)) {
				return formatResponse.toolError("Backend workflow tool contract missing for create_workflow_artifact.")
			}

			if (block.partial === true) {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError("create_workflow_artifact cannot execute partial tool blocks.")
			}

			const artifactId = readArtifactId(block)
			if (artifactId === undefined) {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError("Missing required parameter 'artifact_id'. Provide a non-empty string value.")
			}

			const preparedArtifact = await config.workflowRuntime.prepareWorkflowArtifactCreation({
				taskState: config.taskState,
				artifactId,
			})
			const completeMessage = JSON.stringify({
				tool: "createWorkflowArtifact",
				artifactId,
				path: getReadablePath(config.cwd, preparedArtifact.artifactAbsolutePath),
				content: `Artifact: ${artifactId}`,
				operationIsLocatedInWorkspace: await isLocatedInWorkspace(preparedArtifact.artifactAbsolutePath),
			})
			const shouldAutoApprove =
				config.isSubagentExecution ||
				(await config.callbacks.shouldAutoApproveToolWithPath(block.name, preparedArtifact.artifactAbsolutePath))

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to create ${getWorkspaceBasename(
						preparedArtifact.artifactAbsolutePath,
						"CreateWorkflowArtifact.notification",
					)}`,
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
				if (error instanceof PreToolUseHookCancellationError) {
					return formatResponse.toolDenied()
				}
				throw error
			}

			const createdArtifact = await config.workflowRuntime.createWorkflowArtifact({
				taskState: config.taskState,
				artifactId,
				expectedArtifactAbsolutePath: preparedArtifact.artifactAbsolutePath,
			})

			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(createdArtifact.artifactAbsolutePath.toLowerCase())
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					created: true,
					artifact_id: createdArtifact.artifactId,
					artifact_family: createdArtifact.artifactFamily,
					artifact_identity: createdArtifact.artifactIdentity,
					artifact_filename: createdArtifact.artifactFilename,
					artifact_relative_path: createdArtifact.artifactRelativePath,
					artifact_absolute_path: createdArtifact.artifactAbsolutePath,
					parent_identity: createdArtifact.parentIdentity,
					target_identity: createdArtifact.targetIdentity,
					persisted_artifact_output_values: createdArtifact.changedWorkflowValues,
					unchanged_artifact_output_values: createdArtifact.unchangedWorkflowValues,
				}),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
