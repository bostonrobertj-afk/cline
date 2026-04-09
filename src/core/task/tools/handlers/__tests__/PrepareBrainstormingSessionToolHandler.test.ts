import { strict as assert } from "node:assert"
import fs from "fs/promises"
import { afterEach, describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import { formatResponse } from "../../../../prompts/responses"
import * as writeProofs from "../../../focus-chain/placeholderWorkflowWriteProofs"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { PrepareBrainstormingSessionToolHandler } from "../PrepareBrainstormingSessionToolHandler"
import * as workflowPlaceholderPersistence from "../SetWorkflowPlaceholdersToolHandler"

const BRAINSTORMING_WORKFLOW_SOURCE = {
	type: "remote" as const,
	name: "brainstorming.md",
	contents: `# brainstorming

## Step 1: Open or start a session
Optional: {context_file}

## Step 2: Create Output File
Create or continue the brainstorming session file.

## Step 3: Identify Brainstorming Session Topic & Goals
Capture the topic and goals.
`,
}

async function createWorkspace(templateContents = "# Brainstorming Template\n") {
	const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "prepare-brainstorming-workspace-"))
	const templatePath = path.join(workspaceDir, ".cline", "skills", "bmad-brainstorming", "template.md")
	await fs.mkdir(path.dirname(templatePath), { recursive: true })
	await fs.writeFile(templatePath, templateContents, "utf8")
	return { workspaceDir, templatePath, templateContents }
}

function createConfig(options: {
	cwd: string
	outputFolder?: string
	askResult?: { text?: string; images?: string[]; files?: string[] }
	lastFollowupMessage?: any
	runWorkflowFormSession?: sinon.SinonStub
}) {
	const taskState = new TaskState()
	taskState.activePlaceholderWorkflowId = "brainstorming.md"
	taskState.activePlaceholderWorkflowSource = BRAINSTORMING_WORKFLOW_SOURCE
	taskState.currentFocusChainChecklist =
		"- [x] Step 1: Open or start a session\n- [ ] Step 2: Create Output File\n- [ ] Step 3: Identify Brainstorming Session Topic & Goals"
	taskState.activePlaceholderWorkflowValues = options.outputFolder ? { output_folder: options.outputFolder } : undefined

	const clineMessages = options.lastFollowupMessage ? [options.lastFollowupMessage] : []
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask: sinon.stub().resolves(options.askResult ?? { text: "Continue newest session" }),
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
		runWorkflowFormSession: options.runWorkflowFormSession ?? sinon.stub().resolves(),
	}

	const saveClineMessagesAndUpdateHistory = sinon.stub().resolves()
	const config = {
		taskId: "task-1",
		ulid: "ulid-1",
		cwd: options.cwd,
		mode: "act",
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		doubleCheckCompletionEnabled: false,
		vscodeTerminalExecutionMode: "backgroundExec",
		enableParallelToolCalling: true,
		isSubagentExecution: true,
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

describe("PrepareBrainstormingSessionToolHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("fails when output_folder is missing from merged placeholder workflow state", async () => {
		const { workspaceDir } = await createWorkspace()
		const { config } = createConfig({ cwd: workspaceDir })
		const handler = new PrepareBrainstormingSessionToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "prepare_brainstorming_session",
			params: {},
			partial: false,
		} as any)

		assert.equal(
			result,
			formatResponse.toolError(
				"Could not resolve workflow placeholder 'output_folder' from the active placeholder workflow state.",
			),
		)
	})

	it("fails when the canonical brainstorming template cannot be read", async () => {
		const { workspaceDir, templatePath } = await createWorkspace()
		const outputFolder = path.join(workspaceDir, "output")
		await fs.unlink(templatePath)
		const { config } = createConfig({ cwd: workspaceDir, outputFolder })
		const handler = new PrepareBrainstormingSessionToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "prepare_brainstorming_session",
			params: {},
			partial: false,
		} as any)

		assert.equal(result, formatResponse.toolError(`Could not read the canonical brainstorming template at ${templatePath}.`))
	})

	it("creates a new brainstorming session file from the canonical template when no sessions exist", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const { workspaceDir, templateContents } = await createWorkspace("# Canonical Brainstorming Template\n")
			const outputFolder = path.join(workspaceDir, "output")
			const { config, callbacks } = createConfig({ cwd: workspaceDir, outputFolder })
			const writeProofStub = sandbox.stub(writeProofs, "recordAndPersistPlaceholderWorkflowWriteProof").resolves()
			const handler = new PrepareBrainstormingSessionToolHandler()
			const today = new Date().toISOString().split("T")[0]
			const createdPath = path.join(outputFolder, "brainstorming", `brainstorming-session-${today}.md`)

			config.taskState.fileReadCache.set(createdPath.toLowerCase(), {
				readCount: 1,
				mtime: Date.now(),
				snapshotText: "stale",
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "prepare_brainstorming_session",
				params: {},
				partial: false,
			} as any)

			assert.equal(
				result,
				"Stored workflow placeholder output_file from the runtime-owned brainstorming session preparation flow.",
			)
			assert.equal(await fs.readFile(createdPath, "utf8"), templateContents)
			assert.equal(config.taskState.activePlaceholderWorkflowValues?.output_file, createdPath)
			assert.equal(config.taskState.didEditFile, true)
			assert.equal(config.taskState.fileReadCache.has(createdPath.toLowerCase()), false)
			sinon.assert.calledOnceWithExactly(writeProofStub, {
				taskId: "task-1",
				taskState: config.taskState,
				filePath: createdPath,
			})
			sinon.assert.notCalled(callbacks.ask)
		} finally {
			sandbox.restore()
		}
	})

	it("fails when brainstorming sessions cannot be enumerated", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const { workspaceDir } = await createWorkspace()
			const outputFolder = path.join(workspaceDir, "output")
			const { config } = createConfig({ cwd: workspaceDir, outputFolder })
			sandbox
				.stub(fs, "readdir")
				.rejects(Object.assign(new Error("Could not enumerate brainstorming sessions."), { code: "EACCES" }))
			const handler = new PrepareBrainstormingSessionToolHandler()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "prepare_brainstorming_session",
				params: {},
				partial: false,
			} as any)

			assert.equal(result, formatResponse.toolError("Could not enumerate brainstorming sessions."))
		} finally {
			sandbox.restore()
		}
	})

	it("asks the exact followup question and persists the newest existing session when Continue newest session is selected", async () => {
		const { workspaceDir } = await createWorkspace()
		const outputFolder = path.join(workspaceDir, "output")
		const brainstormingDir = path.join(outputFolder, "brainstorming")
		await fs.mkdir(brainstormingDir, { recursive: true })
		await fs.writeFile(path.join(brainstormingDir, "brainstorming-session-2026-04-08.md"), "older same day base", "utf8")
		await fs.writeFile(path.join(brainstormingDir, "brainstorming-session-2026-04-08-2.md"), "newest", "utf8")
		await fs.writeFile(path.join(brainstormingDir, "brainstorming-session-2026-04-07.md"), "older", "utf8")

		const lastFollowupMessage = { ask: "followup", text: "{}" }
		const { config, callbacks, saveClineMessagesAndUpdateHistory } = createConfig({
			cwd: workspaceDir,
			outputFolder,
			askResult: { text: "Continue newest session" },
			lastFollowupMessage,
		})
		const handler = new PrepareBrainstormingSessionToolHandler()
		const expectedPath = path.join(brainstormingDir, "brainstorming-session-2026-04-08-2.md")

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "prepare_brainstorming_session",
			params: {},
			partial: false,
		} as any)

		assert.equal(
			result,
			"Stored workflow placeholder output_file from the runtime-owned brainstorming session preparation flow.",
		)
		sinon.assert.calledOnce(callbacks.ask)
		assert.deepEqual(JSON.parse(callbacks.ask.firstCall.args[1]), {
			question: "How would you like to proceed with your brainstorming session?",
			options: ["Continue newest session", "Start new session", "List all sessions"],
		})
		assert.deepEqual(JSON.parse(lastFollowupMessage.text), {
			question: "How would you like to proceed with your brainstorming session?",
			options: ["Continue newest session", "Start new session", "List all sessions"],
			selected: "Continue newest session",
		})
		assert.equal(config.taskState.activePlaceholderWorkflowValues?.output_file, expectedPath)
		sinon.assert.calledOnce(saveClineMessagesAndUpdateHistory)
	})

	it("ignores matching brainstorming-session directories when continuing the newest session", async () => {
		const { workspaceDir } = await createWorkspace()
		const outputFolder = path.join(workspaceDir, "output")
		const brainstormingDir = path.join(outputFolder, "brainstorming")
		await fs.mkdir(brainstormingDir, { recursive: true })
		await fs.mkdir(path.join(brainstormingDir, "brainstorming-session-2026-04-08-3.md"))
		const newestFilePath = path.join(brainstormingDir, "brainstorming-session-2026-04-08-2.md")
		const olderFilePath = path.join(brainstormingDir, "brainstorming-session-2026-04-07.md")
		await fs.writeFile(newestFilePath, "newest file", "utf8")
		await fs.writeFile(olderFilePath, "older file", "utf8")

		const { config } = createConfig({
			cwd: workspaceDir,
			outputFolder,
			askResult: { text: "Continue newest session" },
		})
		const handler = new PrepareBrainstormingSessionToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "prepare_brainstorming_session",
			params: {},
			partial: false,
		} as any)

		assert.equal(
			result,
			"Stored workflow placeholder output_file from the runtime-owned brainstorming session preparation flow.",
		)
		assert.equal(config.taskState.activePlaceholderWorkflowValues?.output_file, newestFilePath)
	})

	it("creates brainstorming-session-YYYY-MM-DD-2.md when Start new session is selected and the same-day base file already exists", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const { workspaceDir, templateContents } = await createWorkspace("# Start New Template\n")
			const outputFolder = path.join(workspaceDir, "output")
			const brainstormingDir = path.join(outputFolder, "brainstorming")
			await fs.mkdir(brainstormingDir, { recursive: true })
			const today = new Date().toISOString().split("T")[0]
			const basePath = path.join(brainstormingDir, `brainstorming-session-${today}.md`)
			const secondPath = path.join(brainstormingDir, `brainstorming-session-${today}-2.md`)
			await fs.writeFile(basePath, "existing base", "utf8")
			const writeProofStub = sandbox.stub(writeProofs, "recordAndPersistPlaceholderWorkflowWriteProof").resolves()
			const { config } = createConfig({
				cwd: workspaceDir,
				outputFolder,
				askResult: { text: "Start new session" },
			})
			const handler = new PrepareBrainstormingSessionToolHandler()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "prepare_brainstorming_session",
				params: {},
				partial: false,
			} as any)

			assert.equal(
				result,
				"Stored workflow placeholder output_file from the runtime-owned brainstorming session preparation flow.",
			)
			assert.equal(await fs.readFile(basePath, "utf8"), "existing base")
			assert.equal(await fs.readFile(secondPath, "utf8"), templateContents)
			assert.equal(config.taskState.activePlaceholderWorkflowValues?.output_file, secondPath)
			sinon.assert.calledOnceWithExactly(writeProofStub, {
				taskId: "task-1",
				taskState: config.taskState,
				filePath: secondPath,
			})
		} finally {
			sandbox.restore()
		}
	})

	it("creates brainstorming-session-YYYY-MM-DD-3.md when Start new session finds same-day base and -2 files", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const { workspaceDir, templateContents } = await createWorkspace("# Start New Template\n")
			const outputFolder = path.join(workspaceDir, "output")
			const brainstormingDir = path.join(outputFolder, "brainstorming")
			await fs.mkdir(brainstormingDir, { recursive: true })
			const today = new Date().toISOString().split("T")[0]
			const basePath = path.join(brainstormingDir, `brainstorming-session-${today}.md`)
			const secondPath = path.join(brainstormingDir, `brainstorming-session-${today}-2.md`)
			const thirdPath = path.join(brainstormingDir, `brainstorming-session-${today}-3.md`)
			await fs.writeFile(basePath, "existing base", "utf8")
			await fs.writeFile(secondPath, "existing second", "utf8")
			const writeProofStub = sandbox.stub(writeProofs, "recordAndPersistPlaceholderWorkflowWriteProof").resolves()
			const { config } = createConfig({
				cwd: workspaceDir,
				outputFolder,
				askResult: { text: "Start new session" },
			})
			const handler = new PrepareBrainstormingSessionToolHandler()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "prepare_brainstorming_session",
				params: {},
				partial: false,
			} as any)

			assert.equal(
				result,
				"Stored workflow placeholder output_file from the runtime-owned brainstorming session preparation flow.",
			)
			assert.equal(await fs.readFile(basePath, "utf8"), "existing base")
			assert.equal(await fs.readFile(secondPath, "utf8"), "existing second")
			assert.equal(await fs.readFile(thirdPath, "utf8"), templateContents)
			assert.equal(config.taskState.activePlaceholderWorkflowValues?.output_file, thirdPath)
			sinon.assert.calledOnceWithExactly(writeProofStub, {
				taskId: "task-1",
				taskState: config.taskState,
				filePath: thirdPath,
			})
		} finally {
			sandbox.restore()
		}
	})

	it("fails when the brainstorming directory cannot be created", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const { workspaceDir } = await createWorkspace()
			const outputFolder = path.join(workspaceDir, "output")
			const { config } = createConfig({ cwd: workspaceDir, outputFolder })
			sandbox.stub(fs, "mkdir").rejects(new Error("Could not create brainstorming directory."))
			const handler = new PrepareBrainstormingSessionToolHandler()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "prepare_brainstorming_session",
				params: {},
				partial: false,
			} as any)

			assert.equal(result, formatResponse.toolError("Could not create brainstorming directory."))
		} finally {
			sandbox.restore()
		}
	})

	it("fails when the brainstorming session file cannot be created", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const { workspaceDir } = await createWorkspace()
			const outputFolder = path.join(workspaceDir, "output")
			const { config } = createConfig({ cwd: workspaceDir, outputFolder })
			const today = new Date().toISOString().split("T")[0]
			const expectedArtifactPath = path.join(outputFolder, "brainstorming", `brainstorming-session-${today}.md`)
			const originalWriteFile = fs.writeFile.bind(fs)
			sandbox.stub(fs, "writeFile").callsFake(async (filePath: any, data: any, options?: any) => {
				const resolvedPath = typeof filePath === "string" ? filePath : String(filePath)
				if (resolvedPath === expectedArtifactPath) {
					throw new Error("Could not create brainstorming session file.")
				}

				return originalWriteFile(filePath, data, options)
			})
			const handler = new PrepareBrainstormingSessionToolHandler()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "prepare_brainstorming_session",
				params: {},
				partial: false,
			} as any)

			assert.equal(result, formatResponse.toolError("Could not create brainstorming session file."))
		} finally {
			sandbox.restore()
		}
	})

	it("fails when output_file cannot be persisted for Continue newest session", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const { workspaceDir } = await createWorkspace()
			const outputFolder = path.join(workspaceDir, "output")
			const brainstormingDir = path.join(outputFolder, "brainstorming")
			await fs.mkdir(brainstormingDir, { recursive: true })
			await fs.writeFile(path.join(brainstormingDir, "brainstorming-session-2026-04-08.md"), "existing", "utf8")
			sandbox
				.stub(workflowPlaceholderPersistence, "persistWorkflowPlaceholderValues")
				.rejects(new Error("Could not persist output_file."))
			const { config } = createConfig({
				cwd: workspaceDir,
				outputFolder,
				askResult: { text: "Continue newest session" },
			})
			const handler = new PrepareBrainstormingSessionToolHandler()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "prepare_brainstorming_session",
				params: {},
				partial: false,
			} as any)

			assert.equal(result, formatResponse.toolError("Could not persist output_file."))
		} finally {
			sandbox.restore()
		}
	})

	it("launches the workflow-form picker and accepts a persisted output_file from List all sessions", async () => {
		const { workspaceDir } = await createWorkspace()
		const outputFolder = path.join(workspaceDir, "output")
		const brainstormingDir = path.join(outputFolder, "brainstorming")
		await fs.mkdir(brainstormingDir, { recursive: true })
		const newestPath = path.join(brainstormingDir, "brainstorming-session-2026-04-08-2.md")
		const olderPath = path.join(brainstormingDir, "brainstorming-session-2026-04-08.md")
		await fs.mkdir(path.join(brainstormingDir, "brainstorming-session-2026-04-08-9.md"))
		await fs.writeFile(olderPath, "older", "utf8")
		await fs.writeFile(newestPath, "newest", "utf8")
		const { config, callbacks } = createConfig({
			cwd: workspaceDir,
			outputFolder,
			askResult: { text: "List all sessions" },
			runWorkflowFormSession: sinon.stub().callsFake(async () => {
				config.taskState.activePlaceholderWorkflowValues = {
					...(config.taskState.activePlaceholderWorkflowValues ?? {}),
					output_file: olderPath,
				}
			}),
		})
		const handler = new PrepareBrainstormingSessionToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "prepare_brainstorming_session",
			params: {},
			partial: false,
		} as any)

		assert.equal(
			result,
			"Stored workflow placeholder output_file from the runtime-owned brainstorming session preparation flow.",
		)
		sinon.assert.calledOnce(callbacks.runWorkflowFormSession)
		assert.deepEqual(callbacks.runWorkflowFormSession.firstCall.args[0], {
			resolverId: "brainstorming_step_2_select_session",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "brainstorming.md",
				stepNumber: 2,
			},
			initialPhase: "collect_inputs",
			context: {
				brainstormingSessionOptions: [
					{
						value: newestPath,
						label: "brainstorming-session-2026-04-08-2.md",
						description: newestPath,
					},
					{
						value: olderPath,
						label: "brainstorming-session-2026-04-08.md",
						description: olderPath,
					},
				],
			},
		})
	})

	it("fails when List all sessions returns without persisting one of the offered session paths", async () => {
		const { workspaceDir } = await createWorkspace()
		const outputFolder = path.join(workspaceDir, "output")
		const brainstormingDir = path.join(outputFolder, "brainstorming")
		await fs.mkdir(brainstormingDir, { recursive: true })
		await fs.writeFile(path.join(brainstormingDir, "brainstorming-session-2026-04-08.md"), "existing", "utf8")
		const { config } = createConfig({
			cwd: workspaceDir,
			outputFolder,
			askResult: { text: "List all sessions" },
			runWorkflowFormSession: sinon.stub().callsFake(async () => {
				config.taskState.activePlaceholderWorkflowValues = {
					...(config.taskState.activePlaceholderWorkflowValues ?? {}),
					output_file: "/tmp/not-an-offered-session.md",
				}
			}),
		})
		const handler = new PrepareBrainstormingSessionToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "prepare_brainstorming_session",
			params: {},
			partial: false,
		} as any)

		assert.equal(
			result,
			formatResponse.toolError("The brainstorming session picker did not persist a valid output_file selection."),
		)
	})

	it("fails when the brainstorming session picker cannot be rendered", async () => {
		const { workspaceDir } = await createWorkspace()
		const outputFolder = path.join(workspaceDir, "output")
		const brainstormingDir = path.join(outputFolder, "brainstorming")
		await fs.mkdir(brainstormingDir, { recursive: true })
		await fs.writeFile(path.join(brainstormingDir, "brainstorming-session-2026-04-08.md"), "existing", "utf8")
		const { config } = createConfig({
			cwd: workspaceDir,
			outputFolder,
			askResult: { text: "List all sessions" },
			runWorkflowFormSession: sinon.stub().rejects(new Error("Could not render brainstorming session picker.")),
		})
		const handler = new PrepareBrainstormingSessionToolHandler()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "prepare_brainstorming_session",
			params: {},
			partial: false,
		} as any)

		assert.equal(result, formatResponse.toolError("Could not render brainstorming session picker."))
	})
})
