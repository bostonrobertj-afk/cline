import type { ToolUse } from "@core/assistant-message"
import { expect } from "chai"
import { mkdtemp, rm, writeFile } from "fs/promises"
import { afterEach, beforeEach, describe, it } from "mocha"
import { tmpdir } from "os"
import path from "path"
import sinon from "sinon"
import { ClineIgnoreController } from "@/core/ignore/ClineIgnoreController"
import { formatResponse } from "@/core/prompts/responses"
import { TaskState } from "@/core/task/TaskState"
import type {
	WorkflowPlanStoryArtifactsPreparation,
	WorkflowPlanStoryArtifactsResult,
} from "@/core/task/workflow-runtime/WorkflowRuntime"
import { ClineDefaultTool } from "@/shared/tools"
import * as pathUtils from "@/utils/path"
import { ToolValidator } from "../../ToolValidator"
import type { TaskConfig } from "../../types/TaskConfig"
import { validateTaskConfig } from "../../types/TaskConfig"
import { ToolHookUtils } from "../../utils/ToolHookUtils"
import { PlanStoryArtifactsToolHandler } from "../PlanStoryArtifactsToolHandler"

interface PlanStoryArtifactsHandlerConfigResult {
	config: TaskConfig
	preparation: WorkflowPlanStoryArtifactsPreparation
	result: WorkflowPlanStoryArtifactsResult
	stubs: {
		ask: sinon.SinonStub
		preparePlanStoryArtifacts: sinon.SinonStub
		planStoryArtifacts: sinon.SinonStub
		shouldAutoApproveToolWithPath: sinon.SinonStub
	}
}

function createPlanStoryArtifactsBlock(args?: {
	epicIdentity?: string
	storyCount?: string
	includeEpicIdentity?: boolean
	includeStoryCount?: boolean
	partial?: boolean
	unsupportedParam?: boolean
}): ToolUse {
	const params: ToolUse["params"] = {}
	if (args?.includeEpicIdentity !== false) {
		Object.assign(params, { epic_identity: args?.epicIdentity ?? "1" })
	}
	if (args?.includeStoryCount !== false) {
		Object.assign(params, { story_count: args?.storyCount ?? "2" })
	}
	if (args?.unsupportedParam === true) {
		Object.assign(params, { story_title: "unsupported" })
	}

	return {
		type: "tool_use",
		name: ClineDefaultTool.PLAN_STORY_ARTIFACTS,
		params,
		partial: args?.partial ?? false,
		isNativeToolCall: true,
		call_id: "plan_story_artifacts_1",
	}
}

function createPreparation(cwd: string): WorkflowPlanStoryArtifactsPreparation {
	return {
		storyIndexAbsolutePath: path.join(cwd, "project-one", "implementation", "epic-1-stories.index.json"),
		epicsIndexAbsolutePath: path.join(cwd, "project-one", "planning", "Epics.index.json"),
	}
}

function createResult(preparation: WorkflowPlanStoryArtifactsPreparation): WorkflowPlanStoryArtifactsResult {
	return {
		...preparation,
		appendedStoryIdentities: ["1.1", "1.2"],
		storyIndex: {
			version: 1,
			stories: [
				{
					story_identity: "1.1",
					story_file_name: "Story-1-1.md",
					story_type: "primary",
					parent_story_identity: null,
					story_file_generated: false,
					status: "draft",
				},
				{
					story_identity: "1.2",
					story_file_name: "Story-1-2.md",
					story_type: "primary",
					parent_story_identity: null,
					story_file_generated: false,
					status: "draft",
				},
			],
		},
	}
}

function createToolValidator(cwd: string): ToolValidator {
	return new ToolValidator(new ClineIgnoreController(cwd))
}

function createConfig(args?: {
	askResponse?: "yesButtonClicked" | "noButtonClicked"
	autoApprove?: boolean
	cwd?: string
	taskState?: TaskState
}): PlanStoryArtifactsHandlerConfigResult {
	const cwd = args?.cwd ?? path.join(process.cwd(), "tmp-plan-story-artifacts-test")
	const taskState = args?.taskState ?? new TaskState()
	const preparation = createPreparation(cwd)
	const result = createResult(preparation)
	const ask = sinon.stub().resolves({ response: args?.askResponse ?? "yesButtonClicked" })
	const preparePlanStoryArtifacts = sinon.stub().resolves(preparation)
	const planStoryArtifacts = sinon.stub().resolves(result)
	const shouldAutoApproveToolWithPath = sinon.stub().resolves(args?.autoApprove ?? false)
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask,
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
		shouldAutoApproveTool: sinon.stub().returns([false, false]),
		shouldAutoApproveToolWithPath,
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
	}
	const config = {
		taskId: "task-1",
		ulid: "ulid-1",
		cwd,
		mode: "act",
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		doubleCheckCompletionEnabled: false,
		vscodeTerminalExecutionMode: "backgroundExec",
		enableParallelToolCalling: true,
		isSubagentExecution: false,
		taskState,
		messageState: {
			getClineMessages: () => [],
			saveClineMessagesAndUpdateHistory: sinon.stub().resolves(),
		},
		api: {
			getModel: () => ({ id: "test-model", info: {} }),
		},
		services: {
			mcpHub: {},
			browserSession: {},
			urlContentFetcher: {},
			diffViewProvider: {},
			fileContextTracker: {},
			clineIgnoreController: {},
			commandPermissionController: {},
			contextManager: {},
			stateManager: {
				getGlobalSettingsKey: (key: string) => (key === "hooksEnabled" ? false : undefined),
			},
		},
		autoApprovalSettings: {
			enableNotifications: false,
			actions: {
				executeSafeCommands: false,
				executeAllCommands: false,
			},
		},
		autoApprover: {
			shouldAutoApproveTool: sinon.stub().returns([false, false]),
		},
		browserSettings: {},
		focusChainSettings: {},
		callbacks,
		workflowRuntime: {
			preparePlanStoryArtifacts,
			planStoryArtifacts,
		},
		coordinator: {
			getHandler: sinon.stub(),
		},
	}
	validateTaskConfig(config)

	return {
		config,
		preparation,
		result,
		stubs: {
			ask,
			preparePlanStoryArtifacts,
			planStoryArtifacts,
			shouldAutoApproveToolWithPath,
		},
	}
}

describe("PlanStoryArtifactsToolHandler", () => {
	let sandbox: sinon.SinonSandbox
	const deniedPathCases: readonly {
		testName: string
		ignoredRelativePath: string
		resolveDeniedAbsolutePath: (preparation: WorkflowPlanStoryArtifactsPreparation) => string
	}[] = [
		{
			testName: "story index path",
			ignoredRelativePath: "project-one/implementation/epic-1-stories.index.json",
			resolveDeniedAbsolutePath: (preparation) => preparation.storyIndexAbsolutePath,
		},
		{
			testName: "Epics index path",
			ignoredRelativePath: "project-one/planning/Epics.index.json",
			resolveDeniedAbsolutePath: (preparation) => preparation.epicsIndexAbsolutePath,
		},
	]

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		sandbox.stub(pathUtils, "isLocatedInWorkspace").resolves(true)
	})

	afterEach(() => {
		sandbox.restore()
	})

	it("rejects missing required parameters before runtime preparation", async () => {
		const { config, stubs } = createConfig()
		const handler = new PlanStoryArtifactsToolHandler(createToolValidator(config.cwd))

		const missingEpicResult = await handler.execute(config, createPlanStoryArtifactsBlock({ includeEpicIdentity: false }))
		const missingCountResult = await handler.execute(config, createPlanStoryArtifactsBlock({ includeStoryCount: false }))

		expect(missingEpicResult).to.contain("Missing required parameter 'epic_identity'")
		expect(missingCountResult).to.contain("Missing required parameter 'story_count'")
		sinon.assert.notCalled(stubs.preparePlanStoryArtifacts)
		sinon.assert.notCalled(stubs.planStoryArtifacts)
	})

	it("rejects unsupported parameters before runtime preparation", async () => {
		const { config, stubs } = createConfig()
		const handler = new PlanStoryArtifactsToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createPlanStoryArtifactsBlock({ unsupportedParam: true }))

		expect(result).to.contain("Unsupported parameter(s) for plan_story_artifacts: story_title")
		sinon.assert.notCalled(stubs.preparePlanStoryArtifacts)
		sinon.assert.notCalled(stubs.planStoryArtifacts)
	})

	for (const deniedPathCase of deniedPathCases) {
		it(`returns a clineignore tool error before approval, hooks, or planning for blocked ${deniedPathCase.testName}`, async () => {
			const cwd = await mkdtemp(path.join(tmpdir(), "plan-story-artifacts-clineignore-test-"))
			const clineIgnoreController = new ClineIgnoreController(cwd)
			try {
				await writeFile(path.join(cwd, ".clineignore"), `${deniedPathCase.ignoredRelativePath}\n`, "utf8")
				await clineIgnoreController.initialize()
				const { config, preparation, stubs } = createConfig({ cwd })
				const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
				const handler = new PlanStoryArtifactsToolHandler(new ToolValidator(clineIgnoreController))
				const deniedAbsolutePath = deniedPathCase.resolveDeniedAbsolutePath(preparation)

				const result = await handler.execute(config, createPlanStoryArtifactsBlock())

				expect(result).to.equal(formatResponse.toolError(formatResponse.clineIgnoreError(deniedAbsolutePath)))
				sinon.assert.calledOnceWithExactly(stubs.preparePlanStoryArtifacts, {
					taskState: config.taskState,
					epicIdentity: "1",
				})
				sinon.assert.notCalled(stubs.shouldAutoApproveToolWithPath)
				sinon.assert.notCalled(stubs.ask)
				sinon.assert.notCalled(hookStub)
				sinon.assert.notCalled(stubs.planStoryArtifacts)
			} finally {
				await clineIgnoreController.dispose()
				await rm(cwd, { recursive: true, force: true })
			}
		})
	}

	it("delegates planning through the workflow runtime and returns structured success JSON", async () => {
		const { config, preparation, result: planningResult, stubs } = createConfig({ autoApprove: true })
		const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
		config.taskState.fileReadCache.set(preparation.storyIndexAbsolutePath.toLowerCase(), {
			readCount: 1,
			mtime: 1,
			snapshotText: "index",
		})
		config.taskState.fileReadCache.set(preparation.epicsIndexAbsolutePath.toLowerCase(), {
			readCount: 1,
			mtime: 1,
			snapshotText: "epics index",
		})
		const block = createPlanStoryArtifactsBlock()
		const handler = new PlanStoryArtifactsToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, block)

		sinon.assert.calledOnceWithExactly(stubs.preparePlanStoryArtifacts, {
			taskState: config.taskState,
			epicIdentity: "1",
		})
		sinon.assert.calledTwice(stubs.shouldAutoApproveToolWithPath)
		sinon.assert.calledWithExactly(
			stubs.shouldAutoApproveToolWithPath,
			ClineDefaultTool.PLAN_STORY_ARTIFACTS,
			preparation.storyIndexAbsolutePath,
		)
		sinon.assert.calledWithExactly(
			stubs.shouldAutoApproveToolWithPath,
			ClineDefaultTool.PLAN_STORY_ARTIFACTS,
			preparation.epicsIndexAbsolutePath,
		)
		sinon.assert.calledOnceWithExactly(hookStub, config, block)
		sinon.assert.calledOnceWithExactly(stubs.planStoryArtifacts, {
			taskState: config.taskState,
			epicIdentity: "1",
			storyCount: 2,
			expectedStoryIndexAbsolutePath: preparation.storyIndexAbsolutePath,
			expectedEpicsIndexAbsolutePath: preparation.epicsIndexAbsolutePath,
		})
		expect(JSON.parse(result as string)).to.deep.equal({
			persisted: true,
			epic_identity: "1",
			story_count: 2,
			story_index_absolute_path: preparation.storyIndexAbsolutePath,
			appended_story_identities: planningResult.appendedStoryIdentities,
			stories: planningResult.storyIndex.stories,
		})
		expect(config.taskState.fileReadCache.has(preparation.storyIndexAbsolutePath.toLowerCase())).to.equal(false)
		expect(config.taskState.fileReadCache.has(preparation.epicsIndexAbsolutePath.toLowerCase())).to.equal(false)
		expect(config.taskState.didEditFile).to.equal(true)
		expect(config.taskState.consecutiveMistakeCount).to.equal(0)
	})
})
