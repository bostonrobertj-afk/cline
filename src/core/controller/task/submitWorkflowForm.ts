import { Empty } from "@shared/proto/cline/common"
import { WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"
import type { Controller } from ".."

export async function submitWorkflowForm(controller: Controller, request: WorkflowFormSubmissionRequest): Promise<Empty> {
	if (!controller.task) {
		return Empty.create()
	}

	await controller.task.handleWorkflowFormSubmission(request)
	return Empty.create()
}
