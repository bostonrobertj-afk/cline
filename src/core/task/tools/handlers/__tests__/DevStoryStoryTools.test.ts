import * as writeProofs from "@core/task/focus-chain/placeholderWorkflowWriteProofs"
import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import { HostProvider } from "@/hosts/host-provider"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { StoryNotesUpdateToolHandler } from "../StoryNotesUpdateToolHandler"
import { StoryTaskCompleteToolHandler } from "../StoryTaskCompleteToolHandler"
import { StoryTaskReminderToolHandler } from "../StoryTaskReminderToolHandler"
import { StoryTestingCompleteToolHandler } from "../StoryTestingCompleteToolHandler"

function initializeHostProvider(workspacePath: string) {
	HostProvider.reset()
	HostProvider.initialize(
		() => ({}) as never,
		() => ({}) as never,
		() => ({}) as never,
		() => ({}) as never,
		{
			workspaceClient: {
				getWorkspacePaths: async () => ({ paths: [workspacePath] }),
			},
			envClient: {
				getHostVersion: async () => ({ platform: "test" }),
			},
			windowClient: {},
			diffClient: {},
		} as never,
		() => undefined,
		async () => "",
		async () => "",
		"",
		"",
	)
}

function createConfig(storyPath: string): {
	config: TaskConfig
	taskState: TaskState
	say: sinon.SinonStub
	ask: sinon.SinonStub
	shouldAutoApproveToolWithPath: sinon.SinonStub
} {
	initializeHostProvider(path.dirname(storyPath))
	const taskState = new TaskState()
	taskState.activePlaceholderWorkflowValues = {
		story_path: storyPath,
	}
	taskState.fileReadCache.set(storyPath.toLowerCase(), {
		readCount: 1,
		mtime: Date.now(),
		snapshotText: "cached",
	})

	const say = sinon.stub().resolves(undefined)
	const ask = sinon.stub().resolves({ response: "continue" })
	const shouldAutoApproveToolWithPath = sinon.stub().resolves(true)

	const callbacks = {
		say,
		ask,
		shouldAutoApproveToolWithPath,
		saveCheckpoint: sinon.stub().resolves(),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
		clearPartialResponseToolPreview: sinon.stub().resolves(false),
		updateFCListFromToolResponse: sinon.stub().resolves(),
		doesLatestTaskCompletionHaveNewChanges: sinon.stub().resolves(false),
		executeCommandTool: sinon.stub().resolves([false, "ok"]),
	} as any

	return {
		config: {
			taskId: "task-dev-story-tools",
			ulid: "ulid-dev-story-tools",
			cwd: path.dirname(storyPath),
			mode: "act",
			strictPlanModeEnabled: false,
			yoloModeToggled: false,
			doubleCheckCompletionEnabled: false,
			vscodeTerminalExecutionMode: "backgroundExec",
			enableParallelToolCalling: true,
			isSubagentExecution: false,
			taskState,
			messageState: {
				getClineMessages: () => [],
				setClineMessages: sinon.stub(),
				saveClineMessagesAndUpdateHistory: sinon.stub().resolves(),
			} as any,
			api: {
				getModel: () => ({ id: "test-model", info: { supportsImages: false } }),
			} as any,
			autoApprovalSettings: {
				enableNotifications: false,
				actions: { executeSafeCommands: false, executeAllCommands: false },
			} as any,
			autoApprover: {
				shouldAutoApproveTool: sinon.stub().returns([true, true]),
			} as any,
			browserSettings: {} as any,
			focusChainSettings: { enabled: false } as any,
			services: {
				stateManager: {
					getGlobalStateKey: () => undefined,
					getGlobalSettingsKey: (key: string) => (key === "hooksEnabled" ? false : undefined),
					getWorkspaceStateKey: () => undefined,
					getRemoteConfigSettings: () => ({}),
					getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
				},
			} as any,
			callbacks,
			coordinator: { getHandler: sinon.stub() } as any,
		} as TaskConfig,
		taskState,
		say,
		ask,
		shouldAutoApproveToolWithPath,
	}
}

function createStoryToolBlock(name: string, params: Record<string, unknown> = {}) {
	return {
		type: "tool_use",
		name,
		params,
	} as any
}

describe("Dev-story native tool handlers", () => {
	it("story_task_reminder returns the current task block with ids", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "story-task-reminder-"))
		const storyPath = path.join(tempDir, "story.md")
		await fs.writeFile(
			storyPath,
			`# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Implement prompt injection
  - [ ] Keep storyTaskId runtime-only
`,
			"utf8",
		)

		try {
			const { config } = createConfig(storyPath)
			const handler = new StoryTaskReminderToolHandler()
			const result = await handler.execute(config, createStoryToolBlock("story_task_reminder"))

			expect(result).to.equal(`### CURRENT TASKS / SUBTASKS

storyTaskId: 1
- [ ] Implement prompt injection

storySubtaskId: 1
  - [ ] Keep storyTaskId runtime-only`)
		} finally {
			HostProvider.reset()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("story_task_complete completes a subtask and auto-completes its parent without approval prompts", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "story-task-complete-"))
		const storyPath = path.join(tempDir, "story.md")
		await fs.writeFile(
			storyPath,
			`# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Implement prompt injection
  - [x] Parse the story file
  - [ ] Keep storyTaskId runtime-only

## Completion Notes List
- Existing note

## File List
- src/existing.ts
`,
			"utf8",
		)

		try {
			sandbox.stub(writeProofs, "recordAndPersistPlaceholderWorkflowWriteProof").resolves()
			const { config, say, ask, shouldAutoApproveToolWithPath } = createConfig(storyPath)
			const handler = new StoryTaskCompleteToolHandler()
			const result = await handler.execute(
				config,
				createStoryToolBlock("story_task_complete", {
					storyTaskId: "1",
					storySubtaskId: "2",
				}),
			)

			const savedStory = await fs.readFile(storyPath, "utf8")
			expect(savedStory).to.contain("- [x] Implement prompt injection")
			expect(savedStory).to.contain("  - [x] Keep storyTaskId runtime-only")
			expect(JSON.parse(result as string)).to.deep.equal({
				completed: true,
				target: "subtask",
			})
			expect(shouldAutoApproveToolWithPath.called).to.equal(false)
			expect(ask.called).to.equal(false)
			expect(say.calledOnce).to.equal(true)
			expect(config.taskState.didEditFile).to.equal(true)
			expect(config.taskState.fileReadCache.has(storyPath.toLowerCase())).to.equal(false)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("story_task_complete rejects direct parent completion while subtasks remain incomplete without mutating the file", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "story-task-complete-reject-parent-"))
		const storyPath = path.join(tempDir, "story.md")
		await fs.writeFile(
			storyPath,
			`# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Implement prompt injection
  - [x] Parse the story file
  - [ ] Keep storyTaskId runtime-only

## Completion Notes List
- Existing note

## File List
- src/existing.ts
`,
			"utf8",
		)

		try {
			sandbox.stub(writeProofs, "recordAndPersistPlaceholderWorkflowWriteProof").resolves()
			const { config, say, ask } = createConfig(storyPath)
			const handler = new StoryTaskCompleteToolHandler()
			const result = await handler.execute(
				config,
				createStoryToolBlock("story_task_complete", {
					storyTaskId: "1",
				}),
			)

			const savedStory = await fs.readFile(storyPath, "utf8")
			expect(result).to.equal(`The tool execution failed with the following error:
<error>
Cannot complete story task 1 directly while it still has incomplete subtasks. Complete each remaining subtask first.
</error>`)
			expect(savedStory).to.contain("- [ ] Implement prompt injection")
			expect(savedStory).to.contain("  - [ ] Keep storyTaskId runtime-only")
			expect(ask.called).to.equal(false)
			expect(say.called).to.equal(false)
			expect(config.taskState.didEditFile).to.equal(false)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("story_notes_update appends one entry to completion notes without approval prompts", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "story-notes-completion-"))
		const storyPath = path.join(tempDir, "story.md")
		await fs.writeFile(
			storyPath,
			`# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Implement prompt injection

## Completion Notes List
- Existing note

## File List
- src/existing.ts
`,
			"utf8",
		)

		try {
			sandbox.stub(writeProofs, "recordAndPersistPlaceholderWorkflowWriteProof").resolves()
			const { config, say, ask, shouldAutoApproveToolWithPath } = createConfig(storyPath)
			const handler = new StoryNotesUpdateToolHandler()
			const result = await handler.execute(
				config,
				createStoryToolBlock("story_notes_update", {
					section: "Completion Notes List",
					entry: "- Added note",
				}),
			)

			const savedStory = await fs.readFile(storyPath, "utf8")
			expect(savedStory).to.contain("## Completion Notes List")
			expect(savedStory).to.contain("- Existing note")
			expect(savedStory).to.contain("- Added note")
			expect(JSON.parse(result as string)).to.deep.equal({
				appended: true,
				section: "Completion Notes List",
			})
			expect(shouldAutoApproveToolWithPath.called).to.equal(false)
			expect(ask.called).to.equal(false)
			expect(say.calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("story_notes_update appends one entry to the file list", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "story-notes-file-list-"))
		const storyPath = path.join(tempDir, "story.md")
		await fs.writeFile(
			storyPath,
			`# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Implement prompt injection

## Completion Notes List
- Existing note

## File List
- src/existing.ts
`,
			"utf8",
		)

		try {
			sandbox.stub(writeProofs, "recordAndPersistPlaceholderWorkflowWriteProof").resolves()
			const { config } = createConfig(storyPath)
			const handler = new StoryNotesUpdateToolHandler()
			const result = await handler.execute(
				config,
				createStoryToolBlock("story_notes_update", {
					section: "File List",
					entry: "- src/new-file.ts",
				}),
			)

			const savedStory = await fs.readFile(storyPath, "utf8")
			expect(savedStory).to.contain("## File List")
			expect(savedStory).to.contain("- src/existing.ts")
			expect(savedStory).to.contain("- src/new-file.ts")
			expect(JSON.parse(result as string)).to.deep.equal({
				appended: true,
				section: "File List",
			})
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("story_testing_complete sets Status: review without approval prompts", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "story-testing-complete-"))
		const storyPath = path.join(tempDir, "story.md")
		await fs.writeFile(
			storyPath,
			`# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Implement prompt injection

## Completion Notes List
- Existing note

## File List
- src/existing.ts
`,
			"utf8",
		)

		try {
			sandbox.stub(writeProofs, "recordAndPersistPlaceholderWorkflowWriteProof").resolves()
			const { config, say, ask, shouldAutoApproveToolWithPath } = createConfig(storyPath)
			const handler = new StoryTestingCompleteToolHandler()
			const result = await handler.execute(config, createStoryToolBlock("story_testing_complete"))

			const savedStory = await fs.readFile(storyPath, "utf8")
			expect(savedStory).to.contain("Status: review")
			expect(JSON.parse(result as string)).to.deep.equal({
				status_updated: true,
				status: "review",
			})
			expect(shouldAutoApproveToolWithPath.called).to.equal(false)
			expect(ask.called).to.equal(false)
			expect(say.calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("asks for a manual patch exactly once after repeated verification failures", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "story-notes-failure-"))
		const storyPath = path.join(tempDir, "story.md")
		const storyMarkdown = `# Story 1.0
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Implement prompt injection

## Completion Notes List
- Existing note

## File List
- src/existing.ts
`
		await fs.writeFile(storyPath, storyMarkdown, "utf8")

		try {
			sandbox.stub(writeProofs, "recordAndPersistPlaceholderWorkflowWriteProof").resolves()
			const readFileStub = sandbox.stub(fs, "readFile")
			readFileStub.onCall(0).resolves(storyMarkdown)
			readFileStub.onCall(1).resolves(storyMarkdown)
			readFileStub.onCall(2).resolves(storyMarkdown)

			const { config, say, ask } = createConfig(storyPath)
			const handler = new StoryNotesUpdateToolHandler()
			const result = await handler.execute(
				config,
				createStoryToolBlock("story_notes_update", {
					section: "Completion Notes List",
					entry: "- Added note",
				}),
			)

			expect(JSON.parse(result as string)).to.deep.equal({
				appended: false,
				awaiting_manual_update: true,
			})
			expect(ask.calledOnce).to.equal(true)
			expect(say.called).to.equal(false)
			expect(ask.firstCall.args).to.deep.equal([
				"followup",
				JSON.stringify({
					question:
						"Automatic story notes update failed.\n\nFile: story.md\n\nApply this exact manual update:\n## Completion Notes List\n- Added note\n\nReply continue when the file has been updated.",
					options: ["continue"],
				}),
				false,
			])
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})
})
