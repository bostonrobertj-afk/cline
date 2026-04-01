import * as disk from "@core/storage/disk"
import type { ClineWorkflowForm } from "@shared/ExtensionMessage"
import { ClineDefaultTool } from "@shared/tools"
import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import { parseSlashCommands } from "../../slash-commands"
import { StateManager } from "../../storage/StateManager"
import { getCanonicalWorkflowConfigPath } from "../../workflows/workflow-placeholders"
import { FocusChainManager } from "../focus-chain"
import { getFocusChainFilePath } from "../focus-chain/file-utils"
import { Task, type ToolResponse } from "../index"
import { TaskState } from "../TaskState"
import { activateManagedWorkflowInTaskState } from "../workflow-activation"
import type { WorkflowFormRuntimeOutcome, WorkflowFormSessionState } from "../workflow-form/types"

function createFocusChainManager(taskState: TaskState) {
	return new FocusChainManager({
		taskId: "task-placeholder-persistence",
		taskState,
		mode: "act",
		stateManager: {
			getGlobalSettingsKey: sinon.stub().returns("act"),
		} as never,
		postStateToWebview: sinon.stub().resolves(),
		say: sinon.stub().resolves(undefined),
		focusChainSettings: { enabled: true, remindClineInterval: 6 } as never,
	})
}

function createFakeTask(taskId: string) {
	return {
		taskId,
		cwd: process.cwd(),
		taskState: new TaskState(),
		refreshManagedWorkflowChecklistProjection: sinon.stub().resolves(),
		refreshPlaceholderWorkflowChecklistProjection: sinon.stub().resolves(),
		clearManagedWorkflowChecklistProjection: sinon.stub().resolves(),
		postStateToWebview: sinon.stub().resolves(),
		say: sinon.stub().resolves(undefined as unknown as ToolResponse),
	}
}

function expectWorkflowStatusOnlyPrompt(prompt: string, checklistLabel: string) {
	expect(prompt).to.not.contain("# CURRENT WORKFLOW STEP")
	expect(prompt).to.not.contain("You are currently on this step:")
	expect(prompt).to.contain("# CURRENT WORKFLOW STATUS")
	expect(prompt).to.contain("Current Progress:")
	expect(prompt).to.contain(checklistLabel)
}

type TaskMethod<Args extends unknown[], Result> = (this: Record<string, unknown>, ...args: Args) => Result
type FakeTaskBase = ReturnType<typeof createFakeTask> & Record<string, unknown>
type FakeWorkflowFormTask = {
	cwd: string
	taskState: TaskState
	pendingWorkflowFormOutcome?: WorkflowFormRuntimeOutcome
	messageStateHandler?: {
		getClineMessages: sinon.SinonStub
	}
	workflowFormRuntime: {
		createSession: sinon.SinonStub
		buildPayload: sinon.SinonStub
		buildSuccessPayload?: sinon.SinonStub
	}
	persistWorkflowFormSession?: sinon.SinonStub
	renderWorkflowFormMessage: sinon.SinonStub
	executeWorkflowFormToolAndSync?: sinon.SinonStub
	clearWorkflowFormSession?: sinon.SinonStub
	say?: sinon.SinonStub
	setThreadDisplayState: sinon.SinonStub
	postStateToWebview: sinon.SinonStub
}

const restoreBmadStateFromMetadata = Reflect.get(Task.prototype, "restoreBmadStateFromMetadata") as TaskMethod<[], Promise<void>>
const persistWorkflowFormSession = Reflect.get(Task.prototype, "persistWorkflowFormSession") as TaskMethod<[], Promise<void>>
const clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction = Reflect.get(
	Task.prototype,
	"clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction",
) as TaskMethod<[], Promise<void>>
const renderWorkflowFormMessage = Reflect.get(Task.prototype, "renderWorkflowFormMessage") as TaskMethod<
	[ClineWorkflowForm],
	Promise<void>
>
const restorePlaceholderWorkflowChecklistFromDiskIfNeeded = Reflect.get(
	Task.prototype,
	"restorePlaceholderWorkflowChecklistFromDiskIfNeeded",
) as TaskMethod<[], Promise<void>>
const applyPersistentSlashCommandAction = Reflect.get(Task.prototype, "applyPersistentSlashCommandAction") as TaskMethod<
	[unknown],
	Promise<void>
>
const buildPlaceholderWorkflowActivationInstructions = Reflect.get(
	Task.prototype,
	"buildPlaceholderWorkflowActivationInstructions",
) as TaskMethod<[unknown], Promise<string | undefined>>
const maybeResolveWorkflowFormBeforeApiTurn = Reflect.get(Task.prototype, "maybeResolveWorkflowFormBeforeApiTurn") as TaskMethod<
	[unknown?],
	Promise<void>
>
const persistLastPromptedPlaceholderWorkflowChecklistLabel = Reflect.get(
	Task.prototype,
	"persistLastPromptedPlaceholderWorkflowChecklistLabel",
) as TaskMethod<[], Promise<void>>
const clearWorkflowFormSession = Reflect.get(Task.prototype, "clearWorkflowFormSession") as TaskMethod<[], Promise<void>>
const executeWorkflowFormToolAndSync = Reflect.get(Task.prototype, "executeWorkflowFormToolAndSync") as TaskMethod<
	[unknown],
	Promise<{ succeeded: boolean; errorMessage?: string; fallbackToAgent?: boolean }>
>
const getWorkflowFormToolResultText = Reflect.get(Task.prototype, "getWorkflowFormToolResultText") as TaskMethod<
	[number],
	string | undefined
>
const getWorkflowFormToolErrorMessage = Reflect.get(Task.prototype, "getWorkflowFormToolErrorMessage") as TaskMethod<
	[WorkflowFormSessionState, number],
	string | undefined
>
const updatePlaceholderWorkflowProgressAndMaybeRunCompletion = Reflect.get(
	Task.prototype,
	"updatePlaceholderWorkflowProgressAndMaybeRunCompletion",
) as TaskMethod<[string | undefined, unknown?], Promise<{ accepted: boolean; feedback?: string }>>
describe("placeholder workflow persistence", () => {
	it("restores activePlaceholderWorkflowSource from metadata and resumes step-specific prompting", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const metadata = {
				activePlaceholderWorkflowId: "remote-review",
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "remote-review",
					contents: `# Remote Review

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.
`,
				},
				activePlaceholderWorkflowStableValues: {
					communication_language: "English",
				},
				activePlaceholderWorkflowDeterministicState: {
					codeReview: {
						completedReviewLayers: {
							blind_review: "subagent_report",
						},
					},
				},
				activePlaceholderWorkflowTaskWriteProofPaths: ["/tmp/review-input.md"],
				lastPromptedPlaceholderWorkflowChecklistLabel: "Step 1: Gather Context",
				suppressedWorkflowFormResolverIds: ["code_review_step_3_diff_source"],
				pendingAutoCompletedPlaceholderWorkflowStepNotices: [
					{
						workflowName: "code-review.md",
						stepNumber: 4,
						checklistLabel: "Step 4: Set Review Mode",
						reason: "review_mode was derived deterministically from current-task review artifacts.",
					},
				],
			}
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata as never)

			const fakeTask = createFakeTask("task-restore-placeholder")
			await restoreBmadStateFromMetadata.call(fakeTask)

			expect(fakeTask.taskState.activePlaceholderWorkflowId).to.equal("remote-review")
			expect(fakeTask.taskState.activePlaceholderWorkflowSource).to.deep.equal(metadata.activePlaceholderWorkflowSource)
			expect(fakeTask.taskState.activePlaceholderWorkflowStableValues).to.deep.equal(
				metadata.activePlaceholderWorkflowStableValues,
			)
			expect(fakeTask.taskState.activePlaceholderWorkflowDeterministicState).to.deep.equal(
				metadata.activePlaceholderWorkflowDeterministicState,
			)
			expect(fakeTask.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.deep.equal(
				metadata.activePlaceholderWorkflowTaskWriteProofPaths,
			)
			expect(fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel).to.equal("Step 1: Gather Context")
			expect(fakeTask.taskState.suppressedWorkflowFormResolverIds).to.deep.equal(metadata.suppressedWorkflowFormResolverIds)
			expect(fakeTask.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal(
				metadata.pendingAutoCompletedPlaceholderWorkflowStepNotices,
			)

			fakeTask.taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"
			const manager = createFocusChainManager(fakeTask.taskState)
			const prompt = await manager.generateFocusChainInstructions()

			expectWorkflowStatusOnlyPrompt(prompt, "Step 1: Gather Context")
		} finally {
			sandbox.restore()
		}
	})

	it("clears and persists the last prompted checklist label when context compaction invalidates current-step history", async () => {
		const sandbox = sinon.createSandbox()
		try {
			sandbox.stub(disk, "getTaskMetadata").resolves({
				lastPromptedPlaceholderWorkflowChecklistLabel: "Step 1: Gather Context",
			} as never)
			const saveTaskMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const fakeTask = createFakeTask("task-clear-compaction-marker")
			Object.setPrototypeOf(fakeTask, Task.prototype)
			fakeTask.persistLastPromptedPlaceholderWorkflowChecklistLabel =
				persistLastPromptedPlaceholderWorkflowChecklistLabel.bind(fakeTask)
			fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = "Step 1: Gather Context"

			await clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction.call(fakeTask)

			expect(fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel).to.equal(undefined)
			expect(saveTaskMetadataStub.callCount).to.equal(1)
			const lastSavedMetadata = saveTaskMetadataStub.getCall(saveTaskMetadataStub.callCount - 1).args[1]
			expect(lastSavedMetadata.lastPromptedPlaceholderWorkflowChecklistLabel).to.equal(undefined)
		} finally {
			sandbox.restore()
		}
	})

	it("persists consumed auto-completed placeholder workflow notices as cleared after prompt generation", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const metadata = {
				activePlaceholderWorkflowId: "code-review.md",
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "code-review.md",
					contents: `# Remote Review

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.
`,
				},
				pendingAutoCompletedPlaceholderWorkflowStepNotices: [
					{
						workflowName: "code-review.md",
						stepNumber: 4,
						checklistLabel: "Step 4: Set Review Mode",
						reason: "review_mode was derived deterministically from current-task review artifacts.",
					},
				],
			}
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata as never)
			const saveTaskMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const fakeTask = createFakeTask("task-consume-placeholder-notices")
			await restoreBmadStateFromMetadata.call(fakeTask)

			fakeTask.taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

			const manager = createFocusChainManager(fakeTask.taskState)
			const prompt = await manager.generateFocusChainInstructions()

			expect(prompt).to.contain("# AUTO-COMPLETED WORKFLOW STEPS")
			expect(prompt).to.contain("Step 4: Set Review Mode")
			expect(fakeTask.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			expect(saveTaskMetadataStub.callCount).to.be.greaterThan(0)
			const lastSavedMetadata = saveTaskMetadataStub.getCall(saveTaskMetadataStub.callCount - 1).args[1]
			expect(lastSavedMetadata.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			sandbox.restore()
		}
	})

	it("clears deterministic placeholder state and notices when activating a managed workflow", async () => {
		const taskState = new TaskState()
		taskState.activePlaceholderWorkflowId = "code-review.md"
		taskState.activePlaceholderWorkflowDeterministicState = {
			codeReview: {
				completedReviewLayers: {
					blind_review: "subagent_report",
				},
			},
		}
		taskState.activePlaceholderWorkflowTaskWriteProofPaths = ["/tmp/review-input.md"]
		taskState.suppressedWorkflowFormResolverIds = ["code_review_step_3_diff_source"]
		taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = [
			{
				workflowName: "code-review.md",
				stepNumber: 4,
				checklistLabel: "Step 4: Set Review Mode",
				reason: "review_mode was derived deterministically from current-task review artifacts.",
			},
		]

		await activateManagedWorkflowInTaskState({
			cwd: process.cwd(),
			taskState,
			workflowId: "bmad-code-review",
		})

		expect(taskState.activePlaceholderWorkflowDeterministicState).to.equal(undefined)
		expect(taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.deep.equal([])
		expect(taskState.suppressedWorkflowFormResolverIds).to.deep.equal([])
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})

	it("persists and restores the active workflow-form session in task metadata", async () => {
		const sandbox = sinon.createSandbox()
		const session: WorkflowFormSessionState = {
			sessionId: "wf-session-1",
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 2,
			},
			phase: "retry_error",
			initialPhase: "confirm",
			values: {
				"source.type": {
					rawValue: "commit",
				},
			},
			lastError: "Tool execution failed",
		}

		try {
			sandbox.stub(disk, "getTaskMetadata").resolves({
				activeWorkflowFormSession: session,
				suppressedWorkflowFormResolverIds: ["code_review_step_3_diff_source"],
			} as never)
			const saveTaskMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const fakeTask = createFakeTask("task-workflow-form-metadata")
			fakeTask.taskState.activeWorkflowFormSession = session
			fakeTask.taskState.suppressedWorkflowFormResolverIds = ["code_review_step_3_diff_source"]

			await persistWorkflowFormSession.call(fakeTask)
			await restoreBmadStateFromMetadata.call(fakeTask)

			expect(fakeTask.taskState.activeWorkflowFormSession).to.deep.equal(session)
			expect(fakeTask.taskState.suppressedWorkflowFormResolverIds).to.deep.equal(["code_review_step_3_diff_source"])
			expect(saveTaskMetadataStub.called).to.be.true
			const lastSavedMetadata = saveTaskMetadataStub.getCall(saveTaskMetadataStub.callCount - 1).args[1]
			expect(lastSavedMetadata.activeWorkflowFormSession).to.deep.equal(session)
			expect(lastSavedMetadata.suppressedWorkflowFormResolverIds).to.deep.equal(["code_review_step_3_diff_source"])
		} finally {
			sandbox.restore()
		}
	})

	it("keeps only one workflow-form ask message for the active session after retry_error followed by success", async () => {
		const sessionId = "wf-session-step-3"
		const basePayload = {
			sessionId,
			resolverId: "code_review_step_3_diff_source",
			definition: {
				toolName: "build_review_diff_output",
				title: "Review Diff Artifact",
				toolDictionaryTitle: "Diff Source Reference",
				toolDictionaryMarkdown: "## build_review_diff_output\n\nTool reference body.",
				pages: {
					collect_inputs: {
						prompt: "Provide the concrete inputs needed to produce `review-input.diff`.",
						fields: [],
						submitLabel: "Submit",
						cancelLabel: "Cancel",
					},
					retry_error: {
						prompt: "The system could not produce `review-input.diff`. Update the inputs or retry the request.",
						fields: [],
						submitLabel: "Submit",
						cancelLabel: "Cancel",
						retryLabel: "Start Over",
					},
				},
				successMessage: "The workflow form completed successfully.",
			},
		}
		const messages: Array<Record<string, unknown>> = [
			{
				ts: 1,
				type: "ask",
				ask: "workflow_form",
				text: JSON.stringify({
					...basePayload,
					phase: "collect_inputs",
				}),
			},
			{
				ts: 2,
				type: "say",
				say: "tool",
				text: JSON.stringify({ status: "first-attempt-started" }),
			},
			{
				ts: 3,
				type: "say",
				say: "tool",
				text: JSON.stringify({ status: "first-attempt-failed" }),
			},
		]
		const messageStateHandler = {
			getClineMessages: sinon.stub().callsFake(() => messages),
			updateClineMessage: sinon.stub().callsFake(async (index: number, update: Record<string, unknown>) => {
				Object.assign(messages[index], update)
			}),
			addToClineMessages: sinon.stub().callsFake(async (message: Record<string, unknown>) => {
				messages.push(message)
			}),
		}
		const fakeTask = {
			taskState: new TaskState(),
			threadDisplayState: undefined,
			awaitingUserResponseSubtype: undefined,
			messageStateHandler,
			setThreadDisplayState: sinon.stub(),
			postStateToWebview: sinon.stub().resolves(),
		}

		await renderWorkflowFormMessage.call(fakeTask, {
			...basePayload,
			phase: "retry_error",
			errorMessage: "The first tool attempt failed.",
		})

		messages.push({
			ts: 4,
			type: "say",
			say: "tool",
			text: JSON.stringify({ status: "second-attempt-succeeded" }),
		})

		await renderWorkflowFormMessage.call(fakeTask, {
			...basePayload,
			phase: "success",
			successMessage: "The workflow form completed successfully.",
		})

		const survivingMessages = messages.filter((message) => {
			if (message.type !== "ask" || message.ask !== "workflow_form" || typeof message.text !== "string") {
				return false
			}

			return JSON.parse(message.text).sessionId === sessionId
		})

		expect(survivingMessages).to.have.length(1)
		expect(JSON.parse(String(survivingMessages[0].text)).phase).to.equal("success")
		sinon.assert.calledTwice(messageStateHandler.updateClineMessage)
		sinon.assert.notCalled(messageStateHandler.addToClineMessages)
	})

	it("restores the placeholder checklist from disk before a resumed turn rebuilds it from source", async () => {
		const fakeTask = createFakeTask("task-restore-placeholder-checklist")
		fakeTask.taskState.activePlaceholderWorkflowId = "code-review.md"
		fakeTask.taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "code-review.md",
			contents: `# Code Review

## Step 1: Determine Review Source
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Construct & Persist Review Input File
Persist review_input.md.
`,
		}
		fakeTask.taskState.currentFocusChainChecklist = null

		const restoredChecklist = [
			"- [x] Step 1: Determine Review Source",
			"- [ ] Step 2: (System-Owned) Diff Source Resolution And Diff Output Persistence",
			"- [ ] Step 3: Construct & Persist Review Input File",
		].join("\n")

		const restoreStub = sinon.stub().callsFake(async () => {
			fakeTask.taskState.currentFocusChainChecklist = restoredChecklist
			return restoredChecklist
		})
		const taskWithFocusChainManager = fakeTask as FakeTaskBase & {
			FocusChainManager?: {
				restoreCurrentChecklistFromDisk: typeof restoreStub
			}
		}
		taskWithFocusChainManager.FocusChainManager = {
			restoreCurrentChecklistFromDisk: restoreStub,
		}

		await restorePlaceholderWorkflowChecklistFromDiskIfNeeded.call(fakeTask)

		expect(restoreStub.calledOnce).to.equal(true)
		expect(fakeTask.taskState.currentFocusChainChecklist).to.equal(restoredChecklist)
	})

	it("advances Step 3 after placeholder resolution when review_input exists with a stale mtime but has a current-task write proof", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-step3-write-proof-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		const reviewInputPath = path.join(tempDir, "output", "review-input.md")
		const taskId = "task-placeholder-persistence"

		try {
			await fs.writeFile(
				workflowPath,
				`# Code Review

## Step 1: Determine Review Source
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
Resolve diff input through the system-owned form flow.

## Step 3: Construct & Persist Review Input File
Persist review-input.md.
`,
				"utf8",
			)
			await fs.mkdir(path.dirname(reviewInputPath), { recursive: true })
			await fs.writeFile(reviewInputPath, "# review input\n", "utf8")

			const taskState = new TaskState()
			taskState.taskStartTimeMs = Date.now()
			const staleTimestamp = new Date(taskState.taskStartTimeMs - 1_000)
			await fs.utimes(reviewInputPath, staleTimestamp, staleTimestamp)
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
			}
			taskState.activePlaceholderWorkflowValues = {
				review_input: reviewInputPath,
			}
			taskState.activePlaceholderWorkflowTaskWriteProofPaths = [reviewInputPath]
			taskState.currentFocusChainChecklist = null

			const step3Checklist = [
				"- [x] Step 1: Determine Review Source",
				"- [x] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
				"- [ ] Step 3: Construct & Persist Review Input File",
			].join("\n")
			const focusChainFilePath = getFocusChainFilePath(tempDir, taskId)
			await fs.writeFile(
				focusChainFilePath,
				`# Focus Chain List for Task ${taskId}

${step3Checklist}
`,
				"utf8",
			)

			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			sandbox.stub(disk, "getTaskMetadata").resolves({} as never)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const manager = createFocusChainManager(taskState)
			const result = await manager.updateFCListFromToolResponse(undefined, {
				toolName: "set_workflow_placeholders",
				toolWasExecuted: true,
			})

			expect(result.accepted).to.equal(true)
			expect(taskState.currentFocusChainChecklist).to.equal(
				[
					"- [x] Step 1: Determine Review Source",
					"- [x] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
					"- [x] Step 3: Construct & Persist Review Input File",
				].join("\n"),
			)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("tears down placeholder workflow state and persists cleared metadata when workflow completion finishes with no configured automation", async () => {
		const sandbox = sinon.createSandbox()
		try {
			sandbox.stub(disk, "getTaskMetadata").resolves({} as never)
			const saveTaskMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const fakeTask = createFakeTask("task-complete-placeholder-no-automation") as FakeTaskBase & {
				FocusChainManager?: {
					updateFCListFromToolResponse: sinon.SinonStub
					clearPlaceholderWorkflowChecklistProjection: sinon.SinonStub
				}
				toolExecutor?: {
					executeInternalToolSilently: sinon.SinonStub
				}
				pendingWorkflowFormOutcome?: WorkflowFormRuntimeOutcome
			}
			Object.setPrototypeOf(fakeTask, Task.prototype)

			const updateFCListFromToolResponse = sinon.stub().callsFake(async () => {
				fakeTask.taskState.currentFocusChainChecklist = "- [x] Step 1: Gather Context"
				fakeTask.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.push({
					workflowName: "code-review.md",
					stepNumber: 1,
					checklistLabel: "Step 1: Gather Context",
					reason: "completed automatically",
				})
				return { accepted: true }
			})
			const clearProjectionStub = sinon.stub().resolves()
			const executeInternalToolSilently = sinon.stub().resolves(true)

			fakeTask.FocusChainManager = {
				updateFCListFromToolResponse,
				clearPlaceholderWorkflowChecklistProjection: clearProjectionStub,
			}
			fakeTask.toolExecutor = {
				executeInternalToolSilently,
			}

			fakeTask.taskState.activePlaceholderWorkflowId = "unmapped-workflow.md"
			fakeTask.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "unmapped-workflow.md",
				contents: "# Workflow\n\n## Step 1: Gather Context\nDo the work.\n",
			}
			fakeTask.taskState.activePlaceholderWorkflowValues = { review_mode: "full" }
			fakeTask.taskState.activePlaceholderWorkflowStableValues = { communication_language: "English" }
			fakeTask.taskState.activePlaceholderWorkflowDeterministicState = {
				codeReview: {
					completedReviewLayers: {
						blind_review: "subagent_report",
					},
				},
			}
			fakeTask.taskState.activePlaceholderWorkflowTaskWriteProofPaths = ["/tmp/review-input.md"]
			fakeTask.taskState.activeWorkflowFormSession = {
				sessionId: "wf-session-1",
				resolverId: "code_review_step_3_diff_source",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "unmapped-workflow.md",
					stepNumber: 1,
				},
				phase: "confirm",
				initialPhase: "confirm",
				values: {},
			}
			fakeTask.taskState.suppressedWorkflowFormResolverIds = ["code_review_step_3_diff_source"]
			fakeTask.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = []
			fakeTask.taskState.activeWorkflowJustStarted = true
			fakeTask.taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context"
			const activeWorkflowFormSession = fakeTask.taskState.activeWorkflowFormSession
			if (!activeWorkflowFormSession) {
				throw new Error("Expected active workflow form session to be defined for this test")
			}
			fakeTask.pendingWorkflowFormOutcome = {
				kind: "fallback_to_agent",
				session: activeWorkflowFormSession,
			}

			await updatePlaceholderWorkflowProgressAndMaybeRunCompletion.call(fakeTask, "__COMPLETE_NEXT_STEP__")

			expect(fakeTask.taskState.activePlaceholderWorkflowId).to.equal(undefined)
			expect(fakeTask.taskState.activePlaceholderWorkflowSource).to.equal(undefined)
			expect(fakeTask.taskState.activePlaceholderWorkflowValues).to.equal(undefined)
			expect(fakeTask.taskState.activePlaceholderWorkflowStableValues).to.equal(undefined)
			expect(fakeTask.taskState.activePlaceholderWorkflowDeterministicState).to.equal(undefined)
			expect(fakeTask.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.deep.equal([])
			expect(fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel).to.equal(undefined)
			expect(fakeTask.taskState.activeWorkflowFormSession).to.equal(undefined)
			expect(fakeTask.taskState.suppressedWorkflowFormResolverIds).to.deep.equal([])
			expect(fakeTask.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
			expect(fakeTask.taskState.activeWorkflowJustStarted).to.equal(false)
			expect(fakeTask.pendingWorkflowFormOutcome).to.equal(undefined)
			sinon.assert.notCalled(fakeTask.toolExecutor.executeInternalToolSilently)
			sinon.assert.calledOnce(fakeTask.FocusChainManager.clearPlaceholderWorkflowChecklistProjection)
			expect(saveTaskMetadataStub.callCount).to.equal(1)

			const lastSavedMetadata = saveTaskMetadataStub.getCall(saveTaskMetadataStub.callCount - 1).args[1]
			expect(lastSavedMetadata.activePlaceholderWorkflowId).to.equal(undefined)
			expect(lastSavedMetadata.activePlaceholderWorkflowSource).to.equal(undefined)
			expect(lastSavedMetadata.activePlaceholderWorkflowStableValues).to.equal(undefined)
			expect(lastSavedMetadata.activePlaceholderWorkflowValues).to.equal(undefined)
			expect(lastSavedMetadata.activePlaceholderWorkflowDeterministicState).to.equal(undefined)
			expect(lastSavedMetadata.activePlaceholderWorkflowTaskWriteProofPaths).to.deep.equal([])
			expect(lastSavedMetadata.lastPromptedPlaceholderWorkflowChecklistLabel).to.equal(undefined)
			expect(lastSavedMetadata.activeWorkflowFormSession).to.equal(undefined)
			expect(lastSavedMetadata.suppressedWorkflowFormResolverIds).to.deep.equal([])
			expect(lastSavedMetadata.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
		} finally {
			sandbox.restore()
		}
	})

	it("preserves placeholder workflow state when workflow completion automation reports tool_failed", async () => {
		const sandbox = sinon.createSandbox()

		try {
			sandbox.stub(disk, "getTaskMetadata").resolves({} as never)
			const saveTaskMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const fakeTask = createFakeTask("task-complete-placeholder-tool-failed") as FakeTaskBase & {
				FocusChainManager?: {
					updateFCListFromToolResponse: sinon.SinonStub
					clearPlaceholderWorkflowChecklistProjection: sinon.SinonStub
				}
				toolExecutor?: {
					executeInternalToolSilently: sinon.SinonStub
				}
				pendingWorkflowFormOutcome?: WorkflowFormRuntimeOutcome
			}
			Object.setPrototypeOf(fakeTask, Task.prototype)

			const updateFCListFromToolResponse = sinon.stub().callsFake(async () => {
				fakeTask.taskState.currentFocusChainChecklist = "- [x] Step 1: Gather Context"
				fakeTask.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.push({
					workflowName: "code-review.md",
					stepNumber: 1,
					checklistLabel: "Step 1: Gather Context",
					reason: "completed automatically",
				})
				return { accepted: true }
			})
			const clearProjectionStub = sinon.stub().resolves()
			const executeInternalToolSilently = sinon.stub().resolves(false)

			fakeTask.FocusChainManager = {
				updateFCListFromToolResponse,
				clearPlaceholderWorkflowChecklistProjection: clearProjectionStub,
			}
			fakeTask.toolExecutor = {
				executeInternalToolSilently,
			}

			fakeTask.taskState.activePlaceholderWorkflowId = "code-review.md"
			fakeTask.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "code-review.md",
				contents: "# Workflow\n\n## Step 1: Gather Context\nDo the work.\n",
			}
			fakeTask.taskState.activePlaceholderWorkflowValues = { review_mode: "full" }
			fakeTask.taskState.activePlaceholderWorkflowStableValues = { communication_language: "English" }
			fakeTask.taskState.activePlaceholderWorkflowDeterministicState = {
				codeReview: {
					completedReviewLayers: {
						blind_review: "subagent_report",
					},
				},
			}
			fakeTask.taskState.activePlaceholderWorkflowTaskWriteProofPaths = ["/tmp/review-input.md"]
			fakeTask.taskState.activeWorkflowFormSession = {
				sessionId: "wf-session-2",
				resolverId: "code_review_step_3_diff_source",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 1,
				},
				phase: "confirm",
				initialPhase: "confirm",
				values: {},
			}
			fakeTask.taskState.suppressedWorkflowFormResolverIds = ["code_review_step_3_diff_source"]
			fakeTask.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = []
			fakeTask.taskState.activeWorkflowJustStarted = true
			fakeTask.taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context"
			const activeWorkflowFormSession = fakeTask.taskState.activeWorkflowFormSession
			if (!activeWorkflowFormSession) {
				throw new Error("Expected active workflow form session to be defined for this test")
			}
			fakeTask.pendingWorkflowFormOutcome = {
				kind: "fallback_to_agent",
				session: activeWorkflowFormSession,
			}

			await updatePlaceholderWorkflowProgressAndMaybeRunCompletion.call(fakeTask, "__COMPLETE_NEXT_STEP__")

			expect(fakeTask.taskState.activePlaceholderWorkflowId).to.equal("code-review.md")
			expect(fakeTask.taskState.activePlaceholderWorkflowSource).to.deep.equal({
				type: "remote",
				name: "code-review.md",
				contents: "# Workflow\n\n## Step 1: Gather Context\nDo the work.\n",
			})
			expect(fakeTask.taskState.activePlaceholderWorkflowValues).to.deep.equal({ review_mode: "full" })
			expect(fakeTask.taskState.activePlaceholderWorkflowStableValues).to.deep.equal({
				communication_language: "English",
			})
			expect(fakeTask.taskState.activePlaceholderWorkflowDeterministicState).to.deep.equal({
				codeReview: {
					completedReviewLayers: {
						blind_review: "subagent_report",
					},
				},
			})
			expect(fakeTask.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.deep.equal(["/tmp/review-input.md"])
			expect(fakeTask.taskState.activeWorkflowFormSession).to.deep.equal({
				sessionId: "wf-session-2",
				resolverId: "code_review_step_3_diff_source",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 1,
				},
				phase: "confirm",
				initialPhase: "confirm",
				values: {},
			})
			expect(fakeTask.taskState.suppressedWorkflowFormResolverIds).to.deep.equal(["code_review_step_3_diff_source"])
			expect(fakeTask.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([
				{
					workflowName: "code-review.md",
					stepNumber: 1,
					checklistLabel: "Step 1: Gather Context",
					reason: "completed automatically",
				},
			])
			expect(fakeTask.taskState.activeWorkflowJustStarted).to.equal(true)
			expect(fakeTask.pendingWorkflowFormOutcome).to.deep.equal({
				kind: "fallback_to_agent",
				session: activeWorkflowFormSession,
			})
			sinon.assert.calledOnce(fakeTask.toolExecutor.executeInternalToolSilently)
			sinon.assert.notCalled(fakeTask.FocusChainManager.clearPlaceholderWorkflowChecklistProjection)
			sinon.assert.notCalled(saveTaskMetadataStub)
		} finally {
			sandbox.restore()
		}
	})

	it("computes stable placeholder values from slash-command activation metadata and renders them in activation instructions", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "slash-placeholder-stable-"))
		try {
			const workflowPath = path.join(tempDir, ".cline", "skills", "custom-review", "custom-review.md")
			const manifestPath = path.join(tempDir, "_bmad", "_config", "skill-manifest.csv")
			const configPath = getCanonicalWorkflowConfigPath(tempDir)
			await fs.mkdir(path.dirname(workflowPath), { recursive: true })
			await fs.mkdir(path.dirname(manifestPath), { recursive: true })
			await fs.mkdir(path.dirname(configPath), { recursive: true })
			await fs.writeFile(
				workflowPath,
				`# Local Flow

## Step 1: Gather Context
Respond in {communication_language} from {config_source}. Write artifacts to {output_folder}.
`,
				"utf8",
			)
			await fs.writeFile(
				manifestPath,
				[
					"canonicalId,name,description,module,path,install_to_bmad",
					'"custom-review","custom-review","Custom review workflow","bmm","_bmad/bmm/workflows/custom-review/SKILL.md","true"',
				].join("\n"),
				"utf8",
			)
			await fs.writeFile(
				configPath,
				[
					'communication_language: "English"',
					'output_folder: "{project-root}/workflow-output"',
					'diff_output: "{output_folder}/review-input.diff"',
				].join("\n"),
				"utf8",
			)

			sandbox.stub(StateManager, "get").returns({
				getRemoteConfigSettings: () => ({}),
				getGlobalStateKey: () => ({}),
			} as unknown as StateManager)

			const parseResult = await parseSlashCommands(
				"<task>/custom-review.md continue</task>",
				{ [workflowPath]: true },
				{},
				"test-ulid",
				undefined,
				false,
				undefined,
				undefined,
				tempDir,
			)

			expect(parseResult.persistentSlashCommandAction?.type).to.equal("activate_placeholder_workflow")
			const placeholderAction = parseResult.persistentSlashCommandAction
			expect(placeholderAction?.type).to.equal("activate_placeholder_workflow")
			if (!placeholderAction || placeholderAction.type !== "activate_placeholder_workflow") {
				throw new Error("Expected placeholder workflow activation")
			}
			expect(placeholderAction.workflowSource).to.deep.equal({
				type: "local",
				name: "custom-review.md",
				path: workflowPath,
				configPath,
			})

			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves({} as never)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()
			const fakeTask = {
				...createFakeTask("task-slash-stable"),
				cwd: tempDir,
			}

			await applyPersistentSlashCommandAction.call(fakeTask, parseResult.persistentSlashCommandAction)

			expect(getMetadataStub.calledOnce).to.equal(true)
			expect(fakeTask.taskState.activePlaceholderWorkflowStableValues).to.include({
				communication_language: "English",
				config_source: ".cline/workflow-config.yaml",
				output_folder: `${tempDir}/workflow-output`,
			})

			const workflowSource = fakeTask.taskState.activePlaceholderWorkflowSource
			if (!workflowSource) {
				throw new Error("Expected activePlaceholderWorkflowSource to be set")
			}

			const prompt = await buildPlaceholderWorkflowActivationInstructions.call(fakeTask, {
				type: "activate_placeholder_workflow",
				workflowId: "custom-review.md",
				workflowSource,
			})

			expect(prompt).to.equal(undefined)
			const [, savedMetadata] = saveMetadataStub.firstCall.args
			expect(savedMetadata.activePlaceholderWorkflowStableValues).to.include({
				communication_language: "English",
				config_source: ".cline/workflow-config.yaml",
				output_folder: `${tempDir}/workflow-output`,
			})
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("renders migrated Step 2 guidance with build_review_diff_output and stable diff_output placeholder handling", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-step-3-guidance-"))
		try {
			const workflowPath = path.join(tempDir, "code-review.md")
			const configPath = getCanonicalWorkflowConfigPath(tempDir)
			await fs.mkdir(path.dirname(configPath), { recursive: true })
			await fs.writeFile(
				workflowPath,
				`# Code Review

## Step 2: Construct & Persist Diff Output File
Goal: Construct a diff output with detailed code changes from the most recent dev cycle

When the requested diff source is inside the supported Git-backed contract, use the \`build_review_diff_output\` tool to build and replace {diff_output}.

Supported tool-backed sources:
- an explicit commit from the user or story
- an explicit commit range from the user or story
- an explicit branch diff or remote branch reference from the user or story
- \`git diff HEAD -- <scoped-paths>\` for tracked scoped files with unstaged and/or staged changes

Use raw \`git show\` / \`git diff\` construction only as fallback when:
- the \`build_review_diff_output\` tool is unavailable
- the tool errors
- or the requested diff source is outside the tool's supported contract

If no diff sources are available this step may be completed without persisting a new \`review-input.diff\` file.

Done Signal: You've persisted a new \`review-input.diff\` file in {output_folder}
`,
				"utf8",
			)
			await fs.writeFile(
				configPath,
				[
					'communication_language: "English"',
					'output_folder: "{project-root}/workflow-output"',
					'diff_output: "{output_folder}/review-input.diff"',
				].join("\n"),
				"utf8",
			)

			sandbox.stub(disk, "getTaskMetadata").resolves({} as never)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const fakeTask = {
				...createFakeTask("task-step-3-guidance"),
				cwd: tempDir,
			}
			fakeTask.taskState.activePlaceholderWorkflowId = "code-review.md"
			fakeTask.taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
				configPath,
			}
			fakeTask.taskState.activePlaceholderWorkflowStableValues = {
				communication_language: "English",
				config_source: ".cline/workflow-config.yaml",
				output_folder: `${tempDir}/workflow-output`,
				diff_output: `${tempDir}/workflow-output/review-input.diff`,
			}

			const prompt = await buildPlaceholderWorkflowActivationInstructions.call(fakeTask, {
				type: "activate_placeholder_workflow",
				workflowId: "code-review.md",
				workflowSource: fakeTask.taskState.activePlaceholderWorkflowSource,
			})

			expect(prompt).to.equal(undefined)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("chains successful Step 2 diff-output resolution into the Step 3 workflow form before returning control", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-step-3-post-form-prompt-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		const diffOutputPath = path.join(tempDir, "workflow-output", "review-input.diff")
		const reviewInputPath = path.join(tempDir, "workflow-output", "review-input.md")

		try {
			await fs.writeFile(
				workflowPath,
				`# Code Review

## Step 1: Determine Review Source
Done.

## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
Goal: The primary path for this step is runtime-owned workflow-form resolution. The AI instructions below are fallback-only and apply only when the system-owned path was not completed.

You are in the fallback path because the system-owned workflow-form path was not completed.

Do not ask the human to restate or re-enter a diff source they already declined to provide in the form flow.

Use \`build_review_diff_output\` whenever a supported source is discovered.

## Step 3: Construct & Persist Review Input File
Construct and persist review_input.md from the persisted diff output before continuing.
`,
				"utf8",
			)
			await fs.mkdir(path.dirname(diffOutputPath), { recursive: true })

			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
			}
			taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
				"- [ ] Step 3: Construct & Persist Review Input File",
			].join("\n")
			taskState.activePlaceholderWorkflowStableValues = {
				output_folder: path.join(tempDir, "workflow-output"),
				review_input: reviewInputPath,
			}

			const stepTwoSession: WorkflowFormSessionState = {
				sessionId: "wf-session-step-2",
				resolverId: "code_review_step_3_diff_source",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 2,
				},
				phase: "collect_inputs",
				initialPhase: "confirm",
				values: {},
			}
			const stepThreeSession: WorkflowFormSessionState = {
				sessionId: "wf-session-step-3-after-step-2",
				resolverId: "code_review_step_3_review_input",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				phase: "confirm",
				initialPhase: "confirm",
				values: {},
			}

			let renderCount = 0
			const fakeTask: FakeWorkflowFormTask = {
				cwd: tempDir,
				taskState,
				pendingWorkflowFormOutcome: undefined,
				messageStateHandler: {
					getClineMessages: sinon.stub().returns([]),
				},
				workflowFormRuntime: {
					createSession: sinon.stub().onFirstCall().returns(stepTwoSession).onSecondCall().returns(stepThreeSession),
					buildPayload: sinon.stub().callsFake((session: unknown) => ({ kind: "workflow_form", session })),
					buildSuccessPayload: sinon.stub().returns({ kind: "workflow_form_success" }),
				},
				persistWorkflowFormSession: sinon.stub().resolves(),
				renderWorkflowFormMessage: sinon.stub().callsFake(async () => {
					renderCount += 1
					if (renderCount === 1) {
						fakeTask.pendingWorkflowFormOutcome = {
							kind: "invoke_tool",
							session: stepTwoSession,
							toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
							toolInput: {
								source: {
									type: "commit",
									commit: "abc1234",
								},
							},
							toolParams: {
								source: JSON.stringify({
									type: "commit",
									commit: "abc1234",
								}),
							},
						}
					}
					if (renderCount === 3) {
						fakeTask.pendingWorkflowFormOutcome = {
							kind: "fallback_to_agent",
							session: stepThreeSession,
						}
					}
				}),
				executeWorkflowFormToolAndSync: sinon.stub().callsFake(async () => {
					await fs.writeFile(diffOutputPath, "diff --git a/file.ts b/file.ts\n", "utf8")
					taskState.activePlaceholderWorkflowValues = {
						diff_output: diffOutputPath,
					}
					taskState.activePlaceholderWorkflowTaskWriteProofPaths = [diffOutputPath]
					taskState.currentFocusChainChecklist = [
						"- [x] Step 1: Determine Review Source",
						"- [x] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
						"- [ ] Step 3: Construct & Persist Review Input File",
					].join("\n")
					return { succeeded: true }
				}),
				clearWorkflowFormSession: sinon.stub().callsFake(async () => {
					taskState.activeWorkflowFormSession = undefined
				}),
				setThreadDisplayState: sinon.stub(),
				postStateToWebview: sinon.stub().resolves(),
			}

			await maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask)

			expect(fakeTask.workflowFormRuntime.createSession.callCount).to.equal(2)
			expect(fakeTask.workflowFormRuntime.createSession.firstCall.args[0]).to.deep.equal({
				resolverId: "code_review_step_3_diff_source",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 2,
				},
				initialPhase: "confirm",
				context: undefined,
			})
			expect(fakeTask.workflowFormRuntime.createSession.secondCall.args[0]).to.deep.equal({
				resolverId: "code_review_step_3_review_input",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				initialPhase: "confirm",
				context: undefined,
			})
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("opens the Phase 3 review-input workflow form after Step 2 is complete and Step 3 is active", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-step-3-review-input-open-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		const diffOutputPath = path.join(tempDir, "workflow-output", "review-input.diff")
		const reviewInputPath = path.join(tempDir, "workflow-output", "review-input.md")

		try {
			await fs.writeFile(
				workflowPath,
				`# Code Review

## Step 1: Determine Review Source
Done.

## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
Done.

## Step 3: Construct & Persist Review Input File
You are in the fallback path because the system-owned workflow-form path was not completed.

Construct and persist review_input.md from the persisted diff output before continuing.
`,
				"utf8",
			)

			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
			}
			taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [x] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
				"- [ ] Step 3: Construct & Persist Review Input File",
			].join("\n")
			taskState.activePlaceholderWorkflowStableValues = {
				output_folder: path.join(tempDir, "workflow-output"),
				diff_output: diffOutputPath,
				review_input: reviewInputPath,
			}

			const createdSession: WorkflowFormSessionState = {
				sessionId: "wf-session-step-3-review-input",
				resolverId: "code_review_step_3_review_input",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				phase: "confirm",
				initialPhase: "confirm",
				values: {},
			}

			const fakeTask: FakeWorkflowFormTask = {
				cwd: tempDir,
				taskState,
				pendingWorkflowFormOutcome: undefined,
				messageStateHandler: {
					getClineMessages: sinon.stub().returns([]),
				},
				workflowFormRuntime: {
					createSession: sinon.stub().returns(createdSession),
					buildPayload: sinon.stub().callsFake((session: WorkflowFormSessionState) => ({
						phase: session.phase,
						sessionId: session.sessionId,
					})),
				},
				persistWorkflowFormSession: sinon.stub().resolves(),
				renderWorkflowFormMessage: sinon.stub().callsFake(async () => {
					fakeTask.pendingWorkflowFormOutcome = {
						kind: "fallback_to_agent",
						session: createdSession,
					}
				}),
				setThreadDisplayState: sinon.stub(),
				postStateToWebview: sinon.stub().resolves(),
			}

			await maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask)

			sinon.assert.calledOnceWithExactly(fakeTask.workflowFormRuntime.createSession, {
				resolverId: "code_review_step_3_review_input",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				initialPhase: "confirm",
				context: undefined,
			})
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("dismisses a trailing command_output ask before rendering a step-triggered workflow form", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-step-2-command-output-dismiss-"))
		const workflowPath = path.join(tempDir, "code-review.md")

		try {
			await fs.writeFile(
				workflowPath,
				`# Code Review

## Step 1: Determine Review Source
Done.

## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
You are in the fallback path because the system-owned workflow-form path was not completed.
`,
				"utf8",
			)

			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
			}
			taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
				"- [ ] Step 3: Construct & Persist Review Input File",
			].join("\n")

			const createdSession: WorkflowFormSessionState = {
				sessionId: "wf-session-step-2-command-output-dismiss",
				resolverId: "code_review_step_3_diff_source",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 2,
				},
				phase: "confirm",
				initialPhase: "confirm",
				values: {},
			}
			const sayStub = sinon.stub().resolves(undefined)

			const fakeTask: FakeWorkflowFormTask = {
				cwd: tempDir,
				taskState,
				pendingWorkflowFormOutcome: undefined,
				messageStateHandler: {
					getClineMessages: sinon.stub().returns([{ ask: "command_output" }]),
				},
				workflowFormRuntime: {
					createSession: sinon.stub().returns(createdSession),
					buildPayload: sinon.stub().callsFake((session: WorkflowFormSessionState) => ({
						phase: session.phase,
						sessionId: session.sessionId,
					})),
				},
				persistWorkflowFormSession: sinon.stub().resolves(),
				renderWorkflowFormMessage: sinon.stub().callsFake(async () => {
					fakeTask.pendingWorkflowFormOutcome = {
						kind: "fallback_to_agent",
						session: createdSession,
					}
				}),
				say: sayStub,
				setThreadDisplayState: sinon.stub(),
				postStateToWebview: sinon.stub().resolves(),
			}

			await maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask)

			sinon.assert.calledOnceWithExactly(sayStub, "command_output", "")
			sinon.assert.callOrder(sayStub, fakeTask.renderWorkflowFormMessage)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("renders the exact Phase 3 diff/story mismatch message once as a terminal workflow-form notice, suppresses the resolver, and returns control to manual Step 3", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-step-3-mismatch-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		const diffOutputPath = path.join(tempDir, "workflow-output", "review-input.diff")
		const reviewInputPath = path.join(tempDir, "workflow-output", "review-input.md")

		try {
			await fs.writeFile(
				workflowPath,
				`# Code Review

## Step 1: Determine Review Source
Done.

## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
Done.

## Step 3: Construct & Persist Review Input File
You are in the fallback path because the system-owned workflow-form path was not completed.

Construct and persist review_input.md from the persisted diff output before continuing.
`,
				"utf8",
			)

			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
			}
			taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [x] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
				"- [ ] Step 3: Construct & Persist Review Input File",
			].join("\n")
			taskState.activePlaceholderWorkflowStableValues = {
				output_folder: path.join(tempDir, "workflow-output"),
				diff_output: diffOutputPath,
				review_input: reviewInputPath,
			}

			const createdSession: WorkflowFormSessionState = {
				sessionId: "wf-session-step-3-mismatch",
				resolverId: "code_review_step_3_review_input",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				phase: "collect_inputs",
				initialPhase: "confirm",
				values: {
					story_path: { rawValue: "docs/story.md" },
				},
			}
			const renderedPayloads: ClineWorkflowForm[] = []

			const fakeTask: FakeWorkflowFormTask &
				Record<string, unknown> & {
					toolExecutor: { executeTool: sinon.SinonStub }
					syncDeterministicProgressionAfterWorkflowFormTool: sinon.SinonStub
					getWorkflowFormToolResultText: typeof getWorkflowFormToolResultText
					getWorkflowFormToolErrorMessage: typeof getWorkflowFormToolErrorMessage
				} = {
				cwd: tempDir,
				taskState,
				pendingWorkflowFormOutcome: undefined,
				messageStateHandler: {
					getClineMessages: sinon.stub().returns([]),
				},
				workflowFormRuntime: {
					createSession: sinon.stub().returns(createdSession),
					buildPayload: sinon.stub().callsFake((session: WorkflowFormSessionState) => ({
						sessionId: session.sessionId,
						phase: session.phase,
					})),
					buildSuccessPayload: sinon.stub().callsFake((session: WorkflowFormSessionState, successMessage: string) => ({
						sessionId: session.sessionId,
						phase: "success",
						successMessage,
					})),
				},
				persistWorkflowFormSession: sinon.stub().resolves(),
				renderWorkflowFormMessage: sinon.stub().callsFake(async (payload: ClineWorkflowForm) => {
					renderedPayloads.push(payload)
					if (renderedPayloads.length === 1) {
						fakeTask.pendingWorkflowFormOutcome = {
							kind: "invoke_tool",
							session: createdSession,
							toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
							toolInput: { story_path: "docs/story.md" },
							toolParams: { story_path: "docs/story.md" },
						}
					}
				}),
				executeWorkflowFormToolAndSync: sinon
					.stub()
					.callsFake(async (outcome: unknown) => executeWorkflowFormToolAndSync.call(fakeTask, outcome)),
				toolExecutor: {
					executeTool: sinon.stub().callsFake(async () => {
						taskState.userMessageContent.push({
							type: "tool_result",
							tool_use_id: "call_native_review_input_mismatch",
							content: JSON.stringify({
								persisted: false,
								review_input_available: false,
								recent_story_changes_detected: false,
								reason: "diff_output does not identify recent changes to the story file.",
							}),
						})
					}),
				},
				syncDeterministicProgressionAfterWorkflowFormTool: sinon.stub().resolves(),
				getWorkflowFormToolResultText,
				getWorkflowFormToolErrorMessage,
				clearWorkflowFormSession: sinon.stub().callsFake(async () => {
					await clearWorkflowFormSession.call(fakeTask)
				}),
				setThreadDisplayState: sinon.stub(),
				postStateToWebview: sinon.stub().resolves(),
			}

			await maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask)

			expect(renderedPayloads).to.have.length(2)
			expect(renderedPayloads[1]?.phase).to.equal("success")
			expect(renderedPayloads[1]?.successMessage).to.equal(
				"diff_output does not identify recent changes to the story file. Proceeding with AI generation of review_input.md using the fallback Step 3 instructions.",
			)
			expect(taskState.suppressedWorkflowFormResolverIds).to.include("code_review_step_3_review_input")
			expect(taskState.activeWorkflowFormSession).to.equal(undefined)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("falls back after build_review_input tool errors and preserves the tool error in a terminal workflow-form notice", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-step-3-tool-error-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		const diffOutputPath = path.join(tempDir, "workflow-output", "review-input.diff")
		const reviewInputPath = path.join(tempDir, "workflow-output", "review-input.md")
		const toolError =
			"The tool execution failed with the following error:\n<error>\nThe provided story file does not contain the required story structure for deterministic review-input generation.\n</error>"

		try {
			await fs.writeFile(
				workflowPath,
				`# Code Review

## Step 1: Determine Review Source
Done.

## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
Done.

## Step 3: Construct & Persist Review Input File
You are in the fallback path because the system-owned workflow-form path was not completed.

Construct and persist review_input.md from the persisted diff output before continuing.
`,
				"utf8",
			)

			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
			}
			taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [x] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
				"- [ ] Step 3: Construct & Persist Review Input File",
			].join("\n")
			taskState.activePlaceholderWorkflowStableValues = {
				output_folder: path.join(tempDir, "workflow-output"),
				diff_output: diffOutputPath,
				review_input: reviewInputPath,
			}

			const createdSession: WorkflowFormSessionState = {
				sessionId: "wf-session-step-3-tool-error",
				resolverId: "code_review_step_3_review_input",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				phase: "collect_inputs",
				initialPhase: "confirm",
				values: {
					story_path: { rawValue: "docs/story.md" },
				},
			}
			const renderedPayloads: ClineWorkflowForm[] = []

			const fakeTask: FakeWorkflowFormTask &
				Record<string, unknown> & {
					toolExecutor: { executeTool: sinon.SinonStub }
					syncDeterministicProgressionAfterWorkflowFormTool: sinon.SinonStub
					getWorkflowFormToolResultText: typeof getWorkflowFormToolResultText
					getWorkflowFormToolErrorMessage: typeof getWorkflowFormToolErrorMessage
				} = {
				cwd: tempDir,
				taskState,
				pendingWorkflowFormOutcome: undefined,
				messageStateHandler: {
					getClineMessages: sinon.stub().returns([]),
				},
				workflowFormRuntime: {
					createSession: sinon.stub().returns(createdSession),
					buildPayload: sinon.stub().callsFake((session: WorkflowFormSessionState) => ({
						sessionId: session.sessionId,
						phase: session.phase,
					})),
					buildSuccessPayload: sinon.stub().callsFake((session: WorkflowFormSessionState, successMessage: string) => ({
						sessionId: session.sessionId,
						phase: "success",
						successMessage,
					})),
				},
				persistWorkflowFormSession: sinon.stub().resolves(),
				renderWorkflowFormMessage: sinon.stub().callsFake(async (payload: ClineWorkflowForm) => {
					renderedPayloads.push(payload)
					if (renderedPayloads.length === 1) {
						fakeTask.pendingWorkflowFormOutcome = {
							kind: "invoke_tool",
							session: createdSession,
							toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
							toolInput: { story_path: "docs/story.md" },
							toolParams: { story_path: "docs/story.md" },
						}
					}
				}),
				executeWorkflowFormToolAndSync: sinon
					.stub()
					.callsFake(async (outcome: unknown) => executeWorkflowFormToolAndSync.call(fakeTask, outcome)),
				toolExecutor: {
					executeTool: sinon.stub().callsFake(async () => {
						taskState.userMessageContent.push({
							type: "text",
							text: toolError,
						})
					}),
				},
				syncDeterministicProgressionAfterWorkflowFormTool: sinon.stub().resolves(),
				getWorkflowFormToolResultText,
				getWorkflowFormToolErrorMessage,
				clearWorkflowFormSession: sinon.stub().callsFake(async () => {
					await clearWorkflowFormSession.call(fakeTask)
				}),
				setThreadDisplayState: sinon.stub(),
				postStateToWebview: sinon.stub().resolves(),
			}

			await maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask)

			expect(renderedPayloads).to.have.length(2)
			expect(renderedPayloads[1]?.phase).to.equal("success")
			expect(renderedPayloads[1]?.successMessage).to.equal(toolError)
			expect(taskState.suppressedWorkflowFormResolverIds).to.include("code_review_step_3_review_input")
			expect(taskState.activeWorkflowFormSession).to.equal(undefined)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("resumes an existing slash-command workflow-form session without requiring a new slash-command action", async () => {
		const session: WorkflowFormSessionState = {
			sessionId: "wf-session-start-1",
			resolverId: "placeholder_workflow_start_set_workflow_placeholders",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			phase: "collect_inputs",
			initialPhase: "collect_inputs",
			values: {},
			context: {
				workflowName: "review-adversarial-general.md",
				workflowStartRequirements: {
					requiredFieldKeys: [],
					optionalFieldKeys: ["review_input"],
				},
			},
		}
		const renderedPayload = { kind: "workflow_form", session }
		const taskState = new TaskState()
		taskState.activeWorkflowFormSession = session

		const fakeTask: FakeWorkflowFormTask = {
			cwd: process.cwd(),
			taskState,
			pendingWorkflowFormOutcome: undefined,
			messageStateHandler: {
				getClineMessages: sinon.stub().returns([]),
			},
			workflowFormRuntime: {
				createSession: sinon.stub(),
				buildPayload: sinon.stub().returns(renderedPayload),
			},
			renderWorkflowFormMessage: sinon.stub().callsFake(async () => {
				fakeTask.pendingWorkflowFormOutcome = {
					kind: "fallback_to_agent",
					session,
				}
			}),
			setThreadDisplayState: sinon.stub(),
			postStateToWebview: sinon.stub().resolves(),
		}

		await maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask, undefined)

		expect(fakeTask.workflowFormRuntime.createSession.called).to.equal(false)
		expect(fakeTask.workflowFormRuntime.buildPayload.calledOnceWithExactly(session)).to.equal(true)
		expect(fakeTask.renderWorkflowFormMessage.calledOnceWithExactly(renderedPayload)).to.equal(true)
	})

	it("chains slash-command workflow-start success into the code-review Step 2 diff form before returning control", async () => {
		const workflowStartSession: WorkflowFormSessionState = {
			sessionId: "wf-session-start-chain",
			resolverId: "placeholder_workflow_start_set_workflow_placeholders",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "code-review.md",
				stepNumber: 1,
			},
			phase: "collect_inputs",
			initialPhase: "collect_inputs",
			values: {
				review_input: { rawValue: "docs/review.md" },
			},
			context: {
				workflowName: "code-review.md",
				workflowStartRequirements: {
					requiredFieldKeys: [],
					optionalFieldKeys: ["review_input"],
				},
			},
		}
		const stepTwoSession: WorkflowFormSessionState = {
			sessionId: "wf-session-step-2-chain",
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 2,
			},
			phase: "confirm",
			initialPhase: "confirm",
			values: {},
		}
		const taskState = new TaskState()
		taskState.activePlaceholderWorkflowId = "code-review.md"
		taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "code-review.md",
			contents: `# Code Review

## Step 1: Determine Review Source
Optional: {{review_input}}

## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
Build the diff output before continuing.

## Step 3: Construct & Persist Review Input File
Build the review input before continuing.
`,
		}
		taskState.currentFocusChainChecklist = [
			"- [ ] Step 1: Determine Review Source",
			"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
			"- [ ] Step 3: Construct & Persist Review Input File",
		].join("\n")

		let renderCount = 0
		const fakeTask: FakeWorkflowFormTask & {
			executeWorkflowFormToolAndSync: sinon.SinonStub
		} = {
			cwd: process.cwd(),
			taskState,
			pendingWorkflowFormOutcome: undefined,
			messageStateHandler: {
				getClineMessages: sinon.stub().returns([]),
			},
			workflowFormRuntime: {
				createSession: sinon.stub().onFirstCall().returns(workflowStartSession).onSecondCall().returns(stepTwoSession),
				buildPayload: sinon.stub().callsFake((session: WorkflowFormSessionState) => ({
					sessionId: session.sessionId,
					phase: session.phase,
				})),
				buildSuccessPayload: sinon.stub().callsFake((session: WorkflowFormSessionState, successMessage: string) => ({
					sessionId: session.sessionId,
					phase: "success",
					successMessage,
				})),
			},
			persistWorkflowFormSession: sinon.stub().resolves(),
			renderWorkflowFormMessage: sinon.stub().callsFake(async () => {
				renderCount += 1
				if (renderCount === 1) {
					fakeTask.pendingWorkflowFormOutcome = {
						kind: "invoke_tool",
						session: workflowStartSession,
						toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
						toolInput: { values: { review_input: "docs/review.md" } },
						toolParams: { values: JSON.stringify({ review_input: "docs/review.md" }) },
					}
				}
				if (renderCount === 3) {
					fakeTask.pendingWorkflowFormOutcome = {
						kind: "fallback_to_agent",
						session: stepTwoSession,
					}
				}
			}),
			executeWorkflowFormToolAndSync: sinon.stub().callsFake(async (outcome: WorkflowFormRuntimeOutcome) => {
				expect(outcome).to.include({ kind: "invoke_tool" })
				taskState.currentFocusChainChecklist = [
					"- [x] Step 1: Determine Review Source",
					"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
					"- [ ] Step 3: Construct & Persist Review Input File",
				].join("\n")
				return { succeeded: true }
			}),
			clearWorkflowFormSession: sinon.stub().callsFake(async () => {
				taskState.activeWorkflowFormSession = undefined
			}),
			setThreadDisplayState: sinon.stub(),
			postStateToWebview: sinon.stub().resolves(),
		}

		await maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask, {
			type: "activate_placeholder_workflow",
			workflowId: "code-review.md",
			workflowSource: {
				type: "remote",
				name: "code-review.md",
				contents: "# Code review\nInspect the implementation.",
			},
		})

		expect(fakeTask.workflowFormRuntime.createSession.callCount).to.equal(2)
		expect(fakeTask.workflowFormRuntime.createSession.firstCall.args[0]?.resolverId).to.equal(
			"placeholder_workflow_start_set_workflow_placeholders",
		)
		expect(fakeTask.workflowFormRuntime.createSession.secondCall.args[0]?.resolverId).to.equal(
			"code_review_step_3_diff_source",
		)
	})

	it("treats workflow-start placeholder storage as workflow-form success even when Step 1 remains active", async () => {
		const session: WorkflowFormSessionState = {
			sessionId: "wf-session-start-success",
			resolverId: "placeholder_workflow_start_set_workflow_placeholders",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			phase: "collect_inputs",
			initialPhase: "collect_inputs",
			values: {
				review_input: { rawValue: "docs/review.md" },
			},
			context: {
				workflowName: "review-adversarial-general.md",
				workflowStartRequirements: {
					requiredFieldKeys: [],
					optionalFieldKeys: ["review_input"],
				},
			},
		}
		const taskState = new TaskState()
		const fakeTask = {
			taskState,
			toolExecutor: {
				executeTool: sinon.stub().callsFake(async () => {
					taskState.userMessageContent.push({
						type: "text",
						text: "Stored 1 workflow placeholder: review_input.",
					})
				}),
			},
			syncDeterministicProgressionAfterWorkflowFormTool: sinon.stub().callsFake(async () => {
				taskState.currentFocusChainChecklist = "- [ ] Step 1: Determine Review Source"
			}),
			getWorkflowFormToolResultText: getWorkflowFormToolResultText,
			getWorkflowFormToolErrorMessage: getWorkflowFormToolErrorMessage,
		}

		const result = await executeWorkflowFormToolAndSync.call(fakeTask, {
			kind: "invoke_tool",
			session,
			toolName: "set_workflow_placeholders",
			toolInput: { values: { review_input: "docs/review.md" } },
			toolParams: { values: JSON.stringify({ review_input: "docs/review.md" }) },
		})

		expect(result.succeeded).to.equal(true)
	})

	it("does not reopen the workflow-start form when workflow-start success leaves Step 1 active", async () => {
		const workflowStartSession: WorkflowFormSessionState = {
			sessionId: "wf-session-start-no-reopen",
			resolverId: "placeholder_workflow_start_set_workflow_placeholders",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "code-review.md",
				stepNumber: 1,
			},
			phase: "collect_inputs",
			initialPhase: "collect_inputs",
			values: {
				review_input: { rawValue: "docs/review.md" },
			},
			context: {
				workflowName: "code-review.md",
				workflowStartRequirements: {
					requiredFieldKeys: [],
					optionalFieldKeys: ["review_input"],
				},
			},
		}
		const taskState = new TaskState()
		taskState.activePlaceholderWorkflowId = "code-review.md"
		taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "code-review.md",
			contents: `# Code Review

## Step 1: Determine Review Source
Optional: {{review_input}}

## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
Build the diff output before continuing.
`,
		}
		taskState.currentFocusChainChecklist = [
			"- [ ] Step 1: Determine Review Source",
			"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
		].join("\n")

		let renderCount = 0
		const fakeTask: FakeWorkflowFormTask & {
			executeWorkflowFormToolAndSync: sinon.SinonStub
		} = {
			cwd: process.cwd(),
			taskState,
			pendingWorkflowFormOutcome: undefined,
			messageStateHandler: {
				getClineMessages: sinon.stub().returns([]),
			},
			workflowFormRuntime: {
				createSession: sinon.stub().returns(workflowStartSession),
				buildPayload: sinon.stub().callsFake((session: WorkflowFormSessionState) => ({
					sessionId: session.sessionId,
					phase: session.phase,
				})),
				buildSuccessPayload: sinon.stub().callsFake((session: WorkflowFormSessionState, successMessage: string) => ({
					sessionId: session.sessionId,
					phase: "success",
					successMessage,
				})),
			},
			persistWorkflowFormSession: sinon.stub().resolves(),
			renderWorkflowFormMessage: sinon.stub().callsFake(async () => {
				renderCount += 1
				if (renderCount === 1) {
					fakeTask.pendingWorkflowFormOutcome = {
						kind: "invoke_tool",
						session: workflowStartSession,
						toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
						toolInput: { values: { review_input: "docs/review.md" } },
						toolParams: { values: JSON.stringify({ review_input: "docs/review.md" }) },
					}
				}
			}),
			executeWorkflowFormToolAndSync: sinon.stub().callsFake(async () => {
				taskState.currentFocusChainChecklist = [
					"- [ ] Step 1: Determine Review Source",
					"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
				].join("\n")
				return { succeeded: true }
			}),
			clearWorkflowFormSession: sinon.stub().callsFake(async () => {
				taskState.activeWorkflowFormSession = undefined
			}),
			setThreadDisplayState: sinon.stub(),
			postStateToWebview: sinon.stub().resolves(),
		}

		await maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask, {
			type: "activate_placeholder_workflow",
			workflowId: "code-review.md",
			workflowSource: {
				type: "remote",
				name: "code-review.md",
				contents: "# Code review\nInspect the implementation.",
			},
		})

		expect(fakeTask.workflowFormRuntime.createSession.callCount).to.equal(1)
		expect(fakeTask.workflowFormRuntime.createSession.firstCall.args[0]?.resolverId).to.equal(
			"placeholder_workflow_start_set_workflow_placeholders",
		)
	})

	it("prefers appended decorated tool_result JSON over preceding tool text when evaluating workflow-form tool success", async () => {
		const session: WorkflowFormSessionState = {
			sessionId: "wf-session-diff-success",
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 2,
			},
			phase: "collect_inputs",
			initialPhase: "confirm",
			values: {},
		}
		const taskState = new TaskState()
		const fakeTask = {
			taskState,
			toolExecutor: {
				executeTool: sinon.stub().callsFake(async (block: { call_id?: string; isNativeToolCall?: boolean }) => {
					taskState.userMessageContent.push({
						type: "text",
						text: JSON.stringify({
							tool: "buildReviewDiffOutput",
							path: "_bmad-output/review-input.diff",
							content: "Source: commit abc1234",
						}),
					})
					if (block.isNativeToolCall && block.call_id) {
						taskState.userMessageContent.push({
							type: "tool_result",
							tool_use_id: block.call_id,
							content:
								"[build_review_diff_output commit] Result:\n" +
								JSON.stringify({
									persisted: true,
									diff_available: true,
									artifact_path: "/tmp/review-input.diff",
								}),
						})
						return
					}

					taskState.userMessageContent.push({
						type: "text",
						text:
							"[build_review_diff_output commit] Result:\n" +
							JSON.stringify({
								persisted: true,
								diff_available: true,
								artifact_path: "/tmp/review-input.diff",
							}),
					})
				}),
			},
			syncDeterministicProgressionAfterWorkflowFormTool: sinon.stub().resolves(),
			getWorkflowFormToolResultText: getWorkflowFormToolResultText,
			getWorkflowFormToolErrorMessage: getWorkflowFormToolErrorMessage,
		}

		const result = await executeWorkflowFormToolAndSync.call(fakeTask, {
			kind: "invoke_tool",
			session,
			toolName: "build_review_diff_output",
			toolInput: { source: { type: "commit", commit: "abc1234" } },
			toolParams: { source: JSON.stringify({ type: "commit", commit: "abc1234" }) },
		})

		expect(fakeTask.toolExecutor.executeTool.firstCall.args[0]).to.include({
			isNativeToolCall: true,
			call_id: "workflow_form_wf-session-diff-success",
		})
		expect(result.succeeded).to.equal(true)
	})

	it("keeps the workflow-start form in failure state when set_workflow_placeholders returns the empty-values error", async () => {
		const session: WorkflowFormSessionState = {
			sessionId: "wf-session-start-failure",
			resolverId: "placeholder_workflow_start_set_workflow_placeholders",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			phase: "collect_inputs",
			initialPhase: "collect_inputs",
			values: {},
			context: {
				workflowName: "review-adversarial-general.md",
				workflowStartRequirements: {
					requiredFieldKeys: [],
					optionalFieldKeys: ["review_input"],
				},
			},
		}
		const taskState = new TaskState()
		const fakeTask = {
			taskState,
			toolExecutor: {
				executeTool: sinon.stub().callsFake(async () => {
					taskState.userMessageContent.push({
						type: "text",
						text: "Error: Missing required parameter 'values'. Provide at least one placeholder value to store.",
					})
				}),
			},
			syncDeterministicProgressionAfterWorkflowFormTool: sinon.stub().resolves(),
			getWorkflowFormToolResultText: getWorkflowFormToolResultText,
			getWorkflowFormToolErrorMessage: getWorkflowFormToolErrorMessage,
		}

		const result = await executeWorkflowFormToolAndSync.call(fakeTask, {
			kind: "invoke_tool",
			session,
			toolName: "set_workflow_placeholders",
			toolInput: { values: {} },
			toolParams: { values: JSON.stringify({}) },
		})

		expect(result.succeeded).to.equal(false)
		expect(result.errorMessage).to.equal(
			"Error: Missing required parameter 'values'. Provide at least one placeholder value to store.",
		)
	})

	it("treats a decorated non-persisted Phase 1 diff result as workflow-form failure", async () => {
		const session: WorkflowFormSessionState = {
			sessionId: "wf-session-diff-failure",
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 2,
			},
			phase: "collect_inputs",
			initialPhase: "confirm",
			values: {},
		}
		const taskState = new TaskState()
		const fakeTask = {
			taskState,
			toolExecutor: {
				executeTool: sinon.stub().callsFake(async (block: { call_id?: string; isNativeToolCall?: boolean }) => {
					if (block.isNativeToolCall && block.call_id) {
						taskState.userMessageContent.push({
							type: "tool_result",
							tool_use_id: block.call_id,
							content:
								"[build_review_diff_output commit] Result:\n" +
								JSON.stringify({
									persisted: false,
									diff_available: false,
									reason: "No Git-backed diff content was available for the requested source and scope.",
								}),
						})
						return
					}

					taskState.userMessageContent.push({
						type: "text",
						text: JSON.stringify({
							persisted: false,
							diff_available: false,
							reason: "No Git-backed diff content was available for the requested source and scope.",
						}),
					})
				}),
			},
			syncDeterministicProgressionAfterWorkflowFormTool: sinon.stub().resolves(),
			getWorkflowFormToolResultText: getWorkflowFormToolResultText,
			getWorkflowFormToolErrorMessage: getWorkflowFormToolErrorMessage,
		}

		const result = await executeWorkflowFormToolAndSync.call(fakeTask, {
			kind: "invoke_tool",
			session,
			toolName: "build_review_diff_output",
			toolInput: { source: { type: "commit", commit: "abc1234" } },
			toolParams: { source: JSON.stringify({ type: "commit", commit: "abc1234" }) },
		})

		expect(result.succeeded).to.equal(false)
		expect(result.errorMessage).to.equal("No Git-backed diff content was available for the requested source and scope.")
	})

	it("auto-binds the owning BMAD agent when a placeholder workflow maps to a managed BMAD twin", async () => {
		const sandbox = sinon.createSandbox()
		try {
			sandbox.stub(disk, "getTaskMetadata").resolves({} as never)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()
			const fakeTask = createFakeTask("task-placeholder-autobind")

			await applyPersistentSlashCommandAction.call(fakeTask, {
				type: "activate_placeholder_workflow",
				workflowId: "code-review.md",
				workflowSource: {
					type: "remote",
					name: "code-review.md",
					contents: "# Code review\nInspect the implementation.",
				},
			})

			expect(fakeTask.taskState.activeAgentId).to.equal("bmad-dev")
			expect(fakeTask.taskState.activeAgentSkillName).to.equal("bmad-dev")
			expect(fakeTask.taskState.activeAgentInvokedSlashCommand).to.equal("code-review.md")
			expect(fakeTask.taskState.activePlaceholderWorkflowId).to.equal("code-review.md")
			expect(saveMetadataStub.calledOnce).to.equal(true)
			const [, savedMetadata] = saveMetadataStub.firstCall.args
			expect(savedMetadata.activeAgentId).to.equal("bmad-dev")
		} finally {
			sandbox.restore()
		}
	})

	it("blocks mapped placeholder workflow activation when the active BMAD agent is not allowed for the managed twin", async () => {
		const sandbox = sinon.createSandbox()
		try {
			sandbox.stub(disk, "getTaskMetadata").resolves({} as never)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()
			const fakeTask = createFakeTask("task-placeholder-incompatible-agent")
			fakeTask.taskState.activeAgentId = "bmad-pm"
			fakeTask.taskState.activeAgentSkillName = "bmad-pm"
			fakeTask.taskState.activeAgentInvokedSlashCommand = "bmad-pm"
			fakeTask.taskState.activeAgentJustActivated = false

			await applyPersistentSlashCommandAction.call(fakeTask, {
				type: "activate_placeholder_workflow",
				workflowId: "code-review.md",
				workflowSource: {
					type: "remote",
					name: "code-review.md",
					contents: "# Code review\nInspect the implementation.",
				},
			})

			expect(fakeTask.say.calledOnce).to.equal(true)
			expect(fakeTask.taskState.activePlaceholderWorkflowId).to.equal(undefined)
			expect(saveMetadataStub.called).to.equal(false)
		} finally {
			sandbox.restore()
		}
	})

	it("persists placeholder workflow source through slash-command activation and survives the next prompt turn", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "slash-placeholder-persist-"))
		try {
			const workflowPath = path.join(tempDir, "local-flow.md")
			await fs.writeFile(
				workflowPath,
				`# Local Flow

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.
`,
				"utf8",
			)

			sandbox.stub(StateManager, "get").returns({
				getRemoteConfigSettings: () => ({}),
				getGlobalStateKey: () => ({}),
			} as unknown as StateManager)

			const parseResult = await parseSlashCommands(
				"<task>/local-flow.md continue</task>",
				{ [workflowPath]: true },
				{},
				"test-ulid",
			)

			expect(parseResult.persistentSlashCommandAction?.type).to.equal("activate_placeholder_workflow")
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves({} as never)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const fakeTask = {
				...createFakeTask("task-slash-placeholder"),
				cwd: tempDir,
			}
			await applyPersistentSlashCommandAction.call(fakeTask, parseResult.persistentSlashCommandAction)

			expect(getMetadataStub.calledOnce).to.equal(true)
			expect(fakeTask.refreshPlaceholderWorkflowChecklistProjection.calledOnceWith(true)).to.equal(true)
			expect(fakeTask.taskState.activeAgentId).to.equal(undefined)
			expect(fakeTask.taskState.activePlaceholderWorkflowId).to.equal("local-flow.md")
			expect(fakeTask.taskState.activePlaceholderWorkflowSource).to.include({
				type: "local",
				name: "local-flow.md",
				path: workflowPath,
			})
			expect(fakeTask.taskState.activePlaceholderWorkflowSource?.configPath).to.be.a("string")
			expect(fakeTask.taskState.activePlaceholderWorkflowSource?.configPath).to.contain(".cline")
			expect(fakeTask.taskState.activePlaceholderWorkflowSource?.configPath).to.contain("workflow-config.yaml")

			const [, savedMetadata] = saveMetadataStub.firstCall.args
			const savedSource = savedMetadata.activePlaceholderWorkflowSource
			expect(savedSource).to.exist
			if (!savedSource) {
				throw new Error("expected activePlaceholderWorkflowSource to be persisted")
			}
			expect(savedSource).to.include({
				type: "local",
				name: "local-flow.md",
				path: workflowPath,
			})
			expect(savedSource.configPath).to.be.a("string")
			expect(savedSource.configPath).to.contain(".cline")
			expect(savedSource.configPath).to.contain("workflow-config.yaml")

			sandbox.restore()
			const restoreSandbox = sinon.createSandbox()
			try {
				restoreSandbox.stub(disk, "getTaskMetadata").resolves(savedMetadata)
				const reloadedTask = createFakeTask("task-slash-placeholder")
				await restoreBmadStateFromMetadata.call(reloadedTask)
				reloadedTask.taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

				const manager = createFocusChainManager(reloadedTask.taskState)
				const prompt = await manager.generateFocusChainInstructions()

				expectWorkflowStatusOnlyPrompt(prompt, "Step 1: Gather Context")
			} finally {
				restoreSandbox.restore()
			}
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("renders stored dynamic placeholder values when building slash-activation instructions from task state", async () => {
		const fakeTask = createFakeTask("task-slash-placeholder-render")
		fakeTask.taskState.activePlaceholderWorkflowId = "remote-review"
		fakeTask.taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "remote-review",
			contents: `# Remote Review

## Step 1: Gather Context
Review {{story_id}} before asking follow-up questions.
`,
		}
		fakeTask.taskState.activePlaceholderWorkflowValues = {
			story_id: "1.2",
		}

		const workflowSource = fakeTask.taskState.activePlaceholderWorkflowSource
		if (!workflowSource) {
			throw new Error("Expected activePlaceholderWorkflowSource to be set")
		}

		const prompt = await buildPlaceholderWorkflowActivationInstructions.call(fakeTask, {
			type: "activate_placeholder_workflow",
			workflowId: "remote-review",
			workflowSource,
		})

		expect(prompt).to.equal(undefined)
	})

	it("lets dynamic placeholder values override stable values in activation instructions", async () => {
		const fakeTask = createFakeTask("task-slash-placeholder-override")
		fakeTask.taskState.activePlaceholderWorkflowId = "remote-review"
		fakeTask.taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "remote-review",
			contents: `# Remote Review

## Step 1: Gather Context
Review {{story_id}} in {communication_language}.
`,
		}
		fakeTask.taskState.activePlaceholderWorkflowStableValues = {
			story_id: "1.0",
			communication_language: "English",
		}
		fakeTask.taskState.activePlaceholderWorkflowValues = {
			story_id: "1.2",
		}

		const workflowSource = fakeTask.taskState.activePlaceholderWorkflowSource
		if (!workflowSource) {
			throw new Error("Expected activePlaceholderWorkflowSource to be set")
		}

		const prompt = await buildPlaceholderWorkflowActivationInstructions.call(fakeTask, {
			type: "activate_placeholder_workflow",
			workflowId: "remote-review",
			workflowSource,
		})

		expect(prompt).to.equal(undefined)
	})
})
