import type {
	ClineWorkflowStepResolutionStatus,
	WorkflowFormConditionDefinition,
	WorkflowFormDefinitionPayload,
	WorkflowFormFieldDefinition,
	WorkflowFormJsonOptionsSourceConfig,
	WorkflowFormOptionDefinition,
	WorkflowFormPanelAction,
	WorkflowFormPanelDefinition,
	WorkflowFormResolvedPanelPayload,
	WorkflowFormSubmittedValuePayload,
} from "@shared/ExtensionMessage"
import { WorkflowFormAction, type WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"
import { randomUUID } from "crypto"
import { constants } from "fs"
import { copyFile, mkdir, readFile, stat, unlink, writeFile } from "fs/promises"
import { dirname, isAbsolute, join, relative, resolve, sep } from "path"
import { isSerializedToolFailureResultText } from "@/core/prompts/responses"
import type { TaskState } from "@/core/task/TaskState"
import { buildWorkflowFormPayload } from "@/core/task/workflow-form/buildWorkflowFormPayload"
import { isWorkflowFormSubmittedValuePayload } from "@/core/task/workflow-form/schema"
import type {
	WorkflowFormRuntimeCreateSessionOptions,
	WorkflowFormRuntimeOutcome,
	WorkflowFormRuntimeValueChanges,
	WorkflowFormSessionData,
	WorkflowFormSessionDataValue,
	WorkflowFormSessionState,
} from "@/core/task/workflow-form/types"
import { WorkflowFormRuntime } from "@/core/task/workflow-form/WorkflowFormRuntime"
import {
	WORKFLOW_ARTIFACT_FAMILY_REGISTRY,
	WorkflowArtifactFamily,
	type WorkflowArtifactFamilyDefinition,
} from "@/core/task/workflow-runtime/artifactFamilies"
import {
	discoverWorkflowCandidates,
	isWorkflowDiscoveryTargetPathSegment,
	resolveWorkflowDiscoveryTargetDirectory,
} from "@/core/task/workflow-runtime/discovery"
import {
	discoverWorkflowPrerequisiteFileCandidates,
	type WorkflowPrerequisiteFileCandidate,
} from "@/core/task/workflow-runtime/prerequisiteFiles"
import {
	buildEpicStoriesIndexFilename,
	buildPrimaryStoryIndexEntry,
	buildRemediationStoryIndexEntry,
	parseWorkflowStoryIndexJson,
	stringifyWorkflowStoryIndex,
	type WorkflowStoryIndex,
	type WorkflowStoryStatus,
} from "@/core/task/workflow-runtime/storyArtifacts"
import { resolveWorkflowDefinition } from "@/core/task/workflow-runtime/WorkflowRegistry"
import { buildWorkflowStepResolutionStatusPayload } from "@/core/task/workflow-step-resolution/buildWorkflowStepResolutionStatusPayload"
import type {
	WorkflowStepResolutionSessionState,
	WorkflowStepResolutionSourceRoute,
} from "@/core/task/workflow-step-resolution/types"
import { ClineDefaultTool, toolUseNames } from "@/shared/tools"
import { buildWorkflowStoryFileTemplate } from "./storyFileTemplate"
import type {
	ActiveWorkflowSession,
	PersistedWorkflowSession,
	WorkflowArtifactDefinition,
	WorkflowArtifactOutputValueKeys,
	WorkflowBranchContextState,
	WorkflowBranchFailureState,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionAction,
	WorkflowDecisionBranchEvaluationInput,
	WorkflowDecisionBranchRoute,
	WorkflowDefinition,
	WorkflowEntryArtifactExistingAction,
	WorkflowEntryArtifactFileOperation,
	WorkflowEntryArtifactPendingFileOperation,
	WorkflowEntryArtifactResolution,
	WorkflowEntryArtifactResolutionState,
	WorkflowNextAction,
	WorkflowPrerequisiteFileDefinition,
	WorkflowProjectSelectionState,
	WorkflowProjectSubfolder,
	WorkflowPromptBuilderInput,
	WorkflowPromptProjection,
	WorkflowRuntimeLifecycleState,
	WorkflowStepDefinition,
	WorkflowStepTransitionTarget,
	WorkflowValidationResult,
	WorkflowValue,
	WorkflowValues,
	WorkflowWorkspacePathPolicy,
} from "./types"
import {
	areWorkflowValuesEqual,
	isWorkflowValue,
	readRequiredStringWorkflowValue,
	stringifyWorkflowValueForPrompt,
} from "./workflowValues"

const WORKFLOW_PROJECT_SUBFOLDERS: readonly WorkflowProjectSubfolder[] = [
	"discovery",
	"planning",
	"implementation",
	"review",
	"testing",
	"archive",
]
const WORKFLOW_IMPLEMENTATION_STORY_CHILD_FOLDERS = ["drafts", "stories-backlog", "stories-review", "stories-complete"] as const
const WORKFLOW_PROJECT_OUTPUT_ROOT_PATH_SEGMENTS = ["docs", "projects"] as const
const WORKFLOW_ENTRY_FORM_ID = "__workflow_runtime_entry_form__"
const WORKFLOW_ENTRY_INFO_PANEL_ID = "__workflow_runtime_entry_info__"
const WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID = "__workflow_runtime_entry_project_selection__"
const WORKFLOW_ENTRY_PROJECT_MODE_FIELD_KEY = "__workflow_runtime_project_mode__"
const WORKFLOW_ENTRY_EXISTING_PROJECT_FIELD_KEY = "__workflow_runtime_existing_project__"
const WORKFLOW_ENTRY_NEW_PROJECT_TITLE_FIELD_KEY = "__workflow_runtime_new_project_title__"
const WORKFLOW_ENTRY_ARTIFACT_CONFLICT_PANEL_ID = "__workflow_runtime_entry_artifact_conflict__"
const WORKFLOW_ENTRY_ARTIFACT_CONFLICT_ACTION_FIELD_KEY = "__workflow_runtime_entry_artifact_conflict_action__"
const WORKFLOW_ENTRY_ARTIFACT_CONFLICT_CONTINUE_VALUE = "continue_existing"
const WORKFLOW_ENTRY_ARTIFACT_CONFLICT_REPLACE_VALUE = "replace_existing"
const WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_PANEL_ID = "__workflow_runtime_entry_artifact_replacement__"
const WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_ACTION_FIELD_KEY = "__workflow_runtime_entry_artifact_replacement_action__"
const WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_CANCEL_VALUE = "cancel"
const WORKFLOW_PREREQUISITE_FORM_ID = "__workflow_runtime_prerequisite_files__"
const WORKFLOW_PREREQUISITE_SELECTED_FILE_FIELD_KEY = "__workflow_runtime_prerequisite_selected_file__"
const WORKFLOW_PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY = "__workflow_runtime_prerequisite_single_match_confirmation__"
const WORKFLOW_PREREQUISITE_CANNOT_CONTINUE_PANEL_ID = "__workflow_runtime_prerequisite_cannot_continue__"
const WORKFLOW_PREREQUISITE_ID_DATA_KEY = "__workflow_runtime_prerequisite_id__"
const WORKFLOW_PREREQUISITE_SINGLE_MATCH_PATH_DATA_KEY = "__workflow_runtime_prerequisite_single_match_path__"
const WORKFLOW_PREREQUISITE_SKIPPED_IDS_DATA_KEY = "__workflow_runtime_prerequisite_skipped_ids__"

export interface WorkflowArtifactAllocationOutput {
	artifactId: string
	projectTitle: string
	projectFolderName: string
	artifactFamily: string
	artifactIdentity: string
	artifactFilename: string
	artifactRelativePath: string
	artifactAbsolutePath: string
	parentIdentity: string | undefined
	targetIdentity: string | undefined
	workflowValueWrites: WorkflowValues
}

export interface WorkflowArtifactCreationResult extends WorkflowArtifactAllocationOutput {
	changedWorkflowValues: WorkflowValues
	unchangedWorkflowValues: WorkflowValues
}

export interface WorkflowArtifactArchivePreparation extends WorkflowArtifactAllocationOutput {
	archiveRelativePath: string
	archiveAbsolutePath: string
}

export type WorkflowArtifactArchiveResult = WorkflowArtifactArchivePreparation
export type WorkflowArtifactDeletionPreparation = WorkflowArtifactAllocationOutput
export type WorkflowArtifactDeletionResult = WorkflowArtifactDeletionPreparation

export interface WorkflowProjectFileMovePreparation {
	sourceAbsolutePath: string
	destinationAbsolutePath: string
}

export type WorkflowProjectFileMoveResult = WorkflowProjectFileMovePreparation

export interface WorkflowPlanStoryArtifactsPreparation {
	storyIndexAbsolutePath: string
	epicsIndexAbsolutePath: string
}

export interface WorkflowPlanStoryArtifactsResult extends WorkflowPlanStoryArtifactsPreparation {
	storyIndex: WorkflowStoryIndex
	appendedStoryIdentities: readonly string[]
}

export interface WorkflowPlanRemediationStoryArtifactPreparation {
	storyIndexAbsolutePath: string
}

export interface WorkflowPlanRemediationStoryArtifactResult extends WorkflowPlanRemediationStoryArtifactPreparation {
	storyIndex: WorkflowStoryIndex
	appendedStoryIdentity: string
}

export interface WorkflowGenerateStoryFilesPreparation {
	storyIndexAbsolutePath: string
	draftStoryFileAbsolutePaths: readonly string[]
}

export interface WorkflowGenerateStoryFilesResult extends WorkflowGenerateStoryFilesPreparation {
	storyIndex: WorkflowStoryIndex
	createdDraftStoryFileAbsolutePaths: readonly string[]
	existingDraftStoryFileAbsolutePaths: readonly string[]
}

export interface WorkflowUpdateStoryIndexStatusResult {
	storiesIndex: string
	storyIdentity: string
	previousStatus: WorkflowStoryStatus
	status: WorkflowStoryStatus
}

interface WorkflowArtifactIdentityResolution {
	artifactIdentity: string
	parentIdentity: string | undefined
	targetIdentity: string | undefined
}

interface ParsedWorkflowArtifactIdentity {
	artifactIdentity: string
	epicNumber: number
	storyNumber: number | undefined
	remediationStoryNumber: number | undefined
}

interface WorkflowEpicsIndexEntry {
	identity: string
	title: string
	"story-index-generated": boolean
}

interface WorkflowEpicsIndex {
	version: 1
	epics: WorkflowEpicsIndexEntry[]
}

interface WorkflowResolvedDecisionTreeRoute {
	route: WorkflowDecisionBranchRoute
	sourceRoute: WorkflowStepResolutionSourceRoute
	nextActiveBranchId: string
}

interface WorkflowContinuationSourceRoute {
	route: WorkflowDecisionBranchRoute
	sourceRoute: WorkflowStepResolutionSourceRoute
}

interface WorkflowEntrySingletonArtifactCheck {
	artifactOutputs: readonly WorkflowArtifactAllocationOutput[]
	existingArtifactOutputs: readonly WorkflowArtifactAllocationOutput[]
}

export class WorkflowRuntime {
	private readonly cwd: string
	private readonly workspacePathPolicy: WorkflowWorkspacePathPolicy
	private readonly workflowFormRuntime = new WorkflowFormRuntime()

	constructor(args: { cwd: string; workspacePathPolicy: WorkflowWorkspacePathPolicy }) {
		this.cwd = args.cwd
		this.workspacePathPolicy = args.workspacePathPolicy
	}

	private assertWorkspacePathAllowed(filePath: string): void {
		if (!this.workspacePathPolicy.validateAccess(filePath)) {
			throw new Error(`Workflow runtime path is blocked by workspace path policy: ${filePath}`)
		}
	}

	private resolveWorkflowProjectOutputRoot(): string {
		return join(this.cwd, ...WORKFLOW_PROJECT_OUTPUT_ROOT_PATH_SEGMENTS)
	}

	async activateWorkflow(args: {
		taskState: TaskState
		workflowName: WorkflowDefinition["name"]
		parentSession?: ActiveWorkflowSession
	}): Promise<WorkflowNextAction> {
		const { taskState, workflowName, parentSession } = args
		const workflow = resolveWorkflowDefinition(workflowName)
		if (!workflow) {
			return { kind: "no_op" }
		}

		const validationResult = this.validateWorkflowDefinition(workflow)
		if (!validationResult.valid) {
			return { kind: "no_op" }
		}

		const firstStepNumber = this.getFirstStepNumber(workflow)
		if (firstStepNumber === undefined) {
			return { kind: "no_op" }
		}

		const firstStep = workflow.steps[`step-${firstStepNumber}`]
		if (!firstStep) {
			return { kind: "no_op" }
		}

		if (
			parentSession &&
			(parentSession.projectSelection.projectTitle.trim() === "" ||
				parentSession.projectSelection.projectFolderName.trim() === "")
		) {
			return { kind: "no_op" }
		}

		const workflowValues: WorkflowValues = {}
		for (const inheritanceRule of workflow.childInheritance ?? []) {
			const parentValue = parentSession?.workflowValues[inheritanceRule.parentKey]
			if (parentValue !== undefined) {
				workflowValues[inheritanceRule.childKey] = parentValue
			}
		}

		const projectSelection = parentSession
			? { ...parentSession.projectSelection }
			: {
					projectMode: "new" as const,
					projectTitle: "",
					projectFolderName: "",
				}

		taskState.activeWorkflowName = workflow.name
		taskState.activeWorkflowSession = {
			activeStepNumber: firstStepNumber,
			workflowValues,
			projectSelection,
			lifecycle: {
				projectSelectionCompleted: parentSession !== undefined,
			},
			entryArtifactResolution: undefined,
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionRoutes: [],
			},
			branchContext: this.createInitialBranchContext(firstStep),
		}

		this.refreshCurrentFocusChainChecklist(taskState)

		return this.resolveNextAction({ taskState })
	}

	async resolveNextAction(args: { taskState: TaskState }): Promise<WorkflowNextAction> {
		const { taskState } = args
		const session = taskState.activeWorkflowSession
		if (!session || !taskState.activeWorkflowName) {
			return { kind: "no_op" }
		}

		const definition = resolveWorkflowDefinition(taskState.activeWorkflowName)
		if (!definition) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		const validationResult = this.validateWorkflowDefinition(definition)
		if (!validationResult.valid) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		if (activeStep.decisionTree.branches[session.branchContext.activeBranchId] === undefined) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		this.refreshCurrentFocusChainChecklist(taskState)

		if (session.projectSelection.projectTitle === "" || session.projectSelection.projectFolderName === "") {
			return this.buildWorkflowEntryFormNextAction({
				taskState,
				workflow: definition,
			})
		}

		if (session.ui.formSession !== undefined && this.isWorkflowPrerequisiteFormSession(session.ui.formSession)) {
			return {
				kind: "render_workflow_form",
				formSession: session.ui.formSession,
				payload: await this.buildWorkflowFormRenderPayload({
					taskState,
					workflow: definition,
					session: session.ui.formSession,
				}),
			}
		}

		if (activeStep.completionRules?.some((rule) => rule.isComplete(session))) {
			await this.teardownWorkflow({ taskState })
			return { kind: "complete_workflow" }
		}

		const pendingTriggerEvent = session.branchContext.lastTriggerEvent
		const matchingDecisionTreeRoute = this.resolveDecisionTreeRoute({
			taskState,
			session,
			step: activeStep,
		})
		if (!matchingDecisionTreeRoute) {
			if (pendingTriggerEvent?.kind === "tool_backed_operation_failed") {
				return await this.buildTerminalErrorNextAction({
					taskState,
					errorMessage: pendingTriggerEvent.errorMessage,
				})
			}

			return { kind: "no_op" }
		}

		return this.buildNextActionFromDecisionTreeRoute({
			taskState,
			definition,
			route: matchingDecisionTreeRoute.route,
			sourceRoute: matchingDecisionTreeRoute.sourceRoute,
			nextActiveBranchId: matchingDecisionTreeRoute.nextActiveBranchId,
		})
	}

	async submitWorkflowForm(args: {
		taskState: TaskState
		request: WorkflowFormSubmissionRequest
	}): Promise<WorkflowNextAction> {
		const { taskState, request } = args
		const session = taskState.activeWorkflowSession
		const formSession = session?.ui.formSession

		if (!session || !formSession || request.sessionId !== formSession.sessionId) {
			return { kind: "no_op" }
		}

		const outcome = this.workflowFormRuntime.handleSubmission(formSession, request)
		if (this.isWorkflowEntryFormSession(formSession)) {
			return this.handleWorkflowEntryFormOutcome({
				taskState,
				request,
				outcome,
			})
		}
		if (this.isWorkflowPrerequisiteFormSession(formSession)) {
			return this.handleWorkflowPrerequisiteFormOutcome({
				taskState,
				request,
				outcome,
			})
		}

		switch (outcome.kind) {
			case "render_form": {
				if (outcome.session.failure === undefined) {
					await this.persistWorkflowFormValues({
						taskState,
						formSession: outcome.session,
						valueChanges: outcome.valueChanges,
					})
				}
				session.ui.formSession = outcome.session
				const definition = this.getActiveWorkflowDefinition(taskState)
				if (!definition) {
					return this.teardownWorkflowAndRequirePersistence({ taskState })
				}

				return {
					kind: "render_workflow_form",
					formSession: outcome.session,
					payload: await this.buildWorkflowFormRenderPayload({
						taskState,
						workflow: definition,
						session: outcome.session,
					}),
				}
			}
			case "complete_success":
				await this.persistWorkflowFormValues({
					taskState,
					formSession: outcome.session,
					valueChanges: outcome.valueChanges,
				})
				session.ui.formSession = undefined
				if (!session.ui.suppressedWorkflowFormIds.includes(outcome.session.workflowFormId)) {
					session.ui.suppressedWorkflowFormIds.push(outcome.session.workflowFormId)
				}
				session.branchContext.lastTriggerEvent = {
					kind: "workflow_form_completed",
					workflowFormId: outcome.session.workflowFormId,
				}
				return this.resolveNextAction({ taskState })
		}
	}

	async handleToolBackedOperationToolResult(args: {
		taskState: TaskState
		toolResultText?: string
		runtimeOwnedSourceRoute: WorkflowStepResolutionSourceRoute | undefined
	}): Promise<WorkflowNextAction> {
		const { taskState, toolResultText, runtimeOwnedSourceRoute } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		if (session.ui.stepResolutionSession) {
			const definition = this.getActiveWorkflowDefinition(taskState)
			const stepResolutionSession = session.ui.stepResolutionSession
			const activeStep = definition ? this.getActiveStepDefinition(definition, session) : undefined
			const sourceRoute = activeStep
				? this.getWorkflowDecisionRouteBySource({
						step: activeStep,
						sourceRoute: stepResolutionSession.sourceRoute,
					})
				: undefined
			if (!definition || !sourceRoute || sourceRoute.action.kind !== "execute_tool_backed_operation") {
				return { kind: "no_op" }
			}

			if (isSerializedToolFailureResultText(toolResultText)) {
				session.ui.stepResolutionSession = undefined
				this.rememberSuppressedWorkflowStepResolutionRoute(session, stepResolutionSession.sourceRoute)
				return this.completeToolBackedOperationFailure({
					taskState,
					sourceRoute: stepResolutionSession.sourceRoute,
					errorMessage: toolResultText,
				})
			}

			const evaluation = sourceRoute.action.instruction.evaluateToolExecutionResult(stepResolutionSession, {
				toolResultText,
			})

			if (evaluation.succeeded) {
				session.ui.stepResolutionSession = undefined
				this.rememberSuppressedWorkflowStepResolutionRoute(session, stepResolutionSession.sourceRoute)
				return this.completeToolBackedOperationSuccess({
					taskState,
					sourceRoute: stepResolutionSession.sourceRoute,
				})
			}

			session.ui.stepResolutionSession = undefined
			this.rememberSuppressedWorkflowStepResolutionRoute(session, stepResolutionSession.sourceRoute)
			return this.completeToolBackedOperationFailure({
				taskState,
				sourceRoute: stepResolutionSession.sourceRoute,
				errorMessage: evaluation.errorMessage,
			})
		}

		if (runtimeOwnedSourceRoute !== undefined) {
			if (isSerializedToolFailureResultText(toolResultText)) {
				return this.completeToolBackedOperationFailure({
					taskState,
					sourceRoute: runtimeOwnedSourceRoute,
					errorMessage: toolResultText,
				})
			}

			return this.completeToolBackedOperationSuccess({
				taskState,
				sourceRoute: runtimeOwnedSourceRoute,
			})
		}

		const pendingEntryArtifactFileOperation = session.entryArtifactResolution?.pendingFileOperation
		if (pendingEntryArtifactFileOperation !== undefined && isSerializedToolFailureResultText(toolResultText)) {
			session.entryArtifactResolution = {
				artifactResolutions: structuredClone(session.entryArtifactResolution?.artifactResolutions ?? []),
				pendingFileOperation: undefined,
			}
			return this.buildTerminalErrorNextAction({
				taskState,
				errorMessage: `Workflow artifact ${pendingEntryArtifactFileOperation.operation} operation failed. ${toolResultText}`,
			})
		}

		if (pendingEntryArtifactFileOperation !== undefined && isSerializedToolFailureResultText(toolResultText) === false) {
			const definition = this.getActiveWorkflowDefinition(taskState)
			if (!definition) {
				return this.teardownWorkflowAndRequirePersistence({ taskState })
			}

			const artifactResolutions = [
				...(session.entryArtifactResolution?.artifactResolutions ?? []),
				this.buildWorkflowEntryArtifactResolutionFromPendingFileOperation(pendingEntryArtifactFileOperation),
			]
			session.entryArtifactResolution = {
				artifactResolutions,
				pendingFileOperation: undefined,
			}

			return this.continueWorkflowEntryArtifactResolution({
				taskState,
				workflow: definition,
				artifactResolutions,
			})
		}

		const pendingArtifactAllocationSourceRoute = this.findPendingArtifactAllocationSourceRoute({ taskState })
		if (pendingArtifactAllocationSourceRoute) {
			if (isSerializedToolFailureResultText(toolResultText)) {
				return this.completeToolBackedOperationFailure({
					taskState,
					sourceRoute: pendingArtifactAllocationSourceRoute,
					errorMessage: toolResultText,
				})
			}

			return this.completeToolBackedOperationSuccess({
				taskState,
				sourceRoute: pendingArtifactAllocationSourceRoute,
			})
		}

		const pendingDocumentBuildSourceRoute = this.findPendingDocumentBuildSourceRoute({ taskState })
		if (!pendingDocumentBuildSourceRoute) {
			return { kind: "no_op" }
		}

		if (isSerializedToolFailureResultText(toolResultText)) {
			return this.completeToolBackedOperationFailure({
				taskState,
				sourceRoute: pendingDocumentBuildSourceRoute,
				errorMessage: toolResultText,
			})
		}

		return this.completeToolBackedOperationSuccess({
			taskState,
			sourceRoute: pendingDocumentBuildSourceRoute,
		})
	}

	async handleModelToolResult(args: {
		taskState: TaskState
		toolName: ClineDefaultTool
		toolResultText?: string
	}): Promise<WorkflowNextAction> {
		const { taskState, toolName, toolResultText } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const definition = this.getActiveWorkflowDefinition(taskState)
		if (!definition) {
			return { kind: "no_op" }
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return { kind: "no_op" }
		}

		if (
			this.isToolProjectedByWorkflowStep({
				session,
				step: activeStep,
				toolName,
			}) === false
		) {
			return { kind: "no_op" }
		}

		if (isSerializedToolFailureResultText(toolResultText)) {
			session.branchContext.lastTriggerEvent = {
				kind: "model_tool_failed",
				toolName,
				errorMessage: this.normalizeModelToolFailureMessage(toolResultText),
			}
		} else {
			session.branchContext.lastTriggerEvent = {
				kind: "model_tool_succeeded",
				toolName,
			}
		}

		return this.resolveNextAction({ taskState })
	}

	isWorkflowProgressRequestAllowed(args: { taskState: TaskState }): boolean {
		const { taskState } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return false
		}

		const definition = this.getActiveWorkflowDefinition(taskState)
		if (!definition) {
			return false
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return false
		}

		if (session.projectSelection.projectTitle === "" || session.projectSelection.projectFolderName === "") {
			return false
		}

		return (
			this.hasDecisionTreeRouteForTriggerEvent({
				session,
				step: activeStep,
				triggerEvent: {
					kind: "workflow_progress_request_confirmed",
				},
			}) ||
			this.hasDecisionTreeRouteForTriggerEvent({
				session,
				step: activeStep,
				triggerEvent: {
					kind: "workflow_progress_request_denied",
				},
			})
		)
	}

	async submitWorkflowProgressRequest(args: { taskState: TaskState; approved: boolean }): Promise<WorkflowNextAction> {
		const { taskState, approved } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const definition = this.getActiveWorkflowDefinition(taskState)
		if (!definition) {
			return { kind: "no_op" }
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return { kind: "no_op" }
		}

		if (session.projectSelection.projectTitle === "" || session.projectSelection.projectFolderName === "") {
			return { kind: "no_op" }
		}

		const triggerEvent: WorkflowBranchTriggerEvent = approved
			? {
					kind: "workflow_progress_request_confirmed",
				}
			: {
					kind: "workflow_progress_request_denied",
				}

		if (
			!this.hasDecisionTreeRouteForTriggerEvent({
				session,
				step: activeStep,
				triggerEvent,
			})
		) {
			return { kind: "no_op" }
		}

		session.branchContext.lastTriggerEvent = triggerEvent

		return this.resolveNextAction({ taskState })
	}

	async applyWorkflowValueWrites(args: {
		taskState: TaskState
		values: WorkflowValues
		clearKeys?: readonly string[]
	}): Promise<{
		changedValues: WorkflowValues
		unchangedValues: WorkflowValues
		clearedKeys: readonly string[]
		unchangedClearKeys: readonly string[]
	}> {
		const { taskState, values } = args
		const session = taskState.activeWorkflowSession
		const definition = session ? this.getActiveWorkflowDefinition(taskState) : undefined
		const allowedKeys = new Set(definition?.workflowValueKeys ?? [])

		const changedValues: WorkflowValues = {}
		const unchangedValues: WorkflowValues = {}
		const clearedKeys: string[] = []
		const unchangedClearKeys: string[] = []
		const seenClearKeys = new Set<string>()

		for (const clearKey of args.clearKeys ?? []) {
			if (seenClearKeys.has(clearKey)) {
				continue
			}
			seenClearKeys.add(clearKey)

			if (!allowedKeys.has(clearKey) || session === undefined || session.workflowValues[clearKey] === undefined) {
				unchangedClearKeys.push(clearKey)
				continue
			}

			delete session.workflowValues[clearKey]
			clearedKeys.push(clearKey)
		}

		for (const [key, rawValue] of Object.entries(values)) {
			if (!isWorkflowValue(rawValue)) {
				throw new Error(`Workflow value ${key} must be a JSON-safe workflow value.`)
			}

			if (!allowedKeys.has(key)) {
				unchangedValues[key] = rawValue
				continue
			}

			const currentValue = session?.workflowValues[key]
			if (areWorkflowValuesEqual(currentValue, rawValue)) {
				unchangedValues[key] = rawValue
				continue
			}

			if (!session) {
				unchangedValues[key] = rawValue
				continue
			}

			session.workflowValues[key] = rawValue
			changedValues[key] = rawValue
			const clearedKeyIndex = clearedKeys.indexOf(key)
			if (clearedKeyIndex >= 0) {
				clearedKeys.splice(clearedKeyIndex, 1)
			}
		}

		const changedKeys = this.dedupeWorkflowValueKeys([...Object.keys(changedValues), ...clearedKeys])
		if (changedKeys.length > 0) {
			this.recordWorkflowValuesPersistedTriggerIfRouted({
				taskState,
				changedKeys,
			})
		}

		return {
			changedValues,
			unchangedValues,
			clearedKeys,
			unchangedClearKeys,
		}
	}

	private dedupeWorkflowValueKeys(keys: readonly string[]): string[] {
		const seenKeys = new Set<string>()
		const dedupedKeys: string[] = []
		for (const key of keys) {
			if (seenKeys.has(key)) {
				continue
			}
			seenKeys.add(key)
			dedupedKeys.push(key)
		}

		return dedupedKeys
	}

	private recordWorkflowProjectSelectionCompleted(session: ActiveWorkflowSession): void {
		session.lifecycle.projectSelectionCompleted = true
	}

	private recordWorkflowValuesPersistedTriggerIfRouted(args: { taskState: TaskState; changedKeys: readonly string[] }): void {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return
		}

		const definition = this.getActiveWorkflowDefinition(args.taskState)
		if (!definition) {
			return
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return
		}

		if (session.projectSelection.projectTitle.trim() === "" || session.projectSelection.projectFolderName.trim() === "") {
			return
		}

		const triggerEvent: WorkflowBranchTriggerEvent = {
			kind: "workflow_values_persisted",
			changedKeys: args.changedKeys,
		}

		if (
			!this.hasDecisionTreeRouteForTriggerEvent({
				session,
				step: activeStep,
				triggerEvent,
			})
		) {
			return
		}

		session.branchContext.lastTriggerEvent = triggerEvent
	}

	async prepareWorkflowArtifactCreation(args: {
		taskState: TaskState
		artifactId: string
	}): Promise<WorkflowArtifactAllocationOutput> {
		const { taskState, artifactId } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			throw new Error("Cannot allocate workflow artifact without an active workflow session.")
		}

		const workflow = this.getActiveWorkflowDefinition(taskState)
		if (!workflow) {
			throw new Error("Cannot allocate workflow artifact without an active workflow definition.")
		}

		const artifactDefinition = workflow.artifacts?.[artifactId]
		if (!artifactDefinition || artifactDefinition.id !== artifactId) {
			throw new Error(`Active workflow ${workflow.name} does not define artifactId ${artifactId}.`)
		}

		return this.resolveWorkflowArtifactAllocation({
			workflow,
			session,
			artifactDefinition,
		})
	}

	async prepareWorkflowArtifactArchive(args: {
		taskState: TaskState
		artifactId: string
	}): Promise<WorkflowArtifactArchivePreparation> {
		const artifactOutput = await this.prepareWorkflowArtifactCreation(args)
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			throw new Error("Cannot archive workflow artifact without an active workflow session.")
		}

		const archiveRelativePath = join("archive", artifactOutput.artifactFilename)
		const archiveAbsolutePath = join(this.resolveWorkflowProjectOutputFolder(session), archiveRelativePath)
		this.assertWorkspacePathAllowed(artifactOutput.artifactAbsolutePath)
		this.assertWorkspacePathAllowed(archiveAbsolutePath)

		return {
			...artifactOutput,
			archiveRelativePath,
			archiveAbsolutePath,
		}
	}

	async archiveWorkflowArtifact(args: {
		taskState: TaskState
		artifactId: string
		expectedArtifactAbsolutePath: string
		expectedArchiveAbsolutePath: string
	}): Promise<WorkflowArtifactArchiveResult> {
		const preparedArchive = await this.prepareWorkflowArtifactArchive({
			taskState: args.taskState,
			artifactId: args.artifactId,
		})
		if (
			preparedArchive.artifactAbsolutePath !== args.expectedArtifactAbsolutePath ||
			preparedArchive.archiveAbsolutePath !== args.expectedArchiveAbsolutePath
		) {
			throw new Error("Workflow artifact archive paths changed before archive execution.")
		}

		const archiveParentDirectory = dirname(preparedArchive.archiveAbsolutePath)
		this.assertWorkspacePathAllowed(archiveParentDirectory)
		await mkdir(archiveParentDirectory, { recursive: true })
		this.assertWorkspacePathAllowed(preparedArchive.artifactAbsolutePath)
		this.assertWorkspacePathAllowed(preparedArchive.archiveAbsolutePath)
		try {
			await copyFile(preparedArchive.artifactAbsolutePath, preparedArchive.archiveAbsolutePath, constants.COPYFILE_EXCL)
		} catch (error) {
			if (this.isFileAlreadyExistsError(error)) {
				throw new Error(
					`Cannot archive workflow artifact because archive target already exists: ${preparedArchive.archiveAbsolutePath}`,
				)
			}

			throw error
		}
		await unlink(preparedArchive.artifactAbsolutePath)

		return preparedArchive
	}

	async prepareWorkflowArtifactDeletion(args: {
		taskState: TaskState
		artifactId: string
	}): Promise<WorkflowArtifactDeletionPreparation> {
		const artifactOutput = await this.prepareWorkflowArtifactCreation(args)
		this.assertWorkspacePathAllowed(artifactOutput.artifactAbsolutePath)
		return artifactOutput
	}

	async deleteWorkflowArtifact(args: {
		taskState: TaskState
		artifactId: string
		expectedArtifactAbsolutePath: string
	}): Promise<WorkflowArtifactDeletionResult> {
		const preparedDeletion = await this.prepareWorkflowArtifactDeletion({
			taskState: args.taskState,
			artifactId: args.artifactId,
		})
		if (preparedDeletion.artifactAbsolutePath !== args.expectedArtifactAbsolutePath) {
			throw new Error("Workflow artifact deletion path changed before deletion execution.")
		}

		this.assertWorkspacePathAllowed(preparedDeletion.artifactAbsolutePath)
		await unlink(preparedDeletion.artifactAbsolutePath)
		return preparedDeletion
	}

	async prepareWorkflowProjectFileMove(args: {
		taskState: TaskState
		sourcePath: string
		destinationPath: string
	}): Promise<WorkflowProjectFileMovePreparation> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			throw new Error("Cannot move workflow project file without an active workflow session.")
		}

		const selectedProjectRoot = this.resolveWorkflowProjectOutputFolder(session)
		const sourceAbsolutePath = this.resolveWorkflowProjectMovePath({
			selectedProjectRoot,
			filePath: args.sourcePath,
			pathRole: "source",
		})
		const destinationAbsolutePath = this.resolveWorkflowProjectMovePath({
			selectedProjectRoot,
			filePath: args.destinationPath,
			pathRole: "destination",
		})

		let sourceStats: Awaited<ReturnType<typeof stat>>
		try {
			sourceStats = await stat(sourceAbsolutePath)
		} catch (error) {
			if (this.isFileNotFoundError(error)) {
				throw new Error(`Cannot move workflow project file because source does not exist: ${sourceAbsolutePath}`)
			}
			throw error
		}

		if (!sourceStats.isFile()) {
			throw new Error(`Cannot move workflow project file because source is not a file: ${sourceAbsolutePath}`)
		}

		try {
			await stat(destinationAbsolutePath)
			throw new Error(`Cannot move workflow project file because destination already exists: ${destinationAbsolutePath}`)
		} catch (error) {
			if (this.isFileNotFoundError(error)) {
				return {
					sourceAbsolutePath,
					destinationAbsolutePath,
				}
			}
			throw error
		}
	}

	async moveWorkflowProjectFile(args: {
		taskState: TaskState
		expectedSourceAbsolutePath: string
		expectedDestinationAbsolutePath: string
	}): Promise<WorkflowProjectFileMoveResult> {
		const preparedMove = await this.prepareWorkflowProjectFileMove({
			taskState: args.taskState,
			sourcePath: args.expectedSourceAbsolutePath,
			destinationPath: args.expectedDestinationAbsolutePath,
		})
		if (
			preparedMove.sourceAbsolutePath !== args.expectedSourceAbsolutePath ||
			preparedMove.destinationAbsolutePath !== args.expectedDestinationAbsolutePath
		) {
			throw new Error("Workflow project file move paths changed before move execution.")
		}

		const destinationParentDirectory = dirname(preparedMove.destinationAbsolutePath)
		this.assertWorkspacePathAllowed(destinationParentDirectory)
		await mkdir(destinationParentDirectory, { recursive: true })
		this.assertWorkspacePathAllowed(preparedMove.sourceAbsolutePath)
		this.assertWorkspacePathAllowed(preparedMove.destinationAbsolutePath)
		try {
			await copyFile(preparedMove.sourceAbsolutePath, preparedMove.destinationAbsolutePath, constants.COPYFILE_EXCL)
		} catch (error) {
			if (this.isFileAlreadyExistsError(error)) {
				throw new Error(
					`Cannot move workflow project file because destination already exists: ${preparedMove.destinationAbsolutePath}`,
				)
			}
			throw error
		}
		await unlink(preparedMove.sourceAbsolutePath)

		return preparedMove
	}

	async preparePlanStoryArtifacts(args: {
		taskState: TaskState
		epicIdentity: string
	}): Promise<WorkflowPlanStoryArtifactsPreparation> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			throw new Error("Cannot plan story artifacts without an active workflow session.")
		}

		return {
			storyIndexAbsolutePath: this.resolveEpicStoriesIndexPath({
				session,
				epicIdentity: args.epicIdentity,
			}),
			epicsIndexAbsolutePath: this.resolveEpicsIndexPath(session),
		}
	}

	async planStoryArtifacts(args: {
		taskState: TaskState
		epicIdentity: string
		storyCount: number
		expectedStoryIndexAbsolutePath: string
		expectedEpicsIndexAbsolutePath: string
	}): Promise<WorkflowPlanStoryArtifactsResult> {
		if (Number.isInteger(args.storyCount) === false || args.storyCount <= 0) {
			throw new Error("Story count must be a positive integer.")
		}

		const preparation = await this.preparePlanStoryArtifacts({
			taskState: args.taskState,
			epicIdentity: args.epicIdentity,
		})
		if (preparation.storyIndexAbsolutePath !== args.expectedStoryIndexAbsolutePath) {
			throw new Error("Story index path changed before story artifact planning.")
		}
		if (preparation.epicsIndexAbsolutePath !== args.expectedEpicsIndexAbsolutePath) {
			throw new Error("Epics index path changed before story artifact planning.")
		}

		const epicsIndex = await this.readEpicsIndexForStoryPlanning(preparation.epicsIndexAbsolutePath)
		const epicIdentity = args.epicIdentity.trim()
		const selectedEpic = epicsIndex.epics.find((epic) => epic.identity === epicIdentity)
		if (selectedEpic === undefined) {
			throw new Error(
				`Cannot plan story artifacts because epic_identity ${epicIdentity} is not present in Epics.index.json.`,
			)
		}

		const storyIndex = await this.readWorkflowStoryIndexOrCreateEmpty(preparation.storyIndexAbsolutePath)
		const existingStoryIdentities = new Set(storyIndex.stories.map((story) => story.story_identity))
		const appendedStoryIdentities: string[] = []
		for (let storyNumber = 1; storyNumber <= args.storyCount; storyNumber += 1) {
			const primaryStoryEntry = buildPrimaryStoryIndexEntry({
				epicIdentity,
				storyNumber,
			})
			if (existingStoryIdentities.has(primaryStoryEntry.story_identity)) {
				continue
			}

			storyIndex.stories.push(primaryStoryEntry)
			existingStoryIdentities.add(primaryStoryEntry.story_identity)
			appendedStoryIdentities.push(primaryStoryEntry.story_identity)
		}

		await this.writeWorkflowStoryIndex({
			storyIndexAbsolutePath: preparation.storyIndexAbsolutePath,
			storyIndex,
		})
		selectedEpic["story-index-generated"] = true
		await this.writeWorkflowEpicsIndex({
			epicsIndexAbsolutePath: preparation.epicsIndexAbsolutePath,
			epicsIndex,
		})

		return {
			...preparation,
			storyIndex,
			appendedStoryIdentities,
		}
	}

	private async readEpicsIndexForStoryPlanning(epicsIndexAbsolutePath: string): Promise<WorkflowEpicsIndex> {
		this.assertWorkspacePathAllowed(epicsIndexAbsolutePath)

		let epicsIndexText: string
		try {
			epicsIndexText = await readFile(epicsIndexAbsolutePath, "utf8")
		} catch (error) {
			const errorMessage = error instanceof Error ? ` ${error.message}` : ""
			throw new Error(`Cannot plan story artifacts because Epics.index.json could not be read.${errorMessage}`)
		}

		return this.parseEpicsIndexJson({ artifactId: "plan_story_artifacts", epicsIndexText })
	}

	private async writeWorkflowEpicsIndex(args: {
		epicsIndexAbsolutePath: string
		epicsIndex: WorkflowEpicsIndex
	}): Promise<void> {
		this.assertWorkspacePathAllowed(args.epicsIndexAbsolutePath)
		await writeFile(args.epicsIndexAbsolutePath, this.stringifyWorkflowEpicsIndex(args.epicsIndex), "utf8")
	}

	private stringifyWorkflowEpicsIndex(epicsIndex: WorkflowEpicsIndex): string {
		return `${JSON.stringify(
			{
				version: epicsIndex.version,
				epics: epicsIndex.epics.map((epic) => ({
					identity: epic.identity,
					title: epic.title,
					"story-index-generated": epic["story-index-generated"],
				})),
			},
			undefined,
			2,
		)}\n`
	}

	async preparePlanRemediationStoryArtifact(args: {
		taskState: TaskState
		epicIdentity: string
	}): Promise<WorkflowPlanRemediationStoryArtifactPreparation> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			throw new Error("Cannot plan remediation story artifacts without an active workflow session.")
		}

		return {
			storyIndexAbsolutePath: this.resolveEpicStoriesIndexPath({
				session,
				epicIdentity: args.epicIdentity,
			}),
		}
	}

	async planRemediationStoryArtifact(args: {
		taskState: TaskState
		epicIdentity: string
		targetStoryIdentity: string
		expectedStoryIndexAbsolutePath: string
	}): Promise<WorkflowPlanRemediationStoryArtifactResult> {
		const preparation = await this.preparePlanRemediationStoryArtifact({
			taskState: args.taskState,
			epicIdentity: args.epicIdentity,
		})
		if (preparation.storyIndexAbsolutePath !== args.expectedStoryIndexAbsolutePath) {
			throw new Error("Story index path changed before remediation story artifact planning.")
		}

		const storyIndex = await this.readWorkflowStoryIndexOrCreateEmpty(preparation.storyIndexAbsolutePath)
		const targetStory = storyIndex.stories.find((story) => story.story_identity === args.targetStoryIdentity)
		if (targetStory === undefined) {
			throw new Error(`Target story identity ${args.targetStoryIdentity} was not found in the selected epic story index.`)
		}
		if (targetStory.story_type !== "primary") {
			throw new Error(`Target story identity ${args.targetStoryIdentity} must be a primary story.`)
		}

		const existingRemediationNumbers = storyIndex.stories
			.filter((story) => story.story_type === "remediation" && story.parent_story_identity === args.targetStoryIdentity)
			.map((story) => {
				const remediationStoryNumber = story.story_identity.split(".")[2]
				return remediationStoryNumber === undefined ? 0 : Number.parseInt(remediationStoryNumber, 10)
			})
			.filter((remediationStoryNumber) => Number.isInteger(remediationStoryNumber) && remediationStoryNumber > 0)
		const nextRemediationStoryNumber = this.getNextPositiveInteger(existingRemediationNumbers)
		const remediationStoryEntry = buildRemediationStoryIndexEntry({
			parentStoryIdentity: args.targetStoryIdentity,
			remediationStoryNumber: nextRemediationStoryNumber,
		})
		storyIndex.stories.push(remediationStoryEntry)

		await this.writeWorkflowStoryIndex({
			storyIndexAbsolutePath: preparation.storyIndexAbsolutePath,
			storyIndex,
		})

		return {
			...preparation,
			storyIndex,
			appendedStoryIdentity: remediationStoryEntry.story_identity,
		}
	}

	async prepareGenerateStoryFiles(args: {
		taskState: TaskState
		epicIdentity: string
	}): Promise<WorkflowGenerateStoryFilesPreparation> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			throw new Error("Cannot generate story files without an active workflow session.")
		}

		const storyIndexAbsolutePath = this.resolveEpicStoriesIndexPath({
			session,
			epicIdentity: args.epicIdentity,
		})
		const storyIndex = await this.readRequiredWorkflowStoryIndex(storyIndexAbsolutePath)
		return {
			storyIndexAbsolutePath,
			draftStoryFileAbsolutePaths: storyIndex.stories.map((story) =>
				this.resolveDraftStoryFilePath({
					session,
					storyFileName: story.story_file_name,
				}),
			),
		}
	}

	async generateStoryFiles(args: {
		taskState: TaskState
		epicIdentity: string
		expectedStoryIndexAbsolutePath: string
		expectedDraftStoryFileAbsolutePaths: readonly string[]
	}): Promise<WorkflowGenerateStoryFilesResult> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			throw new Error("Cannot generate story files without an active workflow session.")
		}

		const preparation = await this.prepareGenerateStoryFiles({
			taskState: args.taskState,
			epicIdentity: args.epicIdentity,
		})
		if (preparation.storyIndexAbsolutePath !== args.expectedStoryIndexAbsolutePath) {
			throw new Error("Story index path changed before story-file generation.")
		}
		if (
			this.areStringArraysEqual(preparation.draftStoryFileAbsolutePaths, args.expectedDraftStoryFileAbsolutePaths) === false
		) {
			throw new Error("Draft story file paths changed before story-file generation.")
		}

		const storyTemplateContent = buildWorkflowStoryFileTemplate()
		const storyIndex = await this.readRequiredWorkflowStoryIndex(preparation.storyIndexAbsolutePath)
		const createdDraftStoryFileAbsolutePaths: string[] = []
		const existingDraftStoryFileAbsolutePaths: string[] = []

		for (const story of storyIndex.stories) {
			const draftStoryFileAbsolutePath = this.resolveDraftStoryFilePath({
				session,
				storyFileName: story.story_file_name,
			})
			this.assertWorkspacePathAllowed(dirname(draftStoryFileAbsolutePath))
			await mkdir(dirname(draftStoryFileAbsolutePath), { recursive: true })
			try {
				await writeFile(draftStoryFileAbsolutePath, storyTemplateContent, { encoding: "utf8", flag: "wx" })
				createdDraftStoryFileAbsolutePaths.push(draftStoryFileAbsolutePath)
			} catch (error) {
				if (this.isFileAlreadyExistsError(error)) {
					const existingStats = await stat(draftStoryFileAbsolutePath)
					if (existingStats.isFile() === false) {
						throw new Error(
							`Cannot generate story file because path already exists and is not a file: ${draftStoryFileAbsolutePath}`,
						)
					}
					existingDraftStoryFileAbsolutePaths.push(draftStoryFileAbsolutePath)
				} else {
					throw error
				}
			}
			story.story_file_generated = true
		}

		await this.writeWorkflowStoryIndex({
			storyIndexAbsolutePath: preparation.storyIndexAbsolutePath,
			storyIndex,
		})

		return {
			...preparation,
			storyIndex,
			createdDraftStoryFileAbsolutePaths,
			existingDraftStoryFileAbsolutePaths,
		}
	}

	async updateStoryIndexStatus(args: {
		taskState: TaskState
		storiesIndex: string
		storyIdentity: string
		status: WorkflowStoryStatus
		expectedCurrentStatus: WorkflowStoryStatus | undefined
	}): Promise<WorkflowUpdateStoryIndexStatusResult> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			throw new Error("Cannot update story index status without an active workflow session.")
		}

		if (!isAbsolute(args.storiesIndex)) {
			throw new Error(`Story index status update path must be absolute: ${args.storiesIndex}`)
		}

		const storyIdentity = args.storyIdentity.trim()
		if (storyIdentity === "") {
			throw new Error("Story identity must be a non-empty string.")
		}

		const epicIdentity = this.resolveEpicIdentityFromStoryIdentity(storyIdentity)
		const expectedStoryIndexAbsolutePath = this.resolveEpicStoriesIndexPath({
			session,
			epicIdentity,
		})
		if (args.storiesIndex !== expectedStoryIndexAbsolutePath) {
			throw new Error("Story index path changed before story-index status update.")
		}

		const storyIndex = await this.readRequiredWorkflowStoryIndexForStatusUpdate(args.storiesIndex)
		const selectedStory = storyIndex.stories.find((story) => story.story_identity === storyIdentity)
		if (selectedStory === undefined) {
			throw new Error(`Story identity ${storyIdentity} was not found in the selected epic story index.`)
		}

		const previousStatus = selectedStory.status
		if (args.expectedCurrentStatus !== undefined && previousStatus !== args.expectedCurrentStatus) {
			throw new Error(
				`Cannot update story identity ${storyIdentity} because current status is ${previousStatus}, not ${args.expectedCurrentStatus}.`,
			)
		}

		selectedStory.status = args.status
		await this.writeWorkflowStoryIndex({
			storyIndexAbsolutePath: args.storiesIndex,
			storyIndex,
		})

		return {
			storiesIndex: args.storiesIndex,
			storyIdentity,
			previousStatus,
			status: args.status,
		}
	}

	private async readWorkflowStoryIndexOrCreateEmpty(storyIndexAbsolutePath: string): Promise<WorkflowStoryIndex> {
		this.assertWorkspacePathAllowed(storyIndexAbsolutePath)
		try {
			return parseWorkflowStoryIndexJson(await readFile(storyIndexAbsolutePath, "utf8"))
		} catch (error) {
			if (this.isFileNotFoundError(error)) {
				return {
					version: 1,
					stories: [],
				}
			}

			throw error
		}
	}

	private areStringArraysEqual(leftValues: readonly string[], rightValues: readonly string[]): boolean {
		if (leftValues.length !== rightValues.length) {
			return false
		}

		return leftValues.every((leftValue, index) => leftValue === rightValues[index])
	}

	private resolveEpicIdentityFromStoryIdentity(storyIdentity: string): string {
		const identitySegments = storyIdentity.split(".")
		const epicIdentity = identitySegments[0]
		if (epicIdentity === undefined || epicIdentity.trim() === "" || identitySegments.length < 2) {
			throw new Error("Story identity must use canonical dotted positive numeric form E.S or E.S.R.")
		}

		return epicIdentity
	}

	private async readRequiredWorkflowStoryIndexForStatusUpdate(storyIndexAbsolutePath: string): Promise<WorkflowStoryIndex> {
		this.assertWorkspacePathAllowed(storyIndexAbsolutePath)
		try {
			return parseWorkflowStoryIndexJson(await readFile(storyIndexAbsolutePath, "utf8"))
		} catch (error) {
			if (this.isFileNotFoundError(error)) {
				throw new Error(`Cannot update story index status because story index does not exist: ${storyIndexAbsolutePath}`)
			}

			throw error
		}
	}

	private async readRequiredWorkflowStoryIndex(storyIndexAbsolutePath: string): Promise<WorkflowStoryIndex> {
		this.assertWorkspacePathAllowed(storyIndexAbsolutePath)
		try {
			return parseWorkflowStoryIndexJson(await readFile(storyIndexAbsolutePath, "utf8"))
		} catch (error) {
			if (this.isFileNotFoundError(error)) {
				throw new Error(`Cannot generate story files because story index does not exist: ${storyIndexAbsolutePath}`)
			}

			throw error
		}
	}

	private async writeWorkflowStoryIndex(args: {
		storyIndexAbsolutePath: string
		storyIndex: WorkflowStoryIndex
	}): Promise<void> {
		this.assertWorkspacePathAllowed(dirname(args.storyIndexAbsolutePath))
		await mkdir(dirname(args.storyIndexAbsolutePath), { recursive: true })
		this.assertWorkspacePathAllowed(args.storyIndexAbsolutePath)
		await writeFile(args.storyIndexAbsolutePath, stringifyWorkflowStoryIndex(args.storyIndex), "utf8")
	}

	private async resolveActiveWorkflowNewArtifactOutputs(args: {
		taskState: TaskState
	}): Promise<readonly WorkflowArtifactAllocationOutput[]> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			throw new Error("Cannot resolve workflow artifacts without an active workflow session.")
		}

		const workflow = this.getActiveWorkflowDefinition(args.taskState)
		if (!workflow) {
			throw new Error("Cannot resolve workflow artifacts without an active workflow definition.")
		}

		const artifactOutputs: WorkflowArtifactAllocationOutput[] = []
		for (const artifactDefinition of Object.values(workflow.artifacts ?? {})) {
			if (artifactDefinition.intentMode !== "new") {
				continue
			}

			artifactOutputs.push(
				await this.resolveWorkflowArtifactAllocation({
					workflow,
					session,
					artifactDefinition,
				}),
			)
		}

		return artifactOutputs
	}

	private async resolveActiveWorkflowNewSingletonArtifactOutputs(args: {
		taskState: TaskState
	}): Promise<readonly WorkflowArtifactAllocationOutput[]> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			throw new Error("Cannot resolve workflow singleton artifacts without an active workflow session.")
		}

		const workflow = this.getActiveWorkflowDefinition(args.taskState)
		if (!workflow) {
			throw new Error("Cannot resolve workflow singleton artifacts without an active workflow definition.")
		}

		const artifactOutputs: WorkflowArtifactAllocationOutput[] = []
		for (const artifactDefinition of Object.values(workflow.artifacts ?? {})) {
			if (artifactDefinition.intentMode !== "new") {
				continue
			}

			const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[artifactDefinition.family]
			if (familyDefinition.allocationMode !== "singleton_project") {
				continue
			}

			artifactOutputs.push(
				await this.resolveWorkflowArtifactAllocation({
					workflow,
					session,
					artifactDefinition,
				}),
			)
		}

		return artifactOutputs
	}

	private async doesWorkflowArtifactOutputFileExist(artifactOutput: WorkflowArtifactAllocationOutput): Promise<boolean> {
		this.assertWorkspacePathAllowed(artifactOutput.artifactAbsolutePath)
		try {
			const artifactStats = await stat(artifactOutput.artifactAbsolutePath)
			return artifactStats.isFile()
		} catch (error) {
			if (this.isFileNotFoundError(error)) {
				return false
			}

			throw error
		}
	}

	private async checkWorkflowEntrySingletonArtifacts(args: {
		taskState: TaskState
	}): Promise<WorkflowEntrySingletonArtifactCheck> {
		const artifactOutputs = await this.resolveActiveWorkflowNewSingletonArtifactOutputs(args)
		const existingArtifactOutputs: WorkflowArtifactAllocationOutput[] = []
		for (const artifactOutput of artifactOutputs) {
			if (await this.doesWorkflowArtifactOutputFileExist(artifactOutput)) {
				existingArtifactOutputs.push(artifactOutput)
			}
		}

		return {
			artifactOutputs,
			existingArtifactOutputs,
		}
	}

	private buildWorkflowEntryArtifactResolution(args: {
		artifactOutput: WorkflowArtifactAllocationOutput
		creationRequired: boolean
		existingArtifactAction: WorkflowEntryArtifactExistingAction
	}): WorkflowEntryArtifactResolution {
		if (this.isWorkflowArtifactFamily(args.artifactOutput.artifactFamily) === false) {
			throw new Error(`Workflow artifact ${args.artifactOutput.artifactId} resolved an unsupported artifact family.`)
		}

		return {
			artifactId: args.artifactOutput.artifactId,
			artifactFamily: args.artifactOutput.artifactFamily,
			artifactIdentity: args.artifactOutput.artifactIdentity,
			artifactFilename: args.artifactOutput.artifactFilename,
			artifactRelativePath: args.artifactOutput.artifactRelativePath,
			artifactAbsolutePath: args.artifactOutput.artifactAbsolutePath,
			creationRequired: args.creationRequired,
			existingArtifactAction: args.existingArtifactAction,
		}
	}

	private buildWorkflowEntryArtifactPendingFileOperation(args: {
		artifactOutput: WorkflowArtifactAllocationOutput
		operation: WorkflowEntryArtifactFileOperation
	}): WorkflowEntryArtifactPendingFileOperation {
		if (this.isWorkflowArtifactFamily(args.artifactOutput.artifactFamily) === false) {
			throw new Error(`Workflow artifact ${args.artifactOutput.artifactId} resolved an unsupported artifact family.`)
		}

		return {
			artifactId: args.artifactOutput.artifactId,
			artifactFamily: args.artifactOutput.artifactFamily,
			artifactIdentity: args.artifactOutput.artifactIdentity,
			artifactFilename: args.artifactOutput.artifactFilename,
			artifactRelativePath: args.artifactOutput.artifactRelativePath,
			artifactAbsolutePath: args.artifactOutput.artifactAbsolutePath,
			operation: args.operation,
		}
	}

	private buildWorkflowEntryArtifactResolutionFromPendingFileOperation(
		pendingFileOperation: WorkflowEntryArtifactPendingFileOperation,
	): WorkflowEntryArtifactResolution {
		return {
			artifactId: pendingFileOperation.artifactId,
			artifactFamily: pendingFileOperation.artifactFamily,
			artifactIdentity: pendingFileOperation.artifactIdentity,
			artifactFilename: pendingFileOperation.artifactFilename,
			artifactRelativePath: pendingFileOperation.artifactRelativePath,
			artifactAbsolutePath: pendingFileOperation.artifactAbsolutePath,
			creationRequired: true,
			existingArtifactAction: pendingFileOperation.operation,
		}
	}

	private async completeWorkflowEntryArtifactResolution(args: {
		taskState: TaskState
		artifactResolutions: readonly WorkflowEntryArtifactResolution[]
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const artifactResolutions: WorkflowEntryArtifactResolution[] = structuredClone([...args.artifactResolutions])
		session.entryArtifactResolution = {
			artifactResolutions,
			pendingFileOperation: undefined,
		}
		session.ui.formSession = undefined
		session.branchContext.lastTriggerEvent = {
			kind: "entry_artifact_resolution_completed",
			artifactResolutions,
		}
		this.refreshCurrentFocusChainChecklist(args.taskState)
		return this.resolveNextAction({ taskState: args.taskState })
	}

	private buildWorkflowEntryArtifactFormData(artifactOutput: WorkflowArtifactAllocationOutput): WorkflowFormSessionData {
		return {
			artifactId: artifactOutput.artifactId,
			artifactFamily: artifactOutput.artifactFamily,
			artifactIdentity: artifactOutput.artifactIdentity,
			artifactFilename: artifactOutput.artifactFilename,
			artifactRelativePath: artifactOutput.artifactRelativePath,
			artifactAbsolutePath: artifactOutput.artifactAbsolutePath,
		}
	}

	private buildWorkflowEntryArtifactConflictFormDefinition(
		artifactOutput: WorkflowArtifactAllocationOutput,
	): WorkflowFormDefinitionPayload {
		return {
			definitionVersion: 1,
			title: "Existing Workflow Artifact",
			toolDictionaryTitle: "",
			toolDictionaryMarkdown: "",
			firstPanelId: WORKFLOW_ENTRY_ARTIFACT_CONFLICT_PANEL_ID,
			panels: {
				[WORKFLOW_ENTRY_ARTIFACT_CONFLICT_PANEL_ID]: {
					panelId: WORKFLOW_ENTRY_ARTIFACT_CONFLICT_PANEL_ID,
					title: "Existing Document Found",
					promptMarkdown: `A canonical workflow document already exists at \`${artifactOutput.artifactRelativePath}\`. Continue work on this existing document?`,
					fields: [
						{
							key: WORKFLOW_ENTRY_ARTIFACT_CONFLICT_ACTION_FIELD_KEY,
							kind: "radio_group",
							label: "Existing document",
							helpText: "Choose whether this workflow should continue with the existing document.",
							required: true,
							options: [
								{
									value: WORKFLOW_ENTRY_ARTIFACT_CONFLICT_CONTINUE_VALUE,
									label: "Continue Existing",
								},
								{
									value: WORKFLOW_ENTRY_ARTIFACT_CONFLICT_REPLACE_VALUE,
									label: "Replace Existing",
								},
							],
						},
					],
					allowedActions: ["submit"],
					actionLabels: {
						submit: "Continue",
					},
					transition: {
						type: "conditional",
						conditionSourceKey: WORKFLOW_ENTRY_ARTIFACT_CONFLICT_ACTION_FIELD_KEY,
						branches: [
							{
								matchValue: WORKFLOW_ENTRY_ARTIFACT_CONFLICT_CONTINUE_VALUE,
								terminal: true,
							},
							{
								matchValue: WORKFLOW_ENTRY_ARTIFACT_CONFLICT_REPLACE_VALUE,
								terminal: true,
							},
						],
						defaultTerminal: true,
					},
				},
			},
		}
	}

	private buildWorkflowEntryArtifactReplacementFormDefinition(
		artifactOutput: WorkflowArtifactAllocationOutput,
	): WorkflowFormDefinitionPayload {
		return {
			definitionVersion: 1,
			title: "Replace Existing Workflow Artifact",
			toolDictionaryTitle: "",
			toolDictionaryMarkdown: "",
			firstPanelId: WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_PANEL_ID,
			panels: {
				[WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_PANEL_ID]: {
					panelId: WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_PANEL_ID,
					title: "Replace Existing Document",
					promptMarkdown: `Choose how to resolve the existing canonical workflow document at \`${artifactOutput.artifactRelativePath}\`.`,
					fields: [
						{
							key: WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_ACTION_FIELD_KEY,
							kind: "radio_group",
							label: "Replacement action",
							helpText: "Archive, delete, or cancel replacement for the existing document.",
							required: true,
							options: [
								{
									value: "archive_existing",
									label: "Archive Existing",
								},
								{
									value: "delete_existing",
									label: "Delete Existing",
								},
								{
									value: WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_CANCEL_VALUE,
									label: "Cancel",
								},
							],
						},
					],
					allowedActions: ["submit"],
					actionLabels: {
						submit: "Continue",
					},
					transition: {
						type: "conditional",
						conditionSourceKey: WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_ACTION_FIELD_KEY,
						branches: [
							{
								matchValue: "archive_existing",
								terminal: true,
							},
							{
								matchValue: "delete_existing",
								terminal: true,
							},
							{
								matchValue: WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_CANCEL_VALUE,
								terminal: true,
							},
						],
						defaultTerminal: true,
					},
				},
			},
		}
	}

	private async buildWorkflowEntryArtifactConflictFormNextAction(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		artifactOutput: WorkflowArtifactAllocationOutput
		artifactResolutions: readonly WorkflowEntryArtifactResolution[]
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		session.entryArtifactResolution = {
			artifactResolutions: structuredClone(args.artifactResolutions),
			pendingFileOperation: undefined,
		}

		const definitionPayload = this.buildWorkflowEntryArtifactConflictFormDefinition(args.artifactOutput)
		const formSession = this.workflowFormRuntime.createSession({
			workflowFormId: WORKFLOW_ENTRY_FORM_ID,
			definitionPayload,
			data: this.buildWorkflowEntryArtifactFormData(args.artifactOutput),
		})
		session.ui.formSession = formSession

		return {
			kind: "render_workflow_form",
			formSession,
			payload: await this.buildWorkflowFormRenderPayload({
				taskState: args.taskState,
				workflow: args.workflow,
				session: formSession,
			}),
		}
	}

	private async buildWorkflowEntryArtifactReplacementFormNextAction(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		formSession: WorkflowFormSessionState
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const artifactOutput = await this.resolveWorkflowEntryArtifactOutputFromFormSession({
			workflow: args.workflow,
			session,
			formSession: args.formSession,
		})
		if (artifactOutput === undefined) {
			return this.buildTerminalErrorNextAction({
				taskState: args.taskState,
				errorMessage: "Workflow entry artifact replacement could not restore the selected existing artifact.",
			})
		}

		const definitionPayload = this.buildWorkflowEntryArtifactReplacementFormDefinition(artifactOutput)
		const replacementFormSession = this.workflowFormRuntime.createSession({
			workflowFormId: WORKFLOW_ENTRY_FORM_ID,
			definitionPayload,
			data: this.buildWorkflowEntryArtifactFormData(artifactOutput),
		})
		session.ui.formSession = replacementFormSession

		return {
			kind: "render_workflow_form",
			formSession: replacementFormSession,
			payload: await this.buildWorkflowFormRenderPayload({
				taskState: args.taskState,
				workflow: args.workflow,
				session: replacementFormSession,
			}),
		}
	}

	private async continueWorkflowEntryArtifactResolution(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		artifactResolutions: readonly WorkflowEntryArtifactResolution[]
	}): Promise<WorkflowNextAction> {
		const entryArtifactCheck = await this.checkWorkflowEntrySingletonArtifacts({ taskState: args.taskState })
		const existingArtifactPathSet = new Set(
			entryArtifactCheck.existingArtifactOutputs.map((artifactOutput) => artifactOutput.artifactAbsolutePath),
		)
		const artifactResolutions: WorkflowEntryArtifactResolution[] = structuredClone([...args.artifactResolutions])
		const resolvedArtifactIds = new Set(artifactResolutions.map((artifactResolution) => artifactResolution.artifactId))

		for (const artifactOutput of entryArtifactCheck.artifactOutputs) {
			if (resolvedArtifactIds.has(artifactOutput.artifactId)) {
				continue
			}

			if (existingArtifactPathSet.has(artifactOutput.artifactAbsolutePath)) {
				return this.buildWorkflowEntryArtifactConflictFormNextAction({
					taskState: args.taskState,
					workflow: args.workflow,
					artifactOutput,
					artifactResolutions,
				})
			}

			const artifactResolution = this.buildWorkflowEntryArtifactResolution({
				artifactOutput,
				creationRequired: true,
				existingArtifactAction: "none",
			})
			artifactResolutions.push(artifactResolution)
			resolvedArtifactIds.add(artifactResolution.artifactId)
		}

		return this.completeWorkflowEntryArtifactResolution({
			taskState: args.taskState,
			artifactResolutions,
		})
	}

	private async resolveNewProjectWorkflowEntryArtifactResolutions(args: {
		taskState: TaskState
	}): Promise<readonly WorkflowEntryArtifactResolution[]> {
		const artifactOutputs = await this.resolveActiveWorkflowNewSingletonArtifactOutputs({ taskState: args.taskState })
		return artifactOutputs.map((artifactOutput) =>
			this.buildWorkflowEntryArtifactResolution({
				artifactOutput,
				creationRequired: true,
				existingArtifactAction: "none",
			}),
		)
	}

	async createWorkflowArtifact(args: {
		taskState: TaskState
		artifactId: string
		expectedArtifactAbsolutePath: string | undefined
	}): Promise<WorkflowArtifactCreationResult> {
		const allocation = await this.prepareWorkflowArtifactCreation({
			taskState: args.taskState,
			artifactId: args.artifactId,
		})

		if (
			args.expectedArtifactAbsolutePath !== undefined &&
			args.expectedArtifactAbsolutePath !== allocation.artifactAbsolutePath
		) {
			throw new Error("Workflow artifact allocation changed before file creation.")
		}

		const artifactParentDirectory = dirname(allocation.artifactAbsolutePath)
		this.assertWorkspacePathAllowed(artifactParentDirectory)
		await mkdir(artifactParentDirectory, { recursive: true })
		this.assertWorkspacePathAllowed(allocation.artifactAbsolutePath)
		await writeFile(allocation.artifactAbsolutePath, "", { encoding: "utf8", flag: "wx" })

		const workflowValueWriteResult = await this.applyWorkflowValueWrites({
			taskState: args.taskState,
			values: allocation.workflowValueWrites,
		})

		return {
			...allocation,
			changedWorkflowValues: workflowValueWriteResult.changedValues,
			unchangedWorkflowValues: workflowValueWriteResult.unchangedValues,
		}
	}

	async buildTurnProjection(args: { taskState: TaskState; isFirstTaskRequest?: boolean }): Promise<WorkflowPromptProjection> {
		const { taskState } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return {
				workflowInputPayloadBlock: undefined,
				continuationWorkflowInputPayloadBlock: undefined,
				workflowToolSchemaOverride: undefined,
			}
		}

		const definition = this.getActiveWorkflowDefinition(taskState)
		if (!definition) {
			return {
				workflowInputPayloadBlock: undefined,
				continuationWorkflowInputPayloadBlock: undefined,
				workflowToolSchemaOverride: undefined,
			}
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return {
				workflowInputPayloadBlock: undefined,
				continuationWorkflowInputPayloadBlock: undefined,
				workflowToolSchemaOverride: undefined,
			}
		}

		const promptBuilderInput: WorkflowPromptBuilderInput = {
			session,
			step: activeStep,
			renderWorkflowValue: stringifyWorkflowValueForPrompt,
		}
		const promptSource = activeStep.buildPromptSource(promptBuilderInput)
		const workflowStepList = this.buildWorkflowStepChecklist(definition, session)
		const workflowToolSchemaOverride = activeStep.buildToolSchema(promptBuilderInput)
		const includePersona = args.isFirstTaskRequest ?? taskState.apiRequestCount === 1

		return {
			workflowInputPayloadBlock: this.joinPromptSections([
				includePersona ? this.buildWorkflowPersonaInputPayloadBlock(definition) : undefined,
				this.buildWorkflowContextInputPayloadBlock(definition, workflowStepList),
				this.buildWorkflowCurrentStepInputPayloadBlock(activeStep, promptSource.currentStepInstructions),
			]),
			continuationWorkflowInputPayloadBlock: this.joinPromptSections([
				this.buildWorkflowContextInputPayloadBlock(definition, workflowStepList),
				this.buildWorkflowCurrentStepInputPayloadBlock(activeStep, promptSource.currentStepInstructions),
			]),
			workflowToolSchemaOverride,
		}
	}

	private buildWorkflowPersonaInputPayloadBlock(definition: WorkflowDefinition): string | undefined {
		const persona = definition.persona
		return this.joinPromptSections([
			"Persona:\nYou are to adopt this persona throughout your interactions with the user.",
			`Name: ${persona.name}`,
			`Role: ${persona.role}`,
			`Identity: ${persona.identity}`,
			`Capabilities: ${persona.capabilities.join(", ")}`,
			`Communication Style: ${persona.communicationStyle}`,
			`Principles: ${persona.principles.join("\n")}`,
		])
	}

	private buildWorkflowContextInputPayloadBlock(definition: WorkflowDefinition, workflowStepList: string): string | undefined {
		return this.joinPromptSections([
			`Workflow:\n${definition.displayName}`,
			`Description: ${definition.description}`,
			`Workflow Steps:\n${workflowStepList}`,
		])
	}

	private buildWorkflowCurrentStepInputPayloadBlock(
		activeStep: WorkflowStepDefinition,
		currentStepInstructions: string | undefined,
	): string | undefined {
		return this.joinPromptSections([
			"CURRENT STEP DETAILED INSTRUCTIONS",
			`Step ${activeStep.stepNumber}: ${activeStep.checklistLabel}`,
			currentStepInstructions,
		])
	}

	buildToolBackedOperationStatusPayload(args: {
		taskState: TaskState
		session: WorkflowStepResolutionSessionState
	}): ClineWorkflowStepResolutionStatus | undefined {
		const definition = this.getActiveWorkflowDefinition(args.taskState)
		const session = args.taskState.activeWorkflowSession
		const activeStep = definition && session ? this.getActiveStepDefinition(definition, session) : undefined
		const sourceRoute = activeStep
			? this.getWorkflowDecisionRouteBySource({
					step: activeStep,
					sourceRoute: args.session.sourceRoute,
				})
			: undefined
		if (!sourceRoute || sourceRoute.action.kind !== "execute_tool_backed_operation") {
			return undefined
		}

		return buildWorkflowStepResolutionStatusPayload(
			args.session,
			sourceRoute.action.instruction.buildStatusDefinition(args.session),
		)
	}

	private cloneWorkflowSession(session: ActiveWorkflowSession): ActiveWorkflowSession {
		return {
			activeStepNumber: session.activeStepNumber,
			workflowValues: structuredClone(session.workflowValues),
			projectSelection: structuredClone(session.projectSelection),
			lifecycle: structuredClone(session.lifecycle),
			entryArtifactResolution: structuredClone(session.entryArtifactResolution),
			ui: structuredClone(session.ui),
			branchContext: structuredClone(session.branchContext),
		}
	}

	private isPlainRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && Array.isArray(value) === false
	}

	private isFileNotFoundError(error: unknown): boolean {
		return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
	}

	private isFileAlreadyExistsError(error: unknown): boolean {
		return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST"
	}

	private isNonEmptyString(value: unknown): value is string {
		return typeof value === "string" && value.trim() !== ""
	}

	private isStringArray(value: unknown): value is string[] {
		return Array.isArray(value) && value.every((entry) => typeof entry === "string")
	}

	private isWorkflowStepResolutionSourceRoute(value: unknown): value is WorkflowStepResolutionSourceRoute {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		return (
			typeof value.branchId === "string" &&
			value.branchId.trim() !== "" &&
			typeof value.routeId === "string" &&
			value.routeId.trim() !== ""
		)
	}

	private isWorkflowStepResolutionSourceRouteArray(value: unknown): value is WorkflowStepResolutionSourceRoute[] {
		return Array.isArray(value) && value.every((entry) => this.isWorkflowStepResolutionSourceRoute(entry))
	}

	private isRestorableWorkflowValueRecord(value: unknown, definition: WorkflowDefinition): value is WorkflowValues {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		const allowedKeys = new Set(definition.workflowValueKeys)
		return Object.entries(value).every(([key, entry]) => allowedKeys.has(key) && isWorkflowValue(entry))
	}

	private isWorkflowProjectSelectionState(value: unknown): value is WorkflowProjectSelectionState {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		return (
			(value.projectMode === "new" || value.projectMode === "existing") &&
			typeof value.projectTitle === "string" &&
			typeof value.projectFolderName === "string"
		)
	}

	private isWorkflowRuntimeLifecycleState(value: unknown): value is WorkflowRuntimeLifecycleState {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		return typeof value.projectSelectionCompleted === "boolean"
	}

	private isWorkflowArtifactFamily(value: unknown): value is WorkflowArtifactFamily {
		if (typeof value !== "string") {
			return false
		}

		return Object.values(WORKFLOW_ARTIFACT_FAMILY_REGISTRY).some((definition) => definition.family === value)
	}

	private isWorkflowEntryArtifactExistingAction(value: unknown): value is WorkflowEntryArtifactExistingAction {
		return value === "none" || value === "continue_existing" || value === "archive_existing" || value === "delete_existing"
	}

	private isWorkflowEntryArtifactFileOperation(value: unknown): value is WorkflowEntryArtifactFileOperation {
		return value === "archive_existing" || value === "delete_existing"
	}

	private isWorkflowEntryArtifactResolution(value: unknown): value is WorkflowEntryArtifactResolution {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		return (
			this.isNonEmptyString(value.artifactId) &&
			this.isWorkflowArtifactFamily(value.artifactFamily) &&
			this.isNonEmptyString(value.artifactIdentity) &&
			this.isNonEmptyString(value.artifactFilename) &&
			this.isNonEmptyString(value.artifactRelativePath) &&
			this.isNonEmptyString(value.artifactAbsolutePath) &&
			typeof value.creationRequired === "boolean" &&
			this.isWorkflowEntryArtifactExistingAction(value.existingArtifactAction)
		)
	}

	private isWorkflowEntryArtifactResolutionArray(value: unknown): value is readonly WorkflowEntryArtifactResolution[] {
		return Array.isArray(value) && value.every((entry) => this.isWorkflowEntryArtifactResolution(entry))
	}

	private isWorkflowEntryArtifactPendingFileOperation(value: unknown): value is WorkflowEntryArtifactPendingFileOperation {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		return (
			this.isNonEmptyString(value.artifactId) &&
			this.isWorkflowArtifactFamily(value.artifactFamily) &&
			this.isNonEmptyString(value.artifactIdentity) &&
			this.isNonEmptyString(value.artifactFilename) &&
			this.isNonEmptyString(value.artifactRelativePath) &&
			this.isNonEmptyString(value.artifactAbsolutePath) &&
			this.isWorkflowEntryArtifactFileOperation(value.operation)
		)
	}

	private isWorkflowEntryArtifactResolutionState(value: unknown): value is WorkflowEntryArtifactResolutionState {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		const pendingFileOperation = value.pendingFileOperation
		return (
			this.isWorkflowEntryArtifactResolutionArray(value.artifactResolutions) &&
			(pendingFileOperation === undefined || this.isWorkflowEntryArtifactPendingFileOperation(pendingFileOperation))
		)
	}

	private isWorkflowBranchFailureState(value: unknown): value is WorkflowBranchFailureState {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		const retryAttemptCount = value.retryAttemptCount
		const terminalErrorMessageIsValid =
			value.terminalErrorMessage === undefined || typeof value.terminalErrorMessage === "string"
		return (
			typeof retryAttemptCount === "number" &&
			Number.isInteger(retryAttemptCount) &&
			retryAttemptCount >= 0 &&
			terminalErrorMessageIsValid
		)
	}

	private isWorkflowBranchTriggerEvent(value: unknown): value is WorkflowBranchTriggerEvent {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		switch (value.kind) {
			case "workflow_progress_request_confirmed":
			case "workflow_progress_request_denied":
			case "attempt_completion_succeeded":
				return true
			case "model_tool_succeeded":
				return this.isClineDefaultTool(value.toolName)
			case "model_tool_failed":
				return (
					this.isClineDefaultTool(value.toolName) &&
					(value.errorMessage === undefined || typeof value.errorMessage === "string")
				)
			case "workflow_form_completed":
				return typeof value.workflowFormId === "string" && value.workflowFormId.trim() !== ""
			case "workflow_values_persisted":
				return this.isStringArray(value.changedKeys)
			case "entry_artifact_resolution_completed":
				return this.isWorkflowEntryArtifactResolutionArray(value.artifactResolutions)
			case "tool_backed_operation_succeeded":
				return this.isWorkflowStepResolutionSourceRoute(value.sourceRoute)
			case "tool_backed_operation_failed":
				return (
					this.isWorkflowStepResolutionSourceRoute(value.sourceRoute) &&
					(value.errorMessage === undefined || typeof value.errorMessage === "string")
				)
			default:
				return false
		}
	}

	private isWorkflowFormSessionDataPlainObject(value: unknown): value is Record<string, unknown> {
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			return false
		}

		const prototype = Object.getPrototypeOf(value)
		return prototype === Object.prototype || prototype === null
	}

	private validateWorkflowFormSessionDataObjectTraversal(
		objectValue: object,
		visitedObjects: Set<object>,
		validateObject: () => boolean,
	): boolean {
		if (visitedObjects.has(objectValue)) {
			return false
		}

		visitedObjects.add(objectValue)
		const objectIsValid = validateObject()
		visitedObjects.delete(objectValue)
		return objectIsValid
	}

	private isWorkflowFormSessionDataSubmittedValuePayload(
		value: unknown,
		visitedObjects: Set<object>,
	): value is WorkflowFormSubmittedValuePayload {
		if (this.isWorkflowFormSessionDataPlainObject(value) === false) {
			return false
		}

		return this.validateWorkflowFormSessionDataObjectTraversal(value, visitedObjects, () => {
			let typedValueCount = 0
			if (value.stringValue !== undefined) {
				typedValueCount += 1
			}
			if (value.booleanValue !== undefined) {
				typedValueCount += 1
			}
			if (value.integerValue !== undefined) {
				typedValueCount += 1
			}
			if (value.numberValue !== undefined) {
				typedValueCount += 1
			}
			if (value.arrayValue !== undefined) {
				typedValueCount += 1
			}
			if (value.objectValue !== undefined) {
				typedValueCount += 1
			}

			if (typedValueCount !== 1) {
				return false
			}

			switch (value.valueType) {
				case "string":
					return typeof value.stringValue === "string"
				case "boolean":
					return typeof value.booleanValue === "boolean"
				case "integer":
					return Number.isInteger(value.integerValue)
				case "number":
					return typeof value.numberValue === "number" && Number.isFinite(value.numberValue)
				case "array": {
					const arrayValue = value.arrayValue
					return (
						Array.isArray(arrayValue) &&
						this.validateWorkflowFormSessionDataObjectTraversal(arrayValue, visitedObjects, () =>
							arrayValue.every((entry) =>
								this.isWorkflowFormSessionDataSubmittedValuePayload(entry, visitedObjects),
							),
						)
					)
				}
				case "object": {
					const objectValue = value.objectValue
					return (
						Array.isArray(objectValue) &&
						this.validateWorkflowFormSessionDataObjectTraversal(objectValue, visitedObjects, () =>
							objectValue.every((entry) => {
								if (this.isWorkflowFormSessionDataPlainObject(entry) === false) {
									return false
								}

								return this.validateWorkflowFormSessionDataObjectTraversal(entry, visitedObjects, () => {
									return (
										typeof entry.key === "string" &&
										entry.key.trim() !== "" &&
										this.isWorkflowFormSessionDataSubmittedValuePayload(entry.value, visitedObjects)
									)
								})
							}),
						)
					)
				}
				default:
					return false
			}
		})
	}

	private isWorkflowFormSessionDataValue(value: unknown, visitedObjects: Set<object>): value is WorkflowFormSessionDataValue {
		if (typeof value === "string" || typeof value === "boolean") {
			return true
		}

		if (typeof value === "number") {
			return Number.isFinite(value)
		}

		if (Array.isArray(value)) {
			return this.validateWorkflowFormSessionDataObjectTraversal(value, visitedObjects, () =>
				value.every((entry) => this.isWorkflowFormSessionDataValue(entry, visitedObjects)),
			)
		}

		if (this.isWorkflowFormSessionDataSubmittedValuePayload(value, visitedObjects)) {
			return true
		}

		if (this.isWorkflowFormSessionDataPlainObject(value) === false) {
			return false
		}

		return this.validateWorkflowFormSessionDataObjectTraversal(value, visitedObjects, () =>
			Object.values(value).every((entry) => this.isWorkflowFormSessionDataValue(entry, visitedObjects)),
		)
	}

	private isWorkflowFormSessionData(value: unknown): value is WorkflowFormSessionData {
		if (this.isWorkflowFormSessionDataPlainObject(value) === false) {
			return false
		}

		const visitedObjects = new Set<object>()
		return this.validateWorkflowFormSessionDataObjectTraversal(value, visitedObjects, () =>
			Object.values(value).every((entry) => this.isWorkflowFormSessionDataValue(entry, visitedObjects)),
		)
	}

	private validateAndNormalizePersistedFormSessionForRestore(args: {
		persistedFormSession: unknown
		definition: WorkflowDefinition
		activeStep: WorkflowStepDefinition
		activeBranchId: string
		projectSelection: WorkflowProjectSelectionState
	}): WorkflowFormSessionState | undefined {
		const { persistedFormSession, definition, activeStep, activeBranchId, projectSelection } = args
		if (this.isPlainRecord(persistedFormSession) === false) {
			return undefined
		}

		const sessionId = persistedFormSession.sessionId
		if (typeof sessionId !== "string" || sessionId.trim() === "") {
			return undefined
		}

		const workflowFormId = persistedFormSession.workflowFormId
		if (typeof workflowFormId !== "string" || workflowFormId.trim() === "") {
			return undefined
		}

		let definitionPayload: WorkflowFormDefinitionPayload
		if (workflowFormId === WORKFLOW_ENTRY_FORM_ID) {
			if (projectSelection.projectTitle !== "" && projectSelection.projectFolderName !== "") {
				return undefined
			}

			definitionPayload = this.buildWorkflowEntryFormDefinition(definition)
		} else {
			const workflowFormDefinitionPayload = definition.workflowForms?.[workflowFormId]
			if (workflowFormDefinitionPayload === undefined) {
				return undefined
			}

			const continuationRoute = this.findContinuationSourceRoute({
				step: activeStep,
				activeBranchId,
				matches: ({ route }) =>
					route.action.kind === "render_workflow_form" && route.action.workflowFormId === workflowFormId,
			})
			if (continuationRoute === undefined) {
				return undefined
			}

			definitionPayload = workflowFormDefinitionPayload
		}

		const currentPanelId = persistedFormSession.currentPanelId
		if (typeof currentPanelId !== "string" || definitionPayload.panels[currentPanelId] === undefined) {
			return undefined
		}

		if (this.isPlainRecord(persistedFormSession.values) === false) {
			return undefined
		}

		const currentFieldKeys = new Set<string>()
		for (const panel of Object.values(definitionPayload.panels)) {
			for (const field of panel.fields) {
				currentFieldKeys.add(field.key)
			}
		}

		const values: WorkflowFormSessionState["values"] = {}
		for (const [key, value] of Object.entries(persistedFormSession.values)) {
			if (currentFieldKeys.has(key) === false) {
				return undefined
			}

			if (isWorkflowFormSubmittedValuePayload(value) === false) {
				return undefined
			}

			values[key] = structuredClone(value)
		}

		if (this.isWorkflowFormSessionData(persistedFormSession.data) === false) {
			return undefined
		}

		const normalizedSession: WorkflowFormSessionState = {
			sessionId,
			workflowFormId,
			definitionVersion: definitionPayload.definitionVersion,
			definitionPayload,
			firstPanelId: definitionPayload.firstPanelId,
			currentPanelId,
			values,
			data: structuredClone(persistedFormSession.data),
		}

		const failure = persistedFormSession.failure
		if (failure !== undefined) {
			if (this.isPlainRecord(failure) === false) {
				return undefined
			}

			const failurePanelId = failure.panelId
			const failureErrorMessage = failure.errorMessage
			if (
				typeof failurePanelId !== "string" ||
				definitionPayload.panels[failurePanelId] === undefined ||
				typeof failureErrorMessage !== "string"
			) {
				return undefined
			}

			normalizedSession.failure = {
				panelId: failurePanelId,
				errorMessage: failureErrorMessage,
			}
		}

		return normalizedSession
	}

	private validateAndNormalizePersistedStepResolutionSessionForRestore(args: {
		persistedStepResolutionSession: unknown
		activeStep: WorkflowStepDefinition
		activeBranchId: string
		activeWorkflowName: string
	}): WorkflowStepResolutionSessionState | undefined {
		const { persistedStepResolutionSession, activeStep, activeBranchId, activeWorkflowName } = args
		if (this.isPlainRecord(persistedStepResolutionSession) === false) {
			return undefined
		}

		if (
			typeof persistedStepResolutionSession.sessionId !== "string" ||
			persistedStepResolutionSession.sessionId.trim() === ""
		) {
			return undefined
		}

		if (this.isWorkflowStepResolutionSourceRoute(persistedStepResolutionSession.sourceRoute) === false) {
			return undefined
		}

		if (persistedStepResolutionSession.triggerSource !== "execute_tool_backed_operation") {
			return undefined
		}

		if (persistedStepResolutionSession.state !== "pending") {
			return undefined
		}

		if (this.isPlainRecord(persistedStepResolutionSession.owner) === false) {
			return undefined
		}

		if (
			persistedStepResolutionSession.owner.kind !== "workflow_step" ||
			persistedStepResolutionSession.owner.workflowName !== activeWorkflowName ||
			persistedStepResolutionSession.owner.stepNumber !== activeStep.stepNumber
		) {
			return undefined
		}

		if (
			persistedStepResolutionSession.lastError !== undefined &&
			typeof persistedStepResolutionSession.lastError !== "string"
		) {
			return undefined
		}

		const sourceRoute = this.getWorkflowDecisionRouteBySource({
			step: activeStep,
			sourceRoute: persistedStepResolutionSession.sourceRoute,
		})
		if (
			sourceRoute === undefined ||
			sourceRoute.action.kind !== "execute_tool_backed_operation" ||
			sourceRoute.followingBranchId !== activeBranchId
		) {
			return undefined
		}

		const normalizedSession: WorkflowStepResolutionSessionState = {
			sessionId: persistedStepResolutionSession.sessionId,
			sourceRoute: {
				branchId: persistedStepResolutionSession.sourceRoute.branchId,
				routeId: persistedStepResolutionSession.sourceRoute.routeId,
			},
			triggerSource: "execute_tool_backed_operation",
			owner: {
				kind: "workflow_step",
				workflowName: activeWorkflowName,
				stepNumber: activeStep.stepNumber,
			},
			state: "pending",
		}

		if (persistedStepResolutionSession.lastError !== undefined) {
			normalizedSession.lastError = persistedStepResolutionSession.lastError
		}

		return normalizedSession
	}

	private isWorkflowBranchTriggerEventCompatibleWithDefinition(
		definition: WorkflowDefinition,
		activeStep: WorkflowStepDefinition,
		session: ActiveWorkflowSession,
		triggerEvent: WorkflowBranchTriggerEvent,
	): boolean {
		switch (triggerEvent.kind) {
			case "workflow_form_completed":
				return definition.workflowForms?.[triggerEvent.workflowFormId] !== undefined
			case "workflow_values_persisted":
				return triggerEvent.changedKeys.every((key) => definition.workflowValueKeys.includes(key))
			case "model_tool_succeeded":
			case "model_tool_failed":
				return this.isToolProjectedByWorkflowStep({
					session,
					step: activeStep,
					toolName: triggerEvent.toolName,
				})
			case "tool_backed_operation_succeeded":
			case "tool_backed_operation_failed": {
				const sourceRoute = this.getWorkflowDecisionRouteBySource({
					step: activeStep,
					sourceRoute: triggerEvent.sourceRoute,
				})
				return (
					sourceRoute !== undefined &&
					(sourceRoute.action.kind === "execute_tool_backed_operation" ||
						sourceRoute.action.kind === "allocate_artifact" ||
						sourceRoute.action.kind === "build_workflow_document")
				)
			}
			default:
				return true
		}
	}

	private validatePersistedWorkflowSessionForRestore(args: {
		persistedSession: unknown
		definition: WorkflowDefinition
		activeWorkflowName: string
	}): PersistedWorkflowSession | undefined {
		const { persistedSession, definition, activeWorkflowName } = args
		if (this.isPlainRecord(persistedSession) === false) {
			return undefined
		}

		const activeStepNumber = persistedSession.activeStepNumber
		if (typeof activeStepNumber !== "number" || Number.isInteger(activeStepNumber) === false) {
			return undefined
		}

		const activeStep = definition.steps[`step-${activeStepNumber}`]
		if (activeStep === undefined) {
			return undefined
		}

		if (this.isRestorableWorkflowValueRecord(persistedSession.workflowValues, definition) === false) {
			return undefined
		}

		if (this.isWorkflowProjectSelectionState(persistedSession.projectSelection) === false) {
			return undefined
		}

		if (this.isWorkflowRuntimeLifecycleState(persistedSession.lifecycle) === false) {
			return undefined
		}

		let entryArtifactResolution: WorkflowEntryArtifactResolutionState | undefined
		if (persistedSession.entryArtifactResolution !== undefined) {
			if (this.isWorkflowEntryArtifactResolutionState(persistedSession.entryArtifactResolution) === false) {
				return undefined
			}

			entryArtifactResolution = structuredClone(persistedSession.entryArtifactResolution)
		}

		if (this.isPlainRecord(persistedSession.branchContext) === false) {
			return undefined
		}

		if (
			typeof persistedSession.branchContext.activeBranchId !== "string" ||
			activeStep.decisionTree.branches[persistedSession.branchContext.activeBranchId] === undefined
		) {
			return undefined
		}

		const branchContext: WorkflowBranchContextState = {
			activeBranchId: persistedSession.branchContext.activeBranchId,
		}
		const compatibilitySession: ActiveWorkflowSession = {
			activeStepNumber,
			workflowValues: persistedSession.workflowValues,
			projectSelection: persistedSession.projectSelection,
			lifecycle: persistedSession.lifecycle,
			entryArtifactResolution,
			ui: {
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionRoutes: [],
			},
			branchContext,
		}

		if (persistedSession.branchContext.lastTriggerEvent !== undefined) {
			if (this.isWorkflowBranchTriggerEvent(persistedSession.branchContext.lastTriggerEvent) === false) {
				return undefined
			}

			if (
				this.isWorkflowBranchTriggerEventCompatibleWithDefinition(
					definition,
					activeStep,
					compatibilitySession,
					persistedSession.branchContext.lastTriggerEvent,
				) === false
			) {
				return undefined
			}

			branchContext.lastTriggerEvent = structuredClone(persistedSession.branchContext.lastTriggerEvent)
		}

		if (persistedSession.branchContext.failureState !== undefined) {
			if (this.isWorkflowBranchFailureState(persistedSession.branchContext.failureState) === false) {
				return undefined
			}

			branchContext.failureState = structuredClone(persistedSession.branchContext.failureState)
		}

		if (this.isPlainRecord(persistedSession.ui) === false) {
			return undefined
		}

		if (this.isStringArray(persistedSession.ui.suppressedWorkflowFormIds) === false) {
			return undefined
		}

		const workflowFormIds = new Set(Object.keys(definition.workflowForms ?? {}))
		if (
			persistedSession.ui.suppressedWorkflowFormIds.some((workflowFormId) => workflowFormIds.has(workflowFormId) === false)
		) {
			return undefined
		}

		if (this.isWorkflowStepResolutionSourceRouteArray(persistedSession.ui.suppressedWorkflowStepResolutionRoutes) === false) {
			return undefined
		}

		if (
			persistedSession.ui.suppressedWorkflowStepResolutionRoutes.some((sourceRoute) => {
				const route = this.getWorkflowDecisionRouteBySource({ step: activeStep, sourceRoute })
				return route === undefined || route.action.kind !== "execute_tool_backed_operation"
			})
		) {
			return undefined
		}

		if (persistedSession.ui.formSession !== undefined && persistedSession.ui.stepResolutionSession !== undefined) {
			return undefined
		}

		let formSession: WorkflowFormSessionState | undefined
		if (persistedSession.ui.formSession !== undefined) {
			formSession = this.validateAndNormalizePersistedFormSessionForRestore({
				persistedFormSession: persistedSession.ui.formSession,
				definition,
				activeStep,
				activeBranchId: branchContext.activeBranchId,
				projectSelection: persistedSession.projectSelection,
			})
			if (formSession === undefined) {
				return undefined
			}
		}

		let stepResolutionSession: WorkflowStepResolutionSessionState | undefined
		if (persistedSession.ui.stepResolutionSession !== undefined) {
			stepResolutionSession = this.validateAndNormalizePersistedStepResolutionSessionForRestore({
				persistedStepResolutionSession: persistedSession.ui.stepResolutionSession,
				activeStep,
				activeBranchId: branchContext.activeBranchId,
				activeWorkflowName,
			})
			if (stepResolutionSession === undefined) {
				return undefined
			}
		}

		return {
			activeStepNumber,
			workflowValues: structuredClone(persistedSession.workflowValues),
			projectSelection: {
				projectMode: persistedSession.projectSelection.projectMode,
				projectTitle: persistedSession.projectSelection.projectTitle,
				projectFolderName: persistedSession.projectSelection.projectFolderName,
			},
			lifecycle: {
				projectSelectionCompleted: persistedSession.lifecycle.projectSelectionCompleted,
			},
			entryArtifactResolution,
			ui: {
				formSession,
				stepResolutionSession,
				suppressedWorkflowFormIds: [...persistedSession.ui.suppressedWorkflowFormIds],
				suppressedWorkflowStepResolutionRoutes: persistedSession.ui.suppressedWorkflowStepResolutionRoutes.map(
					(sourceRoute) => ({
						branchId: sourceRoute.branchId,
						routeId: sourceRoute.routeId,
					}),
				),
			},
			branchContext,
		}
	}

	getPersistedSession(args: { taskState: TaskState }): PersistedWorkflowSession | undefined {
		return args.taskState.activeWorkflowSession ? this.cloneWorkflowSession(args.taskState.activeWorkflowSession) : undefined
	}

	async restorePersistedSession(args: {
		taskState: TaskState
		persistedSession?: PersistedWorkflowSession
	}): Promise<WorkflowNextAction | undefined> {
		const { taskState, persistedSession } = args
		if (!persistedSession) {
			return undefined
		}

		const activeWorkflowName = taskState.activeWorkflowName
		if (activeWorkflowName === undefined) {
			return await this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		const definition = resolveWorkflowDefinition(activeWorkflowName)
		if (!definition) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		const validationResult = this.validateWorkflowDefinition(definition)
		if (!validationResult.valid) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		const validatedPersistedSession = this.validatePersistedWorkflowSessionForRestore({
			persistedSession,
			definition,
			activeWorkflowName,
		})
		if (validatedPersistedSession === undefined) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		taskState.activeWorkflowSession = this.cloneWorkflowSession(validatedPersistedSession)
		this.refreshCurrentFocusChainChecklist(taskState)

		return this.resolveNextAction({ taskState })
	}

	async teardownWorkflow(args: { taskState: TaskState }): Promise<void> {
		const { taskState } = args
		taskState.activeWorkflowName = undefined
		taskState.activeWorkflowSession = undefined
		taskState.currentFocusChainChecklist = null
	}

	async handleAttemptCompletionSucceeded(args: { taskState: TaskState }): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (session === undefined) {
			return { kind: "no_op" }
		}

		session.branchContext.lastTriggerEvent = {
			kind: "attempt_completion_succeeded",
		}
		session.ui.stepResolutionSession = undefined

		return this.resolveNextAction({ taskState: args.taskState })
	}

	private async teardownWorkflowAndRequirePersistence(args: { taskState: TaskState }): Promise<WorkflowNextAction> {
		await this.teardownWorkflow({ taskState: args.taskState })
		return { kind: "persist_workflow_teardown" }
	}

	private getActiveWorkflowDefinition(taskState: TaskState): WorkflowDefinition | undefined {
		return taskState.activeWorkflowName ? resolveWorkflowDefinition(taskState.activeWorkflowName) : undefined
	}

	private getActiveStepDefinition(
		definition: WorkflowDefinition,
		session: Pick<ActiveWorkflowSession, "activeStepNumber">,
	): WorkflowStepDefinition | undefined {
		return definition.steps[`step-${session.activeStepNumber}`]
	}

	private getFirstStepNumber(workflow: WorkflowDefinition): number | undefined {
		return Object.values(workflow.steps)
			.sort((left, right) => left.stepNumber - right.stepNumber)
			.at(0)?.stepNumber
	}

	private createInitialBranchContext(step: WorkflowStepDefinition): WorkflowBranchContextState {
		return {
			activeBranchId: step.decisionTree.entryBranchId,
		}
	}

	private buildWorkflowFormSubmittedValueComparableValue(value: WorkflowFormSubmittedValuePayload | undefined): unknown {
		if (!value) {
			return undefined
		}

		switch (value.valueType) {
			case "string":
				return value.stringValue
			case "boolean":
				return value.booleanValue
			case "integer":
				return value.integerValue
			case "number":
				return value.numberValue
			case "array":
				return (value.arrayValue ?? []).map((entry) => this.buildWorkflowFormSubmittedValueComparableValue(entry))
			case "object":
				return Object.fromEntries(
					(value.objectValue ?? []).map((entry) => [
						entry.key,
						this.buildWorkflowFormSubmittedValueComparableValue(entry.value),
					]),
				)
		}
	}

	private isWorkflowFormSubmittedValuePayload(value: unknown): value is WorkflowFormSubmittedValuePayload {
		return value !== null && typeof value === "object" && !Array.isArray(value) && "valueType" in value
	}

	private isWorkflowFormComparableValue(value: unknown): value is string | boolean | number {
		return typeof value === "string" || typeof value === "boolean" || typeof value === "number"
	}

	private convertWorkflowFormSubmittedValueToWorkflowValue(
		value: WorkflowFormSubmittedValuePayload | undefined,
	): { ok: true; value: WorkflowValue } | { ok: false; errorMessage: string } {
		if (!value) {
			return {
				ok: false,
				errorMessage: "Malformed workflow form submitted value: missing submitted value.",
			}
		}

		switch (value.valueType) {
			case "string":
				if (value.stringValue === undefined) {
					return {
						ok: false,
						errorMessage: "Malformed workflow form submitted value: string value is missing.",
					}
				}
				return { ok: true, value: value.stringValue }
			case "boolean":
				if (value.booleanValue === undefined) {
					return {
						ok: false,
						errorMessage: "Malformed workflow form submitted value: boolean value is missing.",
					}
				}
				return { ok: true, value: value.booleanValue }
			case "integer":
				if (value.integerValue === undefined || !Number.isInteger(value.integerValue)) {
					return {
						ok: false,
						errorMessage: "Malformed workflow form submitted value: integer value is missing or invalid.",
					}
				}
				return { ok: true, value: value.integerValue }
			case "number":
				if (value.numberValue === undefined || !Number.isFinite(value.numberValue)) {
					return {
						ok: false,
						errorMessage: "Malformed workflow form submitted value: number value is missing or invalid.",
					}
				}
				return { ok: true, value: value.numberValue }
			case "array": {
				if (value.arrayValue === undefined) {
					return {
						ok: false,
						errorMessage: "Malformed workflow form submitted value: array value is missing.",
					}
				}

				const arrayValue: WorkflowValue[] = []
				for (const entry of value.arrayValue) {
					const convertedEntry = this.convertWorkflowFormSubmittedValueToWorkflowValue(entry)
					if (!convertedEntry.ok) {
						return convertedEntry
					}
					arrayValue.push(convertedEntry.value)
				}

				return { ok: true, value: arrayValue }
			}
			case "object": {
				if (value.objectValue === undefined) {
					return {
						ok: false,
						errorMessage: "Malformed workflow form submitted value: object value is missing.",
					}
				}

				const objectValue: { [key: string]: WorkflowValue } = {}
				for (const entry of value.objectValue) {
					if (entry.key.trim() === "") {
						return {
							ok: false,
							errorMessage: "Malformed workflow form submitted value: object entry key is empty.",
						}
					}

					const convertedEntry = this.convertWorkflowFormSubmittedValueToWorkflowValue(entry.value)
					if (!convertedEntry.ok) {
						return convertedEntry
					}
					objectValue[entry.key] = convertedEntry.value
				}

				return { ok: true, value: objectValue }
			}
			default:
				return {
					ok: false,
					errorMessage: `Unsupported workflow form submitted value type: ${String(value.valueType)}.`,
				}
		}
	}

	private collectWorkflowValueMutationsFromFormOutcome(
		formSession: Pick<WorkflowFormSessionState, "definitionPayload" | "values">,
		valueChanges: WorkflowFormRuntimeValueChanges,
	): { values: WorkflowValues; clearKeys: readonly string[] } {
		const values: WorkflowValues = {}
		const clearKeys: string[] = []
		const workflowValueKeyByFieldKey: Record<string, string> = {}

		for (const panel of Object.values(formSession.definitionPayload.panels)) {
			for (const field of panel.fields) {
				if (field.workflowValueKey === undefined) {
					continue
				}

				workflowValueKeyByFieldKey[field.key] = field.workflowValueKey
			}
		}

		for (const [fieldKey, submittedValue] of Object.entries(formSession.values)) {
			const workflowValueKey = workflowValueKeyByFieldKey[fieldKey]
			if (workflowValueKey === undefined) {
				continue
			}

			const conversion = this.convertWorkflowFormSubmittedValueToWorkflowValue(submittedValue)
			if (!conversion.ok) {
				throw new Error(conversion.errorMessage)
			}

			values[workflowValueKey] = conversion.value
		}

		const seenClearKeys = new Set<string>()
		for (const clearedValueKey of valueChanges.clearedValueKeys) {
			const workflowValueKey = workflowValueKeyByFieldKey[clearedValueKey]
			if (workflowValueKey === undefined || seenClearKeys.has(workflowValueKey)) {
				continue
			}

			seenClearKeys.add(workflowValueKey)
			clearKeys.push(workflowValueKey)
		}

		return {
			values,
			clearKeys: clearKeys.filter((workflowValueKey) => values[workflowValueKey] === undefined),
		}
	}

	private async persistWorkflowFormValues(args: {
		taskState: TaskState
		formSession: WorkflowFormSessionState
		valueChanges: WorkflowFormRuntimeValueChanges
	}): Promise<void> {
		const workflowValueMutations = this.collectWorkflowValueMutationsFromFormOutcome(args.formSession, args.valueChanges)
		if (Object.keys(workflowValueMutations.values).length === 0 && workflowValueMutations.clearKeys.length === 0) {
			return
		}

		await this.applyWorkflowValueWrites({
			taskState: args.taskState,
			values: workflowValueMutations.values,
			clearKeys: workflowValueMutations.clearKeys,
		})
	}

	private isWorkflowEntryFormSession(formSession: Pick<WorkflowFormSessionState, "workflowFormId">): boolean {
		return formSession.workflowFormId === WORKFLOW_ENTRY_FORM_ID
	}

	private isWorkflowPrerequisiteFormSession(formSession: Pick<WorkflowFormSessionState, "workflowFormId">): boolean {
		return formSession.workflowFormId === WORKFLOW_PREREQUISITE_FORM_ID
	}

	private buildWorkflowEntryTitle(workflowName: string): string {
		const transformedName = workflowName
			.split("-")
			.map((token) => token.charAt(0).toUpperCase() + token.slice(1))
			.join(" ")

		return `Welcome to the ${transformedName} Workflow!`
	}

	private buildWorkflowEntryModeVisibilityCondition(
		projectMode: WorkflowProjectSelectionState["projectMode"],
	): WorkflowFormConditionDefinition {
		return {
			sourceKey: WORKFLOW_ENTRY_PROJECT_MODE_FIELD_KEY,
			operator: "equals",
			value: projectMode,
		}
	}

	private buildWorkflowEntryFormDefinition(workflow: WorkflowDefinition): WorkflowFormDefinitionPayload {
		return {
			definitionVersion: 1,
			title: this.buildWorkflowEntryTitle(workflow.name),
			toolDictionaryTitle: "",
			toolDictionaryMarkdown: "",
			firstPanelId: WORKFLOW_ENTRY_INFO_PANEL_ID,
			panels: {
				[WORKFLOW_ENTRY_INFO_PANEL_ID]: {
					panelId: WORKFLOW_ENTRY_INFO_PANEL_ID,
					title: "Workflow Overview",
					promptMarkdown: workflow.entryPanel.promptMarkdown,
					fields: [],
					allowedActions: ["submit"],
					actionLabels: {
						submit: "Continue",
					},
					transition: {
						type: "sequential",
						nextPanelId: WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID,
					},
				},
				[WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID]: {
					panelId: WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID,
					title: "Project Selection",
					promptMarkdown: "Choose whether to start a new project or continue with an existing project.",
					fields: [
						{
							key: WORKFLOW_ENTRY_PROJECT_MODE_FIELD_KEY,
							kind: "radio_group",
							label: "Project mode",
							helpText: "Select how this workflow should resolve its active project.",
							required: true,
							options: [
								{
									value: "new",
									label: "New Project",
								},
								{
									value: "existing",
									label: "Existing Project",
								},
							],
						},
						{
							key: WORKFLOW_ENTRY_EXISTING_PROJECT_FIELD_KEY,
							kind: "dropdown",
							label: "Existing project",
							helpText: "Select an existing project output folder.",
							required: true,
							visibilityCondition: this.buildWorkflowEntryModeVisibilityCondition("existing"),
							selectorDiscovery: {
								root: {
									kind: "project_output_root",
								},
								entryType: "directory",
								immediateChildrenOnly: true,
								sort: "alpha_asc",
							},
						},
						{
							key: WORKFLOW_ENTRY_NEW_PROJECT_TITLE_FIELD_KEY,
							kind: "small_text",
							label: "Project title",
							helpText: "Provide the human-facing title for the new project.",
							required: true,
							placeholder: "Enter a project title",
							visibilityCondition: this.buildWorkflowEntryModeVisibilityCondition("new"),
						},
					],
					allowedActions: ["submit", "back"],
					actionLabels: {
						submit: "Start Workflow",
						back: "Back",
					},
					transition: {
						type: "sequential",
						nextPanelId: WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID,
					},
				},
			},
		}
	}

	private async buildWorkflowEntryFormNextAction(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const definitionPayload = this.buildWorkflowEntryFormDefinition(args.workflow)
		const existingFormSession = session.ui.formSession
		const formSession =
			existingFormSession && this.isWorkflowEntryFormSession(existingFormSession)
				? {
						...existingFormSession,
						definitionPayload,
						firstPanelId: definitionPayload.firstPanelId,
					}
				: this.workflowFormRuntime.createSession({
						workflowFormId: WORKFLOW_ENTRY_FORM_ID,
						definitionPayload,
					})

		session.ui.formSession = formSession

		const payload = await this.buildWorkflowFormRenderPayload({
			taskState: args.taskState,
			workflow: args.workflow,
			session: formSession,
		})

		return {
			kind: "render_workflow_form",
			formSession,
			payload,
		}
	}

	private async buildWorkflowEntryProjectSelectionFormNextAction(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const definitionPayload = this.buildWorkflowEntryFormDefinition(args.workflow)
		const formSession = this.workflowFormRuntime.createSession({
			workflowFormId: WORKFLOW_ENTRY_FORM_ID,
			definitionPayload,
			startPanelId: WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID,
		})
		session.ui.formSession = formSession

		return {
			kind: "render_workflow_form",
			formSession,
			payload: await this.buildWorkflowFormRenderPayload({
				taskState: args.taskState,
				workflow: args.workflow,
				session: formSession,
			}),
		}
	}

	private readWorkflowEntryFormStringValue(
		formSession: Pick<WorkflowFormSessionState, "values">,
		key: string,
	): string | undefined {
		const submittedValue = formSession.values[key]
		if (!submittedValue || submittedValue.valueType !== "string") {
			return undefined
		}

		return submittedValue.stringValue?.trim()
	}

	private readWorkflowEntryArtifactFormDataStringValue(
		formSession: Pick<WorkflowFormSessionState, "data">,
		key: string,
	): string | undefined {
		const value = formSession.data[key]
		return typeof value === "string" && value.trim() !== "" ? value : undefined
	}

	private async resolveWorkflowEntryArtifactOutputFromFormSession(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		formSession: WorkflowFormSessionState
	}): Promise<WorkflowArtifactAllocationOutput | undefined> {
		const artifactId = this.readWorkflowEntryArtifactFormDataStringValue(args.formSession, "artifactId")
		const expectedArtifactAbsolutePath = this.readWorkflowEntryArtifactFormDataStringValue(
			args.formSession,
			"artifactAbsolutePath",
		)
		if (artifactId === undefined || expectedArtifactAbsolutePath === undefined) {
			return undefined
		}

		const artifactDefinition = args.workflow.artifacts?.[artifactId]
		if (artifactDefinition === undefined || artifactDefinition.id !== artifactId) {
			return undefined
		}

		const artifactOutput = await this.resolveWorkflowArtifactAllocation({
			workflow: args.workflow,
			session: args.session,
			artifactDefinition,
		})
		return artifactOutput.artifactAbsolutePath === expectedArtifactAbsolutePath ? artifactOutput : undefined
	}

	private async continueWorkflowEntryExistingArtifact(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		formSession: WorkflowFormSessionState
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const artifactOutput = await this.resolveWorkflowEntryArtifactOutputFromFormSession({
			workflow: args.workflow,
			session,
			formSession: args.formSession,
		})
		if (artifactOutput === undefined) {
			return this.buildTerminalErrorNextAction({
				taskState: args.taskState,
				errorMessage: "Workflow entry artifact resolution could not restore the selected existing artifact.",
			})
		}

		await this.applyWorkflowValueWrites({
			taskState: args.taskState,
			values: artifactOutput.workflowValueWrites,
		})

		const artifactResolutions = [
			...(session.entryArtifactResolution?.artifactResolutions ?? []),
			this.buildWorkflowEntryArtifactResolution({
				artifactOutput,
				creationRequired: false,
				existingArtifactAction: "continue_existing",
			}),
		]

		return this.continueWorkflowEntryArtifactResolution({
			taskState: args.taskState,
			workflow: args.workflow,
			artifactResolutions,
		})
	}

	private async cancelWorkflowEntryArtifactReplacement(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		session.entryArtifactResolution = undefined
		session.branchContext.lastTriggerEvent = undefined
		session.projectSelection = {
			projectMode: "new",
			projectTitle: "",
			projectFolderName: "",
		}
		session.lifecycle.projectSelectionCompleted = false
		return this.buildWorkflowEntryProjectSelectionFormNextAction({
			taskState: args.taskState,
			workflow: args.workflow,
		})
	}

	private async startWorkflowEntryArtifactFileOperation(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		formSession: WorkflowFormSessionState
		operation: WorkflowEntryArtifactFileOperation
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const artifactOutput = await this.resolveWorkflowEntryArtifactOutputFromFormSession({
			workflow: args.workflow,
			session,
			formSession: args.formSession,
		})
		if (artifactOutput === undefined) {
			return this.buildTerminalErrorNextAction({
				taskState: args.taskState,
				errorMessage: "Workflow entry artifact file operation could not restore the selected existing artifact.",
			})
		}

		session.entryArtifactResolution = {
			artifactResolutions: structuredClone(session.entryArtifactResolution?.artifactResolutions ?? []),
			pendingFileOperation: this.buildWorkflowEntryArtifactPendingFileOperation({
				artifactOutput,
				operation: args.operation,
			}),
		}
		session.ui.formSession = undefined

		return {
			kind: "execute_tool_backed_operation",
			runtimeOwnedSourceRoute: undefined,
			toolRequest: {
				toolName:
					args.operation === "archive_existing"
						? ClineDefaultTool.ARCHIVE_WORKFLOW_ARTIFACT
						: ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT,
				toolInput: {},
				toolParams: {
					artifact_id: artifactOutput.artifactId,
				},
			},
		}
	}

	private doesWorkflowEntryProjectSelectionSubmitContainSelectionValue(request: WorkflowFormSubmissionRequest): boolean {
		const projectMode = request.fields
			.find((field) => field.key === WORKFLOW_ENTRY_PROJECT_MODE_FIELD_KEY)
			?.value?.stringValue?.trim()

		if (projectMode === "new") {
			return request.fields.some((field) => field.key === WORKFLOW_ENTRY_NEW_PROJECT_TITLE_FIELD_KEY)
		}

		if (projectMode === "existing") {
			return request.fields.some((field) => field.key === WORKFLOW_ENTRY_EXISTING_PROJECT_FIELD_KEY)
		}

		return false
	}

	private async resolveWorkflowEntryProjectSelection(args: { formSession: Pick<WorkflowFormSessionState, "values"> }): Promise<
		| {
				projectSelection: WorkflowProjectSelectionState
		  }
		| {
				errorMessage: string
		  }
	> {
		const projectMode = this.readWorkflowEntryFormStringValue(args.formSession, WORKFLOW_ENTRY_PROJECT_MODE_FIELD_KEY)
		if (projectMode === "existing") {
			const selectedExistingProject = this.readWorkflowEntryFormStringValue(
				args.formSession,
				WORKFLOW_ENTRY_EXISTING_PROJECT_FIELD_KEY,
			)
			if (!selectedExistingProject) {
				return {
					errorMessage: "Select an existing project before continuing.",
				}
			}

			const existingProjectOptions = await discoverWorkflowCandidates({
				rootDirectory: this.resolveWorkflowProjectOutputRoot(),
				workspacePathPolicy: this.workspacePathPolicy,
				entryType: "directory",
				immediateChildrenOnly: true,
				sort: "alpha_asc",
				buildLabel: (entryName) => entryName,
			})
			if (!existingProjectOptions.some((option) => option.value === selectedExistingProject)) {
				return {
					errorMessage: "Select an existing project from the discovered project list.",
				}
			}

			return {
				projectSelection: {
					projectMode: "existing",
					projectTitle: selectedExistingProject,
					projectFolderName: selectedExistingProject,
				},
			}
		}

		if (projectMode === "new") {
			const projectTitle = this.readWorkflowEntryFormStringValue(
				args.formSession,
				WORKFLOW_ENTRY_NEW_PROJECT_TITLE_FIELD_KEY,
			)
			if (!projectTitle) {
				return {
					errorMessage: "Provide a project title before continuing.",
				}
			}

			const projectFolderName = this.normalizeProjectFolderName(projectTitle)
			if (projectFolderName === "") {
				return {
					errorMessage: "Provide a project title that can be normalized into a folder name.",
				}
			}

			return {
				projectSelection: {
					projectMode: "new",
					projectTitle,
					projectFolderName,
				},
			}
		}

		return {
			errorMessage: "Select a project mode before continuing.",
		}
	}

	private async handleWorkflowEntryFormOutcome(args: {
		taskState: TaskState
		request: WorkflowFormSubmissionRequest
		outcome: WorkflowFormRuntimeOutcome
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		switch (args.outcome.kind) {
			case "render_form":
			case "complete_success": {
				if (
					args.request.action === WorkflowFormAction.SUBMIT &&
					args.request.panelId === WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID &&
					!args.outcome.session.failure
				) {
					if (!this.doesWorkflowEntryProjectSelectionSubmitContainSelectionValue(args.request)) {
						session.ui.formSession = args.outcome.session
						return this.resolveNextAction({ taskState: args.taskState })
					}

					const selectionResult = await this.resolveWorkflowEntryProjectSelection({
						formSession: args.outcome.session,
					})
					if ("errorMessage" in selectionResult) {
						session.ui.formSession = {
							...args.outcome.session,
							failure: {
								panelId: WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID,
								errorMessage: selectionResult.errorMessage,
							},
						}
						return this.resolveNextAction({ taskState: args.taskState })
					}

					const workflow = this.getActiveWorkflowDefinition(args.taskState)
					if (!workflow) {
						return this.teardownWorkflowAndRequirePersistence({ taskState: args.taskState })
					}

					session.projectSelection = selectionResult.projectSelection
					session.ui.formSession = undefined
					await this.applyWorkflowValueWrites({
						taskState: args.taskState,
						values: {
							[workflow.entryProjectValueKeys.projectMode]: selectionResult.projectSelection.projectMode,
							[workflow.entryProjectValueKeys.projectTitle]: selectionResult.projectSelection.projectTitle,
							[workflow.entryProjectValueKeys.projectFolderName]:
								selectionResult.projectSelection.projectFolderName,
						},
					})
					await this.ensureProjectFoldersExist(session)
					this.recordWorkflowProjectSelectionCompleted(session)
					if (selectionResult.projectSelection.projectMode === "existing") {
						return this.continueWorkflowEntryArtifactResolution({
							taskState: args.taskState,
							workflow,
							artifactResolutions: [],
						})
					}
					return this.completeWorkflowEntryArtifactResolution({
						taskState: args.taskState,
						artifactResolutions: await this.resolveNewProjectWorkflowEntryArtifactResolutions({
							taskState: args.taskState,
						}),
					})
				}

				if (
					args.request.action === WorkflowFormAction.SUBMIT &&
					args.request.panelId === WORKFLOW_ENTRY_ARTIFACT_CONFLICT_PANEL_ID
				) {
					const workflow = this.getActiveWorkflowDefinition(args.taskState)
					if (!workflow) {
						return this.teardownWorkflowAndRequirePersistence({ taskState: args.taskState })
					}

					if (args.outcome.session.failure !== undefined) {
						session.ui.formSession = args.outcome.session
						return {
							kind: "render_workflow_form",
							formSession: args.outcome.session,
							payload: await this.buildWorkflowFormRenderPayload({
								taskState: args.taskState,
								workflow,
								session: args.outcome.session,
							}),
						}
					}

					const selectedAction = this.readWorkflowEntryFormStringValue(
						args.outcome.session,
						WORKFLOW_ENTRY_ARTIFACT_CONFLICT_ACTION_FIELD_KEY,
					)
					if (selectedAction === WORKFLOW_ENTRY_ARTIFACT_CONFLICT_CONTINUE_VALUE) {
						session.ui.formSession = undefined
						return this.continueWorkflowEntryExistingArtifact({
							taskState: args.taskState,
							workflow,
							formSession: args.outcome.session,
						})
					}

					if (selectedAction === WORKFLOW_ENTRY_ARTIFACT_CONFLICT_REPLACE_VALUE) {
						return this.buildWorkflowEntryArtifactReplacementFormNextAction({
							taskState: args.taskState,
							workflow,
							formSession: args.outcome.session,
						})
					}
				}

				if (
					args.request.action === WorkflowFormAction.SUBMIT &&
					args.request.panelId === WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_PANEL_ID
				) {
					const workflow = this.getActiveWorkflowDefinition(args.taskState)
					if (!workflow) {
						return this.teardownWorkflowAndRequirePersistence({ taskState: args.taskState })
					}

					if (args.outcome.session.failure !== undefined) {
						session.ui.formSession = args.outcome.session
						return {
							kind: "render_workflow_form",
							formSession: args.outcome.session,
							payload: await this.buildWorkflowFormRenderPayload({
								taskState: args.taskState,
								workflow,
								session: args.outcome.session,
							}),
						}
					}

					const selectedAction = this.readWorkflowEntryFormStringValue(
						args.outcome.session,
						WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_ACTION_FIELD_KEY,
					)
					if (selectedAction === WORKFLOW_ENTRY_ARTIFACT_REPLACEMENT_CANCEL_VALUE) {
						return this.cancelWorkflowEntryArtifactReplacement({
							taskState: args.taskState,
							workflow,
						})
					}

					if (this.isWorkflowEntryArtifactFileOperation(selectedAction)) {
						return this.startWorkflowEntryArtifactFileOperation({
							taskState: args.taskState,
							workflow,
							formSession: args.outcome.session,
							operation: selectedAction,
						})
					}
				}

				session.ui.formSession = args.outcome.session
				return this.resolveNextAction({ taskState: args.taskState })
			}
		}
	}

	private readWorkflowFormDataStringValue(
		formSession: Pick<WorkflowFormSessionState, "data">,
		key: string,
	): string | undefined {
		const value = formSession.data[key]
		return typeof value === "string" && value.trim() !== "" ? value : undefined
	}

	private readWorkflowPrerequisiteSkippedIds(
		formSession: Pick<WorkflowFormSessionState, "data">,
	): { valid: true; skippedPrerequisiteIds: readonly string[] } | { valid: false } {
		const value = formSession.data[WORKFLOW_PREREQUISITE_SKIPPED_IDS_DATA_KEY]
		if (value === undefined) {
			return { valid: true, skippedPrerequisiteIds: [] }
		}
		if (!Array.isArray(value) || value.some((skippedPrerequisiteId) => typeof skippedPrerequisiteId !== "string")) {
			return { valid: false }
		}

		return { valid: true, skippedPrerequisiteIds: value }
	}

	private appendWorkflowPrerequisiteSkippedId(args: {
		skippedPrerequisiteIds: readonly string[]
		prerequisiteId: string
	}): string[] {
		if (args.skippedPrerequisiteIds.includes(args.prerequisiteId)) {
			return [...args.skippedPrerequisiteIds]
		}

		return [...args.skippedPrerequisiteIds, args.prerequisiteId]
	}

	private readWorkflowFormSubmittedStringValue(
		formSession: Pick<WorkflowFormSessionState, "values">,
		key: string,
	): string | undefined {
		const value = formSession.values[key]
		if (value === undefined || value.valueType !== "string") {
			return undefined
		}

		const stringValue = value.stringValue ?? ""
		return stringValue.trim() === "" ? undefined : stringValue
	}

	private readWorkflowFormSubmittedBooleanValue(
		formSession: Pick<WorkflowFormSessionState, "values">,
		key: string,
	): boolean | undefined {
		const value = formSession.values[key]
		return value?.valueType === "boolean" ? value.booleanValue : undefined
	}

	private resolveWorkflowPrerequisiteFromFormSession(args: {
		definition: WorkflowDefinition
		formSession: Pick<WorkflowFormSessionState, "data">
	}): WorkflowPrerequisiteFileDefinition | undefined {
		const prerequisiteId = this.readWorkflowFormDataStringValue(args.formSession, WORKFLOW_PREREQUISITE_ID_DATA_KEY)
		return prerequisiteId === undefined ? undefined : args.definition.prerequisiteFiles?.[prerequisiteId]
	}

	private resolveSelectedPrerequisitePathFromFormSession(
		formSession: Pick<WorkflowFormSessionState, "currentPanelId" | "values" | "data">,
	): string | undefined {
		if (
			formSession.currentPanelId === "required-prerequisite-single-match" ||
			formSession.currentPanelId === "optional-prerequisite-single-match"
		) {
			const confirmed = this.readWorkflowFormSubmittedBooleanValue(
				formSession,
				WORKFLOW_PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY,
			)
			return confirmed === true
				? this.readWorkflowFormDataStringValue(formSession, WORKFLOW_PREREQUISITE_SINGLE_MATCH_PATH_DATA_KEY)
				: undefined
		}

		return this.readWorkflowFormSubmittedStringValue(formSession, WORKFLOW_PREREQUISITE_SELECTED_FILE_FIELD_KEY)
	}

	private async renderWorkflowPrerequisiteFormSession(args: {
		taskState: TaskState
		definition: WorkflowDefinition
		formSession: WorkflowFormSessionState
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		session.ui.formSession = args.formSession
		return {
			kind: "render_workflow_form",
			formSession: args.formSession,
			payload: await this.buildWorkflowFormRenderPayload({
				taskState: args.taskState,
				workflow: args.definition,
				session: args.formSession,
			}),
		}
	}

	private async continueWorkflowPrerequisiteResolution(args: {
		taskState: TaskState
		definition: WorkflowDefinition
		action: Extract<WorkflowDecisionAction, { kind: "resolve_prerequisite_files" }>
		skippedPrerequisiteIds?: readonly string[]
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		session.ui.formSession = undefined
		return this.buildResolvePrerequisiteFilesNextAction({
			taskState: args.taskState,
			definition: args.definition,
			action: args.action,
			skippedPrerequisiteIds: args.skippedPrerequisiteIds,
		})
	}

	private async handleWorkflowPrerequisiteNoSelection(args: {
		taskState: TaskState
		definition: WorkflowDefinition
		action: Extract<WorkflowDecisionAction, { kind: "resolve_prerequisite_files" }>
		prerequisite: WorkflowPrerequisiteFileDefinition
		skippedPrerequisiteIds: readonly string[]
	}): Promise<WorkflowNextAction> {
		if (args.prerequisite.requirement === "required") {
			return this.buildPrerequisiteFormNextAction({
				taskState: args.taskState,
				definition: args.definition,
				prerequisite: args.prerequisite,
				panel: this.buildRequiredPrerequisiteCannotContinuePanel(args.prerequisite),
				skippedPrerequisiteIds: args.skippedPrerequisiteIds,
			})
		}

		return this.continueWorkflowPrerequisiteResolution({
			taskState: args.taskState,
			definition: args.definition,
			action: args.action,
			skippedPrerequisiteIds: this.appendWorkflowPrerequisiteSkippedId({
				skippedPrerequisiteIds: args.skippedPrerequisiteIds,
				prerequisiteId: args.prerequisite.id,
			}),
		})
	}

	private async handleWorkflowPrerequisiteFormOutcome(args: {
		taskState: TaskState
		request: WorkflowFormSubmissionRequest
		outcome: WorkflowFormRuntimeOutcome
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const definition = this.getActiveWorkflowDefinition(args.taskState)
		const activeStep = definition ? this.getActiveStepDefinition(definition, session) : undefined
		const continuationRoute = activeStep
			? this.findContinuationSourceRoute({
					step: activeStep,
					activeBranchId: session.branchContext.activeBranchId,
					matches: ({ route }) => route.action.kind === "resolve_prerequisite_files",
				})
			: undefined

		if (
			definition === undefined ||
			continuationRoute === undefined ||
			continuationRoute.route.action.kind !== "resolve_prerequisite_files"
		) {
			return { kind: "no_op" }
		}

		const prerequisite = this.resolveWorkflowPrerequisiteFromFormSession({
			definition,
			formSession: args.outcome.session,
		})
		if (prerequisite === undefined) {
			return { kind: "no_op" }
		}

		const skippedPrerequisiteIdsResult = this.readWorkflowPrerequisiteSkippedIds(args.outcome.session)
		if (!skippedPrerequisiteIdsResult.valid) {
			return { kind: "no_op" }
		}
		const skippedPrerequisiteIds = skippedPrerequisiteIdsResult.skippedPrerequisiteIds

		if (args.outcome.session.currentPanelId === WORKFLOW_PREREQUISITE_CANNOT_CONTINUE_PANEL_ID) {
			return this.renderWorkflowPrerequisiteFormSession({
				taskState: args.taskState,
				definition,
				formSession: args.outcome.session,
			})
		}

		if (args.request.action === WorkflowFormAction.CANCEL) {
			return this.handleWorkflowPrerequisiteNoSelection({
				taskState: args.taskState,
				definition,
				action: continuationRoute.route.action,
				prerequisite,
				skippedPrerequisiteIds,
			})
		}

		if (args.outcome.kind === "render_form") {
			return this.renderWorkflowPrerequisiteFormSession({
				taskState: args.taskState,
				definition,
				formSession: args.outcome.session,
			})
		}

		const selectedPrerequisitePath = this.resolveSelectedPrerequisitePathFromFormSession(args.outcome.session)
		if (selectedPrerequisitePath === undefined) {
			return this.handleWorkflowPrerequisiteNoSelection({
				taskState: args.taskState,
				definition,
				action: continuationRoute.route.action,
				prerequisite,
				skippedPrerequisiteIds,
			})
		}

		await this.applyWorkflowValueWrites({
			taskState: args.taskState,
			values: {
				[prerequisite.workflowValueKey]: selectedPrerequisitePath,
			},
		})
		return this.continueWorkflowPrerequisiteResolution({
			taskState: args.taskState,
			definition,
			action: continuationRoute.route.action,
			skippedPrerequisiteIds,
		})
	}

	private resolveWorkflowFormComparableSourceValue(
		session: Pick<WorkflowFormSessionState, "values" | "data">,
		sourceKey: string,
	): unknown {
		if (sourceKey in session.values) {
			return this.buildWorkflowFormSubmittedValueComparableValue(session.values[sourceKey])
		}

		if (sourceKey in session.data) {
			const value = session.data[sourceKey]
			if (this.isWorkflowFormSubmittedValuePayload(value)) {
				return this.buildWorkflowFormSubmittedValueComparableValue(value)
			}

			return value
		}

		const pathSegments = sourceKey.split(".")
		let current: unknown = session.data
		for (const pathSegment of pathSegments) {
			if (
				current === null ||
				current === undefined ||
				typeof current !== "object" ||
				Array.isArray(current) ||
				!(pathSegment in current)
			) {
				return undefined
			}

			const matchingEntry = Object.entries(current).find(([entryKey]) => entryKey === pathSegment)
			current = matchingEntry?.[1]
		}

		return current
	}

	private resolveWorkflowFormTextPlaceholderValue(args: {
		source: string
		workflowSession: ActiveWorkflowSession
		formSession: WorkflowFormSessionState
	}): { source: "workflow"; value: WorkflowValue } | { source: "data"; value: WorkflowFormSessionDataValue } | undefined {
		const workflowPrefix = "workflow."
		const dataPrefix = "data."
		const pathSegmentPattern = /^[A-Za-z0-9_-]+$/

		let placeholderSource: "workflow" | "data"
		let pathText: string
		if (args.source.startsWith(workflowPrefix)) {
			placeholderSource = "workflow"
			pathText = args.source.slice(workflowPrefix.length)
		} else if (args.source.startsWith(dataPrefix)) {
			placeholderSource = "data"
			pathText = args.source.slice(dataPrefix.length)
		} else {
			return undefined
		}

		if (pathText.trim() === "") {
			return undefined
		}

		const pathSegments = pathText.split(".")
		if (pathSegments.some((pathSegment) => pathSegmentPattern.test(pathSegment) === false)) {
			return undefined
		}

		let current: unknown = placeholderSource === "workflow" ? args.workflowSession.workflowValues : args.formSession.data
		for (const pathSegment of pathSegments) {
			if (this.isWorkflowFormSessionDataPlainObject(current) === false) {
				return undefined
			}

			const matchingEntry = Object.entries(current).find(([entryKey]) => entryKey === pathSegment)
			if (matchingEntry === undefined) {
				return undefined
			}

			current = matchingEntry[1]
		}

		if (placeholderSource === "workflow") {
			return isWorkflowValue(current) ? { source: "workflow", value: current } : undefined
		}

		return this.isWorkflowFormSessionDataValue(current, new Set<object>()) ? { source: "data", value: current } : undefined
	}

	private buildStableWorkflowFormTextJsonValue(value: unknown): unknown {
		if (Array.isArray(value)) {
			return value.map((entry) => this.buildStableWorkflowFormTextJsonValue(entry))
		}

		if (this.isWorkflowFormSessionDataPlainObject(value)) {
			const sortedEntries = Object.entries(value)
				.sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
				.map(([entryKey, entryValue]) => [entryKey, this.buildStableWorkflowFormTextJsonValue(entryValue)])

			return Object.fromEntries(sortedEntries)
		}

		return value
	}

	private stringifyStableWorkflowFormTextJson(value: unknown): string {
		const renderedValue = JSON.stringify(this.buildStableWorkflowFormTextJsonValue(value))
		return renderedValue === undefined ? "" : renderedValue
	}

	private renderWorkflowFormSessionDataValueForText(value: WorkflowFormSessionDataValue): string {
		if (this.isWorkflowFormSessionDataSubmittedValuePayload(value, new Set<object>())) {
			return this.renderWorkflowFormSessionDataComparableValueForText(
				this.buildWorkflowFormSubmittedValueComparableValue(value),
			)
		}

		return this.renderWorkflowFormSessionDataComparableValueForText(value)
	}

	private renderWorkflowFormSessionDataComparableValueForText(value: unknown): string {
		if (typeof value === "string") {
			return value
		}

		if (typeof value === "number" || typeof value === "boolean") {
			return String(value)
		}

		return this.stringifyStableWorkflowFormTextJson(value)
	}

	private interpolateWorkflowFormText(args: {
		text: string
		workflowSession: ActiveWorkflowSession
		formSession: WorkflowFormSessionState
	}): string {
		return args.text.replace(/\{([^{}]+)\}/g, (placeholder, source) => {
			const placeholderValue = this.resolveWorkflowFormTextPlaceholderValue({
				source,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			})
			if (placeholderValue === undefined) {
				return placeholder
			}

			if (placeholderValue.source === "workflow") {
				return stringifyWorkflowValueForPrompt(placeholderValue.value)
			}

			return this.renderWorkflowFormSessionDataValueForText(placeholderValue.value)
		})
	}

	private interpolateWorkflowFormDefinitionPayload(args: {
		definition: WorkflowFormDefinitionPayload
		workflowSession: ActiveWorkflowSession
		formSession: WorkflowFormSessionState
	}): WorkflowFormDefinitionPayload {
		const definition = structuredClone(args.definition)
		return {
			...definition,
			title: this.interpolateWorkflowFormText({
				text: definition.title,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			}),
			toolDictionaryTitle: this.interpolateWorkflowFormText({
				text: definition.toolDictionaryTitle,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			}),
			toolDictionaryMarkdown: this.interpolateWorkflowFormText({
				text: definition.toolDictionaryMarkdown,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			}),
		}
	}

	private interpolateWorkflowFormActionLabels(args: {
		actionLabels: WorkflowFormResolvedPanelPayload["actionLabels"]
		workflowSession: ActiveWorkflowSession
		formSession: WorkflowFormSessionState
	}): WorkflowFormResolvedPanelPayload["actionLabels"] {
		if (args.actionLabels === undefined) {
			return undefined
		}

		const panelActions: readonly WorkflowFormPanelAction[] = ["submit", "cancel", "back", "retry"]
		const actionLabels: Partial<Record<WorkflowFormPanelAction, string>> = {}
		for (const panelAction of panelActions) {
			const label = args.actionLabels[panelAction]
			if (label !== undefined) {
				actionLabels[panelAction] = this.interpolateWorkflowFormText({
					text: label,
					workflowSession: args.workflowSession,
					formSession: args.formSession,
				})
			}
		}

		return actionLabels
	}

	private interpolateWorkflowFormOptionDefinition(args: {
		option: WorkflowFormOptionDefinition
		workflowSession: ActiveWorkflowSession
		formSession: WorkflowFormSessionState
	}): WorkflowFormOptionDefinition {
		const option: WorkflowFormOptionDefinition = {
			...args.option,
			label: this.interpolateWorkflowFormText({
				text: args.option.label,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			}),
		}

		if (args.option.description !== undefined) {
			option.description = this.interpolateWorkflowFormText({
				text: args.option.description,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			})
		}

		return option
	}

	private interpolateWorkflowFormFieldDefinition(args: {
		field: WorkflowFormFieldDefinition
		workflowSession: ActiveWorkflowSession
		formSession: WorkflowFormSessionState
	}): WorkflowFormFieldDefinition {
		const field: WorkflowFormFieldDefinition = {
			...args.field,
			label: this.interpolateWorkflowFormText({
				text: args.field.label,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			}),
		}

		if (args.field.helpText !== undefined) {
			field.helpText = this.interpolateWorkflowFormText({
				text: args.field.helpText,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			})
		}
		if (args.field.placeholder !== undefined) {
			field.placeholder = this.interpolateWorkflowFormText({
				text: args.field.placeholder,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			})
		}
		if (args.field.formatHint !== undefined) {
			field.formatHint = this.interpolateWorkflowFormText({
				text: args.field.formatHint,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			})
		}
		if (args.field.contentMarkdown !== undefined) {
			field.contentMarkdown = this.interpolateWorkflowFormText({
				text: args.field.contentMarkdown,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			})
		}
		if (args.field.trueLabel !== undefined) {
			field.trueLabel = this.interpolateWorkflowFormText({
				text: args.field.trueLabel,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			})
		}
		if (args.field.falseLabel !== undefined) {
			field.falseLabel = this.interpolateWorkflowFormText({
				text: args.field.falseLabel,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			})
		}
		if (args.field.options !== undefined) {
			field.options = args.field.options.map((option) =>
				this.interpolateWorkflowFormOptionDefinition({
					option,
					workflowSession: args.workflowSession,
					formSession: args.formSession,
				}),
			)
		}

		return field
	}

	private interpolateWorkflowFormResolvedPanelPayload(args: {
		panel: WorkflowFormResolvedPanelPayload
		workflowSession: ActiveWorkflowSession
		formSession: WorkflowFormSessionState
	}): WorkflowFormResolvedPanelPayload {
		return {
			...args.panel,
			title: this.interpolateWorkflowFormText({
				text: args.panel.title,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			}),
			promptMarkdown: this.interpolateWorkflowFormText({
				text: args.panel.promptMarkdown,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			}),
			fields: args.panel.fields.map((field) =>
				this.interpolateWorkflowFormFieldDefinition({
					field,
					workflowSession: args.workflowSession,
					formSession: args.formSession,
				}),
			),
			actionLabels: this.interpolateWorkflowFormActionLabels({
				actionLabels: args.panel.actionLabels,
				workflowSession: args.workflowSession,
				formSession: args.formSession,
			}),
		}
	}

	private evaluateWorkflowFormCondition(args: {
		condition: WorkflowFormConditionDefinition | undefined
		session: Pick<WorkflowFormSessionState, "values" | "data">
	}): boolean {
		const { condition, session } = args
		if (!condition) {
			return true
		}

		const sourceValue = this.resolveWorkflowFormComparableSourceValue(session, condition.sourceKey)
		const operator = condition.operator ?? "equals"
		const conditionValues = condition.values ?? []

		switch (operator) {
			case "equals":
				if (conditionValues.length > 0) {
					return this.isWorkflowFormComparableValue(sourceValue) && conditionValues.includes(sourceValue)
				}

				return sourceValue === condition.value
			case "not_equals":
				if (conditionValues.length > 0) {
					return !this.isWorkflowFormComparableValue(sourceValue) || !conditionValues.includes(sourceValue)
				}

				return sourceValue !== condition.value
			case "contains":
				if (Array.isArray(sourceValue)) {
					return sourceValue.includes(condition.value)
				}

				if (typeof sourceValue === "string" && typeof condition.value === "string") {
					return sourceValue.includes(condition.value)
				}

				return false
			case "not_contains":
				if (Array.isArray(sourceValue)) {
					return !sourceValue.includes(condition.value)
				}

				if (typeof sourceValue === "string" && typeof condition.value === "string") {
					return !sourceValue.includes(condition.value)
				}

				return true
			case "is_truthy":
				return Boolean(sourceValue)
			case "is_falsy":
				return !sourceValue
		}
	}

	private async buildWorkflowFormRenderPayload(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		session: WorkflowFormSessionState
	}): Promise<ReturnType<typeof buildWorkflowFormPayload>> {
		const { session } = args
		const workflowSession = args.taskState.activeWorkflowSession
		if (workflowSession === undefined) {
			throw new Error("Workflow form render requires an active workflow session.")
		}

		const panelId = session.failure?.panelId ?? session.currentPanelId
		const panel = this.getWorkflowFormPanel(session.definitionPayload, panelId)
		const resolvedPanel = await this.buildResolvedWorkflowFormPanelPayload({
			taskState: args.taskState,
			workflow: args.workflow,
			session,
			panel,
		})
		this.storeResolvedWorkflowFormPanelFields(session, panelId, resolvedPanel.fields)
		const interpolatedDefinition = this.interpolateWorkflowFormDefinitionPayload({
			definition: session.definitionPayload,
			workflowSession,
			formSession: session,
		})
		const interpolatedPanel = this.interpolateWorkflowFormResolvedPanelPayload({
			panel: resolvedPanel,
			workflowSession,
			formSession: session,
		})

		return buildWorkflowFormPayload({
			session,
			definition: interpolatedDefinition,
			panel: interpolatedPanel,
			errorMessage: session.failure?.errorMessage,
		})
	}

	private storeResolvedWorkflowFormPanelFields(
		session: WorkflowFormSessionState,
		panelId: string,
		fields: WorkflowFormFieldDefinition[],
	): void {
		const panel = session.definitionPayload.panels[panelId]
		if (!panel) {
			throw new Error(`Workflow form definition references an unknown panel: ${panelId}`)
		}

		const resolvedFieldsByKey = new Map(fields.map((field) => [field.key, field]))
		session.definitionPayload.panels[panelId] = {
			...panel,
			fields: panel.fields.map((field) => resolvedFieldsByKey.get(field.key) ?? field),
		}
	}

	private getWorkflowFormPanel(definition: WorkflowFormDefinitionPayload, panelId: string): WorkflowFormPanelDefinition {
		const panel = definition.panels[panelId]
		if (!panel) {
			throw new Error(`Workflow form definition references an unknown panel: ${panelId}`)
		}

		return panel
	}

	private async buildResolvedWorkflowFormPanelPayload(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		session: WorkflowFormSessionState
		panel: WorkflowFormPanelDefinition
	}): Promise<WorkflowFormResolvedPanelPayload> {
		return {
			panelId: args.panel.panelId,
			title: args.panel.title,
			promptMarkdown: args.panel.promptMarkdown,
			fields: await this.resolveWorkflowFormPanelFields(args),
			allowedActions: args.panel.allowedActions,
			actionLabels: args.panel.actionLabels,
		}
	}

	private async resolveWorkflowFormPanelFields(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		session: WorkflowFormSessionState
		panel: WorkflowFormPanelDefinition
	}): Promise<WorkflowFormFieldDefinition[]> {
		const visibleFields = args.panel.fields
			.filter((field) => field.visible !== false)
			.filter((field) =>
				this.evaluateWorkflowFormCondition({
					condition: field.visibilityCondition,
					session: args.session,
				}),
			)

		const resolvedFields: WorkflowFormFieldDefinition[] = []
		for (const field of visibleFields) {
			const conditionalOptions = field.conditionalOptions?.find((entry) =>
				this.evaluateWorkflowFormCondition({
					condition: entry.when,
					session: args.session,
				}),
			)
			const conditionalOverride = field.conditionalFieldOverrides?.find((entry) =>
				this.evaluateWorkflowFormCondition({
					condition: entry.when,
					session: args.session,
				}),
			)

			const resolvedField: WorkflowFormFieldDefinition = {
				...field,
				options: conditionalOptions ? conditionalOptions.options : field.options,
			}

			if (conditionalOverride) {
				if (conditionalOverride.allowedValueType !== undefined) {
					resolvedField.allowedValueType = conditionalOverride.allowedValueType
				}
				if (conditionalOverride.required !== undefined) {
					resolvedField.required = conditionalOverride.required
				}
				if (conditionalOverride.selectionCardinality !== undefined) {
					resolvedField.selectionCardinality = conditionalOverride.selectionCardinality
				}
				if (conditionalOverride.selectionCount !== undefined) {
					resolvedField.selectionCount = conditionalOverride.selectionCount
				}
				if (conditionalOverride.minimumSelectionCount !== undefined) {
					resolvedField.minimumSelectionCount = conditionalOverride.minimumSelectionCount
				}
				if (conditionalOverride.contentMarkdown !== undefined) {
					resolvedField.contentMarkdown = conditionalOverride.contentMarkdown
				}
			}

			resolvedFields.push(
				await this.populateWorkflowFormDynamicOptions({
					taskState: args.taskState,
					workflow: args.workflow,
					formSession: args.session,
					field: resolvedField,
				}),
			)
		}

		return resolvedFields
	}

	private async populateWorkflowFormDynamicOptions(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		formSession: WorkflowFormSessionState
		field: WorkflowFormFieldDefinition
	}): Promise<WorkflowFormFieldDefinition> {
		const dynamicOptions = await this.resolveWorkflowFormDynamicOptions(args)
		if (!dynamicOptions) {
			return args.field
		}

		return {
			...args.field,
			options: dynamicOptions,
		}
	}

	private async resolveWorkflowFormDynamicOptions(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		formSession: WorkflowFormSessionState
		field: WorkflowFormFieldDefinition
	}): Promise<WorkflowFormOptionDefinition[] | undefined> {
		const selectorOptions = await this.discoverWorkflowFormSelectorOptions(args)
		if (selectorOptions !== undefined) {
			return selectorOptions
		}

		return this.loadWorkflowFormJsonOptions(args)
	}

	private async discoverWorkflowFormSelectorOptions(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		field: WorkflowFormFieldDefinition
	}): Promise<WorkflowFormOptionDefinition[] | undefined> {
		const discoveryConfig = args.field.selectorDiscovery
		if (!discoveryConfig) {
			return undefined
		}

		const targetPathSegments = discoveryConfig.targetPathSegments
		let rootDirectory = this.cwd
		const namingPattern = discoveryConfig.namingPattern === undefined ? undefined : new RegExp(discoveryConfig.namingPattern)

		if (discoveryConfig.root.kind === "project_output_root") {
			rootDirectory = this.resolveWorkflowProjectOutputRoot()
		} else if (discoveryConfig.root.kind === "selected_project_root") {
			const session = args.taskState.activeWorkflowSession
			if (!session || session.projectSelection.projectFolderName === "") {
				return undefined
			}

			rootDirectory = resolveWorkflowDiscoveryTargetDirectory({
				rootDirectory: this.resolveWorkflowProjectOutputRoot(),
				targetPathSegments: [session.projectSelection.projectFolderName],
			})
		}

		return discoverWorkflowCandidates({
			rootDirectory,
			workspacePathPolicy: this.workspacePathPolicy,
			targetPathSegments,
			namingPattern,
			entryType: discoveryConfig.entryType,
			immediateChildrenOnly: discoveryConfig.immediateChildrenOnly,
			sort: discoveryConfig.sort,
			buildLabel: (entryName) => discoveryConfig.labelTemplate?.replace("{entryName}", entryName) ?? entryName,
		})
	}

	private async loadWorkflowFormJsonOptions(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		formSession: WorkflowFormSessionState
		field: WorkflowFormFieldDefinition
	}): Promise<WorkflowFormOptionDefinition[] | undefined> {
		const sourceConfig = args.field.jsonOptionsSource
		if (sourceConfig === undefined) {
			return undefined
		}

		const sourcePath = this.resolveWorkflowFormJsonOptionsSourcePath({
			taskState: args.taskState,
			formSession: args.formSession,
			fieldKey: args.field.key,
			sourceConfig,
		})

		let sourceText: string
		try {
			sourceText = await readFile(sourcePath, "utf8")
		} catch (error) {
			const errorMessage = error instanceof Error ? ` ${error.message}` : ""
			throw new Error(
				`Workflow form field ${args.field.key} jsonOptionsSource file ${sourcePath} could not be read.${errorMessage}`,
			)
		}

		let parsedSource: unknown
		try {
			parsedSource = JSON.parse(sourceText)
		} catch (error) {
			const errorMessage = error instanceof Error ? ` ${error.message}` : ""
			throw new Error(
				`Workflow form field ${args.field.key} jsonOptionsSource file ${sourcePath} is malformed JSON.${errorMessage}`,
			)
		}

		const items = this.resolveWorkflowFormJsonOptionItems({
			fieldKey: args.field.key,
			sourceConfig,
			sourcePath,
			parsedSource,
		})

		return this.buildWorkflowFormJsonOptions({
			fieldKey: args.field.key,
			sourceConfig,
			sourcePath,
			items,
		})
	}

	private resolveWorkflowFormJsonOptionsSourcePath(args: {
		taskState: TaskState
		formSession: WorkflowFormSessionState
		fieldKey: string
		sourceConfig: WorkflowFormJsonOptionsSourceConfig
	}): string {
		const session = args.taskState.activeWorkflowSession
		if (session === undefined) {
			throw new Error(`Workflow form field ${args.fieldKey} jsonOptionsSource requires an active workflow session.`)
		}

		const sourcePathSegments = args.sourceConfig.sourcePathSegments.map((sourcePathSegment) =>
			this.interpolateWorkflowFormText({
				text: sourcePathSegment,
				workflowSession: session,
				formSession: args.formSession,
			}),
		)
		for (const sourcePathSegment of sourcePathSegments) {
			if (/\{[^{}]+\}/.test(sourcePathSegment)) {
				throw new Error(
					`Workflow form field ${args.fieldKey} jsonOptionsSource sourcePathSegments entry ${sourcePathSegment} contains an unresolved workflow-form placeholder.`,
				)
			}
			if (isWorkflowDiscoveryTargetPathSegment(sourcePathSegment) === false) {
				throw new Error(
					`Workflow form field ${args.fieldKey} jsonOptionsSource resolved sourcePathSegments entry ${sourcePathSegment} is invalid.`,
				)
			}
		}
		const selectedProjectRoot = resolve(this.resolveWorkflowProjectOutputFolder(session))
		const sourcePath = resolve(selectedProjectRoot, ...sourcePathSegments)
		const relativeSourcePath = relative(selectedProjectRoot, sourcePath)
		if (relativeSourcePath === ".." || relativeSourcePath.startsWith(`..${sep}`) || isAbsolute(relativeSourcePath)) {
			throw new Error(
				`Workflow form field ${args.fieldKey} jsonOptionsSource file must stay under selected project root: ${sourcePath}`,
			)
		}

		this.assertWorkspacePathAllowed(sourcePath)
		return sourcePath
	}

	private resolveWorkflowFormJsonOptionItems(args: {
		fieldKey: string
		sourceConfig: WorkflowFormJsonOptionsSourceConfig
		sourcePath: string
		parsedSource: unknown
	}): Record<string, unknown>[] {
		let currentValue = args.parsedSource
		for (const pathSegment of args.sourceConfig.itemsPath.split(".")) {
			if (this.isPlainRecord(currentValue) === false) {
				throw new Error(
					`Workflow form field ${args.fieldKey} jsonOptionsSource itemsPath ${args.sourceConfig.itemsPath} could not traverse ${pathSegment} in ${args.sourcePath}.`,
				)
			}

			currentValue = currentValue[pathSegment]
		}

		if (Array.isArray(currentValue) === false) {
			throw new Error(
				`Workflow form field ${args.fieldKey} jsonOptionsSource itemsPath ${args.sourceConfig.itemsPath} must resolve to an array in ${args.sourcePath}.`,
			)
		}

		const items: Record<string, unknown>[] = []
		for (const [index, item] of currentValue.entries()) {
			if (this.isPlainRecord(item) === false) {
				throw new Error(
					`Workflow form field ${args.fieldKey} jsonOptionsSource itemsPath ${args.sourceConfig.itemsPath}[${index}] must be an object in ${args.sourcePath}.`,
				)
			}

			items.push(item)
		}

		return items
	}

	private buildWorkflowFormJsonOptions(args: {
		fieldKey: string
		sourceConfig: WorkflowFormJsonOptionsSourceConfig
		sourcePath: string
		items: Record<string, unknown>[]
	}): WorkflowFormOptionDefinition[] {
		const seenValues = new Set<string>()
		const options: WorkflowFormOptionDefinition[] = []

		for (const [index, item] of args.items.entries()) {
			const optionValue = item[args.sourceConfig.valueProperty]
			if (typeof optionValue !== "string" || optionValue.trim() === "") {
				throw new Error(
					`Workflow form field ${args.fieldKey} jsonOptionsSource item ${index} valueProperty ${args.sourceConfig.valueProperty} must be a non-empty string in ${args.sourcePath}.`,
				)
			}

			if (seenValues.has(optionValue)) {
				throw new Error(
					`Workflow form field ${args.fieldKey} jsonOptionsSource generated duplicate option value ${optionValue} in ${args.sourcePath}.`,
				)
			}
			seenValues.add(optionValue)

			const option: WorkflowFormOptionDefinition = {
				value: optionValue,
				label: this.renderWorkflowFormJsonOptionTemplate({
					fieldKey: args.fieldKey,
					sourcePath: args.sourcePath,
					itemIndex: index,
					item,
					template: args.sourceConfig.labelTemplate,
				}),
			}

			if (args.sourceConfig.descriptionTemplate !== undefined) {
				option.description = this.renderWorkflowFormJsonOptionTemplate({
					fieldKey: args.fieldKey,
					sourcePath: args.sourcePath,
					itemIndex: index,
					item,
					template: args.sourceConfig.descriptionTemplate,
				})
			}

			options.push(option)
		}

		return options
	}

	private renderWorkflowFormJsonOptionTemplate(args: {
		fieldKey: string
		sourcePath: string
		itemIndex: number
		item: Record<string, unknown>
		template: string
	}): string {
		return args.template.replace(/\{([^{}]+)\}/g, (placeholder, propertyName) => {
			const propertyValue = args.item[propertyName]
			if (typeof propertyValue === "string" || typeof propertyValue === "number" || typeof propertyValue === "boolean") {
				return String(propertyValue)
			}

			throw new Error(
				`Workflow form field ${args.fieldKey} jsonOptionsSource template placeholder ${placeholder} must resolve to a direct string, number, or boolean property on item ${args.itemIndex} in ${args.sourcePath}.`,
			)
		})
	}

	private isWorkflowFormJsonOptionsSourceFieldKind(kind: WorkflowFormFieldDefinition["kind"]): boolean {
		switch (kind) {
			case "dropdown":
			case "radio_group":
			case "multi_select":
			case "checkbox_group":
				return true
			default:
				return false
		}
	}

	private validateWorkflowFormJsonOptionsSourceString(args: {
		workflowFormId: string
		fieldKey: string
		propertyName: string
		value: string
	}): WorkflowValidationResult {
		if (args.value.trim() === "") {
			return {
				valid: false,
				errorMessage: `Workflow form ${args.workflowFormId} field ${args.fieldKey} jsonOptionsSource.${args.propertyName} must not be empty.`,
			}
		}

		if (args.value.trim() !== args.value) {
			return {
				valid: false,
				errorMessage: `Workflow form ${args.workflowFormId} field ${args.fieldKey} jsonOptionsSource.${args.propertyName} must already be trimmed.`,
			}
		}

		return { valid: true }
	}

	private validateWorkflowFormJsonOptionsSourceConfig(args: {
		workflowFormId: string
		field: WorkflowFormFieldDefinition
	}): WorkflowValidationResult {
		const sourceConfig = args.field.jsonOptionsSource
		if (sourceConfig === undefined) {
			return { valid: true }
		}

		if (args.field.selectorDiscovery !== undefined) {
			return {
				valid: false,
				errorMessage: `Workflow form ${args.workflowFormId} field ${args.field.key} must not define both selectorDiscovery and jsonOptionsSource.`,
			}
		}

		if (this.isWorkflowFormJsonOptionsSourceFieldKind(args.field.kind) === false) {
			return {
				valid: false,
				errorMessage: `Workflow form ${args.workflowFormId} field ${args.field.key} jsonOptionsSource is only supported for dropdown, radio_group, multi_select, or checkbox_group fields.`,
			}
		}

		for (const sourcePathSegment of sourceConfig.sourcePathSegments) {
			if (isWorkflowDiscoveryTargetPathSegment(sourcePathSegment) === false) {
				return {
					valid: false,
					errorMessage: `Workflow form ${args.workflowFormId} field ${args.field.key} jsonOptionsSource sourcePathSegments entry ${sourcePathSegment} is invalid.`,
				}
			}
		}

		const requiredStrings: Array<{ readonly propertyName: string; readonly value: string }> = [
			{ propertyName: "itemsPath", value: sourceConfig.itemsPath },
			{ propertyName: "valueProperty", value: sourceConfig.valueProperty },
			{ propertyName: "labelTemplate", value: sourceConfig.labelTemplate },
		]
		if (sourceConfig.descriptionTemplate !== undefined) {
			requiredStrings.push({ propertyName: "descriptionTemplate", value: sourceConfig.descriptionTemplate })
		}

		for (const requiredString of requiredStrings) {
			const validation = this.validateWorkflowFormJsonOptionsSourceString({
				workflowFormId: args.workflowFormId,
				fieldKey: args.field.key,
				propertyName: requiredString.propertyName,
				value: requiredString.value,
			})
			if (validation.valid === false) {
				return validation
			}
		}

		return { valid: true }
	}

	private async discoverPrerequisiteFileCandidates(args: {
		session: ActiveWorkflowSession
		prerequisite: WorkflowPrerequisiteFileDefinition
	}): Promise<WorkflowPrerequisiteFileCandidate[]> {
		const selectedProjectRoot = this.resolveWorkflowProjectOutputFolder(args.session)
		return discoverWorkflowPrerequisiteFileCandidates({
			selectedProjectRoot,
			prerequisite: args.prerequisite,
			workspacePathPolicy: this.workspacePathPolicy,
		})
	}

	private buildRequiredPrerequisiteCannotContinuePanel(
		prerequisite: WorkflowPrerequisiteFileDefinition,
	): WorkflowFormPanelDefinition {
		return {
			panelId: WORKFLOW_PREREQUISITE_CANNOT_CONTINUE_PANEL_ID,
			title: "Required Prerequisite File Missing",
			promptMarkdown: `This workflow cannot continue without the required prerequisite file. Run \`${prerequisite.producingWorkflowName}\` first to produce the required file, then return to this workflow.`,
			fields: [],
			allowedActions: ["submit"],
			actionLabels: {
				submit: "Close",
			},
			transition: {
				type: "conditional",
				conditionSourceKey: "__terminal__",
				branches: [],
				defaultTerminal: true,
			},
		}
	}

	private buildRequiredPrerequisiteSingleMatchPanel(candidate: WorkflowPrerequisiteFileCandidate): WorkflowFormPanelDefinition {
		return {
			panelId: "required-prerequisite-single-match",
			title: "Required Prerequisite File Found",
			promptMarkdown: `A required prerequisite file was found.\n\nFile name: \`${candidate.filename}\`\n\nFull path: \`${candidate.absolutePath}\``,
			fields: [
				{
					key: WORKFLOW_PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY,
					kind: "boolean",
					label: "Continue with this prerequisite file selected?",
					required: true,
					allowedValueType: "boolean",
					trueLabel: "Yes",
					falseLabel: "No",
				},
			],
			allowedActions: ["submit", "cancel"],
			actionLabels: {
				submit: "Continue",
				cancel: "Cancel",
			},
			transition: {
				type: "conditional",
				conditionSourceKey: "__terminal__",
				branches: [],
				defaultTerminal: true,
			},
		}
	}

	private buildRequiredPrerequisiteMultiMatchPanel(
		candidates: readonly WorkflowPrerequisiteFileCandidate[],
	): WorkflowFormPanelDefinition {
		return {
			panelId: "required-prerequisite-multi-match",
			title: "Select Required Prerequisite File",
			promptMarkdown:
				"This workflow requires selection of one of the following prerequisite files. Please select the target file using the dropdown below.",
			fields: [
				{
					key: WORKFLOW_PREREQUISITE_SELECTED_FILE_FIELD_KEY,
					kind: "dropdown",
					label: "Prerequisite file",
					required: true,
					allowedValueType: "string",
					options: candidates.map((candidate) => ({
						value: candidate.absolutePath,
						label: `${candidate.filename} (${candidate.projectRelativePath})`,
						description: candidate.absolutePath,
					})),
				},
			],
			allowedActions: ["submit", "cancel"],
			actionLabels: {
				submit: "Continue",
				cancel: "Cancel",
			},
			transition: {
				type: "conditional",
				conditionSourceKey: "__terminal__",
				branches: [],
				defaultTerminal: true,
			},
		}
	}

	private buildOptionalPrerequisiteSingleMatchPanel(candidate: WorkflowPrerequisiteFileCandidate): WorkflowFormPanelDefinition {
		return {
			panelId: "optional-prerequisite-single-match",
			title: "Optional Prerequisite File Found",
			promptMarkdown: `An optional prerequisite file was found.\n\nFile name: \`${candidate.filename}\`\n\nFull path: \`${candidate.absolutePath}\``,
			fields: [
				{
					key: WORKFLOW_PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY,
					kind: "boolean",
					label: "Continue with this prerequisite file selected?",
					required: false,
					allowedValueType: "boolean",
					trueLabel: "Yes",
					falseLabel: "No",
				},
			],
			allowedActions: ["submit", "cancel"],
			actionLabels: {
				submit: "Continue",
				cancel: "Skip",
			},
			transition: {
				type: "conditional",
				conditionSourceKey: "__terminal__",
				branches: [],
				defaultTerminal: true,
			},
		}
	}

	private buildOptionalPrerequisiteMultiMatchPanel(
		candidates: readonly WorkflowPrerequisiteFileCandidate[],
	): WorkflowFormPanelDefinition {
		return {
			panelId: "optional-prerequisite-multi-match",
			title: "Select Optional Prerequisite File",
			promptMarkdown:
				"This workflow can use one of the following optional prerequisite files. Select a target file or continue without one.",
			fields: [
				{
					key: WORKFLOW_PREREQUISITE_SELECTED_FILE_FIELD_KEY,
					kind: "dropdown",
					label: "Optional prerequisite file",
					required: false,
					allowedValueType: "string",
					options: candidates.map((candidate) => ({
						value: candidate.absolutePath,
						label: `${candidate.filename} (${candidate.projectRelativePath})`,
						description: candidate.absolutePath,
					})),
				},
			],
			allowedActions: ["submit", "cancel"],
			actionLabels: {
				submit: "Continue",
				cancel: "Skip",
			},
			transition: {
				type: "conditional",
				conditionSourceKey: "__terminal__",
				branches: [],
				defaultTerminal: true,
			},
		}
	}

	private buildPrerequisiteFormDefinitionPayload(panel: WorkflowFormPanelDefinition): WorkflowFormDefinitionPayload {
		return {
			definitionVersion: 2,
			title: "Workflow Prerequisite File",
			toolDictionaryTitle: "Workflow Prerequisite File",
			toolDictionaryMarkdown: "Runtime-owned prerequisite file resolution.",
			firstPanelId: panel.panelId,
			panels: {
				[panel.panelId]: panel,
			},
		}
	}

	private hasPersistedPrerequisiteWorkflowValue(
		session: ActiveWorkflowSession,
		prerequisite: WorkflowPrerequisiteFileDefinition,
	): boolean {
		const value = session.workflowValues[prerequisite.workflowValueKey]
		return typeof value === "string" && value.trim() !== ""
	}

	private async buildPrerequisiteFormNextAction(args: {
		taskState: TaskState
		definition: WorkflowDefinition
		prerequisite: WorkflowPrerequisiteFileDefinition
		panel: WorkflowFormPanelDefinition
		singleMatchCandidate?: WorkflowPrerequisiteFileCandidate
		skippedPrerequisiteIds?: readonly string[]
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const data: WorkflowFormSessionData = {
			[WORKFLOW_PREREQUISITE_ID_DATA_KEY]: args.prerequisite.id,
		}
		if (args.singleMatchCandidate !== undefined) {
			data[WORKFLOW_PREREQUISITE_SINGLE_MATCH_PATH_DATA_KEY] = args.singleMatchCandidate.absolutePath
		}
		if (args.skippedPrerequisiteIds !== undefined && args.skippedPrerequisiteIds.length > 0) {
			data[WORKFLOW_PREREQUISITE_SKIPPED_IDS_DATA_KEY] = [...args.skippedPrerequisiteIds]
		}

		const formSession = this.workflowFormRuntime.createSession({
			workflowFormId: WORKFLOW_PREREQUISITE_FORM_ID,
			definitionPayload: this.buildPrerequisiteFormDefinitionPayload(args.panel),
			data,
		})
		session.ui.formSession = formSession

		return {
			kind: "render_workflow_form",
			formSession,
			payload: await this.buildWorkflowFormRenderPayload({
				taskState: args.taskState,
				workflow: args.definition,
				session: formSession,
			}),
		}
	}

	private async buildResolvePrerequisiteFilesNextAction(args: {
		taskState: TaskState
		definition: WorkflowDefinition
		action: Extract<WorkflowDecisionAction, { kind: "resolve_prerequisite_files" }>
		skippedPrerequisiteIds?: readonly string[]
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}
		if (session.ui.formSession !== undefined && this.isWorkflowPrerequisiteFormSession(session.ui.formSession)) {
			return {
				kind: "render_workflow_form",
				formSession: session.ui.formSession,
				payload: await this.buildWorkflowFormRenderPayload({
					taskState: args.taskState,
					workflow: args.definition,
					session: session.ui.formSession,
				}),
			}
		}

		const skippedPrerequisiteIds = [...new Set(args.skippedPrerequisiteIds ?? [])]
		const skippedPrerequisiteIdSet = new Set(skippedPrerequisiteIds)
		for (const prerequisiteId of args.action.prerequisiteIds) {
			const prerequisite = args.definition.prerequisiteFiles?.[prerequisiteId]
			if (
				prerequisite === undefined ||
				skippedPrerequisiteIdSet.has(prerequisiteId) ||
				this.hasPersistedPrerequisiteWorkflowValue(session, prerequisite)
			) {
				continue
			}

			const candidates = await this.discoverPrerequisiteFileCandidates({
				session,
				prerequisite,
			})

			if (candidates.length === 0) {
				if (prerequisite.requirement === "required") {
					return this.buildPrerequisiteFormNextAction({
						taskState: args.taskState,
						definition: args.definition,
						prerequisite,
						panel: this.buildRequiredPrerequisiteCannotContinuePanel(prerequisite),
						skippedPrerequisiteIds,
					})
				}
				continue
			}

			if (candidates.length === 1) {
				const candidate = candidates[0]
				const panel =
					prerequisite.requirement === "required"
						? this.buildRequiredPrerequisiteSingleMatchPanel(candidate)
						: this.buildOptionalPrerequisiteSingleMatchPanel(candidate)
				return this.buildPrerequisiteFormNextAction({
					taskState: args.taskState,
					definition: args.definition,
					prerequisite,
					panel,
					singleMatchCandidate: candidate,
					skippedPrerequisiteIds,
				})
			}

			const panel =
				prerequisite.requirement === "required"
					? this.buildRequiredPrerequisiteMultiMatchPanel(candidates)
					: this.buildOptionalPrerequisiteMultiMatchPanel(candidates)
			return this.buildPrerequisiteFormNextAction({
				taskState: args.taskState,
				definition: args.definition,
				prerequisite,
				panel,
				skippedPrerequisiteIds,
			})
		}

		session.ui.formSession = undefined
		return this.resolveNextAction({ taskState: args.taskState })
	}

	private buildDecisionTreeEvaluationInput(
		session: ActiveWorkflowSession,
		step: WorkflowStepDefinition,
	): WorkflowDecisionBranchEvaluationInput {
		return {
			activeBranchId: session.branchContext.activeBranchId,
			workflowValues: session.workflowValues,
			step,
		}
	}

	private doesDecisionTreeRouteMatch(args: {
		session: ActiveWorkflowSession
		step: WorkflowStepDefinition
		route: WorkflowDecisionBranchRoute
		triggerEvent?: WorkflowBranchTriggerEvent
	}): boolean {
		const { session, step, route, triggerEvent } = args
		const evaluationInput = this.buildDecisionTreeEvaluationInput(session, step)

		switch (route.trigger.kind) {
			case "always":
				return true
			case "on_event":
				return triggerEvent?.kind === route.trigger.eventKind
			case "session_predicate":
				return route.trigger.matches(evaluationInput)
			case "event_predicate":
				if (!triggerEvent) {
					return false
				}

				return route.trigger.matches({
					...evaluationInput,
					triggerEvent,
				})
		}
	}

	private resolveDecisionTreeRoute(args: {
		taskState?: TaskState
		session: ActiveWorkflowSession
		step: WorkflowStepDefinition
		triggerEvent?: WorkflowBranchTriggerEvent
	}): WorkflowResolvedDecisionTreeRoute | undefined {
		const { session, step, taskState } = args
		const triggerEvent = args.triggerEvent ?? session.branchContext.lastTriggerEvent
		const initialBranch =
			step.decisionTree.branches[session.branchContext.activeBranchId] ??
			step.decisionTree.branches[step.decisionTree.entryBranchId]
		if (!initialBranch) {
			return undefined
		}

		const visitedBranchIds = new Set<string>()
		let currentBranch = initialBranch

		while (!visitedBranchIds.has(currentBranch.id)) {
			visitedBranchIds.add(currentBranch.id)

			let matchedRoute: WorkflowDecisionBranchRoute | undefined
			for (const route of currentBranch.routes) {
				if (
					this.doesDecisionTreeRouteMatch({
						session,
						step,
						route,
						triggerEvent,
					})
				) {
					matchedRoute = route
					break
				}
			}

			if (!matchedRoute) {
				break
			}

			const nextActiveBranchId = matchedRoute.followingBranchId ?? currentBranch.id
			if (matchedRoute.action.kind === "no_op" && matchedRoute.followingBranchId !== undefined) {
				const followingBranch = step.decisionTree.branches[matchedRoute.followingBranchId]
				if (!followingBranch) {
					return undefined
				}

				currentBranch = followingBranch
				continue
			}

			return {
				route: matchedRoute,
				sourceRoute: {
					branchId: currentBranch.id,
					routeId: matchedRoute.id,
				},
				nextActiveBranchId,
			}
		}

		if (triggerEvent) {
			return undefined
		}

		if (!taskState) {
			return undefined
		}

		return this.resolveDecisionTreeContinuationRoute({
			taskState,
			step,
			activeBranchId: initialBranch.id,
		})
	}

	private hasDecisionTreeRouteForTriggerEvent(args: {
		session: ActiveWorkflowSession
		step: WorkflowStepDefinition
		triggerEvent: WorkflowBranchTriggerEvent
	}): boolean {
		const activeBranch =
			args.step.decisionTree.branches[args.session.branchContext.activeBranchId] ??
			args.step.decisionTree.branches[args.step.decisionTree.entryBranchId]
		if (!activeBranch) {
			return false
		}

		return activeBranch.routes.some((route) => {
			if (route.trigger.kind !== "on_event" && route.trigger.kind !== "event_predicate") {
				return false
			}

			return this.doesDecisionTreeRouteMatch({
				session: args.session,
				step: args.step,
				route,
				triggerEvent: args.triggerEvent,
			})
		})
	}

	private resolveDecisionTreeContinuationRoute(args: {
		taskState: TaskState
		step: WorkflowStepDefinition
		activeBranchId: string
	}): WorkflowResolvedDecisionTreeRoute | undefined {
		const { taskState, step, activeBranchId } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return undefined
		}

		const activeFormSession = session.ui.formSession
		if (activeFormSession) {
			const continuationRoute = this.findContinuationSourceRoute({
				step,
				activeBranchId,
				matches: ({ route }) =>
					this.isWorkflowPrerequisiteFormSession(activeFormSession)
						? route.action.kind === "resolve_prerequisite_files"
						: route.action.kind === "render_workflow_form" &&
							route.action.workflowFormId === activeFormSession.workflowFormId,
			})
			if (continuationRoute) {
				return {
					route: continuationRoute.route,
					sourceRoute: continuationRoute.sourceRoute,
					nextActiveBranchId: activeBranchId,
				}
			}
		}

		const activeStepResolutionSession = session.ui.stepResolutionSession
		if (activeStepResolutionSession?.state === "pending") {
			const continuationRoute = this.findContinuationSourceRoute({
				step,
				activeBranchId,
				matches: ({ route, sourceRoute }) =>
					route.action.kind === "execute_tool_backed_operation" &&
					this.areWorkflowStepResolutionSourceRoutesEqual(sourceRoute, activeStepResolutionSession.sourceRoute),
			})
			if (continuationRoute) {
				return {
					route: continuationRoute.route,
					sourceRoute: continuationRoute.sourceRoute,
					nextActiveBranchId: activeBranchId,
				}
			}
		}

		const artifactAllocationContinuationRoute = this.findContinuationSourceRoute({
			step,
			activeBranchId,
			matches: ({ route }) => route.action.kind === "allocate_artifact",
		})
		if (artifactAllocationContinuationRoute) {
			return {
				route: artifactAllocationContinuationRoute.route,
				sourceRoute: artifactAllocationContinuationRoute.sourceRoute,
				nextActiveBranchId: activeBranchId,
			}
		}

		return undefined
	}

	private findContinuationSourceRoute(args: {
		step: WorkflowStepDefinition
		activeBranchId: string
		matches(sourceRoute: WorkflowContinuationSourceRoute): boolean
	}): WorkflowContinuationSourceRoute | undefined {
		for (const branch of Object.values(args.step.decisionTree.branches)) {
			for (const route of branch.routes) {
				if (route.followingBranchId !== args.activeBranchId) {
					continue
				}

				const continuationSourceRoute = {
					route,
					sourceRoute: {
						branchId: branch.id,
						routeId: route.id,
					},
				}

				if (args.matches(continuationSourceRoute)) {
					return continuationSourceRoute
				}
			}
		}

		return undefined
	}

	private transitionToStep(args: {
		taskState: TaskState
		definition: WorkflowDefinition
		target: WorkflowStepTransitionTarget
	}): WorkflowStepDefinition | undefined {
		const { taskState, definition, target } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return undefined
		}

		const targetStep = definition.steps[`step-${target.stepNumber}`]
		if (!targetStep) {
			return undefined
		}

		const nextBranchId = target.kind === "entry_branch" ? targetStep.decisionTree.entryBranchId : target.branchId
		if (targetStep.decisionTree.branches[nextBranchId] === undefined) {
			return undefined
		}

		session.activeStepNumber = target.stepNumber
		session.ui.formSession = undefined
		session.ui.stepResolutionSession = undefined
		session.ui.suppressedWorkflowFormIds = []
		session.ui.suppressedWorkflowStepResolutionRoutes = []
		session.branchContext = {
			activeBranchId: nextBranchId,
		}
		this.refreshCurrentFocusChainChecklist(taskState)

		return targetStep
	}

	private async buildNextActionFromDecisionTreeAction(args: {
		taskState: TaskState
		definition: WorkflowDefinition
		action: WorkflowDecisionAction
		sourceRoute: WorkflowStepResolutionSourceRoute
	}): Promise<WorkflowNextAction> {
		const { taskState, definition, action, sourceRoute } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		switch (action.kind) {
			case "render_workflow_form": {
				if (session.ui.formSession?.workflowFormId === action.workflowFormId) {
					const payload = await this.buildWorkflowFormRenderPayload({
						taskState,
						workflow: definition,
						session: session.ui.formSession,
					})
					return {
						kind: "render_workflow_form",
						formSession: session.ui.formSession,
						payload,
					}
				}

				const definitionPayload = definition.workflowForms?.[action.workflowFormId]
				if (!definitionPayload) {
					return { kind: "no_op" }
				}

				let createSessionOptions: WorkflowFormRuntimeCreateSessionOptions
				if ("buildSessionData" in action) {
					let builtSessionData: WorkflowFormSessionData
					try {
						builtSessionData = await action.buildSessionData(session)
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : "Unknown error."
						return this.buildTerminalErrorNextAction({
							taskState,
							errorMessage: `Workflow form session data builder failed for form ${action.workflowFormId}: ${errorMessage}`,
						})
					}

					if (this.isWorkflowFormSessionData(builtSessionData) === false) {
						return this.buildTerminalErrorNextAction({
							taskState,
							errorMessage: `Workflow form session data builder returned invalid data for form ${action.workflowFormId}.`,
						})
					}

					createSessionOptions =
						"startPanelId" in action
							? {
									workflowFormId: action.workflowFormId,
									definitionPayload,
									startPanelId: action.startPanelId,
									data: builtSessionData,
								}
							: {
									workflowFormId: action.workflowFormId,
									definitionPayload,
									data: builtSessionData,
								}
				} else {
					createSessionOptions =
						"startPanelId" in action
							? {
									workflowFormId: action.workflowFormId,
									definitionPayload,
									startPanelId: action.startPanelId,
								}
							: {
									workflowFormId: action.workflowFormId,
									definitionPayload,
								}
				}

				const formSession = this.workflowFormRuntime.createSession(createSessionOptions)
				session.ui.formSession = formSession
				const payload = await this.buildWorkflowFormRenderPayload({
					taskState,
					workflow: definition,
					session: formSession,
				})

				return {
					kind: "render_workflow_form",
					formSession,
					payload,
				}
			}
			case "execute_tool_backed_operation": {
				const activeStep = this.getActiveStepDefinition(definition, session)
				if (!activeStep) {
					return { kind: "no_op" }
				}

				const stepResolutionSession =
					session.ui.stepResolutionSession &&
					this.areWorkflowStepResolutionSourceRoutesEqual(session.ui.stepResolutionSession.sourceRoute, sourceRoute)
						? session.ui.stepResolutionSession
						: this.createToolBackedOperationSession({
								sourceRoute,
								triggerSource: "execute_tool_backed_operation",
								owner: {
									kind: "workflow_step",
									workflowName: definition.name,
									stepNumber: activeStep.stepNumber,
								},
							})
				const toolRequest = action.instruction.buildToolExecutionRequest({
					toolBackedOperationSession: stepResolutionSession,
					activeWorkflowSession: session,
				})
				if (toolRequest.toolName !== action.instruction.toolName) {
					const builtRequestToolOwnership = this.isRuntimeOwnedWorkflowTool(toolRequest.toolName)
						? "runtime-owned "
						: ""
					return this.buildTerminalErrorNextAction({
						taskState,
						errorMessage: `Invalid workflow configuration: tool-backed action route ${sourceRoute.branchId}/${sourceRoute.routeId} declared tool ${action.instruction.toolName} but built request for ${builtRequestToolOwnership}tool ${toolRequest.toolName}.`,
					})
				}

				if (this.isRuntimeOwnedWorkflowTool(toolRequest.toolName)) {
					return this.buildTerminalErrorNextAction({
						taskState,
						errorMessage: `Invalid workflow configuration: tool-backed action route ${sourceRoute.branchId}/${sourceRoute.routeId} built request for runtime-owned tool ${toolRequest.toolName}.`,
					})
				}

				session.ui.stepResolutionSession = stepResolutionSession

				return {
					kind: "execute_tool_backed_operation",
					toolRequest,
					runtimeOwnedSourceRoute: undefined,
					toolBackedOperationSession: stepResolutionSession,
				}
			}
			case "run_deterministic_procedure": {
				const procedureResult = await action.instruction.run(this.cloneWorkflowSession(session))
				if (procedureResult.kind === "failed") {
					return this.buildTerminalErrorNextAction({
						taskState,
						errorMessage: procedureResult.errorMessage,
					})
				}

				if (procedureResult.workflowValueWrites !== undefined) {
					await this.applyWorkflowValueWrites({
						taskState,
						values: procedureResult.workflowValueWrites,
					})
				}

				return this.resolveNextAction({ taskState })
			}
			case "build_workflow_document": {
				const artifactDefinition = definition.artifacts?.[action.instruction.artifactId]
				if (!artifactDefinition) {
					return { kind: "no_op" }
				}

				const destinationPath = readRequiredStringWorkflowValue({
					workflowValues: session.workflowValues,
					key: artifactDefinition.outputValueKeys.artifactAbsolutePath,
					context: `artifact destination resolution for workflow document build route ${sourceRoute.branchId}/${sourceRoute.routeId}`,
				})
				const content = await action.instruction.buildContent(session)

				session.ui.stepResolutionSession = undefined
				return {
					kind: "execute_tool_backed_operation",
					runtimeOwnedSourceRoute: sourceRoute,
					toolRequest: {
						toolName: ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
						toolInput: action.instruction.workflowValueWrites
							? {
									workflow_value_writes: action.instruction.workflowValueWrites,
								}
							: {},
						toolParams: {
							artifact_id: action.instruction.artifactId,
							destination_path: destinationPath,
							content,
						},
					},
				}
			}
			case "allocate_artifact": {
				const artifactDefinition = definition.artifacts?.[action.artifactId]
				if (!artifactDefinition || artifactDefinition.id !== action.artifactId) {
					return { kind: "no_op" }
				}

				return {
					kind: "execute_tool_backed_operation",
					runtimeOwnedSourceRoute: sourceRoute,
					toolRequest: {
						toolName: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
						toolInput: {},
						toolParams: {
							artifact_id: action.artifactId,
						},
					},
				}
			}
			case "move_project_file": {
				const filename = readRequiredStringWorkflowValue({
					workflowValues: session.workflowValues,
					key: action.filenameWorkflowValueKey,
					context: `project file move route ${sourceRoute.branchId}/${sourceRoute.routeId}`,
				})
				if (!isWorkflowDiscoveryTargetPathSegment(filename)) {
					return this.buildTerminalErrorNextAction({
						taskState,
						errorMessage: `Workflow project file move route ${sourceRoute.branchId}/${sourceRoute.routeId} resolved filename value ${filename} must be a single path segment.`,
					})
				}

				const selectedProjectRoot = this.resolveWorkflowProjectOutputFolder(session)
				const sourceFolderPath = resolveWorkflowDiscoveryTargetDirectory({
					rootDirectory: selectedProjectRoot,
					targetPathSegments: action.sourceFolderSegments,
				})
				const destinationFolderPath = resolveWorkflowDiscoveryTargetDirectory({
					rootDirectory: selectedProjectRoot,
					targetPathSegments: action.destinationFolderSegments,
				})

				session.ui.stepResolutionSession = undefined
				return {
					kind: "execute_tool_backed_operation",
					runtimeOwnedSourceRoute: sourceRoute,
					toolRequest: {
						toolName: ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE,
						toolInput: {},
						toolParams: {
							source_path: join(sourceFolderPath, filename),
							destination_path: join(destinationFolderPath, filename),
						},
					},
				}
			}
			case "update_story_index_status": {
				const storiesIndex = readRequiredStringWorkflowValue({
					workflowValues: session.workflowValues,
					key: action.storyIndexWorkflowValueKey,
					context: `story index status update route ${sourceRoute.branchId}/${sourceRoute.routeId}`,
				})
				const storyIdentity = readRequiredStringWorkflowValue({
					workflowValues: session.workflowValues,
					key: action.storyIdentityWorkflowValueKey,
					context: `story index status update route ${sourceRoute.branchId}/${sourceRoute.routeId}`,
				})
				const toolParams: Record<string, string> = {
					stories_index: storiesIndex,
					story_identity: storyIdentity,
					status: action.status,
				}
				if (action.expectedCurrentStatus !== undefined) {
					toolParams.expected_current_status = action.expectedCurrentStatus
				}

				session.ui.stepResolutionSession = undefined
				return {
					kind: "execute_tool_backed_operation",
					runtimeOwnedSourceRoute: sourceRoute,
					toolRequest: {
						toolName: ClineDefaultTool.UPDATE_STORY_INDEX_STATUS,
						toolInput: {},
						toolParams,
					},
				}
			}
			case "resolve_prerequisite_files":
				return this.buildResolvePrerequisiteFilesNextAction({
					taskState,
					definition,
					action,
				})
			case "transition_step": {
				const transitionedStep = this.transitionToStep({
					taskState,
					definition,
					target: action.target,
				})
				if (transitionedStep === undefined) {
					return { kind: "no_op" }
				}

				const reenteredNextAction = await this.resolveNextAction({ taskState })
				if (reenteredNextAction.kind !== "no_op") {
					return reenteredNextAction
				}

				const promptProjection = await this.buildTurnProjection({ taskState })
				return {
					kind: "project_prompt",
					promptProjection,
				}
			}
			case "project_prompt": {
				const promptProjection = await this.buildTurnProjection({ taskState })
				return {
					kind: "project_prompt",
					promptProjection,
				}
			}
			case "terminal_error":
				return await this.buildTerminalErrorNextAction({ taskState, errorMessage: action.errorMessage })
			case "no_op":
				return { kind: "no_op" }
			case "complete_workflow":
				await this.teardownWorkflow({ taskState })
				return { kind: "complete_workflow" }
		}
	}

	private async buildNextActionFromDecisionTreeRoute(args: {
		taskState: TaskState
		definition: WorkflowDefinition
		route: WorkflowDecisionBranchRoute
		sourceRoute: WorkflowStepResolutionSourceRoute
		nextActiveBranchId: string
	}): Promise<WorkflowNextAction> {
		const { taskState, definition, route, sourceRoute, nextActiveBranchId } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		if (route.action.kind !== "transition_step") {
			session.branchContext.activeBranchId = nextActiveBranchId
			session.branchContext.lastTriggerEvent = undefined
		}

		return this.buildNextActionFromDecisionTreeAction({
			taskState,
			definition,
			action: route.action,
			sourceRoute,
		})
	}

	private normalizeProjectFolderName(title: string): string {
		return title
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-+|-+$/g, "")
	}

	private resolveWorkflowProjectOutputFolder(session: ActiveWorkflowSession): string {
		if (session.projectSelection.projectFolderName.trim() === "") {
			throw new Error("Cannot resolve workflow artifact path without a selected project folder.")
		}

		return join(this.resolveWorkflowProjectOutputRoot(), session.projectSelection.projectFolderName)
	}

	private resolveEpicStoriesIndexPath(args: { session: ActiveWorkflowSession; epicIdentity: string }): string {
		const epicIdentity = args.epicIdentity.trim()
		const storyIndexFilename = buildEpicStoriesIndexFilename(epicIdentity)
		const storyIndexPath = join(this.resolveWorkflowProjectOutputFolder(args.session), "implementation", storyIndexFilename)
		this.assertWorkspacePathAllowed(dirname(storyIndexPath))
		this.assertWorkspacePathAllowed(storyIndexPath)
		return storyIndexPath
	}

	private resolveEpicsIndexPath(session: ActiveWorkflowSession): string {
		const epicsIndexPath = join(this.resolveWorkflowProjectOutputFolder(session), "planning", "Epics.index.json")
		this.assertWorkspacePathAllowed(dirname(epicsIndexPath))
		this.assertWorkspacePathAllowed(epicsIndexPath)
		return epicsIndexPath
	}

	private resolveDraftStoryFilePath(args: { session: ActiveWorkflowSession; storyFileName: string }): string {
		const storyFileName = args.storyFileName.trim()
		if (isWorkflowDiscoveryTargetPathSegment(storyFileName) === false) {
			throw new Error(`Story file name must be a single path segment: ${args.storyFileName}`)
		}

		const draftStoryFilePath = join(
			this.resolveWorkflowProjectOutputFolder(args.session),
			"implementation",
			"drafts",
			storyFileName,
		)
		this.assertWorkspacePathAllowed(dirname(draftStoryFilePath))
		this.assertWorkspacePathAllowed(draftStoryFilePath)
		return draftStoryFilePath
	}

	private resolveWorkflowProjectMovePath(args: {
		selectedProjectRoot: string
		filePath: string
		pathRole: "source" | "destination"
	}): string {
		if (!isAbsolute(args.filePath)) {
			throw new Error(`Workflow project file move ${args.pathRole} path must be absolute: ${args.filePath}`)
		}

		const resolvedProjectRoot = resolve(args.selectedProjectRoot)
		const resolvedFilePath = resolve(args.filePath)
		const relativeFilePath = relative(resolvedProjectRoot, resolvedFilePath)
		if (relativeFilePath === ".." || relativeFilePath.startsWith(`..${sep}`) || isAbsolute(relativeFilePath)) {
			throw new Error(
				`Workflow project file move ${args.pathRole} path must stay within selected project root: ${resolvedFilePath}`,
			)
		}

		this.assertWorkspacePathAllowed(resolvedFilePath)
		this.assertWorkspacePathAllowed(dirname(resolvedFilePath))
		return resolvedFilePath
	}

	private async resolveWorkflowArtifactAllocation(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		artifactDefinition: WorkflowArtifactDefinition
	}): Promise<WorkflowArtifactAllocationOutput> {
		const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[args.artifactDefinition.family]
		const identityResolution = await this.resolveWorkflowArtifactIdentity({
			workflow: args.workflow,
			session: args.session,
			artifactDefinition: args.artifactDefinition,
			familyDefinition,
		})
		const artifactFilename = this.buildWorkflowArtifactFilename({
			familyDefinition,
			artifactIdentity: identityResolution.artifactIdentity,
		})
		const artifactRelativePath = join(args.workflow.projectSubfolder, artifactFilename)
		const artifactAbsolutePath = join(this.resolveWorkflowProjectOutputFolder(args.session), artifactRelativePath)
		const output = {
			artifactId: args.artifactDefinition.id,
			projectTitle: args.session.projectSelection.projectTitle,
			projectFolderName: args.session.projectSelection.projectFolderName,
			artifactFamily: args.artifactDefinition.family,
			artifactIdentity: identityResolution.artifactIdentity,
			artifactFilename,
			artifactRelativePath,
			artifactAbsolutePath,
			parentIdentity: identityResolution.parentIdentity,
			targetIdentity: identityResolution.targetIdentity,
		}

		return {
			...output,
			workflowValueWrites: this.buildWorkflowArtifactOutputValueWrites({
				outputValueKeys: args.artifactDefinition.outputValueKeys,
				output,
			}),
		}
	}

	private async discoverWorkflowArtifactFilenames(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		familyDefinition: WorkflowArtifactFamilyDefinition
		searchProjectWide: boolean
	}): Promise<string[]> {
		const projectFolderName = args.session.projectSelection.projectFolderName.trim()
		if (projectFolderName === "") {
			throw new Error("Cannot discover workflow artifacts without a selected project folder.")
		}

		const subfolders = args.searchProjectWide ? WORKFLOW_PROJECT_SUBFOLDERS : [args.workflow.projectSubfolder]
		const filenames: string[] = []
		for (const subfolder of subfolders) {
			const candidates = await discoverWorkflowCandidates({
				rootDirectory: this.resolveWorkflowProjectOutputRoot(),
				workspacePathPolicy: this.workspacePathPolicy,
				targetPathSegments: [projectFolderName, subfolder],
				entryType: "file",
				immediateChildrenOnly: true,
				namingPattern: args.familyDefinition.discoveryPattern,
				sort: "alpha_asc",
				buildLabel: (entryName) => entryName,
			})
			filenames.push(...candidates.map((candidate) => candidate.value))
		}

		return filenames
	}

	private async resolveWorkflowArtifactIdentity(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		artifactDefinition: WorkflowArtifactDefinition
		familyDefinition: WorkflowArtifactFamilyDefinition
	}): Promise<WorkflowArtifactIdentityResolution> {
		switch (args.artifactDefinition.family) {
			case WorkflowArtifactFamily.Epics:
			case WorkflowArtifactFamily.EpicsIndex:
			case WorkflowArtifactFamily.BrainstormingSession:
			case WorkflowArtifactFamily.ArchitectureDocument: {
				if (args.familyDefinition.allocationMode !== "singleton_project") {
					throw new Error(`Workflow artifact ${args.artifactDefinition.id} requires a singleton project family.`)
				}

				return {
					artifactIdentity: args.familyDefinition.singletonIdentity,
					parentIdentity: undefined,
					targetIdentity: undefined,
				}
			}
			case WorkflowArtifactFamily.EpicDeliverySpec:
				return {
					artifactIdentity: await this.deriveNextEpicDeliverySpecIdentity(args),
					parentIdentity: undefined,
					targetIdentity: undefined,
				}
			case WorkflowArtifactFamily.Story: {
				const parentIdentity = this.normalizeWorkflowArtifactIdentityInput(
					this.readWorkflowArtifactIdentitySource({
						session: args.session,
						artifactId: args.artifactDefinition.id,
						sourceKey: args.artifactDefinition.parentIdentitySource.key,
					}),
				)
				const parsedParentIdentity = this.parseDottedWorkflowArtifactIdentity(parentIdentity)
				if (parsedParentIdentity.storyNumber !== undefined) {
					throw new Error(`Workflow artifact ${args.artifactDefinition.id} requires a parent epic identity.`)
				}
				await this.requireExistingWorkflowArtifactIdentity({
					workflow: args.workflow,
					session: args.session,
					family: WorkflowArtifactFamily.EpicDeliverySpec,
					identity: parentIdentity,
					artifactId: args.artifactDefinition.id,
				})

				const storyIdentity = await this.allocateNextStoryIdentity({
					workflow: args.workflow,
					session: args.session,
					parentEpicNumber: parsedParentIdentity.epicNumber,
				})

				return {
					artifactIdentity: storyIdentity,
					parentIdentity,
					targetIdentity: undefined,
				}
			}
			case WorkflowArtifactFamily.RemediationStory: {
				const parentIdentity = this.normalizeWorkflowArtifactIdentityInput(
					this.readWorkflowArtifactIdentitySource({
						session: args.session,
						artifactId: args.artifactDefinition.id,
						sourceKey: args.artifactDefinition.parentIdentitySource.key,
					}),
				)
				const parsedParentIdentity = this.parseDottedWorkflowArtifactIdentity(parentIdentity)
				if (parsedParentIdentity.storyNumber === undefined || parsedParentIdentity.remediationStoryNumber !== undefined) {
					throw new Error(`Workflow artifact ${args.artifactDefinition.id} requires a parent story identity.`)
				}
				await this.requireExistingWorkflowArtifactIdentity({
					workflow: args.workflow,
					session: args.session,
					family: WorkflowArtifactFamily.Story,
					identity: parentIdentity,
					artifactId: args.artifactDefinition.id,
				})

				const remediationStoryIdentity = await this.allocateNextRemediationStoryIdentity({
					workflow: args.workflow,
					session: args.session,
					parentEpicNumber: parsedParentIdentity.epicNumber,
					parentStoryNumber: parsedParentIdentity.storyNumber,
				})

				return {
					artifactIdentity: remediationStoryIdentity,
					parentIdentity,
					targetIdentity: undefined,
				}
			}
			case WorkflowArtifactFamily.ReviewBlindHunter:
			case WorkflowArtifactFamily.ReviewEdgeCaseHunter:
			case WorkflowArtifactFamily.AdversarialReview:
			case WorkflowArtifactFamily.ReviewInputMarkdown:
			case WorkflowArtifactFamily.ReviewInputDiff: {
				const targetIdentity = this.normalizeWorkflowArtifactIdentityInput(
					this.readWorkflowArtifactIdentitySource({
						session: args.session,
						artifactId: args.artifactDefinition.id,
						sourceKey: args.artifactDefinition.targetIdentitySource.key,
					}),
				)
				await this.requireExistingReviewTargetIdentity({
					workflow: args.workflow,
					session: args.session,
					targetIdentity,
					artifactId: args.artifactDefinition.id,
				})

				return {
					artifactIdentity: targetIdentity,
					parentIdentity: undefined,
					targetIdentity,
				}
			}
		}
	}

	private async requireExistingReviewTargetIdentity(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		targetIdentity: string
		artifactId: string
	}): Promise<void> {
		const parsedTargetIdentity = this.parseDottedWorkflowArtifactIdentity(args.targetIdentity)
		if (parsedTargetIdentity.storyNumber === undefined) {
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactId} because review artifacts require a selected story or remediation-story target.`,
			)
		}

		const targetFamily =
			parsedTargetIdentity.remediationStoryNumber === undefined
				? WorkflowArtifactFamily.Story
				: WorkflowArtifactFamily.RemediationStory

		await this.requireExistingWorkflowArtifactIdentity({
			workflow: args.workflow,
			session: args.session,
			family: targetFamily,
			identity: parsedTargetIdentity.artifactIdentity,
			artifactId: args.artifactId,
		})
	}

	private async deriveNextEpicDeliverySpecIdentity(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		artifactDefinition: WorkflowArtifactDefinition
	}): Promise<string> {
		const epicsIndex = await this.loadEpicsIndex({
			workflow: args.workflow,
			session: args.session,
			artifactId: args.artifactDefinition.id,
		})
		if (epicsIndex.epics.length === 0) {
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactDefinition.id} because Epics.index.json does not contain any indexed epics.`,
			)
		}

		const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[WorkflowArtifactFamily.EpicDeliverySpec]
		const discoveredFilenames = await this.discoverWorkflowArtifactFilenames({
			workflow: args.workflow,
			session: args.session,
			familyDefinition,
			searchProjectWide: true,
		})
		const existingDeliverySpecIdentities = new Set(
			discoveredFilenames
				.map((filename) => this.parseWorkflowArtifactFilenameIdentity(familyDefinition, filename))
				.filter((identity): identity is ParsedWorkflowArtifactIdentity => identity !== undefined)
				.map((identity) => identity.artifactIdentity),
		)
		const nextIndexedEpic = [...epicsIndex.epics]
			.sort((left, right) => Number.parseInt(left.identity, 10) - Number.parseInt(right.identity, 10))
			.find((epic) => !existingDeliverySpecIdentities.has(epic.identity))

		if (!nextIndexedEpic) {
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactDefinition.id} because every indexed epic already has a delivery spec.`,
			)
		}

		return nextIndexedEpic.identity
	}

	private async loadEpicsIndex(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		artifactId: string
	}): Promise<WorkflowEpicsIndex> {
		const epicsIndexPath = join(
			this.resolveWorkflowProjectOutputFolder(args.session),
			args.workflow.projectSubfolder,
			"Epics.index.json",
		)
		this.assertWorkspacePathAllowed(epicsIndexPath)

		let epicsIndexText: string
		try {
			epicsIndexText = await readFile(epicsIndexPath, "utf8")
		} catch (error) {
			const errorMessage = error instanceof Error ? ` ${error.message}` : ""
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json could not be read.${errorMessage}`,
			)
		}

		return this.parseEpicsIndexJson({ artifactId: args.artifactId, epicsIndexText })
	}

	private parseEpicsIndexJson(args: { artifactId: string; epicsIndexText: string }): WorkflowEpicsIndex {
		let parsedIndex: unknown
		try {
			parsedIndex = JSON.parse(args.epicsIndexText)
		} catch (error) {
			const errorMessage = error instanceof Error ? ` ${error.message}` : ""
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json is malformed JSON.${errorMessage}`,
			)
		}

		if (!this.isRecord(parsedIndex)) {
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json must be a JSON object.`,
			)
		}

		this.assertOnlyEpicsIndexKeys({
			artifactId: args.artifactId,
			record: parsedIndex,
			allowedKeys: ["version", "epics"],
			context: "Epics.index.json",
		})

		if (parsedIndex.version !== 1) {
			throw new Error(`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json version must be 1.`)
		}

		const epicsValue = parsedIndex.epics
		if (!this.isUnknownArray(epicsValue)) {
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json epics must be an array.`,
			)
		}

		const epics = epicsValue.map((entry, index) => {
			if (!this.isRecord(entry)) {
				throw new Error(
					`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json epics[${index}] must be an object.`,
				)
			}

			this.assertOnlyEpicsIndexKeys({
				artifactId: args.artifactId,
				record: entry,
				allowedKeys: ["identity", "title", "story-index-generated"],
				context: `Epics.index.json epics[${index}]`,
			})

			const identity = entry.identity
			if (typeof identity !== "string" || !/^[1-9]\d*$/.test(identity)) {
				throw new Error(
					`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json epics[${index}].identity must be a positive numeric string.`,
				)
			}

			const title = entry.title
			if (typeof title !== "string" || title.trim() === "") {
				throw new Error(
					`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json epics[${index}].title must be a non-empty string.`,
				)
			}

			const storyIndexGenerated = entry["story-index-generated"]
			if (typeof storyIndexGenerated !== "boolean") {
				throw new Error(
					`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json epics[${index}].story-index-generated must be a boolean.`,
				)
			}

			return { identity, title, "story-index-generated": storyIndexGenerated }
		})

		return { version: 1, epics }
	}

	private assertOnlyEpicsIndexKeys(args: {
		artifactId: string
		record: Record<string, unknown>
		allowedKeys: readonly string[]
		context: string
	}): void {
		for (const key of Object.keys(args.record)) {
			if (!args.allowedKeys.includes(key)) {
				throw new Error(
					`Cannot allocate workflow artifact ${args.artifactId} because ${args.context} contains unsupported key ${key}.`,
				)
			}
		}
	}

	private async allocateNextStoryIdentity(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		parentEpicNumber: number
	}): Promise<string> {
		const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[WorkflowArtifactFamily.Story]
		const discoveredFilenames = await this.discoverWorkflowArtifactFilenames({
			workflow: args.workflow,
			session: args.session,
			familyDefinition,
			searchProjectWide: true,
		})
		const existingStoryNumbers = discoveredFilenames
			.map((filename) => this.parseWorkflowArtifactFilenameIdentity(familyDefinition, filename))
			.filter((identity): identity is ParsedWorkflowArtifactIdentity => identity !== undefined)
			.filter((identity) => identity.epicNumber === args.parentEpicNumber)
			.map((identity) => identity.storyNumber)
			.filter((storyNumber): storyNumber is number => storyNumber !== undefined)

		return `${args.parentEpicNumber}.${this.getNextPositiveInteger(existingStoryNumbers)}`
	}

	private async allocateNextRemediationStoryIdentity(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		parentEpicNumber: number
		parentStoryNumber: number
	}): Promise<string> {
		const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[WorkflowArtifactFamily.RemediationStory]
		const discoveredFilenames = await this.discoverWorkflowArtifactFilenames({
			workflow: args.workflow,
			session: args.session,
			familyDefinition,
			searchProjectWide: true,
		})
		const existingRemediationStoryNumbers = discoveredFilenames
			.map((filename) => this.parseWorkflowArtifactFilenameIdentity(familyDefinition, filename))
			.filter((identity): identity is ParsedWorkflowArtifactIdentity => identity !== undefined)
			.filter(
				(identity) => identity.epicNumber === args.parentEpicNumber && identity.storyNumber === args.parentStoryNumber,
			)
			.map((identity) => identity.remediationStoryNumber)
			.filter((remediationStoryNumber): remediationStoryNumber is number => remediationStoryNumber !== undefined)

		return `${args.parentEpicNumber}.${args.parentStoryNumber}.${this.getNextPositiveInteger(existingRemediationStoryNumbers)}`
	}

	private getNextPositiveInteger(existingNumbers: readonly number[]): number {
		return existingNumbers.reduce((highestNumber, currentNumber) => Math.max(highestNumber, currentNumber), 0) + 1
	}

	private async requireExistingWorkflowArtifactIdentity(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		family: WorkflowArtifactFamily
		identity: string
		artifactId: string
	}): Promise<void> {
		const exists = await this.doesWorkflowArtifactIdentityExist(args)
		if (exists) {
			return
		}

		throw new Error(
			`Cannot allocate workflow artifact ${args.artifactId} because required artifact identity ${args.identity} was not found in the selected project.`,
		)
	}

	private async doesWorkflowArtifactIdentityExist(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		family: WorkflowArtifactFamily
		identity: string
	}): Promise<boolean> {
		const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[args.family]
		const discoveredFilenames = await this.discoverWorkflowArtifactFilenames({
			workflow: args.workflow,
			session: args.session,
			familyDefinition,
			searchProjectWide: true,
		})

		return discoveredFilenames.some((filename) => {
			const parsedIdentity = this.parseWorkflowArtifactFilenameIdentity(familyDefinition, filename)
			return parsedIdentity?.artifactIdentity === args.identity
		})
	}

	private parseWorkflowArtifactFilenameIdentity(
		familyDefinition: WorkflowArtifactFamilyDefinition,
		filename: string,
	): ParsedWorkflowArtifactIdentity | undefined {
		familyDefinition.discoveryPattern.lastIndex = 0
		const match = familyDefinition.discoveryPattern.exec(filename)
		if (!match) {
			return undefined
		}

		switch (familyDefinition.family) {
			case WorkflowArtifactFamily.Epics:
			case WorkflowArtifactFamily.EpicsIndex:
			case WorkflowArtifactFamily.BrainstormingSession:
			case WorkflowArtifactFamily.ArchitectureDocument:
				return undefined
			case WorkflowArtifactFamily.EpicDeliverySpec:
			case WorkflowArtifactFamily.EpicStoriesIndex:
				return this.parseDottedWorkflowArtifactIdentity(match[1])
			case WorkflowArtifactFamily.Story:
				return this.parseDottedWorkflowArtifactIdentity(`${match[1]}.${match[2]}`)
			case WorkflowArtifactFamily.RemediationStory:
				return this.parseDottedWorkflowArtifactIdentity(`${match[1]}.${match[2]}.${match[3]}`)
			case WorkflowArtifactFamily.ReviewBlindHunter:
			case WorkflowArtifactFamily.ReviewEdgeCaseHunter:
			case WorkflowArtifactFamily.AdversarialReview:
			case WorkflowArtifactFamily.ReviewInputMarkdown:
			case WorkflowArtifactFamily.ReviewInputDiff:
				return this.parseDottedWorkflowArtifactIdentity(match[1].replace(/-/g, "."))
		}
	}

	private normalizeWorkflowArtifactIdentityInput(rawIdentity: string): string {
		const trimmedIdentity = rawIdentity.trim()
		const epicDeliverySpecMatch = /^Epic-(\d+)-delivery-spec\.md$/.exec(trimmedIdentity)
		if (epicDeliverySpecMatch) {
			return epicDeliverySpecMatch[1]
		}

		const storyMatch = /^Story-(\d+)-(\d+)\.md$/.exec(trimmedIdentity)
		if (storyMatch) {
			return `${storyMatch[1]}.${storyMatch[2]}`
		}

		const remediationStoryMatch = /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/.exec(trimmedIdentity)
		if (remediationStoryMatch) {
			return `${remediationStoryMatch[1]}.${remediationStoryMatch[2]}.${remediationStoryMatch[3]}`
		}

		const reviewArtifactMatch =
			/^(?:Review-blind-hunter|Review-edge-case-hunter|Adversarial-review|Review-input)-(\d+-\d+(?:-\d+)?)\.(?:md|diff)$/.exec(
				trimmedIdentity,
			)
		if (reviewArtifactMatch) {
			return reviewArtifactMatch[1].replace(/-/g, ".")
		}

		return trimmedIdentity.replace(/-/g, ".")
	}

	private parseDottedWorkflowArtifactIdentity(identity: string): ParsedWorkflowArtifactIdentity {
		const segments = identity.split(".")
		if (segments.length < 1 || segments.length > 3) {
			throw new Error(`Workflow artifact identity ${identity} must use dotted numeric form.`)
		}

		const parsedSegments = segments.map((segment) => {
			if (!/^[1-9]\d*$/.test(segment)) {
				throw new Error(`Workflow artifact identity ${identity} must use dotted numeric form.`)
			}

			return Number.parseInt(segment, 10)
		})
		const epicNumber = parsedSegments[0]
		if (epicNumber === undefined) {
			throw new Error(`Workflow artifact identity ${identity} must use dotted numeric form.`)
		}

		return {
			artifactIdentity: parsedSegments.join("."),
			epicNumber,
			storyNumber: parsedSegments[1],
			remediationStoryNumber: parsedSegments[2],
		}
	}

	private readWorkflowArtifactIdentitySource(args: {
		session: ActiveWorkflowSession
		artifactId: string
		sourceKey: string
	}): string {
		return readRequiredStringWorkflowValue({
			workflowValues: args.session.workflowValues,
			key: args.sourceKey,
			context: `artifact identity resolution for workflow artifact ${args.artifactId}`,
		})
	}

	private buildWorkflowArtifactFilename(args: {
		familyDefinition: WorkflowArtifactFamilyDefinition
		artifactIdentity: string
	}): string {
		const hyphenatedIdentity = args.artifactIdentity.replace(/\./g, "-")
		const identitySegments = hyphenatedIdentity.split("-")

		return args.familyDefinition.filenamePattern
			.replace("{E}", identitySegments[0] ?? "")
			.replace("{S}", identitySegments[1] ?? "")
			.replace("{R}", identitySegments[2] ?? "")
			.replace("{target}", hyphenatedIdentity)
	}

	private buildWorkflowArtifactOutputValueWrites(args: {
		outputValueKeys: WorkflowArtifactOutputValueKeys
		output: Omit<WorkflowArtifactAllocationOutput, "workflowValueWrites">
	}): WorkflowValues {
		const workflowValueWrites: WorkflowValues = {
			[args.outputValueKeys.projectTitle]: args.output.projectTitle,
			[args.outputValueKeys.projectFolderName]: args.output.projectFolderName,
			[args.outputValueKeys.artifactFamily]: args.output.artifactFamily,
			[args.outputValueKeys.artifactIdentity]: args.output.artifactIdentity,
			[args.outputValueKeys.artifactFilename]: args.output.artifactFilename,
			[args.outputValueKeys.artifactRelativePath]: args.output.artifactRelativePath,
			[args.outputValueKeys.artifactAbsolutePath]: args.output.artifactAbsolutePath,
		}

		if (args.outputValueKeys.parentIdentity !== undefined && args.output.parentIdentity !== undefined) {
			workflowValueWrites[args.outputValueKeys.parentIdentity] = args.output.parentIdentity
		}

		if (args.outputValueKeys.targetIdentity !== undefined && args.output.targetIdentity !== undefined) {
			workflowValueWrites[args.outputValueKeys.targetIdentity] = args.output.targetIdentity
		}

		return workflowValueWrites
	}

	private areWorkflowStepResolutionSourceRoutesEqual(
		left: WorkflowStepResolutionSourceRoute,
		right: WorkflowStepResolutionSourceRoute,
	): boolean {
		return left.branchId === right.branchId && left.routeId === right.routeId
	}

	private getWorkflowDecisionRouteBySource(args: {
		step: WorkflowStepDefinition
		sourceRoute: WorkflowStepResolutionSourceRoute
	}): WorkflowDecisionBranchRoute | undefined {
		const branch = args.step.decisionTree.branches[args.sourceRoute.branchId]
		return branch?.routes.find((route) => route.id === args.sourceRoute.routeId)
	}

	private rememberSuppressedWorkflowStepResolutionRoute(
		session: ActiveWorkflowSession,
		sourceRoute: WorkflowStepResolutionSourceRoute,
	): void {
		if (
			session.ui.suppressedWorkflowStepResolutionRoutes.some((suppressedRoute) =>
				this.areWorkflowStepResolutionSourceRoutesEqual(suppressedRoute, sourceRoute),
			)
		) {
			return
		}

		session.ui.suppressedWorkflowStepResolutionRoutes.push({
			branchId: sourceRoute.branchId,
			routeId: sourceRoute.routeId,
		})
	}

	private findPendingDocumentBuildSourceRoute(args: { taskState: TaskState }): WorkflowStepResolutionSourceRoute | undefined {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return undefined
		}

		const definition = this.getActiveWorkflowDefinition(args.taskState)
		if (!definition) {
			return undefined
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return undefined
		}

		const continuationRoute = this.findContinuationSourceRoute({
			step: activeStep,
			activeBranchId: session.branchContext.activeBranchId,
			matches: ({ route }) => route.action.kind === "build_workflow_document",
		})
		if (!continuationRoute || continuationRoute.route.action.kind !== "build_workflow_document") {
			return undefined
		}

		return continuationRoute.sourceRoute
	}

	private findPendingArtifactAllocationSourceRoute(args: {
		taskState: TaskState
	}): WorkflowStepResolutionSourceRoute | undefined {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return undefined
		}

		const definition = this.getActiveWorkflowDefinition(args.taskState)
		if (!definition) {
			return undefined
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return undefined
		}

		const continuationRoute = this.findContinuationSourceRoute({
			step: activeStep,
			activeBranchId: session.branchContext.activeBranchId,
			matches: ({ route }) =>
				route.action.kind === "allocate_artifact" && definition.artifacts?.[route.action.artifactId] !== undefined,
		})
		if (!continuationRoute || continuationRoute.route.action.kind !== "allocate_artifact") {
			return undefined
		}

		return continuationRoute.sourceRoute
	}

	private createToolBackedOperationSession(args: {
		sourceRoute: WorkflowStepResolutionSourceRoute
		triggerSource: WorkflowStepResolutionSessionState["triggerSource"]
		owner: WorkflowStepResolutionSessionState["owner"]
	}): WorkflowStepResolutionSessionState {
		return {
			sessionId: randomUUID(),
			sourceRoute: {
				branchId: args.sourceRoute.branchId,
				routeId: args.sourceRoute.routeId,
			},
			triggerSource: args.triggerSource,
			owner: args.owner,
			state: "pending",
		}
	}

	private normalizeToolBackedOperationFailureMessage(errorMessage: string | undefined): string {
		const trimmedMessage = errorMessage?.trim()
		return trimmedMessage && trimmedMessage.length > 0 ? trimmedMessage : "Tool-backed operation failed."
	}

	private normalizeModelToolFailureMessage(errorMessage: string | undefined): string {
		const trimmedMessage = errorMessage?.trim()
		return trimmedMessage && trimmedMessage.length > 0 ? trimmedMessage : "Model-called tool failed."
	}

	private isClineDefaultTool(value: unknown): value is ClineDefaultTool {
		return typeof value === "string" && toolUseNames.some((toolName) => toolName === value)
	}

	private isToolProjectedByWorkflowStep(args: {
		session: ActiveWorkflowSession
		step: WorkflowStepDefinition
		toolName: ClineDefaultTool
	}): boolean {
		const projectedToolSchema = args.step.buildToolSchema({
			session: args.session,
			step: args.step,
			renderWorkflowValue: stringifyWorkflowValueForPrompt,
		})

		return projectedToolSchema.some((toolSpec) => toolSpec.id === args.toolName)
	}

	private isRuntimeOwnedWorkflowTool(toolName: string): boolean {
		switch (toolName) {
			case ClineDefaultTool.SET_WORKFLOW_VALUES:
			case ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT:
			case ClineDefaultTool.ARCHIVE_WORKFLOW_ARTIFACT:
			case ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT:
			case ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE:
			case ClineDefaultTool.UPDATE_STORY_INDEX_STATUS:
			case ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT:
			case ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST:
				return true
			default:
				return false
		}
	}

	private joinPromptSections(sections: Array<string | undefined>): string | undefined {
		const nonEmptySections = sections
			.map((section) => section?.trim())
			.filter((section): section is string => section !== undefined && section.length > 0)

		return nonEmptySections.length > 0 ? nonEmptySections.join("\n\n") : undefined
	}

	private async buildTerminalErrorNextAction(args: {
		taskState: TaskState
		errorMessage?: string
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const normalizedErrorMessage = this.normalizeToolBackedOperationFailureMessage(
			args.errorMessage ?? session.branchContext.failureState?.terminalErrorMessage,
		)

		await this.teardownWorkflow({ taskState: args.taskState })

		return {
			kind: "terminal_error",
			errorMessage: normalizedErrorMessage,
		}
	}

	private async completeToolBackedOperationSuccess(args: {
		taskState: TaskState
		sourceRoute: WorkflowStepResolutionSourceRoute
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		session.branchContext.lastTriggerEvent = {
			kind: "tool_backed_operation_succeeded",
			sourceRoute: {
				branchId: args.sourceRoute.branchId,
				routeId: args.sourceRoute.routeId,
			},
		}
		session.branchContext.failureState = undefined
		return this.resolveNextAction({ taskState: args.taskState })
	}

	private async completeToolBackedOperationFailure(args: {
		taskState: TaskState
		sourceRoute: WorkflowStepResolutionSourceRoute
		errorMessage?: string
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const normalizedErrorMessage = this.normalizeToolBackedOperationFailureMessage(args.errorMessage)
		const previousRetryAttemptCount = session.branchContext.failureState?.retryAttemptCount ?? 0
		session.branchContext.lastTriggerEvent = {
			kind: "tool_backed_operation_failed",
			sourceRoute: {
				branchId: args.sourceRoute.branchId,
				routeId: args.sourceRoute.routeId,
			},
			errorMessage: normalizedErrorMessage,
		}
		session.branchContext.failureState = {
			retryAttemptCount: previousRetryAttemptCount + 1,
			terminalErrorMessage: normalizedErrorMessage,
		}
		return this.resolveNextAction({ taskState: args.taskState })
	}

	private validateWorkflowDefinition(workflow: WorkflowDefinition): WorkflowValidationResult {
		if (workflow.name.trim() === "") {
			return { valid: false, errorMessage: "Workflow name must not be empty." }
		}

		if (workflow.displayName.trim() === "") {
			return { valid: false, errorMessage: "Workflow displayName must not be empty." }
		}

		if (workflow.description.trim() === "") {
			return { valid: false, errorMessage: "Workflow description must not be empty." }
		}

		if (workflow.slashCommandName.trim() === "") {
			return { valid: false, errorMessage: "Workflow slashCommandName must not be empty." }
		}

		if (workflow.useSkillName.trim() === "") {
			return { valid: false, errorMessage: "Workflow useSkillName must not be empty." }
		}

		if (workflow.persona.name.trim() === "") {
			return { valid: false, errorMessage: "Workflow persona name must not be empty." }
		}

		if (workflow.persona.role.trim() === "") {
			return { valid: false, errorMessage: "Workflow persona role must not be empty." }
		}

		if (workflow.persona.identity.trim() === "") {
			return { valid: false, errorMessage: "Workflow persona identity must not be empty." }
		}

		if (!workflow.persona.capabilities.some((capability) => capability.trim() !== "")) {
			return { valid: false, errorMessage: "Workflow persona capabilities must not be empty." }
		}

		if (workflow.persona.communicationStyle.trim() === "") {
			return { valid: false, errorMessage: "Workflow persona communicationStyle must not be empty." }
		}

		if (!workflow.persona.principles.some((principle) => principle.trim() !== "")) {
			return { valid: false, errorMessage: "Workflow persona principles must not be empty." }
		}

		if (workflow.entryPanel.promptMarkdown.trim() === "") {
			return { valid: false, errorMessage: "Workflow entryPanel promptMarkdown must not be empty." }
		}

		const workflowValueKeys = new Set<string>()
		for (const workflowValueKey of workflow.workflowValueKeys) {
			if (workflowValueKey.trim() === "") {
				return { valid: false, errorMessage: "Workflow workflowValueKeys entries must not be empty." }
			}

			if (workflowValueKey.trim() !== workflowValueKey) {
				return {
					valid: false,
					errorMessage: `Workflow workflowValueKeys entry ${workflowValueKey} must already be trimmed.`,
				}
			}

			if (workflowValueKeys.has(workflowValueKey)) {
				return {
					valid: false,
					errorMessage: `Workflow workflowValueKeys entry ${workflowValueKey} is duplicated.`,
				}
			}
			workflowValueKeys.add(workflowValueKey)
		}

		const entryProjectValueKeys = [
			{
				name: "projectMode",
				workflowValueKey: workflow.entryProjectValueKeys.projectMode,
			},
			{
				name: "projectTitle",
				workflowValueKey: workflow.entryProjectValueKeys.projectTitle,
			},
			{
				name: "projectFolderName",
				workflowValueKey: workflow.entryProjectValueKeys.projectFolderName,
			},
		]
		for (const entryProjectValueKey of entryProjectValueKeys) {
			if (entryProjectValueKey.workflowValueKey.trim() === "") {
				return {
					valid: false,
					errorMessage: `Workflow entryProjectValueKeys.${entryProjectValueKey.name} must not be empty.`,
				}
			}
			if (entryProjectValueKey.workflowValueKey.trim() !== entryProjectValueKey.workflowValueKey) {
				return {
					valid: false,
					errorMessage: `Workflow entryProjectValueKeys.${entryProjectValueKey.name} ${entryProjectValueKey.workflowValueKey} must already be trimmed.`,
				}
			}
			if (!workflowValueKeys.has(entryProjectValueKey.workflowValueKey)) {
				return {
					valid: false,
					errorMessage: `Workflow entryProjectValueKeys.${entryProjectValueKey.name} ${entryProjectValueKey.workflowValueKey} must be declared in workflowValueKeys.`,
				}
			}
		}

		const steps = Object.values(workflow.steps)
		if (steps.length === 0) {
			return { valid: false, errorMessage: "Workflow must contain at least one step." }
		}

		const seenStepNumbers = new Set<number>()
		const workflowForms = workflow.workflowForms ?? {}
		const artifacts = workflow.artifacts ?? {}
		const prerequisiteFiles = workflow.prerequisiteFiles ?? {}

		for (const [workflowFormId, workflowForm] of Object.entries(workflowForms)) {
			for (const panel of Object.values(workflowForm.panels)) {
				for (const field of panel.fields) {
					const jsonOptionsSourceValidation = this.validateWorkflowFormJsonOptionsSourceConfig({
						workflowFormId,
						field,
					})
					if (jsonOptionsSourceValidation.valid === false) {
						return jsonOptionsSourceValidation
					}

					for (const targetPathSegment of field.selectorDiscovery?.targetPathSegments ?? []) {
						if (!isWorkflowDiscoveryTargetPathSegment(targetPathSegment)) {
							return {
								valid: false,
								errorMessage: `Workflow form ${workflowFormId} field ${field.key} selectorDiscovery targetPathSegments entry ${targetPathSegment} is invalid.`,
							}
						}
					}

					if (field.workflowValueKey === undefined) {
						continue
					}
					if (field.workflowValueKey.trim() === "") {
						return {
							valid: false,
							errorMessage: `Workflow form ${workflowFormId} field ${field.key} workflowValueKey must not be empty.`,
						}
					}
					if (field.workflowValueKey.trim() !== field.workflowValueKey) {
						return {
							valid: false,
							errorMessage: `Workflow form ${workflowFormId} field ${field.key} workflowValueKey ${field.workflowValueKey} must already be trimmed.`,
						}
					}
					if (!workflowValueKeys.has(field.workflowValueKey)) {
						return {
							valid: false,
							errorMessage: `Workflow form ${workflowFormId} field ${field.key} workflowValueKey ${field.workflowValueKey} must be declared in workflowValueKeys.`,
						}
					}
				}
			}
		}

		for (const [artifactId, artifactDefinition] of Object.entries(artifacts)) {
			const artifactValidation = this.validateWorkflowArtifactDefinition({
				artifactId,
				artifactDefinition,
				workflowValueKeys,
			})
			if (!artifactValidation.valid) {
				return artifactValidation
			}
		}

		for (const [prerequisiteId, prerequisiteDefinition] of Object.entries(prerequisiteFiles)) {
			if (prerequisiteDefinition.id !== prerequisiteId) {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} must have a matching prerequisite id.`,
				}
			}
			if (prerequisiteDefinition.id.trim() === "") {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} id must not be empty.`,
				}
			}
			if (prerequisiteDefinition.id.trim() !== prerequisiteDefinition.id) {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} id ${prerequisiteDefinition.id} must already be trimmed.`,
				}
			}
			if (prerequisiteDefinition.producingWorkflowName.trim() === "") {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} producingWorkflowName must not be empty.`,
				}
			}
			if (prerequisiteDefinition.producingWorkflowName.trim() !== prerequisiteDefinition.producingWorkflowName) {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} producingWorkflowName ${prerequisiteDefinition.producingWorkflowName} must already be trimmed.`,
				}
			}
			if (prerequisiteDefinition.workflowValueKey.trim() === "") {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} workflowValueKey must not be empty.`,
				}
			}
			if (prerequisiteDefinition.workflowValueKey.trim() !== prerequisiteDefinition.workflowValueKey) {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} workflowValueKey ${prerequisiteDefinition.workflowValueKey} must already be trimmed.`,
				}
			}
			if (!workflowValueKeys.has(prerequisiteDefinition.workflowValueKey)) {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} workflowValueKey ${prerequisiteDefinition.workflowValueKey} must be declared in workflowValueKeys.`,
				}
			}
			if (prerequisiteDefinition.requirement !== "required" && prerequisiteDefinition.requirement !== "optional") {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} requirement must be required or optional.`,
				}
			}
			if (
				prerequisiteDefinition.outputDocumentReference !== "none" &&
				prerequisiteDefinition.outputDocumentReference !== "module_document_builder"
			) {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} outputDocumentReference must be none or module_document_builder.`,
				}
			}
			for (const projectSubfolderSegment of prerequisiteDefinition.projectSubfolderSegments) {
				if (!isWorkflowDiscoveryTargetPathSegment(projectSubfolderSegment)) {
					return {
						valid: false,
						errorMessage: `Workflow prerequisite file ${prerequisiteId} projectSubfolderSegments entry ${projectSubfolderSegment} is invalid.`,
					}
				}
			}
			const prerequisiteMatch = prerequisiteDefinition.match
			if (!this.isRecord(prerequisiteMatch)) {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} match must be a valid object.`,
				}
			}
			const prerequisiteMatchKind = prerequisiteMatch.kind
			if (typeof prerequisiteMatchKind !== "string") {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} match kind must be exact_filename or naming_pattern.`,
				}
			}
			if (prerequisiteMatchKind === "exact_filename") {
				const exactFilename = prerequisiteMatch.filename
				if (typeof exactFilename !== "string") {
					return {
						valid: false,
						errorMessage: `Workflow prerequisite file ${prerequisiteId} exact filename must be a string.`,
					}
				}
				if (exactFilename.trim() === "") {
					return {
						valid: false,
						errorMessage: `Workflow prerequisite file ${prerequisiteId} exact filename must not be empty.`,
					}
				}
				if (exactFilename.trim() !== exactFilename) {
					return {
						valid: false,
						errorMessage: `Workflow prerequisite file ${prerequisiteId} exact filename ${exactFilename} must already be trimmed.`,
					}
				}
				if (!isWorkflowDiscoveryTargetPathSegment(exactFilename)) {
					return {
						valid: false,
						errorMessage: `Workflow prerequisite file ${prerequisiteId} exact filename ${exactFilename} is invalid.`,
					}
				}
			} else if (prerequisiteMatchKind === "naming_pattern") {
				if (!(prerequisiteMatch.pattern instanceof RegExp)) {
					return {
						valid: false,
						errorMessage: `Workflow prerequisite file ${prerequisiteId} naming_pattern pattern must be a RegExp.`,
					}
				}
			} else {
				return {
					valid: false,
					errorMessage: `Workflow prerequisite file ${prerequisiteId} match kind ${prerequisiteMatchKind} is invalid.`,
				}
			}
		}

		for (const inheritanceRule of workflow.childInheritance ?? []) {
			if (!workflowValueKeys.has(inheritanceRule.childKey)) {
				return {
					valid: false,
					errorMessage: `Workflow childInheritance childKey ${inheritanceRule.childKey} must be declared in workflowValueKeys.`,
				}
			}
		}

		for (const step of steps) {
			if (step.id !== `step-${step.stepNumber}`) {
				return { valid: false, errorMessage: `Workflow step id must match step-${step.stepNumber}.` }
			}

			if (step.checklistLabel.trim() === "") {
				return { valid: false, errorMessage: `Workflow step ${step.id} checklistLabel must not be empty.` }
			}

			if (seenStepNumbers.has(step.stepNumber)) {
				return { valid: false, errorMessage: `Workflow stepNumber ${step.stepNumber} is duplicated.` }
			}
			seenStepNumbers.add(step.stepNumber)

			const entryBranch = step.decisionTree.branches[step.decisionTree.entryBranchId]
			if (!entryBranch) {
				return {
					valid: false,
					errorMessage: `Workflow step ${step.id} has an invalid decision-tree entryBranchId ${step.decisionTree.entryBranchId}.`,
				}
			}

			for (const [branchId, branch] of Object.entries(step.decisionTree.branches)) {
				if (branch.id !== branchId) {
					return {
						valid: false,
						errorMessage: `Workflow step ${step.id} decision-tree branch ${branchId} must have a matching branch id.`,
					}
				}

				if (branch.routes.length === 0) {
					return {
						valid: false,
						errorMessage: `Workflow step ${step.id} decision-tree branch ${branch.id} must declare at least one route.`,
					}
				}

				const seenRouteIds = new Set<string>()
				for (const route of branch.routes) {
					if (typeof route.id !== "string" || route.id.trim() === "") {
						return {
							valid: false,
							errorMessage: `Workflow step ${step.id} decision-tree branch ${branch.id} route id must be a non-empty string.`,
						}
					}

					if (seenRouteIds.has(route.id)) {
						return {
							valid: false,
							errorMessage: `Workflow step ${step.id} decision-tree branch ${branch.id} route id ${route.id} is duplicated.`,
						}
					}
					seenRouteIds.add(route.id)

					if (route.action.kind === "transition_step" && route.followingBranchId !== undefined) {
						return {
							valid: false,
							errorMessage: `Workflow step ${step.id} route ${route.id} transition_step action must not declare followingBranchId.`,
						}
					}

					if (
						route.followingBranchId !== undefined &&
						step.decisionTree.branches[route.followingBranchId] === undefined
					) {
						return {
							valid: false,
							errorMessage: `Workflow step ${step.id} route ${route.id} references missing followingBranchId ${route.followingBranchId}.`,
						}
					}

					switch (route.action.kind) {
						case "render_workflow_form": {
							const workflowForm = workflowForms[route.action.workflowFormId]
							if (workflowForm === undefined) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} references missing workflowFormId ${route.action.workflowFormId}.`,
								}
							}
							if ("startPanelId" in route.action) {
								const startPanelId = route.action.startPanelId
								if (typeof startPanelId !== "string" || startPanelId.trim() === "") {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} render_workflow_form startPanelId must be a non-empty string.`,
									}
								}
								if (startPanelId.trim() !== startPanelId) {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} render_workflow_form startPanelId ${startPanelId} must already be trimmed.`,
									}
								}
								if (workflowForm.panels[startPanelId] === undefined) {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} render_workflow_form references missing startPanelId ${startPanelId}.`,
									}
								}
							}
							if ("buildSessionData" in route.action && typeof route.action.buildSessionData !== "function") {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} render_workflow_form buildSessionData must be a function.`,
								}
							}
							break
						}
						case "execute_tool_backed_operation":
							if (
								typeof route.action.instruction.toolName !== "string" ||
								route.action.instruction.toolName.trim() === ""
							) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} inline tool-backed action toolName must not be empty.`,
								}
							}
							if (this.isRuntimeOwnedWorkflowTool(route.action.instruction.toolName)) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} inline tool-backed action must not use runtime-owned tool ${route.action.instruction.toolName}.`,
								}
							}
							if (
								typeof route.action.instruction.buildStatusDefinition !== "function" ||
								typeof route.action.instruction.buildToolExecutionRequest !== "function" ||
								typeof route.action.instruction.evaluateToolExecutionResult !== "function"
							) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} inline tool-backed action must declare all instruction functions.`,
								}
							}
							break
						case "run_deterministic_procedure":
							if (!this.isRecord(route.action.instruction) || typeof route.action.instruction.run !== "function") {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} deterministic procedure action must declare a run function.`,
								}
							}
							break
						case "build_workflow_document":
							if (typeof route.action.instruction.artifactId !== "string") {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} document build action artifactId must be a string.`,
								}
							}
							if (route.action.instruction.artifactId.trim() === "") {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} document build action artifactId must not be empty.`,
								}
							}
							if (artifacts[route.action.instruction.artifactId] === undefined) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} document build action references missing artifactId ${route.action.instruction.artifactId}.`,
								}
							}
							if (typeof route.action.instruction.buildContent !== "function") {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} document build action buildContent must be a function.`,
								}
							}
							for (const [workflowValueWriteKey, workflowValueWriteValue] of Object.entries(
								route.action.instruction.workflowValueWrites ?? {},
							)) {
								if (!workflowValueKeys.has(workflowValueWriteKey)) {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} document build action writes undeclared workflow value key ${workflowValueWriteKey}.`,
									}
								}
								if (!isWorkflowValue(workflowValueWriteValue)) {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} document build action writes invalid workflow value key ${workflowValueWriteKey}.`,
									}
								}
							}
							break
						case "allocate_artifact":
							if (artifacts[route.action.artifactId] === undefined) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} references missing artifactId ${route.action.artifactId}.`,
								}
							}
							break
						case "move_project_file":
							for (const sourceFolderSegment of route.action.sourceFolderSegments) {
								if (!isWorkflowDiscoveryTargetPathSegment(sourceFolderSegment)) {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} move_project_file sourceFolderSegments entry ${sourceFolderSegment} is invalid.`,
									}
								}
							}
							for (const destinationFolderSegment of route.action.destinationFolderSegments) {
								if (!isWorkflowDiscoveryTargetPathSegment(destinationFolderSegment)) {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} move_project_file destinationFolderSegments entry ${destinationFolderSegment} is invalid.`,
									}
								}
							}
							if (route.action.filenameWorkflowValueKey.trim() === "") {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} move_project_file filenameWorkflowValueKey must not be empty.`,
								}
							}
							if (route.action.filenameWorkflowValueKey.trim() !== route.action.filenameWorkflowValueKey) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} move_project_file filenameWorkflowValueKey ${route.action.filenameWorkflowValueKey} must already be trimmed.`,
								}
							}
							if (!workflowValueKeys.has(route.action.filenameWorkflowValueKey)) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} move_project_file filenameWorkflowValueKey ${route.action.filenameWorkflowValueKey} must be declared in workflowValueKeys.`,
								}
							}
							break
						case "update_story_index_status": {
							const workflowValueKeyChecks = [
								{
									name: "storyIndexWorkflowValueKey",
									key: route.action.storyIndexWorkflowValueKey,
								},
								{
									name: "storyIdentityWorkflowValueKey",
									key: route.action.storyIdentityWorkflowValueKey,
								},
							] as const
							for (const workflowValueKeyCheck of workflowValueKeyChecks) {
								if (workflowValueKeyCheck.key.trim() === "") {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} update_story_index_status ${workflowValueKeyCheck.name} must not be empty.`,
									}
								}
								if (workflowValueKeyCheck.key.trim() !== workflowValueKeyCheck.key) {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} update_story_index_status ${workflowValueKeyCheck.name} ${workflowValueKeyCheck.key} must already be trimmed.`,
									}
								}
								if (!workflowValueKeys.has(workflowValueKeyCheck.key)) {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} update_story_index_status ${workflowValueKeyCheck.name} ${workflowValueKeyCheck.key} must be declared in workflowValueKeys.`,
									}
								}
							}
							break
						}
						case "resolve_prerequisite_files": {
							if (route.action.prerequisiteIds.length === 0) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} resolve_prerequisite_files prerequisiteIds must not be empty.`,
								}
							}
							const seenPrerequisiteIds = new Set<string>()
							for (const prerequisiteId of route.action.prerequisiteIds) {
								if (prerequisiteId.trim() === "") {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} resolve_prerequisite_files prerequisiteIds entry must not be empty.`,
									}
								}
								if (prerequisiteId.trim() !== prerequisiteId) {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} resolve_prerequisite_files prerequisiteIds entry ${prerequisiteId} must already be trimmed.`,
									}
								}
								if (seenPrerequisiteIds.has(prerequisiteId)) {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} resolve_prerequisite_files prerequisiteIds entry ${prerequisiteId} is duplicated.`,
									}
								}
								seenPrerequisiteIds.add(prerequisiteId)
								if (prerequisiteFiles[prerequisiteId] === undefined) {
									return {
										valid: false,
										errorMessage: `Workflow step ${step.id} route ${route.id} resolve_prerequisite_files references missing prerequisite id ${prerequisiteId}.`,
									}
								}
							}
							break
						}
						case "transition_step": {
							const targetStep = workflow.steps[`step-${route.action.target.stepNumber}`]
							if (targetStep === undefined) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} transition_step action references missing target step ${route.action.target.stepNumber}.`,
								}
							}
							if (
								route.action.target.kind === "named_branch" &&
								targetStep.decisionTree.branches[route.action.target.branchId] === undefined
							) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} transition_step action references missing target branch ${route.action.target.branchId} on step ${targetStep.id}.`,
								}
							}
							break
						}
						case "project_prompt":
							break
						case "terminal_error":
							if (route.action.errorMessage.trim().length === 0) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} terminal_error errorMessage must not be empty.`,
								}
							}
							break
						case "complete_workflow":
						case "no_op":
							break
					}
				}
			}
		}

		return { valid: true }
	}

	private validateWorkflowArtifactDefinition(args: {
		artifactId: string
		artifactDefinition: WorkflowArtifactDefinition
		workflowValueKeys: Set<string>
	}): WorkflowValidationResult {
		const artifactRecord = args.artifactDefinition as Record<string, unknown>
		if (args.artifactDefinition.id !== args.artifactId) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} must have a matching artifact id.`,
			}
		}

		for (const forbiddenKey of [
			"filenamePattern",
			"fileExtension",
			"extension",
			"contentKind",
			"numberingScope",
			"singletonIdentity",
			"discoveryPattern",
		]) {
			if (forbiddenKey in artifactRecord) {
				return {
					valid: false,
					errorMessage: `Workflow artifact ${args.artifactId} must not declare runtime-owned ${forbiddenKey}.`,
				}
			}
		}

		const artifactFamily = artifactRecord.family
		if (typeof artifactFamily !== "string" || !(artifactFamily in WORKFLOW_ARTIFACT_FAMILY_REGISTRY)) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} references unknown artifact family ${String(artifactFamily)}.`,
			}
		}

		const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[artifactFamily as WorkflowArtifactFamily]
		const outputValueKeyValidation = this.validateWorkflowArtifactOutputValueKeys({
			artifactId: args.artifactId,
			familyDefinition,
			outputValueKeys: artifactRecord.outputValueKeys,
			workflowValueKeys: args.workflowValueKeys,
		})
		if (!outputValueKeyValidation.valid) {
			return outputValueKeyValidation
		}

		if (
			(familyDefinition.allocationMode === "singleton_project" ||
				familyDefinition.allocationMode === "derived_from_epic_index" ||
				familyDefinition.allocationMode === "new_numbered") &&
			args.artifactDefinition.intentMode !== "new"
		) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} must declare new artifact intent.`,
			}
		}

		if (familyDefinition.allocationMode === "derived_from_target" && args.artifactDefinition.intentMode !== "derived") {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} must declare derived artifact intent.`,
			}
		}

		switch (familyDefinition.identityRequirement) {
			case "none":
			case "epic_index":
				if (
					args.artifactDefinition.parentIdentitySource !== undefined ||
					args.artifactDefinition.targetIdentitySource !== undefined
				) {
					return {
						valid: false,
						errorMessage: `Workflow artifact ${args.artifactId} must not declare parent or target identity sources.`,
					}
				}
				break
			case "parent_epic_delivery_spec":
			case "parent_story": {
				if (args.artifactDefinition.targetIdentitySource !== undefined) {
					return {
						valid: false,
						errorMessage: `Workflow artifact ${args.artifactId} must not declare targetIdentitySource.`,
					}
				}
				const parentSourceValidation = this.validateWorkflowArtifactIdentitySource({
					artifactId: args.artifactId,
					sourceName: "parentIdentitySource",
					source: artifactRecord.parentIdentitySource,
					workflowValueKeys: args.workflowValueKeys,
				})
				if (!parentSourceValidation.valid) {
					return parentSourceValidation
				}
				break
			}
			case "target_story_or_remediation_story": {
				if (args.artifactDefinition.parentIdentitySource !== undefined) {
					return {
						valid: false,
						errorMessage: `Workflow artifact ${args.artifactId} must not declare parentIdentitySource.`,
					}
				}
				const targetSourceValidation = this.validateWorkflowArtifactIdentitySource({
					artifactId: args.artifactId,
					sourceName: "targetIdentitySource",
					source: artifactRecord.targetIdentitySource,
					workflowValueKeys: args.workflowValueKeys,
				})
				if (!targetSourceValidation.valid) {
					return targetSourceValidation
				}
				break
			}
		}

		return { valid: true }
	}

	private validateWorkflowArtifactIdentitySource(args: {
		artifactId: string
		sourceName: "parentIdentitySource" | "targetIdentitySource"
		source: unknown
		workflowValueKeys: Set<string>
	}): WorkflowValidationResult {
		if (!this.isRecord(args.source)) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} must declare ${args.sourceName}.`,
			}
		}

		if (args.source.kind !== "workflow_value") {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} ${args.sourceName} must use workflow_value.`,
			}
		}

		const sourceKey = args.source.key
		if (typeof sourceKey !== "string" || sourceKey.trim() === "") {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} ${args.sourceName} key must not be empty.`,
			}
		}

		if (sourceKey.trim() !== sourceKey) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} ${args.sourceName} key ${sourceKey} must already be trimmed.`,
			}
		}

		if (!args.workflowValueKeys.has(sourceKey)) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} ${args.sourceName} key ${sourceKey} must be declared in workflowValueKeys.`,
			}
		}

		return { valid: true }
	}

	private validateWorkflowArtifactOutputValueKeys(args: {
		artifactId: string
		familyDefinition: WorkflowArtifactFamilyDefinition
		outputValueKeys: unknown
		workflowValueKeys: Set<string>
	}): WorkflowValidationResult {
		if (!this.isRecord(args.outputValueKeys)) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} must declare outputValueKeys.`,
			}
		}

		for (const outputKeyName of [
			"projectTitle",
			"projectFolderName",
			"artifactFamily",
			"artifactIdentity",
			"artifactFilename",
			"artifactRelativePath",
			"artifactAbsolutePath",
		]) {
			const outputKeyValidation = this.validateWorkflowArtifactOutputKey({
				artifactId: args.artifactId,
				outputValueKeys: args.outputValueKeys,
				outputKeyName,
				required: true,
				workflowValueKeys: args.workflowValueKeys,
			})
			if (!outputKeyValidation.valid) {
				return outputKeyValidation
			}
		}

		switch (args.familyDefinition.identityRequirement) {
			case "none":
			case "epic_index":
				if (args.outputValueKeys.parentIdentity !== undefined || args.outputValueKeys.targetIdentity !== undefined) {
					return {
						valid: false,
						errorMessage: `Workflow artifact ${args.artifactId} must not declare parent or target output keys.`,
					}
				}
				break
			case "parent_epic_delivery_spec":
			case "parent_story": {
				const parentOutputKeyValidation = this.validateWorkflowArtifactOutputKey({
					artifactId: args.artifactId,
					outputValueKeys: args.outputValueKeys,
					outputKeyName: "parentIdentity",
					required: true,
					workflowValueKeys: args.workflowValueKeys,
				})
				if (!parentOutputKeyValidation.valid) {
					return parentOutputKeyValidation
				}
				if (args.outputValueKeys.targetIdentity !== undefined) {
					return {
						valid: false,
						errorMessage: `Workflow artifact ${args.artifactId} must not declare target output key.`,
					}
				}
				break
			}
			case "target_story_or_remediation_story": {
				const targetOutputKeyValidation = this.validateWorkflowArtifactOutputKey({
					artifactId: args.artifactId,
					outputValueKeys: args.outputValueKeys,
					outputKeyName: "targetIdentity",
					required: true,
					workflowValueKeys: args.workflowValueKeys,
				})
				if (!targetOutputKeyValidation.valid) {
					return targetOutputKeyValidation
				}
				if (args.outputValueKeys.parentIdentity !== undefined) {
					return {
						valid: false,
						errorMessage: `Workflow artifact ${args.artifactId} must not declare parent output key.`,
					}
				}
				break
			}
		}

		return { valid: true }
	}

	private validateWorkflowArtifactOutputKey(args: {
		artifactId: string
		outputValueKeys: Record<string, unknown>
		outputKeyName: string
		required: boolean
		workflowValueKeys: Set<string>
	}): WorkflowValidationResult {
		const outputValueKey = args.outputValueKeys[args.outputKeyName]
		if (outputValueKey === undefined && !args.required) {
			return { valid: true }
		}

		if (typeof outputValueKey !== "string" || outputValueKey.trim() === "") {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} outputValueKeys.${args.outputKeyName} must not be empty.`,
			}
		}

		if (outputValueKey.trim() !== outputValueKey) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} outputValueKeys.${args.outputKeyName} ${outputValueKey} must already be trimmed.`,
			}
		}

		if (!args.workflowValueKeys.has(outputValueKey)) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} outputValueKeys.${args.outputKeyName} ${outputValueKey} must be declared in workflowValueKeys.`,
			}
		}

		return { valid: true }
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null
	}

	private isUnknownArray(value: unknown): value is unknown[] {
		return Array.isArray(value)
	}

	private async ensureProjectFoldersExist(session: ActiveWorkflowSession): Promise<void> {
		const projectOutputRoot = this.resolveWorkflowProjectOutputRoot()
		this.assertWorkspacePathAllowed(projectOutputRoot)
		const projectRoot = join(projectOutputRoot, session.projectSelection.projectFolderName)
		this.assertWorkspacePathAllowed(projectRoot)
		const projectSubfolderPaths = WORKFLOW_PROJECT_SUBFOLDERS.map((subfolderName) => join(projectRoot, subfolderName))
		const implementationStoryFolderPaths = WORKFLOW_IMPLEMENTATION_STORY_CHILD_FOLDERS.map((folderName) =>
			join(projectRoot, "implementation", folderName),
		)
		const projectFolderPaths = [...projectSubfolderPaths, ...implementationStoryFolderPaths]
		for (const projectFolderPath of projectFolderPaths) {
			this.assertWorkspacePathAllowed(projectFolderPath)
		}

		await mkdir(projectOutputRoot, { recursive: true })
		await mkdir(projectRoot, { recursive: true })

		for (const projectFolderPath of projectFolderPaths) {
			await mkdir(projectFolderPath, { recursive: true })
		}
	}

	private refreshCurrentFocusChainChecklist(taskState: TaskState): void {
		const session = taskState.activeWorkflowSession
		if (!session) {
			taskState.currentFocusChainChecklist = null
			return
		}

		const definition = this.getActiveWorkflowDefinition(taskState)
		if (!definition) {
			taskState.currentFocusChainChecklist = null
			return
		}

		const validationResult = this.validateWorkflowDefinition(definition)
		if (!validationResult.valid || !this.getActiveStepDefinition(definition, session)) {
			taskState.currentFocusChainChecklist = null
			return
		}

		taskState.currentFocusChainChecklist = this.buildWorkflowStepChecklist(definition, session)
	}

	private buildWorkflowStepChecklist(definition: WorkflowDefinition, session: ActiveWorkflowSession): string {
		return Object.values(definition.steps)
			.sort((left, right) => left.stepNumber - right.stepNumber)
			.map((step) => {
				const status =
					step.stepNumber < session.activeStepNumber
						? "Complete"
						: step.stepNumber === session.activeStepNumber
							? "Active"
							: "Not Started"
				return `${step.stepNumber}. ${step.checklistLabel} - ${status}`
			})
			.join("\n")
	}
}
