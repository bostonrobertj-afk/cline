export type WorkflowStepStatusLabel = "Complete" | "Active" | "Not Started"

export interface ParsedWorkflowStepStatusLine {
	readonly stepNumber: number
	readonly checklistLabel: string
	readonly status: WorkflowStepStatusLabel
}

export const WORKFLOW_STEP_STATUS_LINE_REGEX = /^([1-9]\d*)\. (.+) - (Complete|Active|Not Started)$/

export function isWorkflowStepStatusLabel(value: string): value is WorkflowStepStatusLabel {
	return value === "Complete" || value === "Active" || value === "Not Started"
}

export function parseWorkflowStepStatusLine(line: string): ParsedWorkflowStepStatusLine | null {
	const match = line.trim().match(WORKFLOW_STEP_STATUS_LINE_REGEX)
	if (!match) {
		return null
	}

	const status = match[3]
	if (!isWorkflowStepStatusLabel(status)) {
		return null
	}

	return {
		stepNumber: Number.parseInt(match[1], 10),
		checklistLabel: match[2],
		status,
	}
}
