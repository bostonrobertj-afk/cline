import { strict as assert } from "node:assert"
import * as coreApi from "@core/api"
import type { ToolUse } from "@core/assistant-message"
import { ContextManager } from "@core/context/context-management/ContextManager"
import { FileContextTracker } from "@core/context/context-tracking/FileContextTracker"
import * as skills from "@core/context/instructions/user-instructions/skills"
import { ClineIgnoreController } from "@core/ignore/ClineIgnoreController"
import { CommandPermissionController } from "@core/permissions"
import { PromptRegistry } from "@core/prompts/system-prompt"
import type { ClineToolSpec } from "@core/prompts/system-prompt/spec"
import { StateManager } from "@core/storage/StateManager"
import type { TaskConfig } from "@core/task/tools/types/TaskConfig"
import { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import { BrowserSession } from "@services/browser/BrowserSession"
import { UrlContentFetcher } from "@services/browser/UrlContentFetcher"
import { McpHub } from "@services/mcp/McpHub"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowNextAction,
	WorkflowWorkspacePathPolicy,
} from "@/core/task/workflow-runtime/types"
import { WorkflowNextActionConsumer } from "@/core/task/workflow-runtime/WorkflowNextActionConsumer"
import * as WorkflowRegistry from "@/core/task/workflow-runtime/WorkflowRegistry"
import { WorkflowRuntime } from "@/core/task/workflow-runtime/WorkflowRuntime"
import { HostProvider } from "@/hosts/host-provider"
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@/shared/AutoApprovalSettings"
import { DEFAULT_BROWSER_SETTINGS } from "@/shared/BrowserSettings"
import { DEFAULT_FOCUS_CHAIN_SETTINGS } from "@/shared/FocusChainSettings"
import { ModelFamily } from "@/shared/prompts"
import { ApiFormat } from "@/shared/proto/cline/models"
import { Logger } from "@/shared/services/Logger"
import { ClineDefaultTool, type ClineTool } from "@/shared/tools"
import type { ToolResponse } from "../../../index"
import { MessageStateHandler } from "../../../message-state"
import { TaskState } from "../../../TaskState"
import { AutoApprove } from "../../autoApprove"
import { type IToolHandler, ToolExecutorCoordinator } from "../../ToolExecutorCoordinator"
import { SUBAGENT_DEFAULT_ALLOWED_TOOLS, SubagentBuilder } from "../SubagentBuilder"
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
	fullTurnWorkflowSystemInstructionsBlock?: string
	fullTurnWorkflowInputInstructionsBlock?: string
	workflowToolSchemaOverride?: readonly ClineToolSpec[]
	continuationTurnWorkflowSystemInstructionsBlock?: string
	continuationTurnWorkflowInputInstructionsBlock?: string
	skills?: Array<{ name: string }>
	isContinuationTurn?: boolean
	enableNativeToolCalls?: boolean
	enableParallelToolCalling?: boolean
	isSubagentRun?: boolean
}

const createSubagentTaskConfig = Reflect.get(SubagentRunner.prototype, "createSubagentTaskConfig") as (
	this: SubagentRunner,
	state: TaskState,
	workflowNextActions?: WorkflowNextAction[],
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
const consumeChildWorkflowNextAction = Reflect.get(SubagentRunner.prototype, "consumeChildWorkflowNextAction") as (
	this: SubagentRunner,
	state: TaskState,
	nextAction: WorkflowNextAction | undefined,
) => Promise<void>
const ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: "entry_project_mode",
	projectTitle: "entry_project_title",
	projectFolderName: "entry_project_folder_name",
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

function isSubagentToolResultMessage(
	message: unknown,
): message is { role: string; content: readonly { type?: string; content?: string }[] } {
	if (typeof message !== "object" || message === null) {
		return false
	}
	if (!("role" in message) || typeof message.role !== "string") {
		return false
	}
	if (!("content" in message) || !Array.isArray(message.content)) {
		return false
	}
	return message.content.every((block) => {
		if (typeof block !== "object" || block === null) {
			return false
		}
		const hasValidType = !("type" in block) || typeof block.type === "string"
		const hasValidContent = !("content" in block) || typeof block.content === "string"
		return hasValidType && hasValidContent
	})
}

function createAllowAllWorkspacePathPolicy(): WorkflowWorkspacePathPolicy {
	return {
		validateAccess: () => true,
	}
}

class TestDiffViewProvider extends DiffViewProvider {
	protected async openDiffEditor(): Promise<void> {}

	protected async scrollEditorToLine(_line: number): Promise<void> {}

	protected async scrollAnimation(_startLine: number, _endLine: number): Promise<void> {}

	protected async truncateDocument(_lineNumber: number): Promise<void> {}

	protected async getDocumentLineCount(): Promise<number> {
		return 0
	}

	protected async getDocumentText(): Promise<string | undefined> {
		return undefined
	}

	protected async saveDocument(): Promise<boolean> {
		return true
	}

	protected async closeAllDiffViews(): Promise<void> {}

	protected async resetDiffView(): Promise<void> {}

	async replaceText(
		_content: string,
		_rangeToReplace: { startLine: number; endLine: number },
		_currentLine: number | undefined,
	): Promise<void> {}
}

function createToolHandler(name: ClineDefaultTool, response: string, description: string): IToolHandler {
	return {
		name,
		execute: sinon.stub<[TaskConfig, ToolUse], Promise<ToolResponse>>().resolves(response),
		getDescription: sinon.stub<[ToolUse], string>().returns(description),
	}
}

function createTaskConfig(nativeToolCallEnabled: boolean, promptRefreshFrequency = 5): TaskConfig {
	const autoApprovalSettings = {
		...DEFAULT_AUTO_APPROVAL_SETTINGS,
		enableNotifications: false,
		actions: {
			...DEFAULT_AUTO_APPROVAL_SETTINGS.actions,
			executeSafeCommands: false,
			executeAllCommands: false,
			useMcp: false,
		},
	}
	const browserSettings = {
		...DEFAULT_BROWSER_SETTINGS,
		viewport: { ...DEFAULT_BROWSER_SETTINGS.viewport },
	}
	const focusChainSettings = { ...DEFAULT_FOCUS_CHAIN_SETTINGS }
	const taskState = new TaskState()
	const stateManager = sinon.createStubInstance(StateManager)
	stateManager.getWorkspaceStateKey.withArgs("localClineRulesToggles").returns({})
	stateManager.getWorkspaceStateKey.withArgs("localCursorRulesToggles").returns({})
	stateManager.getWorkspaceStateKey.withArgs("localWindsurfRulesToggles").returns({})
	stateManager.getWorkspaceStateKey.withArgs("localAgentsRulesToggles").returns({})
	stateManager.getWorkspaceStateKey.withArgs("localSkillsToggles").returns({})
	stateManager.getGlobalSettingsKey.withArgs("mode").returns("act")
	stateManager.getGlobalSettingsKey.withArgs("customPrompt").returns(undefined)
	stateManager.getGlobalSettingsKey.withArgs("promptRefreshFrequency").returns(promptRefreshFrequency)
	stateManager.getGlobalSettingsKey.withArgs("autoApprovalSettings").returns(autoApprovalSettings)
	stateManager.getGlobalSettingsKey.withArgs("useAutoCondense").returns(false)
	stateManager.getGlobalStateKey.callsFake((key) => (key === "nativeToolCallEnabled" ? nativeToolCallEnabled : undefined))
	stateManager.getRemoteConfigSettings.returns({})
	stateManager.getApiConfiguration.returns({
		actModeApiProvider: "anthropic",
		planModeApiProvider: "anthropic",
	})

	const autoApprover = sinon.createStubInstance(AutoApprove)
	autoApprover.shouldAutoApproveTool.returns([false, false])

	const coordinator = new ToolExecutorCoordinator()
	coordinator.register(createToolHandler(ClineDefaultTool.LIST_FILES, "ok", "list_files"))
	coordinator.register(
		createToolHandler(ClineDefaultTool.SET_WORKFLOW_VALUES, "workflow values persisted", "set_workflow_values"),
	)
	coordinator.register(
		createToolHandler(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT, "workflow artifact created", "create_workflow_artifact"),
	)

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
		taskState,
		messageState: new MessageStateHandler({
			taskId: "task-1",
			ulid: "ulid-1",
			updateTaskHistory: async () => [],
			taskState,
		}),
		workflowRuntime: new WorkflowRuntime({
			cwd: "/tmp",
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		}),
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
			mcpHub: sinon.createStubInstance(McpHub),
			browserSession: sinon.createStubInstance(BrowserSession),
			urlContentFetcher: sinon.createStubInstance(UrlContentFetcher),
			diffViewProvider: new TestDiffViewProvider(),
			fileContextTracker: sinon.createStubInstance(FileContextTracker),
			clineIgnoreController: sinon.createStubInstance(ClineIgnoreController),
			commandPermissionController: sinon.createStubInstance(CommandPermissionController),
			contextManager: new ContextManager(),
			stateManager,
		},
		browserSettings,
		focusChainSettings,
		autoApprovalSettings,
		autoApprover,
		callbacks: {
			say: sinon.stub().resolves(undefined),
			ask: sinon.stub().resolves({ response: "yesButtonClicked" }),
			saveCheckpoint: sinon.stub().resolves(),
			sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
			removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
			upsertPartialResponseToolSayPreview: sinon.stub().resolves(false),
			clearPartialResponseToolPreview: sinon.stub().resolves(false),
			executeCommandTool: sinon.stub().resolves([false, "ok"]),
			cancelRunningCommandTool: sinon.stub().resolves(false),
			doesLatestTaskCompletionHaveNewChanges: sinon.stub().resolves(false),
			updateFCListFromToolResponse: sinon.stub().resolves({ accepted: true }),
			queueWorkflowNextAction: sinon.stub(),
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
		coordinator,
	}
}

function createResolvedWorkflow(args?: {
	name?: string
	useSkillName?: string
	stepOneChecklistLabel?: string
	stepTwoChecklistLabel?: string
	workflowSystemInstructions?: string
	currentStepInstructions?: string
	workflowToolSchemaOverride?: readonly ClineToolSpec[]
	workflowValueKeys?: readonly string[]
	childInheritance?: WorkflowDefinition["childInheritance"]
}): WorkflowDefinition {
	const createProjectPromptDecisionTree = (): WorkflowDecisionTree => ({
		entryBranchId: "project-prompt",
		branches: {
			"project-prompt": {
				id: "project-prompt",
				routes: [
					{
						id: "project-prompt-route",
						trigger: { kind: "always" },
						action: { kind: "project_prompt" },
					},
				],
			},
		},
	})

	const steps: WorkflowDefinition["steps"] = {
		"step-1": {
			id: "step-1",
			stepNumber: 1,
			checklistLabel: args?.stepOneChecklistLabel ?? "Step 1: Gather Context",
			buildPromptSource: () => ({
				workflowSystemInstructions: args?.workflowSystemInstructions,
				currentStepInstructions: args?.currentStepInstructions,
			}),
			buildToolSchema: () => args?.workflowToolSchemaOverride ?? [],
			decisionTree: createProjectPromptDecisionTree(),
		},
	}
	if (args?.stepTwoChecklistLabel) {
		steps["step-2"] = {
			id: "step-2",
			stepNumber: 2,
			checklistLabel: args.stepTwoChecklistLabel,
			buildPromptSource: () => ({
				workflowSystemInstructions: args?.workflowSystemInstructions,
				currentStepInstructions: args?.currentStepInstructions,
			}),
			buildToolSchema: () => args?.workflowToolSchemaOverride ?? [],
			decisionTree: createProjectPromptDecisionTree(),
		}
	}
	return {
		name: args?.name ?? "review-workflow",
		slashCommandName: args?.name ?? "review-workflow",
		useSkillName: args?.useSkillName ?? "review-workflow",
		persona: "engineer",
		projectSubfolder: "review",
		workflowValueKeys: [...Object.values(ENTRY_PROJECT_VALUE_KEYS), ...(args?.workflowValueKeys ?? [])],
		entryProjectValueKeys: ENTRY_PROJECT_VALUE_KEYS,
		entryPanel: { promptMarkdown: "Start this workflow" },
		childInheritance: args?.childInheritance,
		steps,
	}
}

function stubResolvedWorkflowByName(workflow: WorkflowDefinition): void {
	sinon
		.stub(WorkflowRegistry, "resolveWorkflowDefinition")
		.callsFake((workflowName: string) => (workflowName === workflow.name ? workflow : undefined))
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

describe("SubagentRunner", () => {
	afterEach(() => {
		sinon.restore()
		HostProvider.reset()
	})

	it("does not reuse the parent ask callback inside subagent task configs", async () => {
		const config = createTaskConfig(true)
		const parentAsk = config.callbacks.ask as sinon.SinonStub
		const runner = new SubagentRunner(config)
		const subagentConfig = createSubagentTaskConfig.call(runner, new TaskState())

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

	it("sends prompt-registry native tools instead of pre-prompt projected native tools", async () => {
		const prePromptNativeTools: ClineTool[] = [
			{
				name: "pre_prompt_static_tool",
				description: "Static subagent tool",
				input_schema: { type: "object", properties: {} },
			},
		]
		const registryNativeTools: ClineTool[] = [
			{
				name: "registry_projected_tool",
				description: "Prompt registry projected tool",
				input_schema: { type: "object", properties: {} },
			},
		]
		const createMessage = sinon.stub().callsFake(async function* (
			_systemPrompt: string,
			_conversation: unknown[],
			nativeTools?: ClineTool[],
		) {
			assert.equal(nativeTools, registryNativeTools)
			assert.notEqual(nativeTools, prePromptNativeTools)
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_complete_registry_native_tools",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = registryNativeTools
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns(prePromptNativeTools)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(true))
		const result = await runner.run("Use projected native tools", () => {})

		assert.equal(result.status, "completed")
		assert.equal(result.result, "done")
		assert.equal(createMessage.callCount, 1)
	})

	it("sends child workflow-projected native tools instead of the static subagent native list", async () => {
		const workflowToolSchemaOverride: readonly ClineToolSpec[] = [
			{
				variant: ModelFamily.GPT_5,
				id: ClineDefaultTool.SET_WORKFLOW_VALUES,
				name: ClineDefaultTool.SET_WORKFLOW_VALUES,
				description: "Persist workflow-owned values.",
				parameters: [],
			},
		]
		const staticSubagentNativeTools: ClineTool[] = [
			{
				name: ClineDefaultTool.LIST_FILES,
				description: "Static subagent list files tool",
				input_schema: { type: "object", properties: {} },
			},
		]
		const workflowProjectedNativeTools: ClineTool[] = [
			{
				name: ClineDefaultTool.SET_WORKFLOW_VALUES,
				description: "Workflow-projected value persistence tool",
				input_schema: { type: "object", properties: {} },
			},
		]
		const createMessage = sinon.stub().callsFake(async function* (
			_systemPrompt: string,
			_conversation: unknown[],
			nativeTools?: ClineTool[],
		) {
			assert.equal(nativeTools, workflowProjectedNativeTools)
			assert.notEqual(nativeTools, staticSubagentNativeTools)
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_complete_child_workflow_native_tools",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const workflow = createResolvedWorkflow({
			name: "review-workflow",
			useSkillName: "review-workflow",
			workflowToolSchemaOverride,
		})
		sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(workflow)
		stubResolvedWorkflowByName(workflow)
		const config = createTaskConfig(true)
		config.taskState.activeWorkflowName = "parent-workflow"
		config.taskState.activeWorkflowSession = {
			activeStepNumber: 1,
			workflowValues: {},
			projectSelection: { projectMode: "existing", projectTitle: "Parent Project", projectFolderName: "parent-project" },
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionDefinitionIds: [],
			},
			branchContext: {
				activeBranchId: "project-prompt",
			},
		}
		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.equal(context.activeWorkflowName, "review-workflow")
			assert.deepEqual(context.workflowToolSchemaOverride, workflowToolSchemaOverride)
			promptRegistry.nativeTools = workflowProjectedNativeTools
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns(staticSubagentNativeTools)
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(config)
		const result = await runner.run("Skill: use_skill('review-workflow')", () => {})

		assert.equal(result.status, "completed")
		assert.equal(result.result, "done")
		assert.equal(createMessage.callCount, 1)
	})

	it("executes child workflow-projected tools that are outside the static subagent default allowed tools", async () => {
		assert.equal(SUBAGENT_DEFAULT_ALLOWED_TOOLS.includes(ClineDefaultTool.SET_WORKFLOW_VALUES), false)

		const workflowToolSchemaOverride = [
			{
				variant: ModelFamily.GPT_5,
				id: ClineDefaultTool.SET_WORKFLOW_VALUES,
				name: ClineDefaultTool.SET_WORKFLOW_VALUES,
				description: "Persist workflow-owned values.",
				parameters: [],
			},
		] as const satisfies readonly ClineToolSpec[]
		const workflowProjectedNativeTools: ClineTool[] = [
			{
				name: ClineDefaultTool.SET_WORKFLOW_VALUES,
				description: "Workflow-projected value persistence tool",
				input_schema: { type: "object", properties: {} },
			},
		]
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_set_workflow_values_1",
						name: ClineDefaultTool.SET_WORKFLOW_VALUES,
						arguments: JSON.stringify({ value_key: "ready", value: "true" }),
					},
				},
			}
		})
		createMessage.onSecondCall().callsFake(async function* (_systemPrompt: string, conversation: unknown[]) {
			const userMessage = conversation[2]
			assert.ok(isSubagentToolResultMessage(userMessage))
			assert.equal(userMessage.role, "user")
			const toolResultText = userMessage.content.find((block) => block.type === "tool_result")?.content ?? ""
			assert.match(toolResultText, /workflow values persisted/)
			assert.doesNotMatch(toolResultText, /not available inside subagent runs/)

			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_set_workflow_values_complete_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const workflow = createResolvedWorkflow({
			name: "review-workflow",
			useSkillName: "review-workflow",
			workflowToolSchemaOverride,
		})
		sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(workflow)
		stubResolvedWorkflowByName(workflow)
		const config = createTaskConfig(true)
		config.taskState.activeWorkflowName = "parent-workflow"
		config.taskState.activeWorkflowSession = {
			activeStepNumber: 1,
			workflowValues: {},
			projectSelection: { projectMode: "existing", projectTitle: "Parent Project", projectFolderName: "parent-project" },
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionDefinitionIds: [],
			},
			branchContext: {
				activeBranchId: "project-prompt",
			},
		}
		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.equal(context.activeWorkflowName, "review-workflow")
			assert.deepEqual(context.workflowToolSchemaOverride, workflowToolSchemaOverride)
			promptRegistry.nativeTools = workflowProjectedNativeTools
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns(workflowProjectedNativeTools)
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(config)
		const result = await runner.run("Skill: use_skill('review-workflow')", () => {})

		assert.equal(result.status, "completed")
		assert.equal(result.result, "done")
		assert.equal(createMessage.callCount, 2)
	})

	it("executes child workflow-projected create_workflow_artifact outside the static subagent default allowed tools", async () => {
		assert.equal(SUBAGENT_DEFAULT_ALLOWED_TOOLS.includes(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT), false)

		const workflowToolSchemaOverride = [
			{
				variant: ModelFamily.GPT_5,
				id: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
				name: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
				description: "Create a workflow artifact.",
				parameters: [],
			},
		] as const satisfies readonly ClineToolSpec[]
		const workflowProjectedNativeTools: ClineTool[] = [
			{
				name: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
				description: "Workflow-projected artifact creation tool",
				input_schema: { type: "object", properties: {} },
			},
		]
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_create_workflow_artifact_1",
						name: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
						arguments: JSON.stringify({ artifact_id: "review_input" }),
					},
				},
			}
		})
		createMessage.onSecondCall().callsFake(async function* (_systemPrompt: string, conversation: unknown[]) {
			const userMessage = conversation[2]
			assert.ok(isSubagentToolResultMessage(userMessage))
			assert.equal(userMessage.role, "user")
			const toolResultText = userMessage.content.find((block) => block.type === "tool_result")?.content ?? ""
			assert.match(toolResultText, /workflow artifact created/)
			assert.doesNotMatch(toolResultText, /not available inside subagent runs/)

			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_create_workflow_artifact_complete_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const workflow = createResolvedWorkflow({
			name: "review-workflow",
			useSkillName: "review-workflow",
			workflowToolSchemaOverride,
		})
		sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(workflow)
		stubResolvedWorkflowByName(workflow)
		const config = createTaskConfig(true)
		config.taskState.activeWorkflowName = "parent-workflow"
		config.taskState.activeWorkflowSession = {
			activeStepNumber: 1,
			workflowValues: {},
			projectSelection: { projectMode: "existing", projectTitle: "Parent Project", projectFolderName: "parent-project" },
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionDefinitionIds: [],
			},
			branchContext: {
				activeBranchId: "project-prompt",
			},
		}
		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.equal(context.activeWorkflowName, "review-workflow")
			assert.deepEqual(context.workflowToolSchemaOverride, workflowToolSchemaOverride)
			promptRegistry.nativeTools = workflowProjectedNativeTools
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns(workflowProjectedNativeTools)
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(config)
		const result = await runner.run("Skill: use_skill('review-workflow')", () => {})

		assert.equal(result.status, "completed")
		assert.equal(result.result, "done")
		assert.equal(createMessage.callCount, 2)
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

	it("rejects subagent-emitted use_skill through allowed-tools filtering", async () => {
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_use_skill_1",
						name: ClineDefaultTool.USE_SKILL,
						arguments: JSON.stringify({ skill_name: "review-workflow" }),
					},
				},
			}
		})
		createMessage.onSecondCall().callsFake(async function* (_systemPrompt: string, conversation: unknown[]) {
			const userMessage = conversation[2] as { role: string; content: Array<{ type?: string; content?: string }> }
			assert.equal(userMessage.role, "user")
			const toolResultText = userMessage.content.find((block) => block.type === "tool_result")?.content ?? ""
			assert.match(toolResultText, /Tool 'use_skill' is not available inside subagent runs\./)

			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_use_skill_complete_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const nativeTools: ClineTool[] = [
			{
				name: ClineDefaultTool.LIST_FILES,
				description: "List files",
				input_schema: { type: "object", properties: {} },
			},
		]
		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async () => {
			promptRegistry.nativeTools = nativeTools
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns(nativeTools)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(createTaskConfig(true))
		const result = await runner.run("Run assigned work", () => {})

		assert.equal(result.status, "completed")
		assert.equal(result.result, "done")
		assert.equal(createMessage.callCount, 2)
	})

	it("rejects subagent-emitted use_skill even when a child workflow projects it", async () => {
		const workflowToolSchemaOverride: readonly ClineToolSpec[] = [
			{
				variant: ModelFamily.GPT_5,
				id: ClineDefaultTool.USE_SKILL,
				name: ClineDefaultTool.USE_SKILL,
				description: "Load a skill.",
				parameters: [],
			},
		]
		const workflowProjectedNativeTools: ClineTool[] = [
			{
				name: ClineDefaultTool.USE_SKILL,
				description: "Workflow-projected use_skill tool",
				input_schema: { type: "object", properties: {} },
			},
		]
		const createMessage = sinon.stub()
		createMessage.onFirstCall().callsFake(async function* () {
			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_workflow_use_skill_1",
						name: ClineDefaultTool.USE_SKILL,
						arguments: JSON.stringify({ skill_name: "another-workflow" }),
					},
				},
			}
		})
		createMessage.onSecondCall().callsFake(async function* (_systemPrompt: string, conversation: unknown[]) {
			const userMessage = conversation[2]
			assert.ok(isSubagentToolResultMessage(userMessage))
			assert.equal(userMessage.role, "user")
			const toolResultText = userMessage.content.find((block) => block.type === "tool_result")?.content ?? ""
			assert.match(toolResultText, /Tool 'use_skill' is not available inside subagent runs\./)

			yield {
				type: "tool_calls",
				tool_call: {
					function: {
						id: "toolu_subagent_workflow_use_skill_complete_1",
						name: ClineDefaultTool.ATTEMPT,
						arguments: JSON.stringify({ result: "done" }),
					},
				},
			}
		})

		const workflow = createResolvedWorkflow({
			name: "review-workflow",
			useSkillName: "review-workflow",
			workflowToolSchemaOverride,
		})
		sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(workflow)
		stubResolvedWorkflowByName(workflow)
		const config = createTaskConfig(true)
		config.taskState.activeWorkflowName = "parent-workflow"
		config.taskState.activeWorkflowSession = {
			activeStepNumber: 1,
			workflowValues: {},
			projectSelection: { projectMode: "existing", projectTitle: "Parent Project", projectFolderName: "parent-project" },
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionDefinitionIds: [],
			},
			branchContext: {
				activeBranchId: "project-prompt",
			},
		}
		const promptRegistry = PromptRegistry.getInstance()
		sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.equal(context.activeWorkflowName, "review-workflow")
			assert.deepEqual(context.workflowToolSchemaOverride, workflowToolSchemaOverride)
			promptRegistry.nativeTools = workflowProjectedNativeTools
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns(workflowProjectedNativeTools)
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const runner = new SubagentRunner(config)
		const result = await runner.run("Skill: use_skill('review-workflow')", () => {})

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
		const workflowToolSchemaOverride = [
			{
				variant: ModelFamily.GPT_5,
				id: ClineDefaultTool.SET_WORKFLOW_VALUES,
				name: "set_workflow_values",
				description: "Persist workflow-owned values.",
				parameters: [],
			},
		] as const satisfies readonly ClineToolSpec[]
		const config = createTaskConfig(false)
		const runner = new SubagentRunner(config)
		const state = new TaskState()
		const workflow = createResolvedWorkflow({
			name: "review-workflow",
			useSkillName: "review-workflow",
			workflowSystemInstructions: "SYSTEM BLOCK",
			currentStepInstructions: "INPUT BLOCK",
			workflowToolSchemaOverride,
		})
		stubResolvedWorkflowByName(workflow)

		await config.workflowRuntime.activateWorkflow({
			taskState: state,
			workflowName: workflow.name,
		})
		const buildTurnProjectionSpy = sinon.spy(config.workflowRuntime, "buildTurnProjection")

		state.apiRequestCount = 1
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

		assert.equal(buildTurnProjectionSpy.callCount, 1)
		assert.equal(context.activeWorkflowName, "review-workflow")
		assert.equal(context.activeWorkflowStepNumber, 1)
		assert.equal(
			context.fullTurnWorkflowSystemInstructionsBlock,
			"## WORKFLOW\nWorkflow: review-workflow\n\n## WORKFLOW PERSONA\nengineer\n\n## WORKFLOW STEPS\n- [ ] Step 1: Gather Context\n\n## WORKFLOW INSTRUCTIONS\nSYSTEM BLOCK",
		)
		assert.equal(
			context.fullTurnWorkflowInputInstructionsBlock,
			"## CURRENT STEP\nStep 1: Step 1: Gather Context\n\nINPUT BLOCK",
		)
		assert.equal(
			context.continuationTurnWorkflowSystemInstructionsBlock,
			"## WORKFLOW\nWorkflow: review-workflow\n\n## WORKFLOW STEPS\n- [ ] Step 1: Gather Context\n\n## WORKFLOW INSTRUCTIONS\nSYSTEM BLOCK",
		)
		assert.equal(
			context.continuationTurnWorkflowInputInstructionsBlock,
			"## WORKFLOW CONTINUATION\nContinue working on step 1: Step 1: Gather Context.",
		)
		assert.deepEqual(context.workflowToolSchemaOverride, workflowToolSchemaOverride)
		assert.deepEqual(context.skills, [])
		assert.equal(context.isContinuationTurn, false)
		assert.equal(context.enableNativeToolCalls, false)
		assert.equal(context.enableParallelToolCalling, false)
		assert.equal(context.isSubagentRun, true)

		state.apiRequestCount = 2
		const refreshContext = await buildPromptContext.call(runner, {
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

		assert.equal(
			refreshContext.fullTurnWorkflowSystemInstructionsBlock,
			"## WORKFLOW\nWorkflow: review-workflow\n\n## WORKFLOW STEPS\n- [ ] Step 1: Gather Context\n\n## WORKFLOW INSTRUCTIONS\nSYSTEM BLOCK",
		)
		assert.equal(buildTurnProjectionSpy.callCount, 2)
		assert.equal(refreshContext.fullTurnWorkflowSystemInstructionsBlock?.includes("## WORKFLOW PERSONA"), false)
	})

	it("suppresses prompt skills on internal turns while preserving workflow runtime projection", async () => {
		const config = createTaskConfig(false)
		const runner = new SubagentRunner(config)
		const state = new TaskState()
		const workflow = createResolvedWorkflow({
			name: "review-workflow",
			useSkillName: "review-workflow",
			workflowSystemInstructions: "SYSTEM BLOCK",
			currentStepInstructions: "INPUT BLOCK",
		})
		stubResolvedWorkflowByName(workflow)

		await config.workflowRuntime.activateWorkflow({
			taskState: state,
			workflowName: workflow.name,
		})

		state.apiRequestCount = 1
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
		assert.equal(
			context.fullTurnWorkflowSystemInstructionsBlock,
			"## WORKFLOW\nWorkflow: review-workflow\n\n## WORKFLOW PERSONA\nengineer\n\n## WORKFLOW STEPS\n- [ ] Step 1: Gather Context\n\n## WORKFLOW INSTRUCTIONS\nSYSTEM BLOCK",
		)
		assert.equal(
			context.fullTurnWorkflowInputInstructionsBlock,
			"## CURRENT STEP\nStep 1: Step 1: Gather Context\n\nINPUT BLOCK",
		)
		assert.equal(
			context.continuationTurnWorkflowSystemInstructionsBlock,
			"## WORKFLOW\nWorkflow: review-workflow\n\n## WORKFLOW STEPS\n- [ ] Step 1: Gather Context\n\n## WORKFLOW INSTRUCTIONS\nSYSTEM BLOCK",
		)
		assert.equal(
			context.continuationTurnWorkflowInputInstructionsBlock,
			"## WORKFLOW CONTINUATION\nContinue working on step 1: Step 1: Gather Context.",
		)
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

		const workflow = createResolvedWorkflow({
			name: "review-workflow",
			useSkillName: "review-workflow",
			workflowSystemInstructions: "SYSTEM BLOCK",
			currentStepInstructions: "INPUT BLOCK",
		})
		sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(workflow)
		stubResolvedWorkflowByName(workflow)
		const consumeNextActionSpy = sinon.spy(WorkflowNextActionConsumer.prototype, "consume")
		const promptRegistry = PromptRegistry.getInstance()
		const promptRegistryGetStub = sinon.stub(promptRegistry, "get").callsFake(async (context) => {
			assert.equal(context.activeWorkflowName, "review-workflow")
			assert.equal(context.activeWorkflowStepNumber, 1)
			assert.equal(
				context.fullTurnWorkflowSystemInstructionsBlock,
				"## WORKFLOW\nWorkflow: review-workflow\n\n## WORKFLOW PERSONA\nengineer\n\n## WORKFLOW STEPS\n- [ ] Step 1: Gather Context\n\n## WORKFLOW INSTRUCTIONS\nSYSTEM BLOCK",
			)
			assert.equal(
				context.fullTurnWorkflowInputInstructionsBlock,
				"## CURRENT STEP\nStep 1: Step 1: Gather Context\n\nINPUT BLOCK",
			)
			assert.equal(context.isSubagentRun, true)
			promptRegistry.nativeTools = undefined
			return "system prompt"
		})
		sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		stubApiHandler(createMessage)
		initializeHostProvider()

		const config = createTaskConfig(false)
		config.taskState.activeWorkflowName = "parent-workflow"
		config.taskState.activeWorkflowSession = {
			activeStepNumber: 1,
			workflowValues: {},
			projectSelection: {
				projectMode: "existing",
				projectTitle: "Parent Project",
				projectFolderName: "parent-project",
			},
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionDefinitionIds: [],
			},
			branchContext: {
				activeBranchId: "project-prompt",
			},
		}
		const activateWorkflowSpy = sinon.spy(config.workflowRuntime, "activateWorkflow")
		const runner = new SubagentRunner(config)
		const result = await runner.run("Skill: use_skill('review-workflow')", () => {})

		assert.equal(result.status, "completed")
		assert.equal(createMessage.callCount, 1)
		sinon.assert.calledOnce(activateWorkflowSpy)
		sinon.assert.calledOnce(consumeNextActionSpy)
		sinon.assert.callOrder(consumeNextActionSpy, promptRegistryGetStub)
		assert.equal(activateWorkflowSpy.firstCall.args[0].workflowName, "review-workflow")
	})

	it("does not auto-activate an assigned child workflow without a complete parent project selection", async () => {
		const workflow = createResolvedWorkflow({
			name: "review-workflow",
			useSkillName: "review-workflow",
		})
		const resolveWorkflowByUseSkillNameStub = sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(workflow)
		const parentSessionCases: Array<{
			name: string
			parentSession: ActiveWorkflowSession | undefined
		}> = [
			{
				name: "missing parent session",
				parentSession: undefined,
			},
			{
				name: "blank parent project title",
				parentSession: {
					activeStepNumber: 1,
					workflowValues: {},
					projectSelection: {
						projectMode: "existing",
						projectTitle: " ",
						projectFolderName: "parent-project",
					},
					ui: {
						formSession: undefined,
						stepResolutionSession: undefined,
						suppressedWorkflowFormIds: [],
						suppressedWorkflowStepResolutionDefinitionIds: [],
					},
					branchContext: {
						activeBranchId: "project-prompt",
					},
				},
			},
			{
				name: "blank parent project folder",
				parentSession: {
					activeStepNumber: 1,
					workflowValues: {},
					projectSelection: {
						projectMode: "existing",
						projectTitle: "Parent Project",
						projectFolderName: " ",
					},
					ui: {
						formSession: undefined,
						stepResolutionSession: undefined,
						suppressedWorkflowFormIds: [],
						suppressedWorkflowStepResolutionDefinitionIds: [],
					},
					branchContext: {
						activeBranchId: "project-prompt",
					},
				},
			},
		]

		for (const parentSessionCase of parentSessionCases) {
			const config = createTaskConfig(false)
			config.taskState.activeWorkflowName = "parent-workflow"
			config.taskState.activeWorkflowSession = parentSessionCase.parentSession
			const activateWorkflowSpy = sinon.spy(config.workflowRuntime, "activateWorkflow")
			const runner = new SubagentRunner(config)
			const childState = new TaskState()

			await autoActivateAssignedWorkflow.call(runner, childState, ["review-workflow"])

			assert.equal(childState.activeWorkflowName, undefined, parentSessionCase.name)
			assert.equal(childState.activeWorkflowSession, undefined, parentSessionCase.name)
			sinon.assert.notCalled(activateWorkflowSpy)
		}
		sinon.assert.notCalled(resolveWorkflowByUseSkillNameStub)
	})

	it("fails clearly when a child workflow attempts to render a workflow form", async () => {
		const workflow = createResolvedWorkflow({
			name: "review-workflow",
			useSkillName: "review-workflow",
		})
		const firstStep = workflow.steps["step-1"]
		firstStep.decisionTree = {
			entryBranchId: "render-form",
			branches: {
				"render-form": {
					id: "render-form",
					routes: [
						{
							id: "render-form-route",
							trigger: { kind: "always" },
							action: { kind: "render_workflow_form", workflowFormId: "child-form" },
						},
					],
				},
			},
		}
		workflow.workflowForms = {
			"child-form": {
				definitionVersion: 1,
				title: "Child Form",
				toolDictionaryTitle: "Tools",
				toolDictionaryMarkdown: "",
				firstPanelId: "panel-1",
				panels: {
					"panel-1": {
						panelId: "panel-1",
						title: "Panel",
						promptMarkdown: "Collect child input.",
						fields: [],
						allowedActions: [],
						transition: {
							type: "conditional",
							conditionSourceKey: "done",
							branches: [],
							defaultTerminal: true,
						},
					},
				},
			},
		}
		sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(workflow)
		stubResolvedWorkflowByName(workflow)
		sinon.stub(skills, "discoverSkills").resolves([])
		sinon.stub(skills, "getAvailableSkills").returns([])
		const createMessage = sinon.stub()
		stubApiHandler(createMessage)
		initializeHostProvider()
		const config = createTaskConfig(false)
		config.taskState.activeWorkflowSession = {
			activeStepNumber: 1,
			workflowValues: {},
			projectSelection: { projectMode: "existing", projectTitle: "Parent Project", projectFolderName: "parent-project" },
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionDefinitionIds: [],
			},
			branchContext: {
				activeBranchId: "project-prompt",
			},
		}

		const runner = new SubagentRunner(config)
		const result = await runner.run("Skill: use_skill('review-workflow')", () => {})

		assert.equal(result.status, "failed")
		assert.equal(result.error, "Child workflow configuration is invalid: subagent workflows cannot render workflow forms.")
		sinon.assert.notCalled(createMessage)
	})

	it("executes child workflow tool-backed operations through the child handler path and continues consumption", async () => {
		const config = createTaskConfig(false)
		const runner = new SubagentRunner(config)
		const state = new TaskState()
		const handlerExecute = sinon.stub<[TaskConfig, ToolUse], Promise<ToolResponse>>()
		handlerExecute.onFirstCall().resolves("created artifact")
		handlerExecute.onSecondCall().resolves("listed files")
		const registerByNameSpy = sinon.spy(ToolExecutorCoordinator.prototype, "registerByName")
		sinon.stub(ToolExecutorCoordinator.prototype, "has").returns(false)
		const createWorkflowArtifactHandler: IToolHandler = {
			name: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
			execute: handlerExecute,
			getDescription: () => `[${ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT}]`,
		}
		const listFilesHandler: IToolHandler = {
			name: ClineDefaultTool.LIST_FILES,
			execute: handlerExecute,
			getDescription: () => `[${ClineDefaultTool.LIST_FILES}]`,
		}
		sinon.stub(ToolExecutorCoordinator.prototype, "getHandler").callsFake((toolName: string) => {
			if (toolName === ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT) {
				return createWorkflowArtifactHandler
			}

			if (toolName === ClineDefaultTool.LIST_FILES) {
				return listFilesHandler
			}

			return undefined
		})
		const handleToolBackedOperationToolResult = sinon.stub(config.workflowRuntime, "handleToolBackedOperationToolResult")
		handleToolBackedOperationToolResult.onFirstCall().resolves({
			kind: "execute_tool_backed_operation",
			toolRequest: {
				toolName: ClineDefaultTool.LIST_FILES,
				toolParams: {
					path: ".",
				},
				toolInput: {},
			},
		})
		handleToolBackedOperationToolResult.onSecondCall().resolves({ kind: "no_op" })

		await consumeChildWorkflowNextAction.call(runner, state, {
			kind: "execute_tool_backed_operation",
			toolRequest: {
				toolName: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
				toolParams: {
					artifact_id: "review_input",
				},
				toolInput: {},
			},
		})

		sinon.assert.calledWith(registerByNameSpy, ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT, sinon.match.object)
		sinon.assert.calledTwice(handlerExecute)
		assert.equal(handlerExecute.firstCall.args[0].isSubagentExecution, true)
		assert.equal(handlerExecute.firstCall.args[1].name, ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)
		assert.deepEqual(handlerExecute.firstCall.args[1].params, { artifact_id: "review_input" })
		assert.equal(handlerExecute.secondCall.args[1].name, ClineDefaultTool.LIST_FILES)
		sinon.assert.calledTwice(handleToolBackedOperationToolResult)
		assert.deepEqual(handleToolBackedOperationToolResult.firstCall.args[0], {
			taskState: state,
			toolResultText: "created artifact",
		})
		assert.deepEqual(handleToolBackedOperationToolResult.secondCall.args[0], {
			taskState: state,
			toolResultText: "listed files",
		})
	})

	it("leaves the parent workflow state unchanged while inheriting declared values into the child workflow session", async () => {
		const config = createTaskConfig(false)
		config.taskState.activeWorkflowName = "parent-workflow"
		const parentWorkflowSession: ActiveWorkflowSession = {
			activeStepNumber: 1,
			workflowValues: { review_input: "/tmp/review-input.md", ignored_parent: "drop" },
			projectSelection: { projectMode: "existing", projectTitle: "Parent Project", projectFolderName: "parent-project" },
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionDefinitionIds: [],
			},
			branchContext: {
				activeBranchId: "project-prompt",
			},
		}
		config.taskState.activeWorkflowSession = parentWorkflowSession
		config.taskState.currentFocusChainChecklist = "- [ ] Parent Step"

		const runner = new SubagentRunner(config)
		const state = new TaskState()
		const workflow = createResolvedWorkflow({
			name: "child-workflow",
			useSkillName: "child-workflow",
			workflowValueKeys: ["review_input"],
			childInheritance: [{ parentKey: "review_input", childKey: "review_input" }],
		})
		sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(workflow)
		stubResolvedWorkflowByName(workflow)
		const activateWorkflowSpy = sinon.spy(config.workflowRuntime, "activateWorkflow")

		await autoActivateAssignedWorkflow.call(runner, state, ["child-workflow"])
		const activationResult = await activateWorkflowSpy.returnValues[0]

		assert.equal(state.activeWorkflowName, "child-workflow")
		assert.deepEqual(state.activeWorkflowSession?.workflowValues, { review_input: "/tmp/review-input.md" })
		assert.deepEqual(state.activeWorkflowSession?.projectSelection, parentWorkflowSession.projectSelection)
		assert.notEqual(state.activeWorkflowSession?.projectSelection, parentWorkflowSession.projectSelection)
		assert.equal(state.activeWorkflowSession?.ui.formSession, undefined)
		assert.equal(activationResult.kind, "project_prompt")
		state.activeWorkflowSession!.workflowValues.review_input = "/tmp/child-mutated.md"
		state.activeWorkflowSession!.projectSelection.projectTitle = "Child Project"
		assert.equal(config.taskState.activeWorkflowSession?.workflowValues.review_input, "/tmp/review-input.md")
		assert.equal(config.taskState.activeWorkflowSession?.projectSelection.projectTitle, "Parent Project")
		assert.equal(config.taskState.activeWorkflowName, "parent-workflow")
		assert.equal(config.taskState.currentFocusChainChecklist, "- [ ] Parent Step")
	})

	it("does not auto-activate a second workflow when child state is already active", async () => {
		const runner = new SubagentRunner(createTaskConfig(false))
		const state = new TaskState()
		state.activeWorkflowName = "existing-workflow"
		const existingWorkflowSession: ActiveWorkflowSession = {
			activeStepNumber: 1,
			workflowValues: {},
			projectSelection: { projectMode: "new", projectTitle: "", projectFolderName: "" },
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionDefinitionIds: [],
			},
			branchContext: {
				activeBranchId: "project-prompt",
			},
		}
		state.activeWorkflowSession = existingWorkflowSession

		const resolveWorkflowByUseSkillNameStub = sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName")

		await autoActivateAssignedWorkflow.call(runner, state, ["review-workflow"])

		sinon.assert.notCalled(resolveWorkflowByUseSkillNameStub)
		assert.equal(state.activeWorkflowName, "existing-workflow")
	})

	it("accepts subagent focus-chain callback updates without calling the parent callback", async () => {
		const config = createTaskConfig(false)
		config.taskState.currentFocusChainChecklist = "- [ ] Parent Step"
		const runner = new SubagentRunner(config)
		const subagentState = new TaskState()
		const subagentConfig = createSubagentTaskConfig.call(runner, subagentState)

		const result = await subagentConfig.callbacks.updateFCListFromToolResponse("- [ ] Child Step")
		const parentUpdate = config.callbacks.updateFCListFromToolResponse

		assert.deepEqual(result, { accepted: true })
		assert.equal("callCount" in parentUpdate ? parentUpdate.callCount : undefined, 0)
		assert.equal(config.taskState.currentFocusChainChecklist, "- [ ] Parent Step")
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
		assert.match(systemPrompt, /Use only the assigned workflow skill named above\./)
		assert.match(systemPrompt, /review-helper/)
		assert.doesNotMatch(systemPrompt, /call `use_skill`/)
		assert.doesNotMatch(systemPrompt, /Do not manually search for workflow files unless `use_skill` fails\./)
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
