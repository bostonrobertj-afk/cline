import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import sinon from "sinon"
import { Controller } from ".."

describe("Controller.cancelTask", () => {
	it("clears the active task after cancellation when thread visibility is not requested", async () => {
		const fakeController = {
			cancelInProgress: false,
			task: {
				taskId: "task-1",
				taskState: {
					isStreaming: false,
					didFinishAbortingStream: true,
					isWaitingForFirstChunk: false,
					abandoned: false,
				},
				abortTask: sinon.stub().resolves(),
			},
			updateBackgroundCommandState: sinon.stub(),
			getTaskWithId: sinon.stub().resolves({ historyItem: { id: "task-1" } }),
			initTask: sinon.stub().resolves(),
			clearTask: sinon.stub().resolves(),
			postStateToWebview: sinon.stub().resolves(),
		}

		await Controller.prototype.cancelTask.call(fakeController)

		sinon.assert.calledOnce(fakeController.task.abortTask)
		assert.equal(fakeController.task.taskState.abandoned, true)
		sinon.assert.calledOnce(fakeController.clearTask)
		sinon.assert.notCalled(fakeController.initTask)
		sinon.assert.called(fakeController.postStateToWebview)
		assert.equal(fakeController.cancelInProgress, false)
	})

	it("keeps the cancelled task visible without reopening passive history when preserveThreadVisible is true", async () => {
		const activeTask = {
			taskId: "task-1",
			taskState: {
				isStreaming: false,
				didFinishAbortingStream: true,
				isWaitingForFirstChunk: false,
				abandoned: false,
			},
			abortTask: sinon.stub().resolves(),
		}
		const fakeController = {
			cancelInProgress: false,
			task: activeTask,
			updateBackgroundCommandState: sinon.stub(),
			clearTask: sinon.stub().resolves(),
			postStateToWebview: sinon.stub().resolves(),
		}

		await Controller.prototype.cancelTask.call(fakeController, true)

		sinon.assert.calledOnce(activeTask.abortTask)
		sinon.assert.notCalled(fakeController.clearTask)
		sinon.assert.calledOnce(fakeController.postStateToWebview)
		assert.equal(fakeController.cancelInProgress, false)
	})
})
