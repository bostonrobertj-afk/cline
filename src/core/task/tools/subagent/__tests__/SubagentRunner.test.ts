import { strict as assert } from "node:assert"
import * as coreApi from "@core/api"
import * as skills from "@core/context/instructions/user-instructions/skills"
import { PromptRegistry } from "@core/prompts/system-prompt"
import type { ManagedWorkflowRunState } from "@core/task/managed-workflows/types"
import type { TaskConfig } from "@core/task/tools/types/TaskConfig"
import * as workflowActivation from "@core/task/workflow-activation"
import * as workflowResolution from "@core/workflows/resolution/resolveAvailableWorkflows"
import fs from "fs/promises"
import { afterEach, beforeEach, describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
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

function createTaskConfig(nativeToolCallEnabled: boolean): TaskConfig {
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
		autoApprovalSettings: {
			enableNotifications: false,
			actions: { executeSafeCommands: false, executeAllCommands: false },
		},
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

function stubApiHandler(createMessage: sinon.SinonStub) {
	sinon.stub(coreApi, "buildApiHandler").returns({
		abort: sinon.stub(),
		getModel: () => ({
			id: "anthropic/claude-sonnet-4.5",
			info: {
				contextWindow: 200_000,
				apiFormat: ApiFormat.ANTHROPIC_CHAT,
				supportsPromptCache: true,
			},
		}),
		createMessage,
	} as never)
}

function createFocusChainManager(taskState: TaskState, taskId = "task-1") {
	return new FocusChainManager({
		taskId,
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

function extractTextFromMessage(message: { content: Array<{ type?: string; text?: string }> }) {
	return message.content
		.filter((block) => block.type === "text")
		.map((block) => block.text || "")
		.join("\n")
}

describe("SubagentRunner", () => {
	beforeEach(() => {
		sinon.stub(workflowResolution, "resolveAvailableWorkflows").resolves([])
	})

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

	it("includes workflow-backed activations in subagent prompt context", async () => {
		const createMessage = sinon.stub().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_workflow_context_1",
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
				["alpha-skill", "address-pr-comments.md", "remote-review"],
			)
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon
			.stub(skills, "getAvailableSkills")
			.returns([{ name: "alpha-skill", description: "Alpha", path: "/skills/alpha/SKILL.md", source: "project" }])
		;(workflowResolution.resolveAvailableWorkflows as sinon.SinonStub).resolves([
			{
				name: "address-pr-comments.md",
				source: "local",
				description: "Workspace workflow: address-pr-comments.md",
				fileName: "address-pr-comments.md",
				fullPath: "/project/.clinerules/workflows/address-pr-comments.md",
			},
			{
				name: "remote-review",
				source: "remote",
				description: "Remote workflow: remote-review",
				fileName: "remote-review",
				contents: "# remote",
			},
		])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(false))
		const result = await runner.run("Run task", () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 1)
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

	it("auto-activates an explicitly assigned managed workflow before the first subagent turn", async () => {
		const createMessage = sinon.stub().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_autoworkflow_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.equal(context.managedWorkflowActive, true)
			assert.ok(context.activeWorkflowReminder)
			assert.match(context.activeWorkflowReminder!, /<active_bmad_workflow/)
			assert.match(context.activeWorkflowReminder!, /bmad-review-edge-case-hunter/)
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
		])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const config = createTaskConfig(false)
		config.cwd = process.cwd()
		const runner = new SubagentRunner(config)
		const result = await runner.run(`Skill: use_skill('bmad-review-edge-case-hunter')`, () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 1)
	})

	it("auto-activates an explicitly assigned placeholder workflow before the first subagent turn", async () => {
		const createMessage = sinon.stub().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_placeholder_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.equal(context.managedWorkflowActive, false)
			assert.equal(context.activeWorkflowSupportsPlaceholders, true)
			assert.equal(context.activeWorkflowReminder, undefined)
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		;(workflowResolution.resolveAvailableWorkflows as sinon.SinonStub).resolves([
			{
				name: "review-edge-case-hunter",
				source: "remote",
				description: "Remote workflow: review-edge-case-hunter",
				fileName: "review-edge-case-hunter",
				contents: "# Edge case review instructions\nInspect the provided bundle.",
			},
		])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(false))
		const result = await runner.run(`Skill: use_skill('review-edge-case-hunter')`, () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 1)
		const initialUser = createMessage.firstCall.args[1][0] as {
			role: string
			content: Array<{ type?: string; text?: string }>
		}
		const initialTexts = extractTextFromMessage(initialUser)
		assert.match(initialTexts, /<explicit_instructions type="review-edge-case-hunter">/)
		assert.match(initialTexts, /Edge case review instructions/)
		assert.match(initialTexts, /# task_progress RECOMMENDED/)
		const systemPrompt = createMessage.firstCall.args[0] as string
		assert.doesNotMatch(systemPrompt, /Assigned Workflow Activation/)
	})

	it("injects placeholder workflow activation only on the first subagent turn and keeps focus-chain guidance on later turns", async () => {
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_placeholder_followup_1",
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
						id: "toolu_subagent_placeholder_followup_complete_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.equal(context.activeWorkflowReminder, undefined)
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		;(workflowResolution.resolveAvailableWorkflows as sinon.SinonStub).resolves([
			{
				name: "review-edge-case-hunter",
				source: "remote",
				description: "Remote workflow: review-edge-case-hunter",
				fileName: "review-edge-case-hunter",
				contents: `# Edge case review instructions

## Step 1: Gather Context
Inspect the provided bundle before running tools.

## Step 2: Review
Review the changed implementation for edge cases.`,
			},
		])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(false))
		const result = await runner.run(`Skill: use_skill('review-edge-case-hunter')`, () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 2)
		const initialUser = createMessage.firstCall.args[1][0] as {
			role: string
			content: Array<{ type?: string; text?: string }>
		}
		const initialTexts = extractTextFromMessage(initialUser)
		assert.match(initialTexts, /<explicit_instructions type="review-edge-case-hunter">/)
		assert.match(initialTexts, /### Reminder:/)
		assert.match(initialTexts, /# CURRENT WORKFLOW STEP/)

		const secondConversation = createMessage.secondCall.args[1] as Array<{
			role: string
			content: Array<{ type?: string; text?: string }>
		}>
		const followUpUser = secondConversation[secondConversation.length - 1] as {
			role: string
			content: Array<{ type?: string; text?: string }>
		}
		const followUpTexts = extractTextFromMessage(followUpUser)
		assert.doesNotMatch(followUpTexts, /<explicit_instructions type="review-edge-case-hunter">/)
		assert.match(followUpTexts, /### Reminder:/)
		assert.match(followUpTexts, /Current Progress: 0\/2 items completed/)
		assert.match(followUpTexts, /# CURRENT WORKFLOW STEP/)
	})

	it("auto-binds the owning BMAD agent when an assigned placeholder workflow maps to a managed twin", async () => {
		const config = createTaskConfig(false)
		config.cwd = process.cwd()
		const runner = new SubagentRunner(config)
		const state = new TaskState()

		const activatePlaceholderStub = sinon
			.stub(workflowActivation, "activatePlaceholderWorkflowInTaskState")
			.resolves(undefined)

		await (runner as any).autoActivateAssignedWorkflow(
			state,
			["code-review"],
			[
				{
					name: "code-review",
					source: "remote",
					description: "Remote workflow: code-review",
					fileName: "code-review",
					contents: "# Code review\nInspect implementation.",
				},
			],
		)

		sinon.assert.calledOnce(activatePlaceholderStub)
		assert.equal(state.activeAgentId, "bmad-dev")
		assert.equal(state.activeAgentSkillName, "bmad-dev")
		assert.equal(state.activeAgentInvokedSlashCommand, "code-review")
		assert.equal(state.activeAgentJustActivated, true)
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
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.equal(context.activeWorkflowReminder, undefined)
			assert.equal(context.activeWorkflowSupportsPlaceholders, false)
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
		;(workflowResolution.resolveAvailableWorkflows as sinon.SinonStub).resolves([])
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

	it("does not re-activate a placeholder workflow that is already active in state", async () => {
		const runner = new SubagentRunner(createTaskConfig(false))
		const state = new TaskState()
		state.activePlaceholderWorkflowId = "review-edge-case-hunter"
		state.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "review-edge-case-hunter",
			contents: "# Edge case review instructions",
		}
		state.activePlaceholderWorkflowStableValues = { project_root: "/tmp" }
		state.activePlaceholderWorkflowValues = { review_focus: "security" }

		const activateManagedStub = sinon.stub(workflowActivation, "activateManagedWorkflowInTaskState")
		const activatePlaceholderStub = sinon.stub(workflowActivation, "activatePlaceholderWorkflowInTaskState")

		await (runner as any).autoActivateAssignedWorkflow(
			state,
			["review-edge-case-hunter"],
			[
				{
					name: "review-edge-case-hunter",
					source: "remote",
					description: "Remote workflow: review-edge-case-hunter",
					fileName: "review-edge-case-hunter",
					contents: "# Edge case review instructions",
				},
			],
		)

		sinon.assert.notCalled(activateManagedStub)
		sinon.assert.notCalled(activatePlaceholderStub)
		assert.equal(state.activePlaceholderWorkflowId, "review-edge-case-hunter")
		assert.deepEqual(state.activePlaceholderWorkflowValues, { review_focus: "security" })
	})

	it("seeds a placeholder checklist from step headings when auto-activating a subagent workflow", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "subagent-focus-chain-seed-"))
		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const config = createTaskConfig(false)
			config.taskState.currentFocusChainChecklist = "- [ ] Parent Step 1\n- [ ] Parent Step 2"
			const parentManager = createFocusChainManager(config.taskState, config.taskId)
			await parentManager.updateFCListFromToolResponse(config.taskState.currentFocusChainChecklist)

			const runner = new SubagentRunner(config)
			const state = new TaskState()

			await (runner as any).autoActivateAssignedWorkflow(
				state,
				["review-edge-case-hunter"],
				[
					{
						name: "review-edge-case-hunter",
						source: "remote",
						description: "Remote workflow: review-edge-case-hunter",
						fileName: "review-edge-case-hunter",
						contents: `# Edge case review

## Step 1: Gather Context
Load the review target and confirm scope.

## Step 2: Review
Inspect reachable edge cases in the changed code.`,
					},
				],
			)

			assert.equal(state.activePlaceholderWorkflowId, "review-edge-case-hunter")
			assert.equal(state.currentFocusChainChecklist, "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review")

			const parentFilePath = getFocusChainFilePath(tempDir, config.taskId)
			const parentContent = await fs.readFile(parentFilePath, "utf8")
			assert.match(parentContent, /Parent Step 1/)
			assert.doesNotMatch(parentContent, /Step 1: Gather Context/)

			const subagentStorageKey = (runner as any).subagentFocusChainStorageKey as string
			assert.ok(subagentStorageKey)
			const subagentFilePath = getFocusChainFilePath(tempDir, config.taskId, {
				key: subagentStorageKey,
				scope: "subagent",
			})
			const subagentContent = await fs.readFile(subagentFilePath, "utf8")
			assert.match(subagentContent, /Step 1: Gather Context/)
			assert.match(subagentContent, /Step 2: Review/)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
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
			const subagentConfig = (runner as any).createSubagentTaskConfig(subagentState) as TaskConfig

			const result = await subagentConfig.callbacks.updateFCListFromToolResponse("- [ ] Child Step")

			assert.equal(result.accepted, true)
			sinon.assert.notCalled(config.callbacks.updateFCListFromToolResponse as sinon.SinonStub)
			assert.equal(subagentState.currentFocusChainChecklist, "- [ ] Child Step")

			const parentFilePath = getFocusChainFilePath(tempDir, config.taskId)
			const parentContent = await fs.readFile(parentFilePath, "utf8")
			assert.match(parentContent, /Parent Step/)
			assert.doesNotMatch(parentContent, /Child Step/)

			const subagentStorageKey = (runner as any).subagentFocusChainStorageKey as string
			const subagentFilePath = getFocusChainFilePath(tempDir, config.taskId, {
				key: subagentStorageKey,
				scope: "subagent",
			})
			const subagentContent = await fs.readFile(subagentFilePath, "utf8")
			assert.match(subagentContent, /Child Step/)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("isolates focus-chain storage across multiple subagent runs under the same parent task", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "subagent-focus-chain-multi-"))
		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const config = createTaskConfig(false)
			const runnerOne = new SubagentRunner(config)
			const runnerTwo = new SubagentRunner(config)
			const stateOne = new TaskState()
			const stateTwo = new TaskState()

			await (runnerOne as any).autoActivateAssignedWorkflow(
				stateOne,
				["review-a"],
				[
					{
						name: "review-a",
						source: "remote",
						description: "Remote workflow: review-a",
						fileName: "review-a",
						contents: `## Step 1: Alpha\nInspect alpha.`,
					},
				],
			)
			await (runnerTwo as any).autoActivateAssignedWorkflow(
				stateTwo,
				["review-b"],
				[
					{
						name: "review-b",
						source: "remote",
						description: "Remote workflow: review-b",
						fileName: "review-b",
						contents: `## Step 1: Beta\nInspect beta.`,
					},
				],
			)

			const storageKeyOne = (runnerOne as any).subagentFocusChainStorageKey as string
			const storageKeyTwo = (runnerTwo as any).subagentFocusChainStorageKey as string
			assert.ok(storageKeyOne)
			assert.ok(storageKeyTwo)
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
			assert.match(await fs.readFile(subagentFileOne, "utf8"), /Step 1: Alpha/)
			assert.match(await fs.readFile(subagentFileTwo, "utf8"), /Step 1: Beta/)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
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

	it("builds workflow reminder context from the subagent's local workflow state", async () => {
		const runner = new SubagentRunner(createTaskConfig(false))
		const state = new TaskState()
		const run = {
			workflowId: "bmad-review-edge-case-hunter",
			slashCommand: "bmad-review-edge-case-hunter",
			status: "active",
			currentPhaseIndex: 0,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			allRequiredComplete: false,
			phases: [
				{
					id: "workflow",
					title: "Workflow",
					sourcePath: ".cline/skills/bmad-review-edge-case-hunter/workflow.md",
					sourceContent: "# workflow",
					completed: false,
					items: [
						{ id: "workflow::step-1", label: "Load review input", sourceText: "Load review input", completed: false },
					],
					execution: {
						steps: [
							{
								id: "workflow::step-1",
								goal: "Load review input",
								instructions: [],
							},
						],
					},
				},
			],
		} as ManagedWorkflowRunState
		state.managedWorkflowRun = run
		state.activeWorkflowId = run.workflowId

		const context = await (runner as any).buildPromptContext({
			state,
			hostIde: "test",
			providerInfo: {
				providerId: "anthropic",
				model: { id: "anthropic/claude-sonnet-4.5", info: { contextWindow: 200_000 } },
				mode: "act",
				customPrompt: undefined,
			},
			availableSkills: [],
			configuredSkillNames: undefined,
			assignedSkillNames: [],
			nativeToolCallsRequested: false,
		})

		assert.equal(context.activeAgentId, undefined)
		assert.equal(context.managedWorkflowActive, true)
		assert.ok(context.activeWorkflowReminder)
		assert.match(context.activeWorkflowReminder!, /<active_bmad_workflow/)
		assert.match(context.activeWorkflowReminder!, /bmad-review-edge-case-hunter/)
	})

	it("does not inject persistent workflow reminders for placeholder-only subagent workflows", async () => {
		const runner = new SubagentRunner(createTaskConfig(false))
		const state = new TaskState()
		state.activePlaceholderWorkflowId = "local-review.md"
		state.activePlaceholderWorkflowValues = { story_id: "1.1" }

		const context = await (runner as any).buildPromptContext({
			state,
			hostIde: "test",
			providerInfo: {
				providerId: "anthropic",
				model: { id: "anthropic/claude-sonnet-4.5", info: { contextWindow: 200_000 } },
				mode: "act",
				customPrompt: undefined,
			},
			availableSkills: [],
			configuredSkillNames: undefined,
			assignedSkillNames: [],
			nativeToolCallsRequested: false,
		})

		assert.equal(context.managedWorkflowActive, false)
		assert.equal(context.activeWorkflowReminder, undefined)
		assert.equal(context.activeWorkflowSupportsPlaceholders, true)
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
