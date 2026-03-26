import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { AttemptCompletionHandler } from "../AttemptCompletionHandler"

function createConfig(options?: { autoApproveCommand?: boolean }): {
	config: TaskConfig
	callbacks: Record<string, sinon.SinonStub>
	taskState: TaskState
} {
	const taskState = new TaskState()
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask: sinon.stub(),
		saveCheckpoint: sinon.stub().resolves(),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
		executeCommandTool: sinon.stub().resolves([false, "ok"]),
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
		taskState,
		messageState: {
			getClineMessages: () => [],
			saveClineMessagesAndUpdateHistory: sinon.stub().resolves(),
		},
		api: {
			getModel: () => ({ id: "gpt-5", info: {} }),
		},
		autoApprovalSettings: {
			enableNotifications: false,
			actions: { executeSafeCommands: false, executeAllCommands: false },
		},
		autoApprover: {
			shouldAutoApproveTool: sinon.stub().returns(options?.autoApproveCommand ? true : [false, false]),
		},
		browserSettings: {},
		focusChainSettings: { enabled: false },
		services: {
			stateManager: {
				getGlobalSettingsKey: (key: string) => {
					if (key === "hooksEnabled") return false
					if (key === "mode") return "act"
					if (key === "customPrompt") return undefined
					if (key === "maxConsecutiveMistakes") return 5
					if (key === "yoloModeToggled") return false
					if (key === "enableCheckpointsSetting") return false
					if (key === "focusChainSettings") return { enabled: false }
					return undefined
				},
				getGlobalStateKey: () => undefined,
				getWorkspaceStateKey: () => undefined,
				getRemoteConfigSettings: () => ({}),
				getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
			},
		},
		callbacks,
		coordinator: {
			getHandler: sinon.stub(),
		},
	} as unknown as TaskConfig

	return { config, callbacks, taskState }
}

describe("AttemptCompletionHandler post-completion follow-up", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("stores post-completion user input as deferred normal user turn content", async () => {
		const { config, callbacks, taskState } = createConfig()
		;(callbacks.ask as sinon.SinonStub).resolves({
			response: "messageResponse",
			text: "one more change",
		})
		;(callbacks.runUserPromptSubmitHook as sinon.SinonStub).resolves({
			contextModification: "hook context",
		})

		const handler = new AttemptCompletionHandler()
		const result = await handler.execute(config, {
			type: "tool_use",
			name: "attempt_completion",
			params: {
				result: "done",
			},
			partial: false,
		} as any)

		assert.equal(typeof result, "string")
		assert.doesNotMatch(String(result), /<feedback>/)
		sinon.assert.calledWithExactly(callbacks.say, "user_feedback", "one more change", undefined, undefined)
		sinon.assert.calledOnce(callbacks.runUserPromptSubmitHook)
		assert.equal(taskState.didAttemptCompletionEndTask, true)
		assert.equal(taskState.responseToolTurnShouldEnd, true)
		assert.equal(taskState.responseToolTurnCompletedBy, ClineDefaultTool.ATTEMPT)
		assert.deepEqual(taskState.pendingResponseToolFollowup, {
			toolName: ClineDefaultTool.ATTEMPT,
			route: "normal_user_turn",
			text: "one more change",
			images: undefined,
			files: undefined,
			hookContext: "hook context",
		})
	})

	it("runs attempt_completion commands without opening blocking command_output asks", async () => {
		const { config, callbacks } = createConfig({ autoApproveCommand: true })
		;(callbacks.ask as sinon.SinonStub).resolves({
			response: "yesButtonClicked",
		})

		const handler = new AttemptCompletionHandler()
		await handler.execute(config, {
			type: "tool_use",
			name: "attempt_completion",
			params: {
				result: "done",
				command: "echo hi",
			},
			partial: false,
		} as any)

		sinon.assert.calledWithExactly(callbacks.executeCommandTool, "echo hi", undefined, {
			suppressBlockingAsk: true,
		})
	})
})
