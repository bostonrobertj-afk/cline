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
import type { WorkflowUpdateStoryIndexStatusResult } from "@/core/task/workflow-runtime/WorkflowRuntime"
import { ClineDefaultTool } from "@/shared/tools"
import * as pathUtils from "@/utils/path"
import { ResponseToolRegistry } from "../../response/ResponseToolRegistry"
import { ToolValidator } from "../../ToolValidator"
import type { TaskConfig } from "../../types/TaskConfig"
import { validateTaskConfig } from "../../types/TaskConfig"
import { ToolHookUtils } from "../../utils/ToolHookUtils"
import { UpdateStoryIndexStatusToolHandler } from "../UpdateStoryIndexStatusToolHandler"

interface UpdateStoryIndexStatusHandlerConfigResult {
	config: TaskConfig
	result: WorkflowUpdateStoryIndexStatusResult
	stubs: {
		ask: sinon.SinonStub
		shouldAutoApproveToolWithPath: sinon.SinonStub
		updateStoryIndexStatus: sinon.SinonStub
	}
}

function createUpdateStoryIndexStatusBlock(args?: {
	storiesIndex?: string
	storyIdentity?: string
	status?: string
	expectedCurrentStatus?: string
	includeStoriesIndex?: boolean
	includeStoryIdentity?: boolean
	includeStatus?: boolean
	includeExpectedCurrentStatus?: boolean
	partial?: boolean
	unsupportedParam?: boolean
}): ToolUse {
	const params: ToolUse["params"] = {}
	if (args?.includeStoriesIndex !== false) {
		Object.assign(params, { stories_index: args?.storiesIndex ?? "/tmp/project/implementation/epic-1-stories.index.json" })
	}
	if (args?.includeStoryIdentity !== false) {
		Object.assign(params, { story_identity: args?.storyIdentity ?? "1.1" })
	}
	if (args?.includeStatus !== false) {
		Object.assign(params, { status: args?.status ?? "backlog" })
	}
	if (args?.includeExpectedCurrentStatus === true) {
		Object.assign(params, { expected_current_status: args?.expectedCurrentStatus ?? "draft" })
	}
	if (args?.unsupportedParam === true) {
		Object.assign(params, { epic_identity: "1" })
	}

	return {
		type: "tool_use",
		name: ClineDefaultTool.UPDATE_STORY_INDEX_STATUS,
		params,
		partial: args?.partial ?? false,
		isNativeToolCall: true,
		call_id: "update_story_index_status_1",
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
	updateError?: Error
}): UpdateStoryIndexStatusHandlerConfigResult {
	const cwd = args?.cwd ?? path.join(process.cwd(), "tmp-update-story-index-status-test")
	const taskState = args?.taskState ?? new TaskState()
	const result: WorkflowUpdateStoryIndexStatusResult = {
		storiesIndex: path.join(cwd, "project-one", "implementation", "epic-1-stories.index.json"),
		storyIdentity: "1.1",
		previousStatus: "draft",
		status: "backlog",
	}
	const ask = sinon.stub().resolves({ response: args?.askResponse ?? "yesButtonClicked" })
	const updateStoryIndexStatus =
		args?.updateError === undefined ? sinon.stub().resolves(result) : sinon.stub().rejects(args.updateError)
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
			updateStoryIndexStatus,
		},
		coordinator: {
			getHandler: sinon.stub(),
		},
	}
	validateTaskConfig(config)

	return {
		config,
		result,
		stubs: {
			ask,
			shouldAutoApproveToolWithPath,
			updateStoryIndexStatus,
		},
	}
}

describe("UpdateStoryIndexStatusToolHandler", () => {
	let sandbox: sinon.SinonSandbox

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		sandbox.stub(pathUtils, "isLocatedInWorkspace").resolves(true)
	})

	afterEach(() => {
		sandbox.restore()
	})

	it("rejects partial blocks and missing required parameters before runtime mutation", async () => {
		const { config, stubs } = createConfig()
		const handler = new UpdateStoryIndexStatusToolHandler(createToolValidator(config.cwd))
		const invalidCases = [
			{
				block: createUpdateStoryIndexStatusBlock({ partial: true }),
				expectedText: "partial tool blocks",
			},
			{
				block: createUpdateStoryIndexStatusBlock({ includeStoriesIndex: false }),
				expectedText: "Missing required parameter 'stories_index'",
			},
			{
				block: createUpdateStoryIndexStatusBlock({ includeStoryIdentity: false }),
				expectedText: "Missing required parameter 'story_identity'",
			},
			{
				block: createUpdateStoryIndexStatusBlock({ includeStatus: false }),
				expectedText: "Missing or invalid parameter 'status'",
			},
		]

		for (const invalidCase of invalidCases) {
			const result = await handler.execute(config, invalidCase.block)

			expect(result).to.contain(invalidCase.expectedText)
		}
		sinon.assert.notCalled(stubs.shouldAutoApproveToolWithPath)
		sinon.assert.notCalled(stubs.updateStoryIndexStatus)
	})

	it("rejects unsupported parameters before runtime mutation", async () => {
		const { config, stubs } = createConfig()
		const handler = new UpdateStoryIndexStatusToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createUpdateStoryIndexStatusBlock({ unsupportedParam: true }))

		expect(result).to.contain("Unsupported parameter(s) for update_story_index_status: epic_identity")
		sinon.assert.notCalled(stubs.shouldAutoApproveToolWithPath)
		sinon.assert.notCalled(stubs.updateStoryIndexStatus)
	})

	it("rejects invalid status parameters before runtime mutation", async () => {
		const { config, stubs } = createConfig()
		const handler = new UpdateStoryIndexStatusToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createUpdateStoryIndexStatusBlock({ status: "done" }))

		expect(result).to.contain("Missing or invalid parameter 'status'")
		sinon.assert.notCalled(stubs.shouldAutoApproveToolWithPath)
		sinon.assert.notCalled(stubs.updateStoryIndexStatus)
	})

	it("returns a clineignore tool error before approval, hooks, or mutation for blocked story index paths", async () => {
		const cwd = await mkdtemp(path.join(tmpdir(), "update-story-index-status-clineignore-test-"))
		const clineIgnoreController = new ClineIgnoreController(cwd)
		try {
			await writeFile(path.join(cwd, ".clineignore"), "project-one/implementation/epic-1-stories.index.json\n", "utf8")
			await clineIgnoreController.initialize()
			const { config, result: updateResult, stubs } = createConfig({ cwd })
			const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
			const handler = new UpdateStoryIndexStatusToolHandler(new ToolValidator(clineIgnoreController))

			const result = await handler.execute(
				config,
				createUpdateStoryIndexStatusBlock({ storiesIndex: updateResult.storiesIndex }),
			)

			expect(result).to.equal(formatResponse.toolError(formatResponse.clineIgnoreError(updateResult.storiesIndex)))
			sinon.assert.notCalled(stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(stubs.ask)
			sinon.assert.notCalled(hookStub)
			sinon.assert.notCalled(stubs.updateStoryIndexStatus)
		} finally {
			await clineIgnoreController.dispose()
			await rm(cwd, { recursive: true, force: true })
		}
	})

	it("returns denied when user approval is denied before hooks or mutation", async () => {
		const { config, result: updateResult, stubs } = createConfig({ askResponse: "noButtonClicked" })
		const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
		const handler = new UpdateStoryIndexStatusToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(
			config,
			createUpdateStoryIndexStatusBlock({ storiesIndex: updateResult.storiesIndex }),
		)

		expect(result).to.equal(formatResponse.toolDenied())
		sinon.assert.calledOnceWithExactly(
			stubs.shouldAutoApproveToolWithPath,
			ClineDefaultTool.UPDATE_STORY_INDEX_STATUS,
			updateResult.storiesIndex,
		)
		sinon.assert.calledOnce(stubs.ask)
		sinon.assert.notCalled(hookStub)
		sinon.assert.notCalled(stubs.updateStoryIndexStatus)
	})

	it("returns runtime mismatch errors for expected-current-status mismatches", async () => {
		const mismatchError = new Error("Cannot update story identity 1.1 because current status is review, not draft.")
		const { config, result: updateResult, stubs } = createConfig({ autoApprove: true, updateError: mismatchError })
		const handler = new UpdateStoryIndexStatusToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(
			config,
			createUpdateStoryIndexStatusBlock({
				storiesIndex: updateResult.storiesIndex,
				includeExpectedCurrentStatus: true,
			}),
		)

		expect(result).to.contain(mismatchError.message)
		sinon.assert.calledOnce(stubs.updateStoryIndexStatus)
		expect(config.taskState.consecutiveMistakeCount).to.equal(1)
	})

	it("delegates mutation through the workflow runtime and returns structured success JSON", async () => {
		const { config, result: updateResult, stubs } = createConfig({ autoApprove: true })
		const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
		config.taskState.fileReadCache.set(updateResult.storiesIndex.toLowerCase(), {
			readCount: 1,
			mtime: 1,
			snapshotText: "index",
		})
		const block = createUpdateStoryIndexStatusBlock({
			storiesIndex: updateResult.storiesIndex,
			includeExpectedCurrentStatus: true,
		})
		const handler = new UpdateStoryIndexStatusToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, block)

		sinon.assert.calledOnceWithExactly(
			stubs.shouldAutoApproveToolWithPath,
			ClineDefaultTool.UPDATE_STORY_INDEX_STATUS,
			updateResult.storiesIndex,
		)
		sinon.assert.calledOnceWithExactly(hookStub, config, block)
		sinon.assert.calledOnceWithExactly(stubs.updateStoryIndexStatus, {
			taskState: config.taskState,
			storiesIndex: updateResult.storiesIndex,
			storyIdentity: "1.1",
			status: "backlog",
			expectedCurrentStatus: "draft",
		})
		expect(typeof result).to.equal("string")
		if (typeof result !== "string") {
			throw new Error("Expected update_story_index_status success result to be a string.")
		}
		expect(JSON.parse(result)).to.deep.equal({
			persisted: true,
			stories_index: updateResult.storiesIndex,
			story_identity: "1.1",
			previous_status: "draft",
			status: "backlog",
		})
		expect(config.taskState.fileReadCache.has(updateResult.storiesIndex.toLowerCase())).to.equal(false)
		expect(config.taskState.didEditFile).to.equal(true)
		expect(config.taskState.consecutiveMistakeCount).to.equal(0)
	})

	it("does not treat update_story_index_status as a direct model response tool", () => {
		expect(ResponseToolRegistry.get(ClineDefaultTool.UPDATE_STORY_INDEX_STATUS)).to.equal(undefined)
		expect(ResponseToolRegistry.isResponseTool(ClineDefaultTool.UPDATE_STORY_INDEX_STATUS)).to.equal(false)
	})
})
