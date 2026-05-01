import { expect } from "chai"
import { afterEach, beforeEach, describe, it } from "mocha"
import sinon from "sinon"
import type { TaskMetadata } from "@/core/context/context-tracking/ContextTrackerTypes"
import * as disk from "@/core/storage/disk"
import { Task } from "@/core/task"
import { TaskState } from "@/core/task/TaskState"
import type {
	PersistedWorkflowSession,
	WorkflowNextAction,
	WorkflowWorkspacePathPolicy,
} from "@/core/task/workflow-runtime/types"
import * as WorkflowRegistry from "@/core/task/workflow-runtime/WorkflowRegistry"
import { WorkflowRuntime } from "@/core/task/workflow-runtime/WorkflowRuntime"
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

function createTaskHarness(
	taskState = new TaskState(),
	workflowRuntime = new WorkflowRuntime({ cwd: "/tmp", workspacePathPolicy: createAllowAllWorkspacePathPolicy() }),
): object {
	const task = Object.create(Task.prototype)
	Reflect.set(task, "taskId", "task-1")
	Reflect.set(task, "taskState", taskState)
	Reflect.set(task, "workflowRuntime", workflowRuntime)
	return task
}

async function callTaskMethod(task: object, methodName: string, ...args: unknown[]): Promise<void> {
	const method = Reflect.get(task, methodName)
	if (typeof method !== "function") {
		throw new Error(`Task method ${methodName} is not available.`)
	}

	await Reflect.apply(method, task, args)
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

		await callTaskMethod(createTaskHarness(), "restoreWorkflowRuntimeStateFromMetadata", metadata)

		sinon.assert.calledOnce(saveMetadata)
		expect(metadata.activeWorkflowName).to.equal(undefined)
		expect(metadata.activeWorkflowSession).to.equal(undefined)
		expect(saveMetadata.firstCall.args[0]).to.equal("task-1")
		expect(saveMetadata.firstCall.args[1].activeWorkflowName).to.equal(undefined)
		expect(saveMetadata.firstCall.args[1].activeWorkflowSession).to.equal(undefined)
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
})
