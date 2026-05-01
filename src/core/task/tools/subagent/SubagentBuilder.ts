import { buildApiHandler } from "@core/api"
import { PromptRegistry } from "@core/prompts/system-prompt"
import { getSubagentIndxrExplorationGuidance } from "@core/prompts/system-prompt/components/mcp"
import { ClineToolSet } from "@core/prompts/system-prompt/registry/ClineToolSet"
import type { SystemPromptContext } from "@core/prompts/system-prompt/types"
import { ClineDefaultTool } from "@shared/tools"
import { ApiProvider } from "@/shared/api"
import { getProviderModelIdKey } from "@/shared/storage/provider-keys"
import type { TaskConfig } from "../types/TaskConfig"
import type { AgentBaseConfig } from "./AgentConfigLoader"
import { AgentConfigLoader } from "./AgentConfigLoader"

export type AgentConfig = Partial<AgentBaseConfig>
export type SubagentBuilderConfigSource = Pick<AgentConfigLoader, "getCachedConfig">
export type SubagentBuilderConfig = Pick<TaskConfig, "ulid"> & {
	services: {
		stateManager: Pick<TaskConfig["services"]["stateManager"], "getGlobalSettingsKey" | "getApiConfiguration">
	}
}

export const SUBAGENT_DEFAULT_ALLOWED_TOOLS: ClineDefaultTool[] = [
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.BASH,
	ClineDefaultTool.ATTEMPT,
]
const SUBAGENT_MCP_TOOLS: ClineDefaultTool[] = [ClineDefaultTool.MCP_USE, ClineDefaultTool.MCP_ACCESS, ClineDefaultTool.MCP_DOCS]
// If a test fails due to changed verbiage in the lines following this one, update the test expectations. Do not change the prompt verbiage below without explicit approval from a human user.
export const SUBAGENT_SYSTEM_SUFFIX = `\n\n# Subagent Execution Mode
You are running as a subagent.
You must execute exactly as you've been instructed, and limit your scope to the tasks assigned to you.
You can read files, list directories, search for patterns, list code definitions, and run commands.
Only use execute_command for readonly operations like ls, grep, git log, git diff, gh, etc.
Do not run commands that modify files or system state.
When you have a comprehensive answer, call the attempt_completion tool.
The attempt_completion result field is sent directly to the main agent, so put your full final findings there.`

export const SUBAGENT_WORKFLOW_SYSTEM_SUFFIX = `\n\n# Subagent Execution Mode
You are running as a subagent.
You must execute exactly as you've been instructed, and limit your scope to the tasks assigned to you.
Use only the tools exposed for the current workflow turn.
When you have a comprehensive answer, call the attempt_completion tool.
The attempt_completion result field is sent directly to the main agent, so put your full final findings there.`

export class SubagentBuilder {
	private readonly agentConfig: AgentConfig = {}
	private readonly allowedTools: ClineDefaultTool[]
	private readonly apiHandler: ReturnType<typeof buildApiHandler>

	constructor(
		private readonly baseConfig: SubagentBuilderConfig,
		subagentName?: string,
		configSource: SubagentBuilderConfigSource = AgentConfigLoader.getInstance(),
	) {
		const subagentConfig = configSource.getCachedConfig(subagentName)
		this.agentConfig = subagentConfig ?? {}
		this.allowedTools = this.resolveAllowedTools(this.agentConfig.tools)

		const mode = this.baseConfig.services.stateManager.getGlobalSettingsKey("mode")
		const apiConfiguration = this.baseConfig.services.stateManager.getApiConfiguration()
		const effectiveApiConfiguration = {
			...apiConfiguration,
			ulid: this.baseConfig.ulid,
		} as Record<string, unknown>
		this.applyModelOverride(effectiveApiConfiguration, mode, this.agentConfig.modelId)
		this.apiHandler = buildApiHandler(effectiveApiConfiguration as typeof apiConfiguration, mode)
	}

	getApiHandler(): ReturnType<typeof buildApiHandler> {
		return this.apiHandler
	}

	getAllowedTools(): ClineDefaultTool[] {
		return this.allowedTools
	}

	getConfiguredSkills(): string[] | undefined {
		return this.agentConfig.skills
	}

	private isSubagentMcpExposureEnabled(): boolean {
		const autoApprovalSettings = this.baseConfig.services.stateManager.getGlobalSettingsKey("autoApprovalSettings")
		return autoApprovalSettings?.actions?.useMcp === true
	}

	isMcpExposureEnabled(): boolean {
		return this.isSubagentMcpExposureEnabled()
	}

	buildSystemPrompt(generatedSystemPrompt: string, context?: SystemPromptContext): string {
		const configuredSystemPrompt = this.agentConfig?.systemPrompt?.trim()
		const systemPrompt = configuredSystemPrompt || generatedSystemPrompt
		return `${systemPrompt}${this.buildAgentIdentitySystemPrefix()}${this.buildSubagentSystemSuffix(context)}${this.buildConditionalMcpGuidance(context)}`
	}

	private buildSubagentSystemSuffix(context?: SystemPromptContext): string {
		if (context !== undefined && context.workflowToolSchemaOverride !== undefined) {
			return SUBAGENT_WORKFLOW_SYSTEM_SUFFIX
		}

		return SUBAGENT_SYSTEM_SUFFIX
	}

	private buildConditionalMcpGuidance(context?: SystemPromptContext): string {
		if (!context || !this.isSubagentMcpExposureEnabled()) {
			return ""
		}

		const indxrGuidance = getSubagentIndxrExplorationGuidance(context)
		if (!indxrGuidance) {
			return ""
		}

		return `\n\n# Indxr-Aware Exploration\n${indxrGuidance}`
	}

	buildNativeTools(context: SystemPromptContext) {
		const promptRegistry = PromptRegistry.getInstance()
		const family = promptRegistry.getModelFamily(context)
		if (context.workflowToolSchemaOverride !== undefined) {
			return ClineToolSet.getNativeTools(promptRegistry.getVariant(context), context)
		}

		const toolSets = ClineToolSet.getToolsForVariantWithFallback(family, this.allowedTools)
		const mcpExposureEnabled = this.isSubagentMcpExposureEnabled()
		const filteredToolSpecs = toolSets
			.map((toolSet) => toolSet.config)
			.filter((toolSpec) => {
				if (!this.allowedTools.includes(toolSpec.id)) {
					return false
				}
				if (!mcpExposureEnabled && SUBAGENT_MCP_TOOLS.includes(toolSpec.id as ClineDefaultTool)) {
					return false
				}
				return !toolSpec.contextRequirements || toolSpec.contextRequirements(context)
			})

		const converter = ClineToolSet.getNativeConverter(context.providerInfo.providerId, context.providerInfo.model.id)
		return filteredToolSpecs.map((tool) => converter(tool, context))
	}

	private resolveAllowedTools(configuredTools?: ClineDefaultTool[]): ClineDefaultTool[] {
		const sourceTools = configuredTools && configuredTools.length > 0 ? configuredTools : SUBAGENT_DEFAULT_ALLOWED_TOOLS
		return Array.from(new Set([...sourceTools, ClineDefaultTool.ATTEMPT]))
	}

	private buildAgentIdentitySystemPrefix(): string {
		const name = this.agentConfig?.name?.trim()
		const description = this.agentConfig?.description?.trim()
		if (!name && !description) {
			return ""
		}

		const lines = ["# Agent Profile"]
		if (name) {
			lines.push(`Name: ${name}`)
		}
		if (description) {
			lines.push(`Description: ${description}`)
		}

		return `${lines.join("\n")}\n\n`
	}

	private applyModelOverride(apiConfiguration: Record<string, unknown>, _mode: string, modelId?: string): void {
		const trimmedModelId = modelId?.trim()
		if (!trimmedModelId) {
			return
		}

		const mode = _mode === "plan" ? "plan" : "act"
		const provider = apiConfiguration[_mode === "plan" ? "planModeApiProvider" : "actModeApiProvider"] as ApiProvider
		apiConfiguration[getProviderModelIdKey(provider as ApiProvider, mode)] = trimmedModelId
	}
}
