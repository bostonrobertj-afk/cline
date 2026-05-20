import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import {
	buildCorrectCourseStep1ToolSchemas,
	buildCorrectCourseStep2ToolSchemas,
	buildCorrectCourseStep3ToolSchemas,
	CORRECT_COURSE_STEP_3_TOOL_IDS,
} from "../correctCourseToolSchemas"

const STEP_3_TOOL_NAMES: readonly string[] = [
	"list_files",
	"search_files",
	"list_code_definition_names",
	"read_file",
	"read_file_range",
	"apply_patch",
	"write_to_file",
	"send_user_message",
	"attempt_completion",
]

const FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[] = [
	"execute_command",
	"replace_in_file",
	"web_search",
	"web_fetch",
	"browser_action",
	"ask_followup_question",
	"use_subagents",
	"use_skill",
	"set_workflow_values",
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"update_story_index_status",
	"workflow_progress_request",
	"use_mcp_tool",
	"access_mcp_resource",
	"load_mcp_documentation",
	"plan_story_artifacts",
	"plan_remediation_story_artifact",
	"generate_story_files",
	"build_review_input",
	"build_review_diff_output",
	"code_review_spec_update",
	"record_findings",
]

function schemaNames(schemas: readonly ClineToolSpec[]): readonly string[] {
	return schemas.map((schema) => schema.name)
}

function expectedSharedStep3ToolSpecs(): readonly ClineToolSpec[] {
	registerClineToolSets()
	return CORRECT_COURSE_STEP_3_TOOL_IDS.map((toolId) => {
		const tool = ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)
		if (tool === undefined) {
			throw new Error(`Missing shared/default tool schema for ${toolId}.`)
		}

		return tool.config
	})
}

describe("correctCourseToolSchemas", () => {
	it("returns empty model-facing tool schemas for runtime-driven steps", () => {
		expect(buildCorrectCourseStep1ToolSchemas()).to.deep.equal([])
		expect(buildCorrectCourseStep2ToolSchemas()).to.deep.equal([])
	})

	it("exposes the exact Step 3 tool schema order", () => {
		expect(schemaNames(buildCorrectCourseStep3ToolSchemas())).to.deep.equal(STEP_3_TOOL_NAMES)
	})

	it("uses shared default Step 3 tool specs without module-owned schema prose", () => {
		expect(buildCorrectCourseStep3ToolSchemas()).to.deep.equal(expectedSharedStep3ToolSpecs())
	})

	it("does not expose forbidden model-facing tools in any step", () => {
		const exposedToolNames = [
			...schemaNames(buildCorrectCourseStep1ToolSchemas()),
			...schemaNames(buildCorrectCourseStep2ToolSchemas()),
			...schemaNames(buildCorrectCourseStep3ToolSchemas()),
		]

		for (const toolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
			expect(exposedToolNames).not.to.include(toolName)
		}
	})

	it("uses only approved Cline default tool ids for Step 3", () => {
		expect(CORRECT_COURSE_STEP_3_TOOL_IDS).to.deep.equal([
			ClineDefaultTool.LIST_FILES,
			ClineDefaultTool.SEARCH,
			ClineDefaultTool.LIST_CODE_DEF,
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.FILE_NEW,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
		])
	})
})
