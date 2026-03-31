import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import {
	deriveWorkflowFormControl,
	deriveWorkflowFormOptions,
	parseWorkflowFormRawValue,
	resolveWorkflowFormOneOfVariant,
	resolveWorkflowFormSchema,
} from "../schema"

describe("workflow-form schema helpers", () => {
	it("resolves set_workflow_placeholders additionalProperties as a string schema", () => {
		const schema = resolveWorkflowFormSchema(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS, {
			parameterName: "values",
			useAdditionalProperties: true,
		})

		expect(schema).to.deep.equal({ type: "string" })
	})

	it("resolves build_review_diff_output context_lines as an integer schema", () => {
		const schema = resolveWorkflowFormSchema(ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT, {
			parameterName: "context_lines",
		})

		expect(schema).to.deep.equal({ type: "integer" })
	})

	it("derives select control and options from an enum string schema", () => {
		const schema = { type: "string" as const, enum: ["commit", "commit_range"] }

		expect(deriveWorkflowFormControl(schema)).to.equal("select")
		expect(deriveWorkflowFormOptions(schema)).to.deep.equal([
			{ value: "commit", label: "commit" },
			{ value: "commit_range", label: "commit_range" },
		])
	})

	it("parses line-delimited string-array raw values", () => {
		const parsedValue = parseWorkflowFormRawValue(" src/a.ts \n\n src/b.ts ", {
			type: "array",
			items: { type: "string" },
		})

		expect(parsedValue).to.deep.equal(["src/a.ts", "src/b.ts"])
	})

	it("resolves build_review_diff_output source variants from oneOf by discriminator", () => {
		const sourceSchema = resolveWorkflowFormSchema(ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT, {
			parameterName: "source",
		})
		const variant = resolveWorkflowFormOneOfVariant(sourceSchema, "type", "commit_range")

		expect(variant).to.not.equal(undefined)
		expect(variant?.properties?.type?.const).to.equal("commit_range")
		expect(variant?.properties?.base?.type).to.equal("string")
		expect(variant?.properties?.head?.type).to.equal("string")
	})

	it("returns undefined for invalid integer raw values", () => {
		const parsedValue = parseWorkflowFormRawValue("12px", { type: "integer" })

		expect(parsedValue).to.equal(undefined)
	})
})
