import { strict as assert } from "node:assert"
import * as coreApi from "@core/api"
import * as skills from "@core/context/instructions/user-instructions/skills"
import { PromptRegistry } from "@core/prompts/system-prompt"
import type { TaskConfig } from "@core/task/tools/types/TaskConfig"
import fs from "fs/promises"
import { afterEach, describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import type { WorkflowDefinition } from "@/core/task/workflow-runtime/types"
import * as WorkflowRegistry from "@/core/task/workflow-runtime/WorkflowRegistry"
import { WorkflowRuntime } from "@/core/task/workflow-runtime/WorkflowRuntime"
import { HostProvider } from "@/hosts/host-provider"
import { ApiFormat } from "@/shared/proto/cline/models"
import { Logger } from "@/shared/services/Logger"
import { ClineDefaultTool } from "@/shared/tools"
import * as disk from "../../../../storage/disk"
import { FocusChainManager } from "../../../focus-chain"
import { getFocusChainFilePath } from "../../../focus-chain/file-utils"
import { TaskState } from "../../../TaskState"
import { SubagentBuilder } from "../SubagentBuilder"
import { SubagentRunner } from "../SubagentRunner"

type PromptContextArgs = {
	state: TaskState
	hostIde: string
	providerInfo: { providerId: string; model: { id: string }; mode: string }
	availableSkills: unknown[]
	configuredSkillNames: string[] | undefined
	assignedSkillNames: string[]
	nativeToolCallsRequested: boolean
	shouldSendFullPromptAssembly: boolean
	shouldUseContinuationPrompt: boolean
}

type PromptContextResult = {
	mcpHub?: unknown
	activeWorkflowName?: string
	activeWorkflowStepNumber?: number
	workflowSystemInstructionsBlock?: string
	workflowInputInstructionsBlock?: string
	workflowToolSchemaOverride?: readonly unknown[]
	skills?: Array<{ name: string }>
	isContinuationTurn?: boolean
	enableNativeToolCalls?: boolean
	enableParallelToolCalling?: boolean
	isSubagentRun?: boolean
}

const createSubagentTaskConfig = Reflect.get(SubagentRunner.prototype, "createSubagentTaskConfig") as (
	this: SubagentRunner,
	state: TaskState,
) => TaskConfig
const buildPromptContext = Reflect.get(SubagentRunner.prototype, "buildPromptContext") as (
	this: SubagentRunner,
	args: PromptContextArgs,
) => Promise<PromptContextResult>
const autoActivateAssignedWorkflow = Reflect.get(SubagentRunner.prototype, "autoActivateAssignedWorkflow") as (
	this: SubagentRunner,
	state: TaskState,
	assignedSkillNames: string[],
) => Promise<void>

function getSubagentFocusChainStorageKey(runner: SubagentRunner): string {
	return Reflect.get(runner, "subagentFocusChainStorageKey") as string
}

function initializeHostProvider() {
	HostProvider.reset()
	HostProvider.initialize(
		() => ({}) as never,
		() => ({}) as never,
		() => ({}) as never,
		() => ({}) as never,
		{
			workspaceClient: {},
			envClient: {
				getHostVersion: async () => ({ platform: "test" }),
			},
			windowClient: {},
			diffClient: {},
		} as never,
		() => undefined,
		async () => "",
		async () => "",
		"",
		"",
	)
}

function createTaskConfig(nativeToolCallEnabled: boolean, promptRefreshFrequency = 5): TaskConfig {
	const autoApprovalSettings = {
		enableNotifications: false,
		actions: { executeSafeCommands: false, executeAllCommands: false, useMcp: false },
	}

	return {
		taskId: "task-1",
		ulid: "ulid-1",
		cwd: "/tmp",
		mode: "act",
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		doubleCheckCompletionEnabled: false,
		vscodeTerminalExecutionMode: "backgroundExec",
		enableParallelToolCalling: false,
		isSubagentExecution: false,
		context: {},
		taskState: new TaskState(),
		messageState: {},
		workflowRuntime: new WorkflowRuntime({ cwd: "/tmp" }),
		api: {
			getModel: () => ({
				id: "anthropic/claude-sonnet-4.5",
				info: {
					contextWindow: 200_000,
					apiFormat: ApiFormat.ANTHROPIC_CHAT,
					supportsPromptCache: true,
				},
			}),
			createMessage: sinon.stub().callsFake(async function* () {}),
		},
		services: {
			stateManager: {
				getWorkspaceStateKey: () => undefined,
				getGlobalSettingsKey: (key: string) => {
					if (key === "mode") {
						return "act"
					}
					if (key === "customPrompt") {
						return undefined
					}
					if (key === "promptRefreshFrequency") {
						return promptRefreshFrequency
					}
					if (key === "autoApprovalSettings") {
						return autoApprovalSettings
					}
					return undefined
				},
				getGlobalStateKey: (key: string) => (key === "nativeToolCallEnabled" ? nativeToolCallEnabled : undefined),
				getRemoteConfigSettings: () => undefined,
				getApiConfiguration: () => ({
					actModeApiProvider: "anthropic",
					planModeApiProvider: "anthropic",
				}),
			},
		},
		browserSettings: {},
		focusChainSettings: {},
		autoApprovalSettings,
		autoApprover: { shouldAutoApproveTool: sinon.stub().returns([false, false]) },
		callbacks: {
			say: sinon.stub().resolves(undefined),
			ask: sinon.stub().resolves({ response: "yesButtonClicked" }),
			saveCheckpoint: sinon.stub().resolves(),
			sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
			removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
			executeCommandTool: sinon.stub().resolves([false, "ok"]),
			cancelRunningCommandTool: sinon.stub().resolves(false),
			doesLatestTaskCompletionHaveNewChanges: sinon.stub().resolves(false),
			updateFCListFromToolResponse: sinon.stub().resolves({ accepted: true }),
			shouldAutoApproveTool: sinon.stub().returns([true, true]),
			shouldAutoApproveToolWithPath: sinon.stub().resolves(false),
			postStateToWebview: sinon.stub().resolves(),
			reinitExistingTaskFromId: sinon.stub().resolves(),
			cancelTask: sinon.stub().resolves(),
			updateTaskHistory: sinon.stub().resolves([]),
			applyLatestBrowserSettings: sinon.stub().resolves(undefined),
			switchToActMode: sinon.stub().resolves(false),
			setActiveHookExecution: sinon.stub().resolves(),
			clearActiveHookExecution: sinon.stub().resolves(),
			getActiveHookExecution: sinon.stub().resolves(undefined),
			runUserPromptSubmitHook: sinon.stub().resolves({}),
		},
		coordinator: {
			getHandler: sinon.stub().callsFake((toolName: ClineDefaultTool) => {
				if (toolName === ClineDefaultTool.LIST_FILES) {
					return {
						execute: sinon.stub().resolves("ok"),
						getDescription: sinon.stub().returns("list_files"),
					}
				}

				return undefined
			}),
		},
	} as unknown as TaskConfig
}

function createResolvedWorkflow(args?: {
	name?: string
	useSkillName?: string
	stepOneChecklistLabel?: string
	stepTwoChecklistLabel?: string
	workflowSystemInstructionsBlock?: string
	workflowInputInstructionsBlock?: string
	workflowToolSchemaOverride?: readonly unknown[]
	childInheritance?: WorkflowDefinition["childInheritance"]
}): WorkflowDefinition {
	const steps: WorkflowDefinition["steps"] = {
		"step-1": {
			id: "step-1",
			stepNumber: 1,
			checklistLabel: args?.stepOneChecklistLabel ?? "Step 1: Gather Context",
			buildPromptProjection: () => ({
				workflowSystemInstructionsBlock: args?.workflowSystemInstructionsBlock,
				workflowInputInstructionsBlock: args?.workflowInputInstructionsBlock,
				workflowToolSchemaOverride: args?.workflowToolSchemaOverride as any,
			}),
			allowWorkflowProgressRequest: false,
		},
	}
	if (args?.stepTwoChecklistLabel) {
		steps["step-2"] = {
			id: "step-2",
			stepNumber: 2,
			checklistLabel: args.stepTwoChecklistLabel,
			buildPromptProjection: () => ({
				workflowSystemInstructionsBlock: args?.workflowSystemInstructionsBlock,
				workflowInputInstructionsBlock: args?.workflowInputInstructionsBlock,
				workflowToolSchemaOverride: args?.workflowToolSchemaOverride as any,
			}),
			allowWorkflowProgressRequest: false,
		}
	}
	return {
		name: args?.name ?? "review-workflow",
		slashCommandName: args?.name ?? "review-workflow",
		useSkillName: args?.useSkillName ?? "review-workflow",
		persona: "engineer",
		projectSubfolder: "review",
		startCard: { markdownBody: "", submitLabel: "Continue" },
		childInheritance: args?.childInheritance,
		steps,
	}
}

type StubApiOptions = {
	modelId?: string
	apiFormat?: ApiFormat
}

function stubApiHandler(createMessage: sinon.SinonStub, options?: StubApiOptions) {
	sinon.stub(coreApi, "buildApiHandler").returns({
		abort: sinon.stub(),
		getModel: () => ({
			id: options?.modelId ?? "anthropic/claude-sonnet-4.5",
			info: {
				contextWindow: 200_000,
				apiFormat: options?.apiFormat ?? ApiFormat.ANTHROPIC_CHAT,
				supportsPromptCache: true,
			},
		}),
		createMessage,
	} as never)
}

function createFocusChainManager(taskState: TaskState, taskId = "task-1") {
	return new FocusChainManager({
		taskId,
		cwd: "/tmp",
		taskState,
		mode: "act",
		stateManager: {
			getGlobalSettingsKey: sinon.stub().returns("act"),
		} as any,
		postStateToWebview: sinon.stub().resolves(),
		say: sinon.stub().resolves(undefined),
		focusChainSettings: {
			enabled: true,
			remindClineInterval: 6,
		} as any,
	})
}

describe("SubagentRunner", () => {
	afterEach(() => {
		sinon.restore()
		HostProvider.reset()
	})

	it("does not reuse the parent ask callback inside subagent task configs", async () => {
		const config = createTaskConfig(true)
		const parentAsk = config.callbacks.ask as sinon.SinonStub
		const runner = new SubagentRunner(config)
		const subagentConfig = (runner as any).createSubagentTaskConfig(new TaskState()) as TaskConfig

		const result = await subagentConfig.callbacks.ask("tool", "test prompt", false)

		assert.deepEqual(result, { response: "yesButtonClicked" })
		sinon.assert.notCalled(parentAsk)
		assert.equal(await subagentConfig.callbacks.shouldAutoApproveToolWithPath(ClineDefaultTool.FILE_READ, "foo.ts"), true)
	})

	it("omits mcpHub from subagent prompt context when MCP auto-approval is disabled", async () => {
		const runner = new SubagentRunner(createTaskConfig(false))
		const context = await (runner as any).buildPromptContext({
			state: new TaskState(),
			hostIde: "TestIde",
			providerInfo: { providerId: "openai", model: { id: "gpt-5" }, mode: "act" },
			availableSkills: [],
			configuredSkillNames: undefined,
			assignedSkillNames: [],
			nativeToolCallsRequested: false,
			shouldSendFullPromptAssembly: true,
			shouldUseContinuationPrompt: false,
		})

		assert.equal(context.mcpHub, undefined)
	})

	it("passes mcpHub into subagent prompt context when MCP auto-approval is enabled", async () => {
		const config = createTaskConfig(false)
		config.autoApprovalSettings.actions.useMcp = true
		config.services.mcpHub = { getServers: () => [] } as any

		const runner = new SubagentRunner(config)
		const context = await (runner as any).buildPromptContext({
			state: new TaskState(),
			hostIde: "TestIde",
			providerInfo: { providerId: "openai", model: { id: "gpt-5" }, mode: "act" },
			availableSkills: [],
			configuredSkillNames: undefined,
			assignedSkillNames: [],
			nativeToolCallsRequested: false,
			shouldSendFullPromptAssembly: true,
			shouldUseContinuationPrompt: false,
		})

		assert.equal(context.mcpHub, config.services.mcpHub)
	})

	it("passes the constructed prompt context into subagent system-prompt assembly", async () => {
		const config = createTaskConfig(false)
		config.autoApprovalSettings.actions.useMcp = true
		config.services.mcpHub = { getServers: () => [] } as any

		const buildSystemPromptStub = sinon.stub(SubagentBuilder.prototype, "buildSystemPrompt").callsFake((prompt, context) => {
			assert.equal(prompt, "system prompt")
			assert.equal(context?.mcpHub, config.services.mcpHub)
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns([] as any)
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(PromptRegistry.getInstance(), "get").resolves("system prompt")
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])

		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_complete_mcp_context",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(config)
		await runner.run("Finish quickly", () => {})
		assert.equal(buildSystemPromptStub.called, true)
	})

	it("passes visibleNativeToolNames into prompt registry assembly and subagent system-prompt assembly", async () => {
		const config = createTaskConfig(false)
		config.autoApprovalSettings.actions.useMcp = true
		config.services.mcpHub = { getServers: () => [] } as any
		const visibleNativeToolNames = ["indxr-10mcp0search_relevant", "search_files"]

		const buildSystemPromptStub = sinon.stub(SubagentBuilder.prototype, "buildSystemPrompt").callsFake((prompt, context) => {
			assert.equal(prompt, "system prompt")
			assert.deepEqual(context?.visibleNativeToolNames, visibleNativeToolNames)
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns(visibleNativeToolNames.map((name) => ({ name })) as any)
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		const promptRegistryGetStub = sinon.stub(PromptRegistry.getInstance(), "get").callsFake(async (context) => {
			assert.deepEqual(context.visibleNativeToolNames, visibleNativeToolNames)
			return "system prompt"
		})
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])

		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_complete_visible_native_tools",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(config)
		await runner.run("Finish quickly", () => {})
		assert.equal(promptRegistryGetStub.called, true)
		assert.equal(buildSystemPromptStub.called, true)
	})

	it("emits native tool_use blocks with matching tool_result tool_use_id across turns", async () => {
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_1",
						name: ClineDefaultTool.LIST_FILES,
						arguments: JSON.stringify({ path: ".", recursive: false }),
					},
				},
			}
		})
		createMessage.onSecondCall().callsFake(async function* (_systemPrompt: string, conversation: unknown[]) {
			const assistantMessage = conversation[1] as {
				role: string
				content: Array<{ type?: string; [key: string]: unknown }>
			}
			assert.equal(assistantMessage.role, "assistant")

			const toolUse = assistantMessage.content.find((block) => block.type === "tool_use")
			assert.ok(toolUse)
			assert.equal(toolUse.id, "toolu_subagent_1")
			assert.equal(toolUse.name, ClineDefaultTool.LIST_FILES)

			const userMessage = conversation[2] as { role: string; content: Array<{ type?: string; [key: string]: unknown }> }
			assert.equal(userMessage.role, "user")
			const toolResult = userMessage.content.find((block) => block.type === "tool_result")
			assert.ok(toolResult)
			assert.equal(toolResult.tool_use_id, "toolu_subagent_1")

			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_complete_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = [{ name: "list_files" } as any]
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns([{ name: "list_files" }] as any)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(true))
		const result = await runner.run("List files", () => {})

		assert.equal(result.status, "completed")
		assert.equal(result.result, "done")
		assert.equal(createMessage.callCount, 2)
	})

	it("stores openai-native responses subagent turns with provider metadata and the completed response id", async () => {
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield {
				type: "text",
				id: "msg_subagent_native_text_1",
				text: "Inspecting the workspace.",
			}
			yield {
				type: "tool_calls",
				id: "fc_subagent_native_1",
				tool_call: {
					function: {
						id: "toolu_subagent_native_1",
						name: ClineDefaultTool.LIST_FILES,
						arguments: JSON.stringify({ path: ".", recursive: false }),
					},
				},
			}
			yield {
				type: "usage",
				id: "resp_subagent_native_1",
				inputTokens: 10,
				outputTokens: 5,
			}
		})
		createMessage.onSecondCall().callsFake(async function* (_systemPrompt: string, conversation: any[]) {
			const assistantMessage = conversation[1]
			assert.equal(assistantMessage.role, "assistant")
			assert.equal(assistantMessage.id, "resp_subagent_native_1")
			assert.deepEqual(assistantMessage.modelInfo, {
				providerId: "openai-native",
				modelId: "gpt-5.4-mini-2026-03-17",
				mode: "act",
			})
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_native_complete_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage, {
			modelId: "gpt-5.4-mini-2026-03-17",
			apiFormat: ApiFormat.OPENAI_RESPONSES,
		})
		initializeHostProvider()

		const config = createTaskConfig(false)
		config.services.stateManager.getApiConfiguration = () => ({
			actModeApiProvider: "openai-native",
			planModeApiProvider: "openai-native",
		})

		const runner = new SubagentRunner(config)
		const result = await runner.run("Inspect the repo", () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 2)
	})

	it("stores openai responses subagent turns with the explicit response_id anchor", async () => {
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield {
				type: "text",
				id: "msg_subagent_openai_text_1",
				text: "Searching for the right files.",
			}
			yield {
				type: "tool_calls",
				id: "fc_subagent_openai_1",
				tool_call: {
					function: {
						id: "toolu_subagent_openai_1",
						name: ClineDefaultTool.LIST_FILES,
						arguments: JSON.stringify({ path: ".", recursive: false }),
					},
				},
			}
			yield {
				type: "response_id",
				id: "resp_subagent_openai_1",
			}
		})
		createMessage.onSecondCall().callsFake(async function* (_systemPrompt: string, conversation: any[]) {
			const assistantMessage = conversation[1]
			assert.equal(assistantMessage.role, "assistant")
			assert.equal(assistantMessage.id, "resp_subagent_openai_1")
			assert.deepEqual(assistantMessage.modelInfo, {
				providerId: "openai",
				modelId: "gpt-5.4-mini-2026-03-17",
				mode: "act",
			})
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_openai_complete_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage, {
			modelId: "gpt-5.4-mini-2026-03-17",
			apiFormat: ApiFormat.OPENAI_RESPONSES,
		})
		initializeHostProvider()

		const config = createTaskConfig(false)
		config.services.stateManager.getApiConfiguration = () => ({
			actModeApiProvider: "openai",
			planModeApiProvider: "openai",
		})

		const runner = new SubagentRunner(config)
		const result = await runner.run("Inspect the repo", () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 2)
	})

	it("passes prior request token totals into the next-turn compaction check", async () => {
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield {
				type: "usage",
				inputTokens: 11,
				outputTokens: 7,
				cacheWriteTokens: 3,
				cacheReadTokens: 2,
			}
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_previous_tokens_1",
						name: ClineDefaultTool.LIST_FILES,
						arguments: JSON.stringify({ path: ".", recursive: false }),
					},
				},
			}
		})
		createMessage.onSecondCall().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_previous_tokens_complete_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = [{ name: "list_files" } as any]
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns([{ name: "list_files" }] as any)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(true))
		const shouldCompactStub = sinon.stub(runner as any, "shouldCompactBeforeNextRequest").callsFake((...args: unknown[]) => {
			const [previousRequestTotalTokens] = args
			assert.equal(previousRequestTotalTokens, 23)
			return false
		})

		const result = await runner.run("List files", () => {})

		assert.equal(result.status, "completed")
		assert.equal(result.result, "done")
		assert.equal(createMessage.callCount, 2)
		assert.equal(shouldCompactStub.callCount, 1)
	})

	it("falls back to non-native result blocks if structured tool calls appear while native mode is disabled", async () => {
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_2",
						name: ClineDefaultTool.LIST_FILES,
						arguments: JSON.stringify({ path: ".", recursive: false }),
					},
				},
			}
		})
		createMessage.onSecondCall().callsFake(async function* (_systemPrompt: string, conversation: unknown[]) {
			const lastMessage = conversation[conversation.length - 1] as {
				role: string
				content: Array<{ type?: string; [key: string]: unknown }>
			}

			assert.equal(lastMessage.role, "user")
			assert.ok(lastMessage.content.every((block) => block.type === "text"))
			assert.equal(
				lastMessage.content.some((block) => block.type === "tool_result"),
				false,
			)

			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_complete_2",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(false))
		const result = await runner.run("List files", () => {})

		assert.equal(result.status, "completed")
		assert.equal(result.result, "done")
		assert.equal(createMessage.callCount, 2)
	})

	it("retries empty assistant turns with a no-tools-used nudge before failing", async () => {
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {})
		createMessage.onSecondCall().callsFake(async function* (_systemPrompt: string, conversation: unknown[]) {
			const lastAssistant = conversation[1] as {
				role: string
				content: Array<{ type?: string; text?: string }>
			}
			assert.equal(lastAssistant.role, "assistant")
			assert.equal(lastAssistant.content[0]?.type, "text")
			assert.equal(lastAssistant.content[0]?.text, "Failure: I did not provide a response.")

			const lastUser = conversation[2] as {
				role: string
				content: Array<{ type?: string; text?: string }>
			}
			assert.equal(lastUser.role, "user")
			assert.equal(lastUser.content[0]?.type, "text")
			assert.match(lastUser.content[0]?.text || "", /You did not use a tool in your previous response/i)

			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_complete_3",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(false))
		const result = await runner.run("List files", () => {})

		assert.equal(result.status, "completed")
		assert.equal(result.result, "done")
		assert.equal(createMessage.callCount, 2)
	})

	it("retries initial stream failures before failing", async () => {
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield* []
			throw new Error(
				'{"code":"stream_initialization_failed","message":"Failed to create stream: failed to generate stream from Vercel: failed to send request"}',
			)
		})
		createMessage.onSecondCall().callsFake(async function* () {
			yield* []
			throw new Error(
				'{"code":"stream_initialization_failed","message":"Failed to create stream: failed to generate stream from Vercel: failed to send request"}',
			)
		})
		createMessage.onThirdCall().callsFake(async function* () {
			yield* []
			throw new Error(
				'{"code":"stream_initialization_failed","message":"Failed to create stream: failed to generate stream from Vercel: failed to send request"}',
			)
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const clock = sinon.useFakeTimers()
		const runner = new SubagentRunner(createTaskConfig(false))
		const runPromise = runner.run("List files", () => {})
		await clock.runAllAsync()
		const result = await runPromise
		clock.restore()

		assert.equal(result.status, "failed")
		assert.equal(createMessage.callCount, 3)
		assert.match(result.error || "", /stream_initialization_failed/i)
	})

	it("fails context window errors", async () => {
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield* []
			const contextError = new Error("context length exceeded")
			;(contextError as Error & { status: number }).status = 400
			throw contextError
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(false))
		const result = await runner.run("Huge prompt", () => {})

		assert.equal(result.status, "failed")
		assert.equal(createMessage.callCount, 1)
		assert.match(result.error || "", /context length exceeded/i)
	})

	it("uses the configured task api handler for subagent requests", async () => {
		const createMessage = sinon.stub().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_complete_4",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = [{ name: "list_files" } as any]
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns([{ name: "list_files" }] as any)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(true))
		const result = await runner.run("List files", () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 1)
	})

	it("filters available skills to configured skills when subagent skills are configured", async () => {
		const createMessage = sinon.stub().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_skills_filtered_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.ok(context.skills)
			assert.deepEqual(
				context.skills.map((skill) => skill.name),
				["allowed-skill"],
			)
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(["allowed-skill"])
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([
			{ name: "allowed-skill", description: "Allowed", path: "/skills/allowed/SKILL.md", source: "project" },
			{ name: "other-skill", description: "Other", path: "/skills/other/SKILL.md", source: "project" },
		])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(false))
		const result = await runner.run("Run task", () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 1)
	})

	it("uses all available skills when subagent skills are not configured", async () => {
		const createMessage = sinon.stub().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_skills_unconfigured_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.ok(context.skills)
			assert.deepEqual(
				context.skills.map((skill) => skill.name),
				["alpha-skill", "beta-skill"],
			)
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([
			{ name: "alpha-skill", description: "Alpha", path: "/skills/alpha/SKILL.md", source: "project" },
			{ name: "beta-skill", description: "Beta", path: "/skills/beta/SKILL.md", source: "project" },
		])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(false))
		const result = await runner.run("Run task", () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 1)
	})

	it("projects foundational workflow runtime fields into subagent prompt context", async () => {
		const workflowToolSchemaOverride = [{ id: ClineDefaultTool.SET_WORKFLOW_VALUES }] as const
		const config = createTaskConfig(false)
		const runner = new SubagentRunner(config)
		const state = new TaskState()

		await config.workflowRuntime.activateWorkflow({
			taskState: state,
			workflow: createResolvedWorkflow({
				name: "review-workflow",
				useSkillName: "review-workflow",
				workflowSystemInstructionsBlock: "SYSTEM BLOCK",
				workflowInputInstructionsBlock: "INPUT BLOCK",
				workflowToolSchemaOverride,
			}),
		})

		const context = await buildPromptContext.call(runner, {
			state,
			hostIde: "TestIde",
			providerInfo: { providerId: "openai", model: { id: "gpt-5" }, mode: "act" },
			availableSkills: [],
			configuredSkillNames: undefined,
			assignedSkillNames: [],
			nativeToolCallsRequested: false,
			shouldSendFullPromptAssembly: true,
			shouldUseContinuationPrompt: false,
		})

		assert.equal(context.activeWorkflowName, "review-workflow")
		assert.equal(context.activeWorkflowStepNumber, 1)
		assert.equal(context.workflowSystemInstructionsBlock, "SYSTEM BLOCK")
		assert.equal(context.workflowInputInstructionsBlock, "INPUT BLOCK")
		assert.equal(context.workflowToolSchemaOverride, workflowToolSchemaOverride)
		assert.deepEqual(context.skills, [])
		assert.equal(context.isContinuationTurn, false)
		assert.equal(context.enableNativeToolCalls, false)
		assert.equal(context.enableParallelToolCalling, false)
		assert.equal(context.isSubagentRun, true)
	})

	it("suppresses prompt skills on internal turns while preserving workflow runtime projection", async () => {
		const config = createTaskConfig(false)
		const runner = new SubagentRunner(config)
		const state = new TaskState()

		await config.workflowRuntime.activateWorkflow({
			taskState: state,
			workflow: createResolvedWorkflow({
				name: "review-workflow",
				useSkillName: "review-workflow",
				workflowSystemInstructionsBlock: "SYSTEM BLOCK",
				workflowInputInstructionsBlock: "INPUT BLOCK",
			}),
		})

		const context = await buildPromptContext.call(runner, {
			state,
			hostIde: "TestIde",
			providerInfo: { providerId: "openai", model: { id: "gpt-5" }, mode: "act" },
			availableSkills: [{ name: "alpha-skill", description: "Alpha", path: "/skills/alpha/SKILL.md", source: "project" }],
			configuredSkillNames: undefined,
			assignedSkillNames: [],
			nativeToolCallsRequested: false,
			shouldSendFullPromptAssembly: false,
			shouldUseContinuationPrompt: true,
		})

		assert.deepEqual(context.skills, [])
		assert.equal(context.activeWorkflowName, "review-workflow")
		assert.equal(context.activeWorkflowStepNumber, 1)
		assert.equal(context.workflowSystemInstructionsBlock, "SYSTEM BLOCK")
		assert.equal(context.workflowInputInstructionsBlock, "INPUT BLOCK")
		assert.equal(context.isContinuationTurn, true)
		assert.equal(context.isSubagentRun, true)
	})

	it("auto-activates an explicitly assigned shipped workflow before the first subagent turn", async () => {
		const createMessage = sinon.stub().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_foundational_workflow_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(
			createResolvedWorkflow({
				name: "review-workflow",
				useSkillName: "review-workflow",
				workflowSystemInstructionsBlock: "SYSTEM BLOCK",
				workflowInputInstructionsBlock: "INPUT BLOCK",
			}),
		)
		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.equal(context.activeWorkflowName, "review-workflow")
			assert.equal(context.activeWorkflowStepNumber, 1)
			assert.equal(context.workflowSystemInstructionsBlock, "SYSTEM BLOCK")
			assert.equal(context.workflowInputInstructionsBlock, "INPUT BLOCK")
			assert.equal(context.isSubagentRun, true)
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(false))
		const result = await runner.run("Skill: use_skill('review-workflow')", () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 1)
	})

	it("leaves the parent workflow state unchanged while inheriting declared values into the child workflow session", async () => {
		const config = createTaskConfig(false)
		config.taskState.activeWorkflowName = "parent-workflow"
		config.taskState.activeWorkflowSession = {
			workflowName: "parent-workflow",
			activeStepNumber: 1,
			workflowValues: { review_input: "/tmp/review-input.md", ignored_parent: "drop" },
			projectSelection: { projectMode: "new", projectTitle: "", projectFolderName: "" },
			ui: {
				startCardSession: undefined,
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionDefinitionIds: [],
			},
		} as any
		config.taskState.currentFocusChainChecklist = "- [ ] Parent Step"

		const runner = new SubagentRunner(config)
		const state = new TaskState()
		sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(
			createResolvedWorkflow({
				name: "child-workflow",
				useSkillName: "child-workflow",
				childInheritance: [{ parentKey: "review_input", childKey: "review_input" }],
			}),
		)

		await autoActivateAssignedWorkflow.call(runner, state, ["child-workflow"])

		assert.equal(state.activeWorkflowName, "child-workflow")
		assert.deepEqual(state.activeWorkflowSession?.workflowValues, { review_input: "/tmp/review-input.md" })
		state.activeWorkflowSession!.workflowValues.review_input = "/tmp/child-mutated.md"
		assert.equal(config.taskState.activeWorkflowSession?.workflowValues.review_input, "/tmp/review-input.md")
		assert.equal(config.taskState.activeWorkflowName, "parent-workflow")
		assert.equal(config.taskState.currentFocusChainChecklist, "- [ ] Parent Step")
	})

	it("does not auto-activate a second workflow when child state is already active", async () => {
		const runner = new SubagentRunner(createTaskConfig(false))
		const state = new TaskState()
		state.activeWorkflowName = "existing-workflow"
		state.activeWorkflowSession = {
			workflowName: "existing-workflow",
			activeStepNumber: 1,
			workflowValues: {},
			projectSelection: { projectMode: "new", projectTitle: "", projectFolderName: "" },
			ui: {
				startCardSession: undefined,
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionDefinitionIds: [],
			},
		} as any

		const resolveWorkflowByUseSkillNameStub = sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName")

		await autoActivateAssignedWorkflow.call(runner, state, ["review-workflow"])

		sinon.assert.notCalled(resolveWorkflowByUseSkillNameStub)
		assert.equal(state.activeWorkflowName, "existing-workflow")
	})

	it("routes subagent task_progress updates to subagent-local focus chain storage instead of the parent callback", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "subagent-focus-chain-update-"))
		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const config = createTaskConfig(false)
			config.taskState.currentFocusChainChecklist = "- [ ] Parent Step"
			const parentManager = createFocusChainManager(config.taskState, config.taskId)
			await parentManager.updateFCListFromToolResponse(config.taskState.currentFocusChainChecklist)

			const runner = new SubagentRunner(config)
			const subagentState = new TaskState()
			const subagentConfig = createSubagentTaskConfig.call(runner, subagentState)

			const result = await subagentConfig.callbacks.updateFCListFromToolResponse("- [ ] Child Step")

			assert.equal(result.accepted, true)
			sinon.assert.notCalled(config.callbacks.updateFCListFromToolResponse as sinon.SinonStub)
			assert.equal(subagentState.currentFocusChainChecklist, "- [ ] Child Step")

			const parentFilePath = getFocusChainFilePath(tempDir, config.taskId)
			const parentContent = await fs.readFile(parentFilePath, "utf8")
			assert.match(parentContent, /Parent Step/)
			assert.doesNotMatch(parentContent, /Child Step/)

			const subagentStorageKey = getSubagentFocusChainStorageKey(runner)
			const subagentFilePath = getFocusChainFilePath(tempDir, config.taskId, {
				key: subagentStorageKey,
				scope: "subagent",
			})
			const subagentContent = await fs.readFile(subagentFilePath, "utf8")
			assert.match(subagentContent, /Child Step/)
			assert.doesNotMatch(subagentContent, /Parent Step/)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("uses distinct subagent-local focus-chain storage keys across multiple subagent runs", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "subagent-focus-chain-multi-"))
		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const config = createTaskConfig(false)
			const runnerOne = new SubagentRunner(config)
			const runnerTwo = new SubagentRunner(config)
			const stateOne = new TaskState()
			const stateTwo = new TaskState()
			const subagentConfigOne = createSubagentTaskConfig.call(runnerOne, stateOne)
			const subagentConfigTwo = createSubagentTaskConfig.call(runnerTwo, stateTwo)

			await subagentConfigOne.callbacks.updateFCListFromToolResponse("- [ ] Alpha Step")
			await subagentConfigTwo.callbacks.updateFCListFromToolResponse("- [ ] Beta Step")

			const storageKeyOne = getSubagentFocusChainStorageKey(runnerOne)
			const storageKeyTwo = getSubagentFocusChainStorageKey(runnerTwo)
			assert.notEqual(storageKeyOne, storageKeyTwo)

			const subagentFileOne = getFocusChainFilePath(tempDir, config.taskId, {
				key: storageKeyOne,
				scope: "subagent",
			})
			const subagentFileTwo = getFocusChainFilePath(tempDir, config.taskId, {
				key: storageKeyTwo,
				scope: "subagent",
			})
			assert.notEqual(subagentFileOne, subagentFileTwo)
			assert.match(await fs.readFile(subagentFileOne, "utf8"), /Alpha Step/)
			assert.match(await fs.readFile(subagentFileTwo, "utf8"), /Beta Step/)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("narrows visible skills from an explicit use_skill assignment in the delegated prompt", async () => {
		const createMessage = sinon.stub().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_assigned_skill_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.ok(context.skills)
			assert.deepEqual(
				context.skills.map((skill) => skill.name),
				["bmad-review-edge-case-hunter"],
			)
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([
			{
				name: "bmad-review-edge-case-hunter",
				description: "Edge case review",
				path: "/skills/bmad-review-edge-case-hunter/SKILL.md",
				source: "project",
			},
			{
				name: "bmad-review-adversarial-general",
				description: "Adversarial review",
				path: "/skills/bmad-review-adversarial-general/SKILL.md",
				source: "project",
			},
		])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(false))
		const result = await runner.run(
			`Edge case review. Skill: use_skill('bmad-review-edge-case-hunter'). Review only the provided bundle.`,
			() => {},
		)

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 1)
	})

	it("falls back to the assigned-skill directive when the assigned skill is not a workflow", async () => {
		const createMessage = sinon.stub().callsFake(async function* (_systemPrompt: string) {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_nonworkflow_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([
			{
				name: "review-helper",
				description: "Helper skill",
				path: "/skills/review-helper/SKILL.md",
				source: "project",
			},
		])
		sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(undefined)
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(false))
		const result = await runner.run(`Skill: use_skill('review-helper')`, () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 1)
		const systemPrompt = createMessage.firstCall.args[0] as string
		assert.match(systemPrompt, /Assigned Workflow Activation/)
		assert.match(systemPrompt, /review-helper/)
	})

	it("logs a warning when a configured skill is not available", async () => {
		const createMessage = sinon.stub().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_skills_missing_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const warnStub = sinon.stub(Logger, "warn")
		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.ok(context.skills)
			assert.deepEqual(
				context.skills.map((skill) => skill.name),
				["present-skill"],
			)
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(["present-skill", "missing-skill"])
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon
			.stub(skills, "getAvailableSkills")
			.returns([{ name: "present-skill", description: "Present", path: "/skills/present/SKILL.md", source: "project" }])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(false))
		const result = await runner.run("Run task", () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 1)
		sinon.assert.calledWith(
			warnStub,
			"[SubagentRunner] Configured or assigned skill 'missing-skill' not found for subagent run.",
		)
	})

	it("includes workspace metadata only in the initial user message", async () => {
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* (_systemPrompt: string, conversation: unknown[]) {
			const initialUser = conversation[0] as {
				role: string
				content: Array<{ type?: string; text?: string }>
			}
			assert.equal(initialUser.role, "user")
			const initialTexts = initialUser.content
				.filter((block) => block.type === "text")
				.map((block) => block.text || "")
				.join("\n")
			assert.match(initialTexts, /# Workspace Configuration/)

			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_workspace_1",
						name: ClineDefaultTool.LIST_FILES,
						arguments: JSON.stringify({ path: ".", recursive: false }),
					},
				},
			}
		})
		createMessage.onSecondCall().callsFake(async function* (_systemPrompt: string, conversation: unknown[]) {
			const followUpUser = conversation[2] as {
				role: string
				content: Array<{ type?: string; text?: string }>
			}
			assert.equal(followUpUser.role, "user")
			const followUpTexts = followUpUser.content
				.filter((block) => block.type === "text")
				.map((block) => block.text || "")
				.join("\n")
			assert.equal(followUpTexts.includes("# Workspace Configuration"), false)

			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_workspace_complete_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = [{ name: "list_files" } as any]
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns([{ name: "list_files" }] as any)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(true))
		const result = await runner.run("List files", () => {})

		assert.equal(result.status, "completed")
		assert.equal(result.result, "done")
		assert.equal(createMessage.callCount, 2)
	})
})
