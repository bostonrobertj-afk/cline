import { Tool as AnthropicTool } from "@anthropic-ai/sdk/resources/index"
import { FunctionDeclaration as GoogleTool } from "@google/genai"
import { ChatCompletionTool as OpenAITool } from "openai/resources/chat/completions"

export type ClineTool = OpenAITool | AnthropicTool | GoogleTool

// Define available tool ids
export enum ClineDefaultTool {
	ASK = "ask_followup_question",
	ATTEMPT = "attempt_completion",
	SEND_USER_MESSAGE = "send_user_message",
	WORKFLOW_PROGRESS_REQUEST = "workflow_progress_request",
	BASH = "execute_command",
	FILE_EDIT = "replace_in_file",
	FILE_READ = "read_file",
	FILE_READ_RANGE = "read_file_range",
	FILE_NEW = "write_to_file",
	SEARCH = "search_files",
	LIST_FILES = "list_files",
	LIST_CODE_DEF = "list_code_definition_names",
	BROWSER = "browser_action",
	MCP_USE = "use_mcp_tool",
	MCP_ACCESS = "access_mcp_resource",
	MCP_DOCS = "load_mcp_documentation",
	NEW_TASK = "new_task",
	PLAN_MODE = "generate_plan_output",
	ACT_MODE = "act_mode_respond",
	TODO = "focus_chain",
	WEB_FETCH = "web_fetch",
	WEB_SEARCH = "web_search",
	CONDENSE = "condense",
	SUMMARIZE_TASK = "summarize_task",
	REPORT_BUG = "report_bug",
	NEW_RULE = "new_rule",
	APPLY_PATCH = "apply_patch",
	GENERATE_EXPLANATION = "generate_explanation",
	USE_SKILL = "use_skill",
	COMPLETE_WORKFLOW_ITEM = "complete_workflow_item",
	SET_WORKFLOW_PLACEHOLDERS = "set_workflow_placeholders",
	BUILD_REVIEW_DIFF_OUTPUT = "build_review_diff_output",
	BUILD_REVIEW_INPUT = "build_review_input",
	BUILD_EPICS_DOCUMENT = "build_epics_document",
	CONTINUE_BRAINSTORMING_SESSION = "continue_brainstorming_session",
	CREATE_BRAINSTORMING_SESSION = "create_brainstorming_session",
	SELECT_BRAINSTORMING_SESSION = "select_brainstorming_session",
	PERSIST_BRAINSTORMING_APPROACH = "persist_brainstorming_approach",
	SELECT_RANDOM_BRAINSTORMING_TECHNIQUE = "select_random_brainstorming_technique",
	PERSIST_BRAINSTORMING_TECHNIQUE = "persist_brainstorming_technique",
	REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION = "request_brainstorming_technique_suggestion",
	PREPARE_BRAINSTORMING_SESSION = "prepare_brainstorming_session",
	CAPTURE_BRAINSTORMING_TOPIC = "capture_brainstorming_topic",
	SELECT_TARGET_EPIC = "select_target_epic",
	BUILD_EPIC_DELIVERY_SPEC = "build_epic_delivery_spec",
	BUILD_STORY_DOCUMENT = "build_story_document",
	BUILD_TECH_SPEC_DOCUMENT = "build_tech_spec_document",
	CODE_REVIEW_SPEC_UPDATE = "code_review_spec_update",
	STORY_TASK_REMINDER = "story_task_reminder",
	STORY_TASK_COMPLETE = "story_task_complete",
	STORY_NOTES_UPDATE = "story_notes_update",
	STORY_TESTING_COMPLETE = "story_testing_complete",
	USE_SUBAGENTS = "use_subagents",
}

// Array of all tool names for compatibility
// Automatically generated from the enum values
export const toolUseNames = Object.values(ClineDefaultTool) as ClineDefaultTool[]

const dynamicToolUseNamesByNamespace = new Map<string, Set<string>>()

export function setDynamicToolUseNames(namespace: string, names: string[]): void {
	dynamicToolUseNamesByNamespace.set(namespace, new Set(names.map((name) => name.trim()).filter(Boolean)))
}

export function getToolUseNames(): string[] {
	const defaults = [...toolUseNames]
	const dynamic = Array.from(dynamicToolUseNamesByNamespace.values()).flatMap((set) => Array.from(set))
	return Array.from(new Set([...defaults, ...dynamic]))
}

// Tools that are safe to run in parallel with the initial checkpoint commit
// These are tools that do not modify the workspace state
export const READ_ONLY_TOOLS = [
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.FILE_READ_RANGE,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.BROWSER,
	ClineDefaultTool.ASK,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
	ClineDefaultTool.WEB_SEARCH,
	ClineDefaultTool.WEB_FETCH,
	ClineDefaultTool.USE_SKILL,
	ClineDefaultTool.COMPLETE_WORKFLOW_ITEM,
	ClineDefaultTool.STORY_TASK_REMINDER,
	ClineDefaultTool.USE_SUBAGENTS,
] as const
