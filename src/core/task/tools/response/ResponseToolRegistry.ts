import { ThreadDisplayStates } from "@shared/ExtensionMessage"
import { ClineDefaultTool } from "@shared/tools"
import type { ResponseToolMetadata } from "./types"

const RESPONSE_TOOL_METADATA: Record<ClineDefaultTool, ResponseToolMetadata | undefined> = {
	[ClineDefaultTool.ATTEMPT]: {
		toolName: ClineDefaultTool.ATTEMPT,
		defaultTurnBehavior: "end_turn",
		threadDisplayStateAfterTurnEnds: ThreadDisplayStates.ACTIVE_USER,
		dismissCommandOutputAskBeforeBlockingAsk: true,
		suppressCommandBlockingAsk: true,
		partialMessage: {
			channel: "say",
			type: "completion_result",
		},
	},
	[ClineDefaultTool.ASK]: {
		toolName: ClineDefaultTool.ASK,
		defaultTurnBehavior: "end_turn",
		threadDisplayStateAfterTurnEnds: ThreadDisplayStates.ACTIVE_USER,
		dismissCommandOutputAskBeforeBlockingAsk: true,
		partialMessage: {
			channel: "ask",
			type: "followup",
		},
	},
	[ClineDefaultTool.SEND_USER_MESSAGE]: {
		toolName: ClineDefaultTool.SEND_USER_MESSAGE,
		defaultTurnBehavior: "end_turn",
		threadDisplayStateAfterTurnEnds: ThreadDisplayStates.ACTIVE_USER,
		partialMessage: {
			channel: "say",
			type: "text",
		},
	},
	[ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST]: {
		toolName: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
		defaultTurnBehavior: "end_turn",
		threadDisplayStateAfterTurnEnds: ThreadDisplayStates.ACTIVE_USER,
		dismissCommandOutputAskBeforeBlockingAsk: true,
		partialMessage: {
			channel: "ask",
			type: "followup",
		},
	},
	[ClineDefaultTool.PLAN_MODE]: {
		toolName: ClineDefaultTool.PLAN_MODE,
		defaultTurnBehavior: "end_turn",
		threadDisplayStateAfterTurnEnds: ThreadDisplayStates.ACTIVE_USER,
		dismissCommandOutputAskBeforeBlockingAsk: true,
		partialMessage: {
			channel: "ask",
			type: ClineDefaultTool.PLAN_MODE,
		},
	},
	[ClineDefaultTool.ACT_MODE]: {
		toolName: ClineDefaultTool.ACT_MODE,
		defaultTurnBehavior: "end_turn",
		threadDisplayStateAfterTurnEnds: ThreadDisplayStates.ACTIVE_USER,
		partialMessage: {
			channel: "say",
			type: "text",
		},
	},
	[ClineDefaultTool.BASH]: undefined,
	[ClineDefaultTool.FILE_EDIT]: undefined,
	[ClineDefaultTool.FILE_READ]: undefined,
	[ClineDefaultTool.FILE_READ_RANGE]: undefined,
	[ClineDefaultTool.FILE_NEW]: undefined,
	[ClineDefaultTool.SEARCH]: undefined,
	[ClineDefaultTool.LIST_FILES]: undefined,
	[ClineDefaultTool.LIST_CODE_DEF]: undefined,
	[ClineDefaultTool.BROWSER]: undefined,
	[ClineDefaultTool.MCP_USE]: undefined,
	[ClineDefaultTool.MCP_ACCESS]: undefined,
	[ClineDefaultTool.MCP_DOCS]: undefined,
	[ClineDefaultTool.NEW_TASK]: undefined,
	[ClineDefaultTool.TODO]: undefined,
	[ClineDefaultTool.WEB_FETCH]: undefined,
	[ClineDefaultTool.WEB_SEARCH]: undefined,
	[ClineDefaultTool.CONDENSE]: undefined,
	[ClineDefaultTool.SUMMARIZE_TASK]: undefined,
	[ClineDefaultTool.REPORT_BUG]: undefined,
	[ClineDefaultTool.NEW_RULE]: undefined,
	[ClineDefaultTool.APPLY_PATCH]: undefined,
	[ClineDefaultTool.GENERATE_EXPLANATION]: undefined,
	[ClineDefaultTool.USE_SKILL]: undefined,
	[ClineDefaultTool.STORY_TASK_REMINDER]: undefined,
	[ClineDefaultTool.STORY_TASK_COMPLETE]: undefined,
	[ClineDefaultTool.REQUEST_TASK_DETAIL]: undefined,
	[ClineDefaultTool.SHOW_INCOMPLETE_TASKS]: undefined,
	[ClineDefaultTool.SET_WORKFLOW_VALUES]: undefined,
	[ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT]: undefined,
	[ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT]: undefined,
	[ClineDefaultTool.ARCHIVE_WORKFLOW_ARTIFACT]: undefined,
	[ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT]: undefined,
	[ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE]: undefined,
	[ClineDefaultTool.GET_BRAINSTORMING_METHODS]: undefined,
	[ClineDefaultTool.APPEND_BRAINSTORMING_SELECTED_TECHNIQUE]: undefined,
	[ClineDefaultTool.UPSERT_EPIC]: undefined,
	[ClineDefaultTool.PLAN_STORY_ARTIFACTS]: undefined,
	[ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT]: undefined,
	[ClineDefaultTool.GENERATE_STORY_FILES]: undefined,
	[ClineDefaultTool.UPDATE_STORY_INDEX_STATUS]: undefined,
	[ClineDefaultTool.DEV_STORY_GIT_FINALIZE]: undefined,
	[ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE]: undefined,
	[ClineDefaultTool.USE_SUBAGENTS]: undefined,
}

export class ResponseToolRegistry {
	static get(toolName: string): ResponseToolMetadata | undefined {
		return RESPONSE_TOOL_METADATA[toolName as ClineDefaultTool]
	}

	static isResponseTool(toolName: string): boolean {
		return !!ResponseToolRegistry.get(toolName)
	}
}
