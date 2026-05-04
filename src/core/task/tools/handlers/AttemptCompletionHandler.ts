import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { findLastIndex } from "@shared/array"
import { COMPLETION_RESULT_CHANGES_FLAG } from "@shared/ExtensionMessage"
import { ClineDefaultTool } from "@shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import { emitAgentFeedback, readAgentFeedbackMessage } from "../response/agent-feedback"
import { ResponseToolRuntime } from "../response/ResponseToolRuntime"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { ToolResultUtils } from "../utils/ToolResultUtils"

const responseToolRuntime = new ResponseToolRuntime()

export class AttemptCompletionHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.ATTEMPT

	getDescription(block: ToolUse): string {
		return `[${block.name}]`
	}

	/**
	 * Handle partial block streaming for attempt_completion
	 */
	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const result = uiHelpers.removeClosingTag(block, "result", block.params.result)
		if (result) {
			await uiHelpers.upsertPartialResponseToolSayPreview(block, "completion_result", result)
		}
		// We will handle command in the final execution step
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const result: string | undefined = block.params.result
		const command: string | undefined = block.params.command
		const { invalid, message: agentFeedbackMessage } = readAgentFeedbackMessage(block.params as Record<string, unknown>)

		if (invalid) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "agent_feedback.message")
		}

		// Validate required parameters
		if (!result) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "result")
		}

		config.taskState.consecutiveMistakeCount = 0

		// Run PreToolUse hook before execution
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

		const addNewChangesFlagToLastCompletionResultMessage = async () => {
			// Add newchanges flag if there are new changes to the workspace
			const hasNewChanges = await config.callbacks.doesLatestTaskCompletionHaveNewChanges()
			const clineMessages = config.messageState.getClineMessages()

			const lastCompletionResultMessageIndex = findLastIndex(clineMessages, (m: any) => m.say === "completion_result")
			const lastCompletionResultMessage =
				lastCompletionResultMessageIndex !== -1 ? clineMessages[lastCompletionResultMessageIndex] : undefined
			if (
				lastCompletionResultMessage &&
				lastCompletionResultMessageIndex !== -1 &&
				hasNewChanges &&
				!lastCompletionResultMessage.text?.endsWith(COMPLETION_RESULT_CHANGES_FLAG)
			) {
				await config.messageState.updateClineMessage(lastCompletionResultMessageIndex, {
					text: lastCompletionResultMessage.text + COMPLETION_RESULT_CHANGES_FLAG,
				})
			}
		}

		// Remove any partial completion_result message that may exist
		// Search backwards since other messages may have been inserted after the partial
		const clineMessages = config.messageState.getClineMessages()
		const partialCompletionIndex = findLastIndex(
			clineMessages,
			(m) => m.partial === true && m.type === "say" && m.say === "completion_result",
		)
		if (partialCompletionIndex !== -1) {
			const updatedMessages = [
				...clineMessages.slice(0, partialCompletionIndex),
				...clineMessages.slice(partialCompletionIndex + 1),
			]
			config.messageState.setClineMessages(updatedMessages)
			await config.messageState.saveClineMessagesAndUpdateHistory()
		}
		await config.callbacks.clearPartialResponseToolPreview(block)

		const lastMessage = config.messageState.getClineMessages().at(-1)
		let didEmitAgentFeedback = false
		const emitAgentFeedbackOnce = async () => {
			if (!didEmitAgentFeedback && agentFeedbackMessage) {
				didEmitAgentFeedback = true
				await emitAgentFeedback(config, this.name, agentFeedbackMessage)
			}
		}

		if (command) {
			if (lastMessage && lastMessage.ask !== "command") {
				// haven't sent a command message yet so first send completion_result then command
				const completionMessageTs = await config.callbacks.say("completion_result", result, undefined, undefined, false)
				await config.callbacks.saveCheckpoint(true, completionMessageTs)
				await addNewChangesFlagToLastCompletionResultMessage()
				await emitAgentFeedbackOnce()
			} else {
				// we already sent a command message, meaning the complete completion message has also been sent
				await config.callbacks.saveCheckpoint(true)
			}

			// Check if command should be auto-approved
			// attempt_completion commands don't have requires_approval param, so we treat them as safe commands
			const autoApproveResult = config.autoApprover?.shouldAutoApproveTool(ClineDefaultTool.BASH)
			const autoApproveSafe = Array.isArray(autoApproveResult) ? autoApproveResult[0] : autoApproveResult

			if (autoApproveSafe) {
				// Auto-approve flow - show command as 'say' instead of 'ask'
				await config.callbacks.removeLastPartialMessageIfExistsWithType("ask", "command")
				await config.callbacks.say("command", command, undefined, undefined, false)
			} else {
				// Manual approval flow - need to ask for approval
				showNotificationForApproval(
					`Cline wants to execute a command: ${command}`,
					config.autoApprovalSettings.enableNotifications,
				)

				const didApprove = await ToolResultUtils.askApprovalAndPushFeedback("command", command, config)
				if (!didApprove) {
					await emitAgentFeedbackOnce()
					return formatResponse.toolDenied()
				}
			}

			await emitAgentFeedbackOnce()
			// Execute the command
			const [userRejected, execCommandResult] = await config.callbacks.executeCommandTool(
				command!,
				undefined,
				responseToolRuntime.getCommandExecutionOptions(this.name),
			) // no timeout for attempt_completion command

			if (userRejected) {
				config.taskState.didRejectTool = true
				return execCommandResult
			}
		} else {
			// Send the complete completion_result message (partial was already removed above)
			const completionMessageTs = await config.callbacks.say("completion_result", result, undefined, undefined, false)
			await config.callbacks.saveCheckpoint(true, completionMessageTs)
			await addNewChangesFlagToLastCompletionResultMessage()
			await emitAgentFeedbackOnce()
		}

		const successResult = responseToolRuntime.finalizeSuccess(config, this.name)
		if (config.taskState.activeWorkflowSession) {
			const workflowNextAction = await config.workflowRuntime.completeActiveWorkflowAfterFinalDelivery({
				taskState: config.taskState,
			})
			if (workflowNextAction.kind !== "no_op") {
				config.callbacks.queueWorkflowNextAction(workflowNextAction)
			}
		}

		return successResult
	}
}
