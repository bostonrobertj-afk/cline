import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import {
	buildBrainstormingAppendSelectedTechniqueToolSchema,
	buildBrainstormingAttemptCompletionToolSchema,
	buildBrainstormingBuildWorkflowDocumentToolSchema,
	buildBrainstormingGetMethodsToolSchema,
	buildBrainstormingStep3ChooseOrRandomToolSchemas,
	buildBrainstormingStep3SetWorkflowValuesToolSchema,
	buildBrainstormingStep3SuggestToolSchemas,
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

	it("builds schemas for the Phase 3 suggestion-only brainstorming tools", () => {
		const schemas = [buildBrainstormingGetMethodsToolSchema(), buildBrainstormingAppendSelectedTechniqueToolSchema()]

		expect(schemas.map((schema) => schema.name)).to.deep.equal([
			"get_brainstorming_methods",
			"append_brainstorming_selected_technique",
		])
		expect(schemas.map((schema) => schema.id)).to.deep.equal([
			ClineDefaultTool.GET_BRAINSTORMING_METHODS,
			ClineDefaultTool.APPEND_BRAINSTORMING_SELECTED_TECHNIQUE,
		])

		const appendSchema = buildBrainstormingAppendSelectedTechniqueToolSchema()
		if (appendSchema.parameters === undefined) {
			throw new Error("Expected append_brainstorming_selected_technique parameters.")
		}
		expect(appendSchema.parameters.map((parameter) => [parameter.name, parameter.required])).to.deep.equal([
			["name", true],
			["description", true],
			["id", false],
			["category", false],
		])
	})

	it("exposes suggestion-only tools for Step 3 suggest and omits them for choose/random", () => {
		const suggestToolNames = buildBrainstormingStep3SuggestToolSchemas().map((schema) => schema.name)
		const chooseOrRandomToolNames = buildBrainstormingStep3ChooseOrRandomToolSchemas().map((schema) => schema.name)

		expect(suggestToolNames).to.deep.equal([
			"get_brainstorming_methods",
			"append_brainstorming_selected_technique",
			"build_workflow_document",
			"workflow_progress_request",
		])
		expect(chooseOrRandomToolNames).to.deep.equal([
			"build_workflow_document",
			"set_workflow_values",
			"workflow_progress_request",
		])
		expect(chooseOrRandomToolNames).not.to.include("get_brainstorming_methods")
		expect(chooseOrRandomToolNames).not.to.include("append_brainstorming_selected_technique")
	})
})
