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

function recordTaskWriteProof(taskState: TaskState, filePath: string): void {
	taskState.activePlaceholderWorkflowTaskWriteProofPaths.push(path.resolve(filePath))
}

function getChecklistMarkdown(taskState: TaskState): string {
	const checklistMarkdown = taskState.currentFocusChainChecklist
	if (!checklistMarkdown) {
		throw new Error("Expected currentFocusChainChecklist to be set for this test")
	}
	return checklistMarkdown
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
		expect(isDeterministicPlaceholderWorkflowSupported("review-adversarial-general.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("blind-review.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("code-review")).to.equal(false)
		expect(isDeterministicPlaceholderWorkflowSupported("dev-story")).to.equal(false)
		expect(isDeterministicPlaceholderWorkflowSupported("review-edge-case-hunter.md")).to.equal(false)
	})

	it("completes review-adversarial-general step 1 when diff_output resolves to an existing file", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step1-file-"))

		try {
			const diffOutputPath = path.join(tempDir, "review-input.diff")
			const taskState = createTaskState({
				workflowName: "review-adversarial-general.md",
				workflowContents: `## Step 1: Receive content and determine review scope
Use {diff_output} when it is already available.

## Step 2: Perform adversarial analysis
Review the provided material.`,
				checklistMarkdown:
					"- [ ] Step 1: Receive content and determine review scope\n- [ ] Step 2: Perform adversarial analysis",
				placeholderValues: {
					diff_output: diffOutputPath,
				},
			})

			await writeFileWithMtime(diffOutputPath, "diff --git a/file b/file", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [x] Step 1: Receive content and determine review scope\n- [ ] Step 2: Perform adversarial analysis",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"diff_output resolves to an existing file path.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete review-adversarial-general step 1 when only review_input exists", async () => {
		const taskState = createTaskState({
			workflowName: "review-adversarial-general.md",
			workflowContents: `## Step 1: Receive content and determine review scope
Wait for the diff output to be provided.`,
			checklistMarkdown: "- [ ] Step 1: Receive content and determine review scope",
			placeholderValues: {
				review_input: "/tmp/review-input.md",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal("- [ ] Step 1: Receive content and determine review scope")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("does not complete review-adversarial-general step 1 when diff_output is missing", async () => {
		const taskState = createTaskState({
			workflowName: "review-adversarial-general.md",
			workflowContents: `## Step 1: Receive content and determine review scope
Wait for the diff output to be provided.`,
			checklistMarkdown: "- [ ] Step 1: Receive content and determine review scope",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal("- [ ] Step 1: Receive content and determine review scope")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("does not complete review-adversarial-general step 1 when diff_output points to a missing file", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step1-missing-"))

		try {
			const taskState = createTaskState({
				workflowName: "review-adversarial-general.md",
				workflowContents: `## Step 1: Receive content and determine review scope
Wait for the diff output to be provided.`,
				checklistMarkdown: "- [ ] Step 1: Receive content and determine review scope",
				placeholderValues: {
					diff_output: path.join(tempDir, "missing.diff"),
				},
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 1: Receive content and determine review scope")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes review-adversarial-general step 1 from stable relative diff_output when resolution succeeds", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step1-relative-"))
		const foreignCwd = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step1-foreign-cwd-"))
		const originalCwd = process.cwd()

		try {
			const outputFolder = path.join(tempDir, "output")
			const diffOutputPath = path.join(outputFolder, "review-input.diff")
			const taskState = createTaskState({
				workflowName: "review-adversarial-general.md",
				workflowContents: `## Step 1: Receive content and determine review scope
Use {diff_output} when it is already available.
`,
				checklistMarkdown: "- [ ] Step 1: Receive content and determine review scope",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
					diff_output: path.join("output", "review-input.diff"),
				},
			})

			await writeFileWithMtime(diffOutputPath, "diff --git a/file b/file", Date.now())
			process.chdir(foreignCwd)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 1: Receive content and determine review scope")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"diff_output resolves to an existing file path.",
			)
		} finally {
			process.chdir(originalCwd)
			await fs.rm(tempDir, { recursive: true, force: true })
			await fs.rm(foreignCwd, { recursive: true, force: true })
		}
	})

	it("completes review-adversarial-general step 2 when the findings artifact exists with a current-task write proof", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step2-file-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const findingsPath = path.join(outputFolder, "adversarial-review-findings.md")
			const taskState = createTaskState({
				workflowName: "review-adversarial-general.md",
				workflowContents: `## Step 2: Perform adversarial analysis
Persist the review findings artifact.

## Step 3: Present findings
Deliver the findings.`,
				checklistMarkdown: "- [ ] Step 2: Perform adversarial analysis\n- [ ] Step 3: Present findings",
				placeholderValues: {
					output_folder: outputFolder,
				},
			})

			await writeFileWithMtime(findingsPath, "# Findings\n", Date.now())
			recordTaskWriteProof(taskState, findingsPath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 2: Perform adversarial analysis\n- [ ] Step 3: Present findings")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"adversarial-review-findings.md was written during this task and the artifact still exists.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete review-adversarial-general step 2 when the findings artifact exists without a write proof", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step2-missing-proof-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const findingsPath = path.join(outputFolder, "adversarial-review-findings.md")
			const taskState = createTaskState({
				workflowName: "review-adversarial-general.md",
				workflowContents: `## Step 2: Perform adversarial analysis
Persist the review findings artifact.`,
				checklistMarkdown: "- [ ] Step 2: Perform adversarial analysis",
				placeholderValues: {
					output_folder: outputFolder,
				},
			})

			await writeFileWithMtime(findingsPath, "# Findings\n", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 2: Perform adversarial analysis")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete review-adversarial-general step 2 when the findings artifact is missing", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step2-missing-file-"))

		try {
			const taskState = createTaskState({
				workflowName: "review-adversarial-general.md",
				workflowContents: `## Step 2: Perform adversarial analysis
Persist the review findings artifact.`,
				checklistMarkdown: "- [ ] Step 2: Perform adversarial analysis",
				placeholderValues: {
					output_folder: path.join(tempDir, "output"),
				},
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 2: Perform adversarial analysis")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes review-adversarial-general step 2 when output_folder is relative and resolves from workflow cwd", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step2-relative-"))
		const foreignCwd = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step2-foreign-cwd-"))
		const originalCwd = process.cwd()

		try {
			const outputFolder = path.join(tempDir, "output")
			const findingsPath = path.join(outputFolder, "adversarial-review-findings.md")
			const taskState = createTaskState({
				workflowName: "review-adversarial-general.md",
				workflowContents: `## Step 2: Perform adversarial analysis
Persist the review findings artifact.`,
				checklistMarkdown: "- [ ] Step 2: Perform adversarial analysis",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					output_folder: "output",
				},
			})

			await writeFileWithMtime(findingsPath, "# Findings\n", Date.now())
			recordTaskWriteProof(taskState, findingsPath)
			process.chdir(foreignCwd)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 2: Perform adversarial analysis")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"adversarial-review-findings.md was written during this task and the artifact still exists.",
			)
		} finally {
			process.chdir(originalCwd)
			await fs.rm(tempDir, { recursive: true, force: true })
			await fs.rm(foreignCwd, { recursive: true, force: true })
		}
	})

	it("completes review-adversarial-general step 3 from successful attempt_completion tool context", async () => {
		const taskState = createTaskState({
			workflowName: "review-adversarial-general.md",
			workflowContents: `## Step 3: Present findings
Deliver findings using attempt_completion.`,
			checklistMarkdown: "- [ ] Step 3: Present findings",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
			toolContext: {
				toolName: "attempt_completion",
				toolParams: { result: "Done" },
				toolResult: "[attempt_completion] Result:\nDone",
				toolWasExecuted: true,
			},
		})

		expect(result.checklist).to.equal("- [x] Step 3: Present findings")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
			"attempt_completion was executed successfully to deliver adversarial findings.",
		)
	})

	it("does not complete review-adversarial-general step 3 when attempt_completion was not executed", async () => {
		const taskState = createTaskState({
			workflowName: "review-adversarial-general.md",
			workflowContents: `## Step 3: Present findings
Deliver findings using attempt_completion.`,
			checklistMarkdown: "- [ ] Step 3: Present findings",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
			toolContext: {
				toolName: "attempt_completion",
				toolParams: { result: "Done" },
				toolResult: "[attempt_completion] Result:\nDone",
				toolWasExecuted: false,
			},
		})

		expect(result.checklist).to.equal("- [ ] Step 3: Present findings")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("completes blind-review step 1 when diff_output resolves to an existing file", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step1-file-"))

		try {
			const diffOutputPath = path.join(tempDir, "review-input.diff")
			const taskState = createTaskState({
				workflowName: "blind-review.md",
				workflowContents: `## Step 1: Receive content and determine review scope
Use {diff_output} when it is already available.

## Step 2: Perform adversarial analysis
Review the provided material.`,
				checklistMarkdown:
					"- [ ] Step 1: Receive content and determine review scope\n- [ ] Step 2: Perform adversarial analysis",
				placeholderValues: {
					diff_output: diffOutputPath,
				},
			})

			await writeFileWithMtime(diffOutputPath, "diff --git a/file b/file", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [x] Step 1: Receive content and determine review scope\n- [ ] Step 2: Perform adversarial analysis",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"diff_output resolves to an existing file path.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete blind-review step 1 when only review_input exists", async () => {
		const taskState = createTaskState({
			workflowName: "blind-review.md",
			workflowContents: `## Step 1: Receive content and determine review scope
Wait for the diff output to be provided.`,
			checklistMarkdown: "- [ ] Step 1: Receive content and determine review scope",
			placeholderValues: {
				review_input: "/tmp/review-input.md",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal("- [ ] Step 1: Receive content and determine review scope")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("does not complete blind-review step 1 when diff_output is missing", async () => {
		const taskState = createTaskState({
			workflowName: "blind-review.md",
			workflowContents: `## Step 1: Receive content and determine review scope
Wait for the diff output to be provided.`,
			checklistMarkdown: "- [ ] Step 1: Receive content and determine review scope",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal("- [ ] Step 1: Receive content and determine review scope")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("does not complete blind-review step 1 when diff_output points to a missing file", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step1-missing-"))

		try {
			const taskState = createTaskState({
				workflowName: "blind-review.md",
				workflowContents: `## Step 1: Receive content and determine review scope
Wait for the diff output to be provided.`,
				checklistMarkdown: "- [ ] Step 1: Receive content and determine review scope",
				placeholderValues: {
					diff_output: path.join(tempDir, "missing.diff"),
				},
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 1: Receive content and determine review scope")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes blind-review step 1 from stable relative diff_output when resolution succeeds", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step1-relative-"))
		const foreignCwd = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step1-foreign-cwd-"))
		const originalCwd = process.cwd()

		try {
			const outputFolder = path.join(tempDir, "output")
			const diffOutputPath = path.join(outputFolder, "review-input.diff")
			const taskState = createTaskState({
				workflowName: "blind-review.md",
				workflowContents: `## Step 1: Receive content and determine review scope
Use {diff_output} when it is already available.
`,
				checklistMarkdown: "- [ ] Step 1: Receive content and determine review scope",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
					diff_output: path.join("output", "review-input.diff"),
				},
			})

			await writeFileWithMtime(diffOutputPath, "diff --git a/file b/file", Date.now())
			process.chdir(foreignCwd)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 1: Receive content and determine review scope")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"diff_output resolves to an existing file path.",
			)
		} finally {
			process.chdir(originalCwd)
			await fs.rm(tempDir, { recursive: true, force: true })
			await fs.rm(foreignCwd, { recursive: true, force: true })
		}
	})

	it("completes blind-review step 2 when the findings artifact exists with a current-task write proof", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step2-file-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const findingsPath = path.join(outputFolder, "adversarial-review-findings.md")
			const taskState = createTaskState({
				workflowName: "blind-review.md",
				workflowContents: `## Step 2: Perform adversarial analysis
Persist the review findings artifact.

## Step 3: Present findings
Deliver the findings.`,
				checklistMarkdown: "- [ ] Step 2: Perform adversarial analysis\n- [ ] Step 3: Present findings",
				placeholderValues: {
					output_folder: outputFolder,
				},
			})

			await writeFileWithMtime(findingsPath, "# Findings\n", Date.now())
			recordTaskWriteProof(taskState, findingsPath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 2: Perform adversarial analysis\n- [ ] Step 3: Present findings")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"adversarial-review-findings.md was written during this task and the artifact still exists.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete blind-review step 2 when the findings artifact exists without a write proof", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step2-missing-proof-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const findingsPath = path.join(outputFolder, "adversarial-review-findings.md")
			const taskState = createTaskState({
				workflowName: "blind-review.md",
				workflowContents: `## Step 2: Perform adversarial analysis
Persist the review findings artifact.`,
				checklistMarkdown: "- [ ] Step 2: Perform adversarial analysis",
				placeholderValues: {
					output_folder: outputFolder,
				},
			})

			await writeFileWithMtime(findingsPath, "# Findings\n", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 2: Perform adversarial analysis")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete blind-review step 2 when the findings artifact is missing", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step2-missing-file-"))

		try {
			const taskState = createTaskState({
				workflowName: "blind-review.md",
				workflowContents: `## Step 2: Perform adversarial analysis
Persist the review findings artifact.`,
				checklistMarkdown: "- [ ] Step 2: Perform adversarial analysis",
				placeholderValues: {
					output_folder: path.join(tempDir, "output"),
				},
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 2: Perform adversarial analysis")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes blind-review step 2 when output_folder is relative and resolves from workflow cwd", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step2-relative-"))
		const foreignCwd = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-adversarial-step2-foreign-cwd-"))
		const originalCwd = process.cwd()

		try {
			const outputFolder = path.join(tempDir, "output")
			const findingsPath = path.join(outputFolder, "adversarial-review-findings.md")
			const taskState = createTaskState({
				workflowName: "blind-review.md",
				workflowContents: `## Step 2: Perform adversarial analysis
Persist the review findings artifact.`,
				checklistMarkdown: "- [ ] Step 2: Perform adversarial analysis",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					output_folder: "output",
				},
			})

			await writeFileWithMtime(findingsPath, "# Findings\n", Date.now())
			recordTaskWriteProof(taskState, findingsPath)
			process.chdir(foreignCwd)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 2: Perform adversarial analysis")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"adversarial-review-findings.md was written during this task and the artifact still exists.",
			)
		} finally {
			process.chdir(originalCwd)
			await fs.rm(tempDir, { recursive: true, force: true })
			await fs.rm(foreignCwd, { recursive: true, force: true })
		}
	})

	it("completes blind-review step 3 from successful attempt_completion tool context", async () => {
		const taskState = createTaskState({
			workflowName: "blind-review.md",
			workflowContents: `## Step 3: Present findings
Deliver findings using attempt_completion.`,
			checklistMarkdown: "- [ ] Step 3: Present findings",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
			toolContext: {
				toolName: "attempt_completion",
				toolParams: { result: "Done" },
				toolResult: "[attempt_completion] Result:\nDone",
				toolWasExecuted: true,
			},
		})

		expect(result.checklist).to.equal("- [x] Step 3: Present findings")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
			"attempt_completion was executed successfully to deliver blind-review findings.",
		)
	})

	it("does not complete blind-review step 3 when attempt_completion was not executed", async () => {
		const taskState = createTaskState({
			workflowName: "blind-review.md",
			workflowContents: `## Step 3: Present findings
Deliver findings using attempt_completion.`,
			checklistMarkdown: "- [ ] Step 3: Present findings",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
			toolContext: {
				toolName: "attempt_completion",
				toolParams: { result: "Done" },
				toolResult: "[attempt_completion] Result:\nDone",
				toolWasExecuted: false,
			},
		})

		expect(result.checklist).to.equal("- [ ] Step 3: Present findings")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("completes code-review step 1 when spec_file is already available without review_target", async () => {
		const taskState = createTaskState({
			workflowName: "code-review.md",
			workflowContents: `## Step 1: Determine Review Source
Resolve the review source placeholders.

## Step 2: Construct & Persist Review Input File
Build the review input artifact.`,
			checklistMarkdown: "- [ ] Step 1: Determine Review Source\n- [ ] Step 2: Construct & Persist Review Input File",
			placeholderValues: {
				spec_file: "/tmp/spec.md",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal(
			"- [x] Step 1: Determine Review Source\n- [ ] Step 2: Construct & Persist Review Input File",
		)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal("spec_file is present.")
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
				taskState.taskStartTimeMs - 2_000,
			)
			await writeFileWithMtime(
				path.join(outputFolder, "review-input.diff"),
				"diff --git a/file b/file",
				taskState.taskStartTimeMs - 1_000,
			)
			recordTaskWriteProof(taskState, path.join(outputFolder, "review-input.md"))
			recordTaskWriteProof(taskState, path.join(outputFolder, "review-input.diff"))

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
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
				taskState.taskStartTimeMs - 1_000,
			)
			recordTaskWriteProof(taskState, path.join(outputFolder, "review-input.md"))

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
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
				taskState.taskStartTimeMs - 1_000,
			)
			recordTaskWriteProof(taskState, path.join(outputFolder, "review-input.diff"))

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 4: Derive Review Mode")
			expect(taskState.activePlaceholderWorkflowValues?.review_mode).to.equal("diff")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete code-review step 2 from fallback file existence alone when diff_output is missing", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step2-fallback-only-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
Wait for the stable diff artifact to be prepared.`,
				checklistMarkdown: "- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
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
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes code-review step 2 when diff_output is stored as a relative path resolved from workflow cwd", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step2-relative-"))
		const foreignCwd = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step2-foreign-cwd-"))
		const originalCwd = process.cwd()

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
Wait for the stable diff artifact to be prepared.`,
				checklistMarkdown: "- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					output_folder: outputFolder,
					diff_output: path.join("output", "review-input.diff"),
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(
				path.join(outputFolder, "review-input.diff"),
				"diff --git a/file b/file",
				taskState.taskStartTimeMs - 1_000,
			)
			recordTaskWriteProof(taskState, path.join(outputFolder, "review-input.diff"))
			process.chdir(foreignCwd)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"diff_output was written during this task and the artifact still exists.",
			)
		} finally {
			process.chdir(originalCwd)
			await fs.rm(tempDir, { recursive: true, force: true })
			await fs.rm(foreignCwd, { recursive: true, force: true })
		}
	})

	it("completes code-review step 3 when review_input points to a fresh review-input.md artifact", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step3-success-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 3: Construct & Persist Review Input File
Wait for review input to be prepared.`,
				checklistMarkdown: "- [ ] Step 3: Construct & Persist Review Input File",
				placeholderValues: {
					output_folder: outputFolder,
					review_input: path.join(outputFolder, "review-input.md"),
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(
				path.join(outputFolder, "review-input.md"),
				"# review input",
				taskState.taskStartTimeMs - 1_000,
			)
			recordTaskWriteProof(taskState, path.join(outputFolder, "review-input.md"))

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 3: Construct & Persist Review Input File")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"review_input was written during this task and the artifact still exists.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes code-review step 3 when review_input is stored as a relative path resolved from workflow cwd", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step3-relative-"))
		const foreignCwd = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step3-foreign-cwd-"))
		const originalCwd = process.cwd()

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 3: Construct & Persist Review Input File
Wait for review input to be prepared.`,
				checklistMarkdown: "- [ ] Step 3: Construct & Persist Review Input File",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					output_folder: outputFolder,
					review_input: path.join("output", "review-input.md"),
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(
				path.join(outputFolder, "review-input.md"),
				"# review input",
				taskState.taskStartTimeMs - 1_000,
			)
			recordTaskWriteProof(taskState, path.join(outputFolder, "review-input.md"))
			process.chdir(foreignCwd)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 3: Construct & Persist Review Input File")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"review_input was written during this task and the artifact still exists.",
			)
		} finally {
			process.chdir(originalCwd)
			await fs.rm(tempDir, { recursive: true, force: true })
			await fs.rm(foreignCwd, { recursive: true, force: true })
		}
	})

	it("does not complete code-review step 3 from fallback file existence alone when review_input is missing", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step3-fallback-only-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 3: Construct & Persist Review Input File
Wait for review input to be prepared.`,
				checklistMarkdown: "- [ ] Step 3: Construct & Persist Review Input File",
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
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 3: Construct & Persist Review Input File")
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
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 4: Derive Review Mode")
			expect(taskState.activePlaceholderWorkflowValues?.review_mode).to.equal(undefined)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("derives review_mode=full when relative review artifacts are resolved from workflow cwd", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step4-relative-full-"))
		const foreignCwd = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step4-foreign-cwd-"))
		const originalCwd = process.cwd()

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 4: Derive Review Mode
Set review mode from the available review artifacts.`,
				checklistMarkdown: "- [ ] Step 4: Derive Review Mode",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					output_folder: outputFolder,
					review_input: path.join("output", "review_input.md"),
					diff_output: path.join("output", "review-input.diff"),
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(
				path.join(outputFolder, "review_input.md"),
				"# review input",
				taskState.taskStartTimeMs - 2_000,
			)
			await writeFileWithMtime(
				path.join(outputFolder, "review-input.diff"),
				"diff --git a/file b/file",
				taskState.taskStartTimeMs - 1_000,
			)
			recordTaskWriteProof(taskState, path.join(outputFolder, "review_input.md"))
			recordTaskWriteProof(taskState, path.join(outputFolder, "review-input.diff"))
			process.chdir(foreignCwd)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 4: Derive Review Mode")
			expect(taskState.activePlaceholderWorkflowValues?.review_mode).to.equal("full")
		} finally {
			process.chdir(originalCwd)
			await fs.rm(tempDir, { recursive: true, force: true })
			await fs.rm(foreignCwd, { recursive: true, force: true })
		}
	})

	it("completes code-review step 5 when both fallback prompt files exist and were written during this task", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step5-fallback-success-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const adversarialPromptPath = path.join(outputFolder, "review-adversarial-general.md")
			const edgeCasePromptPath = path.join(outputFolder, "review-edge-case-hunter.md")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 5: Complete Review Layers
Wait for every required review layer to finish.`,
				checklistMarkdown: "- [ ] Step 5: Complete Review Layers",
				placeholderValues: {
					output_folder: outputFolder,
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(adversarialPromptPath, "# adversarial", taskState.taskStartTimeMs - 2_000)
			await writeFileWithMtime(edgeCasePromptPath, "# edge case", taskState.taskStartTimeMs - 1_000)
			recordTaskWriteProof(taskState, adversarialPromptPath)
			recordTaskWriteProof(taskState, edgeCasePromptPath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 5: Complete Review Layers")
			expect(taskState.activePlaceholderWorkflowDeterministicState?.codeReview?.completedReviewLayers).to.deep.equal({
				adversarial_general: "fallback_prompt",
				edge_case_hunter: "fallback_prompt",
			})
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete code-review step 5 when fallback prompt files exist without current-task write proofs", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step5-fallback-missing-proof-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 5: Complete Review Layers
Wait for every required review layer to finish.`,
				checklistMarkdown: "- [ ] Step 5: Complete Review Layers",
				placeholderValues: {
					output_folder: outputFolder,
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(
				path.join(outputFolder, "review-adversarial-general.md"),
				"# adversarial",
				taskState.taskStartTimeMs - 2_000,
			)
			await writeFileWithMtime(
				path.join(outputFolder, "review-edge-case-hunter.md"),
				"# edge case",
				taskState.taskStartTimeMs - 1_000,
			)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 5: Complete Review Layers")
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

			await writeFileWithMtime(specFilePath, "Status: ready-for-dev\n", taskState.taskStartTimeMs - 1_000)
			recordTaskWriteProof(taskState, specFilePath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
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
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 6: Finish Review")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes code-review step 7 from successful attempt_completion tool context", async () => {
		const taskState = createTaskState({
			workflowName: "code-review.md",
			workflowContents: `## Step 7: Present QA Findings to the Human User
Deliver the final QA findings using attempt_completion.`,
			checklistMarkdown: "- [ ] Step 7: Present QA Findings to the Human User",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
			toolContext: {
				toolName: "attempt_completion",
				toolParams: { result: "Done" },
				toolResult: "[attempt_completion] Result:\nDone",
				toolWasExecuted: true,
			},
		})

		expect(result.checklist).to.equal("- [x] Step 7: Present QA Findings to the Human User")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
			"attempt_completion was executed successfully for the final QA findings report.",
		)
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
				checklistMarkdown: getChecklistMarkdown(taskState),
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
				checklistMarkdown: getChecklistMarkdown(taskState),
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
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 2: Finish Tasks")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes dev-story step 4 from successful attempt_completion tool context", async () => {
		const taskState = createTaskState({
			workflowName: "dev-story.md",
			workflowContents: `## Step 4: Closeout
Provide the final closeout report using attempt_completion.`,
			checklistMarkdown: "- [ ] Step 4: Closeout",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
			toolContext: {
				toolName: "attempt_completion",
				toolParams: { result: "Done" },
				toolResult: "[attempt_completion] Result:\nDone",
				toolWasExecuted: true,
			},
		})

		expect(result.checklist).to.equal("- [x] Step 4: Closeout")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
			"attempt_completion was executed successfully for the final closeout report.",
		)
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
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal("- [ ] Step 1: Review")
		expect(result.noticesAdded).to.equal(false)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})
})
