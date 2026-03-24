import fs from "fs/promises"
import type { ResolvedWorkflowEntry } from "./resolution/resolveAvailableWorkflows"

export type ActivePlaceholderWorkflowSource =
	| {
			type: "local" | "global"
			name: string
			path: string
	  }
	| {
			type: "remote"
			name: string
			contents: string
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

const INCOMPLETE_CHECKLIST_ITEM_REGEX = /^\s*-\s*\[\s\]\s*(.+?)\s*$/
const STEP_LABEL_REGEX = /^step\s+(\d+)(?:\s*[:-]\s*(.+))?$/i
const STEP_HEADING_REGEX = /^\s{0,3}#{2,6}\s+step\s+(\d+)(?:\s*[:-]\s*(.+?))?\s*$/i

export function buildActivePlaceholderWorkflowSource(
	workflow: ResolvedWorkflowEntry,
	workflowContents?: string,
): ActivePlaceholderWorkflowSource | undefined {
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
			}
		case "remote": {
			const contents = (workflowContents ?? workflow.contents ?? "").trim()
			return {
				type: "remote",
				name: workflow.name,
				contents,
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
}): Promise<ActivePlaceholderWorkflowStepDetails | undefined> {
	const checklistItem = getFirstIncompleteChecklistItem(args.checklistMarkdown)
	if (!checklistItem) {
		return undefined
	}

	const workflowContents = await getPlaceholderWorkflowSourceContents(args.source)
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

function parseWorkflowStepSections(workflowMarkdown: string): ParsedWorkflowStepSection[] {
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

	return sections.filter((section) => section.details.length > 0)
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
