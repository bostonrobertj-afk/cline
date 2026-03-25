import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import * as disk from "../../../storage/disk"
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
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "local-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "local-review.md",
				path: workflowPath,
			}
			taskState.activePlaceholderWorkflowValues = {
				story_id: "1.2",
			}
			taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

			const manager = new FocusChainManager(createDependencies(taskState))
			const prompt = await manager.generateFocusChainInstructions()

			expect(prompt).to.contain("# CURRENT WORKFLOW STEP")
			expect(prompt).to.contain("You are currently on this step: Step 1: Gather Context")
			expect(prompt).to.contain("Determine what to review from the user's prompt")
			expect(prompt).to.contain("If you are done with this step, include the `task_progress` parameter")
			expect(prompt).to.match(/^# TODO LIST UPDATE SUGGESTED/m)
			expect(prompt).to.match(/^- \[ \] Step 1: Gather Context/m)
			expect(prompt).to.match(/^# CURRENT WORKFLOW STEP/m)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
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

	it("falls back to the generic reminder when step details cannot be resolved", async () => {
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

		expect(prompt).to.contain('Update the full "task_progress" checklist in your next tool call')
		expect(prompt).to.not.contain("# CURRENT WORKFLOW STEP")
	})

	it("seeds a placeholder checklist projection and writes the focus-chain markdown file", async () => {
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
			const ensureTaskDirectoryExistsStub = sinon.stub(disk, "ensureTaskDirectoryExists").resolves(taskDir)
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
