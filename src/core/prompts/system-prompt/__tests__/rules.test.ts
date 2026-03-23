import { expect } from "chai"
import { describe, it } from "mocha"
import { ModelFamily } from "@/shared/prompts"
import { getRulesSection } from "../components/rules"
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
}

describe("rules prompt contract", () => {
	it("frames follow-up questions as normal collaboration", async () => {
		const rules = await getRulesSection(variant, context)

		expect(rules).to.contain(
			"Use the ask_followup_question tool when a direct answer from the user would improve correctness",
		)
		expect(rules).to.contain("clarifying dialogue as a normal part of collaboration rather than an exceptional fallback")
	})
})
