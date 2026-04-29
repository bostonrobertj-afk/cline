import { strict as assert } from "node:assert"
import { formatResponse } from "@core/prompts/responses"
import * as disk from "@core/storage/disk"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { Logger } from "@/shared/services/Logger"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../../../TaskState"
import { RESPONSE_TOOL_SUCCESS_MESSAGE } from "../../response/types"
import type { TaskConfig } from "../../types/TaskConfig"
import { PlanModeRespondHandler } from "../PlanModeRespondHandler"

function createConfig(options?: { askResult?: { text?: string; images?: string[]; files?: string[] }; lastPlanMessage?: any }) {
	const taskState = new TaskState()
	const clineMessages = options?.lastPlanMessage ? [options.lastPlanMessage] : []
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask: sinon.stub().resolves(options?.askResult ?? { text: "Proceed" }),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		switchToActMode: sinon.stub().resolves(false),
	}

	const saveClineMessagesAndUpdateHistory = sinon.stub().resolves()

	const config = {
		taskId: "task-1",
		ulid: "ulid-1",
		mode: "plan",
		yoloModeToggled: false,
		taskState,
		messageState: {
			getClineMessages: () => clineMessages,
			saveClineMessagesAndUpdateHistory,
		},
		services: {
			stateManager: {
				getGlobalSettingsKey: (key: string) => {
					if (key === "mode") return "plan"
					return undefined
				},
				getApiConfiguration: () => ({
					planModeApiProvider: "openai",
					actModeApiProvider: "openai",
				}),
			},
		},
		api: {
			getModel: () => ({ id: "openai/gpt-5", info: {} }),
		},
		callbacks,
	} as unknown as TaskConfig

	return { config, callbacks, saveClineMessagesAndUpdateHistory }
}

describe("PlanModeRespondHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("queues selected option responses as deferred next-turn human input", async () => {
		const lastPlanMessage = { ask: ClineDefaultTool.PLAN_MODE, text: "{}" }
		const { config, saveClineMessagesAndUpdateHistory } = createConfig({
			askResult: { text: "Proceed" },
			lastPlanMessage,
		})
		const handler = new PlanModeRespondHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.PLAN_MODE,
			params: {
				response: "Here is the plan.",
				options: JSON.stringify(["Proceed", "Revise"]),
			},
			partial: false,
		} as any)

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		assert.deepEqual(JSON.parse(lastPlanMessage.text), {
			response: "Here is the plan.",
			options: ["Proceed", "Revise"],
			selected: "Proceed",
		})
		sinon.assert.calledOnce(saveClineMessagesAndUpdateHistory)
		assert.equal(config.taskState.responseToolTurnShouldEnd, true)
		assert.equal(config.taskState.responseToolTurnCompletedBy, ClineDefaultTool.PLAN_MODE)
		assert.deepEqual(config.taskState.pendingResponseToolFollowup, {
			toolName: ClineDefaultTool.PLAN_MODE,
			route: "normal_user_turn",
			text: "Proceed",
			images: undefined,
			files: undefined,
		})
	})

	it("queues freeform plan responses as deferred next-turn human input", async () => {
		const { config, callbacks, saveClineMessagesAndUpdateHistory } = createConfig({
			askResult: { text: "Please revise the rollout section." },
		})
		const handler = new PlanModeRespondHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.PLAN_MODE,
			params: {
				response: "Here is the plan.",
				options: JSON.stringify(["Proceed", "Revise"]),
			},
			partial: false,
		} as any)

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		sinon.assert.calledOnce(callbacks.say)
		sinon.assert.calledWithExactly(callbacks.say, "user_feedback", "Please revise the rollout section.", undefined, undefined)
		sinon.assert.notCalled(saveClineMessagesAndUpdateHistory)
		assert.equal(config.taskState.responseToolTurnShouldEnd, true)
		assert.equal(config.taskState.responseToolTurnCompletedBy, ClineDefaultTool.PLAN_MODE)
		assert.deepEqual(config.taskState.pendingResponseToolFollowup, {
			toolName: ClineDefaultTool.PLAN_MODE,
			route: "normal_user_turn",
			text: "Please revise the rollout section.",
			images: undefined,
			files: undefined,
		})
	})

	it("creates the plan ask before emitting agent_feedback", async () => {
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

		const handler = new PlanModeRespondHandler()
		const execution = handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.PLAN_MODE,
			params: {
				response: "Here is the plan.",
				options: JSON.stringify(["Proceed", "Revise"]),
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

	it("rejects agent_feedback when needs_more_exploration is true", async () => {
		sinon.stub(disk, "appendAgentFeedbackAuditEntry").resolves()
		sinon.stub(Logger, "info")
		const { config, callbacks } = createConfig()
		const handler = new PlanModeRespondHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.PLAN_MODE,
			params: {
				response: "Here is the plan.",
				needs_more_exploration: "true",
				agent_feedback: {
					message: "Blocked on unstable behavior.",
				},
			},
			partial: false,
		} as any)

		assert.equal(
			result,
			formatResponse.toolError(
				"[agent_feedback is not allowed when generate_plan_output sets needs_more_exploration=true.]",
			),
		)
		sinon.assert.notCalled(callbacks.say)
		sinon.assert.notCalled(callbacks.ask)
	})
})
