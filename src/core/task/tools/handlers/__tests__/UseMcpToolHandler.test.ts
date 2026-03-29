import { strict as assert } from "node:assert"
import { ClineDefaultTool } from "@shared/tools"
import { describe, it } from "mocha"
import sinon from "sinon"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { UseMcpToolHandler } from "../UseMcpToolHandler"

function createConfig(toolResult: { content: any[]; isError?: boolean }) {
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
		shouldAutoApproveTool: sinon.stub().returns(true),
		reinitExistingTaskFromId: sinon.stub().resolves(),
		applyLatestBrowserSettings: sinon.stub().resolves(undefined),
	}

	const config = {
		taskId: "task-1",
		ulid: "ulid-1",
		cwd: "/tmp",
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
			mcpHub: {
				connections: [],
				getPendingNotifications: sinon.stub().returns([]),
				callTool: sinon.stub().resolves(toolResult),
			},
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

	return { config, taskState }
}

function makeBlock(toolName: string, args: string) {
	return {
		type: "tool_use" as const,
		name: ClineDefaultTool.MCP_USE,
		params: {
			server_name: "indxr",
			tool_name: toolName,
			arguments: args,
		},
		partial: false,
	}
}

describe("UseMcpToolHandler", () => {
	it("blocks oversized non-targeted read_source payloads", async () => {
		const { config } = createConfig({
			content: [
				{
					type: "resource",
					resource: {
						path: "src/large.ts",
						start_line: 1,
						end_line: 301,
						source: `${Array.from({ length: 301 }, (_, index) => `line ${index + 1}`).join("\n")}\n`,
					},
				},
			],
		})
		const handler = new UseMcpToolHandler()

		const result = await handler.execute(config, makeBlock("read_source", JSON.stringify({ path: "src/large.ts" })))

		assert.ok((result as string).includes("[MCP full source read blocked]"))
		assert.ok((result as string).includes("explicit symbol or 1-based start_line/end_line range"))
		assert.ok(!(result as string).includes("line 301"))
	})

	it("normalizes targeted read_source payloads with line metadata", async () => {
		const { config } = createConfig({
			content: [
				{
					type: "resource",
					resource: {
						path: "src/example.ts",
						start_line: 10,
						end_line: 12,
						source: "ten\neleven\ntwelve",
					},
				},
			],
		})
		const handler = new UseMcpToolHandler()

		const result = await handler.execute(
			config,
			makeBlock("read_source", JSON.stringify({ path: "src/example.ts", start_line: 10, end_line: 12 })),
		)

		assert.ok((result as string).includes("[MCP source range 10-12] src/example.ts"))
		assert.ok((result as string).includes("ten\neleven\ntwelve"))
	})

	it("returns a compact overlap notice for substantially overlapping targeted read_source payloads", async () => {
		const { config, taskState } = createConfig({
			content: [
				{
					type: "resource",
					resource: {
						path: "src/example.ts",
						start_line: 12,
						end_line: 21,
						source: "twelve\nthirteen\nfourteen\nfifteen\nsixteen\nseventeen\neighteen\nnineteen\ntwenty\ntwenty-one",
					},
				},
			],
		})
		taskState.sourceReadWindowCache.set("src/example.ts", [{ startLine: 10, endLine: 20 }])
		const handler = new UseMcpToolHandler()

		const result = await handler.execute(
			config,
			makeBlock("read_source", JSON.stringify({ path: "src/example.ts", start_line: 12, end_line: 21 })),
		)

		assert.ok((result as string).includes("[MCP source overlap notice]"))
		assert.ok(!(result as string).includes("twelve\nthirteen"))
	})

	it("serializes generic MCP resource payloads without pretty-print indentation", async () => {
		const { config } = createConfig({
			content: [
				{
					type: "resource",
					resource: {
						path: "src/example.ts",
						language: "typescript",
					},
				},
			],
		})
		const handler = new UseMcpToolHandler()

		const result = await handler.execute(config, makeBlock("search_symbols", JSON.stringify({ query: "example" })))

		assert.ok((result as string).includes('{"path":"src/example.ts","language":"typescript"}'))
		assert.ok(!(result as string).includes("\n  "))
	})
})
