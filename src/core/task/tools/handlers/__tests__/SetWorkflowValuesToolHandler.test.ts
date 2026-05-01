import type { ToolUse } from "@core/assistant-message"
import { expect } from "chai"
import { describe, it } from "mocha"
import sinon from "sinon"
import { formatResponse } from "@/core/prompts/responses"
import { TaskState } from "@/core/task/TaskState"
import { ClineDefaultTool } from "@/shared/tools"
import { validateTaskConfig } from "../../types/TaskConfig"
import { SetWorkflowValuesToolHandler } from "../SetWorkflowValuesToolHandler"

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

function createSetWorkflowValuesBlock(values: unknown): ToolUse {
	const params: ToolUse["params"] = {}
	Object.assign(params, { values })

	return {
		type: "tool_use",
		name: ClineDefaultTool.SET_WORKFLOW_VALUES,
		params,
		partial: false,
		isNativeToolCall: true,
		call_id: "set_workflow_values_1",
	}
}

function createConfig() {
	const taskState = new TaskState()
	const applyWorkflowValueWrites = sinon.stub().resolves({
		changedValues: JSON_SAFE_WORKFLOW_VALUES,
		unchangedValues: {},
	})
	const resolveNextAction = sinon.stub().resolves({ kind: "project_prompt", promptProjection: {} })
	const queueWorkflowNextAction = sinon.stub()
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
		queueWorkflowNextAction,
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
		isSubagentExecution: true,
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
				getGlobalSettingsKey: () => undefined,
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
			resolveNextAction,
		},
		coordinator: {
			getHandler: sinon.stub(),
		},
	}
	validateTaskConfig(config)

	return {
		config,
		stubs: {
			applyWorkflowValueWrites,
			resolveNextAction,
			queueWorkflowNextAction,
		},
	}
}

describe("SetWorkflowValuesToolHandler", () => {
	it("persists JSON-safe workflow values supplied as a JSON string", async () => {
		const { config, stubs } = createConfig()
		const handler = new SetWorkflowValuesToolHandler()

		const result = await handler.execute(config, createSetWorkflowValuesBlock(JSON.stringify(JSON_SAFE_WORKFLOW_VALUES)))

		expect(result).to.equal("Stored 5 workflow values: title, count, approved, items, metadata.")
		sinon.assert.calledOnce(stubs.applyWorkflowValueWrites)
		expect(stubs.applyWorkflowValueWrites.firstCall.args[0]).to.deep.equal({
			taskState: config.taskState,
			values: JSON_SAFE_WORKFLOW_VALUES,
		})
		sinon.assert.calledOnceWithExactly(stubs.resolveNextAction, { taskState: config.taskState })
		sinon.assert.calledOnceWithExactly(stubs.queueWorkflowNextAction, { kind: "project_prompt", promptProjection: {} })
	})

	it("persists JSON-safe workflow values supplied as an object", async () => {
		const { config, stubs } = createConfig()
		const handler = new SetWorkflowValuesToolHandler()

		const result = await handler.execute(config, createSetWorkflowValuesBlock(JSON_SAFE_WORKFLOW_VALUES))

		expect(result).to.equal("Stored 5 workflow values: title, count, approved, items, metadata.")
		sinon.assert.calledOnce(stubs.applyWorkflowValueWrites)
		expect(stubs.applyWorkflowValueWrites.firstCall.args[0]).to.deep.equal({
			taskState: config.taskState,
			values: JSON_SAFE_WORKFLOW_VALUES,
		})
	})

	it("does not queue a next action when requested workflow values are unchanged", async () => {
		const { config, stubs } = createConfig()
		stubs.applyWorkflowValueWrites.resolves({
			changedValues: {},
			unchangedValues: JSON_SAFE_WORKFLOW_VALUES,
		})
		const handler = new SetWorkflowValuesToolHandler()

		const result = await handler.execute(config, createSetWorkflowValuesBlock(JSON_SAFE_WORKFLOW_VALUES))

		expect(result).to.equal(
			"No workflow values changed. Existing stored values already matched the requested values: title, count, approved, items, metadata. Do not call set_workflow_values again unless one of those values changes.",
		)
		sinon.assert.notCalled(stubs.resolveNextAction)
		sinon.assert.notCalled(stubs.queueWorkflowNextAction)
	})

	it("rejects invalid values before applying workflow value writes", async () => {
		const invalidValues = ["{", "[1]", "null", "{}", '{"unsafe":null}', {}, { unsafe: null }]
		const expectedError = formatResponse.toolError(
			"Missing required parameter 'values'. Provide a non-empty object whose property values are JSON-safe workflow values.",
		)

		for (const invalidValue of invalidValues) {
			const { config, stubs } = createConfig()
			const handler = new SetWorkflowValuesToolHandler()

			const result = await handler.execute(config, createSetWorkflowValuesBlock(invalidValue))

			expect(result).to.equal(expectedError)
			sinon.assert.notCalled(stubs.applyWorkflowValueWrites)
		}
	})
})
