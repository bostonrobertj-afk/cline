import type { WorkflowForm, WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import type { WorkflowFormId, WorkflowFormSessionData, WorkflowFormSessionState } from "@/core/task/workflow-form/types"
import type { WorkflowArtifactFamily } from "@/core/task/workflow-runtime/artifactFamilies"
import type {
	WorkflowStepResolutionSessionState,
	WorkflowStepResolutionSourceRoute,
	WorkflowToolBackedActionInstruction,
	WorkflowToolBackedOperationExecutionRequest,
} from "@/core/task/workflow-step-resolution/types"

export type WorkflowName = string
export type WorkflowValue = string | number | boolean | WorkflowValue[] | { [key: string]: WorkflowValue }
export type WorkflowValues = Record<string, WorkflowValue>
export type WorkflowProjectMode = "new" | "existing"
export type WorkflowProjectSubfolder = "discovery" | "planning" | "implementation" | "review" | "testing" | "archive"
export type WorkflowEntryArtifactExistingAction = "none" | "continue_existing" | "archive_existing" | "delete_existing"

export interface WorkflowEntryArtifactResolution {
	artifactId: string
	artifactFamily: WorkflowArtifactFamily
	artifactIdentity: string
	artifactFilename: string
	artifactRelativePath: string
	artifactAbsolutePath: string
	creationRequired: boolean
	existingArtifactAction: WorkflowEntryArtifactExistingAction
}

export type WorkflowEntryArtifactFileOperation = Extract<
	WorkflowEntryArtifactExistingAction,
	"archive_existing" | "delete_existing"
>

export interface WorkflowEntryArtifactPendingFileOperation
	extends Omit<WorkflowEntryArtifactResolution, "creationRequired" | "existingArtifactAction"> {
	operation: WorkflowEntryArtifactFileOperation
}

export interface WorkflowEntryArtifactResolutionState {
	artifactResolutions: readonly WorkflowEntryArtifactResolution[]
	pendingFileOperation: WorkflowEntryArtifactPendingFileOperation | undefined
}

export interface WorkflowPersonaDefinition {
	name: string
	role: string
	identity: string
	capabilities: readonly string[]
	communicationStyle: string
	principles: readonly string[]
}

export interface WorkflowDiscoveryCandidate {
	value: string
	label: string
}

export interface WorkflowWorkspacePathPolicy {
	validateAccess(filePath: string): boolean
}

export type WorkflowPrerequisiteFileMatchDefinition =
	| { kind: "exact_filename"; filename: string }
	| { kind: "naming_pattern"; pattern: RegExp }

export type WorkflowPrerequisiteFileRequirement = "required" | "optional"

export type WorkflowPrerequisiteFileOutputDocumentReference = "none" | "module_document_builder"

export interface WorkflowPrerequisiteFileDefinition {
	id: string
	requirement: WorkflowPrerequisiteFileRequirement
	projectSubfolderSegments: readonly string[]
	match: WorkflowPrerequisiteFileMatchDefinition
	producingWorkflowName: string
	workflowValueKey: string
	outputDocumentReference: WorkflowPrerequisiteFileOutputDocumentReference
}

export interface WorkflowProjectSelectionState {
	projectMode: WorkflowProjectMode
	projectTitle: string
	projectFolderName: string
}

export interface WorkflowRuntimeLifecycleState {
	projectSelectionCompleted: boolean
}

export interface WorkflowUiSessionState {
	formSession?: WorkflowFormSessionState
	stepResolutionSession?: WorkflowStepResolutionSessionState
	suppressedWorkflowFormIds: WorkflowFormId[]
	suppressedWorkflowStepResolutionRoutes: WorkflowStepResolutionSourceRoute[]
}

export type WorkflowDecisionBranchId = string

export type WorkflowBranchTriggerEvent =
	| { kind: "workflow_progress_request_confirmed" }
	| { kind: "workflow_progress_request_denied" }
	| { kind: "attempt_completion_succeeded" }
	| { kind: "workflow_form_completed"; workflowFormId: WorkflowFormId }
	| { kind: "workflow_values_persisted"; changedKeys: readonly string[] }
	| {
			kind: "entry_artifact_resolution_completed"
			artifactResolutions: readonly WorkflowEntryArtifactResolution[]
	  }
	| { kind: "tool_backed_operation_succeeded"; sourceRoute: WorkflowStepResolutionSourceRoute }
	| {
			kind: "tool_backed_operation_failed"
			sourceRoute: WorkflowStepResolutionSourceRoute
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
	lifecycle: WorkflowRuntimeLifecycleState
	entryArtifactResolution: WorkflowEntryArtifactResolutionState | undefined
	ui: WorkflowUiSessionState
	branchContext: WorkflowBranchContextState
}

export type PersistedWorkflowSession = ActiveWorkflowSession

export interface WorkflowPromptProjection {
	workflowInputPayloadBlock: string | undefined
	continuationWorkflowInputPayloadBlock: string | undefined
	/**
	 * Complete module-derived tool schema for the active turn.
	 * When present, this replaces the default prompt/native tool surface.
	 */
	workflowToolSchemaOverride: readonly ClineToolSpec[] | undefined
}

export interface WorkflowRenderFormNextAction {
	kind: "render_workflow_form"
	formSession: WorkflowFormSessionState
	payload: WorkflowForm
}

export interface WorkflowExecuteToolBackedOperationNextAction {
	kind: "execute_tool_backed_operation"
	toolRequest: WorkflowToolBackedOperationExecutionRequest
	// Set only for direct runtime-owned operation actions such as allocate_artifact and build_workflow_document.
	runtimeOwnedSourceRoute: WorkflowStepResolutionSourceRoute | undefined
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
	currentStepInstructions?: string
}

export interface WorkflowDecisionBranchEvaluationInput {
	activeBranchId: WorkflowDecisionBranchId
	workflowValues: WorkflowValues
	step: WorkflowStepDefinition
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

export type WorkflowStepTransitionTarget =
	| { kind: "entry_branch"; stepNumber: number }
	| { kind: "named_branch"; stepNumber: number; branchId: WorkflowDecisionBranchId }

export type WorkflowDeterministicProcedureResult =
	| { kind: "succeeded"; workflowValueWrites?: WorkflowValues }
	| { kind: "failed"; errorMessage: string }

export interface WorkflowDeterministicProcedureActionInstruction {
	run(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult | Promise<WorkflowDeterministicProcedureResult>
}

export type WorkflowFormSessionDataBuilder = (
	session: ActiveWorkflowSession,
) => WorkflowFormSessionData | Promise<WorkflowFormSessionData>

export interface WorkflowRenderFormDecisionActionWithFormIdOnly {
	kind: "render_workflow_form"
	workflowFormId: WorkflowFormId
}

export interface WorkflowRenderFormDecisionActionWithStartPanel {
	kind: "render_workflow_form"
	workflowFormId: WorkflowFormId
	startPanelId: string
}

export interface WorkflowRenderFormDecisionActionWithSessionData {
	kind: "render_workflow_form"
	workflowFormId: WorkflowFormId
	buildSessionData: WorkflowFormSessionDataBuilder
}

export interface WorkflowRenderFormDecisionActionWithStartPanelAndSessionData {
	kind: "render_workflow_form"
	workflowFormId: WorkflowFormId
	startPanelId: string
	buildSessionData: WorkflowFormSessionDataBuilder
}

export type WorkflowRenderFormDecisionAction =
	| WorkflowRenderFormDecisionActionWithFormIdOnly
	| WorkflowRenderFormDecisionActionWithStartPanel
	| WorkflowRenderFormDecisionActionWithSessionData
	| WorkflowRenderFormDecisionActionWithStartPanelAndSessionData

export type WorkflowDecisionAction =
	| WorkflowRenderFormDecisionAction
	| { kind: "execute_tool_backed_operation"; instruction: WorkflowToolBackedActionInstruction }
	| { kind: "run_deterministic_procedure"; instruction: WorkflowDeterministicProcedureActionInstruction }
	| { kind: "build_workflow_document"; instruction: WorkflowDocumentBuildActionInstruction }
	| { kind: "allocate_artifact"; artifactId: string }
	| {
			kind: "move_project_file"
			sourceFolderSegments: readonly string[]
			destinationFolderSegments: readonly string[]
			filenameWorkflowValueKey: string
	  }
	| { kind: "resolve_prerequisite_files"; prerequisiteIds: readonly string[] }
	| { kind: "transition_step"; target: WorkflowStepTransitionTarget }
	| { kind: "project_prompt" }
	| { kind: "terminal_error"; errorMessage: string }
	| { kind: "complete_workflow" }
	| { kind: "no_op" }

export interface WorkflowDecisionBranchRoute {
	id: string
	trigger: WorkflowDecisionBranchTrigger
	action: WorkflowDecisionAction
	followingBranchId?: WorkflowDecisionBranchId
}

export interface WorkflowDecisionBranch {
	id: WorkflowDecisionBranchId
	routes: WorkflowDecisionBranchRoute[]
}

export interface WorkflowDecisionTree {
	entryBranchId: WorkflowDecisionBranchId
	branches: Record<WorkflowDecisionBranchId, WorkflowDecisionBranch>
}

export interface WorkflowDocumentBuildActionInstruction {
	artifactId: string
	buildContent(session: ActiveWorkflowSession): string | Promise<string>
	workflowValueWrites?: WorkflowValues
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
			family:
				| WorkflowArtifactFamily.Epics
				| WorkflowArtifactFamily.EpicsIndex
				| WorkflowArtifactFamily.BrainstormingSession
				| WorkflowArtifactFamily.ArchitectureDocument
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

export interface WorkflowStepDefinition {
	id: `step-${number}`
	stepNumber: number
	checklistLabel: string
	buildPromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource
	buildToolSchema(input: WorkflowPromptBuilderInput): readonly ClineToolSpec[]
	decisionTree: WorkflowDecisionTree
	completionRules?: WorkflowCompletionRule[]
}

export interface WorkflowDefinition {
	name: WorkflowName
	displayName: string
	description: string
	slashCommandName: string
	useSkillName: string
	persona: WorkflowPersonaDefinition
	projectSubfolder: WorkflowProjectSubfolder
	workflowValueKeys: readonly string[]
	entryProjectValueKeys: WorkflowEntryProjectValueKeys
	entryPanel: WorkflowEntryInformationalPanelDefinition
	steps: Record<WorkflowStepDefinition["id"], WorkflowStepDefinition>
	workflowForms?: Record<WorkflowFormId, WorkflowFormDefinitionPayload>
	artifacts?: Record<string, WorkflowArtifactDefinition>
	prerequisiteFiles?: Record<string, WorkflowPrerequisiteFileDefinition>
	childInheritance?: WorkflowChildInheritanceRule[]
}

export interface WorkflowDiscoveryRequest {
	rootDirectory: string
	workspacePathPolicy: WorkflowWorkspacePathPolicy
	targetPathSegments?: readonly string[]
	entryType: "file" | "directory" | "any"
	immediateChildrenOnly: boolean
	namingPattern?: RegExp
	buildLabel?: (entryName: string) => string
	sort: "alpha_asc" | "alpha_desc"
}

export interface ShippedWorkflowMetadata {
	name: WorkflowName
	displayName: string
	description: string
	persona: WorkflowPersonaDefinition
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
