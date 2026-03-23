import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import sinon from "sinon"
import { Controller } from ".."

describe("Controller.interruptTaskWithFeedback", () => {
	it("aborts the current task and restores a passive thread view for steering", async () => {
		const interruptedTask = {
			taskId: "task-1",
			taskState: {
				isStreaming: false,
				didFinishAbortingStream: true,
				isWaitingForFirstChunk: false,
				abandoned: false,
			},
			abortTask: sinon.stub().resolves(),
			say: sinon.stub().resolves(),
		}

		const fakeController: {
			cancelInProgress: boolean
			backgroundCommandRunning: boolean
			task: typeof interruptedTask
			updateBackgroundCommandState: sinon.SinonStub
			getTaskWithId: sinon.SinonStub
			openHistoricalTaskPassively: sinon.SinonStub
		} = {
			cancelInProgress: false,
			backgroundCommandRunning: false,
			task: interruptedTask,
			updateBackgroundCommandState: sinon.stub(),
			getTaskWithId: sinon.stub().resolves({ historyItem: { id: "task-1" } }),
			openHistoricalTaskPassively: sinon.stub().resolves(),
		}

		await Controller.prototype.interruptTaskWithFeedback.call(
			fakeController as unknown as Controller,
			"Please stop and reassess",
			["img-1"],
			["file-1"],
		)

		sinon.assert.calledOnce(interruptedTask.abortTask)
		sinon.assert.calledOnceWithExactly(
			interruptedTask.say,
			"user_feedback",
			"Please stop and reassess",
			["img-1"],
			["file-1"],
		)
		assert.equal(interruptedTask.taskState.abandoned, true)
		sinon.assert.calledOnce(fakeController.updateBackgroundCommandState)
		sinon.assert.calledOnceWithExactly(fakeController.openHistoricalTaskPassively, { id: "task-1" })
		assert.equal(fakeController.cancelInProgress, false)
	})
})
