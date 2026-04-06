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

	it("applies code-review step 2 row and keeps the configured Indxr bundles", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.BASH),
			makeRegisteredTool(ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
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
				activePlaceholderWorkflowStepNumber: 2,
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
			ClineDefaultTool.FILE_NEW,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.USE_SUBAGENTS)
		expect(keptIds).to.not.include(ClineDefaultTool.WEB_SEARCH)
		expect(keptNames).to.include("indxr-10mcp0search_relevant")
		expect(keptNames).to.include("indxr-10mcp0get_file_summary")
		expect(keptNames).to.include("indxr-10mcp0lookup_symbol")
		expect(keptNames).to.not.include("12345670mcp0test_tool")
	})

	it("applies code-review step 3 row without diff-build or Indxr tools", () => {
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
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT)
		expect(keptIds).to.not.include(ClineDefaultTool.BASH)
		expect(keptIds).to.not.include(ClineDefaultTool.USE_SUBAGENTS)
		expect(keptNames.some((name) => name.startsWith("indxr-"))).to.equal(false)
	})

	it("applies create-epics step 2 row and keeps build_epics_document without placeholder-write tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.BUILD_EPICS_DOCUMENT),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.PLAN_MODE),
			makeRegisteredTool(ClineDefaultTool.BROWSER),
			makeRegisteredTool(ClineDefaultTool.MCP_ACCESS),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext({
				activePlaceholderWorkflowName: "create-epics.md",
				activePlaceholderWorkflowStepNumber: 2,
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
			ClineDefaultTool.LIST_FILES,
			ClineDefaultTool.SEARCH,
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.FILE_NEW,
			ClineDefaultTool.BUILD_EPICS_DOCUMENT,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
	})

	it("applies pi-planning step 2 row and keeps only the runtime-owned epic selector plus preserved tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.SELECT_TARGET_EPIC),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.PLAN_MODE),
			makeRegisteredTool(ClineDefaultTool.BROWSER),
			makeRegisteredTool(ClineDefaultTool.MCP_ACCESS),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext({
				activePlaceholderWorkflowName: "pi-planning.md",
				activePlaceholderWorkflowStepNumber: 2,
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
			ClineDefaultTool.SELECT_TARGET_EPIC,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.LIST_FILES)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ)
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
	})

	it("applies pi-planning step 3 row and keeps only the delivery-spec builder plus preserved tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.PLAN_MODE),
			makeRegisteredTool(ClineDefaultTool.BROWSER),
			makeRegisteredTool(ClineDefaultTool.MCP_ACCESS),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext({
				activePlaceholderWorkflowName: "pi-planning.md",
				activePlaceholderWorkflowStepNumber: 3,
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
			ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.LIST_FILES)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
	})

	it("applies pi-planning step 4 row and keeps workflow_progress_request without doc read or write bundles", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.PLAN_MODE),
			makeRegisteredTool(ClineDefaultTool.BROWSER),
			makeRegisteredTool(ClineDefaultTool.MCP_ACCESS),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext({
				activePlaceholderWorkflowName: "pi-planning.md",
				activePlaceholderWorkflowStepNumber: 4,
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.LIST_FILES)
		expect(keptIds).to.not.include(ClineDefaultTool.SEARCH)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ_RANGE)
		expect(keptIds).to.not.include(ClineDefaultTool.APPLY_PATCH)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_NEW)
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
	})

	it("applies pi-planning step 5 row and keeps workflow_progress_request with document read and write bundles", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.PLAN_MODE),
			makeRegisteredTool(ClineDefaultTool.BROWSER),
			makeRegisteredTool(ClineDefaultTool.MCP_ACCESS),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext({
				activePlaceholderWorkflowName: "pi-planning.md",
				activePlaceholderWorkflowStepNumber: 5,
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			ClineDefaultTool.LIST_FILES,
			ClineDefaultTool.SEARCH,
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.FILE_NEW,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
	})

	it("applies create-epics step 3 row and keeps workflow_progress_request with workflow routing tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.USE_SKILL),
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.PLAN_MODE),
			makeRegisteredTool(ClineDefaultTool.BROWSER),
			makeRegisteredTool(ClineDefaultTool.MCP_ACCESS),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext({
				activePlaceholderWorkflowName: "create-epics.md",
				activePlaceholderWorkflowStepNumber: 3,
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			ClineDefaultTool.USE_SKILL,
			ClineDefaultTool.LIST_FILES,
			ClineDefaultTool.SEARCH,
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.FILE_NEW,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
	})

	it("applies create-prd step 3 row and keeps workflow_progress_request without doc read tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.PLAN_MODE),
			makeRegisteredTool(ClineDefaultTool.BROWSER),
			makeRegisteredTool(ClineDefaultTool.MCP_ACCESS),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext({
				activePlaceholderWorkflowName: "create-prd.md",
				activePlaceholderWorkflowStepNumber: 3,
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.FILE_NEW,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.SEARCH)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ_RANGE)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
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
		expect(keptNames).to.include.members(["indxr-10mcp0search_relevant", "indxr-10mcp0get_file_summary"])
		expect(keptNames).to.not.include("indxr-10mcp0lookup_symbol")
		expect(keptNames).to.not.include("indxr-10mcp0get_callers")
		expect(keptIds).to.not.include(ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT)
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.WEB_SEARCH)
		expect(keptNames).to.not.include("12345670mcp0test_tool")
	})

	it("applies review-adversarial-general step 2 row without symbol-graph Indxr tools", () => {
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
				activePlaceholderWorkflowName: "review-adversarial-general.md",
				activePlaceholderWorkflowStepNumber: 2,
			}),
			registeredTools,
			mcpTools: [
				makeMcpTool("indxr-10mcp0search_relevant"),
				makeMcpTool("indxr-10mcp0get_file_summary"),
				makeMcpTool("indxr-10mcp0lookup_symbol"),
				makeMcpTool("indxr-10mcp0get_callers"),
			],
		})

		const keptNames = result.map((tool) => tool.name)
		expect(keptNames).to.include.members(["indxr-10mcp0search_relevant", "indxr-10mcp0get_file_summary"])
		expect(keptNames).to.not.include("indxr-10mcp0lookup_symbol")
		expect(keptNames).to.not.include("indxr-10mcp0get_callers")
	})

	it("applies blind-review step 2 row and keeps write_to_file plus the allowed Indxr tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.BASH),
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
				activePlaceholderWorkflowName: "blind-review.md",
				activePlaceholderWorkflowStepNumber: 2,
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
			ClineDefaultTool.LIST_CODE_DEF,
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.FILE_NEW,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.BASH)
		expect(keptIds).to.not.include(ClineDefaultTool.WEB_SEARCH)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
		expect(keptNames).to.include.members(["indxr-10mcp0search_relevant", "indxr-10mcp0get_file_summary"])
		expect(keptNames).to.not.include("indxr-10mcp0lookup_symbol")
		expect(keptNames).to.not.include("12345670mcp0test_tool")
	})

	it("applies dev-story step 2 row without any Indxr MCP tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.BASH),
			makeRegisteredTool(ClineDefaultTool.STORY_TASK_REMINDER),
			makeRegisteredTool(ClineDefaultTool.STORY_TASK_COMPLETE),
			makeRegisteredTool(ClineDefaultTool.STORY_NOTES_UPDATE),
			makeRegisteredTool(ClineDefaultTool.STORY_TESTING_COMPLETE),
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.BROWSER),
			makeRegisteredTool(ClineDefaultTool.MCP_ACCESS),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext({
				activePlaceholderWorkflowName: "dev-story.md",
				activePlaceholderWorkflowStepNumber: 2,
			}),
			registeredTools,
			mcpTools: [
				makeMcpTool("indxr-10mcp0search_relevant"),
				makeMcpTool("indxr-10mcp0get_file_summary"),
				makeMcpTool("indxr-10mcp0read_source"),
				makeMcpTool("indxr-10mcp0lookup_symbol"),
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
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.FILE_NEW,
			ClineDefaultTool.BASH,
			ClineDefaultTool.STORY_TASK_REMINDER,
			ClineDefaultTool.STORY_TASK_COMPLETE,
			ClineDefaultTool.STORY_NOTES_UPDATE,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.STORY_TESTING_COMPLETE)
		expect(keptNames.some((name) => name.startsWith("indxr-"))).to.equal(false)
	})

	it("applies dev-story step 3 row with validation tools and the existing Indxr bundles", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.BASH),
			makeRegisteredTool(ClineDefaultTool.STORY_TASK_REMINDER),
			makeRegisteredTool(ClineDefaultTool.STORY_TASK_COMPLETE),
			makeRegisteredTool(ClineDefaultTool.STORY_NOTES_UPDATE),
			makeRegisteredTool(ClineDefaultTool.STORY_TESTING_COMPLETE),
			makeRegisteredTool(ClineDefaultTool.ASK),
			makeRegisteredTool(ClineDefaultTool.SEND_USER_MESSAGE),
			makeRegisteredTool(ClineDefaultTool.ATTEMPT),
			makeRegisteredTool(ClineDefaultTool.BROWSER),
			makeRegisteredTool(ClineDefaultTool.MCP_ACCESS),
			makeRegisteredTool(ClineDefaultTool.NEW_TASK),
		]

		const result = filterContextualNativeToolSpecs({
			context: makeContext({
				activePlaceholderWorkflowName: "dev-story.md",
				activePlaceholderWorkflowStepNumber: 3,
			}),
			registeredTools,
			mcpTools: [
				makeMcpTool("indxr-10mcp0search_relevant"),
				makeMcpTool("indxr-10mcp0get_file_summary"),
				makeMcpTool("indxr-10mcp0lookup_symbol"),
				makeMcpTool("indxr-10mcp0get_callers"),
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
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.FILE_NEW,
			ClineDefaultTool.BASH,
			ClineDefaultTool.STORY_NOTES_UPDATE,
			ClineDefaultTool.STORY_TESTING_COMPLETE,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.STORY_TASK_REMINDER)
		expect(keptIds).to.not.include(ClineDefaultTool.STORY_TASK_COMPLETE)
		expect(keptNames).to.include.members([
			"indxr-10mcp0search_relevant",
			"indxr-10mcp0get_file_summary",
			"indxr-10mcp0lookup_symbol",
			"indxr-10mcp0get_callers",
		])
	})
})
