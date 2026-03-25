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

function createStateManager() {
	return {
		getGlobalSettingsKey: (key: string) => {
			if (key === "focusChainSettings") {
				return { enabled: true, remindClineInterval: 6 }
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

function createFocusChainManager(taskState: TaskState) {
	return new FocusChainManager({
		taskId: "task-load-context-placeholder",
		taskState,
		mode: "act",
		stateManager: createStateManager(),
		postStateToWebview: sinon.stub().resolves(),
		say: sinon.stub().resolves(undefined),
		focusChainSettings: { enabled: true, remindClineInterval: 6 } as never,
	})
}

function createFakeTask() {
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
			stateManager: createStateManager(),
		},
		stateManager: createStateManager(),
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

	task.FocusChainManager = createFocusChainManager(taskState)
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
	it("appends placeholder workflow checklist and current-step guidance on a non-reminder GPT-5 turn", async () => {
		const fakeTask = createFakeTask()
		const userContent = [
			{
				type: "tool_result",
				tool_use_id: "tool-1",
				content: [{ type: "text", text: "Review input available." }],
			},
			{
				type: "text",
				text: "Continue with the review.",
			},
		] as any

		const [processedUserContent, environmentDetails] = await (Task.prototype as any).loadContext.call(
			fakeTask,
			userContent,
			false,
			false,
			false,
		)

		const promptText = collectTextValues(processedUserContent).join("\n")

		expect(promptText).to.contain("TODO LIST UPDATE SUGGESTED")
		expect(promptText).to.contain("```text")
		expect(promptText).to.contain("- [ ] Step 1: Determine Review Source")
		expect(promptText).to.contain("# CURRENT WORKFLOW STEP")
		expect(promptText).to.contain("You are currently on this step: Step 1: Determine Review Source")
		expect(environmentDetails).to.equal("ENVIRONMENT: reduced")
		expect(fakeTask.getEnvironmentDetails.calledOnceWith(false, false)).to.equal(true)
	})
})
