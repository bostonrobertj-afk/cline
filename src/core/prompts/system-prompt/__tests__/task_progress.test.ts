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

		expect(progress).to.contain("The current checklist was built for you by the user at the beginning of the conversation.")
		expect(progress).to.contain("complete_workflow_item")
		expect(progress).to.contain("task_progress is rendered based on the user's provided steps")
	})
})

describe("generic task progress prompt", () => {
	it("explains checklist-shape preservation and checkbox progression semantics", async () => {
		const progress = await getUpdatingTaskProgress(variant, {
			...context,
			managedWorkflowActive: false,
		})

		expect(progress).to.contain("On each update, include the full current checklist.")
		expect(progress).to.contain("Keep the same checklist items in the same order; only checkbox states should change.")
		expect(progress).to.contain('Mark completed items by changing only those lines from "- [ ]" to "- [x]".')
	})
})
