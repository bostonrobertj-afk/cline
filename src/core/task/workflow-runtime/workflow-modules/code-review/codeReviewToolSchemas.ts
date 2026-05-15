import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { AGENT_FEEDBACK_PARAMETER } from "@/core/prompts/system-prompt/types"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const CODE_REVIEW_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

export function buildCodeReviewStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildCodeReviewUseSubagentsToolSchema(): ClineToolSpec {
	return {
		variant: CODE_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.USE_SUBAGENTS,
		name: "use_subagents",
		description: "Launch specialist code-review subagents for the active code-review workflow step.",
		parameters: [
			{
				name: "prompt_1",
				required: true,
				type: "string",
				instruction: "First specialist subagent prompt.",
				description: "First specialist subagent prompt.",
			},
			{
				name: "prompt_2",
				required: true,
				type: "string",
				instruction: "Second specialist subagent prompt.",
				description: "Second specialist subagent prompt.",
			},
		],
	}
}

export function buildCodeReviewReadFileToolSchema(): ClineToolSpec {
	return {
		variant: CODE_REVIEW_TOOL_SCHEMA_VARIANT,
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

export function buildCodeReviewReadFileRangeToolSchema(): ClineToolSpec {
	return {
		variant: CODE_REVIEW_TOOL_SCHEMA_VARIANT,
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

export function buildCodeReviewRecordFindingsToolSchema(): ClineToolSpec {
	return {
		variant: CODE_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.RECORD_FINDINGS,
		name: "record_findings",
		description: "Persist validated and categorized code-review findings to the active code-review output document.",
		parameters: [
			{
				name: "findings",
				required: true,
				type: "array",
				instruction: "Validated code-review findings to persist. Use an empty array when there are no findings.",
				description: "Validated code-review findings to persist.",
				items: {
					type: "object",
					properties: {
						finding: {
							type: "string",
							description: "Short finding heading.",
						},
						categories: {
							type: "array",
							items: {
								type: "string",
								enum: ["task_failure", "dev_agent_failure", "upstream_failure"],
							},
							description: "One or more approved finding categories.",
						},
						description: {
							type: "string",
							description: "Finding detail and supporting context.",
						},
					},
					required: ["finding", "categories", "description"],
					additionalProperties: false,
				},
			},
		],
	}
}

export function buildCodeReviewApplyPatchToolSchema(): ClineToolSpec {
	return {
		variant: CODE_REVIEW_TOOL_SCHEMA_VARIANT,
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

export function buildCodeReviewSendUserMessageToolSchema(): ClineToolSpec {
	return {
		variant: CODE_REVIEW_TOOL_SCHEMA_VARIANT,
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

export function buildCodeReviewAskFollowupQuestionToolSchema(): ClineToolSpec {
	return {
		variant: CODE_REVIEW_TOOL_SCHEMA_VARIANT,
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

export function buildCodeReviewWorkflowProgressRequestToolSchema(): ClineToolSpec {
	return {
		variant: CODE_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
		name: "workflow_progress_request",
		description: "Ask the user to confirm whether the current code-review workflow step is ready to advance.",
		parameters: [],
	}
}

export function buildCodeReviewAttemptCompletionToolSchema(): ClineToolSpec {
	return {
		variant: CODE_REVIEW_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.ATTEMPT,
		name: "attempt_completion",
		description: "Deliver the final code-review completion message to the user.",
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

export function buildCodeReviewStep2ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildCodeReviewUseSubagentsToolSchema(),
		buildCodeReviewSendUserMessageToolSchema(),
		buildCodeReviewWorkflowProgressRequestToolSchema(),
	]
}

export function buildCodeReviewStep3ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildCodeReviewReadFileToolSchema(),
		buildCodeReviewReadFileRangeToolSchema(),
		buildCodeReviewRecordFindingsToolSchema(),
		buildCodeReviewSendUserMessageToolSchema(),
		buildCodeReviewWorkflowProgressRequestToolSchema(),
	]
}

export function buildCodeReviewStep4ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildCodeReviewReadFileToolSchema(),
		buildCodeReviewReadFileRangeToolSchema(),
		buildCodeReviewApplyPatchToolSchema(),
		buildCodeReviewAskFollowupQuestionToolSchema(),
		buildCodeReviewSendUserMessageToolSchema(),
		buildCodeReviewAttemptCompletionToolSchema(),
	]
}
