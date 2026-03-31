export interface BuildReviewInputExtractionArgs {
	storyMarkdown: string
	storyAbsolutePath: string
	storyRelativePaths: string[]
	diffArtifactMarkdown: string
}

export interface BuildReviewInputExtractionSuccess {
	kind: "success"
	markdown: string
	recentStoryChangesDetected: true
}

export interface BuildReviewInputExtractionNoRecentChanges {
	kind: "no_recent_story_changes"
	recentStoryChangesDetected: false
}

export type BuildReviewInputExtractionResult = BuildReviewInputExtractionSuccess | BuildReviewInputExtractionNoRecentChanges

interface SectionRange {
	start: number
	end: number
	lines: string[]
}

const MALFORMED_STORY_ERROR =
	"The provided story file does not contain the required story structure for deterministic review-input generation."
const NO_RECENT_COMPLETED_TASKS = "No recent completed tasks were identified from the story-file diff."
const NO_RECENT_COMPLETION_NOTES = "No recent completion notes were identified from the story-file diff."
const REMEDIATION_CYCLE_NOTE =
	"This QA pass is reviewing work performed during a remediation cycle. Only the remediation tasks and subtasks are shown here. These tasks and subtasks may or may not satisfy all provided acceptance criteria. Do not treat failure to fully satisfy all acceptance criteria as a defect."

function normalizeLines(markdown: string): string[] {
	return markdown.replace(/\r\n/g, "\n").split("\n")
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

function findNestedSectionWithin(parent: SectionRange | undefined, heading: string): SectionRange | undefined {
	if (!parent) {
		return undefined
	}

	const relativeStart = parent.lines.findIndex((line, index) => index > 0 && line === heading)
	if (relativeStart === -1) {
		return undefined
	}

	const start = parent.start + relativeStart
	let end = parent.end
	for (let i = start + 1; i < parent.end; i++) {
		if (/^###\s+/.test(parent.lines[i - parent.start])) {
			end = i
			break
		}
	}

	return {
		start,
		end,
		lines: parent.lines.slice(relativeStart, end - parent.start),
	}
}

function getSectionText(section: SectionRange): string {
	return section.lines.join("\n").trimEnd()
}

function hasNonWhitespaceBody(section: SectionRange | undefined): boolean {
	if (!section) {
		return false
	}

	return section.lines.slice(1).join("\n").trim().length > 0
}

function extractDiffFence(diffArtifactMarkdown: string): string | undefined {
	const lines = normalizeLines(diffArtifactMarkdown)
	const diffSection = findTopLevelSection(lines, "## Diff")
	if (!diffSection) {
		return undefined
	}

	let index = 1
	while (index < diffSection.lines.length && diffSection.lines[index].trim() === "") {
		index++
	}

	if (index >= diffSection.lines.length || !diffSection.lines[index].startsWith("```")) {
		return undefined
	}

	const fenceStart = index
	let fenceEnd = -1
	for (let i = fenceStart + 1; i < diffSection.lines.length; i++) {
		if (diffSection.lines[i].startsWith("```")) {
			fenceEnd = i
			break
		}
	}

	if (fenceEnd === -1) {
		return undefined
	}

	return diffSection.lines.slice(fenceStart + 1, fenceEnd).join("\n")
}

function findStoryDiffBlock(diffMarkdown: string, storyRelativePaths: string[]): string | undefined {
	const lines = normalizeLines(diffMarkdown)
	for (const candidate of storyRelativePaths) {
		const header = `diff --git a/${candidate} b/${candidate}`
		const start = lines.findIndex((line) => line === header)
		if (start === -1) {
			continue
		}

		let end = lines.length
		for (let i = start + 1; i < lines.length; i++) {
			if (lines[i].startsWith("diff --git ")) {
				end = i
				break
			}
		}

		return lines.slice(start, end).join("\n")
	}

	return undefined
}

function extractRecentStoryLines(storyDiffBlock: string) {
	const lines = normalizeLines(storyDiffBlock)
	const completedTasks: string[] = []
	const completionNotes: string[] = []
	let inHunk = false
	let currentTopLevelSection: string | undefined
	let currentNestedSection: string | undefined

	for (const line of lines) {
		if (line.startsWith("@@")) {
			inHunk = true
			continue
		}

		if (!inHunk || line.length === 0) {
			continue
		}

		const marker = line[0]
		if (![" ", "+", "-"].includes(marker)) {
			continue
		}

		const content = line.slice(1)

		if (/^##\s+Tasks \/ Subtasks\b/.test(content)) {
			currentTopLevelSection = "tasks"
			currentNestedSection = undefined
		} else if (/^##\s+Dev Agent Record\b/.test(content)) {
			currentTopLevelSection = "dev-agent-record"
			currentNestedSection = undefined
		} else if (/^##\s+/.test(content)) {
			currentTopLevelSection = undefined
			currentNestedSection = undefined
		} else if (currentTopLevelSection === "dev-agent-record" && /^###\s+Completion Notes List\b/.test(content)) {
			currentNestedSection = "completion-notes"
		} else if (/^###\s+/.test(content)) {
			currentNestedSection = undefined
		}

		if (marker !== "+") {
			continue
		}

		if (currentTopLevelSection === "tasks" && /^\s*-\s*\[[xX]\]\s+/.test(content)) {
			completedTasks.push(content)
		}

		if (
			currentTopLevelSection === "dev-agent-record" &&
			currentNestedSection === "completion-notes" &&
			/^\s*-\s+/.test(content)
		) {
			completionNotes.push(content)
		}
	}

	return { completedTasks, completionNotes }
}

export function buildReviewInputExtraction(args: BuildReviewInputExtractionArgs): BuildReviewInputExtractionResult {
	const storyLines = normalizeLines(args.storyMarkdown)
	const storyTitleLine = storyLines.find((line) => /^#\s+Story\b/.test(line))
	const statusLine = storyLines.find((line) => /^Status:\s*(.+)$/.test(line))
	const acceptanceCriteriaSection = findTopLevelSection(storyLines, "## Acceptance Criteria")
	if (!storyTitleLine || !statusLine || !acceptanceCriteriaSection) {
		throw new Error(MALFORMED_STORY_ERROR)
	}

	const latestReviewFindingsSection = findTopLevelSection(storyLines, "## Latest Review Findings")
	const tasksSection = findTopLevelSection(storyLines, "## Tasks / Subtasks")
	const devAgentRecordSection = findTopLevelSection(storyLines, "## Dev Agent Record")
	const completionNotesListSection = findNestedSectionWithin(devAgentRecordSection, "### Completion Notes List")
	const diffFence = extractDiffFence(args.diffArtifactMarkdown)
	if (!diffFence) {
		return { kind: "no_recent_story_changes", recentStoryChangesDetected: false }
	}

	const storyDiffBlock = findStoryDiffBlock(diffFence, args.storyRelativePaths.filter(Boolean))
	if (!storyDiffBlock) {
		return { kind: "no_recent_story_changes", recentStoryChangesDetected: false }
	}

	const { completedTasks, completionNotes } = extractRecentStoryLines(storyDiffBlock)
	const latestReviewFindingsHasContent = hasNonWhitespaceBody(latestReviewFindingsSection)

	const sections = [
		getSectionText(acceptanceCriteriaSection),
		...(latestReviewFindingsHasContent && latestReviewFindingsSection ? [getSectionText(latestReviewFindingsSection)] : []),
		[
			tasksSection?.lines[0] ?? "## Tasks / Subtasks",
			completedTasks.length > 0 ? completedTasks.join("\n") : NO_RECENT_COMPLETED_TASKS,
		].join("\n"),
		...(completionNotesListSection
			? [
					[
						"## Completion Notes",
						completionNotes.length > 0 ? completionNotes.join("\n") : NO_RECENT_COMPLETION_NOTES,
					].join("\n"),
				]
			: []),
	]

	const headerLines = [storyTitleLine, statusLine, ...(latestReviewFindingsHasContent ? [REMEDIATION_CYCLE_NOTE] : [])]

	return {
		kind: "success",
		markdown: `${headerLines.join("\n")}\n\n${sections.join("\n\n")}`.trimEnd(),
		recentStoryChangesDetected: true,
	}
}
