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
	[ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE]: {
		id: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE,
		name: "code_review_spec_update",
		parameters: [],
	},
}

export function getBackendWorkflowToolContract(toolName: ClineDefaultTool): BackendWorkflowToolContract | undefined {
	return backendWorkflowToolContracts[toolName]
}

export function isBackendWorkflowToolContractTool(toolName: ClineDefaultTool): boolean {
	return getBackendWorkflowToolContract(toolName) !== undefined
}
