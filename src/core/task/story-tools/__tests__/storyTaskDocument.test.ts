import { expect } from "chai"
import { describe, it } from "mocha"
import {
	areAllStoryTasksComplete,
	buildCurrentStoryTaskPrompt,
	completeStoryChecklistItem,
	DevStoryParseFailureReason,
	DevStorySectionKey,
	formatStoryTaskDetail,
	getAllowedFileEntriesForCompletedStory,
	getFirstIncompleteStoryTaskDetail,
	getIncompleteStoryTaskSummaries,
	getStoryTaskDetailById,
	parseDevStoryDocument,
	parseDevStoryRequiredSections,
	parseDevStoryTasks,
} from "../storyTaskDocument"

const storyFrontmatter = `# Story 1.2
Status: ready-for-dev

## General Instructions
Follow the repo plan.
Keep edits scoped.

## Objective
Implement the parser.

## Scope
- Runtime parser
- Tool helpers

## Scope Boundary
- Do not edit workflow source.

## Requirements
- Preserve raw task lines.

## Known Issues/ Risks/ Technical Debt
- Existing legacy handlers remain until Phase 2.
`

function buildStoryMarkdown(tasks: string): string {
	return `${storyFrontmatter}
${tasks}`
}

describe("storyTaskDocument", () => {
	it("extracts required dev-story sections as raw content strings", () => {
		const result = parseDevStoryRequiredSections(
			buildStoryMarkdown(`## Tasks
- [ ] Task 1. Implement parser
`),
		)

		expect(result.ok).to.equal(true)
		if (!result.ok) {
			throw new Error(result.message)
		}

		expect(result.sections).to.deep.equal({
			[DevStorySectionKey.GeneralInstructions]: "Follow the repo plan.\nKeep edits scoped.",
			[DevStorySectionKey.Objective]: "Implement the parser.",
			[DevStorySectionKey.Scope]: "- Runtime parser\n- Tool helpers",
			[DevStorySectionKey.ScopeBoundary]: "- Do not edit workflow source.",
			[DevStorySectionKey.Requirements]: "- Preserve raw task lines.",
			[DevStorySectionKey.Issues]: "- Existing legacy handlers remain until Phase 2.",
		})
	})

	it("parses only ## Tasks and preserves explicit IDs, raw lines, completion state, and allowed files", () => {
		const result = parseDevStoryDocument(
			buildStoryMarkdown(`## Tasks / Subtasks
- [ ] Task 9. Legacy heading must not be parsed

## Tasks
- [x] Task 1. Build parser
  Allowed files:
  - \`src/core/task/story-tools/storyTaskDocument.ts\`
  - [x] Subtask 1.1. Read only tasks
    Allowed files:
    - \`src/core/task/story-tools/storyTaskDocument.ts\`
  - [ ] Subtask 1.2. Preserve raw subtask line
    Allowed files:
    - "src/core/task/story-tools/__tests__/storyTaskDocument.test.ts"
- [ ] Task 2. Add handlers
  - [ ] Subtask 2.1. Use target_story
`),
		)

		expect(result.ok).to.equal(true)
		if (!result.ok) {
			throw new Error(result.message)
		}

		expect(result.document.tasks).to.have.length(2)
		expect(result.document.tasks[0]).to.deep.include({
			id: "1",
			rawLine: "- [x] Task 1. Build parser",
			completed: true,
		})
		expect(result.document.tasks[0].subtasks[0]).to.deep.include({
			id: "1.1",
			rawLine: "  - [x] Subtask 1.1. Read only tasks",
			completed: true,
		})
		expect(result.document.tasks[0].subtasks[1]).to.deep.include({
			id: "1.2",
			rawLine: "  - [ ] Subtask 1.2. Preserve raw subtask line",
			completed: false,
		})
		expect(result.document.tasks[0].allowedFiles.map((entry) => entry.path)).to.deep.equal([
			"src/core/task/story-tools/storyTaskDocument.ts",
		])
		expect(result.document.tasks[0].subtasks[1].allowedFiles.map((entry) => entry.path)).to.deep.equal([
			"src/core/task/story-tools/__tests__/storyTaskDocument.test.ts",
		])
	})

	it("returns a typed parser failure with the invalid raw task line when an explicit task ID is missing", () => {
		const result = parseDevStoryTasks(`## Tasks
- [ ] Implement parser without an ID
`)

		expect(result.ok).to.equal(false)
		if (result.ok) {
			throw new Error("Expected parser failure.")
		}

		expect(result.reason).to.equal(DevStoryParseFailureReason.InvalidTaskId)
		if (result.reason !== DevStoryParseFailureReason.InvalidTaskId) {
			throw new Error(`Expected ${DevStoryParseFailureReason.InvalidTaskId}.`)
		}
		expect(result.invalidRawLine).to.equal("- [ ] Implement parser without an ID")
	})

	it("returns a typed parser failure with the invalid raw subtask line when an explicit subtask ID is missing", () => {
		const result = parseDevStoryTasks(`## Tasks
- [ ] Task 1. Implement parser
  - [ ] Missing subtask ID
`)

		expect(result.ok).to.equal(false)
		if (result.ok) {
			throw new Error("Expected parser failure.")
		}

		expect(result.reason).to.equal(DevStoryParseFailureReason.InvalidSubtaskId)
		if (result.reason !== DevStoryParseFailureReason.InvalidSubtaskId) {
			throw new Error(`Expected ${DevStoryParseFailureReason.InvalidSubtaskId}.`)
		}
		expect(result.invalidRawLine).to.equal("  - [ ] Missing subtask ID")
	})

	it("returns the first incomplete task detail and formats the same raw task and subtask lines", () => {
		const storyMarkdown = buildStoryMarkdown(`## Tasks
- [x] Task 1. Completed parser setup
  - [x] Subtask 1.1. Already done
- [ ] Task 2. Implement handlers
  - [ ] Subtask 2.1. Use target_story
  - [x] Subtask 2.2. Preserve completed subtasks
`)
		const parsed = parseDevStoryDocument(storyMarkdown)

		expect(parsed.ok).to.equal(true)
		if (!parsed.ok) {
			throw new Error(parsed.message)
		}

		const detail = getFirstIncompleteStoryTaskDetail(parsed.document)
		expect(detail).to.deep.include({
			taskId: "2",
			rawTaskLine: "- [ ] Task 2. Implement handlers",
			completed: false,
		})
		if (detail === undefined) {
			throw new Error("Expected first incomplete task detail.")
		}

		expect(formatStoryTaskDetail(detail)).to.equal(`### CURRENT STORY TASK

storyTaskId: 2
- [ ] Task 2. Implement handlers

storySubtaskId: 2.1
  - [ ] Subtask 2.1. Use target_story

storySubtaskId: 2.2
  - [x] Subtask 2.2. Preserve completed subtasks`)
		expect(buildCurrentStoryTaskPrompt(storyMarkdown)).to.deep.equal({
			storyTaskId: "2",
			storySubtaskIds: ["2.1", "2.2"],
			promptKey: "2:2.1,2.2:- [ ] Task 2. Implement handlers",
			promptText: formatStoryTaskDetail(detail),
		})
	})

	it("returns task detail by task ID for complete and incomplete tasks", () => {
		const parsed = parseDevStoryDocument(
			buildStoryMarkdown(`## Tasks
- [x] Task 1. Completed parser setup
  - [x] Subtask 1.1. Already done
- [ ] Task 2. Implement handlers
  - [ ] Subtask 2.1. Use target_story
`),
		)

		expect(parsed.ok).to.equal(true)
		if (!parsed.ok) {
			throw new Error(parsed.message)
		}

		expect(getStoryTaskDetailById(parsed.document, "1")).to.deep.include({
			taskId: "1",
			rawTaskLine: "- [x] Task 1. Completed parser setup",
			completed: true,
		})
		expect(getStoryTaskDetailById(parsed.document, "2")).to.deep.include({
			taskId: "2",
			rawTaskLine: "- [ ] Task 2. Implement handlers",
			completed: false,
		})
		expect(getStoryTaskDetailById(parsed.document, "3")).to.equal(undefined)
	})

	it("returns incomplete summaries, all-complete status, and allowed-file entries", () => {
		const parsed = parseDevStoryDocument(
			buildStoryMarkdown(`## Tasks
- [x] Task 1. Completed parser setup
  - [x] Subtask 1.1. Already done
    Allowed files:
    - \`src/completed.ts\`
- [ ] Task 2. Implement handlers
  - [x] Subtask 2.1. Use target_story
  - [ ] Subtask 2.2. Return progress metadata
    Allowed files:
    - \`src/incomplete.ts\`
- [ ] Task 3. Direct task
  Allowed files:
  - \`src/task-only.ts\`
`),
		)

		expect(parsed.ok).to.equal(true)
		if (!parsed.ok) {
			throw new Error(parsed.message)
		}

		expect(getIncompleteStoryTaskSummaries(parsed.document)).to.deep.equal([
			{ taskId: "2", incompleteSubtaskIds: ["2.2"] },
			{ taskId: "3", incompleteSubtaskIds: [] },
		])
		expect(areAllStoryTasksComplete(parsed.document)).to.equal(false)
		expect(getAllowedFileEntriesForCompletedStory(parsed.document).map((entry) => entry.path)).to.deep.equal([
			"src/completed.ts",
			"src/incomplete.ts",
			"src/task-only.ts",
		])
	})

	it("reports all-complete status and completion metadata after story item updates", () => {
		const storyMarkdown = buildStoryMarkdown(`## Tasks
- [ ] Task 1. Finish parser
  - [x] Subtask 1.1. Existing work
  - [ ] Subtask 1.2. Final work
`)

		const result = completeStoryChecklistItem({
			storyMarkdown,
			storyItemId: "1.2",
		})

		expect(result).to.deep.equal({
			updatedMarkdown: buildStoryMarkdown(`## Tasks
- [x] Task 1. Finish parser
  - [x] Subtask 1.1. Existing work
  - [x] Subtask 1.2. Final work
`),
			manualPatch: `- [x] Task 1. Finish parser
  - [x] Subtask 1.2. Final work`,
			progress: {
				completedStoryItemId: "1.2",
				completedItemKind: "subtask",
				parentTaskId: "1",
				parentTaskComplete: true,
				allStoryTasksComplete: true,
			},
		})
	})
})
