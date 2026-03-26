import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "set_workflow_placeholders",
	description:
		'Persist placeholder values for the active placeholder workflow step. Example: {"story_path":"docs/story.md","project_context":"docs/project-context.md"}.',
	contextRequirements: (context) =>
		context.managedWorkflowActive === true || context.activeWorkflowSupportsPlaceholders === true,
	parameters: [
		{
			name: "values",
			required: true,
			type: "object",
			instruction: "Object map of placeholder keys to string values. Not arrays of {name,value} or {key,value}.",
			additionalProperties: {
				type: "string",
			},
		},
	],
}

export const set_workflow_placeholders_variants = [generic]
