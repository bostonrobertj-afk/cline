import { expect } from "chai"
import { describe, it } from "mocha"
import { parseWorkflowStepStatusLine } from "./focus-chain-utils"

describe("parseWorkflowStepStatusLine", () => {
	it("parses the canonical numbered workflow-step statuses", () => {
		expect(parseWorkflowStepStatusLine("1. Gather Inputs - Complete")).to.deep.equal({
			stepNumber: 1,
			checklistLabel: "Gather Inputs",
			status: "Complete",
		})
		expect(parseWorkflowStepStatusLine("2. Perform Work - Active")).to.deep.equal({
			stepNumber: 2,
			checklistLabel: "Perform Work",
			status: "Active",
		})
		expect(parseWorkflowStepStatusLine("3. Finalize - Not Started")).to.deep.equal({
			stepNumber: 3,
			checklistLabel: "Finalize",
			status: "Not Started",
		})
	})

	it("trims surrounding whitespace without accepting noncanonical line grammar", () => {
		expect(parseWorkflowStepStatusLine(" \t2. Perform Work - Active\n ")).to.deep.equal({
			stepNumber: 2,
			checklistLabel: "Perform Work",
			status: "Active",
		})
		for (const line of [
			"0. Invalid - Active",
			"1.Gather Inputs - Complete",
			"1. Gather Inputs (Complete)",
			"1. Gather Inputs - Pending",
			"- [x] Gather Inputs",
			"",
			"Unrelated prose",
		]) {
			expect(parseWorkflowStepStatusLine(line)).to.equal(null)
		}
	})
})
