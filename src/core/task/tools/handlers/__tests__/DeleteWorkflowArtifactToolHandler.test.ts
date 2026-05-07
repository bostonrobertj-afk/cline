import type { ToolUse } from "@core/assistant-message"
import { PreToolUseHookCancellationError } from "@core/hooks/PreToolUseHookCancellationError"
import { expect } from "chai"
import { mkdtemp, rm, writeFile } from "fs/promises"
import { afterEach, beforeEach, describe, it } from "mocha"
import { tmpdir } from "os"
import path from "path"
import sinon from "sinon"
import { ClineIgnoreController } from "@/core/ignore/ClineIgnoreController"
import { formatResponse } from "@/core/prompts/responses"
import { TaskState } from "@/core/task/TaskState"
import type { WorkflowArtifactDeletionPreparation } from "@/core/task/workflow-runtime/WorkflowRuntime"
import { ClineDefaultTool } from "@/shared/tools"
import * as pathUtils from "@/utils/path"
import { ToolValidator } from "../../ToolValidator"
import type { TaskConfig } from "../../types/TaskConfig"
import { validateTaskConfig } from "../../types/TaskConfig"
import { ToolHookUtils } from "../../utils/ToolHookUtils"
import { DeleteWorkflowArtifactToolHandler } from "../DeleteWorkflowArtifactToolHandler"

interface DeleteHandlerConfigResult {
	config: TaskConfig
	preparation: WorkflowArtifactDeletionPreparation
	stubs: {
		ask: sinon.SinonStub
		prepareWorkflowArtifactDeletion: sinon.SinonStub
		deleteWorkflowArtifact: sinon.SinonStub
		shouldAutoApproveToolWithPath: sinon.SinonStub
	}
}

function createDeleteBlock(args?: { artifactId?: string; includeArtifactId?: boolean; partial?: boolean }): ToolUse {
	const params: ToolUse["params"] = {}
	if (args?.includeArtifactId !== false) {
		Object.assign(params, {
			artifact_id: args?.artifactId ?? "epic_doc",
		})
	}

	return {
		type: "tool_use",
		name: ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT,
		params,
		partial: args?.partial ?? false,
		isNativeToolCall: true,
		call_id: "delete_workflow_artifact_1",
	}
}

function createDeletionPreparation(cwd: string): WorkflowArtifactDeletionPreparation {
	const artifactAbsolutePath = path.join(cwd, "project-one", "planning", "Epics.md")
	return {
		artifactId: "epic_doc",
		projectTitle: "Project One",
		projectFolderName: "project-one",
		artifactFamily: "epics",
		artifactIdentity: "epics",
		artifactFilename: "Epics.md",
		artifactRelativePath: path.join("planning", "Epics.md"),
		artifactAbsolutePath,
		parentIdentity: undefined,
		targetIdentity: undefined,
		workflowValueWrites: {
			artifact_project_title: "Project One",
			artifact_project_folder: "project-one",
			artifact_family: "epics",
			artifact_identity: "epics",
			artifact_filename: "Epics.md",
			artifact_relative_path: path.join("planning", "Epics.md"),
			artifact_absolute_path: artifactAbsolutePath,
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
}): DeleteHandlerConfigResult {
	const cwd = args?.cwd ?? path.join(process.cwd(), "tmp-delete-workflow-artifact-test")
	const taskState = args?.taskState ?? new TaskState()
	const preparation = createDeletionPreparation(cwd)
	const ask = sinon.stub().resolves({ response: args?.askResponse ?? "yesButtonClicked" })
	const prepareWorkflowArtifactDeletion = sinon.stub().resolves(preparation)
	const deleteWorkflowArtifact = sinon.stub().resolves(preparation)
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
			prepareWorkflowArtifactDeletion,
			deleteWorkflowArtifact,
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
			prepareWorkflowArtifactDeletion,
			deleteWorkflowArtifact,
			shouldAutoApproveToolWithPath,
		},
	}
}

describe("DeleteWorkflowArtifactToolHandler", () => {
	let sandbox: sinon.SinonSandbox

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		sandbox.stub(pathUtils, "isLocatedInWorkspace").resolves(true)
	})

	afterEach(() => {
		sandbox.restore()
	})

	it("rejects missing artifact ids before runtime preparation", async () => {
		const missingArtifactCases = [createDeleteBlock({ includeArtifactId: false }), createDeleteBlock({ artifactId: " " })]

		for (const block of missingArtifactCases) {
			const { config, stubs } = createConfig()
			const handler = new DeleteWorkflowArtifactToolHandler(createToolValidator(config.cwd))

			const result = await handler.execute(config, block)

			expect(result).to.contain("Missing required parameter 'artifact_id'")
			sinon.assert.notCalled(stubs.prepareWorkflowArtifactDeletion)
			sinon.assert.notCalled(stubs.deleteWorkflowArtifact)
		}
	})

	it("rejects partial blocks before runtime preparation", async () => {
		const { config, stubs } = createConfig()
		const handler = new DeleteWorkflowArtifactToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createDeleteBlock({ partial: true }))

		expect(result).to.contain("partial tool blocks")
		sinon.assert.notCalled(stubs.prepareWorkflowArtifactDeletion)
		sinon.assert.notCalled(stubs.deleteWorkflowArtifact)
	})

	it("returns a clineignore tool error before approval, hooks, or delete for blocked paths", async () => {
		const cwd = await mkdtemp(path.join(tmpdir(), "delete-workflow-artifact-clineignore-test-"))
		const clineIgnoreController = new ClineIgnoreController(cwd)
		try {
			await writeFile(path.join(cwd, ".clineignore"), "project-one/planning/Epics.md\n", "utf8")
			await clineIgnoreController.initialize()
			const { config, preparation, stubs } = createConfig({ cwd })
			const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
			const handler = new DeleteWorkflowArtifactToolHandler(new ToolValidator(clineIgnoreController))

			const result = await handler.execute(config, createDeleteBlock())

			expect(result).to.equal(formatResponse.toolError(formatResponse.clineIgnoreError(preparation.artifactAbsolutePath)))
			sinon.assert.calledOnceWithExactly(stubs.prepareWorkflowArtifactDeletion, {
				taskState: config.taskState,
				artifactId: "epic_doc",
			})
			sinon.assert.notCalled(stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(stubs.ask)
			sinon.assert.notCalled(hookStub)
			sinon.assert.notCalled(stubs.deleteWorkflowArtifact)
		} finally {
			await clineIgnoreController.dispose()
			await rm(cwd, { recursive: true, force: true })
		}
	})

	it("stops before hooks and delete when approval is denied", async () => {
		const { config, preparation, stubs } = createConfig({ askResponse: "noButtonClicked" })
		const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
		const handler = new DeleteWorkflowArtifactToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createDeleteBlock())

		expect(result).to.equal(formatResponse.toolDenied())
		sinon.assert.calledOnceWithExactly(
			stubs.shouldAutoApproveToolWithPath,
			ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT,
			preparation.artifactAbsolutePath,
		)
		sinon.assert.calledOnce(stubs.ask)
		sinon.assert.notCalled(hookStub)
		sinon.assert.notCalled(stubs.deleteWorkflowArtifact)
		expect(config.taskState.didRejectTool).to.equal(true)
	})

	it("stops before delete when the pre-tool hook denies execution", async () => {
		const { config, stubs } = createConfig({ autoApprove: true })
		const hookStub = sandbox
			.stub(ToolHookUtils, "runPreToolUseIfEnabled")
			.rejects(new PreToolUseHookCancellationError("Denied by hook."))
		const block = createDeleteBlock()
		const handler = new DeleteWorkflowArtifactToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, block)

		expect(result).to.equal(formatResponse.toolDenied())
		sinon.assert.calledOnceWithExactly(hookStub, config, block)
		sinon.assert.notCalled(stubs.deleteWorkflowArtifact)
	})

	it("deletes through the workflow runtime and returns artifact output JSON", async () => {
		const { config, preparation, stubs } = createConfig({ autoApprove: true })
		const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
		const block = createDeleteBlock()
		config.taskState.fileReadCache.set(preparation.artifactAbsolutePath.toLowerCase(), {
			readCount: 1,
			mtime: 1,
			snapshotText: "source",
		})
		const handler = new DeleteWorkflowArtifactToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, block)

		sinon.assert.calledOnceWithExactly(stubs.prepareWorkflowArtifactDeletion, {
			taskState: config.taskState,
			artifactId: "epic_doc",
		})
		sinon.assert.calledOnceWithExactly(
			stubs.shouldAutoApproveToolWithPath,
			ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT,
			preparation.artifactAbsolutePath,
		)
		sinon.assert.calledOnceWithExactly(hookStub, config, block)
		sinon.assert.calledOnceWithExactly(stubs.deleteWorkflowArtifact, {
			taskState: config.taskState,
			artifactId: "epic_doc",
			expectedArtifactAbsolutePath: preparation.artifactAbsolutePath,
		})
		expect(typeof result).to.equal("string")
		if (typeof result !== "string") {
			throw new Error("Expected string tool result.")
		}
		expect(JSON.parse(result)).to.deep.equal({
			deleted: true,
			artifact_id: "epic_doc",
			artifact_family: "epics",
			artifact_identity: "epics",
			artifact_filename: "Epics.md",
			artifact_relative_path: path.join("planning", "Epics.md"),
			artifact_absolute_path: preparation.artifactAbsolutePath,
		})
		expect(config.taskState.fileReadCache.has(preparation.artifactAbsolutePath.toLowerCase())).to.equal(false)
		expect(config.taskState.didEditFile).to.equal(true)
		expect(config.taskState.consecutiveMistakeCount).to.equal(0)
	})
})
