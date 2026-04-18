import * as disk from "@core/storage/disk"
import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import { TaskState } from "../../TaskState"
import { getFocusChainFilePath } from "../file-utils"
import { FocusChainManager } from "../index"

function createDependencies(taskState: TaskState) {
	return {
		taskId: "task-focus-chain-workflow",
		cwd: "/tmp",
		taskState,
		mode: "act" as const,
		stateManager: { getGlobalSettingsKey: sinon.stub().returns("act") } as any,
		postStateToWebview: sinon.stub().resolves(),
		say: sinon.stub().resolves(undefined),
		focusChainSettings: { enabled: true, remindClineInterval: 6 } as any,
	}
}

describe("FocusChainManager workflow checklist projection", () => {
	it("renders runtime-managed workflow checklist instructions when a workflow is active", async () => {
		const taskState = new TaskState()
		taskState.activeWorkflowName = "quick-spec"
		taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec"
		const dependencies = createDependencies(taskState)
		const manager = new FocusChainManager(dependencies)

		const instructions = await manager.generateFocusChainInstructions()

		expect(instructions).to.equal(
			"# CURRENT WORKFLOW STATUS\n\n## ACTIVE WORKFLOW: quick-spec\n\n```text\n- [ ] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec\n```\n\nWorkflow progress is runtime managed. Use the workflow tools for progress changes.\nDo not create or rewrite task_progress manually.",
		)
	})

	it("refreshes the workflow-owned checklist projection when the projected checklist changes", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-workflow-refresh-"))

		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const taskState = new TaskState()
			taskState.activeWorkflowName = "quick-spec"
			taskState.todoListWasUpdatedByUser = true
			taskState.apiRequestsSinceLastTodoUpdate = 3
			taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Project Info"
			const dependencies = createDependencies(taskState)
			const manager = new FocusChainManager(dependencies)
			await manager.refreshManagedWorkflowChecklistProjection()
			taskState.currentFocusChainChecklist = "- [x] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec"
			await manager.refreshManagedWorkflowChecklistProjection()

			expect(taskState.currentFocusChainChecklist).to.equal("- [x] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec")
			expect(taskState.todoListWasUpdatedByUser).to.equal(false)
			expect(taskState.apiRequestsSinceLastTodoUpdate).to.equal(0)
			expect(
				(dependencies.say as sinon.SinonStub).calledWith(
					"task_progress",
					"- [x] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec",
				),
			).to.equal(true)
			expect((dependencies.postStateToWebview as sinon.SinonStub).callCount).to.equal(2)
			const focusChainFilePath = getFocusChainFilePath(tempDir, dependencies.taskId)
			const written = await fs.readFile(focusChainFilePath, "utf8")
			expect(written).to.contain("- [x] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec")
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("clears the workflow-owned checklist projection after workflow teardown", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-workflow-clear-"))

		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const taskState = new TaskState()
			taskState.activeWorkflowName = "quick-spec"
			taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Project Info"
			const dependencies = createDependencies(taskState)
			const manager = new FocusChainManager(dependencies)
			await manager.refreshManagedWorkflowChecklistProjection()
			taskState.activeWorkflowName = undefined
			await manager.refreshManagedWorkflowChecklistProjection()

			expect(taskState.currentFocusChainChecklist).to.equal(null)
			expect(taskState.todoListWasUpdatedByUser).to.equal(false)
			expect(taskState.apiRequestsSinceLastTodoUpdate).to.equal(0)
			const focusChainFilePath = getFocusChainFilePath(tempDir, dependencies.taskId)
			let exists = true
			try {
				await fs.access(focusChainFilePath)
			} catch {
				exists = false
			}
			expect(exists).to.equal(false)
			const instructions = await manager.generateFocusChainInstructions()
			expect(instructions).to.not.contain("ACTIVE WORKFLOW")
			expect(instructions).to.not.contain("Step 1: Gather Project Info")
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})
})
