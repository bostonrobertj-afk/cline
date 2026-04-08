import { Empty } from "@shared/proto/cline/common"
import { WorkflowStartCardAction, WorkflowStartCardSubmissionRequest } from "@shared/proto/cline/task"
import { expect } from "chai"
import { describe, it } from "mocha"
import sinon from "sinon"
import type { Controller } from "../.."
import { submitWorkflowStartCard } from "../submitWorkflowStartCard"

describe("controller/task/submitWorkflowStartCard", () => {
	it("returns Empty when there is no active task", async () => {
		const controller = {
			task: undefined,
		}

		const result = await submitWorkflowStartCard(
			controller as unknown as Controller,
			WorkflowStartCardSubmissionRequest.create({
				sessionId: "start-card-session",
				action: WorkflowStartCardAction.CONTINUE,
			}),
		)

		expect(result).to.deep.equal(Empty.create())
	})

	it("routes workflow-start-card submissions to the dedicated task handler", async () => {
		const controller = {
			task: {
				handleWorkflowStartCardSubmission: sinon.stub().resolves(),
			},
		}
		const request = WorkflowStartCardSubmissionRequest.create({
			sessionId: "start-card-session",
			action: WorkflowStartCardAction.CONTINUE,
		})

		const result = await submitWorkflowStartCard(controller as unknown as Controller, request)

		expect(result).to.deep.equal(Empty.create())
		sinon.assert.calledOnceWithExactly(controller.task.handleWorkflowStartCardSubmission, request)
	})
})
