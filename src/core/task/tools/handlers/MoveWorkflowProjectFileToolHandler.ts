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

interface WorkflowProjectFileMoveRequest {
	sourcePath: string
	destinationPath: string
}

function readRequiredStringParam(block: ToolUse, paramName: string): string | undefined {
	const paramEntry = Object.entries(block.params).find(([key]) => key === paramName)
	const paramValue = paramEntry?.[1]
	if (typeof paramValue !== "string" || paramValue.trim() === "") {
		return undefined
	}

	return paramValue
}

function readMoveRequest(block: ToolUse): WorkflowProjectFileMoveRequest | undefined {
	const sourcePath = readRequiredStringParam(block, "source_path")
	const destinationPath = readRequiredStringParam(block, "destination_path")
	if (sourcePath === undefined || destinationPath === undefined) {
		return undefined
	}

	return {
		sourcePath,
		destinationPath,
	}
}

export class MoveWorkflowProjectFileToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE

	constructor(private readonly validator: ToolValidator) {}

	getDescription(block: ToolUse): string {
		const request = readMoveRequest(block)
		if (request !== undefined) {
			return `[${block.name} ${request.sourcePath}]`
		}

		return `[${block.name}]`
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			if (!getBackendWorkflowToolContract(ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE)) {
				return formatResponse.toolError("Backend workflow tool contract missing for move_workflow_project_file.")
			}

			if (block.partial === true) {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError("move_workflow_project_file cannot execute partial tool blocks.")
			}

			const request = readMoveRequest(block)
			if (request === undefined) {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError(
					"Missing required parameters. Provide non-empty string values for 'source_path' and 'destination_path'.",
				)
			}

			const preparedMove = await config.workflowRuntime.prepareWorkflowProjectFileMove({
				taskState: config.taskState,
				sourcePath: request.sourcePath,
				destinationPath: request.destinationPath,
			})

			const sourceAccessValidation = this.validator.checkClineIgnorePath(preparedMove.sourceAbsolutePath)
			if (!sourceAccessValidation.ok) {
				return formatResponse.toolError(formatResponse.clineIgnoreError(preparedMove.sourceAbsolutePath))
			}

			const destinationAccessValidation = this.validator.checkClineIgnorePath(preparedMove.destinationAbsolutePath)
			if (!destinationAccessValidation.ok) {
				return formatResponse.toolError(formatResponse.clineIgnoreError(preparedMove.destinationAbsolutePath))
			}

			const completeMessage = JSON.stringify({
				tool: "moveWorkflowProjectFile",
				path: getReadablePath(config.cwd, preparedMove.sourceAbsolutePath),
				destinationPath: getReadablePath(config.cwd, preparedMove.destinationAbsolutePath),
				content: `Move: ${getWorkspaceBasename(
					preparedMove.sourceAbsolutePath,
					"MoveWorkflowProjectFile.completeMessage",
				)}`,
				operationIsLocatedInWorkspace:
					(await isLocatedInWorkspace(preparedMove.sourceAbsolutePath)) &&
					(await isLocatedInWorkspace(preparedMove.destinationAbsolutePath)),
			})
			const sourceShouldAutoApprove = await config.callbacks.shouldAutoApproveToolWithPath(
				block.name,
				preparedMove.sourceAbsolutePath,
			)
			const destinationShouldAutoApprove = await config.callbacks.shouldAutoApproveToolWithPath(
				block.name,
				preparedMove.destinationAbsolutePath,
			)
			const shouldAutoApprove =
				config.isSubagentExecution || (sourceShouldAutoApprove === true && destinationShouldAutoApprove === true)

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to move ${getWorkspaceBasename(
						preparedMove.sourceAbsolutePath,
						"MoveWorkflowProjectFile.notification",
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

			const movedFile = await config.workflowRuntime.moveWorkflowProjectFile({
				taskState: config.taskState,
				expectedSourceAbsolutePath: preparedMove.sourceAbsolutePath,
				expectedDestinationAbsolutePath: preparedMove.destinationAbsolutePath,
			})

			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(movedFile.sourceAbsolutePath.toLowerCase())
			config.taskState.fileReadCache.delete(movedFile.destinationAbsolutePath.toLowerCase())
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					moved: true,
					source_path: movedFile.sourceAbsolutePath,
					destination_path: movedFile.destinationAbsolutePath,
				}),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
