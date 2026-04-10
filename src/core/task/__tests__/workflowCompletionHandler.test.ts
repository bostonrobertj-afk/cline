import { ClineDefaultTool } from "@shared/tools"
import { assert } from "chai"
import { beforeEach, describe, it } from "mocha"
import sinon from "sinon"

import { getBackendWorkflowToolContract } from "../tools/backendWorkflowToolContracts"
import {
	type WorkflowCompletionHandlerResult,
	workflowCompletionHandler,
	workflowCompletionHandlerRegistry,
} from "../workflowCompletionHandler"

const originalRegistryEntries = { ...workflowCompletionHandlerRegistry }

describe("workflowCompletionHandler", () => {
	beforeEach(() => {
		for (const key of Object.keys(workflowCompletionHandlerRegistry)) {
			delete workflowCompletionHandlerRegistry[key]
		}
		Object.assign(workflowCompletionHandlerRegistry, originalRegistryEntries)
	})

	it("ships with code-review.md mapped to code_review_spec_update in production", () => {
		assert.deepEqual(workflowCompletionHandlerRegistry, {
			"code-review.md": {
				toolName: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE,
			},
		})
	})

	it("ships code_review_spec_update in the shared backend workflow tool contract bucket", () => {
		assert.deepEqual(getBackendWorkflowToolContract(ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE), {
			id: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE,
			name: "code_review_spec_update",
			parameters: [],
		})
	})

	it("returns no_op and does not invoke any tool when the completed workflow has no configured mapping", async () => {
		const invokeInternalTool = sinon.stub().resolves(true)

		const result = await workflowCompletionHandler({
			completedWorkflowId: "example-workflow.md",
			invokeInternalTool,
		})

		assert.strictEqual(result, "no_op")
		sinon.assert.notCalled(invokeInternalTool)
	})

	it("returns tool_completed when a configured workflow mapping invokes an internal tool successfully", async () => {
		const invokeInternalTool = sinon.stub().resolves(true)

		const result: WorkflowCompletionHandlerResult = await workflowCompletionHandler({
			completedWorkflowId: "code-review.md",
			invokeInternalTool,
		})

		assert.strictEqual(result, "tool_completed")
		sinon.assert.calledOnceWithExactly(invokeInternalTool, ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE)
	})

	it("returns tool_failed when a configured workflow mapping invokes an internal tool that reports failure", async () => {
		const invokeInternalTool = sinon.stub().resolves(false)

		const result: WorkflowCompletionHandlerResult = await workflowCompletionHandler({
			completedWorkflowId: "code-review.md",
			invokeInternalTool,
		})

		assert.strictEqual(result, "tool_failed")
	})

	it("returns tool_failed when the mapped internal tool invocation throws", async () => {
		workflowCompletionHandlerRegistry["example-workflow.md"] = {
			toolName: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE,
		}
		const invokeInternalTool = sinon.stub().rejects(new Error("boom"))

		const result: WorkflowCompletionHandlerResult = await workflowCompletionHandler({
			completedWorkflowId: "example-workflow.md",
			invokeInternalTool,
		})

		assert.strictEqual(result, "tool_failed")
	})
})
