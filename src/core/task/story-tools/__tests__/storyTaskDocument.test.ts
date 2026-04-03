import { expect } from "chai"
import { describe, it } from "mocha"
import {
	appendStorySectionEntry,
	buildCurrentStoryTaskPrompt,
	buildDevStoryWorkflowStartPrompt,
	completeStoryChecklistItem,
	markStoryStatusReview,
} from "../storyTaskDocument"

describe("storyTaskDocument", () => {
	it("extracts only acceptance criteria and latest review findings for workflow-start context", () => {
		const storyMarkdown = `# Story 1.0
Status: ready-for-dev

## Acceptance Criteria
- AC 1
- AC 2

## Tasks / Subtasks
- [ ] First task

## Latest Review Findings
- Fix the edge case

## Testing Requirements
- Run the tests
`

		expect(buildDevStoryWorkflowStartPrompt(storyMarkdown)).to.equal(`### WORKFLOW START CONTEXT

## Acceptance Criteria
- AC 1
- AC 2

## Latest Review Findings
- Fix the edge case`)
	})

	it("builds the first incomplete task prompt with 1-based runtime ids", () => {
		const storyMarkdown = `# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [x] Completed task
  - [x] Completed subtask
- [ ] Implement prompt injection
  - [ ] Parse the story file
  - [x] Preserve runtime-only ids
- [ ] Later task
  - [ ] Do not include this subtask
`

		const result = buildCurrentStoryTaskPrompt(storyMarkdown)

		expect(result).to.deep.equal({
			storyTaskId: "2",
			storySubtaskIds: ["1", "2"],
			promptKey: "2:1,2:- [ ] Implement prompt injection",
			promptText: `### CURRENT TASKS / SUBTASKS

storyTaskId: 2
- [ ] Implement prompt injection

storySubtaskId: 1
  - [ ] Parse the story file

storySubtaskId: 2
  - [x] Preserve runtime-only ids`,
		})
	})

	it("auto-completes the parent task after the last incomplete subtask is completed", () => {
		const storyMarkdown = `# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Implement prompt injection
  - [x] Parse the story file
  - [ ] Preserve runtime-only ids
`

		const result = completeStoryChecklistItem({
			storyMarkdown,
			storyTaskId: "1",
			storySubtaskId: "2",
		})

		expect(result).to.deep.equal({
			updatedMarkdown: `# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [x] Implement prompt injection
  - [x] Parse the story file
  - [x] Preserve runtime-only ids
`,
			manualPatch: `- [x] Implement prompt injection
  - [x] Preserve runtime-only ids`,
		})
	})

	it("rejects direct parent completion while subtasks remain unchecked", () => {
		const storyMarkdown = `# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Implement prompt injection
  - [x] Parse the story file
  - [ ] Preserve runtime-only ids
`

		const result = completeStoryChecklistItem({
			storyMarkdown,
			storyTaskId: "1",
		})

		expect(result).to.deep.equal({
			error: "Cannot complete story task 1 directly while it still has incomplete subtasks. Complete each remaining subtask first.",
		})
	})

	it("allows direct parent completion for a task with no subtasks", () => {
		const storyMarkdown = `# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Implement prompt injection
`

		const result = completeStoryChecklistItem({
			storyMarkdown,
			storyTaskId: "1",
		})

		expect(result).to.deep.equal({
			updatedMarkdown: `# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [x] Implement prompt injection
`,
			manualPatch: "- [x] Implement prompt injection",
		})
	})

	it("appends entries to completion notes and file list sections without rewriting prior content", () => {
		const storyMarkdown = `# Story 1.0
Status: ready-for-dev

## Completion Notes List
- Existing note

## File List
- src/existing.ts
`

		const notesResult = appendStorySectionEntry({
			storyMarkdown,
			sectionHeading: "## Completion Notes List",
			entry: "- Added note",
		})
		const filesResult = appendStorySectionEntry({
			storyMarkdown,
			sectionHeading: "## File List",
			entry: "- src/new-file.ts",
		})

		expect(notesResult).to.deep.equal({
			updatedMarkdown: `# Story 1.0
Status: ready-for-dev

## Completion Notes List
- Existing note

- Added note
## File List
- src/existing.ts
`,
			manualPatch: `## Completion Notes List
- Added note`,
		})
		expect(filesResult).to.deep.equal({
			updatedMarkdown: `# Story 1.0
Status: ready-for-dev

## Completion Notes List
- Existing note

## File List
- src/existing.ts

- src/new-file.ts`,
			manualPatch: `## File List
- src/new-file.ts`,
		})
	})

	it("replaces the first status line with review", () => {
		const storyMarkdown = `# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Implement prompt injection
`

		expect(markStoryStatusReview(storyMarkdown)).to.deep.equal({
			updatedMarkdown: `# Story 1.0
Status: review

## Tasks / Subtasks
- [ ] Implement prompt injection
`,
			manualPatch: "Status: review",
		})
	})

	it("returns a parse error for unsupported nested indentation deeper than one subtask level", () => {
		const storyMarkdown = `# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Implement prompt injection
  - [ ] Parse the story file
    - [ ] Unsupported nested checklist item
`

		expect(buildCurrentStoryTaskPrompt(storyMarkdown)).to.deep.equal({
			error: "Unsupported nested story checklist indentation deeper than one subtask level.",
		})
	})
})
