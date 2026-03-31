import { strict as assert } from "node:assert"
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

	it("routes attempt_completion task_progress through the post-tool focus-chain path after execution", async () => {
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

		const updateFCListFromToolResponse = sinon.stub().resolves({ accepted: true })

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

		const executeStub = sinon.stub().resolves("[attempt_completion] Result:\nDone")
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
		assert.equal(executeStub.calledOnce, true)
		assert.equal(updateFCListFromToolResponse.firstCall.args[0], "- [ ] Something else")
		assert.ok(updateFCListFromToolResponse.firstCall.args[1])
		assert.equal(updateFCListFromToolResponse.firstCall.args[1].toolName, "attempt_completion")
		assert.equal(updateFCListFromToolResponse.firstCall.args[1].toolWasExecuted, true)
	})

	it("keeps post-tool task_progress feedback with isolated end-turn response-tool results", async () => {
		const taskState = new TaskState()
		taskState.markResponseToolTurnComplete(ClineDefaultTool.SEND_USER_MESSAGE, "end_turn")
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
					return true
				}
				return false
			}),
			getApiConfiguration: sinon.stub().returns({ actModeApiProvider: "openai", planModeApiProvider: "openai" }),
		} as any

		const updateFCListFromToolResponse = sinon.stub().resolves({
			accepted: false,
			feedback: 'Do not include `task_progress` on a tool call until the active step\'s "Done Signal" is true.',
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
			execute: sinon.stub().resolves("[Message displayed.]"),
			getHandler: sinon.stub().returns(undefined),
		}

		await (executor as any).handleCompleteBlock(
			{
				type: "tool_use",
				name: ClineDefaultTool.SEND_USER_MESSAGE,
				params: {
					message: "Done",
					task_progress: "__COMPLETE_NEXT_STEP__",
				},
				partial: false,
			},
			{ taskId: "task-id", callbacks: { cancelTask: sinon.stub() } },
		)

		assert.equal(taskState.userMessageContent.length, 0)
		assert.equal(taskState.completedResponseToolResultContent.length, 2)
		assert.equal((taskState.completedResponseToolResultContent[0] as any).type, "text")
		assert.match(String((taskState.completedResponseToolResultContent[0] as any).text), /^\[send_user_message\] Result:\n/)
		assert.equal((taskState.completedResponseToolResultContent[1] as any).type, "text")
		assert.match(
			String((taskState.completedResponseToolResultContent[1] as any).text),
			/Do not include `task_progress` on a tool call until the active step's "Done Signal" is true\./,
		)
	})
})
