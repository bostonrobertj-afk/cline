import type { WorkflowStepResolutionStatusDefinition, WorkflowStepResolutionStatusState } from "@shared/ExtensionMessage"
import type { ActiveWorkflowSession } from "@/core/task/workflow-runtime/types"
import type { ClineDefaultTool } from "@/shared/tools"

export type WorkflowStepResolutionTriggerSource = "execute_tool_backed_operation"

export type WorkflowStepResolutionSessionOwner = {
	kind: "workflow_step"
	workflowName: string
	stepNumber: number
}

export type WorkflowToolBackedOperationEvaluationResult =
	| { succeeded: true }
	| { succeeded: false; errorMessage: string; fallbackToAgent?: boolean }

export interface WorkflowToolBackedOperationExecutionRequest {
	toolName: ClineDefaultTool
	toolInput: Record<string, unknown>
	toolParams: Record<string, string>
}

export interface WorkflowToolBackedActionInstruction {
	toolName: ClineDefaultTool
	buildStatusDefinition(session: WorkflowStepResolutionSessionState): WorkflowStepResolutionStatusDefinition
	buildToolExecutionRequest(args: {
		toolBackedOperationSession: WorkflowStepResolutionSessionState
		activeWorkflowSession: ActiveWorkflowSession
	}): WorkflowToolBackedOperationExecutionRequest
	evaluateToolExecutionResult(
		session: WorkflowStepResolutionSessionState,
		args: { toolResultText?: string },
	): WorkflowToolBackedOperationEvaluationResult
}

export interface WorkflowStepResolutionSourceRoute {
	branchId: string
	routeId: string
}

export interface WorkflowStepResolutionSessionState {
	sessionId: string
	sourceRoute: WorkflowStepResolutionSourceRoute
	triggerSource: WorkflowStepResolutionTriggerSource
	owner: WorkflowStepResolutionSessionOwner
	state: WorkflowStepResolutionStatusState
	lastError?: string
}
