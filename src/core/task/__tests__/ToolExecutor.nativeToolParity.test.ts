import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { ClineDefaultTool } from "@/shared/tools"
import { formatResponse } from "../../prompts/responses"
import { TaskState } from "../TaskState"
import { ToolExecutor } from "../ToolExecutor"

function createExecutor() {
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

	const coordinator = (executor as any).coordinator
	sinon.stub(coordinator, "has").returns(true)
	sinon.stub(coordinator, "getHandler").callsFake((...args: unknown[]) => ({
		getDescription: () => `[${String(args[0])}]`,
	}))

	return {
		executor,
		taskState,
		coordinator,
		executeStub: sinon.stub(coordinator, "execute"),
	}
}

describe("ToolExecutor native tool parity", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("returns a rejected outcome and marks skipped native calls when execution is denied", async () => {
		const { executor, taskState, executeStub } = createExecutor()
		taskState.didRejectTool = true

		const outcome = await executor.executeTool({
			type: "tool_use",
			name: ClineDefaultTool.FILE_READ,
			params: {
				path: "src/index.ts",
			},
			partial: false,
			isNativeToolCall: true,
			call_id: "call_denied",
		} as any)

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

		const outcome = await executor.executeTool({
			type: "tool_use",
			name: ClineDefaultTool.FILE_READ,
			params: {
				path: "src/index.ts",
			},
			partial: false,
			isNativeToolCall: true,
			call_id: "call_read_file",
		} as any)

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

	it("returns true when executeInternalToolSilently receives a non-failure tool result", async () => {
		const { executor, taskState, executeStub } = createExecutor()
		executeStub.resolves("ok")

		const result = await executor.executeInternalToolSilently(ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE)

		assert.equal(result, true)
		assert.equal(executeStub.calledOnce, true)
		assert.deepEqual(executeStub.firstCall.args[1], {
			type: "tool_use",
			name: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE,
			params: {},
			partial: false,
		})
		assert.deepEqual(taskState.userMessageContent, [])
	})

	it("returns false when executeInternalToolSilently receives a formatted tool error result", async () => {
		const { executor, executeStub } = createExecutor()
		executeStub.resolves(formatResponse.toolError("boom"))

		const result = await executor.executeInternalToolSilently(ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE)

		assert.equal(result, false)
	})

	it("returns false when executeInternalToolSilently catches a coordinator throw", async () => {
		const { executor, executeStub } = createExecutor()
		executeStub.rejects(new Error("boom"))

		const result = await executor.executeInternalToolSilently(ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE)

		assert.equal(result, false)
	})
})
