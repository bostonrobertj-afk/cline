import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "set_workflow_placeholders",
	description:
		"Persist workflow-discovered placeholder values for the active managed workflow so later steps can render real runtime values. Use this only when the workflow has discovered values that should be reused later, such as topic names, generated file paths, or other workflow-state variables.",
	contextRequirements: (context) => context.managedWorkflowActive === true,
	parameters: [
		{
			name: "values",
			required: true,
			type: "object",
			instruction:
				'An object map of placeholder names to their resolved string values. Use exact placeholder names from the managed workflow instructions. Example: {"research_topic": "user onboarding", "validation_report_path": "docs/validation-report.md"}',
			additionalProperties: {
				type: "string",
			},
		},
	],
}

export const set_workflow_placeholders_variants = [generic]
