export const CAPTURE_BRAINSTORMING_TOPIC_WORKFLOW_STEPS = {
	"brainstorming.md": [3],
} as const

export const CAPTURE_BRAINSTORMING_TOPIC_TITLE =
	"What topics and/or goals would you like to focus on for this brainstorming session?"
export const CAPTURE_BRAINSTORMING_TOPIC_PROMPT = "Be as detailed as you can- we'll worry about formatting later!"
export const CAPTURE_BRAINSTORMING_TOPIC_FIELD_KEY = "topic"
export const CAPTURE_BRAINSTORMING_TOPIC_FIELD_LABEL = "Topic and Goals"
export const CAPTURE_BRAINSTORMING_TOPIC_TOOL_DICTIONARY_TITLE = "Brainstorming Topic Reference"

export function normalizeCaptureBrainstormingTopicWorkflowName(workflowName?: string) {
	const normalized = workflowName?.replaceAll("\\", "/").split("/").at(-1)?.trim().toLowerCase()

	if (normalized === "brainstorming.md" || normalized === "brainstorming") {
		return "brainstorming.md"
	}

	return undefined
}

export function isCaptureBrainstormingTopicStep(workflowName?: string, stepNumber?: number): boolean {
	const normalizedWorkflowName = normalizeCaptureBrainstormingTopicWorkflowName(workflowName)
	if (normalizedWorkflowName === undefined || stepNumber === undefined) {
		return false
	}

	const allowedSteps: readonly number[] = CAPTURE_BRAINSTORMING_TOPIC_WORKFLOW_STEPS[normalizedWorkflowName]
	return allowedSteps.includes(stepNumber)
}
