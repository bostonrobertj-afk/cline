import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { ActModeRespondHandler } from "../ActModeRespondHandler"

function createConfig() {
	const taskState = new TaskState()
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		updateFCListFromToolResponse: sinon.stub().resolves(),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
	}

	const config = {
		mode: "act",
		taskState,
		callbacks,
	} as unknown as TaskConfig

	return { config, callbacks, taskState }
}

describe("ActModeRespondHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("displays a message when act_mode_respond is not consecutive", async () => {
		const { config, callbacks } = createConfig()
		const handler = new ActModeRespondHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.ACT_MODE,
			params: {
				response: "Reviewing the findings file now.",
			},
			partial: false,
		})

		assert.equal(typeof result, "string")
		assert.match(result as string, /Message displayed/)
		sinon.assert.calledOnce(callbacks.say)
		sinon.assert.calledWithExactly(callbacks.say, "text", "Reviewing the findings file now.", undefined, undefined, false)
	})

	it("blocks a consecutive act_mode_respond call in the same turn", async () => {
		const { config, callbacks, taskState } = createConfig()
		taskState.lastToolName = ClineDefaultTool.ACT_MODE
		const handler = new ActModeRespondHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.ACT_MODE,
			params: {
				response: "Still narrating.",
			},
			partial: false,
		})

		assert.equal(typeof result, "string")
		assert.match(result as string, /\[BLOCKED\]/)
		sinon.assert.notCalled(callbacks.say)
	})

	it("allows act_mode_respond again after the turn-scoped tracker is cleared", async () => {
		const { config, callbacks, taskState } = createConfig()
		taskState.lastToolName = ""
		const handler = new ActModeRespondHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: ClineDefaultTool.ACT_MODE,
			params: {
				response: "Starting the next turn's work.",
			},
			partial: false,
		})

		assert.equal(typeof result, "string")
		assert.match(result as string, /Message displayed/)
		sinon.assert.calledOnce(callbacks.say)
		sinon.assert.calledWithExactly(callbacks.say, "text", "Starting the next turn's work.", undefined, undefined, false)
	})
})
