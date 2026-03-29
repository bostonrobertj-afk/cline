import { Empty } from "@shared/proto/cline/common"
import { WorkflowFormAction, WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"
import { expect } from "chai"
import { describe, it } from "mocha"
import sinon from "sinon"
import type { Controller } from "../.."
import { submitWorkflowForm } from "../submitWorkflowForm"

describe("controller/task/submitWorkflowForm", () => {
	it("returns Empty when there is no active task", async () => {
		const controller = {
			task: undefined,
		}

		const result = await submitWorkflowForm(
			controller as unknown as Controller,
			WorkflowFormSubmissionRequest.create({
				sessionId: "wf-session",
				action: WorkflowFormAction.CANCEL,
			}),
		)

		expect(result).to.deep.equal(Empty.create())
	})

	it("routes workflow-form submissions to the dedicated task handler", async () => {
		const controller = {
			task: {
				handleWorkflowFormSubmission: sinon.stub().resolves(),
			},
		}
		const request = WorkflowFormSubmissionRequest.create({
			sessionId: "wf-session",
			action: WorkflowFormAction.SUBMIT,
		})

		const result = await submitWorkflowForm(controller as unknown as Controller, request)

		expect(result).to.deep.equal(Empty.create())
		sinon.assert.calledOnceWithExactly(controller.task.handleWorkflowFormSubmission, request)
	})
})
