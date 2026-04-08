import { Empty } from "@shared/proto/cline/common"
import { WorkflowStartCardSubmissionRequest } from "@shared/proto/cline/task"
import type { Controller } from ".."

export async function submitWorkflowStartCard(
	controller: Controller,
	request: WorkflowStartCardSubmissionRequest,
): Promise<Empty> {
	if (!controller.task) {
		return Empty.create()
	}

	await controller.task.handleWorkflowStartCardSubmission(request)
	return Empty.create()
}
