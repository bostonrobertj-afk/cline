import { strict as assert } from "node:assert"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { ClineDefaultTool } from "@shared/tools"
import * as pathUtils from "@utils/path"
import { afterEach, beforeEach, describe, it } from "mocha"
import sinon from "sinon"
import { TaskState } from "../../../TaskState"
import { ToolValidator } from "../../ToolValidator"
import type { TaskConfig } from "../../types/TaskConfig"
import { ReadFileToolHandler } from "../ReadFileToolHandler"

let tmpDir: string

function createConfig() {
	const taskState = new TaskState()

	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask: sinon.stub().resolves({ response: "yesButtonClicked" }),
		saveCheckpoint: sinon.stub().resolves(),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
		shouldAutoApproveToolWithPath: sinon.stub().resolves(true),
		postStateToWebview: sinon.stub().resolves(),
		cancelTask: sinon.stub().resolves(),
		updateTaskHistory: sinon.stub().resolves([]),
		switchToActMode: sinon.stub().resolves(false),
		setActiveHookExecution: sinon.stub().resolves(),
		clearActiveHookExecution: sinon.stub().resolves(),
		getActiveHookExecution: sinon.stub().resolves(undefined),
		runUserPromptSubmitHook: sinon.stub().resolves({}),
		executeCommandTool: sinon.stub().resolves([false, "ok"]),
		cancelRunningCommandTool: sinon.stub().resolves(false),
		doesLatestTaskCompletionHaveNewChanges: sinon.stub().resolves(false),
		updateFCListFromToolResponse: sinon.stub().resolves(),
		shouldAutoApproveTool: sinon.stub().returns([true, true]),
		reinitExistingTaskFromId: sinon.stub().resolves(),
		applyLatestBrowserSettings: sinon.stub().resolves(undefined),
	}

	const config = {
		taskId: "task-1",
		ulid: "ulid-1",
		cwd: tmpDir,
		mode: "act",
		strictPlanModeEnabled: false,
		yoloModeToggled: true,
		doubleCheckCompletionEnabled: false,
		vscodeTerminalExecutionMode: "backgroundExec",
		enableParallelToolCalling: true,
		isSubagentExecution: true,
		taskState,
		messageState: {},
		api: {
			getModel: () => ({ id: "test-model", info: { supportsImages: false } }),
		},
		autoApprovalSettings: {
			enableNotifications: false,
			actions: { executeSafeCommands: false, executeAllCommands: false },
		},
		autoApprover: {
			shouldAutoApproveTool: sinon.stub().returns([true, true]),
		},
		browserSettings: {},
		focusChainSettings: {},
		services: {
			stateManager: {
				getGlobalStateKey: () => undefined,
				getGlobalSettingsKey: (key: string) => {
					if (key === "mode") return "act"
					if (key === "hooksEnabled") return false
					return undefined
				},
				getApiConfiguration: () => ({
					planModeApiProvider: "openai",
					actModeApiProvider: "openai",
				}),
			},
			fileContextTracker: {
				trackFileContext: sinon.stub().resolves(),
			},
			mcpHub: {},
			browserSession: {},
			urlContentFetcher: {},
			diffViewProvider: {},
			clineIgnoreController: { validateAccess: () => true },
			commandPermissionController: {},
			contextManager: {},
		},
		callbacks,
		coordinator: { getHandler: sinon.stub() },
	} as unknown as TaskConfig

	return { config, taskState, validator: new ToolValidator({ validateAccess: () => true } as any) }
}

function makeBlock(relPath: string) {
	return {
		type: "tool_use" as const,
		name: ClineDefaultTool.FILE_READ,
		params: { path: relPath },
		partial: false,
	}
}

describe("ReadFileToolHandler repeat read behavior", () => {
	let sandbox: sinon.SinonSandbox

	beforeEach(async () => {
		sandbox = sinon.createSandbox()
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cline-repeat-read-test-"))
		sandbox.stub(pathUtils, "isLocatedInWorkspace").resolves(true)
	})

	afterEach(async () => {
		sandbox.restore()
		await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
	})

	it("returns a compact unchanged notice when the cached file is unchanged", async () => {
		const { config, taskState, validator } = createConfig()
		const handler = new ReadFileToolHandler(validator)
		const relPath = "example.ts"
		await fs.writeFile(path.join(tmpDir, relPath), "const answer = 42\n")

		const first = await handler.execute(config, makeBlock(relPath))
		const second = await handler.execute(config, makeBlock(relPath))

		assert.equal(first, "const answer = 42\n")
		assert.ok((second as string).includes("File unchanged since last read"))
		assert.ok(!(second as string).includes("const answer = 42"))
		assert.equal(taskState.fileReadCache.get(path.join(tmpDir, relPath).toLowerCase())?.readCount, 2)
	})

	it("returns only changed hunks when the file changed after a cached full read", async () => {
		const { config, taskState, validator } = createConfig()
		const handler = new ReadFileToolHandler(validator)
		const relPath = "delta.ts"
		const absolutePath = path.join(tmpDir, relPath)
		const originalLines = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`)
		const updatedLines = [...originalLines]
		updatedLines[9] = "line 10 updated"

		await fs.writeFile(absolutePath, `${originalLines.join("\n")}\n`)
		await handler.execute(config, makeBlock(relPath))

		await new Promise((resolve) => setTimeout(resolve, 20))
		await fs.writeFile(absolutePath, `${updatedLines.join("\n")}\n`)
		const cacheEntry = taskState.fileReadCache.get(absolutePath.toLowerCase())
		if (cacheEntry) {
			cacheEntry.mtime = 0
		}

		const result = await handler.execute(config, makeBlock(relPath))

		assert.ok((result as string).includes("File changed since last read"))
		assert.ok((result as string).includes("@@ -"))
		assert.ok((result as string).includes("-line 10"))
		assert.ok((result as string).includes("+line 10 updated"))
		assert.ok(!(result as string).includes("Returning content"))
	})

	it("falls back to a full reread when no cached snapshot is available", async () => {
		const { config, taskState, validator } = createConfig()
		const handler = new ReadFileToolHandler(validator)
		const relPath = "full.ts"
		const absolutePath = path.join(tmpDir, relPath)
		const content = "export const value = 'fresh'\n"
		await fs.writeFile(absolutePath, content)

		const mtime = (await fs.stat(absolutePath)).mtimeMs
		taskState.fileReadCache.set(absolutePath.toLowerCase(), {
			readCount: 1,
			mtime,
		})

		const result = await handler.execute(config, makeBlock(relPath))

		assert.equal(result, content)
		assert.equal(taskState.fileReadCache.get(absolutePath.toLowerCase())?.snapshotText, content)
	})

	it("returns a compact unchanged notice when only mtime changed", async () => {
		const { config, taskState, validator } = createConfig()
		const handler = new ReadFileToolHandler(validator)
		const relPath = "same-content.ts"
		const absolutePath = path.join(tmpDir, relPath)
		const content = "export const stable = true\n"
		await fs.writeFile(absolutePath, content)

		await handler.execute(config, makeBlock(relPath))
		const cacheEntry = taskState.fileReadCache.get(absolutePath.toLowerCase())
		if (cacheEntry) {
			cacheEntry.mtime = 0
		}

		const result = await handler.execute(config, makeBlock(relPath))

		assert.ok((result as string).includes("content matches your previous full read"))
		assert.ok(!(result as string).includes(content))
	})

	it("blocks full-file reads that exceed the bounded full-read limit", async () => {
		const { config, taskState, validator } = createConfig()
		const handler = new ReadFileToolHandler(validator)
		const relPath = "too-large.ts"
		const absolutePath = path.join(tmpDir, relPath)
		const content = `${Array.from({ length: 301 }, (_, index) => `line ${index + 1}`).join("\n")}\n`
		await fs.writeFile(absolutePath, content)

		const result = await handler.execute(config, makeBlock(relPath))

		assert.ok((result as string).includes("[Full file read blocked]"))
		assert.ok((result as string).includes("300-line / 16384-byte full-read limit"))
		assert.ok((result as string).includes("Use read_file_range with explicit 1-based start_line and end_line values"))
		assert.ok(!(result as string).includes("line 301"))
		assert.equal(taskState.fileReadCache.get(absolutePath.toLowerCase()), undefined)
	})

	it("blocks oversized full-file reads instead of caching them", async () => {
		const { config, taskState, validator } = createConfig()
		const handler = new ReadFileToolHandler(validator)
		const relPath = "large-file.ts"
		const absolutePath = path.join(tmpDir, relPath)
		const content = "a".repeat(200_000)
		await fs.writeFile(absolutePath, content)

		const result = await handler.execute(config, makeBlock(relPath))
		const cacheEntry = taskState.fileReadCache.get(absolutePath.toLowerCase())

		assert.ok((result as string).includes("[Full file read blocked]"))
		assert.ok((result as string).includes("300-line / 16384-byte full-read limit"))
		assert.equal(cacheEntry, undefined)
	})
})
