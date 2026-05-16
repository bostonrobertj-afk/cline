import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { AGENT_FEEDBACK_PARAMETER } from "@/core/prompts/system-prompt/types"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

export function buildEdgeCaseHunterReviewStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildEdgeCaseHunterReviewExecuteCommandToolSchema(): ClineToolSpec {
	return {
		variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.BASH,
		name: "execute_command",
		description:
			"Request to execute a CLI command on the system. Use this when you need to inspect git-backed implementation evidence.",
		parameters: [
			{
				name: "command",
				required: true,
				type: "string",
				instruction:
					"The CLI command to execute. This should be valid for the current operating system and scoped to the edge case hunter review evidence.",
				description: "The CLI command to execute.",
			},
			{
				name: "requires_approval",
				required: true,
				type: "boolean",
				instruction:
					"Whether this command requires explicit user approval before execution. Use true for potentially impactful commands and false for safe read-only inspection commands.",
				description: "Whether this command requires explicit user approval.",
			},
		],
	}
}

export function buildEdgeCaseHunterReviewListFilesToolSchema(): ClineToolSpec {
	return {
		variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.LIST_FILES,
		name: "list_files",
		description:
			"Request to list files and directories within the specified directory for edge case hunter review source inspection.",
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

export function buildEdgeCaseHunterReviewSearchFilesToolSchema(): ClineToolSpec {
	return {
		variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.SEARCH,
		name: "search_files",
		description: "Request to perform a regex search across files in a specified directory.",
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

export function buildEdgeCaseHunterReviewListCodeDefinitionNamesToolSchema(): ClineToolSpec {
	return {
		variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.LIST_CODE_DEF,
		name: "list_code_definition_names",
		description: "Request to list definition names used in source code files at the top level of the specified directory.",
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

export function buildEdgeCaseHunterReviewReadFileToolSchema(): ClineToolSpec {
	return {
		variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.FILE_READ,
		name: "read_file",
		description:
			"Request to read the contents of a file at the specified path. Do NOT use this tool to list the contents of a directory.",
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

export function buildEdgeCaseHunterReviewReadFileRangeToolSchema(): ClineToolSpec {
	return {
		variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT,
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

export function buildEdgeCaseHunterReviewApplyPatchToolSchema(): ClineToolSpec {
	return {
		variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT,
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

export function buildEdgeCaseHunterReviewWriteToFileToolSchema(): ClineToolSpec {
	return {
		variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.FILE_NEW,
		name: "write_to_file",
		description:
			"Request to write content to a file at the specified absolute path. If the file exists, it will be overwritten with the provided content.",
		parameters: [
			{
				name: "absolutePath",
				required: true,
				type: "string",
				instruction: "The absolute path to the file to write to.",
				description: "The absolute path to the file to write to.",
			},
			{
				name: "content",
				required: true,
				type: "string",
				instruction:
					"After providing the path so a file can be created, then use this to provide the content to write to the file.",
				description: "The content to write to the file.",
			},
		],
	}
}

export function buildEdgeCaseHunterReviewSendUserMessageToolSchema(): ClineToolSpec {
	return {
		variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT,
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

export function buildEdgeCaseHunterReviewAttemptCompletionToolSchema(): ClineToolSpec {
	return {
		variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.ATTEMPT,
		name: "attempt_completion",
		description: "Deliver the final edge case hunter review completion message to the user.",
		parameters: [
			{
				name: "result",
				required: true,
				type: "string",
				instruction: "Final user-facing completion message.",
				description: "Final user-facing completion message.",
			},
		],
	}
}

export function buildEdgeCaseHunterReviewStep2ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildEdgeCaseHunterReviewExecuteCommandToolSchema(),
		buildEdgeCaseHunterReviewListFilesToolSchema(),
		buildEdgeCaseHunterReviewSearchFilesToolSchema(),
		buildEdgeCaseHunterReviewListCodeDefinitionNamesToolSchema(),
		buildEdgeCaseHunterReviewReadFileToolSchema(),
		buildEdgeCaseHunterReviewReadFileRangeToolSchema(),
		buildEdgeCaseHunterReviewApplyPatchToolSchema(),
		buildEdgeCaseHunterReviewWriteToFileToolSchema(),
		buildEdgeCaseHunterReviewSendUserMessageToolSchema(),
		buildEdgeCaseHunterReviewAttemptCompletionToolSchema(),
	]
}
