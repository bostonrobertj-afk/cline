import type { ClineAsk, ClineSay } from "@shared/ExtensionMessage"
import type { ClineDefaultTool } from "@shared/tools"

export type ResponseToolTurnBehavior = "continue" | "end_turn"
export type ResponseToolFollowupRoute = "tool_result" | "normal_user_turn"

export interface ResponseToolMetadata {
	toolName: ClineDefaultTool
	defaultTurnBehavior: ResponseToolTurnBehavior
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
