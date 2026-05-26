import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import type { WorkflowPromptBuilderInput, WorkflowValues } from "../../../types"
import {
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

	it("builds the Step 3 brainstorming method lookup schema", () => {
		const schema = buildBrainstormingGetMethodsToolSchema()

		expect(schema.name).to.equal("get_brainstorming_methods")
		expect(schema.id).to.equal(ClineDefaultTool.GET_BRAINSTORMING_METHODS)
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

	it("keeps runtime-owned and non-model-facing tools out of model-facing brainstorming schemas", () => {
		const forbiddenToolNames = [
			"archive_workflow_artifact",
			"delete_workflow_artifact",
			"create_workflow_artifact",
			"build_workflow_document",
			"append_brainstorming_selected_technique",
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
