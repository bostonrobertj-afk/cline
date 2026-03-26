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

describe("placeholder workflow task progress prompt", () => {
	it("teaches checklist updates for placeholder workflows", async () => {
		const progress = await getUpdatingTaskProgress(variant, {
			...context,
			managedWorkflowActive: false,
			activeWorkflowSupportsPlaceholders: true,
		})

		expect(progress).to.contain("This is a placeholder workflow with a live checklist.")
		expect(progress).to.contain("use `set_workflow_placeholders` on that step's tool call")
		expect(progress).to.contain(
			"Use `task_progress` only as a checklist parameter on the next tool call, not a standalone tool.",
		)
	})
})

describe("generic task progress prompt", () => {
	it("teaches checklist creation and next-step completion semantics", async () => {
		const progress = await getUpdatingTaskProgress(variant, {
			...context,
			managedWorkflowActive: false,
		})

		expect(progress).to.contain(
			"Use `task_progress` only as a checklist parameter on the next tool call, not a standalone tool.",
		)
		expect(progress).to.contain("To create the list, pass a full Markdown checklist as the `task_progress` parameter.")
		expect(progress).to.contain(
			"Use `__COMPLETE_NEXT_STEP__` as the `task_progress` value to complete the next incomplete step.",
		)
	})
})
