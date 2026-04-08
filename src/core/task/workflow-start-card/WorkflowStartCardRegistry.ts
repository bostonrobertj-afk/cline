import type { WorkflowStartCardRegistryEntry } from "@/core/task/workflow-start-card/types"

const workflowStartCardRegistry: Record<string, WorkflowStartCardRegistryEntry> = {
	"quick-spec.md": {
		workflowName: "quick-spec.md",
		markdownBody:
			"In this workflow you will build a small implementation-ready tech spec through guided discovery, scoped planning, and a final review pass. You'll define the objective, solution, scope, context, acceptance criteria, seams, and executable tasks needed for quick implementation.",
	},
}

export function getWorkflowStartCardRegistryEntry(workflowName: string): WorkflowStartCardRegistryEntry | undefined {
	return workflowStartCardRegistry[workflowName]
}
