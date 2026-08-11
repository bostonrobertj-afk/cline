import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import {
	buildDocumentProjectStep1ToolSchemas,
	buildDocumentProjectStep2ToolSchemas,
	buildDocumentProjectStep3ToolSchemas,
	buildDocumentProjectStep4ToolSchemas,
	DOCUMENT_PROJECT_STEP_4_TOOL_IDS,
} from "../documentProjectToolSchemas"

const FORBIDDEN_MODEL_FACING_TOOL_NAMES = [
	"workflow_progress_request",
	"replace_in_file",
	"browser_action",
	"use_mcp_tool",
	"access_mcp_resource",
	"load_mcp_documentation",
	"new_task",
	"generate_plan_output",
	"act_mode_respond",
	"focus_chain",
	"web_fetch",
	"web_search",
	"condense",
	"summarize_task",
	"report_bug",
	"new_rule",
	"generate_explanation",
	"use_skill",
	"set_workflow_values",
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"resolve_existing_project_artifact",
	"validate_story_index_entry",
	"get_brainstorming_methods",
	"append_brainstorming_selected_technique",
	"upsert_epic",
	"plan_story_artifacts",
	"plan_remediation_story_artifact",
	"generate_story_files",
	"update_story_index_status",
	"dev_story_git_finalize",
	"record_findings",
	"story_task_reminder",
	"story_task_complete",
	"request_task_detail",
	"show_incomplete_tasks",
	"use_subagents",
]

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

describe("documentProjectToolSchemas", () => {
	it("exposes no model-facing tools in Steps 1 through 3", () => {
		expect(buildDocumentProjectStep1ToolSchemas()).to.deep.equal([])
		expect(buildDocumentProjectStep2ToolSchemas()).to.deep.equal([])
		expect(buildDocumentProjectStep3ToolSchemas()).to.deep.equal([])
	})

	it("uses only the exact approved Step 4 Cline default tool ids", () => {
		expect(DOCUMENT_PROJECT_STEP_4_TOOL_IDS).to.deep.equal([
			ClineDefaultTool.BASH,
			ClineDefaultTool.LIST_FILES,
			ClineDefaultTool.SEARCH,
			ClineDefaultTool.LIST_CODE_DEF,
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.FILE_NEW,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ASK,
			ClineDefaultTool.ATTEMPT,
		])
	})

	it("exposes the exact Step 4 shared/default tool schema names and configs", () => {
		expect(buildDocumentProjectStep4ToolSchemas().map((spec) => spec.name)).to.deep.equal([
			"execute_command",
			"list_files",
			"search_files",
			"list_code_definition_names",
			"read_file",
			"read_file_range",
			"apply_patch",
			"write_to_file",
			"send_user_message",
			"ask_followup_question",
			"attempt_completion",
		])
		expect(buildDocumentProjectStep4ToolSchemas()).to.deep.equal(expectedSharedToolSpecs(DOCUMENT_PROJECT_STEP_4_TOOL_IDS))
	})

	it("excludes every forbidden model-facing tool and includes all response tools", () => {
		const exposedNames = [
			...buildDocumentProjectStep1ToolSchemas().map((spec) => spec.name),
			...buildDocumentProjectStep2ToolSchemas().map((spec) => spec.name),
			...buildDocumentProjectStep3ToolSchemas().map((spec) => spec.name),
			...buildDocumentProjectStep4ToolSchemas().map((spec) => spec.name),
		]

		for (const forbiddenToolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
			expect(exposedNames).not.to.include(forbiddenToolName)
		}
		expect(exposedNames).to.include("send_user_message")
		expect(exposedNames).to.include("ask_followup_question")
		expect(exposedNames).to.include("attempt_completion")
	})

	it("inherits Step 4 descriptions, parameters, required fields, and context requirements", () => {
		const actualSpecs = buildDocumentProjectStep4ToolSchemas()
		const sharedSpecs = expectedSharedToolSpecs(DOCUMENT_PROJECT_STEP_4_TOOL_IDS)

		for (const [index, actualSpec] of actualSpecs.entries()) {
			const sharedSpec = sharedSpecs[index]
			if (sharedSpec === undefined) {
				throw new Error(`Missing shared/default tool schema at index ${index}.`)
			}
			expect({
				description: actualSpec.description,
				parameters: actualSpec.parameters,
				contextRequirements: actualSpec.contextRequirements,
			}).to.deep.equal({
				description: sharedSpec.description,
				parameters: sharedSpec.parameters,
				contextRequirements: sharedSpec.contextRequirements,
			})
		}
	})
})
