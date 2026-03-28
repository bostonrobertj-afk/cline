import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "set_workflow_placeholders",
	description:
		'Persist dynamic placeholder values discovered during the active workflow. Use the wrapper shape {"values":{"story_path":"docs/story.md","methods":"Tree of Thought, Genre Mashup, Explain Reasoning, Feynman Technique, SCAMPER Method"}}. Do not use this for stable config-backed placeholders like output_folder; those come from .cline/workflow-config.yaml.',
	contextRequirements: (context) =>
		context.managedWorkflowActive === true || context.activeWorkflowSupportsPlaceholders === true,
	parameters: [
		{
			name: "values",
			required: true,
			type: "object",
			instruction:
				'Object map of placeholder keys to string values. Call the tool as {"values": {...}}. Not arrays of {name,value} or {key,value}.',
			additionalProperties: {
				type: "string",
			},
		},
	],
}

export const set_workflow_placeholders_variants = [generic]
