import type { ToolUse } from "@core/assistant-message"
import { expect } from "chai"
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises"
import { afterEach, describe, it } from "mocha"
import { tmpdir } from "os"
import path from "path"
import sinon from "sinon"
import { ClineIgnoreController } from "@/core/ignore/ClineIgnoreController"
import type { ToolResponse } from "@/core/task"
import { TaskState } from "@/core/task/TaskState"
import type { ActiveWorkflowSession, WorkflowValues } from "@/core/task/workflow-runtime/types"
import { ClineDefaultTool } from "@/shared/tools"
import { getBackendWorkflowToolContract } from "../../backendWorkflowToolContracts"
import { ResponseToolRegistry } from "../../response/ResponseToolRegistry"
import { ToolValidator, type ValidationResult } from "../../ToolValidator"
import type { TaskConfig } from "../../types/TaskConfig"
import { validateTaskConfig } from "../../types/TaskConfig"
import {
	type DevStoryGitCommandCall,
	type DevStoryGitCommandResult,
	type DevStoryGitCommandRunner,
	DevStoryGitFinalizeToolHandler,
} from "../DevStoryGitFinalizeToolHandler"

interface DevStoryGitFinalizeHarness {
	cwd: string
	projectRoot: string
	storiesIndex: string
	reviewStory: string
	backlogStory: string
	config: TaskConfig
	taskState: TaskState
	validator: FakeToolValidator
	runner: FakeDevStoryGitRunner
	applyWorkflowValueWrites: sinon.SinonStub
}

interface ApplyWorkflowValueWritesArgs {
	taskState: TaskState
	values: WorkflowValues
	clearKeys?: readonly string[]
}

interface ApplyWorkflowValueWritesResult {
	changedValues: WorkflowValues
	unchangedValues: WorkflowValues
	clearedKeys: readonly string[]
	unchangedClearKeys: readonly string[]
}

const cleanupPaths: string[] = []

class FakeToolValidator extends ToolValidator {
	private readonly blockedPaths = new Set<string>()
	readonly checkedPaths: string[] = []

	constructor(cwd: string) {
		super(new ClineIgnoreController(cwd))
	}

	blockPath(filePath: string): void {
		this.blockedPaths.add(path.normalize(filePath))
	}

	override checkClineIgnorePath(filePath: string): ValidationResult {
		const normalizedPath = path.normalize(filePath)
		this.checkedPaths.push(normalizedPath)
		if (this.blockedPaths.has(normalizedPath)) {
			return {
				ok: false,
				error: `Access to path '${normalizedPath}' is blocked by .clineignore settings.`,
			}
		}

		return { ok: true }
	}
}

class FakeDevStoryGitRunner {
	readonly calls: DevStoryGitCommandCall[] = []
	private readonly queuedResults: DevStoryGitCommandResult[] = []

	readonly run: DevStoryGitCommandRunner = async (call: DevStoryGitCommandCall): Promise<DevStoryGitCommandResult> => {
		this.calls.push({
			cwd: call.cwd,
			args: [...call.args],
		})

		return this.queuedResults.shift() ?? { exitCode: 0, stdout: "", stderr: "" }
	}

	enqueue(result: DevStoryGitCommandResult): void {
		this.queuedResults.push(result)
	}
}

afterEach(async () => {
	for (const cleanupPath of cleanupPaths.splice(0)) {
		await rm(cleanupPath, { recursive: true, force: true })
	}
})

function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 4,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Project One",
			projectFolderName: "project-one",
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
			activeBranchId: "step-4",
		},
	}
}

function createToolBlock(operation: string): ToolUse {
	return {
		type: "tool_use",
		name: ClineDefaultTool.DEV_STORY_GIT_FINALIZE,
		params: { operation },
		partial: false,
		isNativeToolCall: true,
		call_id: `dev_story_git_finalize_${operation}`,
	}
}

function createStoryMarkdown(allowedFiles: readonly string[]): string {
	const allowedFileLines = allowedFiles.map((allowedFile) => `  - ${allowedFile}`).join("\n")
	return `# Story 1.1

## General Instructions
Follow the implementation story.

## Objective
Implement the requested change.

## Scope
Touch only allowed files.

## Scope Boundary
Do not modify unrelated files.

## Requirements
Meet the story requirements.

## Known Issues/ Risks/ Technical Debt
None.

## Tasks
- [x] Task 1. Complete implementation
  Allowed files:
${allowedFileLines}
`
}

function createStoryIndexJson(): string {
	return `${JSON.stringify(
		{
			version: 1,
			stories: [
				{
					story_identity: "1.1",
					story_file_name: "Story-1-1.md",
					story_type: "primary",
					parent_story_identity: null,
					story_file_generated: true,
					status: "review",
				},
			],
		},
		undefined,
		2,
	)}\n`
}

function createConfig(args: { cwd: string; taskState: TaskState; applyWorkflowValueWrites: sinon.SinonStub }): TaskConfig {
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
	}
	const config = {
		taskId: "task-dev-story-git-finalize",
		ulid: "ulid-dev-story-git-finalize",
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
			applyWorkflowValueWrites: args.applyWorkflowValueWrites,
		},
		coordinator: {
			getHandler: sinon.stub(),
		},
	}
	validateTaskConfig(config)
	return config
}

async function createHarness(args?: {
	allowedFiles?: readonly string[]
	workflowValues?: WorkflowValues
	storyIndexJson?: string
}): Promise<DevStoryGitFinalizeHarness> {
	const cwd = await mkdtemp(path.join(tmpdir(), "dev-story-git-finalize-"))
	cleanupPaths.push(cwd)
	const projectRoot = path.join(cwd, "project-one")
	const storiesIndex = path.join(projectRoot, "implementation", "epic-1-stories.index.json")
	const reviewStory = path.join(projectRoot, "implementation", "stories-review", "Story-1-1.md")
	const backlogStory = path.join(projectRoot, "implementation", "stories-backlog", "Story-1-1.md")
	await mkdir(path.dirname(reviewStory), { recursive: true })
	await mkdir(path.dirname(backlogStory), { recursive: true })
	await writeFile(reviewStory, createStoryMarkdown(args?.allowedFiles ?? ["src/allowed.ts"]), "utf8")
	await writeFile(storiesIndex, args?.storyIndexJson ?? createStoryIndexJson(), "utf8")

	const workflowValues: WorkflowValues = {
		target_story_filename: "Story-1-1.md",
		selected_story_identity: "1.1",
		stories_index: storiesIndex,
		...(args?.workflowValues ?? {}),
	}
	const taskState = new TaskState()
	taskState.activeWorkflowName = "dev-story"
	taskState.activeWorkflowSession = createSession(workflowValues)
	const applyWorkflowValueWrites = sinon
		.stub()
		.callsFake(async (writeArgs: ApplyWorkflowValueWritesArgs): Promise<ApplyWorkflowValueWritesResult> => {
			const session = writeArgs.taskState.activeWorkflowSession
			if (session !== undefined) {
				for (const [key, value] of Object.entries(writeArgs.values)) {
					session.workflowValues[key] = value
				}
			}
			return {
				changedValues: writeArgs.values,
				unchangedValues: {},
				clearedKeys: [],
				unchangedClearKeys: writeArgs.clearKeys ?? [],
			}
		})
	const config = createConfig({ cwd, taskState, applyWorkflowValueWrites })
	const validator = new FakeToolValidator(cwd)
	const runner = new FakeDevStoryGitRunner()

	return {
		cwd,
		projectRoot,
		storiesIndex,
		reviewStory,
		backlogStory,
		config,
		taskState,
		validator,
		runner,
		applyWorkflowValueWrites,
	}
}

function createHandler(harness: DevStoryGitFinalizeHarness): DevStoryGitFinalizeToolHandler {
	return new DevStoryGitFinalizeToolHandler(harness.validator, harness.runner.run)
}

function parseJsonToolResult(response: ToolResponse): Record<string, unknown> {
	if (typeof response !== "string") {
		throw new Error("Expected string tool response.")
	}
	const parsed: unknown = JSON.parse(response)
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error("Expected JSON object tool response.")
	}
	return Object.fromEntries(Object.entries(parsed))
}

function expectToolError(response: ToolResponse, expectedText: string): void {
	if (typeof response !== "string") {
		throw new Error("Expected string tool response.")
	}
	expect(response).to.contain(expectedText)
}

describe("DevStoryGitFinalizeToolHandler", () => {
	it("registers backend-only contract and response metadata", () => {
		const contract = getBackendWorkflowToolContract(ClineDefaultTool.DEV_STORY_GIT_FINALIZE)

		expect(contract).to.deep.equal({
			id: ClineDefaultTool.DEV_STORY_GIT_FINALIZE,
			name: "dev_story_git_finalize",
			parameters: [
				{
					name: "operation",
					required: true,
					type: "string",
					description: "Dev-story git finalization operation prepared by WorkflowRuntime.",
				},
			],
		})
		expect(ResponseToolRegistry.get(ClineDefaultTool.DEV_STORY_GIT_FINALIZE)).to.equal(undefined)
		expect(ResponseToolRegistry.isResponseTool(ClineDefaultTool.DEV_STORY_GIT_FINALIZE)).to.equal(false)
	})

	it("prepares staging for accepted statuses, ignores ignored records, restores staged unpermitted paths, and writes workflow values", async () => {
		const harness = await createHarness({
			allowedFiles: ["src/modified.ts", "src/added.ts", "src/deleted.ts", "src/type.ts", "src/untracked.ts"],
		})
		harness.runner.enqueue({
			exitCode: 0,
			stdout: [
				" M src/modified.ts",
				"A  src/added.ts",
				" D src/deleted.ts",
				" T src/type.ts",
				"?? src/untracked.ts",
				"!! ignored.log",
				" M src/unpermitted.ts",
				"M  src/staged-unpermitted.ts",
				" D project-one/implementation/stories-backlog/Story-1-1.md",
				"?? project-one/implementation/stories-review/Story-1-1.md",
				" M project-one/implementation/epic-1-stories.index.json",
				"",
			].join("\0"),
			stderr: "",
		})
		harness.runner.enqueue({ exitCode: 0, stdout: "", stderr: "" })
		harness.runner.enqueue({ exitCode: 0, stdout: "", stderr: "" })
		const handler = createHandler(harness)

		const result = await handler.execute(harness.config, createToolBlock("prepare_staging"))

		expect(harness.runner.calls).to.deep.equal([
			{
				cwd: harness.cwd,
				args: ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
			},
			{
				cwd: harness.cwd,
				args: [
					"add",
					"-A",
					"--",
					"src/modified.ts",
					"src/added.ts",
					"src/deleted.ts",
					"src/type.ts",
					"src/untracked.ts",
					"project-one/implementation/stories-backlog/Story-1-1.md",
					"project-one/implementation/stories-review/Story-1-1.md",
					"project-one/implementation/epic-1-stories.index.json",
				],
			},
			{
				cwd: harness.cwd,
				args: ["restore", "--staged", "--", "src/staged-unpermitted.ts"],
			},
		])
		sinon.assert.calledOnce(harness.applyWorkflowValueWrites)
		expect(harness.applyWorkflowValueWrites.firstCall.args[0]).to.deep.equal({
			taskState: harness.taskState,
			values: {
				unpermitted_file_paths: ["src/unpermitted.ts", "src/staged-unpermitted.ts"],
			},
		})
		expect(harness.taskState.activeWorkflowSession?.workflowValues.unpermitted_file_paths).to.deep.equal([
			"src/unpermitted.ts",
			"src/staged-unpermitted.ts",
		])
		expect(parseJsonToolResult(result)).to.deep.include({
			operation: "prepare_staging",
		})
	})

	it("stages selected unpermitted paths with exact runner args", async () => {
		const harness = await createHarness({
			workflowValues: {
				unpermitted_file_paths: ["src/unpermitted.ts", "src/second.ts"],
				selected_unpermitted_file_paths: ["src/unpermitted.ts", "src/second.ts"],
			},
		})
		harness.runner.enqueue({ exitCode: 0, stdout: "", stderr: "" })
		const handler = createHandler(harness)

		const result = await handler.execute(harness.config, createToolBlock("stage_selected_unpermitted"))

		expect(harness.runner.calls).to.deep.equal([
			{
				cwd: harness.cwd,
				args: ["add", "-A", "--", "src/unpermitted.ts", "src/second.ts"],
			},
		])
		expect(parseJsonToolResult(result)).to.deep.equal({
			operation: "stage_selected_unpermitted",
			staged_file_paths: ["src/unpermitted.ts", "src/second.ts"],
		})
	})

	it("returns success without git add when selected unpermitted paths are empty", async () => {
		const harness = await createHarness({
			workflowValues: {
				unpermitted_file_paths: ["src/unpermitted.ts"],
				selected_unpermitted_file_paths: [],
			},
		})
		const handler = createHandler(harness)

		const result = await handler.execute(harness.config, createToolBlock("stage_selected_unpermitted"))

		expect(harness.runner.calls).to.deep.equal([])
		expect(parseJsonToolResult(result)).to.deep.equal({
			operation: "stage_selected_unpermitted",
			staged_file_paths: [],
		})
	})

	it("rejects selected unpermitted paths that were not persisted before runner calls", async () => {
		const harness = await createHarness({
			workflowValues: {
				unpermitted_file_paths: ["src/unpermitted.ts"],
				selected_unpermitted_file_paths: ["src/not-persisted.ts"],
			},
		})
		const handler = createHandler(harness)

		const result = await handler.execute(harness.config, createToolBlock("stage_selected_unpermitted"))

		expectToolError(result, "not present in latest persisted unpermitted_file_paths")
		expect(harness.runner.calls).to.deep.equal([])
	})

	it("skips diff and commit when commit_staged_files is false", async () => {
		const harness = await createHarness({
			workflowValues: {
				commit_staged_files: false,
			},
		})
		const handler = createHandler(harness)

		const result = await handler.execute(harness.config, createToolBlock("commit_staged"))

		expect(harness.runner.calls).to.deep.equal([])
		expect(parseJsonToolResult(result)).to.deep.equal({
			operation: "commit_staged",
			story_identity: "1.1",
			committed: false,
		})
	})

	it("commits staged files with exact diff and commit runner args", async () => {
		const harness = await createHarness({
			workflowValues: {
				commit_staged_files: true,
			},
		})
		harness.runner.enqueue({ exitCode: 1, stdout: "", stderr: "" })
		harness.runner.enqueue({ exitCode: 0, stdout: "committed", stderr: "" })
		const handler = createHandler(harness)

		const result = await handler.execute(harness.config, createToolBlock("commit_staged"))

		expect(harness.runner.calls).to.deep.equal([
			{
				cwd: harness.cwd,
				args: ["diff", "--cached", "--quiet"],
			},
			{
				cwd: harness.cwd,
				args: ["commit", "-m", "dev-story workflow run: story: 1.1"],
			},
		])
		expect(parseJsonToolResult(result)).to.deep.equal({
			operation: "commit_staged",
			story_identity: "1.1",
			committed: true,
		})
	})

	it("rejects invalid operations and missing workflow values before runner calls", async () => {
		const invalidHarness = await createHarness()
		const invalidResult = await createHandler(invalidHarness).execute(
			invalidHarness.config,
			createToolBlock("unknown_operation"),
		)

		expectToolError(invalidResult, "unsupported operation")
		expect(invalidHarness.runner.calls).to.deep.equal([])

		const missingValueHarness = await createHarness()
		const session = missingValueHarness.taskState.activeWorkflowSession
		if (session === undefined) {
			throw new Error("Expected active dev-story session.")
		}
		session.workflowValues.commit_staged_files = true
		delete session.workflowValues.selected_story_identity
		const missingResult = await createHandler(missingValueHarness).execute(
			missingValueHarness.config,
			createToolBlock("commit_staged"),
		)

		expectToolError(missingResult, "selected_story_identity")
		expect(missingValueHarness.runner.calls).to.deep.equal([])
	})

	it("rejects blocked target story paths before runner calls", async () => {
		const harness = await createHarness()
		harness.validator.blockPath(harness.reviewStory)
		const handler = createHandler(harness)

		const result = await handler.execute(harness.config, createToolBlock("prepare_staging"))

		expectToolError(result, "target story path")
		expectToolError(result, "blocked")
		expect(harness.runner.calls).to.deep.equal([])
	})

	it("rejects out-of-root allowed files before runner calls", async () => {
		const outsideAllowedFile = path.join(tmpdir(), "outside-dev-story-file.ts")
		const harness = await createHarness({
			allowedFiles: [outsideAllowedFile],
		})
		const handler = createHandler(harness)

		const result = await handler.execute(harness.config, createToolBlock("prepare_staging"))

		expectToolError(result, "allowed-file path")
		expectToolError(result, "outside git root")
		expect(harness.runner.calls).to.deep.equal([])
	})

	it("rejects no stageable files after ignored-only status", async () => {
		const harness = await createHarness()
		harness.runner.enqueue({
			exitCode: 0,
			stdout: ["!! ignored.log", ""].join("\0"),
			stderr: "",
		})
		const handler = createHandler(harness)

		const result = await handler.execute(harness.config, createToolBlock("prepare_staging"))

		expectToolError(result, "no allowed, selected, or required project-record files stageable")
		expect(harness.runner.calls).to.deep.equal([
			{
				cwd: harness.cwd,
				args: ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
			},
		])
	})

	it("rejects malformed story indexes before git status", async () => {
		const harness = await createHarness({
			storyIndexJson: "{",
		})
		const handler = createHandler(harness)

		const result = await handler.execute(harness.config, createToolBlock("prepare_staging"))

		expectToolError(result, "story index path")
		expectToolError(result, "malformed")
		expect(harness.runner.calls).to.deep.equal([])
	})

	for (const rejectedCase of [
		{ label: "malformed", record: "M", expected: "malformed git status record" },
		{ label: "unmerged", record: "UU src/conflict.ts", expected: "unmerged git status" },
		{ label: "rename", record: "R  src/new.ts", expected: "rename git status" },
		{ label: "copy", record: "C  src/copied.ts", expected: "copy git status" },
	]) {
		it(`rejects ${rejectedCase.label} porcelain records`, async () => {
			const harness = await createHarness()
			harness.runner.enqueue({
				exitCode: 0,
				stdout: `${rejectedCase.record}\0`,
				stderr: "",
			})
			const handler = createHandler(harness)

			const result = await handler.execute(harness.config, createToolBlock("prepare_staging"))

			expectToolError(result, rejectedCase.expected)
			expect(harness.runner.calls).to.deep.equal([
				{
					cwd: harness.cwd,
					args: ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
				},
			])
		})
	}

	it("routes git and commit failures to tool failures with concrete reasons", async () => {
		const statusFailureHarness = await createHarness()
		statusFailureHarness.runner.enqueue({
			exitCode: 2,
			stdout: "",
			stderr: "fatal: not a git repository",
		})

		const statusFailure = await createHandler(statusFailureHarness).execute(
			statusFailureHarness.config,
			createToolBlock("prepare_staging"),
		)

		expectToolError(statusFailure, "git status failed")
		expectToolError(statusFailure, "fatal: not a git repository")

		const commitFailureHarness = await createHarness({
			workflowValues: {
				commit_staged_files: true,
			},
		})
		commitFailureHarness.runner.enqueue({ exitCode: 1, stdout: "", stderr: "" })
		commitFailureHarness.runner.enqueue({ exitCode: 128, stdout: "", stderr: "fatal: unable to auto-detect email" })

		const commitFailure = await createHandler(commitFailureHarness).execute(
			commitFailureHarness.config,
			createToolBlock("commit_staged"),
		)

		expectToolError(commitFailure, "git commit failed for story 1.1")
		expectToolError(commitFailure, "fatal: unable to auto-detect email")
		expect(commitFailureHarness.runner.calls).to.deep.equal([
			{
				cwd: commitFailureHarness.cwd,
				args: ["diff", "--cached", "--quiet"],
			},
			{
				cwd: commitFailureHarness.cwd,
				args: ["commit", "-m", "dev-story workflow run: story: 1.1"],
			},
		])
	})
})
