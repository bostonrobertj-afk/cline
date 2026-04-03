import { expect } from "chai"
import {
	appendPromptInjectionBlocksToSystemPrompt,
	isActiveDeterministicPlaceholderWorkflowEnabled,
	shouldIncludePersistentPromptContext,
} from "../index"

describe("shouldIncludePersistentPromptContext", () => {
	it("returns false when no workflow state is set", () => {
		expect(
			shouldIncludePersistentPromptContext({
				activeWorkflowId: undefined,
				activePlaceholderWorkflowId: undefined,
			}),
		).to.equal(false)
	})

	it("returns true when activeWorkflowId is present", () => {
		expect(
			shouldIncludePersistentPromptContext({
				activeWorkflowId: "bmad-quick-dev-new-preview",
				activePlaceholderWorkflowId: undefined,
			}),
		).to.equal(true)
	})

	it("returns true when activePlaceholderWorkflowId is present", () => {
		expect(
			shouldIncludePersistentPromptContext({
				activeWorkflowId: undefined,
				activePlaceholderWorkflowId: "code-review.md",
			}),
		).to.equal(true)
	})

	it("returns true for supported deterministic placeholder workflows based on activePlaceholderWorkflowSource", () => {
		expect(
			isActiveDeterministicPlaceholderWorkflowEnabled({
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "code-review.md",
					contents: "# Review Workflow",
				},
			} as any),
		).to.equal(true)
	})

	it("returns false when the active placeholder workflow source is missing or unsupported", () => {
		expect(
			isActiveDeterministicPlaceholderWorkflowEnabled({
				activePlaceholderWorkflowSource: undefined,
			} as any),
		).to.equal(false)

		expect(
			isActiveDeterministicPlaceholderWorkflowEnabled({
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "unsupported-placeholder-workflow.md",
					contents: "# Review Workflow",
				},
			} as any),
		).to.equal(false)
	})

	it("appends runtime prompt injection blocks to the system prompt with blank-line separators", () => {
		const result = appendPromptInjectionBlocksToSystemPrompt("BASE SYSTEM PROMPT", [
			{ type: "text", text: "ENVIRONMENT: reduced" },
			{ type: "text", text: "### Reminder:\nCurrent Progress: 0/2 items completed" },
		] as any)

		expect(result).to.equal(
			"BASE SYSTEM PROMPT\n\nENVIRONMENT: reduced\n\n### Reminder:\nCurrent Progress: 0/2 items completed",
		)
	})

	it("leaves the system prompt unchanged when there are no runtime prompt injection blocks", () => {
		expect(appendPromptInjectionBlocksToSystemPrompt("BASE SYSTEM PROMPT", [])).to.equal("BASE SYSTEM PROMPT")
	})
})
