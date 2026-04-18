export const WORKFLOW_PROGRESS_REQUEST_QUESTION = "Ready to move on to the next step in the workflow?"

export const WORKFLOW_PROGRESS_REQUEST_OPTIONS = ["Yes", "No"] as const

export function shouldExposeWorkflowProgressRequest({
	workflowProgressRequestAllowed,
	yoloModeToggled,
}: {
	workflowProgressRequestAllowed?: boolean
	yoloModeToggled?: boolean
}): boolean {
	if (yoloModeToggled === true) {
		return false
	}

	return workflowProgressRequestAllowed === true
}
