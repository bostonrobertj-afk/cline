import { expect } from "chai"
import { describe, it } from "mocha"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { ModelFamily } from "@/shared/prompts"
import {
	buildEdgeCaseHunterReviewStep1ToolSchemas,
	buildEdgeCaseHunterReviewStep2ToolSchemas,
} from "../edgeCaseHunterReviewToolSchemas"

type ClineToolSpecParameter = NonNullable<ClineToolSpec["parameters"]>[number]
type ExpectedParameterType = NonNullable<ClineToolSpecParameter["type"]>

interface ExpectedParameterShape {
	readonly name: string
	readonly required: boolean
	readonly type: ExpectedParameterType
}

interface ExpectedSchemaParameterShape {
	readonly schemaName: string
	readonly parameters: readonly ExpectedParameterShape[]
}

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

const EXPECTED_STEP_2_PARAMETER_SHAPES: readonly ExpectedSchemaParameterShape[] = [
	{
		schemaName: "execute_command",
		parameters: [
			{ name: "command", required: true, type: "string" },
			{ name: "requires_approval", required: true, type: "boolean" },
		],
	},
	{
		schemaName: "list_files",
		parameters: [
			{ name: "path", required: true, type: "string" },
			{ name: "recursive", required: false, type: "boolean" },
		],
	},
	{
		schemaName: "search_files",
		parameters: [
			{ name: "path", required: true, type: "string" },
			{ name: "regex", required: true, type: "string" },
			{ name: "file_pattern", required: false, type: "string" },
		],
	},
	{
		schemaName: "list_code_definition_names",
		parameters: [{ name: "path", required: true, type: "string" }],
	},
	{
		schemaName: "read_file",
		parameters: [{ name: "path", required: true, type: "string" }],
	},
	{
		schemaName: "read_file_range",
		parameters: [
			{ name: "path", required: true, type: "string" },
			{ name: "start_line", required: true, type: "integer" },
			{ name: "end_line", required: true, type: "integer" },
		],
	},
	{
		schemaName: "apply_patch",
		parameters: [{ name: "input", required: true, type: "string" }],
	},
	{
		schemaName: "write_to_file",
		parameters: [
			{ name: "absolutePath", required: true, type: "string" },
			{ name: "content", required: true, type: "string" },
		],
	},
	{
		schemaName: "send_user_message",
		parameters: [
			{ name: "message", required: true, type: "string" },
			{ name: "agent_feedback", required: false, type: "object" },
		],
	},
	{
		schemaName: "attempt_completion",
		parameters: [{ name: "result", required: true, type: "string" }],
	},
]

const FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[] = [
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
	"workflow_progress_request",
	"use_mcp_tool",
	"access_mcp_resource",
	"load_mcp_documentation",
	"build_review_input",
	"build_review_diff_output",
	"code_review_spec_update",
	"record_findings",
]

function schemaNames(schemas: readonly ClineToolSpec[]): readonly string[] {
	return schemas.map((schema) => schema.name)
}

function findSchemaByName(schemas: readonly ClineToolSpec[], name: string): ClineToolSpec {
	const schema = schemas.find((candidate) => candidate.name === name)
	if (schema === undefined) {
		throw new Error(`Missing schema ${name}.`)
	}

	return schema
}

function parameterType(parameter: ClineToolSpecParameter): ExpectedParameterType {
	if (parameter.type === undefined) {
		throw new Error(`Missing parameter type for ${parameter.name}.`)
	}

	return parameter.type
}

function parameterShapes(schema: ClineToolSpec): readonly ExpectedParameterShape[] {
	const parameters = schema.parameters
	if (parameters === undefined) {
		throw new Error(`Missing parameters for ${schema.name}.`)
	}

	return parameters.map((parameter) => ({
		name: parameter.name,
		required: parameter.required,
		type: parameterType(parameter),
	}))
}

describe("edgeCaseHunterReviewToolSchemas", () => {
	it("returns an empty canonical tool-schema array for Step 1", () => {
		expect(buildEdgeCaseHunterReviewStep1ToolSchemas()).to.deep.equal([])
	})

	it("exposes the exact Step 2 tool schema order", () => {
		expect(schemaNames(buildEdgeCaseHunterReviewStep2ToolSchemas())).to.deep.equal(STEP_2_TOOL_NAMES)
	})

	it("uses the native GPT-5 schema variant and exact Step 2 parameter shapes", () => {
		const step2Schemas = buildEdgeCaseHunterReviewStep2ToolSchemas()
		for (const schema of step2Schemas) {
			expect(schema.variant).to.equal(ModelFamily.NATIVE_GPT_5)
		}

		for (const expectedSchemaParameters of EXPECTED_STEP_2_PARAMETER_SHAPES) {
			const schema = findSchemaByName(step2Schemas, expectedSchemaParameters.schemaName)
			expect(parameterShapes(schema)).to.deep.equal(expectedSchemaParameters.parameters)
		}
	})

	it("does not expose forbidden model-facing tools in Step 1 or Step 2", () => {
		const stepToolNameSets: readonly (readonly string[])[] = [
			schemaNames(buildEdgeCaseHunterReviewStep1ToolSchemas()),
			schemaNames(buildEdgeCaseHunterReviewStep2ToolSchemas()),
		]

		for (const toolNames of stepToolNameSets) {
			for (const forbiddenToolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
				expect(toolNames).not.to.include(forbiddenToolName)
			}
		}
	})
})
