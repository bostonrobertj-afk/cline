import fs from "fs/promises"
import path from "path"
import type {
	ManagedWorkflowDefinition,
	ManagedWorkflowExtractionStrategy,
	ManagedWorkflowItemState,
	ManagedWorkflowPhaseState,
} from "./types"

const PHASE_ROOT_CANDIDATES = ["steps", "steps-c", "steps-e", "steps-v", "domain-steps", "market-steps", "technical-steps"]
const DEFAULT_SECTION_HEADER_CANDIDATES = [
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
const DEFAULT_STRATEGY_ORDER: ManagedWorkflowExtractionStrategy[] = [
	"workflow-steps",
	"numbered-headings",
	"ordered-lists",
	"bullet-groups",
	"template-outputs",
	"heading-items",
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

function stripMarkdown(text: string): string {
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

function normalizeHeading(heading: string): string {
	return heading.replace(/#+\s*/, "").trim().toUpperCase()
}

function dedupeLabels(labels: string[]): string[] {
	const seen = new Set<string>()
	const result: string[] = []

	for (const label of labels.map((entry) => stripMarkdown(entry)).filter(Boolean)) {
		const key = label.toLowerCase()
		if (!seen.has(key)) {
			seen.add(key)
			result.push(label)
		}
	}

	return result
}

function extractHeadingTitle(content: string): string | undefined {
	const match = content.match(/^#\s+(.+)$/m)
	return match?.[1]?.trim()
}

function extractCheckpointSection(content: string): string | undefined {
	const match = content.match(/### CHECKPOINT([\s\S]*?)(?:\n## |\n### |Z)/i)
	return match?.[1]?.trim()
}

function splitIntoLevelTwoSections(content: string): Array<{ heading: string; body: string }> {
	const matches = Array.from(content.matchAll(/^##\s+(.+)$/gm))
	if (matches.length === 0) {
		return []
	}

	return matches.map((match, index) => {
		const start = match.index ?? 0
		const heading = `## ${match[1]?.trim() ?? ""}`
		const bodyStart = start + match[0].length
		const end = index + 1 < matches.length ? (matches[index + 1].index ?? content.length) : content.length
		return {
			heading,
			body: content.slice(bodyStart, end).trim(),
		}
	})
}

function extractCandidateSections(content: string): string[] {
	const sections = splitIntoLevelTwoSections(content)
	if (sections.length === 0) {
		return [content]
	}

	const candidateHeaders = new Set(DEFAULT_SECTION_HEADER_CANDIDATES.map((heading) => normalizeHeading(heading)))
	const matched = sections
		.filter((section) => candidateHeaders.has(normalizeHeading(section.heading)))
		.map((section) => `${section.heading}\n${section.body}`.trim())

	return matched.length > 0 ? matched : [content]
}

function extractOrderedItems(content: string): string[] {
	const lines = content.split("\n")
	const items: string[] = []
	let current: string[] = []

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

function extractHeadingItems(content: string): string[] {
	return dedupeLabels(
		Array.from(content.matchAll(/^###\s+(.+)$/gm))
			.map((match) => match[1] ?? "")
			.filter(Boolean),
	)
}

function extractBulletGroupItems(content: string): string[] {
	const lines = content.split("\n")
	const labels: string[] = []
	let inFence = false

	for (const rawLine of lines) {
		const line = rawLine.trim()
		if (line.startsWith("```")) {
			inFence = !inFence
			continue
		}

		if (inFence || !line.startsWith("- ")) {
			continue
		}

		labels.push(line.replace(/^-+\s+/, ""))
	}

	return dedupeLabels(labels)
}

function extractNumberedHeadingItems(content: string): string[] {
	const headingRegex = /^###\s+((?:\d+[A-Za-z]?\.?\s+|N\.\s+).+)$/gm
	const matches = Array.from(content.matchAll(headingRegex))
	if (matches.length === 0) {
		return []
	}

	const items: string[] = []

	for (const [index, match] of matches.entries()) {
		const start = match.index ?? 0
		const end = index + 1 < matches.length ? (matches[index + 1].index ?? content.length) : content.length
		const block = content.slice(start, end)
		const heading = stripMarkdown((match[1] ?? "").replace(/^(?:\d+[A-Za-z]?\.?\s+|N\.\s+)/, ""))
		if (heading) {
			items.push(heading)
		}

		const bulletItems = extractBulletGroupItems(block)
		for (const bullet of bulletItems) {
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

function stripCheckBlocks(content: string): string {
	return content.replace(/<check\b[^>]*>[\s\S]*?<\/check>/g, " ")
}

function parseStepNumber(attrs: string): number | undefined {
	const raw = /n="([^"]+)"/.exec(attrs)?.[1]?.trim()
	if (!raw) {
		return undefined
	}

	const parsed = Number.parseInt(raw, 10)
	return Number.isNaN(parsed) ? undefined : parsed
}

function isStepWithinPrimaryRange(stepNumber: number | undefined, workflow: ManagedWorkflowDefinition): boolean {
	if (workflow.primaryStepRange == null || stepNumber == null) {
		return true
	}

	const min = workflow.primaryStepRange.min ?? Number.NEGATIVE_INFINITY
	const max = workflow.primaryStepRange.max ?? Number.POSITIVE_INFINITY
	return stepNumber >= min && stepNumber <= max
}

function extractTemplateOutputItems(content: string): string[] {
	return dedupeLabels(
		Array.from(content.matchAll(/<template-output>\s*([^<\n]+?)\s*<\/template-output>/g)).map(
			(match) => `Persist template output "${stripMarkdown(match[1] ?? "")}"`,
		),
	)
}

function extractWorkflowStepItems(content: string, workflow: ManagedWorkflowDefinition): string[] {
	const stepMatches = Array.from(content.matchAll(/<step\b([^>]*)>([\s\S]*?)<\/step>/g))
	if (stepMatches.length === 0) {
		return []
	}

	const labels: string[] = []

	for (const match of stepMatches) {
		const attrs = match[1] ?? ""
		const body = match[2] ?? ""
		const stepNumber = parseStepNumber(attrs)
		if (!isStepWithinPrimaryRange(stepNumber, workflow)) {
			continue
		}

		const extractionBody = workflow.extractionMode === "branch-aware" ? stripCheckBlocks(body) : body
		const goal = stripMarkdown(/goal="([^"]+)"/.exec(attrs)?.[1] ?? "") || "Complete workflow step"

		const actionMatches = Array.from(extractionBody.matchAll(/<action(?:\s+if="[^"]*")?>([\s\S]*?)<\/action>/g))
		for (const action of actionMatches) {
			const actionText = stripMarkdown(action[1] ?? "")
			if (actionText) {
				labels.push(`${goal}: ${actionText}`)
			}
		}

		const askMatches = Array.from(extractionBody.matchAll(/<ask>([\s\S]*?)<\/ask>/g))
		for (const ask of askMatches) {
			const askText = stripMarkdown(ask[1] ?? "")
			if (askText) {
				labels.push(`${goal}: Ask user - ${askText}`)
			}
		}

		const templateOutputMatches = Array.from(extractionBody.matchAll(/<template-output>\s*([^<\n]+?)\s*<\/template-output>/g))
		for (const output of templateOutputMatches) {
			const outputText = stripMarkdown(output[1] ?? "")
			if (outputText) {
				labels.push(`${goal}: Persist "${outputText}"`)
			}
		}

		const outputMatches = Array.from(extractionBody.matchAll(/<output>([\s\S]*?)<\/output>/g))
		for (const output of outputMatches) {
			const outputText = stripMarkdown(output[1] ?? "")
			if (outputText) {
				labels.push(`${goal}: Produce output - ${outputText}`)
			}
		}

		const bulletItems = extractBulletGroupItems(extractionBody)
		for (const bullet of bulletItems) {
			labels.push(`${goal}: ${bullet}`)
		}

		if (
			actionMatches.length === 0 &&
			askMatches.length === 0 &&
			templateOutputMatches.length === 0 &&
			outputMatches.length === 0 &&
			bulletItems.length === 0
		) {
			labels.push(goal)
		}
	}

	return dedupeLabels(labels)
}

function toItemStates(phaseId: string, labels: string[]): ManagedWorkflowItemState[] {
	return labels.map((label, index) => ({
		id: `${phaseId}::item-${index + 1}`,
		label,
		sourceText: label,
		completed: false,
	}))
}

function applyWorkflowSpecificItemPolicies(
	workflow: ManagedWorkflowDefinition,
	phaseId: string,
	items: ManagedWorkflowItemState[],
): ManagedWorkflowItemState[] {
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

function extractItemsForPhase(
	sourceContent: string,
	workflow: ManagedWorkflowDefinition,
	phaseId: string,
	phaseTitle: string,
): ManagedWorkflowItemState[] {
	const candidateSections = extractCandidateSections(sourceContent)
	const scopedContent = candidateSections.join("\n\n").trim()
	const strategies = workflow.strategyHints?.length ? workflow.strategyHints : DEFAULT_STRATEGY_ORDER

	const strategyOutputs: Record<ManagedWorkflowExtractionStrategy, string[]> = {
		"workflow-steps": extractWorkflowStepItems(scopedContent || sourceContent, workflow),
		"template-outputs": extractTemplateOutputItems(scopedContent || sourceContent),
		"numbered-headings": extractNumberedHeadingItems(scopedContent || sourceContent),
		"ordered-lists": extractOrderedItems(scopedContent || sourceContent),
		"bullet-groups": extractBulletGroupItems(scopedContent || sourceContent),
		"heading-items": extractHeadingItems(scopedContent || sourceContent),
	}

	for (const strategy of strategies) {
		const labels = dedupeLabels(strategyOutputs[strategy])
		if (labels.length > 0) {
			return applyWorkflowSpecificItemPolicies(workflow, phaseId, toItemStates(phaseId, labels))
		}
	}

	return applyWorkflowSpecificItemPolicies(workflow, phaseId, [
		{
			id: `${phaseId}::item-1`,
			label: `Review and complete phase "${phaseTitle}"`,
			sourceText: phaseTitle,
			completed: false,
		},
	])
}

async function readPhaseFile(
	absPath: string,
	relPath: string,
	workflow: ManagedWorkflowDefinition,
): Promise<ManagedWorkflowPhaseState> {
	const sourceContent = await fs.readFile(absPath, "utf8")
	const title = extractHeadingTitle(sourceContent) ?? path.basename(relPath, path.extname(relPath))
	const phaseId = path.basename(relPath, path.extname(relPath))
	const items = extractItemsForPhase(sourceContent, workflow, phaseId, title)
	const checkpoint = extractCheckpointSection(sourceContent)

	if (checkpoint) {
		items.push({
			id: `${phaseId}::checkpoint`,
			label: stripMarkdown(checkpoint.split("\n")[0] || "Complete checkpoint"),
			sourceText: stripMarkdown(checkpoint),
			completed: false,
			blocked: true,
		})
	}

	return {
		id: phaseId,
		title,
		sourcePath: relPath,
		sourceContent,
		items,
		completed: false,
	}
}

async function discoverPhasePaths(cwd: string, workflow: ManagedWorkflowDefinition): Promise<string[]> {
	const explicitRoots =
		workflow.phaseRoots.length > 0
			? workflow.phaseRoots
			: PHASE_ROOT_CANDIDATES.map((candidate) => path.join(path.dirname(workflow.skillPath), candidate))
	const found: string[] = []

	for (const relRoot of explicitRoots) {
		const absRoot = path.resolve(cwd, relRoot)
		try {
			const entries = await fs.readdir(absRoot, { withFileTypes: true })
			const phaseFiles = entries
				.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
				.map((entry) => path.join(relRoot, entry.name))
				.sort((a, b) => a.localeCompare(b))
			found.push(...phaseFiles)
		} catch {
			// Missing phase roots are tolerated in favor of the workflow fallback.
		}
	}

	return Array.from(new Set(found))
}

export async function extractManagedWorkflowPhases(
	cwd: string,
	workflow: ManagedWorkflowDefinition,
): Promise<ManagedWorkflowPhaseState[]> {
	const phasePaths = await discoverPhasePaths(cwd, workflow)
	if (phasePaths.length === 0) {
		return [await readPhaseFile(path.resolve(cwd, workflow.workflowPath), workflow.workflowPath, workflow)]
	}

	return Promise.all(phasePaths.map((phasePath) => readPhaseFile(path.resolve(cwd, phasePath), phasePath, workflow)))
}
