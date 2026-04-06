export const BUILD_EPIC_DELIVERY_SPEC_WORKFLOW_STEPS = {
	"pi-planning.md": [3],
} as const

function normalizeBuildEpicDeliverySpecWorkflowName(workflowName?: string) {
	const normalized = workflowName?.replaceAll("\\", "/").split("/").at(-1)?.trim().toLowerCase()

	if (normalized === "pi-planning.md" || normalized === "pi-planning") {
		return "pi-planning.md"
	}

	return undefined
}

export function isBuildEpicDeliverySpecStep(workflowName?: string, stepNumber?: number): boolean {
	const normalizedWorkflowName = normalizeBuildEpicDeliverySpecWorkflowName(workflowName)
	if (normalizedWorkflowName === undefined || stepNumber === undefined) {
		return false
	}

	const allowedSteps: readonly number[] = BUILD_EPIC_DELIVERY_SPEC_WORKFLOW_STEPS[normalizedWorkflowName]
	return allowedSteps.includes(stepNumber)
}

export function shouldExposeBuildEpicDeliverySpec({
	workflowName,
	stepNumber,
}: {
	workflowName?: string
	stepNumber?: number
}): boolean {
	return isBuildEpicDeliverySpecStep(workflowName, stepNumber)
}
