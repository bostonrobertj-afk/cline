import assert from "node:assert/strict"
import { ClineDefaultTool } from "@shared/tools"
import { beforeEach, describe, it } from "mocha"
import sinon from "sinon"

import { workflowCompletionHandlerRegistry } from "../workflowCompletionHandler"
import { type WorkflowCompletionRunnerResult, workflowCompletionRunner } from "../workflowCompletionRunner"

const originalRegistryEntries = { ...workflowCompletionHandlerRegistry }

describe("workflowCompletionRunner", () => {
	beforeEach(() => {
		for (const key of Object.keys(workflowCompletionHandlerRegistry)) {
			delete workflowCompletionHandlerRegistry[key]
		}
		Object.assign(workflowCompletionHandlerRegistry, originalRegistryEntries)
	})

	it("returns no_completion when no placeholder workflow is active", async () => {
		const invokeInternalTool = sinon.stub().resolves(true)

		const result: WorkflowCompletionRunnerResult = await workflowCompletionRunner({
			previousChecklist: "- [ ] Step 1",
			currentChecklist: "- [x] Step 1",
			activePlaceholderWorkflowId: undefined,
			noticeCountBefore: 0,
			noticeCountAfter: 1,
			invokeInternalTool,
		})

		assert.deepStrictEqual(result, { kind: "no_completion" })
		sinon.assert.notCalled(invokeInternalTool)
	})

	it("returns no_completion when the current checklist is not fully complete", async () => {
		const invokeInternalTool = sinon.stub().resolves(true)

		const result: WorkflowCompletionRunnerResult = await workflowCompletionRunner({
			previousChecklist: "- [ ] Step 1",
			currentChecklist: "- [ ] Step 1",
			activePlaceholderWorkflowId: "example-workflow.md",
			noticeCountBefore: 0,
			noticeCountAfter: 1,
			invokeInternalTool,
		})

		assert.deepStrictEqual(result, { kind: "no_completion" })
		sinon.assert.notCalled(invokeInternalTool)
	})

	it("returns completed with no_op and shouldTeardown=true when the checklist transitioned from incomplete to complete and no workflow mapping exists", async () => {
		const invokeInternalTool = sinon.stub().resolves(true)

		const result: WorkflowCompletionRunnerResult = await workflowCompletionRunner({
			previousChecklist: "- [ ] Step 1",
			currentChecklist: "- [x] Step 1",
			activePlaceholderWorkflowId: "example-workflow.md",
			noticeCountBefore: 0,
			noticeCountAfter: 0,
			invokeInternalTool,
		})

		assert.deepStrictEqual(result, {
			kind: "completed",
			completedWorkflowId: "example-workflow.md",
			handlerResult: "no_op",
			shouldTeardown: true,
		})
		sinon.assert.notCalled(invokeInternalTool)
	})

	it("returns completed with tool_completed and shouldTeardown=true when a configured workflow mapping succeeds", async () => {
		const invokeInternalTool = sinon.stub().resolves(true)

		const result: WorkflowCompletionRunnerResult = await workflowCompletionRunner({
			previousChecklist: "- [ ] Step 1",
			currentChecklist: "- [x] Step 1",
			activePlaceholderWorkflowId: "code-review.md",
			noticeCountBefore: 0,
			noticeCountAfter: 0,
			invokeInternalTool,
		})

		assert.deepStrictEqual(result, {
			kind: "completed",
			completedWorkflowId: "code-review.md",
			handlerResult: "tool_completed",
			shouldTeardown: true,
		})
		sinon.assert.calledOnceWithExactly(invokeInternalTool, ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE)
	})

	it("returns completed with tool_failed and shouldTeardown=false when a configured workflow mapping reports failure", async () => {
		const invokeInternalTool = sinon.stub().resolves(false)

		const result: WorkflowCompletionRunnerResult = await workflowCompletionRunner({
			previousChecklist: "- [ ] Step 1",
			currentChecklist: "- [x] Step 1",
			activePlaceholderWorkflowId: "code-review.md",
			noticeCountBefore: 0,
			noticeCountAfter: 0,
			invokeInternalTool,
		})

		assert.deepStrictEqual(result, {
			kind: "completed",
			completedWorkflowId: "code-review.md",
			handlerResult: "tool_failed",
			shouldTeardown: false,
		})
		sinon.assert.calledOnceWithExactly(invokeInternalTool, ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE)
	})

	it("returns completed when notices were added even if previousChecklist is absent", async () => {
		const invokeInternalTool = sinon.stub().resolves(true)

		const result: WorkflowCompletionRunnerResult = await workflowCompletionRunner({
			previousChecklist: undefined,
			currentChecklist: "- [x] Step 1",
			activePlaceholderWorkflowId: "example-workflow.md",
			noticeCountBefore: 0,
			noticeCountAfter: 1,
			invokeInternalTool,
		})

		assert.deepStrictEqual(result, {
			kind: "completed",
			completedWorkflowId: "example-workflow.md",
			handlerResult: "no_op",
			shouldTeardown: true,
		})
		sinon.assert.notCalled(invokeInternalTool)
	})
})
