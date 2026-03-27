import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { ClineDefaultTool } from "@shared/tools"
import type { ToolResponse } from "../../index"
import { ResponseToolRuntime } from "../response/ResponseToolRuntime"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"

const responseToolRuntime = new ResponseToolRuntime()

export class ActModeRespondHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.ACT_MODE

	constructor() {}

	getDescription(block: ToolUse): string {
		return `[${block.name}]`
	}

	/**
	 * Handle partial block streaming for act_mode_respond
	 */
	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const response = block.params.response

		const message = uiHelpers.removeClosingTag(block, "response", response)

		// Display partial message as one coalesced preview row instead of appending duplicates.
		await uiHelpers.upsertPartialResponseToolSayPreview(block, "text", message).catch(() => {})
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const response: string | undefined = block.params.response

		// Validate we're in ACT mode
		if (config.mode !== "act") {
			config.taskState.consecutiveMistakeCount++
			return formatResponse.toolError(
				`The act_mode_respond tool is only available in ACT MODE. You are currently in ${config.mode.toUpperCase()} MODE. Please use the appropriate tool for your current mode.`,
			)
		}

		// Block consecutive act_mode_respond calls to prevent narration loops
		// Note: We intentionally do NOT increment consecutiveMistakeCount here to avoid
		// breaking the conversation flow - we just guide the model to use proper tools
		if (config.taskState.lastToolName === ClineDefaultTool.ACT_MODE) {
			return formatResponse.toolResult(
				`[BLOCKED] You cannot call act_mode_respond consecutively. ` +
					`Your next action MUST be a different tool that performs actual work: ` +
					`read_file, replace_in_file, write_to_file, execute_command, list_files, search_files, etc. ` +
					`Stop explaining and start doing.`,
			)
		}

		// Validate required parameters
		if (!response) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(block.name, "response")
		}

		config.taskState.consecutiveMistakeCount = 0

		// Display complete message to user using "text" type (non-blocking)
		// This allows us to show the progress update and immediately continue
		await responseToolRuntime.prepareForResponseDelivery(config, this.name)
		await config.callbacks.clearPartialResponseToolPreview(block)
		await config.callbacks.say("text", response, undefined, undefined, false)

		// Note: lastToolName is tracked centrally by ToolExecutor after tool execution

		return responseToolRuntime.finalizeSuccess(config, this.name)
	}
}
