import type { WorkflowForm, WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import type { BackendWorkflowToolContract } from "@/core/task/tools/backendWorkflowToolContractTypes"
import type { WorkflowFormId, WorkflowFormSessionState } from "@/core/task/workflow-form/types"
import type { WorkflowArtifactFamily } from "@/core/task/workflow-runtime/artifactFamilies"
import type {
	WorkflowStepResolutionSessionState,
	WorkflowToolBackedOperationDefinition,
	WorkflowToolBackedOperationExecutionRequest,
} from "@/core/task/workflow-step-resolution/types"
import type { SkillMetadata } from "@/shared/skills"

export type WorkflowName = string
export type WorkflowValue = string | number | boolean | WorkflowValue[] | { [key: string]: WorkflowValue }
export type WorkflowValues = Record<string, WorkflowValue>
export type WorkflowProjectMode = "new" | "existing"
export type WorkflowProjectSubfolder = "discovery" | "planning" | "implementation" | "review" | "testing"
export type WorkflowToolBackedOperationId = string

export interface WorkflowDiscoveryCandidate {
	value: string
	label: string
}

export interface WorkflowWorkspacePathPolicy {
	validateAccess(filePath: string): boolean
}

export interface WorkflowProjectSelectionState {
	projectMode: WorkflowProjectMode
	projectTitle: string
	projectFolderName: string
}

export interface WorkflowUiSessionState {
	formSession?: WorkflowFormSessionState
	stepResolutionSession?: WorkflowStepResolutionSessionState
	suppressedWorkflowFormIds: WorkflowFormId[]
	suppressedWorkflowStepResolutionDefinitionIds: string[]
}

export type WorkflowDecisionBranchId = string

export type WorkflowBranchTriggerEvent =
	| { kind: "session_initialized" }
	| { kind: "project_selection_completed" }
	| { kind: "workflow_progress_request_confirmed" }
	| { kind: "workflow_progress_request_denied" }
	| { kind: "workflow_form_completed"; workflowFormId: WorkflowFormId }
	| { kind: "workflow_values_persisted"; changedKeys: readonly string[] }
	| { kind: "tool_backed_operation_succeeded"; toolBackedOperationId: WorkflowToolBackedOperationId }
	| {
			kind: "tool_backed_operation_failed"
			toolBackedOperationId: WorkflowToolBackedOperationId
			errorMessage?: string
	  }

export interface WorkflowBranchFailureState {
	retryAttemptCount: number
	terminalErrorMessage?: string
}

export interface WorkflowBranchContextState {
	activeBranchId: WorkflowDecisionBranchId
	lastTriggerEvent?: WorkflowBranchTriggerEvent
	failureState?: WorkflowBranchFailureState
}

export interface ActiveWorkflowSession {
	activeStepNumber: number
	workflowValues: WorkflowValues
	projectSelection: WorkflowProjectSelectionState
	ui: WorkflowUiSessionState
	branchContext: WorkflowBranchContextState
}

export type PersistedWorkflowSession = ActiveWorkflowSession

export interface WorkflowPromptProjection {
	fullTurnWorkflowSystemInstructionsBlock?: string
	fullTurnWorkflowInputInstructionsBlock?: string
	/**
	 * Complete module-derived tool schema for the active turn.
	 * When present, this replaces the default prompt/native tool surface.
	 */
	workflowToolSchemaOverride?: readonly ClineToolSpec[]
	continuationTurnWorkflowSystemInstructionsBlock?: string
	continuationTurnWorkflowInputInstructionsBlock?: string
}

export interface WorkflowRenderFormNextAction {
	kind: "render_workflow_form"
	formSession: WorkflowFormSessionState
	payload: WorkflowForm
}

export interface WorkflowExecuteToolBackedOperationNextAction {
	kind: "execute_tool_backed_operation"
	toolRequest: WorkflowToolBackedOperationExecutionRequest
	toolBackedOperationSession?: WorkflowStepResolutionSessionState
}

export interface WorkflowProjectPromptNextAction {
	kind: "project_prompt"
	promptProjection: WorkflowPromptProjection
}

export interface WorkflowTerminalErrorNextAction {
	kind: "terminal_error"
	errorMessage: string
}

export interface WorkflowCompleteNextAction {
	kind: "complete_workflow"
}

export interface WorkflowNoOpNextAction {
	kind: "no_op"
}

export interface WorkflowPersistWorkflowTeardownNextAction {
	kind: "persist_workflow_teardown"
}

export type WorkflowNextAction =
	| WorkflowRenderFormNextAction
	| WorkflowExecuteToolBackedOperationNextAction
	| WorkflowProjectPromptNextAction
	| WorkflowTerminalErrorNextAction
	| WorkflowCompleteNextAction
	| WorkflowNoOpNextAction
	| WorkflowPersistWorkflowTeardownNextAction

export interface WorkflowPromptBuilderInput {
	session: ActiveWorkflowSession
	step: WorkflowStepDefinition
	renderWorkflowValue(value: WorkflowValue): string
}

export interface WorkflowStepPromptSource {
	workflowSystemInstructions?: string
	currentStepInstructions?: string
}

export interface WorkflowDecisionBranchEvaluationInput {
	session: ActiveWorkflowSession
	step: WorkflowStepDefinition
	branchContext: WorkflowBranchContextState
}

export type WorkflowDecisionBranchTrigger =
	| { kind: "always" }
	| { kind: "on_event"; eventKind: WorkflowBranchTriggerEvent["kind"] }
	| {
			kind: "session_predicate"
			matches(input: WorkflowDecisionBranchEvaluationInput): boolean
	  }
	| {
			kind: "event_predicate"
			matches(
				input: WorkflowDecisionBranchEvaluationInput & {
					triggerEvent: WorkflowBranchTriggerEvent
				},
			): boolean
	  }

export type WorkflowDecisionAction =
	| { kind: "render_workflow_form"; workflowFormId: WorkflowFormId }
	| { kind: "execute_tool_backed_operation"; toolBackedOperationId: WorkflowToolBackedOperationId }
	| { kind: "build_workflow_document"; documentBuilderId: string }
	| { kind: "allocate_artifact"; artifactId: string }
	| { kind: "project_prompt" }
	| { kind: "terminal_error" }
	| { kind: "complete_workflow" }
	| { kind: "no_op" }

export interface WorkflowDecisionBranchRoute {
	id: string
	trigger: WorkflowDecisionBranchTrigger
	action: WorkflowDecisionAction
	followingBranchId?: WorkflowDecisionBranchId
	targetStepNumber?: number
}

export interface WorkflowDecisionBranch {
	id: WorkflowDecisionBranchId
	routes: WorkflowDecisionBranchRoute[]
}

export interface WorkflowDecisionTree {
	entryBranchId: WorkflowDecisionBranchId
	branches: Record<WorkflowDecisionBranchId, WorkflowDecisionBranch>
}

export interface WorkflowCompletionRule {
	id: string
	isComplete(session: ActiveWorkflowSession): boolean
}

export interface WorkflowChildInheritanceRule {
	parentKey: string
	childKey: string
}

export interface WorkflowEntryInformationalPanelDefinition {
	promptMarkdown: string
}

export interface WorkflowEntryProjectValueKeys {
	projectMode: string
	projectTitle: string
	projectFolderName: string
}

export type WorkflowArtifactIntentMode = "new" | "derived"

export interface WorkflowArtifactIdentitySource {
	kind: "workflow_value"
	key: string
}

export interface WorkflowBaseArtifactOutputValueKeys {
	projectTitle: string
	projectFolderName: string
	artifactFamily: string
	artifactIdentity: string
	artifactFilename: string
	artifactRelativePath: string
	artifactAbsolutePath: string
}

export interface WorkflowStandaloneArtifactOutputValueKeys extends WorkflowBaseArtifactOutputValueKeys {
	parentIdentity: undefined
	targetIdentity: undefined
}

export interface WorkflowParentedArtifactOutputValueKeys extends WorkflowBaseArtifactOutputValueKeys {
	parentIdentity: string
	targetIdentity: undefined
}

export interface WorkflowTargetedArtifactOutputValueKeys extends WorkflowBaseArtifactOutputValueKeys {
	parentIdentity: undefined
	targetIdentity: string
}

export type WorkflowArtifactOutputValueKeys =
	| WorkflowStandaloneArtifactOutputValueKeys
	| WorkflowParentedArtifactOutputValueKeys
	| WorkflowTargetedArtifactOutputValueKeys

export type WorkflowArtifactDefinition =
	| {
			id: string
			family: WorkflowArtifactFamily.Epics | WorkflowArtifactFamily.EpicsIndex
			intentMode: "new"
			parentIdentitySource: undefined
			targetIdentitySource: undefined
			outputValueKeys: WorkflowStandaloneArtifactOutputValueKeys
	  }
	| {
			id: string
			family: WorkflowArtifactFamily.EpicDeliverySpec
			intentMode: "new"
			parentIdentitySource: undefined
			targetIdentitySource: undefined
			outputValueKeys: WorkflowStandaloneArtifactOutputValueKeys
	  }
	| {
			id: string
			family: WorkflowArtifactFamily.Story
			intentMode: "new"
			parentIdentitySource: WorkflowArtifactIdentitySource
			targetIdentitySource: undefined
			outputValueKeys: WorkflowParentedArtifactOutputValueKeys
	  }
	| {
			id: string
			family: WorkflowArtifactFamily.RemediationStory
			intentMode: "new"
			parentIdentitySource: WorkflowArtifactIdentitySource
			targetIdentitySource: undefined
			outputValueKeys: WorkflowParentedArtifactOutputValueKeys
	  }
	| {
			id: string
			family:
				| WorkflowArtifactFamily.ReviewBlindHunter
				| WorkflowArtifactFamily.ReviewEdgeCaseHunter
				| WorkflowArtifactFamily.AdversarialReview
				| WorkflowArtifactFamily.ReviewInputMarkdown
				| WorkflowArtifactFamily.ReviewInputDiff
			intentMode: "derived"
			parentIdentitySource: undefined
			targetIdentitySource: WorkflowArtifactIdentitySource
			outputValueKeys: WorkflowTargetedArtifactOutputValueKeys
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
	buildPromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource
	buildToolSchema(input: WorkflowPromptBuilderInput): readonly ClineToolSpec[]
	decisionTree: WorkflowDecisionTree
	completionRules?: WorkflowCompletionRule[]
	documentBuilderIds?: string[]
}

export interface WorkflowDefinition {
	name: WorkflowName
	slashCommandName: string
	useSkillName: string
	persona: SkillMetadata["name"] | string
	projectSubfolder: WorkflowProjectSubfolder
	workflowValueKeys: readonly string[]
	entryProjectValueKeys: WorkflowEntryProjectValueKeys
	entryPanel: WorkflowEntryInformationalPanelDefinition
	steps: Record<WorkflowStepDefinition["id"], WorkflowStepDefinition>
	workflowForms?: Record<WorkflowFormId, WorkflowFormDefinitionPayload>
	toolBackedOperationDefinitions?: Record<WorkflowToolBackedOperationId, WorkflowToolBackedOperationDefinition>
	artifacts?: Record<string, WorkflowArtifactDefinition>
	documentBuilders?: Record<string, WorkflowDocumentBuilderDefinition>
	childInheritance?: WorkflowChildInheritanceRule[]
}

export interface WorkflowDiscoveryRequest {
	baseDirectory: string
	workspacePathPolicy: WorkflowWorkspacePathPolicy
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
	| "tool_backed_operation"
	| "persistence"
	| "resume"
	| "teardown"

export interface WorkflowDiagnosticEvent {
	category: WorkflowRuntimeErrorCategory
	message: string
	workflowName?: WorkflowName
	stepNumber?: number
}
