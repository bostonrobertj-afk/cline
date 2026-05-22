import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { AGENT_FEEDBACK_PARAMETER } from "@/core/prompts/system-prompt/types"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { WorkflowPromptBuilderInput } from "../../types"

const PI_PLANNING_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

export function buildPiPlanningStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildPiPlanningReadFileToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
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

export function buildPiPlanningReadFileRangeToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
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

export function buildPiPlanningListFilesToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
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

export function buildPiPlanningSearchFilesToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
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

export function buildPiPlanningListCodeDefinitionNamesToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
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

export function buildPiPlanningApplyPatchToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
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

export function buildPiPlanningSendUserMessageToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
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

export function buildPiPlanningAskFollowupQuestionToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
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

export function buildPiPlanningWorkflowProgressRequestToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
		name: "workflow_progress_request",
		description: "Ask the user to confirm whether the current pi-planning workflow step is ready to advance.",
		parameters: [],
	}
}

export function buildPiPlanningAttemptCompletionToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.ATTEMPT,
		name: "attempt_completion",
		description: "Deliver the final pi-planning completion message to the user.",
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

export function buildPiPlanningPlanStoryArtifactsToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.PLAN_STORY_ARTIFACTS,
		name: "plan_story_artifacts",
		description: "Plan the story artifact inventory for the selected PI Planning epic.",
		parameters: [
			{
				name: "epic_identity",
				required: true,
				type: "string",
				instruction: "Positive numeric epic identity for the selected PI Planning epic.",
				description: "Positive numeric epic identity for the selected PI Planning epic.",
			},
			{
				name: "story_count",
				required: true,
				type: "integer",
				instruction: "Positive story count to plan as primary stories for the selected epic.",
				description: "Positive story count to plan as primary stories for the selected epic.",
			},
		],
	}
}

export function buildPiPlanningGenerateStoryFilesToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.GENERATE_STORY_FILES,
		name: "generate_story_files",
		description: "Generate draft story files for the selected PI Planning epic.",
		parameters: [
			{
				name: "epic_identity",
				required: true,
				type: "string",
				instruction: "Positive numeric epic identity for the selected PI Planning epic.",
				description: "Positive numeric epic identity for the selected PI Planning epic.",
			},
		],
	}
}

export function buildPiPlanningSetWorkflowValuesToolSchema(): ClineToolSpec {
	return {
		variant: PI_PLANNING_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.SET_WORKFLOW_VALUES,
		name: "set_workflow_values",
		description: "Persist PI Planning workflow values for the active workflow session.",
		parameters: [
			{
				name: "values",
				required: true,
				type: "object",
				instruction: "Workflow values to persist for the active PI Planning workflow session.",
				description: "Workflow values to persist for the active PI Planning workflow session.",
				properties: {
					stories_index: { type: "string" },
				},
				requiredProperties: ["stories_index"],
				additionalProperties: false,
			},
		],
	}
}

export function buildPiPlanningStep2ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildPiPlanningReadFileToolSchema(),
		buildPiPlanningSendUserMessageToolSchema(),
		buildPiPlanningAskFollowupQuestionToolSchema(),
		buildPiPlanningWorkflowProgressRequestToolSchema(),
	]
}

export function buildPiPlanningStep3ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildPiPlanningListFilesToolSchema(),
		buildPiPlanningSearchFilesToolSchema(),
		buildPiPlanningListCodeDefinitionNamesToolSchema(),
		buildPiPlanningReadFileToolSchema(),
		buildPiPlanningReadFileRangeToolSchema(),
		buildPiPlanningSendUserMessageToolSchema(),
		buildPiPlanningAskFollowupQuestionToolSchema(),
		buildPiPlanningWorkflowProgressRequestToolSchema(),
	]
}

export function buildPiPlanningStep4ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildPiPlanningReadFileToolSchema(),
		buildPiPlanningPlanStoryArtifactsToolSchema(),
		buildPiPlanningSetWorkflowValuesToolSchema(),
		buildPiPlanningSendUserMessageToolSchema(),
		buildPiPlanningAskFollowupQuestionToolSchema(),
		buildPiPlanningWorkflowProgressRequestToolSchema(),
	]
}

export function buildPiPlanningStep5ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildPiPlanningGenerateStoryFilesToolSchema(),
		buildPiPlanningSendUserMessageToolSchema(),
		buildPiPlanningAskFollowupQuestionToolSchema(),
	]
}

export function buildPiPlanningStep6ToolSchemas(input: WorkflowPromptBuilderInput): readonly ClineToolSpec[] {
	if (input.session.workflowValues.edit_intent === "edit existing story file") {
		return [
			buildPiPlanningReadFileToolSchema(),
			buildPiPlanningApplyPatchToolSchema(),
			buildPiPlanningSendUserMessageToolSchema(),
			buildPiPlanningAskFollowupQuestionToolSchema(),
			buildPiPlanningAttemptCompletionToolSchema(),
		]
	}

	return [
		buildPiPlanningListFilesToolSchema(),
		buildPiPlanningReadFileToolSchema(),
		buildPiPlanningApplyPatchToolSchema(),
		buildPiPlanningPlanStoryArtifactsToolSchema(),
		buildPiPlanningGenerateStoryFilesToolSchema(),
		buildPiPlanningSendUserMessageToolSchema(),
		buildPiPlanningAskFollowupQuestionToolSchema(),
		buildPiPlanningAttemptCompletionToolSchema(),
	]
}
