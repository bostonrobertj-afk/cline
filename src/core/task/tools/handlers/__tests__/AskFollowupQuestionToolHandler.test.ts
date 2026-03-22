import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { TaskState } from "../../../TaskState"
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

	it("returns explicit user provenance and selected option details for option responses", async () => {
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

		assert.equal(typeof result, "string")
		assert.match(result as string, /<answer>/)
		assert.match(result as string, /Source: user/)
		assert.match(result as string, /Tool: ask_followup_question/)
		assert.match(result as string, /Question: Proceed with the review summary\?/)
		assert.match(result as string, /Response kind: selected_option/)
		assert.match(result as string, /Selected option: Proceed/)
		assert.match(result as string, /Answer:\nProceed/)
		assert.deepEqual(JSON.parse(lastFollowupMessage.text), {
			question: "Proceed with the review summary?",
			options: ["Proceed", "Hold"],
			selected: "Proceed",
		})
		sinon.assert.calledOnce(saveClineMessagesAndUpdateHistory)
	})

	it("returns explicit user provenance and freeform details for non-option responses", async () => {
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

		assert.equal(typeof result, "string")
		assert.match(result as string, /<answer>/)
		assert.match(result as string, /Source: user/)
		assert.match(result as string, /Response kind: freeform/)
		assert.doesNotMatch(result as string, /Selected option:/)
		assert.match(result as string, /Answer:\nPlease summarize the risks first\./)
		sinon.assert.calledOnce(callbacks.say)
		sinon.assert.calledWithExactly(callbacks.say, "user_feedback", "Please summarize the risks first.", undefined, undefined)
		sinon.assert.notCalled(saveClineMessagesAndUpdateHistory)
	})
})
