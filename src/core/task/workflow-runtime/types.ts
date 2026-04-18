import type { WorkflowForm, WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import type { BackendWorkflowToolContract } from "@/core/task/tools/backendWorkflowToolContractTypes"
import type { WorkflowFormId, WorkflowFormSessionState } from "@/core/task/workflow-form/types"
import type { WorkflowStartCardSessionState } from "@/core/task/workflow-start-card/types"
import type {
	WorkflowStepResolutionDefinition,
	WorkflowStepResolutionSessionState,
	WorkflowStepResolutionToolExecutionRequest,
} from "@/core/task/workflow-step-resolution/types"
import type { SkillMetadata } from "@/shared/skills"

export type WorkflowName = string
export type WorkflowValue = string
export type WorkflowValues = Record<string, WorkflowValue>
export type WorkflowProjectMode = "new" | "existing"
export type WorkflowProjectSubfolder = "discovery" | "planning" | "implementation" | "review" | "testing"

export interface WorkflowDiscoveryCandidate {
	value: string
	label: string
}

export interface WorkflowProjectSelectionState {
	projectMode: WorkflowProjectMode
	projectTitle: string
	projectFolderName: string
}

export interface WorkflowUiSessionState {
	startCardSession?: WorkflowStartCardSessionState
	formSession?: WorkflowFormSessionState
	stepResolutionSession?: WorkflowStepResolutionSessionState
	suppressedWorkflowFormIds: WorkflowFormId[]
	suppressedWorkflowStepResolutionDefinitionIds: string[]
}

export interface ActiveWorkflowSession {
	workflowName: WorkflowName
	activeStepNumber: number
	workflowValues: WorkflowValues
	projectSelection: WorkflowProjectSelectionState
	ui: WorkflowUiSessionState
}

export type PersistedWorkflowSession = ActiveWorkflowSession

export interface WorkflowPromptProjection {
	workflowSystemInstructionsBlock?: string
	workflowInputInstructionsBlock?: string
	workflowToolSchemaOverride?: readonly ClineToolSpec[]
}

export interface WorkflowRenderStartCardNextAction {
	kind: "render_workflow_start_card"
	startCardSession: WorkflowStartCardSessionState
}

export interface WorkflowRenderFormNextAction {
	kind: "render_workflow_form"
	formSession: WorkflowFormSessionState
	payload: WorkflowForm
}

export interface WorkflowRunDeterministicNextAction {
	kind: "run_deterministic_operation"
	toolRequest: WorkflowStepResolutionToolExecutionRequest
	stepResolutionSession?: WorkflowStepResolutionSessionState
	fallbackDecision?: WorkflowDeterministicFallbackDecision
}

export interface WorkflowProjectPromptNextAction {
	kind: "project_prompt"
	promptProjection: WorkflowPromptProjection
}

export interface WorkflowCompleteNextAction {
	kind: "complete_workflow"
}

export interface WorkflowNoOpNextAction {
	kind: "no_op"
}

export type WorkflowNextAction =
	| WorkflowRenderStartCardNextAction
	| WorkflowRenderFormNextAction
	| WorkflowRunDeterministicNextAction
	| WorkflowProjectPromptNextAction
	| WorkflowCompleteNextAction
	| WorkflowNoOpNextAction

export interface WorkflowPromptBuilderInput {
	session: ActiveWorkflowSession
	step: WorkflowStepDefinition
}

export interface WorkflowSetWorkflowValuesOverrideSelection {
	contract: BackendWorkflowToolContract
	buildToolSchemaOverride(input: WorkflowPromptBuilderInput): readonly ClineToolSpec[] | undefined
}

export interface WorkflowNextActionCondition {
	id: string
	matches(session: ActiveWorkflowSession): boolean
}

export interface WorkflowNextActionRule {
	id: string
	condition: WorkflowNextActionCondition
	action: WorkflowNextAction["kind"]
	workflowFormId?: WorkflowFormId
	stepResolutionDefinitionId?: string
	documentBuilderId?: string
}

export interface WorkflowCompletionRule {
	id: string
	isComplete(session: ActiveWorkflowSession): boolean
}

export interface WorkflowChildInheritanceRule {
	parentKey: string
	childKey: string
}

export interface WorkflowStartCardDefinition {
	markdownBody: string
	submitLabel: string
}

export interface WorkflowDocumentBuilderDefinition {
	id: string
	artifactId: string
	toolContract: BackendWorkflowToolContract
	buildContent(session: ActiveWorkflowSession): string | Promise<string>
	workflowValueWrites?: WorkflowValues
}

export interface WorkflowStepDefinition {
	id: `step-${number}`
	stepNumber: number
	checklistLabel: string
	buildPromptProjection(input: WorkflowPromptBuilderInput): WorkflowPromptProjection
	allowWorkflowProgressRequest: boolean
	workflowFormId?: WorkflowFormId
	stepResolutionDefinitionId?: string
	nextActionRules?: WorkflowNextActionRule[]
	completionRules?: WorkflowCompletionRule[]
	setWorkflowValuesToolOverride?: WorkflowSetWorkflowValuesOverrideSelection
	documentBuilderIds?: string[]
}

export interface WorkflowDefinition {
	name: WorkflowName
	slashCommandName: string
	useSkillName: string
	persona: SkillMetadata["name"] | string
	projectSubfolder: WorkflowProjectSubfolder
	startCard: WorkflowStartCardDefinition
	steps: Record<WorkflowStepDefinition["id"], WorkflowStepDefinition>
	workflowForms?: Record<WorkflowFormId, WorkflowFormDefinitionPayload>
	stepResolutionDefinitions?: Record<string, WorkflowStepResolutionDefinition>
	documentBuilders?: Record<string, WorkflowDocumentBuilderDefinition>
	childInheritance?: WorkflowChildInheritanceRule[]
}

export interface WorkflowDiscoveryRequest {
	baseDirectory: string
	targetPathSegments?: string[]
	entryType: "file" | "directory" | "any"
	immediateChildrenOnly: boolean
	namingPattern?: RegExp
	buildLabel?: (entryName: string) => string
	sort: "alpha_asc" | "alpha_desc"
}

export interface ShippedWorkflowMetadata {
	name: WorkflowName
	persona: SkillMetadata["name"] | string
	projectSubfolder: WorkflowProjectSubfolder
}

export type WorkflowValidationResult = { valid: true } | { valid: false; errorMessage: string }

export type WorkflowRuntimeErrorCategory =
	| "activation"
	| "validation"
	| "discovery"
	| "progression"
	| "deterministic"
	| "persistence"
	| "resume"
	| "teardown"

export type WorkflowDeterministicFallbackDecision = "fallback_to_agent" | "stay_on_step" | "advance_step"

export interface WorkflowDiagnosticEvent {
	category: WorkflowRuntimeErrorCategory
	message: string
	workflowName?: WorkflowName
	stepNumber?: number
}
