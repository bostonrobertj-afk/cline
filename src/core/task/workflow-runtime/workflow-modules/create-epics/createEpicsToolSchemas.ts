import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { AGENT_FEEDBACK_PARAMETER } from "@/core/prompts/system-prompt/types"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const CREATE_EPICS_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

export function buildCreateEpicsStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildCreateEpicsReadFileToolSchema(): ClineToolSpec {
	return {
		variant: CREATE_EPICS_TOOL_SCHEMA_VARIANT,
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

export function buildCreateEpicsUpsertEpicToolSchema(): ClineToolSpec {
	return {
		variant: CREATE_EPICS_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.UPSERT_EPIC,
		name: "upsert_epic",
		description: "Insert or replace one user-aligned canonical epic section in the active create-epics document.",
		parameters: [
			{
				name: "identity",
				required: true,
				type: "string",
				instruction: "Positive numeric epic identity, such as 1.",
				description: "Positive numeric epic identity.",
			},
			{
				name: "title",
				required: true,
				type: "string",
				instruction: "Non-empty epic title.",
				description: "Non-empty epic title.",
			},
			{
				name: "objective",
				required: true,
				type: "object",
				instruction: "Epic objective with required as_a, i_want, and so_that string fields.",
				description: "Epic objective with as_a, i_want, and so_that fields.",
				properties: {
					as_a: { type: "string" },
					i_want: { type: "string" },
					so_that: { type: "string" },
				},
				requiredProperties: ["as_a", "i_want", "so_that"],
			},
			{
				name: "description",
				required: true,
				type: "string",
				instruction: "Non-empty epic description.",
				description: "Non-empty epic description.",
			},
			{
				name: "requirements",
				required: true,
				type: "array",
				items: { type: "string" },
				instruction: "Array of non-empty requirement statements for this epic.",
				description: "Non-empty requirement statements for this epic.",
			},
			{
				name: "scope",
				required: true,
				type: "array",
				items: { type: "string" },
				instruction: "Array of non-empty in-scope items for this epic.",
				description: "Non-empty in-scope items for this epic.",
			},
			{
				name: "scope_boundary",
				required: true,
				type: "array",
				items: { type: "string" },
				instruction: "Array of non-empty out-of-scope boundary items for this epic.",
				description: "Non-empty out-of-scope boundary items for this epic.",
			},
		],
	}
}

export function buildCreateEpicsSendUserMessageToolSchema(): ClineToolSpec {
	return {
		variant: CREATE_EPICS_TOOL_SCHEMA_VARIANT,
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

export function buildCreateEpicsAskFollowupQuestionToolSchema(): ClineToolSpec {
	return {
		variant: CREATE_EPICS_TOOL_SCHEMA_VARIANT,
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

export function buildCreateEpicsAttemptCompletionToolSchema(): ClineToolSpec {
	return {
		variant: CREATE_EPICS_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.ATTEMPT,
		name: "attempt_completion",
		description: "Deliver the final create-epics completion message to the user after the epics are aligned.",
		parameters: [
			{
				name: "result",
				required: true,
				type: "string",
				instruction: "Final user-facing completion recap.",
				description: "Final user-facing completion recap.",
			},
		],
	}
}

export function buildCreateEpicsStep2ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildCreateEpicsReadFileToolSchema(),
		buildCreateEpicsUpsertEpicToolSchema(),
		buildCreateEpicsSendUserMessageToolSchema(),
		buildCreateEpicsAskFollowupQuestionToolSchema(),
		buildCreateEpicsAttemptCompletionToolSchema(),
	]
}
