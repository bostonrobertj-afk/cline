import { expect } from "chai"
import { describe, it } from "mocha"
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions"
import type { McpHub } from "@/services/mcp/McpHub"
import type { McpServer } from "@/shared/mcp"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { getSystemPromptComponents } from "../components"
import {
	getCodeExplorationGuidance,
	getIndxrToolMatches,
	getSubagentIndxrExplorationGuidance,
	hasConnectedIndxrServer,
	hasDistinctiveIndxrToolSignature,
	isIndxrToolName,
	SUBAGENT_INDXR_EXPLORATION_GUIDANCE,
} from "../components/mcp"
import type { ClineToolSpec } from "../spec"
import { toolSpecFunctionDeclarations, toolSpecFunctionDefinition, toolSpecInputSchema } from "../spec"
import { STANDARD_PLACEHOLDERS, SystemPromptSection } from "../templates/placeholders"
import { access_mcp_resource_variants } from "../tools/access_mcp_resource"
import { ask_followup_question_variants } from "../tools/ask_followup_question"
import { list_code_definition_names_variants } from "../tools/list_code_definition_names"
import { read_file_variants } from "../tools/read_file"
import { read_file_range_variants } from "../tools/read_file_range"
import { search_files_variants } from "../tools/search_files"
import { send_user_message_variants } from "../tools/send_user_message"
import { use_mcp_tool_variants } from "../tools/use_mcp_tool"
import type { SystemPromptContext } from "../types"
import { loadAllVariantConfigs } from "../variants"

type JsonSchemaProperty = {
	description?: string
	type?: string
	properties?: Record<string, JsonSchemaProperty>
	required?: string[]
	enum?: string[]
	oneOf?: unknown[]
}

type OpenAIFunctionParameters = {
	properties?: Record<string, JsonSchemaProperty>
}

type AnthropicInputSchema = {
	properties?: Record<string, JsonSchemaProperty>
}

const mockContext: SystemPromptContext = {
	cwd: "/test/project",
	ide: "TestIde",
	supportsBrowserUse: true,
	clineWebToolsEnabled: true,
	subagentsEnabled: true,
	providerInfo: { providerId: "test", model: { id: "test-model", info: { supportsPromptCache: false } }, mode: "act" },
	enableNativeToolCalls: false,
	isTesting: true,
}

const makeMcpHub = (servers: McpServer[]): McpHub =>
	({
		getServers: () => servers,
	}) as unknown as McpHub

const getOpenAIFunctionTool = (tool: ReturnType<typeof toolSpecFunctionDefinition>): ChatCompletionFunctionTool["function"] => {
	if (tool.type !== "function") {
		throw new Error("Expected OpenAI function tool")
	}

	return tool.function
}

const getOpenAIProperties = (tool: ReturnType<typeof toolSpecFunctionDefinition>): Record<string, JsonSchemaProperty> =>
	(getOpenAIFunctionTool(tool).parameters as unknown as OpenAIFunctionParameters).properties ?? {}

const getAnthropicProperties = (tool: ReturnType<typeof toolSpecInputSchema>): Record<string, JsonSchemaProperty> =>
	(tool.input_schema as unknown as AnthropicInputSchema).properties ?? {}

const getGeminiProperties = (tool: ReturnType<typeof toolSpecFunctionDeclarations>): Record<string, JsonSchemaProperty> =>
	(tool.parameters?.properties as Record<string, JsonSchemaProperty> | undefined) ?? {}

const getVariantTool = (tools: readonly ClineToolSpec[], variant: ModelFamily): ClineToolSpec => {
	const tool = tools.find((candidate) => candidate.variant === variant)
	if (!tool) {
		throw new Error(`Missing tool variant for ${variant}`)
	}
	return tool
}

const indxrContext: SystemPromptContext = {
	...mockContext,
	mcpHub: makeMcpHub([
		{
			name: "workspace-index",
			status: "connected",
			config: '{"command":"indxr"}',
			tools: [
				{ name: "search_relevant", description: "Search relevant code", inputSchema: { type: "object", properties: {} } },
				{ name: "get_file_summary", description: "Summarize file", inputSchema: { type: "object", properties: {} } },
			],
		},
	]),
}

const makeTool = (overrides?: Partial<ClineToolSpec>): ClineToolSpec => ({
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.FILE_READ,
	name: "read_file",
	description: "Read a file",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: "The path of the file to read relative to {{CWD}}",
		},
		{
			name: "optional_param",
			required: false,
			instruction: "An optional parameter",
		},
	],
	...overrides,
})

describe("toolSpecFunctionDeclarations (Gemini)", () => {
	it("includes parameter descriptions from instruction field", () => {
		const result = toolSpecFunctionDeclarations(makeTool(), mockContext)

		const pathParam = getGeminiProperties(result).path
		expect(pathParam).to.exist
		expect(pathParam.description).to.be.a("string")
		expect(pathParam.description).to.include("path of the file to read")
	})

	it("includes descriptions for all parameters", () => {
		const result = toolSpecFunctionDeclarations(makeTool(), mockContext)

		const props = getGeminiProperties(result)
		expect(props.path?.description).to.be.a("string").and.not.be.empty
		expect(props.optional_param?.description).to.be.a("string").and.not.be.empty
	})

	it("handles function-type instructions", () => {
		const tool = makeTool({
			parameters: [
				{
					name: "dynamic",
					required: true,
					instruction: (ctx: SystemPromptContext) => `Dynamic value: ${ctx.cwd}`,
				},
			],
		})
		const result = toolSpecFunctionDeclarations(tool, mockContext)

		const param = getGeminiProperties(result).dynamic
		expect(param.description).to.equal("Dynamic value: /test/project")
	})

	it("omits description when instruction is empty", () => {
		const tool = makeTool({
			parameters: [{ name: "empty", required: false, instruction: "" }],
		})
		const result = toolSpecFunctionDeclarations(tool, mockContext)

		const param = getGeminiProperties(result).empty
		expect(param.description).to.be.undefined
	})
})

describe("Indxr MCP detection", () => {
	it("detects Indxr by connected tool signature", () => {
		const connectedServer = (indxrContext.mcpHub as McpHub).getServers()[0] as McpServer

		expect(isIndxrToolName("search_relevant")).to.equal(true)
		expect(isIndxrToolName("get_file_summary")).to.equal(true)
		expect(isIndxrToolName("lookup_symbol")).to.equal(true)
		expect(isIndxrToolName("get_dependency_graph")).to.equal(true)
		expect(isIndxrToolName("list_declarations")).to.equal(true)
		expect(getIndxrToolMatches(connectedServer)).to.deep.equal(["search_relevant", "get_file_summary"])
		expect(hasDistinctiveIndxrToolSignature(connectedServer)).to.equal(true)
		expect(hasConnectedIndxrServer(indxrContext)).to.equal(true)
	})

	it("matches extended Indxr tool names while keeping the distinctive signature rule", () => {
		const server = {
			name: "workspace-index",
			status: "connected",
			config: '{"command":"indxr"}',
			tools: [
				{ name: "lookup_symbol", description: "Lookup symbol", inputSchema: { type: "object", properties: {} } },
				{ name: "get_callers", description: "Get callers", inputSchema: { type: "object", properties: {} } },
				{ name: "search_relevant", description: "Search relevant", inputSchema: { type: "object", properties: {} } },
			],
		} satisfies McpServer

		expect(getIndxrToolMatches(server)).to.include.members(["lookup_symbol", "get_callers", "search_relevant"])
		expect(hasDistinctiveIndxrToolSignature(server)).to.equal(true)
	})

	it("does not treat a server name alone as Indxr availability", () => {
		const context: SystemPromptContext = {
			...mockContext,
			mcpHub: makeMcpHub([
				{
					name: "indxr",
					status: "connected",
					config: '{"command":"indxr"}',
					tools: [{ name: "plain_tool", description: "Not Indxr", inputSchema: { type: "object", properties: {} } }],
				},
			]),
		}

		expect(hasConnectedIndxrServer(context)).to.equal(false)
	})

	it("does not trigger on read_source alone", () => {
		const context: SystemPromptContext = {
			...mockContext,
			mcpHub: makeMcpHub([
				{
					name: "generic-code-reader",
					status: "connected",
					config: '{"command":"generic"}',
					tools: [{ name: "read_source", description: "Read source", inputSchema: { type: "object", properties: {} } }],
				},
			]),
		}

		const server = (context.mcpHub as McpHub).getServers()[0] as McpServer
		expect(getIndxrToolMatches(server)).to.deep.equal(["read_source"])
		expect(hasDistinctiveIndxrToolSignature(server)).to.equal(false)
		expect(hasConnectedIndxrServer(context)).to.equal(false)
	})

	it("does not trigger on a single anchor tool match", () => {
		const context: SystemPromptContext = {
			...mockContext,
			mcpHub: makeMcpHub([
				{
					name: "searchish",
					status: "connected",
					config: '{"command":"search"}',
					tools: [
						{
							name: "search_relevant",
							description: "Search relevant",
							inputSchema: { type: "object", properties: {} },
						},
					],
				},
			]),
		}

		const server = (context.mcpHub as McpHub).getServers()[0] as McpServer
		expect(getIndxrToolMatches(server)).to.deep.equal(["search_relevant"])
		expect(hasDistinctiveIndxrToolSignature(server)).to.equal(false)
		expect(hasConnectedIndxrServer(context)).to.equal(false)
	})

	it("triggers on an anchor tool plus an additional Indxr match", () => {
		const server = {
			name: "workspace-index",
			status: "connected",
			config: '{"command":"indxr"}',
			tools: [
				{ name: "get_token_estimate", description: "Token estimate", inputSchema: { type: "object", properties: {} } },
				{ name: "read_source", description: "Read source", inputSchema: { type: "object", properties: {} } },
			],
		} satisfies McpServer

		expect(getIndxrToolMatches(server)).to.deep.equal(["get_token_estimate", "read_source"])
		expect(hasDistinctiveIndxrToolSignature(server)).to.equal(true)
	})

	it("returns the dedicated subagent Indxr guidance only when a distinctive Indxr server is connected", () => {
		expect(getSubagentIndxrExplorationGuidance(indxrContext)).to.equal(SUBAGENT_INDXR_EXPLORATION_GUIDANCE)
		expect(getSubagentIndxrExplorationGuidance(mockContext)).to.equal("")
	})

	it("uses visible native Indxr tools when present and falls back when they are absent", () => {
		const fallbackGuidance = "fallback guidance"
		const nativeVisibleGuidance = getCodeExplorationGuidance(
			{
				...indxrContext,
				enableNativeToolCalls: true,
				visibleNativeToolNames: ["search_relevant"],
			},
			fallbackGuidance,
		)
		const nativeFallbackGuidance = getCodeExplorationGuidance(
			{
				...indxrContext,
				enableNativeToolCalls: true,
				visibleNativeToolNames: [],
			},
			fallbackGuidance,
		)

		expect(nativeVisibleGuidance).to.include("`search_relevant`").and.not.include("`get_file_summary`")
		expect(nativeFallbackGuidance).to.equal(fallbackGuidance)
		expect(() => {
			const nonNativeGuidance = getCodeExplorationGuidance(indxrContext, fallbackGuidance)
			expect(nonNativeGuidance).to.not.equal("")
		}).to.not.throw()
	})
})

describe("Gemini and Anthropic parameter descriptions match", () => {
	it("both converters produce the same description text", () => {
		const tool = makeTool()
		const gemini = toolSpecFunctionDeclarations(tool, mockContext)
		const anthropic = toolSpecInputSchema(tool, mockContext)

		const geminiDesc = getGeminiProperties(gemini).path?.description
		const anthropicDesc = getAnthropicProperties(anthropic).path?.description

		expect(geminiDesc).to.equal(anthropicDesc)
	})
})

describe("system prompt workflow component removal", () => {
	it("omits removed workflow sections from components, placeholders, and variant configs", () => {
		const removedSectionKeys = [["WORKFLOW", "SYSTEM", "INSTRUCTIONS"].join("_"), ["WORKFLOW", "INPUT"].join("_")]
		const removedSectionValues = removedSectionKeys.map((key) => [key, "SECTION"].join("_"))
		const registeredComponentIds = getSystemPromptComponents().map((component) => component.id)
		const placeholderValues = Object.values(STANDARD_PLACEHOLDERS)

		for (const key of removedSectionKeys) {
			expect(Object.hasOwn(SystemPromptSection, key)).to.equal(false)
		}

		for (const value of removedSectionValues) {
			expect(registeredComponentIds).to.not.include(value)
			expect(placeholderValues).to.not.include(value)
		}

		for (const config of Object.values(loadAllVariantConfigs())) {
			const overrideKeys = Object.keys(config.componentOverrides ?? {})

			for (const value of removedSectionValues) {
				expect(config.componentOrder).to.not.include(value as SystemPromptSection)
				expect(config.baseTemplate ?? "").to.not.include(`{{${value}}}`)
				expect(overrideKeys).to.not.include(value)
			}
		}
	})
})

describe("workflow placeholder tool gating", () => {
	it("omits task_progress from send_user_message native schemas for normal non-deterministic contexts", () => {
		const context: SystemPromptContext = {
			...mockContext,
			enableNativeToolCalls: true,
			providerInfo: {
				providerId: "openai",
				model: { id: "gpt-5.4-2026-03-05", info: { supportsPromptCache: false } },
				mode: "act",
			},
		}

		const sendUserMessage = toolSpecFunctionDefinition(
			getVariantTool(send_user_message_variants, ModelFamily.NATIVE_GPT_5),
			context,
		)

		expect(getOpenAIProperties(sendUserMessage).task_progress).to.equal(undefined)
	})

	it("exposes agent_feedback on supported user-response tool schemas", () => {
		const context: SystemPromptContext = {
			...mockContext,
			enableNativeToolCalls: true,
			providerInfo: {
				providerId: "openai",
				model: { id: "gpt-5.4-2026-03-05", info: { supportsPromptCache: false } },
				mode: "act",
			},
		}

		const tools = [
			toolSpecFunctionDefinition(getVariantTool(send_user_message_variants, ModelFamily.NATIVE_GPT_5), context),
			toolSpecFunctionDefinition(getVariantTool(ask_followup_question_variants, ModelFamily.NATIVE_GPT_5), context),
		]

		for (const tool of tools) {
			const agentFeedback = getOpenAIProperties(tool).agent_feedback
			expect(agentFeedback).to.exist
			expect(agentFeedback.type).to.equal("object")
			expect(agentFeedback.properties?.message).to.exist
			expect(agentFeedback.required).to.include("message")
		}
	})

	it("omits access_mcp_resource native schemas when connected servers expose no resources or resource templates", () => {
		const context: SystemPromptContext = {
			...mockContext,
			enableNativeToolCalls: true,
			mcpHub: makeMcpHub([
				{
					name: "empty-server",
					status: "connected",
					config: '{"command":"empty"}',
					disabled: false,
					resources: [],
					resourceTemplates: [],
				},
			]),
			providerInfo: {
				providerId: "openai",
				model: { id: "gpt-5.4-2026-03-05", info: { supportsPromptCache: false } },
				mode: "act",
			},
		}

		const accessMcpResource = getVariantTool(access_mcp_resource_variants, ModelFamily.NATIVE_GPT_5)
		expect(() => toolSpecFunctionDefinition(accessMcpResource, context)).to.throw(
			"Tool access_mcp_resource does not meet context requirements",
		)
	})

	it("includes access_mcp_resource native schemas when a connected server exposes resources or resource templates", () => {
		const context: SystemPromptContext = {
			...mockContext,
			enableNativeToolCalls: true,
			mcpHub: makeMcpHub([
				{
					name: "resource-server",
					status: "connected",
					config: '{"command":"resource"}',
					disabled: false,
					resources: [],
					resourceTemplates: [{ uriTemplate: "test://{id}", name: "template" }],
				},
			]),
			providerInfo: {
				providerId: "openai",
				model: { id: "gpt-5.4-2026-03-05", info: { supportsPromptCache: false } },
				mode: "act",
			},
		}

		const accessMcpResource = toolSpecFunctionDefinition(
			getVariantTool(access_mcp_resource_variants, ModelFamily.NATIVE_GPT_5),
			context,
		)

		expect(getOpenAIFunctionTool(accessMcpResource).name).to.equal("access_mcp_resource")
	})
})

describe("native tool placeholder replacement", () => {
	it("replaces CWD and MULTI_ROOT_HINT placeholders in descriptions", () => {
		const context: SystemPromptContext = {
			...mockContext,
			isMultiRootEnabled: true,
		}
		const tool = makeTool({
			parameters: [
				{
					name: "path",
					required: true,
					instruction: "Path (relative to {{CWD}}){{MULTI_ROOT_HINT}}",
				},
			],
		})

		const openAI = toolSpecFunctionDefinition(tool, context)
		const anthropic = toolSpecInputSchema(tool, context)
		const gemini = toolSpecFunctionDeclarations(tool, context)

		const openAIDesc = getOpenAIProperties(openAI).path?.description as string
		const anthropicDesc = getAnthropicProperties(anthropic).path?.description as string
		const geminiDesc = getGeminiProperties(gemini).path?.description as string

		for (const desc of [openAIDesc, anthropicDesc, geminiDesc]) {
			expect(desc).to.include("/test/project")
			expect(desc).to.include("Use @workspace:path syntax")
			expect(desc).to.not.include("{{CWD}}")
			expect(desc).to.not.include("{{MULTI_ROOT_HINT}}")
		}
	})

	it("compacts native GPT tool descriptions without task_progress in minimal GPT mode", () => {
		const context: SystemPromptContext = {
			...mockContext,
			enableNativeToolCalls: true,
			useMinimalGptPrompt: true,
			providerInfo: {
				providerId: "openai",
				model: { id: "gpt-5.4-2026-03-05", info: { supportsPromptCache: false } },
				mode: "act",
			},
		}
		const tool = makeTool({
			name: "apply_patch",
			description:
				'This is a custom utility that makes it more convenient to add, remove, move, or edit code in a single file. To use the `apply_patch` command, you should pass a message of the following structure as "input": ...',
			parameters: [
				{
					name: "input",
					required: true,
					instruction: "The apply_patch command that you wish to execute.",
				},
			],
		})

		const openAI = toolSpecFunctionDefinition(tool, context)
		const openAIProperties = getOpenAIProperties(openAI)

		expect(getOpenAIFunctionTool(openAI).description).to.equal(
			"Apply a V4A patch by passing the complete `apply_patch` command in `input` with `*** Begin Patch` and `*** End Patch`.",
		)
		expect(openAIProperties.input?.description).to.equal("Complete `apply_patch` command to execute.")
		expect(openAIProperties.task_progress).to.equal(undefined)
	})

	it("keeps native compact exploration tool descriptions unchanged when Indxr is absent", () => {
		const context: SystemPromptContext = {
			...mockContext,
			enableNativeToolCalls: true,
			useMinimalGptPrompt: true,
			providerInfo: {
				providerId: "openai",
				model: { id: "gpt-5.4-2026-03-05", info: { supportsPromptCache: false } },
				mode: "act",
			},
		}

		const searchTool = toolSpecFunctionDefinition(search_files_variants[1], context)
		const defsTool = toolSpecFunctionDefinition(list_code_definition_names_variants[1], context)
		const readTool = toolSpecFunctionDefinition(read_file_variants[1], context)
		const rangeTool = toolSpecFunctionDefinition(read_file_range_variants[1], context)

		expect(getOpenAIFunctionTool(searchTool).description).to.equal(
			"Request to perform a regex search across files in a specified directory, providing context-rich results.",
		)
		expect(getOpenAIFunctionTool(defsTool).description).to.equal(
			"Request to list definition names (classes, functions, methods, etc.) used in source code files at the top level of the specified directory.",
		)
		expect(getOpenAIFunctionTool(readTool).description).to.equal(
			"Request to read the contents of a file at the specified path.",
		)
		expect(getOpenAIFunctionTool(rangeTool).description).to.equal(
			"Request to read only a specific 1-based line range from a text file.",
		)
	})

	it("switches native compact exploration descriptions when Indxr is connected", () => {
		const context: SystemPromptContext = {
			...indxrContext,
			enableNativeToolCalls: true,
			useMinimalGptPrompt: true,
			visibleNativeToolNames: ["search_relevant", "get_file_summary", "lookup_symbol"],
			providerInfo: {
				providerId: "openai",
				model: { id: "gpt-5.4-2026-03-05", info: { supportsPromptCache: false } },
				mode: "act",
			},
		}

		const searchTool = toolSpecFunctionDefinition(search_files_variants[1], context)
		const defsTool = toolSpecFunctionDefinition(list_code_definition_names_variants[1], context)
		const readTool = toolSpecFunctionDefinition(read_file_variants[1], context)
		const rangeTool = toolSpecFunctionDefinition(read_file_range_variants[1], context)
		const mcpTool = toolSpecFunctionDefinition(use_mcp_tool_variants[0], context)

		expect(getOpenAIFunctionTool(searchTool).description).to.equal(
			"Use only for exact raw-text regex search when Indxr is unavailable, insufficient, or regex search is specifically required.",
		)
		expect(getOpenAIFunctionTool(defsTool).description).to.equal(
			"Use only when Indxr is unavailable or insufficient and you specifically need a built-in top-level definition pass.",
		)
		expect(getOpenAIFunctionTool(readTool).description).to.equal(
			"Use Indxr first for discovery, summaries, symbol lookup, dependency tracing, and targeted source reads. Once the task is narrowed to one concrete file, use read_file when exact full raw file contents are required for a file at or below 800 lines and 65536 bytes, or when Indxr is insufficient.",
		)
		expect(getOpenAIFunctionTool(rangeTool).description).to.equal(
			"Use only when exact raw line-based inspection is required after Indxr has already narrowed the target, when the file exceeds the full-read limit, or when Indxr is insufficient.",
		)
		expect(getOpenAIFunctionTool(mcpTool).description).to.equal(
			"Use a connected MCP tool. When Indxr is available, default to its exploration tools first for code exploration, symbol lookup, file understanding, dependency tracing, and targeted source reads. After you have narrowed the task to one concrete file, prefer one full raw read only when the file is at or below 800 lines and 65536 bytes; otherwise prefer symbol-targeted or explicit line-range source reads.",
		)
	})

	it("preserves integer types for read_file_range line parameters", () => {
		const tool = read_file_range_variants[0]

		const openAI = toolSpecFunctionDefinition(tool, mockContext)
		const anthropic = toolSpecInputSchema(tool, mockContext)
		const gemini = toolSpecFunctionDeclarations(tool, mockContext)

		expect(getOpenAIProperties(openAI).start_line?.type).to.equal("integer")
		expect(getOpenAIProperties(openAI).end_line?.type).to.equal("integer")
		expect(getAnthropicProperties(anthropic).start_line?.type).to.equal("integer")
		expect(getAnthropicProperties(anthropic).end_line?.type).to.equal("integer")
		expect(getGeminiProperties(gemini).start_line?.type).to.equal("NUMBER")
		expect(getGeminiProperties(gemini).end_line?.type).to.equal("NUMBER")
	})
})
