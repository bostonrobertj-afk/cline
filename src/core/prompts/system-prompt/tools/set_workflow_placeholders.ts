import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "set_workflow_placeholders",
	description:
		"Persist a workflow-state value for the active managed workflow when the current step establishes it. This tool is typically used for dynamic managed-workflow placeholders written as {{placeholder_name}}. Use it when the workflow creates, selects, derives, validates, or receives a named runtime value that the workflow instructions refer to by placeholder key, such as an active file path, generated output path, selected artifact, confirmed topic, or other workflow-state value.",
	contextRequirements: (context) => context.managedWorkflowActive === true,
	parameters: [
		{
			name: "values",
			required: true,
			type: "object",
			instruction:
				'An object map of placeholder names to their resolved string values. Use the exact placeholder key named in the managed workflow instructions. This is typically for dynamic workflow-state placeholders such as {{research_topic}} or {{output_file}}. Example: {"research_topic": "user onboarding", "validation_report_path": "docs/validation-report.md"}',
			additionalProperties: {
				type: "string",
			},
		},
	],
}

export const set_workflow_placeholders_variants = [generic]
