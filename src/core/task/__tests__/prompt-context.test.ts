import { expect } from "chai"
import { shouldIncludePersistentPromptContext } from "../index"

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
})
