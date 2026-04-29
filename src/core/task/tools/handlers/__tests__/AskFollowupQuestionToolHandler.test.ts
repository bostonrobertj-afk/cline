import { strict as assert } from "node:assert"
import * as disk from "@core/storage/disk"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { Logger } from "@/shared/services/Logger"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../../../TaskState"
import { RESPONSE_TOOL_SUCCESS_MESSAGE } from "../../response/types"
import type { TaskConfig } from "../../types/TaskConfig"
import { AskFollowupQuestionToolHandler } from "../AskFollowupQuestionToolHandler"

function createConfig(options?: {
	askResult?: { text?: string; images?: string[]; files?: string[] }
	lastFollowupMessage?: any
}) {
	const taskState = new TaskState()
	const clineMessages = options?.lastFollowupMessage ? [options.lastFollowupMessage] : []
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask: sinon.stub().resolves(options?.askResult ?? { text: "Proceed" }),
		saveCheckpoint: sinon.stub().resolves(),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
		executeCommandTool: sinon.stub().resolves([false, "ok"]),
		cancelRunningCommandTool: sinon.stub().resolves(false),
		doesLatestTaskCompletionHaveNewChanges: sinon.stub().resolves(false),
		updateFCListFromToolResponse: sinon.stub().resolves(),
		shouldAutoApproveTool: sinon.stub().returns([false, false]),
		shouldAutoApproveToolWithPath: sinon.stub().resolves(false),
		postStateToWebview: sinon.stub().resolves(),
		reinitExistingTaskFromId: sinon.stub().resolves(),
		cancelTask: sinon.stub().resolves(),
		updateTaskHistory: sinon.stub().resolves([]),
		applyLatestBrowserSettings: sinon.stub().resolves(undefined),
		switchToActMode: sinon.stub().resolves(false),
		setActiveHookExecution: sinon.stub().resolves(),
		clearActiveHookExecution: sinon.stub().resolves(),
		getActiveHookExecution: sinon.stub().resolves(undefined),
		runUserPromptSubmitHook: sinon.stub().resolves({}),
	}

	const saveClineMessagesAndUpdateHistory = sinon.stub().resolves()

	const config = {
		taskId: "task-1",
		ulid: "ulid-1",
		cwd: "/tmp",
		mode: "act",
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		doubleCheckCompletionEnabled: false,
		vscodeTerminalExecutionMode: "backgroundExec",
		enableParallelToolCalling: true,
		isSubagentExecution: false,
		context: {},
		taskState,
		messageState: {
			getClineMessages: () => clineMessages,
			saveClineMessagesAndUpdateHistory,
		},
		api: {
			getModel: () => ({ id: "openai/gpt-5", info: {} }),
		},
		autoApprovalSettings: {
			enableNotifications: false,
			actions: { executeSafeCommands: false, executeAllCommands: false },
		},
		autoApprover: {
			shouldAutoApproveTool: sinon.stub().returns([false, false]),
		},
		browserSettings: {},
		focusChainSettings: {},
		services: {
			stateManager: {
				getGlobalSettingsKey: (key: string) => {
					if (key === "mode") return "act"
					if (key === "customPrompt") return undefined
					return undefined
				},
				getGlobalStateKey: () => undefined,
				getApiConfiguration: () => ({
					planModeApiProvider: "openai",
					actModeApiProvider: "openai",
				}),
			},
		},
		callbacks,
		coordinator: {
			getHandler: sinon.stub(),
		},
	} as unknown as TaskConfig

	return { config, callbacks, clineMessages, saveClineMessagesAndUpdateHistory }
}

describe("AskFollowupQuestionToolHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("queues selected option responses as deferred next-turn human input", async () => {
		const lastFollowupMessage = { ask: "followup", text: "{}" }
		const { config, saveClineMessagesAndUpdateHistory } = createConfig({
			askResult: { text: "Proceed" },
			lastFollowupMessage,
		})
		const handler = new AskFollowupQuestionToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "ask_followup_question",
			params: {
				question: "Proceed with the review summary?",
				options: JSON.stringify(["Proceed", "Hold"]),
			},
			partial: false,
		} as any)

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		assert.deepEqual(JSON.parse(lastFollowupMessage.text), {
			question: "Proceed with the review summary?",
			options: ["Proceed", "Hold"],
			selected: "Proceed",
		})
		sinon.assert.calledOnce(saveClineMessagesAndUpdateHistory)
		assert.equal(config.taskState.responseToolTurnShouldEnd, true)
		assert.equal(config.taskState.responseToolTurnCompletedBy, ClineDefaultTool.ASK)
		assert.deepEqual(config.taskState.pendingResponseToolFollowup, {
			toolName: ClineDefaultTool.ASK,
			route: "normal_user_turn",
			text: "Proceed",
			images: undefined,
			files: undefined,
		})
	})

	it("queues freeform responses as deferred next-turn human input", async () => {
		const { config, callbacks, saveClineMessagesAndUpdateHistory } = createConfig({
			askResult: { text: "Please summarize the risks first." },
		})
		const handler = new AskFollowupQuestionToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "ask_followup_question",
			params: {
				question: "Proceed with the review summary?",
				options: JSON.stringify(["Proceed", "Hold"]),
			},
			partial: false,
		} as any)

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		sinon.assert.calledOnce(callbacks.say)
		sinon.assert.calledWithExactly(callbacks.say, "user_feedback", "Please summarize the risks first.", undefined, undefined)
		sinon.assert.notCalled(saveClineMessagesAndUpdateHistory)
		assert.equal(config.taskState.responseToolTurnShouldEnd, true)
		assert.equal(config.taskState.responseToolTurnCompletedBy, ClineDefaultTool.ASK)
		assert.deepEqual(config.taskState.pendingResponseToolFollowup, {
			toolName: ClineDefaultTool.ASK,
			route: "normal_user_turn",
			text: "Please summarize the risks first.",
			images: undefined,
			files: undefined,
		})
	})

	it("emits agent_feedback after creating the followup ask and before consuming the response", async () => {
		sinon.stub(disk, "appendAgentFeedbackAuditEntry").resolves()
		sinon.stub(Logger, "info")
		const { config, callbacks } = createConfig()
		let resolveAsk: ((value: { text?: string; images?: string[]; files?: string[] }) => void) | undefined
		;(callbacks.ask as sinon.SinonStub).callsFake(
			() =>
				new Promise((resolve) => {
					resolveAsk = resolve
				}),
		)
		let resolveAgentFeedback: () => void = () => {}
		const agentFeedbackEmitted = new Promise<void>((resolve) => {
			resolveAgentFeedback = resolve
		})
		callbacks.say.callsFake(async (type: string) => {
			if (type === "agent_feedback") {
				resolveAgentFeedback()
			}
			return undefined
		})

		const handler = new AskFollowupQuestionToolHandler()
		const execution = handler.execute(config, {
			type: "tool_use",
			name: "ask_followup_question",
			params: {
				question: "Proceed with the review summary?",
				options: JSON.stringify(["Proceed", "Hold"]),
				agent_feedback: {
					message: "Blocked on unstable behavior.",
				},
			},
			partial: false,
		} as any)

		await agentFeedbackEmitted

		sinon.assert.calledOnce(callbacks.ask)
		sinon.assert.calledOnce(callbacks.say)
		assert.equal(callbacks.say.firstCall.args[0], "agent_feedback")
		assert.equal(callbacks.ask.firstCall.calledBefore(callbacks.say.firstCall), true)

		resolveAsk?.({ text: "Proceed" })

		const result = await execution
		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
	})
})
