import { findLast } from "@shared/array"
import { ClineAsk, ClineAskQuestion } from "@shared/ExtensionMessage"
import { ClineDefaultTool } from "@shared/tools"
import { WORKFLOW_PROGRESS_REQUEST_OPTIONS, WORKFLOW_PROGRESS_REQUEST_QUESTION } from "@shared/workflow-progress-request"
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

		const progressRequestAllowed = config.workflowRuntime.isWorkflowProgressRequestAllowed({
			taskState: config.taskState,
		})
		if (!progressRequestAllowed) {
			return formatResponse.toolError(
				"workflow_progress_request can only be used when the active workflow state currently exposes a progress-approval path.",
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

			const nextAction = await config.workflowRuntime.submitWorkflowProgressRequest({
				taskState: config.taskState,
				approved: text === "Yes",
			})
			if (text === "Yes" && nextAction.kind === "no_op") {
				return formatResponse.toolError("workflow_progress_request could not advance the active workflow step.")
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
