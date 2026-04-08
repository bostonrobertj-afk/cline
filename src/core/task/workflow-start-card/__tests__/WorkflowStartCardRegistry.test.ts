import { expect } from "chai"
import { describe, it } from "mocha"
import { buildWorkflowStartCardPayload } from "../buildWorkflowStartCardPayload"
import { getWorkflowStartCardRegistryEntry } from "../WorkflowStartCardRegistry"

describe("workflow-start-card/WorkflowStartCardRegistry", () => {
	it("returns the quick-spec registry entry with the approved markdown body", () => {
		const entry = getWorkflowStartCardRegistryEntry("quick-spec.md")

		expect(entry?.workflowName).to.equal("quick-spec.md")
		expect(entry?.markdownBody).to.equal(
			"In this workflow you will build a small implementation-ready tech spec through guided discovery, scoped planning, and a final review pass. You'll define the objective, solution, scope, context, acceptance criteria, seams, and executable tasks needed for quick implementation.",
		)
	})

	it("builds workflow-start-card payloads with generated titles and the fixed CTA label", () => {
		const quickSpecPayload = buildWorkflowStartCardPayload({
			sessionId: "session-quick-spec",
			workflowName: "quick-spec.md",
			markdownBody: "Quick spec body",
		})
		const createStoryPayload = buildWorkflowStartCardPayload({
			sessionId: "session-create-story",
			workflowName: "create-story.md",
			markdownBody: "Create story body",
		})

		expect(quickSpecPayload.title).to.equal("Welcome to the Quick Spec Workflow!")
		expect(createStoryPayload.title).to.equal("Welcome to the Create Story Workflow!")
		expect(quickSpecPayload.ctaLabel).to.equal("Get Started")
	})
})
