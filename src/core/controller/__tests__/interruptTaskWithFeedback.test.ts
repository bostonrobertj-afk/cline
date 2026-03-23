import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import sinon from "sinon"
import { Controller } from ".."

describe("Controller.interruptTaskWithFeedback", () => {
	it("aborts the current task, reinitializes it from history, and injects the steer message into resume", async () => {
		const interruptedTask = {
			taskId: "task-1",
			taskState: {
				isStreaming: false,
				didFinishAbortingStream: true,
				isWaitingForFirstChunk: false,
				abandoned: false,
			},
			abortTask: sinon.stub().resolves(),
		}

		const resumedTask = {
			messageStateHandler: {
				getClineMessages: () => [{ type: "ask", ask: "followup" }],
			},
			handleWebviewAskResponse: sinon.stub().resolves(),
		}

		const fakeController: {
			cancelInProgress: boolean
			backgroundCommandRunning: boolean
			task: typeof interruptedTask | typeof resumedTask
			updateBackgroundCommandState: sinon.SinonStub
			getTaskWithId: sinon.SinonStub
			initTask: sinon.SinonStub
			stateManager: { clearTaskSettings: sinon.SinonStub }
		} = {
			cancelInProgress: false,
			backgroundCommandRunning: false,
			task: interruptedTask,
			updateBackgroundCommandState: sinon.stub(),
			getTaskWithId: sinon.stub().resolves({ historyItem: { id: "task-1" } }),
			initTask: sinon.stub().callsFake(async () => {
				fakeController.task = resumedTask
			}),
			stateManager: {
				clearTaskSettings: sinon.stub().resolves(),
			},
		}

		await Controller.prototype.interruptTaskWithFeedback.call(
			fakeController as unknown as Controller,
			"Please stop and reassess",
			["img-1"],
			["file-1"],
		)

		sinon.assert.calledOnce(interruptedTask.abortTask)
		assert.equal(interruptedTask.taskState.abandoned, true)
		sinon.assert.calledOnce(fakeController.updateBackgroundCommandState)
		sinon.assert.calledOnce(fakeController.getTaskWithId)
		sinon.assert.calledOnce(fakeController.stateManager.clearTaskSettings)
		sinon.assert.calledOnceWithExactly(
			fakeController.initTask,
			undefined,
			undefined,
			undefined,
			{ id: "task-1" },
			undefined,
			"followup",
		)
		sinon.assert.calledOnceWithExactly(
			resumedTask.handleWebviewAskResponse,
			"messageResponse",
			"Please stop and reassess",
			["img-1"],
			["file-1"],
		)
		assert.equal(fakeController.cancelInProgress, false)
	})
})
