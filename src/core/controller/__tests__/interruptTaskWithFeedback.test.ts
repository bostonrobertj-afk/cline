import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import sinon from "sinon"
import { Controller } from ".."

describe("Controller.interruptTaskWithFeedback", () => {
	it("aborts the current task and resumes it with the steer payload", async () => {
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
			resumeTaskFromHistory: sinon.stub().resolves(),
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
		assert.equal(interruptedTask.taskState.abandoned, true)
		sinon.assert.calledOnce(fakeController.updateBackgroundCommandState)
		sinon.assert.calledOnceWithExactly(interruptedTask.resumeTaskFromHistory, "followup", {
			response: "messageResponse",
			text: "Please stop and reassess",
			images: ["img-1"],
			files: ["file-1"],
		})
		sinon.assert.notCalled(fakeController.openHistoricalTaskPassively)
		assert.equal(fakeController.cancelInProgress, false)
	})

	it("reopens passively when there is no steer payload", async () => {
		const interruptedTask = {
			taskId: "task-2",
			taskState: {
				isStreaming: false,
				didFinishAbortingStream: true,
				isWaitingForFirstChunk: false,
				abandoned: false,
			},
			abortTask: sinon.stub().resolves(),
			say: sinon.stub().resolves(),
			resumeTaskFromHistory: sinon.stub().resolves(),
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
			getTaskWithId: sinon.stub().resolves({ historyItem: { id: "task-2" } }),
			openHistoricalTaskPassively: sinon.stub().resolves(),
		}

		await Controller.prototype.interruptTaskWithFeedback.call(fakeController as unknown as Controller)

		sinon.assert.calledOnce(interruptedTask.abortTask)
		sinon.assert.notCalled(interruptedTask.resumeTaskFromHistory)
		sinon.assert.calledOnceWithExactly(fakeController.openHistoricalTaskPassively, { id: "task-2" })
		assert.equal(fakeController.cancelInProgress, false)
	})
})
