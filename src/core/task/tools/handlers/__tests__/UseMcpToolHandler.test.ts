import { strict as assert } from "node:assert"
import type { McpToolCallResponse } from "@shared/mcp"
import { ClineDefaultTool } from "@shared/tools"
import { describe, it } from "mocha"
import sinon from "sinon"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { UseMcpToolHandler } from "../UseMcpToolHandler"

type ReadSourceResource = {
	uri: string
	path: string
	start_line: number
	end_line: number
	source: string
	mimeType?: string
	text?: string
	blob?: string
	language?: string
}

const makeResourceItem = (resource: Record<string, unknown>) => ({
	type: "resource" as const,
	resource: resource as unknown as McpToolCallResponse["content"][number] extends infer T
		? T extends { type: "resource"; resource: infer R }
			? R
			: never
		: never,
})

const makeReadSourceResource = (resource: ReadSourceResource) => makeResourceItem(resource)

function createConfig(toolResult: McpToolCallResponse) {
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
				makeReadSourceResource({
					uri: "file://src/large.ts",
					path: "src/large.ts",
					start_line: 1,
					end_line: 801,
					source: `${Array.from({ length: 801 }, (_, index) => `line ${index + 1}`).join("\n")}\n`,
				}),
			],
		})
		const handler = new UseMcpToolHandler()

		const result = await handler.execute(config, makeBlock("read_source", JSON.stringify({ path: "src/large.ts" })))

		assert.ok((result as string).includes("[MCP full source read blocked]"))
		assert.ok((result as string).includes("800-line / 65536-byte full-read limit"))
		assert.ok((result as string).includes("explicit symbol or 1-based start_line/end_line range"))
		assert.ok(!(result as string).includes("line 801"))
	})

	it("allows non-targeted read_source payloads at the 800-line threshold", async () => {
		const { config } = createConfig({
			content: [
				makeReadSourceResource({
					uri: "file://src/allowed.ts",
					path: "src/allowed.ts",
					start_line: 1,
					end_line: 800,
					source: Array.from({ length: 800 }, (_, index) => `line ${index + 1}`).join("\n"),
				}),
			],
		})
		const handler = new UseMcpToolHandler()

		const result = await handler.execute(config, makeBlock("read_source", JSON.stringify({ path: "src/allowed.ts" })))

		assert.ok((result as string).includes("[MCP source range 1-800] src/allowed.ts"))
		assert.ok((result as string).includes("line 800"))
		assert.ok(!(result as string).includes("[MCP full source read blocked]"))
	})

	it("normalizes targeted read_source payloads with line metadata", async () => {
		const { config } = createConfig({
			content: [
				makeReadSourceResource({
					uri: "file://src/example.ts",
					path: "src/example.ts",
					start_line: 10,
					end_line: 12,
					source: "ten\neleven\ntwelve",
				}),
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
				makeReadSourceResource({
					uri: "file://src/example.ts",
					path: "src/example.ts",
					start_line: 12,
					end_line: 21,
					source: "twelve\nthirteen\nfourteen\nfifteen\nsixteen\nseventeen\neighteen\nnineteen\ntwenty\ntwenty-one",
				}),
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
				makeResourceItem({
					uri: "file://src/example.ts",
					path: "src/example.ts",
					language: "typescript",
				}),
			],
		})
		const handler = new UseMcpToolHandler()

		const result = await handler.execute(config, makeBlock("search_symbols", JSON.stringify({ query: "example" })))
		const payload: { uri?: unknown; path?: unknown; language?: unknown } = JSON.parse(result as string)

		assert.equal(payload.uri, "file://src/example.ts")
		assert.equal(payload.path, "src/example.ts")
		assert.equal(payload.language, "typescript")
		assert.ok(!(result as string).includes("\n  "))
	})
})
