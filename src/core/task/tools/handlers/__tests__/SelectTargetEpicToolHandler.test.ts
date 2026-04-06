import { strict as assert } from "node:assert"
import fs from "fs/promises"
import { afterEach, describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import { formatResponse } from "../../../../prompts/responses"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { SelectTargetEpicToolHandler } from "../SelectTargetEpicToolHandler"

const PI_PLANNING_WORKFLOW_SOURCE = {
	type: "remote" as const,
	name: "pi-planning.md",
	contents: `# pi-planning

## Step 1: Gather Requirements
Use the workflow-owned requirements.

## Step 2: Identify Target Epic
Pick the target epic.

## Step 3: Build Epic Delivery Spec
Build the delivery spec.
`,
}

function createConfig(options?: {
	askResult?: { text?: string; images?: string[]; files?: string[] }
	lastFollowupMessage?: any
}) {
	const taskState = new TaskState()
	taskState.activePlaceholderWorkflowId = "pi-planning.md"
	taskState.activePlaceholderWorkflowSource = PI_PLANNING_WORKFLOW_SOURCE
	taskState.currentFocusChainChecklist =
		"- [x] Step 1: Gather Requirements\n- [ ] Step 2: Identify Target Epic\n- [ ] Step 3: Build Epic Delivery Spec"

	const clineMessages = options?.lastFollowupMessage ? [options.lastFollowupMessage] : []
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask: sinon.stub().resolves(options?.askResult ?? { text: "Epic 3: Checkout" }),
		saveCheckpoint: sinon.stub().resolves(),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
		upsertPartialResponseToolSayPreview: sinon.stub().resolves(false),
		clearPartialResponseToolPreview: sinon.stub().resolves(false),
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
		isSubagentExecution: true,
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

	return { config, callbacks, saveClineMessagesAndUpdateHistory }
}

describe("SelectTargetEpicToolHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("fails when epics_document is missing from merged placeholder workflow state", async () => {
		const { config } = createConfig()
		const handler = new SelectTargetEpicToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "select_target_epic",
			params: {},
			partial: false,
		} as any)

		assert.equal(
			result,
			formatResponse.toolError(
				"Could not resolve workflow placeholder 'epics_document' from the active placeholder workflow state.",
			),
		)
	})

	it("fails when the resolved epics document cannot be read", async () => {
		const { config } = createConfig()
		config.taskState.activePlaceholderWorkflowValues = {
			epics_document: "/tmp/does-not-exist/epics.md",
		}
		const handler = new SelectTargetEpicToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "select_target_epic",
			params: {},
			partial: false,
		} as any)

		assert.equal(
			result,
			formatResponse.toolError("Could not read the resolved epics_document at /tmp/does-not-exist/epics.md."),
		)
	})

	it("fails when no canonical epic headings can be extracted from the epic list section", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "select-target-epic-empty-"))
		const epicsPath = path.join(tempDir, "epics.md")
		await fs.writeFile(epicsPath, "## Epic List\n\n### Epic List\n\nNo canonical epic headings here.\n", "utf8")

		const { config } = createConfig()
		config.taskState.activePlaceholderWorkflowValues = {
			epics_document: epicsPath,
		}
		const handler = new SelectTargetEpicToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "select_target_epic",
			params: {},
			partial: false,
		} as any)

		assert.equal(
			result,
			formatResponse.toolError(
				"Could not extract any canonical epic headings from the '### Epic List' section of the epics document.",
			),
		)
	})

	it("asks the exact followup question, reflects the selected option, persists target_epic, and avoids a normal user-turn continuation", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "select-target-epic-success-"))
		const epicsPath = path.join(tempDir, "epics.md")
		await fs.writeFile(
			epicsPath,
			[
				"# Epics",
				"",
				"## Epic List",
				"",
				"### Epic List",
				"### Epic 2: Catalog",
				"",
				"#### Objective",
				"",
				"### Epic 3: Checkout",
				"",
				"#### Objective",
				"",
				"## Appendix",
			].join("\n"),
			"utf8",
		)

		const lastFollowupMessage = { ask: "followup", text: "{}" }
		const { config, callbacks, saveClineMessagesAndUpdateHistory } = createConfig({
			askResult: { text: "Epic 3: Checkout" },
			lastFollowupMessage,
		})
		config.taskState.activePlaceholderWorkflowValues = {
			epics_document: epicsPath,
		}

		const handler = new SelectTargetEpicToolHandler()
		const result = await handler.execute(config, {
			type: "tool_use",
			name: "select_target_epic",
			params: {},
			partial: false,
		} as any)

		assert.equal(result, "Stored workflow placeholder target_epic from the runtime-owned epic selection.")
		sinon.assert.calledOnce(callbacks.ask)
		assert.deepEqual(JSON.parse(callbacks.ask.firstCall.args[1]), {
			question: "Which epic would you like to work on?",
			options: ["Epic 2: Catalog", "Epic 3: Checkout"],
		})
		assert.deepEqual(JSON.parse(lastFollowupMessage.text), {
			question: "Which epic would you like to work on?",
			options: ["Epic 2: Catalog", "Epic 3: Checkout"],
			selected: "Epic 3: Checkout",
		})
		assert.equal(config.taskState.activePlaceholderWorkflowValues?.target_epic, "Epic 3: Checkout")
		sinon.assert.calledOnce(saveClineMessagesAndUpdateHistory)
		sinon.assert.calledOnceWithExactly(callbacks.updateFCListFromToolResponse, undefined)
		assert.equal(config.taskState.pendingResponseToolFollowup, undefined)
		assert.equal(config.taskState.responseToolTurnShouldEnd, false)
	})

	it("fails with a tool error when no valid option is selected", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "select-target-epic-invalid-"))
		const epicsPath = path.join(tempDir, "epics.md")
		await fs.writeFile(epicsPath, "### Epic List\n### Epic 3: Checkout\n", "utf8")

		const { config, callbacks } = createConfig({
			askResult: { text: "Checkout" },
		})
		config.taskState.activePlaceholderWorkflowValues = {
			epics_document: epicsPath,
		}

		const handler = new SelectTargetEpicToolHandler()
		const result = await handler.execute(config, {
			type: "tool_use",
			name: "select_target_epic",
			params: {},
			partial: false,
		} as any)

		assert.equal(
			result,
			formatResponse.toolError(
				"select_target_epic did not receive a valid epic selection from the interactive followup ask.",
			),
		)
		sinon.assert.notCalled(callbacks.updateFCListFromToolResponse)
		assert.equal(config.taskState.activePlaceholderWorkflowValues?.target_epic, undefined)
	})
})
