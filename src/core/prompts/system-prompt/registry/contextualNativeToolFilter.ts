import { CLINE_MCP_TOOL_IDENTIFIER } from "@/shared/mcp"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"
import type { SystemPromptContext } from "../types"

const ACT_MODE_RESPONSE_TOOL_IDS = [
	ClineDefaultTool.ASK,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ATTEMPT,
	ClineDefaultTool.ACT_MODE,
] as const
const PLAN_MODE_RESPONSE_TOOL_IDS = [
	ClineDefaultTool.ASK,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.PLAN_MODE,
] as const
const ALWAYS_PRESERVED_NATIVE_TOOL_IDS = [
	ClineDefaultTool.NEW_TASK,
	ClineDefaultTool.BROWSER,
	ClineDefaultTool.MCP_ACCESS,
] as const

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

	const responseFilteredRegisteredTools = registeredTools.filter((tool) => {
		if (context.providerInfo.mode === "act") {
			return tool.id !== ClineDefaultTool.PLAN_MODE
		}

		if (context.providerInfo.mode === "plan") {
			return tool.id !== ClineDefaultTool.ATTEMPT && tool.id !== ClineDefaultTool.ACT_MODE
		}

		return true
	})

	if (!context.workflowToolSchemaOverride) {
		return [...responseFilteredRegisteredTools, ...mcpTools]
	}

	const currentModeResponseToolIds =
		context.providerInfo.mode === "plan" ? PLAN_MODE_RESPONSE_TOOL_IDS : ACT_MODE_RESPONSE_TOOL_IDS
	const overrideBuiltInToolIds = new Set(
		context.workflowToolSchemaOverride
			.filter((tool) => !tool.name.includes(CLINE_MCP_TOOL_IDENTIFIER))
			.map((tool) => tool.id),
	)
	const allowedBuiltInToolIds = new Set<ClineDefaultTool>([
		...currentModeResponseToolIds,
		...ALWAYS_PRESERVED_NATIVE_TOOL_IDS,
		...overrideBuiltInToolIds,
	])
	const allowedMcpCanonicalNames = new Set(
		context.workflowToolSchemaOverride
			.filter((tool) => tool.name.includes(CLINE_MCP_TOOL_IDENTIFIER))
			.map((tool) => canonicalizeMcpToolName(tool.name)),
	)

	const filteredRegisteredTools = responseFilteredRegisteredTools.filter((tool) => {
		if (tool.id === ClineDefaultTool.USE_SUBAGENTS && tool.name !== "use_subagents") {
			return true
		}

		return allowedBuiltInToolIds.has(tool.id)
	})
	const filteredMcpTools = mcpTools.filter((tool) => allowedMcpCanonicalNames.has(canonicalizeMcpToolName(tool.name)))

	return [...filteredRegisteredTools, ...filteredMcpTools]
}
