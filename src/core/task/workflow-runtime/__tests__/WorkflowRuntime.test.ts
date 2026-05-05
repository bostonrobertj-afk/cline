import type { WorkflowFormDefinitionPayload, WorkflowFormPanelDefinition } from "@shared/ExtensionMessage"
import { WorkflowFormAction, WorkflowFormSubmissionRequest, type WorkflowFormValue } from "@shared/proto/cline/task"
import { expect } from "chai"
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises"
import { afterEach, beforeEach, describe, it } from "mocha"
import { tmpdir } from "os"
import { join } from "path"
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
	WorkflowEntryProjectValueKeys,
	WorkflowNextAction,
	WorkflowStepDefinition,
	WorkflowStepTransitionTarget,
	WorkflowValues,
	WorkflowWorkspacePathPolicy,
} from "../types"
import * as WorkflowRegistry from "../WorkflowRegistry"
import { WorkflowRuntime } from "../WorkflowRuntime"
import { brainstormingWorkflowDefinition } from "../workflow-modules/brainstorming"

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
	const DEFAULT_ENTRY_PROJECT_VALUE_KEYS: WorkflowEntryProjectValueKeys = {
		projectMode: "entry_project_mode",
		projectTitle: "entry_project_title",
		projectFolderName: "entry_project_folder_name",
	}

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
			workflowSystemInstructions: "system",
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
		projectSubfolder?: WorkflowDefinition["projectSubfolder"]
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
			slashCommandName: "workflow-runtime-test",
			useSkillName: "workflow-runtime-test",
			persona: "Workflow runtime persona",
			projectSubfolder: args?.projectSubfolder ?? "planning",
			workflowValueKeys,
			entryProjectValueKeys,
			entryPanel: {
				promptMarkdown: "Start this workflow",
			},
			steps: args?.steps ?? defaultSteps,
			workflowForms: args?.workflowForms ?? {},
			artifacts: args?.artifacts,
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

	function createEpicsArtifactWorkflow(args?: { artifactId?: string; outputValuePrefix?: string }): {
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
		})

		return { workflow, artifactId, outputValueKeys }
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
		expect(taskState.currentFocusChainChecklist).to.equal("- [ ] Step 1\n- [ ] Step 2")
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
			"- [ ] Gather Inputs\n- [ ] Resolve Session Approach\n- [ ] Perform Interactive Brainstorming\n- [ ] Organize Ideas & Plan Next Actions",
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
		expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(1)
		expect(getActiveWorkflowSession(taskState).workflowValues).to.deep.include({
			projectMode: "new",
			projectTitle: "Brainstorming Runtime Project",
			projectFolderName: "brainstorming-runtime-project",
		})
	})

	it("resolves only the unsuffixed shipped brainstorming workflow identity", () => {
		resolveWorkflowDefinitionStub.restore()

		const resolvedWorkflow = WorkflowRegistry.resolveWorkflowDefinition("brainstorming")

		expect(resolvedWorkflow).to.equal(brainstormingWorkflowDefinition)
		expect(resolvedWorkflow?.name).to.equal("brainstorming")
		expect(WorkflowRegistry.resolveWorkflowDefinition("brainstorming.md")).to.equal(undefined)
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
			await access(join(cwd, newProjectFolderName, subfolderName))
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
		const existingProjectDiscoveryRequest = discoverWorkflowCandidatesStub
			.getCalls()
			.map((call) => call.args[0])
			.find(
				(request: WorkflowDiscoveryRequest) =>
					request.rootDirectory === cwd &&
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

	it("blocks entry project setup before creating a denied project root", async () => {
		const projectRoot = join(cwd, "denied-root-project")
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
		const projectRoot = join(cwd, "denied-subfolder-project")
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
		expect(firstTurnProjection).to.deep.equal({
			fullTurnWorkflowSystemInstructionsBlock:
				"## WORKFLOW\nWorkflow: workflow-runtime-test\n\n## WORKFLOW PERSONA\nWorkflow runtime persona\n\n## WORKFLOW STEPS\n- [ ] Step 1\n- [ ] Step 2\n\n## WORKFLOW INSTRUCTIONS\nsystem",
			fullTurnWorkflowInputInstructionsBlock: "## CURRENT STEP\nStep 1: Step 1\n\ninput",
			workflowToolSchemaOverride: [],
			continuationTurnWorkflowSystemInstructionsBlock:
				"## WORKFLOW\nWorkflow: workflow-runtime-test\n\n## WORKFLOW STEPS\n- [ ] Step 1\n- [ ] Step 2\n\n## WORKFLOW INSTRUCTIONS\nsystem",
			continuationTurnWorkflowInputInstructionsBlock: "## WORKFLOW CONTINUATION\nContinue working on step 1: Step 1.",
		})
		expect(refreshTurnProjection.fullTurnWorkflowSystemInstructionsBlock).to.equal(
			"## WORKFLOW\nWorkflow: workflow-runtime-test\n\n## WORKFLOW STEPS\n- [ ] Step 1\n- [ ] Step 2\n\n## WORKFLOW INSTRUCTIONS\nsystem",
		)
		expect(refreshTurnProjection.fullTurnWorkflowSystemInstructionsBlock).to.not.include("## WORKFLOW PERSONA")
		expect(refreshTurnProjection.fullTurnWorkflowInputInstructionsBlock).to.equal(
			firstTurnProjection.fullTurnWorkflowInputInstructionsBlock,
		)
		expect(refreshTurnProjection.workflowToolSchemaOverride).to.deep.equal(firstTurnProjection.workflowToolSchemaOverride)
		expect(refreshTurnProjection.continuationTurnWorkflowSystemInstructionsBlock).to.equal(
			firstTurnProjection.continuationTurnWorkflowSystemInstructionsBlock,
		)
		expect(refreshTurnProjection.continuationTurnWorkflowInputInstructionsBlock).to.equal(
			firstTurnProjection.continuationTurnWorkflowInputInstructionsBlock,
		)
		expect(emptyProjection).to.deep.equal({})
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
			if (request.entryType === "directory" && request.rootDirectory === cwd && request.targetPathSegments === undefined) {
				return Promise.resolve([{ value: "Existing Alpha", label: "Existing Alpha" }])
			}

			if (
				request.entryType === "directory" &&
				request.rootDirectory === join(cwd, "selector-project") &&
				request.targetPathSegments === undefined
			) {
				return Promise.resolve([{ value: "planning", label: "planning" }])
			}

			if (
				request.entryType === "file" &&
				request.rootDirectory === join(cwd, "selector-project") &&
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
		const selectedProjectDirectory = join(cwd, "selector-project")
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
					request.rootDirectory === cwd &&
					request.targetPathSegments === undefined
				) {
					return Promise.resolve(
						includeFake("existing_project_choice", [{ value: "Existing Alpha", label: "Existing Alpha" }]),
					)
				}

				if (
					request.entryType === "directory" &&
					request.rootDirectory !== cwd &&
					request.targetPathSegments === undefined
				) {
					return Promise.resolve(includeFake("selected_folder", [{ value: "planning", label: "planning" }]))
				}

				if (
					request.entryType === "file" &&
					request.rootDirectory !== cwd &&
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
				request.rootDirectory === join(cwd, "pattern-project") &&
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
				request.rootDirectory === join(cwd, "template-project") &&
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
		})
		expect(getActiveWorkflowSession(taskState).activeStepNumber).to.equal(3)
		expect(getActiveWorkflowSession(taskState).ui.suppressedWorkflowStepResolutionRoutes).to.deep.equal([])
		expect(successResult.kind).to.equal("project_prompt")
		if (successResult.kind !== "project_prompt") {
			throw new Error(`Expected project_prompt, received ${successResult.kind}.`)
		}
		expect(successResult.promptProjection.fullTurnWorkflowInputInstructionsBlock).to.contain("Step 3: Step 3")
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
		})

		expect(result.kind).to.equal("project_prompt")
		if (result.kind !== "project_prompt") {
			throw new Error(`Expected project_prompt, received ${result.kind}.`)
		}
		const activeSession = getActiveWorkflowSession(taskState)
		expect(activeSession.activeStepNumber).to.equal(2)
		expect(activeSession.branchContext.activeBranchId).to.equal("no-selected-action")
		expect(result.promptProjection.fullTurnWorkflowInputInstructionsBlock).to.contain("Step 2: Waiting Step")
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
			"builder-failure-project",
			"planning",
			"Epics.md",
		)
		await runtime.resolveNextAction({ taskState: documentBuildFailureState })
		expect((await submitNewProjectSelection(documentBuildFailureState, "Builder Failure Project")).kind).to.equal(
			"execute_tool_backed_operation",
		)

		const failureResult = await runtime.handleToolBackedOperationToolResult({
			taskState: documentBuildFailureState,
			toolResultText: "Error: write failed",
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

												return input.triggerEvent.kind === "project_selection_completed"
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
			triggerEventKind: "project_selection_completed",
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
		const artifactParentDirectory = join(cwd, projectFolderName, "planning")
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
		const artifactAbsolutePath = join(cwd, projectFolderName, "planning", "Epics.md")
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
		const planningFolder = join(cwd, projectFolderName, "planning")
		await mkdir(planningFolder, { recursive: true })
		await writeFile(
			join(planningFolder, "Epics.index.json"),
			'{"version":1,"epics":[{"identity":"1","title":"One"}]}',
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
					request.rootDirectory === cwd &&
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
			JSON.stringify({ version: 1, epics: [{ identity: "1", title: "Foundation" }] }),
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
			artifactAbsolutePath: join(cwd, "artifact-allocation-project", "planning", "Epics.md"),
			parentIdentity: undefined,
			targetIdentity: undefined,
		})
		expect(epicsIndexResult).to.deep.include({
			artifactIdentity: "epics_index",
			artifactFilename: "Epics.index.json",
			artifactRelativePath: join("planning", "Epics.index.json"),
			artifactAbsolutePath: join(cwd, "artifact-allocation-project", "planning", "Epics.index.json"),
			parentIdentity: undefined,
			targetIdentity: undefined,
		})
		expect(deliverySpecResult).to.deep.include({
			artifactIdentity: "1",
			artifactFilename: "Epic-1-delivery-spec.md",
			artifactRelativePath: join("planning", "Epic-1-delivery-spec.md"),
			artifactAbsolutePath: join(cwd, "artifact-allocation-project", "planning", "Epic-1-delivery-spec.md"),
			parentIdentity: undefined,
			targetIdentity: undefined,
		})
		expect(storyResult).to.deep.include({
			artifactIdentity: "1.1",
			artifactFilename: "Story-1-1.md",
			artifactRelativePath: join("planning", "Story-1-1.md"),
			artifactAbsolutePath: join(cwd, "artifact-allocation-project", "planning", "Story-1-1.md"),
			parentIdentity: "1",
			targetIdentity: undefined,
		})
		expect(remediationStoryResult).to.deep.include({
			artifactIdentity: "1.1.1",
			artifactFilename: "Remediation-story-1-1-1.md",
			artifactRelativePath: join("planning", "Remediation-story-1-1-1.md"),
			artifactAbsolutePath: join(cwd, "artifact-allocation-project", "planning", "Remediation-story-1-1-1.md"),
			parentIdentity: "1.1",
			targetIdentity: undefined,
		})
		expect(reviewResult).to.deep.include({
			artifactIdentity: "1.1.1",
			artifactFilename: "Review-blind-hunter-1-1-1.md",
			artifactRelativePath: join("planning", "Review-blind-hunter-1-1-1.md"),
			artifactAbsolutePath: join(cwd, "artifact-allocation-project", "planning", "Review-blind-hunter-1-1-1.md"),
			parentIdentity: undefined,
			targetIdentity: "1.1.1",
		})
		expect(edgeCaseReviewResult).to.deep.include({
			artifactIdentity: "1.1.1",
			artifactFilename: "Review-edge-case-hunter-1-1-1.md",
			artifactRelativePath: join("planning", "Review-edge-case-hunter-1-1-1.md"),
			artifactAbsolutePath: join(cwd, "artifact-allocation-project", "planning", "Review-edge-case-hunter-1-1-1.md"),
			parentIdentity: undefined,
			targetIdentity: "1.1.1",
		})
		expect(adversarialReviewResult).to.deep.include({
			artifactIdentity: "1.1.1",
			artifactFilename: "Adversarial-review-1-1-1.md",
			artifactRelativePath: join("planning", "Adversarial-review-1-1-1.md"),
			artifactAbsolutePath: join(cwd, "artifact-allocation-project", "planning", "Adversarial-review-1-1-1.md"),
			parentIdentity: undefined,
			targetIdentity: "1.1.1",
		})
		expect(reviewInputMarkdownResult).to.deep.include({
			artifactIdentity: "1.1.1",
			artifactFilename: "Review-input-1-1-1.md",
			artifactRelativePath: join("planning", "Review-input-1-1-1.md"),
			artifactAbsolutePath: join(cwd, "artifact-allocation-project", "planning", "Review-input-1-1-1.md"),
			parentIdentity: undefined,
			targetIdentity: "1.1.1",
		})
		expect(reviewInputDiffResult).to.deep.include({
			artifactIdentity: "1.1.1",
			artifactFilename: "Review-input-1-1-1.diff",
			artifactRelativePath: join("planning", "Review-input-1-1-1.diff"),
			artifactAbsolutePath: join(cwd, "artifact-allocation-project", "planning", "Review-input-1-1-1.diff"),
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
			[epicsKeys.artifactAbsolutePath]: join(cwd, "artifact-allocation-project", "planning", "Epics.md"),
			[epicsIndexKeys.artifactFamily]: WorkflowArtifactFamily.EpicsIndex,
			[epicsIndexKeys.artifactIdentity]: "epics_index",
			[epicsIndexKeys.artifactFilename]: "Epics.index.json",
			[epicsIndexKeys.artifactRelativePath]: join("planning", "Epics.index.json"),
			[epicsIndexKeys.artifactAbsolutePath]: join(cwd, "artifact-allocation-project", "planning", "Epics.index.json"),
			[deliverySpecKeys.artifactFamily]: WorkflowArtifactFamily.EpicDeliverySpec,
			[deliverySpecKeys.artifactIdentity]: "1",
			[deliverySpecKeys.artifactFilename]: "Epic-1-delivery-spec.md",
			[deliverySpecKeys.artifactRelativePath]: join("planning", "Epic-1-delivery-spec.md"),
			[deliverySpecKeys.artifactAbsolutePath]: join(
				cwd,
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
		const artifactAbsolutePath = join(cwd, "brainstorming-artifact-project", "discovery", "brainstorming.md")

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

		const planningFolder = join(cwd, "convention-numbering-project", "planning")
		await writeFile(join(planningFolder, "Epics.md"), "# Epic 1 from markdown only\n", "utf8")
		await writeFile(
			join(planningFolder, "Epics.index.json"),
			JSON.stringify({
				version: 1,
				epics: [
					{ identity: "2", title: "Indexed Two" },
					{ identity: "10", title: "Indexed Ten" },
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
		const planningFolder = join(cwd, "story-parent-validation-project", "planning")
		await writeFile(
			join(planningFolder, "Epics.index.json"),
			'{"version":1,"epics":[{"identity":"1","title":"One"}]}',
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
			const planningFolder = join(cwd, getActiveWorkflowSession(state).projectSelection.projectFolderName, "planning")
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

		const deniedProjectFolderName = "denied-index-project"
		const deniedIndexPath = join(cwd, deniedProjectFolderName, "planning", "Epics.index.json")
		const deniedCase = await createDeliverySpecCase({
			projectTitle: "Denied Index Project",
			indexText: '{"version":1,"epics":[{"identity":"1","title":"One"}]}',
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

			const failureResult = await runtime.handleToolBackedOperationToolResult({
				taskState: missingIdentityState,
				toolResultText: "Error: required artifact identity was not found",
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
			expect((await runtime.resolveNextAction({ taskState: failureState })).kind).to.equal("execute_tool_backed_operation")

			const result = await runtime.handleToolBackedOperationToolResult({
				taskState: failureState,
				toolResultText,
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
		const allocatedArtifactAbsolutePath = join(cwd, "builder-project", "planning", "Epics.md")
		const moduleChosenAbsolutePath = join(cwd, "builder-project", "planning", "Module-chosen.md")
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

	it("routes serialized denied and errored document build tool results through tool_backed_operation_failed", async () => {
		const failureCases = [formatResponse.toolDenied(), formatResponse.toolError("boom")]

		for (const [failureCaseIndex, toolResultText] of failureCases.entries()) {
			const outputFileKeys = createStandaloneArtifactOutputValueKeys(`serialized_document_${failureCaseIndex}`)
			const allocatedArtifactAbsolutePath = join(
				cwd,
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

			const result = await runtime.handleToolBackedOperationToolResult({
				taskState: failureState,
				toolResultText,
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
