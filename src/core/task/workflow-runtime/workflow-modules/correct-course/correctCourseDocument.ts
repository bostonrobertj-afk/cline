import type { ActiveWorkflowSession, WorkflowValue } from "../../types"

export const CORRECT_COURSE_DOCUMENT_HEADING_IDENTIFIED_ISSUE = "Identified Issue"
export const CORRECT_COURSE_DOCUMENT_HEADING_ISSUE_SOURCE = "Issue Source"
export const CORRECT_COURSE_DOCUMENT_HEADING_IMPACT_ASSESSMENT = "Impact Assessment"
export const CORRECT_COURSE_DOCUMENT_HEADING_ARCHITECTURE_MODIFICATIONS = "Architecture Modifications"
export const CORRECT_COURSE_DOCUMENT_HEADING_EPIC_MODIFICATIONS = "Epic Modifications"
export const CORRECT_COURSE_DOCUMENT_HEADING_STORY_MODIFICATIONS = "Story Modifications"
export const CORRECT_COURSE_DOCUMENT_HEADING_CHANGE_MANAGEMENT_IMPLEMENTATION = "Change Management Implementation"

const CORRECT_COURSE_DOCUMENT_HEADINGS = [
	CORRECT_COURSE_DOCUMENT_HEADING_IDENTIFIED_ISSUE,
	CORRECT_COURSE_DOCUMENT_HEADING_ISSUE_SOURCE,
	CORRECT_COURSE_DOCUMENT_HEADING_IMPACT_ASSESSMENT,
	CORRECT_COURSE_DOCUMENT_HEADING_ARCHITECTURE_MODIFICATIONS,
	CORRECT_COURSE_DOCUMENT_HEADING_EPIC_MODIFICATIONS,
	CORRECT_COURSE_DOCUMENT_HEADING_STORY_MODIFICATIONS,
	CORRECT_COURSE_DOCUMENT_HEADING_CHANGE_MANAGEMENT_IMPLEMENTATION,
] as const

const CORRECT_COURSE_ISSUE_DESCRIPTION_WORKFLOW_VALUE_KEY = "issue_description"

interface CorrectCourseDocumentSection {
	readonly heading: string
	readonly content: readonly string[]
}

function renderCorrectCourseDocumentSection(section: CorrectCourseDocumentSection): string {
	if (section.content.length === 0) {
		return `# ${section.heading}`
	}

	return `# ${section.heading}\n\n${section.content.join("\n\n")}`
}

function buildCorrectCourseDocument(sections: readonly CorrectCourseDocumentSection[]): string {
	return `${sections.map(renderCorrectCourseDocumentSection).join("\n\n")}\n`
}

function renderWorkflowValueForDocument(value: WorkflowValue): string {
	if (typeof value === "string") {
		return value
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return String(value)
	}

	return JSON.stringify(value, undefined, 2)
}

function readRenderedWorkflowValue(session: ActiveWorkflowSession, key: string): string | undefined {
	const value = session.workflowValues[key]
	if (value === undefined) {
		return undefined
	}

	const renderedValue = renderWorkflowValueForDocument(value)
	if (renderedValue.trim().length === 0) {
		return undefined
	}

	return renderedValue
}

export function buildInitialCorrectCourseDocument(session: ActiveWorkflowSession): string {
	const issueDescription = readRenderedWorkflowValue(session, CORRECT_COURSE_ISSUE_DESCRIPTION_WORKFLOW_VALUE_KEY)
	const sections: readonly CorrectCourseDocumentSection[] = CORRECT_COURSE_DOCUMENT_HEADINGS.map((heading) => ({
		heading,
		content:
			heading === CORRECT_COURSE_DOCUMENT_HEADING_IDENTIFIED_ISSUE && issueDescription !== undefined
				? [issueDescription]
				: [],
	}))

	return buildCorrectCourseDocument(sections)
}
