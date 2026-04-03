import type {
	ClineWorkflowForm,
	WorkflowFormDefinition,
	WorkflowFormFieldValuePayload,
	WorkflowFormPhase,
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

export type WorkflowFormValues = Record<string, WorkflowFormFieldValuePayload>
export type WorkflowFormToolInput = Record<string, unknown>
export interface WorkflowFormToolExecutionRequest {
	toolName: ClineDefaultTool
	toolInput: WorkflowFormToolInput
	toolParams: Record<string, string>
}
export interface WorkflowFormToolExecutionEvaluation {
	succeeded: boolean
	errorMessage?: string
	fallbackToAgent?: boolean
}
export type WorkflowFormSessionPhase = Extract<
	WorkflowFormPhase,
	"confirm" | "select_source" | "collect_inputs" | "retry_error" | "success"
>

export interface WorkflowFormStartOneOfRequirement {
	id: string
	fieldKeys: string[]
}

export interface WorkflowFormStartRequirements {
	requiredFieldKeys: string[]
	optionalFieldKeys: string[]
	oneOfRequirement?: WorkflowFormStartOneOfRequirement
}

export interface WorkflowFormSessionContext {
	workflowName?: string
	workflowStartRequirements?: WorkflowFormStartRequirements
}

export interface WorkflowFormSessionState {
	sessionId: string
	resolverId: WorkflowFormResolverId
	triggerSource: WorkflowFormTriggerSource
	owner: WorkflowFormSessionOwner
	phase: WorkflowFormSessionPhase
	initialPhase: Exclude<WorkflowFormSessionPhase, "success">
	values: WorkflowFormValues
	lastError?: string
	context?: WorkflowFormSessionContext
}

export interface WorkflowFormResolverDefinition {
	id: WorkflowFormResolverId
	toolName: ClineDefaultTool
	defaultInitialPhase?: Exclude<WorkflowFormSessionPhase, "success">
	buildDefinition(session: WorkflowFormSessionState): WorkflowFormDefinition
	buildToolExecutionFailureFallbackMessage(session: WorkflowFormSessionState): string
	buildToolExecutionRequest(session: WorkflowFormSessionState, values: WorkflowFormValues): WorkflowFormToolExecutionRequest
	evaluateToolExecutionResult(
		session: WorkflowFormSessionState,
		args: { toolResultText?: string },
	): WorkflowFormToolExecutionEvaluation
}

export interface WorkflowFormRuntimeCreateSessionOptions {
	resolverId: WorkflowFormResolverId
	triggerSource: WorkflowFormTriggerSource
	owner: WorkflowFormSessionOwner
	initialPhase?: Exclude<WorkflowFormSessionPhase, "success">
	context?: WorkflowFormSessionContext
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
			toolName: ClineDefaultTool
			toolInput: WorkflowFormToolInput
			toolParams: Record<string, string>
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
