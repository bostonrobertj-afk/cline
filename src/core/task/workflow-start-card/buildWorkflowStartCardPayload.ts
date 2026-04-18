import type { WorkflowStartCard } from "@shared/ExtensionMessage"
import type { WorkflowStartCardSessionState } from "@/core/task/workflow-start-card/types"

function buildWorkflowStartCardTitle(workflowName: string): string {
	const transformedName = workflowName
		.split("-")
		.map((token) => token.charAt(0).toUpperCase() + token.slice(1))
		.join(" ")

	return `Welcome to the ${transformedName} Workflow!`
}

export function buildWorkflowStartCardPayload(session: WorkflowStartCardSessionState): WorkflowStartCard {
	return {
		sessionId: session.sessionId,
		title: buildWorkflowStartCardTitle(session.workflowName),
		markdownBody: session.markdownBody,
		submitLabel: session.submitLabel,
		projectMode: session.projectMode,
		existingProjectOptions: session.existingProjectOptions,
		selectedExistingProject: session.selectedExistingProject,
		newProjectTitle: session.newProjectTitle,
	}
}
