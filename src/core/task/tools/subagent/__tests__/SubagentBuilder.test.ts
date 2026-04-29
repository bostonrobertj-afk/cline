import { strict as assert } from "node:assert"
import * as api from "@core/api"
import { PromptRegistry } from "@core/prompts/system-prompt"
import { ClineToolSet } from "@core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@core/prompts/system-prompt/spec"
import type { PromptVariant, SystemPromptContext } from "@core/prompts/system-prompt/types"
import type { TaskConfig } from "@core/task/tools/types/TaskConfig"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { AgentConfigLoader } from "../AgentConfigLoader"
import { SUBAGENT_DEFAULT_ALLOWED_TOOLS, SUBAGENT_SYSTEM_SUFFIX, SubagentBuilder } from "../SubagentBuilder"

function createTaskConfig(mode: "act" | "plan", provider: string): TaskConfig {
	return {
		ulid: "ulid-123",
		services: {
			stateManager: {
				getGlobalSettingsKey: (key: string) => {
					if (key === "mode") {
						return mode
					}
					if (key === "autoApprovalSettings") {
						return {
							actions: {
								useMcp: false,
							},
						}
					}
					return undefined
				},
				getApiConfiguration: () => ({
					actModeApiProvider: provider,
					planModeApiProvider: provider,
					actModeApiModelId: "act-default",
					planModeApiModelId: "plan-default",
					actModeOpenAiModelId: "openai-act-default",
					planModeOpenRouterModelId: "openrouter-plan-default",
				}),
			},
		},
	} as unknown as TaskConfig
}

describe("SubagentBuilder", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("uses cached config by subagent name and applies act-mode provider model override", () => {
		sinon.stub(AgentConfigLoader, "getInstance").returns({
			getCachedConfig: (subagentName?: string) =>
				subagentName === "cached-agent"
					? {
							name: "cached-agent",
							description: "cached description",
							tools: [ClineDefaultTool.LIST_FILES],
							modelId: "gpt-5",
							systemPrompt: "cached system prompt",
						}
					: undefined,
		} as unknown as AgentConfigLoader)

		const fakeHandler = { getModel: sinon.stub(), createMessage: sinon.stub() }
		const buildApiHandlerStub = sinon.stub(api, "buildApiHandler").returns(fakeHandler as never)

		const builder = new SubagentBuilder(createTaskConfig("act", "openai"), "cached-agent")

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
		sinon.stub(AgentConfigLoader, "getInstance").returns({
			getCachedConfig: () => undefined,
		} as unknown as AgentConfigLoader)

		sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)
		const builder = new SubagentBuilder(createTaskConfig("act", "anthropic"))

		assert.deepEqual(builder.getAllowedTools(), SUBAGENT_DEFAULT_ALLOWED_TOOLS)
		const prompt = builder.buildSystemPrompt("generated prompt")
		assert.equal(prompt, `generated prompt${SUBAGENT_SYSTEM_SUFFIX}`)
	})

	it("applies plan-mode openrouter model override fields", () => {
		sinon.stub(AgentConfigLoader, "getInstance").returns({
			getCachedConfig: (subagentName?: string) =>
				subagentName === "openrouter-agent"
					? {
							name: "openrouter-agent",
							description: "openrouter plan agent",
							tools: [ClineDefaultTool.FILE_READ],
							modelId: "openrouter/custom-model",
							systemPrompt: "plan system",
						}
					: undefined,
		} as unknown as AgentConfigLoader)

		const buildApiHandlerStub = sinon.stub(api, "buildApiHandler").returns({
			getModel: sinon.stub(),
			createMessage: sinon.stub(),
		} as never)

		new SubagentBuilder(createTaskConfig("plan", "openrouter"), "openrouter-agent")

		const [effectiveApiConfig, selectedMode] = buildApiHandlerStub.firstCall.args
		assert.equal(selectedMode, "plan")
		assert.equal((effectiveApiConfig as Record<string, unknown>).planModeOpenRouterModelId, "openrouter/custom-model")
		assert.equal((effectiveApiConfig as Record<string, unknown>).planModeApiModelId, "plan-default")
		assert.equal((effectiveApiConfig as Record<string, unknown>).actModeApiModelId, "act-default")
	})

	it("builds native tools by filtering allowed ids and context requirements then converting", () => {
		sinon.stub(AgentConfigLoader, "getInstance").returns({
			getCachedConfig: (subagentName?: string) =>
				subagentName === "tools-agent"
					? {
							name: "tools-agent",
							description: "tool-limited",
							tools: [ClineDefaultTool.LIST_FILES],
							modelId: "sonnet",
							systemPrompt: "tool prompt",
						}
					: undefined,
		} as unknown as AgentConfigLoader)
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

		const builder = new SubagentBuilder(createTaskConfig("act", "anthropic"), "tools-agent")

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
		sinon.stub(AgentConfigLoader, "getInstance").returns({
			getCachedConfig: () => ({
				name: "workflow-agent",
				description: "workflow projection",
				tools: [ClineDefaultTool.LIST_FILES],
				systemPrompt: "workflow prompt",
			}),
		} as unknown as AgentConfigLoader)
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

		const builder = new SubagentBuilder(createTaskConfig("act", "openai"), "workflow-agent")
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
		sinon.stub(AgentConfigLoader, "getInstance").returns({
			getCachedConfig: () => ({
				name: "mcp-agent",
				description: "mcp aware",
				tools: [ClineDefaultTool.MCP_USE, ClineDefaultTool.MCP_DOCS],
				systemPrompt: "prompt",
			}),
		} as unknown as AgentConfigLoader)
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

		const builder = new SubagentBuilder(createTaskConfig("act", "openai"), "mcp-agent")
		const result = builder.buildNativeTools({
			providerInfo: { providerId: "openai", model: { id: "m1" } },
			mcpHub: {} as any,
		} as never)

		assert.deepEqual(result, [])
		assert.equal(builder.isMcpExposureEnabled(), false)
	})

	it("includes MCP native tools when subagent MCP auto-approval is enabled", () => {
		sinon.stub(AgentConfigLoader, "getInstance").returns({
			getCachedConfig: () => ({
				name: "mcp-agent",
				description: "mcp aware",
				tools: [ClineDefaultTool.MCP_USE, ClineDefaultTool.MCP_DOCS],
				systemPrompt: "prompt",
			}),
		} as unknown as AgentConfigLoader)
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

		const taskConfig = createTaskConfig("act", "openai")
		;(taskConfig.services.stateManager.getGlobalSettingsKey as any) = (key: string) => {
			if (key === "mode") return "act"
			if (key === "autoApprovalSettings") {
				return { actions: { useMcp: true } }
			}
			return undefined
		}

		const builder = new SubagentBuilder(taskConfig, "mcp-agent")
		const result = builder.buildNativeTools({
			providerInfo: { providerId: "openai", model: { id: "m1" } },
			mcpHub: {} as any,
		} as never)

		assert.deepEqual(result, [{ converted: ClineDefaultTool.MCP_USE }, { converted: ClineDefaultTool.MCP_DOCS }])
		assert.equal(builder.isMcpExposureEnabled(), true)
	})

	it("omits subagent-specific Indxr guidance when native tool visibility excludes Indxr tools", () => {
		sinon.stub(AgentConfigLoader, "getInstance").returns({
			getCachedConfig: () => undefined,
		} as unknown as AgentConfigLoader)
		sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)

		const taskConfig = createTaskConfig("act", "openai")
		;(taskConfig.services.stateManager.getGlobalSettingsKey as any) = (key: string) => {
			if (key === "mode") return "act"
			if (key === "autoApprovalSettings") {
				return { actions: { useMcp: true } }
			}
			return undefined
		}

		const builder = new SubagentBuilder(taskConfig)
		const prompt = builder.buildSystemPrompt("generated", {
			enableNativeToolCalls: true,
			visibleNativeToolNames: ["search_files", "read_file"],
			mcpHub: {
				getServers: () => [
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
				],
			} as any,
		} as never)

		assert.doesNotMatch(prompt, /# Indxr-Aware Exploration/)
	})

	it("mentions only the visible subset of Indxr tools in subagent-specific native guidance", () => {
		sinon.stub(AgentConfigLoader, "getInstance").returns({
			getCachedConfig: () => undefined,
		} as unknown as AgentConfigLoader)
		sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)

		const taskConfig = createTaskConfig("act", "openai")
		;(taskConfig.services.stateManager.getGlobalSettingsKey as any) = (key: string) => {
			if (key === "mode") return "act"
			if (key === "autoApprovalSettings") {
				return { actions: { useMcp: true } }
			}
			return undefined
		}

		const builder = new SubagentBuilder(taskConfig)
		const prompt = builder.buildSystemPrompt("generated", {
			enableNativeToolCalls: true,
			visibleNativeToolNames: ["indxr-10mcp0search_relevant", "indxr-10mcp0get_file_summary", "search_files"],
			mcpHub: {
				getServers: () => [
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
				],
			} as any,
		} as never)

		assert.match(prompt, /# Indxr-Aware Exploration/)
		assert.match(prompt, /`search_relevant`/)
		assert.match(prompt, /`get_file_summary`/)
		assert.doesNotMatch(prompt, /`lookup_symbol`/)
	})
})
