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
		taskId: "task-focus-chain-managed",
		cwd: "/tmp",
		taskState,
		mode: "act" as const,
		stateManager: {
			getGlobalSettingsKey: sinon.stub().returns("act"),
		} as any,
		postStateToWebview: sinon.stub().resolves(),
		say: sinon.stub().resolves(undefined),
		focusChainSettings: { enabled: true, remindClineInterval: 6 } as any,
	}
}

describe("FocusChainManager managed workflow projection", () => {
	it("refreshes the managed checklist projection immediately", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-managed-refresh-"))
		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
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
			taskState.todoListWasUpdatedByUser = true
			const dependencies = createDependencies(taskState)
			const manager = new FocusChainManager(dependencies)

			await manager.refreshManagedWorkflowChecklistProjection()

			expect(taskState.currentFocusChainChecklist).to.contain("Phase 1: First item")
			expect(taskState.todoListWasUpdatedByUser).to.equal(false)
			expect((dependencies.say as sinon.SinonStub).calledWith("task_progress")).to.equal(true)
			expect((dependencies.postStateToWebview as sinon.SinonStub).calledOnce).to.equal(true)

			const focusChainFilePath = getFocusChainFilePath(tempDir, dependencies.taskId)
			const written = await fs.readFile(focusChainFilePath, "utf8")
			expect(written).to.contain("Phase 1: First item")
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("clears the managed checklist projection and deletes the persisted checklist file", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-managed-clear-"))
		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const taskState = new TaskState()
			taskState.currentFocusChainChecklist = "- [ ] Managed item"
			taskState.todoListWasUpdatedByUser = true
			taskState.apiRequestsSinceLastTodoUpdate = 3
			const dependencies = createDependencies(taskState)
			const manager = new FocusChainManager(dependencies)

			const focusChainFilePath = getFocusChainFilePath(tempDir, dependencies.taskId)
			await fs.writeFile(focusChainFilePath, "# Existing checklist\n\n- [ ] Managed item\n", "utf8")

			await manager.clearManagedWorkflowChecklistProjection()

			expect(taskState.currentFocusChainChecklist).to.equal(null)
			expect(taskState.todoListWasUpdatedByUser).to.equal(false)
			expect(taskState.apiRequestsSinceLastTodoUpdate).to.equal(0)
			expect((dependencies.postStateToWebview as sinon.SinonStub).calledOnce).to.equal(true)

			let exists = true
			try {
				await fs.access(focusChainFilePath)
			} catch {
				exists = false
			}
			expect(exists).to.equal(false)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})
})
