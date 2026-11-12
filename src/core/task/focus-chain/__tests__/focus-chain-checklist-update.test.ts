import { expect } from "chai"
import { describe, it } from "mocha"
import sinon from "sinon"
import { TaskState } from "../../TaskState"
import { type FocusChainDependencies, FocusChainManager } from "../index"
import { parseFocusChainListCounts } from "../utils"

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
		taskState.currentFocusChainChecklist = "\n1. Gather Project Info - Complete\n2. Draft Spec - Active\n"
		const { dependencies, postStateToWebview } = createDependencies(taskState)
		const manager = new FocusChainManager(dependencies)

		await manager.refreshActiveWorkflowChecklistProjection()

		expect(taskState.currentFocusChainChecklist).to.equal("1. Gather Project Info - Complete\n2. Draft Spec - Active")
		expect(parseFocusChainListCounts(taskState.currentFocusChainChecklist)).to.deep.equal({
			totalItems: 2,
			completedItems: 1,
		})
		expect(taskState.todoListWasUpdatedByUser).to.equal(false)
		expect(taskState.apiRequestsSinceLastTodoUpdate).to.equal(0)
		expect(postStateToWebview.callCount).to.equal(1)
	})

	it("clears the workflow-owned checklist projection after workflow teardown", async () => {
		const taskState = new TaskState()
		taskState.activeWorkflowName = "quick-spec"
		taskState.currentFocusChainChecklist = "1. Gather Project Info - Active"
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
