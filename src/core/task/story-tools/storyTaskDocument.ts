import path from "path"
import type { WorkflowValues } from "@/core/task/workflow-runtime/types"

export type StoryNotesSectionHeading = "## Completion Notes List" | "## File List"

export interface StoryTaskPromptPayload {
	storyTaskId: string
	storySubtaskIds: string[]
	promptKey: string
	promptText: string
}

interface ParsedStorySubtask {
	id: string
	lineIndex: number
	rawLine: string
}

interface ParsedStoryTask {
	id: string
	lineIndex: number
	rawLine: string
	subtasks: ParsedStorySubtask[]
}

interface ParsedTasksSection {
	lines: string[]
	tasks: ParsedStoryTask[]
}

function normalizeMarkdownLines(markdown: string): string[] {
	return markdown.replace(/\r\n/g, "\n").split("\n")
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function findTopLevelSectionRange(lines: string[], heading: string): { start: number; end: number } | undefined {
	const headingPattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`)
	const start = lines.findIndex((line) => headingPattern.test(line))

	if (start === -1) {
		return undefined
	}

	let end = lines.length
	for (let index = start + 1; index < lines.length; index += 1) {
		if (/^##\s+/.test(lines[index])) {
			end = index
			break
		}
	}

	return { start, end }
}

function extractTopLevelSection(markdown: string, heading: string): string | undefined {
	const lines = normalizeMarkdownLines(markdown)
	const range = findTopLevelSectionRange(lines, heading)

	if (!range) {
		return undefined
	}

	return lines.slice(range.start, range.end).join("\n").trimEnd()
}

function extractTopLevelSectionContent(markdown: string, heading: string): string | undefined {
	const lines = normalizeMarkdownLines(markdown)
	const range = findTopLevelSectionRange(lines, heading)

	if (!range) {
		return undefined
	}

	return lines
		.slice(range.start + 1, range.end)
		.join("\n")
		.trim()
}

function parseTasksSection(storyMarkdown: string): ParsedTasksSection | { error: string } {
	const lines = normalizeMarkdownLines(storyMarkdown)
	const range = findTopLevelSectionRange(lines, "## Tasks / Subtasks")

	if (!range) {
		return { error: "Could not find the ## Tasks / Subtasks section in the story markdown." }
	}

	const tasks: ParsedStoryTask[] = []
	let currentTask: ParsedStoryTask | undefined

	for (let index = range.start + 1; index < range.end; index += 1) {
		const line = lines[index]
		const topLevelMatch = line.match(/^- \[( |x|X)\] /)

		if (topLevelMatch) {
			currentTask = {
				id: String(tasks.length + 1),
				lineIndex: index,
				rawLine: line,
				subtasks: [],
			}
			tasks.push(currentTask)
			continue
		}

		const subtaskMatch = line.match(/^ {2}- \[( |x|X)\] /)
		if (subtaskMatch) {
			if (!currentTask) {
				return { error: "Found a story subtask before any parent task." }
			}

			currentTask.subtasks.push({
				id: String(currentTask.subtasks.length + 1),
				lineIndex: index,
				rawLine: line,
			})
			continue
		}

		if (/^\s+- \[( |x|X)\] /.test(line)) {
			return { error: "Unsupported nested story checklist indentation deeper than one subtask level." }
		}
	}

	return { lines, tasks }
}

function isIncompleteChecklistLine(line: string): boolean {
	return /\[ \]/.test(line)
}

function ensureCheckedChecklistLine(line: string): string {
	return line.replace("[ ]", "[x]")
}

export function resolveActiveStoryPath(args: {
	cwd: string
	workflowValues?: WorkflowValues
}): { ok: true; storyPath: string } | { ok: false; message: string } {
	const workflowValues = args.workflowValues ?? {}
	const storyPathValue = workflowValues.story_path

	if (typeof storyPathValue !== "string") {
		return {
			ok: false,
			message: "Could not resolve workflow value 'story_path' from the active workflow values.",
		}
	}

	const storyPathRaw = storyPathValue.trim()
	if (storyPathRaw === "") {
		return {
			ok: false,
			message: "Could not resolve workflow value 'story_path' from the active workflow values.",
		}
	}

	const workflowResolutionBase = [workflowValues.cwd, workflowValues.project_root, workflowValues["project-root"]]
		.map((value) => (typeof value === "string" ? value.trim() : ""))
		.find((value) => value !== "")
	const resolutionBase = workflowResolutionBase ?? args.cwd

	return {
		ok: true,
		storyPath: path.isAbsolute(storyPathRaw) ? storyPathRaw : path.resolve(resolutionBase, storyPathRaw),
	}
}

export function buildDevStoryWorkflowStartPrompt(storyMarkdown: string): string | undefined {
	const sections = [
		extractTopLevelSection(storyMarkdown, "## Acceptance Criteria"),
		extractTopLevelSection(storyMarkdown, "## Latest Review Findings"),
	].filter((section): section is string => Boolean(section))

	if (sections.length === 0) {
		return undefined
	}

	return `### WORKFLOW START CONTEXT\n\n${sections.join("\n\n")}`
}

export function buildCurrentStoryTaskPrompt(storyMarkdown: string): StoryTaskPromptPayload | { error: string } {
	const parsed = parseTasksSection(storyMarkdown)
	if ("error" in parsed) {
		return parsed
	}

	const firstIncompleteTask = parsed.tasks.find((task) => isIncompleteChecklistLine(task.rawLine))
	if (!firstIncompleteTask) {
		return { error: "Could not find an incomplete story task in the ## Tasks / Subtasks section." }
	}

	const promptLines = [
		"### CURRENT TASKS / SUBTASKS",
		"",
		`storyTaskId: ${firstIncompleteTask.id}`,
		firstIncompleteTask.rawLine,
	]

	for (const subtask of firstIncompleteTask.subtasks) {
		promptLines.push("", `storySubtaskId: ${subtask.id}`, subtask.rawLine)
	}

	return {
		storyTaskId: firstIncompleteTask.id,
		storySubtaskIds: firstIncompleteTask.subtasks.map((subtask) => subtask.id),
		promptKey: `${firstIncompleteTask.id}:${firstIncompleteTask.subtasks.map((subtask) => subtask.id).join(",")}:${firstIncompleteTask.rawLine}`,
		promptText: promptLines.join("\n"),
	}
}

export function buildTestingRequirementsPrompt(storyMarkdown: string): string | { error: string } {
	const content = extractTopLevelSectionContent(storyMarkdown, "## Testing Requirements")

	if (content === undefined) {
		return { error: "Could not find the ## Testing Requirements section in the story markdown." }
	}

	return `### TESTING REQUIREMENTS\n\n${content}`
}

export function completeStoryChecklistItem(args: {
	storyMarkdown: string
	storyTaskId: string
	storySubtaskId?: string
}): { updatedMarkdown: string; manualPatch: string } | { error: string } {
	if (!args.storyTaskId.trim()) {
		return { error: "storyTaskId is required." }
	}

	const parsed = parseTasksSection(args.storyMarkdown)
	if ("error" in parsed) {
		return parsed
	}

	const task = parsed.tasks.find((entry) => entry.id === args.storyTaskId)
	if (!task) {
		return { error: `Could not find story task ${args.storyTaskId}.` }
	}

	const updatedLines = [...parsed.lines]
	const manualPatchLines: string[] = []

	if (args.storySubtaskId) {
		const subtask = task.subtasks.find((entry) => entry.id === args.storySubtaskId)
		if (!subtask) {
			return { error: `Could not find story subtask ${args.storySubtaskId} under task ${args.storyTaskId}.` }
		}

		updatedLines[subtask.lineIndex] = ensureCheckedChecklistLine(updatedLines[subtask.lineIndex])

		const allSubtasksComplete = task.subtasks.every((entry) =>
			/\[(x|X)\]/.test(
				entry.lineIndex === subtask.lineIndex ? updatedLines[subtask.lineIndex] : updatedLines[entry.lineIndex],
			),
		)

		if (allSubtasksComplete && task.subtasks.length > 0) {
			updatedLines[task.lineIndex] = ensureCheckedChecklistLine(updatedLines[task.lineIndex])
			manualPatchLines.push(updatedLines[task.lineIndex])
		}

		manualPatchLines.push(updatedLines[subtask.lineIndex])
	} else {
		if (task.subtasks.length > 0) {
			const hasIncompleteSubtasks = task.subtasks.some((entry) => /\[ \]/.test(updatedLines[entry.lineIndex]))
			if (hasIncompleteSubtasks) {
				return {
					error: `Cannot complete story task ${args.storyTaskId} directly while it still has incomplete subtasks. Complete each remaining subtask first.`,
				}
			}
		}

		updatedLines[task.lineIndex] = ensureCheckedChecklistLine(updatedLines[task.lineIndex])
		manualPatchLines.push(updatedLines[task.lineIndex])
	}

	return {
		updatedMarkdown: updatedLines.join("\n"),
		manualPatch: manualPatchLines.join("\n"),
	}
}

export function appendStorySectionEntry(args: {
	storyMarkdown: string
	sectionHeading: StoryNotesSectionHeading
	entry: string
}): { updatedMarkdown: string; manualPatch: string } | { error: string } {
	const lines = normalizeMarkdownLines(args.storyMarkdown)
	const range = findTopLevelSectionRange(lines, args.sectionHeading)

	if (!range) {
		return { error: `Could not find the ${args.sectionHeading} section in the story markdown.` }
	}

	const updatedLines = [...lines]
	updatedLines.splice(range.end, 0, args.entry)

	return {
		updatedMarkdown: updatedLines.join("\n"),
		manualPatch: `${args.sectionHeading}\n${args.entry}`,
	}
}

export function markStoryStatusReview(
	storyMarkdown: string,
): { updatedMarkdown: string; manualPatch: string } | { error: string } {
	const lines = normalizeMarkdownLines(storyMarkdown)
	const statusLineIndex = lines.findIndex((line) => /^Status:/.test(line))

	if (statusLineIndex === -1) {
		return { error: "Could not find a top-level Status: line in the story markdown." }
	}

	const updatedLines = [...lines]
	updatedLines[statusLineIndex] = "Status: review"

	return {
		updatedMarkdown: updatedLines.join("\n"),
		manualPatch: "Status: review",
	}
}
