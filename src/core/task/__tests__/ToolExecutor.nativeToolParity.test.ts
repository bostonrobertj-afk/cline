import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import type { ToolUse } from "@/core/assistant-message"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../TaskState"
import { ToolExecutor } from "../ToolExecutor"
import { ToolExecutorCoordinator } from "../tools/ToolExecutorCoordinator"

interface ToolExecutorNativeParityHarness {
	executor: ToolExecutor
	taskState: TaskState
	coordinator: ToolExecutorCoordinator
	executeStub: sinon.SinonStub
}

function createReadFileNativeBlock(callId: string): ToolUse {
	return {
		type: "tool_use",
		name: ClineDefaultTool.FILE_READ,
		params: {
			path: "src/index.ts",
		},
		partial: false,
		isNativeToolCall: true,
		call_id: callId,
	}
}

function createRecordFindingsBlock(): ToolUse {
	return {
		type: "tool_use",
		name: ClineDefaultTool.RECORD_FINDINGS,
		params: {
			findings: "[]",
		},
		partial: false,
	}
}

function createExecutor(): ToolExecutorNativeParityHarness {
	const taskState = new TaskState()
	const stateManager = {
		getGlobalSettingsKey: (key: string) => {
			if (key === "mode") return "act"
			if (key === "strictPlanModeEnabled") return false
			if (key === "yoloModeToggled") return false
			if (key === "doubleCheckCompletionEnabled") return false
			if (key === "enableParallelToolCalling") return true
			if (key === "autoApprovalSettings") return { enableNotifications: false, actions: {} }
			if (key === "browserSettings") return {}
			if (key === "focusChainSettings") return { enabled: false }
			if (key === "hooksEnabled") return false
			return undefined
		},
		getApiConfiguration: () => ({
			planModeApiProvider: "openai",
			actModeApiProvider: "openai",
		}),
	} as any

	const executor = new ToolExecutor(
		taskState,
		{
			getClineMessages: () => [],
			setClineMessages: sinon.stub(),
			saveClineMessagesAndUpdateHistory: sinon.stub().resolves(),
		} as any,
		{
			getModel: () => ({ id: "openai/gpt-5", info: {} }),
		} as any,
		{} as any,
		{
			closeBrowser: sinon.stub().resolves(),
			dispose: sinon.stub().resolves(),
		} as any,
		{} as any,
		{} as any,
		{} as any,
		{} as any,
		{} as any,
		{} as any,
		stateManager,
		{} as any,
		process.cwd(),
		"task-native-parity",
		"ulid-native-parity",
		"backgroundExec",
		undefined,
		false,
		sinon.stub().resolves(undefined),
		sinon.stub().resolves({ response: "yesButtonClicked" }),
		sinon.stub().resolves(),
		sinon.stub().resolves("missing"),
		sinon.stub().resolves(),
		sinon.stub().resolves([false, "ok"]),
		sinon.stub().resolves(false),
		sinon.stub().resolves(false),
		sinon.stub().resolves({}),
		sinon.stub().resolves(false),
		sinon.stub().resolves(),
		sinon.stub().resolves(),
		sinon.stub().resolves(undefined),
		sinon.stub().resolves(undefined),
		sinon.stub().resolves({}),
	)

	const coordinatorValue: unknown = Reflect.get(executor, "coordinator")
	if (!(coordinatorValue instanceof ToolExecutorCoordinator)) {
		throw new Error("Expected ToolExecutorCoordinator on ToolExecutor.")
	}

	return {
		executor,
		taskState,
		coordinator: coordinatorValue,
		executeStub: sinon.stub(coordinatorValue, "execute"),
	}
}

describe("ToolExecutor native tool parity", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("returns a rejected outcome and marks skipped native calls when execution is denied", async () => {
		const { executor, taskState, executeStub } = createExecutor()
		taskState.didRejectTool = true

		const outcome = await executor.executeTool(createReadFileNativeBlock("call_denied"))

		sinon.assert.notCalled(executeStub)
		assert.deepEqual(outcome, {
			status: "rejected",
			emittedToolResult: false,
			workflowNextActions: [],
		})
		assert.equal(taskState.nativeToolCallIdsSkipped.has("call_denied"), true)
		assert.equal(taskState.nativeToolCallIdsBreakingPreviousResponseChain.has("call_denied"), true)
	})

	it("tracks executed native calls and emitted tool results for successful executions", async () => {
		const { executor, taskState, executeStub } = createExecutor()
		executeStub.resolves("file contents")

		const outcome = await executor.executeTool(createReadFileNativeBlock("call_read_file"))

		assert.deepEqual(outcome, {
			status: "executed",
			emittedToolResult: true,
			workflowNextActions: [],
		})
		assert.equal(taskState.nativeToolCallIdsExecuted.has("call_read_file"), true)
		assert.equal(taskState.nativeToolCallIdsWithResults.has("call_read_file"), true)
		assert.equal(taskState.nativeToolCallIdsSkipped.has("call_read_file"), false)
		assert.equal(taskState.nativeToolCallIdsBreakingPreviousResponseChain.has("call_read_file"), false)
	})

	it("registers record_findings and leaves the retired code_review_spec_update handler absent", () => {
		const { coordinator } = createExecutor()
		const recordFindingsHandler = coordinator.getHandler(ClineDefaultTool.RECORD_FINDINGS)

		assert.equal(coordinator.has(ClineDefaultTool.RECORD_FINDINGS), true)
		assert.notEqual(recordFindingsHandler, undefined)
		assert.equal(recordFindingsHandler?.name, ClineDefaultTool.RECORD_FINDINGS)
		assert.equal(recordFindingsHandler?.getDescription(createRecordFindingsBlock()), "[record_findings]")
		assert.equal(coordinator.has("code_review_spec_update"), false)
		assert.equal(coordinator.getHandler("code_review_spec_update"), undefined)
	})
})
