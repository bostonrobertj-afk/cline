import { strict as assert } from "node:assert"
import * as disk from "@core/storage/disk"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { Logger } from "@/shared/services/Logger"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../../../TaskState"
import { RESPONSE_TOOL_SUCCESS_MESSAGE } from "../../response/types"
import type { TaskConfig } from "../../types/TaskConfig"
import { SendUserMessageHandler } from "../SendUserMessageHandler"

function createConfig(mode: "act" | "plan" = "act") {
	const taskState = new TaskState()
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		clearPartialResponseToolPreview: sinon.stub().resolves(false),
	}

	const config = {
		taskId: "task-1",
		mode,
		taskState,
		messageState: {
			getClineMessages: () => [],
		},
		callbacks,
	} as unknown as TaskConfig

	return { config, callbacks, taskState }
}

describe("SendUserMessageHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("displays a message in ACT mode", async () => {
		const { config, callbacks, taskState } = createConfig("act")
		const handler = new SendUserMessageHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.SEND_USER_MESSAGE,
			params: {
				message: "That is a good choice.",
			},
			partial: false,
		})

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		sinon.assert.calledOnce(callbacks.clearPartialResponseToolPreview)
		sinon.assert.calledOnce(callbacks.say)
		sinon.assert.calledWithExactly(callbacks.say, "text", "That is a good choice.", undefined, undefined, false)
		assert.equal(taskState.responseToolTurnShouldEnd, true)
		assert.equal(taskState.responseToolTurnCompletedBy, ClineDefaultTool.SEND_USER_MESSAGE)
	})

	it("displays a message in PLAN mode", async () => {
		const { config, callbacks, taskState } = createConfig("plan")
		const handler = new SendUserMessageHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.SEND_USER_MESSAGE,
			params: {
				message: "I see the tradeoff here.",
			},
			partial: false,
		})

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		sinon.assert.calledOnce(callbacks.clearPartialResponseToolPreview)
		sinon.assert.calledOnce(callbacks.say)
		sinon.assert.calledWithExactly(callbacks.say, "text", "I see the tradeoff here.", undefined, undefined, false)
		assert.equal(taskState.responseToolTurnShouldEnd, true)
		assert.equal(taskState.responseToolTurnCompletedBy, ClineDefaultTool.SEND_USER_MESSAGE)
	})

	it("allows consecutive send_user_message calls", async () => {
		const { config, callbacks, taskState } = createConfig("act")
		taskState.lastToolName = ClineDefaultTool.SEND_USER_MESSAGE
		const handler = new SendUserMessageHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.SEND_USER_MESSAGE,
			params: {
				message: "Following up with another message.",
			},
			partial: false,
		})

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		sinon.assert.calledOnce(callbacks.clearPartialResponseToolPreview)
		sinon.assert.calledOnce(callbacks.say)
	})

	it("coalesces partial updates into a preview row instead of appending new text rows", async () => {
		const handler = new SendUserMessageHandler()
		const uiHelpers = {
			removeClosingTag: sinon.stub().returns("Streaming preview"),
			upsertPartialResponseToolSayPreview: sinon.stub().resolves(true),
		} as any

		await handler.handlePartialBlock(
			{
				type: "tool_use",
				name: ClineDefaultTool.SEND_USER_MESSAGE,
				call_id: "call_send_user_message",
				params: {
					message: "Streaming preview",
				},
				partial: true,
			} as any,
			uiHelpers,
		)

		sinon.assert.calledOnceWithExactly(
			uiHelpers.upsertPartialResponseToolSayPreview,
			sinon.match({
				name: ClineDefaultTool.SEND_USER_MESSAGE,
				call_id: "call_send_user_message",
			}),
			"text",
			"Streaming preview",
		)
	})

	it("returns a missing-param error when message is absent", async () => {
		const { config, callbacks } = createConfig("act")
		const handler = new SendUserMessageHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.SEND_USER_MESSAGE,
			params: {},
			partial: false,
		})

		assert.equal(result, "missing")
		sinon.assert.notCalled(callbacks.say)
		sinon.assert.calledOnce(callbacks.sayAndCreateMissingParamError)
		sinon.assert.calledWithExactly(callbacks.sayAndCreateMissingParamError, ClineDefaultTool.SEND_USER_MESSAGE, "message")
	})

	it("emits an agent_feedback row after the user-visible text row", async () => {
		sinon.stub(disk, "appendAgentFeedbackAuditEntry").resolves()
		sinon.stub(Logger, "info")
		const { config, callbacks } = createConfig("act")
		const handler = new SendUserMessageHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.SEND_USER_MESSAGE,
			params: {
				message: "Working through it.",
				agent_feedback: {
					message: "Blocked on unstable behavior.",
				},
			},
			partial: false,
		})

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		assert.equal(callbacks.say.callCount, 2)
		sinon.assert.calledWithExactly(callbacks.say.firstCall, "text", "Working through it.", undefined, undefined, false)
		assert.equal(callbacks.say.secondCall.args[0], "agent_feedback")
		assert.equal(callbacks.say.secondCall.args[2], undefined)
		assert.equal(callbacks.say.secondCall.args[3], undefined)
		assert.equal(callbacks.say.secondCall.args[4], false)

		const payload = JSON.parse(callbacks.say.secondCall.args[1] as string)
		assert.equal(payload.label, "Real-Time Agent Feedback")
		assert.equal(payload.message, "Blocked on unstable behavior.")
		assert.equal(payload.toolName, ClineDefaultTool.SEND_USER_MESSAGE)
		assert.equal(payload.taskId, "task-1")
		assert.equal(typeof payload.timestamp, "string")
		assert.equal(typeof payload.turnIdentifier, "number")
		assert.equal(typeof payload.apiCallIdentifier, "number")
	})
})
