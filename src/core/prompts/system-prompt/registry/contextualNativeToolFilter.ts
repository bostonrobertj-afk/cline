import { CLINE_MCP_TOOL_IDENTIFIER } from "@/shared/mcp"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"
import type { SystemPromptContext } from "../types"

export function canonicalizeMcpToolName(rawName: string): string {
	const delimiterIndex = rawName.indexOf(CLINE_MCP_TOOL_IDENTIFIER)
	if (delimiterIndex === -1) {
		return rawName
	}

	return rawName.slice(delimiterIndex + CLINE_MCP_TOOL_IDENTIFIER.length)
}

export function filterContextualNativeToolSpecs(input: {
	context: SystemPromptContext
	registeredTools: ClineToolSpec[]
	mcpTools: ClineToolSpec[]
}): ClineToolSpec[] {
	const { context, registeredTools, mcpTools } = input

	if (context.workflowToolSchemaOverride) {
		return [...context.workflowToolSchemaOverride]
	}

	const responseFilteredRegisteredTools = registeredTools.filter((tool) => {
		if (context.providerInfo.mode === "act") {
			return tool.id !== ClineDefaultTool.PLAN_MODE
		}

		if (context.providerInfo.mode === "plan") {
			return tool.id !== ClineDefaultTool.ATTEMPT && tool.id !== ClineDefaultTool.ACT_MODE
		}

		return true
	})

	return [...responseFilteredRegisteredTools, ...mcpTools]
}
