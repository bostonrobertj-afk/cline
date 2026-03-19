import { expect } from "chai"
import { hasExplicitMentionSyntax, hasUserContentTag } from "./userContentProcessing"

describe("userContentProcessing", () => {
	it("detects user-content wrapper tags", () => {
		expect(hasUserContentTag("<feedback>hello</feedback>")).to.equal(true)
		expect(hasUserContentTag("plain text")).to.equal(false)
	})

	it("detects explicit mention syntax without relying on wrapper tags", () => {
		expect(hasExplicitMentionSyntax("<feedback>Please inspect @/src/index.ts</feedback>")).to.equal(true)
		expect(hasExplicitMentionSyntax("<feedback>No mention here</feedback>")).to.equal(false)
	})
})
