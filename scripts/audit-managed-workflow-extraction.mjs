#!/usr/bin/env node
// Keep this script in sync with ManagedWorkflowPhaseExtractor.ts.

import fs from "fs/promises"
import path from "path"
import { REGISTRY_PATH } from "./managed-workflows.shared.mjs"

const cwd = process.cwd()

function stripMarkdown(text) {
	return text
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/\*([^*]+)\*/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/<\/?[^>]+>/g, " ")
		.replace(/\{\{[^}]+\}\}/g, " ")
		.replace(/\s+/g, " ")
		.trim()
}

function dedupeLabels(labels) {
	const seen = new Set()
	const result = []
	for (const label of labels.map((entry) => stripMarkdown(entry)).filter(Boolean)) {
		const key = label.toLowerCase()
		if (!seen.has(key)) {
			seen.add(key)
			result.push(label)
		}
	}
	return result
}

function extractHeadingTitle(content) {
	const match = content.match(/^#\s+(.+)$/m)
	return match?.[1]?.trim()
}

function extractCheckpointSection(content) {
	const match = content.match(/### CHECKPOINT([\s\S]*?)(?:\n## |\n### |Z)/i)
	return match?.[1]?.trim()
}

function normalizeHeading(heading) {
	return heading.replace(/#+\s*/, "").trim().toUpperCase()
}

const SECTION_HEADERS = [
	"## INSTRUCTIONS",
	"## EXECUTION",
	"## EXECUTION PROTOCOLS",
	"## EXECUTION PROCESS",
	"## PROCESS",
	"## STEPS",
	"## WORKFLOW",
	"## DISCOVERY SEQUENCE",
	"## REQUIREMENTS EXTRACTION PROCESS",
	"## YOUR TASK",
	"## CONTENT TO SAVE TO DOCUMENT",
	"## STAGES",
	"## ON ACTIVATION",
]

const UX_DESIGN_COMPLETE_ADVISORY_PATTERNS = [
	/Wireframe Generation/i,
	/Interactive Prototype/i,
	/Solution Architecture/i,
	/Figma Visual Design/i,
	/Epic Creation/i,
	/For design-focused teams/i,
	/For technical teams/i,
	/Consider team capacity/i,
]

function splitIntoLevelTwoSections(content) {
	const matches = Array.from(content.matchAll(/^##\s+(.+)$/gm))
	if (matches.length === 0) {
		return []
	}

	return matches.map((match, index) => {
		const start = match.index ?? 0
		const bodyStart = start + match[0].length
		const end = index + 1 < matches.length ? (matches[index + 1].index ?? content.length) : content.length
		return {
			heading: `## ${match[1]?.trim() ?? ""}`,
			body: content.slice(bodyStart, end).trim(),
		}
	})
}

function extractCandidateSections(content) {
	const sections = splitIntoLevelTwoSections(content)
	if (sections.length === 0) {
		return [content]
	}

	const candidateHeaders = new Set(SECTION_HEADERS.map((heading) => normalizeHeading(heading)))
	const matched = sections
		.filter((section) => candidateHeaders.has(normalizeHeading(section.heading)))
		.map((section) => `${section.heading}\n${section.body}`.trim())

	return matched.length > 0 ? matched : [content]
}

function extractOrderedItems(content) {
	const lines = content.split("\n")
	const items = []
	let current = []
	const flush = () => {
		if (current.length > 0) {
			items.push(current.join(" ").trim())
			current = []
		}
	}

	for (const rawLine of lines) {
		const line = rawLine.replace(/\t/g, "    ")
		if (/^\d+\.\s+/.test(line.trimStart()) && line === line.trimStart()) {
			flush()
			current.push(line.trimStart().replace(/^\d+\.\s+/, ""))
			continue
		}
		if (current.length > 0) {
			if (/^##\s+/.test(line) || /^###\s+/.test(line)) {
				flush()
				continue
			}
			if (line.trim()) {
				current.push(line.trim())
			}
		}
	}

	flush()
	return dedupeLabels(items)
}

function extractBulletGroupItems(content) {
	const lines = content.split("\n")
	const labels = []
	let inFence = false
	for (const rawLine of lines) {
		const line = rawLine.trim()
		if (line.startsWith("```")) {
			inFence = !inFence
			continue
		}
		if (!inFence && line.startsWith("- ")) {
			labels.push(line.replace(/^-+\s+/, ""))
		}
	}
	return dedupeLabels(labels)
}

function extractHeadingItems(content) {
	return dedupeLabels(
		Array.from(content.matchAll(/^###\s+(.+)$/gm))
			.map((match) => match[1] ?? "")
			.filter(Boolean),
	)
}

function extractNumberedHeadingItems(content) {
	const headingRegex = /^###\s+((?:\d+[A-Za-z]?\.?\s+|N\.\s+).+)$/gm
	const matches = Array.from(content.matchAll(headingRegex))
	if (matches.length === 0) {
		return []
	}

	const items = []
	for (const [index, match] of matches.entries()) {
		const start = match.index ?? 0
		const end = index + 1 < matches.length ? (matches[index + 1].index ?? content.length) : content.length
		const block = content.slice(start, end)
		const heading = stripMarkdown((match[1] ?? "").replace(/^(?:\d+[A-Za-z]?\.?\s+|N\.\s+)/, ""))
		if (heading) {
			items.push(heading)
		}
		for (const bullet of extractBulletGroupItems(block)) {
			items.push(`${heading}: ${bullet}`)
		}
		const boldLabels = Array.from(block.matchAll(/\*\*([^*]+)\*\*:?/g))
			.map((entry) => stripMarkdown(entry[1] ?? ""))
			.filter(Boolean)
		for (const label of boldLabels) {
			if (!label.toLowerCase().startsWith("success") && !label.toLowerCase().startsWith("system failure")) {
				items.push(`${heading}: ${label}`)
			}
		}
	}

	return dedupeLabels(items)
}

function extractTemplateOutputItems(content) {
	return dedupeLabels(
		Array.from(content.matchAll(/<template-output>\s*([^<\n]+?)\s*<\/template-output>/g)).map(
			(match) => `Persist template output "${stripMarkdown(match[1] ?? "")}"`,
		),
	)
}

function stripCheckBlocks(content) {
	return content.replace(/<check\b[^>]*>[\s\S]*?<\/check>/g, " ")
}

function parseStepNumber(attrs) {
	const raw = /n="([^"]+)"/.exec(attrs)?.[1]?.trim()
	if (!raw) return undefined
	const parsed = Number.parseInt(raw, 10)
	return Number.isNaN(parsed) ? undefined : parsed
}

function isStepWithinPrimaryRange(stepNumber, workflow) {
	if (!workflow.primaryStepRange || stepNumber == null) {
		return true
	}
	const min = workflow.primaryStepRange.min ?? Number.NEGATIVE_INFINITY
	const max = workflow.primaryStepRange.max ?? Number.POSITIVE_INFINITY
	return stepNumber >= min && stepNumber <= max
}

function extractWorkflowStepItems(content, workflow) {
	const stepMatches = Array.from(content.matchAll(/<step\b([^>]*)>([\s\S]*?)<\/step>/g))
	if (stepMatches.length === 0) {
		return []
	}

	const labels = []
	for (const match of stepMatches) {
		const attrs = match[1] ?? ""
		const body = match[2] ?? ""
		const stepNumber = parseStepNumber(attrs)
		if (!isStepWithinPrimaryRange(stepNumber, workflow)) {
			continue
		}
		const extractionBody = workflow.extractionMode === "branch-aware" ? stripCheckBlocks(body) : body
		const goal = stripMarkdown(/goal="([^"]+)"/.exec(attrs)?.[1] ?? "") || "Complete workflow step"

		for (const action of Array.from(extractionBody.matchAll(/<action(?:\s+if="[^"]*")?>([\s\S]*?)<\/action>/g))) {
			const text = stripMarkdown(action[1] ?? "")
			if (text) labels.push(`${goal}: ${text}`)
		}
		for (const ask of Array.from(extractionBody.matchAll(/<ask>([\s\S]*?)<\/ask>/g))) {
			const text = stripMarkdown(ask[1] ?? "")
			if (text) labels.push(`${goal}: Ask user - ${text}`)
		}
		for (const output of Array.from(extractionBody.matchAll(/<template-output>\s*([^<\n]+?)\s*<\/template-output>/g))) {
			const text = stripMarkdown(output[1] ?? "")
			if (text) labels.push(`${goal}: Persist "${text}"`)
		}
		for (const output of Array.from(extractionBody.matchAll(/<output>([\s\S]*?)<\/output>/g))) {
			const text = stripMarkdown(output[1] ?? "")
			if (text) labels.push(`${goal}: Produce output - ${text}`)
		}
		const bullets = extractBulletGroupItems(extractionBody)
		for (const bullet of bullets) {
			labels.push(`${goal}: ${bullet}`)
		}
		if (
			bullets.length === 0 &&
			!extractionBody.includes("<action") &&
			!extractionBody.includes("<ask") &&
			!extractionBody.includes("<template-output") &&
			!extractionBody.includes("<output>")
		) {
			labels.push(goal)
		}
	}

	return dedupeLabels(labels)
}

function applyWorkflowSpecificItemPolicies(workflow, phaseId, items) {
	if (workflow.workflowId === "bmad-sprint-status") {
		return items.filter(
			(item) =>
				!item.label.startsWith("Data mode output:") &&
				!item.label.startsWith("Validate sprint-status file:") &&
				!item.label.includes("Jump to Step 20") &&
				!item.label.includes("Jump to Step 30"),
		)
	}

	if (workflow.workflowId === "bmad-create-ux-design" && phaseId === "step-14-complete") {
		return items.map((item) =>
			UX_DESIGN_COMPLETE_ADVISORY_PATTERNS.some((pattern) => pattern.test(item.label))
				? { ...item, required: false, advisory: true }
				: item,
		)
	}

	return items
}

function toAuditItems(phaseId, labels) {
	return labels.map((label, index) => ({
		id: `${phaseId}::item-${index + 1}`,
		label,
		sourceText: label,
		completed: false,
		required: true,
		advisory: false,
	}))
}

function extractItems(content, workflow, phaseId, phaseTitle, strategyHints = []) {
	const scopedContent = extractCandidateSections(content).join("\n\n").trim() || content
	const strategies = strategyHints.length
		? strategyHints
		: ["workflow-steps", "numbered-headings", "ordered-lists", "bullet-groups", "template-outputs", "heading-items"]

	const outputs = {
		"workflow-steps": extractWorkflowStepItems(scopedContent, workflow),
		"template-outputs": extractTemplateOutputItems(scopedContent),
		"numbered-headings": extractNumberedHeadingItems(scopedContent),
		"ordered-lists": extractOrderedItems(scopedContent),
		"bullet-groups": extractBulletGroupItems(scopedContent),
		"heading-items": extractHeadingItems(scopedContent),
	}

	for (const strategy of strategies) {
		const labels = dedupeLabels(outputs[strategy] ?? [])
		if (labels.length > 0) {
			return applyWorkflowSpecificItemPolicies(workflow, phaseId, toAuditItems(phaseId, labels))
		}
	}

	return applyWorkflowSpecificItemPolicies(workflow, phaseId, [
		{
			id: `${phaseId}::item-1`,
			label: `Review and complete phase "${phaseTitle}"`,
			sourceText: phaseTitle,
			completed: false,
			required: true,
			advisory: false,
		},
	])
}

async function discoverPhasePaths(workflow) {
	const phasePaths = [...(workflow.phaseRoots ?? [])]
	if (phasePaths.length === 0) {
		return [workflow.workflowPath]
	}

	const files = []
	for (const relRoot of phasePaths) {
		const absRoot = path.resolve(cwd, relRoot)
		try {
			const entries = await fs.readdir(absRoot, { withFileTypes: true })
			files.push(
				...entries
					.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
					.map((entry) => path.join(relRoot, entry.name).split(path.sep).join("/"))
					.sort((a, b) => a.localeCompare(b)),
			)
		} catch {
			// ignore missing phase roots
		}
	}
	return files
}

async function main() {
	const registry = JSON.parse(await fs.readFile(path.join(cwd, REGISTRY_PATH), "utf8"))
	const workflows = []

	for (const workflow of registry) {
		const phasePaths = await discoverPhasePaths(workflow)
		const phaseItemCounts = []

		for (const phasePath of phasePaths) {
			const content = await fs.readFile(path.join(cwd, phasePath), "utf8")
			const phaseId = path.basename(phasePath, path.extname(phasePath))
			const phaseTitle = extractHeadingTitle(content) ?? phaseId
			const items = extractItems(content, workflow, phaseId, phaseTitle, workflow.strategyHints)
			const checkpoint = extractCheckpointSection(content)
			if (checkpoint) {
				items.push({
					id: `${phaseId}::checkpoint`,
					label: stripMarkdown(checkpoint.split("\n")[0] || "Complete checkpoint"),
					sourceText: stripMarkdown(checkpoint),
					completed: false,
					required: true,
					advisory: false,
					blocked: true,
				})
			}
			phaseItemCounts.push({
				phaseId,
				itemCount: items.filter((item) => item.required !== false).length,
				advisoryItemCount: items.filter((item) => item.required === false).length,
			})
		}

		workflows.push({
			workflowId: workflow.workflowId,
			phaseCount: phaseItemCounts.length,
			totalItems: phaseItemCounts.reduce((sum, phase) => sum + phase.itemCount, 0),
			phaseItemCounts,
		})
	}

	const oneItemTotal = workflows.filter((workflow) => workflow.totalItems === 1).map((workflow) => workflow.workflowId)
	const oneItemPerPhase = workflows
		.filter((workflow) => workflow.phaseCount > 0 && workflow.phaseItemCounts.every((phase) => phase.itemCount === 1))
		.map((workflow) => workflow.workflowId)

	console.log(
		JSON.stringify(
			{
				workflowCount: workflows.length,
				oneItemTotal,
				oneItemPerPhase,
				workflows,
			},
			null,
			2,
		),
	)
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})
