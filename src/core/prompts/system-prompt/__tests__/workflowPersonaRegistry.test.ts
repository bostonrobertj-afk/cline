import { expect } from "chai"
import { describe, it } from "mocha"

import {
	resolveWorkflowPersonaId,
	resolveWorkflowPersonaInstructions,
	WORKFLOW_PERSONA_INSTRUCTIONS,
} from "../registry/workflowPersonaRegistry"

describe("workflowPersonaRegistry", () => {
	it("resolves pi-planning.md to the scrum-master persona id", () => {
		expect(resolveWorkflowPersonaId("pi-planning.md")).to.equal("scrum-master")
		expect(resolveWorkflowPersonaId("pi-planning")).to.equal("scrum-master")
	})

	it("resolves pi-planning.md to the existing scrum-master persona instructions", () => {
		expect(resolveWorkflowPersonaInstructions("pi-planning.md")).to.equal(WORKFLOW_PERSONA_INSTRUCTIONS["scrum-master"])
	})
})
