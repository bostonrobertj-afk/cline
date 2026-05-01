import type { ClineDefaultTool } from "@/shared/tools"

export type BackendWorkflowToolSchemaNode = {
	type?: "string" | "boolean" | "integer" | "number" | "array" | "object"
	enum?: unknown
	const?: string | number | boolean
	items?: BackendWorkflowToolSchemaNode
	properties?: Record<string, BackendWorkflowToolSchemaNode>
	required?: string[] | boolean
	requiredProperties?: string[]
	additionalProperties?: BackendWorkflowToolSchemaNode
	oneOf?: BackendWorkflowToolSchemaNode[]
}

export interface BackendWorkflowToolParameterContract extends BackendWorkflowToolSchemaNode {
	name: string
	required: boolean
	description?: string
}

export interface BackendWorkflowToolContract {
	id: ClineDefaultTool
	name: string
	parameters: BackendWorkflowToolParameterContract[]
}
