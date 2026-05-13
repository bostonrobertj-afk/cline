import { strict as assert } from "node:assert"
import type { ClineWorkflowStepResolutionStatus, WorkflowForm } from "@shared/ExtensionMessage"
import { afterEach, beforeEach, describe, it } from "mocha"
import sinon from "sinon"
import { TaskState } from "@/core/task/TaskState"
import type { WorkflowFormSessionState } from "@/core/task/workflow-form/types"
import type { WorkflowStepResolutionSessionState } from "@/core/task/workflow-step-resolution/types"
import { ClineDefaultTool } from "@/shared/tools"
import type { WorkflowNextAction } from "../types"
import type { WorkflowNextActionConsumerAdapter } from "../WorkflowNextActionConsumer"
import { WorkflowNextActionConsumer } from "../WorkflowNextActionConsumer"
import { WorkflowRuntime } from "../WorkflowRuntime"

function createRuntime(): WorkflowRuntime {
	return new WorkflowRuntime({
		cwd: "/tmp",
		workspacePathPolicy: {
			validateAccess: () => true,
		},
	})
}

function createFormSession(): WorkflowFormSessionState {
	return {
		sessionId: "form-session-1",
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

function createFormPayload(formSession: WorkflowFormSessionState): WorkflowForm {
	return {
		sessionId: formSession.sessionId,
		workflowFormId: formSession.workflowFormId,
		title: "Workflow Form",
		toolDictionaryTitle: "Tools",
		toolDictionaryMarkdown: "",
		renderState: "panel",
		values: {},
	}
}

function createToolBackedOperationSession(): WorkflowStepResolutionSessionState {
	return {
		sessionId: "operation-session-1",
		sourceRoute: {
			branchId: "branch-1",
			routeId: "route-1",
		},
		triggerSource: "execute_tool_backed_operation",
		owner: {
			kind: "workflow_step",
			workflowName: "workflow-runtime-test",
			stepNumber: 1,
		},
		state: "pending",
	}
}

function createStatusPayload(session: WorkflowStepResolutionSessionState): ClineWorkflowStepResolutionStatus {
	return {
		sessionId: session.sessionId,
		sourceRoute: {
			branchId: session.sourceRoute.branchId,
			routeId: session.sourceRoute.routeId,
		},
		owner: {
			workflowName: "workflow-runtime-test",
			stepNumber: 1,
		},
		state: "pending",
		definition: {
			title: "Operation",
			pendingLabel: "Running",
			successLabel: "Done",
			failureLabel: "Failed",
		},
	}
}

interface TestWorkflowNextActionConsumerAdapter extends WorkflowNextActionConsumerAdapter {
	shouldAbort: sinon.SinonStub<[], boolean>
	persistWorkflowRuntimeMetadata: sinon.SinonStub<[], Promise<void>>
	renderWorkflowForm: sinon.SinonStub<[WorkflowForm], Promise<void>>
	waitForWorkflowFormCompletion: sinon.SinonStub<[WorkflowFormSessionState], Promise<WorkflowNextAction | undefined>>
	renderWorkflowStepResolutionStatus: sinon.SinonStub<[ClineWorkflowStepResolutionStatus], Promise<void>>
	reportTerminalError: sinon.SinonStub<[string], Promise<void>>
	executeToolBackedOperation: sinon.SinonStub<
		[Extract<WorkflowNextAction, { kind: "execute_tool_backed_operation" }>],
		Promise<{ toolResultText: string | undefined }>
	>
}

function createAdapter(): TestWorkflowNextActionConsumerAdapter {
	return {
		shouldAbort: sinon.stub<[], boolean>().returns(false),
		persistWorkflowRuntimeMetadata: sinon.stub<[], Promise<void>>().resolves(),
		renderWorkflowForm: sinon.stub<[WorkflowForm], Promise<void>>().resolves(),
		waitForWorkflowFormCompletion: sinon
			.stub<[WorkflowFormSessionState], Promise<WorkflowNextAction | undefined>>()
			.resolves(undefined),
		renderWorkflowStepResolutionStatus: sinon.stub<[ClineWorkflowStepResolutionStatus], Promise<void>>().resolves(),
		reportTerminalError: sinon.stub<[string], Promise<void>>().resolves(),
		executeToolBackedOperation: sinon
			.stub<
				[Extract<WorkflowNextAction, { kind: "execute_tool_backed_operation" }>],
				Promise<{ toolResultText: string | undefined }>
			>()
			.resolves({ toolResultText: "tool result" }),
	}
}

describe("WorkflowNextActionConsumer", () => {
	let sandbox: sinon.SinonSandbox
	let taskState: TaskState
	let runtime: WorkflowRuntime
	let adapter: TestWorkflowNextActionConsumerAdapter
	let consumer: WorkflowNextActionConsumer

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		taskState = new TaskState()
		runtime = createRuntime()
		adapter = createAdapter()
		consumer = new WorkflowNextActionConsumer({
			taskState,
			workflowRuntime: runtime,
			adapter,
		})
	})

	afterEach(() => {
		sandbox.restore()
	})

	it("returns no_op without persisting workflow metadata", async () => {
		await consumer.consume({ kind: "no_op" })

		sinon.assert.notCalled(adapter.persistWorkflowRuntimeMetadata)
	})

	it("persists project_prompt before returning", async () => {
		await consumer.consume({
			kind: "project_prompt",
			promptProjection: {
				workflowInputPayloadBlock: undefined,
				continuationWorkflowInputPayloadBlock: undefined,
				workflowToolSchemaOverride: undefined,
			},
		})

		sinon.assert.calledOnce(adapter.persistWorkflowRuntimeMetadata)
	})

	it("persists teardown and completion actions before returning", async () => {
		await consumer.consume({ kind: "persist_workflow_teardown" })
		await consumer.consume({ kind: "complete_workflow" })

		sinon.assert.calledTwice(adapter.persistWorkflowRuntimeMetadata)
	})

	it("persists and reports terminal errors", async () => {
		await consumer.consume({ kind: "terminal_error", errorMessage: "Workflow failed." })

		sinon.assert.calledOnce(adapter.persistWorkflowRuntimeMetadata)
		sinon.assert.callOrder(adapter.persistWorkflowRuntimeMetadata, adapter.reportTerminalError)
		sinon.assert.calledOnceWithExactly(adapter.reportTerminalError, "Workflow failed.")
	})

	it("renders workflow forms, waits for submitted next action, and consumes it", async () => {
		const formSession = createFormSession()
		const formPayload = createFormPayload(formSession)
		const submittedNextAction: WorkflowNextAction = {
			kind: "terminal_error",
			errorMessage: "Submitted workflow action failed.",
		}
		adapter.waitForWorkflowFormCompletion.resolves(submittedNextAction)
		const resolveNextAction = sandbox.stub(runtime, "resolveNextAction").resolves({ kind: "no_op" })

		await consumer.consume({
			kind: "render_workflow_form",
			formSession,
			payload: formPayload,
		})

		sinon.assert.calledTwice(adapter.persistWorkflowRuntimeMetadata)
		sinon.assert.calledOnceWithExactly(adapter.renderWorkflowForm, formPayload)
		sinon.assert.calledOnceWithExactly(adapter.waitForWorkflowFormCompletion, formSession)
		sinon.assert.notCalled(resolveNextAction)
		sinon.assert.calledOnceWithExactly(adapter.reportTerminalError, "Submitted workflow action failed.")
	})

	it("continues workflow forms, waits for submitted next action, and consumes it", async () => {
		const formSession = createFormSession()
		const formPayload = createFormPayload(formSession)
		const submittedNextAction: WorkflowNextAction = {
			kind: "project_prompt",
			promptProjection: {
				workflowInputPayloadBlock: undefined,
				continuationWorkflowInputPayloadBlock: undefined,
				workflowToolSchemaOverride: undefined,
			},
		}
		adapter.waitForWorkflowFormCompletion.resolves(submittedNextAction)

		await consumer.consume({
			kind: "continue_workflow_form",
			formSession,
			payload: formPayload,
		})

		sinon.assert.calledTwice(adapter.persistWorkflowRuntimeMetadata)
		sinon.assert.calledOnceWithExactly(adapter.renderWorkflowForm, formPayload)
		sinon.assert.calledOnceWithExactly(adapter.waitForWorkflowFormCompletion, formSession)
		sinon.assert.notCalled(adapter.reportTerminalError)
	})

	it("executes tool-backed operations, feeds results back to runtime, persists, and continues", async () => {
		const operationSession = createToolBackedOperationSession()
		const statusPayload = createStatusPayload(operationSession)
		sandbox.stub(runtime, "buildToolBackedOperationStatusPayload").returns(statusPayload)
		const handleToolBackedOperationToolResult = sandbox
			.stub(runtime, "handleToolBackedOperationToolResult")
			.resolves({ kind: "no_op" })
		const action = {
			kind: "execute_tool_backed_operation" as const,
			runtimeOwnedSourceRoute: undefined,
			toolBackedOperationSession: operationSession,
			toolRequest: {
				toolName: ClineDefaultTool.FILE_READ,
				toolParams: {
					path: "README.md",
				},
				toolInput: {},
			},
		}

		await consumer.consume(action)

		sinon.assert.calledOnceWithExactly(adapter.renderWorkflowStepResolutionStatus, statusPayload)
		sinon.assert.calledOnceWithExactly(adapter.executeToolBackedOperation, action)
		sinon.assert.calledOnceWithExactly(handleToolBackedOperationToolResult, {
			taskState,
			toolResultText: "tool result",
			runtimeOwnedSourceRoute: undefined,
		})
		sinon.assert.calledTwice(adapter.persistWorkflowRuntimeMetadata)
		assert.equal(
			adapter.persistWorkflowRuntimeMetadata.firstCall.calledBefore(adapter.renderWorkflowStepResolutionStatus.firstCall),
			true,
		)
		assert.equal(
			adapter.renderWorkflowStepResolutionStatus.firstCall.calledBefore(adapter.executeToolBackedOperation.firstCall),
			true,
		)
		assert.equal(
			adapter.executeToolBackedOperation.firstCall.calledBefore(handleToolBackedOperationToolResult.firstCall),
			true,
		)
		assert.equal(
			handleToolBackedOperationToolResult.firstCall.calledBefore(adapter.persistWorkflowRuntimeMetadata.secondCall),
			true,
		)
		assert.equal(adapter.shouldAbort.callCount > 0, true)
	})

	it("persists pending tool-backed operation state before execution failures are surfaced", async () => {
		const operationSession = createToolBackedOperationSession()
		const statusPayload = createStatusPayload(operationSession)
		const executionError = new Error("operation failed")
		sandbox.stub(runtime, "buildToolBackedOperationStatusPayload").returns(statusPayload)
		const handleToolBackedOperationToolResult = sandbox.stub(runtime, "handleToolBackedOperationToolResult")
		adapter.executeToolBackedOperation.rejects(executionError)
		const action = {
			kind: "execute_tool_backed_operation" as const,
			runtimeOwnedSourceRoute: undefined,
			toolBackedOperationSession: operationSession,
			toolRequest: {
				toolName: ClineDefaultTool.FILE_READ,
				toolParams: {
					path: "README.md",
				},
				toolInput: {},
			},
		}

		await assert.rejects(consumer.consume(action), {
			message: "operation failed",
		})

		sinon.assert.calledOnce(adapter.persistWorkflowRuntimeMetadata)
		assert.equal(
			adapter.persistWorkflowRuntimeMetadata.firstCall.calledBefore(adapter.executeToolBackedOperation.firstCall),
			true,
		)
		sinon.assert.calledOnceWithExactly(adapter.executeToolBackedOperation, action)
		sinon.assert.notCalled(handleToolBackedOperationToolResult)
	})

	it("does not pre-persist tool-backed operations without pending step-resolution state", async () => {
		const handleToolBackedOperationToolResult = sandbox
			.stub(runtime, "handleToolBackedOperationToolResult")
			.resolves({ kind: "no_op" })
		const action = {
			kind: "execute_tool_backed_operation" as const,
			runtimeOwnedSourceRoute: undefined,
			toolRequest: {
				toolName: ClineDefaultTool.FILE_READ,
				toolParams: {
					path: "README.md",
				},
				toolInput: {},
			},
		}

		await consumer.consume(action)

		sinon.assert.notCalled(adapter.renderWorkflowStepResolutionStatus)
		sinon.assert.calledOnceWithExactly(adapter.executeToolBackedOperation, action)
		sinon.assert.calledOnceWithExactly(handleToolBackedOperationToolResult, {
			taskState,
			toolResultText: "tool result",
			runtimeOwnedSourceRoute: undefined,
		})
		sinon.assert.calledOnce(adapter.persistWorkflowRuntimeMetadata)
		assert.equal(
			handleToolBackedOperationToolResult.firstCall.calledBefore(adapter.persistWorkflowRuntimeMetadata.firstCall),
			true,
		)
	})

	it("passes runtime-owned source routes into tool-result handling", async () => {
		const runtimeOwnedSourceRoute = {
			branchId: "runtime-owned-branch",
			routeId: "runtime-owned-route",
		}
		const handleToolBackedOperationToolResult = sandbox
			.stub(runtime, "handleToolBackedOperationToolResult")
			.resolves({ kind: "no_op" })
		const action: Extract<WorkflowNextAction, { kind: "execute_tool_backed_operation" }> = {
			kind: "execute_tool_backed_operation",
			runtimeOwnedSourceRoute,
			toolRequest: {
				toolName: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
				toolParams: {
					artifact_id: "brainstorming_session",
				},
				toolInput: {},
			},
		}

		await consumer.consume(action)

		sinon.assert.calledOnceWithExactly(adapter.executeToolBackedOperation, action)
		sinon.assert.calledOnceWithExactly(handleToolBackedOperationToolResult, {
			taskState,
			toolResultText: "tool result",
			runtimeOwnedSourceRoute,
		})
	})
})
