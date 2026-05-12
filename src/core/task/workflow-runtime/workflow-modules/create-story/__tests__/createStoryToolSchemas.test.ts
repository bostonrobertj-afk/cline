import { expect } from "chai"
import { describe, it } from "mocha"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import {
	buildCreateStoryStep1ToolSchemas,
	buildCreateStoryStep2ToolSchemas,
	buildCreateStoryStep3ToolSchemas,
	buildCreateStoryStep4ToolSchemas,
} from "../createStoryToolSchemas"

type ToolSchemaBuilder = () => readonly ClineToolSpec[]

const STEP_1_TOOL_NAMES: readonly string[] = []

const STEP_2_TOOL_NAMES: readonly string[] = [
	"read_file",
	"send_user_message",
	"ask_followup_question",
	"workflow_progress_request",
	"apply_patch",
	"list_files",
	"search_files",
	"list_code_definition_names",
	"read_file_range",
]

const STEP_3_TOOL_NAMES: readonly string[] = [
	"list_files",
	"search_files",
	"list_code_definition_names",
	"read_file",
	"read_file_range",
	"apply_patch",
	"send_user_message",
	"ask_followup_question",
	"workflow_progress_request",
]

const STEP_4_TOOL_NAMES: readonly string[] = [
	"read_file",
	"read_file_range",
	"apply_patch",
	"send_user_message",
	"ask_followup_question",
	"attempt_completion",
]

const FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[] = [
	"set_workflow_values",
	"plan_story_artifacts",
	"plan_remediation_story_artifact",
	"generate_story_files",
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"update_story_index_status",
	"execute_command",
]

const CREATE_STORY_STEP_BUILDERS: readonly ToolSchemaBuilder[] = [
	buildCreateStoryStep1ToolSchemas,
	buildCreateStoryStep2ToolSchemas,
	buildCreateStoryStep3ToolSchemas,
	buildCreateStoryStep4ToolSchemas,
]

function schemaNames(schemas: readonly ClineToolSpec[]): readonly string[] {
	return schemas.map((schema) => schema.name)
}

describe("createStoryToolSchemas", () => {
	it("exposes the exact Step 1 through Step 4 tool schema order", () => {
		expect(schemaNames(buildCreateStoryStep1ToolSchemas())).to.deep.equal(STEP_1_TOOL_NAMES)
		expect(schemaNames(buildCreateStoryStep2ToolSchemas())).to.deep.equal(STEP_2_TOOL_NAMES)
		expect(schemaNames(buildCreateStoryStep3ToolSchemas())).to.deep.equal(STEP_3_TOOL_NAMES)
		expect(schemaNames(buildCreateStoryStep4ToolSchemas())).to.deep.equal(STEP_4_TOOL_NAMES)
	})

	it("does not expose forbidden backend-only or runtime-owned tools in any create-story step schema", () => {
		for (const buildToolSchemas of CREATE_STORY_STEP_BUILDERS) {
			const toolNames = schemaNames(buildToolSchemas())

			for (const forbiddenToolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
				expect(toolNames).not.to.include(forbiddenToolName)
			}
		}
	})
})
