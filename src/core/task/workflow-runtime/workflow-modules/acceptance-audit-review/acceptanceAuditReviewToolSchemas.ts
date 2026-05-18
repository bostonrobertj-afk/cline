import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const ACCEPTANCE_AUDIT_REVIEW_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

export function buildAcceptanceAuditReviewStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildAcceptanceAuditReviewExecuteCommandToolSchema(): ClineToolSpec {
	return {
		variant: ACCEPTANCE_AUDIT_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.BASH,
		name: "execute_command",
		description:
			"Request to execute a CLI command on the system. Use this when you need to inspect git-backed implementation evidence.",
		parameters: [
			{
				name: "command",
				required: true,
				type: "string",
				instruction: "The CLI command to execute.",
				description: "The CLI command to execute.",
			},
			{
				name: "requires_approval",
				required: true,
				type: "boolean",
				instruction: "Whether this command requires explicit user approval before execution.",
				description: "Whether this command requires explicit user approval before execution.",
			},
		],
	}
}

export function buildAcceptanceAuditReviewListFilesToolSchema(): ClineToolSpec {
	return {
		variant: ACCEPTANCE_AUDIT_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.LIST_FILES,
		name: "list_files",
		description:
			"Request to list files and directories within the specified directory for acceptance audit review source inspection.",
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
				instruction: "Whether to list files recursively.",
				description: "Whether to list files recursively.",
			},
		],
	}
}

export function buildAcceptanceAuditReviewSearchFilesToolSchema(): ClineToolSpec {
	return {
		variant: ACCEPTANCE_AUDIT_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.SEARCH,
		name: "search_files",
		description: "Request to perform a regex search across files in a specified directory.",
		parameters: [
			{
				name: "path",
				required: true,
				type: "string",
				instruction: "The path of the directory to search in.",
				description: "The path of the directory to search in.",
			},
			{
				name: "regex",
				required: true,
				type: "string",
				instruction: "The regular expression pattern to search for.",
				description: "The regular expression pattern to search for.",
			},
			{
				name: "file_pattern",
				required: false,
				type: "string",
				instruction: "Glob pattern to filter files.",
				description: "Glob pattern to filter files.",
			},
		],
	}
}

export function buildAcceptanceAuditReviewListCodeDefinitionNamesToolSchema(): ClineToolSpec {
	return {
		variant: ACCEPTANCE_AUDIT_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.LIST_CODE_DEF,
		name: "list_code_definition_names",
		description: "Request to list definition names used in source code files at the top level of the specified directory.",
		parameters: [
			{
				name: "path",
				required: true,
				type: "string",
				instruction: "The path of a directory, not a file.",
				description: "The path of a directory, not a file.",
			},
		],
	}
}

export function buildAcceptanceAuditReviewReadFileToolSchema(): ClineToolSpec {
	return {
		variant: ACCEPTANCE_AUDIT_REVIEW_TOOL_SCHEMA_VARIANT,
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

export function buildAcceptanceAuditReviewReadFileRangeToolSchema(): ClineToolSpec {
	return {
		variant: ACCEPTANCE_AUDIT_REVIEW_TOOL_SCHEMA_VARIANT,
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

export function buildAcceptanceAuditReviewApplyPatchToolSchema(): ClineToolSpec {
	return {
		variant: ACCEPTANCE_AUDIT_REVIEW_TOOL_SCHEMA_VARIANT,
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

export function buildAcceptanceAuditReviewWriteToFileToolSchema(): ClineToolSpec {
	return {
		variant: ACCEPTANCE_AUDIT_REVIEW_TOOL_SCHEMA_VARIANT,
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
				instruction: "The content to write to the file.",
				description: "The content to write to the file.",
			},
		],
	}
}

export function buildAcceptanceAuditReviewSendUserMessageToolSchema(): ClineToolSpec {
	return {
		variant: ACCEPTANCE_AUDIT_REVIEW_TOOL_SCHEMA_VARIANT,
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
		],
	}
}

export function buildAcceptanceAuditReviewAttemptCompletionToolSchema(): ClineToolSpec {
	return {
		variant: ACCEPTANCE_AUDIT_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.ATTEMPT,
		name: "attempt_completion",
		description: "Deliver the final acceptance audit review completion message to the user.",
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

export function buildAcceptanceAuditReviewStep2ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildAcceptanceAuditReviewExecuteCommandToolSchema(),
		buildAcceptanceAuditReviewListFilesToolSchema(),
		buildAcceptanceAuditReviewSearchFilesToolSchema(),
		buildAcceptanceAuditReviewListCodeDefinitionNamesToolSchema(),
		buildAcceptanceAuditReviewReadFileToolSchema(),
		buildAcceptanceAuditReviewReadFileRangeToolSchema(),
		buildAcceptanceAuditReviewApplyPatchToolSchema(),
		buildAcceptanceAuditReviewWriteToFileToolSchema(),
		buildAcceptanceAuditReviewSendUserMessageToolSchema(),
		buildAcceptanceAuditReviewAttemptCompletionToolSchema(),
	]
}
