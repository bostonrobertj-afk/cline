import { AskResponseRequest } from "@shared/proto/cline/task"
import { describe, it } from "mocha"
import sinon from "sinon"
import type { Controller } from ".."
import { askResponse } from "./askResponse"

describe("controller/task/askResponse", () => {
	it("routes messageResponse into active-task steering instead of passive ask response handling", async () => {
		const controller = {
			task: {
				handleWebviewAskResponse: sinon.stub().resolves(),
				getThreadDisplayState: sinon.stub().returns("active_run"),
			},
			isTaskActivelyRunning: sinon.stub().returns(true),
			interruptTaskWithFeedback: sinon.stub().resolves(),
			resumePassiveTaskWithFeedback: sinon.stub().resolves(),
		}

		await askResponse(
			controller as unknown as Controller,
			AskResponseRequest.create({
				responseType: "messageResponse",
				text: "Please change direction",
				images: ["img-1"],
				files: ["file-1"],
			}),
		)

		sinon.assert.calledOnceWithExactly(controller.interruptTaskWithFeedback, "Please change direction", ["img-1"], ["file-1"])
		sinon.assert.notCalled(controller.resumePassiveTaskWithFeedback)
		sinon.assert.notCalled(controller.task.handleWebviewAskResponse)
	})

	it("routes messageResponse into passive-thread continuation when the thread is passively open", async () => {
		const controller = {
			task: {
				handleWebviewAskResponse: sinon.stub().resolves(),
				getThreadDisplayState: sinon.stub().returns("idle_open"),
			},
			isTaskActivelyRunning: sinon.stub().returns(false),
			interruptTaskWithFeedback: sinon.stub().resolves(),
			resumePassiveTaskWithFeedback: sinon.stub().resolves(),
		}

		await askResponse(
			controller as unknown as Controller,
			AskResponseRequest.create({
				responseType: "messageResponse",
				text: "continue from passive open",
				images: ["img-1"],
				files: ["file-1"],
			}),
		)

		sinon.assert.notCalled(controller.interruptTaskWithFeedback)
		sinon.assert.calledOnceWithExactly(
			controller.resumePassiveTaskWithFeedback,
			"continue from passive open",
			["img-1"],
			["file-1"],
		)
		sinon.assert.notCalled(controller.task.handleWebviewAskResponse)
	})

	it("routes messageResponse into normal next-turn continuation when the thread is active_user", async () => {
		const controller = {
			task: {
				handleWebviewAskResponse: sinon.stub().resolves(),
				getThreadDisplayState: sinon.stub().returns("active_user"),
			},
			isTaskActivelyRunning: sinon.stub().returns(false),
			interruptTaskWithFeedback: sinon.stub().resolves(),
			resumePassiveTaskWithFeedback: sinon.stub().resolves(),
			continueActiveTaskWithFeedback: sinon.stub().resolves(),
		}

		await askResponse(
			controller as unknown as Controller,
			AskResponseRequest.create({
				responseType: "messageResponse",
				text: "continue as normal dialogue",
				images: ["img-1"],
				files: ["file-1"],
			}),
		)

		sinon.assert.notCalled(controller.interruptTaskWithFeedback)
		sinon.assert.notCalled(controller.resumePassiveTaskWithFeedback)
		sinon.assert.calledOnceWithExactly(
			controller.continueActiveTaskWithFeedback,
			"continue as normal dialogue",
			["img-1"],
			["file-1"],
		)
		sinon.assert.notCalled(controller.task.handleWebviewAskResponse)
	})

	it("keeps normal ask response behavior when the task is not actively running", async () => {
		const controller = {
			task: {
				handleWebviewAskResponse: sinon.stub().resolves(),
				getThreadDisplayState: sinon.stub().returns("awaiting_user_response"),
			},
			isTaskActivelyRunning: sinon.stub().returns(false),
			interruptTaskWithFeedback: sinon.stub().resolves(),
			resumePassiveTaskWithFeedback: sinon.stub().resolves(),
		}

		await askResponse(
			controller as unknown as Controller,
			AskResponseRequest.create({
				responseType: "messageResponse",
				text: "follow-up",
			}),
		)

		sinon.assert.notCalled(controller.interruptTaskWithFeedback)
		sinon.assert.notCalled(controller.resumePassiveTaskWithFeedback)
		sinon.assert.calledOnceWithExactly(controller.task.handleWebviewAskResponse, "messageResponse", "follow-up", [], [])
	})

	it("preserves steer routing when the thread is still active_run even if active-work classification has already dropped", async () => {
		const controller = {
			task: {
				handleWebviewAskResponse: sinon.stub().resolves(),
				getThreadDisplayState: sinon.stub().returns("active_run"),
			},
			isTaskActivelyRunning: sinon.stub().returns(false),
			interruptTaskWithFeedback: sinon.stub().resolves(),
			resumePassiveTaskWithFeedback: sinon.stub().resolves(),
		}

		await askResponse(
			controller as unknown as Controller,
			AskResponseRequest.create({
				responseType: "messageResponse",
				text: "steer while active_run is misclassified",
			}),
		)

		sinon.assert.calledOnceWithExactly(
			controller.interruptTaskWithFeedback,
			"steer while active_run is misclassified",
			[],
			[],
		)
		sinon.assert.notCalled(controller.resumePassiveTaskWithFeedback)
		sinon.assert.notCalled(controller.task.handleWebviewAskResponse)
	})
})
