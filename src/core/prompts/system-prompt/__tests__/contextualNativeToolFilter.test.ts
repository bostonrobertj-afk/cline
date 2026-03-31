import { expect } from "chai"
import { describe, it } from "mocha"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { filterContextualNativeToolSpecs } from "../registry/contextualNativeToolFilter"
import type { ClineToolSpec } from "../spec"
import type { SystemPromptContext } from "../types"

const makeContext = (overrides: Partial<SystemPromptContext> = {}): SystemPromptContext =>
	({
		ide: "TestIde",
		providerInfo: {
			providerId: "openai",
			model: { id: "gpt-5-1", info: { supportsPromptCache: false } },
			mode: "act",
		},
		...overrides,
	}) as SystemPromptContext

const makeRegisteredTool = (id: ClineDefaultTool): ClineToolSpec => ({
	variant: ModelFamily.GENERIC,
	id,
	name: id,
	description: id,
})

const makeMcpTool = (name: string): ClineToolSpec => ({
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.MCP_USE,
	name,
	description: name,
})

describe("filterContextualNativeToolSpecs", () => {
	it("filters native response tools for ACT mode", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.PLAN_MODE),
			makeRegisteredTool(ClineDefaultTool.ACT_MODE),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext(),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.ACT_MODE,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
	})

	it("filters native response tools for PLAN mode", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.PLAN_MODE),
			makeRegisteredTool(ClineDefaultTool.ACT_MODE),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext({
				providerInfo: { ...makeContext().providerInfo, mode: "plan" },
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.PLAN_MODE,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.ATTEMPT)
		expect(keptIds).to.not.include(ClineDefaultTool.ACT_MODE)
	})

	it("applies code-review step 3 row and keeps the configured Indxr bundles", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.BASH),
			makeRegisteredTool(ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.USE_SUBAGENTS),
			makeRegisteredTool(ClineDefaultTool.WEB_SEARCH),
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.PLAN_MODE),
			makeRegisteredTool(ClineDefaultTool.BROWSER),
			makeRegisteredTool(ClineDefaultTool.MCP_ACCESS),
			makeRegisteredTool(ClineDefaultTool.MCP_DOCS),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext({
				activePlaceholderWorkflowName: "code-review.md",
				activePlaceholderWorkflowStepNumber: 3,
			}),
			registeredTools,
			mcpTools: [
				makeMcpTool("indxr-10mcp0search_relevant"),
				makeMcpTool("indxr-10mcp0get_file_summary"),
				makeMcpTool("indxr-10mcp0lookup_symbol"),
				makeMcpTool("12345670mcp0test_tool"),
			],
		})

		const keptIds = result.map((tool) => tool.id)
		const keptNames = result.map((tool) => tool.name)
		expect(keptIds).to.include.members([
			ClineDefaultTool.LIST_FILES,
			ClineDefaultTool.SEARCH,
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.BASH,
			ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
		expect(keptIds).to.not.include(ClineDefaultTool.USE_SUBAGENTS)
		expect(keptIds).to.not.include(ClineDefaultTool.WEB_SEARCH)
		expect(keptNames).to.include("indxr-10mcp0search_relevant")
		expect(keptNames).to.include("indxr-10mcp0get_file_summary")
		expect(keptNames).to.include("indxr-10mcp0lookup_symbol")
		expect(keptNames).to.not.include("12345670mcp0test_tool")
	})

	it("applies review-edge-case-hunter step 2 row and keeps only allowed prefixed Indxr tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.WEB_SEARCH),
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.PLAN_MODE),
			makeRegisteredTool(ClineDefaultTool.BROWSER),
			makeRegisteredTool(ClineDefaultTool.MCP_ACCESS),
			makeRegisteredTool(ClineDefaultTool.MCP_DOCS),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext({
				activePlaceholderWorkflowName: "review-edge-case-hunter.md",
				activePlaceholderWorkflowStepNumber: 2,
			}),
			registeredTools,
			mcpTools: [
				makeMcpTool("indxr-10mcp0search_relevant"),
				makeMcpTool("indxr-10mcp0get_file_summary"),
				makeMcpTool("indxr-10mcp0lookup_symbol"),
				makeMcpTool("indxr-10mcp0get_callers"),
				makeMcpTool("12345670mcp0test_tool"),
			],
		})

		const keptIds = result.map((tool) => tool.id)
		const keptNames = result.map((tool) => tool.name)
		expect(keptIds).to.include.members([
			ClineDefaultTool.LIST_FILES,
			ClineDefaultTool.SEARCH,
			ClineDefaultTool.LIST_CODE_DEF,
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
		])
		expect(keptNames).to.include.members([
			"indxr-10mcp0search_relevant",
			"indxr-10mcp0get_file_summary",
			"indxr-10mcp0lookup_symbol",
			"indxr-10mcp0get_callers",
		])
		expect(keptIds).to.not.include(ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT)
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.WEB_SEARCH)
		expect(keptNames).to.not.include("12345670mcp0test_tool")
	})
})
