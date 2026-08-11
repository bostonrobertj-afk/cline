import type { ApiHandler } from "@core/api"
import type { ToolUse } from "@core/assistant-message"
import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import { MessageStateHandler } from "@/core/task/message-state"
import type { WorkflowNextAction, WorkflowValues } from "@/core/task/workflow-runtime/types"
import { WorkflowRuntime } from "@/core/task/workflow-runtime/WorkflowRuntime"
import { HostProvider } from "@/hosts/host-provider"
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@/shared/AutoApprovalSettings"
import { DEFAULT_BROWSER_SETTINGS } from "@/shared/BrowserSettings"
import { DEFAULT_FOCUS_CHAIN_SETTINGS } from "@/shared/FocusChainSettings"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../../../TaskState"
import { AutoApprove } from "../../autoApprove"
import { ToolExecutorCoordinator } from "../../ToolExecutorCoordinator"
import { ToolValidator } from "../../ToolValidator"
import type { TaskConfig } from "../../types/TaskConfig"
import { RequestTaskDetailToolHandler } from "../RequestTaskDetailToolHandler"
import { ShowIncompleteTasksToolHandler } from "../ShowIncompleteTasksToolHandler"
import { StoryTaskCompleteToolHandler } from "../StoryTaskCompleteToolHandler"
import { StoryTaskReminderToolHandler } from "../StoryTaskReminderToolHandler"

type HostInitializeArgs = Parameters<typeof HostProvider.initialize>
type HostBridgeProvider = HostInitializeArgs[4]
type ApplyWorkflowValueWritesArgs = {
	taskState: TaskState
	values: WorkflowValues
	clearKeys?: readonly string[]
}
type ApplyWorkflowValueWritesResult = {
	changedValues: WorkflowValues
	unchangedValues: WorkflowValues
	clearedKeys: readonly string[]
	unchangedClearKeys: readonly string[]
}

const queuedProjectPromptAction: WorkflowNextAction = {
	kind: "project_prompt",
	promptProjection: {
		workflowInputPayloadBlock: undefined,
		continuationWorkflowInputPayloadBlock: undefined,
		workflowToolSchemaOverride: undefined,
	},
}

const RETIRED_STORY_TOOL_NAMES: readonly string[] = ["story_notes_update", "story_testing_complete"]

function createUnusedDependency<DependencyType extends object>(label: string): DependencyType {
	const target: DependencyType = Object.create(null)
	return new Proxy<DependencyType>(target, {
		get(_target, property): never {
			throw new Error(`Unexpected ${label}.${String(property)} access in dev-story story tool tests.`)
		},
	})
}

function initializeHostProvider(workspacePath: string): void {
	HostProvider.reset()
	const createWebviewProvider: HostInitializeArgs[0] = () =>
		createUnusedDependency<ReturnType<HostInitializeArgs[0]>>("webviewProvider")
	const createDiffViewProvider: HostInitializeArgs[1] = () =>
		createUnusedDependency<ReturnType<HostInitializeArgs[1]>>("diffViewProvider")
	const createCommentReviewController: HostInitializeArgs[2] = () =>
		createUnusedDependency<ReturnType<HostInitializeArgs[2]>>("commentReviewController")
	const createTerminalManager: HostInitializeArgs[3] = () =>
		createUnusedDependency<ReturnType<HostInitializeArgs[3]>>("terminalManager")
	const hostBridgeProvider: HostBridgeProvider = {
		workspaceClient: new Proxy(createUnusedDependency<HostBridgeProvider["workspaceClient"]>("workspaceClient"), {
			get(target, property, receiver): unknown {
				if (property === "getWorkspacePaths") {
					return async (): Promise<{ paths: string[] }> => ({ paths: [workspacePath] })
				}
				return Reflect.get(target, property, receiver)
			},
		}),
		envClient: new Proxy(createUnusedDependency<HostBridgeProvider["envClient"]>("envClient"), {
			get(target, property, receiver): unknown {
				if (property === "getHostVersion") {
					return async (): Promise<{ platform: string }> => ({ platform: "test" })
				}
				return Reflect.get(target, property, receiver)
			},
		}),
		windowClient: createUnusedDependency<HostBridgeProvider["windowClient"]>("windowClient"),
		diffClient: createUnusedDependency<HostBridgeProvider["diffClient"]>("diffClient"),
	}

	HostProvider.initialize(
		createWebviewProvider,
		createDiffViewProvider,
		createCommentReviewController,
		createTerminalManager,
		hostBridgeProvider,
		() => undefined,
		async () => "",
		async () => "",
		"",
		"",
	)
}

function createActiveDevStoryTaskState(storyPath: string): TaskState {
	const taskState = new TaskState()
	taskState.activeWorkflowName = "dev-story"
	taskState.activeWorkflowSession = {
		activeStepNumber: 2,
		workflowValues: { target_story: storyPath, current_story_task_id: "1" },
		projectSelection: { projectMode: "new", projectTitle: "", projectFolderName: "" },
		lifecycle: { projectSelectionCompleted: false },
		entryArtifactResolution: undefined,
		prerequisiteFileResolutions: [],
		ui: {
			formSession: undefined,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: {
			activeBranchId: "step-2",
		},
	}
	taskState.fileReadCache.set(storyPath.toLowerCase(), {
		readCount: 1,
		mtime: Date.now(),
		snapshotText: "cached",
	})
	return taskState
}

async function* createEmptyApiStream(): ReturnType<ApiHandler["createMessage"]> {}

function createApiHandler(): ApiHandler {
	return {
		createMessage: () => createEmptyApiStream(),
		getModel: () => ({
			id: "test-model",
			info: { supportsImages: false, supportsPromptCache: false },
		}),
	}
}

function createTaskServices(): TaskConfig["services"] {
	const stateManager = new Proxy(createUnusedDependency<TaskConfig["services"]["stateManager"]>("stateManager"), {
		get(target, property, receiver): unknown {
			if (property === "getGlobalStateKey") {
				return (): undefined => undefined
			}
			if (property === "getGlobalSettingsKey") {
				return (key: string): boolean | undefined => (key === "hooksEnabled" ? false : undefined)
			}
			if (property === "getWorkspaceStateKey") {
				return (): undefined => undefined
			}
			if (property === "getRemoteConfigSettings") {
				return (): Record<string, never> => ({})
			}
			if (property === "getApiConfiguration") {
				return (): { planModeApiProvider: "openai"; actModeApiProvider: "openai" } => ({
					planModeApiProvider: "openai",
					actModeApiProvider: "openai",
				})
			}
			return Reflect.get(target, property, receiver)
		},
	})

	return {
		mcpHub: createUnusedDependency<TaskConfig["services"]["mcpHub"]>("mcpHub"),
		browserSession: createUnusedDependency<TaskConfig["services"]["browserSession"]>("browserSession"),
		urlContentFetcher: createUnusedDependency<TaskConfig["services"]["urlContentFetcher"]>("urlContentFetcher"),
		diffViewProvider: createUnusedDependency<TaskConfig["services"]["diffViewProvider"]>("diffViewProvider"),
		fileContextTracker: createUnusedDependency<TaskConfig["services"]["fileContextTracker"]>("fileContextTracker"),
		clineIgnoreController: createUnusedDependency<TaskConfig["services"]["clineIgnoreController"]>("clineIgnoreController"),
		commandPermissionController:
			createUnusedDependency<TaskConfig["services"]["commandPermissionController"]>("commandPermissionController"),
		contextManager: createUnusedDependency<TaskConfig["services"]["contextManager"]>("contextManager"),
		stateManager,
	}
}

function createConfig(storyPath: string): {
	config: TaskConfig
	taskState: TaskState
	say: sinon.SinonStub
	ask: sinon.SinonStub
	queueWorkflowNextAction: sinon.SinonStub
	handleModelToolResult: sinon.SinonStub
	applyWorkflowValueWrites: sinon.SinonStub
} {
	initializeHostProvider(path.dirname(storyPath))
	const taskState = createActiveDevStoryTaskState(storyPath)
	const say = sinon.stub().resolves(undefined)
	const ask = sinon.stub().resolves({ response: "messageResponse", text: "continue" })
	const queueWorkflowNextAction = sinon.stub()
	const workflowRuntime = new WorkflowRuntime({
		cwd: path.dirname(storyPath),
		workspacePathPolicy: { validateAccess: () => true },
	})
	const handleModelToolResult = sinon.stub(workflowRuntime, "handleModelToolResult").resolves(queuedProjectPromptAction)
	const applyWorkflowValueWrites = sinon
		.stub(workflowRuntime, "applyWorkflowValueWrites")
		.callsFake(async (args: ApplyWorkflowValueWritesArgs): Promise<ApplyWorkflowValueWritesResult> => {
			const session = args.taskState.activeWorkflowSession
			if (session === undefined) {
				return {
					changedValues: {},
					unchangedValues: args.values,
					clearedKeys: [],
					unchangedClearKeys: args.clearKeys ?? [],
				}
			}

			for (const clearKey of args.clearKeys ?? []) {
				delete session.workflowValues[clearKey]
			}
			for (const [key, value] of Object.entries(args.values)) {
				session.workflowValues[key] = value
			}

			return {
				changedValues: args.values,
				unchangedValues: {},
				clearedKeys: args.clearKeys ?? [],
				unchangedClearKeys: [],
			}
		})
	const messageState = new MessageStateHandler({
		taskId: "task-dev-story-tools",
		ulid: "ulid-dev-story-tools",
		updateTaskHistory: async () => [],
		taskState,
	})
	const services = createTaskServices()

	const config: TaskConfig = {
		taskId: "task-dev-story-tools",
		ulid: "ulid-dev-story-tools",
		cwd: path.dirname(storyPath),
		mode: "act",
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		doubleCheckCompletionEnabled: false,
		vscodeTerminalExecutionMode: "backgroundExec",
		enableParallelToolCalling: true,
		isSubagentExecution: false,
		taskState,
		messageState,
		api: createApiHandler(),
		autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS,
		autoApprover: new AutoApprove(services.stateManager),
		browserSettings: DEFAULT_BROWSER_SETTINGS,
		focusChainSettings: DEFAULT_FOCUS_CHAIN_SETTINGS,
		services,
		callbacks: {
			say,
			ask,
			saveCheckpoint: sinon.stub().resolves(),
			sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
			removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
			upsertPartialResponseToolSayPreview: sinon.stub().resolves(false),
			clearPartialResponseToolPreview: sinon.stub().resolves(false),
			executeCommandTool: sinon.stub().resolves([false, "ok"]),
			doesLatestTaskCompletionHaveNewChanges: sinon.stub().resolves(false),
			updateFCListFromToolResponse: sinon.stub().resolves({ accepted: false }),
			queueWorkflowNextAction,
			shouldAutoApproveTool: sinon.stub().returns([true, true]),
			shouldAutoApproveToolWithPath: sinon.stub().resolves(true),
			postStateToWebview: sinon.stub().resolves(),
			reinitExistingTaskFromId: sinon.stub().resolves(),
			cancelTask: sinon.stub().resolves(),
			updateTaskHistory: sinon.stub().resolves([]),
			applyLatestBrowserSettings: sinon
				.stub()
				.resolves(
					createUnusedDependency<Awaited<ReturnType<TaskConfig["callbacks"]["applyLatestBrowserSettings"]>>>(
						"browserSession",
					),
				),
			switchToActMode: sinon.stub().resolves(true),
			setActiveHookExecution: sinon.stub().resolves(),
			clearActiveHookExecution: sinon.stub().resolves(),
			getActiveHookExecution: sinon.stub().resolves(undefined),
			runUserPromptSubmitHook: sinon.stub().resolves({}),
		},
		workflowRuntime,
		coordinator: new ToolExecutorCoordinator(),
	}

	return { config, taskState, say, ask, queueWorkflowNextAction, handleModelToolResult, applyWorkflowValueWrites }
}

function createStoryToolBlock(name: ClineDefaultTool, params: ToolUse["params"] = {}): ToolUse {
	return {
		type: "tool_use",
		name,
		params,
		partial: false,
	}
}

function parseJsonToolResult(result: unknown): unknown {
	if (typeof result !== "string") {
		throw new Error("Expected string tool result.")
	}
	return JSON.parse(result)
}

function expectJsonRecord(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error("Expected JSON object.")
	}
	return Object.fromEntries(Object.entries(value))
}

function expectJsonArray(value: unknown): unknown[] {
	if (!Array.isArray(value)) {
		throw new Error("Expected JSON array.")
	}
	return value
}

function readWorkflowValues(config: TaskConfig): WorkflowValues {
	const session = config.taskState.activeWorkflowSession
	if (session === undefined) {
		throw new Error("Expected active workflow session.")
	}
	return session.workflowValues
}

async function withStoryFile<T>(storyMarkdown: string, run: (storyPath: string) => Promise<T>): Promise<T> {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dev-story-tools-"))
	const storyPath = path.join(tempDir, "Story-1-2.md")
	await fs.writeFile(storyPath, storyMarkdown, "utf8")

	try {
		return await run(storyPath)
	} finally {
		HostProvider.reset()
		await fs.rm(tempDir, { recursive: true, force: true })
	}
}

describe("Dev-story story task tool handlers", () => {
	it("does not register executable handlers for retired story notes or testing-complete tools", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [ ] Task 1. Implement handlers
`,
			async (storyPath) => {
				const { config } = createConfig(storyPath)
				const coordinator = new ToolExecutorCoordinator()
				const validator = new ToolValidator(config.services.clineIgnoreController)
				const registeredStoryToolNames: readonly ClineDefaultTool[] = [
					ClineDefaultTool.STORY_TASK_REMINDER,
					ClineDefaultTool.STORY_TASK_COMPLETE,
					ClineDefaultTool.REQUEST_TASK_DETAIL,
					ClineDefaultTool.SHOW_INCOMPLETE_TASKS,
				]

				for (const toolName of registeredStoryToolNames) {
					coordinator.registerByName(toolName, validator)
				}

				expect(coordinator.has(ClineDefaultTool.STORY_TASK_REMINDER)).to.equal(true)
				expect(coordinator.has(ClineDefaultTool.STORY_TASK_COMPLETE)).to.equal(true)
				expect(coordinator.has(ClineDefaultTool.REQUEST_TASK_DETAIL)).to.equal(true)
				expect(coordinator.has(ClineDefaultTool.SHOW_INCOMPLETE_TASKS)).to.equal(true)
				for (const retiredStoryToolName of RETIRED_STORY_TOOL_NAMES) {
					expect(Object.values(ClineDefaultTool)).not.to.include(retiredStoryToolName)
					expect(coordinator.has(retiredStoryToolName)).to.equal(false)
					expect(coordinator.getHandler(retiredStoryToolName)).to.equal(undefined)
				}
			},
		)
	})

	it("story_task_reminder returns the current incomplete task detail from target_story", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [x] Task 1. Completed setup
  - [x] Subtask 1.1. Done
- [ ] Task 2. Implement handlers
  - [ ] Subtask 2.1. Use target_story
`,
			async (storyPath) => {
				const { config } = createConfig(storyPath)
				const handler = new StoryTaskReminderToolHandler()
				const result = await handler.execute(config, createStoryToolBlock(ClineDefaultTool.STORY_TASK_REMINDER))

				expect(result).to.equal(`### CURRENT STORY TASK

storyTaskId: 2
- [ ] Task 2. Implement handlers

storySubtaskId: 2.1
  - [ ] Subtask 2.1. Use target_story`)
			},
		)
	})

	it("story_task_reminder fails visibly when the active dev-story target_story value is missing", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [ ] Task 1. Implement handlers
`,
			async (storyPath) => {
				const { config } = createConfig(storyPath)
				if (config.taskState.activeWorkflowSession === undefined) {
					throw new Error("Expected active workflow session.")
				}
				delete config.taskState.activeWorkflowSession.workflowValues.target_story

				const handler = new StoryTaskReminderToolHandler()
				const result = await handler.execute(config, createStoryToolBlock(ClineDefaultTool.STORY_TASK_REMINDER))

				expect(result).to.contain("story_task_reminder failed")
				expect(result).to.contain("target_story")
			},
		)
	})

	it("story_task_complete completes a subtask without workflow progression while the parent remains incomplete", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [ ] Task 1. Implement handlers
  - [ ] Subtask 1.1. First change
  - [ ] Subtask 1.2. Second change
`,
			async (storyPath) => {
				const { config, queueWorkflowNextAction, handleModelToolResult, applyWorkflowValueWrites } =
					createConfig(storyPath)
				const handler = new StoryTaskCompleteToolHandler()
				const result = await handler.execute(
					config,
					createStoryToolBlock(ClineDefaultTool.STORY_TASK_COMPLETE, { storyItemId: "1.1" }),
				)

				const savedStory = await fs.readFile(storyPath, "utf8")
				const metadata = expectJsonRecord(parseJsonToolResult(result))
				expect(savedStory).to.contain("  - [x] Subtask 1.1. First change")
				expect(savedStory).to.contain("- [ ] Task 1. Implement handlers")
				expect(Object.keys(metadata).sort()).to.deep.equal(
					[
						"allStoryTasksComplete",
						"completedItemKind",
						"completedStoryItemId",
						"parentTaskComplete",
						"parentTaskId",
					].sort(),
				)
				expect(metadata).to.deep.equal({
					completedStoryItemId: "1.1",
					completedItemKind: "subtask",
					parentTaskId: "1",
					parentTaskComplete: false,
					allStoryTasksComplete: false,
				})
				const workflowValues = readWorkflowValues(config)
				expect(workflowValues.current_story_task_id).to.equal("1")
				const storyTaskInventory = expectJsonRecord(workflowValues.story_task_inventory)
				const persistedTasks = expectJsonArray(storyTaskInventory.tasks)
				const persistedFirstTask = expectJsonRecord(persistedTasks[0])
				const persistedSubtasks = expectJsonArray(persistedFirstTask.subtasks)
				expect(persistedFirstTask).to.deep.include({
					id: "1",
					rawLine: "- [ ] Task 1. Implement handlers",
					completed: false,
				})
				expect(expectJsonRecord(persistedSubtasks[0])).to.deep.include({
					id: "1.1",
					rawLine: "  - [x] Subtask 1.1. First change",
					completed: true,
				})
				expect(result).to.not.contain("Task 1. Implement handlers")
				expect(result).to.not.contain("Subtask 1.1. First change")
				expect(config.taskState.fileReadCache.has(storyPath.toLowerCase())).to.equal(false)
				sinon.assert.calledOnce(applyWorkflowValueWrites)
				sinon.assert.notCalled(handleModelToolResult)
				sinon.assert.notCalled(queueWorkflowNextAction)
			},
		)
	})

	it("story_task_complete auto-completes the parent, reports all-complete, clears current task, and queues workflow progression", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [ ] Task 1. Implement handlers
  - [x] Subtask 1.1. First change
  - [ ] Subtask 1.2. Second change
`,
			async (storyPath) => {
				const { config, queueWorkflowNextAction, handleModelToolResult, applyWorkflowValueWrites } =
					createConfig(storyPath)
				const handler = new StoryTaskCompleteToolHandler()
				const result = await handler.execute(
					config,
					createStoryToolBlock(ClineDefaultTool.STORY_TASK_COMPLETE, { storyItemId: "1.2" }),
				)

				const savedStory = await fs.readFile(storyPath, "utf8")
				const metadata = expectJsonRecord(parseJsonToolResult(result))
				expect(savedStory).to.contain("- [x] Task 1. Implement handlers")
				expect(savedStory).to.contain("  - [x] Subtask 1.2. Second change")
				expect(Object.keys(metadata).sort()).to.deep.equal(
					[
						"allStoryTasksComplete",
						"completedItemKind",
						"completedStoryItemId",
						"parentTaskComplete",
						"parentTaskId",
					].sort(),
				)
				expect(metadata).to.deep.equal({
					completedStoryItemId: "1.2",
					completedItemKind: "subtask",
					parentTaskId: "1",
					parentTaskComplete: true,
					allStoryTasksComplete: true,
				})
				const workflowValues = readWorkflowValues(config)
				expect(workflowValues.current_story_task_id).to.equal(undefined)
				const storyTaskInventory = expectJsonRecord(workflowValues.story_task_inventory)
				const persistedTasks = expectJsonArray(storyTaskInventory.tasks)
				expect(expectJsonRecord(persistedTasks[0])).to.deep.include({
					id: "1",
					rawLine: "- [x] Task 1. Implement handlers",
					completed: true,
				})
				sinon.assert.calledOnce(applyWorkflowValueWrites)
				expect(applyWorkflowValueWrites.firstCall.args[0].clearKeys).to.deep.equal(["current_story_task_id"])
				sinon.assert.calledOnceWithExactly(handleModelToolResult, {
					taskState: config.taskState,
					toolName: ClineDefaultTool.STORY_TASK_COMPLETE,
				})
				sinon.assert.calledOnceWithExactly(queueWorkflowNextAction, queuedProjectPromptAction)
			},
		)
	})

	it("story_task_complete queues workflow progression and persists the next task ID when a parent completes with remaining tasks", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [ ] Task 1. Implement handlers
  - [x] Subtask 1.1. First change
  - [ ] Subtask 1.2. Second change
- [ ] Task 2. Continue implementation
  - [ ] Subtask 2.1. Follow-up change
`,
			async (storyPath) => {
				const { config, queueWorkflowNextAction, handleModelToolResult } = createConfig(storyPath)
				const handler = new StoryTaskCompleteToolHandler()
				const result = await handler.execute(
					config,
					createStoryToolBlock(ClineDefaultTool.STORY_TASK_COMPLETE, { storyItemId: "1.2" }),
				)

				const metadata = expectJsonRecord(parseJsonToolResult(result))
				expect(metadata).to.deep.equal({
					completedStoryItemId: "1.2",
					completedItemKind: "subtask",
					parentTaskId: "1",
					parentTaskComplete: true,
					allStoryTasksComplete: false,
				})
				expect(readWorkflowValues(config).current_story_task_id).to.equal("2")
				sinon.assert.calledOnceWithExactly(handleModelToolResult, {
					taskState: config.taskState,
					toolName: ClineDefaultTool.STORY_TASK_COMPLETE,
				})
				sinon.assert.calledOnceWithExactly(queueWorkflowNextAction, queuedProjectPromptAction)
			},
		)
	})

	it("story_task_complete fails without routing when workflow-value persistence is not applied", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [ ] Task 1. Implement handlers
  - [x] Subtask 1.1. First change
  - [ ] Subtask 1.2. Second change
`,
			async (storyPath) => {
				const { config, queueWorkflowNextAction, handleModelToolResult, applyWorkflowValueWrites } =
					createConfig(storyPath)
				applyWorkflowValueWrites.callsFake(
					async (args: ApplyWorkflowValueWritesArgs): Promise<ApplyWorkflowValueWritesResult> => ({
						changedValues: {},
						unchangedValues: args.values,
						clearedKeys: [],
						unchangedClearKeys: args.clearKeys ?? [],
					}),
				)
				const handler = new StoryTaskCompleteToolHandler()
				const result = await handler.execute(
					config,
					createStoryToolBlock(ClineDefaultTool.STORY_TASK_COMPLETE, { storyItemId: "1.2" }),
				)

				expect(result).to.contain("story_task_complete failed")
				expect(result).to.contain("story_task_inventory")
				expect(result).to.not.contain("Task 1. Implement handlers")
				expect(result).to.not.contain("Subtask 1.2. Second change")
				sinon.assert.calledOnce(applyWorkflowValueWrites)
				sinon.assert.notCalled(handleModelToolResult)
				sinon.assert.notCalled(queueWorkflowNextAction)
			},
		)
	})

	it("story_task_complete fails without routing when current_story_task_id write persistence is unchanged", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [ ] Task 1. Implement handlers
  - [x] Subtask 1.1. First change
  - [ ] Subtask 1.2. Second change
- [ ] Task 2. Continue implementation
  - [ ] Subtask 2.1. Follow-up change
`,
			async (storyPath) => {
				const { config, queueWorkflowNextAction, handleModelToolResult, applyWorkflowValueWrites } =
					createConfig(storyPath)
				applyWorkflowValueWrites.callsFake(
					async (args: ApplyWorkflowValueWritesArgs): Promise<ApplyWorkflowValueWritesResult> => {
						const storyTaskInventory = args.values.story_task_inventory
						const currentStoryTaskId = args.values.current_story_task_id
						if (storyTaskInventory === undefined || currentStoryTaskId === undefined) {
							throw new Error("Expected story task inventory and current story task id writes.")
						}
						return {
							changedValues: { story_task_inventory: storyTaskInventory },
							unchangedValues: { current_story_task_id: currentStoryTaskId },
							clearedKeys: [],
							unchangedClearKeys: [],
						}
					},
				)
				const handler = new StoryTaskCompleteToolHandler()
				const result = await handler.execute(
					config,
					createStoryToolBlock(ClineDefaultTool.STORY_TASK_COMPLETE, { storyItemId: "1.2" }),
				)

				expect(result).to.contain("story_task_complete failed")
				expect(result).to.contain("current_story_task_id")
				expect(result).to.not.contain("Continue implementation")
				sinon.assert.calledOnce(applyWorkflowValueWrites)
				sinon.assert.notCalled(handleModelToolResult)
				sinon.assert.notCalled(queueWorkflowNextAction)
			},
		)
	})

	it("story_task_complete fails without routing when current_story_task_id clear persistence is unchanged", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [ ] Task 1. Implement handlers
  - [x] Subtask 1.1. First change
  - [ ] Subtask 1.2. Second change
`,
			async (storyPath) => {
				const { config, queueWorkflowNextAction, handleModelToolResult, applyWorkflowValueWrites } =
					createConfig(storyPath)
				applyWorkflowValueWrites.callsFake(
					async (args: ApplyWorkflowValueWritesArgs): Promise<ApplyWorkflowValueWritesResult> => {
						const storyTaskInventory = args.values.story_task_inventory
						if (storyTaskInventory === undefined) {
							throw new Error("Expected story task inventory write.")
						}
						return {
							changedValues: { story_task_inventory: storyTaskInventory },
							unchangedValues: {},
							clearedKeys: [],
							unchangedClearKeys: args.clearKeys ?? [],
						}
					},
				)
				const handler = new StoryTaskCompleteToolHandler()
				const result = await handler.execute(
					config,
					createStoryToolBlock(ClineDefaultTool.STORY_TASK_COMPLETE, { storyItemId: "1.2" }),
				)

				expect(result).to.contain("story_task_complete failed")
				expect(result).to.contain("current_story_task_id")
				expect(result).to.not.contain("Subtask 1.2. Second change")
				sinon.assert.calledOnce(applyWorkflowValueWrites)
				sinon.assert.notCalled(handleModelToolResult)
				sinon.assert.notCalled(queueWorkflowNextAction)
			},
		)
	})

	it("story_task_complete accepts an eligible parent task ID", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [x] Task 1. Completed setup
- [ ] Task 2. Parent-only task
`,
			async (storyPath) => {
				const { config } = createConfig(storyPath)
				const handler = new StoryTaskCompleteToolHandler()
				const result = await handler.execute(
					config,
					createStoryToolBlock(ClineDefaultTool.STORY_TASK_COMPLETE, { storyItemId: "2" }),
				)

				const savedStory = await fs.readFile(storyPath, "utf8")
				const metadata = expectJsonRecord(parseJsonToolResult(result))
				expect(savedStory).to.contain("- [x] Task 2. Parent-only task")
				expect(Object.keys(metadata).sort()).to.deep.equal(
					["allStoryTasksComplete", "completedItemKind", "completedStoryItemId", "parentTaskComplete"].sort(),
				)
				expect(metadata).to.deep.equal({
					completedStoryItemId: "2",
					completedItemKind: "task",
					parentTaskComplete: true,
					allStoryTasksComplete: true,
				})
			},
		)
	})

	it("story_task_complete rejects parent completion while child subtasks remain incomplete", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [ ] Task 1. Implement handlers
  - [ ] Subtask 1.1. First change
`,
			async (storyPath) => {
				const { config, say, ask } = createConfig(storyPath)
				const handler = new StoryTaskCompleteToolHandler()
				const result = await handler.execute(
					config,
					createStoryToolBlock(ClineDefaultTool.STORY_TASK_COMPLETE, { storyItemId: "1" }),
				)

				const savedStory = await fs.readFile(storyPath, "utf8")
				expect(result).to.contain("story_task_complete failed")
				expect(result).to.contain("incomplete subtasks")
				expect(savedStory).to.contain("- [ ] Task 1. Implement handlers")
				expect(savedStory).to.contain("  - [ ] Subtask 1.1. First change")
				sinon.assert.notCalled(say)
				sinon.assert.notCalled(ask)
			},
		)
	})

	it("request_task_detail returns complete or incomplete task detail by storyTaskId and rejects path parameters", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [x] Task 1. Completed setup
  - [x] Subtask 1.1. Done
- [ ] Task 2. Implement handlers
  - [ ] Subtask 2.1. Use target_story
`,
			async (storyPath) => {
				const { config } = createConfig(storyPath)
				const handler = new RequestTaskDetailToolHandler()
				const completeResult = await handler.execute(
					config,
					createStoryToolBlock(ClineDefaultTool.REQUEST_TASK_DETAIL, { storyTaskId: "1" }),
				)
				const incompleteResult = await handler.execute(
					config,
					createStoryToolBlock(ClineDefaultTool.REQUEST_TASK_DETAIL, { storyTaskId: "2" }),
				)
				const rejectedPathResult = await handler.execute(
					config,
					createStoryToolBlock(ClineDefaultTool.REQUEST_TASK_DETAIL, {
						storyTaskId: "2",
						path: "other-story.md",
					}),
				)

				expect(completeResult).to.contain("storyTaskId: 1")
				expect(completeResult).to.contain("- [x] Task 1. Completed setup")
				expect(incompleteResult).to.contain("storyTaskId: 2")
				expect(incompleteResult).to.contain("  - [ ] Subtask 2.1. Use target_story")
				expect(rejectedPathResult).to.contain("path parameters are not accepted")
			},
		)
	})

	it("show_incomplete_tasks returns only incomplete task and subtask IDs", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [x] Task 1. Completed setup
  - [x] Subtask 1.1. Done
- [ ] Task 2. Implement handlers
  - [x] Subtask 2.1. Use target_story
  - [ ] Subtask 2.2. Return IDs only
- [ ] Task 3. Parent-only task
`,
			async (storyPath) => {
				const { config } = createConfig(storyPath)
				const handler = new ShowIncompleteTasksToolHandler()
				const result = await handler.execute(config, createStoryToolBlock(ClineDefaultTool.SHOW_INCOMPLETE_TASKS))

				expect(parseJsonToolResult(result)).to.deep.equal({
					incompleteTasks: [
						{ taskId: "2", incompleteSubtaskIds: ["2.2"] },
						{ taskId: "3", incompleteSubtaskIds: [] },
					],
					allStoryTasksComplete: false,
				})
				expect(result).to.not.contain("Implement handlers")
				expect(result).to.not.contain("Return IDs only")
			},
		)
	})

	it("show_incomplete_tasks returns the exact all-complete empty-array shape", async () => {
		await withStoryFile(
			`# Story 1.2

## Tasks
- [x] Task 1. Completed setup
  - [x] Subtask 1.1. Done
`,
			async (storyPath) => {
				const { config } = createConfig(storyPath)
				const handler = new ShowIncompleteTasksToolHandler()
				const result = await handler.execute(config, createStoryToolBlock(ClineDefaultTool.SHOW_INCOMPLETE_TASKS))

				expect(parseJsonToolResult(result)).to.deep.equal({
					incompleteTasks: [],
					allStoryTasksComplete: true,
				})
				expect(result).to.not.contain("Completed setup")
				expect(result).to.not.contain("Done")
			},
		)
	})
})
