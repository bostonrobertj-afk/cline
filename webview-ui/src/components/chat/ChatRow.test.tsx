import { describe, expect, it } from "vitest"
import { getFollowupPresentation } from "./ChatRow"

describe("ChatRow followup presentation", () => {
	it("renders reopened followup messages as a passive thread label", () => {
		const presentation = getFollowupPresentation(undefined, true)

		expect(presentation.hasQuestion).to.equal(false)
		expect(presentation.title).to.equal("Conversation reopened:")
	})

	it("renders genuine follow-up questions with question framing", () => {
		const presentation = getFollowupPresentation(JSON.stringify({ question: "What should I do next?" }))

		expect(presentation.hasQuestion).to.equal(true)
		expect(presentation.title).to.equal("Cline has a question:")
		expect(presentation.question).to.equal("What should I do next?")
	})

	it("uses the active persona name for follow-up questions when available", () => {
		const presentation = getFollowupPresentation(JSON.stringify({ question: "What should I do next?" }), false, "Barry")

		expect(presentation.hasQuestion).to.equal(true)
		expect(presentation.title).to.equal("Barry has a question:")
	})
})
