export const PREPARE_BRAINSTORMING_SESSION_WORKFLOW_STEPS = {
	"brainstorming.md": [2],
} as const

export const PREPARE_BRAINSTORMING_SESSION_QUESTION = "How would you like to proceed with your brainstorming session?"
export const PREPARE_BRAINSTORMING_SESSION_OPTIONS = [
	"Continue newest session",
	"Start new session",
	"List all sessions",
] as const
export const PREPARE_BRAINSTORMING_SESSION_LIST_TITLE = "Select a Brainstorming Session"
export const PREPARE_BRAINSTORMING_SESSION_LIST_PROMPT = "Choose an existing brainstorming session to continue."
export const PREPARE_BRAINSTORMING_SESSION_LIST_FIELD_LABEL = "Session"

export function normalizePrepareBrainstormingSessionWorkflowName(workflowName?: string) {
	const normalized = workflowName?.replaceAll("\\", "/").split("/").at(-1)?.trim().toLowerCase()

	if (normalized === "brainstorming.md" || normalized === "brainstorming") {
		return "brainstorming.md"
	}

	return undefined
}

export function isPrepareBrainstormingSessionStep(workflowName?: string, stepNumber?: number): boolean {
	const normalizedWorkflowName = normalizePrepareBrainstormingSessionWorkflowName(workflowName)
	if (normalizedWorkflowName === undefined || stepNumber === undefined) {
		return false
	}

	const allowedSteps: readonly number[] = PREPARE_BRAINSTORMING_SESSION_WORKFLOW_STEPS[normalizedWorkflowName]
	return allowedSteps.includes(stepNumber)
}

export function shouldExposePrepareBrainstormingSession({
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

	return isPrepareBrainstormingSessionStep(workflowName, stepNumber)
}
