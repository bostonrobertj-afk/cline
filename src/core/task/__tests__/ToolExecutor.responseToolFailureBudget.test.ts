import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { ClineDefaultTool } from "@/shared/tools"
import { formatResponse } from "../../prompts/responses"
import { TaskState } from "../TaskState"
import { ToolExecutor } from "../ToolExecutor"

function createExecutor() {
	const taskState = new TaskState()
	const say = sinon.stub().resolves(undefined)
	const browserSession = {
		closeBrowser: sinon.stub().resolves(),
		dispose: sinon.stub().resolves(),
	} as any
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
		browserSession,
		{} as any,
		{} as any,
		{} as any,
		{} as any,
		{} as any,
		{} as any,
		stateManager,
		process.cwd(),
		"task-1",
		"ulid-1",
		"backgroundExec",
		undefined,
		false,
		say,
		sinon.stub().resolves({ response: "yesButtonClicked" }),
		sinon.stub().resolves(),
		sinon.stub().resolves(formatResponse.toolError("missing")),
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
		sinon.stub().resolves(undefined),
	)

	const coordinator = (executor as any).coordinator
	sinon.stub(coordinator, "has").returns(true)
	sinon.stub(coordinator, "getHandler").callsFake((...args: unknown[]) => ({
		getDescription: () => `[${String(args[0])}]`,
	}))

	const executeStub = sinon.stub(coordinator, "execute")

	return { executor, taskState, say, executeStub }
}

describe("ToolExecutor response tool failure budget", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("emits a human-visible error on the second governed response-tool failure", async () => {
		const { executor, taskState, say, executeStub } = createExecutor()
		taskState.recordResponseToolFailure(ClineDefaultTool.ASK, "Missing first parameter", "missing_parameter")
		executeStub.resolves(
			formatResponse.toolError("Missing value for required parameter 'question'. Please retry with complete response."),
		)

		await executor.executeTool({
			type: "tool_use",
			name: ClineDefaultTool.ASK,
			params: {
				question: "Proceed?",
			},
			partial: false,
		} as any)

		assert.equal(taskState.responseToolFailureCount, 2)
		sinon.assert.calledWithMatch(
			say,
			"error",
			sinon
				.match("Response tool failed twice in the current AI turn.")
				.and(sinon.match(`Tool: ${ClineDefaultTool.ASK}`))
				.and(sinon.match("Detected cause: missing_parameter")),
		)
	})

	it("allows exactly one governed response-tool retry after the first failure", async () => {
		const { executor, taskState, say, executeStub } = createExecutor()
		taskState.recordResponseToolFailure(ClineDefaultTool.ASK, "Missing first parameter", "missing_parameter")
		executeStub.resolves("missing again")

		await executor.executeTool({
			type: "tool_use",
			name: ClineDefaultTool.ASK,
			params: {
				question: "Proceed?",
			},
			partial: false,
		} as any)

		sinon.assert.calledOnce(executeStub)
		sinon.assert.notCalled(say)
		assert.equal(taskState.responseToolFailureCount, 1)
	})

	it("blocks further governed response-tool attempts after the retry budget is exhausted", async () => {
		const { executor, taskState, executeStub } = createExecutor()
		taskState.recordResponseToolFailure(ClineDefaultTool.ASK, "first", "missing_parameter")
		taskState.recordResponseToolFailure(ClineDefaultTool.ASK, "second", "missing_parameter")

		await executor.executeTool({
			type: "tool_use",
			name: ClineDefaultTool.ASK,
			params: {
				question: "Proceed?",
			},
			partial: false,
		} as any)

		sinon.assert.notCalled(executeStub)
		assert.equal(taskState.userMessageContent.length, 1)
		assert.match(String((taskState.userMessageContent[0] as { text?: string }).text), /retry budget/)
	})

	it("does not block generate_plan_output internal control branches when the retry budget is exhausted", async () => {
		const { executor, taskState, executeStub } = createExecutor()
		taskState.recordResponseToolFailure(ClineDefaultTool.ASK, "first", "missing_parameter")
		taskState.recordResponseToolFailure(ClineDefaultTool.ASK, "second", "missing_parameter")
		executeStub.resolves(
			formatResponse.toolResult(
				"[You have indicated that you need more exploration. Proceed with calling tools to continue the planning process.]",
			),
		)

		await executor.executeTool({
			type: "tool_use",
			name: ClineDefaultTool.PLAN_MODE,
			params: {
				response: "Need more exploration",
				needs_more_exploration: "true",
			},
			partial: false,
		} as any)

		sinon.assert.calledOnce(executeStub)
	})
})
