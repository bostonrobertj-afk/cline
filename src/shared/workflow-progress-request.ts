export const WORKFLOW_PROGRESS_REQUEST_WORKFLOW_STEPS = {
	"create-prd.md": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
	"create-epics.md": [3],
} as const

export const WORKFLOW_PROGRESS_REQUEST_QUESTION = "Ready to move on to the next step in the workflow?"

export const WORKFLOW_PROGRESS_REQUEST_OPTIONS = ["Yes", "No"] as const

function normalizeWorkflowProgressRequestWorkflowName(workflowName?: string) {
	const normalized = workflowName?.replaceAll("\\", "/").split("/").at(-1)?.trim().toLowerCase()

	if (normalized === "create-prd.md" || normalized === "create-prd") {
		return "create-prd.md"
	}

	if (normalized === "create-epics.md" || normalized === "create-epics") {
		return "create-epics.md"
	}

	return undefined
}

export function isWorkflowProgressRequestWorkflowName(workflowName?: string): boolean {
	return normalizeWorkflowProgressRequestWorkflowName(workflowName) !== undefined
}

export function isWorkflowProgressRequestStep(workflowName?: string, stepNumber?: number): boolean {
	const normalizedWorkflowName = normalizeWorkflowProgressRequestWorkflowName(workflowName)
	if (normalizedWorkflowName === undefined) {
		return false
	}

	if (stepNumber === undefined) {
		return false
	}

	const allowedSteps: readonly number[] = WORKFLOW_PROGRESS_REQUEST_WORKFLOW_STEPS[normalizedWorkflowName]
	return allowedSteps.includes(stepNumber)
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

	return isWorkflowProgressRequestStep(workflowName, stepNumber)
}
