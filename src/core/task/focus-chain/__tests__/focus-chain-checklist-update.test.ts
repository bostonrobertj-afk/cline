import { expect } from "chai"
import { describe, it } from "mocha"
import { evaluateFocusChainChecklistUpdate, parseFocusChainChecklistItems } from "../file-utils"

describe("focus chain checklist update protection", () => {
	it("accepts same-shape updates and preserves the canonical item text", () => {
		const existing = "- [ ] Step 1: Gather Context\n- [x] Step 2: Review"
		const incoming = "- [x]  Step 1: Gather Context \n- [ ] Step 2: Review"

		const result = evaluateFocusChainChecklistUpdate(existing, incoming)

		expect(result.accepted).to.equal(true)
		expect(result.checklist).to.equal("- [x] Step 1: Gather Context\n- [ ] Step 2: Review")
	})

	it("accepts the next-step sentinel and marks only the first incomplete item complete", () => {
		const existing = "- [x] Step 1: Gather Context\n- [ ] Step 2: Review\n- [ ] Step 3: Ship"

		const result = evaluateFocusChainChecklistUpdate(existing, "__COMPLETE_NEXT_STEP__")

		expect(result.accepted).to.equal(true)
		expect(result.checklist).to.equal("- [x] Step 1: Gather Context\n- [x] Step 2: Review\n- [ ] Step 3: Ship")
	})

	it("rejects reordered items", () => {
		const existing = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"
		const incoming = "- [ ] Step 2: Review\n- [ ] Step 1: Gather Context"

		const result = evaluateFocusChainChecklistUpdate(existing, incoming)

		expect(result.accepted).to.equal(false)
		expect(result.feedback).to.contain("A task list already exists.")
		expect(result.feedback).to.contain(existing)
	})

	it("rejects renamed items", () => {
		const existing = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"
		const incoming = "- [ ] Step 1: Collect Context\n- [ ] Step 2: Review"

		const result = evaluateFocusChainChecklistUpdate(existing, incoming)

		expect(result.accepted).to.equal(false)
	})

	it("rejects added or removed items", () => {
		const existing = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"
		const added = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review\n- [ ] Step 3: Triage"
		const removed = "- [ ] Step 1: Gather Context"

		expect(evaluateFocusChainChecklistUpdate(existing, added).accepted).to.equal(false)
		expect(evaluateFocusChainChecklistUpdate(existing, removed).accepted).to.equal(false)
	})

	it("parses checklist items conservatively", () => {
		const parsed = parseFocusChainChecklistItems("- [ ] Step 1: Gather Context\n  - [x] Step 2: Review")

		expect(parsed).to.have.length(2)
		expect(parsed[0].normalizedLabel).to.equal("Step 1: Gather Context")
		expect(parsed[1].checked).to.equal(true)
	})
})
