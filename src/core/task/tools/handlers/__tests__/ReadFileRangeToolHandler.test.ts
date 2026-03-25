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
import { ReadFileRangeToolHandler } from "../ReadFileRangeToolHandler"

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

function makeBlock(params: Record<string, string>) {
	return {
		type: "tool_use" as const,
		name: ClineDefaultTool.FILE_READ_RANGE,
		params,
		partial: false,
	}
}

describe("ReadFileRangeToolHandler", () => {
	let sandbox: sinon.SinonSandbox

	beforeEach(async () => {
		sandbox = sinon.createSandbox()
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cline-read-range-test-"))
		sandbox.stub(pathUtils, "isLocatedInWorkspace").resolves(true)
	})

	afterEach(async () => {
		sandbox.restore()
		await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
	})

	it("returns the requested 1-based line range", async () => {
		const { config, validator } = createConfig()
		const handler = new ReadFileRangeToolHandler(validator)
		const relPath = "range.ts"
		await fs.writeFile(path.join(tmpDir, relPath), "one\ntwo\nthree\nfour\n")

		const result = await handler.execute(config, makeBlock({ path: relPath, start_line: "2", end_line: "3" }))

		assert.ok((result as string).includes("[File range 2-3 of 5]"))
		assert.ok((result as string).includes("two\nthree"))
		assert.ok(!(result as string).includes("one"))
	})

	it("rejects invalid line ranges", async () => {
		const { config, taskState, validator } = createConfig()
		const handler = new ReadFileRangeToolHandler(validator)
		const relPath = "invalid.ts"
		await fs.writeFile(path.join(tmpDir, relPath), "one\ntwo\n")

		const result = await handler.execute(config, makeBlock({ path: relPath, start_line: "3", end_line: "2" }))

		assert.ok((result as string).includes("start_line and end_line must be 1-based integers"))
		assert.equal(taskState.consecutiveMistakeCount, 1)
	})

	it("rejects malformed numeric strings", async () => {
		const { config, taskState, validator } = createConfig()
		const handler = new ReadFileRangeToolHandler(validator)
		const relPath = "malformed.ts"
		await fs.writeFile(path.join(tmpDir, relPath), "one\ntwo\nthree\n")

		const decimalResult = await handler.execute(config, makeBlock({ path: relPath, start_line: "1.5", end_line: "2" }))
		assert.ok((decimalResult as string).includes("start_line and end_line must be 1-based integers"))
		assert.equal(taskState.consecutiveMistakeCount, 1)

		const alphaSuffixResult = await handler.execute(config, makeBlock({ path: relPath, start_line: "1", end_line: "3abc" }))
		assert.ok((alphaSuffixResult as string).includes("start_line and end_line must be 1-based integers"))
		assert.equal(taskState.consecutiveMistakeCount, 2)

		const signedResult = await handler.execute(config, makeBlock({ path: relPath, start_line: "+2", end_line: "3" }))
		assert.ok((signedResult as string).includes("start_line and end_line must be 1-based integers"))
		assert.equal(taskState.consecutiveMistakeCount, 3)
	})

	it("increments consecutiveMistakeCount when required params are missing", async () => {
		const { config, taskState, validator } = createConfig()
		const handler = new ReadFileRangeToolHandler(validator)

		const result = await handler.execute(config, makeBlock({ path: "missing.ts", start_line: "1" }))

		assert.equal(result, "missing")
		assert.equal(taskState.consecutiveMistakeCount, 1)
	})
})
