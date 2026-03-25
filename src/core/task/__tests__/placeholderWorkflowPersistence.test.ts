import * as disk from "@core/storage/disk"
import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import { parseSlashCommands } from "../../slash-commands"
import { StateManager } from "../../storage/StateManager"
import { FocusChainManager } from "../focus-chain"
import { Task, type ToolResponse } from "../index"
import { TaskState } from "../TaskState"

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
			}
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata as never)

			const fakeTask = createFakeTask("task-restore-placeholder")
			await (Task.prototype as any).restoreBmadStateFromMetadata.call(fakeTask)

			expect(fakeTask.taskState.activePlaceholderWorkflowId).to.equal("remote-review")
			expect(fakeTask.taskState.activePlaceholderWorkflowSource).to.deep.equal(metadata.activePlaceholderWorkflowSource)
			expect(fakeTask.taskState.activePlaceholderWorkflowStableValues).to.deep.equal(
				metadata.activePlaceholderWorkflowStableValues,
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

	it("computes stable placeholder values from slash-command activation metadata and renders them in activation instructions", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "slash-placeholder-stable-"))
		try {
			const workflowPath = path.join(tempDir, ".cline", "skills", "custom-review", "custom-review.md")
			const manifestPath = path.join(tempDir, "_bmad", "_config", "skill-manifest.csv")
			const configPath = path.join(tempDir, "_bmad", "bmm", "config.yaml")
			await fs.mkdir(path.dirname(workflowPath), { recursive: true })
			await fs.mkdir(path.dirname(manifestPath), { recursive: true })
			await fs.mkdir(path.dirname(configPath), { recursive: true })
			await fs.writeFile(
				workflowPath,
				`# Local Flow

## Step 1: Gather Context
Respond in {communication_language} from {config_source}.
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
			await fs.writeFile(configPath, 'communication_language: "English"\n', "utf8")

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
			expect(parseResult.persistentSlashCommandAction?.workflowSource).to.deep.equal({
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
				config_source: "_bmad/bmm/config.yaml",
			})

			const prompt = await (Task.prototype as any).buildPlaceholderWorkflowActivationInstructions.call(fakeTask, {
				type: "activate_placeholder_workflow",
				workflowId: "custom-review.md",
				workflowSource: fakeTask.taskState.activePlaceholderWorkflowSource!,
			})

			expect(prompt).to.contain("Respond in English from _bmad/bmm/config.yaml.")
			const [, savedMetadata] = saveMetadataStub.firstCall.args
			expect(savedMetadata.activePlaceholderWorkflowStableValues).to.include({
				communication_language: "English",
				config_source: "_bmad/bmm/config.yaml",
			})
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
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

			const fakeTask = createFakeTask("task-slash-placeholder")
			await (Task.prototype as any).applyPersistentSlashCommandAction.call(
				fakeTask,
				parseResult.persistentSlashCommandAction,
			)

			expect(getMetadataStub.calledOnce).to.equal(true)
			expect(fakeTask.taskState.activePlaceholderWorkflowId).to.equal("local-flow.md")
			expect(fakeTask.taskState.activePlaceholderWorkflowSource).to.deep.equal({
				type: "local",
				name: "local-flow.md",
				path: workflowPath,
			})

			const [, savedMetadata] = saveMetadataStub.firstCall.args
			expect(savedMetadata.activePlaceholderWorkflowSource).to.deep.equal({
				type: "local",
				name: "local-flow.md",
				path: workflowPath,
			})

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

		expect(prompt).to.contain('<explicit_instructions type="remote-review">')
		expect(prompt).to.contain("Review 1.2 before asking follow-up questions.")
		expect(prompt).to.not.contain("{{story_id}}")
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

		expect(prompt).to.contain("Review 1.2 in English.")
		expect(prompt).to.not.contain("{{story_id}}")
	})
})
