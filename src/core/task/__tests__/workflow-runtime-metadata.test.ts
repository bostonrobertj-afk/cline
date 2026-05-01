import { expect } from "chai"
import { afterEach, beforeEach, describe, it } from "mocha"
import sinon from "sinon"
import type { TaskMetadata } from "@/core/context/context-tracking/ContextTrackerTypes"
import * as disk from "@/core/storage/disk"
import { Task } from "@/core/task"
import { TaskState } from "@/core/task/TaskState"
import type { WorkflowFormSessionState } from "@/core/task/workflow-form/types"
import type {
	PersistedWorkflowSession,
	WorkflowNextAction,
	WorkflowWorkspacePathPolicy,
} from "@/core/task/workflow-runtime/types"
import * as WorkflowRegistry from "@/core/task/workflow-runtime/WorkflowRegistry"
import { WorkflowRuntime } from "@/core/task/workflow-runtime/WorkflowRuntime"
import { WorkflowFormAction, type WorkflowFormSubmissionRequest } from "@/shared/proto/cline/task"
import { ClineDefaultTool } from "@/shared/tools"

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
			suppressedWorkflowStepResolutionDefinitionIds: [],
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
})
