import type { ActiveWorkflowSession, WorkflowValue } from "../../types"

export const CREATE_EPICS_DOCUMENT_HEADING_CONTEXT = "Context"
export const CREATE_EPICS_DOCUMENT_HEADING_ARCHITECTURE = "Architecture"
export const CREATE_EPICS_DOCUMENT_HEADING_BRAINSTORMING = "Brainstorming"
export const CREATE_EPICS_DOCUMENT_HEADING_ADDITIONAL_CONTEXT = "Additional Context"
export const CREATE_EPICS_DOCUMENT_HEADING_EPICS = "Epics"

export interface CreateEpicObjectiveInput {
	as_a: string
	i_want: string
	so_that: string
}

export interface CreateEpicSectionInput {
	identity: string
	title: string
	objective: CreateEpicObjectiveInput
	description: string
	requirements: readonly string[]
	scope: readonly string[]
	scopeBoundary: readonly string[]
}

export interface CanonicalEpicIndexEntry {
	identity: string
	title: string
}

interface CreateEpicsDocumentSection {
	headingLevel: 1 | 2
	heading: string
	content: readonly string[]
}

interface ParsedCanonicalEpicSection {
	identity: string
	title: string
	numericIdentity: number
	content: string
}

interface ParsedEpicsBody {
	preamble: string
	sections: readonly ParsedCanonicalEpicSection[]
}

const CANONICAL_EPIC_HEADING_PATTERN = /^## Epic ([1-9]\d*): ([^\n]*\S[^\n]*)$/gm

function renderCreateEpicsDocument(sections: readonly CreateEpicsDocumentSection[]): string {
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

function renderMarkdownBulletList(items: readonly string[]): string {
	return items.map((item) => `- ${item}`).join("\n")
}

function findEpicsHeadingEnd(documentContent: string): number {
	const epicsHeadingEnd = findEpicsHeadingEndIndex(documentContent)
	if (epicsHeadingEnd === undefined) {
		throw new Error("Cannot upsert epic because # Epics heading is missing.")
	}

	return epicsHeadingEnd
}

function findEpicsHeadingEndIndex(documentContent: string): number | undefined {
	const epicsHeadingPattern = new RegExp(`^# ${CREATE_EPICS_DOCUMENT_HEADING_EPICS}[ \\t]*$`, "m")
	const epicsHeadingMatch = epicsHeadingPattern.exec(documentContent)
	if (epicsHeadingMatch === null) {
		return undefined
	}

	return epicsHeadingMatch.index + epicsHeadingMatch[0].length
}

function parseEpicsBody(body: string): ParsedEpicsBody {
	const matches = Array.from(body.matchAll(CANONICAL_EPIC_HEADING_PATTERN))
	if (matches.length === 0) {
		return {
			preamble: body,
			sections: [],
		}
	}

	const sections: ParsedCanonicalEpicSection[] = []
	for (const [matchIndex, match] of matches.entries()) {
		const identity = match[1]
		const title = match[2]
		if (identity === undefined || title === undefined) {
			continue
		}

		const nextMatch = matches[matchIndex + 1]
		const sectionStartIndex = match.index
		const sectionEndIndex = nextMatch === undefined ? body.length : nextMatch.index
		sections.push({
			identity,
			title: title.trim(),
			numericIdentity: Number(identity),
			content: body.slice(sectionStartIndex, sectionEndIndex).trim(),
		})
	}

	return {
		preamble: body.slice(0, matches[0].index),
		sections,
	}
}

function renderDocumentWithEpicsSections(
	documentPrefixThroughEpicsHeading: string,
	epicsPreamble: string,
	epicSections: readonly ParsedCanonicalEpicSection[],
): string {
	const bodyParts: string[] = []
	const trimmedPreamble = epicsPreamble.trim()
	if (trimmedPreamble.length > 0) {
		bodyParts.push(trimmedPreamble)
	}

	for (const section of epicSections) {
		bodyParts.push(section.content.trim())
	}

	if (bodyParts.length === 0) {
		return `${documentPrefixThroughEpicsHeading.trimEnd()}\n`
	}

	return `${documentPrefixThroughEpicsHeading.trimEnd()}\n\n${bodyParts.join("\n\n")}\n`
}

function sortCanonicalEpicSectionsByNumericIdentity(
	sections: readonly ParsedCanonicalEpicSection[],
): readonly ParsedCanonicalEpicSection[] {
	return [...sections].sort((leftSection, rightSection) => leftSection.numericIdentity - rightSection.numericIdentity)
}

export function buildInitialCreateEpicsDocumentFromSession(session: ActiveWorkflowSession): string {
	const architectureDocument = readRenderedWorkflowValue(session, "architecture_document")
	const brainstormingDocument = readRenderedWorkflowValue(session, "brainstorming_document")
	const additionalContextFiles = readRenderedWorkflowValue(session, "additional_context_files")

	return renderCreateEpicsDocument([
		{ headingLevel: 1, heading: CREATE_EPICS_DOCUMENT_HEADING_CONTEXT, content: [] },
		{
			headingLevel: 2,
			heading: CREATE_EPICS_DOCUMENT_HEADING_ARCHITECTURE,
			content: buildOptionalSectionContent(architectureDocument),
		},
		{
			headingLevel: 2,
			heading: CREATE_EPICS_DOCUMENT_HEADING_BRAINSTORMING,
			content: buildOptionalSectionContent(brainstormingDocument),
		},
		{
			headingLevel: 2,
			heading: CREATE_EPICS_DOCUMENT_HEADING_ADDITIONAL_CONTEXT,
			content: buildOptionalSectionContent(additionalContextFiles),
		},
		{ headingLevel: 1, heading: CREATE_EPICS_DOCUMENT_HEADING_EPICS, content: [] },
	])
}

export function buildCanonicalEpicSection(input: CreateEpicSectionInput): string {
	return `## Epic ${input.identity}: ${input.title}

### Objective
As a ${input.objective.as_a}
I want ${input.objective.i_want}
So that ${input.objective.so_that}

### Description
${input.description}

### Requirements
${renderMarkdownBulletList(input.requirements)}

### Scope
${renderMarkdownBulletList(input.scope)}

### Scope Boundary
${renderMarkdownBulletList(input.scopeBoundary)}
`
}

export function parseCanonicalEpicIndexEntries(documentContent: string): readonly CanonicalEpicIndexEntry[] {
	const epicsHeadingEnd = findEpicsHeadingEndIndex(documentContent)
	if (epicsHeadingEnd === undefined) {
		return []
	}

	return parseEpicsBody(documentContent.slice(epicsHeadingEnd)).sections.map((section) => ({
		identity: section.identity,
		title: section.title,
	}))
}

function findDuplicateCanonicalEpicIdentity(entries: readonly CanonicalEpicIndexEntry[]): string | undefined {
	const seenIdentities = new Set<string>()
	for (const entry of entries) {
		if (seenIdentities.has(entry.identity)) {
			return entry.identity
		}

		seenIdentities.add(entry.identity)
	}

	return undefined
}

export function buildEpicsIndexJson(documentContent: string): string {
	const parsedEntries = parseCanonicalEpicIndexEntries(documentContent)
	if (parsedEntries.length === 0) {
		throw new Error("Cannot build Epics.index.json because Epics.md contains no canonical epic sections.")
	}

	const duplicateIdentity = findDuplicateCanonicalEpicIdentity(parsedEntries)
	if (duplicateIdentity !== undefined) {
		throw new Error(
			`Cannot build Epics.index.json because duplicate canonical epic identity "${duplicateIdentity}" was found.`,
		)
	}

	const epics = [...parsedEntries].sort((leftEntry, rightEntry) => Number(leftEntry.identity) - Number(rightEntry.identity))

	return `${JSON.stringify({ version: 1, epics }, undefined, 2)}\n`
}

export function upsertCanonicalEpicSection(documentContent: string, input: CreateEpicSectionInput): string {
	const epicsHeadingEnd = findEpicsHeadingEnd(documentContent)
	const documentPrefixThroughEpicsHeading = documentContent.slice(0, epicsHeadingEnd)
	const parsedEpicsBody = parseEpicsBody(documentContent.slice(epicsHeadingEnd))
	const canonicalSectionContent = buildCanonicalEpicSection(input).trim()
	const upsertedSection: ParsedCanonicalEpicSection = {
		identity: input.identity,
		title: input.title,
		numericIdentity: Number(input.identity),
		content: canonicalSectionContent,
	}
	const nextSections: ParsedCanonicalEpicSection[] = []
	let replacedExistingSection = false

	for (const section of parsedEpicsBody.sections) {
		if (section.identity === input.identity) {
			if (!replacedExistingSection) {
				nextSections.push(upsertedSection)
				replacedExistingSection = true
			}
			continue
		}

		nextSections.push(section)
	}

	if (!replacedExistingSection) {
		nextSections.push(upsertedSection)
	}

	return renderDocumentWithEpicsSections(
		documentPrefixThroughEpicsHeading,
		parsedEpicsBody.preamble,
		sortCanonicalEpicSectionsByNumericIdentity(nextSections),
	)
}
