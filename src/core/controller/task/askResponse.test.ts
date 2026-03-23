import { AskResponseRequest } from "@shared/proto/cline/task"
import { describe, it } from "mocha"
import sinon from "sinon"
import { Controller } from ".."
import { askResponse } from "./askResponse"

describe("controller/task/askResponse", () => {
	it("routes messageResponse into active-task steering instead of passive ask response handling", async () => {
		const controller = {
			task: {
				handleWebviewAskResponse: sinon.stub().resolves(),
			},
			isTaskActivelyRunning: sinon.stub().returns(true),
			interruptTaskWithFeedback: sinon.stub().resolves(),
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
		sinon.assert.notCalled(controller.task.handleWebviewAskResponse)
	})

	it("keeps normal ask response behavior when the task is not actively running", async () => {
		const controller = {
			task: {
				handleWebviewAskResponse: sinon.stub().resolves(),
			},
			isTaskActivelyRunning: sinon.stub().returns(false),
			interruptTaskWithFeedback: sinon.stub().resolves(),
		}

		await askResponse(
			controller as unknown as Controller,
			AskResponseRequest.create({
				responseType: "messageResponse",
				text: "follow-up",
			}),
		)

		sinon.assert.notCalled(controller.interruptTaskWithFeedback)
		sinon.assert.calledOnceWithExactly(controller.task.handleWebviewAskResponse, "messageResponse", "follow-up", [], [])
	})
})
