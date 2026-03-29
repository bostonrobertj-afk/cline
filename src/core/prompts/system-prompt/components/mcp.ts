import type { McpServer } from "@/shared/mcp"
import { CLINE_MCP_TOOL_IDENTIFIER } from "@/shared/mcp"
import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const INDXR_TOOL_SIGNATURES = new Set([
	"lookup_symbol",
	"list_declarations",
	"search_signatures",
	"get_tree",
	"get_imports",
	"get_stats",
	"get_file_summary",
	"read_source",
	"get_file_context",
	"regenerate_index",
	"get_token_estimate",
	"search_relevant",
	"get_diff_summary",
	"batch_file_summaries",
	"get_callers",
	"get_public_api",
	"explain_symbol",
	"get_related_tests",
	"get_dependency_graph",
])
const INDXR_ANCHOR_TOOL_SIGNATURES = new Set(["search_relevant", "get_file_summary", "get_token_estimate"])
const MIN_INDXR_SIGNATURE_MATCHES = 2

export const BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE =
	"Use built-in file tools when Indxr is unavailable, insufficient for the task, or when exact raw file contents, regex search, or line-based inspection are required."

export const SUBAGENT_INDXR_EXPLORATION_GUIDANCE = `Prefer these Indxr tools for code exploration and structural discovery over built-in tools like \`search_files\`, \`list_code_definition_names\`, \`read_file\`, or \`read_file_range\`:

Use:
- \`search_relevant\` for broad code discovery
- \`lookup_symbol\` or \`explain_symbol\` for symbol lookup/understanding
- \`get_file_summary\` for first-pass file understanding
- \`read_source\` for symbol-level or targeted source reads
- \`get_file_context\` for dependency and surrounding-file context
- \`get_public_api\` for interface-only understanding
- \`get_callers\` and \`get_related_tests\` for usage and test tracing
- \`get_token_estimate\` before large reads

Fall back to built-in file tools when Indxr is insufficient or when exact raw file text, regex search, or direct line inspection is required.`

/**
 * Checks if there are any enabled MCP servers in the context.
 * This is a utility function to standardize MCP server detection across all prompt variants.
 *
 * @param context - The system prompt context
 * @returns true if there are enabled MCP servers, false otherwise
 *
 * @example
 * const hasMcp = hasEnabledMcpServers(context)
 * if (hasMcp) {
 *   // Include MCP-specific instructions
 * }
 */
export function hasEnabledMcpServers(context: SystemPromptContext): boolean {
	return (context.mcpHub?.getServers() || []).length > 0
}

export function getConnectedMcpServers(context: SystemPromptContext): McpServer[] {
	return (context.mcpHub?.getServers() || []).filter((server) => server.status === "connected" && server.disabled !== true)
}

export function isIndxrToolName(name: string | undefined): boolean {
	return name !== undefined && INDXR_TOOL_SIGNATURES.has(name)
}

export function getIndxrToolMatches(server: McpServer): string[] {
	const toolNames = new Set(server.tools?.map((tool) => tool.name).filter((name): name is string => Boolean(name)) ?? [])
	return [...toolNames].filter((name) => isIndxrToolName(name))
}

export function hasDistinctiveIndxrToolSignature(server: McpServer): boolean {
	const matches = getIndxrToolMatches(server)
	return matches.length >= MIN_INDXR_SIGNATURE_MATCHES && matches.some((toolName) => INDXR_ANCHOR_TOOL_SIGNATURES.has(toolName))
}

export function getConnectedIndxrServers(context: SystemPromptContext): McpServer[] {
	return getConnectedMcpServers(context).filter((server) => hasDistinctiveIndxrToolSignature(server))
}

export function hasConnectedIndxrServer(context: SystemPromptContext): boolean {
	return getConnectedIndxrServers(context).length > 0
}

export function normalizeVisibleNativeToolName(name: string): string {
	const delimiterIndex = name.lastIndexOf(CLINE_MCP_TOOL_IDENTIFIER)
	if (delimiterIndex === -1) {
		return name
	}

	return name.slice(delimiterIndex + CLINE_MCP_TOOL_IDENTIFIER.length)
}

export function getVisibleNativeToolNames(context: SystemPromptContext): string[] {
	return [...(context.visibleNativeToolNames ?? [])]
}

export function getVisibleIndxrToolNames(context: SystemPromptContext): string[] {
	const visibleIndxrToolNames: string[] = []
	const seen = new Set<string>()

	for (const name of getVisibleNativeToolNames(context)) {
		const normalizedName = normalizeVisibleNativeToolName(name)
		if (!isIndxrToolName(normalizedName) || seen.has(normalizedName)) {
			continue
		}
		seen.add(normalizedName)
		visibleIndxrToolNames.push(normalizedName)
	}

	return visibleIndxrToolNames
}

export function hasConnectedMcpResources(context: SystemPromptContext): boolean {
	return getConnectedMcpServers(context).some(
		(server) => (server.resources?.length ?? 0) > 0 || (server.resourceTemplates?.length ?? 0) > 0,
	)
}

function renderIndxrToolNames(toolNames: readonly string[]): string {
	return toolNames.map((toolName) => `\`${toolName}\``).join(", ")
}

function renderIndxrExplorationPreferenceGuidance(toolNames: readonly string[]): string {
	return `Use Indxr MCP's tools for code exploration, symbol discovery, file understanding, dependency tracing, and targeted source reads. Prefer exactly these visible Indxr tools: ${renderIndxrToolNames(toolNames)} before built-in \`search_files\`, \`list_code_definition_names\`, \`read_file\`, or \`read_file_range\` whenever feasible.`
}

function renderSubagentVisibleIndxrExplorationGuidance(toolNames: readonly string[]): string {
	return `Prefer these visible Indxr tools for code exploration and structural discovery over built-in tools like \`search_files\`, \`list_code_definition_names\`, \`read_file\`, or \`read_file_range\`: ${renderIndxrToolNames(toolNames)}.\n\nFall back to built-in file tools when Indxr is insufficient or when exact raw file text, regex search, or direct line inspection is required.`
}

export function getIndxrExplorationGuidance(context: SystemPromptContext): string {
	if (context.enableNativeToolCalls === true) {
		const visibleIndxrToolNames = getVisibleIndxrToolNames(context)
		if (visibleIndxrToolNames.length === 0) {
			return ""
		}

		return `${renderIndxrExplorationPreferenceGuidance(visibleIndxrToolNames)} ${BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE}`
	}

	return hasConnectedIndxrServer(context)
		? `${renderIndxrExplorationPreferenceGuidance([
				"search_relevant",
				"get_file_summary",
				"lookup_symbol",
				"explain_symbol",
				"read_source",
				"get_file_context",
				"get_public_api",
				"get_callers",
				"get_related_tests",
			])} ${BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE}`
		: ""
}

export function getSubagentIndxrExplorationGuidance(context: SystemPromptContext): string {
	if (context.enableNativeToolCalls === true) {
		const visibleIndxrToolNames = getVisibleIndxrToolNames(context)
		if (visibleIndxrToolNames.length === 0) {
			return ""
		}

		return renderSubagentVisibleIndxrExplorationGuidance(visibleIndxrToolNames)
	}

	return hasConnectedIndxrServer(context) ? SUBAGENT_INDXR_EXPLORATION_GUIDANCE : ""
}

export function getCodeExplorationGuidance(context: SystemPromptContext, fallbackWhenIndxrUnavailable: string): string {
	const indxrGuidance = getIndxrExplorationGuidance(context)
	return indxrGuidance || fallbackWhenIndxrUnavailable
}

export function replacePromptPlaceholders(description: string, context: SystemPromptContext): string {
	const searchFilesGuidance = hasConnectedIndxrServer(context)
		? "Use this only when you need exact regex search across raw files or when Indxr is unavailable or insufficient."
		: "Start here when you need to narrow candidate files or regions before using list_code_definition_names, read_file, or read_file_range."

	const listCodeDefinitionsGuidance = hasConnectedIndxrServer(context)
		? "Use this only when Indxr is unavailable or insufficient and you specifically need a built-in directory-level definition pass."
		: "Results include human-friendly 1-based line numbers so you can target a later read_file or read_file_range call instead of loading large files blindly."

	const readFileGuidance = hasConnectedIndxrServer(context)
		? "When Indxr is available, use its tools first for discovery, summaries, symbol lookup, dependency tracing, and targeted source reads. Use read_file only when you need the exact full raw contents of a file that is at or below 300 lines and 16384 bytes, or when Indxr is insufficient."
		: "Prefer using search_files and list_code_definition_names first to narrow the target, then use read_file_range for targeted inspection. Use read_file only when the file is at or below 300 lines and 16384 bytes and you truly need the exact full contents."

	const readFileRangeGuidance = hasConnectedIndxrServer(context)
		? "Use this only when you need exact raw line-based inspection after Indxr has already narrowed the target, or when Indxr is insufficient."
		: "Use this after search_files or list_code_definition_names has already narrowed the problem to a focused region, or when you need a targeted refresher without replaying the entire file."

	const useMcpToolGuidance = hasConnectedIndxrServer(context)
		? ` When Indxr is available, default to its MCP tools first for code exploration, symbol lookup, file understanding, dependency tracing, and targeted source reads before using built-in \`search_files\`, \`list_code_definition_names\`, \`read_file\`, or \`read_file_range\`. For large files, prefer symbol-targeted or explicit line-range reads instead of full raw source reads. Use built-in file tools only when exact raw file contents, regex search, or direct line inspection are required.`
		: ""

	return description
		.replace(/{{SEARCH_FILES_EXPLORATION_GUIDANCE}}/g, searchFilesGuidance)
		.replace(/{{LIST_CODE_DEFINITION_NAMES_EXPLORATION_GUIDANCE}}/g, listCodeDefinitionsGuidance)
		.replace(/{{READ_FILE_EXPLORATION_GUIDANCE}}/g, readFileGuidance)
		.replace(/{{READ_FILE_RANGE_EXPLORATION_GUIDANCE}}/g, readFileRangeGuidance)
		.replace(/{{USE_MCP_TOOL_EXPLORATION_GUIDANCE}}/g, useMcpToolGuidance)
}

const MCP_TEMPLATE_TEXT = `{{INDXR_GUIDANCE}}`

export async function getMcp(variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	const servers = context.mcpHub?.getServers() || []
	// Skip the section if there are no servers connected / available
	if (servers.length === 0) {
		return undefined
	}

	const indxrGuidance = getIndxrExplorationGuidance(context)
	if (!indxrGuidance) {
		return undefined
	}

	if (context.useMinimalGptPrompt === true) {
		const connectedServers = getConnectedMcpServers(context)
		if (connectedServers.length === 0) {
			return undefined
		}
		const minimalTemplate = MCP_TEMPLATE_TEXT
		return await getMcpServers(
			connectedServers,
			{
				...variant,
				componentOverrides: { ...variant.componentOverrides, [SystemPromptSection.MCP]: { template: minimalTemplate } },
			},
			context,
		)
	}

	return await getMcpServers(servers, variant, context)
}

async function getMcpServers(servers: McpServer[], variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.MCP]?.template || MCP_TEMPLATE_TEXT
	const indxrGuidance = getIndxrExplorationGuidance(context)

	return new TemplateEngine().resolve(template, context, {
		INDXR_GUIDANCE: indxrGuidance ? `Indxr-Aware Exploration\n${indxrGuidance}` : "",
		MCP_SERVERS_LIST: "",
	})
}
