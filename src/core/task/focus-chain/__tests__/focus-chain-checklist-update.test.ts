import { expect } from "chai"
import { describe, it } from "mocha"
import sinon from "sinon"
import { TaskState } from "../../TaskState"
import { type FocusChainDependencies, FocusChainManager } from "../index"

interface FocusChainTestDependencies {
	dependencies: FocusChainDependencies
	postStateToWebview: sinon.SinonStub<[], Promise<void>>
}

function createDependencies(taskState: TaskState): FocusChainTestDependencies {
	const postStateToWebview = sinon.stub<[], Promise<void>>().resolves()

	return {
		dependencies: {
			taskId: "task-focus-chain-workflow",
			taskState,
			postStateToWebview,
			focusChainSettings: { enabled: true, remindClineInterval: 6 },
		},
		postStateToWebview,
	}
}

describe("FocusChainManager workflow checklist projection", () => {
	it("refreshes the workflow-owned checklist projection when the projected checklist changes", async () => {
		const taskState = new TaskState()
		taskState.activeWorkflowName = "quick-spec"
		taskState.todoListWasUpdatedByUser = true
		taskState.apiRequestsSinceLastTodoUpdate = 3
		taskState.currentFocusChainChecklist = "\n- [x] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec\n"
		const { dependencies, postStateToWebview } = createDependencies(taskState)
		const manager = new FocusChainManager(dependencies)

		await manager.refreshActiveWorkflowChecklistProjection()

		expect(taskState.currentFocusChainChecklist).to.equal("- [x] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec")
		expect(taskState.todoListWasUpdatedByUser).to.equal(false)
		expect(taskState.apiRequestsSinceLastTodoUpdate).to.equal(0)
		expect(postStateToWebview.callCount).to.equal(1)
	})

	it("clears the workflow-owned checklist projection after workflow teardown", async () => {
		const taskState = new TaskState()
		taskState.activeWorkflowName = "quick-spec"
		taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Project Info"
		const { dependencies, postStateToWebview } = createDependencies(taskState)
		const manager = new FocusChainManager(dependencies)
		await manager.refreshActiveWorkflowChecklistProjectionIfActive()
		taskState.activeWorkflowName = undefined

		await manager.refreshActiveWorkflowChecklistProjection()

		expect(taskState.currentFocusChainChecklist).to.equal(null)
		expect(taskState.todoListWasUpdatedByUser).to.equal(false)
		expect(taskState.apiRequestsSinceLastTodoUpdate).to.equal(0)
		expect(postStateToWebview.callCount).to.equal(2)
	})
})
