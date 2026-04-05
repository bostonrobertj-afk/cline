import { expect } from "chai"
import { describe, it } from "mocha"
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions"
import type { McpHub } from "@/services/mcp/McpHub"
import type { McpServer } from "@/shared/mcp"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
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
import { access_mcp_resource_variants } from "../tools/access_mcp_resource"
import { act_mode_respond_variants } from "../tools/act_mode_respond"
import { ask_followup_question_variants } from "../tools/ask_followup_question"
import { attempt_completion_variants } from "../tools/attempt_completion"
import { build_epics_document_variants } from "../tools/build_epics_document"
import { build_review_diff_output_variants } from "../tools/build_review_diff_output"
import { build_review_input_variants } from "../tools/build_review_input"
import { generate_plan_output_variants } from "../tools/generate_plan_output"
import { list_code_definition_names_variants } from "../tools/list_code_definition_names"
import { read_file_variants } from "../tools/read_file"
import { read_file_range_variants } from "../tools/read_file_range"
import { search_files_variants } from "../tools/search_files"
import { send_user_message_variants } from "../tools/send_user_message"
import { set_workflow_placeholders_variants } from "../tools/set_workflow_placeholders"
import { story_notes_update_variants } from "../tools/story_notes_update"
import { story_task_complete_variants } from "../tools/story_task_complete"
import { use_mcp_tool_variants } from "../tools/use_mcp_tool"
import { workflow_progress_request_variants } from "../tools/workflow_progress_request"
import { write_to_file_variants } from "../tools/write_to_file"
import type { SystemPromptContext } from "../types"

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

describe("workflow placeholder tool gating", () => {
	it("enables set_workflow_placeholders for active non-managed workflows", () => {
		const tool = set_workflow_placeholders_variants[0]
		expect(
			tool.contextRequirements?.({
				...mockContext,
				activeWorkflowSupportsPlaceholders: true,
			}),
		).to.equal(true)
	})

	it("keeps build_review_diff_output globally available without workflow gating", () => {
		const tool = build_review_diff_output_variants[0]
		expect(tool.contextRequirements).to.equal(undefined)
	})

	it("keeps build_review_input globally available without workflow gating", () => {
		const tool = build_review_input_variants[0]
		expect(tool.contextRequirements).to.equal(undefined)
	})

	it("keeps build_epics_document globally available without workflow gating", () => {
		const tool = build_epics_document_variants[0]
		expect(tool.contextRequirements).to.equal(undefined)
	})

	it("gates workflow_progress_request to create-prd steps 3 through 14", () => {
		const tool = workflow_progress_request_variants[0]

		expect(
			tool.contextRequirements?.({
				...mockContext,
				activePlaceholderWorkflowName: "create-prd.md",
				activePlaceholderWorkflowStepNumber: 3,
			}),
		).to.equal(true)
		expect(
			tool.contextRequirements?.({
				...mockContext,
				activePlaceholderWorkflowName: "create-prd.md",
				activePlaceholderWorkflowStepNumber: 2,
			}),
		).to.equal(false)
		expect(
			tool.contextRequirements?.({
				...mockContext,
				activePlaceholderWorkflowName: "create-epics.md",
				activePlaceholderWorkflowStepNumber: 3,
			}),
		).to.equal(false)
	})

	it("encodes build_review_diff_output source variants as machine-readable schema", () => {
		const tool = build_review_diff_output_variants[0]
		const source = tool.parameters?.find((parameter) => parameter.name === "source")

		expect(source?.properties?.type?.enum).to.deep.equal(["commit", "commit_range", "ref_diff", "worktree_head_scoped"])
		expect(source?.oneOf).to.have.length(4)
	})

	it("omits task_progress from supported deterministic placeholder workflow native schemas", () => {
		const context: SystemPromptContext = {
			...mockContext,
			enableNativeToolCalls: true,
			activeWorkflowSupportsPlaceholders: true,
			activeDeterministicPlaceholderWorkflowEnabled: true,
			providerInfo: {
				providerId: "openai",
				model: { id: "gpt-5.4-2026-03-05", info: { supportsPromptCache: false } },
				mode: "act",
			},
		}

		const writeToFile = toolSpecFunctionDefinition(write_to_file_variants[1], context)
		const attemptCompletion = toolSpecFunctionDefinition(attempt_completion_variants[3], context)
		const actModeRespond = toolSpecFunctionDefinition(act_mode_respond_variants[0], context)
		const generatePlanOutput = toolSpecFunctionDefinition(generate_plan_output_variants[1], context)

		expect(getOpenAIProperties(writeToFile).task_progress).to.equal(undefined)
		expect(getOpenAIProperties(attemptCompletion).task_progress).to.equal(undefined)
		expect(getOpenAIProperties(actModeRespond).task_progress).to.equal(undefined)
		expect(getOpenAIProperties(generatePlanOutput).task_progress).to.equal(undefined)
	})

	it("includes task_progress in send_user_message native schemas for normal non-deterministic contexts", () => {
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

		expect(getOpenAIProperties(sendUserMessage).task_progress).to.not.equal(undefined)
	})

	it("exposes agent_feedback on the four supported response tool schemas", () => {
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
			toolSpecFunctionDefinition(getVariantTool(attempt_completion_variants, ModelFamily.NATIVE_GPT_5), context),
			toolSpecFunctionDefinition(getVariantTool(generate_plan_output_variants, ModelFamily.NATIVE_GPT_5), context),
		]

		for (const tool of tools) {
			const agentFeedback = getOpenAIProperties(tool).agent_feedback
			expect(agentFeedback).to.exist
			expect(agentFeedback.type).to.equal("object")
			expect(agentFeedback.properties?.message).to.exist
			expect(agentFeedback.required).to.include("message")
		}
	})

	it("omits task_progress from send_user_message native schemas for supported deterministic placeholder workflows", () => {
		const context: SystemPromptContext = {
			...mockContext,
			enableNativeToolCalls: true,
			activeWorkflowSupportsPlaceholders: true,
			activeDeterministicPlaceholderWorkflowEnabled: true,
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

	it("compacts native GPT tool descriptions and task_progress parameter text in minimal GPT mode", () => {
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
				{
					name: "task_progress",
					required: false,
					instruction:
						"A checklist showing task progress after this tool use is completed. The task_progress parameter must be included as a separate parameter inside of the parent tool call.",
				},
			],
		})

		const openAI = toolSpecFunctionDefinition(tool, context)
		const openAIProperties = getOpenAIProperties(openAI)

		expect(getOpenAIFunctionTool(openAI).description).to.equal(
			"Apply a V4A patch by passing the complete `apply_patch` command in `input` with `*** Begin Patch` and `*** End Patch`.",
		)
		expect(openAIProperties.input?.description).to.equal("Complete `apply_patch` command to execute.")
		expect(openAIProperties.task_progress?.description).to.equal(
			"Top-level tool parameter, not a standalone tool. Pass a full Markdown checklist to create the task list. After a checklist exists, use `__COMPLETE_NEXT_STEP__` to complete the next incomplete step.",
		)
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

	it("uses direct-material-first compact exploration descriptions for review-edge-case-hunter step 2", () => {
		const context: SystemPromptContext = {
			...indxrContext,
			enableNativeToolCalls: true,
			useMinimalGptPrompt: true,
			activePlaceholderWorkflowName: "review-edge-case-hunter.md",
			activePlaceholderWorkflowStepNumber: 2,
			visibleNativeToolNames: ["search_relevant", "get_file_summary"],
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
			"Use only after inspecting the supplied diff, review input, or directly changed code, or when exact raw-text regex search is specifically required.",
		)
		expect(getOpenAIFunctionTool(defsTool).description).to.equal(
			"Use only after direct inspection of the changed or directly referenced file reveals a concrete need for a built-in top-level definition pass.",
		)
		expect(getOpenAIFunctionTool(readTool).description).to.equal(
			"Start with directly changed or directly referenced files. Use read_file when you need the exact full raw contents of one concrete file at or below 800 lines and 65536 bytes to confirm a review finding.",
		)
		expect(getOpenAIFunctionTool(rangeTool).description).to.equal(
			"Use this for targeted line-based inspection in directly changed or directly referenced code, or when a concrete file exceeds the full-read limit.",
		)
		expect(getOpenAIFunctionTool(mcpTool).description).to.equal(
			"Use a connected MCP tool only after inspecting the supplied diff, review input, or directly changed code. Use it for targeted discovery or source reads on directly changed or directly referenced code, and broaden structural traversal only when a concrete unresolved question remains after direct inspection.",
		)
	})

	it("uses file-first compact exploration descriptions for dev-story step 2", () => {
		const context: SystemPromptContext = {
			...indxrContext,
			enableNativeToolCalls: true,
			useMinimalGptPrompt: true,
			activePlaceholderWorkflowName: "dev-story.md",
			activePlaceholderWorkflowStepNumber: 2,
			visibleNativeToolNames: ["search_relevant", "get_file_summary"],
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
			"Use only after direct reads of story-named or cited files fail to reveal the implementation seam, or when exact raw-text regex search is specifically required.",
		)
		expect(getOpenAIFunctionTool(defsTool).description).to.equal(
			"Use only after direct reads of story-named or cited files fail to reveal the implementation seam and you need a built-in top-level definition pass.",
		)
		expect(getOpenAIFunctionTool(readTool).description).to.equal(
			"For this implementation step, prefer direct reads of story-named or cited files before MCP exploration. Use read_file when you need the exact full raw contents of one concrete file at or below 800 lines and 65536 bytes.",
		)
		expect(getOpenAIFunctionTool(rangeTool).description).to.equal(
			"Use this for targeted line-based inspection in a directly relevant file, or when a concrete file exceeds the full-read limit.",
		)
		expect(getOpenAIFunctionTool(mcpTool).description).to.equal(
			"Use a connected MCP tool only after direct reads of story-named or cited files and narrow built-in search fail to reveal the implementation seam.",
		)
	})

	it("compacts native set_workflow_placeholders.values to an object map description", () => {
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
			name: "set_workflow_placeholders",
			description:
				'Persist dynamic placeholder values discovered during the active workflow. Use the wrapper shape {"values":{"story_path":"docs/story.md","project_context":"docs/project-context.md"}}. Do not use this for stable config-backed placeholders like output_folder; those come from .cline/workflow-config.yaml.',
			parameters: [
				{
					name: "values",
					required: true,
					type: "object",
					instruction:
						'Object map of placeholder keys to string values. Call the tool as {"values": {...}}. Not arrays of {name,value} or {key,value}.',
					additionalProperties: { type: "string" },
				},
			],
		})

		const openAI = toolSpecFunctionDefinition(tool, context)
		const openAIProperties = getOpenAIProperties(openAI)

		expect(openAIProperties.values?.description).to.equal(
			'Object map of placeholder keys to strings. Call the tool as {"values": {...}}. Not arrays of {name,value} or {key,value}.',
		)
		expect(getOpenAIFunctionTool(openAI).description).to.equal(
			'Persist dynamic placeholder values discovered during the active workflow. Call as {"values":{"story_path":"docs/story.md","project_context":"docs/project-context.md"}}. Stable config-backed placeholders like output_folder come from .cline/workflow-config.yaml.',
		)
	})

	it("describes dev-story task completion and notes-update parameters with the locked runtime ids and section values", () => {
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

		const completeTool = toolSpecFunctionDefinition(story_task_complete_variants[0], context)
		const notesTool = toolSpecFunctionDefinition(story_notes_update_variants[0], context)
		const completeProperties = getOpenAIProperties(completeTool)
		const notesProperties = getOpenAIProperties(notesTool)

		expect(completeProperties.storyTaskId?.description).to.contain("1-based top-level task ordinal")
		expect(completeProperties.storyTaskId?.description).to.contain("copied from the injected current task block")
		expect(completeProperties.storySubtaskId?.description).to.contain("optional 1-based subtask ordinal")
		expect(completeProperties.storySubtaskId?.description).to.contain("under that parent task")
		expect(notesProperties.section?.enum).to.deep.equal(["Completion Notes List", "File List"])
		expect(notesProperties.section?.description).to.contain("Allowed values")
	})

	it("compacts native build_review_diff_output descriptions and parameter text", () => {
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

		const openAI = toolSpecFunctionDefinition(build_review_diff_output_variants[0], context)
		const openAIProperties = getOpenAIProperties(openAI)

		expect(getOpenAIFunctionTool(openAI).description).to.equal(
			"Build and atomically replace {diff_output} from an explicit Git-backed source. Use for code-review diff artifact construction, not for arbitrary file writes.",
		)
		expect(openAIProperties.source?.description).to.equal(
			'Required source object. Supported shape: {"type":"commit","commit":"<ref>"} | {"type":"commit_range","base":"<ref>","head":"<ref>"} | {"type":"ref_diff","base":"<ref>","head":"<ref>"} | {"type":"worktree_head_scoped"}.',
		)
		expect(openAIProperties.scoped_paths?.description).to.equal(
			'Optional repository-relative path array. Required for {"type":"worktree_head_scoped"}.',
		)
		expect(openAIProperties.context_lines?.description).to.equal("Optional unified diff context line count. Defaults to 3.")
	})

	it("compacts native build_review_input descriptions and parameter text", () => {
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

		const openAI = toolSpecFunctionDefinition(build_review_input_variants[0], context)
		const openAIProperties = getOpenAIProperties(openAI)

		expect(getOpenAIFunctionTool(openAI).description).to.equal(
			"Build review-input.md from workflow-owned {story_path} and {diff_output}. Resolve inputs from workflow state; there are no human-supplied parameters.",
		)
		expect(Object.keys(openAIProperties)).to.deep.equal([])
	})

	it("compacts native build_epics_document descriptions and parameter text", () => {
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

		const openAI = toolSpecFunctionDefinition(build_epics_document_variants[0], context)
		const openAIProperties = getOpenAIProperties(openAI)

		expect(getOpenAIFunctionTool(openAI).description).to.equal(
			"Build or resolve the canonical epics artifact at {output_folder}/planning_artifacts/epics.md from workflow-owned placeholder state. Resolve inputs from workflow state; there are no human-supplied parameters.",
		)
		expect(Object.keys(openAIProperties)).to.deep.equal([])
	})

	it("compacts native workflow_progress_request descriptions with no parameters", () => {
		const context: SystemPromptContext = {
			...mockContext,
			enableNativeToolCalls: true,
			useMinimalGptPrompt: true,
			providerInfo: {
				providerId: "openai",
				model: { id: "gpt-5.4-2026-03-05", info: { supportsPromptCache: false } },
				mode: "act",
			},
			activePlaceholderWorkflowName: "create-prd.md",
			activePlaceholderWorkflowStepNumber: 3,
		}

		const openAI = toolSpecFunctionDefinition(workflow_progress_request_variants[0], context)

		expect(getOpenAIFunctionTool(openAI).description).to.equal(
			"Ask whether the user is ready to move to the next create-prd workflow step. The runtime owns the Yes/No prompt, and the Yes branch advances the focus chain before the next request is built.",
		)
		expect(Object.keys(getOpenAIProperties(openAI))).to.deep.equal([])
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
