import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "build_workflow_document",
	description:
		"Build a workflow document by writing content for artifact_id to destination_path, with optional workflow_value_writes as string key/value updates.",
	parameters: [
		{
			name: "artifact_id",
			required: true,
			type: "string",
			instruction: "Required artifact_id for the workflow document being built.",
		},
		{
			name: "destination_path",
			required: true,
			type: "string",
			instruction: "Required destination_path where the workflow document content will be written.",
		},
		{
			name: "content",
			required: true,
			type: "string",
			instruction: "Required content to write to destination_path for artifact_id.",
		},
		{
			name: "workflow_value_writes",
			required: false,
			type: "object",
			instruction:
				"Optional object map of workflow value keys to string values to write alongside the document build request.",
			additionalProperties: {
				type: "string",
			},
		},
	],
}

export const build_workflow_document_variants = [generic]
