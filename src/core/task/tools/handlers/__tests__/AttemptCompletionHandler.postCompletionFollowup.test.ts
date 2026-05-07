import { strict as assert } from "node:assert"
import type { ToolUse } from "@core/assistant-message"
import { PreToolUseHookCancellationError } from "@core/hooks/PreToolUseHookCancellationError"
import * as disk from "@core/storage/disk"
import * as notifications from "@integrations/notifications"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { Logger } from "@/shared/services/Logger"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../../../TaskState"
import type { ActiveWorkflowSession } from "../../../workflow-runtime/types"
import { WorkflowRuntime } from "../../../workflow-runtime/WorkflowRuntime"
import { RESPONSE_TOOL_SUCCESS_MESSAGE } from "../../response/types"
import type { TaskConfig } from "../../types/TaskConfig"
import { ToolHookUtils } from "../../utils/ToolHookUtils"
import { AttemptCompletionHandler } from "../AttemptCompletionHandler"

function createConfig(options?: { autoApproveCommand?: boolean; workflowRuntime?: TaskConfig["workflowRuntime"] }): {
	config: TaskConfig
	callbacks: Record<string, sinon.SinonStub>
	taskState: TaskState
} {
	const taskState = new TaskState()
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask: sinon.stub(),
		saveCheckpoint: sinon.stub().resolves(),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
		upsertPartialResponseToolSayPreview: sinon.stub().resolves(true),
		clearPartialResponseToolPreview: sinon.stub().resolves(false),
		executeCommandTool: sinon.stub().resolves([false, "ok"]),
		doesLatestTaskCompletionHaveNewChanges: sinon.stub().resolves(false),
		updateFCListFromToolResponse: sinon.stub().resolves(),
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
		taskId: "task-1",
		ulid: "ulid-1",
		cwd: "/tmp",
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
			getModel: () => ({ id: "gpt-5", info: {} }),
		},
		autoApprovalSettings: {
			enableNotifications: false,
			actions: { executeSafeCommands: false, executeAllCommands: false },
		},
		autoApprover: {
			shouldAutoApproveTool: sinon.stub().returns(options?.autoApproveCommand ? true : [false, false]),
		},
		browserSettings: {},
		focusChainSettings: { enabled: false },
		services: {
			stateManager: {
				getGlobalSettingsKey: (key: string) => {
					if (key === "hooksEnabled") return false
					if (key === "mode") return "act"
					if (key === "customPrompt") return undefined
					if (key === "maxConsecutiveMistakes") return 5
					if (key === "yoloModeToggled") return false
					if (key === "enableCheckpointsSetting") return false
					if (key === "focusChainSettings") return { enabled: false }
					return undefined
				},
				getGlobalStateKey: () => undefined,
				getWorkspaceStateKey: () => undefined,
				getRemoteConfigSettings: () => ({}),
				getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
			},
		},
		callbacks,
		workflowRuntime:
			options?.workflowRuntime ??
			new WorkflowRuntime({
				cwd: "/tmp",
				workspacePathPolicy: {
					validateAccess: () => true,
				},
			}),
		coordinator: {
			getHandler: sinon.stub(),
		},
	} as unknown as TaskConfig

	return { config, callbacks, taskState }
}

function createActiveWorkflowSession(): ActiveWorkflowSession {
	return {
		activeStepNumber: 4,
		workflowValues: {
			output_file: "/tmp/project/discovery/brainstorming.md",
		},
		projectSelection: {
			projectMode: "new",
			projectTitle: "Project",
			projectFolderName: "project",
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
		entryArtifactResolution: undefined,
		ui: {
			formSession: undefined,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: {
			activeBranchId: "project-prompt",
		},
	}
}

function createAttemptCompletionBlock(params: ToolUse["params"]): ToolUse {
	return {
		type: "tool_use",
		name: ClineDefaultTool.ATTEMPT,
		params,
		partial: false,
	}
}

function setActiveWorkflowState(taskState: TaskState): ActiveWorkflowSession {
	const session = createActiveWorkflowSession()
	taskState.activeWorkflowName = "brainstorming"
	taskState.activeWorkflowSession = session
	taskState.currentFocusChainChecklist = "- [ ] Organize Ideas & Plan Next Actions"
	return session
}

function assertActiveWorkflowStatePreserved(taskState: TaskState, session: ActiveWorkflowSession): void {
	assert.equal(taskState.activeWorkflowName, "brainstorming")
	assert.equal(taskState.activeWorkflowSession, session)
	assert.equal(taskState.currentFocusChainChecklist, "- [ ] Organize Ideas & Plan Next Actions")
}

describe("AttemptCompletionHandler post-completion follow-up", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("finalizes attempt_completion without opening a post-completion ask", async () => {
		const { config, callbacks, taskState } = createConfig()

		const handler = new AttemptCompletionHandler()
		const result = await handler.execute(config, {
			type: "tool_use",
			name: "attempt_completion",
			params: {
				result: "done",
			},
			partial: false,
		} as any)

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		sinon.assert.calledOnce(callbacks.clearPartialResponseToolPreview)
		sinon.assert.calledOnceWithExactly(callbacks.say, "completion_result", "done", undefined, undefined, false)
		sinon.assert.notCalled(callbacks.ask)
		sinon.assert.notCalled(callbacks.runUserPromptSubmitHook)
		assert.equal(taskState.pendingResponseToolFollowup, undefined)
		assert.equal(taskState.responseToolTurnShouldEnd, true)
		assert.equal(taskState.responseToolTurnCompletedBy, ClineDefaultTool.ATTEMPT)
	})

	it("clears active workflow state and queues teardown after successful attempt_completion", async () => {
		const { config, callbacks, taskState } = createConfig()
		setActiveWorkflowState(taskState)

		const handler = new AttemptCompletionHandler()
		const result = await handler.execute(
			config,
			createAttemptCompletionBlock({
				result: "Brainstorming complete.",
			}),
		)

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		assert.equal(taskState.activeWorkflowName, undefined)
		assert.equal(taskState.activeWorkflowSession, undefined)
		assert.equal(taskState.currentFocusChainChecklist, null)
		sinon.assert.calledOnceWithExactly(callbacks.queueWorkflowNextAction, { kind: "persist_workflow_teardown" })
	})

	it("preserves active workflow state when attempt_completion is denied, invalid, or failed", async () => {
		const invalidCase = createConfig()
		const invalidSession = setActiveWorkflowState(invalidCase.taskState)
		const handler = new AttemptCompletionHandler()

		const invalidResult = await handler.execute(invalidCase.config, createAttemptCompletionBlock({}))

		assert.notEqual(invalidResult, RESPONSE_TOOL_SUCCESS_MESSAGE)
		assertActiveWorkflowStatePreserved(invalidCase.taskState, invalidSession)
		sinon.assert.notCalled(invalidCase.callbacks.queueWorkflowNextAction)

		const deniedCase = createConfig()
		const deniedSession = setActiveWorkflowState(deniedCase.taskState)
		sinon.stub(ToolHookUtils, "runPreToolUseIfEnabled").rejects(new PreToolUseHookCancellationError("Denied by hook."))

		const deniedResult = await handler.execute(
			deniedCase.config,
			createAttemptCompletionBlock({
				result: "done",
			}),
		)

		assert.notEqual(deniedResult, RESPONSE_TOOL_SUCCESS_MESSAGE)
		assertActiveWorkflowStatePreserved(deniedCase.taskState, deniedSession)
		sinon.assert.notCalled(deniedCase.callbacks.queueWorkflowNextAction)
		sinon.restore()

		const failedCommandCase = createConfig({ autoApproveCommand: true })
		const failedCommandSession = setActiveWorkflowState(failedCommandCase.taskState)
		failedCommandCase.callbacks.executeCommandTool.resolves([true, "command failed"])

		const failedCommandResult = await handler.execute(
			failedCommandCase.config,
			createAttemptCompletionBlock({
				result: "done",
				command: "echo hi",
			}),
		)

		assert.equal(failedCommandResult, "command failed")
		assertActiveWorkflowStatePreserved(failedCommandCase.taskState, failedCommandSession)
		sinon.assert.notCalled(failedCommandCase.callbacks.queueWorkflowNextAction)
	})

	it("does not show task-complete system notifications", async () => {
		const { config, callbacks } = createConfig()
		config.autoApprovalSettings.enableNotifications = true
		const showSystemNotification = sinon.stub(notifications, "showSystemNotification")

		const handler = new AttemptCompletionHandler()
		const result = await handler.execute(config, {
			type: "tool_use",
			name: "attempt_completion",
			params: {
				result: "done",
			},
			partial: false,
		} as any)

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		sinon.assert.calledOnceWithExactly(callbacks.say, "completion_result", "done", undefined, undefined, false)
		sinon.assert.notCalled(callbacks.ask)
		sinon.assert.notCalled(showSystemNotification)
	})

	it("runs attempt_completion commands without opening blocking command_output asks", async () => {
		const { config, callbacks } = createConfig({ autoApproveCommand: true })

		const handler = new AttemptCompletionHandler()
		await handler.execute(config, {
			type: "tool_use",
			name: "attempt_completion",
			params: {
				result: "done",
				command: "echo hi",
			},
			partial: false,
		} as any)

		sinon.assert.calledWithExactly(callbacks.executeCommandTool, "echo hi", undefined, {
			suppressBlockingAsk: true,
		})
	})

	it("updates one completion preview row while the result is still streaming", async () => {
		const handler = new AttemptCompletionHandler()
		const uiHelpers = {
			removeClosingTag: sinon.stub().returns("Almost there"),
			upsertPartialResponseToolSayPreview: sinon.stub().resolves(true),
		} as any

		await handler.handlePartialBlock(
			{
				type: "tool_use",
				name: ClineDefaultTool.ATTEMPT,
				call_id: "call_attempt_completion",
				params: {
					result: "Almost there",
				},
				partial: true,
			} as any,
			uiHelpers,
		)

		sinon.assert.calledOnceWithExactly(
			uiHelpers.upsertPartialResponseToolSayPreview,
			sinon.match({
				name: ClineDefaultTool.ATTEMPT,
				call_id: "call_attempt_completion",
			}),
			"completion_result",
			"Almost there",
		)
	})

	it("emits agent_feedback after the completion_result row", async () => {
		sinon.stub(disk, "appendAgentFeedbackAuditEntry").resolves()
		sinon.stub(Logger, "info")
		const { config, callbacks } = createConfig()

		const handler = new AttemptCompletionHandler()
		const result = await handler.execute(config, {
			type: "tool_use",
			name: "attempt_completion",
			params: {
				result: "done",
				agent_feedback: {
					message: "Blocked on unstable behavior.",
				},
			},
			partial: false,
		} as any)

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		assert.equal(callbacks.say.firstCall.args[0], "completion_result")
		assert.equal(callbacks.say.secondCall.args[0], "agent_feedback")
	})
})
