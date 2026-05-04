import type { ActiveWorkflowSession, WorkflowValue } from "../../types"

export const BRAINSTORMING_DOCUMENT_HEADING_STEPS_COMPLETED = "stepsCompleted"
export const BRAINSTORMING_DOCUMENT_HEADING_INPUT_DOCUMENTS = "inputDocuments"
export const BRAINSTORMING_DOCUMENT_HEADING_SESSION_TOPIC = "session topic"
export const BRAINSTORMING_DOCUMENT_HEADING_SESSION_GOALS = "session goals"
export const BRAINSTORMING_DOCUMENT_HEADING_SELECTED_APPROACH = "selected approach"
export const BRAINSTORMING_DOCUMENT_HEADING_SELECTED_TECHNIQUES = "selected techniques"
export const BRAINSTORMING_DOCUMENT_HEADING_IDEAS_GENERATED = "ideas generated"
export const BRAINSTORMING_DOCUMENT_HEADING_CONTEXT_FILE = "context file"

const BRAINSTORMING_DOCUMENT_HEADINGS = [
	BRAINSTORMING_DOCUMENT_HEADING_STEPS_COMPLETED,
	BRAINSTORMING_DOCUMENT_HEADING_INPUT_DOCUMENTS,
	BRAINSTORMING_DOCUMENT_HEADING_SESSION_TOPIC,
	BRAINSTORMING_DOCUMENT_HEADING_SESSION_GOALS,
	BRAINSTORMING_DOCUMENT_HEADING_SELECTED_APPROACH,
	BRAINSTORMING_DOCUMENT_HEADING_SELECTED_TECHNIQUES,
	BRAINSTORMING_DOCUMENT_HEADING_IDEAS_GENERATED,
	BRAINSTORMING_DOCUMENT_HEADING_CONTEXT_FILE,
] as const

const BRAINSTORMING_SELECTED_TECHNIQUE_SUGGESTION_PLACEHOLDER = "user requested technique suggestion"

interface BrainstormingDocumentSection {
	heading: string
	content: readonly string[]
}

function buildBrainstormingDocument(sections: readonly BrainstormingDocumentSection[]): string {
	return `${sections
		.map((section) => {
			if (section.content.length === 0) {
				return `# ${section.heading}`
			}

			return `# ${section.heading}\n\n${section.content.join("\n\n")}`
		})
		.join("\n\n")}\n`
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

	const renderedValue = renderWorkflowValueForDocument(value).trim()
	if (renderedValue.length === 0) {
		return undefined
	}

	return renderedValue
}

export function buildInitialBrainstormingDocument(): string {
	return buildBrainstormingDocument(BRAINSTORMING_DOCUMENT_HEADINGS.map((heading) => ({ heading, content: [] })))
}

function isDefinedString(value: string | undefined): value is string {
	return value !== undefined
}

function buildOptionalSectionContent(...values: Array<string | undefined>): readonly string[] {
	return values.filter(isDefinedString)
}

function readObjectStringField(value: WorkflowValue, key: string): string | undefined {
	if (typeof value !== "object" || Array.isArray(value)) {
		return undefined
	}

	const fieldValue = value[key]
	if (typeof fieldValue !== "string") {
		return undefined
	}

	const trimmedFieldValue = fieldValue.trim()
	if (trimmedFieldValue.length === 0) {
		return undefined
	}

	return trimmedFieldValue
}

function renderSelectedTechniques(value: WorkflowValue | undefined): readonly string[] {
	if (value === undefined) {
		return []
	}

	if (Array.isArray(value)) {
		const renderedTechniques: string[] = []
		for (const technique of value) {
			const name = readObjectStringField(technique, "name")
			const description = readObjectStringField(technique, "description")
			if (name !== undefined && description !== undefined) {
				renderedTechniques.push(`- ${name}: ${description}`)
			}
		}

		return renderedTechniques
	}

	if (typeof value === "string" && value.trim() === BRAINSTORMING_SELECTED_TECHNIQUE_SUGGESTION_PLACEHOLDER) {
		return [BRAINSTORMING_SELECTED_TECHNIQUE_SUGGESTION_PLACEHOLDER]
	}

	return []
}

export function buildBrainstormingDocumentFromSession(session: ActiveWorkflowSession): string {
	const contextFile = readRenderedWorkflowValue(session, "context_file")
	const sessionTopic = readRenderedWorkflowValue(session, "session_topic")
	const sessionGoals = readRenderedWorkflowValue(session, "session_goals")
	const selectedApproach = readRenderedWorkflowValue(session, "selected_approach")
	const selectedTechniques = renderSelectedTechniques(session.workflowValues.selected_techniques)
	const techniquesUsed = readRenderedWorkflowValue(session, "techniques_used")
	const ideasGenerated = readRenderedWorkflowValue(session, "ideas_generated")

	return buildBrainstormingDocument([
		{ heading: BRAINSTORMING_DOCUMENT_HEADING_STEPS_COMPLETED, content: [] },
		{ heading: BRAINSTORMING_DOCUMENT_HEADING_INPUT_DOCUMENTS, content: [] },
		{ heading: BRAINSTORMING_DOCUMENT_HEADING_SESSION_TOPIC, content: buildOptionalSectionContent(sessionTopic) },
		{ heading: BRAINSTORMING_DOCUMENT_HEADING_SESSION_GOALS, content: buildOptionalSectionContent(sessionGoals) },
		{ heading: BRAINSTORMING_DOCUMENT_HEADING_SELECTED_APPROACH, content: buildOptionalSectionContent(selectedApproach) },
		{
			heading: BRAINSTORMING_DOCUMENT_HEADING_SELECTED_TECHNIQUES,
			content: selectedTechniques,
		},
		{
			heading: BRAINSTORMING_DOCUMENT_HEADING_IDEAS_GENERATED,
			content: buildOptionalSectionContent(techniquesUsed, ideasGenerated),
		},
		{ heading: BRAINSTORMING_DOCUMENT_HEADING_CONTEXT_FILE, content: buildOptionalSectionContent(contextFile) },
	])
}
