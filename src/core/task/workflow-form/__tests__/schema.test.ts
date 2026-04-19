import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import {
	convertWorkflowFormSubmittedValueToToolInput,
	deriveWorkflowFormFieldKind,
	deriveWorkflowFormOptions,
	normalizeWorkflowFormSubmittedValue,
	resolveWorkflowFormSchema,
	validateWorkflowFormSubmittedValueAgainstSchema,
} from "../schema"

describe("workflow-form schema helpers", () => {
	it("resolves set_workflow_values additionalProperties as a string schema", () => {
		const schema = resolveWorkflowFormSchema(ClineDefaultTool.SET_WORKFLOW_VALUES, {
			parameterName: "values",
			useAdditionalProperties: true,
		})

		expect(schema).to.deep.equal({ type: "string" })
	})

	it("derives dropdown field kind and options from enum string schemas", () => {
		const schema = { type: "string" as const, enum: ["commit", "commit_range"] }

		expect(deriveWorkflowFormFieldKind(schema)).to.equal("dropdown")
		expect(deriveWorkflowFormOptions(schema)).to.deep.equal([
			{ value: "commit", label: "commit" },
			{ value: "commit_range", label: "commit_range" },
		])
	})

	it("normalizes boolean submissions into typed workflow-form values", () => {
		const normalizedValue = normalizeWorkflowFormSubmittedValue({
			booleanValue: true,
		})

		expect(normalizedValue).to.deep.equal({
			valueType: "boolean",
			booleanValue: true,
		})
		expect(convertWorkflowFormSubmittedValueToToolInput(normalizedValue)).to.equal(true)
	})

	it("normalizes integer submissions into typed workflow-form values", () => {
		const normalizedValue = normalizeWorkflowFormSubmittedValue({
			integerValue: 12,
		})

		expect(normalizedValue).to.deep.equal({
			valueType: "integer",
			integerValue: 12,
		})
		expect(convertWorkflowFormSubmittedValueToToolInput(normalizedValue)).to.equal(12)
	})

	it("normalizes number submissions into typed workflow-form values", () => {
		const normalizedValue = normalizeWorkflowFormSubmittedValue({
			numberValue: 3.14,
		})

		expect(normalizedValue).to.deep.equal({
			valueType: "number",
			numberValue: 3.14,
		})
		expect(convertWorkflowFormSubmittedValueToToolInput(normalizedValue)).to.equal(3.14)
	})

	it("normalizes string-array submissions into canonical arrays", () => {
		const normalizedValue = normalizeWorkflowFormSubmittedValue({
			arrayValue: {
				values: [{ stringValue: "src/a.ts" }, { stringValue: "src/b.ts" }],
			},
		})

		expect(normalizedValue).to.deep.equal({
			valueType: "array",
			arrayValue: [
				{ valueType: "string", stringValue: "src/a.ts" },
				{ valueType: "string", stringValue: "src/b.ts" },
			],
		})
		expect(convertWorkflowFormSubmittedValueToToolInput(normalizedValue)).to.deep.equal(["src/a.ts", "src/b.ts"])
	})

	it("normalizes object submissions into canonical objects", () => {
		const normalizedValue = normalizeWorkflowFormSubmittedValue({
			objectValue: {
				entries: [
					{
						key: "base",
						value: { stringValue: "main" },
					},
					{
						key: "head",
						value: { stringValue: "feature" },
					},
				],
			},
		})

		expect(normalizedValue).to.deep.equal({
			valueType: "object",
			objectValue: [
				{
					key: "base",
					value: { valueType: "string", stringValue: "main" },
				},
				{
					key: "head",
					value: { valueType: "string", stringValue: "feature" },
				},
			],
		})
		expect(convertWorkflowFormSubmittedValueToToolInput(normalizedValue)).to.deep.equal({
			base: "main",
			head: "feature",
		})
	})

	it("validates structured object submissions against required schema properties", () => {
		const submittedValue = normalizeWorkflowFormSubmittedValue({
			objectValue: {
				entries: [
					{
						key: "base",
						value: { stringValue: "main" },
					},
				],
			},
		})

		expect(
			validateWorkflowFormSubmittedValueAgainstSchema(submittedValue, {
				type: "object",
				required: ["base", "head"],
				properties: {
					base: { type: "string" },
					head: { type: "string" },
				},
			}),
		).to.equal(false)
	})
})
