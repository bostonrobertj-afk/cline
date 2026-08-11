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
import { RecordFindingsToolHandler } from "../RecordFindingsToolHandler"

const BASE_FINDINGS_DOCUMENT = [
	"# Code Review Findings",
	"",
	"## Task Failures",
	"",
	"## Dev Agent Failures",
	"",
	"## Upstream Failures",
	"",
].join("\n")

type RecordFindingJsonInput = Readonly<Record<string, unknown>>

interface RecordFindingsHandlerTestHarness {
	config: TaskConfig
	handler: RecordFindingsToolHandler
	cwd: string
	clineIgnoreController: ClineIgnoreController
	stubs: {
		shouldAutoApproveToolWithPath: sinon.SinonStub
	}
}

interface RecordFindingsHandlerConfigResult {
	config: TaskConfig
	stubs: {
		shouldAutoApproveToolWithPath: sinon.SinonStub
	}
}

function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 3,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Code Review Project",
			projectFolderName: "code-review-project",
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
			activeBranchId: "step-3",
		},
	}
}

function activateCodeReviewSession(taskState: TaskState, workflowValues: WorkflowValues): void {
	taskState.activeWorkflowName = "code-review"
	taskState.activeWorkflowSession = createSession(workflowValues)
}

function createFinding(args: { finding: string; categories: readonly string[]; description: string }): RecordFindingJsonInput {
	return {
		finding: args.finding,
		categories: args.categories,
		description: args.description,
	}
}

function createParams(findings: readonly RecordFindingJsonInput[]): ToolUse["params"] {
	return {
		findings: JSON.stringify(findings),
	}
}

function createBlock(params: ToolUse["params"], partial: boolean): ToolUse {
	return {
		type: "tool_use",
		name: ClineDefaultTool.RECORD_FINDINGS,
		params,
		partial,
		isNativeToolCall: true,
		call_id: "record_findings_1",
	}
}

function createConfig(args: {
	cwd: string
	clineIgnoreController: ClineIgnoreController
	taskState: TaskState
	autoApprove: boolean
}): RecordFindingsHandlerConfigResult {
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
}): Promise<RecordFindingsHandlerTestHarness> {
	const cwd = await fs.mkdtemp(path.join(tmpdir(), "record-findings-tool-handler-test-"))
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
	const handler = new RecordFindingsToolHandler(new ToolValidator(clineIgnoreController))
	return {
		config: configResult.config,
		handler,
		cwd,
		clineIgnoreController,
		stubs: configResult.stubs,
	}
}

async function disposeHarness(harness: RecordFindingsHandlerTestHarness): Promise<void> {
	await harness.clineIgnoreController.dispose()
	await fs.rm(harness.cwd, { recursive: true, force: true })
}

async function writeFindingsDocument(filePath: string, content: string = BASE_FINDINGS_DOCUMENT): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true })
	await fs.writeFile(filePath, content, "utf8")
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

function countOccurrences(value: string, needle: string): number {
	return value.split(needle).length - 1
}

function readSection(markdown: string, heading: string): string {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n")
	const start = lines.findIndex((line) => line === heading)
	if (start === -1) {
		throw new Error(`Missing heading ${heading}.`)
	}

	let end = lines.length
	for (let lineIndex = start + 1; lineIndex < lines.length; lineIndex += 1) {
		if (/^##\s+/.test(lines[lineIndex])) {
			end = lineIndex
			break
		}
	}

	return lines.slice(start, end).join("\n")
}

describe("RecordFindingsToolHandler", () => {
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

	it("rejects calls outside an active code-review workflow session", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project", "code-review-1-1.md")
			await writeFindingsDocument(outputPath)

			const result = await harness.handler.execute(
				harness.config,
				createBlock(
					createParams([
						createFinding({
							finding: "Story task missed",
							categories: ["task_failure"],
							description: "The story did not prescribe a required revision.",
						}),
					]),
					false,
				),
			)

			expect(stringifyToolResponse(result)).to.contain("active code-review workflow session")
			expect(await fs.readFile(outputPath, "utf8")).to.equal(BASE_FINDINGS_DOCUMENT)
			sinon.assert.notCalled(harness.stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(hookStub)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("rejects a missing code_review_output workflow value before file access", async () => {
		const harness = await createHarness()
		try {
			activateCodeReviewSession(harness.config.taskState, {})

			const result = await harness.handler.execute(harness.config, createBlock(createParams([]), false))

			expect(stringifyToolResponse(result)).to.contain("Workflow value 'code_review_output' must be a non-empty string")
			sinon.assert.notCalled(harness.stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(hookStub)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("rejects clineignore-blocked code_review_output paths before approval or mutation", async () => {
		const harness = await createHarness({ clineIgnoreContent: "project/code-review-1-1.md\n" })
		try {
			const outputPath = path.join(harness.cwd, "project", "code-review-1-1.md")
			await writeFindingsDocument(outputPath)
			activateCodeReviewSession(harness.config.taskState, { code_review_output: outputPath })

			const result = await harness.handler.execute(
				harness.config,
				createBlock(
					createParams([
						createFinding({
							finding: "Blocked write",
							categories: ["task_failure"],
							description: "This should not be written.",
						}),
					]),
					false,
				),
			)

			expect(stringifyToolResponse(result)).to.contain("Access to")
			expect(stringifyToolResponse(result)).to.contain("is blocked by the .clineignore file settings")
			expect(await fs.readFile(outputPath, "utf8")).to.equal(BASE_FINDINGS_DOCUMENT)
			expect(harness.config.taskState.didEditFile).to.equal(false)
			sinon.assert.notCalled(harness.stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(hookStub)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("rejects a missing code_review_output file", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project", "code-review-1-1.md")
			activateCodeReviewSession(harness.config.taskState, { code_review_output: outputPath })

			const result = await harness.handler.execute(harness.config, createBlock(createParams([]), false))

			expect(stringifyToolResponse(result)).to.contain("ENOENT")
			sinon.assert.notCalled(harness.stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(hookStub)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("rejects documents missing required findings headings without mutation", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project", "code-review-1-1.md")
			const incompleteDocument = ["# Code Review Findings", "", "## Task Failures", ""].join("\n")
			await writeFindingsDocument(outputPath, incompleteDocument)
			activateCodeReviewSession(harness.config.taskState, { code_review_output: outputPath })

			const result = await harness.handler.execute(
				harness.config,
				createBlock(
					createParams([
						createFinding({
							finding: "Missing implementation",
							categories: ["task_failure"],
							description: "The required implementation is absent.",
						}),
					]),
					false,
				),
			)

			expect(stringifyToolResponse(result)).to.contain("missing required heading")
			expect(await fs.readFile(outputPath, "utf8")).to.equal(incompleteDocument)
			sinon.assert.notCalled(harness.stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(hookStub)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("rejects unsupported categories and malformed finding entries without mutation", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project", "code-review-1-1.md")
			await writeFindingsDocument(outputPath)
			activateCodeReviewSession(harness.config.taskState, { code_review_output: outputPath })

			const unsupportedCategoryResult = await harness.handler.execute(
				harness.config,
				createBlock(
					createParams([
						createFinding({
							finding: "Unsupported category",
							categories: ["not_supported"],
							description: "This category should fail.",
						}),
					]),
					false,
				),
			)
			const malformedEntryResult = await harness.handler.execute(
				harness.config,
				createBlock(
					createParams([
						{
							finding: "Missing description",
							categories: ["task_failure"],
						},
					]),
					false,
				),
			)

			expect(stringifyToolResponse(unsupportedCategoryResult)).to.contain(
				"must be one of task_failure, dev_agent_failure, or upstream_failure",
			)
			expect(stringifyToolResponse(malformedEntryResult)).to.contain(
				"Parameter 'findings[0].description' must be a string.",
			)
			expect(await fs.readFile(outputPath, "utf8")).to.equal(BASE_FINDINGS_DOCUMENT)
			sinon.assert.notCalled(harness.stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(hookStub)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("returns empty-array no-op success without writing", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project", "code-review-1-1.md")
			await writeFindingsDocument(outputPath)
			activateCodeReviewSession(harness.config.taskState, { code_review_output: outputPath })
			harness.config.taskState.consecutiveMistakeCount = 3

			const result = await harness.handler.execute(harness.config, createBlock(createParams([]), false))
			const resultObject = parseJsonObjectResponse(result)

			expect(Object.keys(resultObject).sort()).to.deep.equal(["recordedFindingCount", "updatedHeadings"])
			expect(resultObject.recordedFindingCount).to.equal(0)
			expect(resultObject.updatedHeadings).to.deep.equal([])
			expect(await fs.readFile(outputPath, "utf8")).to.equal(BASE_FINDINGS_DOCUMENT)
			expect(harness.config.taskState.didEditFile).to.equal(false)
			expect(harness.config.taskState.consecutiveMistakeCount).to.equal(0)
			sinon.assert.notCalled(harness.stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(hookStub)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("appends a single-category finding, clears cache, and returns exact result keys without raw content", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project", "code-review-1-1.md")
			await writeFindingsDocument(outputPath)
			activateCodeReviewSession(harness.config.taskState, { code_review_output: outputPath })
			harness.config.taskState.fileReadCache.set(outputPath.toLowerCase(), {
				readCount: 1,
				mtime: 1,
				snapshotText: BASE_FINDINGS_DOCUMENT,
			})
			harness.config.taskState.consecutiveMistakeCount = 2

			const result = await harness.handler.execute(
				harness.config,
				createBlock(
					createParams([
						createFinding({
							finding: "Task omitted validation command",
							categories: ["task_failure"],
							description: "Subtask 2.3 did not prescribe the required validation command.",
						}),
					]),
					false,
				),
			)
			const resultText = stringifyToolResponse(result)
			const resultObject = parseJsonObjectResponse(result)
			const updatedDocument = await fs.readFile(outputPath, "utf8")

			expect(Object.keys(resultObject).sort()).to.deep.equal(["recordedFindingCount", "updatedHeadings"])
			expect(resultObject.recordedFindingCount).to.equal(1)
			expect(resultObject.updatedHeadings).to.deep.equal(["## Task Failures"])
			expect(resultText).not.to.contain("Subtask 2.3 did not prescribe")
			expect(resultText).not.to.contain("# Code Review Findings")
			expect(readSection(updatedDocument, "## Task Failures")).to.contain(
				[
					"### Task omitted validation command",
					"",
					"Subtask 2.3 did not prescribe the required validation command.",
				].join("\n"),
			)
			expect(readSection(updatedDocument, "## Dev Agent Failures")).not.to.contain("Task omitted validation command")
			expect(readSection(updatedDocument, "## Upstream Failures")).not.to.contain("Task omitted validation command")
			expect(harness.config.taskState.fileReadCache.has(outputPath.toLowerCase())).to.equal(false)
			expect(harness.config.taskState.didEditFile).to.equal(true)
			expect(harness.config.taskState.consecutiveMistakeCount).to.equal(0)
			sinon.assert.calledWithExactly(
				harness.stubs.shouldAutoApproveToolWithPath,
				ClineDefaultTool.RECORD_FINDINGS,
				outputPath,
			)
			sinon.assert.calledOnce(hookStub)
		} finally {
			await disposeHarness(harness)
		}
	})

	it("duplicates multi-category findings under each selected heading", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project", "code-review-1-1.md")
			await writeFindingsDocument(outputPath)
			activateCodeReviewSession(harness.config.taskState, { code_review_output: outputPath })

			const result = await harness.handler.execute(
				harness.config,
				createBlock(
					createParams([
						createFinding({
							finding: "Shared root cause",
							categories: ["task_failure", "upstream_failure"],
							description: "The task and project documents both underspecified the same behavior.",
						}),
					]),
					false,
				),
			)
			const resultObject = parseJsonObjectResponse(result)
			const updatedDocument = await fs.readFile(outputPath, "utf8")

			expect(resultObject.recordedFindingCount).to.equal(1)
			expect(resultObject.updatedHeadings).to.deep.equal(["## Task Failures", "## Upstream Failures"])
			expect(countOccurrences(updatedDocument, "### Shared root cause")).to.equal(2)
			expect(readSection(updatedDocument, "## Task Failures")).to.contain("### Shared root cause")
			expect(readSection(updatedDocument, "## Upstream Failures")).to.contain("### Shared root cause")
			expect(readSection(updatedDocument, "## Dev Agent Failures")).not.to.contain("### Shared root cause")
		} finally {
			await disposeHarness(harness)
		}
	})

	it("preserves existing findings and appends new blocks below the selected heading", async () => {
		const harness = await createHarness()
		try {
			const outputPath = path.join(harness.cwd, "project", "code-review-1-1.md")
			const existingDocument = [
				"# Code Review Findings",
				"",
				"## Task Failures",
				"",
				"### Existing task finding",
				"",
				"An existing task finding remains.",
				"",
				"## Dev Agent Failures",
				"",
				"### Existing dev finding",
				"",
				"An existing dev-agent finding remains.",
				"",
				"## Upstream Failures",
				"",
			].join("\n")
			await writeFindingsDocument(outputPath, existingDocument)
			activateCodeReviewSession(harness.config.taskState, { code_review_output: outputPath })

			await harness.handler.execute(
				harness.config,
				createBlock(
					createParams([
						createFinding({
							finding: "New dev-agent miss",
							categories: ["dev_agent_failure"],
							description: "The dev agent missed a required implementation detail.",
						}),
					]),
					false,
				),
			)
			const updatedDocument = await fs.readFile(outputPath, "utf8")
			const devSection = readSection(updatedDocument, "## Dev Agent Failures")

			expect(updatedDocument).to.contain("### Existing task finding")
			expect(updatedDocument).to.contain("### Existing dev finding")
			expect(devSection.indexOf("### Existing dev finding")).to.be.lessThan(devSection.indexOf("### New dev-agent miss"))
			expect(devSection).to.contain(
				["### New dev-agent miss", "", "The dev agent missed a required implementation detail."].join("\n"),
			)
			expect(readSection(updatedDocument, "## Task Failures")).not.to.contain("### New dev-agent miss")
			expect(readSection(updatedDocument, "## Upstream Failures")).not.to.contain("### New dev-agent miss")
		} finally {
			await disposeHarness(harness)
		}
	})
})
