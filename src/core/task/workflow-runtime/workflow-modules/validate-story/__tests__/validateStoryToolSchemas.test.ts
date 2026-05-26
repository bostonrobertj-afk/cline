import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { buildValidateStoryStep1ToolSchemas, VALIDATE_STORY_STEP_1_TOOL_IDS } from "../validateStoryToolSchemas"

const STEP_1_TOOL_NAMES: readonly string[] = [
	"read_file",
	"read_file_range",
	"list_files",
	"search_files",
	"list_code_definition_names",
	"execute_command",
	"send_user_message",
	"attempt_completion",
]

const FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[] = [
	"apply_patch",
	"write_to_file",
	"set_workflow_values",
	"workflow_progress_request",
	"ask_followup_question",
	"use_subagents",
	"create_workflow_artifact",
	"build_workflow_document",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"resolve_prerequisite_files",
	"resolve_existing_project_artifact",
	"validate_story_index_entry",
]

function schemaNames(schemas: readonly ClineToolSpec[]): readonly string[] {
	return schemas.map((schema) => schema.name)
}

function expectedSharedStep1ToolSpecs(): readonly ClineToolSpec[] {
	registerClineToolSets()
	return VALIDATE_STORY_STEP_1_TOOL_IDS.map((toolId) => {
		const tool = ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)
		if (tool === undefined) {
			throw new Error(`Missing shared/default tool schema for ${toolId}.`)
		}

		return tool.config
	})
}

describe("validateStoryToolSchemas", () => {
	it("exposes the exact Step 1 shared/default tool schema order", () => {
		expect(schemaNames(buildValidateStoryStep1ToolSchemas())).to.deep.equal(STEP_1_TOOL_NAMES)
	})

	it("uses shared default Step 1 tool specs without module-owned schema prose", () => {
		expect(buildValidateStoryStep1ToolSchemas()).to.deep.equal(expectedSharedStep1ToolSpecs())
	})

	it("uses only the approved Cline default tool ids for Step 1", () => {
		expect(VALIDATE_STORY_STEP_1_TOOL_IDS).to.deep.equal([
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.LIST_FILES,
			ClineDefaultTool.SEARCH,
			ClineDefaultTool.LIST_CODE_DEF,
			ClineDefaultTool.BASH,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
		])
	})

	it("does not expose forbidden model-facing tools", () => {
		const exposedToolNames = schemaNames(buildValidateStoryStep1ToolSchemas())

		for (const forbiddenToolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
			expect(exposedToolNames).not.to.include(forbiddenToolName)
		}
	})
})
