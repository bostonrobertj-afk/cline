import { ClineDefaultTool } from "@/shared/tools"
import type { BackendWorkflowToolContract, BackendWorkflowToolSchemaNode } from "./backendWorkflowToolContractTypes"

const WORKFLOW_VALUE_SCHEMA_MAX_DEPTH = 8

function createWorkflowValueSchema(depth: number): BackendWorkflowToolSchemaNode {
	const scalarSchemas: BackendWorkflowToolSchemaNode[] = [{ type: "string" }, { type: "number" }, { type: "boolean" }]

	if (depth >= WORKFLOW_VALUE_SCHEMA_MAX_DEPTH) {
		return {
			type: "object",
			oneOf: scalarSchemas,
		}
	}

	return {
		type: "object",
		oneOf: [
			...scalarSchemas,
			{ type: "array", items: createWorkflowValueSchema(depth + 1) },
			{ type: "object", additionalProperties: createWorkflowValueSchema(depth + 1) },
		],
	}
}

const workflowValueSchema = createWorkflowValueSchema(0)

export const backendWorkflowToolContracts: Partial<Record<ClineDefaultTool, BackendWorkflowToolContract>> = {
	[ClineDefaultTool.SET_WORKFLOW_VALUES]: {
		id: ClineDefaultTool.SET_WORKFLOW_VALUES,
		name: "set_workflow_values",
		parameters: [
			{
				name: "values",
				required: true,
				type: "object",
				description: "Workflow-value key/value map for the active workflow session.",
				additionalProperties: workflowValueSchema,
			},
		],
	},
	[ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT]: {
		id: ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
		name: "build_workflow_document",
		parameters: [
			{
				name: "artifact_id",
				required: true,
				type: "string",
				description:
					"Canonical workflow artifact id selected upstream from the active workflow module's document-builder/artifact definition.",
			},
			{
				name: "destination_path",
				required: true,
				type: "string",
				description: "Resolved absolute destination path prepared upstream by WorkflowRuntime.",
			},
			{
				name: "content",
				required: true,
				type: "string",
				description: "Fully resolved markdown content to atomically write to the destination path.",
			},
			{
				name: "workflow_value_writes",
				required: false,
				type: "object",
				description: "Optional workflow-value writeback map to persist after a successful document write.",
				additionalProperties: workflowValueSchema,
			},
		],
	},
	[ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT]: {
		id: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
		name: "create_workflow_artifact",
		parameters: [
			{
				name: "artifact_id",
				required: true,
				type: "string",
				description: "Workflow artifact definition id to allocate and create through WorkflowRuntime.",
			},
		],
	},
	[ClineDefaultTool.ARCHIVE_WORKFLOW_ARTIFACT]: {
		id: ClineDefaultTool.ARCHIVE_WORKFLOW_ARTIFACT,
		name: "archive_workflow_artifact",
		parameters: [
			{
				name: "artifact_id",
				required: true,
				type: "string",
				description: "Workflow artifact definition id to archive through WorkflowRuntime.",
			},
		],
	},
	[ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT]: {
		id: ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT,
		name: "delete_workflow_artifact",
		parameters: [
			{
				name: "artifact_id",
				required: true,
				type: "string",
				description: "Workflow artifact definition id to delete through WorkflowRuntime.",
			},
		],
	},
	[ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE]: {
		id: ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE,
		name: "move_workflow_project_file",
		parameters: [
			{
				name: "source_path",
				required: true,
				type: "string",
				description: "Resolved absolute source path prepared upstream by WorkflowRuntime.",
			},
			{
				name: "destination_path",
				required: true,
				type: "string",
				description: "Resolved absolute destination path prepared upstream by WorkflowRuntime.",
			},
		],
	},
	[ClineDefaultTool.GET_BRAINSTORMING_METHODS]: {
		id: ClineDefaultTool.GET_BRAINSTORMING_METHODS,
		name: "get_brainstorming_methods",
		parameters: [],
	},
	[ClineDefaultTool.APPEND_BRAINSTORMING_SELECTED_TECHNIQUE]: {
		id: ClineDefaultTool.APPEND_BRAINSTORMING_SELECTED_TECHNIQUE,
		name: "append_brainstorming_selected_technique",
		parameters: [
			{
				name: "name",
				required: true,
				type: "string",
				description: "Accepted brainstorming technique name.",
			},
			{
				name: "description",
				required: true,
				type: "string",
				description: "Accepted brainstorming technique description.",
			},
			{
				name: "id",
				required: false,
				type: "string",
				description: "Optional stable brainstorming technique id.",
			},
			{
				name: "category",
				required: false,
				type: "string",
				description: "Optional brainstorming technique category.",
			},
		],
	},
	[ClineDefaultTool.UPSERT_EPIC]: {
		id: ClineDefaultTool.UPSERT_EPIC,
		name: "upsert_epic",
		parameters: [
			{
				name: "identity",
				required: true,
				type: "string",
				description: "Positive numeric epic identity.",
			},
			{
				name: "title",
				required: true,
				type: "string",
				description: "Non-empty epic title.",
			},
			{
				name: "objective",
				required: true,
				type: "object",
				description: "Epic objective with as_a, i_want, and so_that fields.",
				properties: {
					as_a: { type: "string" },
					i_want: { type: "string" },
					so_that: { type: "string" },
				},
				requiredProperties: ["as_a", "i_want", "so_that"],
			},
			{
				name: "description",
				required: true,
				type: "string",
				description: "Non-empty epic description.",
			},
			{
				name: "requirements",
				required: true,
				type: "array",
				description: "Non-empty requirement statements for this epic.",
				items: { type: "string" },
			},
			{
				name: "scope",
				required: true,
				type: "array",
				description: "Non-empty in-scope items for this epic.",
				items: { type: "string" },
			},
			{
				name: "scope_boundary",
				required: true,
				type: "array",
				description: "Non-empty out-of-scope boundary items for this epic.",
				items: { type: "string" },
			},
		],
	},
	[ClineDefaultTool.PLAN_STORY_ARTIFACTS]: {
		id: ClineDefaultTool.PLAN_STORY_ARTIFACTS,
		name: "plan_story_artifacts",
		parameters: [
			{
				name: "epic_identity",
				required: true,
				type: "string",
				description: "Positive numeric epic identity for the story inventory sidecar.",
			},
			{
				name: "story_count",
				required: true,
				type: "number",
				description: "Positive story count to plan as primary stories for the selected epic.",
			},
		],
	},
	[ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT]: {
		id: ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT,
		name: "plan_remediation_story_artifact",
		parameters: [
			{
				name: "epic_identity",
				required: true,
				type: "string",
				description: "Positive numeric epic identity for the story inventory sidecar.",
			},
			{
				name: "target_story_identity",
				required: true,
				type: "string",
				description: "Existing primary story identity that will own the remediation story.",
			},
		],
	},
	[ClineDefaultTool.GENERATE_STORY_FILES]: {
		id: ClineDefaultTool.GENERATE_STORY_FILES,
		name: "generate_story_files",
		parameters: [
			{
				name: "epic_identity",
				required: true,
				type: "string",
				description: "Positive numeric epic identity for the story inventory sidecar.",
			},
		],
	},
	[ClineDefaultTool.UPDATE_STORY_INDEX_STATUS]: {
		id: ClineDefaultTool.UPDATE_STORY_INDEX_STATUS,
		name: "update_story_index_status",
		parameters: [
			{
				name: "stories_index",
				required: true,
				type: "string",
				description: "Resolved absolute story index path prepared upstream by WorkflowRuntime.",
			},
			{
				name: "story_identity",
				required: true,
				type: "string",
				description: "Existing story identity whose status will be updated.",
			},
			{
				name: "status",
				required: true,
				type: "string",
				description: "New story status: draft, backlog, review, or complete.",
			},
			{
				name: "expected_current_status",
				required: false,
				type: "string",
				description: "Optional expected current story status to enforce before updating.",
			},
		],
	},
	[ClineDefaultTool.DEV_STORY_GIT_FINALIZE]: {
		id: ClineDefaultTool.DEV_STORY_GIT_FINALIZE,
		name: "dev_story_git_finalize",
		parameters: [
			{
				name: "operation",
				required: true,
				type: "string",
				description: "Dev-story git finalization operation prepared by WorkflowRuntime.",
			},
		],
	},
	[ClineDefaultTool.RECORD_FINDINGS]: {
		id: ClineDefaultTool.RECORD_FINDINGS,
		name: "record_findings",
		parameters: [
			{
				name: "findings",
				required: true,
				type: "array",
				description: "Code-review findings to append to the governed findings document.",
				items: {
					type: "object",
					properties: {
						finding: { type: "string" },
						categories: {
							type: "array",
							items: { type: "string" },
						},
						description: { type: "string" },
					},
					requiredProperties: ["finding", "categories", "description"],
				},
			},
		],
	},
}

export function getBackendWorkflowToolContract(toolName: ClineDefaultTool): BackendWorkflowToolContract | undefined {
	return backendWorkflowToolContracts[toolName]
}

export function isBackendWorkflowToolContractTool(toolName: ClineDefaultTool): boolean {
	return getBackendWorkflowToolContract(toolName) !== undefined
}
