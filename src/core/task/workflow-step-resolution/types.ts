import type {
	ClineWorkflowStepResolutionStatus,
	WorkflowStepResolutionStatusDefinition,
	WorkflowStepResolutionStatusState,
} from "@shared/ExtensionMessage"
import type { ClineDefaultTool } from "@/shared/tools"

export type WorkflowStepResolutionTriggerSource = "deterministic_workflow_progression"

export type WorkflowStepResolutionSessionOwner = {
	kind: "workflow_step"
	workflowName: string
	stepNumber: number
}

export type WorkflowStepResolutionEvaluationResult =
	| { succeeded: true }
	| { succeeded: false; errorMessage: string; fallbackToAgent?: boolean }

export interface WorkflowStepResolutionToolExecutionRequest {
	toolName: ClineDefaultTool
	toolInput: Record<string, unknown>
	toolParams: Record<string, string>
}

export interface WorkflowStepResolutionDefinition {
	id: string
	toolName: ClineDefaultTool
	buildStatusDefinition(session: WorkflowStepResolutionSessionState): WorkflowStepResolutionStatusDefinition
	buildToolExecutionRequest(session: WorkflowStepResolutionSessionState): WorkflowStepResolutionToolExecutionRequest
	evaluateToolExecutionResult(
		session: WorkflowStepResolutionSessionState,
		args: { toolResultText?: string },
	): WorkflowStepResolutionEvaluationResult
}

export interface WorkflowStepResolutionSessionState {
	sessionId: string
	definitionId: string
	triggerSource: WorkflowStepResolutionTriggerSource
	owner: WorkflowStepResolutionSessionOwner
	state: WorkflowStepResolutionStatusState
	lastError?: string
}

export type WorkflowStepResolutionRuntimeOutcome = "success" | "failure" | "fallback_to_agent"

export interface WorkflowStepResolutionRuntimeLike {
	createSession(options: {
		definitionId: string
		triggerSource: WorkflowStepResolutionTriggerSource
		owner: WorkflowStepResolutionSessionOwner
	}): WorkflowStepResolutionSessionState
	buildPayload(session: WorkflowStepResolutionSessionState): ClineWorkflowStepResolutionStatus
	buildTerminalSession(
		session: WorkflowStepResolutionSessionState,
		state: Exclude<WorkflowStepResolutionStatusState, "pending">,
		lastError?: string,
	): WorkflowStepResolutionSessionState
}
