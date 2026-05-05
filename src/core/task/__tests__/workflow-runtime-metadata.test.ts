import { expect } from "chai"
import { mkdir, mkdtemp, readFile, rm } from "fs/promises"
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
import { BuildWorkflowDocumentToolHandler } from "@/core/task/tools/handlers/BuildWorkflowDocumentToolHandler"
import { CreateWorkflowArtifactToolHandler } from "@/core/task/tools/handlers/CreateWorkflowArtifactToolHandler"
import { ToolExecutorCoordinator } from "@/core/task/tools/ToolExecutorCoordinator"
import { ToolValidator } from "@/core/task/tools/ToolValidator"
import type { TaskConfig } from "@/core/task/tools/types/TaskConfig"
import { ToolResultUtils } from "@/core/task/tools/utils"
import type { WorkflowFormSessionState } from "@/core/task/workflow-form/types"
import type {
	PersistedWorkflowSession,
	WorkflowNextAction,
	WorkflowWorkspacePathPolicy,
} from "@/core/task/workflow-runtime/types"
import * as WorkflowRegistry from "@/core/task/workflow-runtime/WorkflowRegistry"
import { WorkflowRuntime } from "@/core/task/workflow-runtime/WorkflowRuntime"
import { brainstormingWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/brainstorming"
import { buildInitialBrainstormingDocument } from "@/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingDocument"
import { DiffViewProvider } from "@/integrations/editor/DiffViewProvider"
import { BrowserSession } from "@/services/browser/BrowserSession"
import { UrlContentFetcher } from "@/services/browser/UrlContentFetcher"
import { McpHub } from "@/services/mcp/McpHub"
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@/shared/AutoApprovalSettings"
import { DEFAULT_BROWSER_SETTINGS } from "@/shared/BrowserSettings"
import type { AwaitingUserResponseSubtype, ThreadDisplayState } from "@/shared/ExtensionMessage"
import { DEFAULT_FOCUS_CHAIN_SETTINGS } from "@/shared/FocusChainSettings"
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

function createMetadata(): TaskMetadata {
	return {
		files_in_context: [],
		model_usage: [],
		environment_history: [],
	}
}

function createAllowAllWorkspacePathPolicy(): WorkflowWorkspacePathPolicy {
	return {
		validateAccess: () => true,
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
		const nextAction: WorkflowNextAction = { kind: "project_prompt", promptProjection: {} }
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
		const returnedNextAction: WorkflowNextAction = { kind: "project_prompt", promptProjection: {} }
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

	it("passes submitted workflow-form next actions to the pending form wait resolver without double-consuming", async () => {
		const taskState = new TaskState()
		const activeSession = createPersistedSession()
		const formSession = createWorkflowFormSession()
		activeSession.ui.formSession = formSession
		taskState.activeWorkflowName = "workflow-runtime-test"
		taskState.activeWorkflowSession = activeSession
		const nextAction: WorkflowNextAction = { kind: "project_prompt", promptProjection: {} }
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
		const nextAction: WorkflowNextAction = { kind: "project_prompt", promptProjection: {} }
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
		const nextAction: WorkflowNextAction = { kind: "project_prompt", promptProjection: {} }
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
