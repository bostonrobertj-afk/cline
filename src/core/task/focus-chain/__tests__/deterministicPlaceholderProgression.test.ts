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
		expect(isDeterministicPlaceholderWorkflowSupported("create-epics.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("pi-planning.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("create-story.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("create-story")).to.equal(false)
		expect(isDeterministicPlaceholderWorkflowSupported("quick-dev.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("quick-dev")).to.equal(false)
		expect(isDeterministicPlaceholderWorkflowSupported("quick-spec.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("quick-spec")).to.equal(false)
		expect(isDeterministicPlaceholderWorkflowSupported("dev-story.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("review-adversarial-general.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("blind-review.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("code-review")).to.equal(false)
		expect(isDeterministicPlaceholderWorkflowSupported("create-epics")).to.equal(false)
		expect(isDeterministicPlaceholderWorkflowSupported("pi-planning")).to.equal(false)
		expect(isDeterministicPlaceholderWorkflowSupported("dev-story")).to.equal(false)
		expect(isDeterministicPlaceholderWorkflowSupported("review-edge-case-hunter.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("write-remediation-story.md")).to.equal(true)
		expect(isDeterministicPlaceholderWorkflowSupported("write-remediation-story")).to.equal(false)
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

	it("completes review-edge-case-hunter step 1 when review_input and diff_output both resolve to existing files", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-edge-case-step1-file-"))

		try {
			const reviewInputPath = path.join(tempDir, "review-input.md")
			const diffOutputPath = path.join(tempDir, "review-input.diff")
			const taskState = createTaskState({
				workflowName: "review-edge-case-hunter.md",
				workflowContents: `## Step 1: Receive Content (may auto-advance)
Required: {review_input}, {diff_output}

## Step 2: Exhaustive Path Analysis
Review the provided material.`,
				checklistMarkdown: "- [ ] Step 1: Receive Content (may auto-advance)\n- [ ] Step 2: Exhaustive Path Analysis",
				placeholderValues: {
					review_input: reviewInputPath,
					diff_output: diffOutputPath,
				},
			})

			await writeFileWithMtime(reviewInputPath, "# Review Input\n", Date.now())
			await writeFileWithMtime(diffOutputPath, "diff --git a/file b/file", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [x] Step 1: Receive Content (may auto-advance)\n- [ ] Step 2: Exhaustive Path Analysis",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"review_input and diff_output resolve to existing file paths.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete review-edge-case-hunter step 1 when review_input is missing", async () => {
		const tempDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "deterministic-placeholder-edge-case-step1-missing-review-input-"),
		)

		try {
			const diffOutputPath = path.join(tempDir, "review-input.diff")
			const taskState = createTaskState({
				workflowName: "review-edge-case-hunter.md",
				workflowContents: `## Step 1: Receive Content (may auto-advance)
Required: {review_input}, {diff_output}

## Step 2: Exhaustive Path Analysis
Review the provided material.`,
				checklistMarkdown: "- [ ] Step 1: Receive Content (may auto-advance)",
				placeholderValues: {
					diff_output: diffOutputPath,
				},
			})

			await writeFileWithMtime(diffOutputPath, "diff --git a/file b/file", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 1: Receive Content (may auto-advance)")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete review-edge-case-hunter step 1 when diff_output is missing", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-edge-case-step1-missing-diff-output-"))

		try {
			const reviewInputPath = path.join(tempDir, "review-input.md")
			const taskState = createTaskState({
				workflowName: "review-edge-case-hunter.md",
				workflowContents: `## Step 1: Receive Content (may auto-advance)
Required: {review_input}, {diff_output}

## Step 2: Exhaustive Path Analysis
Review the provided material.`,
				checklistMarkdown: "- [ ] Step 1: Receive Content (may auto-advance)",
				placeholderValues: {
					review_input: reviewInputPath,
				},
			})

			await writeFileWithMtime(reviewInputPath, "# Review Input\n", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 1: Receive Content (may auto-advance)")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete review-edge-case-hunter step 1 when review_input points to a missing file", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-edge-case-step1-missing-file-"))

		try {
			const reviewInputPath = path.join(tempDir, "missing-review-input.md")
			const diffOutputPath = path.join(tempDir, "review-input.diff")
			const taskState = createTaskState({
				workflowName: "review-edge-case-hunter.md",
				workflowContents: `## Step 1: Receive Content (may auto-advance)
Required: {review_input}, {diff_output}

## Step 2: Exhaustive Path Analysis
Review the provided material.`,
				checklistMarkdown: "- [ ] Step 1: Receive Content (may auto-advance)",
				placeholderValues: {
					review_input: reviewInputPath,
					diff_output: diffOutputPath,
				},
			})

			await writeFileWithMtime(diffOutputPath, "diff --git a/file b/file", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 1: Receive Content (may auto-advance)")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes review-edge-case-hunter step 1 from stable relative review_input and diff_output when resolution succeeds", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-edge-case-step1-relative-"))
		const foreignCwd = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-edge-case-step1-foreign-cwd-"))
		const originalCwd = process.cwd()

		try {
			const outputFolder = path.join(tempDir, "output")
			const reviewInputPath = path.join(outputFolder, "review-input.md")
			const diffOutputPath = path.join(outputFolder, "review-input.diff")
			const taskState = createTaskState({
				workflowName: "review-edge-case-hunter.md",
				workflowContents: `## Step 1: Receive Content (may auto-advance)
Required: {review_input}, {diff_output}

## Step 2: Exhaustive Path Analysis
Review the provided material.`,
				checklistMarkdown: "- [ ] Step 1: Receive Content (may auto-advance)",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					review_input: path.join("output", "review-input.md"),
					diff_output: path.join("output", "review-input.diff"),
				},
			})

			await writeFileWithMtime(reviewInputPath, "# Review Input\n", Date.now())
			await writeFileWithMtime(diffOutputPath, "diff --git a/file b/file", Date.now())
			process.chdir(foreignCwd)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 1: Receive Content (may auto-advance)")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"review_input and diff_output resolve to existing file paths.",
			)
		} finally {
			process.chdir(originalCwd)
			await fs.rm(tempDir, { recursive: true, force: true })
			await fs.rm(foreignCwd, { recursive: true, force: true })
		}
	})

	it("completes review-edge-case-hunter step 2 when the findings artifact exists with a current-task write proof", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-edge-case-step2-file-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const findingsPath = path.join(outputFolder, "edge-case-review-findings.md")
			const taskState = createTaskState({
				workflowName: "review-edge-case-hunter.md",
				workflowContents: `## Step 2: Exhaustive Path Analysis
Persist the review findings artifact.

## Step 3: Present Findings
Deliver the findings.`,
				checklistMarkdown: "- [ ] Step 2: Exhaustive Path Analysis\n- [ ] Step 3: Present Findings",
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

			expect(result.checklist).to.equal("- [x] Step 2: Exhaustive Path Analysis\n- [ ] Step 3: Present Findings")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"edge-case-review-findings.md was written during this task and the artifact still exists.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete review-edge-case-hunter step 2 when the findings artifact exists without a write proof", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-edge-case-step2-missing-proof-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const findingsPath = path.join(outputFolder, "edge-case-review-findings.md")
			const taskState = createTaskState({
				workflowName: "review-edge-case-hunter.md",
				workflowContents: `## Step 2: Exhaustive Path Analysis
Persist the review findings artifact.`,
				checklistMarkdown: "- [ ] Step 2: Exhaustive Path Analysis",
				placeholderValues: {
					output_folder: outputFolder,
				},
			})

			await writeFileWithMtime(findingsPath, "# Findings\n", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 2: Exhaustive Path Analysis")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes review-edge-case-hunter step 2 from a relative output_folder when the findings artifact exists with a current-task write proof", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-edge-case-step2-relative-"))
		const foreignCwd = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-edge-case-step2-foreign-cwd-"))
		const originalCwd = process.cwd()

		try {
			const outputFolder = path.join(tempDir, "output")
			const findingsPath = path.join(outputFolder, "edge-case-review-findings.md")
			const taskState = createTaskState({
				workflowName: "review-edge-case-hunter.md",
				workflowContents: `## Step 2: Exhaustive Path Analysis
Persist the review findings artifact.`,
				checklistMarkdown: "- [ ] Step 2: Exhaustive Path Analysis",
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

			expect(result.checklist).to.equal("- [x] Step 2: Exhaustive Path Analysis")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"edge-case-review-findings.md was written during this task and the artifact still exists.",
			)
		} finally {
			process.chdir(originalCwd)
			await fs.rm(tempDir, { recursive: true, force: true })
			await fs.rm(foreignCwd, { recursive: true, force: true })
		}
	})

	it("completes review-edge-case-hunter step 3 from successful attempt_completion tool context", async () => {
		const taskState = createTaskState({
			workflowName: "review-edge-case-hunter.md",
			workflowContents: `## Step 3: Present Findings
Deliver findings using attempt_completion.`,
			checklistMarkdown: "- [ ] Step 3: Present Findings",
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

		expect(result.checklist).to.equal("- [x] Step 3: Present Findings")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
			"attempt_completion was executed successfully to deliver edge-case findings.",
		)
	})

	it("does not complete review-edge-case-hunter step 3 when attempt_completion was not executed", async () => {
		const taskState = createTaskState({
			workflowName: "review-edge-case-hunter.md",
			workflowContents: `## Step 3: Present Findings
Deliver findings using attempt_completion.`,
			checklistMarkdown: "- [ ] Step 3: Present Findings",
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

		expect(result.checklist).to.equal("- [ ] Step 3: Present Findings")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("completes code-review step 1 when story_path points to an existing story file", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-code-review-step1-"))

		try {
			const storyPath = path.join(tempDir, "story.md")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 1: Determine Review Source
Resolve the review source placeholders.

## Step 2: Construct & Persist Review Input File
Build the review input artifact.`,
				checklistMarkdown: "- [ ] Step 1: Determine Review Source\n- [ ] Step 2: Construct & Persist Review Input File",
				placeholderValues: {
					story_path: storyPath,
				},
			})
			await fs.writeFile(storyPath, "# Story")

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [x] Step 1: Determine Review Source\n- [ ] Step 2: Construct & Persist Review Input File",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"story_path points to an existing story file.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete code-review step 1 when story_path is missing", async () => {
		const taskState = createTaskState({
			workflowName: "code-review.md",
			workflowContents: `## Step 1: Determine Review Source
Resolve the review source placeholders.

## Step 2: Construct & Persist Review Input File
Build the review input artifact.`,
			checklistMarkdown: "- [ ] Step 1: Determine Review Source\n- [ ] Step 2: Construct & Persist Review Input File",
			placeholderValues: {},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal(
			"- [ ] Step 1: Determine Review Source\n- [ ] Step 2: Construct & Persist Review Input File",
		)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
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
			const blindReviewPromptPath = path.join(outputFolder, "blind-review.md")
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

			await writeFileWithMtime(blindReviewPromptPath, "# adversarial", taskState.taskStartTimeMs - 2_000)
			await writeFileWithMtime(edgeCasePromptPath, "# edge case", taskState.taskStartTimeMs - 1_000)
			recordTaskWriteProof(taskState, blindReviewPromptPath)
			recordTaskWriteProof(taskState, edgeCasePromptPath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 5: Complete Review Layers")
			expect(taskState.activePlaceholderWorkflowDeterministicState?.codeReview?.completedReviewLayers).to.deep.equal({
				blind_review: "fallback_prompt",
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
				path.join(outputFolder, "blind-review.md"),
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

	it("completes code-review step 6 for a fresh review_input with Status: ready-for-dev", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step6-fresh-"))

		try {
			const reviewInputPath = path.join(tempDir, "review-input.md")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 6: Finish Review
Wait for the review input artifact to reach a terminal review status.`,
				checklistMarkdown: "- [ ] Step 6: Finish Review",
				placeholderValues: {
					review_input: reviewInputPath,
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(reviewInputPath, "Status: ready-for-dev\n", taskState.taskStartTimeMs - 1_000)
			recordTaskWriteProof(taskState, reviewInputPath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 6: Finish Review")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete code-review step 6 for a stale review_input", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-step6-stale-"))

		try {
			const reviewInputPath = path.join(tempDir, "review-input.md")
			const taskState = createTaskState({
				workflowName: "code-review.md",
				workflowContents: `## Step 6: Finish Review
Wait for the review input artifact to reach a terminal review status.`,
				checklistMarkdown: "- [ ] Step 6: Finish Review",
				placeholderValues: {
					review_input: reviewInputPath,
				},
			})
			taskState.taskStartTimeMs = Date.now()

			await writeFileWithMtime(reviewInputPath, "Status: ready-for-dev\n", taskState.taskStartTimeMs - 1_000)

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

	describe("quick-dev.md", () => {
		it("completes quick-dev step 1 when spec_file resolves to an existing file", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-dev-step1-"))

			try {
				const specFile = path.join(tempDir, "tech-spec.md")
				const taskState = createTaskState({
					workflowName: "quick-dev.md",
					workflowContents: `## Step 1: Identify Spec File
Wait for {spec_file} to be available.`,
					checklistMarkdown: "- [ ] Step 1: Identify Spec File",
					placeholderValues: {
						spec_file: specFile,
					},
				})

				await writeFileWithMtime(specFile, "# Tech-Spec: Quick Dev Work\n", Date.now())

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [x] Step 1: Identify Spec File")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
					"spec_file resolves to an existing file path.",
				)
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("completes quick-dev step 1 when spec_file is a stable relative path that resolves from workflow cwd", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-dev-step1-relative-"))
			const foreignCwd = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-dev-step1-foreign-cwd-"))
			const originalCwd = process.cwd()

			try {
				const specFile = path.join(tempDir, "specs", "tech-spec.md")
				const taskState = createTaskState({
					workflowName: "quick-dev.md",
					workflowContents: `## Step 1: Identify Spec File
Wait for {spec_file} to be available.`,
					checklistMarkdown: "- [ ] Step 1: Identify Spec File",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						spec_file: path.join("specs", "tech-spec.md"),
					},
				})

				await writeFileWithMtime(specFile, "# Tech-Spec: Quick Dev Work\n", Date.now())
				process.chdir(foreignCwd)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [x] Step 1: Identify Spec File")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
					"spec_file resolves to an existing file path.",
				)
			} finally {
				process.chdir(originalCwd)
				await fs.rm(tempDir, { recursive: true, force: true })
				await fs.rm(foreignCwd, { recursive: true, force: true })
			}
		})

		it("does not complete quick-dev step 1 when spec_file is missing", async () => {
			const taskState = createTaskState({
				workflowName: "quick-dev.md",
				workflowContents: `## Step 1: Identify Spec File
Wait for {spec_file} to be available.`,
				checklistMarkdown: "- [ ] Step 1: Identify Spec File",
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 1: Identify Spec File")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		})

		it("does not complete quick-dev step 1 when spec_file points to a missing file", async () => {
			const taskState = createTaskState({
				workflowName: "quick-dev.md",
				workflowContents: `## Step 1: Identify Spec File
Wait for {spec_file} to be available.`,
				checklistMarkdown: "- [ ] Step 1: Identify Spec File",
				placeholderValues: {
					spec_file: path.join(os.tmpdir(), "missing-quick-dev-spec.md"),
				},
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 1: Identify Spec File")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		})

		it("completes quick-dev step 3 when the ### Tasks section has only checked items", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-dev-checked-"))

			try {
				const specFile = path.join(tempDir, "tech-spec.md")
				const taskState = createTaskState({
					workflowName: "quick-dev.md",
					workflowContents: `## Step 3: Execute Tasks
Wait for the implementation checklist to be fully checked off.`,
					checklistMarkdown: "- [ ] Step 3: Execute Tasks",
					placeholderValues: {
						spec_file: specFile,
					},
				})

				await writeFileWithMtime(
					specFile,
					`# Tech-Spec: Quick Dev Work

## Implementation Plan

### Tasks
- [x] Main task
  - [x] Nested task

## Latest Review Findings
None.
`,
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [x] Step 3: Execute Tasks")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
					"The ### Tasks section contains no unchecked items.",
				)
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("completes quick-dev step 3 when spec_file is a stable relative path that resolves from workflow cwd", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-dev-step3-relative-"))
			const foreignCwd = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-dev-step3-foreign-cwd-"))
			const originalCwd = process.cwd()

			try {
				const specFile = path.join(tempDir, "specs", "tech-spec.md")
				const taskState = createTaskState({
					workflowName: "quick-dev.md",
					workflowContents: `## Step 3: Execute Tasks
Wait for the implementation checklist to be fully checked off.`,
					checklistMarkdown: "- [ ] Step 3: Execute Tasks",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						spec_file: path.join("specs", "tech-spec.md"),
					},
				})

				await writeFileWithMtime(
					specFile,
					`# Tech-Spec: Quick Dev Work

## Implementation Plan

### Tasks
- [x] Main task
  - [x] Nested task

## Latest Review Findings
None.
`,
					Date.now(),
				)
				process.chdir(foreignCwd)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [x] Step 3: Execute Tasks")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
					"The ### Tasks section contains no unchecked items.",
				)
			} finally {
				process.chdir(originalCwd)
				await fs.rm(tempDir, { recursive: true, force: true })
				await fs.rm(foreignCwd, { recursive: true, force: true })
			}
		})

		it("does not complete quick-dev step 3 when the ### Tasks section has an unchecked nested item", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-dev-open-"))

			try {
				const specFile = path.join(tempDir, "tech-spec.md")
				const taskState = createTaskState({
					workflowName: "quick-dev.md",
					workflowContents: `## Step 3: Execute Tasks
Wait for the implementation checklist to be fully checked off.`,
					checklistMarkdown: "- [ ] Step 3: Execute Tasks",
					placeholderValues: {
						spec_file: specFile,
					},
				})

				await writeFileWithMtime(
					specFile,
					`# Tech-Spec: Quick Dev Work

## Implementation Plan

### Tasks
- [x] Main task
  - [ ] Nested task

## Latest Review Findings
None.
`,
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 3: Execute Tasks")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete quick-dev step 3 when checklist items exist only outside the ### Tasks section", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-dev-outside-"))

			try {
				const specFile = path.join(tempDir, "tech-spec.md")
				const taskState = createTaskState({
					workflowName: "quick-dev.md",
					workflowContents: `## Step 3: Execute Tasks
Wait for the implementation checklist to be fully checked off.`,
					checklistMarkdown: "- [ ] Step 3: Execute Tasks",
					placeholderValues: {
						spec_file: specFile,
					},
				})

				await writeFileWithMtime(
					specFile,
					`# Tech-Spec: Quick Dev Work

## Implementation Plan

### Tasks

## Later Work
- [ ] Outside checklist item
`,
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 3: Execute Tasks")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("ignores unchecked checklist items under a sibling ### heading after ### Tasks for quick-dev step 3", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-dev-sibling-"))

			try {
				const specFile = path.join(tempDir, "tech-spec.md")
				const taskState = createTaskState({
					workflowName: "quick-dev.md",
					workflowContents: `## Step 3: Execute Tasks
Wait for the implementation checklist to be fully checked off.`,
					checklistMarkdown: "- [ ] Step 3: Execute Tasks",
					placeholderValues: {
						spec_file: specFile,
					},
				})

				await writeFileWithMtime(
					specFile,
					`# Tech-Spec: Quick Dev Work

## Implementation Plan

### Tasks
- [x] Main task

### Notes
- [ ] Outside checklist item
`,
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [x] Step 3: Execute Tasks")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
					"The ### Tasks section contains no unchecked items.",
				)
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("completes quick-dev step 4 from successful execute_command tool context running git commit", async () => {
			const taskState = createTaskState({
				workflowName: "quick-dev.md",
				workflowContents: `## Step 4: Commit Changes
Create the commit for this quick-dev slice.`,
				checklistMarkdown: "- [ ] Step 4: Commit Changes",
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
				toolContext: {
					toolName: "execute_command",
					toolParams: { command: 'cd /repo && git commit -m "quick dev closeout"' },
					toolResult: `Command executed successfully (exit code 0).
Output:
[execute_command for 'cd /repo && git commit -m "quick dev closeout"'] Result:
[done]`,
					toolWasExecuted: true,
				},
			})

			expect(result.checklist).to.equal("- [x] Step 4: Commit Changes")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"A git commit command was executed successfully for the commit step.",
			)
		})

		it("does not complete quick-dev step 4 when execute_command runs a non-commit command", async () => {
			const taskState = createTaskState({
				workflowName: "quick-dev.md",
				workflowContents: `## Step 4: Commit Changes
Create the commit for this quick-dev slice.`,
				checklistMarkdown: "- [ ] Step 4: Commit Changes",
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
				toolContext: {
					toolName: "execute_command",
					toolParams: { command: "cd /repo && git status" },
					toolResult:
						"Command executed successfully (exit code 0).\nOutput:\n[execute_command for 'cd /repo && git status'] Result:\n[done]",
					toolWasExecuted: true,
				},
			})

			expect(result.checklist).to.equal("- [ ] Step 4: Commit Changes")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		})

		it("does not complete quick-dev step 4 when git commit returns a failed command result", async () => {
			const taskState = createTaskState({
				workflowName: "quick-dev.md",
				workflowContents: `## Step 4: Commit Changes
Create the commit for this quick-dev slice.`,
				checklistMarkdown: "- [ ] Step 4: Commit Changes",
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
				toolContext: {
					toolName: "execute_command",
					toolParams: { command: 'cd /repo && git commit -m "quick dev closeout"' },
					toolResult: "Command failed with exit code 1.\nOutput:\nnothing to commit, working tree clean",
					toolWasExecuted: true,
				},
			})

			expect(result.checklist).to.equal("- [ ] Step 4: Commit Changes")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		})

		it("does not complete quick-dev step 4 when execute_command was not executed", async () => {
			const taskState = createTaskState({
				workflowName: "quick-dev.md",
				workflowContents: `## Step 4: Commit Changes
Create the commit for this quick-dev slice.`,
				checklistMarkdown: "- [ ] Step 4: Commit Changes",
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
				toolContext: {
					toolName: "execute_command",
					toolParams: { command: 'cd /repo && git commit -m "quick dev closeout"' },
					toolResult: `[execute_command for 'cd /repo && git commit -m "quick dev closeout"'] Result:
[done]`,
					toolWasExecuted: false,
				},
			})

			expect(result.checklist).to.equal("- [ ] Step 4: Commit Changes")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		})

		it("completes quick-dev step 5 from successful attempt_completion tool context", async () => {
			const taskState = createTaskState({
				workflowName: "quick-dev.md",
				workflowContents: `## Step 5: Close Out
Deliver the final quick-dev closeout using attempt_completion.`,
				checklistMarkdown: "- [ ] Step 5: Close Out",
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

			expect(result.checklist).to.equal("- [x] Step 5: Close Out")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"attempt_completion was executed successfully for the final quick-dev closeout.",
			)
		})

		it("does not complete quick-dev step 5 when attempt_completion was not executed", async () => {
			const taskState = createTaskState({
				workflowName: "quick-dev.md",
				workflowContents: `## Step 5: Close Out
Deliver the final quick-dev closeout using attempt_completion.`,
				checklistMarkdown: "- [ ] Step 5: Close Out",
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

			expect(result.checklist).to.equal("- [ ] Step 5: Close Out")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		})
	})

	it("completes write-remediation-story step 1 when story_path points to an existing story file", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-write-remediation-step1-"))

		try {
			const storyPath = path.join(tempDir, "story.md")
			const taskState = createTaskState({
				workflowName: "write-remediation-story.md",
				workflowContents: `## Step 1: (System-Owned) Gather Necessary Inputs
Wait for {story_path} to be available.`,
				checklistMarkdown: "- [ ] Step 1: (System-Owned) Gather Necessary Inputs",
				placeholderValues: {
					story_path: storyPath,
				},
			})

			await writeFileWithMtime(storyPath, "# Story\n", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 1: (System-Owned) Gather Necessary Inputs")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"story_path points to an existing story file.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete write-remediation-story step 1 when story_path is missing", async () => {
		const taskState = createTaskState({
			workflowName: "write-remediation-story.md",
			workflowContents: `## Step 1: (System-Owned) Gather Necessary Inputs
Wait for {story_path} to be available.`,
			checklistMarkdown: "- [ ] Step 1: (System-Owned) Gather Necessary Inputs",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal("- [ ] Step 1: (System-Owned) Gather Necessary Inputs")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("completes write-remediation-story step 2 when review_input points to a fresh review-input.md artifact", async () => {
		const tempDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "deterministic-placeholder-write-remediation-step2-review-input-"),
		)

		try {
			const outputFolder = path.join(tempDir, "output")
			const reviewInputPath = path.join(outputFolder, "review-input.md")
			const taskState = createTaskState({
				workflowName: "write-remediation-story.md",
				workflowContents: `## Step 2: (System-Owned) Build review-input.md
Wait for review_input to be prepared.`,
				checklistMarkdown: "- [ ] Step 2: (System-Owned) Build review-input.md",
				placeholderValues: {
					output_folder: outputFolder,
					review_input: reviewInputPath,
				},
			})

			await writeFileWithMtime(reviewInputPath, "# review input\n", Date.now())
			recordTaskWriteProof(taskState, reviewInputPath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 2: (System-Owned) Build review-input.md")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"review_input was written during this task and the artifact still exists.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes write-remediation-story step 2 when review_input is stored as a relative path resolved from workflow cwd", async () => {
		const tempDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "deterministic-placeholder-write-remediation-step2-review-input-relative-"),
		)
		const foreignCwd = await fs.mkdtemp(
			path.join(os.tmpdir(), "deterministic-placeholder-write-remediation-step2-review-input-foreign-cwd-"),
		)
		const originalCwd = process.cwd()

		try {
			const reviewInputPath = path.join(tempDir, "output", "review-input.md")
			const taskState = createTaskState({
				workflowName: "write-remediation-story.md",
				workflowContents: `## Step 2: (System-Owned) Build review-input.md
Wait for review_input to be prepared.`,
				checklistMarkdown: "- [ ] Step 2: (System-Owned) Build review-input.md",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					output_folder: "output",
					review_input: path.join("output", "review-input.md"),
				},
			})

			await writeFileWithMtime(reviewInputPath, "# review input\n", Date.now())
			recordTaskWriteProof(taskState, reviewInputPath)
			process.chdir(foreignCwd)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 2: (System-Owned) Build review-input.md")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"review_input was written during this task and the artifact still exists.",
			)
		} finally {
			process.chdir(originalCwd)
			await fs.rm(tempDir, { recursive: true, force: true })
			await fs.rm(foreignCwd, { recursive: true, force: true })
		}
	})

	it("does not complete write-remediation-story step 2 from fallback file existence alone when review_input is missing", async () => {
		const tempDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "deterministic-placeholder-write-remediation-step2-review-input-missing-"),
		)

		try {
			const outputFolder = path.join(tempDir, "output")
			const taskState = createTaskState({
				workflowName: "write-remediation-story.md",
				workflowContents: `## Step 2: (System-Owned) Build review-input.md
Wait for review_input to be prepared.`,
				checklistMarkdown: "- [ ] Step 2: (System-Owned) Build review-input.md",
				placeholderValues: {
					output_folder: outputFolder,
				},
			})

			await writeFileWithMtime(path.join(outputFolder, "review-input.md"), "# review input\n", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 2: (System-Owned) Build review-input.md")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes write-remediation-story step 3 when a distinct remediation story artifact exists with a current-task write proof, Status: ready-for-dev, and all required headings", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-write-remediation-step3-"))

		try {
			const implementationArtifactsDir = path.join(tempDir, "implementation-artifacts")
			const storyPath = path.join(implementationArtifactsDir, "4-2-original-story.md")
			const remediationArtifactPath = path.join(implementationArtifactsDir, "4-2_remediation_1.md")
			const taskState = createTaskState({
				workflowName: "write-remediation-story.md",
				workflowContents: `## Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings
Wait for the remediation story to be persisted.`,
				checklistMarkdown:
					"- [ ] Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings",
				placeholderValues: {
					story_path: storyPath,
					implementation_artifacts: implementationArtifactsDir,
				},
			})

			await writeFileWithMtime(storyPath, "# Original Story\n", Date.now())
			await writeFileWithMtime(
				remediationArtifactPath,
				`Status: ready-for-dev

# Remediation Story

## Acceptance Criteria
- Criterion

## Allowed Files List
- file.md

## Tasks / Subtasks
- [ ] Task

## Latest Review Findings
- Finding

## Testing Requirements
- test

## Completion Notes List
`,
				Date.now(),
			)
			recordTaskWriteProof(taskState, remediationArtifactPath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [x] Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"A remediation story artifact distinct from story_path was written during this task and contains Status: ready-for-dev plus all required section headings.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete write-remediation-story step 3 when the candidate artifact exists without a current-task write proof", async () => {
		const tempDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "deterministic-placeholder-write-remediation-step3-missing-proof-"),
		)

		try {
			const implementationArtifactsDir = path.join(tempDir, "implementation-artifacts")
			const storyPath = path.join(implementationArtifactsDir, "4-2-original-story.md")
			const remediationArtifactPath = path.join(implementationArtifactsDir, "4-2_remediation_1.md")
			const taskState = createTaskState({
				workflowName: "write-remediation-story.md",
				workflowContents: `## Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings
Wait for the remediation story to be persisted.`,
				checklistMarkdown:
					"- [ ] Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings",
				placeholderValues: {
					story_path: storyPath,
					implementation_artifacts: implementationArtifactsDir,
				},
			})

			await writeFileWithMtime(storyPath, "# Original Story\n", Date.now())
			await writeFileWithMtime(
				remediationArtifactPath,
				`Status: ready-for-dev

# Remediation Story

## Acceptance Criteria
- Criterion

## Allowed Files List
- file.md

## Tasks / Subtasks
- [ ] Task

## Latest Review Findings
- Finding

## Testing Requirements
- test

## Completion Notes List
`,
				Date.now(),
			)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [ ] Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete write-remediation-story step 3 when only story_path itself was updated", async () => {
		const tempDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "deterministic-placeholder-write-remediation-step3-story-path-only-"),
		)

		try {
			const implementationArtifactsDir = path.join(tempDir, "implementation-artifacts")
			const storyPath = path.join(implementationArtifactsDir, "4-2-original-story.md")
			const taskState = createTaskState({
				workflowName: "write-remediation-story.md",
				workflowContents: `## Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings
Wait for the remediation story to be persisted.`,
				checklistMarkdown:
					"- [ ] Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings",
				placeholderValues: {
					story_path: storyPath,
					implementation_artifacts: implementationArtifactsDir,
				},
			})

			await writeFileWithMtime(
				storyPath,
				`Status: ready-for-dev

# Remediation Story

## Acceptance Criteria
- Criterion

## Allowed Files List
- file.md

## Tasks / Subtasks
- [ ] Task

## Latest Review Findings
- Finding

## Testing Requirements
- test

## Completion Notes List
`,
				Date.now(),
			)
			recordTaskWriteProof(taskState, storyPath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [ ] Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete write-remediation-story step 3 when the candidate artifact is missing a required section heading", async () => {
		const tempDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "deterministic-placeholder-write-remediation-step3-missing-heading-"),
		)

		try {
			const implementationArtifactsDir = path.join(tempDir, "implementation-artifacts")
			const storyPath = path.join(implementationArtifactsDir, "4-2-original-story.md")
			const remediationArtifactPath = path.join(implementationArtifactsDir, "4-2_remediation_1.md")
			const taskState = createTaskState({
				workflowName: "write-remediation-story.md",
				workflowContents: `## Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings
Wait for the remediation story to be persisted.`,
				checklistMarkdown:
					"- [ ] Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings",
				placeholderValues: {
					story_path: storyPath,
					implementation_artifacts: implementationArtifactsDir,
				},
			})

			await writeFileWithMtime(storyPath, "# Original Story\n", Date.now())
			await writeFileWithMtime(
				remediationArtifactPath,
				`Status: ready-for-dev

# Remediation Story

## Acceptance Criteria
- Criterion

## Allowed Files List
- file.md

## Tasks / Subtasks
- [ ] Task

## Latest Review Findings
- Finding

## Completion Notes List
`,
				Date.now(),
			)
			recordTaskWriteProof(taskState, remediationArtifactPath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [ ] Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes write-remediation-story step 3 from a relative output_folder when the remediation artifact exists with a current-task write proof", async () => {
		const tempDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "deterministic-placeholder-write-remediation-step3-relative-output-"),
		)

		try {
			const remediationArtifactPath = path.join(tempDir, "output", "implementation-artifacts", "4-2_remediation_1.md")
			const storyPath = path.join(tempDir, "output", "implementation-artifacts", "4-2-original-story.md")
			const taskState = createTaskState({
				workflowName: "write-remediation-story.md",
				workflowContents: `## Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings
Wait for the remediation story to be persisted.`,
				checklistMarkdown:
					"- [ ] Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					output_folder: "output",
					story_path: "output/implementation-artifacts/4-2-original-story.md",
				},
			})

			await writeFileWithMtime(storyPath, "# Original Story\n", Date.now())
			await writeFileWithMtime(
				remediationArtifactPath,
				`Status: ready-for-dev

# Remediation Story

## Acceptance Criteria
- Criterion

## Allowed Files List
- file.md

## Tasks / Subtasks
- [ ] Task

## Latest Review Findings
- Finding

## Testing Requirements
- test

## Completion Notes List
`,
				Date.now(),
			)
			recordTaskWriteProof(taskState, remediationArtifactPath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [x] Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"A remediation story artifact distinct from story_path was written during this task and contains Status: ready-for-dev plus all required section headings.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes write-remediation-story step 4 from successful attempt_completion tool context", async () => {
		const taskState = createTaskState({
			workflowName: "write-remediation-story.md",
			workflowContents: `## Step 4: Notify User of Completion
Use attempt_completion to notify the user.`,
			checklistMarkdown: "- [ ] Step 4: Notify User of Completion",
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

		expect(result.checklist).to.equal("- [x] Step 4: Notify User of Completion")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
			"attempt_completion was executed successfully for the remediation story delivery.",
		)
	})

	it("does not complete write-remediation-story step 4 when attempt_completion was not executed", async () => {
		const taskState = createTaskState({
			workflowName: "write-remediation-story.md",
			workflowContents: `## Step 4: Notify User of Completion
Use attempt_completion to notify the user.`,
			checklistMarkdown: "- [ ] Step 4: Notify User of Completion",
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

		expect(result.checklist).to.equal("- [ ] Step 4: Notify User of Completion")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("completes create-epics step 1 when architecture_document, prd, and mode=new are present", async () => {
		const taskState = createTaskState({
			workflowName: "create-epics.md",
			workflowContents: `## Step 1: (System-Owned) Confirm the input set
Confirm the inputs are present.

## Step 2: (System-Owned) Build the requirements inventory
Build the requirements inventory.`,
			checklistMarkdown:
				"- [ ] Step 1: (System-Owned) Confirm the input set\n- [ ] Step 2: (System-Owned) Build the requirements inventory",
			placeholderValues: {
				architecture_document: "/tmp/architecture.md",
				prd: "/tmp/prd.md",
				mode: "new",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal(
			"- [x] Step 1: (System-Owned) Confirm the input set\n- [ ] Step 2: (System-Owned) Build the requirements inventory",
		)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
			"architecture_document, prd, and a valid mode were already available in workflow placeholder state.",
		)
	})

	it("completes create-epics step 1 when architecture_document, prd, and mode=continue are present", async () => {
		const taskState = createTaskState({
			workflowName: "create-epics.md",
			workflowContents: `## Step 1: (System-Owned) Confirm the input set
Confirm the inputs are present.

## Step 2: (System-Owned) Build the requirements inventory
Build the requirements inventory.`,
			checklistMarkdown:
				"- [ ] Step 1: (System-Owned) Confirm the input set\n- [ ] Step 2: (System-Owned) Build the requirements inventory",
			placeholderValues: {
				architecture_document: "/tmp/architecture.md",
				prd: "/tmp/prd.md",
				mode: "continue",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal(
			"- [x] Step 1: (System-Owned) Confirm the input set\n- [ ] Step 2: (System-Owned) Build the requirements inventory",
		)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
			"architecture_document, prd, and a valid mode were already available in workflow placeholder state.",
		)
	})

	it("does not complete create-epics step 1 when architecture_document is missing", async () => {
		const taskState = createTaskState({
			workflowName: "create-epics.md",
			workflowContents: `## Step 1: (System-Owned) Confirm the input set
Confirm the inputs are present.`,
			checklistMarkdown: "- [ ] Step 1: (System-Owned) Confirm the input set",
			placeholderValues: {
				prd: "/tmp/prd.md",
				mode: "new",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal("- [ ] Step 1: (System-Owned) Confirm the input set")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("does not complete create-epics step 1 when prd is missing", async () => {
		const taskState = createTaskState({
			workflowName: "create-epics.md",
			workflowContents: `## Step 1: (System-Owned) Confirm the input set
Confirm the inputs are present.`,
			checklistMarkdown: "- [ ] Step 1: (System-Owned) Confirm the input set",
			placeholderValues: {
				architecture_document: "/tmp/architecture.md",
				mode: "new",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal("- [ ] Step 1: (System-Owned) Confirm the input set")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("does not complete create-epics step 1 when mode is missing", async () => {
		const taskState = createTaskState({
			workflowName: "create-epics.md",
			workflowContents: `## Step 1: (System-Owned) Confirm the input set
Confirm the inputs are present.`,
			checklistMarkdown: "- [ ] Step 1: (System-Owned) Confirm the input set",
			placeholderValues: {
				architecture_document: "/tmp/architecture.md",
				prd: "/tmp/prd.md",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal("- [ ] Step 1: (System-Owned) Confirm the input set")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("does not complete create-epics step 1 when mode is not new or continue", async () => {
		const taskState = createTaskState({
			workflowName: "create-epics.md",
			workflowContents: `## Step 1: (System-Owned) Confirm the input set
Confirm the inputs are present.`,
			checklistMarkdown: "- [ ] Step 1: (System-Owned) Confirm the input set",
			placeholderValues: {
				architecture_document: "/tmp/architecture.md",
				prd: "/tmp/prd.md",
				mode: "replace",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal("- [ ] Step 1: (System-Owned) Confirm the input set")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("advances only create-epics step 1 when the required placeholder state is present", async () => {
		const taskState = createTaskState({
			workflowName: "create-epics.md",
			workflowContents: `## Step 1: (System-Owned) Confirm the input set
Confirm the inputs are present.

## Step 2: (System-Owned) Build the requirements inventory
Build the requirements inventory.`,
			checklistMarkdown:
				"- [ ] Step 1: (System-Owned) Confirm the input set\n- [ ] Step 2: (System-Owned) Build the requirements inventory",
			placeholderValues: {
				architecture_document: "/tmp/architecture.md",
				prd: "/tmp/prd.md",
				mode: "new",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal(
			"- [x] Step 1: (System-Owned) Confirm the input set\n- [ ] Step 2: (System-Owned) Build the requirements inventory",
		)
		expect(result.noticesAdded).to.equal(true)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.have.length(1)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices[0]).to.deep.equal({
			workflowName: "create-epics.md",
			stepNumber: 1,
			checklistLabel: "Step 1: (System-Owned) Confirm the input set",
			reason: "architecture_document, prd, and a valid mode were already available in workflow placeholder state.",
		})
	})

	it("completes create-epics step 2 when the canonical epics artifact exists with a current-task write proof and output_file matches", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-epics-step2-new-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const artifactPath = path.join(outputFolder, "planning_artifacts", "epics.md")
			const taskState = createTaskState({
				workflowName: "create-epics.md",
				workflowContents: `## Step 2: (System-Owned) Build the requirements inventory
Build the requirements inventory.

## Step 3: Define the Epics
Define the epics.`,
				checklistMarkdown:
					"- [ ] Step 2: (System-Owned) Build the requirements inventory\n- [ ] Step 3: Define the Epics",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
					output_folder: outputFolder,
				},
				placeholderValues: {
					mode: "new",
					output_file: artifactPath,
				},
			})

			await writeFileWithMtime(artifactPath, "# Epics", Date.now())
			recordTaskWriteProof(taskState, artifactPath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [x] Step 2: (System-Owned) Build the requirements inventory\n- [ ] Step 3: Define the Epics",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"The canonical epics artifact was written in this task and persisted as output_file.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes create-epics step 2 when the canonical epics artifact already exists and output_file matches", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-epics-step2-continue-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const artifactPath = path.join(outputFolder, "planning_artifacts", "epics.md")
			const taskState = createTaskState({
				workflowName: "create-epics.md",
				workflowContents: `## Step 2: (System-Owned) Build the requirements inventory
Build the requirements inventory.

## Step 3: Define the Epics
Define the epics.`,
				checklistMarkdown:
					"- [ ] Step 2: (System-Owned) Build the requirements inventory\n- [ ] Step 3: Define the Epics",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
					output_folder: outputFolder,
				},
				placeholderValues: {
					mode: "continue",
					output_file: artifactPath,
				},
			})

			await writeFileWithMtime(artifactPath, "# Epics", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [x] Step 2: (System-Owned) Build the requirements inventory\n- [ ] Step 3: Define the Epics",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"The canonical epics artifact already existed and was persisted as output_file.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete create-epics step 2 when the canonical epics artifact is missing", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-epics-step2-missing-artifact-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const artifactPath = path.join(outputFolder, "planning_artifacts", "epics.md")
			const taskState = createTaskState({
				workflowName: "create-epics.md",
				workflowContents: `## Step 2: (System-Owned) Build the requirements inventory
Build the requirements inventory.

## Step 3: Define the Epics
Define the epics.`,
				checklistMarkdown:
					"- [ ] Step 2: (System-Owned) Build the requirements inventory\n- [ ] Step 3: Define the Epics",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
					output_folder: outputFolder,
				},
				placeholderValues: {
					mode: "continue",
					output_file: artifactPath,
				},
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [ ] Step 2: (System-Owned) Build the requirements inventory\n- [ ] Step 3: Define the Epics",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete create-epics step 2 when output_file is missing", async () => {
		const tempDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "deterministic-placeholder-create-epics-step2-missing-output-file-"),
		)

		try {
			const outputFolder = path.join(tempDir, "output")
			const artifactPath = path.join(outputFolder, "planning_artifacts", "epics.md")
			const taskState = createTaskState({
				workflowName: "create-epics.md",
				workflowContents: `## Step 2: (System-Owned) Build the requirements inventory
Build the requirements inventory.

## Step 3: Define the Epics
Define the epics.`,
				checklistMarkdown:
					"- [ ] Step 2: (System-Owned) Build the requirements inventory\n- [ ] Step 3: Define the Epics",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
					output_folder: outputFolder,
				},
				placeholderValues: {
					mode: "continue",
				},
			})

			await writeFileWithMtime(artifactPath, "# Epics", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [ ] Step 2: (System-Owned) Build the requirements inventory\n- [ ] Step 3: Define the Epics",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete create-epics step 2 when output_file does not match the canonical epics artifact", async () => {
		const tempDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "deterministic-placeholder-create-epics-step2-mismatched-output-file-"),
		)

		try {
			const outputFolder = path.join(tempDir, "output")
			const artifactPath = path.join(outputFolder, "planning_artifacts", "epics.md")
			const taskState = createTaskState({
				workflowName: "create-epics.md",
				workflowContents: `## Step 2: (System-Owned) Build the requirements inventory
Build the requirements inventory.

## Step 3: Define the Epics
Define the epics.`,
				checklistMarkdown:
					"- [ ] Step 2: (System-Owned) Build the requirements inventory\n- [ ] Step 3: Define the Epics",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
					output_folder: outputFolder,
				},
				placeholderValues: {
					mode: "continue",
					output_file: path.join(outputFolder, "planning_artifacts", "alternate-epics.md"),
				},
			})

			await writeFileWithMtime(artifactPath, "# Epics", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [ ] Step 2: (System-Owned) Build the requirements inventory\n- [ ] Step 3: Define the Epics",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete create-epics step 2 for mode=new when the current-task write proof is missing", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-epics-step2-missing-proof-"))

		try {
			const outputFolder = path.join(tempDir, "output")
			const artifactPath = path.join(outputFolder, "planning_artifacts", "epics.md")
			const taskState = createTaskState({
				workflowName: "create-epics.md",
				workflowContents: `## Step 2: (System-Owned) Build the requirements inventory
Build the requirements inventory.

## Step 3: Define the Epics
Define the epics.`,
				checklistMarkdown:
					"- [ ] Step 2: (System-Owned) Build the requirements inventory\n- [ ] Step 3: Define the Epics",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
					output_folder: outputFolder,
				},
				placeholderValues: {
					mode: "new",
					output_file: artifactPath,
				},
			})

			await writeFileWithMtime(artifactPath, "# Epics", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [ ] Step 2: (System-Owned) Build the requirements inventory\n- [ ] Step 3: Define the Epics",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes pi-planning step 1 when epics_document and architecture_document are present", async () => {
		const taskState = createTaskState({
			workflowName: "pi-planning.md",
			workflowContents: `## Step 1:  (System-Owned) Gather Requirements
Gather requirements.

## Step 2: (System-Owned) Identify Target Epic
Identify the target epic.`,
			checklistMarkdown:
				"- [ ] Step 1:  (System-Owned) Gather Requirements\n- [ ] Step 2: (System-Owned) Identify Target Epic",
			placeholderValues: {
				epics_document: "/tmp/epics.md",
				architecture_document: "/tmp/architecture.md",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal(
			"- [x] Step 1:  (System-Owned) Gather Requirements\n- [ ] Step 2: (System-Owned) Identify Target Epic",
		)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
			"epics_document and architecture_document were already available in workflow placeholder state.",
		)
	})

	it("does not complete pi-planning step 1 when epics_document is missing", async () => {
		const taskState = createTaskState({
			workflowName: "pi-planning.md",
			workflowContents: `## Step 1:  (System-Owned) Gather Requirements
Gather requirements.

## Step 2: (System-Owned) Identify Target Epic
Identify the target epic.`,
			checklistMarkdown:
				"- [ ] Step 1:  (System-Owned) Gather Requirements\n- [ ] Step 2: (System-Owned) Identify Target Epic",
			placeholderValues: {
				architecture_document: "/tmp/architecture.md",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal(
			"- [ ] Step 1:  (System-Owned) Gather Requirements\n- [ ] Step 2: (System-Owned) Identify Target Epic",
		)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("does not complete pi-planning step 1 when architecture_document is missing", async () => {
		const taskState = createTaskState({
			workflowName: "pi-planning.md",
			workflowContents: `## Step 1:  (System-Owned) Gather Requirements
Gather requirements.

## Step 2: (System-Owned) Identify Target Epic
Identify the target epic.`,
			checklistMarkdown:
				"- [ ] Step 1:  (System-Owned) Gather Requirements\n- [ ] Step 2: (System-Owned) Identify Target Epic",
			placeholderValues: {
				epics_document: "/tmp/epics.md",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal(
			"- [ ] Step 1:  (System-Owned) Gather Requirements\n- [ ] Step 2: (System-Owned) Identify Target Epic",
		)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("completes pi-planning step 2 when target_epic is present and non-empty", async () => {
		const taskState = createTaskState({
			workflowName: "pi-planning.md",
			workflowContents: `## Step 2: (System-Owned) Identify Target Epic
Identify the target epic.

## Step 3:  (System-Owned) Build Epic Delivery Spec
Build the delivery spec.`,
			checklistMarkdown:
				"- [ ] Step 2: (System-Owned) Identify Target Epic\n- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
			placeholderValues: {
				target_epic: "Epic 3 - Checkout",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal(
			"- [x] Step 2: (System-Owned) Identify Target Epic\n- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
		)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
			"target_epic was already available in workflow placeholder state.",
		)
	})

	it("does not complete pi-planning step 2 when target_epic is missing", async () => {
		const taskState = createTaskState({
			workflowName: "pi-planning.md",
			workflowContents: `## Step 2: (System-Owned) Identify Target Epic
Identify the target epic.

## Step 3:  (System-Owned) Build Epic Delivery Spec
Build the delivery spec.`,
			checklistMarkdown:
				"- [ ] Step 2: (System-Owned) Identify Target Epic\n- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal(
			"- [ ] Step 2: (System-Owned) Identify Target Epic\n- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
		)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("does not complete pi-planning step 2 when target_epic is blank after trimming", async () => {
		const taskState = createTaskState({
			workflowName: "pi-planning.md",
			workflowContents: `## Step 2: (System-Owned) Identify Target Epic
Identify the target epic.

## Step 3:  (System-Owned) Build Epic Delivery Spec
Build the delivery spec.`,
			checklistMarkdown:
				"- [ ] Step 2: (System-Owned) Identify Target Epic\n- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
			placeholderValues: {
				target_epic: "   ",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal(
			"- [ ] Step 2: (System-Owned) Identify Target Epic\n- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
		)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("completes pi-planning step 3 when epic_delivery_spec already resolves to an existing file", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-pi-planning-step3-existing-"))

		try {
			const outputDir = path.join(tempDir, "output")
			const artifactPath = path.join(outputDir, "implementation-artifacts", "epic-3-delivery-spec.md")
			const taskState = createTaskState({
				workflowName: "pi-planning.md",
				workflowContents: `## Step 3:  (System-Owned) Build Epic Delivery Spec
Build the delivery spec.`,
				checklistMarkdown: "- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
				},
			})

			await writeFileWithMtime(artifactPath, "# Epic Delivery Spec\n", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 3:  (System-Owned) Build Epic Delivery Spec")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"epic_delivery_spec already resolves to an existing file.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("completes pi-planning step 3 when epic_delivery_spec resolves to an existing task-written file", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-pi-planning-step3-task-written-"))

		try {
			const outputDir = path.join(tempDir, "output")
			const artifactPath = path.join(outputDir, "implementation-artifacts", "epic-3-delivery-spec.md")
			const taskState = createTaskState({
				workflowName: "pi-planning.md",
				workflowContents: `## Step 3:  (System-Owned) Build Epic Delivery Spec
Build the delivery spec.`,
				checklistMarkdown: "- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
				},
			})

			await writeFileWithMtime(artifactPath, "# Epic Delivery Spec\n", Date.now())
			recordTaskWriteProof(taskState, artifactPath)

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [x] Step 3:  (System-Owned) Build Epic Delivery Spec")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"epic_delivery_spec was written during this task and the artifact still exists.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not complete pi-planning step 3 when epic_delivery_spec is missing", async () => {
		const taskState = createTaskState({
			workflowName: "pi-planning.md",
			workflowContents: `## Step 3:  (System-Owned) Build Epic Delivery Spec
Build the delivery spec.`,
			checklistMarkdown: "- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal("- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("does not complete pi-planning step 3 when epic_delivery_spec resolves to a missing file", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-pi-planning-step3-missing-file-"))

		try {
			const taskState = createTaskState({
				workflowName: "pi-planning.md",
				workflowContents: `## Step 3:  (System-Owned) Build Epic Delivery Spec
Build the delivery spec.`,
				checklistMarkdown: "- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					epic_delivery_spec: "output/implementation-artifacts/missing-delivery-spec.md",
				},
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("advances through pi-planning steps 1 and 2 in one deterministic pass when the setup placeholders are already present", async () => {
		const taskState = createTaskState({
			workflowName: "pi-planning.md",
			workflowContents: `## Step 1:  (System-Owned) Gather Requirements
Gather requirements.

## Step 2: (System-Owned) Identify Target Epic
Identify the target epic.

## Step 3:  (System-Owned) Build Epic Delivery Spec
Build the delivery spec.`,
			checklistMarkdown:
				"- [ ] Step 1:  (System-Owned) Gather Requirements\n- [ ] Step 2: (System-Owned) Identify Target Epic\n- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
			placeholderValues: {
				epics_document: "/tmp/epics.md",
				architecture_document: "/tmp/architecture.md",
				target_epic: "Epic 3 - Checkout",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: getChecklistMarkdown(taskState),
		})

		expect(result.checklist).to.equal(
			"- [x] Step 1:  (System-Owned) Gather Requirements\n- [x] Step 2: (System-Owned) Identify Target Epic\n- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
		)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.have.length(2)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.map((notice) => notice.reason)).to.deep.equal([
			"epics_document and architecture_document were already available in workflow placeholder state.",
			"target_epic was already available in workflow placeholder state.",
		])
	})

	it("advances through pi-planning steps 1, 2, and 3 in one deterministic pass when epic_delivery_spec already resolves to an existing file", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-pi-planning-step123-existing-"))

		try {
			const artifactPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")
			const taskState = createTaskState({
				workflowName: "pi-planning.md",
				workflowContents: `## Step 1:  (System-Owned) Gather Requirements
Gather requirements.

## Step 2: (System-Owned) Identify Target Epic
Identify the target epic.

## Step 3:  (System-Owned) Build Epic Delivery Spec
Build the delivery spec.`,
				checklistMarkdown:
					"- [ ] Step 1:  (System-Owned) Gather Requirements\n- [ ] Step 2: (System-Owned) Identify Target Epic\n- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					epics_document: "/tmp/epics.md",
					architecture_document: "/tmp/architecture.md",
					target_epic: "Epic 3 - Checkout",
					epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
				},
			})

			await writeFileWithMtime(artifactPath, "# Epic Delivery Spec\n", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [x] Step 1:  (System-Owned) Gather Requirements\n- [x] Step 2: (System-Owned) Identify Target Epic\n- [x] Step 3:  (System-Owned) Build Epic Delivery Spec",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.have.length(3)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"epic_delivery_spec already resolves to an existing file.",
			)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not deterministically complete pi-planning step 4 when setup placeholders and artifacts are already present", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-pi-planning-step4-governed-"))

		try {
			const artifactPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")
			const taskState = createTaskState({
				workflowName: "pi-planning.md",
				workflowContents: `## Step 4: Set Expectations
Set expectations.`,
				checklistMarkdown: "- [ ] Step 4: Set Expectations",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					epics_document: "/tmp/epics.md",
					architecture_document: "/tmp/architecture.md",
					target_epic: "Epic 3 - Checkout",
					epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
				},
			})

			await writeFileWithMtime(artifactPath, "# Epic Delivery Spec\n", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 4: Set Expectations")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not deterministically complete pi-planning step 5 when setup placeholders and artifacts are already present", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-pi-planning-step5-governed-"))

		try {
			const artifactPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")
			const taskState = createTaskState({
				workflowName: "pi-planning.md",
				workflowContents: `## Step 5: Build User Stories
Build user stories.`,
				checklistMarkdown: "- [ ] Step 5: Build User Stories",
				stablePlaceholderValues: {
					cwd: tempDir,
					project_root: tempDir,
				},
				placeholderValues: {
					epics_document: "/tmp/epics.md",
					architecture_document: "/tmp/architecture.md",
					target_epic: "Epic 3 - Checkout",
					epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
				},
			})

			await writeFileWithMtime(artifactPath, "# Epic Delivery Spec\n", Date.now())

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 5: Build User Stories")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	describe("quick-spec.md", () => {
		const quickSpecStep1Heading = "## Step 1: Gather Project Info"
		const quickSpecStep2Heading = "## Step 2: (System-Owned) Resolve or start the spec draft"
		const quickSpecStep3Heading = "## Step 3: Identify the Objective"
		const quickSpecStep9Heading = "## Step 9: Build Tasks / Subtasks"
		const quickSpecStep10Heading = "## Step 10: Final Review & Closeuout"
		const quickSpecScaffoldFixture = `---
title: 'Quick Spec Workflow'
slug: 'quick-spec-workflow'
created: '2026-04-08'
status: 'backlog'
stepsCompleted: []
tech_stack: []
files_to_modify: []
code_patterns: []
test_patterns: []
---

# Tech-Spec: Quick Spec Workflow

Created: 

## Overview

### Problem Statement

### Solution

### Scope

#### In Scope

#### Out of Scope

## Context for Development

### Codebase Patterns

### Files to Reference

### Technical Decisions

## Implementation Plan

### Acceptance Criteria

### Implementation Seams

### Tasks


## Latest Review Findings
`

		it("completes quick-spec step 1 when title is already available in workflow placeholder state", async () => {
			const taskState = createTaskState({
				workflowName: "quick-spec.md",
				workflowContents: `${quickSpecStep1Heading}
Gather project info.

${quickSpecStep2Heading}
Resolve or start the spec draft.`,
				checklistMarkdown:
					"- [ ] Step 1: Gather Project Info\n- [ ] Step 2: (System-Owned) Resolve or start the spec draft",
				placeholderValues: {
					title: "Quick Spec Workflow",
				},
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal(
				"- [x] Step 1: Gather Project Info\n- [ ] Step 2: (System-Owned) Resolve or start the spec draft",
			)
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"title was already available in workflow placeholder state.",
			)
		})

		it("does not complete quick-spec step 1 when title is missing", async () => {
			const taskState = createTaskState({
				workflowName: "quick-spec.md",
				workflowContents: `${quickSpecStep1Heading}
Gather project info.`,
				checklistMarkdown: "- [ ] Step 1: Gather Project Info",
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 1: Gather Project Info")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		})

		it("does not complete quick-spec step 1 when title is blank after trimming", async () => {
			const taskState = createTaskState({
				workflowName: "quick-spec.md",
				workflowContents: `${quickSpecStep1Heading}
Gather project info.`,
				checklistMarkdown: "- [ ] Step 1: Gather Project Info",
				placeholderValues: {
					title: "   ",
				},
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 1: Gather Project Info")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		})

		it("completes quick-spec step 2 when output_file points to the canonical initialized scaffold", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-spec-step2-success-"))

			try {
				const scaffoldPath = path.join(tempDir, "planning", "implementation-artifacts", "tech-spec-wip.md")
				const taskState = createTaskState({
					workflowName: "quick-spec.md",
					workflowContents: `${quickSpecStep2Heading}
Resolve or start the spec draft.

${quickSpecStep3Heading}
Identify the objective.`,
					checklistMarkdown:
						"- [ ] Step 2: (System-Owned) Resolve or start the spec draft\n- [ ] Step 3: Identify the Objective",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
						implementation_artifacts: path.join(tempDir, "planning", "implementation-artifacts"),
						date: "2026-04-08",
					},
					placeholderValues: {
						title: "Quick Spec Workflow",
						output_file: path.join("planning", "implementation-artifacts", "tech-spec-wip.md"),
					},
				})

				await writeFileWithMtime(scaffoldPath, quickSpecScaffoldFixture, Date.now())

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal(
					"- [x] Step 2: (System-Owned) Resolve or start the spec draft\n- [ ] Step 3: Identify the Objective",
				)
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
					"The canonical quick-spec scaffold already exists, preserves the required template heading set, and is initialized correctly.",
				)
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete quick-spec step 2 when output_file is missing", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-spec-step2-missing-output-"))

			try {
				const taskState = createTaskState({
					workflowName: "quick-spec.md",
					workflowContents: `${quickSpecStep2Heading}
Resolve or start the spec draft.`,
					checklistMarkdown: "- [ ] Step 2: (System-Owned) Resolve or start the spec draft",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
						implementation_artifacts: path.join(tempDir, "planning", "implementation-artifacts"),
						date: "2026-04-08",
					},
					placeholderValues: {
						title: "Quick Spec Workflow",
					},
				})

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 2: (System-Owned) Resolve or start the spec draft")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete quick-spec step 2 when output_file is outside implementation_artifacts/tech-spec-wip.md", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-spec-step2-wrong-path-"))

			try {
				const scaffoldPath = path.join(tempDir, "planning", "other", "tech-spec-wip.md")
				const taskState = createTaskState({
					workflowName: "quick-spec.md",
					workflowContents: `${quickSpecStep2Heading}
Resolve or start the spec draft.`,
					checklistMarkdown: "- [ ] Step 2: (System-Owned) Resolve or start the spec draft",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
						implementation_artifacts: path.join(tempDir, "planning", "implementation-artifacts"),
						date: "2026-04-08",
					},
					placeholderValues: {
						title: "Quick Spec Workflow",
						output_file: path.join("planning", "other", "tech-spec-wip.md"),
					},
				})

				await writeFileWithMtime(scaffoldPath, quickSpecScaffoldFixture, Date.now())

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 2: (System-Owned) Resolve or start the spec draft")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete quick-spec step 2 when the scaffold status is not backlog", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-spec-step2-status-"))

			try {
				const scaffoldPath = path.join(tempDir, "planning", "implementation-artifacts", "tech-spec-wip.md")
				const taskState = createTaskState({
					workflowName: "quick-spec.md",
					workflowContents: `${quickSpecStep2Heading}
Resolve or start the spec draft.`,
					checklistMarkdown: "- [ ] Step 2: (System-Owned) Resolve or start the spec draft",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
						implementation_artifacts: path.join(tempDir, "planning", "implementation-artifacts"),
						date: "2026-04-08",
					},
					placeholderValues: {
						title: "Quick Spec Workflow",
						output_file: path.join("planning", "implementation-artifacts", "tech-spec-wip.md"),
					},
				})

				await writeFileWithMtime(
					scaffoldPath,
					quickSpecScaffoldFixture.replace("status: 'backlog'", "status: 'ready-for-dev'"),
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 2: (System-Owned) Resolve or start the spec draft")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete quick-spec step 2 when a required template heading is missing", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-spec-step2-heading-"))

			try {
				const scaffoldPath = path.join(tempDir, "planning", "implementation-artifacts", "tech-spec-wip.md")
				const taskState = createTaskState({
					workflowName: "quick-spec.md",
					workflowContents: `${quickSpecStep2Heading}
Resolve or start the spec draft.`,
					checklistMarkdown: "- [ ] Step 2: (System-Owned) Resolve or start the spec draft",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
						implementation_artifacts: path.join(tempDir, "planning", "implementation-artifacts"),
						date: "2026-04-08",
					},
					placeholderValues: {
						title: "Quick Spec Workflow",
						output_file: path.join("planning", "implementation-artifacts", "tech-spec-wip.md"),
					},
				})

				await writeFileWithMtime(
					scaffoldPath,
					quickSpecScaffoldFixture.replace("### Files to Reference\n\n", ""),
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 2: (System-Owned) Resolve or start the spec draft")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete quick-spec step 2 when unresolved placeholder tokens remain", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-spec-step2-placeholders-"))

			try {
				const scaffoldPath = path.join(tempDir, "planning", "implementation-artifacts", "tech-spec-wip.md")
				const taskState = createTaskState({
					workflowName: "quick-spec.md",
					workflowContents: `${quickSpecStep2Heading}
Resolve or start the spec draft.`,
					checklistMarkdown: "- [ ] Step 2: (System-Owned) Resolve or start the spec draft",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
						implementation_artifacts: path.join(tempDir, "planning", "implementation-artifacts"),
						date: "2026-04-08",
					},
					placeholderValues: {
						title: "Quick Spec Workflow",
						output_file: path.join("planning", "implementation-artifacts", "tech-spec-wip.md"),
					},
				})

				await writeFileWithMtime(
					scaffoldPath,
					quickSpecScaffoldFixture.replace("# Tech-Spec: Quick Spec Workflow", "# Tech-Spec: {title}"),
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 2: (System-Owned) Resolve or start the spec draft")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not deterministically complete quick-spec step 3 when overview content is already populated", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-spec-step3-governed-"))

			try {
				const scaffoldPath = path.join(tempDir, "planning", "implementation-artifacts", "tech-spec-wip.md")
				const taskState = createTaskState({
					workflowName: "quick-spec.md",
					workflowContents: `${quickSpecStep3Heading}
Identify the objective.`,
					checklistMarkdown: "- [ ] Step 3: Identify the Objective",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
						implementation_artifacts: path.join(tempDir, "planning", "implementation-artifacts"),
						date: "2026-04-08",
					},
					placeholderValues: {
						title: "Quick Spec Workflow",
						output_file: path.join("planning", "implementation-artifacts", "tech-spec-wip.md"),
					},
				})

				await writeFileWithMtime(
					scaffoldPath,
					quickSpecScaffoldFixture.replace(
						"## Overview\n\n",
						"## Overview\n\nThe objective has already been drafted.\n\n",
					),
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 3: Identify the Objective")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not deterministically complete quick-spec step 9 when tasks are already populated", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-quick-spec-step9-governed-"))

			try {
				const scaffoldPath = path.join(tempDir, "planning", "implementation-artifacts", "tech-spec-wip.md")
				const taskState = createTaskState({
					workflowName: "quick-spec.md",
					workflowContents: `${quickSpecStep9Heading}
Build tasks and subtasks.`,
					checklistMarkdown: "- [ ] Step 9: Build Tasks / Subtasks",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
						implementation_artifacts: path.join(tempDir, "planning", "implementation-artifacts"),
						date: "2026-04-08",
					},
					placeholderValues: {
						title: "Quick Spec Workflow",
						output_file: path.join("planning", "implementation-artifacts", "tech-spec-wip.md"),
					},
				})

				await writeFileWithMtime(
					scaffoldPath,
					quickSpecScaffoldFixture.replace("### Tasks\n\n", "### Tasks\n\n- [ ] Define implementation tasks\n\n"),
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 9: Build Tasks / Subtasks")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("completes quick-spec step 10 from successful attempt_completion tool context", async () => {
			const taskState = createTaskState({
				workflowName: "quick-spec.md",
				workflowContents: `${quickSpecStep10Heading}
Close out the workflow with attempt_completion.`,
				checklistMarkdown: "- [ ] Step 10: Final Review & Closeuout",
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
				toolContext: {
					toolName: "attempt_completion",
					toolWasExecuted: true,
					toolResult: "[attempt_completion] Result:\nDone",
				},
			})

			expect(result.checklist).to.equal("- [x] Step 10: Final Review & Closeuout")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
				"attempt_completion was executed successfully for the final quick-spec closeout.",
			)
		})

		it("does not complete quick-spec step 10 when attempt_completion was not executed", async () => {
			const taskState = createTaskState({
				workflowName: "quick-spec.md",
				workflowContents: `${quickSpecStep10Heading}
Close out the workflow with attempt_completion.`,
				checklistMarkdown: "- [ ] Step 10: Final Review & Closeuout",
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
				toolContext: {
					toolName: "attempt_completion",
					toolWasExecuted: false,
					toolResult: "[attempt_completion] Result:\nDone",
				},
			})

			expect(result.checklist).to.equal("- [ ] Step 10: Final Review & Closeuout")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		})
	})

	describe("create-story.md", () => {
		const createStoryStep1Heading = "## Step 1:  (System-Owned) Resolve the target story"
		const createStoryStep2Heading = "## Step 2:  (System-Owned) Build Story Document Scaffold"
		const createStoryStep3Heading = "## Step 3: Author Story Context and Project Structure Notes"
		const createStoryStep4Heading = "## Step 4: Author Implementation-Ready Story Guidance"
		const createStoryStep5Heading = "## Step 5: Validate and finalize the story"
		const createStoryEpicDeliverySpecFixture = `# Epic Name

## Story 3.2

### Objective
As a release manager,
I want the story scaffold to inherit exactly the approved objective,
so that the story starts from the right implementation intent.

### Acceptance Criteria
1. The scaffold copies the approved objective into the story document.
2. The scaffold copies the approved acceptance criteria without drift.

### Sequencing/ Dependencies
Depends on Story 3.1
`
		const createStoryStoryDocFixture = `# Story 3.2: Placeholder Title

Status: backlog

## Story

As a release manager,
I want the story scaffold to inherit exactly the approved objective,
so that the story starts from the right implementation intent.

## Acceptance Criteria

1. The scaffold copies the approved objective into the story document.
2. The scaffold copies the approved acceptance criteria without drift.

## Tasks / Subtasks

- [ ] Task 1 (AC: #)
  - [ ] Subtask 1.1

## Senior Developer QA Findings

## Dev Notes

- Relevant architecture patterns and constraints

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
`
		const createStoryStep2WhitespaceVariantFixture = `# Story 3.2: Placeholder Title

Status: backlog

## Story

As a release manager,   
I want the story scaffold to inherit exactly the approved objective,   
so that the story starts from the right implementation intent.   

## Acceptance Criteria

1. The scaffold copies the approved objective into the story document.   
2. The scaffold copies the approved acceptance criteria without drift.   

## Tasks / Subtasks

- [ ] Task 1 (AC: #)
  - [ ] Subtask 1.1

## Senior Developer QA Findings

## Dev Notes

- Relevant architecture patterns and constraints

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
`

		it("completes create-story step 1 when epic_delivery_spec resolves to an existing file and story_number is non-empty", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-story-step1-success-"))

			try {
				const epicDeliverySpecPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep1Heading}
Resolve the target story.

${createStoryStep2Heading}
Build the story scaffold.`,
					checklistMarkdown:
						"- [ ] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
						story_number: "3.2",
						output_folder: "output",
					},
				})

				await writeFileWithMtime(epicDeliverySpecPath, createStoryEpicDeliverySpecFixture, Date.now())

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal(
					"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold",
				)
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
					"epic_delivery_spec resolves to an existing file path and story_number was already available in workflow placeholder state.",
				)
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete create-story step 1 when epic_delivery_spec is missing", async () => {
			const taskState = createTaskState({
				workflowName: "create-story.md",
				workflowContents: `${createStoryStep1Heading}
Resolve the target story.`,
				checklistMarkdown: "- [ ] Step 1:  (System-Owned) Resolve the target story",
				placeholderValues: {
					story_number: "3.2",
				},
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 1:  (System-Owned) Resolve the target story")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		})

		it("does not complete create-story step 1 when story_number is blank after trimming", async () => {
			const taskState = createTaskState({
				workflowName: "create-story.md",
				workflowContents: `${createStoryStep1Heading}
Resolve the target story.`,
				checklistMarkdown: "- [ ] Step 1:  (System-Owned) Resolve the target story",
				placeholderValues: {
					epic_delivery_spec: "/tmp/epic-3-delivery-spec.md",
					story_number: "   ",
				},
			})

			const result = await applyDeterministicPlaceholderProgression({
				taskState,
				checklistMarkdown: getChecklistMarkdown(taskState),
			})

			expect(result.checklist).to.equal("- [ ] Step 1:  (System-Owned) Resolve the target story")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		})

		it("does not complete create-story step 1 when epic_delivery_spec resolves to a missing file", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-story-step1-missing-"))

			try {
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep1Heading}
Resolve the target story.

${createStoryStep2Heading}
Build the story scaffold.`,
					checklistMarkdown:
						"- [ ] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
						story_number: "3.2",
						output_folder: "output",
					},
				})

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal(
					"- [ ] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold",
				)
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("completes create-story step 2 when story_doc exists in implementation-artifacts with backlog status, all required headings, and matching selected story content", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-story-step2-success-"))

			try {
				const epicDeliverySpecPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")
				const storyDocPath = path.join(tempDir, "output", "implementation-artifacts", "story3.2.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep2Heading}
Build the story scaffold.`,
					checklistMarkdown: "- [ ] Step 2:  (System-Owned) Build Story Document Scaffold",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						story_doc: path.join("output", "implementation-artifacts", "story3.2.md"),
						epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
						story_number: "3.2",
						output_folder: "output",
					},
				})

				await writeFileWithMtime(epicDeliverySpecPath, createStoryEpicDeliverySpecFixture, Date.now())
				await writeFileWithMtime(storyDocPath, createStoryStep2WhitespaceVariantFixture, Date.now())

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [x] Step 2:  (System-Owned) Build Story Document Scaffold")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
					"story_doc already exists in the canonical implementation-artifacts location, preserves the full story template heading set, and matches the selected story content from epic_delivery_spec.",
				)
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete create-story step 2 when a required template heading is missing", async () => {
			const tempDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "deterministic-placeholder-create-story-step2-missing-heading-"),
			)

			try {
				const epicDeliverySpecPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")
				const storyDocPath = path.join(tempDir, "output", "implementation-artifacts", "story3.2.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep2Heading}
Build the story scaffold.`,
					checklistMarkdown: "- [ ] Step 2:  (System-Owned) Build Story Document Scaffold",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						story_doc: path.join("output", "implementation-artifacts", "story3.2.md"),
						epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
						story_number: "3.2",
						output_folder: "output",
					},
				})

				await writeFileWithMtime(epicDeliverySpecPath, createStoryEpicDeliverySpecFixture, Date.now())
				await writeFileWithMtime(
					storyDocPath,
					createStoryStoryDocFixture.replace(
						"\n### References\n\n- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]\n",
						"",
					),
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 2:  (System-Owned) Build Story Document Scaffold")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete create-story step 2 when the selected story block cannot be found in epic_delivery_spec", async () => {
			const tempDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "deterministic-placeholder-create-story-step2-story-block-missing-"),
			)

			try {
				const epicDeliverySpecPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")
				const storyDocPath = path.join(tempDir, "output", "implementation-artifacts", "story3.2.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep2Heading}
Build the story scaffold.`,
					checklistMarkdown: "- [ ] Step 2:  (System-Owned) Build Story Document Scaffold",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						story_doc: path.join("output", "implementation-artifacts", "story3.2.md"),
						epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
						story_number: "3.2",
						output_folder: "output",
					},
				})

				await writeFileWithMtime(
					epicDeliverySpecPath,
					createStoryEpicDeliverySpecFixture.replace("## Story 3.2", "## Story 9.9"),
					Date.now(),
				)
				await writeFileWithMtime(storyDocPath, createStoryStoryDocFixture, Date.now())

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 2:  (System-Owned) Build Story Document Scaffold")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete create-story step 2 when the story objective content differs from epic_delivery_spec", async () => {
			const tempDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "deterministic-placeholder-create-story-step2-objective-drift-"),
			)

			try {
				const epicDeliverySpecPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")
				const storyDocPath = path.join(tempDir, "output", "implementation-artifacts", "story3.2.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep2Heading}
Build the story scaffold.`,
					checklistMarkdown: "- [ ] Step 2:  (System-Owned) Build Story Document Scaffold",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						story_doc: path.join("output", "implementation-artifacts", "story3.2.md"),
						epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
						story_number: "3.2",
						output_folder: "output",
					},
				})

				await writeFileWithMtime(epicDeliverySpecPath, createStoryEpicDeliverySpecFixture, Date.now())
				await writeFileWithMtime(
					storyDocPath,
					createStoryStoryDocFixture.replace("As a release manager,", "As a different stakeholder,"),
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 2:  (System-Owned) Build Story Document Scaffold")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete create-story step 2 when the acceptance criteria stub text remains", async () => {
			const tempDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "deterministic-placeholder-create-story-step2-acceptance-stub-"),
			)

			try {
				const epicDeliverySpecPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")
				const storyDocPath = path.join(tempDir, "output", "implementation-artifacts", "story3.2.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep2Heading}
Build the story scaffold.`,
					checklistMarkdown: "- [ ] Step 2:  (System-Owned) Build Story Document Scaffold",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						story_doc: path.join("output", "implementation-artifacts", "story3.2.md"),
						epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
						story_number: "3.2",
						output_folder: "output",
					},
				})

				await writeFileWithMtime(epicDeliverySpecPath, createStoryEpicDeliverySpecFixture, Date.now())
				await writeFileWithMtime(
					storyDocPath,
					createStoryStoryDocFixture.replace(
						"1. The scaffold copies the approved objective into the story document.\n2. The scaffold copies the approved acceptance criteria without drift.",
						"1. [Add acceptance criteria from epics/PRD]",
					),
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 2:  (System-Owned) Build Story Document Scaffold")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete create-story step 2 when story_doc is outside output_folder/implementation-artifacts", async () => {
			const tempDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "deterministic-placeholder-create-story-step2-outside-canonical-dir-"),
			)

			try {
				const epicDeliverySpecPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")
				const storyDocPath = path.join(tempDir, "output", "story-3-2.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep2Heading}
Build the story scaffold.`,
					checklistMarkdown: "- [ ] Step 2:  (System-Owned) Build Story Document Scaffold",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						story_doc: path.join("output", "story-3-2.md"),
						epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
						story_number: "3.2",
						output_folder: "output",
					},
				})

				await writeFileWithMtime(epicDeliverySpecPath, createStoryEpicDeliverySpecFixture, Date.now())
				await writeFileWithMtime(storyDocPath, createStoryStoryDocFixture, Date.now())

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 2:  (System-Owned) Build Story Document Scaffold")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete create-story step 2 when story_doc has Status: ready-for-dev", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-story-step2-ready-status-"))

			try {
				const epicDeliverySpecPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")
				const storyDocPath = path.join(tempDir, "output", "implementation-artifacts", "story3.2.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep2Heading}
Build the story scaffold.`,
					checklistMarkdown: "- [ ] Step 2:  (System-Owned) Build Story Document Scaffold",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						story_doc: path.join("output", "implementation-artifacts", "story3.2.md"),
						epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
						story_number: "3.2",
						output_folder: "output",
					},
				})

				await writeFileWithMtime(epicDeliverySpecPath, createStoryEpicDeliverySpecFixture, Date.now())
				await writeFileWithMtime(
					storyDocPath,
					createStoryStoryDocFixture.replace("Status: backlog", "Status: ready-for-dev"),
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 2:  (System-Owned) Build Story Document Scaffold")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not deterministically complete create-story step 3 when project structure notes are already populated", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-story-step3-governed-"))

			try {
				const storyDocPath = path.join(tempDir, "output", "implementation-artifacts", "story3.2.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep3Heading}
Author the story context and project structure notes.`,
					checklistMarkdown: "- [ ] Step 3: Author Story Context and Project Structure Notes",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						story_doc: path.join("output", "implementation-artifacts", "story3.2.md"),
						output_folder: "output",
					},
				})

				await writeFileWithMtime(storyDocPath, createStoryStoryDocFixture, Date.now())

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 3: Author Story Context and Project Structure Notes")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not deterministically complete create-story step 4 when tasks and subtasks are already populated", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-story-step4-governed-"))

			try {
				const storyDocPath = path.join(tempDir, "output", "implementation-artifacts", "story3.2.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep4Heading}
Author implementation-ready story guidance.`,
					checklistMarkdown: "- [ ] Step 4: Author Implementation-Ready Story Guidance",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						story_doc: path.join("output", "implementation-artifacts", "story3.2.md"),
						output_folder: "output",
					},
				})

				await writeFileWithMtime(
					storyDocPath,
					createStoryStoryDocFixture.replace(
						"- [ ] Task 1 (AC: #)\n  - [ ] Subtask 1.1",
						"- [x] Task 1 (AC: 1)\n  - [x] Subtask 1.1\n- [x] Task 2 (AC: 2)\n  - [x] Subtask 2.1",
					),
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 4: Author Implementation-Ready Story Guidance")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("completes create-story step 5 when story_doc contains Status: ready-for-dev", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-story-step5-success-"))

			try {
				const storyDocPath = path.join(tempDir, "output", "implementation-artifacts", "story3.2.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep5Heading}
Validate and finalize the story.`,
					checklistMarkdown: "- [ ] Step 5: Validate and finalize the story",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						story_doc: path.join("output", "implementation-artifacts", "story3.2.md"),
						output_folder: "output",
					},
				})

				await writeFileWithMtime(
					storyDocPath,
					createStoryStoryDocFixture.replace("Status: backlog", "Status: ready-for-dev"),
					Date.now(),
				)

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [x] Step 5: Validate and finalize the story")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
					"The story document now contains Status: ready-for-dev.",
				)
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("does not complete create-story step 5 when story_doc still contains Status: backlog", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-story-step5-backlog-"))

			try {
				const storyDocPath = path.join(tempDir, "output", "implementation-artifacts", "story3.2.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep5Heading}
Validate and finalize the story.`,
					checklistMarkdown: "- [ ] Step 5: Validate and finalize the story",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						story_doc: path.join("output", "implementation-artifacts", "story3.2.md"),
						output_folder: "output",
					},
				})

				await writeFileWithMtime(storyDocPath, createStoryStoryDocFixture, Date.now())

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal("- [ ] Step 5: Validate and finalize the story")
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})

		it("advances through create-story steps 1 and 2 in one deterministic pass when both are already provable", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deterministic-placeholder-create-story-step12-pass-"))

			try {
				const epicDeliverySpecPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")
				const storyDocPath = path.join(tempDir, "output", "implementation-artifacts", "story3.2.md")
				const taskState = createTaskState({
					workflowName: "create-story.md",
					workflowContents: `${createStoryStep1Heading}
Resolve the target story.

${createStoryStep2Heading}
Build the story scaffold.

${createStoryStep3Heading}
Author the story context and project structure notes.`,
					checklistMarkdown:
						"- [ ] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold\n- [ ] Step 3: Author Story Context and Project Structure Notes",
					stablePlaceholderValues: {
						cwd: tempDir,
						project_root: tempDir,
					},
					placeholderValues: {
						epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md"),
						story_doc: path.join("output", "implementation-artifacts", "story3.2.md"),
						story_number: "3.2",
						output_folder: "output",
					},
				})

				await writeFileWithMtime(epicDeliverySpecPath, createStoryEpicDeliverySpecFixture, Date.now())
				await writeFileWithMtime(storyDocPath, createStoryStoryDocFixture, Date.now())

				const result = await applyDeterministicPlaceholderProgression({
					taskState,
					checklistMarkdown: getChecklistMarkdown(taskState),
				})

				expect(result.checklist).to.equal(
					"- [x] Step 1:  (System-Owned) Resolve the target story\n- [x] Step 2:  (System-Owned) Build Story Document Scaffold\n- [ ] Step 3: Author Story Context and Project Structure Notes",
				)
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.have.length(2)
				expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.map((notice) => notice.reason)).to.deep.equal(
					[
						"epic_delivery_spec resolves to an existing file path and story_number was already available in workflow placeholder state.",
						"story_doc already exists in the canonical implementation-artifacts location, preserves the full story template heading set, and matches the selected story content from epic_delivery_spec.",
					],
				)
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		})
	})

	it("leaves still-unsupported placeholder workflows unchanged and adds no notices", async () => {
		const taskState = createTaskState({
			workflowName: "unsupported-placeholder-review.md",
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
