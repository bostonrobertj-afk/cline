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
import type { WorkflowProjectFileMovePreparation } from "@/core/task/workflow-runtime/WorkflowRuntime"
import { ClineDefaultTool } from "@/shared/tools"
import * as pathUtils from "@/utils/path"
import { ToolValidator } from "../../ToolValidator"
import type { TaskConfig } from "../../types/TaskConfig"
import { validateTaskConfig } from "../../types/TaskConfig"
import { ToolHookUtils } from "../../utils/ToolHookUtils"
import { MoveWorkflowProjectFileToolHandler } from "../MoveWorkflowProjectFileToolHandler"

interface MoveHandlerConfigResult {
	config: TaskConfig
	preparation: WorkflowProjectFileMovePreparation
	stubs: {
		ask: sinon.SinonStub
		prepareWorkflowProjectFileMove: sinon.SinonStub
		moveWorkflowProjectFile: sinon.SinonStub
		shouldAutoApproveToolWithPath: sinon.SinonStub
	}
}

function createMoveBlock(args: { params: ToolUse["params"]; partial: boolean }): ToolUse {
	return {
		type: "tool_use",
		name: ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE,
		params: args.params,
		partial: args.partial,
		isNativeToolCall: true,
		call_id: "move_workflow_project_file_1",
	}
}

function createCompleteMoveBlock(preparation: WorkflowProjectFileMovePreparation): ToolUse {
	return createMoveBlock({
		params: {
			source_path: preparation.sourceAbsolutePath,
			destination_path: preparation.destinationAbsolutePath,
		},
		partial: false,
	})
}

function createMovePreparation(cwd: string): WorkflowProjectFileMovePreparation {
	return {
		sourceAbsolutePath: path.join(cwd, "project-one", "implementation", "stories-backlog", "Story-1.md"),
		destinationAbsolutePath: path.join(cwd, "project-one", "implementation", "stories-review", "Story-1.md"),
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
}): MoveHandlerConfigResult {
	const cwd = args?.cwd ?? path.join(process.cwd(), "tmp-move-workflow-project-file-test")
	const taskState = args?.taskState ?? new TaskState()
	const preparation = createMovePreparation(cwd)
	const ask = sinon.stub().resolves({ response: args?.askResponse ?? "yesButtonClicked" })
	const prepareWorkflowProjectFileMove = sinon.stub().resolves(preparation)
	const moveWorkflowProjectFile = sinon.stub().resolves(preparation)
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
			prepareWorkflowProjectFileMove,
			moveWorkflowProjectFile,
		},
		coordinator: {
			getHandler: sinon.stub(),
		},
	}
	validateTaskConfig(config)

	return {
		config,
		preparation,
		stubs: {
			ask,
			prepareWorkflowProjectFileMove,
			moveWorkflowProjectFile,
			shouldAutoApproveToolWithPath,
		},
	}
}

describe("MoveWorkflowProjectFileToolHandler", () => {
	let sandbox: sinon.SinonSandbox

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		sandbox.stub(pathUtils, "isLocatedInWorkspace").resolves(true)
	})

	afterEach(() => {
		sandbox.restore()
	})

	it("rejects missing source or destination paths before runtime preparation", async () => {
		const { config, stubs } = createConfig()
		const missingParamBlocks = [
			createMoveBlock({
				params: {
					destination_path: "destination.md",
				},
				partial: false,
			}),
			createMoveBlock({
				params: {
					source_path: "source.md",
				},
				partial: false,
			}),
			createMoveBlock({
				params: {
					source_path: " ",
					destination_path: "destination.md",
				},
				partial: false,
			}),
		]
		const handler = new MoveWorkflowProjectFileToolHandler(createToolValidator(config.cwd))

		for (const block of missingParamBlocks) {
			const result = await handler.execute(config, block)

			expect(result).to.contain("Missing required parameters")
		}
		sinon.assert.notCalled(stubs.prepareWorkflowProjectFileMove)
		sinon.assert.notCalled(stubs.moveWorkflowProjectFile)
	})

	it("rejects partial blocks before runtime preparation", async () => {
		const { config, preparation, stubs } = createConfig()
		const handler = new MoveWorkflowProjectFileToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(
			config,
			createMoveBlock({
				params: {
					source_path: preparation.sourceAbsolutePath,
					destination_path: preparation.destinationAbsolutePath,
				},
				partial: true,
			}),
		)

		expect(result).to.contain("partial tool blocks")
		sinon.assert.notCalled(stubs.prepareWorkflowProjectFileMove)
		sinon.assert.notCalled(stubs.moveWorkflowProjectFile)
	})

	it("returns a clineignore tool error before approval, hooks, or move for blocked source paths", async () => {
		const cwd = await mkdtemp(path.join(tmpdir(), "move-workflow-project-file-source-clineignore-test-"))
		const clineIgnoreController = new ClineIgnoreController(cwd)
		try {
			await writeFile(path.join(cwd, ".clineignore"), "project-one/implementation/stories-backlog/Story-1.md\n", "utf8")
			await clineIgnoreController.initialize()
			const { config, preparation, stubs } = createConfig({ cwd })
			const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
			const handler = new MoveWorkflowProjectFileToolHandler(new ToolValidator(clineIgnoreController))

			const result = await handler.execute(config, createCompleteMoveBlock(preparation))

			expect(result).to.equal(formatResponse.toolError(formatResponse.clineIgnoreError(preparation.sourceAbsolutePath)))
			sinon.assert.calledOnceWithExactly(stubs.prepareWorkflowProjectFileMove, {
				taskState: config.taskState,
				sourcePath: preparation.sourceAbsolutePath,
				destinationPath: preparation.destinationAbsolutePath,
			})
			sinon.assert.notCalled(stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(stubs.ask)
			sinon.assert.notCalled(hookStub)
			sinon.assert.notCalled(stubs.moveWorkflowProjectFile)
		} finally {
			await clineIgnoreController.dispose()
			await rm(cwd, { recursive: true, force: true })
		}
	})

	it("returns a clineignore tool error before approval, hooks, or move for blocked destination paths", async () => {
		const cwd = await mkdtemp(path.join(tmpdir(), "move-workflow-project-file-destination-clineignore-test-"))
		const clineIgnoreController = new ClineIgnoreController(cwd)
		try {
			await writeFile(path.join(cwd, ".clineignore"), "project-one/implementation/stories-review/Story-1.md\n", "utf8")
			await clineIgnoreController.initialize()
			const { config, preparation, stubs } = createConfig({ cwd })
			const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
			const handler = new MoveWorkflowProjectFileToolHandler(new ToolValidator(clineIgnoreController))

			const result = await handler.execute(config, createCompleteMoveBlock(preparation))

			expect(result).to.equal(
				formatResponse.toolError(formatResponse.clineIgnoreError(preparation.destinationAbsolutePath)),
			)
			sinon.assert.calledOnceWithExactly(stubs.prepareWorkflowProjectFileMove, {
				taskState: config.taskState,
				sourcePath: preparation.sourceAbsolutePath,
				destinationPath: preparation.destinationAbsolutePath,
			})
			sinon.assert.notCalled(stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(stubs.ask)
			sinon.assert.notCalled(hookStub)
			sinon.assert.notCalled(stubs.moveWorkflowProjectFile)
		} finally {
			await clineIgnoreController.dispose()
			await rm(cwd, { recursive: true, force: true })
		}
	})

	it("stops before hooks and move when approval is denied", async () => {
		const { config, preparation, stubs } = createConfig({ askResponse: "noButtonClicked" })
		const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
		const handler = new MoveWorkflowProjectFileToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createCompleteMoveBlock(preparation))

		expect(result).to.equal(formatResponse.toolDenied())
		sinon.assert.calledTwice(stubs.shouldAutoApproveToolWithPath)
		sinon.assert.calledWithExactly(
			stubs.shouldAutoApproveToolWithPath,
			ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE,
			preparation.sourceAbsolutePath,
		)
		sinon.assert.calledWithExactly(
			stubs.shouldAutoApproveToolWithPath,
			ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE,
			preparation.destinationAbsolutePath,
		)
		sinon.assert.calledOnce(stubs.ask)
		sinon.assert.notCalled(hookStub)
		sinon.assert.notCalled(stubs.moveWorkflowProjectFile)
		expect(config.taskState.didRejectTool).to.equal(true)
	})

	it("moves through the workflow runtime, clears caches, and returns structured success JSON", async () => {
		const { config, preparation, stubs } = createConfig({ autoApprove: true })
		const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
		const block = createCompleteMoveBlock(preparation)
		config.taskState.fileReadCache.set(preparation.sourceAbsolutePath.toLowerCase(), {
			readCount: 1,
			mtime: 1,
			snapshotText: "source",
		})
		config.taskState.fileReadCache.set(preparation.destinationAbsolutePath.toLowerCase(), {
			readCount: 1,
			mtime: 1,
			snapshotText: "destination",
		})
		const handler = new MoveWorkflowProjectFileToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, block)

		sinon.assert.calledOnceWithExactly(stubs.prepareWorkflowProjectFileMove, {
			taskState: config.taskState,
			sourcePath: preparation.sourceAbsolutePath,
			destinationPath: preparation.destinationAbsolutePath,
		})
		sinon.assert.calledTwice(stubs.shouldAutoApproveToolWithPath)
		sinon.assert.calledWithExactly(
			stubs.shouldAutoApproveToolWithPath,
			ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE,
			preparation.sourceAbsolutePath,
		)
		sinon.assert.calledWithExactly(
			stubs.shouldAutoApproveToolWithPath,
			ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE,
			preparation.destinationAbsolutePath,
		)
		sinon.assert.calledOnceWithExactly(hookStub, config, block)
		sinon.assert.calledOnceWithExactly(stubs.moveWorkflowProjectFile, {
			taskState: config.taskState,
			expectedSourceAbsolutePath: preparation.sourceAbsolutePath,
			expectedDestinationAbsolutePath: preparation.destinationAbsolutePath,
		})
		expect(typeof result).to.equal("string")
		if (typeof result !== "string") {
			throw new Error("Expected string tool result.")
		}
		expect(JSON.parse(result)).to.deep.equal({
			moved: true,
			source_path: preparation.sourceAbsolutePath,
			destination_path: preparation.destinationAbsolutePath,
		})
		expect(config.taskState.fileReadCache.has(preparation.sourceAbsolutePath.toLowerCase())).to.equal(false)
		expect(config.taskState.fileReadCache.has(preparation.destinationAbsolutePath.toLowerCase())).to.equal(false)
		expect(config.taskState.didEditFile).to.equal(true)
		expect(config.taskState.consecutiveMistakeCount).to.equal(0)
	})
})
