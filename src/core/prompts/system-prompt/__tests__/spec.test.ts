import { expect } from "chai"
import { describe, it } from "mocha"
import type { McpHub } from "@/services/mcp/McpHub"
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
import { build_review_diff_output_variants } from "../tools/build_review_diff_output"
import { generate_plan_output_variants } from "../tools/generate_plan_output"
import { list_code_definition_names_variants } from "../tools/list_code_definition_names"
import { read_file_variants } from "../tools/read_file"
import { read_file_range_variants } from "../tools/read_file_range"
import { search_files_variants } from "../tools/search_files"
import { send_user_message_variants } from "../tools/send_user_message"
import { set_workflow_placeholders_variants } from "../tools/set_workflow_placeholders"
import { use_mcp_tool_variants } from "../tools/use_mcp_tool"
import { write_to_file_variants } from "../tools/write_to_file"
import type { SystemPromptContext } from "../types"

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

const makeMcpHub = (servers: any[]): McpHub =>
	({
		getServers: () => servers,
	}) as unknown as McpHub

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

		const pathParam = result.parameters?.properties?.["path"] as any
		expect(pathParam).to.exist
		expect(pathParam.description).to.be.a("string")
		expect(pathParam.description).to.include("path of the file to read")
	})

	it("includes descriptions for all parameters", () => {
		const result = toolSpecFunctionDeclarations(makeTool(), mockContext)

		const props = result.parameters?.properties as any
		expect(props["path"].description).to.be.a("string").and.not.be.empty
		expect(props["optional_param"].description).to.be.a("string").and.not.be.empty
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

		const param = result.parameters?.properties?.["dynamic"] as any
		expect(param.description).to.equal("Dynamic value: /test/project")
	})

	it("omits description when instruction is empty", () => {
		const tool = makeTool({
			parameters: [{ name: "empty", required: false, instruction: "" }],
		})
		const result = toolSpecFunctionDeclarations(tool, mockContext)

		const param = result.parameters?.properties?.["empty"] as any
		expect(param.description).to.be.undefined
	})
})

describe("Indxr MCP detection", () => {
	it("detects Indxr by connected tool signature", () => {
		expect(isIndxrToolName("search_relevant")).to.equal(true)
		expect(isIndxrToolName("get_file_summary")).to.equal(true)
		expect(isIndxrToolName("lookup_symbol")).to.equal(true)
		expect(isIndxrToolName("get_dependency_graph")).to.equal(true)
		expect(isIndxrToolName("list_declarations")).to.equal(true)
		expect(getIndxrToolMatches((indxrContext.mcpHub as McpHub).getServers()[0] as any)).to.deep.equal([
			"search_relevant",
			"get_file_summary",
		])
		expect(hasDistinctiveIndxrToolSignature((indxrContext.mcpHub as McpHub).getServers()[0] as any)).to.equal(true)
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
		} as any

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

		const server = (context.mcpHub as McpHub).getServers()[0] as any
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

		const server = (context.mcpHub as McpHub).getServers()[0] as any
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
		} as any

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

		const geminiDesc = (gemini.parameters?.properties?.["path"] as any)?.description
		const anthropicDesc = (anthropic.input_schema as any).properties["path"]?.description

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

		const writeToFile = toolSpecFunctionDefinition(write_to_file_variants[1], context) as any
		const attemptCompletion = toolSpecFunctionDefinition(attempt_completion_variants[3], context) as any
		const actModeRespond = toolSpecFunctionDefinition(act_mode_respond_variants[0], context) as any
		const generatePlanOutput = toolSpecFunctionDefinition(generate_plan_output_variants[1], context) as any

		expect(writeToFile.function.parameters.properties.task_progress).to.equal(undefined)
		expect(attemptCompletion.function.parameters.properties.task_progress).to.equal(undefined)
		expect(actModeRespond.function.parameters.properties.task_progress).to.equal(undefined)
		expect(generatePlanOutput.function.parameters.properties.task_progress).to.equal(undefined)
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
			send_user_message_variants.find((tool) => tool.variant === ModelFamily.NATIVE_GPT_5)!,
			context,
		) as any

		expect(sendUserMessage.function.parameters.properties.task_progress).to.not.equal(undefined)
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
			toolSpecFunctionDefinition(
				send_user_message_variants.find((tool) => tool.variant === ModelFamily.NATIVE_GPT_5)!,
				context,
			) as any,
			toolSpecFunctionDefinition(
				ask_followup_question_variants.find((tool) => tool.variant === ModelFamily.NATIVE_GPT_5)!,
				context,
			) as any,
			toolSpecFunctionDefinition(
				attempt_completion_variants.find((tool) => tool.variant === ModelFamily.NATIVE_GPT_5)!,
				context,
			) as any,
			toolSpecFunctionDefinition(
				generate_plan_output_variants.find((tool) => tool.variant === ModelFamily.NATIVE_GPT_5)!,
				context,
			) as any,
		]

		for (const tool of tools) {
			const agentFeedback = tool.function.parameters.properties.agent_feedback
			expect(agentFeedback).to.exist
			expect(agentFeedback.type).to.equal("object")
			expect(agentFeedback.properties.message).to.exist
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
			send_user_message_variants.find((tool) => tool.variant === ModelFamily.NATIVE_GPT_5)!,
			context,
		) as any

		expect(sendUserMessage.function.parameters.properties.task_progress).to.equal(undefined)
	})

	it("omits access_mcp_resource native schemas when connected servers expose no resources or resource templates", () => {
		const context: SystemPromptContext = {
			...mockContext,
			enableNativeToolCalls: true,
			mcpHub: makeMcpHub([
				{
					name: "empty-server",
					status: "connected",
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

		const accessMcpResource = access_mcp_resource_variants.find((tool) => tool.variant === ModelFamily.NATIVE_GPT_5)!
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
			access_mcp_resource_variants.find((tool) => tool.variant === ModelFamily.NATIVE_GPT_5)!,
			context,
		) as any

		expect(accessMcpResource.function.name).to.equal("access_mcp_resource")
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

		const openAIDesc = ((openAI as any).function.parameters.properties.path as any).description as string
		const anthropicDesc = ((anthropic as any).input_schema.properties.path as any).description as string
		const geminiDesc = (gemini.parameters?.properties?.["path"] as any)?.description as string

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

		const openAI = toolSpecFunctionDefinition(tool, context) as any

		expect(openAI.function.description).to.equal(
			"Apply a V4A patch by passing the complete `apply_patch` command in `input` with `*** Begin Patch` and `*** End Patch`.",
		)
		expect(openAI.function.parameters.properties.input.description).to.equal("Complete `apply_patch` command to execute.")
		expect(openAI.function.parameters.properties.task_progress.description).to.equal(
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

		const searchTool = toolSpecFunctionDefinition(search_files_variants[1], context) as any
		const defsTool = toolSpecFunctionDefinition(list_code_definition_names_variants[1], context) as any
		const readTool = toolSpecFunctionDefinition(read_file_variants[1], context) as any
		const rangeTool = toolSpecFunctionDefinition(read_file_range_variants[1], context) as any

		expect(searchTool.function.description).to.equal(
			"Request to perform a regex search across files in a specified directory, providing context-rich results.",
		)
		expect(defsTool.function.description).to.equal(
			"Request to list definition names (classes, functions, methods, etc.) used in source code files at the top level of the specified directory.",
		)
		expect(readTool.function.description).to.equal("Request to read the contents of a file at the specified path.")
		expect(rangeTool.function.description).to.equal("Request to read only a specific 1-based line range from a text file.")
	})

	it("switches native compact exploration descriptions when Indxr is connected", () => {
		const context: SystemPromptContext = {
			...indxrContext,
			enableNativeToolCalls: true,
			useMinimalGptPrompt: true,
			providerInfo: {
				providerId: "openai",
				model: { id: "gpt-5.4-2026-03-05", info: { supportsPromptCache: false } },
				mode: "act",
			},
		}

		const searchTool = toolSpecFunctionDefinition(search_files_variants[1], context) as any
		const defsTool = toolSpecFunctionDefinition(list_code_definition_names_variants[1], context) as any
		const readTool = toolSpecFunctionDefinition(read_file_variants[1], context) as any
		const rangeTool = toolSpecFunctionDefinition(read_file_range_variants[1], context) as any
		const mcpTool = toolSpecFunctionDefinition(use_mcp_tool_variants[0], context) as any

		expect(searchTool.function.description).to.equal(
			"Use only for exact raw-text regex search when Indxr is unavailable, insufficient, or regex search is specifically required.",
		)
		expect(defsTool.function.description).to.equal(
			"Use only when Indxr is unavailable or insufficient and you specifically need a built-in top-level definition pass.",
		)
		expect(readTool.function.description).to.equal(
			"Use Indxr first for discovery, summaries, symbol lookup, dependency tracing, and targeted source reads. Use read_file only when exact full raw file contents are required for a file at or below 300 lines and 16384 bytes, or when Indxr is insufficient.",
		)
		expect(rangeTool.function.description).to.equal(
			"Use only when exact raw line-based inspection is required after Indxr has already narrowed the target, or when Indxr is insufficient.",
		)
		expect(mcpTool.function.description).to.equal(
			"Use a connected MCP tool. When Indxr is available, default to its exploration tools first for code exploration, symbol lookup, file understanding, dependency tracing, and targeted source reads. For large files, prefer symbol-targeted or explicit line-range source reads instead of full raw file reads.",
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

		const openAI = toolSpecFunctionDefinition(tool, context) as any

		expect(openAI.function.parameters.properties.values.description).to.equal(
			'Object map of placeholder keys to strings. Call the tool as {"values": {...}}. Not arrays of {name,value} or {key,value}.',
		)
		expect(openAI.function.description).to.equal(
			'Persist dynamic placeholder values discovered during the active workflow. Call as {"values":{"story_path":"docs/story.md","project_context":"docs/project-context.md"}}. Stable config-backed placeholders like output_folder come from .cline/workflow-config.yaml.',
		)
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

		const openAI = toolSpecFunctionDefinition(build_review_diff_output_variants[0], context) as any

		expect(openAI.function.description).to.equal(
			"Build and atomically replace {diff_output} from an explicit Git-backed source. Use for code-review diff artifact construction, not for arbitrary file writes.",
		)
		expect(openAI.function.parameters.properties.source.description).to.equal(
			'Required source object. Supported shape: {"type":"commit","commit":"<ref>"} | {"type":"commit_range","base":"<ref>","head":"<ref>"} | {"type":"ref_diff","base":"<ref>","head":"<ref>"} | {"type":"worktree_head_scoped"}.',
		)
		expect(openAI.function.parameters.properties.scoped_paths.description).to.equal(
			'Optional repository-relative path array. Required for {"type":"worktree_head_scoped"}.',
		)
		expect(openAI.function.parameters.properties.context_lines.description).to.equal(
			"Optional unified diff context line count. Defaults to 3.",
		)
	})

	it("preserves integer types for read_file_range line parameters", () => {
		const tool = read_file_range_variants[0]

		const openAI = toolSpecFunctionDefinition(tool, mockContext) as any
		const anthropic = toolSpecInputSchema(tool, mockContext) as any
		const gemini = toolSpecFunctionDeclarations(tool, mockContext) as any

		expect(openAI.function.parameters.properties.start_line.type).to.equal("integer")
		expect(openAI.function.parameters.properties.end_line.type).to.equal("integer")
		expect(anthropic.input_schema.properties.start_line.type).to.equal("integer")
		expect(anthropic.input_schema.properties.end_line.type).to.equal("integer")
		expect(gemini.parameters.properties.start_line.type).to.equal("NUMBER")
		expect(gemini.parameters.properties.end_line.type).to.equal("NUMBER")
	})
})
