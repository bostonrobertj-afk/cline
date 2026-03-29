import { expect } from "chai"
import { describe, it } from "mocha"
import proxyquire from "proxyquire"
import sinon from "sinon"
import { FocusChainManager } from "../focus-chain"
import { TaskState } from "../TaskState"

const proxyquireNoCallThru = proxyquire.noCallThru()
const proxyquireNoPreserveCache = proxyquireNoCallThru.noPreserveCache()

const { Task } = proxyquireNoPreserveCache("../index", {
	"@core/context/instructions/user-instructions/workflows": {
		refreshWorkflowToggles: async () => ({
			globalWorkflowToggles: {},
			localWorkflowToggles: {},
		}),
	},
})

function createStateManager(promptRefreshFrequency = 5) {
	return {
		getGlobalSettingsKey: (key: string) => {
			if (key === "focusChainSettings") {
				return { enabled: true, remindClineInterval: 6 }
			}
			if (key === "promptRefreshFrequency") {
				return promptRefreshFrequency
			}
			if (key === "mode") {
				return "act"
			}
			if (key === "useAutoCondense") {
				return false
			}
			return undefined
		},
		getGlobalStateKey: (key: string) => {
			if (key === "nativeToolCallEnabled") {
				return false
			}
			return undefined
		},
		getWorkspaceStateKey: () => undefined,
		setGlobalState: sinon.stub(),
		setWorkspaceState: sinon.stub(),
	} as never
}

function createFocusChainManager(taskState: TaskState, promptRefreshFrequency = 5) {
	return new FocusChainManager({
		taskId: "task-load-context-placeholder",
		taskState,
		mode: "act",
		stateManager: createStateManager(promptRefreshFrequency),
		postStateToWebview: sinon.stub().resolves(),
		say: sinon.stub().resolves(undefined),
		focusChainSettings: { enabled: true, remindClineInterval: 6 } as never,
	})
}

function createFakeTask(promptRefreshFrequency = 5) {
	const taskState = new TaskState()
	taskState.apiRequestCount = 2
	taskState.apiRequestsSinceLastTodoUpdate = 1
	taskState.activePlaceholderWorkflowId = "code-review.md"
	taskState.activePlaceholderWorkflowSource = {
		type: "remote",
		name: "code-review.md",
		contents: `# Code Review

## Step 1: Determine Review Source
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Construct & Persist Review Input Files
`,
	}
	taskState.currentFocusChainChecklist = [
		"- [ ] Step 1: Determine Review Source",
		"- [ ] Step 2: Construct & Persist Review Input Files",
	].join("\n")

	const task: any = {
		ulid: "test-ulid",
		cwd: process.cwd(),
		taskState,
		controller: {
			stateManager: createStateManager(promptRefreshFrequency),
		},
		stateManager: createStateManager(promptRefreshFrequency),
		mcpHub: {
			getPrompt: sinon.stub().resolves(null),
		},
		urlContentFetcher: {},
		fileContextTracker: {},
		workspaceManager: undefined,
		clineIgnoreController: {
			filterPaths: (paths: string[]) => paths,
		},
		terminalManager: {
			getTerminals: () => [],
			getUnretrievedOutput: () => undefined,
		},
		FocusChainManager: undefined,
		getCurrentProviderInfo: () => ({
			model: {
				id: "gpt-5.4-mini-2026-03-17",
			},
			providerId: "openai-native",
			mode: "act",
		}),
		getEnvironmentDetails: sinon
			.stub()
			.callsFake(async (_includeFileDetails: boolean, includeDetailedEnvironmentDetails: boolean) => {
				return includeDetailedEnvironmentDetails ? "ENVIRONMENT: detailed" : "ENVIRONMENT: reduced"
			}),
		applyPersistentSlashCommandAction: sinon.stub().resolves(),
		buildPlaceholderWorkflowActivationInstructions: sinon.stub().resolves(undefined),
	}

	task.FocusChainManager = createFocusChainManager(taskState, promptRefreshFrequency)
	task.hasHumanAuthoredInput = Task.prototype["hasHumanAuthoredInput"]
	task.getPromptRefreshFrequency = Task.prototype["getPromptRefreshFrequency"]
	task.shouldSendFullPromptAssemblyForCurrentTurn = Task.prototype["shouldSendFullPromptAssemblyForCurrentTurn"]
	return task
}

function collectTextValues(value: unknown): string[] {
	const result: string[] = []
	const visit = (item: unknown) => {
		if (!item) {
			return
		}

		if (typeof item === "string") {
			result.push(item)
			return
		}

		if (Array.isArray(item)) {
			item.forEach(visit)
			return
		}

		if (typeof item === "object") {
			const record = item as Record<string, unknown>
			if (record.type === "text" && typeof record.text === "string") {
				result.push(record.text)
			}
			if ("content" in record) {
				visit(record.content)
			}
		}
	}

	visit(value)
	return result
}

describe("Task.loadContext placeholder workflow focus chain prompting", () => {
	it("returns environment details and placeholder-workflow guidance as prompt injection blocks when full prompt assembly is required", async () => {
		const fakeTask = createFakeTask(0)
		fakeTask.buildPlaceholderWorkflowActivationInstructions.resolves("ACTIVATION: placeholder workflow just started")
		const userContent = [
			{
				type: "tool_result",
				tool_use_id: "tool-1",
				content: [{ type: "text", text: "Review input available." }],
			},
		] as any

		const [processedUserContent, promptInjectionBlocks] = await (Task.prototype as any).loadContext.call(
			fakeTask,
			userContent,
			false,
			false,
			false,
		)

		const userText = collectTextValues(processedUserContent).join("\n")
		const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")

		expect(userText).to.not.contain("ENVIRONMENT: reduced")
		expect(userText).to.not.contain("### Reminder:")
		expect(userText).to.not.contain("# CURRENT WORKFLOW STEP")
		expect(userText).to.not.contain("ACTIVATION: placeholder workflow just started")

		expect(promptInjectionText).to.contain("ENVIRONMENT: reduced")
		expect(promptInjectionText).to.contain("ACTIVATION: placeholder workflow just started")
		expect(promptInjectionText).to.contain("### Reminder:")
		expect(promptInjectionText).to.contain("Current Progress: 0/2 items completed")
		expect(promptInjectionText).to.contain("- [ ] Step 1: Determine Review Source")
		expect(promptInjectionText).to.contain("# CURRENT WORKFLOW STEP")
		expect(promptInjectionText).to.contain("You are currently on this step: Step 1: Determine Review Source")
		expect(fakeTask.getEnvironmentDetails.calledOnceWith(false, false)).to.equal(true)
	})

	it("returns placeholder-workflow continuation guidance as prompt injection blocks on tool-only continuation turns", async () => {
		const fakeTask = createFakeTask()
		fakeTask.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = [
			{
				workflowName: "code-review.md",
				stepNumber: 4,
				checklistLabel: "Step 4: Set Review Mode",
				reason: "review_mode was derived deterministically from fresh review artifacts.",
			},
		]
		const userContent = [
			{
				type: "tool_result",
				tool_use_id: "tool-1",
				content: [{ type: "text", text: "Review input available." }],
			},
		] as any

		const [processedUserContent, promptInjectionBlocks] = await (Task.prototype as any).loadContext.call(
			fakeTask,
			userContent,
			false,
			false,
			false,
		)
		const userText = collectTextValues(processedUserContent).join("\n")
		const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")

		expect(userText).to.not.contain("TODO LIST UPDATE SUGGESTED")
		expect(userText).to.not.contain("# CURRENT WORKFLOW STEP")
		expect(userText).to.not.contain("# AUTO-COMPLETED WORKFLOW STEPS")

		expect(promptInjectionText).to.contain("### Reminder:")
		expect(promptInjectionText).to.contain("Current Progress: 0/2 items completed")
		expect(promptInjectionText).to.contain("# AUTO-COMPLETED WORKFLOW STEPS")
		expect(promptInjectionText).to.contain("Step 4: Set Review Mode")
		expect(promptInjectionText).to.contain("# CURRENT WORKFLOW STEP")
		expect(promptInjectionText).to.contain("You are currently on this step: Step 1: Determine Review Source")
	})
})
