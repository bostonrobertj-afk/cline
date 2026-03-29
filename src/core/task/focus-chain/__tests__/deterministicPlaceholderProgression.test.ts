import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import { TaskState } from "../../TaskState"
import {
	applyDeterministicPlaceholderProgression,
	isDeterministicPlaceholderWorkflowSupported,
} from "../deterministicPlaceholderProgression"

function createTaskState(args: {
	workflowName: string
	workflowContents: string
	checklistMarkdown: string
	stablePlaceholderValues?: Record<string, string>
	placeholderValues?: Record<string, string>
}): TaskState {
	const taskState = new TaskState()
	taskState.activePlaceholderWorkflowSource = {
		type: "remote",
		name: args.workflowName,
		contents: args.workflowContents,
	}
	taskState.activePlaceholderWorkflowStableValues = args.stablePlaceholderValues
	taskState.activePlaceholderWorkflowValues = args.placeholderValues
	taskState.currentFocusChainChecklist = args.checklistMarkdown
	return taskState
}

async function writeFileWithMtime(filePath: string, text: string, mtimeMs: number): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true })
	await fs.writeFile(filePath, text, "utf8")
	const timestamp = new Date(mtimeMs)
	await fs.utimes(filePath, timestamp, timestamp)
}

describe("deterministicPlaceholderProgression", () => {
	it("supports only the prescribed deterministic placeholder workflows", () => {
		expect(isDeterministicPlaceholderWorkflowSupported("code-review.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("dev-story.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("code-review")).to.equal(false)
		expect(isDeterministicPlaceholderWorkflowSupported("dev-story")).to.equal(false)
		expect(isDeterministicPlaceholderWorkflowSupported("review-edge-case-hunter.md")).to.equal(false)
	})

	it("derives review_mode=full when fresh review input and diff artifacts exist", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step4-full-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 4: Derive Review Mode
Set review mode from the available review artifacts.`,
				checklistMarkdown: "- [ ] Step 4: Derive Review Mode",
				placeholderValues: {
					output_folder: outputFolder,
					review_input: path.join(outputFolder, "review-input.md"),
					diff_output: path.join(outputFolder, "review-input.diff"),
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(
				path.join(outputFolder, "review-input.md"),
				"# review input",
				taskState.taskStartTimeMs + 1_000,
			)
			await writeFileWithMtime(
				path.join(outputFolder, "review-input.diff"),
				"diff --git a/file b/file",
				taskState.taskStartTimeMs + 2_000,
			)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: taskState.currentFocusChainChecklist!,
			})

			expect(result.checklist).to.equal("- [x] Step 4: Derive Review Mode")
			expect(taskState.activePlaceholderWorkflowValues?.review_mode).to.equal("full")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("derives review_mode=file-scope when only fresh review input exists", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step4-file-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 4: Derive Review Mode
Set review mode from the available review artifacts.`,
				checklistMarkdown: "- [ ] Step 4: Derive Review Mode",
				placeholderValues: {
					output_folder: outputFolder,
					review_input: path.join(outputFolder, "review-input.md"),
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(
				path.join(outputFolder, "review-input.md"),
				"# review input",
				taskState.taskStartTimeMs + 1_000,
			)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: taskState.currentFocusChainChecklist!,
			})

			expect(result.checklist).to.equal("- [x] Step 4: Derive Review Mode")
			expect(taskState.activePlaceholderWorkflowValues?.review_mode).to.equal("file-scope")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("derives review_mode=diff when only fresh diff output exists", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step4-diff-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 4: Derive Review Mode
Set review mode from the available review artifacts.`,
				checklistMarkdown: "- [ ] Step 4: Derive Review Mode",
				placeholderValues: {
					output_folder: outputFolder,
					diff_output: path.join(outputFolder, "review-input.diff"),
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(
				path.join(outputFolder, "review-input.diff"),
				"diff --git a/file b/file",
				taskState.taskStartTimeMs + 1_000,
			)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: taskState.currentFocusChainChecklist!,
			})

			expect(result.checklist).to.equal("- [x] Step 4: Derive Review Mode")
			expect(taskState.activePlaceholderWorkflowValues?.review_mode).to.equal("diff")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete code-review step 2 from fallback file existence alone when review_input is missing", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step2-fallback-only-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 2: Build Review Input
Wait for review input to be prepared.`,
				checklistMarkdown: "- [ ] Step 2: Build Review Input",
				placeholderValues: {
					output_folder: outputFolder,
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(
				path.join(outputFolder, "review-input.md"),
				"# review input",
				taskState.taskStartTimeMs + 1_000,
			)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: taskState.currentFocusChainChecklist!,
			})

			expect(result.checklist).to.equal("- [ ] Step 2: Build Review Input")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete code-review step 3 from fallback file existence alone when diff_output is missing", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step3-fallback-only-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 3: Build Diff Output
Wait for diff output to be prepared.`,
				checklistMarkdown: "- [ ] Step 3: Build Diff Output",
				placeholderValues: {
					output_folder: outputFolder,
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(
				path.join(outputFolder, "review-input.diff"),
				"diff --git a/file b/file",
				taskState.taskStartTimeMs + 1_000,
			)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: taskState.currentFocusChainChecklist!,
			})

			expect(result.checklist).to.equal("- [ ] Step 3: Build Diff Output")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete code-review step 4 from fallback file existence alone without review_input or diff_output placeholders", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step4-fallback-only-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 4: Derive Review Mode
Set review mode from the available review artifacts.`,
				checklistMarkdown: "- [ ] Step 4: Derive Review Mode",
				placeholderValues: {
					output_folder: outputFolder,
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(
				path.join(outputFolder, "review-input.md"),
				"# review input",
				taskState.taskStartTimeMs + 1_000,
			)
			await writeFileWithMtime(
				path.join(outputFolder, "review-input.diff"),
				"diff --git a/file b/file",
				taskState.taskStartTimeMs + 2_000,
			)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: taskState.currentFocusChainChecklist!,
			})

			expect(result.checklist).to.equal("- [ ] Step 4: Derive Review Mode")
			expect(taskState.activePlaceholderWorkflowValues?.review_mode).to.equal(undefined)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes code-review step 6 for a fresh spec_file with Status: ready-for-dev", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step6-fresh-"))

		try {
			const specFilePath = path.join(tempDir, "spec.md")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 6: Finish Review
Wait for the spec file to reach a terminal review status.`,
				checklistMarkdown: "- [ ] Step 6: Finish Review",
				placeholderValues: {
					spec_file: specFilePath,
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(specFilePath, "Status: ready-for-dev\n", taskState.taskStartTimeMs + 1_000)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: taskState.currentFocusChainChecklist!,
			})

			expect(result.checklist).to.equal("- [x] Step 6: Finish Review")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete code-review step 6 for a stale spec_file", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step6-stale-"))

		try {
			const specFilePath = path.join(tempDir, "spec.md")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 6: Finish Review
Wait for the spec file to reach a terminal review status.`,
				checklistMarkdown: "- [ ] Step 6: Finish Review",
				placeholderValues: {
					spec_file: specFilePath,
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(specFilePath, "Status: ready-for-dev\n", taskState.taskStartTimeMs - 1_000)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: taskState.currentFocusChainChecklist!,
			})

			expect(result.checklist).to.equal("- [ ] Step 6: Finish Review")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes dev-story step 2 when the Tasks / Subtasks section has only checked items", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-dev-story-checked-"))

		try {
			const storyPath = path.join(tempDir, "story.md")
			const taskState = createTaskState({
				workflowName: "dev-story.md",
				workflowContents: `## Step 2: Finish Tasks
Wait for every story task to be checked off.`,
				checklistMarkdown: "- [ ] Step 2: Finish Tasks",
				placeholderValues: {
					story_path: storyPath,
				},
			})

			await writeFileWithMtime(
				storyPath,
				`# Story

## Tasks / Subtasks
- [x] Main task
  - [x] Nested task

## Notes
No changes needed.
`,
				Date.now(),
			)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: taskState.currentFocusChainChecklist!,
			})

			expect(result.checklist).to.equal("- [x] Step 2: Finish Tasks")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete dev-story step 2 when the Tasks / Subtasks section has an unchecked nested subtask", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-dev-story-open-"))

		try {
			const storyPath = path.join(tempDir, "story.md")
			const taskState = createTaskState({
				workflowName: "dev-story.md",
				workflowContents: `## Step 2: Finish Tasks
Wait for every story task to be checked off.`,
				checklistMarkdown: "- [ ] Step 2: Finish Tasks",
				placeholderValues: {
					story_path: storyPath,
				},
			})

			await writeFileWithMtime(
				storyPath,
				`# Story

## Tasks / Subtasks
- [x] Main task
  - [ ] Nested task
`,
				Date.now(),
			)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: taskState.currentFocusChainChecklist!,
			})

			expect(result.checklist).to.equal("- [ ] Step 2: Finish Tasks")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("ignores checklist items outside the Tasks / Subtasks section for dev-story step 2", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-dev-story-outside-"))

		try {
			const storyPath = path.join(tempDir, "story.md")
			const taskState = createTaskState({
				workflowName: "dev-story.md",
				workflowContents: `## Step 2: Finish Tasks
Wait for every story task to be checked off.`,
				checklistMarkdown: "- [ ] Step 2: Finish Tasks",
				placeholderValues: {
					story_path: storyPath,
				},
			})

			await writeFileWithMtime(
				storyPath,
				`# Story

## Tasks / Subtasks
- [x] Main task

## Later Work
- [ ] Outside checklist item
`,
				Date.now(),
			)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: taskState.currentFocusChainChecklist!,
			})

			expect(result.checklist).to.equal("- [x] Step 2: Finish Tasks")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("leaves unsupported placeholder workflows unchanged and adds no notices", async () => {
		const taskState = createTaskState({
			workflowName: "review-edge-case-hunter.md",
			workflowContents: `## Step 1: Review
Inspect the edge cases.`,
			checklistMarkdown: "- [ ] Step 1: Review",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: taskState.currentFocusChainChecklist!,
		})

		expect(result.checklist).to.equal("- [ ] Step 1: Review")
		expect(result.noticesAdded).to.equal(false)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})
})
