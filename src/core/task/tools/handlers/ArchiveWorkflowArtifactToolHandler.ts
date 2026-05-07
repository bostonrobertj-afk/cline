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

export class ArchiveWorkflowArtifactToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.ARCHIVE_WORKFLOW_ARTIFACT

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
			if (!getBackendWorkflowToolContract(ClineDefaultTool.ARCHIVE_WORKFLOW_ARTIFACT)) {
				return formatResponse.toolError("Backend workflow tool contract missing for archive_workflow_artifact.")
			}

			if (block.partial === true) {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError("archive_workflow_artifact cannot execute partial tool blocks.")
			}

			const artifactId = readArtifactId(block)
			if (artifactId === undefined) {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError("Missing required parameter 'artifact_id'. Provide a non-empty string value.")
			}

			const preparedArchive = await config.workflowRuntime.prepareWorkflowArtifactArchive({
				taskState: config.taskState,
				artifactId,
			})
			const sourceAccessValidation = this.validator.checkClineIgnorePath(preparedArchive.artifactAbsolutePath)
			if (!sourceAccessValidation.ok) {
				return formatResponse.toolError(formatResponse.clineIgnoreError(preparedArchive.artifactAbsolutePath))
			}

			const archiveAccessValidation = this.validator.checkClineIgnorePath(preparedArchive.archiveAbsolutePath)
			if (!archiveAccessValidation.ok) {
				return formatResponse.toolError(formatResponse.clineIgnoreError(preparedArchive.archiveAbsolutePath))
			}

			const completeMessage = JSON.stringify({
				tool: "archiveWorkflowArtifact",
				artifactId,
				path: getReadablePath(config.cwd, preparedArchive.artifactAbsolutePath),
				archivePath: getReadablePath(config.cwd, preparedArchive.archiveAbsolutePath),
				content: `Artifact: ${artifactId}`,
				operationIsLocatedInWorkspace:
					(await isLocatedInWorkspace(preparedArchive.artifactAbsolutePath)) &&
					(await isLocatedInWorkspace(preparedArchive.archiveAbsolutePath)),
			})
			const shouldAutoApprove =
				config.isSubagentExecution ||
				(await config.callbacks.shouldAutoApproveToolWithPath(block.name, preparedArchive.archiveAbsolutePath))

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to archive ${getWorkspaceBasename(
						preparedArchive.artifactAbsolutePath,
						"ArchiveWorkflowArtifact.notification",
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

			const archivedArtifact = await config.workflowRuntime.archiveWorkflowArtifact({
				taskState: config.taskState,
				artifactId,
				expectedArtifactAbsolutePath: preparedArchive.artifactAbsolutePath,
				expectedArchiveAbsolutePath: preparedArchive.archiveAbsolutePath,
			})

			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(archivedArtifact.artifactAbsolutePath.toLowerCase())
			config.taskState.fileReadCache.delete(archivedArtifact.archiveAbsolutePath.toLowerCase())
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					archived: true,
					artifact_id: archivedArtifact.artifactId,
					artifact_family: archivedArtifact.artifactFamily,
					artifact_identity: archivedArtifact.artifactIdentity,
					artifact_filename: archivedArtifact.artifactFilename,
					artifact_relative_path: archivedArtifact.artifactRelativePath,
					artifact_absolute_path: archivedArtifact.artifactAbsolutePath,
					archive_relative_path: archivedArtifact.archiveRelativePath,
					archive_absolute_path: archivedArtifact.archiveAbsolutePath,
				}),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
