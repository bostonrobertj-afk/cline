import { expect } from "chai"
import { describe, it } from "mocha"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import {
	buildDevStoryStep1ToolSchemas,
	buildDevStoryStep2ToolSchemas,
	buildDevStoryStep3ToolSchemas,
	buildDevStoryStep4ToolSchemas,
} from "../devStoryToolSchemas"

type ToolSchemaBuilder = () => readonly ClineToolSpec[]

const STEP_2_TOOL_NAMES: readonly string[] = [
	"read_file",
	"read_file_range",
	"list_files",
	"search_files",
	"list_code_definition_names",
	"apply_patch",
	"execute_command",
	"story_task_complete",
	"request_task_detail",
	"show_incomplete_tasks",
	"ask_followup_question",
	"send_user_message",
]

const STEP_3_TOOL_NAMES: readonly string[] = [
	"read_file",
	"read_file_range",
	"list_files",
	"search_files",
	"ask_followup_question",
	"send_user_message",
	"attempt_completion",
]

const REQUIRED_ABSENT_DEV_STORY_MODEL_TOOL_NAMES: readonly string[] = [
	"set_workflow_values",
	"update_story_index_status",
	"move_workflow_project_file",
	"dev_story_git_finalize",
	"story_notes_update",
	"story_testing_complete",
]

const FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[] = [
	...REQUIRED_ABSENT_DEV_STORY_MODEL_TOOL_NAMES,
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"plan_story_artifacts",
	"plan_remediation_story_artifact",
	"generate_story_files",
]

const DEV_STORY_STEP_BUILDERS: readonly ToolSchemaBuilder[] = [
	buildDevStoryStep1ToolSchemas,
	buildDevStoryStep2ToolSchemas,
	buildDevStoryStep3ToolSchemas,
	buildDevStoryStep4ToolSchemas,
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

describe("devStoryToolSchemas", () => {
	it("exposes the exact Step 1 through Step 4 tool schema order", () => {
		expect(schemaNames(buildDevStoryStep1ToolSchemas())).to.deep.equal([])
		expect(schemaNames(buildDevStoryStep2ToolSchemas())).to.deep.equal(STEP_2_TOOL_NAMES)
		expect(schemaNames(buildDevStoryStep3ToolSchemas())).to.deep.equal(STEP_3_TOOL_NAMES)
		expect(schemaNames(buildDevStoryStep4ToolSchemas())).to.deep.equal([])
	})

	it("defines Step 2 story-tool parameters", () => {
		const step2Schemas = buildDevStoryStep2ToolSchemas()
		const storyTaskComplete = findSchemaByName(step2Schemas, "story_task_complete")
		expect(storyTaskComplete.parameters).to.deep.equal([
			{
				name: "storyItemId",
				required: true,
				type: "string",
				instruction: "A task ID or subtask ID from the target story document.",
				description: "A task ID or subtask ID from the target story document.",
			},
		])

		const requestTaskDetail = findSchemaByName(step2Schemas, "request_task_detail")
		expect(requestTaskDetail.parameters).to.deep.equal([
			{
				name: "storyTaskId",
				required: true,
				type: "string",
				instruction: "The task ID from the target story document.",
				description: "The task ID from the target story document.",
			},
		])

		const showIncompleteTasks = findSchemaByName(step2Schemas, "show_incomplete_tasks")
		expect(showIncompleteTasks.parameters).to.deep.equal([])
	})

	it("exposes attempt_completion only in Step 3", () => {
		expect(schemaNames(buildDevStoryStep1ToolSchemas())).not.to.include("attempt_completion")
		expect(schemaNames(buildDevStoryStep2ToolSchemas())).not.to.include("attempt_completion")
		expect(schemaNames(buildDevStoryStep3ToolSchemas())).to.include("attempt_completion")
		expect(schemaNames(buildDevStoryStep4ToolSchemas())).not.to.include("attempt_completion")
	})

	it("does not expose forbidden backend-only, retired, or workflow artifact tools", () => {
		for (const buildToolSchemas of DEV_STORY_STEP_BUILDERS) {
			const toolNames = schemaNames(buildToolSchemas())

			for (const forbiddenToolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
				expect(toolNames).not.to.include(forbiddenToolName)
			}
		}
	})

	it("does not expose retired story tools or backend workflow mutation tools from any dev-story model-facing schema", () => {
		for (const buildToolSchemas of DEV_STORY_STEP_BUILDERS) {
			const toolNames = schemaNames(buildToolSchemas())

			for (const absentToolName of REQUIRED_ABSENT_DEV_STORY_MODEL_TOOL_NAMES) {
				expect(toolNames).not.to.include(absentToolName)
			}
		}
	})
})
