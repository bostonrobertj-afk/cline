import fs from "fs/promises"
import { Logger } from "@/shared/services/Logger"
import { getPlaceholderWorkflowValueMap, resolvePlaceholderWorkflowText } from "./placeholder-workflow-rendering"
import type { ResolvedWorkflowEntry } from "./resolution/resolveAvailableWorkflows"
import { findUnresolvedWorkflowPlaceholders, getCanonicalWorkflowConfigPath } from "./workflow-placeholders"

export type ActivePlaceholderWorkflowSource =
	| {
			type: "local" | "global"
			name: string
			path: string
			configPath?: string
	  }
	| {
			type: "remote"
			name: string
			contents: string
			configPath?: string
	  }

export type ActivePlaceholderWorkflowStepDetails = {
	checklistLabel: string
	stepNumber?: number
	stepTitle: string
	stepHeading: string
	details: string
	sourceName: string
	sourceType: ActivePlaceholderWorkflowSource["type"]
}

type ParsedChecklistItem = {
	label: string
	stepNumber?: number
	stepTitle: string
	normalizedTitle: string
}

type ParsedWorkflowStepSection = {
	heading: string
	stepNumber?: number
	stepTitle: string
	normalizedTitle: string
	details: string
}

type ParseWorkflowStepSectionsOptions = {
	includeEmptySections?: boolean
}

const INCOMPLETE_CHECKLIST_ITEM_REGEX = /^\s*-\s*\[\s\]\s*(.+?)\s*$/
const STEP_LABEL_REGEX = /^step\s+(\d+)(?:\s*[:-]\s*(.+))?$/i
const STEP_HEADING_REGEX = /^\s{0,3}#{2,6}\s+step\s+(\d+)(?:\s*[:-]\s*(.+?))?\s*$/i

export async function buildActivePlaceholderWorkflowSource(
	workflow: ResolvedWorkflowEntry,
	workflowContents?: string,
	cwd?: string,
): Promise<ActivePlaceholderWorkflowSource | undefined> {
	const configPath = cwd ? getCanonicalWorkflowConfigPath(cwd) : undefined
	switch (workflow.source) {
		case "local":
		case "global":
			if (!workflow.fullPath) {
				return undefined
			}

			return {
				type: workflow.source,
				name: workflow.name,
				path: workflow.fullPath,
				...(configPath ? { configPath } : {}),
			}
		case "remote": {
			const contents = (workflowContents ?? workflow.contents ?? "").trim()
			return {
				type: "remote",
				name: workflow.name,
				contents,
				...(configPath ? { configPath } : {}),
			}
		}
		default:
			return undefined
	}
}

export function isSameActivePlaceholderWorkflowSource(
	left?: ActivePlaceholderWorkflowSource,
	right?: ActivePlaceholderWorkflowSource,
): boolean {
	if (!left || !right) {
		return left === right
	}

	if (left.type !== right.type || left.name !== right.name) {
		return false
	}

	if (left.configPath !== right.configPath) {
		return false
	}

	if (left.type === "remote" && right.type === "remote") {
		return left.contents === right.contents
	}

	if (left.type !== "remote" && right.type !== "remote") {
		return left.path === right.path
	}

	return false
}

export async function getActivePlaceholderWorkflowStepDetails(args: {
	checklistMarkdown: string
	source: ActivePlaceholderWorkflowSource
	stablePlaceholderValues?: Record<string, string>
	placeholderValues?: Record<string, string>
}): Promise<ActivePlaceholderWorkflowStepDetails | undefined> {
	const checklistItem = getFirstIncompleteChecklistItem(args.checklistMarkdown)
	if (!checklistItem) {
		return undefined
	}

	const workflowContents = await getRenderedActivePlaceholderWorkflowSourceContents({
		source: args.source,
		stablePlaceholderValues: args.stablePlaceholderValues,
		placeholderValues: args.placeholderValues,
	})
	const workflowSections = parseWorkflowStepSections(workflowContents)
	if (workflowSections.length === 0) {
		return undefined
	}

	let matchingSection: ParsedWorkflowStepSection | undefined
	if (checklistItem.stepNumber !== undefined) {
		matchingSection = workflowSections.find((section) => section.stepNumber === checklistItem.stepNumber)
	}

	if (!matchingSection && checklistItem.normalizedTitle) {
		matchingSection = workflowSections.find((section) => section.normalizedTitle === checklistItem.normalizedTitle)
	}

	if (!matchingSection || !matchingSection.details.trim()) {
		return undefined
	}

	return {
		checklistLabel: checklistItem.label,
		stepNumber: matchingSection.stepNumber ?? checklistItem.stepNumber,
		stepTitle: matchingSection.stepTitle || checklistItem.stepTitle || checklistItem.label,
		stepHeading: matchingSection.heading,
		details: matchingSection.details.trim(),
		sourceName: args.source.name,
		sourceType: args.source.type,
	}
}

export async function buildPlaceholderWorkflowChecklist(args: {
	source: ActivePlaceholderWorkflowSource
	stablePlaceholderValues?: Record<string, string>
	placeholderValues?: Record<string, string>
}): Promise<string | undefined> {
	const workflowContents = await getRenderedActivePlaceholderWorkflowSourceContents({
		source: args.source,
		stablePlaceholderValues: args.stablePlaceholderValues,
		placeholderValues: args.placeholderValues,
	})
	const workflowSections = parseWorkflowStepSections(workflowContents, { includeEmptySections: true })
	if (workflowSections.length === 0) {
		return undefined
	}

	return workflowSections.map((section) => `- [ ] ${formatWorkflowStepChecklistLabel(section)}`).join("\n")
}

export async function getRenderedActivePlaceholderWorkflowSourceContents(args: {
	source: ActivePlaceholderWorkflowSource
	stablePlaceholderValues?: Record<string, string>
	placeholderValues?: Record<string, string>
}): Promise<string> {
	const workflowContents = await getPlaceholderWorkflowSourceContents(args.source)
	const placeholderValues = getPlaceholderWorkflowValueMap(args.stablePlaceholderValues, args.placeholderValues)
	const rendered = resolvePlaceholderWorkflowText(workflowContents, placeholderValues) ?? workflowContents
	const unresolvedPlaceholders = findUnresolvedWorkflowPlaceholders(rendered)
	if (unresolvedPlaceholders.length > 0) {
		Logger.info(
			`[WorkflowPlaceholders] unresolved placeholder tokens remain after rendering ${args.source.name}: ${unresolvedPlaceholders.join(", ")}`,
		)
	}
	return rendered
}

async function getPlaceholderWorkflowSourceContents(source: ActivePlaceholderWorkflowSource): Promise<string> {
	if (source.type === "remote") {
		return source.contents
	}

	return await fs.readFile(source.path, "utf8")
}

function getFirstIncompleteChecklistItem(checklistMarkdown: string): ParsedChecklistItem | undefined {
	const lines = checklistMarkdown.split(/\r?\n/)
	for (const line of lines) {
		const match = INCOMPLETE_CHECKLIST_ITEM_REGEX.exec(line)
		if (!match) {
			continue
		}

		return parseChecklistLabel(match[1].trim())
	}

	return undefined
}

function parseChecklistLabel(label: string): ParsedChecklistItem {
	const stepMatch = STEP_LABEL_REGEX.exec(label)
	if (!stepMatch) {
		return {
			label,
			stepTitle: label,
			normalizedTitle: normalizeTitle(label),
		}
	}

	const stepTitle = stepMatch[2]?.trim() || label
	return {
		label,
		stepNumber: Number(stepMatch[1]),
		stepTitle,
		normalizedTitle: normalizeTitle(stepTitle),
	}
}

function parseWorkflowStepSections(
	workflowMarkdown: string,
	options: ParseWorkflowStepSectionsOptions = {},
): ParsedWorkflowStepSection[] {
	const lines = workflowMarkdown.split(/\r?\n/)
	const sections: ParsedWorkflowStepSection[] = []
	let currentSection:
		| {
				heading: string
				stepNumber?: number
				stepTitle: string
				normalizedTitle: string
				bodyLines: string[]
		  }
		| undefined

	for (const line of lines) {
		const headingMatch = STEP_HEADING_REGEX.exec(line)
		if (headingMatch) {
			if (currentSection) {
				sections.push(finalizeWorkflowStepSection(currentSection))
			}

			const stepTitle = headingMatch[2]?.trim() || `Step ${headingMatch[1]}`
			currentSection = {
				heading: line.trim(),
				stepNumber: Number(headingMatch[1]),
				stepTitle,
				normalizedTitle: normalizeTitle(stepTitle),
				bodyLines: [],
			}
			continue
		}

		if (currentSection) {
			currentSection.bodyLines.push(line)
		}
	}

	if (currentSection) {
		sections.push(finalizeWorkflowStepSection(currentSection))
	}

	return options.includeEmptySections ? sections : sections.filter((section) => section.details.length > 0)
}

function finalizeWorkflowStepSection(section: {
	heading: string
	stepNumber?: number
	stepTitle: string
	normalizedTitle: string
	bodyLines: string[]
}): ParsedWorkflowStepSection {
	return {
		heading: section.heading,
		stepNumber: section.stepNumber,
		stepTitle: section.stepTitle,
		normalizedTitle: section.normalizedTitle,
		details: section.bodyLines.join("\n").trim(),
	}
}

function normalizeTitle(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.replace(/\s+/g, " ")
}

function formatWorkflowStepChecklistLabel(section: ParsedWorkflowStepSection): string {
	if (section.stepNumber == null) {
		return section.stepTitle
	}

	const defaultTitle = `Step ${section.stepNumber}`
	return section.stepTitle === defaultTitle ? defaultTitle : `Step ${section.stepNumber}: ${section.stepTitle}`
}
