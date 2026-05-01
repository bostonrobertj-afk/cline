import type { ToolUse } from "@core/assistant-message"
import { expect } from "chai"
import fs from "fs/promises"
import { afterEach, beforeEach, describe, it } from "mocha"
import { tmpdir } from "os"
import path from "path"
import sinon from "sinon"
import { ClineIgnoreController } from "@/core/ignore/ClineIgnoreController"
import { formatResponse } from "@/core/prompts/responses"
import { TaskState } from "@/core/task/TaskState"
import { ClineDefaultTool } from "@/shared/tools"
import * as pathUtils from "@/utils/path"
import { ToolValidator } from "../../ToolValidator"
import { validateTaskConfig } from "../../types/TaskConfig"
import { ToolHookUtils } from "../../utils/ToolHookUtils"
import { BuildWorkflowDocumentToolHandler } from "../BuildWorkflowDocumentToolHandler"

const JSON_SAFE_WORKFLOW_VALUES = {
	title: "Draft",
	count: 7,
	approved: true,
	items: ["alpha", 2, false],
	metadata: {
		owner: "runtime",
		flags: [true, "kept"],
	},
}

function createBuildWorkflowDocumentBlock(destinationPath: string, workflowValueWrites?: unknown): ToolUse {
	const params: ToolUse["params"] = {
		content: "# Resolved spec",
	}
	Object.assign(params, {
		artifact_id: "output_file",
		destination_path: destinationPath,
	})
	if (workflowValueWrites !== undefined) {
		Object.assign(params, {
			workflow_value_writes: workflowValueWrites,
		})
	}

	return {
		type: "tool_use",
		name: ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
		params,
		partial: false,
		isNativeToolCall: true,
		call_id: "build_workflow_document_1",
	}
}

function createConfig(args: { cwd: string; clineIgnoreController: ClineIgnoreController }) {
	const taskState = new TaskState()
	const ask = sinon.stub().resolves({ response: "yesButtonClicked" })
	const shouldAutoApproveToolWithPath = sinon.stub().resolves(false)
	const applyWorkflowValueWrites = sinon.stub().resolves({
		changedValues: {},
		unchangedValues: {},
	})
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
		cwd: args.cwd,
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
			clineIgnoreController: args.clineIgnoreController,
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
			applyWorkflowValueWrites,
		},
		coordinator: {
			getHandler: sinon.stub(),
		},
	}
	validateTaskConfig(config)

	return {
		config,
		stubs: {
			ask,
			applyWorkflowValueWrites,
			shouldAutoApproveToolWithPath,
		},
	}
}

describe("BuildWorkflowDocumentToolHandler", () => {
	let sandbox: sinon.SinonSandbox

	beforeEach(() => {
		sandbox = sinon.createSandbox()
	})

	afterEach(() => {
		sandbox.restore()
	})

	it("returns a clineignore tool error before file read, approval, hooks, or write for blocked paths", async () => {
		const cwd = await fs.mkdtemp(path.join(tmpdir(), "build-workflow-document-clineignore-test-"))
		const destinationPath = path.join(cwd, "project-one", "planning", "Epic-1-delivery-spec.md")
		const clineIgnoreController = new ClineIgnoreController(cwd)
		try {
			await fs.writeFile(path.join(cwd, ".clineignore"), "project-one/planning/Epic-1-delivery-spec.md\n", "utf8")
			await clineIgnoreController.initialize()
			const { config, stubs } = createConfig({ cwd, clineIgnoreController })
			const readFileStub = sandbox.stub(fs, "readFile").resolves("previous content")
			const mkdirStub = sandbox.stub(fs, "mkdir").resolves(undefined)
			const writeFileStub = sandbox.stub(fs, "writeFile").resolves()
			const renameStub = sandbox.stub(fs, "rename").resolves()
			const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
			const handler = new BuildWorkflowDocumentToolHandler(new ToolValidator(clineIgnoreController))

			const result = await handler.execute(config, createBuildWorkflowDocumentBlock(destinationPath))

			expect(result).to.equal(formatResponse.toolError(formatResponse.clineIgnoreError(destinationPath)))
			sinon.assert.notCalled(readFileStub)
			sinon.assert.notCalled(stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(stubs.ask)
			sinon.assert.notCalled(hookStub)
			sinon.assert.notCalled(mkdirStub)
			sinon.assert.notCalled(writeFileStub)
			sinon.assert.notCalled(renameStub)
			sinon.assert.notCalled(stubs.applyWorkflowValueWrites)
		} finally {
			await clineIgnoreController.dispose()
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

	it("applies JSON-safe workflow value writes supplied as a JSON string", async () => {
		const cwd = await fs.mkdtemp(path.join(tmpdir(), "build-workflow-document-values-json-test-"))
		const destinationPath = path.join(cwd, "project-one", "planning", "Epic-1-delivery-spec.md")
		const clineIgnoreController = new ClineIgnoreController(cwd)
		try {
			await clineIgnoreController.initialize()
			const { config, stubs } = createConfig({ cwd, clineIgnoreController })
			stubs.shouldAutoApproveToolWithPath.resolves(true)
			sandbox.stub(pathUtils, "isLocatedInWorkspace").resolves(true)
			const handler = new BuildWorkflowDocumentToolHandler(new ToolValidator(clineIgnoreController))

			await handler.execute(
				config,
				createBuildWorkflowDocumentBlock(destinationPath, JSON.stringify(JSON_SAFE_WORKFLOW_VALUES)),
			)

			sinon.assert.calledOnce(stubs.applyWorkflowValueWrites)
			expect(stubs.applyWorkflowValueWrites.firstCall.args[0]).to.deep.equal({
				taskState: config.taskState,
				values: JSON_SAFE_WORKFLOW_VALUES,
			})
		} finally {
			await clineIgnoreController.dispose()
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

	it("applies JSON-safe workflow value writes supplied as an object", async () => {
		const cwd = await fs.mkdtemp(path.join(tmpdir(), "build-workflow-document-values-object-test-"))
		const destinationPath = path.join(cwd, "project-one", "planning", "Epic-1-delivery-spec.md")
		const clineIgnoreController = new ClineIgnoreController(cwd)
		try {
			await clineIgnoreController.initialize()
			const { config, stubs } = createConfig({ cwd, clineIgnoreController })
			stubs.shouldAutoApproveToolWithPath.resolves(true)
			sandbox.stub(pathUtils, "isLocatedInWorkspace").resolves(true)
			const handler = new BuildWorkflowDocumentToolHandler(new ToolValidator(clineIgnoreController))

			await handler.execute(config, createBuildWorkflowDocumentBlock(destinationPath, JSON_SAFE_WORKFLOW_VALUES))

			sinon.assert.calledOnce(stubs.applyWorkflowValueWrites)
			expect(stubs.applyWorkflowValueWrites.firstCall.args[0]).to.deep.equal({
				taskState: config.taskState,
				values: JSON_SAFE_WORKFLOW_VALUES,
			})
		} finally {
			await clineIgnoreController.dispose()
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

	it("rejects invalid workflow value writes before applying them", async () => {
		const invalidWorkflowValueWrites = ["{", "[1]", "null", "{}", '{"unsafe":null}', {}, { unsafe: null }]
		const expectedError = formatResponse.toolError(
			"Missing required parameters. Provide non-empty string values for 'artifact_id', 'destination_path', and 'content'. Optional 'workflow_value_writes' must be a non-empty object or JSON string whose property values are JSON-safe workflow values.",
		)

		for (const invalidValue of invalidWorkflowValueWrites) {
			const cwd = await fs.mkdtemp(path.join(tmpdir(), "build-workflow-document-invalid-values-test-"))
			const destinationPath = path.join(cwd, "project-one", "planning", "Epic-1-delivery-spec.md")
			const clineIgnoreController = new ClineIgnoreController(cwd)
			try {
				const { config, stubs } = createConfig({ cwd, clineIgnoreController })
				const handler = new BuildWorkflowDocumentToolHandler(new ToolValidator(clineIgnoreController))

				const result = await handler.execute(config, createBuildWorkflowDocumentBlock(destinationPath, invalidValue))

				expect(result).to.equal(expectedError)
				sinon.assert.notCalled(stubs.applyWorkflowValueWrites)
			} finally {
				await clineIgnoreController.dispose()
				await fs.rm(cwd, { recursive: true, force: true })
			}
		}
	})
})
