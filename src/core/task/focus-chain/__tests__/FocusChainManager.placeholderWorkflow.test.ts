import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import * as disk from "../../../storage/disk"
import { shouldInterceptWorkflowFormBeforeApiTurn } from "../../index"
import { TaskState } from "../../TaskState"
import { getFocusChainFilePath } from "../file-utils"
import { FocusChainDependencies, FocusChainManager } from "../index"

function createDependencies(taskState: TaskState) {
	return {
		taskId: "task-focus-chain-placeholder",
		taskState,
		mode: "act" as const,
		stateManager: {
			getGlobalSettingsKey: sinon.stub().returns("act"),
		} as unknown as FocusChainDependencies["stateManager"],
		postStateToWebview: sinon.stub().resolves(),
		say: sinon.stub().resolves(undefined),
		focusChainSettings: { enabled: true, remindClineInterval: 6 } as FocusChainDependencies["focusChainSettings"],
	}
}

describe("FocusChainManager placeholder workflow prompting", () => {
	it("injects current-step details for a placeholder workflow when they can be resolved", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		await fs.writeFile(
			workflowPath,
			`# Review Workflow

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.
`,
			"utf8",
		)

		try {
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
			}
			taskState.activePlaceholderWorkflowValues = {
				story_id: "1.2",
			}
			taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

			const manager = new FocusChainManager(createDependencies(taskState))
			const prompt = await manager.generateFocusChainInstructions()

			expect(prompt).to.contain("# CURRENT WORKFLOW STATUS")
			expect(prompt).to.contain("# CURRENT WORKFLOW STEP")
			expect(prompt).to.contain("You are currently on this step: Step 1: Gather Context")
			expect(prompt).to.contain("Determine what to review from the user's prompt")
			expect(prompt).to.contain(
				"Once you correctly complete this step, the next step's details will be shown automatically.",
			)
			expect(prompt).to.not.contain("task_progress")
			expect(prompt).to.not.contain("__COMPLETE_NEXT_STEP__")
			expect(prompt).to.match(/^### Reminder:/m)
			expect(prompt).to.contain("```text")
			expect(prompt).to.match(/^- \[ \] Step 1: Gather Context/m)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("renders and consumes pending auto-completed placeholder workflow notices", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-notices-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		await fs.writeFile(
			workflowPath,
			`# Review Workflow

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.
`,
			"utf8",
		)

		try {
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
			}
			taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context"
			taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.push({
				workflowName: "code-review.md",
				stepNumber: 1,
				checklistLabel: "Step 1: Gather Context",
				reason: "spec_file is present.",
			})

			const manager = new FocusChainManager(createDependencies(taskState))
			const prompt = await manager.generateFocusChainInstructions()

			expect(prompt).to.contain("# CURRENT WORKFLOW STATUS")
			expect(prompt).to.contain("# AUTO-COMPLETED WORKFLOW STEPS")
			expect(prompt).to.contain("- Step 1: Gather Context — spec_file is present.")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("shows auto-completed notices once and clears them from persisted placeholder metadata", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "code-review.md",
				contents: `# Review Workflow

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.
`,
			}
			taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"
			taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = [
				{
					workflowName: "code-review.md",
					stepNumber: 4,
					checklistLabel: "Step 4: Set Review Mode",
					reason: "review_mode was derived deterministically from current-task review artifacts.",
				},
			]

			sandbox.stub(disk, "getTaskMetadata").resolves({} as never)
			const saveTaskMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const manager = new FocusChainManager(createDependencies(taskState))
			const firstPrompt = await manager.generateFocusChainInstructions()

			expect(firstPrompt).to.contain("# AUTO-COMPLETED WORKFLOW STEPS")
			expect(firstPrompt).to.contain("No action was required from you for those steps.")
			expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			const lastSavedMetadata = saveTaskMetadataStub.getCall(saveTaskMetadataStub.callCount - 1).args[1]
			expect(lastSavedMetadata.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])

			const secondPrompt = await manager.generateFocusChainInstructions()

			expect(secondPrompt).to.not.contain("# AUTO-COMPLETED WORKFLOW STEPS")
			expect(secondPrompt).to.not.contain("Step 4: Set Review Mode")
		} finally {
			sandbox.restore()
		}
	})

	it("renders stored dynamic placeholder values before extracting the current step", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-dynamic-"))
		const workflowPath = path.join(tempDir, "local-review.md")
		await fs.writeFile(
			workflowPath,
			`# Review Workflow

## Step 1: Gather Context
Review the scoped story {{story_id}} before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.
`,
			"utf8",
		)

		try {
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "local-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "local-review.md",
				path: workflowPath,
			}
			taskState.activePlaceholderWorkflowStableValues = {
				story_id: "1.0",
			}
			taskState.activePlaceholderWorkflowValues = {
				story_id: "1.2",
			}
			taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

			const manager = new FocusChainManager(createDependencies(taskState))
			const prompt = await manager.generateFocusChainInstructions()

			expect(prompt).to.contain("Review the scoped story 1.2 before asking follow-up questions.")
			expect(prompt).to.not.contain("{{story_id}}")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("renders stored stable placeholder values before extracting the current step", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-stable-"))
		const workflowPath = path.join(tempDir, "local-review.md")
		await fs.writeFile(
			workflowPath,
			`# Review Workflow

## Step 1: Gather Context
Respond in {communication_language} before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.
`,
			"utf8",
		)

		try {
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "local-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "local-review.md",
				path: workflowPath,
			}
			taskState.activePlaceholderWorkflowStableValues = {
				communication_language: "English",
			}
			taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

			const manager = new FocusChainManager(createDependencies(taskState))
			const prompt = await manager.generateFocusChainInstructions()

			expect(prompt).to.contain("Respond in English before asking follow-up questions.")
			expect(prompt).to.not.contain("{communication_language}")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("falls back to the generic reminder for non-deterministic workflows when step details cannot be resolved", async () => {
		const taskState = new TaskState()
		taskState.activePlaceholderWorkflowId = "remote-review"
		taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "remote-review",
			contents: "## Step 9: Ship It\nFinish the release.",
		}
		taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

		const manager = new FocusChainManager(createDependencies(taskState))
		const prompt = await manager.generateFocusChainInstructions()

		expect(prompt).to.contain('If you finish the current checklist step, include "task_progress" in your next tool call')
		expect(prompt).to.not.contain("# CURRENT WORKFLOW STEP")
	})

	it("suppresses manual task_progress fallback text for deterministic workflows when step details cannot be resolved", async () => {
		const taskState = new TaskState()
		taskState.activePlaceholderWorkflowId = "code-review.md"
		taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "code-review.md",
			contents: "## Step 9: Ship It\nFinish the release.",
		}
		taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

		const manager = new FocusChainManager(createDependencies(taskState))
		const prompt = await manager.generateFocusChainInstructions()

		expect(prompt).to.contain("This turn could not resolve the current deterministic workflow step details")
		expect(prompt).to.not.contain('If you finish the current checklist step, include "task_progress" in your next tool call')
		expect(prompt).to.not.contain("Keep `task_progress` moving")
		expect(prompt).to.not.contain("# CURRENT WORKFLOW STEP")
	})

	it("intercepts only code-review.md Step 3 when diff_output is not already satisfied", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-form-intercept-"))

		try {
			const diffOutputPath = path.join(tempDir, "workflow-output", "review-input.diff")
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "code-review.md",
				contents: `# Code Review

## Step 1: Determine Review Source
Done.

## Step 2: Construct & Persist Review Input File
Done.

## Step 3: System-Owned Diff Source Resolution And Diff Output Persistence
Fallback instructions live here.
`,
			}
			taskState.activePlaceholderWorkflowStableValues = {
				diff_output: diffOutputPath,
			}
			taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [x] Step 2: Construct & Persist Review Input File",
				"- [ ] Step 3: System-Owned Diff Source Resolution And Diff Output Persistence",
			].join("\n")

			expect(await shouldInterceptWorkflowFormBeforeApiTurn({ cwd: tempDir, taskState })).to.equal(true)

			await fs.mkdir(path.dirname(diffOutputPath), { recursive: true })
			await fs.writeFile(diffOutputPath, "diff --git a/file b/file", "utf8")

			expect(await shouldInterceptWorkflowFormBeforeApiTurn({ cwd: tempDir, taskState })).to.equal(true)

			taskState.activePlaceholderWorkflowTaskWriteProofPaths = [diffOutputPath]

			expect(await shouldInterceptWorkflowFormBeforeApiTurn({ cwd: tempDir, taskState })).to.equal(false)

			taskState.activePlaceholderWorkflowTaskWriteProofPaths = []
			taskState.suppressedWorkflowFormResolverIds = ["code_review_step_3_diff_source"]

			expect(await shouldInterceptWorkflowFormBeforeApiTurn({ cwd: tempDir, taskState })).to.equal(false)

			taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "dev-story.md",
				contents: taskState.activePlaceholderWorkflowSource.contents,
			}

			expect(await shouldInterceptWorkflowFormBeforeApiTurn({ cwd: tempDir, taskState })).to.equal(false)

			taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "code-review.md",
				contents: taskState.activePlaceholderWorkflowSource.contents,
			}
			taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [ ] Step 2: Construct & Persist Review Input File",
				"- [ ] Step 3: System-Owned Diff Source Resolution And Diff Output Persistence",
			].join("\n")

			expect(await shouldInterceptWorkflowFormBeforeApiTurn({ cwd: tempDir, taskState })).to.equal(false)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not request the Phase 1 workflow form for review-adversarial-general step 1 on ordinary continuation turns", async () => {
		const taskState = new TaskState()
		taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "review-adversarial-general.md",
			contents: `# Adversarial Review

## Step 1: Receive content and determine review scope
Use {review_input} or {diff_output} when they are available.
`,
		}
		taskState.currentFocusChainChecklist = "- [ ] Step 1: Receive content and determine review scope"

		expect(await shouldInterceptWorkflowFormBeforeApiTurn({ cwd: process.cwd(), taskState })).to.equal(false)
	})

	it("shows the fallback Step 3 instructions when the workflow-form path is not completed", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-step3-fallback-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		await fs.writeFile(
			workflowPath,
			`# Code Review

## Step 1: Determine Review Source
Done.

## Step 2: Construct & Persist Review Input File
Done.

## Step 3: System-Owned Diff Source Resolution And Diff Output Persistence
Goal: The primary path for this step is runtime-owned workflow-form resolution. The AI instructions below are fallback-only and apply only when the system-owned path was not completed.

You are in the fallback path because the system-owned workflow-form path was not completed.

Do not ask the human to restate or re-enter a diff source they already declined to provide in the form flow.

First inspect available workflow context, story context, placeholders, and repo state to find a supported diff source.

Use \`build_review_diff_output\` whenever a supported source is discovered.
`,
			"utf8",
		)

		try {
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
			}
			taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [x] Step 2: Construct & Persist Review Input File",
				"- [ ] Step 3: System-Owned Diff Source Resolution And Diff Output Persistence",
			].join("\n")

			const manager = new FocusChainManager(createDependencies(taskState))
			const prompt = await manager.generateFocusChainInstructions()

			expect(prompt).to.contain(
				"You are in the fallback path because the system-owned workflow-form path was not completed.",
			)
			expect(prompt).to.contain("Do not ask the human to restate or re-enter a diff source")
			expect(prompt).to.contain("build_review_diff_output")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("seeds a placeholder checklist projection and writes the focus-chain markdown file", async () => {
		const sandbox = sinon.createSandbox()
		const taskId = `task-focus-chain-placeholder-${Date.now()}`
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-seed-"))
		const workflowPath = path.join(tempDir, "local-review.md")
		await fs.writeFile(
			workflowPath,
			`# Review Workflow

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.
`,
			"utf8",
		)

		try {
			const taskDir = path.join(tempDir, "task-dir")
			await fs.mkdir(taskDir, { recursive: true })
			const ensureTaskDirectoryExistsStub = sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(taskDir)
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "local-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "local-review.md",
				path: workflowPath,
			}

			const say = sinon.stub().resolves(undefined)
			const manager = new FocusChainManager({
				...createDependencies(taskState),
				taskId,
				say,
			})

			await manager.refreshPlaceholderWorkflowChecklistProjection(true)

			expect(taskState.currentFocusChainChecklist).to.equal("- [ ] Step 1: Gather Context\n- [ ] Step 2: Review")
			sinon.assert.calledWith(say, "task_progress", "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review")
			sinon.assert.called(ensureTaskDirectoryExistsStub)

			const focusChainFilePath = getFocusChainFilePath(taskDir, taskId)
			const fileContent = await fs.readFile(focusChainFilePath, "utf8")
			expect(fileContent).to.contain("- [ ] Step 1: Gather Context")
			expect(fileContent).to.contain("- [ ] Step 2: Review")
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not clobber an existing placeholder checklist when reseeding is not forced", async () => {
		const taskId = `task-focus-chain-placeholder-${Date.now()}`
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-preserve-"))
		const workflowPath = path.join(tempDir, "local-review.md")
		await fs.writeFile(
			workflowPath,
			`# Review Workflow

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.
`,
			"utf8",
		)

		try {
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "local-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "local-review.md",
				path: workflowPath,
			}
			taskState.currentFocusChainChecklist = "- [ ] Existing checklist item"

			const say = sinon.stub().resolves(undefined)
			const manager = new FocusChainManager({
				...createDependencies(taskState),
				taskId,
				say,
			})

			await manager.refreshPlaceholderWorkflowChecklistProjection()

			expect(taskState.currentFocusChainChecklist).to.equal("- [ ] Existing checklist item")
			sinon.assert.notCalled(say)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("restores a progressed placeholder checklist from disk instead of rebuilding it from source during no-task-progress updates", async () => {
		const sandbox = sinon.createSandbox()
		const taskId = `task-focus-chain-placeholder-restore-${Date.now()}`
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-restore-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		await fs.writeFile(
			workflowPath,
			`# Code Review

## Step 1: Determine Review Source
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Construct & Persist Review Input File
Persist review_input.md.

## Step 3: (System-Owned) Diff Source Resolution And Diff Output Persistence
Resolve diff input through the system-owned form flow.
`,
			"utf8",
		)

		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const focusChainFilePath = getFocusChainFilePath(tempDir, taskId)
			const progressedChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [x] Step 2: Construct & Persist Review Input File",
				"- [ ] Step 3: (System-Owned) Diff Source Resolution And Diff Output Persistence",
			].join("\n")
			await fs.writeFile(
				focusChainFilePath,
				`# Focus Chain List for Task ${taskId}

${progressedChecklist}
`,
				"utf8",
			)

			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
			}

			const say = sinon.stub().resolves(undefined)
			const manager = new FocusChainManager({
				...createDependencies(taskState),
				taskId,
				say,
			})

			const result = await manager.updateFCListFromToolResponse(undefined)

			expect(result.accepted).to.equal(true)
			expect(taskState.currentFocusChainChecklist).to.equal(progressedChecklist)
			sinon.assert.calledWith(say, "task_progress", progressedChecklist)
			const persistedChecklist = await fs.readFile(focusChainFilePath, "utf8")
			expect(persistedChecklist).to.contain("- [x] Step 2: Construct & Persist Review Input File")
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("accepts same-shape updates and preserves the existing checklist labels", async () => {
		const sandbox = sinon.createSandbox()
		const taskId = `task-focus-chain-placeholder-${Date.now()}`
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-accept-"))
		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const taskState = new TaskState()
			taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

			const say = sinon.stub().resolves(undefined)
			const manager = new FocusChainManager({
				...createDependencies(taskState),
				taskId,
				say,
			})

			const result = await manager.updateFCListFromToolResponse("- [x]  Step 1: Gather Context \n- [ ] Step 2: Review")

			expect(result.accepted).to.equal(true)
			expect(taskState.currentFocusChainChecklist).to.equal("- [x] Step 1: Gather Context\n- [ ] Step 2: Review")
			sinon.assert.calledOnce(say)
			sinon.assert.calledWith(say, "task_progress", "- [x] Step 1: Gather Context\n- [ ] Step 2: Review")

			const focusChainFilePath = getFocusChainFilePath(tempDir, taskId)
			const written = await fs.readFile(focusChainFilePath, "utf8")
			expect(written).to.contain("- [x] Step 1: Gather Context")
			expect(written).to.contain("- [ ] Step 2: Review")
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("accepts the next-step sentinel and updates the checklist on disk", async () => {
		const sandbox = sinon.createSandbox()
		const taskId = `task-focus-chain-placeholder-${Date.now()}`
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-sentinel-"))
		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const taskState = new TaskState()
			taskState.currentFocusChainChecklist = "- [x] Step 1: Gather Context\n- [ ] Step 2: Review"

			const say = sinon.stub().resolves(undefined)
			const manager = new FocusChainManager({
				...createDependencies(taskState),
				taskId,
				say,
			})

			const result = await manager.updateFCListFromToolResponse("__COMPLETE_NEXT_STEP__")

			expect(result.accepted).to.equal(true)
			expect(taskState.currentFocusChainChecklist).to.equal("- [x] Step 1: Gather Context\n- [x] Step 2: Review")
			sinon.assert.calledOnce(say)
			sinon.assert.calledWith(say, "task_progress", "- [x] Step 1: Gather Context\n- [x] Step 2: Review")

			const focusChainFilePath = getFocusChainFilePath(tempDir, taskId)
			const written = await fs.readFile(focusChainFilePath, "utf8")
			expect(written).to.contain("- [x] Step 1: Gather Context")
			expect(written).to.contain("- [x] Step 2: Review")
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("rejects a second next-step sentinel in the same assistant turn for placeholder workflows", async () => {
		const sandbox = sinon.createSandbox()
		const taskId = `task-focus-chain-placeholder-${Date.now()}`
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-repeat-sentinel-"))
		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "placeholder-inline",
				contents: "placeholder workflow details",
			}
			taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"
			taskState.completedNextStepUpdatesThisTurn = 1

			const say = sinon.stub().resolves(undefined)
			const manager = new FocusChainManager({
				...createDependencies(taskState),
				taskId,
				say,
			})

			const result = await manager.updateFCListFromToolResponse("__COMPLETE_NEXT_STEP__")

			expect(result.accepted).to.equal(false)
			expect(result.feedback).to.contain("Placeholder workflow progress already advanced once in this assistant turn.")
			expect(result.feedback).to.contain(
				'Do not include `task_progress` on a tool call until the active step\'s "Done Signal" is true.',
			)
			expect(taskState.currentFocusChainChecklist).to.equal("- [ ] Step 1: Gather Context\n- [ ] Step 2: Review")
			sinon.assert.notCalled(say)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("rejects the next-step sentinel when no checklist exists yet", async () => {
		const sandbox = sinon.createSandbox()
		const taskId = `task-focus-chain-placeholder-${Date.now()}`
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-no-checklist-"))
		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const taskState = new TaskState()
			const say = sinon.stub().resolves(undefined)
			const manager = new FocusChainManager({
				...createDependencies(taskState),
				taskId,
				say,
			})

			const result = await manager.updateFCListFromToolResponse("__COMPLETE_NEXT_STEP__")

			expect(result.accepted).to.equal(false)
			expect(result.feedback).to.contain("No active task list exists yet.")
			expect(taskState.currentFocusChainChecklist).to.equal(null)
			sinon.assert.notCalled(say)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("rejects shape changes for an existing placeholder checklist and preserves the file", async () => {
		const sandbox = sinon.createSandbox()
		const taskId = `task-focus-chain-placeholder-${Date.now()}`
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-reject-"))
		const workflowPath = path.join(tempDir, "local-review.md")
		await fs.writeFile(
			workflowPath,
			`# Review Workflow

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.
`,
			"utf8",
		)

		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "local-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "local-review.md",
				path: workflowPath,
			}

			const say = sinon.stub().resolves(undefined)
			const manager = new FocusChainManager({
				...createDependencies(taskState),
				taskId,
				say,
			})

			await manager.refreshPlaceholderWorkflowChecklistProjection(true)
			const focusChainFilePath = getFocusChainFilePath(tempDir, taskId)
			const before = await fs.readFile(focusChainFilePath, "utf8")

			const result = await manager.updateFCListFromToolResponse("- [ ] Step 1: Gather Context\n- [ ] Step 2: Triage")

			expect(result.accepted).to.equal(false)
			expect(result.feedback).to.contain("A task list already exists.")
			expect(taskState.currentFocusChainChecklist).to.equal("- [ ] Step 1: Gather Context\n- [ ] Step 2: Review")
			expect(await fs.readFile(focusChainFilePath, "utf8")).to.equal(before)
			sinon.assert.calledOnce(say)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("protects a checklist that already exists on disk even before task state has loaded it", async () => {
		const sandbox = sinon.createSandbox()
		const taskId = `task-focus-chain-disk-${Date.now()}`
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-disk-"))
		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const focusChainFilePath = getFocusChainFilePath(tempDir, taskId)
			await fs.writeFile(
				focusChainFilePath,
				`# Focus Chain List for Task ${taskId}

- [ ] Step 1: Gather Context
- [ ] Step 2: Review
`,
				"utf8",
			)

			const taskState = new TaskState()
			const say = sinon.stub().resolves(undefined)
			const manager = new FocusChainManager({
				...createDependencies(taskState),
				taskId,
				say,
			})

			const result = await manager.updateFCListFromToolResponse("- [ ] Reassess interrupted changes")

			expect(result.accepted).to.equal(false)
			expect(result.feedback).to.contain("A task list already exists.")
			expect(taskState.currentFocusChainChecklist).to.equal("- [ ] Step 1: Gather Context\n- [ ] Step 2: Review")
			const fileContent = await fs.readFile(focusChainFilePath, "utf8")
			expect(fileContent).to.contain("- [ ] Step 1: Gather Context")
			expect(fileContent).to.contain("- [ ] Step 2: Review")
			sinon.assert.notCalled(say)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("always includes focus chain instructions when a placeholder workflow is active", () => {
		const taskState = new TaskState()
		taskState.activePlaceholderWorkflowId = "local-review.md"
		taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "local-review.md",
			contents: "## Step 1: Gather Context\nDo the work.",
		}
		taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context"
		taskState.apiRequestCount = 3
		taskState.apiRequestsSinceLastTodoUpdate = 0

		const manager = new FocusChainManager(createDependencies(taskState))

		expect(manager.shouldIncludeFocusChainInstructions()).to.equal(true)
	})

	it("keeps the managed workflow branch unchanged", async () => {
		const taskState = new TaskState()
		taskState.managedWorkflowRun = {
			workflowId: "bmad-code-review",
			slashCommand: "bmad-code-review",
			status: "active",
			currentPhaseIndex: 0,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			allRequiredComplete: false,
			phases: [
				{
					id: "phase-1",
					title: "Phase 1",
					sourcePath: "phase-1.md",
					sourceContent: "# Phase 1",
					completed: false,
					items: [{ id: "phase-1::item-1", label: "First item", sourceText: "First item", completed: false }],
				},
			],
		}

		const manager = new FocusChainManager(createDependencies(taskState))
		const prompt = await manager.generateFocusChainInstructions()

		expect(prompt).to.contain("# WORKFLOW PROGRESS IS BACKEND MANAGED")
		expect(prompt).to.contain("Use the complete_workflow_item tool")
		expect(prompt).to.not.contain("# CURRENT WORKFLOW STEP")
	})
})
