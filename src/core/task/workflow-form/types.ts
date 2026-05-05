import type { WorkflowFormDefinitionPayload, WorkflowFormSubmittedValuePayload } from "@shared/ExtensionMessage"
import type { WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"

export type WorkflowFormId = string

export type WorkflowFormSessionValues = Record<string, WorkflowFormSubmittedValuePayload>
export type WorkflowFormValues = WorkflowFormSessionValues

export type WorkflowFormSessionDataValue =
	| WorkflowFormSubmittedValuePayload
	| string
	| number
	| boolean
	| readonly WorkflowFormSessionDataValue[]
	| { readonly [key: string]: WorkflowFormSessionDataValue }

export type WorkflowFormSessionData = Record<string, WorkflowFormSessionDataValue>

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

export interface WorkflowFormRuntimeCreateSessionBaseOptions {
	workflowFormId: WorkflowFormId
	definitionPayload: WorkflowFormDefinitionPayload
}

export interface WorkflowFormRuntimeCreateSessionOptionsWithStartPanel {
	workflowFormId: WorkflowFormId
	definitionPayload: WorkflowFormDefinitionPayload
	startPanelId: string
}

export interface WorkflowFormRuntimeCreateSessionOptionsWithData {
	workflowFormId: WorkflowFormId
	definitionPayload: WorkflowFormDefinitionPayload
	data: WorkflowFormSessionData
}

export interface WorkflowFormRuntimeCreateSessionOptionsWithStartPanelAndData {
	workflowFormId: WorkflowFormId
	definitionPayload: WorkflowFormDefinitionPayload
	startPanelId: string
	data: WorkflowFormSessionData
}

export type WorkflowFormRuntimeCreateSessionOptions =
	| WorkflowFormRuntimeCreateSessionBaseOptions
	| WorkflowFormRuntimeCreateSessionOptionsWithStartPanel
	| WorkflowFormRuntimeCreateSessionOptionsWithData
	| WorkflowFormRuntimeCreateSessionOptionsWithStartPanelAndData

export interface WorkflowFormRuntimeValueChanges {
	submittedValueKeys: readonly string[]
	clearedValueKeys: readonly string[]
}

export type WorkflowFormRuntimeOutcome =
	| {
			kind: "render_form"
			session: WorkflowFormSessionState
			valueChanges: WorkflowFormRuntimeValueChanges
	  }
	| {
			kind: "complete_success"
			session: WorkflowFormSessionState
			successMessage: string
			valueChanges: WorkflowFormRuntimeValueChanges
	  }

export interface WorkflowFormRuntimeLike {
	createSession(options: WorkflowFormRuntimeCreateSessionOptions): WorkflowFormSessionState
	handleSubmission(session: WorkflowFormSessionState, request: WorkflowFormSubmissionRequest): WorkflowFormRuntimeOutcome
}
