import { expect } from "chai"
import { describe, it } from "mocha"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { ModelFamily } from "@/shared/prompts"
import {
	buildAcceptanceAuditReviewStep1ToolSchemas,
	buildAcceptanceAuditReviewStep2ToolSchemas,
} from "../acceptanceAuditReviewToolSchemas"

type ClineToolSpecParameter = NonNullable<ClineToolSpec["parameters"]>[number]
type ExpectedParameterType = NonNullable<ClineToolSpecParameter["type"]>

interface ExpectedParameterShape {
	readonly name: string
	readonly required: boolean
	readonly type: ExpectedParameterType
	readonly instruction: string
	readonly description: string
}

interface ExpectedSchemaParameterShape {
	readonly schemaName: string
	readonly description: string
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
		description:
			"Request to execute a CLI command on the system. Use this when you need to inspect git-backed implementation evidence.",
		parameters: [
			{
				name: "command",
				required: true,
				type: "string",
				instruction: "The CLI command to execute.",
				description: "The CLI command to execute.",
			},
			{
				name: "requires_approval",
				required: true,
				type: "boolean",
				instruction: "Whether this command requires explicit user approval before execution.",
				description: "Whether this command requires explicit user approval before execution.",
			},
		],
	},
	{
		schemaName: "list_files",
		description:
			"Request to list files and directories within the specified directory for acceptance audit review source inspection.",
		parameters: [
			{
				name: "path",
				required: true,
				type: "string",
				instruction: "The path of the directory to list contents for.",
				description: "The path of the directory to list contents for.",
			},
			{
				name: "recursive",
				required: false,
				type: "boolean",
				instruction: "Whether to list files recursively.",
				description: "Whether to list files recursively.",
			},
		],
	},
	{
		schemaName: "search_files",
		description: "Request to perform a regex search across files in a specified directory.",
		parameters: [
			{
				name: "path",
				required: true,
				type: "string",
				instruction: "The path of the directory to search in.",
				description: "The path of the directory to search in.",
			},
			{
				name: "regex",
				required: true,
				type: "string",
				instruction: "The regular expression pattern to search for.",
				description: "The regular expression pattern to search for.",
			},
			{
				name: "file_pattern",
				required: false,
				type: "string",
				instruction: "Glob pattern to filter files.",
				description: "Glob pattern to filter files.",
			},
		],
	},
	{
		schemaName: "list_code_definition_names",
		description: "Request to list definition names used in source code files at the top level of the specified directory.",
		parameters: [
			{
				name: "path",
				required: true,
				type: "string",
				instruction: "The path of a directory, not a file.",
				description: "The path of a directory, not a file.",
			},
		],
	},
	{
		schemaName: "read_file",
		description:
			"Request to read the contents of a file at the specified path. Do NOT use this tool to list the contents of a directory.",
		parameters: [
			{
				name: "path",
				required: true,
				type: "string",
				instruction: "The path of the file to read.",
				description: "The path of the file to read.",
			},
		],
	},
	{
		schemaName: "read_file_range",
		description: "Request to read only a specific 1-based line range from a text file.",
		parameters: [
			{
				name: "path",
				required: true,
				type: "string",
				instruction: "The path of the file to read.",
				description: "The path of the file to read.",
			},
			{
				name: "start_line",
				required: true,
				type: "integer",
				instruction: "The first line to include, using 1-based line numbers.",
				description: "The first line to include, using 1-based line numbers.",
			},
			{
				name: "end_line",
				required: true,
				type: "integer",
				instruction: "The last line to include, using 1-based line numbers.",
				description: "The last line to include, using 1-based line numbers.",
			},
		],
	},
	{
		schemaName: "apply_patch",
		description: "Apply a structured patch to one or more files using the repository apply_patch format.",
		parameters: [
			{
				name: "input",
				required: true,
				type: "string",
				instruction: "The apply_patch command that you wish to execute.",
				description: "The apply_patch command that you wish to execute.",
			},
		],
	},
	{
		schemaName: "write_to_file",
		description:
			"Request to write content to a file at the specified absolute path. If the file exists, it will be overwritten with the provided content.",
		parameters: [
			{
				name: "absolutePath",
				required: true,
				type: "string",
				instruction: "The absolute path to the file to write to.",
				description: "The absolute path to the file to write to.",
			},
			{
				name: "content",
				required: true,
				type: "string",
				instruction: "The content to write to the file.",
				description: "The content to write to the file.",
			},
		],
	},
	{
		schemaName: "send_user_message",
		description:
			"Send a direct user-visible message when other response tools are not appropriate or available. On success, this tool displays the message to the user and ends your current turn.",
		parameters: [
			{
				name: "message",
				required: true,
				type: "string",
				instruction: "The direct message to show to the user.",
				description: "The direct message to show to the user.",
			},
		],
	},
	{
		schemaName: "attempt_completion",
		description: "Deliver the final acceptance audit review completion message to the user.",
		parameters: [
			{
				name: "result",
				required: true,
				type: "string",
				instruction: "Final user-facing completion message.",
				description: "Final user-facing completion message.",
			},
		],
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

	return parameters.map((parameter) => {
		if (typeof parameter.instruction !== "string") {
			throw new Error(`Missing string instruction for ${schema.name}.${parameter.name}.`)
		}

		const description = parameter.description
		if (description === undefined) {
			throw new Error(`Missing description for ${schema.name}.${parameter.name}.`)
		}

		return {
			name: parameter.name,
			required: parameter.required,
			type: parameterType(parameter),
			instruction: parameter.instruction,
			description,
		}
	})
}

describe("acceptanceAuditReviewToolSchemas", () => {
	it("returns an empty canonical tool-schema array for Step 1", () => {
		expect(buildAcceptanceAuditReviewStep1ToolSchemas()).to.deep.equal([])
	})

	it("exposes the exact Step 2 tool schema order", () => {
		expect(schemaNames(buildAcceptanceAuditReviewStep2ToolSchemas())).to.deep.equal(STEP_2_TOOL_NAMES)
	})

	it("uses the native GPT-5 schema variant and exact Step 2 schema text", () => {
		const schemas = buildAcceptanceAuditReviewStep2ToolSchemas()
		for (const schema of schemas) {
			expect(schema.variant).to.equal(ModelFamily.NATIVE_GPT_5)
		}

		for (const expected of EXPECTED_STEP_2_PARAMETER_SHAPES) {
			const schema = findSchemaByName(schemas, expected.schemaName)
			expect(schema.description).to.equal(expected.description)
			expect(parameterShapes(schema)).to.deep.equal(expected.parameters)
		}
	})

	it("does not expose forbidden model-facing tools in Step 1 or Step 2", () => {
		const stepToolNameSets: readonly (readonly string[])[] = [
			schemaNames(buildAcceptanceAuditReviewStep1ToolSchemas()),
			schemaNames(buildAcceptanceAuditReviewStep2ToolSchemas()),
		]

		for (const toolNames of stepToolNameSets) {
			for (const forbiddenToolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
				expect(toolNames).not.to.include(forbiddenToolName)
			}
		}
	})
})
