import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import { hasAssistantResponseContent } from "../index"

describe("assistant response content detection", () => {
	it("does not treat native tool mode alone as assistant content", () => {
		assert.equal(hasAssistantResponseContent("", 0), false)
	})

	it("treats assistant text as content", () => {
		assert.equal(hasAssistantResponseContent("final answer", 0), true)
	})

	it("treats finalized tool calls as content", () => {
		assert.equal(hasAssistantResponseContent("", 1), true)
	})
})
