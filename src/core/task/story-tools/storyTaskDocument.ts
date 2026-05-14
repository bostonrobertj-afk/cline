import path from "path"
import type { WorkflowValues } from "@/core/task/workflow-runtime/types"

export interface StoryTaskPromptPayload {
	storyTaskId: string
	storySubtaskIds: string[]
	promptKey: string
	promptText: string
}

export const DEV_STORY_WORKFLOW_NAME = "dev-story"
export const DEV_STORY_TARGET_STORY_VALUE_KEY = "target_story"

export enum DevStorySectionKey {
	GeneralInstructions = "story_general_instructions",
	Objective = "story_objective",
	Scope = "story_scope",
	ScopeBoundary = "story_scope_boundary",
	Requirements = "story_requirements",
	Issues = "story_issues",
}

export interface DevStoryRequiredSections {
	[DevStorySectionKey.GeneralInstructions]: string
	[DevStorySectionKey.Objective]: string
	[DevStorySectionKey.Scope]: string
	[DevStorySectionKey.ScopeBoundary]: string
	[DevStorySectionKey.Requirements]: string
	[DevStorySectionKey.Issues]: string
}

const DEV_STORY_REQUIRED_SECTION_HEADINGS: ReadonlyArray<{ key: DevStorySectionKey; heading: string }> = [
	{ key: DevStorySectionKey.GeneralInstructions, heading: "## General Instructions" },
	{ key: DevStorySectionKey.Objective, heading: "## Objective" },
	{ key: DevStorySectionKey.Scope, heading: "## Scope" },
	{ key: DevStorySectionKey.ScopeBoundary, heading: "## Scope Boundary" },
	{ key: DevStorySectionKey.Requirements, heading: "## Requirements" },
	{ key: DevStorySectionKey.Issues, heading: "## Known Issues/ Risks/ Technical Debt" },
]

export enum DevStoryParseFailureReason {
	MissingRequiredSection = "missing_required_section",
	MissingTasksSection = "missing_tasks_section",
	EmptyTasksSection = "empty_tasks_section",
	InvalidTaskId = "invalid_task_id",
	InvalidSubtaskId = "invalid_subtask_id",
	OrphanSubtask = "orphan_subtask",
	UnsupportedNestedChecklist = "unsupported_nested_checklist",
}

export type DevStoryParseFailure =
	| {
			ok: false
			reason: DevStoryParseFailureReason.MissingRequiredSection
			message: string
			missingHeading: string
	  }
	| {
			ok: false
			reason: DevStoryParseFailureReason.MissingTasksSection | DevStoryParseFailureReason.EmptyTasksSection
			message: string
	  }
	| {
			ok: false
			reason:
				| DevStoryParseFailureReason.InvalidTaskId
				| DevStoryParseFailureReason.InvalidSubtaskId
				| DevStoryParseFailureReason.OrphanSubtask
				| DevStoryParseFailureReason.UnsupportedNestedChecklist
			message: string
			invalidRawLine: string
	  }

export interface ParsedStorySubtask {
	id: string
	lineIndex: number
	rawLine: string
	completed: boolean
	allowedFiles: StoryTaskAllowedFileEntry[]
}

export interface ParsedStoryTask {
	id: string
	lineIndex: number
	rawLine: string
	completed: boolean
	allowedFiles: StoryTaskAllowedFileEntry[]
	subtasks: ParsedStorySubtask[]
}

export interface ParsedTasksSection {
	lines: string[]
	tasks: ParsedStoryTask[]
}

type ParseTasksSectionResult = { ok: true; parsed: ParsedTasksSection } | DevStoryParseFailure

export interface ParsedDevStoryDocument {
	sections: DevStoryRequiredSections
	lines: string[]
	tasks: ParsedStoryTask[]
}

export type DevStoryDocumentParseResult = { ok: true; document: ParsedDevStoryDocument } | DevStoryParseFailure

export interface StoryTaskAllowedFileEntry {
	path: string
	rawLine: string
	lineIndex: number
	ownerId: string
	ownerKind: "task" | "subtask"
}

export interface StorySubtaskDetail {
	subtaskId: string
	rawSubtaskLine: string
	completed: boolean
	allowedFiles: StoryTaskAllowedFileEntry[]
}

export interface StoryTaskDetail {
	taskId: string
	rawTaskLine: string
	completed: boolean
	allowedFiles: StoryTaskAllowedFileEntry[]
	subtasks: StorySubtaskDetail[]
}

export interface IncompleteStoryTaskSummary {
	taskId: string
	incompleteSubtaskIds: string[]
}

export type StoryCompletionProgress =
	| {
			completedStoryItemId: string
			completedItemKind: "task"
			parentTaskComplete: boolean
			allStoryTasksComplete: boolean
	  }
	| {
			completedStoryItemId: string
			completedItemKind: "subtask"
			parentTaskId: string
			parentTaskComplete: boolean
			allStoryTasksComplete: boolean
	  }

export type CompleteStoryChecklistItemResult =
	| {
			updatedMarkdown: string
			manualPatch: string
			progress: StoryCompletionProgress
	  }
	| { error: string }

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

function trimBoundaryBlankLines(lines: string[]): string[] {
	let start = 0
	let end = lines.length

	while (start < end && lines[start].trim() === "") {
		start += 1
	}

	while (end > start && lines[end - 1].trim() === "") {
		end -= 1
	}

	return lines.slice(start, end)
}

function extractTopLevelSectionRawContentFromLines(
	lines: string[],
	heading: string,
): { ok: true; content: string } | { ok: false; heading: string } {
	const range = findTopLevelSectionRange(lines, heading)

	if (!range) {
		return { ok: false, heading }
	}

	return {
		ok: true,
		content: trimBoundaryBlankLines(lines.slice(range.start + 1, range.end)).join("\n"),
	}
}

export function parseDevStoryRequiredSections(
	storyMarkdown: string,
): { ok: true; sections: DevStoryRequiredSections } | DevStoryParseFailure {
	const lines = normalizeMarkdownLines(storyMarkdown)
	const sections: Partial<DevStoryRequiredSections> = {}

	for (const requiredSection of DEV_STORY_REQUIRED_SECTION_HEADINGS) {
		const result = extractTopLevelSectionRawContentFromLines(lines, requiredSection.heading)
		if (!result.ok) {
			return {
				ok: false,
				reason: DevStoryParseFailureReason.MissingRequiredSection,
				message: `Could not find required story section ${result.heading}.`,
				missingHeading: result.heading,
			}
		}
		sections[requiredSection.key] = result.content
	}

	return {
		ok: true,
		sections: {
			[DevStorySectionKey.GeneralInstructions]: sections[DevStorySectionKey.GeneralInstructions] ?? "",
			[DevStorySectionKey.Objective]: sections[DevStorySectionKey.Objective] ?? "",
			[DevStorySectionKey.Scope]: sections[DevStorySectionKey.Scope] ?? "",
			[DevStorySectionKey.ScopeBoundary]: sections[DevStorySectionKey.ScopeBoundary] ?? "",
			[DevStorySectionKey.Requirements]: sections[DevStorySectionKey.Requirements] ?? "",
			[DevStorySectionKey.Issues]: sections[DevStorySectionKey.Issues] ?? "",
		},
	}
}

function parseChecklistCompletion(match: RegExpMatchArray): boolean {
	return match[1].toLowerCase() === "x"
}

function parseExplicitStoryItemId(rawLine: string, kind: "task" | "subtask"): string | undefined {
	const checklistPrefix = kind === "task" ? /^- \[( |x|X)\]\s+/ : /^ {2}- \[( |x|X)\]\s+/
	const text = rawLine.replace(checklistPrefix, "")
	const label = kind === "task" ? "Task" : "Subtask"
	const labeledPattern = new RegExp(`^${label}\\s+([0-9]+(?:\\.[0-9]+)*)\\b`, "i")
	const labeledMatch = text.match(labeledPattern)

	if (labeledMatch) {
		return labeledMatch[1]
	}

	const bareMatch = text.match(/^([0-9]+(?:\.[0-9]+)*)\b/)
	return bareMatch ? bareMatch[1] : undefined
}

function parseAllowedFileEntry(args: {
	line: string
	lineIndex: number
	owner: ParsedStoryTask | ParsedStorySubtask
	ownerKind: "task" | "subtask"
}): StoryTaskAllowedFileEntry | undefined {
	const match = args.line.match(/^\s*-\s+(.+?)\s*$/)
	if (!match) {
		return undefined
	}

	const pathValue = match[1]
		.trim()
		.replace(/^`(.+)`$/, "$1")
		.replace(/^"(.+)"$/, "$1")
	if (pathValue === "") {
		return undefined
	}

	return {
		path: pathValue,
		rawLine: args.line,
		lineIndex: args.lineIndex,
		ownerId: args.owner.id,
		ownerKind: args.ownerKind,
	}
}

function parseTasksSection(storyMarkdown: string): ParseTasksSectionResult {
	const lines = normalizeMarkdownLines(storyMarkdown)
	const range = findTopLevelSectionRange(lines, "## Tasks")

	if (!range) {
		return {
			ok: false,
			reason: DevStoryParseFailureReason.MissingTasksSection,
			message: "Could not find the ## Tasks section in the story markdown.",
		}
	}

	const tasks: ParsedStoryTask[] = []
	let currentTask: ParsedStoryTask | undefined
	let currentSubtask: ParsedStorySubtask | undefined
	let allowedFileOwner: { kind: "task"; item: ParsedStoryTask } | { kind: "subtask"; item: ParsedStorySubtask } | undefined

	for (let index = range.start + 1; index < range.end; index += 1) {
		const line = lines[index]
		const topLevelMatch = line.match(/^- \[( |x|X)\] /)

		if (topLevelMatch) {
			const id = parseExplicitStoryItemId(line, "task")
			if (!id) {
				return {
					ok: false,
					reason: DevStoryParseFailureReason.InvalidTaskId,
					message: `Could not parse an explicit task ID from story task line: ${line}`,
					invalidRawLine: line,
				}
			}
			currentTask = {
				id,
				lineIndex: index,
				rawLine: line,
				completed: parseChecklistCompletion(topLevelMatch),
				allowedFiles: [],
				subtasks: [],
			}
			currentSubtask = undefined
			allowedFileOwner = undefined
			tasks.push(currentTask)
			continue
		}

		const subtaskMatch = line.match(/^ {2}- \[( |x|X)\] /)
		if (subtaskMatch) {
			if (!currentTask) {
				return {
					ok: false,
					reason: DevStoryParseFailureReason.OrphanSubtask,
					message: "Found a story subtask before any parent task.",
					invalidRawLine: line,
				}
			}

			const id = parseExplicitStoryItemId(line, "subtask")
			if (!id) {
				return {
					ok: false,
					reason: DevStoryParseFailureReason.InvalidSubtaskId,
					message: `Could not parse an explicit subtask ID from story subtask line: ${line}`,
					invalidRawLine: line,
				}
			}

			currentSubtask = {
				id,
				lineIndex: index,
				rawLine: line,
				completed: parseChecklistCompletion(subtaskMatch),
				allowedFiles: [],
			}
			allowedFileOwner = undefined
			currentTask.subtasks.push(currentSubtask)
			continue
		}

		if (/^\s+- \[( |x|X)\] /.test(line)) {
			return {
				ok: false,
				reason: DevStoryParseFailureReason.UnsupportedNestedChecklist,
				message: "Unsupported nested story checklist indentation deeper than one subtask level.",
				invalidRawLine: line,
			}
		}

		if (/^\s*Allowed files:\s*$/i.test(line)) {
			if (currentSubtask) {
				allowedFileOwner = { kind: "subtask", item: currentSubtask }
			} else if (currentTask) {
				allowedFileOwner = { kind: "task", item: currentTask }
			}
			continue
		}

		if (allowedFileOwner) {
			const allowedFileEntry = parseAllowedFileEntry({
				line,
				lineIndex: index,
				owner: allowedFileOwner.item,
				ownerKind: allowedFileOwner.kind,
			})
			if (allowedFileEntry) {
				allowedFileOwner.item.allowedFiles.push(allowedFileEntry)
				continue
			}

			if (line.trim() !== "") {
				allowedFileOwner = undefined
			}
		}
	}

	if (tasks.length === 0) {
		return {
			ok: false,
			reason: DevStoryParseFailureReason.EmptyTasksSection,
			message: "The ## Tasks section is empty or contains no parseable story tasks.",
		}
	}

	return { ok: true, parsed: { lines, tasks } }
}

function isIncompleteChecklistLine(line: string): boolean {
	return /\[ \]/.test(line)
}

function isCheckedChecklistLine(line: string): boolean {
	return /\[(x|X)\]/.test(line)
}

function isStoryTaskIncomplete(task: ParsedStoryTask): boolean {
	if (!task.completed) {
		return true
	}

	return task.subtasks.some((subtask) => !subtask.completed)
}

function toStoryTaskDetail(task: ParsedStoryTask): StoryTaskDetail {
	return {
		taskId: task.id,
		rawTaskLine: task.rawLine,
		completed: task.completed,
		allowedFiles: [...task.allowedFiles],
		subtasks: task.subtasks.map((subtask) => ({
			subtaskId: subtask.id,
			rawSubtaskLine: subtask.rawLine,
			completed: subtask.completed,
			allowedFiles: [...subtask.allowedFiles],
		})),
	}
}

export function parseDevStoryDocument(storyMarkdown: string): DevStoryDocumentParseResult {
	const sections = parseDevStoryRequiredSections(storyMarkdown)
	if (!sections.ok) {
		return sections
	}

	const tasks = parseTasksSection(storyMarkdown)
	if (!tasks.ok) {
		return tasks
	}

	return {
		ok: true,
		document: {
			sections: sections.sections,
			lines: tasks.parsed.lines,
			tasks: tasks.parsed.tasks,
		},
	}
}

export function parseDevStoryTasks(storyMarkdown: string): { ok: true; parsed: ParsedTasksSection } | DevStoryParseFailure {
	return parseTasksSection(storyMarkdown)
}

export function getFirstIncompleteStoryTaskDetail(document: ParsedDevStoryDocument): StoryTaskDetail | undefined {
	const task = document.tasks.find((entry) => isStoryTaskIncomplete(entry))
	return task ? toStoryTaskDetail(task) : undefined
}

export function getStoryTaskDetailById(document: ParsedDevStoryDocument, taskId: string): StoryTaskDetail | undefined {
	const normalizedTaskId = taskId.trim()
	const task = document.tasks.find((entry) => entry.id === normalizedTaskId)
	return task ? toStoryTaskDetail(task) : undefined
}

export function getIncompleteStoryTaskSummaries(document: ParsedDevStoryDocument): IncompleteStoryTaskSummary[] {
	return document.tasks
		.map((task) => ({
			taskId: task.id,
			incompleteSubtaskIds: task.subtasks.filter((subtask) => !subtask.completed).map((subtask) => subtask.id),
			taskIncomplete: !task.completed,
		}))
		.filter((summary) => summary.taskIncomplete || summary.incompleteSubtaskIds.length > 0)
		.map((summary) => ({
			taskId: summary.taskId,
			incompleteSubtaskIds: summary.incompleteSubtaskIds,
		}))
}

export function areAllStoryTasksComplete(document: ParsedDevStoryDocument): boolean {
	return document.tasks.every((task) => task.completed && task.subtasks.every((subtask) => subtask.completed))
}

export function getAllowedFileEntriesForCompletedStory(document: ParsedDevStoryDocument): StoryTaskAllowedFileEntry[] {
	return document.tasks.flatMap((task) => [...task.allowedFiles, ...task.subtasks.flatMap((subtask) => subtask.allowedFiles)])
}

export function formatStoryTaskDetail(detail: StoryTaskDetail): string {
	const promptLines = ["### CURRENT STORY TASK", "", `storyTaskId: ${detail.taskId}`, detail.rawTaskLine]

	for (const subtask of detail.subtasks) {
		promptLines.push("", `storySubtaskId: ${subtask.subtaskId}`, subtask.rawSubtaskLine)
	}

	return promptLines.join("\n")
}

function ensureCheckedChecklistLine(line: string): string {
	return line.replace("[ ]", "[x]")
}

export function resolveActiveStoryPath(args: {
	cwd: string
	workflowValues?: WorkflowValues
}): { ok: true; storyPath: string } | { ok: false; message: string } {
	const workflowValues = args.workflowValues ?? {}
	const storyPathValue = workflowValues[DEV_STORY_TARGET_STORY_VALUE_KEY]

	if (typeof storyPathValue !== "string") {
		return {
			ok: false,
			message: "Could not resolve workflow value 'target_story' from the active workflow values.",
		}
	}

	const storyPathRaw = storyPathValue.trim()
	if (storyPathRaw === "") {
		return {
			ok: false,
			message: "Could not resolve workflow value 'target_story' from the active workflow values.",
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
	if (!parsed.ok) {
		return { error: parsed.message }
	}

	const document: ParsedDevStoryDocument = {
		sections: {
			[DevStorySectionKey.GeneralInstructions]: "",
			[DevStorySectionKey.Objective]: "",
			[DevStorySectionKey.Scope]: "",
			[DevStorySectionKey.ScopeBoundary]: "",
			[DevStorySectionKey.Requirements]: "",
			[DevStorySectionKey.Issues]: "",
		},
		lines: parsed.parsed.lines,
		tasks: parsed.parsed.tasks,
	}
	const detail = getFirstIncompleteStoryTaskDetail(document)
	if (!detail) {
		return { error: "Could not find an incomplete story task in the ## Tasks section." }
	}

	return {
		storyTaskId: detail.taskId,
		storySubtaskIds: detail.subtasks.map((subtask) => subtask.subtaskId),
		promptKey: `${detail.taskId}:${detail.subtasks.map((subtask) => subtask.subtaskId).join(",")}:${detail.rawTaskLine}`,
		promptText: formatStoryTaskDetail(detail),
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
	storyItemId: string
}): CompleteStoryChecklistItemResult {
	const storyItemId = args.storyItemId.trim()
	if (storyItemId === "") {
		return { error: "storyItemId is required." }
	}

	const parsed = parseTasksSection(args.storyMarkdown)
	if (!parsed.ok) {
		return { error: parsed.message }
	}

	const task = parsed.parsed.tasks.find((entry) => entry.id === storyItemId)
	const subtaskMatch = parsed.parsed.tasks
		.map((parentTask) => ({
			parentTask,
			subtask: parentTask.subtasks.find((entry) => entry.id === storyItemId),
		}))
		.find((entry): entry is { parentTask: ParsedStoryTask; subtask: ParsedStorySubtask } => entry.subtask !== undefined)

	const updatedLines = [...parsed.parsed.lines]
	const manualPatchLines: string[] = []

	if (subtaskMatch) {
		const task = subtaskMatch.parentTask
		const subtask = subtaskMatch.subtask

		updatedLines[subtask.lineIndex] = ensureCheckedChecklistLine(updatedLines[subtask.lineIndex])

		const allSubtasksComplete = task.subtasks.every((entry) => isCheckedChecklistLine(updatedLines[entry.lineIndex]))

		if (allSubtasksComplete && task.subtasks.length > 0) {
			updatedLines[task.lineIndex] = ensureCheckedChecklistLine(updatedLines[task.lineIndex])
			manualPatchLines.push(updatedLines[task.lineIndex])
		}

		manualPatchLines.push(updatedLines[subtask.lineIndex])
		return {
			updatedMarkdown: updatedLines.join("\n"),
			manualPatch: manualPatchLines.join("\n"),
			progress: {
				completedStoryItemId: storyItemId,
				completedItemKind: "subtask",
				parentTaskId: task.id,
				parentTaskComplete: isCheckedChecklistLine(updatedLines[task.lineIndex]),
				allStoryTasksComplete: parsed.parsed.tasks.every(
					(entry) =>
						isCheckedChecklistLine(updatedLines[entry.lineIndex]) &&
						entry.subtasks.every((nestedEntry) => isCheckedChecklistLine(updatedLines[nestedEntry.lineIndex])),
				),
			},
		}
	}

	if (task) {
		if (task.subtasks.length > 0) {
			const hasIncompleteSubtasks = task.subtasks.some((entry) => isIncompleteChecklistLine(updatedLines[entry.lineIndex]))
			if (hasIncompleteSubtasks) {
				return {
					error: `Cannot complete story task ${storyItemId} directly while it still has incomplete subtasks. Complete each remaining subtask first.`,
				}
			}
		}

		updatedLines[task.lineIndex] = ensureCheckedChecklistLine(updatedLines[task.lineIndex])
		manualPatchLines.push(updatedLines[task.lineIndex])

		return {
			updatedMarkdown: updatedLines.join("\n"),
			manualPatch: manualPatchLines.join("\n"),
			progress: {
				completedStoryItemId: storyItemId,
				completedItemKind: "task",
				parentTaskComplete: isCheckedChecklistLine(updatedLines[task.lineIndex]),
				allStoryTasksComplete: parsed.parsed.tasks.every(
					(entry) =>
						isCheckedChecklistLine(updatedLines[entry.lineIndex]) &&
						entry.subtasks.every((nestedEntry) => isCheckedChecklistLine(updatedLines[nestedEntry.lineIndex])),
				),
			},
		}
	}

	return { error: `Could not find story task or subtask ${storyItemId}.` }
}
