import fs from "fs/promises"
import path from "path"
import type {
	ManagedWorkflowAnnotationKind,
	ManagedWorkflowDefinition,
	ManagedWorkflowExecutionDefinition,
	ManagedWorkflowInstructionNode,
	ManagedWorkflowItemState,
	ManagedWorkflowPhaseState,
	ManagedWorkflowStepDefinition,
} from "./types"

const PHASE_ROOT_CANDIDATES = ["steps", "steps-c", "steps-e", "steps-v", "domain-steps", "market-steps", "technical-steps"]
const EXECUTION_SECTION_HEADER_CANDIDATES = ["## INSTRUCTIONS", "## EXECUTION", "## WORKFLOW", "## STEPS"]
const ANNOTATION_TAGS = new Set(["critical", "note", "guideline"])
const ROUTE_TAGS = new Set(["goto", "handoff", "return", "exit"])
const GENERIC_WRAPPER_STEP_GOALS = [/review detailed guidance/i, /follow workflow/i, /wrapper/i]

function stripMarkdown(text: string): string {
	return text
		.replace(/^---[\s\S]*?---\s*/m, "")
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/\*([^*]+)\*/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/&quot;/g, '"')
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/<\/?[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim()
}

function parseAttributes(rawAttrs: string): Record<string, string> {
	const attributes: Record<string, string> = {}
	for (const match of rawAttrs.matchAll(/([a-zA-Z_][\w-]*)="([^"]*)"/g)) {
		attributes[match[1]] = match[2]
	}
	return attributes
}

function isOptionalAttribute(value?: string): boolean {
	return value?.trim().toLowerCase() === "true"
}

function splitIntoLevelTwoSections(content: string): Array<{ heading: string; body: string }> {
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

function normalizeHeading(heading: string): string {
	return heading.replace(/#+\s*/, "").trim().toUpperCase()
}

function extractSectionBody(content: string, headerCandidates: string[]): string | undefined {
	const sections = splitIntoLevelTwoSections(content)
	if (sections.length === 0) {
		return undefined
	}

	const candidates = new Set(headerCandidates.map((header) => normalizeHeading(header)))
	return sections.find((section) => candidates.has(normalizeHeading(section.heading)))?.body?.trim()
}

function extractHeadingTitle(content: string): string | undefined {
	return content.match(/^#\s+(.+)$/m)?.[1]?.trim()
}

function extractProseBlocks(content: string): string[] {
	return Array.from(content.matchAll(/<prose\b[^>]*>([\s\S]*?)<\/prose>/g)).map((match) => match[1] ?? "")
}

function extractCheckpointSection(content: string): string | undefined {
	return extractSectionBody(content, ["## CHECKPOINT"])
}

function findMatchingClosingTag(
	content: string,
	tagName: string,
	searchStart: number,
): { start: number; end: number } | undefined {
	const matcher = new RegExp(`<${tagName}\\b[^>]*>|</${tagName}>`, "g")
	matcher.lastIndex = searchStart
	let depth = 1

	for (let match = matcher.exec(content); match; match = matcher.exec(content)) {
		if (match[0].startsWith(`</${tagName}`)) {
			depth -= 1
		} else {
			depth += 1
		}

		if (depth === 0) {
			return {
				start: match.index,
				end: matcher.lastIndex,
			}
		}
	}

	return undefined
}

function parseNodeBody(content: string): { nodes: ManagedWorkflowInstructionNode[]; text?: string } {
	const nodes: ManagedWorkflowInstructionNode[] = []
	const textParts: string[] = []
	const matcher =
		/<(branch|check|action|ask|output|detail|template-output|critical|note|guideline)\b([^>]*)>|<(goto|handoff)\b([^>]*)\/>|<(return|exit)\s*\/>/g

	let cursor = 0
	while (cursor < content.length) {
		matcher.lastIndex = cursor
		const match = matcher.exec(content)
		if (!match) {
			textParts.push(content.slice(cursor))
			break
		}

		const start = match.index
		if (start > cursor) {
			textParts.push(content.slice(cursor, start))
		}

		if (match[1]) {
			const tagName = match[1]
			const attrs = parseAttributes(match[2] ?? "")
			const openEnd = matcher.lastIndex
			const closing = findMatchingClosingTag(content, tagName, openEnd)
			const closeStart = closing?.start ?? content.length
			const closeEnd = closing?.end ?? content.length
			const inner = content.slice(openEnd, closeStart)
			const parsedInner = parseNodeBody(inner)
			const immediateText = parsedInner.text
			const children = parsedInner.nodes.length > 0 ? parsedInner.nodes : undefined

			let node: ManagedWorkflowInstructionNode | undefined
			if (tagName === "branch" || tagName === "check") {
				node = {
					type: "branch",
					condition: attrs.if?.trim() || undefined,
					optional: isOptionalAttribute(attrs.optional),
					text: immediateText,
					children,
				}
			} else if (tagName === "action" || tagName === "ask" || tagName === "output" || tagName === "detail") {
				node = {
					type: tagName,
					condition: attrs.if?.trim() || undefined,
					optional: isOptionalAttribute(attrs.optional),
					text: immediateText,
					children,
				}
			} else if (tagName === "template-output") {
				node = {
					type: "template-output",
					condition: attrs.if?.trim() || undefined,
					optional: isOptionalAttribute(attrs.optional),
					text: immediateText,
					children,
				}
			} else if (ANNOTATION_TAGS.has(tagName)) {
				node = {
					type: "annotation",
					annotationKind: tagName as ManagedWorkflowAnnotationKind,
					condition: attrs.if?.trim() || undefined,
					optional: isOptionalAttribute(attrs.optional),
					text: immediateText,
					children,
				}
			}

			if (node && (node.text || node.children?.length || node.type === "branch")) {
				nodes.push(node)
			}
			cursor = closeEnd
			continue
		}

		const routeTag = (match[3] ?? match[5] ?? "").trim()
		if (routeTag && ROUTE_TAGS.has(routeTag)) {
			const attrs = parseAttributes(match[4] ?? "")
			nodes.push({
				type: "route",
				routeKind: routeTag as ManagedWorkflowInstructionNode["routeKind"],
				routeTarget: attrs.step ?? attrs.path,
			})
		}
		cursor = matcher.lastIndex
	}

	const text = stripMarkdown(textParts.join(" "))
	return {
		nodes,
		text: text || undefined,
	}
}

function parseExecutionSteps(
	content: string,
	phaseId: string,
	workflow: ManagedWorkflowDefinition,
): ManagedWorkflowStepDefinition[] {
	const steps: ManagedWorkflowStepDefinition[] = []
	const stepMatcher = /<step\b([^>]*)>/g

	for (let match = stepMatcher.exec(content); match; match = stepMatcher.exec(content)) {
		const attrs = parseAttributes(match[1] ?? "")
		const openEnd = stepMatcher.lastIndex
		const closing = findMatchingClosingTag(content, "step", openEnd)
		const closeStart = closing?.start ?? content.length
		const closeEnd = closing?.end ?? content.length
		const goal = stripMarkdown(attrs.goal ?? "") || "Complete workflow step"
		const n = attrs.n ? Number.parseInt(attrs.n, 10) : undefined
		const sequence = Number.isNaN(n ?? Number.NaN) ? undefined : n
		const stepId = `${phaseId}::step-${attrs.n?.trim() || steps.length + 1}`
		const parsedBody = parseNodeBody(content.slice(openEnd, closeStart))

		steps.push({
			id: stepId,
			number: sequence,
			goal,
			condition: attrs.if?.trim() || undefined,
			optional: isOptionalAttribute(attrs.optional),
			instructions: parsedBody.nodes,
		})

		stepMatcher.lastIndex = closeEnd
	}

	if (workflow.primaryStepRange) {
		const min = workflow.primaryStepRange.min ?? Number.NEGATIVE_INFINITY
		const max = workflow.primaryStepRange.max ?? Number.POSITIVE_INFINITY
		return steps.filter((step) => step.number == null || (step.number >= min && step.number <= max))
	}

	return steps
}

function buildFallbackExecution(phaseId: string, phaseTitle: string): ManagedWorkflowExecutionDefinition {
	return {
		steps: [
			{
				id: `${phaseId}::step-1`,
				goal: `Review and complete phase "${phaseTitle}"`,
				instructions: [],
			},
		],
	}
}

function countStructuredSteps(content: string | undefined): number {
	if (!content) {
		return 0
	}
	return Array.from(content.matchAll(/<step\b/g)).length
}

function looksLikeWrapperExecution(content: string): boolean {
	const goals = Array.from(content.matchAll(/<step\b[^>]*goal="([^"]+)"/g)).map((match) => stripMarkdown(match[1] ?? ""))
	return goals.length > 0 && goals.every((goal) => GENERIC_WRAPPER_STEP_GOALS.some((pattern) => pattern.test(goal)))
}

function extractExecutionSource(content: string): string {
	const primaryBody = extractSectionBody(content, EXECUTION_SECTION_HEADER_CANDIDATES)
	const proseBodies = extractProseBlocks(content)
	const proseCandidateBodies = proseBodies
		.map((body) => extractSectionBody(body, EXECUTION_SECTION_HEADER_CANDIDATES) ?? body)
		.filter(Boolean)

	const primaryStepCount = countStructuredSteps(primaryBody)
	if (primaryBody && primaryStepCount > 0 && !looksLikeWrapperExecution(primaryBody)) {
		return primaryBody
	}

	const proseCandidate = proseCandidateBodies
		.map((body) => ({ body, steps: countStructuredSteps(body) }))
		.sort((a, b) => b.steps - a.steps)[0]
	if (proseCandidate && proseCandidate.steps > primaryStepCount) {
		return proseCandidate.body
	}

	return primaryBody ?? content
}

function toItemStates(steps: ManagedWorkflowStepDefinition[]): ManagedWorkflowItemState[] {
	return steps.map((step) => ({
		id: step.id,
		label: step.goal,
		sourceText: step.goal,
		completed: false,
		stepId: step.id,
		optional: step.optional === true ? true : undefined,
		required: step.optional === true ? false : true,
		advisory: step.optional === true ? true : undefined,
	}))
}

function buildExecutionDefinition(
	sourceContent: string,
	phaseId: string,
	phaseTitle: string,
	workflow: ManagedWorkflowDefinition,
): ManagedWorkflowExecutionDefinition {
	const executionSource = extractExecutionSource(sourceContent)
	const steps = parseExecutionSteps(executionSource, phaseId, workflow)
	return steps.length > 0 ? { steps } : buildFallbackExecution(phaseId, phaseTitle)
}

async function readPhaseFile(
	absPath: string,
	relPath: string,
	workflow: ManagedWorkflowDefinition,
): Promise<ManagedWorkflowPhaseState> {
	const sourceContent = await fs.readFile(absPath, "utf8")
	const title = extractHeadingTitle(sourceContent) ?? path.basename(relPath, path.extname(relPath))
	const phaseId = path.basename(relPath, path.extname(relPath))
	const execution = buildExecutionDefinition(sourceContent, phaseId, title, workflow)
	const items = toItemStates(execution.steps)
	const checkpointText = extractCheckpointSection(sourceContent)

	if (checkpointText) {
		items.push({
			id: `${phaseId}::checkpoint`,
			label: stripMarkdown(checkpointText.split("\n")[0] || "Complete checkpoint"),
			sourceText: stripMarkdown(checkpointText),
			completed: false,
			blocked: true,
		})
	}

	return {
		id: phaseId,
		title,
		sourcePath: relPath,
		sourceContent,
		execution,
		checkpointText,
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

	if (workflow.phaseRoots.length > 0 && found.length === 0) {
		throw new Error(
			`Managed workflow "${workflow.workflowId}" is configured with explicit phase roots (${workflow.phaseRoots.join(
				", ",
			)}) but no phase markdown files were found in the current workspace. This workflow cannot fall back to "${workflow.workflowPath}" because that would ignore the authored step files. Sync or restore the .cline/skills workflow assets and try again.`,
		)
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
