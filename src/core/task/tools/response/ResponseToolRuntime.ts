import type { ToolUse } from "@core/assistant-message"
import type { CommandExecutionOptions } from "@integrations/terminal"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../.."
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { ResponseToolRegistry } from "./ResponseToolRegistry"
import {
	type PendingResponseToolFollowup,
	RESPONSE_TOOL_SUCCESS_MESSAGE,
	type ResponseToolAttemptContext,
	type ResponseToolFailureCause,
	type ResponseToolFailureInfo,
	type ResponseToolFailureState,
	type ResponseToolTurnBehavior,
} from "./types"

export class ResponseToolRuntime {
	private static readonly TOOL_DENIED_MESSAGE = "The user denied this operation."

	isResponseTool(toolName: string): boolean {
		return ResponseToolRegistry.isResponseTool(toolName)
	}

	isGovernedResponseAttempt({ config, block }: ResponseToolAttemptContext): boolean {
		if (!this.isResponseTool(block.name)) {
			return false
		}

		if (block.name !== ClineDefaultTool.PLAN_MODE) {
			return true
		}

		if (block.params?.needs_more_exploration === "true") {
			return false
		}

		if (config.yoloModeToggled && (config.mode === "act" || config.mode === "plan")) {
			return false
		}

		return true
	}

	getTurnBehavior(toolName: string): ResponseToolTurnBehavior {
		return ResponseToolRegistry.get(toolName)?.defaultTurnBehavior ?? "continue"
	}

	getSuccessResult(): ToolResponse {
		return RESPONSE_TOOL_SUCCESS_MESSAGE
	}

	async renderPartial(block: ToolUse, uiHelpers: StronglyTypedUIHelpers, text: string): Promise<void> {
		const metadata = ResponseToolRegistry.get(block.name)
		if (!metadata) {
			return
		}

		if (metadata.partialMessage.channel === "say") {
			await uiHelpers.say(metadata.partialMessage.type, text, undefined, undefined, block.partial).catch(() => {})
			return
		}

		await uiHelpers.ask(metadata.partialMessage.type, text, block.partial).catch(() => {})
	}

	async prepareForResponseDelivery(config: TaskConfig, toolName: string): Promise<void> {
		config.taskState.activeResponseToolName = toolName as any

		const metadata = ResponseToolRegistry.get(toolName)
		if (!metadata?.dismissCommandOutputAskBeforeBlockingAsk) {
			return
		}

		if (config.messageState.getClineMessages().at(-1)?.ask === "command_output") {
			await config.callbacks.say("command_output", "")
		}
	}

	async askForResponse(
		config: TaskConfig,
		toolName: string,
		type: Parameters<TaskConfig["callbacks"]["ask"]>[0],
		text?: string,
	): Promise<Awaited<ReturnType<TaskConfig["callbacks"]["ask"]>>> {
		await this.prepareForResponseDelivery(config, toolName)
		return config.callbacks.ask(type, text, false)
	}

	getCommandExecutionOptions(toolName: string): CommandExecutionOptions | undefined {
		const metadata = ResponseToolRegistry.get(toolName)
		if (!metadata?.suppressCommandBlockingAsk) {
			return undefined
		}

		return {
			suppressBlockingAsk: true,
		}
	}

	recordFailure(
		config: TaskConfig,
		toolName: string,
		message: string,
		cause?: ResponseToolFailureCause,
	): ResponseToolFailureState {
		config.taskState.recordResponseToolFailure(toolName as any, message, cause)
		return this.getFailureState(config)
	}

	getFailureState(config: TaskConfig): ResponseToolFailureState {
		return config.taskState.getResponseToolFailureState()
	}

	classifyFailureResult(result: ToolResponse): ResponseToolFailureInfo | undefined {
		if (typeof result !== "string") {
			return undefined
		}

		if (result === ResponseToolRuntime.TOOL_DENIED_MESSAGE) {
			return {
				message: result,
				cause: "user_denied",
			}
		}

		const errorMatch = /The tool execution failed with the following error:\n<error>\n([\s\S]*?)\n<\/error>/.exec(result)
		if (!errorMatch) {
			return undefined
		}

		const message = errorMatch[1].trim()
		return {
			message,
			cause: this.detectFailureCause(message),
		}
	}

	buildSecondFailureUserMessage(toolName: string, failure: ResponseToolFailureInfo): string {
		return [
			"Response tool failed twice in the current AI turn.",
			`Tool: ${toolName}`,
			`Error: ${failure.message}`,
			`Detected cause: ${failure.cause}`,
		].join("\n")
	}

	private detectFailureCause(message: string): ResponseToolFailureCause {
		if (message.includes("Missing value for required parameter")) {
			return "missing_parameter"
		}
		if (message.includes("Managed workflow")) {
			return "managed_workflow_incomplete"
		}
		if (message.includes("Before completing, re-verify your work")) {
			return "double_check_required"
		}
		return "tool_error"
	}

	finalizeTool(
		config: TaskConfig,
		toolName: string,
		result: ToolResponse,
		overrideBehavior?: ResponseToolTurnBehavior,
	): ToolResponse {
		const metadata = ResponseToolRegistry.get(toolName)
		const turnBehavior = overrideBehavior ?? metadata?.defaultTurnBehavior ?? "continue"
		config.taskState.markResponseToolTurnComplete(toolName as any, turnBehavior, metadata?.threadDisplayStateAfterTurnEnds)
		config.taskState.activeResponseToolName = undefined
		return result
	}

	finalizeSuccess(config: TaskConfig, toolName: string, overrideBehavior?: ResponseToolTurnBehavior): ToolResponse {
		return this.finalizeTool(config, toolName, this.getSuccessResult(), overrideBehavior)
	}

	queueFollowup(config: TaskConfig, followup: PendingResponseToolFollowup): void {
		config.taskState.setPendingResponseToolFollowup(followup)
	}

	consumePendingFollowup(taskState: TaskConfig["taskState"]): PendingResponseToolFollowup | undefined {
		return taskState.consumePendingResponseToolFollowup()
	}
}
