import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const BRAINSTORMING_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

export function buildBrainstormingBuildWorkflowDocumentToolSchema(): ClineToolSpec {
	return {
		variant: BRAINSTORMING_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
		name: "build_workflow_document",
		description:
			"Write fully resolved markdown content to the active brainstorming workflow document path supplied by the workflow prompt.",
		parameters: [
			{
				name: "artifact_id",
				required: true,
				type: "string",
				instruction: "The workflow artifact definition id for the active brainstorming document.",
				description: "Workflow artifact definition id for the active brainstorming document.",
			},
			{
				name: "destination_path",
				required: true,
				type: "string",
				instruction: "The absolute output file path provided by the workflow prompt.",
				description: "Absolute output file path provided by the workflow prompt.",
			},
			{
				name: "content",
				required: true,
				type: "string",
				instruction: "The complete markdown content to write to the brainstorming document.",
				description: "Complete markdown content to write to the brainstorming document.",
			},
		],
	}
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

export function buildBrainstormingStep3SetWorkflowValuesToolSchema(): ClineToolSpec {
	return {
		variant: BRAINSTORMING_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.SET_WORKFLOW_VALUES,
		name: "set_workflow_values",
		description: "Persist brainstorming workflow values collected during interactive brainstorming facilitation.",
		parameters: [
			{
				name: "values",
				required: true,
				type: "object",
				instruction: "Workflow values to persist for the active brainstorming session.",
				description: "Workflow values to persist for the active brainstorming session.",
				properties: {
					techniques_used: {
						type: "array",
						items: { type: "string" },
						description: "Brainstorming techniques used during the session.",
					},
					ideas_generated: {
						type: "array",
						items: { type: "string" },
						description: "Ideas generated during the session.",
					},
				},
				additionalProperties: false,
			},
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
		buildBrainstormingBuildWorkflowDocumentToolSchema(),
		buildBrainstormingWorkflowProgressRequestToolSchema(),
	]
}

export function buildBrainstormingStep3ChooseOrRandomToolSchemas(): readonly ClineToolSpec[] {
	return [
		buildBrainstormingBuildWorkflowDocumentToolSchema(),
		buildBrainstormingStep3SetWorkflowValuesToolSchema(),
		buildBrainstormingWorkflowProgressRequestToolSchema(),
	]
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
