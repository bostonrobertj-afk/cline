export const BUILD_STORY_DOCUMENT_WORKFLOW_STEPS = {
	"create-story.md": [2],
} as const

function normalizeBuildStoryDocumentWorkflowName(workflowName?: string) {
	const normalized = workflowName?.replaceAll("\\", "/").split("/").at(-1)?.trim().toLowerCase()

	if (normalized === "create-story.md" || normalized === "create-story") {
		return "create-story.md"
	}

	return undefined
}

export function isBuildStoryDocumentStep(workflowName?: string, stepNumber?: number): boolean {
	const normalizedWorkflowName = normalizeBuildStoryDocumentWorkflowName(workflowName)
	if (normalizedWorkflowName === undefined || stepNumber === undefined) {
		return false
	}

	const allowedSteps: readonly number[] = BUILD_STORY_DOCUMENT_WORKFLOW_STEPS[normalizedWorkflowName]
	return allowedSteps.includes(stepNumber)
}

export function shouldExposeBuildStoryDocument({
	workflowName,
	stepNumber,
}: {
	workflowName?: string
	stepNumber?: number
}): boolean {
	return isBuildStoryDocumentStep(workflowName, stepNumber)
}
