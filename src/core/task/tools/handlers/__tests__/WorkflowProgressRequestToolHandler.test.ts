import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL } from "@/shared/focus-chain-utils"
import { ClineDefaultTool } from "@/shared/tools"
import { WORKFLOW_PROGRESS_REQUEST_OPTIONS, WORKFLOW_PROGRESS_REQUEST_QUESTION } from "@/shared/workflow-progress-request"
import { formatResponse } from "../../../../prompts/responses"
import { TaskState } from "../../../TaskState"
import { RESPONSE_TOOL_SUCCESS_MESSAGE } from "../../response/types"
import type { TaskConfig } from "../../types/TaskConfig"
import { WorkflowProgressRequestToolHandler } from "../WorkflowProgressRequestToolHandler"

function createConfig(options?: {
	askResult?: { text?: string; images?: string[]; files?: string[] }
	lastFollowupMessage?: any
}) {
	const taskState = new TaskState()
	const clineMessages = options?.lastFollowupMessage ? [options.lastFollowupMessage] : []
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask: sinon.stub().resolves(options?.askResult ?? { text: "Yes" }),
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
		coordinator: {
			getHandler: sinon.stub(),
		},
	} as unknown as TaskConfig

	return { config, callbacks }
}

describe("WorkflowProgressRequestToolHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("queues selected Yes responses after completing the next workflow step", async () => {
		const lastFollowupMessage = { ask: "followup", text: "{}" }
		const { config, callbacks } = createConfig({
			askResult: { text: "Yes" },
			lastFollowupMessage,
		})
		config.taskState.activePlaceholderWorkflowSource = { name: "create-epics.md" } as any
		config.taskState.currentFocusChainChecklist = "- [ ] Step 3: Discover and classify the project"
		const handler = new WorkflowProgressRequestToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "workflow_progress_request",
			params: {},
			partial: false,
		} as any)

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		sinon.assert.calledOnceWithExactly(callbacks.updateFCListFromToolResponse, FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL)
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
		const lastFollowupMessage = { ask: "followup", text: "{}" }
		const { config, callbacks } = createConfig({
			askResult: { text: "No" },
			lastFollowupMessage,
		})
		config.taskState.activePlaceholderWorkflowSource = { name: "create-prd.md" } as any
		config.taskState.currentFocusChainChecklist = "- [ ] Step 3: Discover and classify the project"
		const handler = new WorkflowProgressRequestToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "workflow_progress_request",
			params: {},
			partial: false,
		} as any)

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		sinon.assert.notCalled(callbacks.updateFCListFromToolResponse)
		assert.deepEqual(config.taskState.pendingResponseToolFollowup, {
			toolName: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			route: "normal_user_turn",
			text: "No",
			images: undefined,
			files: undefined,
		})
	})

	it("returns a tool error when checklist advancement is rejected", async () => {
		const { config, callbacks } = createConfig({
			askResult: { text: "Yes" },
		})
		config.taskState.activePlaceholderWorkflowSource = { name: "create-prd.md" } as any
		config.taskState.currentFocusChainChecklist = "- [ ] Step 3: Discover and classify the project"
		;(callbacks.updateFCListFromToolResponse as sinon.SinonStub).resolves({
			accepted: false,
			feedback: "Workflow progress already advanced once in this assistant turn.",
		})
		const handler = new WorkflowProgressRequestToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "workflow_progress_request",
			params: {},
			partial: false,
		} as any)

		assert.equal(result, formatResponse.toolError("Workflow progress already advanced once in this assistant turn."))
		assert.equal(config.taskState.pendingResponseToolFollowup, undefined)
	})

	it("returns a tool error when the active workflow is not supported", async () => {
		const { config } = createConfig()
		config.taskState.activePlaceholderWorkflowSource = { name: "brainstorming.md" } as any
		const handler = new WorkflowProgressRequestToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "workflow_progress_request",
			params: {},
			partial: false,
		} as any)

		assert.equal(
			result,
			formatResponse.toolError(
				"workflow_progress_request can only be used during an active supported placeholder workflow step.",
			),
		)
	})

	it("returns a tool error when no active checklist is available", async () => {
		const { config } = createConfig()
		config.taskState.activePlaceholderWorkflowSource = { name: "create-epics.md" } as any
		const handler = new WorkflowProgressRequestToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "workflow_progress_request",
			params: {},
			partial: false,
		} as any)

		assert.equal(
			result,
			formatResponse.toolError(
				"workflow_progress_request requires an active placeholder-workflow focus chain checklist before it can advance the workflow.",
			),
		)
	})
})
