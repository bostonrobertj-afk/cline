import { expect } from "chai"
import { describe, it } from "mocha"
import { ModelFamily } from "@/shared/prompts"
import { getUpdatingTaskProgress } from "../components/task_progress"
import type { PromptVariant, SystemPromptContext } from "../types"

const variant: PromptVariant = {
	id: "generic-test",
	version: 1,
	tags: [],
	labels: {},
	family: ModelFamily.GENERIC,
	description: "test",
	matcher: () => true,
	config: {},
	baseTemplate: "",
	componentOrder: [],
	componentOverrides: {},
	placeholders: {},
}

const context: SystemPromptContext = {
	cwd: "/workspace/project",
	ide: "TestIde",
	providerInfo: { providerId: "test", model: { id: "test-model", info: { supportsPromptCache: false } }, mode: "act" },
	isTesting: true,
	focusChainSettings: { enabled: true, remindClineInterval: 6 },
	managedWorkflowActive: true,
}

describe("managed workflow task progress prompt", () => {
	it("directs managed workflows to use backend-managed completion instead of manual checklist edits", async () => {
		const progress = await getUpdatingTaskProgress(variant, context)

		expect(progress).to.be.a("string")
		expect(progress).to.contain("complete_workflow_item")
		expect(progress).to.contain("task_progress")
		expect(progress).to.not.contain("__COMPLETE_NEXT_STEP__")
	})
})

describe("placeholder workflow task progress prompt", () => {
	it("teaches deterministic runtime auto-completion for supported placeholder workflows", async () => {
		const progress = await getUpdatingTaskProgress(variant, {
			...context,
			managedWorkflowActive: false,
			activeWorkflowSupportsPlaceholders: true,
			activeDeterministicPlaceholderWorkflowEnabled: true,
		})

		expect(progress).to.equal(undefined)
	})

	it("teaches checklist updates for placeholder workflows", async () => {
		const progress = await getUpdatingTaskProgress(variant, {
			...context,
			managedWorkflowActive: false,
			activeWorkflowSupportsPlaceholders: true,
			activeDeterministicPlaceholderWorkflowEnabled: false,
		})

		expect(progress).to.be.a("string")
		expect(progress).to.contain("send_user_message")
		expect(progress).to.contain("task_progress")
		expect(progress).to.contain("__COMPLETE_NEXT_STEP__")
	})

	it("teaches workflow_progress_request for create-prd step 3", async () => {
		const progress = await getUpdatingTaskProgress(variant, {
			...context,
			managedWorkflowActive: false,
			activeWorkflowSupportsPlaceholders: true,
			activeDeterministicPlaceholderWorkflowEnabled: false,
			activePlaceholderWorkflowName: "create-prd.md",
			activePlaceholderWorkflowStepNumber: 3,
		})

		expect(progress).to.be.a("string")
		expect(progress).to.contain("workflow_progress_request")
		expect(progress).to.not.contain("send_user_message")
		expect(progress).to.contain("Do not include `task_progress` on `workflow_progress_request`")
	})

	it("teaches workflow_progress_request for create-epics step 3 even when the workflow is deterministic", async () => {
		const progress = await getUpdatingTaskProgress(variant, {
			...context,
			managedWorkflowActive: false,
			activeWorkflowSupportsPlaceholders: true,
			activeDeterministicPlaceholderWorkflowEnabled: true,
			activePlaceholderWorkflowName: "create-epics.md",
			activePlaceholderWorkflowStepNumber: 3,
		})

		expect(progress).to.be.a("string")
		expect(progress).to.contain("workflow_progress_request")
		expect(progress).to.not.contain("send_user_message")
		expect(progress).to.contain("Do not include `task_progress` on `workflow_progress_request`")
	})

	it("teaches workflow_progress_request for pi-planning step 4 even when the workflow is deterministic", async () => {
		const progress = await getUpdatingTaskProgress(variant, {
			...context,
			managedWorkflowActive: false,
			activeWorkflowSupportsPlaceholders: true,
			activeDeterministicPlaceholderWorkflowEnabled: true,
			activePlaceholderWorkflowName: "pi-planning.md",
			activePlaceholderWorkflowStepNumber: 4,
		})

		expect(progress).to.be.a("string")
		expect(progress).to.contain("workflow_progress_request")
		expect(progress).to.not.contain("send_user_message")
		expect(progress).to.contain("Do not include `task_progress` on `workflow_progress_request`")
	})
})

describe("generic task progress prompt", () => {
	it("teaches checklist creation and next-step completion semantics", async () => {
		const progress = await getUpdatingTaskProgress(variant, {
			...context,
			managedWorkflowActive: false,
		})

		expect(progress).to.be.a("string")
		expect(progress).to.contain("task_progress")
		expect(progress).to.contain("__COMPLETE_NEXT_STEP__")
		expect(progress).to.not.contain("send_user_message")
	})
})
