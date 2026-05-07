import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import type { WorkflowPromptBuilderInput, WorkflowValues } from "../../../types"
import {
	buildBrainstormingAppendSelectedTechniqueToolSchema,
	buildBrainstormingGetMethodsToolSchema,
	buildBrainstormingStep1ToolSchemas,
	buildBrainstormingStep2ToolSchemas,
	buildBrainstormingStep3ToolSchemas,
	buildBrainstormingStep4ToolSchemas,
} from "../brainstormingToolSchemas"

function createPromptInput(workflowValues: WorkflowValues): WorkflowPromptBuilderInput {
	return {
		session: { workflowValues },
	} as WorkflowPromptBuilderInput
}

describe("brainstormingToolSchemas", () => {
	it("returns empty canonical tool-schema arrays for runtime-driven Step 1 and Step 2", () => {
		expect(buildBrainstormingStep1ToolSchemas()).to.deep.equal([])
		expect(buildBrainstormingStep2ToolSchemas()).to.deep.equal([])
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

	it("exposes exact Step 3 and Step 4 active-step tool schemas", () => {
		const suggestToolNames = buildBrainstormingStep3ToolSchemas(
			createPromptInput({ selected_approach: "I want you to suggest a technique" }),
		).map((schema) => schema.name)
		const chooseToolNames = buildBrainstormingStep3ToolSchemas(
			createPromptInput({ selected_approach: "I want to choose" }),
		).map((schema) => schema.name)
		const randomToolNames = buildBrainstormingStep3ToolSchemas(
			createPromptInput({ selected_approach: "I want a random technique" }),
		).map((schema) => schema.name)
		const step4ToolNames = buildBrainstormingStep4ToolSchemas().map((schema) => schema.name)
		const approvedStep3ToolNames = [
			"get_brainstorming_methods",
			"append_brainstorming_selected_technique",
			"read_file",
			"apply_patch",
			"send_user_message",
			"ask_followup_question",
			"workflow_progress_request",
		]

		expect(suggestToolNames).to.deep.equal(approvedStep3ToolNames)
		expect(chooseToolNames).to.deep.equal(approvedStep3ToolNames)
		expect(randomToolNames).to.deep.equal(approvedStep3ToolNames)
		expect(step4ToolNames).to.deep.equal([
			"read_file",
			"apply_patch",
			"send_user_message",
			"ask_followup_question",
			"attempt_completion",
		])
	})

	it("keeps runtime-owned artifact tools out of model-facing brainstorming schemas", () => {
		const forbiddenToolNames = [
			"archive_workflow_artifact",
			"delete_workflow_artifact",
			"create_workflow_artifact",
			"build_workflow_document",
		]
		const modelFacingToolNames = [
			...buildBrainstormingStep3ToolSchemas(
				createPromptInput({ selected_approach: "I want you to suggest a technique" }),
			).map((schema) => schema.name),
			...buildBrainstormingStep3ToolSchemas(createPromptInput({ selected_approach: "I want to choose" })).map(
				(schema) => schema.name,
			),
			...buildBrainstormingStep3ToolSchemas(createPromptInput({ selected_approach: "I want a random technique" })).map(
				(schema) => schema.name,
			),
			...buildBrainstormingStep4ToolSchemas().map((schema) => schema.name),
		]

		for (const forbiddenToolName of forbiddenToolNames) {
			expect(modelFacingToolNames).not.to.include(forbiddenToolName)
		}
	})
})
