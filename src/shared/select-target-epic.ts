export const SELECT_TARGET_EPIC_WORKFLOW_STEPS = {
	"pi-planning.md": [2],
} as const

export const SELECT_TARGET_EPIC_QUESTION = "Which epic would you like to work on?"
export const SELECT_TARGET_EPIC_PLACEHOLDER_KEY = "target_epic"

function normalizeSelectTargetEpicWorkflowName(workflowName?: string) {
	const normalized = workflowName?.replaceAll("\\", "/").split("/").at(-1)?.trim().toLowerCase()

	if (normalized === "pi-planning.md" || normalized === "pi-planning") {
		return "pi-planning.md"
	}

	return undefined
}

export function isSelectTargetEpicStep(workflowName?: string, stepNumber?: number): boolean {
	const normalizedWorkflowName = normalizeSelectTargetEpicWorkflowName(workflowName)
	if (normalizedWorkflowName === undefined || stepNumber === undefined) {
		return false
	}

	const allowedSteps: readonly number[] = SELECT_TARGET_EPIC_WORKFLOW_STEPS[normalizedWorkflowName]
	return allowedSteps.includes(stepNumber)
}

export function shouldExposeSelectTargetEpic({
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

	return isSelectTargetEpicStep(workflowName, stepNumber)
}
