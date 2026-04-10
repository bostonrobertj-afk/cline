import type { ClineWorkflowStepResolutionStatus, WorkflowStepResolutionStatusDefinition } from "@shared/ExtensionMessage"
import type { WorkflowStepResolutionSessionState } from "./types"

export function buildWorkflowStepResolutionStatusPayload(
	session: WorkflowStepResolutionSessionState,
	definition: WorkflowStepResolutionStatusDefinition,
): ClineWorkflowStepResolutionStatus {
	return {
		sessionId: session.sessionId,
		definitionId: session.definitionId,
		owner: {
			workflowName: session.owner.workflowName,
			stepNumber: session.owner.stepNumber,
		},
		state: session.state,
		definition,
	}
}
