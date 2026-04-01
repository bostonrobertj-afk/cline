export interface CodeReviewSpecUpdateMergeArgs {
	specFileMarkdown: string
	reviewInputMarkdown: string
}

export interface CodeReviewSpecUpdateMergeSuccess {
	kind: "success"
	updatedSpecFileMarkdown: string
	clearedReviewInputMarkdown: ""
}

export interface CodeReviewSpecUpdateMergeFailure {
	kind: "error"
	message: string
}

export type CodeReviewSpecUpdateMergeResult = CodeReviewSpecUpdateMergeSuccess | CodeReviewSpecUpdateMergeFailure

interface SectionRange {
	start: number
	end: number
	lines: string[]
}

function normalizeLines(markdown: string): string[] {
	return markdown.replace(/\r\n/g, "\n").split("\n")
}

function toMarkdown(lines: string[]): string {
	return lines.join("\n").trimEnd()
}

function findTopLevelStatusLineIndex(lines: string[]): number {
	return lines.findIndex((line) => /^Status:\s*.+$/.test(line))
}

function findTopLevelSection(lines: string[], heading: string): SectionRange | undefined {
	const start = lines.findIndex((line) => line === heading)
	if (start === -1) {
		return undefined
	}

	let end = lines.length
	for (let i = start + 1; i < lines.length; i++) {
		if (/^##\s+/.test(lines[i])) {
			end = i
			break
		}
	}

	return {
		start,
		end,
		lines: lines.slice(start, end),
	}
}

function appendBlock(lines: string[], blockLines: string[]): string[] {
	if (lines.length === 0) {
		return [...blockLines]
	}

	const nextLines = [...lines]
	while (nextLines.length > 0 && nextLines[nextLines.length - 1] === "") {
		nextLines.pop()
	}

	if (nextLines.length > 0) {
		nextLines.push("")
	}

	return [...nextLines, ...blockLines]
}

function replaceOrInsertStatus(lines: string[], statusLine: string): string[] {
	const statusIndex = findTopLevelStatusLineIndex(lines)
	if (statusIndex !== -1) {
		const nextLines = [...lines]
		nextLines[statusIndex] = statusLine
		return nextLines
	}

	const insertIndex = lines[0]?.startsWith("# ") ? 1 : 0
	return [...lines.slice(0, insertIndex), statusLine, ...lines.slice(insertIndex)]
}

function replaceOrAppendSection(lines: string[], heading: string, replacementLines: string[]): string[] {
	const section = findTopLevelSection(lines, heading)
	if (!section) {
		return appendBlock(lines, replacementLines)
	}

	return [...lines.slice(0, section.start), ...replacementLines, ...lines.slice(section.end)]
}

function buildUpdatedTasksSection(specLines: string[], reviewLines: string[]): string[] {
	const specSection = findTopLevelSection(specLines, "## Tasks / Subtasks")
	const reviewSection = findTopLevelSection(reviewLines, "## Tasks / Subtasks")

	if (!reviewSection) {
		throw new Error("review_input.md does not contain the required ## Tasks / Subtasks section.")
	}

	const existingTaskLines = [...(specSection?.lines.slice(1) ?? [])]
	while (existingTaskLines.length > 0 && existingTaskLines[existingTaskLines.length - 1].trim().length === 0) {
		existingTaskLines.pop()
	}
	const seenLines = new Set(existingTaskLines.filter((line) => line.trim().length > 0))
	const appendedLines: string[] = []

	for (const line of reviewSection.lines.slice(1)) {
		if (line.trim().length === 0) {
			continue
		}
		if (seenLines.has(line)) {
			continue
		}
		seenLines.add(line)
		appendedLines.push(line)
	}

	if (!specSection) {
		return ["## Tasks / Subtasks", ...appendedLines]
	}

	return ["## Tasks / Subtasks", ...existingTaskLines, ...appendedLines]
}

export function codeReviewSpecUpdateMerge(args: CodeReviewSpecUpdateMergeArgs): CodeReviewSpecUpdateMergeResult {
	const reviewLines = normalizeLines(args.reviewInputMarkdown)
	const reviewStatusIndex = findTopLevelStatusLineIndex(reviewLines)
	if (reviewStatusIndex === -1) {
		return {
			kind: "error",
			message: "review_input.md does not contain the required top-level Status: line.",
		}
	}

	const reviewLatestFindingsSection = findTopLevelSection(reviewLines, "## Latest Review Findings")
	if (!reviewLatestFindingsSection) {
		return {
			kind: "error",
			message: "review_input.md does not contain the required ## Latest Review Findings section.",
		}
	}

	const reviewTasksSection = findTopLevelSection(reviewLines, "## Tasks / Subtasks")
	if (!reviewTasksSection) {
		return {
			kind: "error",
			message: "review_input.md does not contain the required ## Tasks / Subtasks section.",
		}
	}

	let updatedSpecLines = normalizeLines(args.specFileMarkdown)
	updatedSpecLines = replaceOrInsertStatus(updatedSpecLines, reviewLines[reviewStatusIndex])
	updatedSpecLines = replaceOrAppendSection(updatedSpecLines, "## Latest Review Findings", reviewLatestFindingsSection.lines)
	updatedSpecLines = replaceOrAppendSection(
		updatedSpecLines,
		"## Tasks / Subtasks",
		buildUpdatedTasksSection(updatedSpecLines, reviewLines),
	)

	return {
		kind: "success",
		updatedSpecFileMarkdown: toMarkdown(updatedSpecLines),
		clearedReviewInputMarkdown: "",
	}
}
