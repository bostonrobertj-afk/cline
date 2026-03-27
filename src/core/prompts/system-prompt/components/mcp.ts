import type { McpServer } from "@/shared/mcp"
import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const INDXR_TOOL_SIGNATURES = new Set(["search_relevant", "get_file_summary", "read_source", "get_token_estimate"])
const INDXR_ANCHOR_TOOL_SIGNATURES = new Set(["search_relevant", "get_file_summary", "get_token_estimate"])
const MIN_INDXR_SIGNATURE_MATCHES = 2

export const INDXR_EXPLORATION_PREFERENCE_GUIDANCE =
	"When Indxr is available, use its tools first for code exploration, symbol discovery, file understanding, dependency tracing, and targeted source reads. Prefer tools like `search_relevant`, `get_file_summary`, `lookup_symbol`, `explain_symbol`, `read_source`, `get_file_context`, `get_public_api`, `get_callers`, and `get_related_tests` before built-in `search_files`, `list_code_definition_names`, `read_file`, or `read_file_range` whenever feasible."

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

export function getIndxrExplorationGuidance(context: SystemPromptContext): string {
	return hasConnectedIndxrServer(context)
		? `${INDXR_EXPLORATION_PREFERENCE_GUIDANCE}\n${BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE}`
		: ""
}

export function getSubagentIndxrExplorationGuidance(context: SystemPromptContext): string {
	return hasConnectedIndxrServer(context) ? SUBAGENT_INDXR_EXPLORATION_GUIDANCE : ""
}

export function getCodeExplorationGuidance(context: SystemPromptContext, fallbackWhenIndxrUnavailable: string): string {
	return hasConnectedIndxrServer(context)
		? `${INDXR_EXPLORATION_PREFERENCE_GUIDANCE} ${BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE}`
		: fallbackWhenIndxrUnavailable
}

export function replacePromptPlaceholders(description: string, context: SystemPromptContext): string {
	const searchFilesGuidance = hasConnectedIndxrServer(context)
		? "Use this only when you need exact regex search across raw files or when Indxr is unavailable or insufficient."
		: "Start here when you need to narrow candidate files or regions before using list_code_definition_names, read_file, or read_file_range."

	const listCodeDefinitionsGuidance = hasConnectedIndxrServer(context)
		? "Use this only when Indxr is unavailable or insufficient and you specifically need a built-in directory-level definition pass."
		: "Results include human-friendly 1-based line numbers so you can target a later read_file or read_file_range call instead of loading large files blindly."

	const readFileGuidance = hasConnectedIndxrServer(context)
		? "When Indxr is available, use its tools first for discovery, summaries, symbol lookup, dependency tracing, and targeted source reads. Use read_file only when you need the exact full raw contents of a file or when Indxr is insufficient."
		: "Prefer using search_files and list_code_definition_names first to narrow the target, then use read_file for the first full pass on a file. For follow-up checks on a focused region, prefer read_file_range instead of rereading the entire file."

	const readFileRangeGuidance = hasConnectedIndxrServer(context)
		? "Use this only when you need exact raw line-based inspection after Indxr has already narrowed the target, or when Indxr is insufficient."
		: "Use this after search_files or list_code_definition_names has already narrowed the problem to a focused region, or when you need a targeted refresher without replaying the entire file."

	const useMcpToolGuidance = hasConnectedIndxrServer(context)
		? ` When Indxr is available, default to its MCP tools first for code exploration, symbol lookup, file understanding, dependency tracing, and targeted source reads before using built-in \`search_files\`, \`list_code_definition_names\`, \`read_file\`, or \`read_file_range\`. Use built-in file tools only when exact raw file contents, regex search, or direct line inspection are required.`
		: ""

	return description
		.replace(/{{SEARCH_FILES_EXPLORATION_GUIDANCE}}/g, searchFilesGuidance)
		.replace(/{{LIST_CODE_DEFINITION_NAMES_EXPLORATION_GUIDANCE}}/g, listCodeDefinitionsGuidance)
		.replace(/{{READ_FILE_EXPLORATION_GUIDANCE}}/g, readFileGuidance)
		.replace(/{{READ_FILE_RANGE_EXPLORATION_GUIDANCE}}/g, readFileRangeGuidance)
		.replace(/{{USE_MCP_TOOL_EXPLORATION_GUIDANCE}}/g, useMcpToolGuidance)
}

const MCP_TEMPLATE_TEXT = `MCP SERVERS

The Model Context Protocol (MCP) enables communication between the system and locally running MCP servers that provide additional tools, resources, and prompts to extend your capabilities.

# Connected MCP Servers

When a server is connected, you can use the server's tools via the \`use_mcp_tool\` tool, and access the server's resources via the \`access_mcp_resource\` tool.

Servers may also provide prompts - predefined templates that can be invoked by users to generate contextual messages.{{INDXR_GUIDANCE}}

{{MCP_SERVERS_LIST}}`

export async function getMcp(variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	const servers = context.mcpHub?.getServers() || []
	// Skip the section if there are no servers connected / available
	if (servers.length === 0) {
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

	const serversList = servers.length > 0 ? formatMcpServersList(servers) : "(No MCP servers currently connected)"
	return new TemplateEngine().resolve(template, context, {
		INDXR_GUIDANCE: hasConnectedIndxrServer(context)
			? `\n\n# Indxr-Aware Exploration\n\n${getIndxrExplorationGuidance(context)}`
			: "",
		MCP_SERVERS_LIST: serversList,
	})
}

function formatMcpServersList(servers: McpServer[]): string {
	return servers
		.filter((server) => server.status === "connected")
		.map((server) => {
			const tools = server.tools
				?.map((tool) => {
					const schemaStr = tool.inputSchema
						? `    Input Schema:
    ${JSON.stringify(tool.inputSchema, null, 2).split("\n").join("\n    ")}`
						: ""

					return `- ${tool.name}: ${tool.description}\n${schemaStr}`
				})
				.join("\n\n")

			const templates = server.resourceTemplates
				?.map((template) => `- ${template.uriTemplate} (${template.name}): ${template.description}`)
				.join("\n")

			const resources = server.resources
				?.map((resource) => `- ${resource.uri} (${resource.name}): ${resource.description}`)
				.join("\n")

			const prompts = server.prompts
				?.map((prompt) => {
					const argsStr = prompt.arguments?.length
						? `\n    Arguments: ${prompt.arguments
								.map(
									(arg) =>
										`${arg.name}${arg.required ? " (required)" : ""}${arg.description ? `: ${arg.description}` : ""}`,
								)
								.join(", ")}`
						: ""
					const title = prompt.title ? ` (${prompt.title})` : ""
					return `- ${prompt.name}${title}: ${prompt.description || "No description"}${argsStr}`
				})
				.join("\n")

			const config = JSON.parse(server.config)

			return (
				`## ${server.name}` +
				(config.command
					? ` (\`${config.command}${config.args && Array.isArray(config.args) ? ` ${config.args.join(" ")}` : ""}\`)`
					: "") +
				(tools ? `\n\n### Available Tools\n${tools}` : "") +
				(templates ? `\n\n### Resource Templates\n${templates}` : "") +
				(resources ? `\n\n### Direct Resources\n${resources}` : "") +
				(prompts ? `\n\n### Available Prompts\n${prompts}` : "")
			)
		})
		.join("\n\n")
}
