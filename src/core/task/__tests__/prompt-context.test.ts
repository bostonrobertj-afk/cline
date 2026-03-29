import { expect } from "chai"
import { isActiveDeterministicPlaceholderWorkflowEnabled, shouldIncludePersistentPromptContext } from "../index"

describe("shouldIncludePersistentPromptContext", () => {
	it("returns false when no active BMAD agent or workflow is set", () => {
		expect(
			shouldIncludePersistentPromptContext({
				activeAgentId: undefined,
				activeWorkflowId: undefined,
			}),
		).to.equal(false)
	})

	it("returns true when an active BMAD agent is set", () => {
		expect(
			shouldIncludePersistentPromptContext({
				activeAgentId: "bmad-quick-flow-solo-dev",
				activeWorkflowId: undefined,
			}),
		).to.equal(true)
	})

	it("returns true when an active BMAD workflow is set", () => {
		expect(
			shouldIncludePersistentPromptContext({
				activeAgentId: undefined,
				activeWorkflowId: "bmad-quick-dev-new-preview",
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
					name: "review-edge-case-hunter.md",
					contents: "# Review Workflow",
				},
			} as any),
		).to.equal(false)
	})
})
