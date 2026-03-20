import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.COMPLETE_WORKFLOW_ITEM

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "complete_workflow_item",
	description:
		"Mark the current backend-managed workflow item as complete. Use this only for the active workflow item in the current phase.",
	contextRequirements: (context) => context.managedWorkflowActive === true,
	parameters: [
		{
			name: "item_id",
			required: true,
			instruction: "The exact workflow item id to mark complete, copied from the active managed workflow prompt block.",
		},
	],
}

export const complete_workflow_item_variants = [generic]
