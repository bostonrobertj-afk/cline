import { findLast } from "@shared/array"
import { ClineAsk, ClineAskQuestion } from "@shared/ExtensionMessage"
import { FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL } from "@shared/focus-chain-utils"
import { ClineDefaultTool } from "@shared/tools"
import {
	isWorkflowProgressRequestWorkflowName,
	WORKFLOW_PROGRESS_REQUEST_OPTIONS,
	WORKFLOW_PROGRESS_REQUEST_QUESTION,
} from "@shared/workflow-progress-request"
import { ToolUse } from "../../../assistant-message"
import { formatResponse } from "../../../prompts/responses"
import { ToolResponse } from "../.."
import { ResponseToolRuntime } from "../response/ResponseToolRuntime"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"

const responseToolRuntime = new ResponseToolRuntime()

export class WorkflowProgressRequestToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST

	getDescription(_block: ToolUse): string {
		return "[workflow_progress_request]"
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		await uiHelpers
			.ask(
				"followup" as ClineAsk,
				JSON.stringify({
					question: WORKFLOW_PROGRESS_REQUEST_QUESTION,
					options: [...WORKFLOW_PROGRESS_REQUEST_OPTIONS],
				} satisfies ClineAskQuestion),
				block.partial,
			)
			.catch(() => {})
	}

	async execute(config: TaskConfig, _block: ToolUse): Promise<ToolResponse> {
		if (config.yoloModeToggled === true) {
			return formatResponse.toolError(
				"workflow_progress_request is unavailable while YOLO mode is enabled because no interactive user response can be collected.",
			)
		}

		if (!isWorkflowProgressRequestWorkflowName(config.taskState.activePlaceholderWorkflowSource?.name)) {
			return formatResponse.toolError(
				"workflow_progress_request can only be used during an active supported placeholder workflow step.",
			)
		}

		if (!config.taskState.currentFocusChainChecklist) {
			return formatResponse.toolError(
				"workflow_progress_request requires an active placeholder-workflow focus chain checklist before it can advance the workflow.",
			)
		}

		const sharedMessage = {
			question: WORKFLOW_PROGRESS_REQUEST_QUESTION,
			options: [...WORKFLOW_PROGRESS_REQUEST_OPTIONS],
		} satisfies ClineAskQuestion

		await responseToolRuntime.prepareForResponseDelivery(config, this.name)
		const {
			text,
			images,
			files: followupFiles,
		} = await config.callbacks.ask("followup", JSON.stringify(sharedMessage), false)

		if (text === "Yes" || text === "No") {
			const clineMessages = config.messageState.getClineMessages()
			const lastFollowupMessage = findLast(clineMessages, (m: any) => m.ask === "followup")
			if (lastFollowupMessage) {
				lastFollowupMessage.text = JSON.stringify({
					...sharedMessage,
					selected: text,
				} satisfies ClineAskQuestion)
				await config.messageState.saveClineMessagesAndUpdateHistory()
			}

			if (text === "Yes") {
				const updateResult = await config.callbacks.updateFCListFromToolResponse(FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL)
				if (!updateResult.accepted) {
					return formatResponse.toolError(
						updateResult.feedback ?? "Failed to advance the active placeholder-workflow checklist.",
					)
				}
			}
		} else {
			await config.callbacks.say("user_feedback", text ?? "", images, followupFiles)
		}

		responseToolRuntime.queueFollowup(config, {
			toolName: this.name,
			route: "normal_user_turn",
			text,
			images,
			files: followupFiles,
		})

		return responseToolRuntime.finalizeSuccess(config, this.name)
	}
}
