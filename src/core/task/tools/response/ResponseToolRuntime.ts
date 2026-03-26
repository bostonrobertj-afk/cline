import type { ToolUse } from "@core/assistant-message"
import type { CommandExecutionOptions } from "@integrations/terminal"
import type { ToolResponse } from "../.."
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { ResponseToolRegistry } from "./ResponseToolRegistry"
import type { PendingResponseToolFollowup, ResponseToolTurnBehavior } from "./types"

export class ResponseToolRuntime {
	isResponseTool(toolName: string): boolean {
		return ResponseToolRegistry.isResponseTool(toolName)
	}

	getTurnBehavior(toolName: string): ResponseToolTurnBehavior {
		return ResponseToolRegistry.get(toolName)?.defaultTurnBehavior ?? "continue"
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

	finalizeTool(
		config: TaskConfig,
		toolName: string,
		result: ToolResponse,
		overrideBehavior?: ResponseToolTurnBehavior,
	): ToolResponse {
		const turnBehavior = overrideBehavior ?? this.getTurnBehavior(toolName)
		config.taskState.markResponseToolTurnComplete(toolName as any, turnBehavior)
		config.taskState.activeResponseToolName = undefined
		return result
	}

	queueFollowup(config: TaskConfig, followup: PendingResponseToolFollowup): void {
		config.taskState.setPendingResponseToolFollowup(followup)
	}

	consumePendingFollowup(taskState: TaskConfig["taskState"]): PendingResponseToolFollowup | undefined {
		return taskState.consumePendingResponseToolFollowup()
	}
}
