import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import type { ToolUse } from "@/core/assistant-message"
import type { ClineMessage } from "@/shared/ExtensionMessage"
import { ClineDefaultTool } from "@/shared/tools"
import { WORKFLOW_PROGRESS_REQUEST_OPTIONS, WORKFLOW_PROGRESS_REQUEST_QUESTION } from "@/shared/workflow-progress-request"
import { formatResponse } from "../../../../prompts/responses"
import { TaskState } from "../../../TaskState"
import { RESPONSE_TOOL_SUCCESS_MESSAGE } from "../../response/types"
import type { TaskConfig } from "../../types/TaskConfig"
import { WorkflowProgressRequestToolHandler } from "../WorkflowProgressRequestToolHandler"

function createConfig(options?: {
	askResult?: { text?: string; images?: string[]; files?: string[] }
	lastFollowupMessage?: ClineMessage
}) {
	const taskState = new TaskState()
	const clineMessages: ClineMessage[] = options?.lastFollowupMessage ? [options.lastFollowupMessage] : []
	const sayStub = sinon.stub().resolves(undefined)
	const askStub = sinon.stub().resolves(options?.askResult ?? { text: "Yes" })
	const callbacks = {
		say: sayStub,
		ask: askStub,
		saveCheckpoint: sinon.stub().resolves(),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
		executeCommandTool: sinon.stub().resolves([false, "ok"]),
		cancelRunningCommandTool: sinon.stub().resolves(false),
		doesLatestTaskCompletionHaveNewChanges: sinon.stub().resolves(false),
		updateFCListFromToolResponse: sinon.stub().resolves({ accepted: true }),
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

	const saveClineMessagesAndUpdateHistory = sinon.stub().resolves()
	const isWorkflowProgressRequestAllowedStub = sinon.stub().returns(true)
	const submitWorkflowProgressRequestStub = sinon.stub().resolves({ kind: "project_prompt", promptProjection: {} })

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
		context: {},
		taskState,
		messageState: {
			getClineMessages: () => clineMessages,
			saveClineMessagesAndUpdateHistory,
		},
		api: {
			getModel: () => ({ id: "openai/gpt-5", info: {} }),
		},
		autoApprovalSettings: {
			enableNotifications: false,
			actions: { executeSafeCommands: false, executeAllCommands: false },
		},
		autoApprover: {
			shouldAutoApproveTool: sinon.stub().returns([false, false]),
		},
		browserSettings: {},
		focusChainSettings: {},
		services: {
			stateManager: {
				getGlobalSettingsKey: (key: string) => {
					if (key === "mode") return "act"
					if (key === "customPrompt") return undefined
					return undefined
				},
				getGlobalStateKey: () => undefined,
				getApiConfiguration: () => ({
					planModeApiProvider: "openai",
					actModeApiProvider: "openai",
				}),
			},
		},
		callbacks,
		workflowRuntime: {
			isWorkflowProgressRequestAllowed: isWorkflowProgressRequestAllowedStub,
			submitWorkflowProgressRequest: submitWorkflowProgressRequestStub,
		},
		coordinator: {
			getHandler: sinon.stub(),
		},
	} as unknown as TaskConfig

	return {
		config,
		stubs: {
			ask: askStub,
			say: sayStub,
			isWorkflowProgressRequestAllowed: isWorkflowProgressRequestAllowedStub,
			submitWorkflowProgressRequest: submitWorkflowProgressRequestStub,
			saveClineMessagesAndUpdateHistory,
		},
	}
}

function createWorkflowProgressRequestToolUse(): ToolUse {
	return { type: "tool_use", name: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST, params: {}, partial: false }
}

describe("WorkflowProgressRequestToolHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("queues selected Yes responses after completing the next workflow step", async () => {
		const lastFollowupMessage: ClineMessage = { ts: 1, type: "ask", ask: "followup", text: "{}" }
		const { config, stubs } = createConfig({
			askResult: { text: "Yes" },
			lastFollowupMessage,
		})
		const handler = new WorkflowProgressRequestToolHandler()

		const result = await handler.execute(config, createWorkflowProgressRequestToolUse())

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		sinon.assert.calledOnceWithExactly(stubs.isWorkflowProgressRequestAllowed, {
			taskState: config.taskState,
		})
		sinon.assert.calledOnceWithExactly(stubs.submitWorkflowProgressRequest, {
			taskState: config.taskState,
			approved: true,
		})
		assert.deepEqual(config.taskState.pendingResponseToolFollowup, {
			toolName: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			route: "normal_user_turn",
			text: "Yes",
			images: undefined,
			files: undefined,
		})
		assert.deepEqual(JSON.parse(lastFollowupMessage.text), {
			question: WORKFLOW_PROGRESS_REQUEST_QUESTION,
			options: [...WORKFLOW_PROGRESS_REQUEST_OPTIONS],
			selected: "Yes",
		})
	})

	it("queues selected No responses without advancing the workflow", async () => {
		const lastFollowupMessage: ClineMessage = { ts: 2, type: "ask", ask: "followup", text: "{}" }
		const { config, stubs } = createConfig({
			askResult: { text: "No" },
			lastFollowupMessage,
		})
		const handler = new WorkflowProgressRequestToolHandler()

		const result = await handler.execute(config, createWorkflowProgressRequestToolUse())

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		sinon.assert.calledOnceWithExactly(stubs.isWorkflowProgressRequestAllowed, {
			taskState: config.taskState,
		})
		sinon.assert.calledOnceWithExactly(stubs.submitWorkflowProgressRequest, {
			taskState: config.taskState,
			approved: false,
		})
		assert.deepEqual(config.taskState.pendingResponseToolFollowup, {
			toolName: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			route: "normal_user_turn",
			text: "No",
			images: undefined,
			files: undefined,
		})
	})

	it("returns a tool error when workflow progress request does not advance the active workflow step", async () => {
		const { config, stubs } = createConfig({
			askResult: { text: "Yes" },
		})
		stubs.submitWorkflowProgressRequest.resolves({ kind: "no_op" })
		const handler = new WorkflowProgressRequestToolHandler()

		const result = await handler.execute(config, createWorkflowProgressRequestToolUse())

		sinon.assert.calledOnceWithExactly(stubs.isWorkflowProgressRequestAllowed, {
			taskState: config.taskState,
		})
		sinon.assert.calledOnceWithExactly(stubs.submitWorkflowProgressRequest, {
			taskState: config.taskState,
			approved: true,
		})
		assert.equal(result, formatResponse.toolError("workflow_progress_request could not advance the active workflow step."))
		assert.equal(config.taskState.pendingResponseToolFollowup, undefined)
	})

	it("returns a tool error when runtime validation says no progress-approval path is available", async () => {
		const { config, stubs } = createConfig()
		stubs.isWorkflowProgressRequestAllowed.returns(false)
		const handler = new WorkflowProgressRequestToolHandler()

		const result = await handler.execute(config, createWorkflowProgressRequestToolUse())

		assert.equal(
			result,
			formatResponse.toolError(
				"workflow_progress_request can only be used when the active workflow state currently exposes a progress-approval path.",
			),
		)
		sinon.assert.calledOnceWithExactly(stubs.isWorkflowProgressRequestAllowed, {
			taskState: config.taskState,
		})
		sinon.assert.notCalled(stubs.ask)
		sinon.assert.notCalled(stubs.submitWorkflowProgressRequest)
	})
})
