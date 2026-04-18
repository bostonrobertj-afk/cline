import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.SET_WORKFLOW_VALUES

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "set_workflow_values",
	description: 'Write string values to the active workflow session. Call this tool using the wrapper shape {"values": {...}}.',
	parameters: [
		{
			name: "values",
			required: true,
			type: "object",
			instruction: 'Object map of workflow value keys to string values. Call the tool as {"values": {...}}.',
			additionalProperties: {
				type: "string",
			},
		},
	],
}

export const set_workflow_values_variants = [generic]
