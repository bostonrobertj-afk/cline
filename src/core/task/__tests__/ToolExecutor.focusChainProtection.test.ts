import { strict as assert } from "node:assert"
import { formatResponse } from "@core/prompts/responses"
import { ClineDefaultTool } from "@shared/tools"
import { describe, it } from "mocha"
import sinon from "sinon"
import { TaskState } from "../TaskState"
import { ToolExecutor } from "../ToolExecutor"

describe("ToolExecutor focus chain protection", () => {
	it("appends rejection feedback to the next-turn user message content", async () => {
		const taskState = new TaskState()
		const stateManager = {
			getGlobalSettingsKey: sinon.stub().callsFake((key: string) => {
				if (key === "focusChainSettings") {
					return { enabled: true, remindClineInterval: 6 }
				}
				if (key === "mode") {
					return "act"
				}
				if (key === "hooksEnabled") {
					return false
				}
				if (key === "enableParallelToolCalling") {
					return false
				}
				return false
			}),
			getApiConfiguration: sinon.stub().returns({ actModeApiProvider: "openai", planModeApiProvider: "openai" }),
		} as any

		const updateFCListFromToolResponse = sinon.stub().resolves({
			accepted: false,
			feedback: "A task list already exists.\n\nCurrent checklist:\n\n- [ ] Step 1: Gather Context",
		})

		const executor = new ToolExecutor(
			taskState,
			{} as any,
			{ getModel: sinon.stub().returns({ id: "gpt-5.4-mini" }) } as any,
			{} as any,
			{ closeBrowser: sinon.stub().resolves() } as any,
			{} as any,
			{} as any,
			{} as any,
			{} as any,
			{} as any,
			{} as any,
			stateManager,
			".",
			"task-id",
			"ulid",
			"vscodeTerminal",
			undefined,
			false,
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves([false, "command executed"]),
			sinon.stub().resolves(false),
			sinon.stub().resolves(false),
			updateFCListFromToolResponse,
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
		)

		;(executor as any).coordinator = {
			execute: sinon.stub().resolves("tool ok"),
			getHandler: sinon.stub().returns(undefined),
		}

		const block = {
			type: "tool_use",
			name: ClineDefaultTool.FILE_READ,
			params: {
				path: "README.md",
				task_progress: "- [ ] Step 1: Something else",
			},
			partial: false,
		} as any

		await (executor as any).handleCompleteBlock(block, { taskId: "task-id", callbacks: { cancelTask: sinon.stub() } })

		assert.equal(updateFCListFromToolResponse.calledOnce, true)
		assert.equal(taskState.userMessageContent.length, 2)
		const feedbackBlock = taskState.userMessageContent[1] as { type?: string; text?: string }
		assert.equal(feedbackBlock.type, "text")
		assert.match(String(feedbackBlock.text), /A task list already exists\./)
		assert.match(String(feedbackBlock.text), /Current checklist:/)
	})

	it("rejects attempt_completion in the same turn when task_progress would replace an existing checklist", async () => {
		const taskState = new TaskState()
		const stateManager = {
			getGlobalSettingsKey: sinon.stub().callsFake((key: string) => {
				if (key === "focusChainSettings") {
					return { enabled: true, remindClineInterval: 6 }
				}
				if (key === "mode") {
					return "act"
				}
				if (key === "hooksEnabled") {
					return false
				}
				if (key === "enableParallelToolCalling") {
					return false
				}
				return false
			}),
			getApiConfiguration: sinon.stub().returns({ actModeApiProvider: "openai", planModeApiProvider: "openai" }),
		} as any

		const updateFCListFromToolResponse = sinon.stub().onFirstCall().resolves({
			accepted: false,
			feedback: "A task list already exists.\n\nCurrent checklist:\n\n- [ ] Step 1: Gather Context",
		})

		const executor = new ToolExecutor(
			taskState,
			{} as any,
			{ getModel: sinon.stub().returns({ id: "gpt-5.4-mini" }) } as any,
			{} as any,
			{ closeBrowser: sinon.stub().resolves() } as any,
			{} as any,
			{} as any,
			{} as any,
			{} as any,
			{} as any,
			{} as any,
			stateManager,
			".",
			"task-id",
			"ulid",
			"vscodeTerminal",
			undefined,
			false,
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves([false, "command executed"]),
			sinon.stub().resolves(false),
			sinon.stub().resolves(false),
			updateFCListFromToolResponse,
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
			sinon.stub().resolves(undefined),
		)

		const executeStub = sinon.stub().resolves("should not run")
		const pushToolResultSpy = sinon.spy(executor as any, "pushToolResult")
		;(executor as any).coordinator = {
			execute: executeStub,
			getHandler: sinon.stub().returns(undefined),
		}

		const block = {
			type: "tool_use",
			name: ClineDefaultTool.ATTEMPT,
			params: {
				result: "Done",
				task_progress: "- [ ] Something else",
			},
			partial: false,
		} as any

		await (executor as any).handleCompleteBlock(block, { taskId: "task-id", callbacks: { cancelTask: sinon.stub() } })

		assert.equal(updateFCListFromToolResponse.calledOnce, true)
		assert.equal(executeStub.called, false)
		assert.equal(pushToolResultSpy.calledOnce, true)
		assert.match(String(pushToolResultSpy.firstCall.args[0]), /A task list already exists\./)
		assert.equal(taskState.userMessageContent.length, 1)
		assert.equal((taskState.userMessageContent[0] as any).type, "text")
		assert.match(String((taskState.userMessageContent[0] as any).text), /^\[attempt_completion\] Result:\n/)
		assert.match(
			String((taskState.userMessageContent[0] as any).text),
			new RegExp(
				formatResponse
					.toolError("A task list already exists.\n\nCurrent checklist:\n\n- [ ] Step 1: Gather Context")
					.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
			),
		)
	})
})
