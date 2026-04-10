import { ClineDefaultTool } from "@/shared/tools"
import type { BackendWorkflowToolContract } from "./backendWorkflowToolContractTypes"

export const backendWorkflowToolContracts: Record<ClineDefaultTool, BackendWorkflowToolContract | undefined> = {
	[ClineDefaultTool.ASK]: undefined,
	[ClineDefaultTool.ATTEMPT]: undefined,
	[ClineDefaultTool.SEND_USER_MESSAGE]: undefined,
	[ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST]: undefined,
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
	[ClineDefaultTool.PLAN_MODE]: undefined,
	[ClineDefaultTool.ACT_MODE]: undefined,
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
	[ClineDefaultTool.COMPLETE_WORKFLOW_ITEM]: undefined,
	[ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS]: undefined,
	[ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT]: undefined,
	[ClineDefaultTool.BUILD_REVIEW_INPUT]: {
		id: ClineDefaultTool.BUILD_REVIEW_INPUT,
		name: "build_review_input",
		parameters: [],
	},
	[ClineDefaultTool.BUILD_EPICS_DOCUMENT]: {
		id: ClineDefaultTool.BUILD_EPICS_DOCUMENT,
		name: "build_epics_document",
		parameters: [],
	},
	[ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION]: {
		id: ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION,
		name: "continue_brainstorming_session",
		parameters: [],
	},
	[ClineDefaultTool.CREATE_BRAINSTORMING_SESSION]: {
		id: ClineDefaultTool.CREATE_BRAINSTORMING_SESSION,
		name: "create_brainstorming_session",
		parameters: [],
	},
	[ClineDefaultTool.SELECT_BRAINSTORMING_SESSION]: {
		id: ClineDefaultTool.SELECT_BRAINSTORMING_SESSION,
		name: "select_brainstorming_session",
		parameters: [
			{
				name: "output_file",
				required: true,
				type: "string",
				description: "Canonical brainstorming session file path selected from the discovered session list.",
			},
		],
	},
	[ClineDefaultTool.PERSIST_BRAINSTORMING_APPROACH]: {
		id: ClineDefaultTool.PERSIST_BRAINSTORMING_APPROACH,
		name: "persist_brainstorming_approach",
		parameters: [
			{
				name: "selected_approach",
				required: true,
				type: "string",
				description: "The brainstorming approach selected from the Step 4 workflow form.",
			},
		],
	},
	[ClineDefaultTool.SELECT_RANDOM_BRAINSTORMING_TECHNIQUE]: {
		id: ClineDefaultTool.SELECT_RANDOM_BRAINSTORMING_TECHNIQUE,
		name: "select_random_brainstorming_technique",
		parameters: [],
	},
	[ClineDefaultTool.PERSIST_BRAINSTORMING_TECHNIQUE]: {
		id: ClineDefaultTool.PERSIST_BRAINSTORMING_TECHNIQUE,
		name: "persist_brainstorming_technique",
		parameters: [
			{
				name: "technique_name",
				required: true,
				type: "string",
				description: "The brainstorming technique name selected or previewed in Step 4.",
			},
			{
				name: "technique_description",
				required: true,
				type: "string",
				description: "The brainstorming technique description paired with the selected technique name.",
			},
		],
	},
	[ClineDefaultTool.REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION]: {
		id: ClineDefaultTool.REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION,
		name: "request_brainstorming_technique_suggestion",
		parameters: [],
	},
	[ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION]: undefined,
	[ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC]: {
		id: ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC,
		name: "capture_brainstorming_topic",
		parameters: [
			{
				name: "topic",
				required: true,
				type: "string",
				description: "Long-form raw topic/goals text captured from the Step 3 workflow form.",
			},
		],
	},
	[ClineDefaultTool.SELECT_TARGET_EPIC]: {
		id: ClineDefaultTool.SELECT_TARGET_EPIC,
		name: "select_target_epic",
		parameters: [],
	},
	[ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC]: {
		id: ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC,
		name: "build_epic_delivery_spec",
		parameters: [],
	},
	[ClineDefaultTool.BUILD_STORY_DOCUMENT]: {
		id: ClineDefaultTool.BUILD_STORY_DOCUMENT,
		name: "build_story_document",
		parameters: [],
	},
	[ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT]: {
		id: ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT,
		name: "build_tech_spec_document",
		parameters: [],
	},
	[ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE]: {
		id: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE,
		name: "code_review_spec_update",
		parameters: [],
	},
	[ClineDefaultTool.STORY_TASK_REMINDER]: undefined,
	[ClineDefaultTool.STORY_TASK_COMPLETE]: undefined,
	[ClineDefaultTool.STORY_NOTES_UPDATE]: undefined,
	[ClineDefaultTool.STORY_TESTING_COMPLETE]: undefined,
	[ClineDefaultTool.USE_SUBAGENTS]: undefined,
}

export function getBackendWorkflowToolContract(toolName: ClineDefaultTool): BackendWorkflowToolContract | undefined {
	return backendWorkflowToolContracts[toolName]
}

export function isBackendWorkflowToolContractTool(toolName: ClineDefaultTool): boolean {
	return !!getBackendWorkflowToolContract(toolName)
}
