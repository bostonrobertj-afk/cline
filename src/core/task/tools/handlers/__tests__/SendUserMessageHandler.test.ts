import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { SendUserMessageHandler } from "../SendUserMessageHandler"

function createConfig(mode: "act" | "plan" = "act") {
	const taskState = new TaskState()
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
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
		const { config, callbacks } = createConfig("act")
		const handler = new SendUserMessageHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.SEND_USER_MESSAGE,
			params: {
				message: "That is a good choice.",
			},
			partial: false,
		})

		assert.equal(typeof result, "string")
		assert.match(result as string, /Message displayed/)
		sinon.assert.calledOnce(callbacks.say)
		sinon.assert.calledWithExactly(callbacks.say, "text", "That is a good choice.", undefined, undefined, false)
	})

	it("displays a message in PLAN mode", async () => {
		const { config, callbacks } = createConfig("plan")
		const handler = new SendUserMessageHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.SEND_USER_MESSAGE,
			params: {
				message: "I see the tradeoff here.",
			},
			partial: false,
		})

		assert.equal(typeof result, "string")
		assert.match(result as string, /Message displayed/)
		sinon.assert.calledOnce(callbacks.say)
		sinon.assert.calledWithExactly(callbacks.say, "text", "I see the tradeoff here.", undefined, undefined, false)
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

		assert.equal(typeof result, "string")
		assert.doesNotMatch(result as string, /\[BLOCKED\]/)
		sinon.assert.calledOnce(callbacks.say)
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
