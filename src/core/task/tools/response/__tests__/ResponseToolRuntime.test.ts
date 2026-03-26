import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { ResponseToolRuntime } from "../ResponseToolRuntime"

describe("ResponseToolRuntime", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("dismisses command_output asks before opening a blocking response ask", async () => {
		const runtime = new ResponseToolRuntime()
		const taskState = new TaskState()
		const callbacks = {
			say: sinon.stub().resolves(undefined),
			ask: sinon.stub().resolves({ response: "yesButtonClicked" }),
		}

		const config = {
			taskState,
			messageState: {
				getClineMessages: () => [{ ask: "command_output" }],
			},
			callbacks,
		} as unknown as TaskConfig

		const result = await runtime.askForResponse(config, ClineDefaultTool.ATTEMPT, "completion_result", "")

		assert.equal(result.response, "yesButtonClicked")
		sinon.assert.calledWithExactly(callbacks.say, "command_output", "")
		sinon.assert.calledWithExactly(callbacks.ask, "completion_result", "", false)
		assert.equal(taskState.activeResponseToolName, ClineDefaultTool.ATTEMPT)
	})

	it("returns command execution options that suppress only blocking asks", () => {
		const runtime = new ResponseToolRuntime()

		assert.deepEqual(runtime.getCommandExecutionOptions(ClineDefaultTool.ATTEMPT), {
			suppressBlockingAsk: true,
		})
		assert.equal(runtime.getCommandExecutionOptions(ClineDefaultTool.SEND_USER_MESSAGE), undefined)
	})
})
