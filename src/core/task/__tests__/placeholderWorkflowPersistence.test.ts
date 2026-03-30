import * as disk from "@core/storage/disk"
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
import type { WorkflowFormSessionState } from "../workflow-form/types"

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
		say: sinon.stub().resolves(undefined as unknown as ToolResponse),
	}
}

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
							adversarial_general: "subagent_report",
						},
					},
				},
				activePlaceholderWorkflowTaskWriteProofPaths: ["/tmp/review-input.md"],
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
			await (Task.prototype as any).restoreBmadStateFromMetadata.call(fakeTask)

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
			expect(fakeTask.taskState.suppressedWorkflowFormResolverIds).to.deep.equal(metadata.suppressedWorkflowFormResolverIds)
			expect(fakeTask.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal(
				metadata.pendingAutoCompletedPlaceholderWorkflowStepNotices,
			)

			fakeTask.taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"
			const manager = createFocusChainManager(fakeTask.taskState)
			const prompt = await manager.generateFocusChainInstructions()

			expect(prompt).to.contain("# CURRENT WORKFLOW STEP")
			expect(prompt).to.contain("You are currently on this step: Step 1: Gather Context")
			expect(prompt).to.contain("Determine what to review from the user's prompt")
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
			await (Task.prototype as any).restoreBmadStateFromMetadata.call(fakeTask)

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
					adversarial_general: "subagent_report",
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
				stepNumber: 3,
			},
			phase: "retry_error",
			values: {
				"source.type": {
					stringValue: "commit",
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

			await (Task.prototype as any).persistWorkflowFormSession.call(fakeTask)
			await (Task.prototype as any).restoreBmadStateFromMetadata.call(fakeTask)

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
			toolName: "build_review_diff_output",
			title: "Review Diff Artifact",
			prompt: "Provide the concrete inputs needed to produce `review-input.diff`.",
			toolDictionaryTitle: "Diff Source Reference",
			toolDictionaryMarkdown: "## build_review_diff_output\n\nTool reference body.",
		}
		const messages: Array<Record<string, unknown>> = [
			{
				ts: 1,
				type: "ask",
				ask: "workflow_form",
				text: JSON.stringify({
					...basePayload,
					phase: "collect_inputs",
					fields: [],
					submitLabel: "Submit",
					cancelLabel: "Cancel",
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

		await (Task.prototype as any).renderWorkflowFormMessage.call(fakeTask, {
			...basePayload,
			phase: "retry_error",
			prompt: "The system could not produce `review-input.diff`. Update the inputs or retry the request.",
			fields: [],
			submitLabel: "Submit",
			cancelLabel: "Cancel",
			retryLabel: "Start Over",
			errorMessage: "The first tool attempt failed.",
		})

		messages.push({
			ts: 4,
			type: "say",
			say: "tool",
			text: JSON.stringify({ status: "second-attempt-succeeded" }),
		})

		await (Task.prototype as any).renderWorkflowFormMessage.call(fakeTask, {
			...basePayload,
			phase: "success",
			prompt: "Provide the concrete inputs needed to produce `review-input.diff`.",
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
			"- [x] Step 2: Construct & Persist Review Input File",
			"- [ ] Step 3: (System-Owned) Diff Source Resolution And Diff Output Persistence",
		].join("\n")

		const restoreStub = sinon.stub().callsFake(async () => {
			fakeTask.taskState.currentFocusChainChecklist = restoredChecklist
			return restoredChecklist
		})
		;(fakeTask as any).FocusChainManager = {
			restoreCurrentChecklistFromDisk: restoreStub,
		}

		await (Task.prototype as any).restorePlaceholderWorkflowChecklistFromDiskIfNeeded.call(fakeTask)

		expect(restoreStub.calledOnce).to.equal(true)
		expect(fakeTask.taskState.currentFocusChainChecklist).to.equal(restoredChecklist)
	})

	it("advances Step 2 after placeholder resolution when review_input exists with a stale mtime but has a current-task write proof", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-step2-write-proof-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		const reviewInputPath = path.join(tempDir, "output", "review-input.md")
		const taskId = "task-placeholder-persistence"

		try {
			await fs.writeFile(
				workflowPath,
				`# Code Review

## Step 1: Determine Review Source
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Construct & Persist Review Input File
Persist review_input.md.

## Step 3: System-Owned Diff Source Resolution And Diff Output Persistence
Resolve diff input through the system-owned form flow.
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

			const step2Checklist = [
				"- [x] Step 1: Determine Review Source",
				"- [ ] Step 2: Construct & Persist Review Input File",
				"- [ ] Step 3: System-Owned Diff Source Resolution And Diff Output Persistence",
			].join("\n")
			const focusChainFilePath = getFocusChainFilePath(tempDir, taskId)
			await fs.writeFile(
				focusChainFilePath,
				`# Focus Chain List for Task ${taskId}

${step2Checklist}
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
					"- [x] Step 2: Construct & Persist Review Input File",
					"- [ ] Step 3: System-Owned Diff Source Resolution And Diff Output Persistence",
				].join("\n"),
			)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
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

			await (Task.prototype as any).applyPersistentSlashCommandAction.call(
				fakeTask,
				parseResult.persistentSlashCommandAction,
			)

			expect(getMetadataStub.calledOnce).to.equal(true)
			expect(fakeTask.taskState.activePlaceholderWorkflowStableValues).to.include({
				communication_language: "English",
				config_source: ".cline/workflow-config.yaml",
				output_folder: `${tempDir}/workflow-output`,
			})

			const prompt = await (Task.prototype as any).buildPlaceholderWorkflowActivationInstructions.call(fakeTask, {
				type: "activate_placeholder_workflow",
				workflowId: "custom-review.md",
				workflowSource: fakeTask.taskState.activePlaceholderWorkflowSource!,
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

	it("renders migrated Step 3 guidance with build_review_diff_output and stable diff_output placeholder handling", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-step-3-guidance-"))
		try {
			const workflowPath = path.join(tempDir, "code-review.md")
			const configPath = getCanonicalWorkflowConfigPath(tempDir)
			await fs.mkdir(path.dirname(configPath), { recursive: true })
			await fs.writeFile(
				workflowPath,
				`# Code Review

## Step 3: Construct & Persist Diff Output File
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

			const prompt = await (Task.prototype as any).buildPlaceholderWorkflowActivationInstructions.call(fakeTask, {
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

	it("builds the first post-form prompt from the next active step after a successful Step 3 diff-output resolution", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-step-3-post-form-prompt-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		const diffOutputPath = path.join(tempDir, "workflow-output", "review-input.diff")

		try {
			await fs.writeFile(
				workflowPath,
				`# Code Review

## Step 1: Determine Review Source
Done.

## Step 2: Construct & Persist Review Input File
Done.

## Step 3: System-Owned Diff Source Resolution And Diff Output Persistence
Goal: The primary path for this step is runtime-owned workflow-form resolution. The AI instructions below are fallback-only and apply only when the system-owned path was not completed.

You are in the fallback path because the system-owned workflow-form path was not completed.

Do not ask the human to restate or re-enter a diff source they already declined to provide in the form flow.

Use \`build_review_diff_output\` whenever a supported source is discovered.

## Step 4: Set Review Mode
Choose the review mode from the persisted diff output before continuing.
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
				"- [x] Step 2: Construct & Persist Review Input File",
				"- [ ] Step 3: System-Owned Diff Source Resolution And Diff Output Persistence",
				"- [ ] Step 4: Set Review Mode",
			].join("\n")
			taskState.activePlaceholderWorkflowStableValues = {
				output_folder: path.join(tempDir, "workflow-output"),
			}

			const createdSession = {
				sessionId: "wf-session-step-3",
				resolverId: "code_review_step_3_diff_source",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				phase: "collect_inputs",
				values: {},
			} as any

			let renderCount = 0
			const fakeTask: any = {
				cwd: tempDir,
				taskState,
				pendingWorkflowFormOutcome: undefined,
				workflowFormRuntime: {
					createSession: sinon.stub().returns(createdSession),
					buildPayload: sinon.stub().callsFake((session: unknown) => ({ kind: "workflow_form", session })),
					buildSuccessPayload: sinon.stub().returns({ kind: "workflow_form_success" }),
				},
				persistWorkflowFormSession: sinon.stub().resolves(),
				renderWorkflowFormMessage: sinon.stub().callsFake(async () => {
					renderCount += 1
					if (renderCount === 1) {
						fakeTask.pendingWorkflowFormOutcome = {
							kind: "invoke_tool",
							session: createdSession,
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
						"- [x] Step 2: Construct & Persist Review Input File",
						"- [x] Step 3: System-Owned Diff Source Resolution And Diff Output Persistence",
						"- [ ] Step 4: Set Review Mode",
					].join("\n")
					return { succeeded: true }
				}),
				clearWorkflowFormSession: sinon.stub().callsFake(async () => {
					taskState.activeWorkflowFormSession = undefined
				}),
				setThreadDisplayState: sinon.stub(),
				postStateToWebview: sinon.stub().resolves(),
			}

			await (Task.prototype as any).maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask)

			const manager = createFocusChainManager(taskState)
			const prompt = await manager.generateFocusChainInstructions()

			expect(prompt).to.not.contain(
				"You are in the fallback path because the system-owned workflow-form path was not completed.",
			)
			expect(prompt).to.not.contain(
				"You are currently on this step: Step 3: System-Owned Diff Source Resolution And Diff Output Persistence",
			)
			expect(prompt).to.contain("You are currently on this step: Step 4: Set Review Mode")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("auto-binds the owning BMAD agent when a placeholder workflow maps to a managed BMAD twin", async () => {
		const sandbox = sinon.createSandbox()
		try {
			sandbox.stub(disk, "getTaskMetadata").resolves({} as never)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()
			const fakeTask = createFakeTask("task-placeholder-autobind")

			await (Task.prototype as any).applyPersistentSlashCommandAction.call(fakeTask, {
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

			await (Task.prototype as any).applyPersistentSlashCommandAction.call(fakeTask, {
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
			await (Task.prototype as any).applyPersistentSlashCommandAction.call(
				fakeTask,
				parseResult.persistentSlashCommandAction,
			)

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
				await (Task.prototype as any).restoreBmadStateFromMetadata.call(reloadedTask)
				reloadedTask.taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

				const manager = createFocusChainManager(reloadedTask.taskState)
				const prompt = await manager.generateFocusChainInstructions()

				expect(prompt).to.contain("# CURRENT WORKFLOW STEP")
				expect(prompt).to.contain("You are currently on this step: Step 1: Gather Context")
				expect(prompt).to.contain("Determine what to review from the user's prompt")
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

		const prompt = await (Task.prototype as any).buildPlaceholderWorkflowActivationInstructions.call(fakeTask, {
			type: "activate_placeholder_workflow",
			workflowId: "remote-review",
			workflowSource: fakeTask.taskState.activePlaceholderWorkflowSource!,
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

		const prompt = await (Task.prototype as any).buildPlaceholderWorkflowActivationInstructions.call(fakeTask, {
			type: "activate_placeholder_workflow",
			workflowId: "remote-review",
			workflowSource: fakeTask.taskState.activePlaceholderWorkflowSource!,
		})

		expect(prompt).to.equal(undefined)
	})
})
