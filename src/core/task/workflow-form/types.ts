import type {
	ClineWorkflowForm,
	WorkflowFormDefinitionPayload,
	WorkflowFormSubmittedValuePayload,
} from "@shared/ExtensionMessage"
import type { WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"
import type { ClineDefaultTool } from "@/shared/tools"

export type WorkflowFormResolverId = string
export type WorkflowFormTriggerSource = "deterministic_workflow_progression" | "slash_command"

export interface WorkflowFormSessionOwner {
	kind: "placeholder_workflow_step" | "slash_command"
	workflowName?: string
	stepNumber?: number
}

export interface WorkflowFormStartRequirements {
	requiredFieldKeys: string[]
	optionalFieldKeys: string[]
	oneOfRequirement?: {
		id: string
		fieldKeys: string[]
	}
}

export type WorkflowFormSessionValues = Record<string, WorkflowFormSubmittedValuePayload>
export type WorkflowFormValues = WorkflowFormSessionValues

export type WorkflowFormSessionData = Record<
	string,
	WorkflowFormSubmittedValuePayload | Record<string, unknown> | unknown[] | string | number | boolean | undefined
>

export interface WorkflowFormToolExecutionRequest {
	toolName: ClineDefaultTool
	toolInput: Record<string, unknown>
	toolParams: Record<string, string>
}

export type WorkflowFormOperationApplicationResult =
	| {
			succeeded: true
			operationData?: Record<string, unknown>
			fallbackToAgent?: boolean
			terminalSuccessMessage?: string
	  }
	| {
			succeeded: false
			errorMessage: string
			fallbackToAgent?: boolean
			terminalSuccessMessage?: string
	  }

export interface WorkflowFormResolverDefinition {
	id: WorkflowFormResolverId
	buildDefinition(session: WorkflowFormSessionState): WorkflowFormDefinitionPayload
	buildOperationRequest(session: WorkflowFormSessionState, operationId: string): WorkflowFormToolExecutionRequest
	applyOperationResult(
		session: WorkflowFormSessionState,
		args: {
			operationId: string
			toolResultText?: string
		},
	): WorkflowFormOperationApplicationResult
	buildFailureFallbackMessage(session: WorkflowFormSessionState, operationId: string): string
}

export interface WorkflowFormSessionFailure {
	panelId: string
	errorMessage: string
}

export interface WorkflowFormSessionState {
	sessionId: string
	resolverId: WorkflowFormResolverId
	triggerSource: WorkflowFormTriggerSource
	owner: WorkflowFormSessionOwner
	definitionVersion: number
	definitionPayload: WorkflowFormDefinitionPayload
	firstPanelId: string
	currentPanelId: string
	values: WorkflowFormSessionValues
	data: WorkflowFormSessionData
	failure?: WorkflowFormSessionFailure
}

export interface WorkflowFormRuntimeCreateSessionOptions {
	resolverId: WorkflowFormResolverId
	triggerSource: WorkflowFormTriggerSource
	owner: WorkflowFormSessionOwner
	definitionPayload: WorkflowFormDefinitionPayload
}

export type WorkflowFormRuntimeOutcome =
	| {
			kind: "render_form"
			session: WorkflowFormSessionState
			payload: ClineWorkflowForm
	  }
	| {
			kind: "invoke_deterministic_operation"
			session: WorkflowFormSessionState
			operationId: string
			nextPanelId?: string
			terminal?: boolean
			resultDataKey?: string
			rebuildDefinitionAfterSuccess: boolean
			recomputeDestinationAfterSuccess: boolean
	  }
	| {
			kind: "fallback_to_agent"
			session: WorkflowFormSessionState
	  }
	| {
			kind: "complete_success"
			session: WorkflowFormSessionState
			payload: ClineWorkflowForm
			successMessage: string
	  }

export interface WorkflowFormRuntimeLike {
	createSession(options: WorkflowFormRuntimeCreateSessionOptions): WorkflowFormSessionState
	buildPayload(session: WorkflowFormSessionState): ClineWorkflowForm
	buildFailurePayload(session: WorkflowFormSessionState, errorMessage: string, panelId?: string): ClineWorkflowForm
	buildSuccessPayload(session: WorkflowFormSessionState, successMessage: string): ClineWorkflowForm
	handleSubmission(session: WorkflowFormSessionState, request: WorkflowFormSubmissionRequest): WorkflowFormRuntimeOutcome
	continueAfterDeterministicOperation(args: {
		session: WorkflowFormSessionState
		nextPanelId?: string
		rebuildDefinitionAfterSuccess: boolean
		recomputeDestinationAfterSuccess: boolean
	}): Extract<WorkflowFormRuntimeOutcome, { kind: "render_form" }>
}
