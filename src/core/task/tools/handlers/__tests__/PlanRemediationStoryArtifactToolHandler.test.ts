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
	WorkflowPlanRemediationStoryArtifactPreparation,
	WorkflowPlanRemediationStoryArtifactResult,
} from "@/core/task/workflow-runtime/WorkflowRuntime"
import { ClineDefaultTool } from "@/shared/tools"
import * as pathUtils from "@/utils/path"
import { ToolValidator } from "../../ToolValidator"
import type { TaskConfig } from "../../types/TaskConfig"
import { validateTaskConfig } from "../../types/TaskConfig"
import { ToolHookUtils } from "../../utils/ToolHookUtils"
import { PlanRemediationStoryArtifactToolHandler } from "../PlanRemediationStoryArtifactToolHandler"

interface PlanRemediationStoryArtifactHandlerConfigResult {
	config: TaskConfig
	preparation: WorkflowPlanRemediationStoryArtifactPreparation
	result: WorkflowPlanRemediationStoryArtifactResult
	stubs: {
		ask: sinon.SinonStub
		preparePlanRemediationStoryArtifact: sinon.SinonStub
		planRemediationStoryArtifact: sinon.SinonStub
		shouldAutoApproveToolWithPath: sinon.SinonStub
	}
}

function createPlanRemediationStoryArtifactBlock(args?: {
	epicIdentity?: string
	targetStoryIdentity?: string
	includeEpicIdentity?: boolean
	includeTargetStoryIdentity?: boolean
	partial?: boolean
	unsupportedParam?: boolean
}): ToolUse {
	const params: ToolUse["params"] = {}
	if (args?.includeEpicIdentity !== false) {
		Object.assign(params, { epic_identity: args?.epicIdentity ?? "1" })
	}
	if (args?.includeTargetStoryIdentity !== false) {
		Object.assign(params, { target_story_identity: args?.targetStoryIdentity ?? "1.1" })
	}
	if (args?.unsupportedParam === true) {
		Object.assign(params, { story_title: "unsupported" })
	}

	return {
		type: "tool_use",
		name: ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT,
		params,
		partial: args?.partial ?? false,
		isNativeToolCall: true,
		call_id: "plan_remediation_story_artifact_1",
	}
}

function createPreparation(cwd: string): WorkflowPlanRemediationStoryArtifactPreparation {
	return {
		storyIndexAbsolutePath: path.join(cwd, "project-one", "implementation", "epic-1-stories.index.json"),
	}
}

function createResult(preparation: WorkflowPlanRemediationStoryArtifactPreparation): WorkflowPlanRemediationStoryArtifactResult {
	return {
		...preparation,
		appendedStoryIdentity: "1.1.1",
		storyIndex: {
			version: 1,
			stories: [
				{
					story_identity: "1.1",
					story_file_name: "Story-1-1.md",
					story_type: "primary",
					parent_story_identity: null,
					story_file_generated: true,
					status: "backlog",
				},
				{
					story_identity: "1.1.1",
					story_file_name: "Remediation-story-1-1-1.md",
					story_type: "remediation",
					parent_story_identity: "1.1",
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
}): PlanRemediationStoryArtifactHandlerConfigResult {
	const cwd = args?.cwd ?? path.join(process.cwd(), "tmp-plan-remediation-story-artifact-test")
	const taskState = args?.taskState ?? new TaskState()
	const preparation = createPreparation(cwd)
	const result = createResult(preparation)
	const ask = sinon.stub().resolves({ response: args?.askResponse ?? "yesButtonClicked" })
	const preparePlanRemediationStoryArtifact = sinon.stub().resolves(preparation)
	const planRemediationStoryArtifact = sinon.stub().resolves(result)
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
			preparePlanRemediationStoryArtifact,
			planRemediationStoryArtifact,
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
			preparePlanRemediationStoryArtifact,
			planRemediationStoryArtifact,
			shouldAutoApproveToolWithPath,
		},
	}
}

describe("PlanRemediationStoryArtifactToolHandler", () => {
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
		const handler = new PlanRemediationStoryArtifactToolHandler(createToolValidator(config.cwd))

		const missingEpicResult = await handler.execute(
			config,
			createPlanRemediationStoryArtifactBlock({ includeEpicIdentity: false }),
		)
		const missingTargetResult = await handler.execute(
			config,
			createPlanRemediationStoryArtifactBlock({ includeTargetStoryIdentity: false }),
		)

		expect(missingEpicResult).to.contain("Missing required parameter 'epic_identity'")
		expect(missingTargetResult).to.contain("Missing required parameter 'target_story_identity'")
		sinon.assert.notCalled(stubs.preparePlanRemediationStoryArtifact)
		sinon.assert.notCalled(stubs.planRemediationStoryArtifact)
	})

	it("rejects unsupported parameters before runtime preparation", async () => {
		const { config, stubs } = createConfig()
		const handler = new PlanRemediationStoryArtifactToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createPlanRemediationStoryArtifactBlock({ unsupportedParam: true }))

		expect(result).to.contain("Unsupported parameter(s) for plan_remediation_story_artifact: story_title")
		sinon.assert.notCalled(stubs.preparePlanRemediationStoryArtifact)
		sinon.assert.notCalled(stubs.planRemediationStoryArtifact)
	})

	it("returns a clineignore tool error before approval, hooks, or planning for blocked index paths", async () => {
		const cwd = await mkdtemp(path.join(tmpdir(), "plan-remediation-story-artifact-clineignore-test-"))
		const clineIgnoreController = new ClineIgnoreController(cwd)
		try {
			await writeFile(path.join(cwd, ".clineignore"), "project-one/implementation/epic-1-stories.index.json\n", "utf8")
			await clineIgnoreController.initialize()
			const { config, preparation, stubs } = createConfig({ cwd })
			const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
			const handler = new PlanRemediationStoryArtifactToolHandler(new ToolValidator(clineIgnoreController))

			const result = await handler.execute(config, createPlanRemediationStoryArtifactBlock())

			expect(result).to.equal(formatResponse.toolError(formatResponse.clineIgnoreError(preparation.storyIndexAbsolutePath)))
			sinon.assert.calledOnceWithExactly(stubs.preparePlanRemediationStoryArtifact, {
				taskState: config.taskState,
				epicIdentity: "1",
			})
			sinon.assert.notCalled(stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(stubs.ask)
			sinon.assert.notCalled(hookStub)
			sinon.assert.notCalled(stubs.planRemediationStoryArtifact)
		} finally {
			await clineIgnoreController.dispose()
			await rm(cwd, { recursive: true, force: true })
		}
	})

	it("delegates planning through the workflow runtime and returns structured success JSON", async () => {
		const { config, preparation, result: planningResult, stubs } = createConfig({ autoApprove: true })
		const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
		config.taskState.fileReadCache.set(preparation.storyIndexAbsolutePath.toLowerCase(), {
			readCount: 1,
			mtime: 1,
			snapshotText: "index",
		})
		const block = createPlanRemediationStoryArtifactBlock()
		const handler = new PlanRemediationStoryArtifactToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, block)

		sinon.assert.calledOnceWithExactly(stubs.preparePlanRemediationStoryArtifact, {
			taskState: config.taskState,
			epicIdentity: "1",
		})
		sinon.assert.calledOnceWithExactly(
			stubs.shouldAutoApproveToolWithPath,
			ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT,
			preparation.storyIndexAbsolutePath,
		)
		sinon.assert.calledOnceWithExactly(hookStub, config, block)
		sinon.assert.calledOnceWithExactly(stubs.planRemediationStoryArtifact, {
			taskState: config.taskState,
			epicIdentity: "1",
			targetStoryIdentity: "1.1",
			expectedStoryIndexAbsolutePath: preparation.storyIndexAbsolutePath,
		})
		expect(JSON.parse(result as string)).to.deep.equal({
			persisted: true,
			epic_identity: "1",
			target_story_identity: "1.1",
			story_index_absolute_path: preparation.storyIndexAbsolutePath,
			appended_story_identity: planningResult.appendedStoryIdentity,
			stories: planningResult.storyIndex.stories,
		})
		expect(config.taskState.fileReadCache.has(preparation.storyIndexAbsolutePath.toLowerCase())).to.equal(false)
		expect(config.taskState.didEditFile).to.equal(true)
		expect(config.taskState.consecutiveMistakeCount).to.equal(0)
	})
})
