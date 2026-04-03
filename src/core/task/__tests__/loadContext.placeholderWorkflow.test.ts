import * as disk from "@core/storage/disk"
import type { ClineContent, ClineTextContentBlock } from "@shared/messages/content"
import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import proxyquire from "proxyquire"
import type { SinonStub } from "sinon"
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

type LoadContextTaskHarness = {
	taskId: string
	ulid: string
	cwd: string
	taskState: TaskState
	controller: { stateManager: ReturnType<typeof createStateManager> }
	stateManager: ReturnType<typeof createStateManager>
	mcpHub: { getPrompt: sinon.SinonStub }
	urlContentFetcher: object
	fileContextTracker: object
	workspaceManager: undefined
	clineIgnoreController: { filterPaths: (paths: string[]) => string[] }
	terminalManager: {
		getTerminals: () => unknown[]
		getUnretrievedOutput: () => undefined
	}
	FocusChainManager?: FocusChainManager
	getCurrentProviderInfo: () => {
		model: { id: string }
		providerId: string
		mode: string
	}
	getEnvironmentDetails: SinonStub
	maybeResolveWorkflowFormBeforeApiTurn: sinon.SinonStub
	applyPersistentSlashCommandAction: sinon.SinonStub
	buildPlaceholderWorkflowActivationInstructions: (...args: unknown[]) => Promise<string | undefined>
	persistLastPromptedPlaceholderWorkflowChecklistLabel: () => Promise<void>
	persistActiveStoryTaskPromptState: () => Promise<void>
	hasHumanAuthoredInput: typeof Task.prototype.hasHumanAuthoredInput
	getPromptRefreshFrequency: typeof Task.prototype.getPromptRefreshFrequency
	shouldSendFullPromptAssemblyForCurrentTurn: typeof Task.prototype.shouldSendFullPromptAssemblyForCurrentTurn
}

const loadContext = Reflect.get(Task.prototype, "loadContext") as (
	this: LoadContextTaskHarness,
	userContent: ClineContent[],
	includeFileDetails?: boolean,
	useCompactPrompt?: boolean,
	includeDetailedEnvironmentDetails?: boolean,
) => Promise<[ClineContent[], ClineTextContentBlock[], boolean]>

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
		cwd: "/tmp",
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

## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
You are in the fallback path because the system-owned workflow-form path was not completed.

Use \`build_review_diff_output\` whenever a supported source is discovered.
`,
	}
	taskState.currentFocusChainChecklist = [
		"- [ ] Step 1: Determine Review Source",
		"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
	].join("\n")

	const task: LoadContextTaskHarness = {
		taskId: "task-load-context-placeholder",
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
		getEnvironmentDetails: sinon.stub().callsFake(async (_includeFileDetails, includeDetailedEnvironmentDetails) => {
			return includeDetailedEnvironmentDetails ? "ENVIRONMENT: detailed" : "ENVIRONMENT: reduced"
		}),
		maybeResolveWorkflowFormBeforeApiTurn: sinon.stub().resolves(),
		applyPersistentSlashCommandAction: sinon.stub().resolves(),
		buildPlaceholderWorkflowActivationInstructions: sinon.stub().resolves(undefined),
		persistLastPromptedPlaceholderWorkflowChecklistLabel: sinon.stub().resolves(),
		persistActiveStoryTaskPromptState: sinon.stub().resolves(),
		hasHumanAuthoredInput: Task.prototype.hasHumanAuthoredInput,
		getPromptRefreshFrequency: Task.prototype.getPromptRefreshFrequency,
		shouldSendFullPromptAssemblyForCurrentTurn: Task.prototype.shouldSendFullPromptAssemblyForCurrentTurn,
	}

	task.FocusChainManager = createFocusChainManager(taskState, promptRefreshFrequency)
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

function expectCurrentStepBlock(text: string, checklistLabel: string) {
	expect(text).to.contain("# CURRENT WORKFLOW STEP")
	expect(text).to.contain(checklistLabel)
}

function expectWorkflowStatusBlock(text: string) {
	expect(text).to.contain("# CURRENT WORKFLOW STATUS")
	expect(text).to.match(/### Reminder:/m)
	expect(text).to.contain("Current Progress:")
}

describe("Task.loadContext placeholder workflow focus chain prompting", () => {
	it("returns environment details and focus-chain workflow guidance as prompt injection blocks when full prompt assembly is required", async () => {
		const fakeTask = createFakeTask(0)
		const userContent: ClineContent[] = [
			{
				type: "tool_result",
				tool_use_id: "tool-1",
				content: [{ type: "text", text: "Review input available." }],
			},
		]

		const [processedUserContent, promptInjectionBlocks] = await loadContext.call(fakeTask, userContent, false, false, false)

		const userText = collectTextValues(processedUserContent).join("\n")
		const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")

		expect(userText).to.not.contain("ENVIRONMENT: reduced")
		expect(userText).to.not.contain("### Reminder:")
		expectCurrentStepBlock(userText, "Step 1: Determine Review Source")

		expect(promptInjectionText).to.contain("ENVIRONMENT: reduced")
		expectWorkflowStatusBlock(promptInjectionText)
		expect(promptInjectionText).to.contain("- [ ] Step 1: Determine Review Source")
		expect(promptInjectionText).to.not.contain("# CURRENT WORKFLOW STEP")
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
		const userContent: ClineContent[] = [
			{
				type: "tool_result",
				tool_use_id: "tool-1",
				content: [{ type: "text", text: "Review input available." }],
			},
		]

		const [processedUserContent, promptInjectionBlocks] = await loadContext.call(fakeTask, userContent, false, false, false)
		const userText = collectTextValues(processedUserContent).join("\n")
		const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")

		expect(userText).to.not.contain("TODO LIST UPDATE SUGGESTED")
		expectCurrentStepBlock(userText, "Step 1: Determine Review Source")
		expect(userText).to.not.contain("# AUTO-COMPLETED WORKFLOW STEPS")

		expectWorkflowStatusBlock(promptInjectionText)
		expect(promptInjectionText).to.contain("# AUTO-COMPLETED WORKFLOW STEPS")
		expect(promptInjectionText).to.contain("Step 4: Set Review Mode")
		expect(promptInjectionText).to.not.contain("# CURRENT WORKFLOW STEP")
	})

	it("does not re-inject current-step details into input when the active checklist label was already prompted", async () => {
		const fakeTask = createFakeTask()
		fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = "Step 1: Determine Review Source"
		const userContent: ClineContent[] = [
			{
				type: "tool_result",
				tool_use_id: "tool-1",
				content: [{ type: "text", text: "Review input available." }],
			},
		]

		const [processedUserContent, promptInjectionBlocks] = await loadContext.call(fakeTask, userContent, false, false, false)
		const userText = collectTextValues(processedUserContent).join("\n")
		const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")

		expect(userText).to.not.contain("# CURRENT WORKFLOW STEP")
		expect(promptInjectionText).to.not.contain("# CURRENT WORKFLOW STEP")
		expectWorkflowStatusBlock(promptInjectionText)
	})

	it("injects the next step into input when the checklist advances to a new active label", async () => {
		const fakeTask = createFakeTask()
		fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = "Step 1: Determine Review Source"
		fakeTask.taskState.currentFocusChainChecklist = [
			"- [x] Step 1: Determine Review Source",
			"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
		].join("\n")

		const userContent: ClineContent[] = [
			{
				type: "tool_result",
				tool_use_id: "tool-1",
				content: [{ type: "text", text: "Review input available." }],
			},
		]

		const [processedUserContent, promptInjectionBlocks] = await loadContext.call(fakeTask, userContent, false, false, false)
		const userText = collectTextValues(processedUserContent).join("\n")
		const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")

		expectCurrentStepBlock(userText, "Step 2: System-Owned Diff Source Resolution And Diff Output Persistence")
		expect(promptInjectionText).to.not.contain("# CURRENT WORKFLOW STEP")
	})

	it("does not inject current-step details on compact turns", async () => {
		const fakeTask = createFakeTask()
		const userContent: ClineContent[] = [
			{
				type: "tool_result",
				tool_use_id: "tool-1",
				content: [{ type: "text", text: "Review input available." }],
			},
		]

		const [processedUserContent, promptInjectionBlocks] = await loadContext.call(fakeTask, userContent, false, true, false)
		const userText = collectTextValues(processedUserContent).join("\n")
		const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")

		expect(userText).to.not.contain("# CURRENT WORKFLOW STEP")
		expect(promptInjectionText).to.not.contain("# CURRENT WORKFLOW STEP")
	})

	it("appends dev-story workflow-start context before the current-step block and forces step 2 task prompting on full-prompt turns", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "load-context-dev-story-"))
		const storyPath = path.join(tempDir, "load-context-dev-story-story.md")
		await fs.writeFile(
			storyPath,
			`# Story 1.0
Status: ready-for-dev

## Acceptance Criteria
- AC 1

## Latest Review Findings
- Fix the workflow prompt ordering

## Tasks / Subtasks
- [ ] Implement prompt injection
  - [ ] Keep storyTaskId runtime-only
`,
			"utf8",
		)

		try {
			const fakeTask = createFakeTask(0)
			Object.setPrototypeOf(fakeTask, Task.prototype)
			fakeTask.cwd = tempDir
			fakeTask.taskState.activeWorkflowJustStarted = true
			fakeTask.taskState.activePlaceholderWorkflowId = "dev-story.md"
			fakeTask.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "dev-story.md",
				contents: `# Dev Story

## Step 1: Start
Prepare the story.

## Step 2: Implement Tasks
Complete the current task and its subtasks.

## Step 3: Validate
Run the required tests.
`,
			}
			fakeTask.taskState.activePlaceholderWorkflowValues = {
				story_path: storyPath,
			}
			fakeTask.taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Start",
				"- [ ] Step 2: Implement Tasks",
				"- [ ] Step 3: Validate",
			].join("\n")
			fakeTask.buildPlaceholderWorkflowActivationInstructions = Reflect.get(
				Task.prototype,
				"buildPlaceholderWorkflowActivationInstructions",
			).bind(fakeTask)

			const [firstProcessedUserContent] = await loadContext.call(
				fakeTask,
				[
					{
						type: "tool_result",
						tool_use_id: "tool-1",
						content: [{ type: "text", text: "Continue the workflow." }],
					},
				],
				false,
				false,
				false,
			)

			const firstUserText = collectTextValues(firstProcessedUserContent).join("\n")
			expect(firstUserText).to.contain("### WORKFLOW START CONTEXT")
			expect(firstUserText).to.contain("## Acceptance Criteria")
			expect(firstUserText).to.contain("### CURRENT WORKFLOW STEP")
			expect(firstUserText.indexOf("### WORKFLOW START CONTEXT")).to.be.lessThan(
				firstUserText.indexOf("### CURRENT WORKFLOW STEP"),
			)
			expect(firstUserText).to.contain("### CURRENT TASKS / SUBTASKS")
			expect(firstUserText).to.contain("storyTaskId: 1")

			fakeTask.taskState.activeWorkflowJustStarted = false

			const [secondProcessedUserContent] = await loadContext.call(
				fakeTask,
				[
					{
						type: "tool_result",
						tool_use_id: "tool-2",
						content: [{ type: "text", text: "Continue the workflow again." }],
					},
				],
				false,
				false,
				false,
			)

			const secondUserText = collectTextValues(secondProcessedUserContent).join("\n")
			expect(secondUserText).to.not.contain("### WORKFLOW START CONTEXT")
			expect(secondUserText).to.not.contain("## Acceptance Criteria")
			expect(secondUserText).to.contain("### CURRENT TASKS / SUBTASKS")
			expect(secondUserText).to.contain("storyTaskId: 1")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("persists the last prompted placeholder workflow checklist label when loadContext injects a new active step", async () => {
		const sandbox = sinon.createSandbox()
		try {
			sandbox.stub(disk, "getTaskMetadata").resolves({
				files_in_context: [],
				model_usage: [],
				environment_history: [],
			} as never)
			const saveTaskMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const fakeTask = createFakeTask()
			Object.setPrototypeOf(fakeTask, Task.prototype)
			fakeTask.persistLastPromptedPlaceholderWorkflowChecklistLabel = Reflect.get(
				Task.prototype,
				"persistLastPromptedPlaceholderWorkflowChecklistLabel",
			).bind(fakeTask)
			fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = "Step 1: Determine Review Source"
			fakeTask.taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
			].join("\n")

			const [processedUserContent] = await loadContext.call(
				fakeTask,
				[
					{
						type: "tool_result",
						tool_use_id: "tool-1",
						content: [{ type: "text", text: "Review input available." }],
					},
				],
				false,
				false,
				false,
			)

			const userText = collectTextValues(processedUserContent).join("\n")
			expectCurrentStepBlock(userText, "Step 2: System-Owned Diff Source Resolution And Diff Output Persistence")
			expect(saveTaskMetadataStub.called).to.equal(true)
			const savedLabels = saveTaskMetadataStub
				.getCalls()
				.map((call) => call.args[1].lastPromptedPlaceholderWorkflowChecklistLabel)
				.filter((value) => value !== undefined)
			expect(savedLabels).to.include("Step 2: System-Owned Diff Source Resolution And Diff Output Persistence")
		} finally {
			sandbox.restore()
		}
	})

	it("resolves a pending workflow form before generating focus-chain prompt injections", async () => {
		const fakeTask = createFakeTask()
		fakeTask.taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "code-review.md",
			contents: `# Code Review

## Step 1: Determine Review Source
Done.

## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
Goal: The primary path for this step is runtime-owned workflow-form resolution. The AI instructions below are fallback-only and apply only when the system-owned path was not completed.

You are in the fallback path because the system-owned workflow-form path was not completed.

Do not ask the human to restate or re-enter a diff source they already declined to provide in the form flow.

Use \`build_review_diff_output\` whenever a supported source is discovered.

## Step 3: Construct & Persist Review Input File
Construct and persist review-input.md from the persisted diff output before continuing.

## Step 4: Set Review Mode
Choose the review mode from the persisted diff output before continuing.
`,
		}
		fakeTask.taskState.currentFocusChainChecklist = [
			"- [x] Step 1: Determine Review Source",
			"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
			"- [ ] Step 3: Construct & Persist Review Input File",
			"- [ ] Step 4: Set Review Mode",
		].join("\n")

		const callOrder: string[] = []
		fakeTask.applyPersistentSlashCommandAction = sinon.stub().callsFake(async () => {
			callOrder.push("applyPersistentSlashCommandAction")
		})
		fakeTask.maybeResolveWorkflowFormBeforeApiTurn = sinon.stub().callsFake(async () => {
			callOrder.push("maybeResolveWorkflowFormBeforeApiTurn")
			fakeTask.taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [x] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
				"- [ ] Step 3: Construct & Persist Review Input File",
				"- [ ] Step 4: Set Review Mode",
			].join("\n")
		})

		const focusChainManager = fakeTask.FocusChainManager!
		const originalGenerateFocusChainInstructions = focusChainManager.generateFocusChainInstructions.bind(focusChainManager)
		sinon.stub(focusChainManager, "generateFocusChainInstructions").callsFake(async () => {
			callOrder.push("generateFocusChainInstructions")
			expect(fakeTask.taskState.currentFocusChainChecklist).to.contain(
				"- [x] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
			)
			expect(fakeTask.taskState.currentFocusChainChecklist).to.contain(
				"- [ ] Step 3: Construct & Persist Review Input File",
			)
			expect(fakeTask.taskState.currentFocusChainChecklist).to.contain("- [ ] Step 4: Set Review Mode")
			return await originalGenerateFocusChainInstructions()
		})

		const [processedUserContent, promptInjectionBlocks] = await loadContext.call(
			fakeTask,
			[
				{
					type: "tool_result",
					tool_use_id: "tool-1",
					content: [{ type: "text", text: "Diff output persisted." }],
				},
			],
			false,
			false,
			false,
		)

		const userText = collectTextValues(processedUserContent).join("\n")
		const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")
		expect(fakeTask.maybeResolveWorkflowFormBeforeApiTurn.calledOnce).to.equal(true)
		expect(callOrder.indexOf("applyPersistentSlashCommandAction")).to.be.lessThan(
			callOrder.indexOf("maybeResolveWorkflowFormBeforeApiTurn"),
		)
		expect(callOrder.indexOf("maybeResolveWorkflowFormBeforeApiTurn")).to.be.lessThan(
			callOrder.indexOf("generateFocusChainInstructions"),
		)
		expect(promptInjectionText).to.not.contain(
			"You are in the fallback path because the system-owned workflow-form path was not completed.",
		)
		expectCurrentStepBlock(userText, "Step 3: Construct & Persist Review Input File")
	})

	it("builds the first AI prompt from the fully settled code-review system-owned chain", async () => {
		const fakeTask = createFakeTask()
		fakeTask.taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "code-review.md",
			contents: `# Code Review

## Step 1: Determine Review Source
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
You are in the fallback path because the system-owned workflow-form path was not completed.

Use \`build_review_diff_output\` whenever a supported source is discovered.

## Step 3: Construct & Persist Review Input File
Construct and persist review-input.md from the persisted diff output before continuing.

## Step 4: Set Review Mode
Choose the review mode from the persisted diff output before continuing.

## Step 5: Use Subagents for Specialized Reviews, then Collect Findings
Use the settled {review_mode} review mode with {review_input} and collect findings before responding.
`,
		}
		fakeTask.taskState.currentFocusChainChecklist = [
			"- [x] Step 1: Determine Review Source",
			"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
			"- [ ] Step 3: Construct & Persist Review Input File",
			"- [ ] Step 4: Set Review Mode",
			"- [ ] Step 5: Use Subagents for Specialized Reviews, then Collect Findings",
		].join("\n")

		const callOrder: string[] = []
		fakeTask.applyPersistentSlashCommandAction = sinon.stub().callsFake(async () => {
			callOrder.push("applyPersistentSlashCommandAction")
		})
		fakeTask.maybeResolveWorkflowFormBeforeApiTurn = sinon.stub().callsFake(async () => {
			callOrder.push("maybeResolveWorkflowFormBeforeApiTurn")
			fakeTask.taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [x] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
				"- [x] Step 3: Construct & Persist Review Input File",
				"- [x] Step 4: Set Review Mode",
				"- [ ] Step 5: Use Subagents for Specialized Reviews, then Collect Findings",
			].join("\n")
			fakeTask.taskState.activePlaceholderWorkflowStableValues = {
				output_folder: "workflow-output",
			}
			fakeTask.taskState.activePlaceholderWorkflowValues = {
				diff_output: "workflow-output/review-input.diff",
				review_input: "workflow-output/review-input.md",
				review_mode: "full",
			}
		})

		const focusChainManager = fakeTask.FocusChainManager!
		const originalGenerateFocusChainInstructions = focusChainManager.generateFocusChainInstructions.bind(focusChainManager)
		sinon.stub(focusChainManager, "generateFocusChainInstructions").callsFake(async () => {
			callOrder.push("generateFocusChainInstructions")
			expect(fakeTask.taskState.currentFocusChainChecklist).to.contain("- [x] Step 4: Set Review Mode")
			expect(fakeTask.taskState.currentFocusChainChecklist).to.contain(
				"- [ ] Step 5: Use Subagents for Specialized Reviews, then Collect Findings",
			)
			expect(fakeTask.taskState.activePlaceholderWorkflowValues).to.deep.equal({
				diff_output: "workflow-output/review-input.diff",
				review_input: "workflow-output/review-input.md",
				review_mode: "full",
			})
			return await originalGenerateFocusChainInstructions()
		})

		const [processedUserContent, promptInjectionBlocks] = await loadContext.call(
			fakeTask,
			[
				{
					type: "tool_result",
					tool_use_id: "tool-1",
					content: [{ type: "text", text: "Workflow chain settled before AI entry." }],
				},
			],
			false,
			false,
			false,
		)

		const userText = collectTextValues(processedUserContent).join("\n")
		const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")
		expect(fakeTask.maybeResolveWorkflowFormBeforeApiTurn.calledOnce).to.equal(true)
		expect(callOrder.indexOf("maybeResolveWorkflowFormBeforeApiTurn")).to.be.lessThan(
			callOrder.indexOf("generateFocusChainInstructions"),
		)
		expect(promptInjectionText).to.not.contain(
			"You are in the fallback path because the system-owned workflow-form path was not completed.",
		)
		expect(promptInjectionText).to.not.contain("You are currently on this step: Step 1:")
		expect(promptInjectionText).to.not.contain("You are currently on this step: Step 2:")
		expect(promptInjectionText).to.not.contain("You are currently on this step: Step 3:")
		expect(promptInjectionText).to.not.contain("You are currently on this step: Step 4:")
		expectCurrentStepBlock(userText, "Step 5: Use Subagents for Specialized Reviews, then Collect Findings")
	})
})
