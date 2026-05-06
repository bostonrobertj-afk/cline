import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { AGENT_FEEDBACK_PARAMETER } from "@/core/prompts/system-prompt/types"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { WorkflowPromptBuilderInput } from "../../types"

const BRAINSTORMING_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5
const BRAINSTORMING_SELECTED_APPROACH_KEY = "selected_approach"
const BRAINSTORMING_SUGGEST_APPROACH = "I want you to suggest a technique"

export function buildBrainstormingStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildBrainstormingStep2ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildBrainstormingWorkflowProgressRequestToolSchema(): ClineToolSpec {
	return {
		variant: BRAINSTORMING_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
		name: "workflow_progress_request",
		description: "Ask the user to confirm whether the current brainstorming workflow step is ready to advance.",
		parameters: [],
	}
}

export function buildBrainstormingReadFileToolSchema(): ClineToolSpec {
	return {
		variant: BRAINSTORMING_TOOL_SCHEMA_VARIANT,
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

export function buildBrainstormingApplyPatchToolSchema(): ClineToolSpec {
	return {
		variant: BRAINSTORMING_TOOL_SCHEMA_VARIANT,
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

export function buildBrainstormingSendUserMessageToolSchema(): ClineToolSpec {
	return {
		variant: BRAINSTORMING_TOOL_SCHEMA_VARIANT,
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

export function buildBrainstormingAskFollowupQuestionToolSchema(): ClineToolSpec {
	return {
		variant: BRAINSTORMING_TOOL_SCHEMA_VARIANT,
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

export function buildBrainstormingGetMethodsToolSchema(): ClineToolSpec {
	return {
		variant: BRAINSTORMING_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.GET_BRAINSTORMING_METHODS,
		name: "get_brainstorming_methods",
		description: "Retrieve the supported brainstorming technique inventory from the active brainstorming workflow registry.",
		parameters: [],
	}
}

export function buildBrainstormingAppendSelectedTechniqueToolSchema(): ClineToolSpec {
	return {
		variant: BRAINSTORMING_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.APPEND_BRAINSTORMING_SELECTED_TECHNIQUE,
		name: "append_brainstorming_selected_technique",
		description:
			"Append the user-accepted brainstorming technique to the active brainstorming workflow selected-techniques list.",
		parameters: [
			{
				name: "name",
				required: true,
				type: "string",
				instruction: "The user-accepted brainstorming technique name from get_brainstorming_methods.",
				description: "User-accepted brainstorming technique name.",
			},
			{
				name: "description",
				required: true,
				type: "string",
				instruction: "The user-accepted brainstorming technique description from get_brainstorming_methods.",
				description: "User-accepted brainstorming technique description.",
			},
			{
				name: "id",
				required: false,
				type: "string",
				instruction: "Optional stable technique id from get_brainstorming_methods.",
				description: "Optional stable technique id.",
			},
			{
				name: "category",
				required: false,
				type: "string",
				instruction: "Optional technique category from get_brainstorming_methods.",
				description: "Optional technique category.",
			},
		],
	}
}

export function buildBrainstormingStep3SuggestToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildBrainstormingGetMethodsToolSchema(),
		buildBrainstormingAppendSelectedTechniqueToolSchema(),
		buildBrainstormingReadFileToolSchema(),
		buildBrainstormingApplyPatchToolSchema(),
		buildBrainstormingSendUserMessageToolSchema(),
		buildBrainstormingAskFollowupQuestionToolSchema(),
		buildBrainstormingWorkflowProgressRequestToolSchema(),
	]
}

export function buildBrainstormingStep3ChooseOrRandomToolSchemas(): readonly ClineToolSpec[] {
	return buildBrainstormingStep3SuggestToolSchemas()
}

export function buildBrainstormingStep3ToolSchemas(input: WorkflowPromptBuilderInput): readonly ClineToolSpec[] {
	const selectedApproach = input.session.workflowValues[BRAINSTORMING_SELECTED_APPROACH_KEY]
	if (selectedApproach === BRAINSTORMING_SUGGEST_APPROACH) {
		return buildBrainstormingStep3SuggestToolSchemas()
	}

	return buildBrainstormingStep3ChooseOrRandomToolSchemas()
}

export function buildBrainstormingAttemptCompletionToolSchema(): ClineToolSpec {
	return {
		variant: BRAINSTORMING_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.ATTEMPT,
		name: "attempt_completion",
		description: "Deliver the final brainstorming completion message to the user after the output file has been updated.",
		parameters: [
			{
				name: "result",
				required: true,
				type: "string",
				instruction: "Final user-facing completion message that includes the full brainstorming output file path.",
				description: "Final user-facing completion message that includes the full brainstorming output file path.",
			},
		],
	}
}

export function buildBrainstormingStep4ToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildBrainstormingReadFileToolSchema(),
		buildBrainstormingApplyPatchToolSchema(),
		buildBrainstormingSendUserMessageToolSchema(),
		buildBrainstormingAskFollowupQuestionToolSchema(),
		buildBrainstormingAttemptCompletionToolSchema(),
	]
}
