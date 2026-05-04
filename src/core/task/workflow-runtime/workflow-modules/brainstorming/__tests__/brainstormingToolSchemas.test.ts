import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import {
	buildBrainstormingAttemptCompletionToolSchema,
	buildBrainstormingBuildWorkflowDocumentToolSchema,
	buildBrainstormingStep3SetWorkflowValuesToolSchema,
	buildBrainstormingWorkflowProgressRequestToolSchema,
} from "../brainstormingToolSchemas"

describe("brainstormingToolSchemas", () => {
	it("builds the Phase 2 helper surface for existing workflow tools", () => {
		const schemas = [
			buildBrainstormingBuildWorkflowDocumentToolSchema(),
			buildBrainstormingWorkflowProgressRequestToolSchema(),
			buildBrainstormingStep3SetWorkflowValuesToolSchema(),
			buildBrainstormingAttemptCompletionToolSchema(),
		]

		expect(schemas.map((schema) => schema.name)).to.deep.equal([
			"build_workflow_document",
			"workflow_progress_request",
			"set_workflow_values",
			"attempt_completion",
		])
		expect(schemas.map((schema) => schema.id)).to.deep.equal([
			ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			ClineDefaultTool.SET_WORKFLOW_VALUES,
			ClineDefaultTool.ATTEMPT,
		])
	})

	it("exposes only techniques_used and ideas_generated through Step 3 set_workflow_values", () => {
		const schema = buildBrainstormingStep3SetWorkflowValuesToolSchema()
		const valuesParameter = schema.parameters?.find((parameter) => parameter.name === "values")

		expect(valuesParameter).to.not.equal(undefined)
		if (valuesParameter === undefined) {
			throw new Error("Expected values parameter in Step 3 set_workflow_values schema.")
		}

		expect(valuesParameter.properties).to.deep.equal({
			techniques_used: {
				type: "array",
				items: { type: "string" },
				description: "Brainstorming techniques used during the session.",
			},
			ideas_generated: {
				type: "array",
				items: { type: "string" },
				description: "Ideas generated during the session.",
			},
		})
		expect(JSON.stringify(valuesParameter)).not.to.include("selected_techniques")
		expect(valuesParameter.additionalProperties).to.equal(false)
	})
})
