import { expect } from "chai"
import { describe, it } from "mocha"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import {
	buildCodeReviewStep1ToolSchemas,
	buildCodeReviewStep2ToolSchemas,
	buildCodeReviewStep3ToolSchemas,
	buildCodeReviewStep4ToolSchemas,
} from "../codeReviewToolSchemas"

type ToolSchemaBuilder = () => readonly ClineToolSpec[]

const STEP_2_TOOL_NAMES: readonly string[] = ["use_subagents", "send_user_message", "workflow_progress_request"]
const STEP_3_TOOL_NAMES: readonly string[] = [
	"read_file",
	"read_file_range",
	"record_findings",
	"send_user_message",
	"workflow_progress_request",
]
const STEP_4_TOOL_NAMES: readonly string[] = [
	"read_file",
	"read_file_range",
	"apply_patch",
	"ask_followup_question",
	"send_user_message",
	"attempt_completion",
]

const FORBIDDEN_BACKEND_ONLY_TOOL_NAMES: readonly string[] = [
	"set_workflow_values",
	"build_workflow_document",
	"create_workflow_artifact",
	"plan_remediation_story_artifact",
	"update_story_index_status",
	"move_workflow_project_file",
]

const RETIRED_CODE_REVIEW_TOOL_NAMES: readonly string[] = [
	"code_review_spec_update",
	"build_review_diff_output",
	"build_review_input",
	"build_review_input_markdown",
	"BuildReviewInputToolHandler",
	"BuildReviewDiffOutputToolHandler",
	"CodeReviewSpecUpdateToolHandler",
]

const CODE_REVIEW_STEP_BUILDERS: readonly ToolSchemaBuilder[] = [
	buildCodeReviewStep1ToolSchemas,
	buildCodeReviewStep2ToolSchemas,
	buildCodeReviewStep3ToolSchemas,
	buildCodeReviewStep4ToolSchemas,
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

describe("codeReviewToolSchemas", () => {
	it("exposes exact Step 1 through Step 4 tool schema names", () => {
		expect(schemaNames(buildCodeReviewStep1ToolSchemas())).to.deep.equal([])
		expect(schemaNames(buildCodeReviewStep2ToolSchemas())).to.deep.equal(STEP_2_TOOL_NAMES)
		expect(schemaNames(buildCodeReviewStep3ToolSchemas())).to.deep.equal(STEP_3_TOOL_NAMES)
		expect(schemaNames(buildCodeReviewStep4ToolSchemas())).to.deep.equal(STEP_4_TOOL_NAMES)
	})

	it("exposes record_findings only in Step 3 and attempt_completion only in Step 4", () => {
		expect(schemaNames(buildCodeReviewStep1ToolSchemas())).not.to.include("record_findings")
		expect(schemaNames(buildCodeReviewStep2ToolSchemas())).not.to.include("record_findings")
		expect(schemaNames(buildCodeReviewStep3ToolSchemas())).to.include("record_findings")
		expect(schemaNames(buildCodeReviewStep4ToolSchemas())).not.to.include("record_findings")

		expect(schemaNames(buildCodeReviewStep1ToolSchemas())).not.to.include("attempt_completion")
		expect(schemaNames(buildCodeReviewStep2ToolSchemas())).not.to.include("attempt_completion")
		expect(schemaNames(buildCodeReviewStep3ToolSchemas())).not.to.include("attempt_completion")
		expect(schemaNames(buildCodeReviewStep4ToolSchemas())).to.include("attempt_completion")
	})

	it("defines the governed record_findings payload shape", () => {
		const recordFindings = findSchemaByName(buildCodeReviewStep3ToolSchemas(), "record_findings")
		expect(recordFindings.parameters).to.deep.equal([
			{
				name: "findings",
				required: true,
				type: "array",
				instruction: "Validated code-review findings to persist. Use an empty array when there are no findings.",
				description: "Validated code-review findings to persist.",
				items: {
					type: "object",
					properties: {
						finding: {
							type: "string",
							description: "Short finding heading.",
						},
						categories: {
							type: "array",
							items: {
								type: "string",
								enum: ["task_failure", "dev_agent_failure", "upstream_failure"],
							},
							description: "One or more approved finding categories.",
						},
						description: {
							type: "string",
							description: "Finding detail and supporting context.",
						},
					},
					required: ["finding", "categories", "description"],
					additionalProperties: false,
				},
			},
		])
	})

	it("does not expose backend-only or retired code-review tools from any step schema", () => {
		for (const buildToolSchemas of CODE_REVIEW_STEP_BUILDERS) {
			const toolNames = schemaNames(buildToolSchemas())

			for (const forbiddenToolName of FORBIDDEN_BACKEND_ONLY_TOOL_NAMES) {
				expect(toolNames).not.to.include(forbiddenToolName)
			}

			for (const retiredToolName of RETIRED_CODE_REVIEW_TOOL_NAMES) {
				expect(toolNames).not.to.include(retiredToolName)
			}
		}
	})
})
