import { expect } from "chai"
import { mkdir, mkdtemp, readdir, readFile, rm } from "fs/promises"
import { afterEach, beforeEach, describe, it } from "mocha"
import { tmpdir } from "os"
import { join } from "path"
import sinon from "sinon"
import type { ToolUse } from "@/core/assistant-message"
import { ContextManager } from "@/core/context/context-management/ContextManager"
import type { TaskMetadata } from "@/core/context/context-tracking/ContextTrackerTypes"
import { FileContextTracker } from "@/core/context/context-tracking/FileContextTracker"
import { ClineIgnoreController } from "@/core/ignore/ClineIgnoreController"
import { CommandPermissionController } from "@/core/permissions"
import * as disk from "@/core/storage/disk"
import { StateManager } from "@/core/storage/StateManager"
import { Task } from "@/core/task"
import { MessageStateHandler } from "@/core/task/message-state"
import { TaskState } from "@/core/task/TaskState"
import { AutoApprove } from "@/core/task/tools/autoApprove"
import { getBackendWorkflowToolContract } from "@/core/task/tools/backendWorkflowToolContracts"
import { BuildWorkflowDocumentToolHandler } from "@/core/task/tools/handlers/BuildWorkflowDocumentToolHandler"
import { CreateWorkflowArtifactToolHandler } from "@/core/task/tools/handlers/CreateWorkflowArtifactToolHandler"
import { ResponseToolRegistry } from "@/core/task/tools/response/ResponseToolRegistry"
import { ToolExecutorCoordinator } from "@/core/task/tools/ToolExecutorCoordinator"
import { ToolValidator } from "@/core/task/tools/ToolValidator"
import type { TaskConfig } from "@/core/task/tools/types/TaskConfig"
import { ToolResultUtils } from "@/core/task/tools/utils"
import type { WorkflowFormSessionState } from "@/core/task/workflow-form/types"
import { WorkflowArtifactFamily } from "@/core/task/workflow-runtime/artifactFamilies"
import type {
	PersistedWorkflowSession,
	ShippedWorkflowMetadata,
	WorkflowDefinition,
	WorkflowEntryArtifactResolution,
	WorkflowNextAction,
	WorkflowPromptProjection,
	WorkflowWorkspacePathPolicy,
} from "@/core/task/workflow-runtime/types"
import * as WorkflowRegistry from "@/core/task/workflow-runtime/WorkflowRegistry"
import { WorkflowRuntime } from "@/core/task/workflow-runtime/WorkflowRuntime"
import { brainstormingWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/brainstorming"
import { buildInitialBrainstormingDocument } from "@/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingDocument"
import { createEpicsWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/create-epics"
import { DiffViewProvider } from "@/integrations/editor/DiffViewProvider"
import { BrowserSession } from "@/services/browser/BrowserSession"
import { UrlContentFetcher } from "@/services/browser/UrlContentFetcher"
import { McpHub } from "@/services/mcp/McpHub"
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@/shared/AutoApprovalSettings"
import { DEFAULT_BROWSER_SETTINGS } from "@/shared/BrowserSettings"
import type { AwaitingUserResponseSubtype, ThreadDisplayState } from "@/shared/ExtensionMessage"
import { DEFAULT_FOCUS_CHAIN_SETTINGS } from "@/shared/FocusChainSettings"
import type { ClineContent } from "@/shared/messages"
import { ApiFormat } from "@/shared/proto/cline/models"
import { WorkflowFormAction, type WorkflowFormSubmissionRequest } from "@/shared/proto/cline/task"
import { ClineDefaultTool } from "@/shared/tools"
import * as pathUtils from "@/utils/path"

function createPersistedSession(): PersistedWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues: {},
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Persisted Project",
			projectFolderName: "persisted-project",
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
		entryArtifactResolution: undefined,
		prerequisiteFileResolutions: [],
		ui: {
			formSession: undefined,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: {
			activeBranchId: "project-prompt",
		},
	}
}

function createValidEntryArtifactResolution(): WorkflowEntryArtifactResolution {
	return {
		artifactId: "epics_doc",
		artifactFamily: WorkflowArtifactFamily.Epics,
		artifactIdentity: "epics",
		artifactFilename: "Epics.md",
		artifactRelativePath: "planning/Epics.md",
		artifactAbsolutePath: "/tmp/docs/projects/persisted-project/planning/Epics.md",
		creationRequired: false,
		existingArtifactAction: "continue_existing",
	}
}

const CREATE_EPICS_METADATA_OUTPUT_FILE = "/tmp/docs/projects/create-epics-session/planning/Epics.md"
const CREATE_EPICS_METADATA_INDEX_FILE = "/tmp/docs/projects/create-epics-session/planning/Epics.index.json"

function createPersistedCreateEpicsSession(): PersistedWorkflowSession {
	return {
		activeStepNumber: 2,
		workflowValues: {
			output_file: CREATE_EPICS_METADATA_OUTPUT_FILE,
			epics_index_file: CREATE_EPICS_METADATA_INDEX_FILE,
			architecture_document: "/tmp/docs/projects/create-epics-session/planning/architecture.md",
			brainstorming_document: "/tmp/docs/projects/create-epics-session/discovery/brainstorming.md",
			additional_context_files: "/tmp/docs/projects/create-epics-session/planning/domain-notes.md",
		},
		projectSelection: {
			projectMode: "new",
			projectTitle: "Create Epics Session",
			projectFolderName: "create-epics-session",
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
		entryArtifactResolution: undefined,
		prerequisiteFileResolutions: [],
		ui: {
			formSession: undefined,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: {
			activeBranchId: createEpicsWorkflowDefinition.steps["step-2"].decisionTree.entryBranchId,
		},
	}
}

function createMetadataRestoreWorkflow(): WorkflowDefinition {
	return {
		name: "workflow-runtime-metadata-restore-test",
		displayName: "Workflow Runtime Metadata Restore Test",
		description: "A minimal workflow fixture for metadata restore validation.",
		slashCommandName: "workflow-runtime-metadata-restore-test",
		useSkillName: "workflow-runtime-metadata-restore-test",
		persona: {
			name: "Metadata Mary",
			role: "Runtime metadata tester",
			identity: "Metadata Mary validates workflow metadata restore behavior.",
			capabilities: ["metadata restore validation"],
			communicationStyle: "Direct and deterministic.",
			principles: ["Keep persisted workflow state canonical."],
		},
		projectSelection: { kind: "interactive" },
		projectOutputPlacement: { kind: "selected_project_subfolder", subfolder: "planning" },
		workflowValueKeys: ["entry_project_mode", "entry_project_title", "entry_project_folder_name"],
		entryProjectValueKeys: {
			projectMode: "entry_project_mode",
			projectTitle: "entry_project_title",
			projectFolderName: "entry_project_folder_name",
		},
		entryPanel: {
			promptMarkdown: "Restore metadata workflow.",
		},
		steps: {
			"step-1": {
				id: "step-1",
				stepNumber: 1,
				checklistLabel: "Restore metadata",
				promptTemplates: ["Restore metadata."],
				buildPromptSource: () => ({
					kind: "current_step_instruction_template",
					currentStepInstructionTemplate: "Restore metadata.",
				}),
				buildToolSchema: () => [],
				decisionTree: {
					entryBranchId: "project-prompt",
					branches: {
						"project-prompt": {
							id: "project-prompt",
							routes: [
								{
									id: "project-prompt-route",
									trigger: { kind: "always" },
									action: { kind: "project_prompt" },
								},
							],
						},
					},
				},
			},
		},
		workflowForms: {},
	}
}

function createMetadata(): TaskMetadata {
	return {
		files_in_context: [],
		model_usage: [],
		environment_history: [],
	}
}

function expectNoRetiredStoryPromptMetadataKeys(value: object): void {
	expect(Object.hasOwn(value, "activeStoryTaskId")).to.equal(false)
	expect(Object.hasOwn(value, "activeStorySubtaskIds")).to.equal(false)
	expect(Object.hasOwn(value, "lastPromptedStoryTaskKey")).to.equal(false)
}

function createAllowAllWorkspacePathPolicy(): WorkflowWorkspacePathPolicy {
	return {
		validateAccess: () => true,
	}
}

function createEmptyWorkflowPromptProjection(): WorkflowPromptProjection {
	return {
		workflowInputPayloadBlock: undefined,
		continuationWorkflowInputPayloadBlock: undefined,
		workflowToolSchemaOverride: undefined,
	}
}

interface RealBrainstormingRuntimeHarness {
	cwd: string
	taskState: TaskState
	workflowRuntime: WorkflowRuntime
	coordinator: ToolExecutorCoordinator
	cleanup(): Promise<void>
}

async function createRealBrainstormingRuntimeHarness(sandbox: sinon.SinonSandbox): Promise<RealBrainstormingRuntimeHarness> {
	const cwd = await mkdtemp(join(tmpdir(), "workflow-runtime-real-brainstorming-"))
	await mkdir(cwd, { recursive: true })
	sandbox
		.stub(WorkflowRegistry, "resolveWorkflowDefinition")
		.callsFake((workflowName: string) =>
			workflowName === brainstormingWorkflowDefinition.name ? brainstormingWorkflowDefinition : undefined,
		)
	const workflowRuntime = new WorkflowRuntime({
		cwd,
		workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
	})
	const taskState = new TaskState()
	const coordinator = new ToolExecutorCoordinator()
	const toolValidator = new ToolValidator(new ClineIgnoreController(cwd))
	coordinator.register(new CreateWorkflowArtifactToolHandler(toolValidator))
	coordinator.register(new BuildWorkflowDocumentToolHandler(toolValidator))

	return {
		cwd,
		taskState,
		workflowRuntime,
		coordinator,
		cleanup: async () => {
			await rm(cwd, { recursive: true, force: true })
		},
	}
}

class TestDiffViewProvider extends DiffViewProvider {
	protected async openDiffEditor(): Promise<void> {}

	protected async scrollEditorToLine(_line: number): Promise<void> {}

	protected async scrollAnimation(_startLine: number, _endLine: number): Promise<void> {}

	protected async truncateDocument(_lineNumber: number): Promise<void> {}

	protected async getDocumentLineCount(): Promise<number> {
		return 0
	}

	protected async getDocumentText(): Promise<string | undefined> {
		return undefined
	}

	protected async saveDocument(): Promise<boolean> {
		return true
	}

	protected async closeAllDiffViews(): Promise<void> {}

	protected async resetDiffView(): Promise<void> {}

	async replaceText(
		_content: string,
		_rangeToReplace: { startLine: number; endLine: number },
		_currentLine: number | undefined,
	): Promise<void> {}
}

function createRealWorkflowHandlerTaskConfig(args: {
	taskState: TaskState
	workflowRuntime: WorkflowRuntime
	coordinator: ToolExecutorCoordinator
	cwd: string
}): TaskConfig {
	const browserSession = sinon.createStubInstance(BrowserSession)
	const stateManager = sinon.createStubInstance(StateManager)
	stateManager.getGlobalSettingsKey.withArgs("hooksEnabled").returns(false)
	const autoApprover = sinon.createStubInstance(AutoApprove)
	autoApprover.shouldAutoApproveTool.returns([true, true])
	const autoApprovalSettings = {
		...DEFAULT_AUTO_APPROVAL_SETTINGS,
		enableNotifications: false,
	}
	const browserSettings = {
		...DEFAULT_BROWSER_SETTINGS,
		viewport: { ...DEFAULT_BROWSER_SETTINGS.viewport },
	}
	const messageState = new MessageStateHandler({
		taskId: "task-1",
		ulid: "ulid-1",
		taskState: args.taskState,
		updateTaskHistory: async () => [],
	})

	return {
		taskId: "task-1",
		ulid: "ulid-1",
		cwd: args.cwd,
		mode: "act",
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		doubleCheckCompletionEnabled: false,
		vscodeTerminalExecutionMode: "backgroundExec",
		enableParallelToolCalling: false,
		isSubagentExecution: false,
		taskState: args.taskState,
		messageState,
		api: {
			getModel: () => ({
				id: "anthropic/claude-sonnet-4.5",
				info: {
					contextWindow: 200_000,
					apiFormat: ApiFormat.ANTHROPIC_CHAT,
					supportsPromptCache: true,
				},
			}),
			createMessage: sinon.stub().callsFake(async function* (): AsyncGenerator<never, void, unknown> {}),
		},
		services: {
			mcpHub: sinon.createStubInstance(McpHub),
			browserSession,
			urlContentFetcher: sinon.createStubInstance(UrlContentFetcher),
			diffViewProvider: new TestDiffViewProvider(),
			fileContextTracker: sinon.createStubInstance(FileContextTracker),
			clineIgnoreController: new ClineIgnoreController(args.cwd),
			commandPermissionController: sinon.createStubInstance(CommandPermissionController),
			contextManager: new ContextManager(),
			stateManager,
		},
		autoApprovalSettings,
		autoApprover,
		browserSettings,
		focusChainSettings: { ...DEFAULT_FOCUS_CHAIN_SETTINGS },
		callbacks: {
			say: async () => undefined,
			ask: async () => ({ response: "yesButtonClicked" }),
			saveCheckpoint: async () => undefined,
			sayAndCreateMissingParamError: async () => "missing",
			removeLastPartialMessageIfExistsWithType: async () => undefined,
			upsertPartialResponseToolSayPreview: async () => false,
			clearPartialResponseToolPreview: async () => false,
			executeCommandTool: async (): Promise<[boolean, string]> => [false, "ok"],
			cancelRunningCommandTool: async () => false,
			doesLatestTaskCompletionHaveNewChanges: async () => false,
			updateFCListFromToolResponse: async () => ({ accepted: true }),
			queueWorkflowNextAction: () => undefined,
			shouldAutoApproveTool: (): [boolean, boolean] => [true, true],
			shouldAutoApproveToolWithPath: async () => true,
			postStateToWebview: async () => undefined,
			reinitExistingTaskFromId: async () => undefined,
			cancelTask: async () => undefined,
			updateTaskHistory: async () => [],
			applyLatestBrowserSettings: async () => browserSession,
			switchToActMode: async () => false,
			setActiveHookExecution: async () => undefined,
			clearActiveHookExecution: async () => undefined,
			getActiveHookExecution: async () => undefined,
			runUserPromptSubmitHook: async () => ({}),
		},
		workflowRuntime: args.workflowRuntime,
		coordinator: args.coordinator,
	}
}

function createWorkflowFormSession(): WorkflowFormSessionState {
	return {
		sessionId: "workflow-form-session-1",
		workflowFormId: "workflow-form-1",
		definitionVersion: 1,
		definitionPayload: {
			definitionVersion: 1,
			title: "Workflow Form",
			toolDictionaryTitle: "Tools",
			toolDictionaryMarkdown: "",
			firstPanelId: "panel-1",
			panels: {
				"panel-1": {
					panelId: "panel-1",
					title: "Panel",
					promptMarkdown: "Panel prompt",
					fields: [],
					allowedActions: [],
					transition: {
						type: "conditional",
						conditionSourceKey: "done",
						branches: [],
						defaultTerminal: true,
					},
				},
			},
		},
		firstPanelId: "panel-1",
		currentPanelId: "panel-1",
		values: {},
		data: {},
	}
}

function createWorkflowFormSubmissionRequest(sessionId: string): WorkflowFormSubmissionRequest {
	return {
		metadata: undefined,
		sessionId,
		panelId: "panel-1",
		action: WorkflowFormAction.SUBMIT,
		fields: [],
	}
}

function createTaskHarness(
	taskState = new TaskState(),
	workflowRuntime = new WorkflowRuntime({ cwd: "/tmp", workspacePathPolicy: createAllowAllWorkspacePathPolicy() }),
): object {
	const task = Object.create(Task.prototype)
	Reflect.set(task, "taskId", "task-1")
	Reflect.set(task, "taskState", taskState)
	Reflect.set(task, "workflowRuntime", workflowRuntime)
	Reflect.set(
		task,
		"workflowFormSubmissionNextActionResolvers",
		new Map<string, (nextAction: WorkflowNextAction | undefined) => void>(),
	)
	return task
}

async function callTaskMethod(task: object, methodName: string, ...args: unknown[]): Promise<void> {
	const method = Reflect.get(task, methodName)
	if (typeof method !== "function") {
		throw new Error(`Task method ${methodName} is not available.`)
	}

	await Reflect.apply(method, task, args)
}

function callTaskMethodResult(task: object, methodName: string, ...args: unknown[]): unknown {
	const method = Reflect.get(task, methodName)
	if (typeof method !== "function") {
		throw new Error(`Task method ${methodName} is not available.`)
	}

	return Reflect.apply(method, task, args)
}

describe("workflow runtime metadata persistence", () => {
	let sandbox: sinon.SinonSandbox

	beforeEach(() => {
		sandbox = sinon.createSandbox()
	})

	afterEach(() => {
		sandbox.restore()
	})

	it("exposes Document Project through the shipped workflow metadata contract", () => {
		const registeredDefinition = WorkflowRegistry.resolveWorkflowDefinition("document-project")
		expect(registeredDefinition).to.not.equal(undefined)
		if (registeredDefinition === undefined) {
			throw new Error("Expected registered document-project workflow definition.")
		}

		const metadata = {
			name: registeredDefinition.name,
			displayName: registeredDefinition.displayName,
			description: registeredDefinition.description,
			persona: registeredDefinition.persona,
			projectSelection: registeredDefinition.projectSelection,
			projectOutputPlacement: registeredDefinition.projectOutputPlacement,
		} satisfies ShippedWorkflowMetadata

		expect(metadata.projectSelection).to.deep.equal({
			kind: "automatic_fixed",
			projectTitle: "Agent Guidance",
			projectFolderName: "agent-guidance",
		})
		expect(metadata.projectOutputPlacement).to.deep.equal({ kind: "selected_project_root" })
		expect(Object.hasOwn(metadata, "entryProjectValueKeys")).to.equal(false)
		expect(Object.hasOwn(metadata, "projectSubfolder")).to.equal(false)
	})

	it("persists cleared workflow metadata when invalid persisted sessions require teardown cleanup", async () => {
		const metadata = createMetadata()
		metadata.activeWorkflowName = "missing-workflow"
		metadata.activeWorkflowSession = createPersistedSession()
		const saveMetadata = sandbox.stub(disk, "saveTaskMetadata").resolves()
		sandbox.stub(WorkflowRegistry, "resolveWorkflowDefinition").returns(undefined)
		const task = createTaskHarness()
		const consumeWorkflowNextAction = sandbox.stub().resolves()
		Reflect.set(task, "consumeWorkflowNextAction", consumeWorkflowNextAction)

		await callTaskMethod(task, "restoreWorkflowRuntimeStateFromMetadata", metadata)

		sinon.assert.calledOnce(saveMetadata)
		sinon.assert.notCalled(consumeWorkflowNextAction)
		expect(metadata.activeWorkflowName).to.equal(undefined)
		expect(metadata.activeWorkflowSession).to.equal(undefined)
		expect(saveMetadata.firstCall.args[0]).to.equal("task-1")
		expect(saveMetadata.firstCall.args[1].activeWorkflowName).to.equal(undefined)
		expect(saveMetadata.firstCall.args[1].activeWorkflowSession).to.equal(undefined)
	})

	it("consumes non-no_op workflow next actions returned while restoring persisted sessions", async () => {
		const metadata = createMetadata()
		metadata.activeWorkflowName = "workflow-runtime-test"
		metadata.activeWorkflowSession = createPersistedSession()
		const nextAction: WorkflowNextAction = {
			kind: "project_prompt",
			promptProjection: createEmptyWorkflowPromptProjection(),
		}
		const workflowRuntime = new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const restorePersistedSession = sandbox.stub(workflowRuntime, "restorePersistedSession").resolves(nextAction)
		const task = createTaskHarness(new TaskState(), workflowRuntime)
		const consumeWorkflowNextAction = sandbox.stub().resolves()
		Reflect.set(task, "consumeWorkflowNextAction", consumeWorkflowNextAction)
		const saveMetadata = sandbox.stub(disk, "saveTaskMetadata").resolves()

		await callTaskMethod(task, "restoreWorkflowRuntimeStateFromMetadata", metadata)

		sinon.assert.calledOnceWithExactly(restorePersistedSession, {
			taskState: Reflect.get(task, "taskState"),
			persistedSession: metadata.activeWorkflowSession,
		})
		sinon.assert.calledOnceWithExactly(consumeWorkflowNextAction, nextAction)
		sinon.assert.notCalled(saveMetadata)
	})

	it("does not consume undefined or no_op restore results", async () => {
		const saveMetadata = sandbox.stub(disk, "saveTaskMetadata").resolves()
		const restoreResultCases: Array<{
			name: string
			restoreResult: WorkflowNextAction | undefined
		}> = [
			{
				name: "undefined",
				restoreResult: undefined,
			},
			{
				name: "no_op",
				restoreResult: { kind: "no_op" },
			},
		]

		for (const restoreResultCase of restoreResultCases) {
			const metadata = createMetadata()
			metadata.activeWorkflowName = "workflow-runtime-test"
			metadata.activeWorkflowSession = createPersistedSession()
			const workflowRuntime = new WorkflowRuntime({
				cwd: "/tmp",
				workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
			})
			sandbox.stub(workflowRuntime, "restorePersistedSession").resolves(restoreResultCase.restoreResult)
			const task = createTaskHarness(new TaskState(), workflowRuntime)
			const consumeWorkflowNextAction = sandbox.stub().resolves()
			Reflect.set(task, "consumeWorkflowNextAction", consumeWorkflowNextAction)

			await callTaskMethod(task, "restoreWorkflowRuntimeStateFromMetadata", metadata)

			sinon.assert.notCalled(consumeWorkflowNextAction)
			sinon.assert.notCalled(saveMetadata)
			saveMetadata.resetHistory()
		}
	})

	it("restores valid persisted entry artifact resolution state from metadata", async () => {
		const workflow = createMetadataRestoreWorkflow()
		const entryArtifactResolution = {
			artifactResolutions: [createValidEntryArtifactResolution()],
			pendingFileOperation: undefined,
		}
		const metadata = createMetadata()
		metadata.activeWorkflowName = workflow.name
		metadata.activeWorkflowSession = {
			...createPersistedSession(),
			entryArtifactResolution,
		}
		const workflowRuntime = new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const resolveNextAction = sandbox.stub(workflowRuntime, "resolveNextAction").resolves({ kind: "no_op" })
		sandbox.stub(WorkflowRegistry, "resolveWorkflowDefinition").returns(workflow)
		const taskState = new TaskState()
		const task = createTaskHarness(taskState, workflowRuntime)
		const saveMetadata = sandbox.stub(disk, "saveTaskMetadata").resolves()

		await callTaskMethod(task, "restoreWorkflowRuntimeStateFromMetadata", metadata)

		sinon.assert.calledOnce(resolveNextAction)
		sinon.assert.notCalled(saveMetadata)
		expect(taskState.activeWorkflowName).to.equal(workflow.name)
		const restoredSession = taskState.activeWorkflowSession
		expect(restoredSession).to.not.equal(undefined)
		if (restoredSession === undefined) {
			throw new Error("Expected restored workflow session.")
		}
		expect(restoredSession.entryArtifactResolution).to.deep.equal(entryArtifactResolution)
	})

	it("persists teardown when persisted entry artifact resolution state is malformed", async () => {
		const workflow = createMetadataRestoreWorkflow()
		const metadata = createMetadata()
		const malformedSession = createPersistedSession()
		Reflect.set(malformedSession, "entryArtifactResolution", {
			artifactResolutions: "not-an-array",
			pendingFileOperation: undefined,
		})
		metadata.activeWorkflowName = workflow.name
		metadata.activeWorkflowSession = malformedSession
		const workflowRuntime = new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const resolveNextAction = sandbox.stub(workflowRuntime, "resolveNextAction").resolves({ kind: "no_op" })
		sandbox.stub(WorkflowRegistry, "resolveWorkflowDefinition").returns(workflow)
		const taskState = new TaskState()
		const task = createTaskHarness(taskState, workflowRuntime)
		const saveMetadata = sandbox.stub(disk, "saveTaskMetadata").resolves()

		await callTaskMethod(task, "restoreWorkflowRuntimeStateFromMetadata", metadata)

		sinon.assert.notCalled(resolveNextAction)
		sinon.assert.calledOnce(saveMetadata)
		expect(taskState.activeWorkflowName).to.equal(undefined)
		expect(taskState.activeWorkflowSession).to.equal(undefined)
		expect(metadata.activeWorkflowName).to.equal(undefined)
		expect(metadata.activeWorkflowSession).to.equal(undefined)
		expect(saveMetadata.firstCall.args[0]).to.equal("task-1")
		expect(saveMetadata.firstCall.args[1].activeWorkflowName).to.equal(undefined)
		expect(saveMetadata.firstCall.args[1].activeWorkflowSession).to.equal(undefined)
	})

	it("persists teardown when persisted lifecycle state is missing or malformed", async () => {
		const workflow = createMetadataRestoreWorkflow()
		const invalidLifecycleCases: Array<{
			name: string
			createSession(): PersistedWorkflowSession
		}> = [
			{
				name: "missing lifecycle",
				createSession: () => {
					const session = createPersistedSession()
					Reflect.deleteProperty(session, "lifecycle")
					return session
				},
			},
			{
				name: "malformed lifecycle completion flag",
				createSession: () => {
					const session = createPersistedSession()
					Reflect.set(session, "lifecycle", { projectSelectionCompleted: "yes" })
					return session
				},
			},
		]
		sandbox.stub(WorkflowRegistry, "resolveWorkflowDefinition").returns(workflow)
		const saveMetadata = sandbox.stub(disk, "saveTaskMetadata").resolves()

		for (const invalidLifecycleCase of invalidLifecycleCases) {
			const metadata = createMetadata()
			metadata.activeWorkflowName = workflow.name
			metadata.activeWorkflowSession = invalidLifecycleCase.createSession()
			const workflowRuntime = new WorkflowRuntime({
				cwd: "/tmp",
				workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
			})
			const resolveNextAction = sandbox.stub(workflowRuntime, "resolveNextAction").resolves({ kind: "no_op" })
			const taskState = new TaskState()
			const task = createTaskHarness(taskState, workflowRuntime)

			await callTaskMethod(task, "restoreWorkflowRuntimeStateFromMetadata", metadata)

			sinon.assert.notCalled(resolveNextAction)
			sinon.assert.calledOnce(saveMetadata)
			expect(taskState.activeWorkflowName, invalidLifecycleCase.name).to.equal(undefined)
			expect(taskState.activeWorkflowSession, invalidLifecycleCase.name).to.equal(undefined)
			expect(metadata.activeWorkflowName, invalidLifecycleCase.name).to.equal(undefined)
			expect(metadata.activeWorkflowSession, invalidLifecycleCase.name).to.equal(undefined)
			expect(saveMetadata.firstCall.args[0], invalidLifecycleCase.name).to.equal("task-1")
			expect(saveMetadata.firstCall.args[1].activeWorkflowName, invalidLifecycleCase.name).to.equal(undefined)
			expect(saveMetadata.firstCall.args[1].activeWorkflowSession, invalidLifecycleCase.name).to.equal(undefined)
			saveMetadata.resetHistory()
		}
	})

	it("persists cleared workflow metadata when persisted sessions are missing canonical workflow identity", async () => {
		const metadata = createMetadata()
		metadata.activeWorkflowSession = createPersistedSession()
		const saveMetadata = sandbox.stub(disk, "saveTaskMetadata").resolves()

		await callTaskMethod(createTaskHarness(), "restoreWorkflowRuntimeStateFromMetadata", metadata)

		sinon.assert.calledOnce(saveMetadata)
		expect(metadata.activeWorkflowName).to.equal(undefined)
		expect(metadata.activeWorkflowSession).to.equal(undefined)
		expect(saveMetadata.firstCall.args[0]).to.equal("task-1")
		expect(saveMetadata.firstCall.args[1].activeWorkflowName).to.equal(undefined)
		expect(saveMetadata.firstCall.args[1].activeWorkflowSession).to.equal(undefined)
	})

	it("persists create-epics workflow metadata without md workflow identity aliases", async () => {
		const taskState = new TaskState()
		taskState.activeWorkflowName = createEpicsWorkflowDefinition.name
		taskState.activeWorkflowSession = createPersistedCreateEpicsSession()
		const metadata = createMetadata()
		sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
		const saveMetadata = sandbox.stub(disk, "saveTaskMetadata").resolves()
		const workflowRuntime = new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const task = createTaskHarness(taskState, workflowRuntime)

		await callTaskMethod(task, "persistWorkflowRuntimeMetadata")

		sinon.assert.calledOnce(saveMetadata)
		const savedMetadata = saveMetadata.firstCall.args[1]
		expect(savedMetadata.activeWorkflowName).to.equal("create-epics")
		expectNoRetiredStoryPromptMetadataKeys(savedMetadata)
		expect(JSON.stringify(savedMetadata)).to.not.contain("create-epics.md")
		const savedSession = savedMetadata.activeWorkflowSession
		expect(savedSession).to.not.equal(undefined)
		if (savedSession === undefined) {
			throw new Error("Expected create-epics metadata session to be persisted.")
		}
		expect(savedSession.workflowValues.output_file).to.equal(CREATE_EPICS_METADATA_OUTPUT_FILE)
		expect(savedSession.workflowValues.epics_index_file).to.equal(CREATE_EPICS_METADATA_INDEX_FILE)

		saveMetadata.resetHistory()
		const restoredTaskState = new TaskState()
		const restoreRuntime = new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const restoreTask = createTaskHarness(restoredTaskState, restoreRuntime)
		const consumeWorkflowNextAction = sandbox.stub().resolves()
		Reflect.set(restoreTask, "consumeWorkflowNextAction", consumeWorkflowNextAction)

		await callTaskMethod(restoreTask, "restoreWorkflowRuntimeStateFromMetadata", savedMetadata)

		sinon.assert.notCalled(saveMetadata)
		expect(restoredTaskState.activeWorkflowName).to.equal("create-epics")
		expectNoRetiredStoryPromptMetadataKeys(restoredTaskState)
		const restoredSession = restoredTaskState.activeWorkflowSession
		expect(restoredSession).to.not.equal(undefined)
		if (restoredSession === undefined) {
			throw new Error("Expected create-epics metadata session to be restored.")
		}
		expect(restoredSession.workflowValues.output_file).to.equal(CREATE_EPICS_METADATA_OUTPUT_FILE)
		expect(restoredSession.workflowValues.epics_index_file).to.equal(CREATE_EPICS_METADATA_INDEX_FILE)

		const workflowProjection = await restoreRuntime.buildTurnProjection({
			taskState: restoredTaskState,
			isFirstTaskRequest: true,
		})
		const workflowInputPayloadBlock = workflowProjection.workflowInputPayloadBlock
		expect(workflowInputPayloadBlock).to.not.equal(undefined)
		if (workflowInputPayloadBlock === undefined) {
			throw new Error("Expected create-epics workflow input payload after metadata restore.")
		}
		expect(workflowInputPayloadBlock).to.contain("Workflow:\nCreate Epics")
		expect(workflowInputPayloadBlock).to.contain("Name: John")
		expect(workflowInputPayloadBlock).to.contain("Role: Product Manager")
		expect(workflowInputPayloadBlock).to.contain("1. Gather Inputs - Complete")
		expect(workflowInputPayloadBlock).to.contain("2. Draft Epics - Active")
		expect(workflowInputPayloadBlock).to.contain(CREATE_EPICS_METADATA_OUTPUT_FILE)
		expect(workflowInputPayloadBlock).to.not.contain("create-epics.md")

		saveMetadata.resetHistory()
		const aliasMetadata = createMetadata()
		aliasMetadata.activeWorkflowName = "create-epics.md"
		aliasMetadata.activeWorkflowSession = createPersistedCreateEpicsSession()
		const aliasTaskState = new TaskState()
		const aliasTask = createTaskHarness(
			aliasTaskState,
			new WorkflowRuntime({
				cwd: "/tmp",
				workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
			}),
		)

		await callTaskMethod(aliasTask, "restoreWorkflowRuntimeStateFromMetadata", aliasMetadata)

		sinon.assert.calledOnce(saveMetadata)
		expect(aliasTaskState.activeWorkflowName).to.equal(undefined)
		expect(aliasTaskState.activeWorkflowSession).to.equal(undefined)
		expect(aliasMetadata.activeWorkflowName).to.equal(undefined)
		expect(aliasMetadata.activeWorkflowSession).to.equal(undefined)
	})

	it("persists explicit teardown next actions and keeps true no_op actions non-persisting", async () => {
		const metadata = createMetadata()
		metadata.activeWorkflowName = "workflow-runtime-test"
		metadata.activeWorkflowSession = createPersistedSession()
		const getMetadata = sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
		const saveMetadata = sandbox.stub(disk, "saveTaskMetadata").resolves()
		const task = createTaskHarness()

		await callTaskMethod(task, "consumeWorkflowNextAction", { kind: "persist_workflow_teardown" })

		sinon.assert.calledOnce(getMetadata)
		sinon.assert.calledOnce(saveMetadata)
		expect(saveMetadata.firstCall.args[1].activeWorkflowName).to.equal(undefined)
		expect(saveMetadata.firstCall.args[1].activeWorkflowSession).to.equal(undefined)

		getMetadata.resetHistory()
		saveMetadata.resetHistory()

		await callTaskMethod(task, "consumeWorkflowNextAction", { kind: "no_op" })

		sinon.assert.notCalled(getMetadata)
		sinon.assert.notCalled(saveMetadata)
	})

	it("consumes workflow next actions returned from normal tool execution", async () => {
		const taskState = new TaskState()
		const returnedNextAction: WorkflowNextAction = {
			kind: "project_prompt",
			promptProjection: createEmptyWorkflowPromptProjection(),
		}
		taskState.assistantMessageContent = [
			{
				type: "tool_use",
				name: ClineDefaultTool.FILE_READ,
				params: { path: "README.md" },
				partial: false,
			},
		]
		taskState.didCompleteReadingStream = true
		const executeTool = sandbox.stub().resolves({
			status: "executed",
			emittedToolResult: true,
			workflowNextActions: [returnedNextAction],
		})
		const consumeWorkflowNextAction = sandbox.stub().resolves()
		const task = createTaskHarness(taskState)
		Reflect.set(task, "toolExecutor", { executeTool })
		Reflect.set(task, "consumeWorkflowNextAction", consumeWorkflowNextAction)
		Reflect.set(task, "isParallelToolCallingEnabled", () => true)

		await callTaskMethod(task, "presentAssistantMessage")

		sinon.assert.calledOnce(executeTool)
		expect(executeTool.firstCall.args[0]).to.deep.equal(taskState.assistantMessageContent[0])
		sinon.assert.calledOnceWithExactly(consumeWorkflowNextAction, returnedNextAction)
	})

	it("declares backend workflow tool contracts for story planning tools", () => {
		expect(getBackendWorkflowToolContract(ClineDefaultTool.PLAN_STORY_ARTIFACTS)).to.deep.include({
			id: ClineDefaultTool.PLAN_STORY_ARTIFACTS,
			name: "plan_story_artifacts",
		})
		expect(getBackendWorkflowToolContract(ClineDefaultTool.PLAN_STORY_ARTIFACTS)?.parameters).to.deep.include.members([
			{
				name: "epic_identity",
				required: true,
				type: "string",
				description: "Positive numeric epic identity for the story inventory sidecar.",
			},
			{
				name: "story_count",
				required: true,
				type: "number",
				description: "Positive story count to plan as primary stories for the selected epic.",
			},
		])
		expect(getBackendWorkflowToolContract(ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT)).to.deep.include({
			id: ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT,
			name: "plan_remediation_story_artifact",
		})
		expect(
			getBackendWorkflowToolContract(ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT)?.parameters,
		).to.deep.include.members([
			{
				name: "epic_identity",
				required: true,
				type: "string",
				description: "Positive numeric epic identity for the story inventory sidecar.",
			},
			{
				name: "target_story_identity",
				required: true,
				type: "string",
				description: "Existing primary story identity that will own the remediation story.",
			},
		])
		expect(getBackendWorkflowToolContract(ClineDefaultTool.GENERATE_STORY_FILES)).to.deep.include({
			id: ClineDefaultTool.GENERATE_STORY_FILES,
			name: "generate_story_files",
		})
		expect(getBackendWorkflowToolContract(ClineDefaultTool.GENERATE_STORY_FILES)?.parameters).to.deep.equal([
			{
				name: "epic_identity",
				required: true,
				type: "string",
				description: "Positive numeric epic identity for the story inventory sidecar.",
			},
		])
		expect(getBackendWorkflowToolContract(ClineDefaultTool.UPDATE_STORY_INDEX_STATUS)).to.deep.include({
			id: ClineDefaultTool.UPDATE_STORY_INDEX_STATUS,
			name: "update_story_index_status",
		})
		expect(getBackendWorkflowToolContract(ClineDefaultTool.UPDATE_STORY_INDEX_STATUS)?.parameters).to.deep.equal([
			{
				name: "stories_index",
				required: true,
				type: "string",
				description: "Resolved absolute story index path prepared upstream by WorkflowRuntime.",
			},
			{
				name: "story_identity",
				required: true,
				type: "string",
				description: "Existing story identity whose status will be updated.",
			},
			{
				name: "status",
				required: true,
				type: "string",
				description: "New story status: draft, backlog, review, or complete.",
			},
			{
				name: "expected_current_status",
				required: false,
				type: "string",
				description: "Optional expected current story status to enforce before updating.",
			},
		])
		expect(ResponseToolRegistry.get(ClineDefaultTool.UPDATE_STORY_INDEX_STATUS)).to.equal(undefined)
		expect(ResponseToolRegistry.isResponseTool(ClineDefaultTool.UPDATE_STORY_INDEX_STATUS)).to.equal(false)
	})

	it("declares record_findings as a backend non-response workflow tool", () => {
		const contract = getBackendWorkflowToolContract(ClineDefaultTool.RECORD_FINDINGS)

		if (contract === undefined) {
			throw new Error("Expected record_findings backend workflow tool contract")
		}

		expect(contract).to.deep.include({
			id: ClineDefaultTool.RECORD_FINDINGS,
			name: "record_findings",
		})
		expect(contract.parameters).to.deep.equal([
			{
				name: "findings",
				required: true,
				type: "array",
				description: "Code-review findings to append to the governed findings document.",
				items: {
					type: "object",
					properties: {
						finding: { type: "string" },
						categories: {
							type: "array",
							items: { type: "string" },
						},
						description: { type: "string" },
					},
					requiredProperties: ["finding", "categories", "description"],
				},
			},
		])
		expect(ResponseToolRegistry.get(ClineDefaultTool.RECORD_FINDINGS)).to.equal(undefined)
		expect(ResponseToolRegistry.isResponseTool(ClineDefaultTool.RECORD_FINDINGS)).to.equal(false)
	})

	it("does not re-enter workflow runtime only because set_workflow_values executed", async () => {
		const taskState = new TaskState()
		taskState.assistantMessageContent = [
			{
				type: "tool_use",
				name: ClineDefaultTool.SET_WORKFLOW_VALUES,
				params: {},
				partial: false,
			},
		]
		taskState.didCompleteReadingStream = true
		const workflowRuntime = new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const resolveNextAction = sandbox.stub(workflowRuntime, "resolveNextAction").resolves({ kind: "no_op" })
		const executeTool = sandbox.stub().resolves({
			status: "executed",
			emittedToolResult: true,
			workflowNextActions: [],
		})
		const consumeWorkflowNextAction = sandbox.stub().resolves()
		const task = createTaskHarness(taskState, workflowRuntime)
		Reflect.set(task, "toolExecutor", { executeTool })
		Reflect.set(task, "consumeWorkflowNextAction", consumeWorkflowNextAction)
		Reflect.set(task, "isParallelToolCallingEnabled", () => true)

		await callTaskMethod(task, "presentAssistantMessage")

		sinon.assert.calledOnce(executeTool)
		sinon.assert.notCalled(resolveNextAction)
		sinon.assert.notCalled(consumeWorkflowNextAction)
	})

	it("stores workflow input payload on user content and outside the saved system prompt artifact", async () => {
		const artifactRoot = await mkdtemp(join(tmpdir(), "workflow-input-payload-artifacts-"))
		const artifactDir = join(artifactRoot, "prompt-artifacts")
		const originalWriteFlag = process.env.CLINE_WRITE_PROMPT_ARTIFACTS
		const originalArtifactDir = process.env.CLINE_PROMPT_ARTIFACT_DIR
		try {
			const taskState = new TaskState()
			taskState.apiRequestCount = 3
			const task = createTaskHarness(taskState)
			Reflect.set(task, "cwd", artifactRoot)
			Reflect.set(task, "ulid", "ulid-1")
			Reflect.set(task, "api", {
				getLastRequestId: () => "request-1",
			})
			const workflowInputPayloadBlock =
				"CURRENT STEP DETAILED INSTRUCTIONS\nStep 3: Perform Interactive Brainstorming\nCurrent step payload"
			const workflowProjection: WorkflowPromptProjection = {
				workflowInputPayloadBlock,
				continuationWorkflowInputPayloadBlock: "Continuation workflow payload",
				workflowToolSchemaOverride: undefined,
			}
			const userContent = callTaskMethodResult(
				task,
				"appendWorkflowInputPayloadToUserContent",
				[
					{
						type: "text",
						text: "User request",
					},
				] satisfies ClineContent[],
				workflowProjection,
				"full",
			) as ClineContent[]
			const messageStateHandler = new MessageStateHandler({
				taskId: "task-1",
				ulid: "ulid-1",
				taskState,
				updateTaskHistory: async () => [],
			})
			await messageStateHandler.addToApiConversationHistory({
				role: "user",
				content: userContent,
				ts: Date.now(),
			})

			const storedUserMessage = messageStateHandler.getApiConversationHistory()[0]
			const storedUserContent = Array.isArray(storedUserMessage?.content) ? storedUserMessage.content : []
			expect(storedUserContent.some((block) => block.type === "text" && block.text === workflowInputPayloadBlock)).to.equal(
				true,
			)

			process.env.CLINE_WRITE_PROMPT_ARTIFACTS = "1"
			process.env.CLINE_PROMPT_ARTIFACT_DIR = artifactDir
			await callTaskMethod(task, "writePromptMetadataArtifacts", {
				systemPrompt: "System prompt without current-step workflow details.",
				providerInfo: {
					mode: "act",
					providerId: "test-provider",
					model: {
						id: "test-model",
					},
				},
				workflowInputPayloadBlock,
			})

			const artifactFiles = await readdir(artifactDir)
			const systemPromptFile = artifactFiles.find((file) => file.endsWith(".system_prompt.md"))
			const workflowInputPayloadFile = artifactFiles.find((file) => file.endsWith(".workflow_input_payload.md"))
			const manifestFile = artifactFiles.find((file) => file.endsWith(".manifest.json"))
			expect(systemPromptFile).to.be.a("string")
			expect(workflowInputPayloadFile).to.be.a("string")
			expect(manifestFile).to.be.a("string")
			if (!systemPromptFile || !workflowInputPayloadFile || !manifestFile) {
				throw new Error("Expected prompt artifact files to be written.")
			}
			const savedSystemPrompt = await readFile(join(artifactDir, systemPromptFile), "utf8")
			const savedWorkflowInputPayload = await readFile(join(artifactDir, workflowInputPayloadFile), "utf8")
			const manifest = JSON.parse(await readFile(join(artifactDir, manifestFile), "utf8")) as {
				workflowInputPayloadPath?: string
			}
			expect(savedSystemPrompt).to.not.include("CURRENT STEP DETAILED INSTRUCTIONS")
			expect(savedSystemPrompt).to.not.include("Perform Interactive Brainstorming")
			expect(savedWorkflowInputPayload).to.equal(workflowInputPayloadBlock)
			expect(manifest.workflowInputPayloadPath).to.equal(join(artifactDir, workflowInputPayloadFile))
		} finally {
			if (originalWriteFlag === undefined) {
				delete process.env.CLINE_WRITE_PROMPT_ARTIFACTS
			} else {
				process.env.CLINE_WRITE_PROMPT_ARTIFACTS = originalWriteFlag
			}
			if (originalArtifactDir === undefined) {
				delete process.env.CLINE_PROMPT_ARTIFACT_DIR
			} else {
				process.env.CLINE_PROMPT_ARTIFACT_DIR = originalArtifactDir
			}
			await rm(artifactRoot, { recursive: true, force: true })
		}
	})

	it("passes submitted workflow-form next actions to the pending form wait resolver without double-consuming", async () => {
		const taskState = new TaskState()
		const activeSession = createPersistedSession()
		const formSession = createWorkflowFormSession()
		activeSession.ui.formSession = formSession
		taskState.activeWorkflowName = "workflow-runtime-test"
		taskState.activeWorkflowSession = activeSession
		const nextAction: WorkflowNextAction = {
			kind: "project_prompt",
			promptProjection: createEmptyWorkflowPromptProjection(),
		}
		const workflowRuntime = new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const submitWorkflowForm = sandbox.stub(workflowRuntime, "submitWorkflowForm").resolves(nextAction)
		const metadata = createMetadata()
		sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
		sandbox.stub(disk, "saveTaskMetadata").resolves()
		const task = createTaskHarness(taskState, workflowRuntime)
		const consumedNextActions: WorkflowNextAction[] = []
		const resolverMap = new Map<string, (submittedNextAction: WorkflowNextAction | undefined) => void>()
		resolverMap.set(formSession.sessionId, (submittedNextAction) => {
			if (submittedNextAction !== undefined) {
				consumedNextActions.push(submittedNextAction)
			}
		})
		Reflect.set(task, "workflowFormSubmissionNextActionResolvers", resolverMap)
		const consumeWorkflowNextAction = sandbox.stub().resolves()
		Reflect.set(task, "consumeWorkflowNextAction", consumeWorkflowNextAction)
		const request = createWorkflowFormSubmissionRequest(formSession.sessionId)

		await callTaskMethod(task, "handleWorkflowFormSubmission", request)

		sinon.assert.calledOnceWithExactly(submitWorkflowForm, {
			taskState,
			request,
		})
		expect(consumedNextActions).to.deep.equal([nextAction])
		sinon.assert.notCalled(consumeWorkflowNextAction)
	})

	it("passes continued workflow-form actions to the pending form wait resolver without double-consuming", async () => {
		const taskState = new TaskState()
		const activeSession = createPersistedSession()
		const formSession = createWorkflowFormSession()
		activeSession.ui.formSession = formSession
		taskState.activeWorkflowName = "workflow-runtime-test"
		taskState.activeWorkflowSession = activeSession
		const nextAction: WorkflowNextAction = {
			kind: "continue_workflow_form",
			formSession,
			payload: {
				sessionId: formSession.sessionId,
				workflowFormId: formSession.workflowFormId,
				title: "Workflow Form",
				toolDictionaryTitle: "Tools",
				toolDictionaryMarkdown: "",
				renderState: "panel",
				values: {},
			},
		}
		const workflowRuntime = new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const submitWorkflowForm = sandbox.stub(workflowRuntime, "submitWorkflowForm").resolves(nextAction)
		const metadata = createMetadata()
		sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
		sandbox.stub(disk, "saveTaskMetadata").resolves()
		const task = createTaskHarness(taskState, workflowRuntime)
		const consumedNextActions: WorkflowNextAction[] = []
		const resolverMap = new Map<string, (submittedNextAction: WorkflowNextAction | undefined) => void>()
		resolverMap.set(formSession.sessionId, (submittedNextAction) => {
			if (submittedNextAction !== undefined) {
				consumedNextActions.push(submittedNextAction)
			}
		})
		Reflect.set(task, "workflowFormSubmissionNextActionResolvers", resolverMap)
		const consumeWorkflowNextAction = sandbox.stub().resolves()
		Reflect.set(task, "consumeWorkflowNextAction", consumeWorkflowNextAction)
		const request = createWorkflowFormSubmissionRequest(formSession.sessionId)

		await callTaskMethod(task, "handleWorkflowFormSubmission", request)

		sinon.assert.calledOnceWithExactly(submitWorkflowForm, {
			taskState,
			request,
		})
		expect(consumedNextActions).to.deep.equal([nextAction])
		sinon.assert.notCalled(consumeWorkflowNextAction)
	})

	it("keeps live workflow-form wait resolvers registered when submission mutates the active form session", async () => {
		const taskState = new TaskState()
		const activeSession = createPersistedSession()
		const formSession = createWorkflowFormSession()
		activeSession.ui.formSession = formSession
		taskState.activeWorkflowName = "workflow-runtime-test"
		taskState.activeWorkflowSession = activeSession
		const nextAction: WorkflowNextAction = {
			kind: "project_prompt",
			promptProjection: createEmptyWorkflowPromptProjection(),
		}
		const workflowRuntime = new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const submitWorkflowForm = sandbox.stub(workflowRuntime, "submitWorkflowForm").callsFake(async () => {
			const activeWorkflowSession = taskState.activeWorkflowSession
			if (activeWorkflowSession === undefined) {
				throw new Error("Expected an active workflow session.")
			}

			activeWorkflowSession.ui.formSession = {
				...formSession,
				sessionId: "workflow-form-session-2",
			}
			await new Promise<void>((resolve) => {
				setTimeout(resolve, 150)
			})
			return nextAction
		})
		const metadata = createMetadata()
		sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
		sandbox.stub(disk, "saveTaskMetadata").resolves()
		const task = createTaskHarness(taskState, workflowRuntime)
		const consumeWorkflowNextAction = sandbox.stub().resolves()
		Reflect.set(task, "consumeWorkflowNextAction", consumeWorkflowNextAction)
		const waitResult = callTaskMethodResult(task, "waitForWorkflowFormSubmissionNextAction", formSession)
		const request = createWorkflowFormSubmissionRequest(formSession.sessionId)

		await callTaskMethod(task, "handleWorkflowFormSubmission", request)
		const submittedNextAction = await Promise.resolve(waitResult)

		sinon.assert.calledOnceWithExactly(submitWorkflowForm, {
			taskState,
			request,
		})
		expect(submittedNextAction).to.deep.equal(nextAction)
		sinon.assert.notCalled(consumeWorkflowNextAction)
	})

	it("consumes submitted workflow-form next actions directly when no form wait resolver exists", async () => {
		const taskState = new TaskState()
		const activeSession = createPersistedSession()
		const formSession = createWorkflowFormSession()
		activeSession.ui.formSession = formSession
		taskState.activeWorkflowName = "workflow-runtime-test"
		taskState.activeWorkflowSession = activeSession
		const nextAction: WorkflowNextAction = {
			kind: "project_prompt",
			promptProjection: createEmptyWorkflowPromptProjection(),
		}
		const workflowRuntime = new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const submitWorkflowForm = sandbox.stub(workflowRuntime, "submitWorkflowForm").resolves(nextAction)
		const metadata = createMetadata()
		sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
		sandbox.stub(disk, "saveTaskMetadata").resolves()
		const task = createTaskHarness(taskState, workflowRuntime)
		const consumeWorkflowNextAction = sandbox.stub().resolves()
		Reflect.set(task, "consumeWorkflowNextAction", consumeWorkflowNextAction)
		const request = createWorkflowFormSubmissionRequest(formSession.sessionId)

		await callTaskMethod(task, "handleWorkflowFormSubmission", request)

		sinon.assert.calledOnceWithExactly(submitWorkflowForm, {
			taskState,
			request,
		})
		sinon.assert.calledOnceWithExactly(consumeWorkflowNextAction, nextAction)
	})

	it("uses distinct native call ids and captures results for chained runtime-owned tool-backed operations", async () => {
		const taskState = new TaskState()
		const workflowRuntime = new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const task = createTaskHarness(taskState, workflowRuntime)
		const firstRuntimeOwnedSourceRoute = {
			branchId: "step-1-allocate-artifact",
			routeId: "step-1-allocate-artifact",
		}
		const secondRuntimeOwnedSourceRoute = {
			branchId: "step-1-await-allocation",
			routeId: "step-1-build-initial-shell",
		}
		const firstAction: Extract<WorkflowNextAction, { kind: "execute_tool_backed_operation" }> = {
			kind: "execute_tool_backed_operation",
			runtimeOwnedSourceRoute: firstRuntimeOwnedSourceRoute,
			toolRequest: {
				toolName: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
				toolInput: {},
				toolParams: {
					artifact_id: "brainstorming_session",
				},
			},
		}
		const secondAction: Extract<WorkflowNextAction, { kind: "execute_tool_backed_operation" }> = {
			kind: "execute_tool_backed_operation",
			runtimeOwnedSourceRoute: secondRuntimeOwnedSourceRoute,
			toolRequest: {
				toolName: ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
				toolInput: {},
				toolParams: {
					artifact_id: "brainstorming_session",
					destination_path: "/tmp/brainstorming.md",
					content: "# Brainstorming",
				},
			},
		}
		const executeTool = sandbox.stub().callsFake(async (block: ToolUse) => {
			const unrelatedCallId = `unrelated_${block.call_id ?? "missing"}`
			const unrelatedBlock: ToolUse = {
				...block,
				call_id: unrelatedCallId,
			}
			ToolResultUtils.pushToolResult(
				JSON.stringify({ call_id: unrelatedCallId, unrelated: true }),
				unrelatedBlock,
				taskState.userMessageContent,
				(toolBlock) => `[${toolBlock.name}]`,
			)
			ToolResultUtils.pushToolResult(
				JSON.stringify({ call_id: block.call_id }),
				block,
				taskState.userMessageContent,
				(toolBlock) => `[${toolBlock.name}]`,
			)
			return { status: "executed", emittedToolResult: true, workflowNextActions: [] }
		})
		const handleToolBackedOperationToolResult = sandbox.stub(workflowRuntime, "handleToolBackedOperationToolResult")
		handleToolBackedOperationToolResult.onFirstCall().resolves(secondAction)
		handleToolBackedOperationToolResult.onSecondCall().resolves({ kind: "no_op" })
		sandbox.stub(disk, "getTaskMetadata").resolves(createMetadata())
		sandbox.stub(disk, "saveTaskMetadata").resolves()
		Reflect.set(task, "toolExecutor", { executeTool })

		await callTaskMethod(task, "consumeWorkflowNextAction", firstAction)

		sinon.assert.calledTwice(executeTool)
		const firstToolUse = executeTool.firstCall.args[0] as ToolUse
		const secondToolUse = executeTool.secondCall.args[0] as ToolUse
		expect(firstToolUse.call_id).to.be.a("string").and.not.equal("")
		expect(secondToolUse.call_id).to.be.a("string").and.not.equal("")
		expect(firstToolUse.call_id).to.not.equal(secondToolUse.call_id)
		expect(firstToolUse.call_id).to.match(/^workflow_runtime_task-1_/)
		expect(secondToolUse.call_id).to.match(/^workflow_runtime_task-1_/)
		expect(firstToolUse.call_id).to.include("create_workflow_artifact")
		expect(secondToolUse.call_id).to.include("build_workflow_document")
		const firstWorkflowRuntimeToolCallId = firstToolUse.call_id
		const secondWorkflowRuntimeToolCallId = secondToolUse.call_id
		if (firstWorkflowRuntimeToolCallId === undefined || secondWorkflowRuntimeToolCallId === undefined) {
			throw new Error("Expected workflow runtime tool calls to carry native call ids.")
		}
		const firstToolResultText = handleToolBackedOperationToolResult.firstCall.args[0].toolResultText
		const secondToolResultText = handleToolBackedOperationToolResult.secondCall.args[0].toolResultText
		expect(firstToolResultText).to.be.a("string")
		expect(secondToolResultText).to.be.a("string")
		if (typeof firstToolResultText !== "string" || typeof secondToolResultText !== "string") {
			throw new Error("Expected workflow runtime tool result text for both native call ids.")
		}
		expect(firstToolResultText).to.include(firstWorkflowRuntimeToolCallId)
		expect(firstToolResultText).not.to.include("unrelated")
		expect(secondToolResultText).to.include(secondWorkflowRuntimeToolCallId)
		expect(secondToolResultText).not.to.include("unrelated")
	})

	it("consumes real brainstorming runtime-owned create and build handlers before rendering the setup form", async () => {
		const harness = await createRealBrainstormingRuntimeHarness(sandbox)
		try {
			const task = createTaskHarness(harness.taskState, harness.workflowRuntime)
			const messageStateHandler = new MessageStateHandler({
				taskId: "task-1",
				ulid: "ulid-1",
				taskState: harness.taskState,
				updateTaskHistory: async () => [],
			})
			const taskConfig = createRealWorkflowHandlerTaskConfig({
				taskState: harness.taskState,
				workflowRuntime: harness.workflowRuntime,
				coordinator: harness.coordinator,
				cwd: harness.cwd,
			})
			sandbox.stub(pathUtils, "isLocatedInWorkspace").resolves(true)
			const executedTools: ClineDefaultTool[] = []
			let runtimeOwnedToolExecuting = false
			const threadDisplayStateChangesDuringRuntimeTools: ThreadDisplayState[] = []
			const setThreadDisplayState = Reflect.get(task, "setThreadDisplayState")
			if (typeof setThreadDisplayState !== "function") {
				throw new Error("Expected task harness to expose setThreadDisplayState.")
			}
			Reflect.set(
				task,
				"setThreadDisplayState",
				function (
					this: object,
					threadDisplayState: ThreadDisplayState,
					reason: string,
					details: Record<string, unknown> | undefined,
					awaitingUserResponseSubtype: AwaitingUserResponseSubtype | undefined,
				): void {
					if (runtimeOwnedToolExecuting) {
						threadDisplayStateChangesDuringRuntimeTools.push(threadDisplayState)
					}
					Reflect.apply(setThreadDisplayState, this, [threadDisplayState, reason, details, awaitingUserResponseSubtype])
				},
			)
			const executeTool = sandbox.stub().callsFake(async (block: ToolUse) => {
				executedTools.push(block.name)
				runtimeOwnedToolExecuting = true
				try {
					const result = await harness.coordinator.execute(taskConfig, block)
					if (block.name === ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT) {
						const persistedOutputFile = harness.taskState.activeWorkflowSession?.workflowValues.output_file
						if (typeof persistedOutputFile !== "string" || persistedOutputFile.length === 0) {
							const renderedResult = typeof result === "string" ? result : JSON.stringify(result)
							throw new Error(`Expected create handler to persist output_file. Handler result: ${renderedResult}`)
						}
					}
					ToolResultUtils.pushToolResult(
						result,
						block,
						harness.taskState.userMessageContent,
						(toolBlock) => `[${toolBlock.name}]`,
						harness.coordinator,
						harness.taskState.toolUseIdMap,
					)
				} finally {
					runtimeOwnedToolExecuting = false
				}
				return { status: "executed", emittedToolResult: true, workflowNextActions: [] }
			})
			sandbox.stub(disk, "getTaskMetadata").resolves(createMetadata())
			sandbox.stub(disk, "saveTaskMetadata").resolves()
			Reflect.set(task, "messageStateHandler", messageStateHandler)
			Reflect.set(task, "postStateToWebview", async () => undefined)
			Reflect.set(task, "waitForWorkflowFormSubmissionNextAction", sandbox.stub().resolves(undefined))
			Reflect.set(task, "toolExecutor", { executeTool })

			const entryAction = await harness.workflowRuntime.activateWorkflow({
				taskState: harness.taskState,
				workflowName: brainstormingWorkflowDefinition.name,
			})
			expect(entryAction.kind).to.equal("render_workflow_form")
			if (entryAction.kind !== "render_workflow_form") {
				throw new Error(`Expected render_workflow_form, received ${entryAction.kind}.`)
			}
			const projectSelectionAction = await harness.workflowRuntime.submitWorkflowForm({
				taskState: harness.taskState,
				request: {
					metadata: undefined,
					sessionId: entryAction.formSession.sessionId,
					panelId: entryAction.formSession.currentPanelId,
					action: WorkflowFormAction.SUBMIT,
					fields: [],
				},
			})
			expect(projectSelectionAction.kind).to.equal("render_workflow_form")
			if (projectSelectionAction.kind !== "render_workflow_form") {
				throw new Error(`Expected render_workflow_form, received ${projectSelectionAction.kind}.`)
			}
			const stepOneAction = await harness.workflowRuntime.submitWorkflowForm({
				taskState: harness.taskState,
				request: {
					metadata: undefined,
					sessionId: projectSelectionAction.formSession.sessionId,
					panelId: projectSelectionAction.formSession.currentPanelId,
					action: WorkflowFormAction.SUBMIT,
					fields: [
						{
							key: "__workflow_runtime_project_mode__",
							value: { stringValue: "new" },
						},
						{
							key: "__workflow_runtime_new_project_title__",
							value: { stringValue: "Brainstorming Runtime Project" },
						},
					],
				},
			})
			expect(stepOneAction.kind).to.equal("execute_tool_backed_operation")
			if (stepOneAction.kind !== "execute_tool_backed_operation") {
				throw new Error(`Expected execute_tool_backed_operation, received ${stepOneAction.kind}.`)
			}

			await callTaskMethod(task, "consumeWorkflowNextAction", stepOneAction)

			expect(executedTools).to.deep.equal([
				ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
				ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
			])
			expect(threadDisplayStateChangesDuringRuntimeTools).to.deep.equal([])
			const artifactPath = join(
				harness.cwd,
				"docs",
				"projects",
				"brainstorming-runtime-project",
				"discovery",
				"brainstorming.md",
			)
			const artifactContent = await readFile(artifactPath, "utf8")
			expect(artifactContent).to.include(buildInitialBrainstormingDocument())
			const activeWorkflowSession = harness.taskState.activeWorkflowSession
			expect(activeWorkflowSession).to.not.equal(undefined)
			if (activeWorkflowSession === undefined) {
				throw new Error("Expected active workflow session after rendering setup form.")
			}
			const activeFormSession = activeWorkflowSession.ui.formSession
			expect(activeFormSession).to.not.equal(undefined)
			if (activeFormSession === undefined) {
				throw new Error("Expected active workflow form session after rendering setup form.")
			}
			expect(activeFormSession.workflowFormId).to.equal("step-1-setup-form")
			const rootProjectPath = join(harness.cwd, "brainstorming-runtime-project")
			let rootProjectReadErrorCode: unknown
			try {
				await readFile(rootProjectPath, "utf8")
			} catch (error) {
				rootProjectReadErrorCode = typeof error === "object" && error !== null ? Reflect.get(error, "code") : undefined
			}
			expect(rootProjectReadErrorCode).to.equal("ENOENT")
		} finally {
			await harness.cleanup()
		}
	})

	it("isolates runtime-owned tool-backed operations from assistant turn single-tool gating", async () => {
		const taskState = new TaskState()
		taskState.didAlreadyUseTool = true
		const workflowRuntime = new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const task = createTaskHarness(taskState, workflowRuntime)
		const action: Extract<WorkflowNextAction, { kind: "execute_tool_backed_operation" }> = {
			kind: "execute_tool_backed_operation",
			runtimeOwnedSourceRoute: {
				branchId: "step-1-allocate-artifact",
				routeId: "step-1-allocate-artifact",
			},
			toolRequest: {
				toolName: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
				toolInput: {},
				toolParams: {
					artifact_id: "brainstorming_session",
				},
			},
		}
		const executeTool = sandbox.stub().callsFake(async (block: ToolUse) => {
			expect(taskState.didAlreadyUseTool).to.equal(false)
			ToolResultUtils.pushToolResult(
				JSON.stringify({ ok: true, call_id: block.call_id }),
				block,
				taskState.userMessageContent,
				(toolBlock) => `[${toolBlock.name}]`,
			)
			return { status: "executed", emittedToolResult: true, workflowNextActions: [] }
		})
		const handleToolBackedOperationToolResult = sandbox
			.stub(workflowRuntime, "handleToolBackedOperationToolResult")
			.resolves({ kind: "no_op" })
		sandbox.stub(disk, "getTaskMetadata").resolves(createMetadata())
		sandbox.stub(disk, "saveTaskMetadata").resolves()
		Reflect.set(task, "toolExecutor", { executeTool })

		await callTaskMethod(task, "consumeWorkflowNextAction", action)

		sinon.assert.calledOnce(executeTool)
		sinon.assert.calledOnce(handleToolBackedOperationToolResult)
		expect(taskState.didAlreadyUseTool).to.equal(true)
	})
})
