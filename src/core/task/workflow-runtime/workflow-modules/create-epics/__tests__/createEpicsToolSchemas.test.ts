import { expect } from "chai"
import { describe, it } from "mocha"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { buildCreateEpicsStep1ToolSchemas, buildCreateEpicsStep2ToolSchemas } from "../createEpicsToolSchemas"

const STEP_2_TOOL_NAMES = [
	"read_file",
	"upsert_epic",
	"send_user_message",
	"ask_followup_question",
	"attempt_completion",
] as const

const FORBIDDEN_STEP_2_TOOL_NAMES = [
	"build_workflow_document",
	"apply_patch",
	"set_workflow_values",
	"workflow_progress_request",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
] as const

function schemaNames(schemas: readonly ClineToolSpec[]): readonly string[] {
	return schemas.map((schema) => schema.name)
}

describe("createEpicsToolSchemas", () => {
	it("returns an empty canonical tool-schema array for runtime-driven Step 1", () => {
		expect(buildCreateEpicsStep1ToolSchemas()).to.deep.equal([])
	})

	it("exposes the exact Step 2 tool schema order", () => {
		expect(schemaNames(buildCreateEpicsStep2ToolSchemas())).to.deep.equal(STEP_2_TOOL_NAMES)
	})

	it("does not expose forbidden runtime or edit tools in Step 2", () => {
		const step2ToolNames = schemaNames(buildCreateEpicsStep2ToolSchemas())

		for (const forbiddenToolName of FORBIDDEN_STEP_2_TOOL_NAMES) {
			expect(step2ToolNames).not.to.include(forbiddenToolName)
		}
	})
})
