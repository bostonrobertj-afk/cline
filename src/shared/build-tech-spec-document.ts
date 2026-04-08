export const BUILD_TECH_SPEC_DOCUMENT_WORKFLOW_STEPS = {
	"quick-spec.md": [2],
} as const

function normalizeBuildTechSpecDocumentWorkflowName(workflowName?: string) {
	const normalized = workflowName?.replaceAll("\\", "/").split("/").at(-1)?.trim().toLowerCase()

	if (normalized === "quick-spec.md" || normalized === "quick-spec") {
		return "quick-spec.md"
	}

	return undefined
}

export function isBuildTechSpecDocumentStep(workflowName?: string, stepNumber?: number): boolean {
	const normalizedWorkflowName = normalizeBuildTechSpecDocumentWorkflowName(workflowName)
	if (normalizedWorkflowName === undefined || stepNumber === undefined) {
		return false
	}

	const allowedSteps: readonly number[] = BUILD_TECH_SPEC_DOCUMENT_WORKFLOW_STEPS[normalizedWorkflowName]
	return allowedSteps.includes(stepNumber)
}

export function shouldExposeBuildTechSpecDocument({
	workflowName,
	stepNumber,
}: {
	workflowName?: string
	stepNumber?: number
}): boolean {
	return isBuildTechSpecDocumentStep(workflowName, stepNumber)
}
