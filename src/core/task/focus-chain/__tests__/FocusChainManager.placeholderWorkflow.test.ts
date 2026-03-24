import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import { TaskState } from "../../TaskState"
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
			taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

			const manager = new FocusChainManager(createDependencies(taskState))
			const prompt = await manager.generateFocusChainInstructions()

			expect(prompt).to.contain("# CURRENT WORKFLOW STEP")
			expect(prompt).to.contain("You are currently on this step: Step 1: Gather Context")
			expect(prompt).to.contain("Determine what to review from the user's prompt")
			expect(prompt).to.contain("If you are done with this step, include the `task_progress` parameter")
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
