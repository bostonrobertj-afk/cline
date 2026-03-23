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
	it("labels human-authored input separately from system-generated context", async () => {
		const progress = await getUpdatingTaskProgress(variant, context)

		expect(progress).to.contain("Human-authored input:")
		expect(progress).to.contain("System-generated context:")
		expect(progress).to.contain("complete_workflow_item")
	})
})
