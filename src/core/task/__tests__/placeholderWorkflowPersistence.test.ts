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

			expect(prompt).to.contain("Respond in English from .cline/workflow-config.yaml. Write artifacts to")
			expect(prompt).to.contain(`${tempDir}/workflow-output`)
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
			fakeTask.taskState.activePlaceholderWorkflowId = "code-review"
			fakeTask.taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review",
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
				workflowId: "code-review",
				workflowSource: fakeTask.taskState.activePlaceholderWorkflowSource,
			})

			expect(prompt).to.contain("build_review_diff_output")
			expect(prompt.includes("{diff_output}") || prompt.includes(`${tempDir}/workflow-output/review-input.diff`)).to.equal(
				true,
			)
			expect(prompt).to.not.contain("Set `{diff_output}` to that artifact path using the `set_workflow_placeholders` tool")
		} finally {
			sandbox.restore()
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
				workflowId: "code-review",
				workflowSource: {
					type: "remote",
					name: "code-review",
					contents: "# Code review\nInspect the implementation.",
				},
			})

			expect(fakeTask.taskState.activeAgentId).to.equal("bmad-dev")
			expect(fakeTask.taskState.activeAgentSkillName).to.equal("bmad-dev")
			expect(fakeTask.taskState.activeAgentInvokedSlashCommand).to.equal("code-review")
			expect(fakeTask.taskState.activePlaceholderWorkflowId).to.equal("code-review")
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
				workflowId: "code-review",
				workflowSource: {
					type: "remote",
					name: "code-review",
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
