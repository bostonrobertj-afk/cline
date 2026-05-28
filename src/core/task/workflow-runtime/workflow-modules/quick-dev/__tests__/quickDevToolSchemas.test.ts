import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import {
	buildQuickDevStep1ToolSchemas,
	buildQuickDevStep2ToolSchemas,
	buildQuickDevStep3ToolSchemas,
	QUICK_DEV_STEP_1_TOOL_IDS,
	QUICK_DEV_STEP_2_TOOL_IDS,
} from "../quickDevToolSchemas"

const STEP_1_TOOL_NAMES: readonly string[] = [
	"execute_command",
	"list_files",
	"search_files",
	"list_code_definition_names",
	"read_file",
	"read_file_range",
	"apply_patch",
	"write_to_file",
	"send_user_message",
	"workflow_progress_request",
]

const STEP_2_TOOL_NAMES: readonly string[] = [
	"execute_command",
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
	"ask_followup_question",
	"set_workflow_values",
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"use_subagents",
	"use_skill",
	"web_search",
	"web_fetch",
	"browser_action",
	"use_mcp_tool",
	"access_mcp_resource",
	"load_mcp_documentation",
	"plan_story_artifacts",
	"plan_remediation_story_artifact",
	"generate_story_files",
	"update_story_index_status",
]

function schemaNames(schemas: readonly ClineToolSpec[]): readonly string[] {
	return schemas.map((schema) => schema.name)
}

function expectedSharedToolSpecs(toolIds: readonly ClineDefaultTool[]): readonly ClineToolSpec[] {
	registerClineToolSets()
	return toolIds.map((toolId) => {
		const tool = ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)
		if (tool === undefined) {
			throw new Error(`Missing shared/default tool schema for ${toolId}.`)
		}

		return tool.config
	})
}

describe("quickDevToolSchemas", () => {
	it("exposes the exact Step 1 shared/default tool schema order", () => {
		expect(schemaNames(buildQuickDevStep1ToolSchemas())).to.deep.equal(STEP_1_TOOL_NAMES)
	})

	it("exposes the exact Step 2 shared/default tool schema order", () => {
		expect(schemaNames(buildQuickDevStep2ToolSchemas())).to.deep.equal(STEP_2_TOOL_NAMES)
	})

	it("returns an empty model-facing schema for runtime-only Step 3", () => {
		expect(buildQuickDevStep3ToolSchemas()).to.deep.equal([])
	})

	it("uses shared default Step 1 and Step 2 tool specs without module-owned schema prose", () => {
		expect(buildQuickDevStep1ToolSchemas()).to.deep.equal(expectedSharedToolSpecs(QUICK_DEV_STEP_1_TOOL_IDS))
		expect(buildQuickDevStep2ToolSchemas()).to.deep.equal(expectedSharedToolSpecs(QUICK_DEV_STEP_2_TOOL_IDS))
	})

	it("uses only approved Cline default tool ids", () => {
		expect(QUICK_DEV_STEP_1_TOOL_IDS).to.deep.equal([
			ClineDefaultTool.BASH,
			ClineDefaultTool.LIST_FILES,
			ClineDefaultTool.SEARCH,
			ClineDefaultTool.LIST_CODE_DEF,
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.FILE_NEW,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
		])
		expect(QUICK_DEV_STEP_2_TOOL_IDS).to.deep.equal([
			ClineDefaultTool.BASH,
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

	it("does not expose forbidden model-facing tools in any quick-dev step", () => {
		const exposedNames = [
			...schemaNames(buildQuickDevStep1ToolSchemas()),
			...schemaNames(buildQuickDevStep2ToolSchemas()),
			...schemaNames(buildQuickDevStep3ToolSchemas()),
		]

		for (const forbiddenToolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
			expect(exposedNames).not.to.include(forbiddenToolName)
		}
	})
})
