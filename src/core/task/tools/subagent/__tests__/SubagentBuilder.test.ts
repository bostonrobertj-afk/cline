import { strict as assert } from "node:assert"
import * as api from "@core/api"
import { PromptRegistry } from "@core/prompts/system-prompt"
import { ClineToolSet } from "@core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@core/prompts/system-prompt/spec"
import type { PromptVariant, SystemPromptContext } from "@core/prompts/system-prompt/types"
import { StateManager } from "@core/storage/StateManager"
import { McpHub } from "@services/mcp/McpHub"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@/shared/AutoApprovalSettings"
import type { ApiProvider } from "@/shared/api"
import type { McpServer } from "@/shared/mcp"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import {
	SUBAGENT_DEFAULT_ALLOWED_TOOLS,
	SUBAGENT_SYSTEM_SUFFIX,
	SUBAGENT_WORKFLOW_SYSTEM_SUFFIX,
	SubagentBuilder,
	type SubagentBuilderConfig,
	type SubagentBuilderConfigSource,
} from "../SubagentBuilder"

type TestBuilderConfig = SubagentBuilderConfig & {
	services: {
		stateManager: sinon.SinonStubbedInstance<StateManager>
	}
}

function createTaskConfig(mode: "act" | "plan", provider: ApiProvider, useMcp = false): TestBuilderConfig {
	const stateManager = sinon.createStubInstance(StateManager)
	stateManager.getGlobalSettingsKey.withArgs("mode").returns(mode)
	stateManager.getGlobalSettingsKey.withArgs("autoApprovalSettings").returns({
		...DEFAULT_AUTO_APPROVAL_SETTINGS,
		actions: {
			...DEFAULT_AUTO_APPROVAL_SETTINGS.actions,
			useMcp,
		},
	})
	stateManager.getApiConfiguration.returns({
		actModeApiProvider: provider,
		planModeApiProvider: provider,
		actModeApiModelId: "act-default",
		planModeApiModelId: "plan-default",
		actModeOpenAiModelId: "openai-act-default",
		planModeOpenRouterModelId: "openrouter-plan-default",
	})
	return {
		ulid: "ulid-123",
		services: {
			stateManager,
		},
	}
}

function createConfigSource(getCachedConfig: SubagentBuilderConfigSource["getCachedConfig"]): SubagentBuilderConfigSource {
	return { getCachedConfig }
}

function createMcpHub(servers: McpServer[]): sinon.SinonStubbedInstance<McpHub> {
	const mcpHub = sinon.createStubInstance(McpHub)
	mcpHub.getServers.returns(servers)
	return mcpHub
}

function createSystemPromptContext(overrides: Partial<SystemPromptContext> = {}): SystemPromptContext {
	return {
		ide: "VS Code",
		providerInfo: {
			providerId: "openai",
			mode: "act",
			model: {
				id: "m1",
				info: { supportsPromptCache: false },
			},
		},
		...overrides,
	}
}

describe("SubagentBuilder", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("uses cached config by subagent name and applies act-mode provider model override", () => {
		const configSource = createConfigSource((subagentName?: string) =>
			subagentName === "cached-agent"
				? {
						name: "cached-agent",
						description: "cached description",
						tools: [ClineDefaultTool.LIST_FILES],
						modelId: "gpt-5",
						systemPrompt: "cached system prompt",
					}
				: undefined,
		)

		const fakeHandler = { getModel: sinon.stub(), createMessage: sinon.stub() }
		const buildApiHandlerStub = sinon.stub(api, "buildApiHandler").returns(fakeHandler as never)

		const builder = new SubagentBuilder(createTaskConfig("act", "openai"), "cached-agent", configSource)

		assert.equal(buildApiHandlerStub.callCount, 1)
		const [effectiveApiConfig, selectedMode] = buildApiHandlerStub.firstCall.args
		assert.equal(selectedMode, "act")
		assert.equal((effectiveApiConfig as Record<string, unknown>).ulid, "ulid-123")
		assert.equal((effectiveApiConfig as Record<string, unknown>).actModeOpenAiModelId, "gpt-5")
		assert.equal((effectiveApiConfig as Record<string, unknown>).actModeApiModelId, "act-default")

		assert.deepEqual(builder.getAllowedTools(), [ClineDefaultTool.LIST_FILES, ClineDefaultTool.ATTEMPT])
		const prompt = builder.buildSystemPrompt("generated system prompt")
		assert.match(prompt, /# Agent Profile/)
		assert.match(prompt, /Name: cached-agent/)
		assert.match(prompt, /Description: cached description/)
		assert.match(prompt, /cached system prompt/)
		assert.match(prompt, new RegExp(SUBAGENT_SYSTEM_SUFFIX.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
	})

	it("uses defaults when no cached config is provided", () => {
		const configSource = createConfigSource(() => undefined)

		sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)
		const builder = new SubagentBuilder(createTaskConfig("act", "anthropic"), undefined, configSource)

		assert.deepEqual(builder.getAllowedTools(), SUBAGENT_DEFAULT_ALLOWED_TOOLS)
		const prompt = builder.buildSystemPrompt("generated prompt")
		assert.equal(prompt, `generated prompt${SUBAGENT_SYSTEM_SUFFIX}`)
	})

	it("uses workflow suffix without static subagent capabilities when workflow tools are projected", () => {
		const configSource = createConfigSource(() => undefined)

		sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)
		const builder = new SubagentBuilder(createTaskConfig("act", "anthropic"), undefined, configSource)
		const prompt = builder.buildSystemPrompt(
			"generated prompt",
			createSystemPromptContext({
				workflowToolSchemaOverride: [],
			}),
		)

		assert.equal(prompt, `generated prompt${SUBAGENT_WORKFLOW_SYSTEM_SUFFIX}`)
		assert.equal(
			prompt.includes(
				"You can read files, list directories, search for patterns, list code definitions, and run commands.",
			),
			false,
		)
		assert.equal(
			prompt.includes("Only use execute_command for readonly operations like ls, grep, git log, git diff, gh, etc."),
			false,
		)
	})

	it("applies plan-mode openrouter model override fields", () => {
		const configSource = createConfigSource((subagentName?: string) =>
			subagentName === "openrouter-agent"
				? {
						name: "openrouter-agent",
						description: "openrouter plan agent",
						tools: [ClineDefaultTool.FILE_READ],
						modelId: "openrouter/custom-model",
						systemPrompt: "plan system",
					}
				: undefined,
		)

		const buildApiHandlerStub = sinon.stub(api, "buildApiHandler").returns({
			getModel: sinon.stub(),
			createMessage: sinon.stub(),
		} as never)

		new SubagentBuilder(createTaskConfig("plan", "openrouter"), "openrouter-agent", configSource)

		const [effectiveApiConfig, selectedMode] = buildApiHandlerStub.firstCall.args
		assert.equal(selectedMode, "plan")
		assert.equal((effectiveApiConfig as Record<string, unknown>).planModeOpenRouterModelId, "openrouter/custom-model")
		assert.equal((effectiveApiConfig as Record<string, unknown>).planModeApiModelId, "plan-default")
		assert.equal((effectiveApiConfig as Record<string, unknown>).actModeApiModelId, "act-default")
	})

	it("builds native tools by filtering allowed ids and context requirements then converting", () => {
		const configSource = createConfigSource((subagentName?: string) =>
			subagentName === "tools-agent"
				? {
						name: "tools-agent",
						description: "tool-limited",
						tools: [ClineDefaultTool.LIST_FILES],
						modelId: "sonnet",
						systemPrompt: "tool prompt",
					}
				: undefined,
		)
		sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)

		const getModelFamilyStub = sinon.stub(PromptRegistry.getInstance(), "getModelFamily").returns("test-family" as never)
		const getToolsStub = sinon.stub(ClineToolSet, "getToolsForVariantWithFallback").returns([
			{
				config: {
					id: ClineDefaultTool.LIST_FILES,
					contextRequirements: () => true,
				},
			},
			{
				config: {
					id: ClineDefaultTool.SEARCH,
					contextRequirements: () => true,
				},
			},
			{
				config: {
					id: ClineDefaultTool.ATTEMPT,
					contextRequirements: () => false,
				},
			},
		] as never)
		const converter = sinon.stub().callsFake((tool: { id: string }) => ({ converted: tool.id }))
		const getConverterStub = sinon.stub(ClineToolSet, "getNativeConverter").returns(converter as never)

		const builder = new SubagentBuilder(createTaskConfig("act", "anthropic"), "tools-agent", configSource)

		const context = {
			providerInfo: {
				providerId: "anthropic",
				model: { id: "m1" },
			},
		} as never

		const result = builder.buildNativeTools(context)
		assert.equal(getModelFamilyStub.callCount, 1)
		assert.equal(getToolsStub.callCount, 1)
		assert.equal(getConverterStub.callCount, 1)
		assert.deepEqual(result, [{ converted: ClineDefaultTool.LIST_FILES }])
	})

	it("uses workflow tool schema override without subagent allowed-tool filtering", () => {
		const configSource = createConfigSource(() => ({
			name: "workflow-agent",
			description: "workflow projection",
			tools: [ClineDefaultTool.LIST_FILES],
			systemPrompt: "workflow prompt",
		}))
		sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)
		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "getModelFamily").returns(ModelFamily.GENERIC)
		const variant: PromptVariant = {
			id: "generic",
			version: 1,
			tags: [],
			labels: { use_native_tools: 1 },
			family: ModelFamily.GENERIC,
			description: "test native variant",
			matcher: () => true,
			config: {},
			baseTemplate: "",
			componentOrder: [],
			componentOverrides: {},
			placeholders: {},
			tools: [],
		}
		sinon.stub(promptRegistry, "getVariant").returns(variant)
		const getToolsStub = sinon.stub(ClineToolSet, "getToolsForVariantWithFallback")
		const workflowTool: ClineToolSpec = {
			variant: ModelFamily.GENERIC,
			id: ClineDefaultTool.FILE_NEW,
			name: ClineDefaultTool.FILE_NEW,
			description: "Write a workflow-projected file.",
			parameters: [
				{
					name: "path",
					required: true,
					instruction: "Destination path.",
				},
			],
		}
		const context: SystemPromptContext = {
			ide: "VS Code",
			enableNativeToolCalls: true,
			providerInfo: {
				providerId: "openai",
				mode: "act",
				model: {
					id: "workflow-native-model",
					info: { supportsPromptCache: false },
				},
			},
			workflowToolSchemaOverride: [workflowTool],
		}

		const builder = new SubagentBuilder(createTaskConfig("act", "openai"), "workflow-agent", configSource)
		const result = builder.buildNativeTools(context)
		const toolNames = (result ?? []).flatMap((tool) => {
			if ("function" in tool && typeof tool.function?.name === "string") {
				return [tool.function.name]
			}
			if ("name" in tool && typeof tool.name === "string") {
				return [tool.name]
			}
			return []
		})

		assert.deepEqual(toolNames, [ClineDefaultTool.FILE_NEW])
		assert.equal(getToolsStub.callCount, 0)
	})

	it("suppresses MCP native tools when subagent MCP auto-approval is disabled", () => {
		const configSource = createConfigSource(() => ({
			name: "mcp-agent",
			description: "mcp aware",
			tools: [ClineDefaultTool.MCP_USE, ClineDefaultTool.MCP_DOCS],
			systemPrompt: "prompt",
		}))
		sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)
		sinon.stub(PromptRegistry.getInstance(), "getModelFamily").returns("test-family" as never)
		sinon
			.stub(ClineToolSet, "getToolsForVariantWithFallback")
			.returns([
				{ config: { id: ClineDefaultTool.MCP_USE, contextRequirements: () => true } },
				{ config: { id: ClineDefaultTool.MCP_DOCS, contextRequirements: () => true } },
			] as never)
		const converter = sinon.stub().callsFake((tool: { id: string }) => ({ converted: tool.id }))
		sinon.stub(ClineToolSet, "getNativeConverter").returns(converter as never)

		const builder = new SubagentBuilder(createTaskConfig("act", "openai"), "mcp-agent", configSource)
		const result = builder.buildNativeTools(createSystemPromptContext({ mcpHub: createMcpHub([]) }))

		assert.deepEqual(result, [])
		assert.equal(builder.isMcpExposureEnabled(), false)
	})

	it("includes MCP native tools when subagent MCP auto-approval is enabled", () => {
		const configSource = createConfigSource(() => ({
			name: "mcp-agent",
			description: "mcp aware",
			tools: [ClineDefaultTool.MCP_USE, ClineDefaultTool.MCP_DOCS],
			systemPrompt: "prompt",
		}))
		sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)
		sinon.stub(PromptRegistry.getInstance(), "getModelFamily").returns("test-family" as never)
		sinon
			.stub(ClineToolSet, "getToolsForVariantWithFallback")
			.returns([
				{ config: { id: ClineDefaultTool.MCP_USE, contextRequirements: () => true } },
				{ config: { id: ClineDefaultTool.MCP_DOCS, contextRequirements: () => true } },
			] as never)
		const converter = sinon.stub().callsFake((tool: { id: string }) => ({ converted: tool.id }))
		sinon.stub(ClineToolSet, "getNativeConverter").returns(converter as never)

		const taskConfig = createTaskConfig("act", "openai", true)
		const builder = new SubagentBuilder(taskConfig, "mcp-agent", configSource)
		const result = builder.buildNativeTools(createSystemPromptContext({ mcpHub: createMcpHub([]) }))

		assert.deepEqual(result, [{ converted: ClineDefaultTool.MCP_USE }, { converted: ClineDefaultTool.MCP_DOCS }])
		assert.equal(builder.isMcpExposureEnabled(), true)
	})

	it("omits subagent-specific Indxr guidance when native tool visibility excludes Indxr tools", () => {
		const configSource = createConfigSource(() => undefined)
		sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)

		const taskConfig = createTaskConfig("act", "openai", true)

		const mcpServers: McpServer[] = [
			{
				name: "workspace-index",
				status: "connected",
				config: '{"command":"indxr"}',
				tools: [
					{
						name: "search_relevant",
						description: "Search relevant",
						inputSchema: { type: "object", properties: {} },
					},
					{ name: "get_file_summary", description: "Summary", inputSchema: { type: "object", properties: {} } },
				],
			},
		]
		const builder = new SubagentBuilder(taskConfig, undefined, configSource)
		const prompt = builder.buildSystemPrompt(
			"generated",
			createSystemPromptContext({
				enableNativeToolCalls: true,
				visibleNativeToolNames: ["search_files", "read_file"],
				mcpHub: createMcpHub(mcpServers),
			}),
		)

		assert.doesNotMatch(prompt, /# Indxr-Aware Exploration/)
	})

	it("mentions only the visible subset of Indxr tools in subagent-specific native guidance", () => {
		const configSource = createConfigSource(() => undefined)
		sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)

		const taskConfig = createTaskConfig("act", "openai", true)

		const mcpServers: McpServer[] = [
			{
				name: "workspace-index",
				status: "connected",
				config: '{"command":"indxr"}',
				tools: [
					{
						name: "search_relevant",
						description: "Search relevant",
						inputSchema: { type: "object", properties: {} },
					},
					{ name: "get_file_summary", description: "Summary", inputSchema: { type: "object", properties: {} } },
					{ name: "lookup_symbol", description: "Lookup", inputSchema: { type: "object", properties: {} } },
				],
			},
		]
		const builder = new SubagentBuilder(taskConfig, undefined, configSource)
		const prompt = builder.buildSystemPrompt(
			"generated",
			createSystemPromptContext({
				enableNativeToolCalls: true,
				visibleNativeToolNames: ["indxr-10mcp0search_relevant", "indxr-10mcp0get_file_summary", "search_files"],
				mcpHub: createMcpHub(mcpServers),
			}),
		)

		assert.match(prompt, /# Indxr-Aware Exploration/)
		assert.match(prompt, /`search_relevant`/)
		assert.match(prompt, /`get_file_summary`/)
		assert.doesNotMatch(prompt, /`lookup_symbol`/)
	})
})
