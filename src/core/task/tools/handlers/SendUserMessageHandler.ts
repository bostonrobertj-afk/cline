import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { ClineDefaultTool } from "@shared/tools"
import type { ToolResponse } from "../../index"
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

		await uiHelpers.say("text", partialMessage, undefined, undefined, true).catch(() => {})
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const message: string | undefined = block.params.message

		if (!message) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "message")
		}

		config.taskState.consecutiveMistakeCount = 0

		await responseToolRuntime.prepareForResponseDelivery(config, this.name)
		await config.callbacks.say("text", message, undefined, undefined, false)

		return responseToolRuntime.finalizeTool(config, this.name, formatResponse.toolResult("[Message displayed.]"))
	}
}
