import type { ApiHandler } from "@core/api"
import type { ApiStream } from "@core/api/transform/stream"
import type { ToolUse } from "@core/assistant-message"
import { ContextManager } from "@core/context/context-management/ContextManager"
import { FileContextTracker } from "@core/context/context-tracking/FileContextTracker"
import { ClineIgnoreController } from "@core/ignore/ClineIgnoreController"
import { CommandPermissionController } from "@core/permissions"
import { StateManager } from "@core/storage/StateManager"
import { BrowserSession } from "@services/browser/BrowserSession"
import { UrlContentFetcher } from "@services/browser/UrlContentFetcher"
import { McpHub } from "@services/mcp/McpHub"
import type { ClineAsk, ClineSay } from "@shared/ExtensionMessage"
import type { ClineContent } from "@shared/messages/content"
import type { ClineAskResponse } from "@shared/WebviewMessage"
import { expect } from "chai"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { DiffViewProvider } from "@/integrations/editor/DiffViewProvider"
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@/shared/AutoApprovalSettings"
import { DEFAULT_BROWSER_SETTINGS } from "@/shared/BrowserSettings"
import { DEFAULT_FOCUS_CHAIN_SETTINGS } from "@/shared/FocusChainSettings"
import { ClineDefaultTool } from "@/shared/tools"
import { formatResponse } from "../../prompts/responses"
import type { FocusChainChecklistUpdateResult } from "../focus-chain/types"
import type { ToolResponse } from "../index"
import { MessageStateHandler } from "../message-state"
import { TaskState } from "../TaskState"
import { ToolExecutor } from "../ToolExecutor"
import type { IToolHandler } from "../tools/ToolExecutorCoordinator"
import { ToolExecutorCoordinator } from "../tools/ToolExecutorCoordinator"
import type { TaskConfig } from "../tools/types/TaskConfig"
import type { ActiveWorkflowSession, WorkflowNextAction } from "../workflow-runtime/types"
import { WorkflowRuntime } from "../workflow-runtime/WorkflowRuntime"

class TestDiffViewProvider extends DiffViewProvider {
	protected async openDiffEditor(): Promise<void> {}

	protected async scrollEditorToLine(_line: number): Promise<void> {}

	protected async scrollAnimation(_startLine: number, _endLine: number): Promise<void> {}

	protected async truncateDocument(_lineNumber: number): Promise<void> {}

	protected async getDocumentLineCount(): Promise<number> {
		return 0
	}

	protected async getDocumentText(): Promise<string | undefined> {
		return undefined
	}

	protected async saveDocument(): Promise<boolean> {
		return true
	}

	protected async closeAllDiffViews(): Promise<void> {}

	protected async resetDiffView(): Promise<void> {}

	async replaceText(
		_content: string,
		_rangeToReplace: { startLine: number; endLine: number },
		_currentLine: number | undefined,
	): Promise<void> {}
}

class LifecycleTestHandler implements IToolHandler {
	readonly name: ClineDefaultTool

	constructor(
		name: ClineDefaultTool,
		private readonly outcome: { kind: "return"; toolResult: ToolResponse } | { kind: "throw"; error: Error },
		private readonly onExecute?: (config: TaskConfig, block: ToolUse) => void,
	) {
		this.name = name
	}

	getDescription(): string {
		return `[${this.name}]`
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		this.onExecute?.(config, block)
		if (this.outcome.kind === "throw") {
			throw this.outcome.error
		}

		return this.outcome.toolResult
	}
}

interface ToolExecutorLifecycleFixture {
	executor: ToolExecutor
	taskState: TaskState
	coordinator: ToolExecutorCoordinator
	workflowRuntime: sinon.SinonStubbedInstance<WorkflowRuntime>
}

async function* createEmptyApiStream(): ApiStream {}

function createActiveWorkflowSession(): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues: {},
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Workflow Project",
			projectFolderName: "workflow-project",
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
			activeBranchId: "active-branch",
		},
	}
}

function createToolUse(toolName: ClineDefaultTool): ToolUse {
	return {
		type: "tool_use",
		name: toolName,
		params: {},
		partial: false,
		isNativeToolCall: true,
		call_id: `model_call_${toolName}`,
	}
}

function getExecutorCoordinator(executor: ToolExecutor): ToolExecutorCoordinator {
	const coordinator: unknown = Reflect.get(executor, "coordinator")
	if (coordinator instanceof ToolExecutorCoordinator) {
		return coordinator
	}

	throw new Error("Expected ToolExecutor coordinator.")
}

function createStateManager(): sinon.SinonStubbedInstance<StateManager> {
	const stateManager = sinon.createStubInstance(StateManager)
	stateManager.getGlobalSettingsKey.callsFake((key) => {
		if (key === "mode") {
			return "act"
		}
		if (key === "strictPlanModeEnabled") {
			return false
		}
		if (key === "yoloModeToggled") {
			return false
		}
		if (key === "doubleCheckCompletionEnabled") {
			return false
		}
		if (key === "enableParallelToolCalling") {
			return true
		}
		if (key === "autoApprovalSettings") {
			return DEFAULT_AUTO_APPROVAL_SETTINGS
		}
		if (key === "browserSettings") {
			return DEFAULT_BROWSER_SETTINGS
		}
		if (key === "focusChainSettings") {
			return DEFAULT_FOCUS_CHAIN_SETTINGS
		}
		if (key === "hooksEnabled") {
			return false
		}

		return undefined
	})
	stateManager.getApiConfiguration.returns({
		planModeApiProvider: "openai",
		actModeApiProvider: "openai",
	})
	return stateManager
}

function createExecutor(nextAction: WorkflowNextAction = { kind: "no_op" }): ToolExecutorLifecycleFixture {
	const taskState = new TaskState()
	const stateManager = createStateManager()
	const browserSession = sinon.createStubInstance(BrowserSession)
	browserSession.closeBrowser.resolves()
	browserSession.dispose.resolves()
	const api: ApiHandler = {
		createMessage: () => createEmptyApiStream(),
		getModel: () => ({
			id: "openai/gpt-5",
			info: {
				supportsPromptCache: false,
			},
		}),
	}
	const workflowRuntime = sinon.createStubInstance(WorkflowRuntime)
	workflowRuntime.handleModelToolResult.resolves(nextAction)
	const say = async (
		_type: ClineSay,
		_text?: string,
		_images?: string[],
		_files?: string[],
		_partial?: boolean,
	): Promise<number | undefined> => undefined
	const ask = async (
		_type: ClineAsk,
		_text?: string,
		_partial?: boolean,
	): Promise<{ response: ClineAskResponse; text?: string; images?: string[]; files?: string[] }> => ({
		response: "yesButtonClicked",
	})
	const updateFCListFromToolResponse = async (_taskProgress: string | undefined): Promise<FocusChainChecklistUpdateResult> => ({
		accepted: true,
	})

	const executor = new ToolExecutor(
		taskState,
		sinon.createStubInstance(MessageStateHandler),
		api,
		sinon.createStubInstance(UrlContentFetcher),
		browserSession,
		new TestDiffViewProvider(),
		sinon.createStubInstance(McpHub),
		sinon.createStubInstance(FileContextTracker),
		new ClineIgnoreController(process.cwd()),
		sinon.createStubInstance(CommandPermissionController),
		sinon.createStubInstance(ContextManager),
		stateManager,
		workflowRuntime,
		process.cwd(),
		"task-workflow-model-tool-lifecycle",
		"ulid-workflow-model-tool-lifecycle",
		"backgroundExec",
		undefined,
		false,
		say,
		ask,
		async () => {},
		async () => formatResponse.toolError("missing"),
		async () => {},
		async () => [false, "ok"],
		async () => false,
		async () => false,
		updateFCListFromToolResponse,
		async () => false,
		async () => {},
		async () => {},
		async () => undefined,
		async () => undefined,
		async (_userContent: ClineContent[], _context: "initial_task" | "resume" | "feedback") => ({}),
	)

	return {
		executor,
		taskState,
		coordinator: getExecutorCoordinator(executor),
		workflowRuntime,
	}
}

describe("ToolExecutor workflow model-tool lifecycle", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("emits and queues model-tool success lifecycle next actions for active workflows", async () => {
		const nextAction: WorkflowNextAction = { kind: "complete_workflow" }
		const { executor, taskState, coordinator, workflowRuntime } = createExecutor(nextAction)
		taskState.activeWorkflowName = "workflow-runtime-test"
		taskState.activeWorkflowSession = createActiveWorkflowSession()
		coordinator.register(
			new LifecycleTestHandler(ClineDefaultTool.GET_BRAINSTORMING_METHODS, {
				kind: "return",
				toolResult: "methods loaded",
			}),
		)

		const outcome = await executor.executeTool(createToolUse(ClineDefaultTool.GET_BRAINSTORMING_METHODS))

		expect(outcome.workflowNextActions).to.deep.equal([nextAction])
		sinon.assert.calledOnce(workflowRuntime.handleModelToolResult)
		expect(workflowRuntime.handleModelToolResult.firstCall.args[0]).to.deep.equal({
			taskState,
			toolName: ClineDefaultTool.GET_BRAINSTORMING_METHODS,
			toolResultText: "methods loaded",
		})
	})

	it("emits and queues model-tool failure lifecycle next actions for active workflows", async () => {
		const nextAction: WorkflowNextAction = { kind: "complete_workflow" }
		const toolName = ClineDefaultTool.GET_BRAINSTORMING_METHODS
		const expectedFailureResult = formatResponse.toolError(`Error executing ${toolName}: boom`)
		const { executor, taskState, coordinator, workflowRuntime } = createExecutor(nextAction)
		taskState.activeWorkflowName = "workflow-runtime-test"
		taskState.activeWorkflowSession = createActiveWorkflowSession()
		coordinator.register(
			new LifecycleTestHandler(toolName, {
				kind: "throw",
				error: new Error("boom"),
			}),
		)

		const outcome = await executor.executeTool(createToolUse(toolName))

		expect(outcome.workflowNextActions).to.deep.equal([nextAction])
		sinon.assert.calledOnce(workflowRuntime.handleModelToolResult)
		expect(workflowRuntime.handleModelToolResult.firstCall.args[0]).to.deep.equal({
			taskState,
			toolName,
			toolResultText: expectedFailureResult,
		})
	})

	it("does not emit generic model-tool lifecycle when a handler already queued a workflow next action", async () => {
		const dedicatedNextAction: WorkflowNextAction = { kind: "complete_workflow" }
		const { executor, taskState, coordinator, workflowRuntime } = createExecutor()
		taskState.activeWorkflowName = "workflow-runtime-test"
		taskState.activeWorkflowSession = createActiveWorkflowSession()
		coordinator.register(
			new LifecycleTestHandler(
				ClineDefaultTool.GET_BRAINSTORMING_METHODS,
				{
					kind: "return",
					toolResult: "methods loaded",
				},
				(config) => {
					config.callbacks.queueWorkflowNextAction(dedicatedNextAction)
				},
			),
		)

		const outcome = await executor.executeTool(createToolUse(ClineDefaultTool.GET_BRAINSTORMING_METHODS))

		expect(outcome.workflowNextActions).to.deep.equal([dedicatedNextAction])
		sinon.assert.notCalled(workflowRuntime.handleModelToolResult)
	})

	it("does not emit generic model-tool lifecycle for dedicated workflow lifecycle tools", async () => {
		const dedicatedLifecycleTools = [
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			ClineDefaultTool.SET_WORKFLOW_VALUES,
		] as const

		for (const toolName of dedicatedLifecycleTools) {
			const { executor, taskState, coordinator, workflowRuntime } = createExecutor()
			taskState.activeWorkflowName = "workflow-runtime-test"
			taskState.activeWorkflowSession = createActiveWorkflowSession()
			coordinator.register(
				new LifecycleTestHandler(toolName, {
					kind: "return",
					toolResult: "dedicated lifecycle result",
				}),
			)

			const outcome = await executor.executeTool(createToolUse(toolName))

			expect(outcome.workflowNextActions).to.deep.equal([])
			sinon.assert.notCalled(workflowRuntime.handleModelToolResult)
		}
	})
})
