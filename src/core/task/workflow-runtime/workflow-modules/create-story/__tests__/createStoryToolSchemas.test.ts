import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import {
	buildCreateStoryStep1ToolSchemas,
	buildCreateStoryStep2ToolSchemas,
	buildCreateStoryStep3ToolSchemas,
	CREATE_STORY_STEP_2_TOOL_IDS,
	CREATE_STORY_STEP_3_TOOL_IDS,
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
	"use_subagents",
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
]

const CREATE_STORY_STEP_BUILDERS: readonly ToolSchemaBuilder[] = [
	buildCreateStoryStep1ToolSchemas,
	buildCreateStoryStep2ToolSchemas,
	buildCreateStoryStep3ToolSchemas,
]

function schemaNames(schemas: readonly ClineToolSpec[]): readonly string[] {
	return schemas.map((schema) => schema.name)
}

describe("createStoryToolSchemas", () => {
	it("exposes the exact Step 1 through Step 3 tool schema order", () => {
		expect(schemaNames(buildCreateStoryStep1ToolSchemas())).to.deep.equal(STEP_1_TOOL_NAMES)
		expect(schemaNames(buildCreateStoryStep2ToolSchemas())).to.deep.equal(STEP_2_TOOL_NAMES)
		expect(schemaNames(buildCreateStoryStep3ToolSchemas())).to.deep.equal(STEP_3_TOOL_NAMES)
		expect(schemaNames(buildCreateStoryStep3ToolSchemas())).not.to.include("workflow_progress_request")
		expect(schemaNames(buildCreateStoryStep3ToolSchemas())).to.include("use_subagents")
	})

	it("resolves create-story shared/default tool schemas through the registered tool set", () => {
		registerClineToolSets()
		const expectedStep2Schemas = CREATE_STORY_STEP_2_TOOL_IDS.map(
			(toolId) => ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)?.config,
		)
		const expectedStep3Schemas = CREATE_STORY_STEP_3_TOOL_IDS.map(
			(toolId) => ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)?.config,
		)

		expect(buildCreateStoryStep2ToolSchemas()).to.deep.equal(expectedStep2Schemas)
		expect(buildCreateStoryStep3ToolSchemas()).to.deep.equal(expectedStep3Schemas)
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
