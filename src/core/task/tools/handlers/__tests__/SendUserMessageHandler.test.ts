import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
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
		mode,
		taskState,
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
})
