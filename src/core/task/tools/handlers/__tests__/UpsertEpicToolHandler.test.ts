import type { ToolUse } from "@core/assistant-message"
import { expect } from "chai"
import fs from "fs/promises"
import { afterEach, beforeEach, describe, it } from "mocha"
import { tmpdir } from "os"
import path from "path"
import sinon from "sinon"
import { ClineIgnoreController } from "@/core/ignore/ClineIgnoreController"
import type { ToolResponse } from "@/core/task"
import { TaskState } from "@/core/task/TaskState"
import type { ActiveWorkflowSession, WorkflowValues } from "@/core/task/workflow-runtime/types"
import { ClineDefaultTool } from "@/shared/tools"
import * as pathUtils from "@/utils/path"
import { ToolValidator } from "../../ToolValidator"
import type { TaskConfig } from "../../types/TaskConfig"
import { validateTaskConfig } from "../../types/TaskConfig"
import { ToolHookUtils } from "../../utils/ToolHookUtils"
import { UpsertEpicToolHandler } from "../UpsertEpicToolHandler"

const EMPTY_EPICS_DOCUMENT = `# Context

## Architecture

## Brainstorming

## Additional Context

# Epics
`

interface UpsertEpicHandlerTestHarness {
	config: TaskConfig
	handler: UpsertEpicToolHandler
	cwd: string
	clineIgnoreController: ClineIgnoreController
	stubs: {
		shouldAutoApproveToolWithPath: sinon.SinonStub
	}
}

interface UpsertEpicHandlerConfigResult {
	config: TaskConfig
	stubs: {
		shouldAutoApproveToolWithPath: sinon.SinonStub
	}
}

function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 2,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Create Epics Project",
			projectFolderName: "create-epics-project",
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
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
}

function activateCreateEpicsSession(taskState: TaskState, workflowValues: WorkflowValues): void {
	taskState.activeWorkflowName = "create-epics"
	taskState.activeWorkflowSession = createSession(workflowValues)
}

function createValidParams(): ToolUse["params"] {
	return createEpicParams({
		identity: "1",
		title: "Foundational planning outcome",
		description: "Define the first planning outcome.",
		requirement: "Capture the required planning outcome.",
		scope: "Draft the product-owned epic section.",
		scopeBoundary: "Do not draft downstream stories.",
	})
}

function createEpicParams(args: {
	identity: string
	title: string
	description: string
	requirement: string
	scope: string
	scopeBoundary: string
}): ToolUse["params"] {
	return {
		identity: args.identity,
		title: args.title,
		objective: JSON.stringify({
			as_a: "product manager",
			i_want: "clear implementation epics",
			so_that: "planning can proceed in dependency order",
		}),
		description: args.description,
		requirements: JSON.stringify([args.requirement]),
		scope: JSON.stringify([args.scope]),
		scope_boundary: JSON.stringify([args.scopeBoundary]),
	}
}

function createMaterializedParams(): ToolUse["params"] {
	const params = createValidParams()
	Reflect.set(params, "objective", {
		as_a: "product manager",
		i_want: "materialized epic inputs",
		so_that: "native tool calls can persist epics",
	})
	Reflect.set(params, "requirements", ["Accept already-materialized requirement arrays."])
	Reflect.set(params, "scope", ["Accept already-materialized scope arrays."])
	Reflect.set(params, "scope_boundary", ["Accept already-materialized boundary arrays."])
	return params
}

function createBlock(params: ToolUse["params"], partial: boolean): ToolUse {
	return {
		type: "tool_use",
		name: ClineDefaultTool.UPSERT_EPIC,
		params,
		partial,
		isNativeToolCall: true,
		call_id: "upsert_epic_1",
	}
}

function createConfig(args: {
	cwd: string
	clineIgnoreController: ClineIgnoreController
	taskState: TaskState
	autoApprove: boolean
}): UpsertEpicHandlerConfigResult {
	const shouldAutoApproveToolWithPath = sinon.stub().resolves(args.autoApprove)
	const callbacks = {
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
		taskState: args.taskState,
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
		workflowRuntime: {},
		coordinator: {
			getHandler: sinon.stub(),
		},
	}
	validateTaskConfig(config)
	return {
		config,
		stubs: {
			shouldAutoApproveToolWithPath,
		},
	}
}

async function createHarness(args?: {
	taskState?: TaskState
	autoApprove?: boolean
	clineIgnoreContent?: string
}): Promise<UpsertEpicHandlerTestHarness> {
	const cwd = await fs.mkdtemp(path.join(tmpdir(), "upsert-epic-tool-handler-test-"))
	const clineIgnoreController = new ClineIgnoreController(cwd)
	if (args?.clineIgnoreContent !== undefined) {
		await fs.writeFile(path.join(cwd, ".clineignore"), args.clineIgnoreContent, "utf8")
	}
	await clineIgnoreController.initialize()
	const taskState = args?.taskState ?? new TaskState()
	const configResult = createConfig({
		cwd,
		clineIgnoreController,
		taskState,
		autoApprove: args?.autoApprove ?? true,
	})
	const handler = new UpsertEpicToolHandler(new ToolValidator(clineIgnoreController))
	return {
		config: configResult.config,
		handler,
		cwd,
		clineIgnoreController,
		stubs: configResult.stubs,
	}
}

async function disposeHarness(harness: UpsertEpicHandlerTestHarness): Promise<void> {
	await harness.clineIgnoreController.dispose()
	await fs.rm(harness.cwd, { recursive: true, force: true })
}

function stringifyToolResponse(response: ToolResponse): string {
	if (typeof response !== "string") {
		throw new Error("Expected string tool response.")
	}

	return response
}

function isPlainJsonObject(value: unknown): value is Readonly<Record<string, unknown>> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false
	}

	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

function parseJsonObjectResponse(response: ToolResponse): Readonly<Record<string, unknown>> {
	const parsed: unknown = JSON.parse(stringifyToolResponse(response))
	if (!isPlainJsonObject(parsed)) {
		throw new Error("Expected JSON object tool response.")
	}

	return parsed
}

function readJsonArrayField(response: Readonly<Record<string, unknown>>, fieldName: string): readonly unknown[] {
	const value = response[fieldName]
	if (!Array.isArray(value)) {
		throw new Error(`Expected '${fieldName}' to be a JSON array.`)
	}

	return value
}

describe("UpsertEpicToolHandler", () => {
	let sandbox: sinon.SinonSandbox
	let hookStub: sinon.SinonStub

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		sandbox.stub(pathUtils, "isLocatedInWorkspace").resolves(true)
		hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
	})

	afterEach(() => {
		sandbox.restore()
	})

	it("rejects calls outside an active create-epics workflow session", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project-one", "planning", "Epics.md")
			await fs.mkdir(path.dirname(outputPath), { recursive: true })
			await fs.writeFile(outputPath, EMPTY_EPICS_DOCUMENT, "utf8")

			const result = await harness.handler.execute(harness.config, createBlock(createValidParams(), false))

			expect(stringifyToolResponse(result)).to.contain("active create-epics workflow session")
			expect(await fs.readFile(outputPath, "utf8")).to.equal(EMPTY_EPICS_DOCUMENT)
			sinon.assert.notCalled(harness.stubs.shouldAutoApproveToolWithPath)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("rejects missing required parameters", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project-one", "planning", "Epics.md")
			activateCreateEpicsSession(harness.config.taskState, { output_file: outputPath })
			const params = createValidParams()
			delete params.description

			const result = await harness.handler.execute(harness.config, createBlock(params, false))

			expect(stringifyToolResponse(result)).to.contain("Parameter 'description' must be a string.")
		} finally {
			await disposeHarness(harness)
		}
	})

	it("rejects malformed JSON for structured parameters", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project-one", "planning", "Epics.md")
			activateCreateEpicsSession(harness.config.taskState, { output_file: outputPath })
			const params = createValidParams()
			params.objective = "{"

			const result = await harness.handler.execute(harness.config, createBlock(params, false))

			expect(stringifyToolResponse(result)).to.contain("Parameter 'objective' must be valid JSON")
		} finally {
			await disposeHarness(harness)
		}
	})

	it("rejects empty values and partial blocks", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project-one", "planning", "Epics.md")
			activateCreateEpicsSession(harness.config.taskState, { output_file: outputPath })
			const emptyArrayParams = createValidParams()
			emptyArrayParams.requirements = "[]"
			const partialResult = await harness.handler.execute(harness.config, createBlock(createValidParams(), true))
			const emptyArrayResult = await harness.handler.execute(harness.config, createBlock(emptyArrayParams, false))

			expect(stringifyToolResponse(partialResult)).to.contain("partial tool blocks")
			expect(stringifyToolResponse(emptyArrayResult)).to.contain("requirements")
			expect(stringifyToolResponse(emptyArrayResult)).to.contain("at least one non-empty string")
		} finally {
			await disposeHarness(harness)
		}
	})

	it("rejects malformed identities and empty titles before persistence", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project-one", "planning", "Epics.md")
			activateCreateEpicsSession(harness.config.taskState, { output_file: outputPath })
			const badIdentityParams = createValidParams()
			badIdentityParams.identity = "0"
			const emptyTitleParams = createValidParams()
			emptyTitleParams.title = " "

			const badIdentityResult = await harness.handler.execute(harness.config, createBlock(badIdentityParams, false))
			const emptyTitleResult = await harness.handler.execute(harness.config, createBlock(emptyTitleParams, false))

			expect(stringifyToolResponse(badIdentityResult)).to.contain("positive numeric string")
			expect(stringifyToolResponse(emptyTitleResult)).to.contain("Parameter 'title' must not be empty.")
		} finally {
			await disposeHarness(harness)
		}
	})

	it("resolves the destination from output_file and rejects model-provided destination paths", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project-one", "planning", "Epics.md")
			await fs.mkdir(path.dirname(outputPath), { recursive: true })
			await fs.writeFile(outputPath, EMPTY_EPICS_DOCUMENT, "utf8")
			activateCreateEpicsSession(harness.config.taskState, { output_file: outputPath })

			const paramsWithDestination = createValidParams()
			Reflect.set(paramsWithDestination, "destination_path", path.join(harness.cwd, "wrong", "Epics.md"))
			const rejectedResult = await harness.handler.execute(harness.config, createBlock(paramsWithDestination, false))

			const materializedResult = await harness.handler.execute(
				harness.config,
				createBlock(createMaterializedParams(), false),
			)
			const updatedDocument = await fs.readFile(outputPath, "utf8")

			expect(stringifyToolResponse(rejectedResult)).to.contain("Unsupported parameter(s) for upsert_epic: destination_path")
			expect(stringifyToolResponse(materializedResult)).to.contain('"identity":"1"')
			expect(updatedDocument).to.contain("## Epic 1: Foundational planning outcome")
			sinon.assert.calledWithExactly(harness.stubs.shouldAutoApproveToolWithPath, ClineDefaultTool.UPSERT_EPIC, outputPath)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("rejects missing output_file before file access", async () => {
		const harness = await createHarness()
		try {
			activateCreateEpicsSession(harness.config.taskState, {})

			const result = await harness.handler.execute(harness.config, createBlock(createValidParams(), false))

			expect(stringifyToolResponse(result)).to.contain("Workflow value 'output_file' must be a non-empty string")
			sinon.assert.notCalled(harness.stubs.shouldAutoApproveToolWithPath)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("inserts, replaces, orders, preserves canonical epics, returns inventory, and clears the file-read cache", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project-one", "planning", "Epics.md")
			await fs.mkdir(path.dirname(outputPath), { recursive: true })
			await fs.writeFile(outputPath, EMPTY_EPICS_DOCUMENT, "utf8")
			activateCreateEpicsSession(harness.config.taskState, { output_file: outputPath })
			harness.config.taskState.fileReadCache.set(outputPath.toLowerCase(), {
				readCount: 1,
				mtime: 1,
				snapshotText: EMPTY_EPICS_DOCUMENT,
			})

			await harness.handler.execute(
				harness.config,
				createBlock(
					createEpicParams({
						identity: "2",
						title: "Second outcome",
						description: "Deliver the second outcome.",
						requirement: "Keep the second requirement.",
						scope: "Keep the second scope.",
						scopeBoundary: "Keep the second boundary.",
					}),
					false,
				),
			)
			await harness.handler.execute(
				harness.config,
				createBlock(
					createEpicParams({
						identity: "10",
						title: "Tenth outcome",
						description: "Deliver the tenth outcome.",
						requirement: "Keep the tenth requirement.",
						scope: "Keep the tenth scope.",
						scopeBoundary: "Keep the tenth boundary.",
					}),
					false,
				),
			)
			await harness.handler.execute(
				harness.config,
				createBlock(
					createEpicParams({
						identity: "1",
						title: "First outcome",
						description: "Deliver the first outcome.",
						requirement: "Keep the first requirement.",
						scope: "Keep the first scope.",
						scopeBoundary: "Keep the first boundary.",
					}),
					false,
				),
			)
			const replacementResult = await harness.handler.execute(
				harness.config,
				createBlock(
					createEpicParams({
						identity: "2",
						title: "Second revised outcome",
						description: "Deliver the revised second outcome.",
						requirement: "Keep the revised second requirement.",
						scope: "Keep the revised second scope.",
						scopeBoundary: "Keep the revised second boundary.",
					}),
					false,
				),
			)

			const updatedDocument = await fs.readFile(outputPath, "utf8")
			const resultObject = parseJsonObjectResponse(replacementResult)
			const epics = readJsonArrayField(resultObject, "epics")

			expect(updatedDocument).to.contain("## Epic 1: First outcome")
			expect(updatedDocument).to.contain("## Epic 2: Second revised outcome")
			expect(updatedDocument).to.contain("## Epic 10: Tenth outcome")
			expect(updatedDocument).not.to.contain("## Epic 2: Second outcome")
			expect(updatedDocument).to.contain("Keep the first requirement.")
			expect(updatedDocument).to.contain("Keep the tenth requirement.")
			expect(updatedDocument.indexOf("## Epic 1: First outcome")).to.be.lessThan(
				updatedDocument.indexOf("## Epic 2: Second revised outcome"),
			)
			expect(updatedDocument.indexOf("## Epic 2: Second revised outcome")).to.be.lessThan(
				updatedDocument.indexOf("## Epic 10: Tenth outcome"),
			)
			expect(Object.keys(resultObject).sort()).to.deep.equal(["epics", "identity", "persisted", "title"])
			expect(resultObject.persisted).to.equal(true)
			expect(resultObject.identity).to.equal("2")
			expect(resultObject.title).to.equal("Second revised outcome")
			expect(epics).to.deep.equal([
				{ identity: "1", title: "First outcome", "story-index-generated": false },
				{ identity: "2", title: "Second revised outcome", "story-index-generated": false },
				{ identity: "10", title: "Tenth outcome", "story-index-generated": false },
			])
			expect(harness.config.taskState.fileReadCache.has(outputPath.toLowerCase())).to.equal(false)
			expect(harness.config.taskState.didEditFile).to.equal(true)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("rejects story, task, subtask, acceptance-criteria, and unsupported top-level fields", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project-one", "planning", "Epics.md")
			activateCreateEpicsSession(harness.config.taskState, { output_file: outputPath })
			const forbiddenParams = createValidParams()
			Reflect.set(forbiddenParams, "stories", ["Story 1"])
			Reflect.set(forbiddenParams, "tasks", ["Task 1"])
			Reflect.set(forbiddenParams, "subtasks", ["Subtask 1"])
			Reflect.set(forbiddenParams, "acceptance_criteria", ["Criterion 1"])
			const unsupportedParams = createValidParams()
			Reflect.set(unsupportedParams, "unsupported_top_level", "not allowed")

			const forbiddenResult = await harness.handler.execute(harness.config, createBlock(forbiddenParams, false))
			const unsupportedResult = await harness.handler.execute(harness.config, createBlock(unsupportedParams, false))

			expect(stringifyToolResponse(forbiddenResult)).to.contain(
				"Unsupported parameter(s) for upsert_epic: acceptance_criteria, stories, subtasks, tasks",
			)
			expect(stringifyToolResponse(forbiddenResult)).to.contain(
				"upsert_epic cannot create stories, tasks, subtasks, or acceptance criteria",
			)
			expect(stringifyToolResponse(unsupportedResult)).to.contain(
				"Unsupported parameter(s) for upsert_epic: unsupported_top_level",
			)
			sinon.assert.notCalled(harness.stubs.shouldAutoApproveToolWithPath)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("rejects clineignore-blocked output_file paths before approval, hooks, or mutation", async () => {
		const harness = await createHarness({ clineIgnoreContent: "project-one/planning/Epics.md\n" })
		try {
			const outputPath = path.join(harness.cwd, "project-one", "planning", "Epics.md")
			await fs.mkdir(path.dirname(outputPath), { recursive: true })
			await fs.writeFile(outputPath, EMPTY_EPICS_DOCUMENT, "utf8")
			activateCreateEpicsSession(harness.config.taskState, { output_file: outputPath })

			const result = await harness.handler.execute(harness.config, createBlock(createValidParams(), false))

			expect(stringifyToolResponse(result)).to.contain("Access to")
			expect(stringifyToolResponse(result)).to.contain("is blocked by the .clineignore file settings")
			expect(await fs.readFile(outputPath, "utf8")).to.equal(EMPTY_EPICS_DOCUMENT)
			expect(harness.config.taskState.didEditFile).to.equal(false)
			sinon.assert.notCalled(harness.stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(hookStub)
		} finally {
			await disposeHarness(harness)
		}
	})
})
