import type { ToolUse } from "@core/assistant-message"
import { expect } from "chai"
import { describe, it } from "mocha"
import sinon from "sinon"
import { TaskState } from "@/core/task/TaskState"
import { BRAINSTORMING_TECHNIQUES } from "@/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../.."
import type { TaskConfig } from "../../types/TaskConfig"
import { validateTaskConfig } from "../../types/TaskConfig"
import { GetBrainstormingMethodsToolHandler } from "../GetBrainstormingMethodsToolHandler"

interface GetBrainstormingMethodsTestConfig {
	config: TaskConfig
	stubs: {
		applyWorkflowValueWrites: sinon.SinonStub
		resolveNextAction: sinon.SinonStub
	}
}

function createGetBrainstormingMethodsBlock(): ToolUse {
	return {
		type: "tool_use",
		name: ClineDefaultTool.GET_BRAINSTORMING_METHODS,
		params: {},
		partial: false,
		isNativeToolCall: true,
		call_id: "get_brainstorming_methods_1",
	}
}

function readStringToolResponse(result: ToolResponse): string {
	if (typeof result === "string") {
		return result
	}

	throw new Error("Expected a string tool response.")
}

function createConfig(): GetBrainstormingMethodsTestConfig {
	const taskState = new TaskState()
	const applyWorkflowValueWrites = sinon.stub().resolves({
		changedValues: {},
		unchangedValues: {},
	})
	const resolveNextAction = sinon.stub().resolves({ kind: "no_op" })
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
		},
	}
}

describe("GetBrainstormingMethodsToolHandler", () => {
	it("returns the full code-owned brainstorming technique inventory without workflow mutation", async () => {
		const { config, stubs } = createConfig()
		const handler = new GetBrainstormingMethodsToolHandler()

		const result = await handler.execute(config, createGetBrainstormingMethodsBlock())
		const parsedResult: unknown = JSON.parse(readStringToolResponse(result))

		expect(parsedResult).to.deep.equal({
			methods: BRAINSTORMING_TECHNIQUES.map((technique) => ({
				id: technique.id,
				category: technique.category,
				name: technique.name,
				description: technique.description,
			})),
		})
		sinon.assert.notCalled(stubs.applyWorkflowValueWrites)
		sinon.assert.notCalled(stubs.resolveNextAction)
	})
})
