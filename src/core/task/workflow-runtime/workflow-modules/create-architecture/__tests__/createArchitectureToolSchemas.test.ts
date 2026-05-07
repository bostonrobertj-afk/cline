import { expect } from "chai"
import { describe, it } from "mocha"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import {
	buildCreateArchitectureStep1ToolSchemas,
	buildCreateArchitectureStep2ToolSchemas,
	buildCreateArchitectureStep3ToolSchemas,
	buildCreateArchitectureStep4ToolSchemas,
	buildCreateArchitectureStep5ToolSchemas,
	buildCreateArchitectureStep6ToolSchemas,
	buildCreateArchitectureStep7ToolSchemas,
	buildCreateArchitectureStep8ToolSchemas,
	buildCreateArchitectureStep9ToolSchemas,
} from "../createArchitectureToolSchemas"

type ToolSchemaBuilder = () => readonly ClineToolSpec[]

const STEP_3_TOOL_NAMES = [
	"read_file",
	"apply_patch",
	"send_user_message",
	"ask_followup_question",
	"workflow_progress_request",
] as const

const STEP_4_THROUGH_STEP_8_TOOL_NAMES = [
	"list_files",
	"search_files",
	"list_code_definition_names",
	"read_file",
	"read_file_range",
	"apply_patch",
	"send_user_message",
	"ask_followup_question",
	"workflow_progress_request",
] as const

const STEP_9_TOOL_NAMES = [
	"read_file",
	"apply_patch",
	"send_user_message",
	"ask_followup_question",
	"attempt_completion",
] as const

const PROHIBITED_TOOL_NAMES = [
	"create_workflow_artifact",
	"build_workflow_document",
	"set_workflow_values",
	"execute_command",
] as const

function schemaNames(schemas: readonly ClineToolSpec[]): readonly string[] {
	return schemas.map((schema) => schema.name)
}

describe("createArchitectureToolSchemas", () => {
	it("returns empty canonical tool-schema arrays for runtime-driven Step 1 and Step 2", () => {
		expect(buildCreateArchitectureStep1ToolSchemas()).to.deep.equal([])
		expect(buildCreateArchitectureStep2ToolSchemas()).to.deep.equal([])
	})

	it("exposes the exact Step 3 tool schema order", () => {
		expect(schemaNames(buildCreateArchitectureStep3ToolSchemas())).to.deep.equal(STEP_3_TOOL_NAMES)
	})

	it("exposes the exact Step 4 through Step 8 tool schema order", () => {
		const stepBuilders: readonly ToolSchemaBuilder[] = [
			buildCreateArchitectureStep4ToolSchemas,
			buildCreateArchitectureStep5ToolSchemas,
			buildCreateArchitectureStep6ToolSchemas,
			buildCreateArchitectureStep7ToolSchemas,
			buildCreateArchitectureStep8ToolSchemas,
		]

		for (const buildToolSchemas of stepBuilders) {
			expect(schemaNames(buildToolSchemas())).to.deep.equal(STEP_4_THROUGH_STEP_8_TOOL_NAMES)
		}
	})

	it("exposes the exact Step 9 completion tool schema order", () => {
		expect(schemaNames(buildCreateArchitectureStep9ToolSchemas())).to.deep.equal(STEP_9_TOOL_NAMES)
	})

	it("does not expose prohibited runtime or command tools in any step schema", () => {
		const stepBuilders: readonly ToolSchemaBuilder[] = [
			buildCreateArchitectureStep1ToolSchemas,
			buildCreateArchitectureStep2ToolSchemas,
			buildCreateArchitectureStep3ToolSchemas,
			buildCreateArchitectureStep4ToolSchemas,
			buildCreateArchitectureStep5ToolSchemas,
			buildCreateArchitectureStep6ToolSchemas,
			buildCreateArchitectureStep7ToolSchemas,
			buildCreateArchitectureStep8ToolSchemas,
			buildCreateArchitectureStep9ToolSchemas,
		]

		for (const buildToolSchemas of stepBuilders) {
			const toolNames = schemaNames(buildToolSchemas())
			for (const prohibitedToolName of PROHIBITED_TOOL_NAMES) {
				expect(toolNames).not.to.include(prohibitedToolName)
			}
		}
	})
})
