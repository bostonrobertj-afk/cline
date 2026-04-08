import type { ClineWorkflowStartCard } from "@shared/ExtensionMessage"
import type { WorkflowStartCardSessionState } from "@/core/task/workflow-start-card/types"

function buildWorkflowStartCardTitle(workflowName: string): string {
	const transformedName = workflowName
		.replace(/\.md$/, "")
		.split("-")
		.map((token) => token.charAt(0).toUpperCase() + token.slice(1))
		.join(" ")

	return `Welcome to the ${transformedName} Workflow!`
}

export function buildWorkflowStartCardPayload(session: WorkflowStartCardSessionState): ClineWorkflowStartCard {
	return {
		sessionId: session.sessionId,
		title: buildWorkflowStartCardTitle(session.workflowName),
		markdownBody: session.markdownBody,
		ctaLabel: "Get Started",
	}
}
