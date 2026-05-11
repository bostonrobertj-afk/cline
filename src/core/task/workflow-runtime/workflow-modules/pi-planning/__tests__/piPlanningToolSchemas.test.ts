import { expect } from "chai"
import { describe, it } from "mocha"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import {
	buildPiPlanningStep1ToolSchemas,
	buildPiPlanningStep2ToolSchemas,
	buildPiPlanningStep3ToolSchemas,
	buildPiPlanningStep4ToolSchemas,
	buildPiPlanningStep5ToolSchemas,
	buildPiPlanningStep6ToolSchemas,
} from "../piPlanningToolSchemas"

type ToolSchemaBuilder = () => readonly ClineToolSpec[]

const STEP_2_TOOL_NAMES: readonly string[] = [
	"read_file",
	"send_user_message",
	"ask_followup_question",
	"workflow_progress_request",
]

const STEP_3_TOOL_NAMES: readonly string[] = [
	"list_files",
	"search_files",
	"list_code_definition_names",
	"read_file",
	"read_file_range",
	"send_user_message",
	"ask_followup_question",
	"workflow_progress_request",
]

const STEP_4_TOOL_NAMES: readonly string[] = [
	"read_file",
	"plan_story_artifacts",
	"set_workflow_values",
	"send_user_message",
	"ask_followup_question",
	"workflow_progress_request",
]

const STEP_5_TOOL_NAMES: readonly string[] = ["generate_story_files", "send_user_message", "ask_followup_question"]

const STEP_6_TOOL_NAMES: readonly string[] = [
	"list_files",
	"read_file",
	"apply_patch",
	"plan_story_artifacts",
	"generate_story_files",
	"send_user_message",
	"ask_followup_question",
	"attempt_completion",
]

const FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[] = [
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"execute_command",
]

const PI_PLANNING_STEP_BUILDERS: readonly ToolSchemaBuilder[] = [
	buildPiPlanningStep1ToolSchemas,
	buildPiPlanningStep2ToolSchemas,
	buildPiPlanningStep3ToolSchemas,
	buildPiPlanningStep4ToolSchemas,
	buildPiPlanningStep5ToolSchemas,
	buildPiPlanningStep6ToolSchemas,
]

function schemaNames(schemas: readonly ClineToolSpec[]): readonly string[] {
	return schemas.map((schema) => schema.name)
}

describe("piPlanningToolSchemas", () => {
	it("returns an empty canonical tool-schema array for runtime-driven Step 1", () => {
		expect(buildPiPlanningStep1ToolSchemas()).to.deep.equal([])
	})

	it("exposes the exact Step 2 through Step 6 tool schema order", () => {
		expect(schemaNames(buildPiPlanningStep2ToolSchemas())).to.deep.equal(STEP_2_TOOL_NAMES)
		expect(schemaNames(buildPiPlanningStep3ToolSchemas())).to.deep.equal(STEP_3_TOOL_NAMES)
		expect(schemaNames(buildPiPlanningStep4ToolSchemas())).to.deep.equal(STEP_4_TOOL_NAMES)
		expect(schemaNames(buildPiPlanningStep5ToolSchemas())).to.deep.equal(STEP_5_TOOL_NAMES)
		expect(schemaNames(buildPiPlanningStep6ToolSchemas())).to.deep.equal(STEP_6_TOOL_NAMES)
	})

	it("exposes set_workflow_values only in Step 4", () => {
		const step4ToolNames = schemaNames(buildPiPlanningStep4ToolSchemas())
		expect(step4ToolNames).to.include("set_workflow_values")

		const nonStep4Builders: readonly ToolSchemaBuilder[] = PI_PLANNING_STEP_BUILDERS.filter(
			(buildToolSchemas) => buildToolSchemas !== buildPiPlanningStep4ToolSchemas,
		)

		for (const buildToolSchemas of nonStep4Builders) {
			expect(schemaNames(buildToolSchemas())).not.to.include("set_workflow_values")
		}
	})

	it("restricts Step 4 set_workflow_values to the stories_index value key", () => {
		const setWorkflowValuesSchema = buildPiPlanningStep4ToolSchemas().find((schema) => schema.name === "set_workflow_values")
		if (setWorkflowValuesSchema === undefined) {
			throw new Error("Expected Step 4 to expose set_workflow_values")
		}

		const parameters = setWorkflowValuesSchema.parameters
		if (parameters === undefined) {
			throw new Error("Expected set_workflow_values to define parameters")
		}

		const valuesParameter = parameters.find((parameter) => parameter.name === "values")
		if (valuesParameter === undefined) {
			throw new Error("Expected set_workflow_values to define a values parameter")
		}

		expect(valuesParameter.required).to.equal(true)
		expect(valuesParameter.type).to.equal("object")
		expect(valuesParameter.properties).to.deep.equal({
			stories_index: { type: "string" },
		})
		expect(valuesParameter.requiredProperties).to.deep.equal(["stories_index"])
		expect(valuesParameter.additionalProperties).to.equal(false)
	})

	it("does not expose forbidden model-facing tools in any PI Planning step schema", () => {
		for (const buildToolSchemas of PI_PLANNING_STEP_BUILDERS) {
			const toolNames = schemaNames(buildToolSchemas())

			for (const forbiddenToolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
				expect(toolNames).not.to.include(forbiddenToolName)
			}
		}
	})
})
