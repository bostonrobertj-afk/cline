import type {
	WorkflowFormDefinitionPayload,
	WorkflowFormFieldDefinition,
	WorkflowFormFieldKind,
	WorkflowFormPanelDefinition,
} from "@shared/ExtensionMessage"
import { WorkflowFormAction, WorkflowFormSubmissionRequest, type WorkflowFormValue } from "@shared/proto/cline/task"
import { expect } from "chai"
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises"
import { afterEach, beforeEach, describe, it } from "mocha"
import { tmpdir } from "os"
import { dirname, join } from "path"
import * as sinon from "sinon"
import { formatResponse } from "@/core/prompts/responses"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { TaskState } from "@/core/task/TaskState"
import type {
	WorkflowStepResolutionSourceRoute,
	WorkflowToolBackedActionInstruction,
} from "@/core/task/workflow-step-resolution/types"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { WorkflowArtifactFamily } from "../artifactFamilies"
import * as WorkflowDiscovery from "../discovery"
import {
	parseWorkflowStoryIndexJson,
	stringifyWorkflowStoryIndex,
	type WorkflowStoryIndex,
	type WorkflowStoryStatus,
} from "../storyArtifacts"
import { buildWorkflowStoryFileTemplate } from "../storyFileTemplate"
import type {
	ActiveWorkflowSession,
	PersistedWorkflowSession,
	WorkflowDecisionAction,
	WorkflowDecisionBranchRoute,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowDeterministicProcedureResult,
	WorkflowDiscoveryRequest,
	WorkflowDocumentBuildActionInstruction,
	WorkflowEntryArtifactResolution,
	WorkflowEntryProjectValueKeys,
	WorkflowNextAction,
	WorkflowPersonaDefinition,
	WorkflowPrerequisiteFileDefinition,
	WorkflowStepDefinition,
	WorkflowStepTransitionTarget,
	WorkflowValues,
	WorkflowWorkspacePathPolicy,
} from "../types"
import * as WorkflowRegistry from "../WorkflowRegistry"
import { WorkflowRuntime } from "../WorkflowRuntime"
import { brainstormingWorkflowDefinition } from "../workflow-modules/brainstorming"
import { createArchitectureWorkflowDefinition } from "../workflow-modules/create-architecture"
import {
	buildCreateArchitectureDocumentFromSession,
	buildInitialCreateArchitectureDocument,
} from "../workflow-modules/create-architecture/createArchitectureDocument"
import { createEpicsWorkflowDefinition } from "../workflow-modules/create-epics"
import { piPlanningWorkflowDefinition } from "../workflow-modules/pi-planning"

type ObservedDecisionPredicateInput = {
	activeBranchId: string
	projectTitleValue: unknown
	stepNumber: number
	keys: string[]
	hasSession: boolean
	hasUi: boolean
	hasBranchContext: boolean
	hasSuppressedWorkflowFormIds: boolean
	hasSuppressedWorkflowStepResolutionRoutes: boolean
	hasTriggerEvent: boolean
	triggerEventKind?: string
}

type WorkflowRenderFormDecisionAction = Extract<WorkflowDecisionAction, { kind: "render_workflow_form" }>
type WorkflowContinueFormDecisionAction = Extract<WorkflowDecisionAction, { kind: "continue_workflow_form" }>
type WorkflowExecuteToolBackedOperationNextAction = Extract<WorkflowNextAction, { kind: "execute_tool_backed_operation" }>
type WorkflowRenderWorkflowFormNextAction = Extract<WorkflowNextAction, { kind: "render_workflow_form" }>

interface CreateArchitectureInitialDocumentBuildResult {
	artifactAbsolutePath: string
	documentBuildAction: WorkflowExecuteToolBackedOperationNextAction
}

describe("WorkflowRuntime", () => {
	const LEGACY_WORKFLOW_MIRROR_KEYS = [
		"activeWorkflowFormSession",
		"activeWorkflowStepResolutionSession",
		"suppressedWorkflowFormResolverIds",
		"suppressedWorkflowStepResolutionRoutes",
	] as const
	const ENTRY_FORM_ID = "__workflow_runtime_entry_form__"
	const ENTRY_INFO_PANEL_ID = "__workflow_runtime_entry_info__"
	const ENTRY_PROJECT_SELECTION_PANEL_ID = "__workflow_runtime_entry_project_selection__"
	const ENTRY_PROJECT_MODE_FIELD_KEY = "__workflow_runtime_project_mode__"
	const ENTRY_EXISTING_PROJECT_FIELD_KEY = "__workflow_runtime_existing_project__"
	const ENTRY_NEW_PROJECT_TITLE_FIELD_KEY = "__workflow_runtime_new_project_title__"
	const ENTRY_ARTIFACT_CONFLICT_PANEL_ID = "__workflow_runtime_entry_artifact_conflict__"
	const ENTRY_ARTIFACT_CONFLICT_ACTION_FIELD_KEY = "__workflow_runtime_entry_artifact_conflict_action__"
	const ENTRY_ARTIFACT_REPLACEMENT_PANEL_ID = "__workflow_runtime_entry_artifact_replacement__"
	const ENTRY_ARTIFACT_REPLACEMENT_ACTION_FIELD_KEY = "__workflow_runtime_entry_artifact_replacement_action__"
	const PREREQUISITE_CANNOT_CONTINUE_PANEL_ID = "__workflow_runtime_prerequisite_cannot_continue__"
	const PREREQUISITE_SELECTED_FILE_FIELD_KEY = "__workflow_runtime_prerequisite_selected_file__"
	const PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY = "__workflow_runtime_prerequisite_single_match_confirmation__"
	const DEFAULT_ENTRY_PROJECT_VALUE_KEYS: WorkflowEntryProjectValueKeys = {
		projectMode: "entry_project_mode",
		projectTitle: "entry_project_title",
		projectFolderName: "entry_project_folder_name",
	}
	const DEFAULT_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
		name: "Runtime Mary",
		role: "Runtime Analyst",
		identity: "Runtime Mary helps test workflow prompt projection.",
		capabilities: ["workflow testing"],
		communicationStyle: "Precise and verification-oriented.",
		principles: ["Keep runtime fixtures explicit and deterministic."],
	}
	const MOVE_PROJECT_FILE_FILENAME_KEY = "selected_story_filename"
	const UPDATE_STORY_INDEX_STATUS_STORIES_INDEX_KEY = "selected_stories_index"
	const UPDATE_STORY_INDEX_STATUS_STORY_IDENTITY_KEY = "selected_story_identity"

	let sandbox: sinon.SinonSandbox
	let cwd: string
	let workspacePathPolicy: WorkflowWorkspacePathPolicy
	let runtime: WorkflowRuntime
	let taskState: TaskState
	let discoverWorkflowCandidatesStub: sinon.SinonStub
	let resolveWorkflowDefinitionStub: sinon.SinonStub

	beforeEach(async () => {
		sandbox = sinon.createSandbox()
		cwd = await mkdtemp(join(tmpdir(), "workflow-runtime-test-"))
		workspacePathPolicy = createAllowAllWorkspacePathPolicy()
		runtime = new WorkflowRuntime({ cwd, workspacePathPolicy })
		taskState = new TaskState()
		discoverWorkflowCandidatesStub = sandbox.stub(WorkflowDiscovery, "discoverWorkflowCandidates").resolves([])
		resolveWorkflowDefinitionStub = sandbox.stub(WorkflowRegistry, "resolveWorkflowDefinition").returns(undefined)
	})

	afterEach(async () => {
		sandbox.restore()
		await rm(cwd, { recursive: true, force: true })
	})

	function createPromptSource() {
		return {
			currentStepInstructions: "input",
		}
	}

	function createAllowAllWorkspacePathPolicy(): WorkflowWorkspacePathPolicy {
		return {
			validateAccess: () => true,
		}
	}

	async function pathExists(filePath: string): Promise<boolean> {
		try {
			await access(filePath)
			return true
		} catch {
			return false
		}
	}

	async function writeEpicsIndex(
		epicsIndexAbsolutePath: string,
		epics: readonly { identity: string; title: string; storyIndexGenerated: boolean }[],
	): Promise<void> {
		await mkdir(dirname(epicsIndexAbsolutePath), { recursive: true })
		await writeFile(
			epicsIndexAbsolutePath,
			`${JSON.stringify(
				{
					version: 1,
					epics: epics.map((epic) => ({
						identity: epic.identity,
						title: epic.title,
						"story-index-generated": epic.storyIndexGenerated,
					})),
				},
				undefined,
				2,
			)}\n`,
			"utf8",
		)
	}

	async function writeSingleEpicIndex(epicsIndexAbsolutePath: string, epicIdentity: string): Promise<void> {
		await writeEpicsIndex(epicsIndexAbsolutePath, [
			{
				identity: epicIdentity,
				title: `Epic ${epicIdentity}`,
				storyIndexGenerated: false,
			},
		])
	}

	async function writeStoryIndex(storiesIndexAbsolutePath: string, stories: WorkflowStoryIndex["stories"]): Promise<void> {
		await mkdir(dirname(storiesIndexAbsolutePath), { recursive: true })
		await writeFile(storiesIndexAbsolutePath, stringifyWorkflowStoryIndex({ version: 1, stories }), "utf8")
	}

	type JsonOptionsFieldKind = Extract<WorkflowFormFieldKind, "dropdown" | "radio_group" | "multi_select" | "checkbox_group">

	function createEpicsJsonOptionsSource(
		args?: Partial<NonNullable<WorkflowFormFieldDefinition["jsonOptionsSource"]>>,
	): NonNullable<WorkflowFormFieldDefinition["jsonOptionsSource"]> {
		return {
			root: {
				kind: "selected_project_root",
			},
			sourcePathSegments: args?.sourcePathSegments ?? ["planning", "Epics.index.json"],
			itemsPath: args?.itemsPath ?? "epics",
			valueProperty: args?.valueProperty ?? "identity",
			labelTemplate: args?.labelTemplate ?? "Epic {identity}: {title}",
			...(args?.descriptionTemplate !== undefined ? { descriptionTemplate: args.descriptionTemplate } : {}),
		}
	}

	function createEpicsJsonOptionsField(args: {
		key: string
		kind: JsonOptionsFieldKind
		workflowValueKey: string | undefined
		jsonOptionsSource?: NonNullable<WorkflowFormFieldDefinition["jsonOptionsSource"]>
	}): WorkflowFormFieldDefinition {
		const allowsMultipleValues = args.kind === "multi_select" || args.kind === "checkbox_group"
		const field: WorkflowFormFieldDefinition = {
			key: args.key,
			kind: args.kind,
			label: "Epic",
			required: true,
			allowedValueType: allowsMultipleValues ? "array" : "string",
			jsonOptionsSource: args.jsonOptionsSource ?? createEpicsJsonOptionsSource(),
			valueSchema: allowsMultipleValues ? { type: "array", items: { type: "string" } } : { type: "string" },
		}
		if (args.workflowValueKey !== undefined) {
			field.workflowValueKey = args.workflowValueKey
		}

		return field
	}

	function createJsonOptionsWorkflowForm(args: {
		workflowFormId: string
		fields: WorkflowFormFieldDefinition[]
	}): WorkflowFormDefinitionPayload {
		return {
			definitionVersion: 2,
			title: "JSON Options Form",
			toolDictionaryTitle: "JSON Options Tools",
			toolDictionaryMarkdown: "JSON options help",
			firstPanelId: "json-options",
			panels: {
				"json-options": {
					panelId: "json-options",
					title: "JSON Options",
					promptMarkdown: "Choose from JSON-backed options.",
					fields: args.fields,
					allowedActions: ["submit"],
					transition: createTerminalTransition(),
				},
			},
		}
	}

	const ARTIFACT_ALLOCATION_TERMINAL_ERROR_MESSAGE = "Artifact allocation failed."
	const STEP_RESOLUTION_SOURCE_ROUTE: WorkflowStepResolutionSourceRoute = {
		branchId: "run-step-resolution",
		routeId: "start-step-resolution",
	}
	const ARTIFACT_ALLOCATION_SOURCE_ROUTE: WorkflowStepResolutionSourceRoute = {
		branchId: "allocate-artifact",
		routeId: "allocate-artifact-route",
	}

	function sourceRoutesEqual(left: WorkflowStepResolutionSourceRoute, right: WorkflowStepResolutionSourceRoute): boolean {
		return left.branchId === right.branchId && left.routeId === right.routeId
	}

	function createEntryBranchStepTransitionAction(stepNumber: number): WorkflowDecisionAction {
		const target: WorkflowStepTransitionTarget = {
			kind: "entry_branch",
			stepNumber,
		}

		return {
			kind: "transition_step",
			target,
		}
	}

	function createNamedBranchStepTransitionAction(args: { stepNumber: number; branchId: string }): WorkflowDecisionAction {
		const target: WorkflowStepTransitionTarget = {
			kind: "named_branch",
			stepNumber: args.stepNumber,
			branchId: args.branchId,
		}

		return {
			kind: "transition_step",
			target,
		}
	}

	function createProjectPromptDecisionTree(args?: {
		entryBranchId?: string
		followingBranchId?: string
	}): WorkflowDecisionTree {
		const entryBranchId = args?.entryBranchId ?? "project-prompt"
		const followingBranchId = args?.followingBranchId

		return {
			entryBranchId,
			branches: {
				[entryBranchId]: {
					id: entryBranchId,
					routes: [
						{
							id: `${entryBranchId}-route`,
							trigger: { kind: "always" },
							action: { kind: "project_prompt" },
							followingBranchId,
						},
					],
				},
				...(followingBranchId
					? {
							[followingBranchId]: {
								id: followingBranchId,
								routes: [
									{
										id: `${followingBranchId}-route`,
										trigger: { kind: "always" },
										action: { kind: "project_prompt" },
									},
								],
							},
						}
					: {}),
			},
		}
	}

	function createWorkflowFormDecisionTree(args: {
		workflowFormId: string
		renderAction?: WorkflowRenderFormDecisionAction
		completionAction?: WorkflowDecisionAction
	}): WorkflowDecisionTree {
		const completionBranchId = "after-form-complete"
		const completionAction: WorkflowDecisionAction = args.completionAction ?? { kind: "project_prompt" }
		const shouldFollowCompletionBranch = completionAction.kind !== "transition_step"
		const renderAction: WorkflowRenderFormDecisionAction = args.renderAction ?? {
			kind: "render_workflow_form",
			workflowFormId: args.workflowFormId,
		}

		return {
			entryBranchId: "show-form",
			branches: {
				"show-form": {
					id: "show-form",
					routes: [
						{
							id: "render-form",
							trigger: { kind: "always" },
							action: renderAction,
							followingBranchId: "await-form-completion",
						},
					],
				},
				"await-form-completion": {
					id: "await-form-completion",
					routes: [
						{
							id: "form-completed-event",
							trigger: {
								kind: "event_predicate",
								matches: ({ triggerEvent }) =>
									triggerEvent.kind === "workflow_form_completed" &&
									triggerEvent.workflowFormId === args.workflowFormId,
							},
							action: completionAction,
							...(shouldFollowCompletionBranch ? { followingBranchId: completionBranchId } : {}),
						},
					],
				},
				...(shouldFollowCompletionBranch
					? {
							[completionBranchId]: {
								id: completionBranchId,
								routes: [
									{
										id: "after-form-project-prompt",
										trigger: { kind: "always" },
										action: { kind: "project_prompt" },
									},
								],
							},
						}
					: {}),
			},
		}
	}

	function createRuntimeRoutedWorkflowForm(args?: {
		sourceWorkflowValueKey?: string
		targetPanel?: WorkflowFormPanelDefinition
	}): WorkflowFormDefinitionPayload {
		const sourceField: WorkflowFormFieldDefinition = {
			key: "source",
			kind: "small_text",
			label: "Source",
			required: true,
			allowedValueType: "string",
		}
		if (args?.sourceWorkflowValueKey !== undefined) {
			sourceField.workflowValueKey = args.sourceWorkflowValueKey
		}

		const targetPanel: WorkflowFormPanelDefinition = args?.targetPanel ?? {
			panelId: "continued",
			title: "Default Continued",
			promptMarkdown: "Default continued prompt.",
			fields: [],
			allowedActions: ["submit"],
			transition: createTerminalTransition(),
		}

		return {
			definitionVersion: 2,
			title: "Runtime Routed Form",
			toolDictionaryTitle: "Runtime Routed Tools",
			toolDictionaryMarkdown: "Runtime routed help",
			firstPanelId: "source",
			panels: {
				source: {
					panelId: "source",
					title: "Source",
					promptMarkdown: "Capture source.",
					fields: [sourceField],
					allowedActions: ["submit"],
					transition: {
						type: "runtime_routed",
					},
				},
				[targetPanel.panelId]: targetPanel,
			},
		}
	}

	function createRuntimeRoutedDecisionTree(args: {
		workflowFormId: string
		panelId?: string
		buildReplacement: WorkflowContinueFormDecisionAction["buildReplacement"]
	}): WorkflowDecisionTree {
		const awaitBranchId = "await-runtime-routed-panel"

		return {
			entryBranchId: "show-runtime-routed-form",
			branches: {
				"show-runtime-routed-form": {
					id: "show-runtime-routed-form",
					routes: [
						{
							id: "render-runtime-routed-form",
							trigger: { kind: "always" },
							action: {
								kind: "render_workflow_form",
								workflowFormId: args.workflowFormId,
							},
							followingBranchId: awaitBranchId,
						},
					],
				},
				[awaitBranchId]: {
					id: awaitBranchId,
					routes: [
						{
							id: "continue-runtime-routed-form",
							trigger: {
								kind: "event_predicate",
								matches: ({ triggerEvent }) =>
									triggerEvent.kind === "workflow_form_panel_submitted" &&
									triggerEvent.workflowFormId === args.workflowFormId,
							},
							action: {
								kind: "continue_workflow_form",
								workflowFormId: args.workflowFormId,
								panelId: args.panelId ?? "continued",
								buildReplacement: args.buildReplacement,
							},
							followingBranchId: awaitBranchId,
						},
					],
				},
			},
		}
	}

	function createToolBackedOperationDecisionTree(args?: {
		startAction?: WorkflowDecisionAction
		successAction?: WorkflowDecisionAction
		failureAction?: WorkflowDecisionAction
	}): WorkflowDecisionTree {
		const successBranchId = "after-step-resolution-success"
		const failureBranchId = "after-step-resolution-failure"
		const successAction: WorkflowDecisionAction = args?.successAction ?? { kind: "project_prompt" }
		const failureAction: WorkflowDecisionAction = args?.failureAction ?? { kind: "project_prompt" }
		const shouldFollowSuccessBranch = successAction.kind !== "transition_step"
		const shouldFollowFailureBranch = failureAction.kind !== "transition_step"

		return {
			entryBranchId: "run-step-resolution",
			branches: {
				"run-step-resolution": {
					id: "run-step-resolution",
					routes: [
						{
							id: "start-step-resolution",
							trigger: { kind: "always" },
							action: args?.startAction ?? {
								kind: "execute_tool_backed_operation",
								instruction: createToolBackedActionInstruction(),
							},
							followingBranchId: "await-step-resolution",
						},
					],
				},
				"await-step-resolution": {
					id: "await-step-resolution",
					routes: [
						{
							id: "step-resolution-succeeded",
							trigger: {
								kind: "event_predicate",
								matches: ({ triggerEvent }) =>
									triggerEvent.kind === "tool_backed_operation_succeeded" &&
									sourceRoutesEqual(triggerEvent.sourceRoute, STEP_RESOLUTION_SOURCE_ROUTE),
							},
							action: successAction,
							...(shouldFollowSuccessBranch ? { followingBranchId: successBranchId } : {}),
						},
						{
							id: "step-resolution-failed",
							trigger: {
								kind: "event_predicate",
								matches: ({ triggerEvent }) =>
									triggerEvent.kind === "tool_backed_operation_failed" &&
									sourceRoutesEqual(triggerEvent.sourceRoute, STEP_RESOLUTION_SOURCE_ROUTE),
							},
							action: failureAction,
							...(shouldFollowFailureBranch ? { followingBranchId: failureBranchId } : {}),
						},
					],
				},
				...(shouldFollowSuccessBranch
					? {
							[successBranchId]: {
								id: successBranchId,
								routes: [
									{
										id: "after-step-resolution-success-route",
										trigger: { kind: "always" },
										action: { kind: "project_prompt" },
									},
								],
							},
						}
					: {}),
				...(shouldFollowFailureBranch
					? {
							[failureBranchId]: {
								id: failureBranchId,
								routes: [
									{
										id: "after-step-resolution-failure-route",
										trigger: { kind: "always" },
										action: { kind: "project_prompt" },
									},
								],
							},
						}
					: {}),
			},
		}
	}

	function createWorkflowProgressDecisionTree(args?: {
		approvedAction?: WorkflowDecisionAction
		deniedFollowingBranchId?: string
	}): WorkflowDecisionTree {
		const deniedFollowingBranchId = args?.deniedFollowingBranchId ?? "progress-denied"
		const approvedAction: WorkflowDecisionAction = args?.approvedAction ?? { kind: "project_prompt" }

		return {
			entryBranchId: "project-prompt-entry",
			branches: {
				"project-prompt-entry": {
					id: "project-prompt-entry",
					routes: [
						{
							id: "show-project-prompt",
							trigger: { kind: "always" },
							action: { kind: "project_prompt" },
							followingBranchId: "await-progress-decision",
						},
					],
				},
				"await-progress-decision": {
					id: "await-progress-decision",
					routes: [
						{
							id: "progress-approved",
							trigger: { kind: "on_event", eventKind: "workflow_progress_request_confirmed" },
							action: approvedAction,
						},
						{
							id: "progress-denied",
							trigger: { kind: "on_event", eventKind: "workflow_progress_request_denied" },
							action: { kind: "project_prompt" },
							followingBranchId: deniedFollowingBranchId,
						},
						{
							id: "stay-on-step",
							trigger: { kind: "always" },
							action: { kind: "project_prompt" },
						},
					],
				},
				[deniedFollowingBranchId]: {
					id: deniedFollowingBranchId,
					routes: [
						{
							id: "progress-denied-blocked",
							trigger: { kind: "session_predicate", matches: () => false },
							action: { kind: "no_op" },
						},
					],
				},
			},
		}
	}

	function createWorkflowValuesPersistedDecisionTree(args?: { action?: WorkflowDecisionAction }): WorkflowDecisionTree {
		return {
			entryBranchId: "project-prompt-entry",
			branches: {
				"project-prompt-entry": {
					id: "project-prompt-entry",
					routes: [
						{
							id: "show-project-prompt",
							trigger: { kind: "always" },
							action: { kind: "project_prompt" },
							followingBranchId: "await-workflow-values",
						},
					],
				},
				"await-workflow-values": {
					id: "await-workflow-values",
					routes: [
						{
							id: "workflow-values-persisted",
							trigger: { kind: "on_event", eventKind: "workflow_values_persisted" },
							action: args?.action ?? { kind: "project_prompt" },
						},
					],
				},
			},
		}
	}

	function createModelToolLifecycleDecisionTree(args: {
		toolName: ClineDefaultTool
		successAction?: WorkflowDecisionAction
		failureAction?: WorkflowDecisionAction
		failureErrorMessage?: string
	}): WorkflowDecisionTree {
		return {
			entryBranchId: "await-model-tool",
			branches: {
				"await-model-tool": {
					id: "await-model-tool",
					routes: [
						{
							id: "model-tool-succeeded",
							trigger: {
								kind: "event_predicate",
								matches: ({ triggerEvent }) =>
									triggerEvent.kind === "model_tool_succeeded" && triggerEvent.toolName === args.toolName,
							},
							action: args.successAction ?? { kind: "project_prompt" },
						},
						{
							id: "model-tool-failed",
							trigger: {
								kind: "event_predicate",
								matches: ({ triggerEvent }) =>
									triggerEvent.kind === "model_tool_failed" &&
									triggerEvent.toolName === args.toolName &&
									(args.failureErrorMessage === undefined ||
										triggerEvent.errorMessage === args.failureErrorMessage),
							},
							action: args.failureAction ?? { kind: "project_prompt" },
						},
					],
				},
			},
		}
	}

	function createArtifactAllocationDecisionTree(artifactId: string): WorkflowDecisionTree {
		return {
			entryBranchId: "allocate-artifact",
			branches: {
				"allocate-artifact": {
					id: "allocate-artifact",
					routes: [
						{
							id: "allocate-artifact-route",
							trigger: { kind: "always" },
							action: {
								kind: "allocate_artifact",
								artifactId,
							},
							followingBranchId: "await-artifact-allocation",
						},
					],
				},
				"await-artifact-allocation": {
					id: "await-artifact-allocation",
					routes: [
						{
							id: "artifact-allocation-succeeded",
							trigger: {
								kind: "event_predicate",
								matches: ({ triggerEvent }) =>
									triggerEvent.kind === "tool_backed_operation_succeeded" &&
									sourceRoutesEqual(triggerEvent.sourceRoute, ARTIFACT_ALLOCATION_SOURCE_ROUTE),
							},
							action: { kind: "project_prompt" },
						},
						{
							id: "artifact-allocation-failed",
							trigger: {
								kind: "event_predicate",
								matches: ({ triggerEvent }) =>
									triggerEvent.kind === "tool_backed_operation_failed" &&
									sourceRoutesEqual(triggerEvent.sourceRoute, ARTIFACT_ALLOCATION_SOURCE_ROUTE),
							},
							action: {
								kind: "terminal_error",
								errorMessage: ARTIFACT_ALLOCATION_TERMINAL_ERROR_MESSAGE,
							},
						},
					],
				},
			},
		}
	}

	function createMoveProjectFileAction(args: {
		sourceFolderSegments: readonly string[]
		destinationFolderSegments: readonly string[]
		filenameWorkflowValueKey: string
	}): WorkflowDecisionAction {
		return {
			kind: "move_project_file",
			sourceFolderSegments: args.sourceFolderSegments,
			destinationFolderSegments: args.destinationFolderSegments,
			filenameWorkflowValueKey: args.filenameWorkflowValueKey,
		}
	}

	function createUpdateStoryIndexStatusAction(args?: {
		storyIndexWorkflowValueKey?: string
		storyIdentityWorkflowValueKey?: string
		status?: WorkflowStoryStatus
		expectedCurrentStatus?: WorkflowStoryStatus
	}): WorkflowDecisionAction {
		return {
			kind: "update_story_index_status",
			storyIndexWorkflowValueKey: args?.storyIndexWorkflowValueKey ?? UPDATE_STORY_INDEX_STATUS_STORIES_INDEX_KEY,
			storyIdentityWorkflowValueKey: args?.storyIdentityWorkflowValueKey ?? UPDATE_STORY_INDEX_STATUS_STORY_IDENTITY_KEY,
			status: args?.status ?? "backlog",
			...(args?.expectedCurrentStatus === undefined ? {} : { expectedCurrentStatus: args.expectedCurrentStatus }),
		}
	}

	function createResolvePrerequisiteFilesAction(prerequisiteIds: readonly string[]): WorkflowDecisionAction {
		return {
			kind: "resolve_prerequisite_files",
			prerequisiteIds,
		}
	}

	function createPrerequisiteFileDefinition(
		args?: Partial<WorkflowPrerequisiteFileDefinition>,
	): WorkflowPrerequisiteFileDefinition {
		return {
			id: args?.id ?? "requirements",
			requirement: args?.requirement ?? "required",
			projectSubfolderSegments: args?.projectSubfolderSegments ?? ["planning"],
			match: args?.match ?? {
				kind: "exact_filename",
				filename: "requirements.md",
			},
			producingWorkflowName: args?.producingWorkflowName ?? "create-prd",
			workflowValueKey: args?.workflowValueKey ?? "requirements_path",
			outputDocumentReference: args?.outputDocumentReference ?? "none",
		}
	}

	function createMalformedPrerequisiteFileDefinition(
		mutate: (definition: WorkflowPrerequisiteFileDefinition) => void,
	): WorkflowPrerequisiteFileDefinition {
		const definition = createPrerequisiteFileDefinition()
		mutate(definition)
		return definition
	}

	function createStepDefinition(args: {
		stepNumber: number
		checklistLabel?: string
		decisionTree?: WorkflowDecisionTree
		completionRules?: WorkflowStepDefinition["completionRules"]
		toolSchema?: readonly ClineToolSpec[]
	}): WorkflowStepDefinition {
		return {
			id: `step-${args.stepNumber}` as WorkflowStepDefinition["id"],
			stepNumber: args.stepNumber,
			checklistLabel: args.checklistLabel ?? `Step ${args.stepNumber}`,
			buildPromptSource: () => createPromptSource(),
			buildToolSchema: () => args.toolSchema ?? [],
			decisionTree: args.decisionTree ?? createProjectPromptDecisionTree(),
			completionRules: args.completionRules,
		}
	}

	function createWorkflowDefinition(args?: {
		name?: string
		workflowValueKeys?: readonly string[]
		entryProjectValueKeys?: WorkflowEntryProjectValueKeys
		includeEntryProjectValueKeysInWorkflowValueKeys?: boolean
		workflowForms?: Record<string, WorkflowFormDefinitionPayload>
		steps?: WorkflowDefinition["steps"]
		childInheritance?: WorkflowDefinition["childInheritance"]
		artifacts?: WorkflowDefinition["artifacts"]
		prerequisiteFiles?: WorkflowDefinition["prerequisiteFiles"]
		projectSubfolder?: WorkflowDefinition["projectSubfolder"]
		displayName?: string
		description?: string
		persona?: WorkflowPersonaDefinition
	}): WorkflowDefinition {
		const defaultSteps: Record<string, WorkflowStepDefinition> = {
			"step-1": createStepDefinition({ stepNumber: 1 }),
			"step-2": createStepDefinition({ stepNumber: 2 }),
		}
		const entryProjectValueKeys = args?.entryProjectValueKeys ?? DEFAULT_ENTRY_PROJECT_VALUE_KEYS
		const workflowValueKeys = [
			...(args?.includeEntryProjectValueKeysInWorkflowValueKeys === false ? [] : Object.values(entryProjectValueKeys)),
			...(args?.workflowValueKeys ?? []),
		]

		return {
			name: args?.name ?? "workflow-runtime-test",
			displayName: args?.displayName ?? "Workflow Runtime Test",
			description: args?.description ?? "A workflow fixture used by runtime tests.",
			slashCommandName: "workflow-runtime-test",
			useSkillName: "workflow-runtime-test",
			persona: args?.persona ?? DEFAULT_WORKFLOW_PERSONA,
			projectSubfolder: args?.projectSubfolder ?? "planning",
			workflowValueKeys,
			entryProjectValueKeys,
			entryPanel: {
				promptMarkdown: "Start this workflow",
			},
			steps: args?.steps ?? defaultSteps,
			workflowForms: args?.workflowForms ?? {},
			artifacts: args?.artifacts,
			prerequisiteFiles: args?.prerequisiteFiles,
			childInheritance: args?.childInheritance,
		}
	}

	function registerResolvedWorkflow(workflow: WorkflowDefinition) {
		resolveWorkflowDefinitionStub.callsFake((workflowName: string) => (workflowName === workflow.name ? workflow : undefined))
	}

	async function activateWorkflow(state: TaskState, workflow: WorkflowDefinition): Promise<WorkflowNextAction> {
		registerResolvedWorkflow(workflow)
		return runtime.activateWorkflow({
			taskState: state,
			workflowName: workflow.name,
		})
	}

	function createFormSubmitRequest(args: {
		sessionId: string
		panelId: string
		action?: WorkflowFormAction
		fields?: WorkflowFormSubmissionRequest["fields"]
	}) {
		return WorkflowFormSubmissionRequest.create({
			sessionId: args.sessionId,
			panelId: args.panelId,
			action: args.action ?? WorkflowFormAction.SUBMIT,
			fields: args.fields ?? [],
		})
	}

	function createTerminalTransition(): WorkflowFormPanelDefinition["transition"] {
		return {
			type: "conditional",
			conditionSourceKey: "__terminal__",
			branches: [],
			defaultTerminal: true,
		}
	}

	function createWorkflowFormDefinitionPayload(args?: { nextPanelId?: string }): WorkflowFormDefinitionPayload {
		const nextPanelId = args?.nextPanelId
		const panels: Record<string, WorkflowFormPanelDefinition> = {
			"panel-1": {
				panelId: "panel-1",
				title: "Panel 1",
				promptMarkdown: "Panel 1 prompt",
				fields: [],
				allowedActions: ["submit"],
				transition: { type: "sequential", nextPanelId: "panel-2" },
			},
			"panel-2": {
				panelId: "panel-2",
				title: "Panel 2",
				promptMarkdown: "Panel 2 prompt",
				fields: [],
				allowedActions: ["submit"],
				transition: nextPanelId
					? {
							type: "sequential",
							nextPanelId,
						}
					: createTerminalTransition(),
			},
		}

		if (nextPanelId) {
			panels[nextPanelId] = {
				panelId: nextPanelId,
				title: "Panel 3",
				promptMarkdown: "Panel 3 prompt",
				fields: [],
				allowedActions: ["submit"],
				transition: createTerminalTransition(),
			}
		}

		return {
			definitionVersion: 2,
			title: "Workflow Form",
			toolDictionaryTitle: "Workflow Form Tools",
			toolDictionaryMarkdown: "Workflow form tools",
			firstPanelId: "panel-1",
			panels,
		} as WorkflowFormDefinitionPayload
	}

	function createToolBackedActionInstruction(args?: {
		fallbackToAgent?: boolean
		shouldSucceed?: boolean
		toolName?: ClineDefaultTool
		toolRequestToolName?: ClineDefaultTool
	}): WorkflowToolBackedActionInstruction {
		return {
			toolName: args?.toolName ?? ClineDefaultTool.GENERATE_EXPLANATION,
			buildStatusDefinition: () => ({
				title: "Step Resolution",
				pendingLabel: "Pending",
				successLabel: "Success",
				failureLabel: "Failure",
			}),
			buildToolExecutionRequest: () => ({
				toolName: args?.toolRequestToolName ?? args?.toolName ?? ClineDefaultTool.GENERATE_EXPLANATION,
				toolInput: {},
				toolParams: {},
			}),
			evaluateToolExecutionResult: () => {
				if (args?.shouldSucceed === false && args.fallbackToAgent) {
					return { succeeded: false, errorMessage: "failure", fallbackToAgent: true }
				}

				if (args?.shouldSucceed === false) {
					return { succeeded: false, errorMessage: "failure" }
				}

				return { succeeded: true }
			},
		}
	}

	function createDocumentBuildActionInstruction(args?: {
		artifactId?: string
		buildContent?: WorkflowDocumentBuildActionInstruction["buildContent"]
		workflowValueWrites?: WorkflowValues
	}): WorkflowDocumentBuildActionInstruction {
		const instruction: WorkflowDocumentBuildActionInstruction = {
			artifactId: args?.artifactId ?? "output_file",
			buildContent: args?.buildContent ?? (() => "# Resolved spec"),
		}

		if (args?.workflowValueWrites !== undefined) {
			instruction.workflowValueWrites = args.workflowValueWrites
		}

		return instruction
	}

	function createWorkflowProgressRequestToolSchema(): readonly ClineToolSpec[] {
		return [
			{
				variant: ModelFamily.GPT_5,
				id: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
				name: "workflow_progress_request",
				description: "Ask the user to confirm whether the current workflow step is ready to advance.",
				parameters: [],
			},
		]
	}

	function createToolSchema(toolName: ClineDefaultTool): readonly ClineToolSpec[] {
		return [
			{
				variant: ModelFamily.GPT_5,
				id: toolName,
				name: toolName,
				description: `${toolName} test schema.`,
				parameters: [],
			},
		]
	}

	function setDiscoveredProjects(projectNames: string[]) {
		discoverWorkflowCandidatesStub.resolves(
			projectNames.map((name) => ({
				value: name,
				label: name,
			})),
		)
	}

	function expectNoLegacyWorkflowMirrors(state: TaskState): void {
		for (const key of LEGACY_WORKFLOW_MIRROR_KEYS) {
			expect(Reflect.has(state, key), `${key} should not exist on TaskState`).to.equal(false)
		}
	}

	function getActiveWorkflowSession(state: TaskState): ActiveWorkflowSession {
		const activeSession = state.activeWorkflowSession
		expect(activeSession).to.not.equal(undefined)
		if (!activeSession) {
			throw new Error("Expected an active workflow session.")
		}

		return activeSession
	}

	function expectWorkflowStateCleared(state: TaskState): void {
		expect(state.activeWorkflowName).to.be.undefined
		expect(state.activeWorkflowSession).to.be.undefined
		expect(state.currentFocusChainChecklist).to.equal(null)
	}

	function getActiveFormSession(state: TaskState): NonNullable<ActiveWorkflowSession["ui"]["formSession"]> {
		const formSession = getActiveWorkflowSession(state).ui.formSession
		expect(formSession).to.not.equal(undefined)
		if (!formSession) {
			throw new Error("Expected an active workflow form session.")
		}

		return formSession
	}

	function createParentWorkflowSession(args?: { projectTitle?: string; projectFolderName?: string }): ActiveWorkflowSession {
		return {
			activeStepNumber: 1,
			workflowValues: {},
			projectSelection: {
				projectMode: "existing",
				projectTitle: args?.projectTitle ?? "Parent Project",
				projectFolderName: args?.projectFolderName ?? "parent-project",
			},
			lifecycle: {
				projectSelectionCompleted: true,
			},
			entryArtifactResolution: undefined,
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionRoutes: [],
			},
			branchContext: {
				activeBranchId: "parent-branch",
			},
		}
	}

	async function createRestorablePersistedSession(workflow: WorkflowDefinition): Promise<PersistedWorkflowSession> {
		const sourceState = new TaskState()
		await activateWorkflow(sourceState, workflow)
		await runtime.resolveNextAction({ taskState: sourceState })
		await submitNewProjectSelection(sourceState, "Restorable Project")
		const persistedSession = runtime.getPersistedSession({ taskState: sourceState })
		if (persistedSession === undefined) {
			throw new Error("Expected a restorable persisted workflow session.")
		}

		return persistedSession
	}

	async function createRestorableStepResolutionSession(workflow: WorkflowDefinition): Promise<PersistedWorkflowSession> {
		const sourceState = new TaskState()
		await activateWorkflow(sourceState, workflow)
		await runtime.resolveNextAction({ taskState: sourceState })
		const nextAction = await submitNewProjectSelection(sourceState, "Restorable Operation Project")
		if (nextAction.kind !== "execute_tool_backed_operation") {
			const resolvedNextAction = await runtime.resolveNextAction({ taskState: sourceState })
			expect(resolvedNextAction.kind).to.equal("execute_tool_backed_operation")
		}

		const persistedSession = runtime.getPersistedSession({ taskState: sourceState })
		if (persistedSession === undefined || persistedSession.ui.stepResolutionSession === undefined) {
			throw new Error("Expected a restorable step-resolution session.")
		}

		return persistedSession
	}

	async function expectPersistedRestoreFailsClosed(
		workflow: WorkflowDefinition,
		persistedSession: PersistedWorkflowSession,
	): Promise<void> {
		registerResolvedWorkflow(workflow)
		const restoredState = new TaskState()
		restoredState.activeWorkflowName = workflow.name
		restoredState.activeWorkflowSession = createParentWorkflowSession()
		restoredState.currentFocusChainChecklist = "stale checklist"

		const result = await runtime.restorePersistedSession({
			taskState: restoredState,
			persistedSession,
		})

		expect(result).to.deep.equal({ kind: "persist_workflow_teardown" })
		expect(restoredState.activeWorkflowName).to.be.undefined
		expect(restoredState.activeWorkflowSession).to.be.undefined
		expect(restoredState.currentFocusChainChecklist).to.equal(null)
	}

	function createStandaloneArtifactOutputValueKeys(prefix: string) {
		return {
			projectTitle: `${prefix}_project_title`,
			projectFolderName: `${prefix}_project_folder`,
			artifactFamily: `${prefix}_artifact_family`,
			artifactIdentity: `${prefix}_artifact_identity`,
			artifactFilename: `${prefix}_artifact_filename`,
			artifactRelativePath: `${prefix}_artifact_relative_path`,
			artifactAbsolutePath: `${prefix}_artifact_absolute_path`,
			parentIdentity: undefined,
			targetIdentity: undefined,
		}
	}

	function createParentedArtifactOutputValueKeys(prefix: string) {
		return {
			projectTitle: `${prefix}_project_title`,
			projectFolderName: `${prefix}_project_folder`,
			artifactFamily: `${prefix}_artifact_family`,
			artifactIdentity: `${prefix}_artifact_identity`,
			artifactFilename: `${prefix}_artifact_filename`,
			artifactRelativePath: `${prefix}_artifact_relative_path`,
			artifactAbsolutePath: `${prefix}_artifact_absolute_path`,
			parentIdentity: `${prefix}_parent_identity`,
			targetIdentity: undefined,
		}
	}

	function createTargetedArtifactOutputValueKeys(prefix: string) {
		return {
			projectTitle: `${prefix}_project_title`,
			projectFolderName: `${prefix}_project_folder`,
			artifactFamily: `${prefix}_artifact_family`,
			artifactIdentity: `${prefix}_artifact_identity`,
			artifactFilename: `${prefix}_artifact_filename`,
			artifactRelativePath: `${prefix}_artifact_relative_path`,
			artifactAbsolutePath: `${prefix}_artifact_absolute_path`,
			parentIdentity: undefined,
			targetIdentity: `${prefix}_target_identity`,
		}
	}

	function collectArtifactOutputWorkflowValueKeys(
		...outputValueKeys: Array<
			| ReturnType<typeof createStandaloneArtifactOutputValueKeys>
			| ReturnType<typeof createParentedArtifactOutputValueKeys>
			| ReturnType<typeof createTargetedArtifactOutputValueKeys>
		>
	): string[] {
		return outputValueKeys
			.flatMap((entry) => Object.values(entry))
			.filter((value): value is string => typeof value === "string")
	}

	function createEntryArtifactResolutionObserverSteps(args: {
		observeArtifactResolutions(artifactResolutions: readonly WorkflowEntryArtifactResolution[]): void
	}): WorkflowDefinition["steps"] {
		return {
			"step-1": createStepDefinition({
				stepNumber: 1,
				decisionTree: {
					entryBranchId: "await-entry-artifact-resolution",
					branches: {
						"await-entry-artifact-resolution": {
							id: "await-entry-artifact-resolution",
							routes: [
								{
									id: "entry-artifact-resolution-completed",
									trigger: {
										kind: "event_predicate",
										matches: ({ triggerEvent }) => {
											if (triggerEvent.kind !== "entry_artifact_resolution_completed") {
												return false
											}

											args.observeArtifactResolutions(triggerEvent.artifactResolutions)
											return true
										},
									},
									action: { kind: "project_prompt" },
								},
							],
						},
					},
				},
			}),
		}
	}

	function createEpicsArtifactWorkflow(args?: {
		artifactId?: string
		outputValuePrefix?: string
		steps?: WorkflowDefinition["steps"]
	}): {
		workflow: WorkflowDefinition
		artifactId: string
		outputValueKeys: ReturnType<typeof createStandaloneArtifactOutputValueKeys>
	} {
		const artifactId = args?.artifactId ?? "epics_doc"
		const outputValueKeys = createStandaloneArtifactOutputValueKeys(args?.outputValuePrefix ?? "epics_policy")
		const workflow = createWorkflowDefinition({
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputValueKeys),
			artifacts: {
				[artifactId]: {
					id: artifactId,
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys,
				},
			},
			steps: args?.steps,
		})

		return { workflow, artifactId, outputValueKeys }
	}

	function createPrerequisiteResolutionDecisionTree(args: {
		prerequisiteIds: readonly string[]
		artifactId: string
	}): WorkflowDecisionTree {
		return {
			entryBranchId: "resolve-prerequisites",
			branches: {
				"resolve-prerequisites": {
					id: "resolve-prerequisites",
					routes: [
						{
							id: "resolve-prerequisites-route",
							trigger: { kind: "always" },
							action: createResolvePrerequisiteFilesAction(args.prerequisiteIds),
							followingBranchId: "after-prerequisites",
						},
					],
				},
				"after-prerequisites": {
					id: "after-prerequisites",
					routes: [
						{
							id: "allocate-after-prerequisites",
							trigger: { kind: "always" },
							action: {
								kind: "allocate_artifact",
								artifactId: args.artifactId,
							},
						},
					],
				},
			},
		}
	}

	function createPrerequisiteResolutionWorkflow(args?: {
		prerequisite?: WorkflowPrerequisiteFileDefinition
		projectSubfolder?: WorkflowDefinition["projectSubfolder"]
	}): {
		workflow: WorkflowDefinition
		artifactId: string
		outputValueKeys: ReturnType<typeof createStandaloneArtifactOutputValueKeys>
		prerequisite: WorkflowPrerequisiteFileDefinition
	} {
		const artifactId = "epics_doc"
		const outputValueKeys = createStandaloneArtifactOutputValueKeys("prerequisite_output")
		const prerequisite = args?.prerequisite ?? createPrerequisiteFileDefinition()
		const workflow = createWorkflowDefinition({
			projectSubfolder: args?.projectSubfolder,
			workflowValueKeys: [prerequisite.workflowValueKey, ...collectArtifactOutputWorkflowValueKeys(outputValueKeys)],
			prerequisiteFiles: {
				[prerequisite.id]: prerequisite,
			},
			artifacts: {
				[artifactId]: {
					id: artifactId,
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys,
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createPrerequisiteResolutionDecisionTree({
						prerequisiteIds: [prerequisite.id],
						artifactId,
					}),
				}),
			},
		})

		return { workflow, artifactId, outputValueKeys, prerequisite }
	}

	function createMultiPrerequisiteResolutionWorkflow(args: {
		prerequisites: readonly WorkflowPrerequisiteFileDefinition[]
		projectSubfolder?: WorkflowDefinition["projectSubfolder"]
	}): {
		workflow: WorkflowDefinition
		artifactId: string
		outputValueKeys: ReturnType<typeof createStandaloneArtifactOutputValueKeys>
		prerequisites: readonly WorkflowPrerequisiteFileDefinition[]
	} {
		const artifactId = "epics_doc"
		const outputValueKeys = createStandaloneArtifactOutputValueKeys("prerequisite_output")
		const prerequisiteFiles: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = {}
		for (const prerequisite of args.prerequisites) {
			prerequisiteFiles[prerequisite.id] = prerequisite
		}
		const workflow = createWorkflowDefinition({
			projectSubfolder: args.projectSubfolder,
			workflowValueKeys: [
				...args.prerequisites.map((prerequisite) => prerequisite.workflowValueKey),
				...collectArtifactOutputWorkflowValueKeys(outputValueKeys),
			],
			prerequisiteFiles,
			artifacts: {
				[artifactId]: {
					id: artifactId,
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys,
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createPrerequisiteResolutionDecisionTree({
						prerequisiteIds: args.prerequisites.map((prerequisite) => prerequisite.id),
						artifactId,
					}),
				}),
			},
		})

		return { workflow, artifactId, outputValueKeys, prerequisites: args.prerequisites }
	}

	async function writePrerequisiteProjectFile(projectFolderName: string, relativePath: string): Promise<string> {
		const absolutePath = join(cwd, "docs", "projects", projectFolderName, relativePath)
		await mkdir(dirname(absolutePath), { recursive: true })
		await writeFile(absolutePath, "prerequisite", "utf8")
		return absolutePath
	}

	async function advanceToEntryProjectSelectionPanel(state: TaskState) {
		const activeFormSession = getActiveFormSession(state)
		if (activeFormSession.currentPanelId === ENTRY_PROJECT_SELECTION_PANEL_ID) {
			const nextAction = await runtime.resolveNextAction({ taskState: state })
			expect(nextAction.kind).to.equal("render_workflow_form")
			if (nextAction.kind !== "render_workflow_form") {
				throw new Error(`Expected render_workflow_form, received ${nextAction.kind}.`)
			}
			return nextAction
		}

		const nextAction = await runtime.submitWorkflowForm({
			taskState: state,
			request: createFormSubmitRequest({
				sessionId: activeFormSession.sessionId,
				panelId: activeFormSession.currentPanelId,
			}),
		})

		expect(nextAction.kind).to.equal("render_workflow_form")
		if (nextAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${nextAction.kind}.`)
		}

		expect(nextAction.payload.panel?.panelId).to.equal(ENTRY_PROJECT_SELECTION_PANEL_ID)
		return nextAction
	}

	async function submitNewProjectSelection(state: TaskState, newProjectTitle: string) {
		await advanceToEntryProjectSelectionPanel(state)
		const activeFormSession = getActiveFormSession(state)

		return runtime.submitWorkflowForm({
			taskState: state,
			request: createFormSubmitRequest({
				sessionId: activeFormSession.sessionId,
				panelId: activeFormSession.currentPanelId,
				fields: [
					{
						key: ENTRY_PROJECT_MODE_FIELD_KEY,
						value: { stringValue: "new" },
					},
					{
						key: ENTRY_NEW_PROJECT_TITLE_FIELD_KEY,
						value: { stringValue: newProjectTitle },
					},
				],
			}),
		})
	}

	async function submitExistingProjectSelection(state: TaskState, selectedExistingProject: string) {
		await advanceToEntryProjectSelectionPanel(state)
		const modeSelectionSession = getActiveFormSession(state)
		const existingSelectorAction = await runtime.submitWorkflowForm({
			taskState: state,
			request: createFormSubmitRequest({
				sessionId: modeSelectionSession.sessionId,
				panelId: modeSelectionSession.currentPanelId,
				fields: [
					{
						key: ENTRY_PROJECT_MODE_FIELD_KEY,
						value: { stringValue: "existing" },
					},
				],
			}),
		})
		expect(existingSelectorAction.kind).to.equal("render_workflow_form")
		if (existingSelectorAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${existingSelectorAction.kind}.`)
		}
		expect(getActiveWorkflowSession(state).projectSelection.projectTitle).to.equal("")
		expect(getActiveWorkflowSession(state).projectSelection.projectFolderName).to.equal("")
		expect(await pathExists(join(cwd, "docs", "projects", selectedExistingProject))).to.equal(false)

		return runtime.submitWorkflowForm({
			taskState: state,
			request: createFormSubmitRequest({
				sessionId: existingSelectorAction.formSession.sessionId,
				panelId: existingSelectorAction.formSession.currentPanelId,
				fields: [
					{
						key: ENTRY_PROJECT_MODE_FIELD_KEY,
						value: { stringValue: "existing" },
					},
					{
						key: ENTRY_EXISTING_PROJECT_FIELD_KEY,
						value: { stringValue: selectedExistingProject },
					},
				],
			}),
		})
	}

	async function submitExistingProjectSelectionFromExistingFolder(
		state: TaskState,
		selectedExistingProject: string,
	): Promise<WorkflowNextAction> {
		await advanceToEntryProjectSelectionPanel(state)
		const modeSelectionSession = getActiveFormSession(state)
		const existingSelectorAction = await runtime.submitWorkflowForm({
			taskState: state,
			request: createFormSubmitRequest({
				sessionId: modeSelectionSession.sessionId,
				panelId: modeSelectionSession.currentPanelId,
				fields: [
					{
						key: ENTRY_PROJECT_MODE_FIELD_KEY,
						value: { stringValue: "existing" },
					},
				],
			}),
		})
		expect(existingSelectorAction.kind).to.equal("render_workflow_form")
		if (existingSelectorAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${existingSelectorAction.kind}.`)
		}
		expect(getActiveWorkflowSession(state).projectSelection.projectTitle).to.equal("")
		expect(getActiveWorkflowSession(state).projectSelection.projectFolderName).to.equal("")

		return runtime.submitWorkflowForm({
			taskState: state,
			request: createFormSubmitRequest({
				sessionId: existingSelectorAction.formSession.sessionId,
				panelId: existingSelectorAction.formSession.currentPanelId,
				fields: [
					{
						key: ENTRY_PROJECT_MODE_FIELD_KEY,
						value: { stringValue: "existing" },
					},
					{
						key: ENTRY_EXISTING_PROJECT_FIELD_KEY,
						value: { stringValue: selectedExistingProject },
					},
				],
			}),
		})
	}

	async function submitEntryArtifactConflictAction(state: TaskState, actionValue: string): Promise<WorkflowNextAction> {
		const activeFormSession = getActiveFormSession(state)
		expect(activeFormSession.currentPanelId).to.equal(ENTRY_ARTIFACT_CONFLICT_PANEL_ID)

		return runtime.submitWorkflowForm({
			taskState: state,
			request: createFormSubmitRequest({
				sessionId: activeFormSession.sessionId,
				panelId: activeFormSession.currentPanelId,
				fields: [
					{
						key: ENTRY_ARTIFACT_CONFLICT_ACTION_FIELD_KEY,
						value: { stringValue: actionValue },
					},
				],
			}),
		})
	}

	async function submitEntryArtifactReplacementAction(state: TaskState, actionValue: string): Promise<WorkflowNextAction> {
		const activeFormSession = getActiveFormSession(state)
		expect(activeFormSession.currentPanelId).to.equal(ENTRY_ARTIFACT_REPLACEMENT_PANEL_ID)

		return runtime.submitWorkflowForm({
			taskState: state,
			request: createFormSubmitRequest({
				sessionId: activeFormSession.sessionId,
				panelId: activeFormSession.currentPanelId,
				fields: [
					{
						key: ENTRY_ARTIFACT_REPLACEMENT_ACTION_FIELD_KEY,
						value: { stringValue: actionValue },
					},
				],
			}),
		})
	}

	async function writeExistingEpicsArtifact(projectName: string, content: string): Promise<string> {
		const existingArtifactPath = join(cwd, "docs", "projects", projectName, "planning", "Epics.md")
		await mkdir(join(cwd, "docs", "projects", projectName, "planning"), { recursive: true })
		await writeFile(existingArtifactPath, content, "utf8")
		return existingArtifactPath
	}

	async function submitActiveWorkflowFormPanel(state: TaskState) {
		const activeFormSession = getActiveFormSession(state)
		expect(activeFormSession.sessionId).to.be.a("string").and.not.equal("")
		expect(activeFormSession.currentPanelId).to.be.a("string").and.not.equal("")

		return runtime.submitWorkflowForm({
			taskState: state,
			request: createFormSubmitRequest({
				sessionId: activeFormSession.sessionId,
				panelId: activeFormSession.currentPanelId,
			}),
		})
	}

	async function startCreateArchitectureInitialDocumentBuild(
		state: TaskState,
		projectTitle: string,
	): Promise<CreateArchitectureInitialDocumentBuildResult> {
		registerResolvedWorkflow(createArchitectureWorkflowDefinition)
		await runtime.activateWorkflow({
			taskState: state,
			workflowName: createArchitectureWorkflowDefinition.name,
		})
		const allocationAction = await submitNewProjectSelection(state, projectTitle)
		expect(allocationAction.kind).to.equal("execute_tool_backed_operation")
		if (allocationAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${allocationAction.kind}.`)
		}

		const artifactResult = await runtime.createWorkflowArtifact({
			taskState: state,
			artifactId: "architecture_document",
			expectedArtifactAbsolutePath: undefined,
		})
		const documentBuildAction = await runtime.handleToolBackedOperationToolResult({
			taskState: state,
			toolResultText: JSON.stringify({ ok: true }),
			runtimeOwnedSourceRoute: allocationAction.runtimeOwnedSourceRoute,
		})
		expect(documentBuildAction.kind).to.equal("execute_tool_backed_operation")
		if (documentBuildAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${documentBuildAction.kind}.`)
		}

		return {
			artifactAbsolutePath: artifactResult.artifactAbsolutePath,
			documentBuildAction,
		}
	}

	async function advanceCreateArchitectureToStep2Form(
		state: TaskState,
		projectTitle: string,
	): Promise<WorkflowRenderWorkflowFormNextAction> {
		const { documentBuildAction } = await startCreateArchitectureInitialDocumentBuild(state, projectTitle)
		const stepTwoFormAction = await runtime.handleToolBackedOperationToolResult({
			taskState: state,
			toolResultText: JSON.stringify({ ok: true }),
			runtimeOwnedSourceRoute: documentBuildAction.runtimeOwnedSourceRoute,
		})

		expect(stepTwoFormAction.kind).to.equal("render_workflow_form")
		if (stepTwoFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${stepTwoFormAction.kind}.`)
		}

		return stepTwoFormAction
	}

	async function submitActiveWorkflowFormPanelFields(
		state: TaskState,
		fields: WorkflowFormSubmissionRequest["fields"],
	): Promise<WorkflowNextAction> {
		const activeFormSession = getActiveFormSession(state)

		return runtime.submitWorkflowForm({
			taskState: state,
			request: createFormSubmitRequest({
				sessionId: activeFormSession.sessionId,
				panelId: activeFormSession.currentPanelId,
				fields,
			}),
		})
	}

	async function submitCreateArchitectureStep2InputFormWithAllValues(
		state: TaskState,
	): Promise<WorkflowExecuteToolBackedOperationNextAction> {
		const contextCheckAction = await submitActiveWorkflowFormPanelFields(state, [
			{ key: "has_context_files", value: { booleanValue: true } },
		])
		expect(contextCheckAction.kind).to.equal("render_workflow_form")

		const contextDetailsAction = await submitActiveWorkflowFormPanelFields(state, [
			{ key: "context_files", value: { stringValue: "docs/workflows/runtime.md" } },
		])
		expect(contextDetailsAction.kind).to.equal("render_workflow_form")

		const scopeAction = await submitActiveWorkflowFormPanelFields(state, [
			{ key: "scope", value: { stringValue: "Define runtime workflow orchestration." } },
		])
		expect(scopeAction.kind).to.equal("render_workflow_form")

		const goalsCheckAction = await submitActiveWorkflowFormPanelFields(state, [
			{ key: "has_architectural_goals", value: { booleanValue: true } },
		])
		expect(goalsCheckAction.kind).to.equal("render_workflow_form")

		const goalsDetailsAction = await submitActiveWorkflowFormPanelFields(state, [
			{ key: "architectural_goals", value: { stringValue: "Keep workflow state explicit and recoverable." } },
		])
		expect(goalsDetailsAction.kind).to.equal("render_workflow_form")

		const rulesCheckAction = await submitActiveWorkflowFormPanelFields(state, [
			{ key: "has_core_architectural_rules", value: { booleanValue: true } },
		])
		expect(rulesCheckAction.kind).to.equal("render_workflow_form")

		const completedAction = await submitActiveWorkflowFormPanelFields(state, [
			{ key: "core_architectural_rules", value: { stringValue: "Runtime-owned tools stay hidden from model steps." } },
		])
		expect(completedAction.kind).to.equal("execute_tool_backed_operation")
		if (completedAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${completedAction.kind}.`)
		}

		return completedAction
	}

	async function advanceCreateArchitectureToStep3ProjectPrompt(state: TaskState, projectTitle: string): Promise<void> {
		await advanceCreateArchitectureToStep2Form(state, projectTitle)
		const documentBuildAction = await submitCreateArchitectureStep2InputFormWithAllValues(state)
		const stepThreeAction = await runtime.handleToolBackedOperationToolResult({
			taskState: state,
			toolResultText: JSON.stringify({ ok: true }),
			runtimeOwnedSourceRoute: documentBuildAction.runtimeOwnedSourceRoute,
		})

		expect(stepThreeAction.kind).to.equal("project_prompt")
		expect(getActiveWorkflowSession(state).activeStepNumber).to.equal(3)
	}

	it("activates a valid workflow and initializes runtime-owned state", async () => {
		const workflow = createWorkflowDefinition()

		taskState.activeWorkflowName = "stale-workflow"
		taskState.activeWorkflowSession = {
			activeStepNumber: 99,
			workflowValues: {},
			projectSelection: {
				projectMode: "new",
				projectTitle: "Stale Project",
				projectFolderName: "stale-project",
			},
			lifecycle: {
				projectSelectionCompleted: true,
			},
			entryArtifactResolution: undefined,
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: ["stale-form-id"],
				suppressedWorkflowStepResolutionRoutes: [{ branchId: "stale-branch", routeId: "stale-route" }],
			},
			branchContext: {
				activeBranchId: "stale-branch",
			},
		}
		taskState.currentFocusChainChecklist = "stale checklist"
		expectNoLegacyWorkflowMirrors(taskState)

		const result = await activateWorkflow(taskState, workflow)
		const activeSession = getActiveWorkflowSession(taskState)

		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		expectNoLegacyWorkflowMirrors(taskState)
		expect(taskState.activeWorkflowName).to.equal(workflow.name)
		expect(activeSession.ui.formSession).to.exist
		expect(activeSession.ui.stepResolutionSession).to.be.undefined
		expect(activeSession.ui.suppressedWorkflowFormIds).to.deep.equal([])
		expect(activeSession.ui.suppressedWorkflowStepResolutionRoutes).to.deep.equal([])
		expect(result.payload.panel?.panelId).to.equal(ENTRY_INFO_PANEL_ID)
		expect(taskState.currentFocusChainChecklist).to.equal("1. Step 1 - Active\n2. Step 2 - Not Started")
	})

	it("activates the brainstorming workflow through the shared entry form and resolves its first Step 1 action", async () => {
		registerResolvedWorkflow(brainstormingWorkflowDefinition)

		const result = await runtime.activateWorkflow({
			taskState,
			workflowName: brainstormingWorkflowDefinition.name,
		})

		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		expect(result.formSession.workflowFormId).to.equal(ENTRY_FORM_ID)
		expect(result.payload.panel?.panelId).to.equal(ENTRY_INFO_PANEL_ID)
		expect(result.payload.panel?.promptMarkdown).to.include("interactive brainstorming session")
		expect(taskState.currentFocusChainChecklist).to.equal(
			"1. Gather Inputs - Active\n2. Resolve Session Approach - Not Started\n3. Perform Interactive Brainstorming - Not Started\n4. Organize Ideas & Plan Next Actions - Not Started",
		)

		const stepOneAction = await submitNewProjectSelection(taskState, "Brainstorming Runtime Project")

		expect(stepOneAction.kind).to.equal("execute_tool_backed_operation")
		if (stepOneAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${stepOneAction.kind}.`)
		}
		expect(stepOneAction.toolRequest.toolName).to.equal(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)
		expect(stepOneAction.toolRequest.toolParams).to.deep.equal({
			artifact_id: "brainstorming_session",
		})
		expect(stepOneAction.runtimeOwnedSourceRoute).to.deep.equal({
			branchId: "step-1-resolve-entry-artifact",
			routeId: "step-1-allocate-artifact",
		})
		expect(stepOneAction.toolBackedOperationSession).to.be.undefined
		expect(getActiveWorkflowSession(taskState).entryArtifactResolution?.artifactResolutions).to.deep.equal([
			{
				artifactId: "brainstorming_session",
				artifactFamily: WorkflowArtifactFamily.BrainstormingSession,
				artifactIdentity: "brainstorming_session",
				artifactFilename: "brainstorming.md",
				artifactRelativePath: join("discovery", "brainstorming.md"),
				artifactAbsolutePath: join(
					cwd,
					"docs",
					"projects",
					"brainstorming-runtime-project",
					"discovery",
					"brainstorming.md",
				),
				creationRequired: true,
				existingArtifactAction: "none",
			},
		])
		expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(1)
		expect(getActiveWorkflowSession(taskState).workflowValues).to.deep.include({
			projectMode: "new",
			projectTitle: "Brainstorming Runtime Project",
			projectFolderName: "brainstorming-runtime-project",
		})
	})

	it("routes brainstorming Step 1 allocation success and initial document build success to the setup form", async () => {
		registerResolvedWorkflow(brainstormingWorkflowDefinition)
		await runtime.activateWorkflow({
			taskState,
			workflowName: brainstormingWorkflowDefinition.name,
		})

		const allocationAction = await submitNewProjectSelection(taskState, "Brainstorming Runtime Project")

		expect(allocationAction.kind).to.equal("execute_tool_backed_operation")
		if (allocationAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${allocationAction.kind}.`)
		}
		expect(allocationAction.toolRequest.toolName).to.equal(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)
		expect(allocationAction.toolRequest.toolParams).to.deep.equal({
			artifact_id: "brainstorming_session",
		})
		expect(allocationAction.runtimeOwnedSourceRoute).to.deep.equal({
			branchId: "step-1-resolve-entry-artifact",
			routeId: "step-1-allocate-artifact",
		})
		expect(allocationAction.toolBackedOperationSession).to.be.undefined

		const artifactResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "brainstorming_session",
			expectedArtifactAbsolutePath: undefined,
		})
		expect(getActiveWorkflowSession(taskState).workflowValues.output_file).to.equal(artifactResult.artifactAbsolutePath)

		const documentBuildAction = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: JSON.stringify({ ok: true }),
			runtimeOwnedSourceRoute: allocationAction.runtimeOwnedSourceRoute,
		})

		expect(documentBuildAction.kind).to.equal("execute_tool_backed_operation")
		if (documentBuildAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${documentBuildAction.kind}.`)
		}
		expect(documentBuildAction.toolRequest.toolName).to.equal(ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT)
		expect(documentBuildAction.toolRequest.toolParams.artifact_id).to.equal("brainstorming_session")
		expect(documentBuildAction.toolRequest.toolParams.destination_path).to.equal(artifactResult.artifactAbsolutePath)
		expect(documentBuildAction.runtimeOwnedSourceRoute).to.deep.equal({
			branchId: "step-1-await-allocation",
			routeId: "step-1-build-initial-shell",
		})
		expect(documentBuildAction.toolBackedOperationSession).to.be.undefined

		const setupFormAction = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: JSON.stringify({ ok: true }),
			runtimeOwnedSourceRoute: documentBuildAction.runtimeOwnedSourceRoute,
		})

		expect(setupFormAction.kind).to.equal("render_workflow_form")
		if (setupFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${setupFormAction.kind}.`)
		}
		expect(setupFormAction.formSession.workflowFormId).to.equal("step-1-setup-form")
	})

	it("continues an existing brainstorming artifact into Step 3 without artifact or document tool operations", async () => {
		const projectName = "Existing Brainstorming"
		const existingArtifactContent = "# Existing brainstorming\n"
		const existingArtifactPath = join(cwd, "docs", "projects", projectName, "discovery", "brainstorming.md")
		await mkdir(join(cwd, "docs", "projects", projectName, "discovery"), { recursive: true })
		await writeFile(existingArtifactPath, existingArtifactContent, "utf8")
		registerResolvedWorkflow(brainstormingWorkflowDefinition)
		setDiscoveredProjects([projectName])
		await runtime.activateWorkflow({
			taskState,
			workflowName: brainstormingWorkflowDefinition.name,
		})

		const conflictResult = await submitExistingProjectSelectionFromExistingFolder(taskState, projectName)
		expect(conflictResult.kind).to.equal("render_workflow_form")
		if (conflictResult.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${conflictResult.kind}.`)
		}
		expect(conflictResult.formSession.currentPanelId).to.equal(ENTRY_ARTIFACT_CONFLICT_PANEL_ID)
		const result = await submitEntryArtifactConflictAction(taskState, "continue_existing")

		expect(result.kind).to.equal("project_prompt")
		if (result.kind !== "project_prompt") {
			throw new Error(`Expected project_prompt, received ${result.kind}.`)
		}
		expect(result.promptProjection.workflowInputPayloadBlock).to.contain("Step 3: Perform Interactive Brainstorming")
		const activeSession = getActiveWorkflowSession(taskState)
		expect(activeSession.activeStepNumber).to.equal(3)
		expect(activeSession.workflowValues).to.deep.include({
			projectMode: "existing",
			projectTitle: projectName,
			projectFolderName: projectName,
			output_artifact_family: WorkflowArtifactFamily.BrainstormingSession,
			output_artifact_identity: "brainstorming_session",
			output_artifact_filename: "brainstorming.md",
			output_artifact_relative_path: join("discovery", "brainstorming.md"),
			output_file: existingArtifactPath,
		})
		expect(activeSession.entryArtifactResolution?.artifactResolutions).to.deep.equal([
			{
				artifactId: "brainstorming_session",
				artifactFamily: WorkflowArtifactFamily.BrainstormingSession,
				artifactIdentity: "brainstorming_session",
				artifactFilename: "brainstorming.md",
				artifactRelativePath: join("discovery", "brainstorming.md"),
				artifactAbsolutePath: existingArtifactPath,
				creationRequired: false,
				existingArtifactAction: "continue_existing",
			},
		])
		expect(activeSession.ui.stepResolutionSession).to.be.undefined
		expect(await readFile(existingArtifactPath, "utf8")).to.equal(existingArtifactContent)
	})

	it("resolves only the unsuffixed shipped brainstorming workflow identity", () => {
		resolveWorkflowDefinitionStub.restore()

		const resolvedWorkflow = WorkflowRegistry.resolveWorkflowDefinition("brainstorming")

		expect(resolvedWorkflow).to.equal(brainstormingWorkflowDefinition)
		expect(resolvedWorkflow?.name).to.equal("brainstorming")
		expect(WorkflowRegistry.resolveWorkflowDefinition("brainstorming.md")).to.equal(undefined)
	})

	it("resolves only the unsuffixed shipped create-architecture workflow identity", () => {
		resolveWorkflowDefinitionStub.restore()

		const resolvedWorkflow = WorkflowRegistry.resolveWorkflowDefinition("create-architecture")

		expect(resolvedWorkflow).to.equal(createArchitectureWorkflowDefinition)
		expect(resolvedWorkflow?.name).to.equal("create-architecture")
		expect(WorkflowRegistry.resolveWorkflowDefinition("create-architecture.md")).to.equal(undefined)
	})

	it("resolves only the unsuffixed shipped create-epics workflow identity", () => {
		resolveWorkflowDefinitionStub.restore()

		const resolvedWorkflow = WorkflowRegistry.resolveWorkflowDefinition("create-epics")

		expect(resolvedWorkflow).to.equal(createEpicsWorkflowDefinition)
		expect(resolvedWorkflow?.name).to.equal("create-epics")
		expect(WorkflowRegistry.resolveWorkflowDefinition("create-epics.md")).to.equal(undefined)
	})

	it("resolves the shipped pi-planning workflow by workflow name, slash command, and use-skill name", () => {
		resolveWorkflowDefinitionStub.restore()

		expect(WorkflowRegistry.resolveWorkflowDefinition("pi-planning")).to.equal(piPlanningWorkflowDefinition)
		expect(WorkflowRegistry.resolveWorkflowBySlashCommand("pi-planning")).to.equal(piPlanningWorkflowDefinition)
		expect(WorkflowRegistry.resolveWorkflowByUseSkillName("pi-planning")).to.equal(piPlanningWorkflowDefinition)
	})

	it("does not resolve pi-planning markdown filename aliases", () => {
		resolveWorkflowDefinitionStub.restore()

		expect(WorkflowRegistry.resolveWorkflowDefinition("pi-planning.md")).to.equal(undefined)
		expect(WorkflowRegistry.resolveWorkflowBySlashCommand("pi-planning.md")).to.equal(undefined)
		expect(WorkflowRegistry.resolveWorkflowByUseSkillName("pi-planning.md")).to.equal(undefined)
	})

	it("activates create-architecture through the shared entry form and projects its nine-step checklist", async () => {
		registerResolvedWorkflow(createArchitectureWorkflowDefinition)

		const result = await runtime.activateWorkflow({
			taskState,
			workflowName: createArchitectureWorkflowDefinition.name,
		})

		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		expect(result.formSession.workflowFormId).to.equal(ENTRY_FORM_ID)
		expect(result.payload.panel?.panelId).to.equal(ENTRY_INFO_PANEL_ID)
		expect(result.payload.panel?.promptMarkdown).to.equal(createArchitectureWorkflowDefinition.description)
		expect(taskState.currentFocusChainChecklist).to.equal(
			"1. Generate Output Document - Active\n" +
				"2. Gather User Inputs - Not Started\n" +
				"3. Establish Architecture Foundational Elements - Not Started\n" +
				"4. Revolve Responsibility & Ownership - Not Started\n" +
				"5. Code Alignment Assessment - Not Started\n" +
				"6. Identify Key Tradeoffs & Risks - Not Started\n" +
				"7. Map out Blast Radius - Not Started\n" +
				"8. Build Project Roadmap - Not Started\n" +
				"9. Finalize Architecture Document - Not Started",
		)
	})

	it("starts create-architecture Step 1 artifact allocation after new project selection", async () => {
		registerResolvedWorkflow(createArchitectureWorkflowDefinition)
		await runtime.activateWorkflow({
			taskState,
			workflowName: createArchitectureWorkflowDefinition.name,
		})

		const stepOneAction = await submitNewProjectSelection(taskState, "Create Architecture Runtime Project")

		expect(stepOneAction.kind).to.equal("execute_tool_backed_operation")
		if (stepOneAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${stepOneAction.kind}.`)
		}
		expect(stepOneAction.toolRequest.toolName).to.equal(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)
		expect(stepOneAction.toolRequest.toolParams).to.deep.equal({
			artifact_id: "architecture_document",
		})
		expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(1)
	})

	it("routes create-architecture Step 1 allocation success to the initial shell document build", async () => {
		registerResolvedWorkflow(createArchitectureWorkflowDefinition)
		await runtime.activateWorkflow({
			taskState,
			workflowName: createArchitectureWorkflowDefinition.name,
		})
		const allocationAction = await submitNewProjectSelection(taskState, "Create Architecture Runtime Project")
		expect(allocationAction.kind).to.equal("execute_tool_backed_operation")
		if (allocationAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${allocationAction.kind}.`)
		}

		const artifactResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "architecture_document",
			expectedArtifactAbsolutePath: undefined,
		})
		expect(getActiveWorkflowSession(taskState).workflowValues.output_file).to.equal(artifactResult.artifactAbsolutePath)

		const documentBuildAction = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: JSON.stringify({ ok: true }),
			runtimeOwnedSourceRoute: allocationAction.runtimeOwnedSourceRoute,
		})

		expect(documentBuildAction.kind).to.equal("execute_tool_backed_operation")
		if (documentBuildAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${documentBuildAction.kind}.`)
		}
		expect(documentBuildAction.toolRequest.toolName).to.equal(ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT)
		expect(documentBuildAction.toolRequest.toolParams).to.deep.equal({
			artifact_id: "architecture_document",
			destination_path: artifactResult.artifactAbsolutePath,
			content: buildInitialCreateArchitectureDocument(),
		})
	})

	it("transitions create-architecture to Step 2 after the initial shell build succeeds", async () => {
		registerResolvedWorkflow(createArchitectureWorkflowDefinition)
		await runtime.activateWorkflow({
			taskState,
			workflowName: createArchitectureWorkflowDefinition.name,
		})
		const allocationAction = await submitNewProjectSelection(taskState, "Create Architecture Runtime Project")
		expect(allocationAction.kind).to.equal("execute_tool_backed_operation")
		if (allocationAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${allocationAction.kind}.`)
		}
		await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "architecture_document",
			expectedArtifactAbsolutePath: undefined,
		})
		const documentBuildAction = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: JSON.stringify({ ok: true }),
			runtimeOwnedSourceRoute: allocationAction.runtimeOwnedSourceRoute,
		})
		expect(documentBuildAction.kind).to.equal("execute_tool_backed_operation")
		if (documentBuildAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${documentBuildAction.kind}.`)
		}

		const stepTwoFormAction = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: JSON.stringify({ ok: true }),
			runtimeOwnedSourceRoute: documentBuildAction.runtimeOwnedSourceRoute,
		})

		expect(stepTwoFormAction.kind).to.equal("render_workflow_form")
		if (stepTwoFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${stepTwoFormAction.kind}.`)
		}
		expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(2)
		expect(stepTwoFormAction.formSession.workflowFormId).to.equal("step-2-user-input-form")
		expect(stepTwoFormAction.payload.panel?.panelId).to.equal("step-2-context-files-check-panel")
	})

	it("persists create-architecture Step 2 form values and builds the submitted-values document", async () => {
		await advanceCreateArchitectureToStep2Form(taskState, "Create Architecture Runtime Project")

		const documentBuildAction = await submitCreateArchitectureStep2InputFormWithAllValues(taskState)
		const activeSession = getActiveWorkflowSession(taskState)

		expect(activeSession.workflowValues).to.deep.include({
			has_context_files: true,
			context_files: "docs/workflows/runtime.md",
			scope: "Define runtime workflow orchestration.",
			has_architectural_goals: true,
			architectural_goals: "Keep workflow state explicit and recoverable.",
			has_core_architectural_rules: true,
			core_architectural_rules: "Runtime-owned tools stay hidden from model steps.",
		})
		expect(documentBuildAction.toolRequest.toolName).to.equal(ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT)
		expect(documentBuildAction.toolRequest.toolParams).to.deep.equal({
			artifact_id: "architecture_document",
			destination_path: activeSession.workflowValues.output_file,
			content: buildCreateArchitectureDocumentFromSession(activeSession),
		})
	})

	it("clears stale create-architecture Step 2 dependent text values when boolean controls are false", async () => {
		await advanceCreateArchitectureToStep2Form(taskState, "Create Architecture Runtime Project")
		const activeSession = getActiveWorkflowSession(taskState)
		activeSession.workflowValues.context_files = "stale-context.md"
		activeSession.workflowValues.architectural_goals = "Stale goals"
		activeSession.workflowValues.core_architectural_rules = "Stale rules"

		const contextCheckAction = await submitActiveWorkflowFormPanelFields(taskState, [
			{ key: "has_context_files", value: { booleanValue: false } },
		])
		expect(contextCheckAction.kind).to.equal("render_workflow_form")
		expect(activeSession.workflowValues).to.not.have.property("context_files")

		const scopeAction = await submitActiveWorkflowFormPanelFields(taskState, [
			{ key: "scope", value: { stringValue: "Define runtime workflow orchestration." } },
		])
		expect(scopeAction.kind).to.equal("render_workflow_form")

		const goalsCheckAction = await submitActiveWorkflowFormPanelFields(taskState, [
			{ key: "has_architectural_goals", value: { booleanValue: false } },
		])
		expect(goalsCheckAction.kind).to.equal("render_workflow_form")
		expect(activeSession.workflowValues).to.not.have.property("architectural_goals")

		const rulesCheckAction = await submitActiveWorkflowFormPanelFields(taskState, [
			{ key: "has_core_architectural_rules", value: { booleanValue: false } },
		])

		expect(rulesCheckAction.kind).to.equal("execute_tool_backed_operation")
		if (rulesCheckAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${rulesCheckAction.kind}.`)
		}
		expect(activeSession.workflowValues).to.deep.include({
			has_context_files: false,
			scope: "Define runtime workflow orchestration.",
			has_architectural_goals: false,
			has_core_architectural_rules: false,
		})
		expect(activeSession.workflowValues).to.not.have.property("core_architectural_rules")
		expect(rulesCheckAction.toolRequest.toolName).to.equal(ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT)
	})

	it("transitions create-architecture to Step 3 after the submitted-values document build succeeds", async () => {
		await advanceCreateArchitectureToStep2Form(taskState, "Create Architecture Runtime Project")
		const documentBuildAction = await submitCreateArchitectureStep2InputFormWithAllValues(taskState)

		const stepThreeAction = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: JSON.stringify({ ok: true }),
			runtimeOwnedSourceRoute: documentBuildAction.runtimeOwnedSourceRoute,
		})

		expect(stepThreeAction.kind).to.equal("project_prompt")
		expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(3)
	})

	it("advances create-architecture from Step 3 through Step 8 only after progress confirmation", async () => {
		await advanceCreateArchitectureToStep3ProjectPrompt(taskState, "Create Architecture Runtime Project")

		for (let stepNumber = 3; stepNumber <= 8; stepNumber += 1) {
			const deniedAction = await runtime.submitWorkflowProgressRequest({
				taskState,
				approved: false,
			})
			expect(deniedAction.kind).to.equal("project_prompt")
			expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(stepNumber)

			const confirmedAction = await runtime.submitWorkflowProgressRequest({
				taskState,
				approved: true,
			})
			expect(confirmedAction.kind).to.equal("project_prompt")
			expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(stepNumber + 1)
		}
	})

	it("preserves active workflow state when attempt_completion_succeeded has no matching route", async () => {
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "await-attempt-completion",
						branches: {
							"await-attempt-completion": {
								id: "await-attempt-completion",
								routes: [
									{
										id: "different-event",
										trigger: { kind: "on_event", eventKind: "workflow_progress_request_confirmed" },
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})
		const activeSession = createParentWorkflowSession()
		activeSession.branchContext.activeBranchId = "await-attempt-completion"
		activeSession.ui.stepResolutionSession = {
			sessionId: "step-resolution-1",
			sourceRoute: {
				branchId: "await-attempt-completion",
				routeId: "different-event",
			},
			triggerSource: "execute_tool_backed_operation",
			owner: {
				kind: "workflow_step",
				workflowName: workflow.name,
				stepNumber: 1,
			},
			state: "pending",
		}
		registerResolvedWorkflow(workflow)
		taskState.activeWorkflowName = workflow.name
		taskState.activeWorkflowSession = activeSession

		const result = await runtime.handleAttemptCompletionSucceeded({ taskState })

		expect(result).to.deep.equal({ kind: "no_op" })
		expect(taskState.activeWorkflowName).to.equal(workflow.name)
		expect(taskState.activeWorkflowSession).to.equal(activeSession)
		expect(activeSession.ui.stepResolutionSession).to.equal(undefined)
		expect(activeSession.branchContext.lastTriggerEvent).to.deep.equal({ kind: "attempt_completion_succeeded" })
	})

	it("routes attempt_completion_succeeded through decision tree complete_workflow", async () => {
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "await-attempt-completion",
						branches: {
							"await-attempt-completion": {
								id: "await-attempt-completion",
								routes: [
									{
										id: "attempt-completion-succeeded",
										trigger: { kind: "on_event", eventKind: "attempt_completion_succeeded" },
										action: { kind: "complete_workflow" },
									},
								],
							},
						},
					},
				}),
			},
		})
		const activeSession = createParentWorkflowSession()
		activeSession.branchContext.activeBranchId = "await-attempt-completion"
		registerResolvedWorkflow(workflow)
		taskState.activeWorkflowName = workflow.name
		taskState.activeWorkflowSession = activeSession

		const result = await runtime.handleAttemptCompletionSucceeded({ taskState })

		expect(result).to.deep.equal({ kind: "complete_workflow" })
		expectWorkflowStateCleared(taskState)
	})

	it("routes projected model_tool_succeeded through the active step decision tree", async () => {
		const toolName = ClineDefaultTool.PLAN_STORY_ARTIFACTS
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					toolSchema: createToolSchema(toolName),
					decisionTree: createModelToolLifecycleDecisionTree({
						toolName,
						successAction: createEntryBranchStepTransitionAction(2),
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})
		const activeSession = createParentWorkflowSession()
		activeSession.branchContext.activeBranchId = "await-model-tool"
		registerResolvedWorkflow(workflow)
		taskState.activeWorkflowName = workflow.name
		taskState.activeWorkflowSession = activeSession

		const result = await runtime.handleModelToolResult({
			taskState,
			toolName,
			toolResultText: "planned stories",
		})

		expect(result.kind).to.equal("project_prompt")
		expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(2)
	})

	it("routes projected model_tool_failed with normalized error text through the active step decision tree", async () => {
		const toolName = ClineDefaultTool.GENERATE_STORY_FILES
		const failureText = formatResponse.toolError("story generation failed")
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					toolSchema: createToolSchema(toolName),
					decisionTree: createModelToolLifecycleDecisionTree({
						toolName,
						failureAction: createEntryBranchStepTransitionAction(2),
						failureErrorMessage: failureText,
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})
		const activeSession = createParentWorkflowSession()
		activeSession.branchContext.activeBranchId = "await-model-tool"
		registerResolvedWorkflow(workflow)
		taskState.activeWorkflowName = workflow.name
		taskState.activeWorkflowSession = activeSession

		const result = await runtime.handleModelToolResult({
			taskState,
			toolName,
			toolResultText: failureText,
		})

		expect(result.kind).to.equal("project_prompt")
		expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(2)
	})

	it("does not route model-tool results for tools omitted from the active step projected schema", async () => {
		const unprojectedToolName = ClineDefaultTool.GENERATE_STORY_FILES
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					toolSchema: createToolSchema(ClineDefaultTool.PLAN_STORY_ARTIFACTS),
					decisionTree: createModelToolLifecycleDecisionTree({
						toolName: unprojectedToolName,
						successAction: createEntryBranchStepTransitionAction(2),
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})
		const activeSession = createParentWorkflowSession()
		activeSession.branchContext.activeBranchId = "await-model-tool"
		registerResolvedWorkflow(workflow)
		taskState.activeWorkflowName = workflow.name
		taskState.activeWorkflowSession = activeSession

		const result = await runtime.handleModelToolResult({
			taskState,
			toolName: unprojectedToolName,
			toolResultText: "generated stories",
		})

		expect(result).to.deep.equal({ kind: "no_op" })
		expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(1)
		expect(getActiveWorkflowSession(taskState).branchContext.lastTriggerEvent).to.equal(undefined)
	})

	it("copies complete parent project selection into child workflow activation without rendering entry form", async () => {
		const workflow = createWorkflowDefinition()
		registerResolvedWorkflow(workflow)
		const parentSession = createParentWorkflowSession()
		const childState = new TaskState()

		const result = await runtime.activateWorkflow({
			taskState: childState,
			workflowName: workflow.name,
			parentSession,
		})
		const childSession = getActiveWorkflowSession(childState)

		expect(result.kind).to.equal("project_prompt")
		expect(childSession.projectSelection).to.deep.equal(parentSession.projectSelection)
		expect(childSession.projectSelection).to.not.equal(parentSession.projectSelection)
		childSession.projectSelection.projectTitle = "Child Project"
		expect(parentSession.projectSelection.projectTitle).to.equal("Parent Project")
	})

	it("no-ops child workflow activation without mutating state when parent project selection is incomplete", async () => {
		const workflow = createWorkflowDefinition()
		registerResolvedWorkflow(workflow)
		const incompleteParentSessions = [
			createParentWorkflowSession({ projectTitle: "" }),
			createParentWorkflowSession({ projectFolderName: "" }),
		]

		for (const parentSession of incompleteParentSessions) {
			const childState = new TaskState()

			const result = await runtime.activateWorkflow({
				taskState: childState,
				workflowName: workflow.name,
				parentSession,
			})

			expect(result).to.deep.equal({ kind: "no_op" })
			expect(childState.activeWorkflowName).to.be.undefined
			expect(childState.activeWorkflowSession).to.be.undefined
		}
	})

	it("returns no_op and leaves task state unchanged for workflows with no steps", async () => {
		const invalidWorkflow = createWorkflowDefinition({
			steps: {} as WorkflowDefinition["steps"],
		})
		const existingSession: ActiveWorkflowSession = {
			activeStepNumber: 1,
			workflowValues: {},
			projectSelection: {
				projectMode: "new",
				projectTitle: "Existing Project",
				projectFolderName: "existing-project",
			},
			lifecycle: {
				projectSelectionCompleted: true,
			},
			entryArtifactResolution: undefined,
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: ["existing-form-id"],
				suppressedWorkflowStepResolutionRoutes: [{ branchId: "existing-branch", routeId: "existing-route" }],
			},
			branchContext: {
				activeBranchId: "existing-branch",
			},
		}
		const existingChecklist = "existing checklist"

		taskState.activeWorkflowName = "existing-workflow"
		taskState.activeWorkflowSession = existingSession
		taskState.currentFocusChainChecklist = existingChecklist
		expectNoLegacyWorkflowMirrors(taskState)

		const result = await activateWorkflow(taskState, invalidWorkflow)

		expect(result).to.deep.equal({ kind: "no_op" })
		expect(taskState.activeWorkflowName).to.equal("existing-workflow")
		expect(taskState.activeWorkflowSession).to.equal(existingSession)
		expectNoLegacyWorkflowMirrors(taskState)
		expect(taskState.currentFocusChainChecklist).to.equal(existingChecklist)
	})

	it("rejects invalid workflow value inventories and references before activation", async () => {
		const outputFileKeys = createStandaloneArtifactOutputValueKeys("output_file")
		const invalidWorkflows = [
			createWorkflowDefinition({ workflowValueKeys: [""] }),
			createWorkflowDefinition({ workflowValueKeys: [" alpha"] }),
			createWorkflowDefinition({ workflowValueKeys: ["alpha", "alpha"] }),
			createWorkflowDefinition({
				workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputFileKeys),
				artifacts: {
					output_file: {
						id: "output_file",
						family: WorkflowArtifactFamily.Epics,
						intentMode: "new",
						parentIdentitySource: undefined,
						targetIdentitySource: undefined,
						outputValueKeys: outputFileKeys,
					},
				},
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createToolBackedOperationDecisionTree({
							startAction: {
								kind: "build_workflow_document",
								instruction: createDocumentBuildActionInstruction({
									workflowValueWrites: {
										missing_key: "ready",
									},
								}),
							},
						}),
					}),
				},
			}),
			createWorkflowDefinition({
				workflowValueKeys: ["declared_key"],
				childInheritance: [{ parentKey: "parent_key", childKey: "missing_child_key" }],
			}),
		]

		for (const invalidWorkflow of invalidWorkflows) {
			const invalidState = new TaskState()
			const result = await activateWorkflow(invalidState, invalidWorkflow)

			expect(result).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName).to.be.undefined
			expect(invalidState.activeWorkflowSession).to.be.undefined
		}
	})

	it("rejects invalid entry project and workflow-form value destinations before activation", async () => {
		const createFormWithWorkflowValueKey = (workflowValueKey: string): WorkflowFormDefinitionPayload => ({
			definitionVersion: 2,
			title: "Invalid Value Destination Form",
			toolDictionaryTitle: "Invalid Value Destination Tools",
			toolDictionaryMarkdown: "Invalid destination help",
			firstPanelId: "details",
			panels: {
				details: {
					panelId: "details",
					title: "Details",
					promptMarkdown: "Capture details.",
					fields: [
						{
							key: "summary",
							workflowValueKey,
							kind: "small_text",
							label: "Summary",
							required: true,
							allowedValueType: "string",
						},
					],
					allowedActions: ["submit"],
					transition: createTerminalTransition(),
				},
			},
		})
		const invalidWorkflows = [
			createWorkflowDefinition({
				entryProjectValueKeys: {
					...DEFAULT_ENTRY_PROJECT_VALUE_KEYS,
					projectMode: "",
				},
				includeEntryProjectValueKeysInWorkflowValueKeys: false,
			}),
			createWorkflowDefinition({
				entryProjectValueKeys: {
					...DEFAULT_ENTRY_PROJECT_VALUE_KEYS,
					projectMode: " entry_project_mode",
				},
				includeEntryProjectValueKeysInWorkflowValueKeys: false,
			}),
			createWorkflowDefinition({
				entryProjectValueKeys: {
					...DEFAULT_ENTRY_PROJECT_VALUE_KEYS,
					projectMode: "missing_entry_project_mode",
				},
				includeEntryProjectValueKeysInWorkflowValueKeys: false,
				workflowValueKeys: [
					DEFAULT_ENTRY_PROJECT_VALUE_KEYS.projectTitle,
					DEFAULT_ENTRY_PROJECT_VALUE_KEYS.projectFolderName,
				],
			}),
			createWorkflowDefinition({
				workflowValueKeys: ["summary"],
				workflowForms: {
					invalid_form: createFormWithWorkflowValueKey(""),
				},
			}),
			createWorkflowDefinition({
				workflowValueKeys: ["summary"],
				workflowForms: {
					invalid_form: createFormWithWorkflowValueKey(" summary"),
				},
			}),
			createWorkflowDefinition({
				workflowValueKeys: ["summary"],
				workflowForms: {
					invalid_form: createFormWithWorkflowValueKey("missing_summary"),
				},
			}),
		]

		for (const invalidWorkflow of invalidWorkflows) {
			const invalidState = new TaskState()
			const result = await activateWorkflow(invalidState, invalidWorkflow)

			expect(result).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName).to.be.undefined
			expect(invalidState.activeWorkflowSession).to.be.undefined
		}
	})

	it("rejects invalid selector discovery target path segments before activation", async () => {
		const createFormWithSelectorDiscoveryTargetPathSegment = (targetPathSegment: string): WorkflowFormDefinitionPayload => ({
			definitionVersion: 2,
			title: "Invalid Selector Discovery Form",
			toolDictionaryTitle: "Invalid Selector Discovery Tools",
			toolDictionaryMarkdown: "Invalid selector discovery help",
			firstPanelId: "details",
			panels: {
				details: {
					panelId: "details",
					title: "Details",
					promptMarkdown: "Capture details.",
					fields: [
						{
							key: "selected_file",
							kind: "file_path",
							label: "Selected File",
							required: true,
							allowedValueType: "string",
							selectorDiscovery: {
								root: {
									kind: "selected_project_root",
								},
								entryType: "file",
								targetPathSegments: [targetPathSegment],
								immediateChildrenOnly: true,
								sort: "alpha_asc",
							},
							valueSchema: { type: "string" },
						},
					],
					allowedActions: ["submit"],
					transition: createTerminalTransition(),
				},
			},
		})
		const invalidTargetPathSegments: ReadonlyArray<{ readonly label: string; readonly segment: string }> = [
			{ label: "empty string", segment: "" },
			{ label: "current directory", segment: "." },
			{ label: "parent directory", segment: ".." },
			{ label: "slash", segment: "nested/path" },
			{ label: "backslash", segment: "nested\\path" },
			{ label: "absolute path", segment: join(cwd, "outside") },
			{ label: "Windows drive syntax", segment: "C:" },
		]

		for (const invalidTargetPathSegment of invalidTargetPathSegments) {
			const invalidState = new TaskState()
			const result = await activateWorkflow(
				invalidState,
				createWorkflowDefinition({
					workflowForms: {
						invalid_selector_discovery_form: createFormWithSelectorDiscoveryTargetPathSegment(
							invalidTargetPathSegment.segment,
						),
					},
				}),
			)

			expect(result, invalidTargetPathSegment.label).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName, invalidTargetPathSegment.label).to.be.undefined
			expect(invalidState.activeWorkflowSession, invalidTargetPathSegment.label).to.be.undefined
		}
	})

	it("rejects move_project_file routes with invalid source or destination folder segments before activation", async () => {
		const invalidFolderSegments: ReadonlyArray<{ readonly label: string; readonly segment: string }> = [
			{ label: "empty string", segment: "" },
			{ label: "current directory", segment: "." },
			{ label: "parent directory", segment: ".." },
			{ label: "slash", segment: "nested/path" },
			{ label: "backslash", segment: "nested\\path" },
			{ label: "absolute path", segment: join(cwd, "outside") },
			{ label: "Windows drive syntax", segment: "C:" },
		]

		for (const invalidFolderSegment of invalidFolderSegments) {
			const invalidSourceState = new TaskState()
			const invalidSourceWorkflow = createWorkflowDefinition({
				workflowValueKeys: [MOVE_PROJECT_FILE_FILENAME_KEY],
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createToolBackedOperationDecisionTree({
							startAction: createMoveProjectFileAction({
								sourceFolderSegments: ["implementation", invalidFolderSegment.segment],
								destinationFolderSegments: ["implementation", "stories-review"],
								filenameWorkflowValueKey: MOVE_PROJECT_FILE_FILENAME_KEY,
							}),
						}),
					}),
				},
			})

			const invalidSourceResult = await activateWorkflow(invalidSourceState, invalidSourceWorkflow)
			expect(invalidSourceResult, `source ${invalidFolderSegment.label}`).to.deep.equal({ kind: "no_op" })
			expect(invalidSourceState.activeWorkflowName, `source ${invalidFolderSegment.label}`).to.be.undefined
			expect(invalidSourceState.activeWorkflowSession, `source ${invalidFolderSegment.label}`).to.be.undefined

			const invalidDestinationState = new TaskState()
			const invalidDestinationWorkflow = createWorkflowDefinition({
				workflowValueKeys: [MOVE_PROJECT_FILE_FILENAME_KEY],
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createToolBackedOperationDecisionTree({
							startAction: createMoveProjectFileAction({
								sourceFolderSegments: ["implementation", "stories-backlog"],
								destinationFolderSegments: ["implementation", invalidFolderSegment.segment],
								filenameWorkflowValueKey: MOVE_PROJECT_FILE_FILENAME_KEY,
							}),
						}),
					}),
				},
			})

			const invalidDestinationResult = await activateWorkflow(invalidDestinationState, invalidDestinationWorkflow)
			expect(invalidDestinationResult, `destination ${invalidFolderSegment.label}`).to.deep.equal({ kind: "no_op" })
			expect(invalidDestinationState.activeWorkflowName, `destination ${invalidFolderSegment.label}`).to.be.undefined
			expect(invalidDestinationState.activeWorkflowSession, `destination ${invalidFolderSegment.label}`).to.be.undefined
		}
	})

	it("rejects move_project_file routes with invalid filename workflow-value keys before activation", async () => {
		const invalidFilenameKeyCases: ReadonlyArray<{
			readonly label: string
			readonly filenameWorkflowValueKey: string
			readonly workflowValueKeys: readonly string[]
		}> = [
			{
				label: "blank",
				filenameWorkflowValueKey: "",
				workflowValueKeys: [MOVE_PROJECT_FILE_FILENAME_KEY],
			},
			{
				label: "untrimmed",
				filenameWorkflowValueKey: ` ${MOVE_PROJECT_FILE_FILENAME_KEY}`,
				workflowValueKeys: [MOVE_PROJECT_FILE_FILENAME_KEY],
			},
			{
				label: "undeclared",
				filenameWorkflowValueKey: "missing_story_filename",
				workflowValueKeys: [MOVE_PROJECT_FILE_FILENAME_KEY],
			},
		]

		for (const invalidFilenameKeyCase of invalidFilenameKeyCases) {
			const invalidState = new TaskState()
			const invalidWorkflow = createWorkflowDefinition({
				workflowValueKeys: invalidFilenameKeyCase.workflowValueKeys,
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createToolBackedOperationDecisionTree({
							startAction: createMoveProjectFileAction({
								sourceFolderSegments: ["implementation", "stories-backlog"],
								destinationFolderSegments: ["implementation", "stories-review"],
								filenameWorkflowValueKey: invalidFilenameKeyCase.filenameWorkflowValueKey,
							}),
						}),
					}),
				},
			})

			const result = await activateWorkflow(invalidState, invalidWorkflow)
			expect(result, invalidFilenameKeyCase.label).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName, invalidFilenameKeyCase.label).to.be.undefined
			expect(invalidState.activeWorkflowSession, invalidFilenameKeyCase.label).to.be.undefined
		}
	})

	it("rejects invalid prerequisite file declarations before activation", async () => {
		const invalidPrerequisiteCases: ReadonlyArray<{
			readonly label: string
			readonly prerequisiteKey: string
			readonly definition: WorkflowPrerequisiteFileDefinition
			readonly workflowValueKeys: readonly string[]
		}> = [
			{
				label: "record key mismatch",
				prerequisiteKey: "requirements",
				definition: createPrerequisiteFileDefinition({ id: "different-requirements" }),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "blank id",
				prerequisiteKey: "",
				definition: createPrerequisiteFileDefinition({ id: "" }),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "untrimmed id",
				prerequisiteKey: " requirements",
				definition: createPrerequisiteFileDefinition({ id: " requirements" }),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "blank producing workflow",
				prerequisiteKey: "requirements",
				definition: createPrerequisiteFileDefinition({ producingWorkflowName: "" }),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "untrimmed producing workflow",
				prerequisiteKey: "requirements",
				definition: createPrerequisiteFileDefinition({ producingWorkflowName: " create-prd" }),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "blank workflow value key",
				prerequisiteKey: "requirements",
				definition: createPrerequisiteFileDefinition({ workflowValueKey: "" }),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "untrimmed workflow value key",
				prerequisiteKey: "requirements",
				definition: createPrerequisiteFileDefinition({ workflowValueKey: " requirements_path" }),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "undeclared workflow value key",
				prerequisiteKey: "requirements",
				definition: createPrerequisiteFileDefinition({ workflowValueKey: "missing_requirements_path" }),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "malformed requirement",
				prerequisiteKey: "requirements",
				definition: createMalformedPrerequisiteFileDefinition((definition) => {
					Object.assign(definition, { requirement: "recommended" })
				}),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "malformed output document reference",
				prerequisiteKey: "requirements",
				definition: createMalformedPrerequisiteFileDefinition((definition) => {
					Object.assign(definition, { outputDocumentReference: "artifact" })
				}),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "invalid project subfolder segment",
				prerequisiteKey: "requirements",
				definition: createPrerequisiteFileDefinition({ projectSubfolderSegments: ["planning/nested"] }),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "blank exact filename",
				prerequisiteKey: "requirements",
				definition: createPrerequisiteFileDefinition({
					match: {
						kind: "exact_filename",
						filename: "",
					},
				}),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "untrimmed exact filename",
				prerequisiteKey: "requirements",
				definition: createPrerequisiteFileDefinition({
					match: {
						kind: "exact_filename",
						filename: " requirements.md",
					},
				}),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "unsafe exact filename",
				prerequisiteKey: "requirements",
				definition: createPrerequisiteFileDefinition({
					match: {
						kind: "exact_filename",
						filename: "nested/requirements.md",
					},
				}),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "unknown match kind",
				prerequisiteKey: "requirements",
				definition: createMalformedPrerequisiteFileDefinition((definition) => {
					Object.assign(definition, {
						match: {
							kind: "glob",
							pattern: "*.md",
						},
					})
				}),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "missing match kind",
				prerequisiteKey: "requirements",
				definition: createMalformedPrerequisiteFileDefinition((definition) => {
					Object.assign(definition, {
						match: {
							filename: "requirements.md",
						},
					})
				}),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "non-string match kind",
				prerequisiteKey: "requirements",
				definition: createMalformedPrerequisiteFileDefinition((definition) => {
					Object.assign(definition, {
						match: {
							kind: 1,
							filename: "requirements.md",
						},
					})
				}),
				workflowValueKeys: ["requirements_path"],
			},
			{
				label: "non-RegExp naming pattern",
				prerequisiteKey: "requirements",
				definition: createMalformedPrerequisiteFileDefinition((definition) => {
					Object.assign(definition, {
						match: {
							kind: "naming_pattern",
							pattern: "^requirements\\.md$",
						},
					})
				}),
				workflowValueKeys: ["requirements_path"],
			},
		]

		for (const invalidPrerequisiteCase of invalidPrerequisiteCases) {
			const invalidState = new TaskState()
			const invalidWorkflow = createWorkflowDefinition({
				workflowValueKeys: invalidPrerequisiteCase.workflowValueKeys,
				prerequisiteFiles: {
					[invalidPrerequisiteCase.prerequisiteKey]: invalidPrerequisiteCase.definition,
				},
			})

			const result = await activateWorkflow(invalidState, invalidWorkflow)
			expect(result, invalidPrerequisiteCase.label).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName, invalidPrerequisiteCase.label).to.be.undefined
			expect(invalidState.activeWorkflowSession, invalidPrerequisiteCase.label).to.be.undefined
		}
	})

	it("rejects invalid resolve_prerequisite_files routes before activation", async () => {
		const invalidRouteCases: ReadonlyArray<{
			readonly label: string
			readonly prerequisiteIds: readonly string[]
		}> = [
			{ label: "empty ids", prerequisiteIds: [] },
			{ label: "blank id", prerequisiteIds: [""] },
			{ label: "untrimmed id", prerequisiteIds: [" requirements"] },
			{ label: "duplicate id", prerequisiteIds: ["requirements", "requirements"] },
			{ label: "missing id", prerequisiteIds: ["missing_requirements"] },
		]

		for (const invalidRouteCase of invalidRouteCases) {
			const invalidState = new TaskState()
			const invalidWorkflow = createWorkflowDefinition({
				workflowValueKeys: ["requirements_path"],
				prerequisiteFiles: {
					requirements: createPrerequisiteFileDefinition(),
				},
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createToolBackedOperationDecisionTree({
							startAction: createResolvePrerequisiteFilesAction(invalidRouteCase.prerequisiteIds),
						}),
					}),
				},
			})

			const result = await activateWorkflow(invalidState, invalidWorkflow)
			expect(result, invalidRouteCase.label).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName, invalidRouteCase.label).to.be.undefined
			expect(invalidState.activeWorkflowSession, invalidRouteCase.label).to.be.undefined
		}
	})

	it("renders a required prerequisite cannot-continue panel when no exact filename matches", async () => {
		const { workflow } = createPrerequisiteResolutionWorkflow({
			prerequisite: createPrerequisiteFileDefinition({
				producingWorkflowName: "create-prd",
				match: {
					kind: "exact_filename",
					filename: "requirements.md",
				},
			}),
		})
		await activateWorkflow(taskState, workflow)

		const result = await submitNewProjectSelection(taskState, "prerequisite-no-match")

		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		expect(result.payload.panel?.panelId).to.equal(PREREQUISITE_CANNOT_CONTINUE_PANEL_ID)
		expect(result.payload.panel?.promptMarkdown).to.include("create-prd")
		expect(result.payload.panel?.promptMarkdown).to.include("cannot continue without the required prerequisite file")

		const repeated = await runtime.resolveNextAction({ taskState })
		expect(repeated.kind).to.equal("render_workflow_form")
		if (repeated.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${repeated.kind}.`)
		}
		expect(repeated.payload.panel?.panelId).to.equal(PREREQUISITE_CANNOT_CONTINUE_PANEL_ID)
	})

	it("returns no_op when prerequisite form handling receives a runtime-routed submission", async () => {
		const { workflow } = createPrerequisiteResolutionWorkflow()
		await activateWorkflow(taskState, workflow)

		const prerequisitePrompt = await submitNewProjectSelection(taskState, "prerequisite-runtime-routed-submission")
		expect(prerequisitePrompt.kind).to.equal("render_workflow_form")
		if (prerequisitePrompt.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${prerequisitePrompt.kind}.`)
		}
		expect(prerequisitePrompt.formSession.currentPanelId).to.equal(PREREQUISITE_CANNOT_CONTINUE_PANEL_ID)
		const activePanel = prerequisitePrompt.formSession.definitionPayload.panels[prerequisitePrompt.formSession.currentPanelId]
		if (activePanel === undefined) {
			throw new Error("Expected an active prerequisite form panel.")
		}
		activePanel.transition = { type: "runtime_routed" }

		const result = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: prerequisitePrompt.formSession.sessionId,
				panelId: prerequisitePrompt.formSession.currentPanelId,
			}),
		})

		expect(result).to.deep.equal({ kind: "no_op" })
	})

	it("persists a required one-match prerequisite path after confirmation and continues next-action evaluation", async () => {
		const projectFolderName = "prerequisite-one-match"
		const prerequisitePath = await writePrerequisiteProjectFile(projectFolderName, join("planning", "requirements.md"))
		const { workflow, prerequisite } = createPrerequisiteResolutionWorkflow()
		await activateWorkflow(taskState, workflow)

		const result = await submitNewProjectSelection(taskState, projectFolderName)

		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		expect(result.payload.panel?.promptMarkdown).to.include("requirements.md")
		expect(result.payload.panel?.promptMarkdown).to.include(prerequisitePath)
		const confirmationField = result.payload.panel?.fields.find(
			(field) => field.key === PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY,
		)
		expect(confirmationField?.kind).to.equal("boolean")
		expect(confirmationField?.required).to.equal(true)

		const accepted = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: result.formSession.sessionId,
				panelId: result.formSession.currentPanelId,
				fields: [
					{
						key: PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY,
						value: { booleanValue: true },
					},
				],
			}),
		})

		expect(getActiveWorkflowSession(taskState).workflowValues[prerequisite.workflowValueKey]).to.equal(prerequisitePath)
		expect(accepted.kind).to.equal("execute_tool_backed_operation")
		if (accepted.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${accepted.kind}.`)
		}
		expect(accepted.toolRequest.toolName).to.equal(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)
	})

	it("renders cannot-continue without persisting a path when a required one-match prerequisite is rejected", async () => {
		const projectFolderName = "prerequisite-one-match-rejected"
		await writePrerequisiteProjectFile(projectFolderName, join("planning", "requirements.md"))
		const { workflow, prerequisite } = createPrerequisiteResolutionWorkflow()
		await activateWorkflow(taskState, workflow)
		const result = await submitNewProjectSelection(taskState, projectFolderName)
		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}

		const rejected = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: result.formSession.sessionId,
				panelId: result.formSession.currentPanelId,
				fields: [
					{
						key: PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY,
						value: { booleanValue: false },
					},
				],
			}),
		})

		expect(getActiveWorkflowSession(taskState).workflowValues[prerequisite.workflowValueKey]).to.be.undefined
		expect(rejected.kind).to.equal("render_workflow_form")
		if (rejected.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${rejected.kind}.`)
		}
		expect(rejected.payload.panel?.panelId).to.equal(PREREQUISITE_CANNOT_CONTINUE_PANEL_ID)
	})

	it("persists the selected full path from a required multi-match prerequisite dropdown", async () => {
		const projectFolderName = "prerequisite-multi-match"
		const alphaPath = await writePrerequisiteProjectFile(projectFolderName, join("planning", "requirements-alpha.md"))
		const betaPath = await writePrerequisiteProjectFile(projectFolderName, join("planning", "requirements-beta.md"))
		const { workflow, prerequisite } = createPrerequisiteResolutionWorkflow({
			prerequisite: createPrerequisiteFileDefinition({
				match: {
					kind: "naming_pattern",
					pattern: /^requirements-.+\.md$/,
				},
			}),
		})
		await activateWorkflow(taskState, workflow)

		const result = await submitNewProjectSelection(taskState, projectFolderName)

		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		const dropdownField = result.payload.panel?.fields.find((field) => field.key === PREREQUISITE_SELECTED_FILE_FIELD_KEY)
		expect(dropdownField?.kind).to.equal("dropdown")
		expect(dropdownField?.required).to.equal(true)
		expect(dropdownField?.options?.map((option) => option.value)).to.deep.equal([alphaPath, betaPath])
		expect(dropdownField?.options?.[0]?.label).to.include("requirements-alpha.md")
		expect(dropdownField?.options?.[1]?.label).to.include("requirements-beta.md")

		const selected = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: result.formSession.sessionId,
				panelId: result.formSession.currentPanelId,
				fields: [
					{
						key: PREREQUISITE_SELECTED_FILE_FIELD_KEY,
						value: { stringValue: betaPath },
					},
				],
			}),
		})

		expect(getActiveWorkflowSession(taskState).workflowValues[prerequisite.workflowValueKey]).to.equal(betaPath)
		expect(selected.kind).to.equal("execute_tool_backed_operation")
		if (selected.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${selected.kind}.`)
		}
		expect(selected.toolRequest.toolName).to.equal(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)
	})

	it("routes required multi-match prerequisite cancel to cannot-continue without proceeding", async () => {
		const projectFolderName = "prerequisite-multi-match-cancel"
		await writePrerequisiteProjectFile(projectFolderName, join("planning", "requirements-alpha.md"))
		await writePrerequisiteProjectFile(projectFolderName, join("planning", "requirements-beta.md"))
		const { workflow, prerequisite } = createPrerequisiteResolutionWorkflow({
			prerequisite: createPrerequisiteFileDefinition({
				match: {
					kind: "naming_pattern",
					pattern: /^requirements-.+\.md$/,
				},
			}),
		})
		await activateWorkflow(taskState, workflow)
		const result = await submitNewProjectSelection(taskState, projectFolderName)
		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}

		const cancelled = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: result.formSession.sessionId,
				panelId: result.formSession.currentPanelId,
				action: WorkflowFormAction.CANCEL,
			}),
		})

		expect(getActiveWorkflowSession(taskState).workflowValues[prerequisite.workflowValueKey]).to.be.undefined
		expect(cancelled.kind).to.equal("render_workflow_form")
		if (cancelled.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${cancelled.kind}.`)
		}
		expect(cancelled.payload.panel?.panelId).to.equal(PREREQUISITE_CANNOT_CONTINUE_PANEL_ID)
		const repeated = await runtime.resolveNextAction({ taskState })
		expect(repeated.kind).to.equal("render_workflow_form")
		if (repeated.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${repeated.kind}.`)
		}
		expect(repeated.payload.panel?.panelId).to.equal(PREREQUISITE_CANNOT_CONTINUE_PANEL_ID)
	})

	it("skips optional no-match prerequisites and continues next-action evaluation", async () => {
		const { workflow, prerequisite } = createPrerequisiteResolutionWorkflow({
			prerequisite: createPrerequisiteFileDefinition({
				requirement: "optional",
				match: {
					kind: "exact_filename",
					filename: "optional-context.md",
				},
			}),
		})
		await activateWorkflow(taskState, workflow)

		const result = await submitNewProjectSelection(taskState, "optional-prerequisite-no-match")

		expect(getActiveWorkflowSession(taskState).workflowValues[prerequisite.workflowValueKey]).to.be.undefined
		expect(getActiveWorkflowSession(taskState).ui.formSession).to.be.undefined
		expect(result.kind).to.equal("execute_tool_backed_operation")
		if (result.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${result.kind}.`)
		}
		expect(result.toolRequest.toolName).to.equal(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)
	})

	it("continues optional prerequisite flows with or without persisted selections", async () => {
		const expectArtifactAllocation = (action: WorkflowNextAction, label: string): void => {
			expect(action.kind, label).to.equal("execute_tool_backed_operation")
			if (action.kind !== "execute_tool_backed_operation") {
				throw new Error(`Expected execute_tool_backed_operation for ${label}, received ${action.kind}.`)
			}
			expect(action.toolRequest.toolName, label).to.equal(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)
		}

		const oneMatchAcceptState = new TaskState()
		const oneMatchAcceptFolder = "optional-one-match-accept"
		const oneMatchPath = await writePrerequisiteProjectFile(oneMatchAcceptFolder, join("planning", "optional.md"))
		const oneMatchAcceptPrerequisite = createPrerequisiteFileDefinition({
			requirement: "optional",
			match: {
				kind: "exact_filename",
				filename: "optional.md",
			},
		})
		const oneMatchAcceptWorkflow = createPrerequisiteResolutionWorkflow({
			prerequisite: oneMatchAcceptPrerequisite,
		}).workflow
		await activateWorkflow(oneMatchAcceptState, oneMatchAcceptWorkflow)
		const oneMatchPrompt = await submitNewProjectSelection(oneMatchAcceptState, oneMatchAcceptFolder)
		expect(oneMatchPrompt.kind).to.equal("render_workflow_form")
		if (oneMatchPrompt.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${oneMatchPrompt.kind}.`)
		}
		const oneMatchAccepted = await runtime.submitWorkflowForm({
			taskState: oneMatchAcceptState,
			request: createFormSubmitRequest({
				sessionId: oneMatchPrompt.formSession.sessionId,
				panelId: oneMatchPrompt.formSession.currentPanelId,
				fields: [
					{
						key: PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY,
						value: { booleanValue: true },
					},
				],
			}),
		})
		expect(
			getActiveWorkflowSession(oneMatchAcceptState).workflowValues[oneMatchAcceptPrerequisite.workflowValueKey],
		).to.equal(oneMatchPath)
		expectArtifactAllocation(oneMatchAccepted, "optional one-match accepted")

		const oneMatchRejectState = new TaskState()
		const oneMatchRejectFolder = "optional-one-match-reject"
		await writePrerequisiteProjectFile(oneMatchRejectFolder, join("planning", "optional.md"))
		const oneMatchRejectWorkflow = createPrerequisiteResolutionWorkflow({
			prerequisite: oneMatchAcceptPrerequisite,
		}).workflow
		await activateWorkflow(oneMatchRejectState, oneMatchRejectWorkflow)
		const oneMatchRejectPrompt = await submitNewProjectSelection(oneMatchRejectState, oneMatchRejectFolder)
		expect(oneMatchRejectPrompt.kind).to.equal("render_workflow_form")
		if (oneMatchRejectPrompt.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${oneMatchRejectPrompt.kind}.`)
		}
		const oneMatchRejected = await runtime.submitWorkflowForm({
			taskState: oneMatchRejectState,
			request: createFormSubmitRequest({
				sessionId: oneMatchRejectPrompt.formSession.sessionId,
				panelId: oneMatchRejectPrompt.formSession.currentPanelId,
				fields: [
					{
						key: PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY,
						value: { booleanValue: false },
					},
				],
			}),
		})
		expect(getActiveWorkflowSession(oneMatchRejectState).workflowValues[oneMatchAcceptPrerequisite.workflowValueKey]).to.be
			.undefined
		expectArtifactAllocation(oneMatchRejected, "optional one-match rejected")

		const multiMatchPrerequisite = createPrerequisiteFileDefinition({
			requirement: "optional",
			match: {
				kind: "naming_pattern",
				pattern: /^optional-.+\.md$/,
			},
		})

		const multiMatchSelectedState = new TaskState()
		const multiMatchSelectedFolder = "optional-multi-match-selected"
		await writePrerequisiteProjectFile(multiMatchSelectedFolder, join("planning", "optional-alpha.md"))
		const selectedMultiMatchPath = await writePrerequisiteProjectFile(
			multiMatchSelectedFolder,
			join("planning", "optional-beta.md"),
		)
		const multiMatchSelectedWorkflow = createPrerequisiteResolutionWorkflow({
			prerequisite: multiMatchPrerequisite,
		}).workflow
		await activateWorkflow(multiMatchSelectedState, multiMatchSelectedWorkflow)
		const multiMatchPrompt = await submitNewProjectSelection(multiMatchSelectedState, multiMatchSelectedFolder)
		expect(multiMatchPrompt.kind).to.equal("render_workflow_form")
		if (multiMatchPrompt.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${multiMatchPrompt.kind}.`)
		}
		const multiMatchSelected = await runtime.submitWorkflowForm({
			taskState: multiMatchSelectedState,
			request: createFormSubmitRequest({
				sessionId: multiMatchPrompt.formSession.sessionId,
				panelId: multiMatchPrompt.formSession.currentPanelId,
				fields: [
					{
						key: PREREQUISITE_SELECTED_FILE_FIELD_KEY,
						value: { stringValue: selectedMultiMatchPath },
					},
				],
			}),
		})
		expect(
			getActiveWorkflowSession(multiMatchSelectedState).workflowValues[multiMatchPrerequisite.workflowValueKey],
		).to.equal(selectedMultiMatchPath)
		expectArtifactAllocation(multiMatchSelected, "optional multi-match selected")

		const multiMatchCancelState = new TaskState()
		const multiMatchCancelFolder = "optional-multi-match-cancel"
		await writePrerequisiteProjectFile(multiMatchCancelFolder, join("planning", "optional-alpha.md"))
		await writePrerequisiteProjectFile(multiMatchCancelFolder, join("planning", "optional-beta.md"))
		const multiMatchCancelWorkflow = createPrerequisiteResolutionWorkflow({
			prerequisite: multiMatchPrerequisite,
		}).workflow
		await activateWorkflow(multiMatchCancelState, multiMatchCancelWorkflow)
		const multiMatchCancelPrompt = await submitNewProjectSelection(multiMatchCancelState, multiMatchCancelFolder)
		expect(multiMatchCancelPrompt.kind).to.equal("render_workflow_form")
		if (multiMatchCancelPrompt.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${multiMatchCancelPrompt.kind}.`)
		}
		const multiMatchCancelled = await runtime.submitWorkflowForm({
			taskState: multiMatchCancelState,
			request: createFormSubmitRequest({
				sessionId: multiMatchCancelPrompt.formSession.sessionId,
				panelId: multiMatchCancelPrompt.formSession.currentPanelId,
				action: WorkflowFormAction.CANCEL,
			}),
		})
		expect(getActiveWorkflowSession(multiMatchCancelState).workflowValues[multiMatchPrerequisite.workflowValueKey]).to.be
			.undefined
		expectArtifactAllocation(multiMatchCancelled, "optional multi-match cancelled")

		const multiMatchNoSelectionState = new TaskState()
		const multiMatchNoSelectionFolder = "optional-multi-match-no-selection"
		await writePrerequisiteProjectFile(multiMatchNoSelectionFolder, join("planning", "optional-alpha.md"))
		await writePrerequisiteProjectFile(multiMatchNoSelectionFolder, join("planning", "optional-beta.md"))
		const multiMatchNoSelectionWorkflow = createPrerequisiteResolutionWorkflow({
			prerequisite: multiMatchPrerequisite,
		}).workflow
		await activateWorkflow(multiMatchNoSelectionState, multiMatchNoSelectionWorkflow)
		const multiMatchNoSelectionPrompt = await submitNewProjectSelection(
			multiMatchNoSelectionState,
			multiMatchNoSelectionFolder,
		)
		expect(multiMatchNoSelectionPrompt.kind).to.equal("render_workflow_form")
		if (multiMatchNoSelectionPrompt.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${multiMatchNoSelectionPrompt.kind}.`)
		}
		const multiMatchNoSelection = await runtime.submitWorkflowForm({
			taskState: multiMatchNoSelectionState,
			request: createFormSubmitRequest({
				sessionId: multiMatchNoSelectionPrompt.formSession.sessionId,
				panelId: multiMatchNoSelectionPrompt.formSession.currentPanelId,
			}),
		})
		expect(getActiveWorkflowSession(multiMatchNoSelectionState).workflowValues[multiMatchPrerequisite.workflowValueKey]).to.be
			.undefined
		expectArtifactAllocation(multiMatchNoSelection, "optional multi-match no selection")
	})

	it("accumulates skipped optional prerequisites across repeated cancels", async () => {
		const projectFolderName = "optional-prerequisites-repeated-cancel"
		const firstPath = await writePrerequisiteProjectFile(projectFolderName, join("planning", "optional-alpha.md"))
		const secondPath = await writePrerequisiteProjectFile(projectFolderName, join("planning", "optional-beta.md"))
		const firstPrerequisite = createPrerequisiteFileDefinition({
			id: "optional-alpha",
			requirement: "optional",
			match: {
				kind: "exact_filename",
				filename: "optional-alpha.md",
			},
			workflowValueKey: "optional_alpha_path",
		})
		const secondPrerequisite = createPrerequisiteFileDefinition({
			id: "optional-beta",
			requirement: "optional",
			match: {
				kind: "exact_filename",
				filename: "optional-beta.md",
			},
			workflowValueKey: "optional_beta_path",
		})
		const { workflow } = createMultiPrerequisiteResolutionWorkflow({
			prerequisites: [firstPrerequisite, secondPrerequisite],
		})
		await activateWorkflow(taskState, workflow)

		const firstPrompt = await submitNewProjectSelection(taskState, projectFolderName)
		expect(firstPrompt.kind).to.equal("render_workflow_form")
		if (firstPrompt.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${firstPrompt.kind}.`)
		}
		expect(firstPrompt.payload.panel?.promptMarkdown).to.include(firstPath)

		const secondPrompt = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: firstPrompt.formSession.sessionId,
				panelId: firstPrompt.formSession.currentPanelId,
				action: WorkflowFormAction.CANCEL,
			}),
		})
		expect(secondPrompt.kind).to.equal("render_workflow_form")
		if (secondPrompt.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${secondPrompt.kind}.`)
		}
		expect(secondPrompt.payload.panel?.promptMarkdown).to.include(secondPath)
		expect(secondPrompt.payload.panel?.promptMarkdown).to.not.include(firstPath)

		const allocated = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: secondPrompt.formSession.sessionId,
				panelId: secondPrompt.formSession.currentPanelId,
				action: WorkflowFormAction.CANCEL,
			}),
		})

		expect(getActiveWorkflowSession(taskState).workflowValues[firstPrerequisite.workflowValueKey]).to.be.undefined
		expect(getActiveWorkflowSession(taskState).workflowValues[secondPrerequisite.workflowValueKey]).to.be.undefined
		expect(getActiveWorkflowSession(taskState).ui.formSession).to.be.undefined
		expect(allocated.kind).to.equal("execute_tool_backed_operation")
		if (allocated.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${allocated.kind}.`)
		}
		expect(allocated.toolRequest.toolName).to.equal(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)
	})

	it("keeps earlier optional prerequisites skipped when a later optional prerequisite is selected", async () => {
		const projectFolderName = "optional-prerequisites-skip-then-select"
		const firstPath = await writePrerequisiteProjectFile(projectFolderName, join("planning", "optional-alpha.md"))
		const secondPath = await writePrerequisiteProjectFile(projectFolderName, join("planning", "optional-beta.md"))
		const firstPrerequisite = createPrerequisiteFileDefinition({
			id: "optional-alpha",
			requirement: "optional",
			match: {
				kind: "exact_filename",
				filename: "optional-alpha.md",
			},
			workflowValueKey: "optional_alpha_path",
		})
		const secondPrerequisite = createPrerequisiteFileDefinition({
			id: "optional-beta",
			requirement: "optional",
			match: {
				kind: "exact_filename",
				filename: "optional-beta.md",
			},
			workflowValueKey: "optional_beta_path",
		})
		const { workflow } = createMultiPrerequisiteResolutionWorkflow({
			prerequisites: [firstPrerequisite, secondPrerequisite],
		})
		await activateWorkflow(taskState, workflow)

		const firstPrompt = await submitNewProjectSelection(taskState, projectFolderName)
		expect(firstPrompt.kind).to.equal("render_workflow_form")
		if (firstPrompt.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${firstPrompt.kind}.`)
		}
		expect(firstPrompt.payload.panel?.promptMarkdown).to.include(firstPath)

		const secondPrompt = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: firstPrompt.formSession.sessionId,
				panelId: firstPrompt.formSession.currentPanelId,
				action: WorkflowFormAction.CANCEL,
			}),
		})
		expect(secondPrompt.kind).to.equal("render_workflow_form")
		if (secondPrompt.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${secondPrompt.kind}.`)
		}
		expect(secondPrompt.payload.panel?.promptMarkdown).to.include(secondPath)
		expect(secondPrompt.payload.panel?.promptMarkdown).to.not.include(firstPath)

		const selected = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: secondPrompt.formSession.sessionId,
				panelId: secondPrompt.formSession.currentPanelId,
				fields: [
					{
						key: PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY,
						value: { booleanValue: true },
					},
				],
			}),
		})

		expect(getActiveWorkflowSession(taskState).workflowValues[firstPrerequisite.workflowValueKey]).to.be.undefined
		expect(getActiveWorkflowSession(taskState).workflowValues[secondPrerequisite.workflowValueKey]).to.equal(secondPath)
		expect(getActiveWorkflowSession(taskState).ui.formSession).to.be.undefined
		expect(selected.kind).to.equal("execute_tool_backed_operation")
		if (selected.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${selected.kind}.`)
		}
		expect(selected.toolRequest.toolName).to.equal(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)
	})

	it("scans prerequisite files from a project subfolder different from the active workflow projectSubfolder", async () => {
		const projectFolderName = "prerequisite-different-subfolder"
		const prerequisitePath = await writePrerequisiteProjectFile(projectFolderName, join("review", "requirements.md"))
		const prerequisite = createPrerequisiteFileDefinition({
			projectSubfolderSegments: ["review"],
			match: {
				kind: "exact_filename",
				filename: "requirements.md",
			},
		})
		const { workflow } = createPrerequisiteResolutionWorkflow({
			projectSubfolder: "implementation",
			prerequisite,
		})
		await activateWorkflow(taskState, workflow)
		const result = await submitNewProjectSelection(taskState, projectFolderName)
		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		expect(result.payload.panel?.promptMarkdown).to.include(prerequisitePath)

		const accepted = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: result.formSession.sessionId,
				panelId: result.formSession.currentPanelId,
				fields: [
					{
						key: PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY,
						value: { booleanValue: true },
					},
				],
			}),
		})

		expect(getActiveWorkflowSession(taskState).workflowValues[prerequisite.workflowValueKey]).to.equal(prerequisitePath)
		expect(accepted.kind).to.equal("execute_tool_backed_operation")
		if (accepted.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${accepted.kind}.`)
		}
	})

	it("keeps shared project selection and generic selector discovery values name-based", async () => {
		const workflowFormId = "selector-name-regression-form"
		const selectedFileValueKey = "selected_file_value"
		const projectFolderName = "selector-name-regression"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [selectedFileValueKey],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Selector Name Regression",
					toolDictionaryTitle: "Selector Name Regression Tools",
					toolDictionaryMarkdown: "Selector regression help",
					firstPanelId: "selectors",
					panels: {
						selectors: {
							panelId: "selectors",
							title: "Selectors",
							promptMarkdown: "Select a file.",
							fields: [
								{
									key: "selected_file",
									workflowValueKey: selectedFileValueKey,
									kind: "file_path",
									label: "Selected file",
									required: true,
									allowedValueType: "string",
									selectorDiscovery: {
										root: {
											kind: "selected_project_root",
										},
										entryType: "file",
										targetPathSegments: ["planning"],
										immediateChildrenOnly: true,
										sort: "alpha_asc",
									},
									valueSchema: { type: "string" },
								},
							],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
				}),
			},
		})
		discoverWorkflowCandidatesStub.callsFake((request: WorkflowDiscoveryRequest) => {
			if (
				request.rootDirectory === join(cwd, "docs", "projects", projectFolderName) &&
				request.entryType === "file" &&
				request.targetPathSegments?.length === 1 &&
				request.targetPathSegments[0] === "planning"
			) {
				return Promise.resolve([{ value: "requirements.md", label: "requirements.md" }])
			}

			return Promise.resolve([])
		})
		await activateWorkflow(taskState, workflow)
		const renderFormAction = await submitNewProjectSelection(taskState, projectFolderName)
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}

		const submitted = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
				fields: [
					{
						key: "selected_file",
						value: { stringValue: "requirements.md" },
					},
				],
			}),
		})

		const workflowValues = getActiveWorkflowSession(taskState).workflowValues
		expect(submitted.kind).to.equal("project_prompt")
		expect(workflowValues[DEFAULT_ENTRY_PROJECT_VALUE_KEYS.projectFolderName]).to.equal(projectFolderName)
		expect(workflowValues[selectedFileValueKey]).to.equal("requirements.md")
		expect(workflowValues[selectedFileValueKey]).not.to.equal(
			join(cwd, "docs", "projects", projectFolderName, "planning", "requirements.md"),
		)
	})

	it("fails closed before activation when a decision-tree route id is missing", async () => {
		const route: WorkflowDecisionBranchRoute = {
			id: "missing-route-id",
			trigger: { kind: "always" },
			action: { kind: "project_prompt" },
		}
		expect(Reflect.deleteProperty(route, "id")).to.equal(true)
		const invalidState = new TaskState()

		const result = await activateWorkflow(
			invalidState,
			createWorkflowDefinition({
				name: "missing-decision-route-id",
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: {
							entryBranchId: "route-id-validation",
							branches: {
								"route-id-validation": {
									id: "route-id-validation",
									routes: [route],
								},
							},
						},
					}),
				},
			}),
		)

		expect(result).to.deep.equal({ kind: "no_op" })
		expect(invalidState.activeWorkflowName).to.be.undefined
		expect(invalidState.activeWorkflowSession).to.be.undefined
	})

	it("fails closed before activation when decision-tree route ids are blank", async () => {
		const blankRouteIds = ["", "   "]

		for (const [caseIndex, routeId] of blankRouteIds.entries()) {
			const invalidState = new TaskState()
			const branchId = `blank-route-id-validation-${caseIndex}`
			const result = await activateWorkflow(
				invalidState,
				createWorkflowDefinition({
					name: `blank-decision-route-id-${caseIndex}`,
					steps: {
						"step-1": createStepDefinition({
							stepNumber: 1,
							decisionTree: {
								entryBranchId: branchId,
								branches: {
									[branchId]: {
										id: branchId,
										routes: [
											{
												id: routeId,
												trigger: { kind: "always" },
												action: { kind: "project_prompt" },
											},
										],
									},
								},
							},
						}),
					},
				}),
			)

			expect(result).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName).to.be.undefined
			expect(invalidState.activeWorkflowSession).to.be.undefined
		}
	})

	it("fails closed before activation when a branch declares duplicate decision-tree route ids", async () => {
		const invalidState = new TaskState()
		const result = await activateWorkflow(
			invalidState,
			createWorkflowDefinition({
				name: "duplicate-decision-route-id",
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: {
							entryBranchId: "duplicate-route-id-validation",
							branches: {
								"duplicate-route-id-validation": {
									id: "duplicate-route-id-validation",
									routes: [
										{
											id: "duplicate-route",
											trigger: { kind: "always" },
											action: { kind: "project_prompt" },
										},
										{
											id: "duplicate-route",
											trigger: { kind: "always" },
											action: { kind: "project_prompt" },
										},
									],
								},
							},
						},
					}),
				},
			}),
		)

		expect(result).to.deep.equal({ kind: "no_op" })
		expect(invalidState.activeWorkflowName).to.be.undefined
		expect(invalidState.activeWorkflowSession).to.be.undefined
	})

	it("allows the same decision-tree route id in different branches before activation", async () => {
		const validState = new TaskState()
		const result = await activateWorkflow(
			validState,
			createWorkflowDefinition({
				name: "shared-decision-route-id-across-branches",
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: {
							entryBranchId: "first-route-id-validation-branch",
							branches: {
								"first-route-id-validation-branch": {
									id: "first-route-id-validation-branch",
									routes: [
										{
											id: "shared-route-id",
											trigger: { kind: "always" },
											action: { kind: "project_prompt" },
											followingBranchId: "second-route-id-validation-branch",
										},
									],
								},
								"second-route-id-validation-branch": {
									id: "second-route-id-validation-branch",
									routes: [
										{
											id: "shared-route-id",
											trigger: { kind: "always" },
											action: { kind: "project_prompt" },
										},
									],
								},
							},
						},
					}),
				},
			}),
		)

		expect(result.kind).to.equal("render_workflow_form")
		expect(validState.activeWorkflowName).to.equal("shared-decision-route-id-across-branches")
		expect(validState.activeWorkflowSession).to.not.equal(undefined)
	})

	it("rejects terminal-error decision actions with empty messages before activation", async () => {
		const invalidErrorMessages = ["", "   "]

		for (const [caseIndex, errorMessage] of invalidErrorMessages.entries()) {
			const invalidState = new TaskState()
			const result = await activateWorkflow(
				invalidState,
				createWorkflowDefinition({
					name: `invalid-terminal-error-message-${caseIndex}`,
					steps: {
						"step-1": createStepDefinition({
							stepNumber: 1,
							decisionTree: {
								entryBranchId: "terminal-error-entry",
								branches: {
									"terminal-error-entry": {
										id: "terminal-error-entry",
										routes: [
											{
												id: "terminal-error-route",
												trigger: { kind: "always" },
												action: { kind: "terminal_error", errorMessage },
											},
										],
									},
								},
							},
						}),
					},
				}),
			)

			expect(result).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName).to.be.undefined
			expect(invalidState.activeWorkflowSession).to.be.undefined
		}
	})

	it("rejects transition step actions that reference missing target steps before activation", async () => {
		const invalidState = new TaskState()
		const result = await activateWorkflow(
			invalidState,
			createWorkflowDefinition({
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: {
							entryBranchId: "transition-entry",
							branches: {
								"transition-entry": {
									id: "transition-entry",
									routes: [
										{
											id: "missing-target-step",
											trigger: { kind: "always" },
											action: createEntryBranchStepTransitionAction(99),
										},
									],
								},
							},
						},
					}),
				},
			}),
		)

		expect(result).to.deep.equal({ kind: "no_op" })
		expect(invalidState.activeWorkflowName).to.be.undefined
		expect(invalidState.activeWorkflowSession).to.be.undefined
	})

	it("rejects transition step actions that reference missing named target branches before activation", async () => {
		const invalidState = new TaskState()
		const result = await activateWorkflow(
			invalidState,
			createWorkflowDefinition({
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: {
							entryBranchId: "transition-entry",
							branches: {
								"transition-entry": {
									id: "transition-entry",
									routes: [
										{
											id: "missing-target-branch",
											trigger: { kind: "always" },
											action: createNamedBranchStepTransitionAction({
												stepNumber: 2,
												branchId: "missing-named-branch",
											}),
										},
									],
								},
							},
						},
					}),
					"step-2": createStepDefinition({
						stepNumber: 2,
						decisionTree: createProjectPromptDecisionTree({ entryBranchId: "target-entry" }),
					}),
				},
			}),
		)

		expect(result).to.deep.equal({ kind: "no_op" })
		expect(invalidState.activeWorkflowName).to.be.undefined
		expect(invalidState.activeWorkflowSession).to.be.undefined
	})

	it("rejects transition step routes that also declare followingBranchId before activation", async () => {
		const invalidState = new TaskState()
		const result = await activateWorkflow(
			invalidState,
			createWorkflowDefinition({
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: {
							entryBranchId: "transition-entry",
							branches: {
								"transition-entry": {
									id: "transition-entry",
									routes: [
										{
											id: "transition-with-following-branch",
											trigger: { kind: "always" },
											action: createEntryBranchStepTransitionAction(2),
											followingBranchId: "same-step-following",
										},
									],
								},
								"same-step-following": {
									id: "same-step-following",
									routes: [
										{
											id: "same-step-following-route",
											trigger: { kind: "always" },
											action: { kind: "project_prompt" },
										},
									],
								},
							},
						},
					}),
					"step-2": createStepDefinition({ stepNumber: 2 }),
				},
			}),
		)

		expect(result).to.deep.equal({ kind: "no_op" })
		expect(invalidState.activeWorkflowName).to.be.undefined
		expect(invalidState.activeWorkflowSession).to.be.undefined
	})

	it("rejects document build actions that reference missing artifacts", async () => {
		const outputFileKeys = createStandaloneArtifactOutputValueKeys("output_file")
		const invalidWorkflows = [
			createWorkflowDefinition({
				workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputFileKeys),
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createToolBackedOperationDecisionTree({
							startAction: {
								kind: "build_workflow_document",
								instruction: createDocumentBuildActionInstruction({ artifactId: "missing_output_file" }),
							},
						}),
					}),
				},
			}),
		]

		for (const invalidWorkflow of invalidWorkflows) {
			const invalidState = new TaskState()
			const result = await activateWorkflow(invalidState, invalidWorkflow)

			expect(result).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName).to.be.undefined
			expect(invalidState.activeWorkflowSession).to.be.undefined
		}
	})

	it("rejects runtime-owned tools in inline tool-backed action instructions", async () => {
		const forbiddenToolNames = [
			ClineDefaultTool.SET_WORKFLOW_VALUES,
			ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
			ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
		]

		for (const forbiddenToolName of forbiddenToolNames) {
			const invalidState = new TaskState()
			const result = await activateWorkflow(
				invalidState,
				createWorkflowDefinition({
					name: `forbidden-tool-${forbiddenToolName}`,
					steps: {
						"step-1": createStepDefinition({
							stepNumber: 1,
							decisionTree: createToolBackedOperationDecisionTree({
								startAction: {
									kind: "execute_tool_backed_operation",
									instruction: createToolBackedActionInstruction({ toolName: forbiddenToolName }),
								},
							}),
						}),
					},
				}),
			)

			expect(result).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName).to.be.undefined
			expect(invalidState.activeWorkflowSession).to.be.undefined
		}
	})

	it("rejects runtime-owned tool requests built by allowed inline tool-backed action instructions", async () => {
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						startAction: {
							kind: "execute_tool_backed_operation",
							instruction: createToolBackedActionInstruction({
								toolName: ClineDefaultTool.GENERATE_EXPLANATION,
								toolRequestToolName: ClineDefaultTool.SET_WORKFLOW_VALUES,
							}),
						},
					}),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const result = await submitNewProjectSelection(taskState, "Runtime-Owned Tool Request Project")

		expect(result.kind).to.equal("terminal_error")
		if (result.kind !== "terminal_error") {
			throw new Error(`Expected terminal_error, received ${result.kind}.`)
		}
		expect(result.errorMessage).to.equal(
			"Invalid workflow configuration: tool-backed action route run-step-resolution/start-step-resolution declared tool generate_explanation but built request for runtime-owned tool set_workflow_values.",
		)
		expect(taskState.activeWorkflowName).to.be.undefined
		expect(taskState.activeWorkflowSession).to.be.undefined
	})

	it("rejects document build actions with undeclared workflow value writes", async () => {
		const outputFileKeys = createStandaloneArtifactOutputValueKeys("output_file")
		const invalidState = new TaskState()
		const result = await activateWorkflow(
			invalidState,
			createWorkflowDefinition({
				workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputFileKeys),
				artifacts: {
					output_file: {
						id: "output_file",
						family: WorkflowArtifactFamily.Epics,
						intentMode: "new",
						parentIdentitySource: undefined,
						targetIdentitySource: undefined,
						outputValueKeys: outputFileKeys,
					},
				},
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createToolBackedOperationDecisionTree({
							startAction: {
								kind: "build_workflow_document",
								instruction: createDocumentBuildActionInstruction({
									workflowValueWrites: {
										spec_doc: "ready",
									},
								}),
							},
						}),
					}),
				},
			}),
		)

		expect(result).to.deep.equal({ kind: "no_op" })
		expect(invalidState.activeWorkflowName).to.be.undefined
		expect(invalidState.activeWorkflowSession).to.be.undefined
	})

	it("requires teardown persistence for invalid resolve paths while preserving true no-active-workflow no_op", async () => {
		const noActiveWorkflowResult = await runtime.resolveNextAction({ taskState: new TaskState() })
		expect(noActiveWorkflowResult).to.deep.equal({ kind: "no_op" })

		const missingDefinitionState = new TaskState()
		missingDefinitionState.activeWorkflowName = "missing-workflow"
		missingDefinitionState.activeWorkflowSession = createParentWorkflowSession()
		missingDefinitionState.currentFocusChainChecklist = "stale checklist"
		resolveWorkflowDefinitionStub.returns(undefined)
		const missingDefinitionResult = await runtime.resolveNextAction({ taskState: missingDefinitionState })

		expect(missingDefinitionResult).to.deep.equal({ kind: "persist_workflow_teardown" })
		expect(missingDefinitionState.activeWorkflowName).to.be.undefined
		expect(missingDefinitionState.activeWorkflowSession).to.be.undefined
		expect(missingDefinitionState.currentFocusChainChecklist).to.equal(null)

		const invalidDefinition = createWorkflowDefinition({
			name: "invalid-resolve-workflow",
			steps: {} as WorkflowDefinition["steps"],
		})
		const invalidDefinitionState = new TaskState()
		invalidDefinitionState.activeWorkflowName = invalidDefinition.name
		invalidDefinitionState.activeWorkflowSession = createParentWorkflowSession()
		invalidDefinitionState.currentFocusChainChecklist = "stale checklist"
		registerResolvedWorkflow(invalidDefinition)
		const invalidDefinitionResult = await runtime.resolveNextAction({ taskState: invalidDefinitionState })

		expect(invalidDefinitionResult).to.deep.equal({ kind: "persist_workflow_teardown" })
		expect(invalidDefinitionState.activeWorkflowName).to.be.undefined
		expect(invalidDefinitionState.activeWorkflowSession).to.be.undefined
		expect(invalidDefinitionState.currentFocusChainChecklist).to.equal(null)

		const workflow = createWorkflowDefinition({ name: "missing-step-resolve-workflow" })
		const missingStepState = new TaskState()
		const missingStepSession = createParentWorkflowSession()
		missingStepSession.activeStepNumber = 999
		missingStepSession.branchContext = { activeBranchId: "project-prompt" }
		missingStepState.activeWorkflowName = workflow.name
		missingStepState.activeWorkflowSession = missingStepSession
		missingStepState.currentFocusChainChecklist = "stale checklist"
		registerResolvedWorkflow(workflow)
		const missingStepResult = await runtime.resolveNextAction({ taskState: missingStepState })

		expect(missingStepResult).to.deep.equal({ kind: "persist_workflow_teardown" })
		expect(missingStepState.activeWorkflowName).to.be.undefined
		expect(missingStepState.activeWorkflowSession).to.be.undefined
		expect(missingStepState.currentFocusChainChecklist).to.equal(null)

		const invalidBranchWorkflow = createWorkflowDefinition({ name: "missing-branch-live-resolve-workflow" })
		const invalidBranchState = new TaskState()
		const invalidBranchSession = createParentWorkflowSession()
		invalidBranchSession.branchContext = { activeBranchId: "missing-branch" }
		invalidBranchState.activeWorkflowName = invalidBranchWorkflow.name
		invalidBranchState.activeWorkflowSession = invalidBranchSession
		invalidBranchState.currentFocusChainChecklist = "stale checklist"
		registerResolvedWorkflow(invalidBranchWorkflow)
		const invalidBranchResult = await runtime.resolveNextAction({ taskState: invalidBranchState })

		expect(invalidBranchResult).to.deep.equal({ kind: "persist_workflow_teardown" })
		expect(invalidBranchState.activeWorkflowName).to.be.undefined
		expect(invalidBranchState.activeWorkflowSession).to.be.undefined
		expect(invalidBranchState.currentFocusChainChecklist).to.equal(null)
	})

	it("rejects module-owned artifact families and artifact naming conventions before activation", async () => {
		const outputValueKeys = createStandaloneArtifactOutputValueKeys("artifact")
		const workflowValueKeys = collectArtifactOutputWorkflowValueKeys(outputValueKeys)
		const baseArtifactDefinition = {
			id: "output_file",
			family: WorkflowArtifactFamily.Epics,
			intentMode: "new",
			parentIdentitySource: undefined,
			targetIdentitySource: undefined,
			outputValueKeys,
		} satisfies NonNullable<WorkflowDefinition["artifacts"]>[string]
		const invalidArtifactCases: {
			name: string
			mutate(artifactDefinition: NonNullable<WorkflowDefinition["artifacts"]>[string]): void
		}[] = [
			{
				name: "invalid family",
				mutate: (artifactDefinition) => {
					Object.assign(artifactDefinition, { family: "module_owned_family" })
				},
			},
			{
				name: "forbidden filename pattern",
				mutate: (artifactDefinition) => {
					Object.assign(artifactDefinition, { filenamePattern: "Module-{N}.md" })
				},
			},
			{
				name: "forbidden file extension",
				mutate: (artifactDefinition) => {
					Object.assign(artifactDefinition, { fileExtension: ".module" })
				},
			},
			{
				name: "forbidden numbering scope",
				mutate: (artifactDefinition) => {
					Object.assign(artifactDefinition, { numberingScope: "module_scope" })
				},
			},
			{
				name: "forbidden discovery pattern",
				mutate: (artifactDefinition) => {
					Object.assign(artifactDefinition, { discoveryPattern: /^Module-(\d+)\.md$/ })
				},
			},
		]

		for (const invalidArtifactCase of invalidArtifactCases) {
			const invalidState = new TaskState()
			const workflow = createWorkflowDefinition({
				workflowValueKeys,
				artifacts: {
					output_file: { ...baseArtifactDefinition },
				},
			})
			const artifactDefinition = workflow.artifacts?.output_file
			if (artifactDefinition === undefined) {
				throw new Error(`Expected output_file artifact for ${invalidArtifactCase.name}.`)
			}
			invalidArtifactCase.mutate(artifactDefinition)
			const result = await activateWorkflow(invalidState, workflow)

			expect(result).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName).to.be.undefined
			expect(invalidState.activeWorkflowSession).to.be.undefined
		}
	})

	it("renders the shared two-panel entry workflow form and handles new, existing, and invalid submissions", async () => {
		const workflow = createWorkflowDefinition()
		registerResolvedWorkflow(workflow)
		setDiscoveredProjects(["Existing Alpha", "Existing Beta"])

		const entryInfoAction = await activateWorkflow(taskState, workflow)
		expect(entryInfoAction.kind).to.equal("render_workflow_form")
		if (entryInfoAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${entryInfoAction.kind}.`)
		}
		expect(entryInfoAction.payload.panel?.panelId).to.equal(ENTRY_INFO_PANEL_ID)
		expect(entryInfoAction.payload.panel?.fields).to.deep.equal([])

		const projectSelectionAction = await advanceToEntryProjectSelectionPanel(taskState)
		expect(projectSelectionAction.payload.panel?.panelId).to.equal(ENTRY_PROJECT_SELECTION_PANEL_ID)
		expect(projectSelectionAction.payload.panel?.fields.map((field) => field.key)).to.deep.equal([
			ENTRY_PROJECT_MODE_FIELD_KEY,
		])

		const newSubmissionResult = await submitNewProjectSelection(taskState, "  Launch Plan  ")
		const newProjectSelection = getActiveWorkflowSession(taskState).projectSelection
		const newProjectFolderName = newProjectSelection?.projectFolderName

		expect(newSubmissionResult.kind).to.equal("project_prompt")
		expect(newProjectSelection?.projectTitle).to.equal("Launch Plan")
		expect(newProjectFolderName).to.equal("launch-plan")
		expect(getActiveWorkflowSession(taskState).workflowValues).to.deep.include({
			[DEFAULT_ENTRY_PROJECT_VALUE_KEYS.projectMode]: "new",
			[DEFAULT_ENTRY_PROJECT_VALUE_KEYS.projectTitle]: "Launch Plan",
			[DEFAULT_ENTRY_PROJECT_VALUE_KEYS.projectFolderName]: "launch-plan",
		})
		expect(getActiveWorkflowSession(taskState).ui.formSession).to.be.undefined

		for (const subfolderName of ["discovery", "planning", "implementation", "review", "testing"]) {
			await access(join(cwd, "docs", "projects", newProjectFolderName, subfolderName))
		}
		for (const storyFolderName of ["drafts", "stories-backlog", "stories-review", "stories-complete"]) {
			await access(join(cwd, "docs", "projects", newProjectFolderName, "implementation", storyFolderName))
		}

		const existingTaskState = new TaskState()
		await activateWorkflow(existingTaskState, workflow)
		const existingSubmissionResult = await submitExistingProjectSelection(existingTaskState, "Existing Beta")
		const existingProjectSelection = getActiveWorkflowSession(existingTaskState).projectSelection

		expect(existingSubmissionResult.kind).to.equal("project_prompt")
		expect(existingProjectSelection).to.deep.include({
			projectTitle: "Existing Beta",
			projectFolderName: "Existing Beta",
		})
		expect(getActiveWorkflowSession(existingTaskState).workflowValues).to.deep.include({
			[DEFAULT_ENTRY_PROJECT_VALUE_KEYS.projectMode]: "existing",
			[DEFAULT_ENTRY_PROJECT_VALUE_KEYS.projectTitle]: "Existing Beta",
			[DEFAULT_ENTRY_PROJECT_VALUE_KEYS.projectFolderName]: "Existing Beta",
		})
		expect(getActiveWorkflowSession(existingTaskState).ui.formSession).to.be.undefined
		for (const subfolderName of ["discovery", "planning", "implementation", "review", "testing", "archive"]) {
			await access(join(cwd, "docs", "projects", "Existing Beta", subfolderName))
		}
		for (const storyFolderName of ["drafts", "stories-backlog", "stories-review", "stories-complete"]) {
			await access(join(cwd, "docs", "projects", "Existing Beta", "implementation", storyFolderName))
		}
		const existingProjectDiscoveryRequest = discoverWorkflowCandidatesStub
			.getCalls()
			.map((call) => call.args[0])
			.find(
				(request: WorkflowDiscoveryRequest) =>
					request.rootDirectory === join(cwd, "docs", "projects") &&
					request.entryType === "directory" &&
					request.targetPathSegments === undefined,
			)
		expect(existingProjectDiscoveryRequest).to.not.equal(undefined)
		if (existingProjectDiscoveryRequest === undefined) {
			throw new Error("Expected existing-project discovery to run.")
		}
		expect(existingProjectDiscoveryRequest.workspacePathPolicy).to.equal(workspacePathPolicy)

		const invalidSessionTaskState = new TaskState()
		await activateWorkflow(invalidSessionTaskState, workflow)
		await advanceToEntryProjectSelectionPanel(invalidSessionTaskState)
		const invalidSessionResult = await runtime.submitWorkflowForm({
			taskState: invalidSessionTaskState,
			request: createFormSubmitRequest({
				sessionId: "wrong-session-id",
				panelId: ENTRY_PROJECT_SELECTION_PANEL_ID,
				fields: [
					{
						key: ENTRY_PROJECT_MODE_FIELD_KEY,
						value: { stringValue: "new" },
					},
					{
						key: ENTRY_NEW_PROJECT_TITLE_FIELD_KEY,
						value: { stringValue: "Ignored" },
					},
				],
			}),
		})
		const invalidExistingProjectResult = await runtime.submitWorkflowForm({
			taskState: invalidSessionTaskState,
			request: createFormSubmitRequest({
				sessionId: getActiveFormSession(invalidSessionTaskState).sessionId,
				panelId: ENTRY_PROJECT_SELECTION_PANEL_ID,
				fields: [
					{
						key: ENTRY_PROJECT_MODE_FIELD_KEY,
						value: { stringValue: "existing" },
					},
					{
						key: ENTRY_EXISTING_PROJECT_FIELD_KEY,
						value: { stringValue: "Missing Project" },
					},
				],
			}),
		})

		expect(invalidSessionResult).to.deep.equal({ kind: "no_op" })
		expect(invalidExistingProjectResult.kind).to.equal("render_workflow_form")
		if (invalidExistingProjectResult.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${invalidExistingProjectResult.kind}.`)
		}
		expect(invalidExistingProjectResult.payload.renderState).to.equal("failure")
		expect(invalidExistingProjectResult.payload.errorMessage).to.equal(
			`Field "${ENTRY_EXISTING_PROJECT_FIELD_KEY}" does not satisfy the declared selection rules.`,
		)

		const emptySlugTaskState = new TaskState()
		await activateWorkflow(emptySlugTaskState, workflow)
		const emptySlugResult = await submitNewProjectSelection(emptySlugTaskState, "!!!")

		expect(emptySlugResult.kind).to.equal("render_workflow_form")
		if (emptySlugResult.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${emptySlugResult.kind}.`)
		}
		expect(emptySlugResult.payload.renderState).to.equal("failure")
		expect(emptySlugResult.payload.errorMessage).to.equal(
			"Provide a project title that can be normalized into a folder name.",
		)
	})

	it("returns no_op when entry form handling receives a runtime-routed submission", async () => {
		const workflow = createWorkflowDefinition()
		await activateWorkflow(taskState, workflow)
		const formSession = getActiveFormSession(taskState)
		const activePanel = formSession.definitionPayload.panels[formSession.currentPanelId]
		if (activePanel === undefined) {
			throw new Error("Expected an active entry form panel.")
		}
		activePanel.transition = { type: "runtime_routed" }

		const result = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: formSession.sessionId,
				panelId: formSession.currentPanelId,
			}),
		})

		expect(result).to.deep.equal({ kind: "no_op" })
	})

	it("emits entry artifact resolution completed with creation required when an existing project has no singleton artifact", async () => {
		let observedArtifactResolutions: readonly WorkflowEntryArtifactResolution[] | undefined
		const outputValueKeys = createStandaloneArtifactOutputValueKeys("entry_epics")
		const workflow = createWorkflowDefinition({
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputValueKeys),
			artifacts: {
				epics_doc: {
					id: "epics_doc",
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys,
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "await-entry-artifact-resolution",
						branches: {
							"await-entry-artifact-resolution": {
								id: "await-entry-artifact-resolution",
								routes: [
									{
										id: "entry-artifact-resolution-completed",
										trigger: {
											kind: "event_predicate",
											matches: ({ triggerEvent }) => {
												if (triggerEvent.kind !== "entry_artifact_resolution_completed") {
													return false
												}

												observedArtifactResolutions = triggerEvent.artifactResolutions
												return true
											},
										},
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})
		registerResolvedWorkflow(workflow)
		setDiscoveredProjects(["Existing Beta"])

		await activateWorkflow(taskState, workflow)
		const result = await submitExistingProjectSelection(taskState, "Existing Beta")
		const expectedArtifactResolution: WorkflowEntryArtifactResolution = {
			artifactId: "epics_doc",
			artifactFamily: WorkflowArtifactFamily.Epics,
			artifactIdentity: "epics",
			artifactFilename: "Epics.md",
			artifactRelativePath: join("planning", "Epics.md"),
			artifactAbsolutePath: join(cwd, "docs", "projects", "Existing Beta", "planning", "Epics.md"),
			creationRequired: true,
			existingArtifactAction: "none",
		}

		expect(result.kind).to.equal("project_prompt")
		expect(observedArtifactResolutions).to.deep.equal([expectedArtifactResolution])
		expect(getActiveWorkflowSession(taskState).lifecycle.projectSelectionCompleted).to.equal(true)
		expect(getActiveWorkflowSession(taskState).entryArtifactResolution).to.deep.equal({
			artifactResolutions: [expectedArtifactResolution],
			pendingFileOperation: undefined,
		})
	})

	it("emits entry artifact resolution completed with creation required when a new project has an entry singleton artifact", async () => {
		let observedArtifactResolutions: readonly WorkflowEntryArtifactResolution[] | undefined
		const outputValueKeys = createStandaloneArtifactOutputValueKeys("entry_new_epics")
		const workflow = createWorkflowDefinition({
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputValueKeys),
			artifacts: {
				epics_doc: {
					id: "epics_doc",
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys,
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "await-entry-artifact-resolution",
						branches: {
							"await-entry-artifact-resolution": {
								id: "await-entry-artifact-resolution",
								routes: [
									{
										id: "entry-artifact-resolution-completed",
										trigger: {
											kind: "event_predicate",
											matches: ({ triggerEvent }) => {
												if (triggerEvent.kind !== "entry_artifact_resolution_completed") {
													return false
												}

												observedArtifactResolutions = triggerEvent.artifactResolutions
												return true
											},
										},
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})
		registerResolvedWorkflow(workflow)

		await activateWorkflow(taskState, workflow)
		const result = await submitNewProjectSelection(taskState, "New Artifact Project")
		const expectedArtifactResolution: WorkflowEntryArtifactResolution = {
			artifactId: "epics_doc",
			artifactFamily: WorkflowArtifactFamily.Epics,
			artifactIdentity: "epics",
			artifactFilename: "Epics.md",
			artifactRelativePath: join("planning", "Epics.md"),
			artifactAbsolutePath: join(cwd, "docs", "projects", "new-artifact-project", "planning", "Epics.md"),
			creationRequired: true,
			existingArtifactAction: "none",
		}

		expect(result.kind).to.equal("project_prompt")
		expect(observedArtifactResolutions).to.deep.equal([expectedArtifactResolution])
		expect(getActiveWorkflowSession(taskState).entryArtifactResolution).to.deep.equal({
			artifactResolutions: [expectedArtifactResolution],
			pendingFileOperation: undefined,
		})
	})

	it("does not render an entry artifact conflict panel for a new project even when the canonical artifact path already exists", async () => {
		const outputValueKeys = createStandaloneArtifactOutputValueKeys("entry_new_no_scan_epics")
		const workflow = createWorkflowDefinition({
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputValueKeys),
			artifacts: {
				epics_doc: {
					id: "epics_doc",
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys,
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "await-entry-artifact-resolution",
						branches: {
							"await-entry-artifact-resolution": {
								id: "await-entry-artifact-resolution",
								routes: [
									{
										id: "entry-artifact-resolution-completed",
										trigger: { kind: "on_event", eventKind: "entry_artifact_resolution_completed" },
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})
		const newProjectTitle = "New Existing Artifact Project"
		const existingArtifactPath = join(cwd, "docs", "projects", "new-existing-artifact-project", "planning", "Epics.md")
		await mkdir(join(cwd, "docs", "projects", "new-existing-artifact-project", "planning"), { recursive: true })
		await writeFile(existingArtifactPath, "# Pre-existing epics\n", "utf8")
		registerResolvedWorkflow(workflow)

		await activateWorkflow(taskState, workflow)
		const result = await submitNewProjectSelection(taskState, newProjectTitle)

		expect(result.kind).to.equal("project_prompt")
		expect(getActiveWorkflowSession(taskState).ui.formSession).to.be.undefined
		expect(getActiveWorkflowSession(taskState).entryArtifactResolution?.artifactResolutions[0]).to.deep.include({
			artifactAbsolutePath: existingArtifactPath,
			creationRequired: true,
			existingArtifactAction: "none",
		})
	})

	it("renders an entry artifact conflict panel before workflow step orchestration when a singleton artifact exists", async () => {
		const projectName = "Existing Beta"
		const outputValueKeys = createStandaloneArtifactOutputValueKeys("entry_conflict_epics")
		const workflow = createWorkflowDefinition({
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputValueKeys),
			artifacts: {
				epics_doc: {
					id: "epics_doc",
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys,
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "step-orchestration-must-wait",
						branches: {
							"step-orchestration-must-wait": {
								id: "step-orchestration-must-wait",
								routes: [
									{
										id: "fail-if-step-orchestrated-before-conflict-resolution",
										trigger: { kind: "always" },
										action: {
											kind: "terminal_error",
											errorMessage: "Step orchestration ran before entry artifact conflict resolution.",
										},
									},
								],
							},
						},
					},
				}),
			},
		})
		const existingArtifactPath = join(cwd, "docs", "projects", projectName, "planning", "Epics.md")
		await mkdir(join(cwd, "docs", "projects", projectName, "planning"), { recursive: true })
		await writeFile(existingArtifactPath, "# Existing epics\n", "utf8")
		registerResolvedWorkflow(workflow)
		setDiscoveredProjects([projectName])

		await activateWorkflow(taskState, workflow)
		const result = await submitExistingProjectSelectionFromExistingFolder(taskState, projectName)

		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		expect(result.formSession.currentPanelId).to.equal(ENTRY_ARTIFACT_CONFLICT_PANEL_ID)
		const panel = result.payload.panel
		expect(panel).to.not.equal(undefined)
		if (panel === undefined) {
			throw new Error("Expected entry artifact conflict panel.")
		}
		expect(panel.panelId).to.equal(ENTRY_ARTIFACT_CONFLICT_PANEL_ID)
		const conflictActionField = panel.fields.find((field) => field.key === ENTRY_ARTIFACT_CONFLICT_ACTION_FIELD_KEY)
		expect(conflictActionField?.options?.map((option) => option.value)).to.deep.equal([
			"continue_existing",
			"replace_existing",
		])
		expect(getActiveWorkflowSession(taskState).lifecycle.projectSelectionCompleted).to.equal(true)
		expect(getActiveWorkflowSession(taskState).branchContext.lastTriggerEvent).to.be.undefined
		expect(getActiveWorkflowSession(taskState).entryArtifactResolution).to.deep.equal({
			artifactResolutions: [],
			pendingFileOperation: undefined,
		})
	})

	it("continues an existing singleton artifact by persisting output values and emitting continue-existing resolution", async () => {
		let observedArtifactResolutions: readonly WorkflowEntryArtifactResolution[] | undefined
		const projectName = "Existing Beta"
		const outputValueKeys = createStandaloneArtifactOutputValueKeys("entry_continue_epics")
		const workflow = createWorkflowDefinition({
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputValueKeys),
			artifacts: {
				epics_doc: {
					id: "epics_doc",
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys,
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "await-entry-artifact-resolution",
						branches: {
							"await-entry-artifact-resolution": {
								id: "await-entry-artifact-resolution",
								routes: [
									{
										id: "entry-artifact-resolution-completed",
										trigger: {
											kind: "event_predicate",
											matches: ({ triggerEvent }) => {
												if (triggerEvent.kind !== "entry_artifact_resolution_completed") {
													return false
												}

												observedArtifactResolutions = triggerEvent.artifactResolutions
												return true
											},
										},
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})
		const existingArtifactPath = join(cwd, "docs", "projects", projectName, "planning", "Epics.md")
		const expectedArtifactResolution: WorkflowEntryArtifactResolution = {
			artifactId: "epics_doc",
			artifactFamily: WorkflowArtifactFamily.Epics,
			artifactIdentity: "epics",
			artifactFilename: "Epics.md",
			artifactRelativePath: join("planning", "Epics.md"),
			artifactAbsolutePath: existingArtifactPath,
			creationRequired: false,
			existingArtifactAction: "continue_existing",
		}
		await mkdir(join(cwd, "docs", "projects", projectName, "planning"), { recursive: true })
		await writeFile(existingArtifactPath, "# Existing epics\n", "utf8")
		registerResolvedWorkflow(workflow)
		setDiscoveredProjects([projectName])

		await activateWorkflow(taskState, workflow)
		const conflictResult = await submitExistingProjectSelectionFromExistingFolder(taskState, projectName)
		expect(conflictResult.kind).to.equal("render_workflow_form")
		const result = await submitEntryArtifactConflictAction(taskState, "continue_existing")

		expect(result.kind).to.equal("project_prompt")
		expect(observedArtifactResolutions).to.deep.equal([expectedArtifactResolution])
		expect(getActiveWorkflowSession(taskState).entryArtifactResolution).to.deep.equal({
			artifactResolutions: [expectedArtifactResolution],
			pendingFileOperation: undefined,
		})
		expect(getActiveWorkflowSession(taskState).workflowValues).to.deep.include({
			[outputValueKeys.projectTitle]: projectName,
			[outputValueKeys.projectFolderName]: projectName,
			[outputValueKeys.artifactFamily]: WorkflowArtifactFamily.Epics,
			[outputValueKeys.artifactIdentity]: "epics",
			[outputValueKeys.artifactFilename]: "Epics.md",
			[outputValueKeys.artifactRelativePath]: join("planning", "Epics.md"),
			[outputValueKeys.artifactAbsolutePath]: existingArtifactPath,
		})
	})

	it("archives an existing singleton artifact to the selected project archive folder with the same filename", async () => {
		let observedArtifactResolutions: readonly WorkflowEntryArtifactResolution[] | undefined
		const projectName = "Existing Beta"
		const existingContent = "# Existing epics\n"
		const { workflow, artifactId } = createEpicsArtifactWorkflow({
			outputValuePrefix: "entry_archive_epics",
			steps: createEntryArtifactResolutionObserverSteps({
				observeArtifactResolutions: (artifactResolutions) => {
					observedArtifactResolutions = artifactResolutions
				},
			}),
		})
		const sourceArtifactPath = await writeExistingEpicsArtifact(projectName, existingContent)
		const archiveArtifactPath = join(cwd, "docs", "projects", projectName, "archive", "Epics.md")
		const expectedArtifactResolution: WorkflowEntryArtifactResolution = {
			artifactId,
			artifactFamily: WorkflowArtifactFamily.Epics,
			artifactIdentity: "epics",
			artifactFilename: "Epics.md",
			artifactRelativePath: join("planning", "Epics.md"),
			artifactAbsolutePath: sourceArtifactPath,
			creationRequired: true,
			existingArtifactAction: "archive_existing",
		}
		registerResolvedWorkflow(workflow)
		setDiscoveredProjects([projectName])

		await activateWorkflow(taskState, workflow)
		await submitExistingProjectSelectionFromExistingFolder(taskState, projectName)
		const replacementResult = await submitEntryArtifactConflictAction(taskState, "replace_existing")
		expect(replacementResult.kind).to.equal("render_workflow_form")
		if (replacementResult.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${replacementResult.kind}.`)
		}
		expect(replacementResult.formSession.currentPanelId).to.equal(ENTRY_ARTIFACT_REPLACEMENT_PANEL_ID)

		const archiveAction = await submitEntryArtifactReplacementAction(taskState, "archive_existing")
		expect(archiveAction.kind).to.equal("execute_tool_backed_operation")
		if (archiveAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${archiveAction.kind}.`)
		}
		expect(archiveAction.toolRequest.toolName).to.equal(ClineDefaultTool.ARCHIVE_WORKFLOW_ARTIFACT)
		expect(archiveAction.toolRequest.toolParams).to.deep.equal({ artifact_id: artifactId })

		const archiveResult = await runtime.archiveWorkflowArtifact({
			taskState,
			artifactId,
			expectedArtifactAbsolutePath: sourceArtifactPath,
			expectedArchiveAbsolutePath: archiveArtifactPath,
		})

		expect(archiveResult.archiveRelativePath).to.equal(join("archive", "Epics.md"))
		expect(archiveResult.archiveAbsolutePath).to.equal(archiveArtifactPath)
		expect(await pathExists(sourceArtifactPath)).to.equal(false)
		expect(await readFile(archiveArtifactPath, "utf8")).to.equal(existingContent)

		const result = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: JSON.stringify({ ok: true }),
			runtimeOwnedSourceRoute: archiveAction.runtimeOwnedSourceRoute,
		})
		expect(result.kind).to.equal("project_prompt")
		expect(observedArtifactResolutions).to.deep.equal([expectedArtifactResolution])
		expect(getActiveWorkflowSession(taskState).lifecycle.projectSelectionCompleted).to.equal(true)
	})

	it("fails clearly without overwriting when the singleton artifact archive target already exists", async () => {
		const projectName = "Existing Beta"
		const sourceContent = "# Existing epics\n"
		const archiveContent = "# Prior archived epics\n"
		const { workflow, artifactId } = createEpicsArtifactWorkflow({ outputValuePrefix: "entry_archive_collision_epics" })
		const sourceArtifactPath = await writeExistingEpicsArtifact(projectName, sourceContent)
		const archiveArtifactPath = join(cwd, "docs", "projects", projectName, "archive", "Epics.md")
		await mkdir(join(cwd, "docs", "projects", projectName, "archive"), { recursive: true })
		await writeFile(archiveArtifactPath, archiveContent, "utf8")
		registerResolvedWorkflow(workflow)
		setDiscoveredProjects([projectName])

		await activateWorkflow(taskState, workflow)
		await submitExistingProjectSelectionFromExistingFolder(taskState, projectName)
		await submitEntryArtifactConflictAction(taskState, "replace_existing")
		const archiveAction = await submitEntryArtifactReplacementAction(taskState, "archive_existing")
		expect(archiveAction.kind).to.equal("execute_tool_backed_operation")

		let archiveErrorMessage: string | undefined
		try {
			await runtime.archiveWorkflowArtifact({
				taskState,
				artifactId,
				expectedArtifactAbsolutePath: sourceArtifactPath,
				expectedArchiveAbsolutePath: archiveArtifactPath,
			})
		} catch (error) {
			if (error instanceof Error) {
				archiveErrorMessage = error.message
			} else {
				throw error
			}
		}

		expect(archiveErrorMessage).to.equal(
			`Cannot archive workflow artifact because archive target already exists: ${archiveArtifactPath}`,
		)
		expect(await readFile(sourceArtifactPath, "utf8")).to.equal(sourceContent)
		expect(await readFile(archiveArtifactPath, "utf8")).to.equal(archiveContent)
	})

	it("deletes only the resolved canonical singleton artifact source path", async () => {
		let observedArtifactResolutions: readonly WorkflowEntryArtifactResolution[] | undefined
		const projectName = "Existing Beta"
		const existingContent = "# Existing epics\n"
		const siblingContent = "# Keep this planning file\n"
		const archiveContent = "# Keep this archive file\n"
		const { workflow, artifactId } = createEpicsArtifactWorkflow({
			outputValuePrefix: "entry_delete_epics",
			steps: createEntryArtifactResolutionObserverSteps({
				observeArtifactResolutions: (artifactResolutions) => {
					observedArtifactResolutions = artifactResolutions
				},
			}),
		})
		const sourceArtifactPath = await writeExistingEpicsArtifact(projectName, existingContent)
		const siblingPlanningPath = join(cwd, "docs", "projects", projectName, "planning", "Keep.md")
		const archiveArtifactPath = join(cwd, "docs", "projects", projectName, "archive", "Epics.md")
		const expectedArtifactResolution: WorkflowEntryArtifactResolution = {
			artifactId,
			artifactFamily: WorkflowArtifactFamily.Epics,
			artifactIdentity: "epics",
			artifactFilename: "Epics.md",
			artifactRelativePath: join("planning", "Epics.md"),
			artifactAbsolutePath: sourceArtifactPath,
			creationRequired: true,
			existingArtifactAction: "delete_existing",
		}
		await writeFile(siblingPlanningPath, siblingContent, "utf8")
		await mkdir(join(cwd, "docs", "projects", projectName, "archive"), { recursive: true })
		await writeFile(archiveArtifactPath, archiveContent, "utf8")
		registerResolvedWorkflow(workflow)
		setDiscoveredProjects([projectName])

		await activateWorkflow(taskState, workflow)
		await submitExistingProjectSelectionFromExistingFolder(taskState, projectName)
		await submitEntryArtifactConflictAction(taskState, "replace_existing")
		const deleteAction = await submitEntryArtifactReplacementAction(taskState, "delete_existing")
		expect(deleteAction.kind).to.equal("execute_tool_backed_operation")
		if (deleteAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${deleteAction.kind}.`)
		}
		expect(deleteAction.toolRequest.toolName).to.equal(ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT)
		expect(deleteAction.toolRequest.toolParams).to.deep.equal({ artifact_id: artifactId })

		const deletionResult = await runtime.deleteWorkflowArtifact({
			taskState,
			artifactId,
			expectedArtifactAbsolutePath: sourceArtifactPath,
		})

		expect(deletionResult.artifactAbsolutePath).to.equal(sourceArtifactPath)
		expect(await pathExists(sourceArtifactPath)).to.equal(false)
		expect(await readFile(siblingPlanningPath, "utf8")).to.equal(siblingContent)
		expect(await readFile(archiveArtifactPath, "utf8")).to.equal(archiveContent)

		const result = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: JSON.stringify({ ok: true }),
			runtimeOwnedSourceRoute: deleteAction.runtimeOwnedSourceRoute,
		})
		expect(result.kind).to.equal("project_prompt")
		expect(observedArtifactResolutions).to.deep.equal([expectedArtifactResolution])
		expect(getActiveWorkflowSession(taskState).lifecycle.projectSelectionCompleted).to.equal(true)
	})

	it("returns to project selection without emitting entry artifact resolution when replacement is canceled", async () => {
		let observedArtifactResolutionCompleted = false
		const projectName = "Existing Beta"
		const outputValueKeys = createStandaloneArtifactOutputValueKeys("entry_cancel_epics")
		const workflow = createWorkflowDefinition({
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputValueKeys),
			artifacts: {
				epics_doc: {
					id: "epics_doc",
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys,
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "await-entry-artifact-resolution",
						branches: {
							"await-entry-artifact-resolution": {
								id: "await-entry-artifact-resolution",
								routes: [
									{
										id: "entry-artifact-resolution-completed",
										trigger: {
											kind: "event_predicate",
											matches: ({ triggerEvent }) => {
												if (triggerEvent.kind === "entry_artifact_resolution_completed") {
													observedArtifactResolutionCompleted = true
													return true
												}

												return false
											},
										},
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})
		await writeExistingEpicsArtifact(projectName, "# Existing epics\n")
		registerResolvedWorkflow(workflow)
		setDiscoveredProjects([projectName])

		await activateWorkflow(taskState, workflow)
		await submitExistingProjectSelectionFromExistingFolder(taskState, projectName)
		await submitEntryArtifactConflictAction(taskState, "replace_existing")
		const cancelResult = await submitEntryArtifactReplacementAction(taskState, "cancel")

		expect(cancelResult.kind).to.equal("render_workflow_form")
		if (cancelResult.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${cancelResult.kind}.`)
		}
		expect(cancelResult.formSession.currentPanelId).to.equal(ENTRY_PROJECT_SELECTION_PANEL_ID)
		expect(cancelResult.payload.panel?.panelId).to.equal(ENTRY_PROJECT_SELECTION_PANEL_ID)
		expect(observedArtifactResolutionCompleted).to.equal(false)
		expect(getActiveWorkflowSession(taskState).entryArtifactResolution).to.be.undefined
		expect(getActiveWorkflowSession(taskState).branchContext.lastTriggerEvent).to.be.undefined
		expect(getActiveWorkflowSession(taskState).lifecycle.projectSelectionCompleted).to.equal(false)
		expect(getActiveWorkflowSession(taskState).projectSelection).to.deep.equal({
			projectMode: "new",
			projectTitle: "",
			projectFolderName: "",
		})
	})

	it("renders empty existing-project options when the project output root is missing", async () => {
		discoverWorkflowCandidatesStub.restore()
		const projectOutputRoot = join(cwd, "docs", "projects")
		const workflow = createWorkflowDefinition()
		registerResolvedWorkflow(workflow)

		expect(await pathExists(projectOutputRoot)).to.equal(false)
		await activateWorkflow(taskState, workflow)
		await advanceToEntryProjectSelectionPanel(taskState)
		const activeFormSession = getActiveFormSession(taskState)
		const revealExistingProjectsAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: activeFormSession.sessionId,
				panelId: activeFormSession.currentPanelId,
				fields: [
					{
						key: ENTRY_PROJECT_MODE_FIELD_KEY,
						value: { stringValue: "existing" },
					},
				],
			}),
		})

		expect(revealExistingProjectsAction.kind).to.equal("render_workflow_form")
		if (revealExistingProjectsAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${revealExistingProjectsAction.kind}.`)
		}
		expect(revealExistingProjectsAction.payload.panel?.panelId).to.equal(ENTRY_PROJECT_SELECTION_PANEL_ID)
		expect(revealExistingProjectsAction.payload.errorMessage).to.be.undefined
		expect(
			revealExistingProjectsAction.payload.panel?.fields.find((field) => field.key === ENTRY_EXISTING_PROJECT_FIELD_KEY)
				?.options,
		).to.deep.equal([])
		expect(await pathExists(projectOutputRoot)).to.equal(false)
	})

	it("keeps mode-only new project entry submissions in reveal mode", async () => {
		const projectOutputRoot = join(cwd, "docs", "projects")
		const workflow = createWorkflowDefinition()
		registerResolvedWorkflow(workflow)

		await activateWorkflow(taskState, workflow)
		await advanceToEntryProjectSelectionPanel(taskState)
		const activeFormSession = getActiveFormSession(taskState)
		const revealNewProjectAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: activeFormSession.sessionId,
				panelId: activeFormSession.currentPanelId,
				fields: [
					{
						key: ENTRY_PROJECT_MODE_FIELD_KEY,
						value: { stringValue: "new" },
					},
				],
			}),
		})

		expect(revealNewProjectAction.kind).to.equal("render_workflow_form")
		if (revealNewProjectAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${revealNewProjectAction.kind}.`)
		}
		expect(revealNewProjectAction.payload.panel?.panelId).to.equal(ENTRY_PROJECT_SELECTION_PANEL_ID)
		expect(revealNewProjectAction.payload.panel?.fields.map((field) => field.key)).to.include(
			ENTRY_NEW_PROJECT_TITLE_FIELD_KEY,
		)
		expect(revealNewProjectAction.payload.errorMessage).to.be.undefined
		expect(getActiveWorkflowSession(taskState).projectSelection.projectTitle).to.equal("")
		expect(getActiveWorkflowSession(taskState).projectSelection.projectFolderName).to.equal("")
		expect(await pathExists(projectOutputRoot)).to.equal(false)
	})

	it("keeps mode-only existing project entry submissions in reveal mode", async () => {
		const projectOutputRoot = join(cwd, "docs", "projects")
		const workflow = createWorkflowDefinition()
		registerResolvedWorkflow(workflow)
		setDiscoveredProjects(["Existing Alpha"])

		await activateWorkflow(taskState, workflow)
		await advanceToEntryProjectSelectionPanel(taskState)
		const activeFormSession = getActiveFormSession(taskState)
		const revealExistingProjectAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: activeFormSession.sessionId,
				panelId: activeFormSession.currentPanelId,
				fields: [
					{
						key: ENTRY_PROJECT_MODE_FIELD_KEY,
						value: { stringValue: "existing" },
					},
				],
			}),
		})

		expect(revealExistingProjectAction.kind).to.equal("render_workflow_form")
		if (revealExistingProjectAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${revealExistingProjectAction.kind}.`)
		}
		expect(revealExistingProjectAction.payload.panel?.panelId).to.equal(ENTRY_PROJECT_SELECTION_PANEL_ID)
		expect(
			revealExistingProjectAction.payload.panel?.fields.find((field) => field.key === ENTRY_EXISTING_PROJECT_FIELD_KEY)
				?.options,
		).to.deep.equal([{ value: "Existing Alpha", label: "Existing Alpha" }])
		expect(revealExistingProjectAction.payload.errorMessage).to.be.undefined
		expect(getActiveWorkflowSession(taskState).projectSelection.projectTitle).to.equal("")
		expect(getActiveWorkflowSession(taskState).projectSelection.projectFolderName).to.equal("")
		expect(await pathExists(projectOutputRoot)).to.equal(false)
	})

	it("blocks entry project setup before creating a denied project root", async () => {
		const projectRoot = join(cwd, "docs", "projects", "denied-root-project")
		runtime = new WorkflowRuntime({
			cwd,
			workspacePathPolicy: {
				validateAccess: (filePath) => filePath !== projectRoot,
			},
		})
		const workflow = createWorkflowDefinition()
		await activateWorkflow(taskState, workflow)

		let capturedError: unknown
		try {
			await submitNewProjectSelection(taskState, "Denied Root Project")
		} catch (error) {
			capturedError = error
		}

		expect(capturedError).to.be.instanceOf(Error)
		if (!(capturedError instanceof Error)) {
			throw new Error("Expected project-root policy denial to throw.")
		}
		expect(capturedError.message).to.equal(`Workflow runtime path is blocked by workspace path policy: ${projectRoot}`)
		expect(await pathExists(projectRoot)).to.equal(false)
	})

	it("blocks entry project setup before creating a denied canonical subfolder", async () => {
		const projectRoot = join(cwd, "docs", "projects", "denied-subfolder-project")
		const deniedSubfolder = join(projectRoot, "review")
		runtime = new WorkflowRuntime({
			cwd,
			workspacePathPolicy: {
				validateAccess: (filePath) => filePath !== deniedSubfolder,
			},
		})
		const workflow = createWorkflowDefinition()
		await activateWorkflow(taskState, workflow)

		let capturedError: unknown
		try {
			await submitNewProjectSelection(taskState, "Denied Subfolder Project")
		} catch (error) {
			capturedError = error
		}

		expect(capturedError).to.be.instanceOf(Error)
		if (!(capturedError instanceof Error)) {
			throw new Error("Expected project-subfolder policy denial to throw.")
		}
		expect(capturedError.message).to.equal(`Workflow runtime path is blocked by workspace path policy: ${deniedSubfolder}`)
		expect(await pathExists(deniedSubfolder)).to.equal(false)
	})

	it("returns project_prompt projections once project selection is satisfied", async () => {
		const workflow = createWorkflowDefinition()

		await activateWorkflow(taskState, workflow)
		taskState.apiRequestCount = 1
		await submitNewProjectSelection(taskState, "Projection Project")

		const nextAction = await runtime.resolveNextAction({ taskState })
		const firstTurnProjection = await runtime.buildTurnProjection({ taskState })
		taskState.apiRequestCount = 2
		const refreshTurnProjection = await runtime.buildTurnProjection({ taskState })
		const emptyProjection = await runtime.buildTurnProjection({ taskState: new TaskState() })

		expect(nextAction.kind).to.equal("project_prompt")
		expect(firstTurnProjection.workflowInputPayloadBlock).to.contain("Workflow:\nWorkflow Runtime Test")
		expect(firstTurnProjection.workflowInputPayloadBlock).to.contain("Description: A workflow fixture used by runtime tests.")
		expect(firstTurnProjection.workflowInputPayloadBlock).to.contain("Name: Runtime Mary")
		expect(firstTurnProjection.workflowInputPayloadBlock).to.contain("Role: Runtime Analyst")
		expect(firstTurnProjection.workflowInputPayloadBlock).to.contain(
			"Identity: Runtime Mary helps test workflow prompt projection.",
		)
		expect(firstTurnProjection.workflowInputPayloadBlock).to.contain("Capabilities: workflow testing")
		expect(firstTurnProjection.workflowInputPayloadBlock).to.contain(
			"Communication Style: Precise and verification-oriented.",
		)
		expect(firstTurnProjection.workflowInputPayloadBlock).to.contain(
			"Principles: Keep runtime fixtures explicit and deterministic.",
		)
		expect(firstTurnProjection.workflowInputPayloadBlock).to.contain("1. Step 1 - Active")
		expect(firstTurnProjection.workflowInputPayloadBlock).to.contain("2. Step 2 - Not Started")
		expect(firstTurnProjection.workflowInputPayloadBlock).to.contain("Step 1: Step 1")
		expect(firstTurnProjection.workflowInputPayloadBlock).to.contain("input")
		expect(firstTurnProjection.continuationWorkflowInputPayloadBlock).to.contain("Workflow:\nWorkflow Runtime Test")
		expect(firstTurnProjection.continuationWorkflowInputPayloadBlock).to.contain("1. Step 1 - Active")
		expect(firstTurnProjection.continuationWorkflowInputPayloadBlock).to.contain("2. Step 2 - Not Started")
		expect(firstTurnProjection.continuationWorkflowInputPayloadBlock).to.contain("Step 1: Step 1")
		expect(firstTurnProjection.continuationWorkflowInputPayloadBlock).to.contain("input")
		expect(firstTurnProjection.continuationWorkflowInputPayloadBlock).to.not.contain("Name: Runtime Mary")
		const removedProjectionKeys = [
			["fullTurnWorkflow", "SystemInstructionsBlock"].join(""),
			["fullTurnWorkflow", "InputInstructionsBlock"].join(""),
			["continuationTurnWorkflow", "SystemInstructionsBlock"].join(""),
			["continuationTurnWorkflow", "InputInstructionsBlock"].join(""),
		]
		expect(Object.keys(firstTurnProjection)).to.not.include.members(removedProjectionKeys)
		expect(refreshTurnProjection.workflowInputPayloadBlock).to.not.contain("Name: Runtime Mary")
		expect(refreshTurnProjection.continuationWorkflowInputPayloadBlock).to.equal(
			firstTurnProjection.continuationWorkflowInputPayloadBlock,
		)
		expect(refreshTurnProjection.workflowToolSchemaOverride).to.deep.equal(firstTurnProjection.workflowToolSchemaOverride)
		expect(emptyProjection).to.deep.equal({
			workflowInputPayloadBlock: undefined,
			continuationWorkflowInputPayloadBlock: undefined,
			workflowToolSchemaOverride: undefined,
		})
	})

	it("creates workflow form sessions at a render action startPanelId", async () => {
		const workflowFormId = "start-panel-form"
		const workflow = createWorkflowDefinition({
			workflowForms: {
				[workflowFormId]: createWorkflowFormDefinitionPayload(),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
						renderAction: {
							kind: "render_workflow_form",
							workflowFormId,
							startPanelId: "panel-2",
						},
					}),
				}),
			},
		})
		registerResolvedWorkflow(workflow)

		const result = await runtime.activateWorkflow({
			taskState,
			workflowName: workflow.name,
			parentSession: createParentWorkflowSession(),
		})

		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		expect(result.formSession.firstPanelId).to.equal("panel-1")
		expect(result.formSession.currentPanelId).to.equal("panel-2")
		expect(result.payload.panel?.panelId).to.equal("panel-2")
		expect(getActiveFormSession(taskState).firstPanelId).to.equal("panel-1")
		expect(getActiveFormSession(taskState).currentPanelId).to.equal("panel-2")
	})

	it("seeds workflow form session data only when creating a new form session", async () => {
		const workflowFormId = "seeded-data-form"
		let buildSessionDataCallCount = 0
		const workflow = createWorkflowDefinition({
			workflowForms: {
				[workflowFormId]: createWorkflowFormDefinitionPayload(),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
						renderAction: {
							kind: "render_workflow_form",
							workflowFormId,
							buildSessionData: (session) => {
								buildSessionDataCallCount += 1
								expect(session.activeStepNumber).to.equal(1)
								return {
									seed: "alpha",
									nested: {
										count: 1,
									},
									submitted: {
										valueType: "string",
										stringValue: "submitted seed",
									},
								}
							},
						},
					}),
				}),
			},
		})
		registerResolvedWorkflow(workflow)

		const result = await runtime.activateWorkflow({
			taskState,
			workflowName: workflow.name,
			parentSession: createParentWorkflowSession(),
		})

		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		expect(buildSessionDataCallCount).to.equal(1)
		expect(result.formSession.data).to.deep.equal({
			seed: "alpha",
			nested: {
				count: 1,
			},
			submitted: {
				valueType: "string",
				stringValue: "submitted seed",
			},
		})

		const continuation = await runtime.resolveNextAction({ taskState })

		expect(continuation.kind).to.equal("render_workflow_form")
		if (continuation.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${continuation.kind}.`)
		}
		expect(buildSessionDataCallCount).to.equal(1)
		expect(continuation.formSession.data).to.deep.equal(result.formSession.data)
	})

	it("interpolates workflow values in workflow form and panel text", async () => {
		const workflowFormId = "workflow-value-interpolation-form"
		const parentSession = createParentWorkflowSession()
		parentSession.workflowValues.form_title = "Alpha Form"
		parentSession.workflowValues.tool_title = "Alpha Tools"
		parentSession.workflowValues.tool_markdown = "Alpha Markdown"
		parentSession.workflowValues.panel_title = "Alpha Panel"
		parentSession.workflowValues.panel_prompt = "Alpha Prompt"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["form_title", "tool_title", "tool_markdown", "panel_title", "panel_prompt"],
			childInheritance: [
				{ parentKey: "form_title", childKey: "form_title" },
				{ parentKey: "tool_title", childKey: "tool_title" },
				{ parentKey: "tool_markdown", childKey: "tool_markdown" },
				{ parentKey: "panel_title", childKey: "panel_title" },
				{ parentKey: "panel_prompt", childKey: "panel_prompt" },
			],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Form {workflow.form_title}",
					toolDictionaryTitle: "Tools {workflow.tool_title}",
					toolDictionaryMarkdown: "Dictionary {workflow.tool_markdown}",
					firstPanelId: "intro",
					panels: {
						intro: {
							panelId: "intro",
							title: "Panel {workflow.panel_title}",
							promptMarkdown: "Prompt {workflow.panel_prompt}",
							fields: [],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
				}),
			},
		})
		registerResolvedWorkflow(workflow)

		const result = await runtime.activateWorkflow({
			taskState,
			workflowName: workflow.name,
			parentSession,
		})

		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		expect(result.payload.title).to.equal("Form Alpha Form")
		expect(result.payload.toolDictionaryTitle).to.equal("Tools Alpha Tools")
		expect(result.payload.toolDictionaryMarkdown).to.equal("Dictionary Alpha Markdown")
		expect(result.payload.panel?.title).to.equal("Panel Alpha Panel")
		expect(result.payload.panel?.promptMarkdown).to.equal("Prompt Alpha Prompt")
	})

	it("interpolates form session data in resolved field, action, and option text", async () => {
		const workflowFormId = "session-data-interpolation-form"
		const workflow = createWorkflowDefinition({
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Session Data Form",
					toolDictionaryTitle: "Session Data Tools",
					toolDictionaryMarkdown: "Session data help",
					firstPanelId: "details",
					panels: {
						details: {
							panelId: "details",
							title: "Details",
							promptMarkdown: "Review seeded text.",
							fields: [
								{
									key: "text_field",
									kind: "small_text",
									label: "Label {data.labelText}",
									helpText: "Help {data.helpText}",
									required: false,
									allowedValueType: "string",
									placeholder: "Placeholder {data.placeholderText}",
									formatHint: "Format {data.formatHint}",
								},
								{
									key: "content_field",
									kind: "markdown_display",
									label: "Content Display",
									required: false,
									contentMarkdown: "Content {data.objectText}",
								},
								{
									key: "boolean_field",
									kind: "boolean",
									label: "Boolean",
									required: false,
									trueLabel: "True {data.trueText}",
									falseLabel: "False {data.falseText}",
								},
								{
									key: "option_field",
									kind: "dropdown",
									label: "Option",
									required: false,
									allowedValueType: "string",
									options: [
										{
											value: "stable-option-value",
											label: "Option {data.optionLabel}",
											description: "Description {data.optionDescription}",
										},
									],
								},
							],
							allowedActions: ["submit", "cancel"],
							actionLabels: {
								submit: "Submit {data.actionText}",
								cancel: "Cancel {data.actionText}",
							},
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
						renderAction: {
							kind: "render_workflow_form",
							workflowFormId,
							buildSessionData: () => ({
								labelText: "Seed Label",
								helpText: "Seed Help",
								placeholderText: "Seed Placeholder",
								formatHint: "Seed Format",
								objectText: {
									zeta: "last",
									alpha: "first",
								},
								trueText: "Seed True",
								falseText: "Seed False",
								actionText: "Seed Action",
								optionLabel: "Seed Option",
								optionDescription: "Seed Description",
							}),
						},
					}),
				}),
			},
		})
		registerResolvedWorkflow(workflow)

		const result = await runtime.activateWorkflow({
			taskState,
			workflowName: workflow.name,
			parentSession: createParentWorkflowSession(),
		})

		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		const panel = result.payload.panel
		expect(panel?.actionLabels?.submit).to.equal("Submit Seed Action")
		expect(panel?.actionLabels?.cancel).to.equal("Cancel Seed Action")
		expect(panel?.fields.map((field) => field.key)).to.deep.equal([
			"text_field",
			"content_field",
			"boolean_field",
			"option_field",
		])

		const textField = panel?.fields.find((field) => field.key === "text_field")
		expect(textField?.label).to.equal("Label Seed Label")
		expect(textField?.helpText).to.equal("Help Seed Help")
		expect(textField?.placeholder).to.equal("Placeholder Seed Placeholder")
		expect(textField?.formatHint).to.equal("Format Seed Format")

		const contentField = panel?.fields.find((field) => field.key === "content_field")
		expect(contentField?.contentMarkdown).to.equal('Content {"alpha":"first","zeta":"last"}')

		const booleanField = panel?.fields.find((field) => field.key === "boolean_field")
		expect(booleanField?.trueLabel).to.equal("True Seed True")
		expect(booleanField?.falseLabel).to.equal("False Seed False")

		const optionField = panel?.fields.find((field) => field.key === "option_field")
		expect(optionField?.options?.[0]?.value).to.equal("stable-option-value")
		expect(optionField?.options?.[0]?.label).to.equal("Option Seed Option")
		expect(optionField?.options?.[0]?.description).to.equal("Description Seed Description")
	})

	it("leaves unresolved placeholders and expression-like placeholder syntax unchanged", async () => {
		const workflowFormId = "invalid-placeholder-form"
		const parentSession = createParentWorkflowSession()
		parentSession.workflowValues.count = 2
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["count"],
			childInheritance: [{ parentKey: "count", childKey: "count" }],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Known {data.safe} Missing {data.missing} Invalid {data.safe.toUpperCase()} Index {data.safe[0]}",
					toolDictionaryTitle: "Invalid Placeholder Tools",
					toolDictionaryMarkdown: "Missing workflow {workflow.missing}",
					firstPanelId: "intro",
					panels: {
						intro: {
							panelId: "intro",
							title: "Intro {data.safe}",
							promptMarkdown: "Expression {workflow.count + 1}",
							fields: [],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
						renderAction: {
							kind: "render_workflow_form",
							workflowFormId,
							buildSessionData: () => ({
								safe: "safe value",
							}),
						},
					}),
				}),
			},
		})
		registerResolvedWorkflow(workflow)

		const result = await runtime.activateWorkflow({
			taskState,
			workflowName: workflow.name,
			parentSession,
		})

		expect(result.kind).to.equal("render_workflow_form")
		if (result.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${result.kind}.`)
		}
		expect(result.payload.title).to.equal(
			"Known safe value Missing {data.missing} Invalid {data.safe.toUpperCase()} Index {data.safe[0]}",
		)
		expect(result.payload.toolDictionaryMarkdown).to.equal("Missing workflow {workflow.missing}")
		expect(result.payload.panel?.title).to.equal("Intro safe value")
		expect(result.payload.panel?.promptMarkdown).to.equal("Expression {workflow.count + 1}")
	})

	it("does not write interpolated text back into workflow form session definitions", async () => {
		const workflowFormId = "non-mutating-interpolation-form"
		const parentSession = createParentWorkflowSession()
		parentSession.workflowValues.dynamicTitle = "First Workflow"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["dynamicTitle"],
			childInheritance: [{ parentKey: "dynamicTitle", childKey: "dynamicTitle" }],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Title {workflow.dynamicTitle}",
					toolDictionaryTitle: "Tools",
					toolDictionaryMarkdown: "Tool help",
					firstPanelId: "intro",
					panels: {
						intro: {
							panelId: "intro",
							title: "Panel {data.dynamicPanel}",
							promptMarkdown: "Prompt {workflow.dynamicTitle} {data.dynamicPrompt}",
							fields: [],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
						renderAction: {
							kind: "render_workflow_form",
							workflowFormId,
							buildSessionData: () => ({
								dynamicPanel: "First Panel",
								dynamicPrompt: "First Prompt",
							}),
						},
					}),
				}),
			},
		})
		registerResolvedWorkflow(workflow)

		const firstRender = await runtime.activateWorkflow({
			taskState,
			workflowName: workflow.name,
			parentSession,
		})

		expect(firstRender.kind).to.equal("render_workflow_form")
		if (firstRender.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${firstRender.kind}.`)
		}
		expect(firstRender.payload.title).to.equal("Title First Workflow")
		expect(firstRender.payload.panel?.title).to.equal("Panel First Panel")
		expect(firstRender.formSession.definitionPayload.title).to.equal("Title {workflow.dynamicTitle}")
		expect(firstRender.formSession.definitionPayload.panels.intro?.title).to.equal("Panel {data.dynamicPanel}")

		const activeSession = getActiveWorkflowSession(taskState)
		activeSession.workflowValues.dynamicTitle = "Second Workflow"
		const activeFormSession = getActiveFormSession(taskState)
		activeFormSession.data.dynamicPanel = "Second Panel"
		activeFormSession.data.dynamicPrompt = "Second Prompt"
		const secondRender = await runtime.resolveNextAction({ taskState })

		expect(secondRender.kind).to.equal("render_workflow_form")
		if (secondRender.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${secondRender.kind}.`)
		}
		expect(secondRender.payload.title).to.equal("Title Second Workflow")
		expect(secondRender.payload.panel?.title).to.equal("Panel Second Panel")
		expect(secondRender.payload.panel?.promptMarkdown).to.equal("Prompt Second Workflow Second Prompt")
		expect(secondRender.formSession.definitionPayload.title).to.equal("Title {workflow.dynamicTitle}")
		expect(secondRender.formSession.definitionPayload.panels.intro?.title).to.equal("Panel {data.dynamicPanel}")
	})

	it("rejects render form actions with invalid startPanelId values before activation", async () => {
		const workflowFormId = "invalid-start-panel-form"
		const invalidStartPanelCases: Array<{ label: string; startPanelId: string }> = [
			{ label: "unknown", startPanelId: "missing-panel" },
			{ label: "blank", startPanelId: "" },
			{ label: "untrimmed", startPanelId: " panel-2" },
		]

		for (const invalidStartPanelCase of invalidStartPanelCases) {
			const invalidState = new TaskState()
			const workflow = createWorkflowDefinition({
				name: `invalid-start-panel-${invalidStartPanelCase.label}`,
				workflowForms: {
					[workflowFormId]: createWorkflowFormDefinitionPayload(),
				},
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createWorkflowFormDecisionTree({
							workflowFormId,
							renderAction: {
								kind: "render_workflow_form",
								workflowFormId,
								startPanelId: invalidStartPanelCase.startPanelId,
							},
						}),
					}),
				},
			})
			registerResolvedWorkflow(workflow)

			const result = await runtime.activateWorkflow({
				taskState: invalidState,
				workflowName: workflow.name,
				parentSession: createParentWorkflowSession(),
			})

			expect(result).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName).to.be.undefined
			expect(invalidState.activeWorkflowSession).to.be.undefined
		}
	})

	it("rejects render form actions with non-function buildSessionData before activation", async () => {
		const workflowFormId = "invalid-session-data-builder-form"
		const renderRoute: WorkflowDecisionBranchRoute = {
			id: "render-form",
			trigger: { kind: "always" },
			action: {
				kind: "render_workflow_form",
				workflowFormId,
			},
			followingBranchId: "await-form-completion",
		}
		expect(Reflect.set(renderRoute.action, "buildSessionData", "not-a-function")).to.equal(true)
		const workflow = createWorkflowDefinition({
			workflowForms: {
				[workflowFormId]: createWorkflowFormDefinitionPayload(),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "show-form",
						branches: {
							"show-form": {
								id: "show-form",
								routes: [renderRoute],
							},
							"await-form-completion": {
								id: "await-form-completion",
								routes: [
									{
										id: "after-form",
										trigger: { kind: "always" },
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})
		registerResolvedWorkflow(workflow)

		const result = await runtime.activateWorkflow({
			taskState,
			workflowName: workflow.name,
			parentSession: createParentWorkflowSession(),
		})

		expect(result).to.deep.equal({ kind: "no_op" })
		expect(taskState.activeWorkflowName).to.be.undefined
		expect(taskState.activeWorkflowSession).to.be.undefined
	})

	it("returns terminal_error when buildSessionData throws or returns invalid data", async () => {
		const throwingWorkflowFormId = "throwing-session-data-form"
		const invalidWorkflowFormId = "invalid-session-data-form"
		const invalidDataRenderAction: WorkflowRenderFormDecisionAction = {
			kind: "render_workflow_form",
			workflowFormId: invalidWorkflowFormId,
			buildSessionData: () => ({
				valid: "initial",
			}),
		}
		expect(Reflect.set(invalidDataRenderAction, "buildSessionData", () => ({ invalid: undefined }))).to.equal(true)
		const failureCases: Array<{
			workflowName: string
			workflowFormId: string
			renderAction: WorkflowRenderFormDecisionAction
			expectedMessage: string
		}> = [
			{
				workflowName: "throwing-session-data-workflow",
				workflowFormId: throwingWorkflowFormId,
				renderAction: {
					kind: "render_workflow_form",
					workflowFormId: throwingWorkflowFormId,
					buildSessionData: () => {
						throw new Error("builder boom")
					},
				},
				expectedMessage: `Workflow form session data builder failed for form ${throwingWorkflowFormId}: builder boom`,
			},
			{
				workflowName: "invalid-session-data-workflow",
				workflowFormId: invalidWorkflowFormId,
				renderAction: invalidDataRenderAction,
				expectedMessage: `Workflow form session data builder returned invalid data for form ${invalidWorkflowFormId}.`,
			},
		]

		for (const failureCase of failureCases) {
			const failureState = new TaskState()
			const workflow = createWorkflowDefinition({
				name: failureCase.workflowName,
				workflowForms: {
					[failureCase.workflowFormId]: createWorkflowFormDefinitionPayload(),
				},
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createWorkflowFormDecisionTree({
							workflowFormId: failureCase.workflowFormId,
							renderAction: failureCase.renderAction,
						}),
					}),
				},
			})
			registerResolvedWorkflow(workflow)

			const result = await runtime.activateWorkflow({
				taskState: failureState,
				workflowName: workflow.name,
				parentSession: createParentWorkflowSession(),
			})

			expect(result.kind).to.equal("terminal_error")
			if (result.kind !== "terminal_error") {
				throw new Error(`Expected terminal_error, received ${result.kind}.`)
			}
			expect(result.errorMessage).to.equal(failureCase.expectedMessage)
			expect(failureState.activeWorkflowName).to.be.undefined
			expect(failureState.activeWorkflowSession).to.be.undefined
		}
	})

	it("builds runtime-owned workflow-form payloads and persists selector submissions through workflow values", async () => {
		const workflowFormId = "selector-form"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [
				"existing_project_value",
				"selected_folder_value",
				"selected_file_value",
				"selected_artifact_value",
			],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Selector Form",
					toolDictionaryTitle: "Selector Tools",
					toolDictionaryMarkdown: "Selector tool help",
					firstPanelId: "selectors",
					panels: {
						selectors: {
							panelId: "selectors",
							title: "Selector Inputs",
							promptMarkdown: "Choose existing runtime-owned values.",
							fields: [
								{
									key: "existing_project_choice",
									workflowValueKey: "existing_project_value",
									kind: "dropdown",
									label: "Existing Project",
									required: true,
									allowedValueType: "string",
									options: [],
									selectorDiscovery: {
										root: {
											kind: "project_output_root",
										},
										entryType: "directory",
										immediateChildrenOnly: true,
										sort: "alpha_asc",
									},
									valueSchema: { type: "string" },
								},
								{
									key: "selected_folder",
									workflowValueKey: "selected_folder_value",
									kind: "directory_path",
									label: "Folder",
									required: true,
									allowedValueType: "string",
									selectorDiscovery: {
										root: {
											kind: "selected_project_root",
										},
										entryType: "directory",
										immediateChildrenOnly: true,
										sort: "alpha_asc",
									},
									valueSchema: { type: "string" },
								},
								{
									key: "selected_file",
									workflowValueKey: "selected_file_value",
									kind: "file_path",
									label: "File",
									required: true,
									allowedValueType: "string",
									selectorDiscovery: {
										root: {
											kind: "selected_project_root",
										},
										entryType: "file",
										targetPathSegments: ["planning"],
										immediateChildrenOnly: true,
										sort: "alpha_asc",
									},
									valueSchema: { type: "string" },
								},
								{
									key: "selected_artifact",
									workflowValueKey: "selected_artifact_value",
									kind: "artifact_picker",
									label: "Artifact",
									required: true,
									allowedValueType: "string",
									selectorDiscovery: {
										root: {
											kind: "selected_project_root",
										},
										entryType: "file",
										targetPathSegments: ["planning"],
										immediateChildrenOnly: true,
										sort: "alpha_asc",
									},
									valueSchema: { type: "string" },
								},
							],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})

		discoverWorkflowCandidatesStub.callsFake((request: WorkflowDiscoveryRequest) => {
			if (
				request.entryType === "directory" &&
				request.rootDirectory === join(cwd, "docs", "projects") &&
				request.targetPathSegments === undefined
			) {
				return Promise.resolve([{ value: "Existing Alpha", label: "Existing Alpha" }])
			}

			if (
				request.entryType === "directory" &&
				request.rootDirectory === join(cwd, "docs", "projects", "selector-project") &&
				request.targetPathSegments === undefined
			) {
				return Promise.resolve([{ value: "planning", label: "planning" }])
			}

			if (
				request.entryType === "file" &&
				request.rootDirectory === join(cwd, "docs", "projects", "selector-project") &&
				request.targetPathSegments?.length === 1 &&
				request.targetPathSegments[0] === "planning"
			) {
				return Promise.resolve([
					{ value: "notes.md", label: "notes.md" },
					{ value: "artifact.md", label: "artifact.md" },
				])
			}

			return Promise.resolve([])
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Selector Project")

		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}

		const selectorDiscoveryRequests = discoverWorkflowCandidatesStub
			.getCalls()
			.map((call) => call.args[0])
			.filter((request: WorkflowDiscoveryRequest) => request.workspacePathPolicy === workspacePathPolicy)
		expect(selectorDiscoveryRequests.length).to.be.greaterThan(0)
		for (const request of selectorDiscoveryRequests) {
			expect(request.workspacePathPolicy).to.equal(workspacePathPolicy)
		}
		const selectedProjectDirectory = join(cwd, "docs", "projects", "selector-project")
		const selectedFolderDiscoveryRequest = selectorDiscoveryRequests.find(
			(request: WorkflowDiscoveryRequest) =>
				request.rootDirectory === selectedProjectDirectory &&
				request.entryType === "directory" &&
				request.targetPathSegments === undefined,
		)
		expect(selectedFolderDiscoveryRequest).to.not.equal(undefined)
		const selectedProjectFileDiscoveryRequests = selectorDiscoveryRequests.filter(
			(request: WorkflowDiscoveryRequest) =>
				request.rootDirectory === selectedProjectDirectory &&
				request.entryType === "file" &&
				request.targetPathSegments?.length === 1 &&
				request.targetPathSegments[0] === "planning",
		)
		expect(selectedProjectFileDiscoveryRequests.length).to.equal(2)

		const expectedExistingProjectOptions = [{ value: "Existing Alpha", label: "Existing Alpha" }]
		const expectedFolderOptions = [{ value: "planning", label: "planning" }]
		const expectedFileOptions = [
			{ value: "notes.md", label: "notes.md" },
			{ value: "artifact.md", label: "artifact.md" },
		]
		const renderedSessionFields = renderFormAction.formSession.definitionPayload.panels.selectors.fields

		expect(renderFormAction.payload.panel?.panelId).to.equal("selectors")
		expect(
			renderFormAction.payload.panel?.fields.find((field) => field.key === "existing_project_choice")?.options,
		).to.deep.equal(expectedExistingProjectOptions)
		expect(renderFormAction.payload.panel?.fields.find((field) => field.key === "selected_folder")?.options).to.deep.equal(
			expectedFolderOptions,
		)
		expect(renderFormAction.payload.panel?.fields.find((field) => field.key === "selected_file")?.options).to.deep.equal(
			expectedFileOptions,
		)
		expect(renderFormAction.payload.panel?.fields.find((field) => field.key === "selected_artifact")?.options).to.deep.equal([
			...expectedFileOptions,
		])
		expect(renderedSessionFields.find((field) => field.key === "existing_project_choice")?.options).to.deep.equal(
			expectedExistingProjectOptions,
		)
		expect(renderedSessionFields.find((field) => field.key === "selected_folder")?.options).to.deep.equal(
			expectedFolderOptions,
		)
		expect(renderedSessionFields.find((field) => field.key === "selected_file")?.options).to.deep.equal(expectedFileOptions)
		expect(renderedSessionFields.find((field) => field.key === "selected_artifact")?.options).to.deep.equal(
			expectedFileOptions,
		)

		const submitted = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
				fields: [
					{
						key: "existing_project_choice",
						value: { stringValue: "Existing Alpha" },
					},
					{
						key: "selected_folder",
						value: { stringValue: "planning" },
					},
					{
						key: "selected_file",
						value: { stringValue: "notes.md" },
					},
					{
						key: "selected_artifact",
						value: { stringValue: "artifact.md" },
					},
				],
			}),
		})

		expect(submitted.kind).to.equal("project_prompt")
		expect(getActiveWorkflowSession(taskState).workflowValues).to.deep.include({
			existing_project_value: "Existing Alpha",
			selected_folder_value: "planning",
			selected_file_value: "notes.md",
			selected_artifact_value: "artifact.md",
		})
	})

	it("rejects selector submissions absent from the rendered form session options", async () => {
		const workflowFormId = "selector-validation-form"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [
				"existing_project_value",
				"selected_folder_value",
				"selected_file_value",
				"selected_artifact_value",
			],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Selector Validation Form",
					toolDictionaryTitle: "Selector Validation Tools",
					toolDictionaryMarkdown: "Selector validation help",
					firstPanelId: "selectors",
					panels: {
						selectors: {
							panelId: "selectors",
							title: "Selector Inputs",
							promptMarkdown: "Choose existing runtime-owned values.",
							fields: [
								{
									key: "existing_project_choice",
									workflowValueKey: "existing_project_value",
									kind: "dropdown",
									label: "Existing Project",
									required: true,
									allowedValueType: "string",
									options: [],
									selectorDiscovery: {
										root: {
											kind: "project_output_root",
										},
										entryType: "directory",
										immediateChildrenOnly: true,
										sort: "alpha_asc",
									},
									valueSchema: { type: "string" },
								},
								{
									key: "selected_folder",
									workflowValueKey: "selected_folder_value",
									kind: "directory_path",
									label: "Folder",
									required: true,
									allowedValueType: "string",
									selectorDiscovery: {
										root: {
											kind: "selected_project_root",
										},
										entryType: "directory",
										immediateChildrenOnly: true,
										sort: "alpha_asc",
									},
									valueSchema: { type: "string" },
								},
								{
									key: "selected_file",
									workflowValueKey: "selected_file_value",
									kind: "file_path",
									label: "File",
									required: true,
									allowedValueType: "string",
									selectorDiscovery: {
										root: {
											kind: "selected_project_root",
										},
										entryType: "file",
										targetPathSegments: ["planning"],
										immediateChildrenOnly: true,
										sort: "alpha_asc",
									},
									valueSchema: { type: "string" },
								},
								{
									key: "selected_artifact",
									workflowValueKey: "selected_artifact_value",
									kind: "artifact_picker",
									label: "Artifact",
									required: true,
									allowedValueType: "string",
									selectorDiscovery: {
										root: {
											kind: "selected_project_root",
										},
										entryType: "file",
										targetPathSegments: ["planning"],
										immediateChildrenOnly: true,
										sort: "alpha_asc",
									},
									valueSchema: { type: "string" },
								},
							],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})
		const configureSelectorDiscovery = (fakeOption?: { fieldKey: string; value: string }) => {
			discoverWorkflowCandidatesStub.callsFake((request: WorkflowDiscoveryRequest) => {
				const includeFake = (fieldKey: string, options: Array<{ value: string; label: string }>) =>
					fakeOption?.fieldKey === fieldKey
						? [...options, { value: fakeOption.value, label: fakeOption.value }]
						: options

				if (
					request.entryType === "directory" &&
					request.rootDirectory === join(cwd, "docs", "projects") &&
					request.targetPathSegments === undefined
				) {
					return Promise.resolve(
						includeFake("existing_project_choice", [{ value: "Existing Alpha", label: "Existing Alpha" }]),
					)
				}

				if (
					request.entryType === "directory" &&
					request.rootDirectory.endsWith("selector-validation-project") &&
					request.targetPathSegments === undefined
				) {
					return Promise.resolve(includeFake("selected_folder", [{ value: "planning", label: "planning" }]))
				}

				if (
					request.entryType === "file" &&
					request.rootDirectory.endsWith("selector-validation-project") &&
					request.targetPathSegments?.length === 1 &&
					request.targetPathSegments[0] === "planning"
				) {
					const options = [
						{ value: "notes.md", label: "notes.md" },
						{ value: "artifact.md", label: "artifact.md" },
					]
					return Promise.resolve(includeFake(fakeOption?.fieldKey ?? "", options))
				}

				return Promise.resolve([])
			})
		}

		for (const invalidCase of [
			{
				fieldKey: "existing_project_choice",
				workflowValueKey: "existing_project_value",
				fakeValue: "Fake Project",
			},
			{
				fieldKey: "selected_folder",
				workflowValueKey: "selected_folder_value",
				fakeValue: "fake-folder",
			},
			{
				fieldKey: "selected_file",
				workflowValueKey: "selected_file_value",
				fakeValue: "fake-notes.md",
			},
			{
				fieldKey: "selected_artifact",
				workflowValueKey: "selected_artifact_value",
				fakeValue: "fake-artifact.md",
			},
		]) {
			const caseTaskState = new TaskState()
			configureSelectorDiscovery()

			await activateWorkflow(caseTaskState, workflow)
			await runtime.resolveNextAction({ taskState: caseTaskState })
			const renderFormAction = await submitNewProjectSelection(
				caseTaskState,
				`${invalidCase.fieldKey} Selector Validation Project`,
			)
			expect(renderFormAction.kind).to.equal("render_workflow_form")
			if (renderFormAction.kind !== "render_workflow_form") {
				throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
			}

			const renderedOptions =
				renderFormAction.formSession.definitionPayload.panels.selectors.fields.find(
					(field) => field.key === invalidCase.fieldKey,
				)?.options ?? []
			expect(renderedOptions.some((option) => option.value === invalidCase.fakeValue)).to.equal(false)

			configureSelectorDiscovery({ fieldKey: invalidCase.fieldKey, value: invalidCase.fakeValue })

			const submittedValues: Record<string, string> = {
				existing_project_choice: "Existing Alpha",
				selected_folder: "planning",
				selected_file: "notes.md",
				selected_artifact: "artifact.md",
				[invalidCase.fieldKey]: invalidCase.fakeValue,
			}
			const submitted = await runtime.submitWorkflowForm({
				taskState: caseTaskState,
				request: createFormSubmitRequest({
					sessionId: renderFormAction.formSession.sessionId,
					panelId: renderFormAction.formSession.currentPanelId,
					fields: Object.entries(submittedValues).map(([key, stringValue]) => ({
						key,
						value: { stringValue },
					})),
				}),
			})

			expect(submitted.kind).to.equal("render_workflow_form")
			if (submitted.kind !== "render_workflow_form") {
				throw new Error(`Expected render_workflow_form, received ${submitted.kind}.`)
			}
			expect(submitted.payload.renderState).to.equal("failure")
			expect(submitted.payload.errorMessage).to.equal(
				`Field "${invalidCase.fieldKey}" does not satisfy the declared selection rules.`,
			)
			expect(getActiveWorkflowSession(caseTaskState).workflowValues).to.not.have.property(invalidCase.workflowValueKey)
		}
	})

	it("renders dropdown options from selected-project planning/Epics.index.json", async () => {
		const workflowFormId = "json-options-dropdown-form"
		const workflowValueKey = "selected_epic"
		const projectFolderName = "json-options-dropdown-project"
		await writeEpicsIndex(join(cwd, "docs", "projects", projectFolderName, "planning", "Epics.index.json"), [
			{ identity: "1", title: "Foundation", storyIndexGenerated: false },
			{ identity: "2", title: "Delivery", storyIndexGenerated: true },
		])

		const workflow = createWorkflowDefinition({
			workflowValueKeys: [workflowValueKey],
			workflowForms: {
				[workflowFormId]: createJsonOptionsWorkflowForm({
					workflowFormId,
					fields: [
						createEpicsJsonOptionsField({
							key: "epic",
							kind: "dropdown",
							workflowValueKey,
							jsonOptionsSource: createEpicsJsonOptionsSource({
								descriptionTemplate: "Story index generated: {story-index-generated}",
							}),
						}),
					],
				}),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		const renderFormAction = await submitNewProjectSelection(taskState, projectFolderName)

		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}

		const expectedOptions = [
			{ value: "1", label: "Epic 1: Foundation", description: "Story index generated: false" },
			{ value: "2", label: "Epic 2: Delivery", description: "Story index generated: true" },
		]
		expect(renderFormAction.payload.panel?.fields.find((field) => field.key === "epic")?.options).to.deep.equal(
			expectedOptions,
		)
		expect(
			renderFormAction.formSession.definitionPayload.panels["json-options"].fields.find((field) => field.key === "epic")
				?.options,
		).to.deep.equal(expectedOptions)
	})

	it("renders dropdown options from workflow-value-interpolated selected-project story index", async () => {
		const workflowFormId = "json-options-story-index-form"
		const projectFolderName = "json-options-story-index-project"
		const parentSession = createParentWorkflowSession({ projectFolderName })
		parentSession.workflowValues.epic_identity = "7"
		await writeStoryIndex(join(cwd, "docs", "projects", projectFolderName, "implementation", "epic-7-stories.index.json"), [
			{
				story_identity: "7.1",
				story_file_name: "Story-7-1.md",
				story_type: "primary",
				parent_story_identity: null,
				story_file_generated: true,
				status: "draft",
			},
			{
				story_identity: "7.2",
				story_file_name: "Story-7-2.md",
				story_type: "primary",
				parent_story_identity: null,
				story_file_generated: true,
				status: "backlog",
			},
		])

		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["epic_identity", "selected_story"],
			childInheritance: [{ parentKey: "epic_identity", childKey: "epic_identity" }],
			workflowForms: {
				[workflowFormId]: createJsonOptionsWorkflowForm({
					workflowFormId,
					fields: [
						createEpicsJsonOptionsField({
							key: "story",
							kind: "dropdown",
							workflowValueKey: "selected_story",
							jsonOptionsSource: createEpicsJsonOptionsSource({
								sourcePathSegments: ["implementation", "epic-{workflow.epic_identity}-stories.index.json"],
								itemsPath: "stories",
								valueProperty: "story_identity",
								labelTemplate: "Story {story_identity}: {story_file_name}",
								descriptionTemplate: "Status: {status}",
							}),
						}),
					],
				}),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
				}),
			},
		})
		registerResolvedWorkflow(workflow)

		const renderFormAction = await runtime.activateWorkflow({
			taskState,
			workflowName: workflow.name,
			parentSession,
		})

		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}

		const expectedOptions = [
			{ value: "7.1", label: "Story 7.1: Story-7-1.md", description: "Status: draft" },
			{ value: "7.2", label: "Story 7.2: Story-7-2.md", description: "Status: backlog" },
		]
		expect(renderFormAction.payload.panel?.fields.find((field) => field.key === "story")?.options).to.deep.equal(
			expectedOptions,
		)
	})

	it("fails before reading JSON options when dynamic source path placeholders stay unresolved", async () => {
		const workflowFormId = "json-options-unresolved-source-path-form"
		const projectFolderName = "json-options-unresolved-source-path-project"
		const parentSession = createParentWorkflowSession({ projectFolderName })
		await writeStoryIndex(
			join(cwd, "docs", "projects", projectFolderName, "implementation", "epic-{workflow.missing_epic}-stories.index.json"),
			[
				{
					story_identity: "4.1",
					story_file_name: "Story-4-1.md",
					story_type: "primary",
					parent_story_identity: null,
					story_file_generated: true,
					status: "draft",
				},
			],
		)

		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["selected_story"],
			workflowForms: {
				[workflowFormId]: createJsonOptionsWorkflowForm({
					workflowFormId,
					fields: [
						createEpicsJsonOptionsField({
							key: "story",
							kind: "dropdown",
							workflowValueKey: "selected_story",
							jsonOptionsSource: createEpicsJsonOptionsSource({
								sourcePathSegments: ["implementation", "epic-{workflow.missing_epic}-stories.index.json"],
								itemsPath: "stories",
								valueProperty: "story_identity",
								labelTemplate: "Story {story_identity}: {story_file_name}",
							}),
						}),
					],
				}),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
				}),
			},
		})
		registerResolvedWorkflow(workflow)

		let thrownError: Error | undefined
		try {
			await runtime.activateWorkflow({
				taskState,
				workflowName: workflow.name,
				parentSession,
			})
		} catch (error) {
			if (error instanceof Error) {
				thrownError = error
			}
		}

		expect(thrownError).to.not.equal(undefined)
		if (thrownError === undefined) {
			throw new Error("Expected unresolved dynamic jsonOptionsSource path to fail.")
		}
		expect(thrownError.message).to.contain("contains an unresolved workflow-form placeholder")
		expect(thrownError.message).to.not.contain("could not be read")
	})

	it("fails before reading JSON options when workflow values resolve source path placeholders to unsafe segments", async () => {
		const workflowFormId = "json-options-unsafe-resolved-source-path-form"
		const projectFolderName = "json-options-unsafe-resolved-source-path-project"
		const parentSession = createParentWorkflowSession({ projectFolderName })
		parentSession.workflowValues.epic_identity = "../outside"
		await writeStoryIndex(
			join(cwd, "docs", "projects", projectFolderName, "implementation", "epic-..", "outside-stories.index.json"),
			[
				{
					story_identity: "5.1",
					story_file_name: "Story-5-1.md",
					story_type: "primary",
					parent_story_identity: null,
					story_file_generated: true,
					status: "draft",
				},
			],
		)

		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["epic_identity", "selected_story"],
			childInheritance: [{ parentKey: "epic_identity", childKey: "epic_identity" }],
			workflowForms: {
				[workflowFormId]: createJsonOptionsWorkflowForm({
					workflowFormId,
					fields: [
						createEpicsJsonOptionsField({
							key: "story",
							kind: "dropdown",
							workflowValueKey: "selected_story",
							jsonOptionsSource: createEpicsJsonOptionsSource({
								sourcePathSegments: ["implementation", "epic-{workflow.epic_identity}-stories.index.json"],
								itemsPath: "stories",
								valueProperty: "story_identity",
								labelTemplate: "Story {story_identity}: {story_file_name}",
							}),
						}),
					],
				}),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
				}),
			},
		})
		registerResolvedWorkflow(workflow)

		let thrownError: Error | undefined
		try {
			await runtime.activateWorkflow({
				taskState,
				workflowName: workflow.name,
				parentSession,
			})
		} catch (error) {
			if (error instanceof Error) {
				thrownError = error
			}
		}

		expect(thrownError).to.not.equal(undefined)
		if (thrownError === undefined) {
			throw new Error("Expected unsafe resolved dynamic jsonOptionsSource path to fail.")
		}
		expect(thrownError.message).to.contain("resolved sourcePathSegments entry epic-../outside-stories.index.json is invalid")
		expect(thrownError.message).to.not.contain("could not be read")
	})

	it("renders radio group, multi-select, and checkbox-group options from the same JSON source", async () => {
		const workflowFormId = "json-options-option-kinds-form"
		const projectFolderName = "json-options-kinds-project"
		await writeEpicsIndex(join(cwd, "docs", "projects", projectFolderName, "planning", "Epics.index.json"), [
			{ identity: "1", title: "Foundation", storyIndexGenerated: false },
			{ identity: "2", title: "Delivery", storyIndexGenerated: false },
		])

		const workflow = createWorkflowDefinition({
			workflowForms: {
				[workflowFormId]: createJsonOptionsWorkflowForm({
					workflowFormId,
					fields: [
						createEpicsJsonOptionsField({ key: "radio_epic", kind: "radio_group", workflowValueKey: undefined }),
						createEpicsJsonOptionsField({
							key: "multi_epics",
							kind: "multi_select",
							workflowValueKey: undefined,
						}),
						createEpicsJsonOptionsField({
							key: "checkbox_epics",
							kind: "checkbox_group",
							workflowValueKey: undefined,
						}),
					],
				}),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		const renderFormAction = await submitNewProjectSelection(taskState, projectFolderName)

		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}

		const expectedOptions = [
			{ value: "1", label: "Epic 1: Foundation" },
			{ value: "2", label: "Epic 2: Delivery" },
		]
		for (const fieldKey of ["radio_epic", "multi_epics", "checkbox_epics"]) {
			expect(renderFormAction.payload.panel?.fields.find((field) => field.key === fieldKey)?.options).to.deep.equal(
				expectedOptions,
			)
		}
	})

	it("fails clearly when JSON option source files are missing or malformed", async () => {
		const expectJsonOptionsRenderFailure = async (args: {
			projectFolderName: string
			expectedMessageParts: readonly string[]
			writeSourceFile: boolean
			sourceFileText: string
		}): Promise<void> => {
			if (args.writeSourceFile) {
				const sourcePath = join(cwd, "docs", "projects", args.projectFolderName, "planning", "Epics.index.json")
				await mkdir(dirname(sourcePath), { recursive: true })
				await writeFile(sourcePath, args.sourceFileText, "utf8")
			}

			const failureState = new TaskState()
			const workflowFormId = `${args.projectFolderName}-form`
			const workflow = createWorkflowDefinition({
				workflowForms: {
					[workflowFormId]: createJsonOptionsWorkflowForm({
						workflowFormId,
						fields: [
							createEpicsJsonOptionsField({
								key: "epic",
								kind: "dropdown",
								workflowValueKey: undefined,
							}),
						],
					}),
				},
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
					}),
				},
			})
			await activateWorkflow(failureState, workflow)

			let thrownError: Error | undefined
			try {
				await submitNewProjectSelection(failureState, args.projectFolderName)
			} catch (error) {
				if (error instanceof Error) {
					thrownError = error
				}
			}

			expect(thrownError).to.not.equal(undefined)
			if (thrownError === undefined) {
				throw new Error("Expected JSON option source rendering to fail.")
			}
			for (const expectedMessagePart of args.expectedMessageParts) {
				expect(thrownError.message).to.contain(expectedMessagePart)
			}
		}

		await expectJsonOptionsRenderFailure({
			projectFolderName: "json-options-missing-project",
			expectedMessageParts: ["jsonOptionsSource file", "could not be read"],
			writeSourceFile: false,
			sourceFileText: "",
		})
		await expectJsonOptionsRenderFailure({
			projectFolderName: "json-options-malformed-project",
			expectedMessageParts: ["jsonOptionsSource file", "is malformed JSON"],
			writeSourceFile: true,
			sourceFileText: "{",
		})
		await expectJsonOptionsRenderFailure({
			projectFolderName: "json-options-duplicate-project",
			expectedMessageParts: ["jsonOptionsSource generated duplicate option value 1"],
			writeSourceFile: true,
			sourceFileText: JSON.stringify({
				version: 1,
				epics: [
					{ identity: "1", title: "Foundation", "story-index-generated": false },
					{ identity: "1", title: "Duplicate", "story-index-generated": false },
				],
			}),
		})
	})

	it("rejects invalid JSON option source definitions before activation", async () => {
		const createWorkflowWithField = (field: WorkflowFormFieldDefinition): WorkflowDefinition => {
			const workflowFormId = `invalid-${field.key}-form`
			return createWorkflowDefinition({
				workflowForms: {
					[workflowFormId]: createJsonOptionsWorkflowForm({
						workflowFormId,
						fields: [field],
					}),
				},
			})
		}
		const createDropdownField = (
			jsonOptionsSource: NonNullable<WorkflowFormFieldDefinition["jsonOptionsSource"]>,
		): WorkflowFormFieldDefinition =>
			createEpicsJsonOptionsField({
				key: "epic",
				kind: "dropdown",
				workflowValueKey: undefined,
				jsonOptionsSource,
			})

		const invalidFieldCases: Array<{ readonly label: string; readonly field: WorkflowFormFieldDefinition }> = [
			...[
				{ label: "empty string", segment: "" },
				{ label: "current directory", segment: "." },
				{ label: "parent directory", segment: ".." },
				{ label: "slash", segment: "nested/path" },
				{ label: "backslash", segment: "nested\\path" },
				{ label: "absolute path", segment: join(cwd, "outside") },
				{ label: "Windows drive syntax", segment: "C:" },
			].map((invalidSegment) => ({
				label: `unsafe sourcePathSegments ${invalidSegment.label}`,
				field: createDropdownField(
					createEpicsJsonOptionsSource({
						sourcePathSegments: ["planning", invalidSegment.segment],
					}),
				),
			})),
			{
				label: "selectorDiscovery conflict",
				field: {
					...createDropdownField(createEpicsJsonOptionsSource()),
					selectorDiscovery: {
						root: {
							kind: "selected_project_root",
						},
						entryType: "file",
						immediateChildrenOnly: true,
						sort: "alpha_asc",
					},
				},
			},
			{
				label: "unsupported field kind",
				field: {
					key: "summary",
					kind: "small_text",
					label: "Summary",
					required: true,
					allowedValueType: "string",
					jsonOptionsSource: createEpicsJsonOptionsSource(),
				},
			},
			{
				label: "empty itemsPath",
				field: createDropdownField(createEpicsJsonOptionsSource({ itemsPath: "" })),
			},
			{
				label: "untrimmed valueProperty",
				field: createDropdownField(createEpicsJsonOptionsSource({ valueProperty: " identity" })),
			},
			{
				label: "empty labelTemplate",
				field: createDropdownField(createEpicsJsonOptionsSource({ labelTemplate: " " })),
			},
			{
				label: "untrimmed descriptionTemplate",
				field: createDropdownField(createEpicsJsonOptionsSource({ descriptionTemplate: "Description " })),
			},
		]

		for (const invalidFieldCase of invalidFieldCases) {
			const invalidState = new TaskState()
			const result = await activateWorkflow(invalidState, createWorkflowWithField(invalidFieldCase.field))

			expect(result, invalidFieldCase.label).to.deep.equal({ kind: "no_op" })
			expect(invalidState.activeWorkflowName, invalidFieldCase.label).to.be.undefined
			expect(invalidState.activeWorkflowSession, invalidFieldCase.label).to.be.undefined
		}
	})

	it("keeps workflow-form field keys form-local unless workflowValueKey is declared", async () => {
		const workflowFormId = "form-local-field-form"
		const fieldKey = "local_summary"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [fieldKey],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Form Local Field Form",
					toolDictionaryTitle: "Form Local Field Tools",
					toolDictionaryMarkdown: "Form local field help",
					firstPanelId: "details",
					panels: {
						details: {
							panelId: "details",
							title: "Details",
							promptMarkdown: "Capture local details.",
							fields: [
								{
									key: fieldKey,
									kind: "small_text",
									label: "Local summary",
									required: true,
									allowedValueType: "string",
								},
							],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
					}),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Form Local Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}

		const nextAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
				fields: [
					{
						key: fieldKey,
						value: { stringValue: "Local only" },
					},
				],
			}),
		})

		expect(nextAction.kind).to.equal("project_prompt")
		expect(getActiveWorkflowSession(taskState).workflowValues).to.not.have.property(fieldKey)
	})

	it("passes module selector namingPattern into candidate discovery and filters through the discovery seam", async () => {
		const workflowFormId = "naming-pattern-selector-form"
		const fieldKey = "selected_story"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [fieldKey],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Naming Pattern Selector Form",
					toolDictionaryTitle: "Naming Pattern Selector Tools",
					toolDictionaryMarkdown: "Naming pattern selector help",
					firstPanelId: "selectors",
					panels: {
						selectors: {
							panelId: "selectors",
							title: "Selector Inputs",
							promptMarkdown: "Choose a discovered story.",
							fields: [
								{
									key: fieldKey,
									kind: "file_path",
									label: "Story",
									required: true,
									allowedValueType: "string",
									selectorDiscovery: {
										root: {
											kind: "selected_project_root",
										},
										entryType: "file",
										targetPathSegments: ["stories"],
										namingPattern: "^story-.+\\.md$",
										immediateChildrenOnly: true,
										sort: "alpha_asc",
									},
									valueSchema: { type: "string" },
								},
							],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
					}),
				}),
			},
		})
		let observedNamingPattern: RegExp | undefined

		discoverWorkflowCandidatesStub.callsFake((request: WorkflowDiscoveryRequest) => {
			if (
				request.entryType === "file" &&
				request.rootDirectory === join(cwd, "docs", "projects", "pattern-project") &&
				request.targetPathSegments?.length === 1 &&
				request.targetPathSegments[0] === "stories"
			) {
				observedNamingPattern = request.namingPattern
				const entries = ["story-alpha.md", "notes.md"].filter((entryName) => {
					const namingPattern = request.namingPattern
					if (namingPattern === undefined) {
						return true
					}

					namingPattern.lastIndex = 0
					return namingPattern.test(entryName)
				})

				return Promise.resolve(
					entries.map((entryName) => ({
						value: entryName,
						label: request.buildLabel === undefined ? entryName : request.buildLabel(entryName),
					})),
				)
			}

			return Promise.resolve([])
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Pattern Project")

		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}
		expect(observedNamingPattern).to.not.equal(undefined)
		if (observedNamingPattern === undefined) {
			throw new Error("Expected namingPattern to be passed to discovery.")
		}

		expect(observedNamingPattern.test("story-alpha.md")).to.equal(true)
		observedNamingPattern.lastIndex = 0
		expect(observedNamingPattern.test("notes.md")).to.equal(false)
		expect(renderFormAction.payload.panel?.fields.find((field) => field.key === fieldKey)?.options).to.deep.equal([
			{ value: "story-alpha.md", label: "story-alpha.md" },
		])
	})

	it("applies module selector labelTemplate while preserving canonical option values", async () => {
		const workflowFormId = "label-template-selector-form"
		const fieldKey = "selected_artifact"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [fieldKey],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Label Template Selector Form",
					toolDictionaryTitle: "Label Template Selector Tools",
					toolDictionaryMarkdown: "Label template selector help",
					firstPanelId: "selectors",
					panels: {
						selectors: {
							panelId: "selectors",
							title: "Selector Inputs",
							promptMarkdown: "Choose a discovered artifact.",
							fields: [
								{
									key: fieldKey,
									kind: "artifact_picker",
									label: "Artifact",
									required: true,
									allowedValueType: "string",
									selectorDiscovery: {
										root: {
											kind: "selected_project_root",
										},
										entryType: "file",
										targetPathSegments: ["artifacts"],
										labelTemplate: "Artifact: {entryName}",
										immediateChildrenOnly: true,
										sort: "alpha_asc",
									},
									valueSchema: { type: "string" },
								},
							],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
					}),
				}),
			},
		})

		discoverWorkflowCandidatesStub.callsFake((request: WorkflowDiscoveryRequest) => {
			if (
				request.entryType === "file" &&
				request.rootDirectory === join(cwd, "docs", "projects", "template-project") &&
				request.targetPathSegments?.length === 1 &&
				request.targetPathSegments[0] === "artifacts"
			) {
				return Promise.resolve(
					["brief.md"].map((entryName) => ({
						value: entryName,
						label: request.buildLabel === undefined ? entryName : request.buildLabel(entryName),
					})),
				)
			}

			return Promise.resolve([])
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Template Project")

		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}
		expect(renderFormAction.payload.panel?.fields.find((field) => field.key === fieldKey)?.options).to.deep.equal([
			{ value: "brief.md", label: "Artifact: brief.md" },
		])
	})

	it("routes serialized denied and errored tool-backed operation tool results through tool_backed_operation_failed", async () => {
		const failureCases = [
			{
				toolResultText: formatResponse.toolDenied(),
				expectedErrorMessage: formatResponse.toolDenied(),
			},
			{
				toolResultText: formatResponse.toolError("boom"),
				expectedErrorMessage: formatResponse.toolError("boom"),
			},
		]

		for (const failureCase of failureCases) {
			const failureState = new TaskState()
			const workflow = createWorkflowDefinition({
				name: `serialized-tool-backed operation-failure-${failureCases.indexOf(failureCase)}`,
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createToolBackedOperationDecisionTree(),
					}),
				},
			})

			await activateWorkflow(failureState, workflow)
			await runtime.resolveNextAction({ taskState: failureState })
			await submitNewProjectSelection(failureState, `Serialized Failure ${failureCases.indexOf(failureCase)}`)
			expect((await runtime.resolveNextAction({ taskState: failureState })).kind).to.equal("execute_tool_backed_operation")

			const result = await runtime.handleToolBackedOperationToolResult({
				taskState: failureState,
				toolResultText: failureCase.toolResultText,
				runtimeOwnedSourceRoute: undefined,
			})
			const activeSession = getActiveWorkflowSession(failureState)

			expect(result.kind).to.equal("project_prompt")
			expect(activeSession.branchContext.activeBranchId).to.equal("after-step-resolution-failure")
			expect(activeSession.branchContext.failureState).to.deep.equal({
				retryAttemptCount: 1,
				terminalErrorMessage: failureCase.expectedErrorMessage,
			})
			expect(activeSession.ui.suppressedWorkflowStepResolutionRoutes).to.deep.equal([STEP_RESOLUTION_SOURCE_ROUTE])
			expect(activeSession.activeStepNumber).to.equal(1)
		}
	})

	it("runs tool-backed operation routes with explicit target-step progression and failure context", async () => {
		const successWorkflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						successAction: createEntryBranchStepTransitionAction(3),
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
				"step-3": createStepDefinition({ stepNumber: 3, checklistLabel: "Step 3" }),
			},
		})

		await activateWorkflow(taskState, successWorkflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Step Resolution Project")
		const toolBackedOperation = await runtime.resolveNextAction({ taskState })

		expect(toolBackedOperation.kind).to.equal("execute_tool_backed_operation")
		if (toolBackedOperation.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${toolBackedOperation.kind}.`)
		}
		expect(toolBackedOperation.toolBackedOperationSession).to.not.equal(undefined)
		if (!toolBackedOperation.toolBackedOperationSession) {
			throw new Error("Expected a runtime-owned tool-backed operation session.")
		}
		expect(toolBackedOperation.toolBackedOperationSession.sourceRoute).to.deep.equal(STEP_RESOLUTION_SOURCE_ROUTE)
		expect(toolBackedOperation.toolBackedOperationSession.triggerSource).to.equal("execute_tool_backed_operation")
		expect(toolBackedOperation.toolBackedOperationSession.owner).to.deep.equal({
			kind: "workflow_step",
			workflowName: successWorkflow.name,
			stepNumber: 1,
		})
		expect(toolBackedOperation.toolBackedOperationSession.state).to.equal("pending")
		expect(toolBackedOperation.toolBackedOperationSession.sessionId).to.be.a("string").and.not.equal("")
		expect(
			runtime.buildToolBackedOperationStatusPayload({
				taskState,
				session: toolBackedOperation.toolBackedOperationSession,
			}),
		).to.deep.equal({
			sessionId: toolBackedOperation.toolBackedOperationSession.sessionId,
			sourceRoute: STEP_RESOLUTION_SOURCE_ROUTE,
			owner: {
				workflowName: successWorkflow.name,
				stepNumber: 1,
			},
			state: "pending",
			definition: {
				title: "Step Resolution",
				pendingLabel: "Pending",
				successLabel: "Success",
				failureLabel: "Failure",
			},
		})
		const successResult = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: "ok",
			runtimeOwnedSourceRoute: undefined,
		})
		expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(3)
		expect(getActiveWorkflowSession(taskState).ui.suppressedWorkflowStepResolutionRoutes).to.deep.equal([])
		expect(successResult.kind).to.equal("project_prompt")
		if (successResult.kind !== "project_prompt") {
			throw new Error(`Expected project_prompt, received ${successResult.kind}.`)
		}
		expect(successResult.promptProjection.workflowInputPayloadBlock).to.contain("Step 3: Step 3")
		expect(getActiveWorkflowSession(taskState).branchContext.activeBranchId).to.equal("project-prompt")

		const failureWorkflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						startAction: {
							kind: "execute_tool_backed_operation",
							instruction: createToolBackedActionInstruction({
								shouldSucceed: false,
							}),
						},
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})
		const failureState = new TaskState()
		await activateWorkflow(failureState, failureWorkflow)
		await runtime.resolveNextAction({ taskState: failureState })
		await submitNewProjectSelection(failureState, "Failure Project")
		expect((await runtime.resolveNextAction({ taskState: failureState })).kind).to.equal("execute_tool_backed_operation")
		const failureResult = await runtime.handleToolBackedOperationToolResult({
			taskState: failureState,
			toolResultText: "ok",
			runtimeOwnedSourceRoute: undefined,
		})

		expect(getActiveWorkflowSession(failureState).activeStepNumber).to.equal(1)
		expect(getActiveWorkflowSession(failureState).ui.suppressedWorkflowStepResolutionRoutes).to.deep.equal([
			STEP_RESOLUTION_SOURCE_ROUTE,
		])
		expect(getActiveWorkflowSession(failureState).branchContext.failureState).to.deep.equal({
			retryAttemptCount: 1,
			terminalErrorMessage: "failure",
		})
		expect(getActiveWorkflowSession(failureState).branchContext.activeBranchId).to.equal("after-step-resolution-failure")
		expect(failureResult.kind).to.equal("project_prompt")
	})

	it("completes workflow when transition enters a step with passing completion rules", async () => {
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						successAction: createEntryBranchStepTransitionAction(2),
					}),
				}),
				"step-2": createStepDefinition({
					stepNumber: 2,
					decisionTree: createProjectPromptDecisionTree(),
					completionRules: [
						{
							id: "complete-on-entry",
							isComplete: () => true,
						},
					],
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Completion Transition Project")
		expect((await runtime.resolveNextAction({ taskState })).kind).to.equal("execute_tool_backed_operation")

		const result = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: "ok",
			runtimeOwnedSourceRoute: undefined,
		})

		expect(result.kind).to.equal("complete_workflow")
		expectWorkflowStateCleared(taskState)
	})

	it("returns a project prompt when transition enters a step with no selected action", async () => {
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						successAction: createEntryBranchStepTransitionAction(2),
					}),
				}),
				"step-2": createStepDefinition({
					stepNumber: 2,
					checklistLabel: "Waiting Step",
					decisionTree: {
						entryBranchId: "no-selected-action",
						branches: {
							"no-selected-action": {
								id: "no-selected-action",
								routes: [
									{
										id: "never-selected",
										trigger: { kind: "session_predicate", matches: () => false },
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "No Selected Action Project")
		expect((await runtime.resolveNextAction({ taskState })).kind).to.equal("execute_tool_backed_operation")

		const result = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: "ok",
			runtimeOwnedSourceRoute: undefined,
		})

		expect(result.kind).to.equal("project_prompt")
		if (result.kind !== "project_prompt") {
			throw new Error(`Expected project_prompt, received ${result.kind}.`)
		}
		const activeSession = getActiveWorkflowSession(taskState)
		expect(activeSession.activeStepNumber).to.equal(2)
		expect(activeSession.branchContext.activeBranchId).to.equal("no-selected-action")
		expect(result.promptProjection.workflowInputPayloadBlock).to.contain("Step 2: Waiting Step")
	})

	it("retries tool-backed operations only when the matched failure branch prescribes another execute_tool_backed_operation", async () => {
		const retryWorkflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						startAction: {
							kind: "execute_tool_backed_operation",
							instruction: createToolBackedActionInstruction({
								shouldSucceed: false,
							}),
						},
						failureAction: {
							kind: "execute_tool_backed_operation",
							instruction: createToolBackedActionInstruction({
								shouldSucceed: false,
							}),
						},
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})

		const retryState = new TaskState()
		await activateWorkflow(retryState, retryWorkflow)
		await runtime.resolveNextAction({ taskState: retryState })
		await submitNewProjectSelection(retryState, "Retry Project")
		expect((await runtime.resolveNextAction({ taskState: retryState })).kind).to.equal("execute_tool_backed_operation")

		const retryResult = await runtime.handleToolBackedOperationToolResult({
			taskState: retryState,
			toolResultText: "ok",
			runtimeOwnedSourceRoute: undefined,
		})

		expect(retryResult.kind).to.equal("execute_tool_backed_operation")
		expect(getActiveWorkflowSession(retryState).branchContext.failureState).to.deep.equal({
			retryAttemptCount: 1,
			terminalErrorMessage: "failure",
		})
	})

	it("executes explicit terminal-error failure branches without silently downgrading to project_prompt", async () => {
		const terminalFailureMessage = "Module-authored terminal failure."
		const terminalFailureWorkflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						startAction: {
							kind: "execute_tool_backed_operation",
							instruction: createToolBackedActionInstruction({
								shouldSucceed: false,
							}),
						},
						failureAction: { kind: "terminal_error", errorMessage: terminalFailureMessage },
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})

		const terminalFailureState = new TaskState()
		await activateWorkflow(terminalFailureState, terminalFailureWorkflow)
		await runtime.resolveNextAction({ taskState: terminalFailureState })
		await submitNewProjectSelection(terminalFailureState, "Terminal Failure Project")
		expect((await runtime.resolveNextAction({ taskState: terminalFailureState })).kind).to.equal(
			"execute_tool_backed_operation",
		)

		const terminalFailureResult = await runtime.handleToolBackedOperationToolResult({
			taskState: terminalFailureState,
			toolResultText: "ok",
			runtimeOwnedSourceRoute: undefined,
		})

		expect(terminalFailureResult).to.deep.equal({
			kind: "terminal_error",
			errorMessage: terminalFailureMessage,
		})
		expectWorkflowStateCleared(terminalFailureState)
	})

	it("fails closed with terminal_error when tool-backed operation failure has no matching failure branch", async () => {
		const unmatchedFailureWorkflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "run-step-resolution",
						branches: {
							"run-step-resolution": {
								id: "run-step-resolution",
								routes: [
									{
										id: "start-step-resolution",
										trigger: { kind: "always" },
										action: {
											kind: "execute_tool_backed_operation",
											instruction: createToolBackedActionInstruction({
												shouldSucceed: false,
											}),
										},
										followingBranchId: "await-step-resolution",
									},
								],
							},
							"await-step-resolution": {
								id: "await-step-resolution",
								routes: [
									{
										id: "step-resolution-succeeded",
										trigger: {
											kind: "event_predicate",
											matches: ({ triggerEvent }) =>
												triggerEvent.kind === "tool_backed_operation_succeeded" &&
												sourceRoutesEqual(triggerEvent.sourceRoute, STEP_RESOLUTION_SOURCE_ROUTE),
										},
										action: { kind: "project_prompt" },
										followingBranchId: "after-step-resolution-success",
									},
								],
							},
							"after-step-resolution-success": {
								id: "after-step-resolution-success",
								routes: [
									{
										id: "after-step-resolution-success-route",
										trigger: { kind: "always" },
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})

		const unmatchedFailureState = new TaskState()
		await activateWorkflow(unmatchedFailureState, unmatchedFailureWorkflow)
		await runtime.resolveNextAction({ taskState: unmatchedFailureState })
		await submitNewProjectSelection(unmatchedFailureState, "Unmatched Failure Project")
		expect((await runtime.resolveNextAction({ taskState: unmatchedFailureState })).kind).to.equal(
			"execute_tool_backed_operation",
		)

		const unmatchedFailureResult = await runtime.handleToolBackedOperationToolResult({
			taskState: unmatchedFailureState,
			toolResultText: "ok",
			runtimeOwnedSourceRoute: undefined,
		})

		expect(unmatchedFailureResult).to.deep.equal({
			kind: "terminal_error",
			errorMessage: "failure",
		})
		expectWorkflowStateCleared(unmatchedFailureState)
	})

	it("persists document build action failure context and re-evaluates the same failure branch", async () => {
		const outputFileKeys = createStandaloneArtifactOutputValueKeys("output_file")
		const documentBuildWorkflow = createWorkflowDefinition({
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputFileKeys),
			artifacts: {
				output_file: {
					id: "output_file",
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys: outputFileKeys,
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						startAction: {
							kind: "build_workflow_document",
							instruction: createDocumentBuildActionInstruction(),
						},
						failureAction: { kind: "no_op" },
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})

		const documentBuildFailureState = new TaskState()
		await activateWorkflow(documentBuildFailureState, documentBuildWorkflow)
		getActiveWorkflowSession(documentBuildFailureState).workflowValues[outputFileKeys.artifactAbsolutePath] = join(
			cwd,
			"docs",
			"projects",
			"builder-failure-project",
			"planning",
			"Epics.md",
		)
		await runtime.resolveNextAction({ taskState: documentBuildFailureState })
		const documentBuildFailureAction = await submitNewProjectSelection(documentBuildFailureState, "Builder Failure Project")
		expect(documentBuildFailureAction.kind).to.equal("execute_tool_backed_operation")
		if (documentBuildFailureAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${documentBuildFailureAction.kind}.`)
		}

		const failureResult = await runtime.handleToolBackedOperationToolResult({
			taskState: documentBuildFailureState,
			toolResultText: "Error: write failed",
			runtimeOwnedSourceRoute: documentBuildFailureAction.runtimeOwnedSourceRoute,
		})

		expect(failureResult.kind).to.equal("project_prompt")
		expect(getActiveWorkflowSession(documentBuildFailureState).branchContext.failureState).to.deep.equal({
			retryAttemptCount: 1,
			terminalErrorMessage: "Error: write failed",
		})
		expect(getActiveWorkflowSession(documentBuildFailureState).branchContext.activeBranchId).to.equal(
			"after-step-resolution-failure",
		)
	})

	it("gates workflow progress requests through branch context, re-validation, and explicit target steps", async () => {
		const progressWorkflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowProgressDecisionTree({
						approvedAction: createEntryBranchStepTransitionAction(3),
					}),
					toolSchema: createWorkflowProgressRequestToolSchema(),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
				"step-3": createStepDefinition({ stepNumber: 3, checklistLabel: "Step 3" }),
			},
		})

		await activateWorkflow(taskState, progressWorkflow)

		expect(runtime.isWorkflowProgressRequestAllowed({ taskState })).to.equal(false)

		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Allowed Progress Project")

		expect(runtime.isWorkflowProgressRequestAllowed({ taskState })).to.equal(true)
		expect((await runtime.buildTurnProjection({ taskState })).workflowToolSchemaOverride?.map((tool) => tool.id)).to.include(
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
		)
		expect(getActiveWorkflowSession(taskState).branchContext.activeBranchId).to.equal("await-progress-decision")

		const deniedProgress = await runtime.submitWorkflowProgressRequest({
			taskState,
			approved: false,
		})

		expect(deniedProgress.kind).to.equal("project_prompt")
		expect(getActiveWorkflowSession(taskState).branchContext.activeBranchId).to.equal("progress-denied")
		expect(runtime.isWorkflowProgressRequestAllowed({ taskState })).to.equal(false)

		const revalidationState = new TaskState()
		await activateWorkflow(revalidationState, progressWorkflow)
		await runtime.resolveNextAction({ taskState: revalidationState })
		await submitNewProjectSelection(revalidationState, "Revalidation Project")
		expect(runtime.isWorkflowProgressRequestAllowed({ taskState: revalidationState })).to.equal(true)

		const revalidationSession = getActiveWorkflowSession(revalidationState)
		revalidationSession.branchContext.activeBranchId = "progress-denied"

		const revalidatedProgress = await runtime.submitWorkflowProgressRequest({
			taskState: revalidationState,
			approved: true,
		})

		expect(revalidatedProgress).to.deep.equal({ kind: "no_op" })
		expect(revalidationSession.activeStepNumber).to.equal(1)

		const approvedState = new TaskState()
		await activateWorkflow(approvedState, progressWorkflow)
		await runtime.resolveNextAction({ taskState: approvedState })
		await submitNewProjectSelection(approvedState, "Approved Progress Project")

		const approvedSession = getActiveWorkflowSession(approvedState)
		approvedSession.ui.suppressedWorkflowFormIds = ["form-1"]
		approvedSession.ui.suppressedWorkflowStepResolutionRoutes = [STEP_RESOLUTION_SOURCE_ROUTE]

		const approvedProgress = await runtime.submitWorkflowProgressRequest({
			taskState: approvedState,
			approved: true,
		})

		expect(approvedProgress.kind).to.equal("project_prompt")
		expect(approvedSession.activeStepNumber).to.equal(3)
		expect(approvedSession.ui.suppressedWorkflowFormIds).to.deep.equal([])
		expect(approvedSession.ui.suppressedWorkflowStepResolutionRoutes).to.deep.equal([])
	})

	it("passes only documented decision inputs to session predicates", async () => {
		let observedInput: ObservedDecisionPredicateInput | undefined
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "session-predicate-entry",
						branches: {
							"session-predicate-entry": {
								id: "session-predicate-entry",
								routes: [
									{
										id: "session-predicate-route",
										trigger: {
											kind: "session_predicate",
											matches: (input) => {
												observedInput = {
													activeBranchId: input.activeBranchId,
													projectTitleValue:
														input.workflowValues[DEFAULT_ENTRY_PROJECT_VALUE_KEYS.projectTitle],
													stepNumber: input.step.stepNumber,
													keys: Object.keys(input).sort(),
													hasSession: Reflect.has(input, "session"),
													hasUi: Reflect.has(input, "ui"),
													hasBranchContext: Reflect.has(input, "branchContext"),
													hasSuppressedWorkflowFormIds: Reflect.has(input, "suppressedWorkflowFormIds"),
													hasSuppressedWorkflowStepResolutionRoutes: Reflect.has(
														input,
														"suppressedWorkflowStepResolutionRoutes",
													),
													hasTriggerEvent: Reflect.has(input, "triggerEvent"),
												}

												return true
											},
										},
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		const result = await submitNewProjectSelection(taskState, "Session Predicate Project")

		expect(result.kind).to.equal("project_prompt")
		expect(observedInput).to.deep.equal({
			activeBranchId: "session-predicate-entry",
			projectTitleValue: "Session Predicate Project",
			stepNumber: 1,
			keys: ["activeBranchId", "step", "workflowValues"],
			hasSession: false,
			hasUi: false,
			hasBranchContext: false,
			hasSuppressedWorkflowFormIds: false,
			hasSuppressedWorkflowStepResolutionRoutes: false,
			hasTriggerEvent: false,
		})
	})

	it("passes sanitized decision inputs and trigger events to event predicates", async () => {
		let observedInput: ObservedDecisionPredicateInput | undefined
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "event-predicate-entry",
						branches: {
							"event-predicate-entry": {
								id: "event-predicate-entry",
								routes: [
									{
										id: "event-predicate-route",
										trigger: {
											kind: "event_predicate",
											matches: (input) => {
												observedInput = {
													activeBranchId: input.activeBranchId,
													projectTitleValue:
														input.workflowValues[DEFAULT_ENTRY_PROJECT_VALUE_KEYS.projectTitle],
													stepNumber: input.step.stepNumber,
													keys: Object.keys(input).sort(),
													hasSession: Reflect.has(input, "session"),
													hasUi: Reflect.has(input, "ui"),
													hasBranchContext: Reflect.has(input, "branchContext"),
													hasSuppressedWorkflowFormIds: Reflect.has(input, "suppressedWorkflowFormIds"),
													hasSuppressedWorkflowStepResolutionRoutes: Reflect.has(
														input,
														"suppressedWorkflowStepResolutionRoutes",
													),
													hasTriggerEvent: Reflect.has(input, "triggerEvent"),
													triggerEventKind: input.triggerEvent.kind,
												}

												return input.triggerEvent.kind === "entry_artifact_resolution_completed"
											},
										},
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		const result = await submitNewProjectSelection(taskState, "Event Predicate Project")

		expect(result.kind).to.equal("project_prompt")
		expect(getActiveWorkflowSession(taskState).lifecycle.projectSelectionCompleted).to.equal(true)
		expect(observedInput).to.deep.equal({
			activeBranchId: "event-predicate-entry",
			projectTitleValue: "Event Predicate Project",
			stepNumber: 1,
			keys: ["activeBranchId", "step", "triggerEvent", "workflowValues"],
			hasSession: false,
			hasUi: false,
			hasBranchContext: false,
			hasSuppressedWorkflowFormIds: false,
			hasSuppressedWorkflowStepResolutionRoutes: false,
			hasTriggerEvent: true,
			triggerEventKind: "entry_artifact_resolution_completed",
		})
	})

	it("applies workflow value writes only for inventory keys without consulting generated tool schemas", async () => {
		const stepOne = createStepDefinition({ stepNumber: 1 })
		let buildToolSchemaCallCount = 0
		stepOne.buildToolSchema = () => {
			buildToolSchemaCallCount += 1
			return []
		}
		const writableWorkflow = createWorkflowDefinition({
			workflowValueKeys: ["alpha", "beta"],
			steps: {
				"step-1": stepOne,
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})
		await activateWorkflow(taskState, writableWorkflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Writable Project")
		buildToolSchemaCallCount = 0

		const attemptedValues: WorkflowValues = {
			alpha: "  one  ",
			gamma: "  no  ",
		}
		const firstWrite = await runtime.applyWorkflowValueWrites({
			taskState,
			values: attemptedValues,
		})
		const secondWrite = await runtime.applyWorkflowValueWrites({
			taskState,
			values: {
				alpha: "  one  ",
			},
		})

		expect(getActiveWorkflowSession(taskState).workflowValues).to.deep.include({ alpha: "  one  " })
		expect(firstWrite.changedValues).to.deep.equal({ alpha: "  one  " })
		expect(firstWrite.unchangedValues).to.deep.equal({ gamma: "  no  " })
		expect(secondWrite.changedValues).to.deep.equal({})
		expect(secondWrite.unchangedValues).to.deep.equal({ alpha: "  one  " })
		expect(buildToolSchemaCallCount).to.equal(0)

		const noOverrideState = new TaskState()
		const noOverrideWorkflow = createWorkflowDefinition()
		await activateWorkflow(noOverrideState, noOverrideWorkflow)
		await runtime.resolveNextAction({ taskState: noOverrideState })
		await submitNewProjectSelection(noOverrideState, "No Override Project")
		const noOverrideWrite = await runtime.applyWorkflowValueWrites({
			taskState: noOverrideState,
			values: {
				alpha: "  blocked  ",
			},
		})

		expect(noOverrideWrite.changedValues).to.deep.equal({})
		expect(noOverrideWrite.unchangedValues).to.deep.equal({ alpha: "  blocked  " })
		expect(getActiveWorkflowSession(noOverrideState).workflowValues).to.not.have.property("alpha")
	})

	it("clears allowed workflow values through the canonical workflow value write seam", async () => {
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["alpha", "beta", "absent"],
		})
		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Clearable Values Project")
		await runtime.applyWorkflowValueWrites({
			taskState,
			values: {
				alpha: "one",
				beta: "two",
			},
		})

		const clearResult = await runtime.applyWorkflowValueWrites({
			taskState,
			values: {},
			clearKeys: ["alpha", "absent", "gamma", "alpha"],
		})
		const replacementResult = await runtime.applyWorkflowValueWrites({
			taskState,
			values: {
				beta: "replacement",
			},
			clearKeys: ["beta"],
		})

		expect(getActiveWorkflowSession(taskState).workflowValues).to.deep.include({ beta: "replacement" })
		expect(getActiveWorkflowSession(taskState).workflowValues).to.not.have.property("alpha")
		expect(clearResult.changedValues).to.deep.equal({})
		expect(clearResult.unchangedValues).to.deep.equal({})
		expect(clearResult.clearedKeys).to.deep.equal(["alpha"])
		expect(clearResult.unchangedClearKeys).to.deep.equal(["absent", "gamma"])
		expect(replacementResult.changedValues).to.deep.equal({ beta: "replacement" })
		expect(replacementResult.clearedKeys).to.deep.equal([])
	})

	it("uses deterministic deep equality for typed workflow value writes", async () => {
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["typed_array", "typed_object"],
		})
		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Typed Writes Project")

		const initialValues: WorkflowValues = {
			typed_array: ["alpha", { nested: true }],
			typed_object: {
				outer: { count: 1 },
				order: ["first", "second"],
			},
		}
		const firstWrite = await runtime.applyWorkflowValueWrites({
			taskState,
			values: initialValues,
		})
		const unchangedWrite = await runtime.applyWorkflowValueWrites({
			taskState,
			values: {
				typed_array: ["alpha", { nested: true }],
				typed_object: {
					order: ["first", "second"],
					outer: { count: 1 },
				},
			},
		})
		const changedWrite = await runtime.applyWorkflowValueWrites({
			taskState,
			values: {
				typed_array: ["alpha", { nested: false }],
				typed_object: {
					outer: { count: 2 },
					order: ["first", "second"],
				},
			},
		})

		expect(firstWrite.changedValues).to.deep.equal(initialValues)
		expect(firstWrite.unchangedValues).to.deep.equal({})
		expect(unchangedWrite.changedValues).to.deep.equal({})
		expect(unchangedWrite.unchangedValues).to.deep.equal({
			typed_array: ["alpha", { nested: true }],
			typed_object: {
				order: ["first", "second"],
				outer: { count: 1 },
			},
		})
		expect(changedWrite.changedValues).to.deep.equal({
			typed_array: ["alpha", { nested: false }],
			typed_object: {
				outer: { count: 2 },
				order: ["first", "second"],
			},
		})
		expect(changedWrite.unchangedValues).to.deep.equal({})
		expect(getActiveWorkflowSession(taskState).workflowValues).to.deep.include(changedWrite.changedValues)
	})

	it("persists declared workflow-form value destinations before emitting a tool-backed operation request", async () => {
		const workflowFormId = "value-destination-form"
		const formCompletionSourceRoute: WorkflowStepResolutionSourceRoute = {
			branchId: "await-form-completion",
			routeId: "form-completed-event",
		}
		let capturedWorkflowValues: WorkflowValues | undefined
		const operationInstruction: WorkflowToolBackedActionInstruction = {
			toolName: ClineDefaultTool.GENERATE_EXPLANATION,
			buildStatusDefinition: () => ({
				title: "After Form",
				pendingLabel: "Pending",
				successLabel: "Success",
				failureLabel: "Failure",
			}),
			buildToolExecutionRequest: ({ activeWorkflowSession }) => {
				capturedWorkflowValues = { ...activeWorkflowSession.workflowValues }
				return {
					toolName: ClineDefaultTool.GENERATE_EXPLANATION,
					toolInput: {
						summary: activeWorkflowSession.workflowValues.summary,
					},
					toolParams: {},
				}
			},
			evaluateToolExecutionResult: () => ({ succeeded: true }),
		}
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["summary"],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Value Destination Form",
					toolDictionaryTitle: "Value Destination Tools",
					toolDictionaryMarkdown: "Value destination help",
					firstPanelId: "details",
					panels: {
						details: {
							panelId: "details",
							title: "Details",
							promptMarkdown: "Capture details.",
							fields: [
								{
									key: "summary_field",
									workflowValueKey: "summary",
									kind: "small_text",
									label: "Summary",
									required: true,
									allowedValueType: "string",
								},
							],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
						completionAction: {
							kind: "execute_tool_backed_operation",
							instruction: operationInstruction,
						},
					}),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Value Destination Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}

		const nextAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
				fields: [
					{
						key: "summary_field",
						value: { stringValue: "Captured summary" },
					},
				],
			}),
		})
		const activeSession = getActiveWorkflowSession(taskState)

		expect(nextAction.kind).to.equal("execute_tool_backed_operation")
		if (nextAction.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${nextAction.kind}.`)
		}
		expect(nextAction.toolBackedOperationSession?.sourceRoute).to.deep.equal(formCompletionSourceRoute)
		expect(nextAction.toolRequest.toolInput).to.deep.equal({ summary: "Captured summary" })
		expect(capturedWorkflowValues).to.deep.include({ summary: "Captured summary" })
		expect(activeSession.workflowValues).to.deep.include({ summary: "Captured summary" })
		expect(activeSession.ui.suppressedWorkflowFormIds).to.deep.equal([workflowFormId])
	})

	it("clears optional text workflow-form durable values before resolving the next workflow action", async () => {
		const workflowFormId = "clear-text-value-destination-form"
		let capturedWorkflowValues: WorkflowValues | undefined
		const operationInstruction: WorkflowToolBackedActionInstruction = {
			toolName: ClineDefaultTool.GENERATE_EXPLANATION,
			buildStatusDefinition: () => ({
				title: "After Clear",
				pendingLabel: "Pending",
				successLabel: "Success",
				failureLabel: "Failure",
			}),
			buildToolExecutionRequest: ({ activeWorkflowSession }) => {
				capturedWorkflowValues = { ...activeWorkflowSession.workflowValues }
				return {
					toolName: ClineDefaultTool.GENERATE_EXPLANATION,
					toolInput: {},
					toolParams: {},
				}
			},
			evaluateToolExecutionResult: () => ({ succeeded: true }),
		}
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["summary"],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Clear Text Value Destination Form",
					toolDictionaryTitle: "Clear Text Value Destination Tools",
					toolDictionaryMarkdown: "Clear text destination help",
					firstPanelId: "details",
					panels: {
						details: {
							panelId: "details",
							title: "Details",
							promptMarkdown: "Optionally capture details.",
							fields: [
								{
									key: "summary_field",
									workflowValueKey: "summary",
									kind: "small_text",
									label: "Summary",
									required: false,
									allowedValueType: "string",
								},
							],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
						completionAction: {
							kind: "execute_tool_backed_operation",
							instruction: operationInstruction,
						},
					}),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Clear Text Value Destination Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}
		getActiveWorkflowSession(taskState).workflowValues.summary = "Stale summary"

		const nextAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
				fields: [
					{
						key: "summary_field",
						value: { stringValue: "" },
					},
				],
			}),
		})

		expect(nextAction.kind).to.equal("execute_tool_backed_operation")
		expect(capturedWorkflowValues).to.not.equal(undefined)
		if (capturedWorkflowValues === undefined) {
			throw new Error("Expected workflow values to be captured.")
		}
		expect(capturedWorkflowValues).to.not.have.property("summary")
		expect(getActiveWorkflowSession(taskState).workflowValues).to.not.have.property("summary")
	})

	it("does not clear durable workflow values for omitted optional workflow-form fields without stale clear rules", async () => {
		const workflowFormId = "omitted-optional-value-destination-form"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["summary"],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Omitted Optional Value Destination Form",
					toolDictionaryTitle: "Omitted Optional Value Destination Tools",
					toolDictionaryMarkdown: "Omitted optional destination help",
					firstPanelId: "details",
					panels: {
						details: {
							panelId: "details",
							title: "Details",
							promptMarkdown: "Optionally capture details.",
							fields: [
								{
									key: "summary_field",
									workflowValueKey: "summary",
									kind: "small_text",
									label: "Summary",
									required: false,
									allowedValueType: "string",
								},
							],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Omitted Optional Value Destination Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}
		getActiveWorkflowSession(taskState).workflowValues.summary = "Retained summary"

		const nextAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
			}),
		})

		expect(nextAction.kind).to.equal("project_prompt")
		expect(getActiveWorkflowSession(taskState).workflowValues.summary).to.equal("Retained summary")
	})

	it("clears declared durable workflow values for workflow-form transition stale value keys", async () => {
		const workflowFormId = "transition-stale-clear-form"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["stale_summary"],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Transition Stale Clear Form",
					toolDictionaryTitle: "Transition Stale Clear Tools",
					toolDictionaryMarkdown: "Transition stale clear help",
					firstPanelId: "details",
					panels: {
						details: {
							panelId: "details",
							title: "Details",
							promptMarkdown: "Capture details.",
							fields: [
								{
									key: "source",
									kind: "small_text",
									label: "Source",
									required: true,
									allowedValueType: "string",
								},
								{
									key: "stale_summary_field",
									workflowValueKey: "stale_summary",
									kind: "small_text",
									label: "Stale Summary",
									required: false,
									allowedValueType: "string",
								},
							],
							allowedActions: ["submit"],
							transition: {
								type: "sequential",
								nextPanelId: "done",
								staleValueKeysToClear: ["stale_summary_field"],
							},
						},
						done: {
							panelId: "done",
							title: "Done",
							promptMarkdown: "Done.",
							fields: [],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Transition Stale Clear Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}
		getActiveWorkflowSession(taskState).workflowValues.stale_summary = "Old stale summary"

		const nextAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
				fields: [
					{
						key: "source",
						value: { stringValue: "new source" },
					},
				],
			}),
		})

		expect(nextAction.kind).to.equal("render_workflow_form")
		expect(getActiveWorkflowSession(taskState).workflowValues).to.not.have.property("stale_summary")
	})

	it("routes workflow-form durable clears through workflow_values_persisted changed keys", async () => {
		const workflowFormId = "clear-route-form"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["durable_choice"],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Clear Route Form",
					toolDictionaryTitle: "Clear Route Tools",
					toolDictionaryMarkdown: "Clear route help",
					firstPanelId: "choice",
					panels: {
						choice: {
							panelId: "choice",
							title: "Choice",
							promptMarkdown: "Optionally capture a choice.",
							fields: [
								{
									key: "choice_field",
									workflowValueKey: "durable_choice",
									kind: "small_text",
									label: "Choice",
									required: false,
									allowedValueType: "string",
								},
							],
							allowedActions: ["submit"],
							transition: { type: "sequential", nextPanelId: "confirm" },
						},
						confirm: {
							panelId: "confirm",
							title: "Confirm",
							promptMarkdown: "Confirm.",
							fields: [],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "show-form",
						branches: {
							"show-form": {
								id: "show-form",
								routes: [
									{
										id: "render-form",
										trigger: { kind: "always" },
										action: { kind: "render_workflow_form", workflowFormId },
										followingBranchId: "await-clear",
									},
								],
							},
							"await-clear": {
								id: "await-clear",
								routes: [
									{
										id: "durable-choice-cleared",
										trigger: {
											kind: "event_predicate",
											matches: ({ triggerEvent }) =>
												triggerEvent.kind === "workflow_values_persisted" &&
												triggerEvent.changedKeys.includes("durable_choice"),
										},
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Clear Route Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}
		getActiveWorkflowSession(taskState).workflowValues.durable_choice = "stale choice"

		const nextPanelAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
				fields: [
					{
						key: "choice_field",
						value: { stringValue: "" },
					},
				],
			}),
		})
		const triggerEvent = getActiveWorkflowSession(taskState).branchContext.lastTriggerEvent
		const routedAction = await runtime.resolveNextAction({ taskState })

		expect(nextPanelAction.kind).to.equal("render_workflow_form")
		expect(triggerEvent).to.deep.equal({
			kind: "workflow_values_persisted",
			changedKeys: ["durable_choice"],
		})
		expect(routedAction.kind).to.equal("project_prompt")
	})

	it("persists runtime-routed workflow-form values before emitting panel-submitted events", async () => {
		const workflowFormId = "runtime-routed-persistence-form"
		let observedDurableValue: unknown
		let observedSubmittedValueKeys: readonly string[] = []
		let observedClearedValueKeys: readonly string[] = []
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["durable_source"],
			workflowForms: {
				[workflowFormId]: createRuntimeRoutedWorkflowForm({
					sourceWorkflowValueKey: "durable_source",
				}),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "show-runtime-routed-form",
						branches: {
							"show-runtime-routed-form": {
								id: "show-runtime-routed-form",
								routes: [
									{
										id: "render-runtime-routed-form",
										trigger: { kind: "always" },
										action: { kind: "render_workflow_form", workflowFormId },
										followingBranchId: "await-runtime-routed-submit",
									},
								],
							},
							"await-runtime-routed-submit": {
								id: "await-runtime-routed-submit",
								routes: [
									{
										id: "panel-submitted",
										trigger: {
											kind: "event_predicate",
											matches: ({ triggerEvent, workflowValues }) => {
												if (triggerEvent.kind !== "workflow_form_panel_submitted") {
													return false
												}

												observedDurableValue = workflowValues.durable_source
												observedSubmittedValueKeys = triggerEvent.submittedValueKeys
												observedClearedValueKeys = triggerEvent.clearedValueKeys
												return (
													triggerEvent.workflowFormId === workflowFormId &&
													triggerEvent.panelId === "source" &&
													triggerEvent.action === "submit"
												)
											},
										},
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Runtime Routed Persistence Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}

		const nextAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
				fields: [
					{
						key: "source",
						value: { stringValue: "persisted source" },
					},
				],
			}),
		})

		expect(nextAction.kind).to.equal("project_prompt")
		expect(observedDurableValue).to.equal("persisted source")
		expect(observedSubmittedValueKeys).to.deep.equal(["source"])
		expect(observedClearedValueKeys).to.deep.equal([])
	})

	it("continues runtime-routed workflow forms in the same session with replacement panel data", async () => {
		const workflowFormId = "runtime-routed-continuation-form"
		const replacementPanel: WorkflowFormPanelDefinition = {
			panelId: "continued",
			title: "Replacement Continued",
			promptMarkdown: "Replacement prompt.",
			fields: [],
			allowedActions: ["submit"],
			transition: createTerminalTransition(),
		}
		const workflow = createWorkflowDefinition({
			workflowForms: {
				[workflowFormId]: createRuntimeRoutedWorkflowForm(),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createRuntimeRoutedDecisionTree({
						workflowFormId,
						buildReplacement: () => ({
							panel: replacementPanel,
							data: {
								replacementMode: "active",
							},
						}),
					}),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Runtime Routed Continuation Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}

		const continuedAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
				fields: [
					{
						key: "source",
						value: { stringValue: "continue" },
					},
				],
			}),
		})

		expect(continuedAction.kind).to.equal("continue_workflow_form")
		if (continuedAction.kind !== "continue_workflow_form") {
			throw new Error(`Expected continue_workflow_form, received ${continuedAction.kind}.`)
		}
		expect(continuedAction.formSession.sessionId).to.equal(renderFormAction.formSession.sessionId)
		expect(continuedAction.formSession.currentPanelId).to.equal("continued")
		expect(continuedAction.formSession.definitionPayload.panels.continued?.title).to.equal("Replacement Continued")
		expect(continuedAction.payload.panel?.title).to.equal("Replacement Continued")
		expect(continuedAction.formSession.data).to.deep.equal({
			replacementMode: "active",
		})
	})

	it("finalizes continued panels through interpolation and JSON-backed option resolution", async () => {
		const workflowFormId = "runtime-routed-json-options-form"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["continued_title", "selected_epic"],
			workflowForms: {
				[workflowFormId]: createRuntimeRoutedWorkflowForm({
					sourceWorkflowValueKey: "continued_title",
				}),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createRuntimeRoutedDecisionTree({
						workflowFormId,
						buildReplacement: () => ({
							panel: {
								panelId: "continued",
								title: "Continued {workflow.continued_title}",
								promptMarkdown: "Prompt {data.promptSuffix}",
								fields: [
									createEpicsJsonOptionsField({
										key: "epic",
										kind: "dropdown",
										workflowValueKey: "selected_epic",
									}),
								],
								allowedActions: ["submit"],
								transition: createTerminalTransition(),
							},
							data: {
								promptSuffix: "from replacement data",
							},
						}),
					}),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Runtime Routed JSON Options Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}
		await writeSingleEpicIndex(
			join(cwd, "docs", "projects", "runtime-routed-json-options-project", "planning", "Epics.index.json"),
			"7",
		)

		const continuedAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
				fields: [
					{
						key: "source",
						value: { stringValue: "Dynamic Title" },
					},
				],
			}),
		})

		expect(continuedAction.kind).to.equal("continue_workflow_form")
		if (continuedAction.kind !== "continue_workflow_form") {
			throw new Error(`Expected continue_workflow_form, received ${continuedAction.kind}.`)
		}
		expect(continuedAction.payload.panel?.title).to.equal("Continued Dynamic Title")
		expect(continuedAction.payload.panel?.promptMarkdown).to.equal("Prompt from replacement data")
		expect(continuedAction.payload.panel?.fields.find((field) => field.key === "epic")?.options).to.deep.equal([
			{
				value: "7",
				label: "Epic 7: Epic 7",
			},
		])
	})

	it("preserves continued-panel back targets and recomputes replacement payloads after resubmission", async () => {
		const workflowFormId = "runtime-routed-back-form"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["source_value"],
			workflowForms: {
				[workflowFormId]: createRuntimeRoutedWorkflowForm({
					sourceWorkflowValueKey: "source_value",
				}),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createRuntimeRoutedDecisionTree({
						workflowFormId,
						buildReplacement: (session) => ({
							panel: {
								panelId: "continued",
								title: "Continued",
								promptMarkdown: `Downstream ${String(session.workflowValues.source_value)}`,
								fields: [],
								allowedActions: ["submit", "back"],
								transition: createTerminalTransition(),
								backDestinationPanelId: "source",
							},
							data: {},
						}),
					}),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Runtime Routed Back Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}

		const firstContinuedAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: "source",
				fields: [
					{
						key: "source",
						value: { stringValue: "one" },
					},
				],
			}),
		})
		expect(firstContinuedAction.kind).to.equal("continue_workflow_form")
		if (firstContinuedAction.kind !== "continue_workflow_form") {
			throw new Error(`Expected continue_workflow_form, received ${firstContinuedAction.kind}.`)
		}
		expect(firstContinuedAction.payload.panel?.promptMarkdown).to.equal("Downstream one")
		expect(firstContinuedAction.formSession.definitionPayload.panels.continued?.backDestinationPanelId).to.equal("source")

		const backAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: firstContinuedAction.formSession.sessionId,
				panelId: "continued",
				action: WorkflowFormAction.BACK,
			}),
		})
		expect(backAction.kind).to.equal("render_workflow_form")
		if (backAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${backAction.kind}.`)
		}
		expect(backAction.formSession.currentPanelId).to.equal("source")

		const secondContinuedAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: backAction.formSession.sessionId,
				panelId: "source",
				fields: [
					{
						key: "source",
						value: { stringValue: "two" },
					},
				],
			}),
		})
		expect(secondContinuedAction.kind).to.equal("continue_workflow_form")
		if (secondContinuedAction.kind !== "continue_workflow_form") {
			throw new Error(`Expected continue_workflow_form, received ${secondContinuedAction.kind}.`)
		}
		expect(secondContinuedAction.formSession.sessionId).to.equal(renderFormAction.formSession.sessionId)
		expect(secondContinuedAction.payload.panel?.promptMarkdown).to.equal("Downstream two")
	})

	it("restores active continued form sessions with replacement panel data intact", async () => {
		const workflowFormId = "runtime-routed-restore-form"
		const workflow = createWorkflowDefinition({
			workflowForms: {
				[workflowFormId]: createRuntimeRoutedWorkflowForm(),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createRuntimeRoutedDecisionTree({
						workflowFormId,
						buildReplacement: () => ({
							panel: {
								panelId: "continued",
								title: "Persisted Replacement",
								promptMarkdown: "Persisted replacement prompt.",
								fields: [],
								allowedActions: ["submit"],
								transition: createTerminalTransition(),
							},
							data: {
								persistedLabel: "Persisted Data",
							},
						}),
					}),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Runtime Routed Restore Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}
		const continuedAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: "source",
				fields: [
					{
						key: "source",
						value: { stringValue: "restore" },
					},
				],
			}),
		})
		expect(continuedAction.kind).to.equal("continue_workflow_form")
		if (continuedAction.kind !== "continue_workflow_form") {
			throw new Error(`Expected continue_workflow_form, received ${continuedAction.kind}.`)
		}
		const persistedSession = runtime.getPersistedSession({ taskState })
		if (persistedSession === undefined || persistedSession.ui.formSession === undefined) {
			throw new Error("Expected a persisted continued form session.")
		}
		expect(persistedSession.ui.formSession.definitionPayload.panels.continued?.title).to.equal("Persisted Replacement")

		registerResolvedWorkflow(workflow)
		const restoredState = new TaskState()
		restoredState.activeWorkflowName = workflow.name
		const restored = await runtime.restorePersistedSession({
			taskState: restoredState,
			persistedSession,
		})

		expect(restored?.kind).to.equal("continue_workflow_form")
		if (restored?.kind !== "continue_workflow_form") {
			throw new Error(`Expected continue_workflow_form, received ${restored?.kind ?? "undefined"}.`)
		}
		expect(restored.formSession.sessionId).to.equal(renderFormAction.formSession.sessionId)
		expect(restored.formSession.definitionPayload.panels.continued?.title).to.equal("Persisted Replacement")
		expect(restored.formSession.data).to.deep.equal({
			persistedLabel: "Persisted Data",
		})
		expect(restored.payload.panel?.title).to.equal("Persisted Replacement")
	})

	it("restores active original form sessions before runtime continuation as render_workflow_form", async () => {
		const workflowFormId = "runtime-routed-original-restore-form"
		const workflow = createWorkflowDefinition({
			workflowForms: {
				[workflowFormId]: createRuntimeRoutedWorkflowForm(),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createRuntimeRoutedDecisionTree({
						workflowFormId,
						buildReplacement: () => ({
							panel: {
								panelId: "continued",
								title: "Persisted Replacement",
								promptMarkdown: "Persisted replacement prompt.",
								fields: [],
								allowedActions: ["submit"],
								transition: createTerminalTransition(),
							},
							data: {
								persistedLabel: "Persisted Data",
							},
						}),
					}),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Runtime Routed Original Restore Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}
		expect(renderFormAction.formSession.currentPanelId).to.equal("source")
		const persistedSession = runtime.getPersistedSession({ taskState })
		if (persistedSession === undefined || persistedSession.ui.formSession === undefined) {
			throw new Error("Expected a persisted original form session.")
		}
		expect(persistedSession.ui.formSession.currentPanelId).to.equal("source")

		registerResolvedWorkflow(workflow)
		const restoredState = new TaskState()
		restoredState.activeWorkflowName = workflow.name
		const restored = await runtime.restorePersistedSession({
			taskState: restoredState,
			persistedSession,
		})

		expect(restored?.kind).to.equal("render_workflow_form")
		if (restored?.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${restored?.kind ?? "undefined"}.`)
		}
		expect(restored.formSession.sessionId).to.equal(renderFormAction.formSession.sessionId)
		expect(restored.formSession.currentPanelId).to.equal("source")
		expect(restored.payload.panel?.panelId).to.equal("source")
	})

	it("rejects invalid continue_workflow_form actions before workflow activation", async () => {
		const workflowFormId = "runtime-routed-invalid-form"
		const workflow = createWorkflowDefinition({
			workflowForms: {
				[workflowFormId]: createRuntimeRoutedWorkflowForm(),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createRuntimeRoutedDecisionTree({
						workflowFormId,
						panelId: "missing-panel",
						buildReplacement: () => ({
							panel: {
								panelId: "missing-panel",
								title: "Missing",
								promptMarkdown: "Missing.",
								fields: [],
								allowedActions: ["submit"],
								transition: createTerminalTransition(),
							},
							data: {},
						}),
					}),
				}),
			},
		})

		registerResolvedWorkflow(workflow)
		const activation = await runtime.activateWorkflow({
			taskState,
			workflowName: workflow.name,
		})

		expect(activation.kind).to.equal("no_op")
		expect(taskState.activeWorkflowSession).to.equal(undefined)
	})

	it("persists typed workflow-form value destinations as JSON-safe workflow values", async () => {
		const workflowFormId = "typed-value-destination-form"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["durable_string", "durable_number", "durable_boolean", "durable_array", "durable_object"],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Typed Value Destination Form",
					toolDictionaryTitle: "Typed Value Destination Tools",
					toolDictionaryMarkdown: "Typed value destination help",
					firstPanelId: "details",
					panels: {
						details: {
							panelId: "details",
							title: "Details",
							promptMarkdown: "Capture typed details.",
							fields: [
								{
									key: "string_field",
									workflowValueKey: "durable_string",
									kind: "small_text",
									label: "String",
									required: true,
									allowedValueType: "string",
								},
								{
									key: "number_field",
									workflowValueKey: "durable_number",
									kind: "number",
									label: "Number",
									required: true,
									allowedValueType: "number",
								},
								{
									key: "boolean_field",
									workflowValueKey: "durable_boolean",
									kind: "boolean",
									label: "Boolean",
									required: true,
									allowedValueType: "boolean",
								},
								{
									key: "array_field",
									workflowValueKey: "durable_array",
									kind: "large_text",
									label: "Array",
									required: true,
									allowedValueType: "array",
								},
								{
									key: "object_field",
									workflowValueKey: "durable_object",
									kind: "large_text",
									label: "Object",
									required: true,
									allowedValueType: "object",
								},
							],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Typed Value Destination Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}

		const nextAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
				fields: [
					{ key: "string_field", value: { stringValue: "typed text" } },
					{ key: "number_field", value: { numberValue: 3.14 } },
					{ key: "boolean_field", value: { booleanValue: true } },
					{
						key: "array_field",
						value: {
							arrayValue: {
								values: [{ stringValue: "alpha" }, { integerValue: 2 }, { booleanValue: false }],
							},
						},
					},
					{
						key: "object_field",
						value: {
							objectValue: {
								entries: [
									{ key: "title", value: { stringValue: "Draft" } },
									{ key: "count", value: { integerValue: 7 } },
									{
										key: "nested",
										value: {
											arrayValue: {
												values: [{ stringValue: "one" }, { booleanValue: true }],
											},
										},
									},
								],
							},
						},
					},
				],
			}),
		})
		const activeSession = getActiveWorkflowSession(taskState)

		expect(nextAction.kind).to.equal("project_prompt")
		expect(activeSession.workflowValues.durable_string).to.equal("typed text")
		expect(activeSession.workflowValues.durable_number).to.equal(3.14)
		expect(activeSession.workflowValues.durable_boolean).to.equal(true)
		expect(activeSession.workflowValues.durable_array).to.deep.equal(["alpha", 2, false])
		expect(activeSession.workflowValues.durable_array).to.not.equal(JSON.stringify(["alpha", 2, false]))
		expect(activeSession.workflowValues.durable_object).to.deep.equal({
			title: "Draft",
			count: 7,
			nested: ["one", true],
		})
		expect(activeSession.workflowValues.durable_object).to.not.equal(
			JSON.stringify({
				title: "Draft",
				count: 7,
				nested: ["one", true],
			}),
		)
	})

	it("persists multi-panel workflow-form durable values only after their fields are submitted", async () => {
		const workflowFormId = "multi-panel-durable-values-form"
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["panel_one_value", "panel_two_value"],
			workflowForms: {
				[workflowFormId]: {
					definitionVersion: 2,
					title: "Multi-panel Durable Values Form",
					toolDictionaryTitle: "Multi-panel Durable Values Tools",
					toolDictionaryMarkdown: "Multi-panel durable value help",
					firstPanelId: "panel-1",
					panels: {
						"panel-1": {
							panelId: "panel-1",
							title: "Panel 1",
							promptMarkdown: "Capture the first durable value.",
							fields: [
								{
									key: "panel_one_field",
									workflowValueKey: "panel_one_value",
									kind: "small_text",
									label: "Panel One Value",
									required: true,
									allowedValueType: "string",
								},
							],
							allowedActions: ["submit"],
							transition: { type: "sequential", nextPanelId: "panel-2" },
						},
						"panel-2": {
							panelId: "panel-2",
							title: "Panel 2",
							promptMarkdown: "Capture the second durable value.",
							fields: [
								{
									key: "panel_two_field",
									workflowValueKey: "panel_two_value",
									kind: "small_text",
									label: "Panel Two Value",
									required: true,
									allowedValueType: "string",
								},
							],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const renderFormAction = await submitNewProjectSelection(taskState, "Multi-panel Durable Values Project")
		expect(renderFormAction.kind).to.equal("render_workflow_form")
		if (renderFormAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
		}

		const panelTwoAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: renderFormAction.formSession.sessionId,
				panelId: renderFormAction.formSession.currentPanelId,
				fields: [
					{
						key: "panel_one_field",
						value: { stringValue: "panel one durable" },
					},
				],
			}),
		})
		const activeSession = getActiveWorkflowSession(taskState)

		expect(panelTwoAction.kind).to.equal("render_workflow_form")
		if (panelTwoAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${panelTwoAction.kind}.`)
		}
		expect(panelTwoAction.formSession.currentPanelId).to.equal("panel-2")
		expect(activeSession.workflowValues.panel_one_value).to.equal("panel one durable")
		expect(activeSession.workflowValues).to.not.have.property("panel_two_value")

		const completedAction = await runtime.submitWorkflowForm({
			taskState,
			request: createFormSubmitRequest({
				sessionId: panelTwoAction.formSession.sessionId,
				panelId: panelTwoAction.formSession.currentPanelId,
				fields: [
					{
						key: "panel_two_field",
						value: { stringValue: "panel two durable" },
					},
				],
			}),
		})

		expect(completedAction.kind).to.equal("project_prompt")
		expect(activeSession.workflowValues.panel_one_value).to.equal("panel one durable")
		expect(activeSession.workflowValues.panel_two_value).to.equal("panel two durable")
	})

	it("fails explicitly when malformed workflow-form value destinations cannot be persisted", async () => {
		const createArrayValueWithMissingNestedEntry = () => {
			const values = [{ stringValue: "kept" }]
			Object.assign(values, { 1: undefined })
			return {
				arrayValue: {
					values,
				},
			}
		}
		const malformedCases: {
			name: string
			workflowValueKey: string
			fieldKind: "small_text" | "large_text"
			allowedValueType: "string" | "array" | "object"
			createSubmittedValue: () => WorkflowFormValue
			expectedMessage: string
		}[] = [
			{
				name: "top-level",
				workflowValueKey: "durable_top_level",
				fieldKind: "small_text",
				allowedValueType: "string",
				createSubmittedValue: () => ({}),
				expectedMessage: "Workflow form submission values must contain exactly one typed value.",
			},
			{
				name: "nested-array",
				workflowValueKey: "durable_array",
				fieldKind: "large_text",
				allowedValueType: "array",
				createSubmittedValue: createArrayValueWithMissingNestedEntry,
				expectedMessage: "Malformed workflow form submitted value: array entry is missing.",
			},
			{
				name: "nested-object-value",
				workflowValueKey: "durable_object_value",
				fieldKind: "large_text",
				allowedValueType: "object",
				createSubmittedValue: () => ({
					objectValue: {
						entries: [{ key: "missing_value", value: undefined }],
					},
				}),
				expectedMessage: "Malformed workflow form submitted value: object entry value is missing.",
			},
			{
				name: "nested-object-key",
				workflowValueKey: "durable_object_key",
				fieldKind: "large_text",
				allowedValueType: "object",
				createSubmittedValue: () => ({
					objectValue: {
						entries: [{ key: "   ", value: { stringValue: "invalid" } }],
					},
				}),
				expectedMessage: "Malformed workflow form submitted value: object entry key is empty.",
			},
		]

		for (const malformedCase of malformedCases) {
			const caseTaskState = new TaskState()
			const fieldKey = `${malformedCase.name}_field`
			const workflowFormId = `${malformedCase.name}-malformed-value-destination-form`
			const workflow = createWorkflowDefinition({
				name: `${malformedCase.name}-malformed-value-destination-workflow`,
				workflowValueKeys: [malformedCase.workflowValueKey],
				workflowForms: {
					[workflowFormId]: {
						definitionVersion: 2,
						title: "Malformed Value Destination Form",
						toolDictionaryTitle: "Malformed Value Destination Tools",
						toolDictionaryMarkdown: "Malformed value destination help",
						firstPanelId: "details",
						panels: {
							details: {
								panelId: "details",
								title: "Details",
								promptMarkdown: "Capture malformed details.",
								fields: [
									{
										key: fieldKey,
										workflowValueKey: malformedCase.workflowValueKey,
										kind: malformedCase.fieldKind,
										label: "Value",
										required: true,
										allowedValueType: malformedCase.allowedValueType,
									},
								],
								allowedActions: ["submit"],
								transition: createTerminalTransition(),
							},
						},
					},
				},
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createWorkflowFormDecisionTree({ workflowFormId }),
					}),
				},
			})

			await activateWorkflow(caseTaskState, workflow)
			await runtime.resolveNextAction({ taskState: caseTaskState })
			const renderFormAction = await submitNewProjectSelection(
				caseTaskState,
				`${malformedCase.name} Malformed Value Destination Project`,
			)
			expect(renderFormAction.kind).to.equal("render_workflow_form")
			if (renderFormAction.kind !== "render_workflow_form") {
				throw new Error(`Expected render_workflow_form, received ${renderFormAction.kind}.`)
			}

			let capturedError: unknown
			try {
				await runtime.submitWorkflowForm({
					taskState: caseTaskState,
					request: {
						metadata: undefined,
						sessionId: renderFormAction.formSession.sessionId,
						panelId: renderFormAction.formSession.currentPanelId,
						action: WorkflowFormAction.SUBMIT,
						fields: [
							{
								key: fieldKey,
								value: malformedCase.createSubmittedValue(),
							},
						],
					},
				})
			} catch (error) {
				capturedError = error
			}

			expect(capturedError).to.be.instanceOf(Error)
			if (!(capturedError instanceof Error)) {
				throw new Error("Expected malformed workflow-form persistence to throw.")
			}
			expect(capturedError.message).to.equal(malformedCase.expectedMessage)
			expect(getActiveWorkflowSession(caseTaskState).workflowValues).to.not.have.property(malformedCase.workflowValueKey)
		}
	})

	it("rejects non-string workflow values required for artifact identity and destination resolution", async () => {
		const parentIdentityKey = "selected_epic_identity"
		const storyKeys = createParentedArtifactOutputValueKeys("identity_guard_story")
		const identityWorkflow = createWorkflowDefinition({
			name: "non-string-artifact-identity-workflow",
			workflowValueKeys: [parentIdentityKey, ...collectArtifactOutputWorkflowValueKeys(storyKeys)],
			artifacts: {
				story_doc: {
					id: "story_doc",
					family: WorkflowArtifactFamily.Story,
					intentMode: "new",
					parentIdentitySource: {
						kind: "workflow_value",
						key: parentIdentityKey,
					},
					targetIdentitySource: undefined,
					outputValueKeys: storyKeys,
				},
			},
		})
		const identityState = new TaskState()
		await activateWorkflow(identityState, identityWorkflow)
		await runtime.resolveNextAction({ taskState: identityState })
		await submitNewProjectSelection(identityState, "Identity Guard Project")
		getActiveWorkflowSession(identityState).workflowValues[parentIdentityKey] = { nested: "not a string" }

		let identityError: unknown
		try {
			await runtime.prepareWorkflowArtifactCreation({
				taskState: identityState,
				artifactId: "story_doc",
			})
		} catch (error) {
			identityError = error
		}

		expect(identityError).to.be.instanceOf(Error)
		if (!(identityError instanceof Error)) {
			throw new Error("Expected artifact identity resolution to reject a non-string workflow value.")
		}
		expect(identityError.message).to.equal(
			`Workflow value ${parentIdentityKey} must be a non-empty string for artifact identity resolution for workflow artifact story_doc.`,
		)

		const outputFileKeys = createStandaloneArtifactOutputValueKeys("destination_guard_file")
		const destinationWorkflow = createWorkflowDefinition({
			name: "non-string-artifact-destination-workflow",
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputFileKeys),
			artifacts: {
				output_file: {
					id: "output_file",
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys: outputFileKeys,
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						startAction: {
							kind: "build_workflow_document",
							instruction: createDocumentBuildActionInstruction(),
						},
					}),
				}),
			},
		})
		const destinationState = new TaskState()
		await activateWorkflow(destinationState, destinationWorkflow)
		getActiveWorkflowSession(destinationState).workflowValues[outputFileKeys.artifactAbsolutePath] = ["not", "a path"]
		await runtime.resolveNextAction({ taskState: destinationState })

		let destinationError: unknown
		try {
			await submitNewProjectSelection(destinationState, "Destination Guard Project")
		} catch (error) {
			destinationError = error
		}

		expect(destinationError).to.be.instanceOf(Error)
		if (!(destinationError instanceof Error)) {
			throw new Error("Expected artifact destination resolution to reject a non-string workflow value.")
		}
		expect(destinationError.message).to.equal(
			`Workflow value ${outputFileKeys.artifactAbsolutePath} must be a non-empty string for artifact destination resolution for workflow document build route run-step-resolution/start-step-resolution.`,
		)
	})

	it("routes changed workflow value writes through workflow_values_persisted on_event branches", async () => {
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["alpha"],
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowValuesPersistedDecisionTree(),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})
		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Workflow Values Project")

		const writeResult = await runtime.applyWorkflowValueWrites({
			taskState,
			values: {
				alpha: " ready ",
			},
		})
		const activeSession = getActiveWorkflowSession(taskState)

		expect(writeResult.changedValues).to.deep.equal({ alpha: " ready " })
		expect(writeResult.unchangedValues).to.deep.equal({})
		expect(activeSession.branchContext.lastTriggerEvent).to.deep.equal({
			kind: "workflow_values_persisted",
			changedKeys: ["alpha"],
		})

		const nextAction = await runtime.resolveNextAction({ taskState })

		expect(nextAction.kind).to.equal("project_prompt")
		expect(activeSession.branchContext.lastTriggerEvent).to.equal(undefined)
	})

	it("does not record workflow_values_persisted when the active branch has no matching route", async () => {
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["alpha"],
		})
		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "No Workflow Values Route Project")

		const activeSession = getActiveWorkflowSession(taskState)
		activeSession.branchContext.lastTriggerEvent = {
			kind: "workflow_progress_request_denied",
		}

		const writeResult = await runtime.applyWorkflowValueWrites({
			taskState,
			values: {
				alpha: " persisted ",
			},
		})

		expect(writeResult.changedValues).to.deep.equal({ alpha: " persisted " })
		expect(writeResult.unchangedValues).to.deep.equal({})
		expect(activeSession.branchContext.lastTriggerEvent).to.deep.equal({
			kind: "workflow_progress_request_denied",
		})
	})

	it("runs deterministic procedures through workflow values and continues without a tool-backed operation", async () => {
		const procedureRun = sandbox.stub().callsFake((session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult => {
			expect(session.workflowValues.deterministic_value).to.equal(undefined)
			return {
				kind: "succeeded",
				workflowValueWrites: {
					deterministic_value: "persisted",
				},
			}
		})
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["deterministic_value"],
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "run-procedure",
						branches: {
							"run-procedure": {
								id: "run-procedure",
								routes: [
									{
										id: "select-value",
										trigger: { kind: "always" },
										action: {
											kind: "run_deterministic_procedure",
											instruction: {
												run: procedureRun,
											},
										},
										followingBranchId: "after-procedure",
									},
								],
							},
							"after-procedure": {
								id: "after-procedure",
								routes: [
									{
										id: "continue-after-write",
										trigger: { kind: "on_event", eventKind: "workflow_values_persisted" },
										action: { kind: "project_prompt" },
									},
								],
							},
						},
					},
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const nextAction = await submitNewProjectSelection(taskState, "Deterministic Procedure Project")

		expect(nextAction.kind).to.equal("project_prompt")
		expect(nextAction.kind).not.to.equal("execute_tool_backed_operation")
		sinon.assert.calledOnce(procedureRun)
		expect(getActiveWorkflowSession(taskState).workflowValues.deterministic_value).to.equal("persisted")
		expect(getActiveWorkflowSession(taskState).branchContext.activeBranchId).to.equal("after-procedure")
	})

	it("routes failed deterministic procedures through terminal_error without a tool-backed operation", async () => {
		const failureMessage = "Deterministic procedure failed."
		const procedureRun = sandbox.stub().callsFake((_session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult => {
			return {
				kind: "failed",
				errorMessage: failureMessage,
			}
		})
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: {
						entryBranchId: "run-procedure",
						branches: {
							"run-procedure": {
								id: "run-procedure",
								routes: [
									{
										id: "fail-procedure",
										trigger: { kind: "always" },
										action: {
											kind: "run_deterministic_procedure",
											instruction: {
												run: procedureRun,
											},
										},
									},
								],
							},
						},
					},
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		const nextAction = await submitNewProjectSelection(taskState, "Failed Procedure Project")

		expect(nextAction.kind).to.equal("terminal_error")
		expect(nextAction.kind).not.to.equal("execute_tool_backed_operation")
		if (nextAction.kind !== "terminal_error") {
			throw new Error(`Expected terminal_error, received ${nextAction.kind}.`)
		}
		expect(nextAction.errorMessage).to.equal(failureMessage)
		sinon.assert.calledOnce(procedureRun)
		expectWorkflowStateCleared(taskState)
	})

	it("blocks artifact creation before creating a denied artifact parent directory", async () => {
		const projectFolderName = "artifact-parent-policy-project"
		const artifactParentDirectory = join(cwd, "docs", "projects", projectFolderName, "planning")
		runtime = new WorkflowRuntime({
			cwd,
			workspacePathPolicy: {
				validateAccess: (filePath) => filePath !== artifactParentDirectory,
			},
		})
		const { workflow, artifactId } = createEpicsArtifactWorkflow({ outputValuePrefix: "parent_policy_epics" })

		await activateWorkflow(taskState, workflow)
		const session = getActiveWorkflowSession(taskState)
		session.projectSelection = {
			projectMode: "new",
			projectTitle: "Artifact Parent Policy Project",
			projectFolderName,
		}

		let capturedError: unknown
		try {
			await runtime.createWorkflowArtifact({
				taskState,
				artifactId,
				expectedArtifactAbsolutePath: undefined,
			})
		} catch (error) {
			capturedError = error
		}

		expect(capturedError).to.be.instanceOf(Error)
		if (!(capturedError instanceof Error)) {
			throw new Error("Expected artifact parent-directory policy denial to throw.")
		}
		expect(capturedError.message).to.equal(
			`Workflow runtime path is blocked by workspace path policy: ${artifactParentDirectory}`,
		)
		expect(await pathExists(artifactParentDirectory)).to.equal(false)
	})

	it("blocks artifact creation before writing a denied artifact file path", async () => {
		const projectFolderName = "artifact-file-policy-project"
		const artifactAbsolutePath = join(cwd, "docs", "projects", projectFolderName, "planning", "Epics.md")
		runtime = new WorkflowRuntime({
			cwd,
			workspacePathPolicy: {
				validateAccess: (filePath) => filePath !== artifactAbsolutePath,
			},
		})
		const { workflow, artifactId } = createEpicsArtifactWorkflow({ outputValuePrefix: "file_policy_epics" })

		await activateWorkflow(taskState, workflow)
		const session = getActiveWorkflowSession(taskState)
		session.projectSelection = {
			projectMode: "new",
			projectTitle: "Artifact File Policy Project",
			projectFolderName,
		}

		let capturedError: unknown
		try {
			await runtime.createWorkflowArtifact({
				taskState,
				artifactId,
				expectedArtifactAbsolutePath: undefined,
			})
		} catch (error) {
			capturedError = error
		}

		expect(capturedError).to.be.instanceOf(Error)
		if (!(capturedError instanceof Error)) {
			throw new Error("Expected artifact file-path policy denial to throw.")
		}
		expect(capturedError.message).to.equal(
			`Workflow runtime path is blocked by workspace path policy: ${artifactAbsolutePath}`,
		)
		expect(await pathExists(artifactAbsolutePath)).to.equal(false)
	})

	it("passes constructor workspace path policy into artifact discovery", async () => {
		const projectFolderName = "artifact-discovery-policy-project"
		const deliverySpecKeys = createStandaloneArtifactOutputValueKeys("discovery_policy_delivery_spec")
		const workflow = createWorkflowDefinition({
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(deliverySpecKeys),
			artifacts: {
				delivery_spec_doc: {
					id: "delivery_spec_doc",
					family: WorkflowArtifactFamily.EpicDeliverySpec,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys: deliverySpecKeys,
				},
			},
		})

		await activateWorkflow(taskState, workflow)
		const session = getActiveWorkflowSession(taskState)
		session.projectSelection = {
			projectMode: "new",
			projectTitle: "Artifact Discovery Policy Project",
			projectFolderName,
		}
		const planningFolder = join(cwd, "docs", "projects", projectFolderName, "planning")
		await mkdir(planningFolder, { recursive: true })
		await writeFile(
			join(planningFolder, "Epics.index.json"),
			'{"version":1,"epics":[{"identity":"1","title":"One","story-index-generated":false}]}',
			"utf8",
		)

		await runtime.prepareWorkflowArtifactCreation({
			taskState,
			artifactId: "delivery_spec_doc",
		})

		const artifactDiscoveryRequest = discoverWorkflowCandidatesStub
			.getCalls()
			.map((call) => call.args[0])
			.find(
				(request: WorkflowDiscoveryRequest) =>
					request.rootDirectory === join(cwd, "docs", "projects") &&
					request.entryType === "file" &&
					request.targetPathSegments?.[0] === projectFolderName,
			)
		expect(artifactDiscoveryRequest).to.not.equal(undefined)
		if (artifactDiscoveryRequest === undefined) {
			throw new Error("Expected artifact discovery to run.")
		}
		expect(artifactDiscoveryRequest.workspacePathPolicy).to.equal(workspacePathPolicy)
	})

	it("allocates and creates canonical workflow artifacts with persisted output values", async () => {
		discoverWorkflowCandidatesStub.restore()
		const epicsKeys = createStandaloneArtifactOutputValueKeys("epics")
		const epicsIndexKeys = createStandaloneArtifactOutputValueKeys("epics_index")
		const deliverySpecKeys = createStandaloneArtifactOutputValueKeys("epic_delivery_spec")
		const storyKeys = createParentedArtifactOutputValueKeys("story")
		const remediationStoryKeys = createParentedArtifactOutputValueKeys("remediation_story")
		const blindReviewKeys = createTargetedArtifactOutputValueKeys("blind_review")
		const edgeCaseReviewKeys = createTargetedArtifactOutputValueKeys("edge_case_review")
		const adversarialReviewKeys = createTargetedArtifactOutputValueKeys("adversarial_review")
		const reviewInputMarkdownKeys = createTargetedArtifactOutputValueKeys("review_input_markdown")
		const reviewInputDiffKeys = createTargetedArtifactOutputValueKeys("review_input_diff")
		const workflow = createWorkflowDefinition({
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(
				epicsKeys,
				epicsIndexKeys,
				deliverySpecKeys,
				storyKeys,
				remediationStoryKeys,
				blindReviewKeys,
				edgeCaseReviewKeys,
				adversarialReviewKeys,
				reviewInputMarkdownKeys,
				reviewInputDiffKeys,
			),
			artifacts: {
				epics_doc: {
					id: "epics_doc",
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys: epicsKeys,
				},
				epics_index_doc: {
					id: "epics_index_doc",
					family: WorkflowArtifactFamily.EpicsIndex,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys: epicsIndexKeys,
				},
				epic_delivery_spec_doc: {
					id: "epic_delivery_spec_doc",
					family: WorkflowArtifactFamily.EpicDeliverySpec,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys: deliverySpecKeys,
				},
				story_doc: {
					id: "story_doc",
					family: WorkflowArtifactFamily.Story,
					intentMode: "new",
					parentIdentitySource: {
						kind: "workflow_value",
						key: deliverySpecKeys.artifactIdentity,
					},
					targetIdentitySource: undefined,
					outputValueKeys: storyKeys,
				},
				remediation_story_doc: {
					id: "remediation_story_doc",
					family: WorkflowArtifactFamily.RemediationStory,
					intentMode: "new",
					parentIdentitySource: {
						kind: "workflow_value",
						key: storyKeys.artifactIdentity,
					},
					targetIdentitySource: undefined,
					outputValueKeys: remediationStoryKeys,
				},
				blind_review_doc: {
					id: "blind_review_doc",
					family: WorkflowArtifactFamily.ReviewBlindHunter,
					intentMode: "derived",
					parentIdentitySource: undefined,
					targetIdentitySource: {
						kind: "workflow_value",
						key: remediationStoryKeys.artifactIdentity,
					},
					outputValueKeys: blindReviewKeys,
				},
				edge_case_review_doc: {
					id: "edge_case_review_doc",
					family: WorkflowArtifactFamily.ReviewEdgeCaseHunter,
					intentMode: "derived",
					parentIdentitySource: undefined,
					targetIdentitySource: {
						kind: "workflow_value",
						key: remediationStoryKeys.artifactIdentity,
					},
					outputValueKeys: edgeCaseReviewKeys,
				},
				adversarial_review_doc: {
					id: "adversarial_review_doc",
					family: WorkflowArtifactFamily.AdversarialReview,
					intentMode: "derived",
					parentIdentitySource: undefined,
					targetIdentitySource: {
						kind: "workflow_value",
						key: remediationStoryKeys.artifactIdentity,
					},
					outputValueKeys: adversarialReviewKeys,
				},
				review_input_markdown_doc: {
					id: "review_input_markdown_doc",
					family: WorkflowArtifactFamily.ReviewInputMarkdown,
					intentMode: "derived",
					parentIdentitySource: undefined,
					targetIdentitySource: {
						kind: "workflow_value",
						key: remediationStoryKeys.artifactIdentity,
					},
					outputValueKeys: reviewInputMarkdownKeys,
				},
				review_input_diff_doc: {
					id: "review_input_diff_doc",
					family: WorkflowArtifactFamily.ReviewInputDiff,
					intentMode: "derived",
					parentIdentitySource: undefined,
					targetIdentitySource: {
						kind: "workflow_value",
						key: remediationStoryKeys.artifactIdentity,
					},
					outputValueKeys: reviewInputDiffKeys,
				},
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Artifact Allocation Project")

		const epicsResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "epics_doc",
			expectedArtifactAbsolutePath: undefined,
		})
		const epicsIndexResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "epics_index_doc",
			expectedArtifactAbsolutePath: undefined,
		})
		await writeFile(
			epicsIndexResult.artifactAbsolutePath,
			JSON.stringify({
				version: 1,
				epics: [{ identity: "1", title: "Foundation", "story-index-generated": false }],
			}),
			"utf8",
		)
		const deliverySpecResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "epic_delivery_spec_doc",
			expectedArtifactAbsolutePath: undefined,
		})
		const storyResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "story_doc",
			expectedArtifactAbsolutePath: undefined,
		})
		const remediationStoryResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "remediation_story_doc",
			expectedArtifactAbsolutePath: undefined,
		})
		const reviewResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "blind_review_doc",
			expectedArtifactAbsolutePath: undefined,
		})
		const edgeCaseReviewResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "edge_case_review_doc",
			expectedArtifactAbsolutePath: undefined,
		})
		const adversarialReviewResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "adversarial_review_doc",
			expectedArtifactAbsolutePath: undefined,
		})
		const reviewInputMarkdownResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "review_input_markdown_doc",
			expectedArtifactAbsolutePath: undefined,
		})
		const reviewInputDiffResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "review_input_diff_doc",
			expectedArtifactAbsolutePath: undefined,
		})

		expect(epicsResult).to.deep.include({
			artifactIdentity: "epics",
			artifactFilename: "Epics.md",
			artifactRelativePath: join("planning", "Epics.md"),
			artifactAbsolutePath: join(cwd, "docs", "projects", "artifact-allocation-project", "planning", "Epics.md"),
			parentIdentity: undefined,
			targetIdentity: undefined,
		})
		expect(epicsIndexResult).to.deep.include({
			artifactIdentity: "epics_index",
			artifactFilename: "Epics.index.json",
			artifactRelativePath: join("planning", "Epics.index.json"),
			artifactAbsolutePath: join(cwd, "docs", "projects", "artifact-allocation-project", "planning", "Epics.index.json"),
			parentIdentity: undefined,
			targetIdentity: undefined,
		})
		expect(deliverySpecResult).to.deep.include({
			artifactIdentity: "1",
			artifactFilename: "Epic-1-delivery-spec.md",
			artifactRelativePath: join("planning", "Epic-1-delivery-spec.md"),
			artifactAbsolutePath: join(
				cwd,
				"docs",
				"projects",
				"artifact-allocation-project",
				"planning",
				"Epic-1-delivery-spec.md",
			),
			parentIdentity: undefined,
			targetIdentity: undefined,
		})
		expect(storyResult).to.deep.include({
			artifactIdentity: "1.1",
			artifactFilename: "Story-1-1.md",
			artifactRelativePath: join("planning", "Story-1-1.md"),
			artifactAbsolutePath: join(cwd, "docs", "projects", "artifact-allocation-project", "planning", "Story-1-1.md"),
			parentIdentity: "1",
			targetIdentity: undefined,
		})
		expect(remediationStoryResult).to.deep.include({
			artifactIdentity: "1.1.1",
			artifactFilename: "Remediation-story-1-1-1.md",
			artifactRelativePath: join("planning", "Remediation-story-1-1-1.md"),
			artifactAbsolutePath: join(
				cwd,
				"docs",
				"projects",
				"artifact-allocation-project",
				"planning",
				"Remediation-story-1-1-1.md",
			),
			parentIdentity: "1.1",
			targetIdentity: undefined,
		})
		expect(reviewResult).to.deep.include({
			artifactIdentity: "1.1.1",
			artifactFilename: "Review-blind-hunter-1-1-1.md",
			artifactRelativePath: join("planning", "Review-blind-hunter-1-1-1.md"),
			artifactAbsolutePath: join(
				cwd,
				"docs",
				"projects",
				"artifact-allocation-project",
				"planning",
				"Review-blind-hunter-1-1-1.md",
			),
			parentIdentity: undefined,
			targetIdentity: "1.1.1",
		})
		expect(edgeCaseReviewResult).to.deep.include({
			artifactIdentity: "1.1.1",
			artifactFilename: "Review-edge-case-hunter-1-1-1.md",
			artifactRelativePath: join("planning", "Review-edge-case-hunter-1-1-1.md"),
			artifactAbsolutePath: join(
				cwd,
				"docs",
				"projects",
				"artifact-allocation-project",
				"planning",
				"Review-edge-case-hunter-1-1-1.md",
			),
			parentIdentity: undefined,
			targetIdentity: "1.1.1",
		})
		expect(adversarialReviewResult).to.deep.include({
			artifactIdentity: "1.1.1",
			artifactFilename: "Adversarial-review-1-1-1.md",
			artifactRelativePath: join("planning", "Adversarial-review-1-1-1.md"),
			artifactAbsolutePath: join(
				cwd,
				"docs",
				"projects",
				"artifact-allocation-project",
				"planning",
				"Adversarial-review-1-1-1.md",
			),
			parentIdentity: undefined,
			targetIdentity: "1.1.1",
		})
		expect(reviewInputMarkdownResult).to.deep.include({
			artifactIdentity: "1.1.1",
			artifactFilename: "Review-input-1-1-1.md",
			artifactRelativePath: join("planning", "Review-input-1-1-1.md"),
			artifactAbsolutePath: join(
				cwd,
				"docs",
				"projects",
				"artifact-allocation-project",
				"planning",
				"Review-input-1-1-1.md",
			),
			parentIdentity: undefined,
			targetIdentity: "1.1.1",
		})
		expect(reviewInputDiffResult).to.deep.include({
			artifactIdentity: "1.1.1",
			artifactFilename: "Review-input-1-1-1.diff",
			artifactRelativePath: join("planning", "Review-input-1-1-1.diff"),
			artifactAbsolutePath: join(
				cwd,
				"docs",
				"projects",
				"artifact-allocation-project",
				"planning",
				"Review-input-1-1-1.diff",
			),
			parentIdentity: undefined,
			targetIdentity: "1.1.1",
		})

		await access(epicsResult.artifactAbsolutePath)
		await access(epicsIndexResult.artifactAbsolutePath)
		await access(deliverySpecResult.artifactAbsolutePath)
		await access(storyResult.artifactAbsolutePath)
		await access(remediationStoryResult.artifactAbsolutePath)
		await access(reviewResult.artifactAbsolutePath)
		await access(edgeCaseReviewResult.artifactAbsolutePath)
		await access(adversarialReviewResult.artifactAbsolutePath)
		await access(reviewInputMarkdownResult.artifactAbsolutePath)
		await access(reviewInputDiffResult.artifactAbsolutePath)
		expect(await readFile(epicsResult.artifactAbsolutePath, "utf8")).to.equal("")
		expect(await readFile(deliverySpecResult.artifactAbsolutePath, "utf8")).to.equal("")
		expect(await readFile(reviewInputDiffResult.artifactAbsolutePath, "utf8")).to.equal("")

		expect(getActiveWorkflowSession(taskState).workflowValues).to.deep.include({
			[epicsKeys.projectTitle]: "Artifact Allocation Project",
			[epicsKeys.projectFolderName]: "artifact-allocation-project",
			[epicsKeys.artifactFamily]: WorkflowArtifactFamily.Epics,
			[epicsKeys.artifactIdentity]: "epics",
			[epicsKeys.artifactFilename]: "Epics.md",
			[epicsKeys.artifactRelativePath]: join("planning", "Epics.md"),
			[epicsKeys.artifactAbsolutePath]: join(
				cwd,
				"docs",
				"projects",
				"artifact-allocation-project",
				"planning",
				"Epics.md",
			),
			[epicsIndexKeys.artifactFamily]: WorkflowArtifactFamily.EpicsIndex,
			[epicsIndexKeys.artifactIdentity]: "epics_index",
			[epicsIndexKeys.artifactFilename]: "Epics.index.json",
			[epicsIndexKeys.artifactRelativePath]: join("planning", "Epics.index.json"),
			[epicsIndexKeys.artifactAbsolutePath]: join(
				cwd,
				"docs",
				"projects",
				"artifact-allocation-project",
				"planning",
				"Epics.index.json",
			),
			[deliverySpecKeys.artifactFamily]: WorkflowArtifactFamily.EpicDeliverySpec,
			[deliverySpecKeys.artifactIdentity]: "1",
			[deliverySpecKeys.artifactFilename]: "Epic-1-delivery-spec.md",
			[deliverySpecKeys.artifactRelativePath]: join("planning", "Epic-1-delivery-spec.md"),
			[deliverySpecKeys.artifactAbsolutePath]: join(
				cwd,
				"docs",
				"projects",
				"artifact-allocation-project",
				"planning",
				"Epic-1-delivery-spec.md",
			),
			[storyKeys.artifactIdentity]: "1.1",
			[storyKeys.parentIdentity]: "1",
			[remediationStoryKeys.artifactIdentity]: "1.1.1",
			[remediationStoryKeys.parentIdentity]: "1.1",
			[blindReviewKeys.artifactIdentity]: "1.1.1",
			[blindReviewKeys.targetIdentity]: "1.1.1",
			[blindReviewKeys.artifactFilename]: "Review-blind-hunter-1-1-1.md",
			[edgeCaseReviewKeys.artifactFilename]: "Review-edge-case-hunter-1-1-1.md",
			[adversarialReviewKeys.artifactFilename]: "Adversarial-review-1-1-1.md",
			[reviewInputMarkdownKeys.artifactFilename]: "Review-input-1-1-1.md",
			[reviewInputDiffKeys.artifactFilename]: "Review-input-1-1-1.diff",
		})
	})

	it("allocates the brainstorming singleton artifact in discovery and maps its absolute path to output_file", async () => {
		discoverWorkflowCandidatesStub.restore()
		const brainstormingKeys = {
			...createStandaloneArtifactOutputValueKeys("brainstorming"),
			artifactAbsolutePath: "output_file",
		}
		const workflow = createWorkflowDefinition({
			projectSubfolder: "discovery",
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(brainstormingKeys),
			artifacts: {
				brainstorming_session: {
					id: "brainstorming_session",
					family: WorkflowArtifactFamily.BrainstormingSession,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys: brainstormingKeys,
				},
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Brainstorming Artifact Project")

		const result = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "brainstorming_session",
			expectedArtifactAbsolutePath: undefined,
		})
		const artifactAbsolutePath = join(
			cwd,
			"docs",
			"projects",
			"brainstorming-artifact-project",
			"discovery",
			"brainstorming.md",
		)

		expect(result).to.deep.include({
			artifactIdentity: "brainstorming_session",
			artifactFilename: "brainstorming.md",
			artifactRelativePath: join("discovery", "brainstorming.md"),
			artifactAbsolutePath,
			parentIdentity: undefined,
			targetIdentity: undefined,
		})
		expect(getActiveWorkflowSession(taskState).workflowValues).to.deep.include({
			[brainstormingKeys.artifactFamily]: WorkflowArtifactFamily.BrainstormingSession,
			[brainstormingKeys.artifactIdentity]: "brainstorming_session",
			[brainstormingKeys.artifactFilename]: "brainstorming.md",
			output_file: artifactAbsolutePath,
		})
		await access(artifactAbsolutePath)
	})

	it("allocates the architecture singleton artifact in planning and maps its absolute path to output_file", async () => {
		discoverWorkflowCandidatesStub.restore()
		const architectureKeys = {
			...createStandaloneArtifactOutputValueKeys("architecture"),
			artifactAbsolutePath: "output_file",
		}
		const workflow = createWorkflowDefinition({
			projectSubfolder: "planning",
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(architectureKeys),
			artifacts: {
				architecture_document: {
					id: "architecture_document",
					family: WorkflowArtifactFamily.ArchitectureDocument,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys: architectureKeys,
				},
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Architecture Artifact Project")

		const result = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "architecture_document",
			expectedArtifactAbsolutePath: undefined,
		})
		const artifactAbsolutePath = join(cwd, "docs", "projects", "architecture-artifact-project", "planning", "architecture.md")

		expect(result).to.deep.include({
			artifactIdentity: "architecture_document",
			artifactFilename: "architecture.md",
			artifactRelativePath: join("planning", "architecture.md"),
			artifactAbsolutePath,
			parentIdentity: undefined,
			targetIdentity: undefined,
		})
		expect(getActiveWorkflowSession(taskState).workflowValues).to.deep.include({
			[architectureKeys.artifactFamily]: WorkflowArtifactFamily.ArchitectureDocument,
			[architectureKeys.artifactIdentity]: "architecture_document",
			[architectureKeys.artifactFilename]: "architecture.md",
			output_file: artifactAbsolutePath,
		})
		await access(artifactAbsolutePath)
	})

	it("derives epic delivery specs from Epics.index.json and skips existing delivery specs", async () => {
		discoverWorkflowCandidatesStub.restore()
		const deliverySpecKeys = createStandaloneArtifactOutputValueKeys("delivery_spec")
		const workflow = createWorkflowDefinition({
			workflowValueKeys: collectArtifactOutputWorkflowValueKeys(deliverySpecKeys),
			artifacts: {
				delivery_spec_doc: {
					id: "delivery_spec_doc",
					family: WorkflowArtifactFamily.EpicDeliverySpec,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys: deliverySpecKeys,
				},
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Convention Numbering Project")

		const planningFolder = join(cwd, "docs", "projects", "convention-numbering-project", "planning")
		await writeFile(join(planningFolder, "Epics.md"), "# Epic 1 from markdown only\n", "utf8")
		await writeFile(
			join(planningFolder, "Epics.index.json"),
			JSON.stringify({
				version: 1,
				epics: [
					{ identity: "2", title: "Indexed Two", "story-index-generated": true },
					{ identity: "10", title: "Indexed Ten", "story-index-generated": false },
				],
			}),
			"utf8",
		)
		await writeFile(join(planningFolder, "Epic-2-delivery-spec.md"), "existing", "utf8")
		await writeFile(join(planningFolder, "Epic-999-draft.md"), "ignored", "utf8")
		await writeFile(join(planningFolder, "Epic-1.md"), "retired", "utf8")
		await writeFile(join(planningFolder, "Story-9-9.md"), "ignored", "utf8")

		const deliverySpecResult = await runtime.createWorkflowArtifact({
			taskState,
			artifactId: "delivery_spec_doc",
			expectedArtifactAbsolutePath: undefined,
		})

		expect(deliverySpecResult.artifactIdentity).to.equal("10")
		expect(deliverySpecResult.artifactFilename).to.equal("Epic-10-delivery-spec.md")
		expect(deliverySpecResult.artifactAbsolutePath).to.equal(join(planningFolder, "Epic-10-delivery-spec.md"))
		await access(join(planningFolder, "Epic-10-delivery-spec.md"))
	})

	it("validates story allocation against existing epic delivery specs", async () => {
		discoverWorkflowCandidatesStub.restore()
		const parentIdentityKey = "selected_epic_identity"
		const storyKeys = createParentedArtifactOutputValueKeys("story_parent_validation")
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [parentIdentityKey, ...collectArtifactOutputWorkflowValueKeys(storyKeys)],
			artifacts: {
				story_doc: {
					id: "story_doc",
					family: WorkflowArtifactFamily.Story,
					intentMode: "new",
					parentIdentitySource: {
						kind: "workflow_value",
						key: parentIdentityKey,
					},
					targetIdentitySource: undefined,
					outputValueKeys: storyKeys,
				},
			},
		})

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Story Parent Validation Project")
		const planningFolder = join(cwd, "docs", "projects", "story-parent-validation-project", "planning")
		await writeFile(
			join(planningFolder, "Epics.index.json"),
			'{"version":1,"epics":[{"identity":"1","title":"One","story-index-generated":false}]}',
			"utf8",
		)
		await writeFile(join(planningFolder, "Epic-1.md"), "retired", "utf8")
		getActiveWorkflowSession(taskState).workflowValues[parentIdentityKey] = "1"

		let missingDeliverySpecError: unknown
		try {
			await runtime.prepareWorkflowArtifactCreation({
				taskState,
				artifactId: "story_doc",
			})
		} catch (error) {
			missingDeliverySpecError = error
		}

		expect(missingDeliverySpecError).to.be.instanceOf(Error)
		if (!(missingDeliverySpecError instanceof Error)) {
			throw new Error("Expected story allocation without a delivery spec to throw.")
		}
		expect(missingDeliverySpecError.message).to.equal(
			"Cannot allocate workflow artifact story_doc because required artifact identity 1 was not found in the selected project.",
		)
		expect(await pathExists(join(planningFolder, "Story-1-1.md"))).to.equal(false)

		await writeFile(join(planningFolder, "Epic-1-delivery-spec.md"), "delivery spec", "utf8")
		const storyResult = await runtime.prepareWorkflowArtifactCreation({
			taskState,
			artifactId: "story_doc",
		})

		expect(storyResult).to.deep.include({
			artifactIdentity: "1.1",
			artifactFilename: "Story-1-1.md",
			parentIdentity: "1",
		})
	})

	it("plans primary story artifacts with canonical identities, filenames, and generated flags", async () => {
		const workflow = createWorkflowDefinition()
		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Story Artifact Planning Project")

		const preparation = await runtime.preparePlanStoryArtifacts({ taskState, epicIdentity: "3" })
		await writeEpicsIndex(preparation.epicsIndexAbsolutePath, [
			{ identity: "1", title: "Unselected One", storyIndexGenerated: false },
			{ identity: "3", title: "Selected Three", storyIndexGenerated: false },
			{ identity: "4", title: "Unselected Four", storyIndexGenerated: true },
		])
		const result = await runtime.planStoryArtifacts({
			taskState,
			epicIdentity: "3",
			storyCount: 3,
			expectedStoryIndexAbsolutePath: preparation.storyIndexAbsolutePath,
			expectedEpicsIndexAbsolutePath: preparation.epicsIndexAbsolutePath,
		})

		expect(result.appendedStoryIdentities).to.deep.equal(["3.1", "3.2", "3.3"])
		expect(result.storyIndex.stories).to.deep.equal([
			{
				story_identity: "3.1",
				story_file_name: "Story-3-1.md",
				story_type: "primary",
				parent_story_identity: null,
				story_file_generated: false,
				status: "draft",
			},
			{
				story_identity: "3.2",
				story_file_name: "Story-3-2.md",
				story_type: "primary",
				parent_story_identity: null,
				story_file_generated: false,
				status: "draft",
			},
			{
				story_identity: "3.3",
				story_file_name: "Story-3-3.md",
				story_type: "primary",
				parent_story_identity: null,
				story_file_generated: false,
				status: "draft",
			},
		])
		expect(parseWorkflowStoryIndexJson(await readFile(preparation.storyIndexAbsolutePath, "utf8"))).to.deep.equal(
			result.storyIndex,
		)
		const updatedEpicsIndex: unknown = JSON.parse(await readFile(preparation.epicsIndexAbsolutePath, "utf8"))
		expect(updatedEpicsIndex).to.deep.equal({
			version: 1,
			epics: [
				{ identity: "1", title: "Unselected One", "story-index-generated": false },
				{ identity: "3", title: "Selected Three", "story-index-generated": true },
				{ identity: "4", title: "Unselected Four", "story-index-generated": true },
			],
		})
	})

	it("fails primary story artifact planning when the requested epic is absent from Epics.index.json", async () => {
		const workflow = createWorkflowDefinition()
		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Missing Story Planning Epic Project")

		const preparation = await runtime.preparePlanStoryArtifacts({ taskState, epicIdentity: "5" })
		await writeEpicsIndex(preparation.epicsIndexAbsolutePath, [
			{ identity: "4", title: "Different Epic", storyIndexGenerated: false },
		])

		let planningError: unknown
		try {
			await runtime.planStoryArtifacts({
				taskState,
				epicIdentity: "5",
				storyCount: 1,
				expectedStoryIndexAbsolutePath: preparation.storyIndexAbsolutePath,
				expectedEpicsIndexAbsolutePath: preparation.epicsIndexAbsolutePath,
			})
		} catch (error) {
			planningError = error
		}

		expect(planningError).to.be.instanceOf(Error)
		if (!(planningError instanceof Error)) {
			throw new Error("Expected missing indexed epic story planning to throw.")
		}
		expect(planningError.message).to.equal(
			"Cannot plan story artifacts because epic_identity 5 is not present in Epics.index.json.",
		)
		expect(await pathExists(preparation.storyIndexAbsolutePath)).to.equal(false)
	})

	it("preserves existing story index entries and appends only missing primary entries", async () => {
		const workflow = createWorkflowDefinition()
		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Story Artifact Expansion Project")

		const preparation = await runtime.preparePlanStoryArtifacts({ taskState, epicIdentity: "7" })
		await writeSingleEpicIndex(preparation.epicsIndexAbsolutePath, "7")
		await runtime.planStoryArtifacts({
			taskState,
			epicIdentity: "7",
			storyCount: 1,
			expectedStoryIndexAbsolutePath: preparation.storyIndexAbsolutePath,
			expectedEpicsIndexAbsolutePath: preparation.epicsIndexAbsolutePath,
		})
		const existingIndex = parseWorkflowStoryIndexJson(await readFile(preparation.storyIndexAbsolutePath, "utf8"))
		existingIndex.stories[0].story_file_generated = true
		existingIndex.stories[0].status = "backlog"
		await writeFile(preparation.storyIndexAbsolutePath, stringifyWorkflowStoryIndex(existingIndex), "utf8")

		const expandedResult = await runtime.planStoryArtifacts({
			taskState,
			epicIdentity: "7",
			storyCount: 3,
			expectedStoryIndexAbsolutePath: preparation.storyIndexAbsolutePath,
			expectedEpicsIndexAbsolutePath: preparation.epicsIndexAbsolutePath,
		})

		expect(expandedResult.appendedStoryIdentities).to.deep.equal(["7.2", "7.3"])
		expect(expandedResult.storyIndex.stories[0]).to.deep.equal({
			story_identity: "7.1",
			story_file_name: "Story-7-1.md",
			story_type: "primary",
			parent_story_identity: null,
			story_file_generated: true,
			status: "backlog",
		})
		expect(expandedResult.storyIndex.stories.map((story) => story.story_identity)).to.deep.equal(["7.1", "7.2", "7.3"])
	})

	it("plans remediation story artifacts under an existing target story", async () => {
		const workflow = createWorkflowDefinition()
		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Remediation Story Planning Project")

		const storyPreparation = await runtime.preparePlanStoryArtifacts({ taskState, epicIdentity: "8" })
		await writeSingleEpicIndex(storyPreparation.epicsIndexAbsolutePath, "8")
		await runtime.planStoryArtifacts({
			taskState,
			epicIdentity: "8",
			storyCount: 1,
			expectedStoryIndexAbsolutePath: storyPreparation.storyIndexAbsolutePath,
			expectedEpicsIndexAbsolutePath: storyPreparation.epicsIndexAbsolutePath,
		})
		const remediationPreparation = await runtime.preparePlanRemediationStoryArtifact({ taskState, epicIdentity: "8" })

		const firstResult = await runtime.planRemediationStoryArtifact({
			taskState,
			epicIdentity: "8",
			targetStoryIdentity: "8.1",
			expectedStoryIndexAbsolutePath: remediationPreparation.storyIndexAbsolutePath,
		})
		const secondResult = await runtime.planRemediationStoryArtifact({
			taskState,
			epicIdentity: "8",
			targetStoryIdentity: "8.1",
			expectedStoryIndexAbsolutePath: remediationPreparation.storyIndexAbsolutePath,
		})

		expect(firstResult.appendedStoryIdentity).to.equal("8.1.1")
		expect(secondResult.appendedStoryIdentity).to.equal("8.1.2")
		expect(secondResult.storyIndex.stories.slice(1).map((story) => story.story_identity)).to.deep.equal(["8.1.1", "8.1.2"])
	})

	it("fails remediation story planning when the target story is absent", async () => {
		const workflow = createWorkflowDefinition()
		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Missing Remediation Target Project")

		const storyPreparation = await runtime.preparePlanStoryArtifacts({ taskState, epicIdentity: "9" })
		await writeSingleEpicIndex(storyPreparation.epicsIndexAbsolutePath, "9")
		await runtime.planStoryArtifacts({
			taskState,
			epicIdentity: "9",
			storyCount: 1,
			expectedStoryIndexAbsolutePath: storyPreparation.storyIndexAbsolutePath,
			expectedEpicsIndexAbsolutePath: storyPreparation.epicsIndexAbsolutePath,
		})

		let planningError: unknown
		try {
			await runtime.planRemediationStoryArtifact({
				taskState,
				epicIdentity: "9",
				targetStoryIdentity: "9.2",
				expectedStoryIndexAbsolutePath: storyPreparation.storyIndexAbsolutePath,
			})
		} catch (error) {
			planningError = error
		}

		expect(planningError).to.be.instanceOf(Error)
		if (!(planningError instanceof Error)) {
			throw new Error("Expected missing target story planning to throw.")
		}
		expect(planningError.message).to.equal("Target story identity 9.2 was not found in the selected epic story index.")
	})

	it("generates missing draft story files with the runtime story template content", async () => {
		const expectedStoryFileContent = buildWorkflowStoryFileTemplate()
		const workflow = createWorkflowDefinition()
		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Draft Story Generation Project")

		const storyPreparation = await runtime.preparePlanStoryArtifacts({ taskState, epicIdentity: "10" })
		await writeSingleEpicIndex(storyPreparation.epicsIndexAbsolutePath, "10")
		await runtime.planStoryArtifacts({
			taskState,
			epicIdentity: "10",
			storyCount: 2,
			expectedStoryIndexAbsolutePath: storyPreparation.storyIndexAbsolutePath,
			expectedEpicsIndexAbsolutePath: storyPreparation.epicsIndexAbsolutePath,
		})
		const generationPreparation = await runtime.prepareGenerateStoryFiles({ taskState, epicIdentity: "10" })

		expect(await pathExists(join(cwd, ".cline", "skills", "bmad-create-story", "template.md"))).to.equal(false)

		const result = await runtime.generateStoryFiles({
			taskState,
			epicIdentity: "10",
			expectedStoryIndexAbsolutePath: generationPreparation.storyIndexAbsolutePath,
			expectedDraftStoryFileAbsolutePaths: generationPreparation.draftStoryFileAbsolutePaths,
		})

		expect(result.createdDraftStoryFileAbsolutePaths).to.deep.equal(generationPreparation.draftStoryFileAbsolutePaths)
		for (const draftStoryFileAbsolutePath of generationPreparation.draftStoryFileAbsolutePaths) {
			expect(await readFile(draftStoryFileAbsolutePath, "utf8")).to.equal(expectedStoryFileContent)
		}
		expect(result.storyIndex.stories.every((story) => story.story_file_generated === true)).to.equal(true)
	})

	it("does not overwrite existing draft story files and marks them generated", async () => {
		const workflow = createWorkflowDefinition()
		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Existing Draft Story Project")

		const storyPreparation = await runtime.preparePlanStoryArtifacts({ taskState, epicIdentity: "11" })
		await writeSingleEpicIndex(storyPreparation.epicsIndexAbsolutePath, "11")
		await runtime.planStoryArtifacts({
			taskState,
			epicIdentity: "11",
			storyCount: 1,
			expectedStoryIndexAbsolutePath: storyPreparation.storyIndexAbsolutePath,
			expectedEpicsIndexAbsolutePath: storyPreparation.epicsIndexAbsolutePath,
		})
		const generationPreparation = await runtime.prepareGenerateStoryFiles({ taskState, epicIdentity: "11" })
		const existingDraftStoryFilePath = generationPreparation.draftStoryFileAbsolutePaths[0]
		await mkdir(dirname(existingDraftStoryFilePath), { recursive: true })
		await writeFile(existingDraftStoryFilePath, "existing story content", "utf8")

		const result = await runtime.generateStoryFiles({
			taskState,
			epicIdentity: "11",
			expectedStoryIndexAbsolutePath: generationPreparation.storyIndexAbsolutePath,
			expectedDraftStoryFileAbsolutePaths: generationPreparation.draftStoryFileAbsolutePaths,
		})

		expect(result.createdDraftStoryFileAbsolutePaths).to.deep.equal([])
		expect(result.existingDraftStoryFileAbsolutePaths).to.deep.equal([existingDraftStoryFilePath])
		expect(await readFile(existingDraftStoryFilePath, "utf8")).to.equal("existing story content")
		expect(
			parseWorkflowStoryIndexJson(await readFile(storyPreparation.storyIndexAbsolutePath, "utf8")).stories[0],
		).to.deep.include({
			story_identity: "11.1",
			story_file_generated: true,
		})
	})

	it("fails epic delivery spec allocation for missing, malformed, or path-policy-denied Epics.index.json", async () => {
		discoverWorkflowCandidatesStub.restore()

		async function createDeliverySpecCase(args: {
			projectTitle: string
			indexText?: string
			workspacePathPolicy?: WorkflowWorkspacePathPolicy
		}): Promise<{ state: TaskState; planningFolder: string; epicsIndexPath: string; deliverySpecPath: string }> {
			runtime = new WorkflowRuntime({
				cwd,
				workspacePathPolicy: args.workspacePathPolicy ?? createAllowAllWorkspacePathPolicy(),
			})
			const state = new TaskState()
			const deliverySpecKeys = createStandaloneArtifactOutputValueKeys(
				args.projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
			)
			const workflow = createWorkflowDefinition({
				name: `${deliverySpecKeys.artifactIdentity}_workflow`,
				workflowValueKeys: collectArtifactOutputWorkflowValueKeys(deliverySpecKeys),
				artifacts: {
					delivery_spec_doc: {
						id: "delivery_spec_doc",
						family: WorkflowArtifactFamily.EpicDeliverySpec,
						intentMode: "new",
						parentIdentitySource: undefined,
						targetIdentitySource: undefined,
						outputValueKeys: deliverySpecKeys,
					},
				},
			})

			await activateWorkflow(state, workflow)
			await runtime.resolveNextAction({ taskState: state })
			await submitNewProjectSelection(state, args.projectTitle)
			const planningFolder = join(
				cwd,
				"docs",
				"projects",
				getActiveWorkflowSession(state).projectSelection.projectFolderName,
				"planning",
			)
			const epicsIndexPath = join(planningFolder, "Epics.index.json")
			const deliverySpecPath = join(planningFolder, "Epic-1-delivery-spec.md")
			await writeFile(join(planningFolder, "Epics.md"), "# Epic 1 from markdown only\n", "utf8")
			if (args.indexText !== undefined) {
				await writeFile(epicsIndexPath, args.indexText, "utf8")
			}

			return { state, planningFolder, epicsIndexPath, deliverySpecPath }
		}

		const missingCase = await createDeliverySpecCase({ projectTitle: "Missing Index Project" })
		let missingError: unknown
		try {
			await runtime.createWorkflowArtifact({
				taskState: missingCase.state,
				artifactId: "delivery_spec_doc",
				expectedArtifactAbsolutePath: undefined,
			})
		} catch (error) {
			missingError = error
		}
		expect(missingError).to.be.instanceOf(Error)
		if (!(missingError instanceof Error)) {
			throw new Error("Expected missing Epics.index.json to throw.")
		}
		expect(missingError.message).to.contain("Epics.index.json could not be read")
		expect(await pathExists(missingCase.deliverySpecPath)).to.equal(false)

		const malformedCase = await createDeliverySpecCase({
			projectTitle: "Malformed Index Project",
			indexText: "{",
		})
		let malformedError: unknown
		try {
			await runtime.createWorkflowArtifact({
				taskState: malformedCase.state,
				artifactId: "delivery_spec_doc",
				expectedArtifactAbsolutePath: undefined,
			})
		} catch (error) {
			malformedError = error
		}
		expect(malformedError).to.be.instanceOf(Error)
		if (!(malformedError instanceof Error)) {
			throw new Error("Expected malformed Epics.index.json to throw.")
		}
		expect(malformedError.message).to.contain("Epics.index.json is malformed JSON")
		expect(await pathExists(malformedCase.deliverySpecPath)).to.equal(false)

		const invalidStoryIndexFlagCase = await createDeliverySpecCase({
			projectTitle: "Invalid Story Index Flag Project",
			indexText: JSON.stringify({
				version: 1,
				epics: [{ identity: "1", title: "One", "story-index-generated": "false" }],
			}),
		})
		let invalidStoryIndexFlagError: unknown
		try {
			await runtime.createWorkflowArtifact({
				taskState: invalidStoryIndexFlagCase.state,
				artifactId: "delivery_spec_doc",
				expectedArtifactAbsolutePath: undefined,
			})
		} catch (error) {
			invalidStoryIndexFlagError = error
		}
		expect(invalidStoryIndexFlagError).to.be.instanceOf(Error)
		if (!(invalidStoryIndexFlagError instanceof Error)) {
			throw new Error("Expected invalid Epics.index.json story index flag to throw.")
		}
		expect(invalidStoryIndexFlagError.message).to.equal(
			"Cannot allocate workflow artifact delivery_spec_doc because Epics.index.json epics[0].story-index-generated must be a boolean.",
		)
		expect(await pathExists(invalidStoryIndexFlagCase.deliverySpecPath)).to.equal(false)

		const retiredEpicsIndexKey = ["epic", "delivery", "spec", "generated"].join("-")
		const retiredEpicsIndexKeyCase = await createDeliverySpecCase({
			projectTitle: "Retired Index Key Project",
			indexText: JSON.stringify({
				version: 1,
				epics: [{ identity: "1", title: "One", [retiredEpicsIndexKey]: false }],
			}),
		})
		let retiredEpicsIndexKeyError: unknown
		try {
			await runtime.createWorkflowArtifact({
				taskState: retiredEpicsIndexKeyCase.state,
				artifactId: "delivery_spec_doc",
				expectedArtifactAbsolutePath: undefined,
			})
		} catch (error) {
			retiredEpicsIndexKeyError = error
		}
		expect(retiredEpicsIndexKeyError).to.be.instanceOf(Error)
		if (!(retiredEpicsIndexKeyError instanceof Error)) {
			throw new Error("Expected retired Epics.index.json key to throw.")
		}
		expect(retiredEpicsIndexKeyError.message).to.equal(
			`Cannot allocate workflow artifact delivery_spec_doc because Epics.index.json epics[0] contains unsupported key ${retiredEpicsIndexKey}.`,
		)
		expect(await pathExists(retiredEpicsIndexKeyCase.deliverySpecPath)).to.equal(false)

		const deniedProjectFolderName = "denied-index-project"
		const deniedIndexPath = join(cwd, "docs", "projects", deniedProjectFolderName, "planning", "Epics.index.json")
		const deniedCase = await createDeliverySpecCase({
			projectTitle: "Denied Index Project",
			indexText: '{"version":1,"epics":[{"identity":"1","title":"One","story-index-generated":false}]}',
			workspacePathPolicy: {
				validateAccess: (filePath) => filePath !== deniedIndexPath,
			},
		})
		let deniedError: unknown
		try {
			await runtime.createWorkflowArtifact({
				taskState: deniedCase.state,
				artifactId: "delivery_spec_doc",
				expectedArtifactAbsolutePath: undefined,
			})
		} catch (error) {
			deniedError = error
		}
		expect(deniedError).to.be.instanceOf(Error)
		if (!(deniedError instanceof Error)) {
			throw new Error("Expected path-policy-denied Epics.index.json to throw.")
		}
		expect(deniedError.message).to.equal(`Workflow runtime path is blocked by workspace path policy: ${deniedIndexPath}`)
		expect(await pathExists(deniedCase.deliverySpecPath)).to.equal(false)
	})

	it("routes missing parent or target artifact identities through tool-backed operation failure handling", async () => {
		const missingIdentityCases = [
			{
				artifactId: "story_doc",
				sourceKey: "selected_epic_identity",
				sourceValue: "99",
				outputKeys: createParentedArtifactOutputValueKeys("story"),
				artifactDefinition: {
					id: "story_doc",
					family: WorkflowArtifactFamily.Story,
					intentMode: "new",
					parentIdentitySource: {
						kind: "workflow_value",
						key: "selected_epic_identity",
					},
					targetIdentitySource: undefined,
					outputValueKeys: createParentedArtifactOutputValueKeys("story"),
				} satisfies NonNullable<WorkflowDefinition["artifacts"]>[string],
			},
			{
				artifactId: "review_doc",
				sourceKey: "selected_review_target",
				sourceValue: "1.1",
				outputKeys: createTargetedArtifactOutputValueKeys("review"),
				artifactDefinition: {
					id: "review_doc",
					family: WorkflowArtifactFamily.AdversarialReview,
					intentMode: "derived",
					parentIdentitySource: undefined,
					targetIdentitySource: {
						kind: "workflow_value",
						key: "selected_review_target",
					},
					outputValueKeys: createTargetedArtifactOutputValueKeys("review"),
				} satisfies NonNullable<WorkflowDefinition["artifacts"]>[string],
			},
		]

		for (const missingIdentityCase of missingIdentityCases) {
			const missingIdentityState = new TaskState()
			const workflow = createWorkflowDefinition({
				name: `missing-${missingIdentityCase.artifactId}`,
				workflowValueKeys: [
					missingIdentityCase.sourceKey,
					...collectArtifactOutputWorkflowValueKeys(missingIdentityCase.outputKeys),
				],
				artifacts: {
					[missingIdentityCase.artifactId]: missingIdentityCase.artifactDefinition,
				},
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createArtifactAllocationDecisionTree(missingIdentityCase.artifactId),
					}),
				},
			})
			await activateWorkflow(missingIdentityState, workflow)
			await runtime.resolveNextAction({ taskState: missingIdentityState })
			await submitNewProjectSelection(missingIdentityState, `Missing ${missingIdentityCase.artifactId}`)
			getActiveWorkflowSession(missingIdentityState).workflowValues[missingIdentityCase.sourceKey] =
				missingIdentityCase.sourceValue

			const allocationAction = await runtime.resolveNextAction({ taskState: missingIdentityState })
			expect(allocationAction.kind).to.equal("execute_tool_backed_operation")
			if (allocationAction.kind !== "execute_tool_backed_operation") {
				throw new Error(`Expected execute_tool_backed_operation, received ${allocationAction.kind}.`)
			}

			const failureResult = await runtime.handleToolBackedOperationToolResult({
				taskState: missingIdentityState,
				toolResultText: "Error: required artifact identity was not found",
				runtimeOwnedSourceRoute: allocationAction.runtimeOwnedSourceRoute,
			})

			expect(failureResult.kind).to.equal("terminal_error")
			if (failureResult.kind !== "terminal_error") {
				throw new Error(`Expected terminal_error, received ${failureResult.kind}.`)
			}
			expect(failureResult.errorMessage).to.equal(ARTIFACT_ALLOCATION_TERMINAL_ERROR_MESSAGE)
			expectWorkflowStateCleared(missingIdentityState)
		}
	})

	it("routes serialized denied and errored artifact-allocation tool results through tool_backed_operation_failed", async () => {
		const failureCases = [formatResponse.toolDenied(), formatResponse.toolError("boom")]

		for (const [failureCaseIndex, toolResultText] of failureCases.entries()) {
			const outputFileKeys = createStandaloneArtifactOutputValueKeys(`serialized_artifact_${failureCaseIndex}`)
			const failureState = new TaskState()
			const workflow = createWorkflowDefinition({
				name: `serialized-artifact-allocation-failure-${failureCaseIndex}`,
				workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputFileKeys),
				artifacts: {
					output_file: {
						id: "output_file",
						family: WorkflowArtifactFamily.Epics,
						intentMode: "new",
						parentIdentitySource: undefined,
						targetIdentitySource: undefined,
						outputValueKeys: outputFileKeys,
					},
				},
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createArtifactAllocationDecisionTree("output_file"),
					}),
				},
			})

			await activateWorkflow(failureState, workflow)
			await runtime.resolveNextAction({ taskState: failureState })
			await submitNewProjectSelection(failureState, `Serialized Artifact Failure ${failureCaseIndex}`)
			const allocationFailureAction = await runtime.resolveNextAction({ taskState: failureState })
			expect(allocationFailureAction.kind).to.equal("execute_tool_backed_operation")
			if (allocationFailureAction.kind !== "execute_tool_backed_operation") {
				throw new Error(`Expected execute_tool_backed_operation, received ${allocationFailureAction.kind}.`)
			}

			const result = await runtime.handleToolBackedOperationToolResult({
				taskState: failureState,
				toolResultText,
				runtimeOwnedSourceRoute: allocationFailureAction.runtimeOwnedSourceRoute,
			})

			expect(result.kind).to.equal("terminal_error")
			if (result.kind !== "terminal_error") {
				throw new Error(`Expected terminal_error, received ${result.kind}.`)
			}
			expect(result.errorMessage).to.equal(ARTIFACT_ALLOCATION_TERMINAL_ERROR_MESSAGE)
			expectWorkflowStateCleared(failureState)
		}
	})

	it("builds build_workflow_document tool-backed operations from action-owned instructions", async () => {
		const allocatedArtifactAbsolutePath = join(cwd, "docs", "projects", "builder-project", "planning", "Epics.md")
		const moduleChosenAbsolutePath = join(cwd, "docs", "projects", "builder-project", "planning", "Module-chosen.md")
		const outputFileKeys = createStandaloneArtifactOutputValueKeys("output_file")
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [
				"spec_doc",
				"module_chosen_absolute_path",
				...collectArtifactOutputWorkflowValueKeys(outputFileKeys),
			],
			artifacts: {
				output_file: {
					id: "output_file",
					family: WorkflowArtifactFamily.Epics,
					intentMode: "new",
					parentIdentitySource: undefined,
					targetIdentitySource: undefined,
					outputValueKeys: outputFileKeys,
				},
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						startAction: {
							kind: "build_workflow_document",
							instruction: createDocumentBuildActionInstruction({
								workflowValueWrites: {
									spec_doc: "ready",
								},
							}),
						},
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})

		await activateWorkflow(taskState, workflow)
		getActiveWorkflowSession(taskState).workflowValues[outputFileKeys.artifactAbsolutePath] = allocatedArtifactAbsolutePath
		getActiveWorkflowSession(taskState).workflowValues.module_chosen_absolute_path = moduleChosenAbsolutePath
		await runtime.resolveNextAction({ taskState })
		const toolBackedOperation = await submitNewProjectSelection(taskState, "Builder Project")

		expect(toolBackedOperation.kind).to.equal("execute_tool_backed_operation")
		if (toolBackedOperation.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${toolBackedOperation.kind}.`)
		}

		expect(toolBackedOperation.toolBackedOperationSession).to.be.undefined
		expect(toolBackedOperation.runtimeOwnedSourceRoute).to.deep.equal(STEP_RESOLUTION_SOURCE_ROUTE)
		expect(toolBackedOperation.toolRequest.toolName).to.equal(ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT)
		expect(toolBackedOperation.toolRequest.toolParams).to.deep.equal({
			artifact_id: "output_file",
			destination_path: allocatedArtifactAbsolutePath,
			content: "# Resolved spec",
		})
		expect(toolBackedOperation.toolRequest.toolInput).to.deep.equal({
			workflow_value_writes: {
				spec_doc: "ready",
			},
		})
	})

	it("builds move_workflow_project_file tool-backed operations from move_project_file actions", async () => {
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [MOVE_PROJECT_FILE_FILENAME_KEY],
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						startAction: createMoveProjectFileAction({
							sourceFolderSegments: ["implementation", "stories-backlog"],
							destinationFolderSegments: ["implementation", "stories-review"],
							filenameWorkflowValueKey: MOVE_PROJECT_FILE_FILENAME_KEY,
						}),
					}),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		getActiveWorkflowSession(taskState).workflowValues[MOVE_PROJECT_FILE_FILENAME_KEY] = "Story-1.md"
		await runtime.resolveNextAction({ taskState })
		const toolBackedOperation = await submitNewProjectSelection(taskState, "Move Project")

		expect(toolBackedOperation.kind).to.equal("execute_tool_backed_operation")
		if (toolBackedOperation.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${toolBackedOperation.kind}.`)
		}

		expect(toolBackedOperation.toolBackedOperationSession).to.be.undefined
		expect(toolBackedOperation.runtimeOwnedSourceRoute).to.deep.equal(STEP_RESOLUTION_SOURCE_ROUTE)
		expect(toolBackedOperation.toolRequest.toolName).to.equal(ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE)
		expect(toolBackedOperation.toolRequest.toolParams).to.deep.equal({
			source_path: join(cwd, "docs", "projects", "move-project", "implementation", "stories-backlog", "Story-1.md"),
			destination_path: join(cwd, "docs", "projects", "move-project", "implementation", "stories-review", "Story-1.md"),
		})
		expect(toolBackedOperation.toolRequest.toolInput).to.deep.equal({})
	})

	it("builds update_story_index_status tool-backed operations from workflow values", async () => {
		const storiesIndexPath = join(
			cwd,
			"docs",
			"projects",
			"status-build-project",
			"implementation",
			"epic-1-stories.index.json",
		)
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [UPDATE_STORY_INDEX_STATUS_STORIES_INDEX_KEY, UPDATE_STORY_INDEX_STATUS_STORY_IDENTITY_KEY],
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						startAction: createUpdateStoryIndexStatusAction({
							expectedCurrentStatus: "draft",
						}),
					}),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		getActiveWorkflowSession(taskState).workflowValues[UPDATE_STORY_INDEX_STATUS_STORIES_INDEX_KEY] = storiesIndexPath
		getActiveWorkflowSession(taskState).workflowValues[UPDATE_STORY_INDEX_STATUS_STORY_IDENTITY_KEY] = "1.1"
		await runtime.resolveNextAction({ taskState })
		const toolBackedOperation = await submitNewProjectSelection(taskState, "Status Build Project")

		expect(toolBackedOperation.kind).to.equal("execute_tool_backed_operation")
		if (toolBackedOperation.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${toolBackedOperation.kind}.`)
		}

		expect(toolBackedOperation.toolBackedOperationSession).to.be.undefined
		expect(toolBackedOperation.runtimeOwnedSourceRoute).to.deep.equal(STEP_RESOLUTION_SOURCE_ROUTE)
		expect(toolBackedOperation.toolRequest.toolName).to.equal(ClineDefaultTool.UPDATE_STORY_INDEX_STATUS)
		expect(toolBackedOperation.toolRequest.toolParams).to.deep.equal({
			stories_index: storiesIndexPath,
			story_identity: "1.1",
			status: "backlog",
			expected_current_status: "draft",
		})
		expect(toolBackedOperation.toolRequest.toolInput).to.deep.equal({})
	})

	it("updates story index status and routes successful update results through tool_backed_operation_succeeded", async () => {
		const storiesIndexPath = join(
			cwd,
			"docs",
			"projects",
			"status-success-project",
			"implementation",
			"epic-1-stories.index.json",
		)
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [UPDATE_STORY_INDEX_STATUS_STORIES_INDEX_KEY, UPDATE_STORY_INDEX_STATUS_STORY_IDENTITY_KEY],
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						startAction: createUpdateStoryIndexStatusAction({
							expectedCurrentStatus: "draft",
						}),
						successAction: createEntryBranchStepTransitionAction(2),
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})
		await writeStoryIndex(storiesIndexPath, [
			{
				story_identity: "1.1",
				story_file_name: "Story-1-1.md",
				story_type: "primary",
				parent_story_identity: null,
				story_file_generated: true,
				status: "draft",
			},
		])

		await activateWorkflow(taskState, workflow)
		getActiveWorkflowSession(taskState).workflowValues[UPDATE_STORY_INDEX_STATUS_STORIES_INDEX_KEY] = storiesIndexPath
		getActiveWorkflowSession(taskState).workflowValues[UPDATE_STORY_INDEX_STATUS_STORY_IDENTITY_KEY] = "1.1"
		await runtime.resolveNextAction({ taskState })
		const toolBackedOperation = await submitNewProjectSelection(taskState, "Status Success Project")

		expect(toolBackedOperation.kind).to.equal("execute_tool_backed_operation")
		if (toolBackedOperation.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${toolBackedOperation.kind}.`)
		}

		const updateResult = await runtime.updateStoryIndexStatus({
			taskState,
			storiesIndex: storiesIndexPath,
			storyIdentity: "1.1",
			status: "backlog",
			expectedCurrentStatus: "draft",
		})
		expect(updateResult).to.deep.equal({
			storiesIndex: storiesIndexPath,
			storyIdentity: "1.1",
			previousStatus: "draft",
			status: "backlog",
		})
		const updatedIndex = parseWorkflowStoryIndexJson(await readFile(storiesIndexPath, "utf8"))
		expect(updatedIndex.stories[0]?.status).to.equal("backlog")

		const successResult = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: JSON.stringify({
				persisted: true,
				stories_index: storiesIndexPath,
				story_identity: "1.1",
				previous_status: "draft",
				status: "backlog",
			}),
			runtimeOwnedSourceRoute: toolBackedOperation.runtimeOwnedSourceRoute,
		})

		expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(2)
		expect(successResult.kind).to.equal("project_prompt")
		if (successResult.kind !== "project_prompt") {
			throw new Error(`Expected project_prompt, received ${successResult.kind}.`)
		}
	})

	it("routes serialized denied and errored update_story_index_status results through tool_backed_operation_failed", async () => {
		const failureCases = [formatResponse.toolDenied(), formatResponse.toolError("boom")]

		for (const [failureCaseIndex, toolResultText] of failureCases.entries()) {
			const failureState = new TaskState()
			const projectFolderName = `status-failure-project-${failureCaseIndex}`
			const storiesIndexPath = join(
				cwd,
				"docs",
				"projects",
				projectFolderName,
				"implementation",
				"epic-1-stories.index.json",
			)
			const workflow = createWorkflowDefinition({
				workflowValueKeys: [UPDATE_STORY_INDEX_STATUS_STORIES_INDEX_KEY, UPDATE_STORY_INDEX_STATUS_STORY_IDENTITY_KEY],
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createToolBackedOperationDecisionTree({
							startAction: createUpdateStoryIndexStatusAction(),
							successAction: {
								kind: "terminal_error",
								errorMessage: "Unexpected update success.",
							},
							failureAction: createEntryBranchStepTransitionAction(2),
						}),
					}),
					"step-2": createStepDefinition({ stepNumber: 2 }),
				},
			})

			await activateWorkflow(failureState, workflow)
			getActiveWorkflowSession(failureState).workflowValues[UPDATE_STORY_INDEX_STATUS_STORIES_INDEX_KEY] = storiesIndexPath
			getActiveWorkflowSession(failureState).workflowValues[UPDATE_STORY_INDEX_STATUS_STORY_IDENTITY_KEY] = "1.1"
			await runtime.resolveNextAction({ taskState: failureState })
			const toolBackedOperation = await submitNewProjectSelection(
				failureState,
				`Status Failure Project ${failureCaseIndex}`,
			)

			expect(toolBackedOperation.kind).to.equal("execute_tool_backed_operation")
			if (toolBackedOperation.kind !== "execute_tool_backed_operation") {
				throw new Error(`Expected execute_tool_backed_operation, received ${toolBackedOperation.kind}.`)
			}

			const result = await runtime.handleToolBackedOperationToolResult({
				taskState: failureState,
				toolResultText,
				runtimeOwnedSourceRoute: toolBackedOperation.runtimeOwnedSourceRoute,
			})

			expect(getActiveWorkflowSession(failureState).activeStepNumber).to.equal(2)
			expect(result.kind).to.equal("project_prompt")
			if (result.kind !== "project_prompt") {
				throw new Error(`Expected project_prompt, received ${result.kind}.`)
			}
		}
	})

	it("moves workflow project files and routes successful move results through tool_backed_operation_succeeded", async () => {
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [MOVE_PROJECT_FILE_FILENAME_KEY],
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						startAction: createMoveProjectFileAction({
							sourceFolderSegments: ["implementation", "stories-backlog"],
							destinationFolderSegments: ["implementation", "stories-review"],
							filenameWorkflowValueKey: MOVE_PROJECT_FILE_FILENAME_KEY,
						}),
						successAction: createEntryBranchStepTransitionAction(2),
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})

		await activateWorkflow(taskState, workflow)
		getActiveWorkflowSession(taskState).workflowValues[MOVE_PROJECT_FILE_FILENAME_KEY] = "Story-2.md"
		await runtime.resolveNextAction({ taskState })
		const toolBackedOperation = await submitNewProjectSelection(taskState, "Move Success Project")

		expect(toolBackedOperation.kind).to.equal("execute_tool_backed_operation")
		if (toolBackedOperation.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${toolBackedOperation.kind}.`)
		}

		const sourcePath = toolBackedOperation.toolRequest.toolParams.source_path
		const destinationPath = toolBackedOperation.toolRequest.toolParams.destination_path
		await writeFile(sourcePath, "story content", "utf8")

		const movedFile = await runtime.moveWorkflowProjectFile({
			taskState,
			expectedSourceAbsolutePath: sourcePath,
			expectedDestinationAbsolutePath: destinationPath,
		})

		expect(movedFile).to.deep.equal({
			sourceAbsolutePath: sourcePath,
			destinationAbsolutePath: destinationPath,
		})
		expect(await pathExists(sourcePath)).to.equal(false)
		expect(await readFile(destinationPath, "utf8")).to.equal("story content")

		const successResult = await runtime.handleToolBackedOperationToolResult({
			taskState,
			toolResultText: JSON.stringify({
				moved: true,
				source_path: sourcePath,
				destination_path: destinationPath,
			}),
			runtimeOwnedSourceRoute: toolBackedOperation.runtimeOwnedSourceRoute,
		})

		expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(2)
		expect(successResult.kind).to.equal("project_prompt")
		if (successResult.kind !== "project_prompt") {
			throw new Error(`Expected project_prompt, received ${successResult.kind}.`)
		}
	})

	it("fails workflow project file moves clearly without overwriting destination collisions", async () => {
		const workflow = createWorkflowDefinition({
			workflowValueKeys: [MOVE_PROJECT_FILE_FILENAME_KEY],
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree({
						startAction: createMoveProjectFileAction({
							sourceFolderSegments: ["implementation", "stories-backlog"],
							destinationFolderSegments: ["implementation", "stories-review"],
							filenameWorkflowValueKey: MOVE_PROJECT_FILE_FILENAME_KEY,
						}),
					}),
				}),
			},
		})

		await activateWorkflow(taskState, workflow)
		getActiveWorkflowSession(taskState).workflowValues[MOVE_PROJECT_FILE_FILENAME_KEY] = "Story-3.md"
		await runtime.resolveNextAction({ taskState })
		const toolBackedOperation = await submitNewProjectSelection(taskState, "Move Collision Project")

		expect(toolBackedOperation.kind).to.equal("execute_tool_backed_operation")
		if (toolBackedOperation.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${toolBackedOperation.kind}.`)
		}

		const sourcePath = toolBackedOperation.toolRequest.toolParams.source_path
		const destinationPath = toolBackedOperation.toolRequest.toolParams.destination_path
		await writeFile(sourcePath, "source content", "utf8")
		await writeFile(destinationPath, "existing destination", "utf8")

		let capturedError: unknown
		try {
			await runtime.moveWorkflowProjectFile({
				taskState,
				expectedSourceAbsolutePath: sourcePath,
				expectedDestinationAbsolutePath: destinationPath,
			})
		} catch (error) {
			capturedError = error
		}

		expect(capturedError).to.be.instanceOf(Error)
		if (!(capturedError instanceof Error)) {
			throw new Error("Expected move collision to throw.")
		}
		expect(capturedError.message).to.equal(
			`Cannot move workflow project file because destination already exists: ${destinationPath}`,
		)
		expect(await readFile(sourcePath, "utf8")).to.equal("source content")
		expect(await readFile(destinationPath, "utf8")).to.equal("existing destination")
	})

	it("routes serialized denied and errored document build tool results through tool_backed_operation_failed", async () => {
		const failureCases = [formatResponse.toolDenied(), formatResponse.toolError("boom")]

		for (const [failureCaseIndex, toolResultText] of failureCases.entries()) {
			const outputFileKeys = createStandaloneArtifactOutputValueKeys(`serialized_document_${failureCaseIndex}`)
			const allocatedArtifactAbsolutePath = join(
				cwd,
				"docs",
				"projects",
				`serialized-builder-project-${failureCaseIndex}`,
				"planning",
				"Epics.md",
			)
			const failureState = new TaskState()
			const workflow = createWorkflowDefinition({
				name: `serialized-document-build-failure-${failureCaseIndex}`,
				workflowValueKeys: collectArtifactOutputWorkflowValueKeys(outputFileKeys),
				artifacts: {
					output_file: {
						id: "output_file",
						family: WorkflowArtifactFamily.Epics,
						intentMode: "new",
						parentIdentitySource: undefined,
						targetIdentitySource: undefined,
						outputValueKeys: outputFileKeys,
					},
				},
				steps: {
					"step-1": createStepDefinition({
						stepNumber: 1,
						decisionTree: createToolBackedOperationDecisionTree({
							startAction: {
								kind: "build_workflow_document",
								instruction: createDocumentBuildActionInstruction(),
							},
						}),
					}),
				},
			})

			await activateWorkflow(failureState, workflow)
			getActiveWorkflowSession(failureState).workflowValues[outputFileKeys.artifactAbsolutePath] =
				allocatedArtifactAbsolutePath
			await runtime.resolveNextAction({ taskState: failureState })
			const toolBackedOperation = await submitNewProjectSelection(
				failureState,
				`Serialized Builder Failure ${failureCaseIndex}`,
			)
			expect(toolBackedOperation.kind).to.equal("execute_tool_backed_operation")
			if (toolBackedOperation.kind !== "execute_tool_backed_operation") {
				throw new Error(`Expected execute_tool_backed_operation, received ${toolBackedOperation.kind}.`)
			}

			const result = await runtime.handleToolBackedOperationToolResult({
				taskState: failureState,
				toolResultText,
				runtimeOwnedSourceRoute: toolBackedOperation.runtimeOwnedSourceRoute,
			})
			const activeSession = getActiveWorkflowSession(failureState)

			expect(result.kind).to.equal("project_prompt")
			expect(activeSession.branchContext.activeBranchId).to.equal("after-step-resolution-failure")
			expect(activeSession.branchContext.failureState).to.deep.equal({
				retryAttemptCount: 1,
				terminalErrorMessage: toolResultText,
			})
		}
	})

	it("deep-clones persisted sessions and restores only valid persisted workflow state", async () => {
		const workflow = createWorkflowDefinition()
		registerResolvedWorkflow(workflow)

		await activateWorkflow(taskState, workflow)
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Persisted Project")

		const persistedSession = runtime.getPersistedSession({ taskState })
		expect(persistedSession).to.not.equal(undefined)
		if (!persistedSession) {
			throw new Error("Expected a persisted workflow session.")
		}
		expect(persistedSession).to.deep.equal(taskState.activeWorkflowSession)
		expect(persistedSession).to.not.equal(taskState.activeWorkflowSession)

		persistedSession.projectSelection.projectTitle = "Mutated Persisted Title"
		expect(getActiveWorkflowSession(taskState).projectSelection.projectTitle).to.equal("Persisted Project")

		const undefinedRestore = await runtime.restorePersistedSession({
			taskState: new TaskState(),
			persistedSession: undefined,
		})

		expect(undefinedRestore).to.be.undefined

		const missingActiveWorkflowNameState = new TaskState()
		missingActiveWorkflowNameState.activeWorkflowSession = createParentWorkflowSession()
		missingActiveWorkflowNameState.currentFocusChainChecklist = "stale checklist"
		const missingActiveWorkflowNameRestore = await runtime.restorePersistedSession({
			taskState: missingActiveWorkflowNameState,
			persistedSession,
		})

		expect(missingActiveWorkflowNameRestore).to.deep.equal({ kind: "persist_workflow_teardown" })
		expect(missingActiveWorkflowNameState.activeWorkflowName).to.be.undefined
		expect(missingActiveWorkflowNameState.activeWorkflowSession).to.be.undefined
		expect(missingActiveWorkflowNameState.currentFocusChainChecklist).to.equal(null)

		const missingWorkflowState = new TaskState()
		missingWorkflowState.activeWorkflowName = "stale"
		missingWorkflowState.activeWorkflowSession = createParentWorkflowSession()
		missingWorkflowState.currentFocusChainChecklist = "stale checklist"
		resolveWorkflowDefinitionStub.returns(undefined)
		const missingWorkflowRestore = await runtime.restorePersistedSession({
			taskState: missingWorkflowState,
			persistedSession,
		})

		expect(missingWorkflowRestore).to.deep.equal({ kind: "persist_workflow_teardown" })
		expect(missingWorkflowState.activeWorkflowName).to.be.undefined
		expect(missingWorkflowState.activeWorkflowSession).to.be.undefined
		expect(missingWorkflowState.currentFocusChainChecklist).to.equal(null)

		const invalidDefinitionState = new TaskState()
		invalidDefinitionState.activeWorkflowName = workflow.name
		invalidDefinitionState.activeWorkflowSession = createParentWorkflowSession()
		invalidDefinitionState.currentFocusChainChecklist = "stale checklist"
		const invalidDefinition = createWorkflowDefinition({ name: workflow.name, steps: {} as WorkflowDefinition["steps"] })
		registerResolvedWorkflow(invalidDefinition)
		const invalidDefinitionRestore = await runtime.restorePersistedSession({
			taskState: invalidDefinitionState,
			persistedSession,
		})

		expect(invalidDefinitionRestore).to.deep.equal({ kind: "persist_workflow_teardown" })
		expect(invalidDefinitionState.activeWorkflowName).to.be.undefined
		expect(invalidDefinitionState.activeWorkflowSession).to.be.undefined
		expect(invalidDefinitionState.currentFocusChainChecklist).to.equal(null)

		registerResolvedWorkflow(workflow)
		const invalidStepSession = runtime.getPersistedSession({ taskState })
		expect(invalidStepSession).to.not.equal(undefined)
		if (!invalidStepSession) {
			throw new Error("Expected an invalid-step persisted workflow session.")
		}
		invalidStepSession.activeStepNumber = 999
		const invalidStepState = new TaskState()
		invalidStepState.activeWorkflowName = workflow.name
		invalidStepState.activeWorkflowSession = createParentWorkflowSession()
		invalidStepState.currentFocusChainChecklist = "stale checklist"
		const invalidStepRestore = await runtime.restorePersistedSession({
			taskState: invalidStepState,
			persistedSession: invalidStepSession,
		})

		expect(invalidStepRestore).to.deep.equal({ kind: "persist_workflow_teardown" })
		expect(invalidStepState.activeWorkflowName).to.be.undefined
		expect(invalidStepState.activeWorkflowSession).to.be.undefined
		expect(invalidStepState.currentFocusChainChecklist).to.equal(null)

		const invalidBranchSession = runtime.getPersistedSession({ taskState })
		expect(invalidBranchSession).to.not.equal(undefined)
		if (!invalidBranchSession) {
			throw new Error("Expected an invalid-branch persisted workflow session.")
		}
		invalidBranchSession.branchContext.activeBranchId = "missing-branch"
		const invalidBranchState = new TaskState()
		invalidBranchState.activeWorkflowName = workflow.name
		invalidBranchState.activeWorkflowSession = createParentWorkflowSession()
		invalidBranchState.currentFocusChainChecklist = "stale checklist"
		const invalidBranchRestore = await runtime.restorePersistedSession({
			taskState: invalidBranchState,
			persistedSession: invalidBranchSession,
		})

		expect(invalidBranchRestore).to.deep.equal({ kind: "persist_workflow_teardown" })
		expect(invalidBranchState.activeWorkflowName).to.be.undefined
		expect(invalidBranchState.activeWorkflowSession).to.be.undefined
		expect(invalidBranchState.currentFocusChainChecklist).to.equal(null)

		registerResolvedWorkflow(workflow)
		const validPersistedSession = runtime.getPersistedSession({ taskState })
		expect(validPersistedSession).to.not.equal(undefined)
		if (!validPersistedSession) {
			throw new Error("Expected a valid persisted workflow session.")
		}
		const restoredState = new TaskState()
		restoredState.activeWorkflowName = workflow.name
		const restored = await runtime.restorePersistedSession({
			taskState: restoredState,
			persistedSession: validPersistedSession,
		})

		expect(restored?.kind).to.equal("project_prompt")
		expect(restoredState.activeWorkflowName).to.equal(workflow.name)
		expect(restoredState.activeWorkflowSession).to.deep.equal(validPersistedSession)

		const legacyPersistedSession = Object.assign({}, validPersistedSession, { workflowName: workflow.name })
		const legacyRestoredState = new TaskState()
		legacyRestoredState.activeWorkflowName = workflow.name
		const legacyRestored = await runtime.restorePersistedSession({
			taskState: legacyRestoredState,
			persistedSession: legacyPersistedSession,
		})

		expect(legacyRestored?.kind).to.equal("project_prompt")
		expect(legacyRestoredState.activeWorkflowName).to.equal(workflow.name)
		const legacyRestoredSession = legacyRestoredState.activeWorkflowSession
		expect(legacyRestoredSession).to.not.equal(undefined)
		if (legacyRestoredSession === undefined) {
			throw new Error("Expected a restored workflow session.")
		}
		expect(Object.hasOwn(legacyRestoredSession, "workflowName")).to.equal(false)
		const repersistedSession = runtime.getPersistedSession({ taskState: legacyRestoredState })
		expect(repersistedSession).to.not.equal(undefined)
		if (repersistedSession === undefined) {
			throw new Error("Expected a re-persisted workflow session.")
		}
		expect(Object.hasOwn(repersistedSession, "workflowName")).to.equal(false)
	})

	it("fails closed without throwing when persisted workflow session shape is malformed", async () => {
		const workflow = createWorkflowDefinition()
		const persistedSession = await createRestorablePersistedSession(workflow)
		const malformedCases: Array<{
			name: string
			mutate(session: PersistedWorkflowSession): void
		}> = [
			{
				name: "missing ui",
				mutate: (session) => {
					Reflect.deleteProperty(session, "ui")
				},
			},
			{
				name: "invalid branch context",
				mutate: (session) => {
					Reflect.set(session, "branchContext", "not-branch-context")
				},
			},
			{
				name: "invalid active step number",
				mutate: (session) => {
					Reflect.set(session, "activeStepNumber", "step-1")
				},
			},
		]

		for (const malformedCase of malformedCases) {
			const malformedSession = structuredClone(persistedSession)
			malformedCase.mutate(malformedSession)

			await expectPersistedRestoreFailsClosed(workflow, malformedSession)
		}
	})

	it("fails closed with teardown persistence when restored branch trigger event is retired session init event", async () => {
		const workflow = createWorkflowDefinition()
		const persistedSession = await createRestorablePersistedSession(workflow)
		const staleEventKind = ["session", "initialized"].join("_")
		Reflect.set(persistedSession.branchContext, "lastTriggerEvent", {
			kind: staleEventKind,
		})

		await expectPersistedRestoreFailsClosed(workflow, persistedSession)
	})

	it("restores persisted model_tool_succeeded for projected known tools", async () => {
		const toolName = ClineDefaultTool.PLAN_STORY_ARTIFACTS
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					toolSchema: createToolSchema(toolName),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})
		const persistedSession = await createRestorablePersistedSession(workflow)
		persistedSession.branchContext.lastTriggerEvent = {
			kind: "model_tool_succeeded",
			toolName,
		}
		registerResolvedWorkflow(workflow)
		const restoredState = new TaskState()
		restoredState.activeWorkflowName = workflow.name

		const restored = await runtime.restorePersistedSession({
			taskState: restoredState,
			persistedSession,
		})

		expect(restored?.kind).to.equal("project_prompt")
		expect(restoredState.activeWorkflowName).to.equal(workflow.name)
		expect(restoredState.activeWorkflowSession).to.not.equal(undefined)
	})

	it("restores persisted model_tool_failed for projected known tools with optional error text", async () => {
		const toolName = ClineDefaultTool.GENERATE_STORY_FILES
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					toolSchema: createToolSchema(toolName),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})
		const persistedSession = await createRestorablePersistedSession(workflow)
		const events: readonly PersistedWorkflowSession["branchContext"]["lastTriggerEvent"][] = [
			{
				kind: "model_tool_failed",
				toolName,
			},
			{
				kind: "model_tool_failed",
				toolName,
				errorMessage: "story generation failed",
			},
		]

		for (const event of events) {
			const eventSession = structuredClone(persistedSession)
			eventSession.branchContext.lastTriggerEvent = event
			registerResolvedWorkflow(workflow)
			const restoredState = new TaskState()
			restoredState.activeWorkflowName = workflow.name

			const restored = await runtime.restorePersistedSession({
				taskState: restoredState,
				persistedSession: eventSession,
			})

			expect(restored?.kind).to.equal("project_prompt")
			expect(restoredState.activeWorkflowName).to.equal(workflow.name)
			expect(restoredState.activeWorkflowSession).to.not.equal(undefined)
		}
	})

	it("fails closed when restored model_tool_succeeded references a non-projected tool", async () => {
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					toolSchema: createToolSchema(ClineDefaultTool.PLAN_STORY_ARTIFACTS),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})
		const persistedSession = await createRestorablePersistedSession(workflow)
		persistedSession.branchContext.lastTriggerEvent = {
			kind: "model_tool_succeeded",
			toolName: ClineDefaultTool.GENERATE_STORY_FILES,
		}

		await expectPersistedRestoreFailsClosed(workflow, persistedSession)
	})

	it("fails closed when restored model_tool_failed references a non-projected tool", async () => {
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					toolSchema: createToolSchema(ClineDefaultTool.GENERATE_STORY_FILES),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})
		const persistedSession = await createRestorablePersistedSession(workflow)
		persistedSession.branchContext.lastTriggerEvent = {
			kind: "model_tool_failed",
			toolName: ClineDefaultTool.PLAN_STORY_ARTIFACTS,
			errorMessage: "planning failed",
		}

		await expectPersistedRestoreFailsClosed(workflow, persistedSession)
	})

	it("restores declared JSON-safe array and object workflow values", async () => {
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["restored_array", "restored_object"],
		})
		const persistedSession = await createRestorablePersistedSession(workflow)
		const declaredWorkflowValues: WorkflowValues = {
			restored_array: ["alpha", { nested: true, count: 2 }],
			restored_object: {
				outer: { count: 1 },
				order: ["first", "second"],
			},
		}
		persistedSession.workflowValues.restored_array = declaredWorkflowValues.restored_array
		persistedSession.workflowValues.restored_object = declaredWorkflowValues.restored_object
		registerResolvedWorkflow(workflow)

		const restoredState = new TaskState()
		restoredState.activeWorkflowName = workflow.name
		const restored = await runtime.restorePersistedSession({
			taskState: restoredState,
			persistedSession,
		})

		expect(restored?.kind).to.equal("project_prompt")
		const restoredSession = getActiveWorkflowSession(restoredState)
		expect(restoredSession.workflowValues.restored_array).to.deep.equal(declaredWorkflowValues.restored_array)
		expect(restoredSession.workflowValues.restored_object).to.deep.equal(declaredWorkflowValues.restored_object)
		expect(restoredSession.workflowValues.restored_array).to.not.equal(persistedSession.workflowValues.restored_array)
		expect(restoredSession.workflowValues.restored_object).to.not.equal(persistedSession.workflowValues.restored_object)
	})

	it("fails closed for invalid restored workflow values, project selection, and ui suppression state", async () => {
		const workflow = createWorkflowDefinition()
		const persistedSession = await createRestorablePersistedSession(workflow)
		const malformedCases: Array<{
			name: string
			mutate(session: PersistedWorkflowSession): void
		}> = [
			{
				name: "invalid workflow values",
				mutate: (session) => {
					Reflect.set(session.workflowValues, "bad_value", undefined)
				},
			},
			{
				name: "stale workflow value key",
				mutate: (session) => {
					session.workflowValues.stale_workflow_value = "stale"
				},
			},
			{
				name: "invalid project selection",
				mutate: (session) => {
					Reflect.set(session.projectSelection, "projectMode", "archived")
				},
			},
			{
				name: "invalid form suppression array",
				mutate: (session) => {
					Reflect.set(session.ui, "suppressedWorkflowFormIds", "not-an-array")
				},
			},
			{
				name: "stale form suppression id",
				mutate: (session) => {
					session.ui.suppressedWorkflowFormIds = ["missing-form"]
				},
			},
			{
				name: "stale step-resolution suppression id",
				mutate: (session) => {
					session.ui.suppressedWorkflowStepResolutionRoutes = [
						{
							branchId: "missing-branch",
							routeId: "missing-route",
						},
					]
				},
			},
		]

		for (const malformedCase of malformedCases) {
			const malformedSession = structuredClone(persistedSession)
			malformedCase.mutate(malformedSession)

			await expectPersistedRestoreFailsClosed(workflow, malformedSession)
		}
	})

	it("fails closed for stale or malformed restored workflow form sessions", async () => {
		const workflowFormId = "form-restore-validation"
		const formDefinition = createWorkflowFormDefinitionPayload()
		formDefinition.panels["panel-2"].fields = [
			{
				key: "approval",
				kind: "small_text",
				label: "Approval",
				required: false,
			},
		]
		const workflow = createWorkflowDefinition({
			workflowForms: {
				[workflowFormId]: formDefinition,
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})

		registerResolvedWorkflow(workflow)
		const sourceState = new TaskState()
		await activateWorkflow(sourceState, workflow)
		await runtime.resolveNextAction({ taskState: sourceState })
		await submitNewProjectSelection(sourceState, "Malformed Form Restore Project")
		await runtime.resolveNextAction({ taskState: sourceState })
		await submitActiveWorkflowFormPanel(sourceState)
		const persistedSession = runtime.getPersistedSession({ taskState: sourceState })
		if (persistedSession === undefined) {
			throw new Error("Expected a persisted form session.")
		}

		const malformedCases: Array<{
			name: string
			mutate(session: PersistedWorkflowSession): void
		}> = [
			{
				name: "stale form id",
				mutate: (session) => {
					if (session.ui.formSession === undefined) {
						throw new Error("Expected a form session.")
					}
					session.ui.formSession.workflowFormId = "missing-form"
				},
			},
			{
				name: "stale current panel id",
				mutate: (session) => {
					if (session.ui.formSession === undefined) {
						throw new Error("Expected a form session.")
					}
					session.ui.formSession.currentPanelId = "missing-panel"
				},
			},
			{
				name: "malformed submitted value",
				mutate: (session) => {
					if (session.ui.formSession === undefined) {
						throw new Error("Expected a form session.")
					}
					Reflect.set(session.ui.formSession.values, "approval", {
						valueType: "string",
						booleanValue: true,
					})
				},
			},
			{
				name: "missing active branch continuation route",
				mutate: (session) => {
					session.branchContext.activeBranchId = "after-form-complete"
				},
			},
		]

		for (const malformedCase of malformedCases) {
			const malformedSession = structuredClone(persistedSession)
			malformedCase.mutate(malformedSession)

			await expectPersistedRestoreFailsClosed(workflow, malformedSession)
		}
	})

	it("restores downstream workflow ui from the canonical session without legacy task-state mirrors", async () => {
		const workflowFormId = "form-restore"
		const workflow = createWorkflowDefinition({
			workflowForms: {
				[workflowFormId]: createWorkflowFormDefinitionPayload(),
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
					}),
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})

		registerResolvedWorkflow(workflow)
		const sourceState = new TaskState()
		await activateWorkflow(sourceState, workflow)
		await runtime.resolveNextAction({ taskState: sourceState })
		await submitNewProjectSelection(sourceState, "Restored Form Project")
		await runtime.resolveNextAction({ taskState: sourceState })
		await submitActiveWorkflowFormPanel(sourceState)

		const persistedSession = runtime.getPersistedSession({ taskState: sourceState })
		expect(persistedSession).to.not.equal(undefined)
		if (!persistedSession) {
			throw new Error("Expected a persisted workflow session for restore.")
		}
		if (persistedSession.ui.formSession === undefined) {
			throw new Error("Expected a persisted workflow form session for restore.")
		}
		persistedSession.ui.formSession.definitionPayload = {
			...persistedSession.ui.formSession.definitionPayload,
			title: "Stale Persisted Workflow Form",
		}

		const restoredState = new TaskState()
		restoredState.activeWorkflowName = workflow.name
		const restored = await runtime.restorePersistedSession({
			taskState: restoredState,
			persistedSession,
		})

		expectNoLegacyWorkflowMirrors(sourceState)
		expectNoLegacyWorkflowMirrors(restoredState)
		expect(getActiveFormSession(sourceState).currentPanelId).to.equal("panel-2")
		expect(getActiveFormSession(restoredState).currentPanelId).to.equal("panel-2")
		expect(getActiveFormSession(restoredState).definitionPayload.title).to.equal("Workflow Form")
		expect(restored?.kind).to.equal("render_workflow_form")
		if (restored?.kind === "render_workflow_form") {
			expect(restored.formSession.currentPanelId).to.equal("panel-2")
			expect(restored.formSession.definitionPayload.title).to.equal("Workflow Form")
		}
	})

	it("restores workflow form sessions with current panel, data, canonical definitions, and interpolated text", async () => {
		const workflowFormId = "interpolated-form-restore"
		const parentSession = createParentWorkflowSession()
		parentSession.workflowValues.restoredTitle = "Restored Workflow Title"
		parentSession.workflowValues.restoredPrompt = "Restored Workflow Prompt"
		const canonicalDefinition: WorkflowFormDefinitionPayload = {
			definitionVersion: 2,
			title: "Restored {workflow.restoredTitle}",
			toolDictionaryTitle: "Restored Tools",
			toolDictionaryMarkdown: "Restored tool help",
			firstPanelId: "panel-1",
			panels: {
				"panel-1": {
					panelId: "panel-1",
					title: "Panel 1",
					promptMarkdown: "Panel 1 prompt",
					fields: [],
					allowedActions: ["submit"],
					transition: {
						type: "sequential",
						nextPanelId: "panel-2",
					},
				},
				"panel-2": {
					panelId: "panel-2",
					title: "Panel {data.panelTitle}",
					promptMarkdown: "Prompt {workflow.restoredPrompt} {data.panelPrompt}",
					fields: [
						{
							key: "note",
							kind: "small_text",
							label: "Note {data.fieldLabel}",
							required: false,
							allowedValueType: "string",
						},
					],
					allowedActions: ["submit"],
					transition: createTerminalTransition(),
				},
			},
		}
		const workflow = createWorkflowDefinition({
			workflowValueKeys: ["restoredTitle", "restoredPrompt"],
			childInheritance: [
				{ parentKey: "restoredTitle", childKey: "restoredTitle" },
				{ parentKey: "restoredPrompt", childKey: "restoredPrompt" },
			],
			workflowForms: {
				[workflowFormId]: canonicalDefinition,
			},
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createWorkflowFormDecisionTree({
						workflowFormId,
						renderAction: {
							kind: "render_workflow_form",
							workflowFormId,
							startPanelId: "panel-2",
							buildSessionData: () => ({
								panelTitle: "Restored Data Panel",
								panelPrompt: "Restored Data Prompt",
								fieldLabel: "Restored Field",
							}),
						},
					}),
				}),
			},
		})
		registerResolvedWorkflow(workflow)
		const sourceState = new TaskState()
		const initialRender = await runtime.activateWorkflow({
			taskState: sourceState,
			workflowName: workflow.name,
			parentSession,
		})
		expect(initialRender.kind).to.equal("render_workflow_form")
		if (initialRender.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${initialRender.kind}.`)
		}

		const persistedSession = runtime.getPersistedSession({ taskState: sourceState })
		if (persistedSession === undefined || persistedSession.ui.formSession === undefined) {
			throw new Error("Expected a persisted workflow form session for restore.")
		}
		expect(persistedSession.ui.formSession.currentPanelId).to.equal("panel-2")
		expect(persistedSession.ui.formSession.data).to.deep.equal({
			panelTitle: "Restored Data Panel",
			panelPrompt: "Restored Data Prompt",
			fieldLabel: "Restored Field",
		})
		const stalePanel = persistedSession.ui.formSession.definitionPayload.panels["panel-2"]
		if (stalePanel === undefined) {
			throw new Error("Expected a stale persisted panel fixture.")
		}
		persistedSession.ui.formSession.definitionPayload = {
			...persistedSession.ui.formSession.definitionPayload,
			title: "Stale Persisted Form",
			panels: {
				...persistedSession.ui.formSession.definitionPayload.panels,
				"panel-2": {
					...stalePanel,
					title: "Stale Persisted Panel",
					promptMarkdown: "Stale persisted prompt",
				},
			},
		}

		const restoredState = new TaskState()
		restoredState.activeWorkflowName = workflow.name
		const restored = await runtime.restorePersistedSession({
			taskState: restoredState,
			persistedSession,
		})

		expect(restored?.kind).to.equal("render_workflow_form")
		if (restored?.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${restored?.kind ?? "undefined"}.`)
		}
		const restoredFormSession = getActiveFormSession(restoredState)
		expect(restoredFormSession.currentPanelId).to.equal("panel-2")
		expect(restoredFormSession.data).to.deep.equal(persistedSession.ui.formSession.data)
		expect(restoredFormSession.definitionPayload.title).to.equal("Restored {workflow.restoredTitle}")
		expect(restoredFormSession.definitionPayload.panels["panel-2"]?.title).to.equal("Panel {data.panelTitle}")
		expect(restored.payload.title).to.equal("Restored Restored Workflow Title")
		expect(restored.payload.panel?.title).to.equal("Panel Restored Data Panel")
		expect(restored.payload.panel?.promptMarkdown).to.equal("Prompt Restored Workflow Prompt Restored Data Prompt")
		expect(restored.payload.panel?.fields.find((field) => field.key === "note")?.label).to.equal("Note Restored Field")
	})

	it("restores valid mandatory entry form sessions through the runtime-owned entry path", async () => {
		const workflow = createWorkflowDefinition({
			workflowForms: {},
		})
		registerResolvedWorkflow(workflow)
		const sourceState = new TaskState()
		const entryAction = await activateWorkflow(sourceState, workflow)

		expect(entryAction.kind).to.equal("render_workflow_form")
		if (entryAction.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${entryAction.kind}.`)
		}
		expect(entryAction.formSession.workflowFormId).to.equal(ENTRY_FORM_ID)
		expect(workflow.workflowForms?.[ENTRY_FORM_ID]).to.equal(undefined)
		const expectedDefinitionPayload = structuredClone(entryAction.formSession.definitionPayload)

		const persistedSession = runtime.getPersistedSession({ taskState: sourceState })
		expect(persistedSession).to.not.equal(undefined)
		if (persistedSession === undefined) {
			throw new Error("Expected a persisted mandatory entry form session.")
		}

		const persistedFormSession = persistedSession.ui.formSession
		expect(persistedFormSession).to.not.equal(undefined)
		if (persistedFormSession === undefined) {
			throw new Error("Expected a persisted mandatory entry form session.")
		}
		persistedFormSession.definitionPayload = {
			...persistedFormSession.definitionPayload,
			title: "Stale Persisted Entry Form",
		}

		const restoredState = new TaskState()
		restoredState.activeWorkflowName = workflow.name
		const restored = await runtime.restorePersistedSession({
			taskState: restoredState,
			persistedSession,
		})

		expect(restored?.kind).to.equal("render_workflow_form")
		if (restored?.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${restored?.kind ?? "undefined"}.`)
		}
		expect(restored.formSession.workflowFormId).to.equal(ENTRY_FORM_ID)
		expect(restored.formSession.definitionPayload).to.deep.equal(expectedDefinitionPayload)
		expect(restored.formSession.definitionPayload.title).to.not.equal("Stale Persisted Entry Form")
		expect(restored.payload.panel?.panelId).to.equal(ENTRY_INFO_PANEL_ID)
		expect(getActiveFormSession(restoredState).definitionPayload).to.deep.equal(expectedDefinitionPayload)

		const completedProjectSelectionSession = structuredClone(persistedSession)
		completedProjectSelectionSession.projectSelection = {
			projectMode: "new",
			projectTitle: "Already Complete",
			projectFolderName: "already-complete",
		}

		await expectPersistedRestoreFailsClosed(workflow, completedProjectSelectionSession)
	})

	it("fails closed for stale or malformed restored step-resolution sessions", async () => {
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree(),
				}),
			},
		})
		const persistedSession = await createRestorableStepResolutionSession(workflow)
		const malformedCases: Array<{
			name: string
			mutate(session: PersistedWorkflowSession): void
		}> = [
			{
				name: "stale source route",
				mutate: (session) => {
					if (session.ui.stepResolutionSession === undefined) {
						throw new Error("Expected a step-resolution session.")
					}
					session.ui.stepResolutionSession.sourceRoute = {
						branchId: "missing-branch",
						routeId: "missing-route",
					}
				},
			},
			{
				name: "owner workflow mismatch",
				mutate: (session) => {
					if (session.ui.stepResolutionSession === undefined) {
						throw new Error("Expected a step-resolution session.")
					}
					session.ui.stepResolutionSession.owner.workflowName = "other-workflow"
				},
			},
			{
				name: "non-pending state",
				mutate: (session) => {
					if (session.ui.stepResolutionSession === undefined) {
						throw new Error("Expected a step-resolution session.")
					}
					session.ui.stepResolutionSession.state = "success"
				},
			},
			{
				name: "missing active branch continuation route",
				mutate: (session) => {
					session.branchContext.activeBranchId = "after-step-resolution-success"
				},
			},
		]

		for (const malformedCase of malformedCases) {
			const malformedSession = structuredClone(persistedSession)
			malformedCase.mutate(malformedSession)

			await expectPersistedRestoreFailsClosed(workflow, malformedSession)
		}
	})

	it("restores valid pending step-resolution sessions through execute_tool_backed_operation", async () => {
		const workflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					decisionTree: createToolBackedOperationDecisionTree(),
				}),
			},
		})
		const persistedSession = await createRestorableStepResolutionSession(workflow)
		registerResolvedWorkflow(workflow)
		const restoredState = new TaskState()
		restoredState.activeWorkflowName = workflow.name

		const restored = await runtime.restorePersistedSession({
			taskState: restoredState,
			persistedSession,
		})

		expect(restored?.kind).to.equal("execute_tool_backed_operation")
		if (restored?.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${restored?.kind ?? "undefined"}.`)
		}
		expect(restored.toolBackedOperationSession?.sourceRoute).to.deep.equal(STEP_RESOLUTION_SOURCE_ROUTE)
		expect(restoredState.activeWorkflowSession?.ui.stepResolutionSession?.sourceRoute).to.deep.equal(
			STEP_RESOLUTION_SOURCE_ROUTE,
		)
	})

	it("completes workflows when completion rules pass and tears down all runtime-owned state", async () => {
		const completionWorkflow = createWorkflowDefinition({
			steps: {
				"step-1": createStepDefinition({
					stepNumber: 1,
					completionRules: [
						{
							id: "complete-now",
							isComplete: (_session: ActiveWorkflowSession) => true,
						},
					],
				}),
				"step-2": createStepDefinition({ stepNumber: 2 }),
			},
		})

		await activateWorkflow(taskState, completionWorkflow)
		await runtime.resolveNextAction({ taskState })
		const completionResult = await submitNewProjectSelection(taskState, "Completion Project")

		expect(completionResult.kind).to.equal("complete_workflow")
		expect(taskState.activeWorkflowName).to.equal(undefined)
		expect(taskState.activeWorkflowSession).to.equal(undefined)

		const teardownState = new TaskState()
		await activateWorkflow(teardownState, createWorkflowDefinition())
		const teardownSession = getActiveWorkflowSession(teardownState)
		teardownSession.ui.suppressedWorkflowFormIds = ["form-1"]
		teardownSession.ui.suppressedWorkflowStepResolutionRoutes = [STEP_RESOLUTION_SOURCE_ROUTE]
		teardownState.currentFocusChainChecklist = "checklist"

		await runtime.teardownWorkflow({ taskState: teardownState })

		expect(teardownState.activeWorkflowName).to.be.undefined
		expect(teardownState.activeWorkflowSession).to.be.undefined
		expectNoLegacyWorkflowMirrors(teardownState)
		expect(teardownState.currentFocusChainChecklist).to.equal(null)
	})
})
