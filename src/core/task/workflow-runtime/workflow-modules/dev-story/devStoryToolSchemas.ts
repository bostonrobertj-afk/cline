import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { AGENT_FEEDBACK_PARAMETER } from "@/core/prompts/system-prompt/types"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const DEV_STORY_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

export function buildDevStoryStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildDevStoryReadFileToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.FILE_READ,
		name: "read_file",
		description:
			"Request to read the contents of a file at the specified path. Automatically extracts raw text from PDF and DOCX files. Do NOT use this tool to list the contents of a directory.",
		parameters: [
			{
				name: "path",
				required: true,
				type: "string",
				instruction: "The path of the file to read.",
				description: "The path of the file to read.",
			},
		],
	}
}

export function buildDevStoryReadFileRangeToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.FILE_READ_RANGE,
		name: "read_file_range",
		description: "Request to read only a specific 1-based line range from a text file.",
		parameters: [
			{
				name: "path",
				required: true,
				type: "string",
				instruction: "The path of the file to read.",
				description: "The path of the file to read.",
			},
			{
				name: "start_line",
				required: true,
				type: "integer",
				instruction: "The first line to include, using 1-based line numbers.",
				description: "The first line to include, using 1-based line numbers.",
			},
			{
				name: "end_line",
				required: true,
				type: "integer",
				instruction: "The last line to include, using 1-based line numbers.",
				description: "The last line to include, using 1-based line numbers.",
			},
		],
	}
}

export function buildDevStoryListFilesToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.LIST_FILES,
		name: "list_files",
		description:
			"Request to list files and directories within the specified directory. If recursive is true, it will list all files and directories recursively. If recursive is false or not provided, it will only list the top-level contents.",
		parameters: [
			{
				name: "path",
				required: true,
				type: "string",
				instruction: "The path of the directory to list contents for.",
				description: "The path of the directory to list contents for.",
			},
			{
				name: "recursive",
				required: false,
				type: "boolean",
				instruction:
					"Whether to list files recursively. Use true for recursive listing, false or omit for top-level only.",
				description: "Whether to list files recursively.",
			},
		],
	}
}

export function buildDevStorySearchFilesToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.SEARCH,
		name: "search_files",
		description: "Request to perform a regex search across files in a specified directory, providing context-rich results.",
		parameters: [
			{
				name: "path",
				required: true,
				type: "string",
				instruction: "The path of the directory to search in. This directory will be recursively searched.",
				description: "The path of the directory to search in.",
			},
			{
				name: "regex",
				required: true,
				type: "string",
				instruction: "The regular expression pattern to search for. Uses Rust regex syntax.",
				description: "The regular expression pattern to search for.",
			},
			{
				name: "file_pattern",
				required: false,
				type: "string",
				instruction: "Glob pattern to filter files. If not provided, it will search all files.",
				description: "Glob pattern to filter files.",
			},
		],
	}
}

export function buildDevStoryListCodeDefinitionNamesToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.LIST_CODE_DEF,
		name: "list_code_definition_names",
		description:
			"Request to list definition names (classes, functions, methods, etc.) used in source code files at the top level of the specified directory.",
		parameters: [
			{
				name: "path",
				required: true,
				type: "string",
				instruction: "The path of a directory, not a file. Lists definitions across all source files in that directory.",
				description: "The path of a directory, not a file.",
			},
		],
	}
}

export function buildDevStoryApplyPatchToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.APPLY_PATCH,
		name: "apply_patch",
		description: "Apply a structured patch to one or more files using the repository apply_patch format.",
		parameters: [
			{
				name: "input",
				required: true,
				type: "string",
				instruction: "The apply_patch command that you wish to execute.",
				description: "The apply_patch command that you wish to execute.",
			},
		],
	}
}

export function buildDevStoryExecuteCommandToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.BASH,
		name: "execute_command",
		description:
			"Request to execute a CLI command on the system. Use this when you need to perform system operations or run specific commands to accomplish any step in the user's task.",
		parameters: [
			{
				name: "command",
				required: true,
				type: "string",
				instruction:
					"The CLI command to execute. This should be valid for the current operating system. Do not use the ~ character or $HOME to refer to the home directory. Always use absolute paths. The command will be executed from the current workspace, you do not need to cd to the workspace.",
				description: "The CLI command to execute.",
			},
			{
				name: "requires_approval",
				required: true,
				type: "boolean",
				instruction:
					"To indicate whether this command requires explicit user approval or interaction before it should be executed. For system/file altering operations like installing/uninstalling packages, removing/overwriting files, system configuration changes, network operations, or any commands that are considered potentially dangerous must be set to true. False for safe operations like running development servers, building projects, and other non-destructive operations.",
				description: "Whether this command requires explicit user approval.",
			},
		],
	}
}

export function buildDevStoryStoryTaskCompleteToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.STORY_TASK_COMPLETE,
		name: "story_task_complete",
		description: "Mark a task or subtask complete in the active dev-story target story document.",
		parameters: [
			{
				name: "storyItemId",
				required: true,
				type: "string",
				instruction: "A task ID or subtask ID from the target story document.",
				description: "A task ID or subtask ID from the target story document.",
			},
		],
	}
}

export function buildDevStoryRequestTaskDetailToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.REQUEST_TASK_DETAIL,
		name: "request_task_detail",
		description: "Request detailed instructions for a task in the active dev-story target story document.",
		parameters: [
			{
				name: "storyTaskId",
				required: true,
				type: "string",
				instruction: "The task ID from the target story document.",
				description: "The task ID from the target story document.",
			},
		],
	}
}

export function buildDevStoryShowIncompleteTasksToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.SHOW_INCOMPLETE_TASKS,
		name: "show_incomplete_tasks",
		description: "Request the list of incomplete task and subtask IDs for the active dev-story target story document.",
		parameters: [],
	}
}

export function buildDevStoryAskFollowupQuestionToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.ASK,
		name: "ask_followup_question",
		description:
			"Ask the user a concise question when clarification or a direct answer is needed. On success, this tool displays the question to the user and ends your current turn.",
		parameters: [
			{
				name: "question",
				required: true,
				type: "string",
				instruction: "The single question to ask the user.",
				description: "The single question to ask the user.",
			},
			{
				name: "options",
				required: true,
				type: "array",
				items: { type: "string" },
				instruction: "An array of 2-5 options for the user to choose from.",
				description: "An array of 2-5 options for the user to choose from.",
			},
			AGENT_FEEDBACK_PARAMETER,
		],
	}
}

export function buildDevStorySendUserMessageToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.SEND_USER_MESSAGE,
		name: "send_user_message",
		description:
			"Send a direct user-visible message when other response tools are not appropriate or available. On success, this tool displays the message to the user and ends your current turn.",
		parameters: [
			{
				name: "message",
				required: true,
				type: "string",
				instruction: "The direct message to show to the user.",
				description: "The direct message to show to the user.",
			},
			AGENT_FEEDBACK_PARAMETER,
		],
	}
}

export function buildDevStoryAttemptCompletionToolSchema(): ClineToolSpec {
	return {
		variant: DEV_STORY_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.ATTEMPT,
		name: "attempt_completion",
		description: "Deliver the final dev-story recap message to the user.",
		parameters: [
			{
				name: "result",
				required: true,
				type: "string",
				instruction: "Final user-facing recap message.",
				description: "Final user-facing recap message.",
			},
		],
	}
}

export function buildDevStoryStep2ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildDevStoryReadFileToolSchema(),
		buildDevStoryReadFileRangeToolSchema(),
		buildDevStoryListFilesToolSchema(),
		buildDevStorySearchFilesToolSchema(),
		buildDevStoryListCodeDefinitionNamesToolSchema(),
		buildDevStoryApplyPatchToolSchema(),
		buildDevStoryExecuteCommandToolSchema(),
		buildDevStoryStoryTaskCompleteToolSchema(),
		buildDevStoryRequestTaskDetailToolSchema(),
		buildDevStoryShowIncompleteTasksToolSchema(),
		buildDevStoryAskFollowupQuestionToolSchema(),
		buildDevStorySendUserMessageToolSchema(),
	]
}

export function buildDevStoryStep3ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildDevStoryReadFileToolSchema(),
		buildDevStoryReadFileRangeToolSchema(),
		buildDevStoryListFilesToolSchema(),
		buildDevStorySearchFilesToolSchema(),
		buildDevStoryAskFollowupQuestionToolSchema(),
		buildDevStorySendUserMessageToolSchema(),
		buildDevStoryAttemptCompletionToolSchema(),
	]
}

export function buildDevStoryStep4ToolSchemas(): readonly ClineToolSpec[] {
	return []
}
