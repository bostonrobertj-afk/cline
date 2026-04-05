export const WORKFLOW_PROGRESS_REQUEST_WORKFLOW_NAME = "create-prd.md"

export const WORKFLOW_PROGRESS_REQUEST_STEP_NUMBERS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const

export const WORKFLOW_PROGRESS_REQUEST_QUESTION = "Ready to move on to the next step in the workflow?"

export const WORKFLOW_PROGRESS_REQUEST_OPTIONS = ["Yes", "No"] as const

export function isWorkflowProgressRequestWorkflowName(workflowName?: string): boolean {
	return workflowName === "create-prd.md" || workflowName === "create-prd"
}

export function isWorkflowProgressRequestStep(stepNumber?: number): boolean {
	return (
		stepNumber !== undefined &&
		WORKFLOW_PROGRESS_REQUEST_STEP_NUMBERS.includes(stepNumber as (typeof WORKFLOW_PROGRESS_REQUEST_STEP_NUMBERS)[number])
	)
}

export function shouldExposeWorkflowProgressRequest({
	workflowName,
	stepNumber,
	yoloModeToggled,
}: {
	workflowName?: string
	stepNumber?: number
	yoloModeToggled?: boolean
}): boolean {
	if (yoloModeToggled === true) {
		return false
	}

	return isWorkflowProgressRequestWorkflowName(workflowName) && isWorkflowProgressRequestStep(stepNumber)
}
