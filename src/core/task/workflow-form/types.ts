import type { ClineWorkflowForm, WorkflowFormFieldValuePayload, WorkflowFormPhase } from "@shared/ExtensionMessage"
import type { WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"

export type WorkflowFormResolverId = "code_review_step_3_diff_source"
export type WorkflowFormTriggerSource = "deterministic_workflow_progression" | "slash_command"

export interface WorkflowFormSessionOwner {
	kind: "placeholder_workflow_step" | "slash_command"
	workflowName?: string
	stepNumber?: number
}

export type WorkflowFormValues = Record<string, WorkflowFormFieldValuePayload>
export type WorkflowFormToolInput = Record<string, unknown>

export interface WorkflowFormSessionState {
	sessionId: string
	resolverId: WorkflowFormResolverId
	triggerSource: WorkflowFormTriggerSource
	owner: WorkflowFormSessionOwner
	phase: WorkflowFormPhase
	values: WorkflowFormValues
	lastError?: string
}

export interface WorkflowFormResolverDefinition {
	id: WorkflowFormResolverId
	toolName: string
	toolDictionaryRelativePath: string
	getToolDictionaryStartLine(markdown: string): number
	buildConfirmPayload(session: WorkflowFormSessionState, toolDictionaryMarkdown: string): ClineWorkflowForm
	buildCollectPayload(session: WorkflowFormSessionState, toolDictionaryMarkdown: string): ClineWorkflowForm
	buildRetryPayload(session: WorkflowFormSessionState, toolDictionaryMarkdown: string): ClineWorkflowForm
	translateSubmissionToToolUse(values: WorkflowFormValues): WorkflowFormToolInput
}

export interface WorkflowFormRuntimeCreateSessionOptions {
	resolverId: WorkflowFormResolverId
	triggerSource: WorkflowFormTriggerSource
	owner: WorkflowFormSessionOwner
}

export type WorkflowFormRuntimeOutcome =
	| {
			kind: "render_form"
			session: WorkflowFormSessionState
			payload: ClineWorkflowForm
	  }
	| {
			kind: "invoke_tool"
			session: WorkflowFormSessionState
			toolName: string
			toolInput: WorkflowFormToolInput
	  }
	| {
			kind: "fallback_to_agent"
			session: WorkflowFormSessionState
	  }

export interface WorkflowFormRuntimeLike {
	createSession(options: WorkflowFormRuntimeCreateSessionOptions): WorkflowFormSessionState
	buildPayload(session: WorkflowFormSessionState): ClineWorkflowForm
	buildRetryPayload(session: WorkflowFormSessionState, errorMessage: string): ClineWorkflowForm
	buildSuccessPayload(session: WorkflowFormSessionState, successMessage: string): ClineWorkflowForm
	handleSubmission(session: WorkflowFormSessionState, request: WorkflowFormSubmissionRequest): WorkflowFormRuntimeOutcome
}
