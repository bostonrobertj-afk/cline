import type { ToolUse } from "@core/assistant-message"
import { ClineDefaultTool } from "@shared/tools"
import type { ToolResponse } from "../../index"
import { emitAgentFeedback, readAgentFeedbackMessage } from "../response/agent-feedback"
import { ResponseToolRuntime } from "../response/ResponseToolRuntime"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"

const responseToolRuntime = new ResponseToolRuntime()

export class SendUserMessageHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.SEND_USER_MESSAGE

	getDescription(block: ToolUse): string {
		return `[${block.name}]`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const message = block.params.message
		const partialMessage = uiHelpers.removeClosingTag(block, "message", message)

		await uiHelpers.upsertPartialResponseToolSayPreview(block, "text", partialMessage).catch(() => {})
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const message: string | undefined = block.params.message
		const { invalid, message: agentFeedbackMessage } = readAgentFeedbackMessage(block.params as Record<string, unknown>)

		if (invalid) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "agent_feedback.message")
		}

		if (!message) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "message")
		}

		config.taskState.consecutiveMistakeCount = 0

		await responseToolRuntime.prepareForResponseDelivery(config, this.name)
		await config.callbacks.clearPartialResponseToolPreview(block)
		await config.callbacks.say("text", message, undefined, undefined, false)
		if (agentFeedbackMessage) {
			await emitAgentFeedback(config, this.name, agentFeedbackMessage)
		}

		return responseToolRuntime.finalizeSuccess(config, this.name)
	}
}
