import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import {
	buildQuickSpecStep1ToolSchemas,
	buildQuickSpecStep2ToolSchemas,
	buildQuickSpecStep3ToolSchemas,
	buildQuickSpecStep4ToolSchemas,
	QUICK_SPEC_STEP_2_TOOL_IDS,
	QUICK_SPEC_STEP_3_TOOL_IDS,
	QUICK_SPEC_STEP_4_TOOL_IDS,
} from "../quickSpecToolSchemas"

const STEP_2_AND_3_TOOL_NAMES: readonly string[] = [
	"read_file",
	"read_file_range",
	"list_files",
	"search_files",
	"list_code_definition_names",
	"apply_patch",
	"send_user_message",
	"workflow_progress_request",
]

const STEP_4_TOOL_NAMES: readonly string[] = [
	"read_file",
	"read_file_range",
	"list_files",
	"search_files",
	"list_code_definition_names",
	"apply_patch",
	"send_user_message",
	"use_subagents",
	"attempt_completion",
]

const FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[] = [
	"set_workflow_values",
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"write_to_file",
	"build_tech_spec_document",
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

describe("quickSpecToolSchemas", () => {
	it("returns an empty model-facing schema for runtime-driven Step 1", () => {
		expect(buildQuickSpecStep1ToolSchemas()).to.deep.equal([])
	})

	it("exposes the exact Step 2 shared/default tool schema order", () => {
		const schemas = buildQuickSpecStep2ToolSchemas()

		expect(schemaNames(schemas)).to.deep.equal(STEP_2_AND_3_TOOL_NAMES)
	})

	it("exposes the exact Step 3 shared/default tool schema order", () => {
		const schemas = buildQuickSpecStep3ToolSchemas()

		expect(schemaNames(schemas)).to.deep.equal(STEP_2_AND_3_TOOL_NAMES)
	})

	it("exposes the exact Step 4 shared/default tool schema order", () => {
		const schemas = buildQuickSpecStep4ToolSchemas()

		expect(schemaNames(schemas)).to.deep.equal(STEP_4_TOOL_NAMES)
	})

	it("uses shared default Step 2, Step 3, and Step 4 tool specs without module-owned schema prose", () => {
		expect(buildQuickSpecStep2ToolSchemas()).to.deep.equal(expectedSharedToolSpecs(QUICK_SPEC_STEP_2_TOOL_IDS))
		expect(buildQuickSpecStep3ToolSchemas()).to.deep.equal(expectedSharedToolSpecs(QUICK_SPEC_STEP_3_TOOL_IDS))
		expect(buildQuickSpecStep4ToolSchemas()).to.deep.equal(expectedSharedToolSpecs(QUICK_SPEC_STEP_4_TOOL_IDS))
	})

	it("uses only the approved Cline default tool ids", () => {
		expect(QUICK_SPEC_STEP_2_TOOL_IDS).to.deep.equal([
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.LIST_FILES,
			ClineDefaultTool.SEARCH,
			ClineDefaultTool.LIST_CODE_DEF,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
		])
		expect(QUICK_SPEC_STEP_3_TOOL_IDS).to.deep.equal([
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.LIST_FILES,
			ClineDefaultTool.SEARCH,
			ClineDefaultTool.LIST_CODE_DEF,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
		])
		expect(QUICK_SPEC_STEP_4_TOOL_IDS).to.deep.equal([
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.LIST_FILES,
			ClineDefaultTool.SEARCH,
			ClineDefaultTool.LIST_CODE_DEF,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.USE_SUBAGENTS,
			ClineDefaultTool.ATTEMPT,
		])
	})

	it("does not expose forbidden model-facing tools in any quick-spec step", () => {
		const exposedNames = [
			...schemaNames(buildQuickSpecStep1ToolSchemas()),
			...schemaNames(buildQuickSpecStep2ToolSchemas()),
			...schemaNames(buildQuickSpecStep3ToolSchemas()),
			...schemaNames(buildQuickSpecStep4ToolSchemas()),
		]

		for (const forbiddenToolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
			expect(exposedNames).to.not.include(forbiddenToolName)
		}
	})
})
