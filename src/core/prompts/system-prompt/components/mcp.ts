import type { McpServer } from "@/shared/mcp"
import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const INDXR_TOOL_SIGNATURES = new Set(["search_relevant", "get_file_summary", "read_source", "get_token_estimate"])
const INDXR_ANCHOR_TOOL_SIGNATURES = new Set(["search_relevant", "get_file_summary", "get_token_estimate"])
const MIN_INDXR_SIGNATURE_MATCHES = 2

export const INDXR_EXPLORATION_PREFERENCE_GUIDANCE =
	"When Indxr is available, prefer it for code exploration, structural summaries, and targeted source discovery before using built-in `search_files`, `list_code_definition_names`, `read_file`, or `read_file_range`."

export const BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE =
	"Use built-in file tools when Indxr is unavailable, insufficient for the task, or when exact raw file contents, regex search, or line-based inspection are required."

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

export function getCodeExplorationGuidance(context: SystemPromptContext, fallbackWhenIndxrUnavailable: string): string {
	return hasConnectedIndxrServer(context)
		? `${INDXR_EXPLORATION_PREFERENCE_GUIDANCE} ${BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE}`
		: fallbackWhenIndxrUnavailable
}

export function replacePromptPlaceholders(description: string, context: SystemPromptContext): string {
	const searchFilesGuidance = hasConnectedIndxrServer(context)
		? "Use this when Indxr is unavailable, insufficient for the task, or when regex search across raw files is the better fit."
		: "Start here when you need to narrow candidate files or regions before using list_code_definition_names, read_file, or read_file_range."

	const listCodeDefinitionsGuidance = hasConnectedIndxrServer(context)
		? "Use this when Indxr is unavailable, insufficient for the task, or when a built-in directory-level definition pass is the better fit."
		: "Results include human-friendly 1-based line numbers so you can target a later read_file or read_file_range call instead of loading large files blindly."

	const readFileRangeGuidance = hasConnectedIndxrServer(context)
		? "Use this after Indxr or other exploration tools have isolated a specific raw file region that must be inspected directly, or when you need a targeted refresher without replaying the entire file."
		: "Use this after search_files or list_code_definition_names has already narrowed the problem to a focused region, or when you need a targeted refresher without replaying the entire file."

	const useMcpToolGuidance = hasConnectedIndxrServer(context)
		? ` When Indxr is available, prefer its MCP tools for code exploration, structural summaries, and targeted source discovery before using built-in \`search_files\`, \`list_code_definition_names\`, \`read_file\`, or \`read_file_range\`.`
		: ""

	return description
		.replace(/{{SEARCH_FILES_EXPLORATION_GUIDANCE}}/g, searchFilesGuidance)
		.replace(/{{LIST_CODE_DEFINITION_NAMES_EXPLORATION_GUIDANCE}}/g, listCodeDefinitionsGuidance)
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
		const connectedServerNames = getConnectedMcpServers(context)
			.map((server) => server.name)
			.join(", ")

		if (!connectedServerNames) {
			return undefined
		}

		const indxrGuidance = hasConnectedIndxrServer(context) ? `\n\n${getIndxrExplorationGuidance(context)}` : ""

		return `MCP SERVERS

Connected MCP servers: ${connectedServerNames}

Use MCP tools/resources only when needed. Full MCP details are omitted on this compact prompt turn.${indxrGuidance}`
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
