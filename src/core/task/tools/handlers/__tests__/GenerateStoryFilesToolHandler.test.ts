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
	WorkflowGenerateStoryFilesPreparation,
	WorkflowGenerateStoryFilesResult,
} from "@/core/task/workflow-runtime/WorkflowRuntime"
import { ClineDefaultTool } from "@/shared/tools"
import * as pathUtils from "@/utils/path"
import { ToolValidator } from "../../ToolValidator"
import type { TaskConfig } from "../../types/TaskConfig"
import { validateTaskConfig } from "../../types/TaskConfig"
import { ToolHookUtils } from "../../utils/ToolHookUtils"
import { GenerateStoryFilesToolHandler } from "../GenerateStoryFilesToolHandler"

interface GenerateStoryFilesHandlerConfigResult {
	config: TaskConfig
	preparation: WorkflowGenerateStoryFilesPreparation
	result: WorkflowGenerateStoryFilesResult
	stubs: {
		ask: sinon.SinonStub
		prepareGenerateStoryFiles: sinon.SinonStub
		generateStoryFiles: sinon.SinonStub
		shouldAutoApproveToolWithPath: sinon.SinonStub
	}
}

function createGenerateStoryFilesBlock(args?: {
	epicIdentity?: string
	includeEpicIdentity?: boolean
	partial?: boolean
	unsupportedParam?: boolean
}): ToolUse {
	const params: ToolUse["params"] = {}
	if (args?.includeEpicIdentity !== false) {
		Object.assign(params, { epic_identity: args?.epicIdentity ?? "1" })
	}
	if (args?.unsupportedParam === true) {
		Object.assign(params, { story_count: "2" })
	}

	return {
		type: "tool_use",
		name: ClineDefaultTool.GENERATE_STORY_FILES,
		params,
		partial: args?.partial ?? false,
		isNativeToolCall: true,
		call_id: "generate_story_files_1",
	}
}

function createPreparation(cwd: string): WorkflowGenerateStoryFilesPreparation {
	return {
		storyIndexAbsolutePath: path.join(cwd, "project-one", "implementation", "epic-1-stories.index.json"),
		draftStoryFileAbsolutePaths: [
			path.join(cwd, "project-one", "implementation", "drafts", "Story-1-1.md"),
			path.join(cwd, "project-one", "implementation", "drafts", "Story-1-2.md"),
		],
	}
}

function createResult(preparation: WorkflowGenerateStoryFilesPreparation): WorkflowGenerateStoryFilesResult {
	return {
		...preparation,
		createdDraftStoryFileAbsolutePaths: [preparation.draftStoryFileAbsolutePaths[0]],
		existingDraftStoryFileAbsolutePaths: [preparation.draftStoryFileAbsolutePaths[1]],
		storyIndex: {
			version: 1,
			stories: [
				{
					story_identity: "1.1",
					story_file_name: "Story-1-1.md",
					story_type: "primary",
					parent_story_identity: null,
					story_file_generated: true,
					status: "draft",
				},
				{
					story_identity: "1.2",
					story_file_name: "Story-1-2.md",
					story_type: "primary",
					parent_story_identity: null,
					story_file_generated: true,
					status: "backlog",
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
}): GenerateStoryFilesHandlerConfigResult {
	const cwd = args?.cwd ?? path.join(process.cwd(), "tmp-generate-story-files-test")
	const taskState = args?.taskState ?? new TaskState()
	const preparation = createPreparation(cwd)
	const result = createResult(preparation)
	const ask = sinon.stub().resolves({ response: args?.askResponse ?? "yesButtonClicked" })
	const prepareGenerateStoryFiles = sinon.stub().resolves(preparation)
	const generateStoryFiles = sinon.stub().resolves(result)
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
			prepareGenerateStoryFiles,
			generateStoryFiles,
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
			prepareGenerateStoryFiles,
			generateStoryFiles,
			shouldAutoApproveToolWithPath,
		},
	}
}

describe("GenerateStoryFilesToolHandler", () => {
	let sandbox: sinon.SinonSandbox

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		sandbox.stub(pathUtils, "isLocatedInWorkspace").resolves(true)
	})

	afterEach(() => {
		sandbox.restore()
	})

	it("rejects missing required parameters before runtime preparation", async () => {
		const { config, stubs } = createConfig()
		const handler = new GenerateStoryFilesToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createGenerateStoryFilesBlock({ includeEpicIdentity: false }))

		expect(result).to.contain("Missing required parameter 'epic_identity'")
		sinon.assert.notCalled(stubs.prepareGenerateStoryFiles)
		sinon.assert.notCalled(stubs.generateStoryFiles)
	})

	it("rejects unsupported parameters before runtime preparation", async () => {
		const { config, stubs } = createConfig()
		const handler = new GenerateStoryFilesToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createGenerateStoryFilesBlock({ unsupportedParam: true }))

		expect(result).to.contain("Unsupported parameter(s) for generate_story_files: story_count")
		sinon.assert.notCalled(stubs.prepareGenerateStoryFiles)
		sinon.assert.notCalled(stubs.generateStoryFiles)
	})

	it("returns a clineignore tool error before approval, hooks, or generation for blocked draft story paths", async () => {
		const cwd = await mkdtemp(path.join(tmpdir(), "generate-story-files-clineignore-test-"))
		const clineIgnoreController = new ClineIgnoreController(cwd)
		try {
			await writeFile(path.join(cwd, ".clineignore"), "project-one/implementation/drafts/Story-1-2.md\n", "utf8")
			await clineIgnoreController.initialize()
			const { config, preparation, stubs } = createConfig({ cwd })
			const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
			const handler = new GenerateStoryFilesToolHandler(new ToolValidator(clineIgnoreController))

			const result = await handler.execute(config, createGenerateStoryFilesBlock())

			expect(result).to.equal(
				formatResponse.toolError(formatResponse.clineIgnoreError(preparation.draftStoryFileAbsolutePaths[1])),
			)
			sinon.assert.calledOnceWithExactly(stubs.prepareGenerateStoryFiles, {
				taskState: config.taskState,
				epicIdentity: "1",
			})
			sinon.assert.notCalled(stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(stubs.ask)
			sinon.assert.notCalled(hookStub)
			sinon.assert.notCalled(stubs.generateStoryFiles)
		} finally {
			await clineIgnoreController.dispose()
			await rm(cwd, { recursive: true, force: true })
		}
	})

	it("delegates generation through the workflow runtime and returns structured success JSON", async () => {
		const { config, preparation, result: generationResult, stubs } = createConfig({ autoApprove: true })
		const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
		config.taskState.fileReadCache.set(preparation.storyIndexAbsolutePath.toLowerCase(), {
			readCount: 1,
			mtime: 1,
			snapshotText: "index",
		})
		for (const draftStoryFileAbsolutePath of preparation.draftStoryFileAbsolutePaths) {
			config.taskState.fileReadCache.set(draftStoryFileAbsolutePath.toLowerCase(), {
				readCount: 1,
				mtime: 1,
				snapshotText: "story",
			})
		}
		const block = createGenerateStoryFilesBlock()
		const handler = new GenerateStoryFilesToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, block)

		sinon.assert.calledOnceWithExactly(stubs.prepareGenerateStoryFiles, {
			taskState: config.taskState,
			epicIdentity: "1",
		})
		const expectedApprovalPaths = [preparation.storyIndexAbsolutePath, ...preparation.draftStoryFileAbsolutePaths]
		sinon.assert.callCount(stubs.shouldAutoApproveToolWithPath, expectedApprovalPaths.length)
		for (const expectedApprovalPath of expectedApprovalPaths) {
			sinon.assert.calledWithExactly(
				stubs.shouldAutoApproveToolWithPath,
				ClineDefaultTool.GENERATE_STORY_FILES,
				expectedApprovalPath,
			)
		}
		sinon.assert.calledOnceWithExactly(hookStub, config, block)
		sinon.assert.calledOnceWithExactly(stubs.generateStoryFiles, {
			taskState: config.taskState,
			epicIdentity: "1",
			expectedStoryIndexAbsolutePath: preparation.storyIndexAbsolutePath,
			expectedDraftStoryFileAbsolutePaths: preparation.draftStoryFileAbsolutePaths,
		})
		expect(JSON.parse(result as string)).to.deep.equal({
			persisted: true,
			epic_identity: "1",
			story_index_absolute_path: preparation.storyIndexAbsolutePath,
			draft_story_file_absolute_paths: preparation.draftStoryFileAbsolutePaths,
			created_draft_story_file_absolute_paths: generationResult.createdDraftStoryFileAbsolutePaths,
			existing_draft_story_file_absolute_paths: generationResult.existingDraftStoryFileAbsolutePaths,
			stories: generationResult.storyIndex.stories,
		})
		expect(config.taskState.fileReadCache.has(preparation.storyIndexAbsolutePath.toLowerCase())).to.equal(false)
		expect(config.taskState.fileReadCache.has(preparation.draftStoryFileAbsolutePaths[0].toLowerCase())).to.equal(false)
		expect(config.taskState.fileReadCache.has(preparation.draftStoryFileAbsolutePaths[1].toLowerCase())).to.equal(true)
		expect(config.taskState.didEditFile).to.equal(true)
		expect(config.taskState.consecutiveMistakeCount).to.equal(0)
	})
})
