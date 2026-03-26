import type { ClineAsk, ClineSay, ThreadDisplayState } from "@shared/ExtensionMessage"
import type { ClineDefaultTool } from "@shared/tools"
import type { ToolUse } from "@/core/assistant-message"
import type { TaskConfig } from "../types/TaskConfig"

export type ResponseToolTurnBehavior = "continue" | "end_turn"
export type ResponseToolFollowupRoute = "tool_result" | "normal_user_turn"
export const RESPONSE_TOOL_SUCCESS_MESSAGE = "[Message displayed.]"
export type ResponseToolFailureCause =
	| "missing_parameter"
	| "user_denied"
	| "managed_workflow_incomplete"
	| "double_check_required"
	| "tool_error"

export interface ResponseToolMetadata {
	toolName: ClineDefaultTool
	defaultTurnBehavior: ResponseToolTurnBehavior
	threadDisplayStateAfterTurnEnds?: ThreadDisplayState
	dismissCommandOutputAskBeforeBlockingAsk?: boolean
	suppressCommandBlockingAsk?: boolean
	partialMessage:
		| {
				channel: "say"
				type: ClineSay
		  }
		| {
				channel: "ask"
				type: ClineAsk
		  }
}

export interface PendingResponseToolFollowup {
	toolName: ClineDefaultTool
	route: ResponseToolFollowupRoute
	text?: string
	images?: string[]
	files?: string[]
	hookContext?: string
}

export interface ResponseToolFailureState {
	failureCount: number
	lastFailedTool?: ClineDefaultTool
	lastFailureMessage?: string
	lastFailureCause?: ResponseToolFailureCause
}

export interface ResponseToolFailureInfo {
	message: string
	cause: ResponseToolFailureCause
}

export interface ResponseToolAttemptContext {
	config: Pick<TaskConfig, "mode" | "yoloModeToggled">
	block: Pick<ToolUse, "name" | "params">
}
