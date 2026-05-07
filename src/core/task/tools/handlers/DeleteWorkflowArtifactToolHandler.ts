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
import { ToolResultUtils } from "../utils/ToolResultUtils"

function readArtifactId(block: ToolUse): string | undefined {
	const artifactIdEntry = Object.entries(block.params).find(([key]) => key === "artifact_id")
	const artifactId = artifactIdEntry?.[1]
	if (typeof artifactId !== "string" || artifactId.trim() === "") {
		return undefined
	}

	return artifactId.trim()
}

export class DeleteWorkflowArtifactToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT

	constructor(private readonly validator: ToolValidator) {}

	getDescription(block: ToolUse): string {
		const artifactId = readArtifactId(block)
		if (artifactId) {
			return `[${block.name} ${artifactId}]`
		}

		return `[${block.name}]`
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			if (!getBackendWorkflowToolContract(ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT)) {
				return formatResponse.toolError("Backend workflow tool contract missing for delete_workflow_artifact.")
			}

			if (block.partial === true) {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError("delete_workflow_artifact cannot execute partial tool blocks.")
			}

			const artifactId = readArtifactId(block)
			if (artifactId === undefined) {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError("Missing required parameter 'artifact_id'. Provide a non-empty string value.")
			}

			const preparedDeletion = await config.workflowRuntime.prepareWorkflowArtifactDeletion({
				taskState: config.taskState,
				artifactId,
			})
			const accessValidation = this.validator.checkClineIgnorePath(preparedDeletion.artifactAbsolutePath)
			if (!accessValidation.ok) {
				return formatResponse.toolError(formatResponse.clineIgnoreError(preparedDeletion.artifactAbsolutePath))
			}

			const completeMessage = JSON.stringify({
				tool: "deleteWorkflowArtifact",
				artifactId,
				path: getReadablePath(config.cwd, preparedDeletion.artifactAbsolutePath),
				content: `Artifact: ${artifactId}`,
				operationIsLocatedInWorkspace: await isLocatedInWorkspace(preparedDeletion.artifactAbsolutePath),
			})
			const shouldAutoApprove =
				config.isSubagentExecution ||
				(await config.callbacks.shouldAutoApproveToolWithPath(block.name, preparedDeletion.artifactAbsolutePath))

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to delete ${getWorkspaceBasename(
						preparedDeletion.artifactAbsolutePath,
						"DeleteWorkflowArtifact.notification",
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

			const deletedArtifact = await config.workflowRuntime.deleteWorkflowArtifact({
				taskState: config.taskState,
				artifactId,
				expectedArtifactAbsolutePath: preparedDeletion.artifactAbsolutePath,
			})

			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(deletedArtifact.artifactAbsolutePath.toLowerCase())
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					deleted: true,
					artifact_id: deletedArtifact.artifactId,
					artifact_family: deletedArtifact.artifactFamily,
					artifact_identity: deletedArtifact.artifactIdentity,
					artifact_filename: deletedArtifact.artifactFilename,
					artifact_relative_path: deletedArtifact.artifactRelativePath,
					artifact_absolute_path: deletedArtifact.artifactAbsolutePath,
				}),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
