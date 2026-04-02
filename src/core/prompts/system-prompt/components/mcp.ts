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

export function hasUsableIndxrExplorationContext(context: SystemPromptContext): boolean {
	if (context.enableNativeToolCalls === true) {
		return hasConnectedIndxrServer(context) && getVisibleIndxrToolNames(context).length > 0
	}

	return hasConnectedIndxrServer(context)
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

export function normalizeActivePlaceholderWorkflowName(context: SystemPromptContext): string | undefined {
	const workflowName = context.activePlaceholderWorkflowName?.trim()
	if (!workflowName) {
		return undefined
	}

	return workflowName.endsWith(".md") ? workflowName : `${workflowName}.md`
}

export function isDevStoryImplementationStep(context: SystemPromptContext): boolean {
	return normalizeActivePlaceholderWorkflowName(context) === "dev-story.md" && context.activePlaceholderWorkflowStepNumber === 2
}

export function isDirectMaterialReviewStep(context: SystemPromptContext): boolean {
	const workflowName = normalizeActivePlaceholderWorkflowName(context)
	const stepNumber = context.activePlaceholderWorkflowStepNumber

	return (
		(workflowName === "blind-review.md" && stepNumber === 2) ||
		(workflowName === "review-adversarial-general.md" && stepNumber === 2) ||
		(workflowName === "review-edge-case-hunter.md" && (stepNumber === 2 || stepNumber === 3))
	)
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

		if (isDevStoryImplementationStep(context)) {
			return `For this implementation step, open story-named or cited files first. Use exactly these visible Indxr tools only if direct file reads and narrow built-in search do not reveal the implementation seam: ${renderIndxrToolNames(visibleIndxrToolNames)}.`
		}

		if (isDirectMaterialReviewStep(context)) {
			return `Use the supplied diff, review input, or directly changed code as the primary review boundary. Use exactly these visible Indxr tools only for targeted discovery and source reads on directly changed or directly referenced code: ${renderIndxrToolNames(visibleIndxrToolNames)}. Broaden structural traversal only when a concrete unresolved question remains after direct inspection.`
		}

		return `${renderIndxrExplorationPreferenceGuidance(visibleIndxrToolNames)} ${BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE}`
	}

	if (!hasConnectedIndxrServer(context)) {
		return ""
	}

	const defaultIndxrToolNames = [
		"search_relevant",
		"get_file_summary",
		"lookup_symbol",
		"explain_symbol",
		"read_source",
		"get_file_context",
		"get_public_api",
		"get_callers",
		"get_related_tests",
	]

	if (isDevStoryImplementationStep(context)) {
		return `For this implementation step, open story-named or cited files first. Use exactly these visible Indxr tools only if direct file reads and narrow built-in search do not reveal the implementation seam: ${renderIndxrToolNames(defaultIndxrToolNames)}.`
	}

	if (isDirectMaterialReviewStep(context)) {
		return `Use the supplied diff, review input, or directly changed code as the primary review boundary. Use exactly these visible Indxr tools only for targeted discovery and source reads on directly changed or directly referenced code: ${renderIndxrToolNames(defaultIndxrToolNames)}. Broaden structural traversal only when a concrete unresolved question remains after direct inspection.`
	}

	return `${renderIndxrExplorationPreferenceGuidance(defaultIndxrToolNames)} ${BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE}`
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
	const isDevStoryStep = isDevStoryImplementationStep(context)
	const isDirectReviewStep = isDirectMaterialReviewStep(context)
	const hasUsableIndxr = hasUsableIndxrExplorationContext(context)

	const searchFilesGuidance = isDevStoryStep
		? "Start with story-named or cited files. Use this only after those direct file reads fail to reveal the implementation seam, or when exact raw-text regex search is specifically required."
		: isDirectReviewStep
			? "Use this only after inspecting the supplied diff, review input, or directly changed code, or when exact raw-text regex search is specifically required."
			: hasUsableIndxr
				? "Use this only when you need exact regex search across raw files or when Indxr is unavailable or insufficient."
				: "Start here when you need to narrow candidate files or regions before using list_code_definition_names, read_file, or read_file_range."

	const listCodeDefinitionsGuidance = isDevStoryStep
		? "Use this only after direct file reads fail to reveal the implementation seam and you need a built-in top-level definition pass."
		: isDirectReviewStep
			? "Use this only after direct inspection of the changed or directly referenced file reveals a concrete need for a built-in top-level definition pass."
			: hasUsableIndxr
				? "Use this only when Indxr is unavailable or insufficient and you specifically need a built-in directory-level definition pass."
				: "Results include human-friendly 1-based line numbers so you can target a later read_file or read_file_range call instead of loading large files blindly."

	const readFileGuidance = isDevStoryStep
		? "For this implementation step, prefer direct reads of story-named or cited files before MCP exploration. Use read_file when you need the exact full raw contents of one concrete file at or below 800 lines and 65536 bytes."
		: isDirectReviewStep
			? "Start with directly changed or directly referenced files. Use read_file when you need the exact full raw contents of one concrete file at or below 800 lines and 65536 bytes to confirm a review finding."
			: hasUsableIndxr
				? "When Indxr is available, use its tools first for discovery, summaries, symbol lookup, dependency tracing, and targeted source reads. Once you have narrowed the work to one concrete file, prefer a single read_file call when that file is at or below 800 lines and 65536 bytes and you need the full raw contents for editing; otherwise keep using targeted source reads or read_file_range."
				: "Prefer using search_files and list_code_definition_names first to narrow the target, then use read_file_range for targeted inspection. Once you have narrowed the work to one concrete file, prefer a single read_file call when that file is at or below 800 lines and 65536 bytes and you need the full raw contents, rather than stitching together many nearby range reads."

	const readFileRangeGuidance = isDevStoryStep
		? "Use this for targeted line-based inspection in a directly relevant file, or when a concrete file exceeds the full-read limit."
		: isDirectReviewStep
			? "Use this for targeted line-based inspection in directly changed or directly referenced code, or when a concrete file exceeds the full-read limit."
			: hasUsableIndxr
				? "Use this when you need exact raw line-based inspection after Indxr has already narrowed the target, when the file exceeds the full-read limit, or when Indxr is insufficient."
				: "Use this after search_files or list_code_definition_names has narrowed the problem to a focused region, when the file exceeds the full-read limit, or when you need a targeted refresher without replaying the entire file."

	const useMcpToolGuidance = isDevStoryStep
		? " For this implementation step, open story-named or cited files first. Use connected MCP exploration only if those direct file reads and narrow built-in search do not reveal the implementation seam."
		: isDirectReviewStep
			? " Start from the supplied diff, review input, or directly changed code. Use connected MCP tools only for targeted discovery or source reads on directly changed or directly referenced code. Broaden structural traversal only when a concrete unresolved question remains after direct inspection."
			: hasUsableIndxr
				? ` When Indxr is available, default to its MCP tools first for code exploration, symbol lookup, file understanding, dependency tracing, and targeted source reads before using built-in \`search_files\`, \`list_code_definition_names\`, \`read_file\`, or \`read_file_range\`. After you have narrowed the task to one concrete file, prefer one full raw read only when the file is at or below 800 lines and 65536 bytes; otherwise prefer symbol-targeted or explicit line-range reads. Use built-in file tools only when exact raw file contents, regex search, or direct line inspection are required.`
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

async function getMcpServers(_servers: McpServer[], variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.MCP]?.template || MCP_TEMPLATE_TEXT
	const indxrGuidance = getIndxrExplorationGuidance(context)

	return new TemplateEngine().resolve(template, context, {
		INDXR_GUIDANCE: indxrGuidance ? `Indxr-Aware Exploration\n${indxrGuidance}` : "",
		MCP_SERVERS_LIST: "",
	})
}
