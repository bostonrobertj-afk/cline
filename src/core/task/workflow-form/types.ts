import type { WorkflowForm, WorkflowFormDefinitionPayload, WorkflowFormSubmittedValuePayload } from "@shared/ExtensionMessage"
import type { WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"

export type WorkflowFormId = string

export type WorkflowFormSessionValues = Record<string, WorkflowFormSubmittedValuePayload>
export type WorkflowFormValues = WorkflowFormSessionValues

export type WorkflowFormSessionData = Record<
	string,
	WorkflowFormSubmittedValuePayload | Record<string, unknown> | unknown[] | string | number | boolean | undefined
>

export interface WorkflowFormSessionFailure {
	panelId: string
	errorMessage: string
}

export interface WorkflowFormSessionState {
	sessionId: string
	workflowFormId: WorkflowFormId
	definitionVersion: number
	definitionPayload: WorkflowFormDefinitionPayload
	firstPanelId: string
	currentPanelId: string
	values: WorkflowFormSessionValues
	data: WorkflowFormSessionData
	failure?: WorkflowFormSessionFailure
}

export interface WorkflowFormRuntimeCreateSessionOptions {
	workflowFormId: WorkflowFormId
	definitionPayload: WorkflowFormDefinitionPayload
}

export type WorkflowFormRuntimeOutcome =
	| {
			kind: "render_form"
			session: WorkflowFormSessionState
			payload: WorkflowForm
	  }
	| {
			kind: "invoke_deterministic_operation"
			session: WorkflowFormSessionState
			operationId: string
			nextPanelId?: string
			terminal?: boolean
	  }
	| {
			kind: "complete_success"
			session: WorkflowFormSessionState
			payload: WorkflowForm
			successMessage: string
	  }

export interface WorkflowFormRuntimeLike {
	createSession(options: WorkflowFormRuntimeCreateSessionOptions): WorkflowFormSessionState
	buildPayload(session: WorkflowFormSessionState): WorkflowForm
	buildFailurePayload(session: WorkflowFormSessionState, errorMessage: string, panelId?: string): WorkflowForm
	buildSuccessPayload(session: WorkflowFormSessionState, successMessage: string): WorkflowForm
	handleSubmission(session: WorkflowFormSessionState, request: WorkflowFormSubmissionRequest): WorkflowFormRuntimeOutcome
}
