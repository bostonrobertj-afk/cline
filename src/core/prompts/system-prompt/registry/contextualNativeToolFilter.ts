import { CLINE_MCP_TOOL_IDENTIFIER } from "@/shared/mcp"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"
import type { SystemPromptContext } from "../types"
import {
	ACT_MODE_RESPONSE_TOOL_IDS,
	ALWAYS_PRESERVED_NATIVE_TOOL_IDS,
	PLACEHOLDER_BUILTIN_BUNDLE_TOOLS,
	PLACEHOLDER_INDXR_BUNDLE_TOOLS,
	PLACEHOLDER_WORKFLOW_STEP_MATRIX,
	PLAN_MODE_RESPONSE_TOOL_IDS,
} from "./contextualToolMatrix"

type BuiltInBundleName = keyof typeof PLACEHOLDER_BUILTIN_BUNDLE_TOOLS
type IndxrBundleName = keyof typeof PLACEHOLDER_INDXR_BUNDLE_TOOLS

function hasWorkflowMatrixRow(workflowName: string): boolean {
	return Object.hasOwn(PLACEHOLDER_WORKFLOW_STEP_MATRIX, workflowName)
}

function normalizeWorkflowNameForMatrixLookup(context: SystemPromptContext): string | undefined {
	const name = context.activePlaceholderWorkflowName
	if (!name) {
		return undefined
	}

	if (hasWorkflowMatrixRow(name)) {
		return name
	}

	if (!name.endsWith(".md")) {
		const suffixedName = `${name}.md`
		if (hasWorkflowMatrixRow(suffixedName)) {
			return suffixedName
		}
	}

	if (name.endsWith(".md")) {
		const unsuffixedName = name.slice(0, -3)
		if (hasWorkflowMatrixRow(unsuffixedName)) {
			return unsuffixedName
		}
	}

	return undefined
}

function isBuiltInBundleName(bundleName: string): bundleName is BuiltInBundleName {
	return Object.hasOwn(PLACEHOLDER_BUILTIN_BUNDLE_TOOLS, bundleName)
}

function isIndxrBundleName(bundleName: string): bundleName is IndxrBundleName {
	return Object.hasOwn(PLACEHOLDER_INDXR_BUNDLE_TOOLS, bundleName)
}

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

	if (context.managedWorkflowActive === true) {
		return [...responseFilteredRegisteredTools, ...mcpTools]
	}

	if (!context.activePlaceholderWorkflowName) {
		return [...responseFilteredRegisteredTools, ...mcpTools]
	}

	if (context.activePlaceholderWorkflowStepNumber === undefined) {
		return [...responseFilteredRegisteredTools, ...mcpTools]
	}

	const normalizedWorkflowName = normalizeWorkflowNameForMatrixLookup(context)
	if (!normalizedWorkflowName) {
		return [...responseFilteredRegisteredTools, ...mcpTools]
	}

	const stepRow = PLACEHOLDER_WORKFLOW_STEP_MATRIX[normalizedWorkflowName]?.[context.activePlaceholderWorkflowStepNumber]
	if (!stepRow) {
		return [...responseFilteredRegisteredTools, ...mcpTools]
	}

	const currentModeResponseToolIds =
		context.providerInfo.mode === "plan" ? PLAN_MODE_RESPONSE_TOOL_IDS : ACT_MODE_RESPONSE_TOOL_IDS

	const allowedBuiltInToolIds = new Set<ClineDefaultTool>([
		...currentModeResponseToolIds,
		...ALWAYS_PRESERVED_NATIVE_TOOL_IDS,
		...stepRow.flatMap((bundleName) =>
			isBuiltInBundleName(bundleName) ? [...PLACEHOLDER_BUILTIN_BUNDLE_TOOLS[bundleName]] : [],
		),
	])

	const allowedIndxrCanonicalNames = new Set<string>(
		stepRow.flatMap((bundleName) => (isIndxrBundleName(bundleName) ? [...PLACEHOLDER_INDXR_BUNDLE_TOOLS[bundleName]] : [])),
	)

	const filteredRegisteredTools = responseFilteredRegisteredTools.filter((tool) => allowedBuiltInToolIds.has(tool.id))
	const filteredMcpTools = mcpTools.filter((tool) => allowedIndxrCanonicalNames.has(canonicalizeMcpToolName(tool.name)))

	return [...filteredRegisteredTools, ...filteredMcpTools]
}
