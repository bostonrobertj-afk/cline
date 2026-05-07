import type { ActiveWorkflowSession, WorkflowValue } from "../../types"

export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_SCOPE_CONTEXT_GOALS = "Scope, Context, & Goals"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_RELEVANT_CONTEXT = "Relevant Context"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_SCOPE = "Scope"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_ARCHITECTURAL_GOALS = "Architectural goals"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_CORE_ARCHITECTURAL_RULES = "Core architectural rules"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_PROJECT_CONTEXT_ANALYSIS = "Project Context Analysis"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_INTERPRETATION = "Interpretation"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_RESPONSIBILITY_BOUNDARIES = "Responsibility boundaries"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_DURABLE_TRANSIENT_OWNERSHIP = "Durable vs transient ownership"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_REQUIRED_BASELINE_AUTHORITY_ENFORCEMENT =
	"Required additional baseline for authority enforcement"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_CURRENT_CODE_ASSESSMENT = "Current code assessment"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_ALIGNED = "Aligned"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_PARTIALLY_ALIGNED = "Partially aligned"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_NOT_ALIGNED_CONFLICTS = "Not aligned / conflicts"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_KEY_TRADEOFFS_RISKS = "Key tradeoffs and risks"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_TRADEOFFS = "Tradeoffs"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_RISKS = "Risks"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_PROJECT_BLAST_RADIUS = "Project Blast Radius"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_DEPENDENCIES = "Dependencies"
export const CREATE_ARCHITECTURE_DOCUMENT_HEADING_PROJECT_ROADMAP = "Project Roadmap"

interface CreateArchitectureDocumentSection {
	headingLevel: 1 | 2 | 3
	heading: string
	content: readonly string[]
}

const CREATE_ARCHITECTURE_DOCUMENT_HEADING_SHELL: readonly CreateArchitectureDocumentSection[] = [
	{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_SCOPE_CONTEXT_GOALS, content: [] },
	{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_RELEVANT_CONTEXT, content: [] },
	{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_SCOPE, content: [] },
	{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_ARCHITECTURAL_GOALS, content: [] },
	{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_CORE_ARCHITECTURAL_RULES, content: [] },
	{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_PROJECT_CONTEXT_ANALYSIS, content: [] },
	{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_INTERPRETATION, content: [] },
	{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_RESPONSIBILITY_BOUNDARIES, content: [] },
	{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_DURABLE_TRANSIENT_OWNERSHIP, content: [] },
	{
		headingLevel: 3,
		heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_REQUIRED_BASELINE_AUTHORITY_ENFORCEMENT,
		content: [],
	},
	{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_CURRENT_CODE_ASSESSMENT, content: [] },
	{ headingLevel: 3, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_ALIGNED, content: [] },
	{ headingLevel: 3, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_PARTIALLY_ALIGNED, content: [] },
	{ headingLevel: 3, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_NOT_ALIGNED_CONFLICTS, content: [] },
	{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_KEY_TRADEOFFS_RISKS, content: [] },
	{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_TRADEOFFS, content: [] },
	{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_RISKS, content: [] },
	{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_PROJECT_BLAST_RADIUS, content: [] },
	{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_DEPENDENCIES, content: [] },
	{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_PROJECT_ROADMAP, content: [] },
] as const

function renderCreateArchitectureDocument(sections: readonly CreateArchitectureDocumentSection[]): string {
	return `${sections
		.map((section) => {
			const headingPrefix = "#".repeat(section.headingLevel)
			if (section.content.length === 0) {
				return `${headingPrefix} ${section.heading}`
			}

			return `${headingPrefix} ${section.heading}\n\n${section.content.join("\n\n")}`
		})
		.join("\n\n")}\n`
}

function renderWorkflowValueForDocument(value: WorkflowValue): string | undefined {
	if (typeof value === "boolean") {
		return undefined
	}

	if (typeof value === "string") {
		return value
	}

	if (typeof value === "number") {
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
	if (renderedValue === undefined) {
		return undefined
	}

	const trimmedValue = renderedValue.trim()
	if (trimmedValue.length === 0) {
		return undefined
	}

	return trimmedValue
}

function isDefinedString(value: string | undefined): value is string {
	return value !== undefined
}

function buildOptionalSectionContent(...values: Array<string | undefined>): readonly string[] {
	return values.filter(isDefinedString)
}

export function buildInitialCreateArchitectureDocument(): string {
	return renderCreateArchitectureDocument(CREATE_ARCHITECTURE_DOCUMENT_HEADING_SHELL)
}

export function buildCreateArchitectureDocumentFromSession(session: ActiveWorkflowSession): string {
	const contextFiles = readRenderedWorkflowValue(session, "context_files")
	const scope = readRenderedWorkflowValue(session, "scope")
	const architecturalGoals = readRenderedWorkflowValue(session, "architectural_goals")
	const coreArchitecturalRules = readRenderedWorkflowValue(session, "core_architectural_rules")

	return renderCreateArchitectureDocument([
		{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_SCOPE_CONTEXT_GOALS, content: [] },
		{
			headingLevel: 2,
			heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_RELEVANT_CONTEXT,
			content: buildOptionalSectionContent(contextFiles),
		},
		{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_SCOPE, content: buildOptionalSectionContent(scope) },
		{
			headingLevel: 2,
			heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_ARCHITECTURAL_GOALS,
			content: buildOptionalSectionContent(architecturalGoals),
		},
		{
			headingLevel: 2,
			heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_CORE_ARCHITECTURAL_RULES,
			content: buildOptionalSectionContent(coreArchitecturalRules),
		},
		{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_PROJECT_CONTEXT_ANALYSIS, content: [] },
		{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_INTERPRETATION, content: [] },
		{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_RESPONSIBILITY_BOUNDARIES, content: [] },
		{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_DURABLE_TRANSIENT_OWNERSHIP, content: [] },
		{
			headingLevel: 3,
			heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_REQUIRED_BASELINE_AUTHORITY_ENFORCEMENT,
			content: [],
		},
		{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_CURRENT_CODE_ASSESSMENT, content: [] },
		{ headingLevel: 3, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_ALIGNED, content: [] },
		{ headingLevel: 3, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_PARTIALLY_ALIGNED, content: [] },
		{ headingLevel: 3, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_NOT_ALIGNED_CONFLICTS, content: [] },
		{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_KEY_TRADEOFFS_RISKS, content: [] },
		{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_TRADEOFFS, content: [] },
		{ headingLevel: 2, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_RISKS, content: [] },
		{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_PROJECT_BLAST_RADIUS, content: [] },
		{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_DEPENDENCIES, content: [] },
		{ headingLevel: 1, heading: CREATE_ARCHITECTURE_DOCUMENT_HEADING_PROJECT_ROADMAP, content: [] },
	])
}
