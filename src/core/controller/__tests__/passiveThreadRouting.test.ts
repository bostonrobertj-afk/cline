import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import sinon from "sinon"
import { HostProvider } from "@/hosts/host-provider"
import { Controller } from ".."

describe("Controller passive thread routing", () => {
	it("resumes a passively open task with injected feedback", async () => {
		const task = {
			resumeTaskFromHistory: sinon.stub().resolves(),
		}
		const controller = {
			task,
		}

		await Controller.prototype.resumePassiveTaskWithFeedback.call(
			controller as unknown as Controller,
			"continue this thread",
			["img-1"],
			["file-1"],
		)

		sinon.assert.calledOnceWithExactly(task.resumeTaskFromHistory, "followup", {
			response: "messageResponse",
			text: "continue this thread",
			images: ["img-1"],
			files: ["file-1"],
		})
	})

	it("continues an active_user task as normal next-turn dialogue", async () => {
		const task = {
			continueTaskWithFeedback: sinon.stub().resolves(),
		}
		const controller = {
			task,
		}

		await Controller.prototype.continueActiveTaskWithFeedback.call(
			controller as unknown as Controller,
			"continue this active dialogue",
			["img-1"],
			["file-1"],
		)

		sinon.assert.calledOnceWithExactly(task.continueTaskWithFeedback, "continue this active dialogue", ["img-1"], ["file-1"])
	})

	it("prefers fresher in-memory state when passively reopening the active task", async () => {
		const apiConversationHistory = [{ role: "user", content: "fresh" }]
		const clineMessages = [{ ts: 1, type: "say", say: "text", text: "fresh" }]
		const task = {
			taskId: "task-1",
			messageStateHandler: {
				getApiConversationHistory: sinon.stub().returns(apiConversationHistory),
				getClineMessages: sinon.stub().returns(clineMessages),
				setApiConversationHistory: sinon.stub(),
				setClineMessages: sinon.stub(),
			},
			taskState: {
				isInitialized: false,
				abort: true,
				abandoned: true,
				isStreaming: true,
				isWaitingForFirstChunk: true,
				didFinishAbortingStream: true,
				askResponse: "messageResponse",
				askResponseText: "stale",
				askResponseImages: ["old"],
				askResponseFiles: ["old"],
				lastMessageTs: undefined as number | undefined,
			},
		}
		const controller = {
			task,
			getTaskWithId: sinon.stub().rejects(new Error("should not read disk")),
			postStateToWebview: sinon.stub().resolves(),
		}

		await (Controller.prototype as any).openHistoricalTaskPassively.call(controller as unknown as Controller, {
			id: "task-1",
		})

		sinon.assert.notCalled(controller.getTaskWithId)
		sinon.assert.calledOnceWithExactly(task.messageStateHandler.setApiConversationHistory, apiConversationHistory)
		sinon.assert.calledOnceWithExactly(task.messageStateHandler.setClineMessages, clineMessages)
		assert.equal(task.taskState.isInitialized, true)
		assert.equal(task.taskState.abort, false)
		assert.equal(task.taskState.abandoned, false)
		assert.equal(task.taskState.isStreaming, false)
		assert.equal(task.taskState.isWaitingForFirstChunk, false)
		assert.equal(task.taskState.didFinishAbortingStream, false)
		assert.equal(task.taskState.askResponse, undefined)
		assert.equal(task.taskState.lastMessageTs, 1)
		sinon.assert.calledOnce(controller.postStateToWebview)
	})

	it("does not delete task history as a side effect when persisted task data is missing", async () => {
		const hostProviderGetStub = sinon.stub(HostProvider, "get").returns({
			globalStorageFsPath: "/tmp/non-existent-task-storage",
		} as any)

		const controller = {
			stateManager: {
				getGlobalStateKey: sinon.stub().returns([{ id: "task-1" }]),
			},
			deleteTaskFromState: sinon.stub().resolves(),
		}

		try {
			await Controller.prototype.getTaskWithId.call(controller as unknown as Controller, "task-1")
			assert.fail("Expected getTaskWithId to throw when persisted task data is missing")
		} catch (error) {
			assert.equal((error as Error).message, "Task not found")
		} finally {
			hostProviderGetStub.restore()
		}

		sinon.assert.notCalled(controller.deleteTaskFromState)
	})
})
