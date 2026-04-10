import { expect } from "chai"
import fs from "fs"
import { describe, it } from "mocha"
import path from "path"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { filterContextualNativeToolSpecs } from "../registry/contextualNativeToolFilter"
import { PLACEHOLDER_WORKFLOW_STEP_MATRIX } from "../registry/contextualToolMatrix"
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
	it("defines the canonical quick-spec 10-step row", () => {
		expect(PLACEHOLDER_WORKFLOW_STEP_MATRIX["quick-spec.md"]).to.deep.equal({
			1: ["PLACEHOLDER_WRITE"],
			2: [],
			3: ["DOC_READ", "DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			4: [
				"DOC_READ",
				"DOC_WRITE",
				"CODE_READ",
				"INDXR_DISCOVERY",
				"INDXR_SOURCE_READ",
				"INDXR_SYMBOL_GRAPH",
				"WORKFLOW_PROGRESS_REQUEST",
			],
			5: ["DOC_READ", "DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			6: [
				"DOC_READ",
				"DOC_WRITE",
				"CODE_READ",
				"INDXR_DISCOVERY",
				"INDXR_SOURCE_READ",
				"INDXR_SYMBOL_GRAPH",
				"WORKFLOW_PROGRESS_REQUEST",
			],
			7: ["DOC_READ", "DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			8: [
				"DOC_READ",
				"DOC_WRITE",
				"CODE_READ",
				"INDXR_DISCOVERY",
				"INDXR_SOURCE_READ",
				"INDXR_SYMBOL_GRAPH",
				"WORKFLOW_PROGRESS_REQUEST",
			],
			9: [
				"DOC_READ",
				"DOC_WRITE",
				"CODE_READ",
				"INDXR_DISCOVERY",
				"INDXR_SOURCE_READ",
				"INDXR_SYMBOL_GRAPH",
				"SUBAGENT_COORD",
				"WORKFLOW_PROGRESS_REQUEST",
			],
			10: ["DOC_READ", "DOC_WRITE"],
		})
	})

	it("defines the canonical quick-dev 5-step row", () => {
		expect(PLACEHOLDER_WORKFLOW_STEP_MATRIX["quick-dev.md"]).to.deep.equal({
			1: ["PLACEHOLDER_WRITE"],
			2: ["DOC_READ", "DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			3: ["DOC_READ", "DOC_WRITE", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "LOCAL_EXEC"],
			4: ["LOCAL_EXEC"],
			5: [],
		})
	})

	it("keeps the canonical quick-dev docs block aligned with the runtime matrix row", () => {
		const docPath = path.resolve("/Users/robertboston/Documents/Cline Extension/cline/docs/contextual-tool-schema.md")
		const docsText = fs.readFileSync(docPath, "utf8")

		expect(docsText).to.contain(`### quick-dev.md

- Step 1: \`PLACEHOLDER_WRITE\`
- Step 2: \`DOC_READ\`, \`DOC_WRITE\`, \`WORKFLOW_PROGRESS_REQUEST\`
- Step 3: \`DOC_READ\`, \`DOC_WRITE\`, \`CODE_READ\`, \`INDXR_DISCOVERY\`, \`INDXR_SOURCE_READ\`, \`INDXR_SYMBOL_GRAPH\`, \`LOCAL_EXEC\`
- Step 4: \`LOCAL_EXEC\`
- Step 5: no additional tools`)
	})

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

	it("applies create-epics step 2 row and keeps only document bundles without placeholder-write tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
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

	it("applies pi-planning step 2 row and keeps only preserved tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
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
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.LIST_FILES)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ)
		expect(keptIds).to.not.include(ClineDefaultTool.SELECT_TARGET_EPIC)
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
	})

	it("applies pi-planning step 3 row and keeps only preserved tools", () => {
		const registeredTools = [
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
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC)
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

	it("applies create-story step 2 row and keeps only preserved tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.BASH),
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
				activePlaceholderWorkflowName: "create-story.md",
				activePlaceholderWorkflowStepNumber: 2,
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
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
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ_RANGE)
		expect(keptIds).to.not.include(ClineDefaultTool.BUILD_STORY_DOCUMENT)
		expect(keptIds).to.not.include(ClineDefaultTool.SEARCH)
		expect(keptIds).to.not.include(ClineDefaultTool.BASH)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
	})

	it("applies quick-spec step 2 row and keeps only preserved tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
			makeRegisteredTool(ClineDefaultTool.BASH),
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
				activePlaceholderWorkflowName: "quick-spec.md",
				activePlaceholderWorkflowStepNumber: 2,
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
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
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ_RANGE)
		expect(keptIds).to.not.include(ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT)
		expect(keptIds).to.not.include(ClineDefaultTool.LIST_CODE_DEF)
		expect(keptIds).to.not.include(ClineDefaultTool.SEARCH)
		expect(keptIds).to.not.include(ClineDefaultTool.BASH)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
	})

	it("applies quick-dev step 1 row and keeps only placeholder-write among workflow-specific bundles", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.BASH),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
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
				activePlaceholderWorkflowName: "quick-dev.md",
				activePlaceholderWorkflowStepNumber: 1,
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
			ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.BASH)
		expect(keptIds).to.not.include(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST)
		expect(keptIds).to.not.include(ClineDefaultTool.LIST_FILES)
		expect(keptIds).to.not.include(ClineDefaultTool.SEARCH)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ_RANGE)
		expect(keptIds).to.not.include(ClineDefaultTool.LIST_CODE_DEF)
		expect(keptIds).to.not.include(ClineDefaultTool.APPLY_PATCH)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_NEW)
	})

	it("applies quick-dev step 2 row and keeps workflow_progress_request with document read and write bundles", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.BASH),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
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
				activePlaceholderWorkflowName: "quick-dev.md",
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
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.BASH)
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.LIST_CODE_DEF)
	})

	it("applies quick-dev step 3 row and keeps document, code-read, Indxr, and local-exec bundles without workflow_progress_request or placeholder-write", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.BASH),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
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
				activePlaceholderWorkflowName: "quick-dev.md",
				activePlaceholderWorkflowStepNumber: 3,
			}),
			registeredTools,
			mcpTools: [
				makeMcpTool("indxr-10mcp0search_relevant"),
				makeMcpTool("indxr-10mcp0read_source"),
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
			ClineDefaultTool.BASH,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST)
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptNames).to.include("indxr-10mcp0search_relevant")
		expect(keptNames).to.include("indxr-10mcp0read_source")
		expect(keptNames).to.include("indxr-10mcp0lookup_symbol")
		expect(keptNames).to.not.include("12345670mcp0test_tool")
	})

	it("applies quick-dev step 4 row and keeps only local-exec among workflow-specific bundles", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.BASH),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
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
				activePlaceholderWorkflowName: "quick-dev.md",
				activePlaceholderWorkflowStepNumber: 4,
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
			ClineDefaultTool.BASH,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST)
		expect(keptIds).to.not.include(ClineDefaultTool.LIST_FILES)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ)
		expect(keptIds).to.not.include(ClineDefaultTool.APPLY_PATCH)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_NEW)
	})

	it("applies quick-dev step 5 row with no workflow-specific native bundles", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.BASH),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
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
				activePlaceholderWorkflowName: "quick-dev.md",
				activePlaceholderWorkflowStepNumber: 5,
			}),
			registeredTools,
			mcpTools: [],
		})

		const keptIds = result.map((tool) => tool.id)
		expect(keptIds).to.include.members([
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.BASH)
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST)
		expect(keptIds).to.not.include(ClineDefaultTool.LIST_FILES)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_READ)
		expect(keptIds).to.not.include(ClineDefaultTool.APPLY_PATCH)
		expect(keptIds).to.not.include(ClineDefaultTool.FILE_NEW)
		expect(keptIds).to.not.include(ClineDefaultTool.LIST_CODE_DEF)
		expect(keptIds).to.not.include(ClineDefaultTool.SEARCH)
	})

	it("applies quick-spec step 9 row and keeps the document, code, Indxr, subagent, and workflow-progress bundles without placeholder-write or local-exec tools", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.USE_SUBAGENTS),
			makeRegisteredTool(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS),
			makeRegisteredTool(ClineDefaultTool.BASH),
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
				activePlaceholderWorkflowName: "quick-spec.md",
				activePlaceholderWorkflowStepNumber: 9,
			}),
			registeredTools,
			mcpTools: [
				makeMcpTool("indxr-10mcp0search_relevant"),
				makeMcpTool("indxr-10mcp0search_signatures"),
				makeMcpTool("indxr-10mcp0get_file_summary"),
				makeMcpTool("indxr-10mcp0read_source"),
				makeMcpTool("indxr-10mcp0lookup_symbol"),
				makeMcpTool("indxr-10mcp0get_public_api"),
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
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			ClineDefaultTool.USE_SUBAGENTS,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.BASH)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
		expect(keptNames).to.include("indxr-10mcp0search_relevant")
		expect(keptNames).to.include("indxr-10mcp0search_signatures")
		expect(keptNames).to.include("indxr-10mcp0get_file_summary")
		expect(keptNames).to.include("indxr-10mcp0read_source")
		expect(keptNames).to.include("indxr-10mcp0lookup_symbol")
		expect(keptNames).to.include("indxr-10mcp0get_public_api")
		expect(keptNames).to.not.include("12345670mcp0test_tool")
	})

	it("applies create-story step 3 row and keeps workflow_progress_request with document, code-read, and Indxr bundles but without subagent coordination", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.USE_SUBAGENTS),
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
				activePlaceholderWorkflowName: "create-story.md",
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
			ClineDefaultTool.LIST_CODE_DEF,
			ClineDefaultTool.FILE_READ,
			ClineDefaultTool.FILE_READ_RANGE,
			ClineDefaultTool.APPLY_PATCH,
			ClineDefaultTool.FILE_NEW,
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.USE_SUBAGENTS)
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.WEB_SEARCH)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
		expect(keptNames).to.include.members([
			"indxr-10mcp0search_relevant",
			"indxr-10mcp0get_file_summary",
			"indxr-10mcp0lookup_symbol",
		])
		expect(keptNames).to.not.include("12345670mcp0test_tool")
	})

	it("applies create-story step 4 row and keeps workflow_progress_request with document, code-read, Indxr, and subagent bundles", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.USE_SUBAGENTS),
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
				activePlaceholderWorkflowName: "create-story.md",
				activePlaceholderWorkflowStepNumber: 4,
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
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			ClineDefaultTool.USE_SUBAGENTS,
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.WEB_SEARCH)
		expect(keptIds).to.not.include(ClineDefaultTool.PLAN_MODE)
		expect(keptNames).to.include.members([
			"indxr-10mcp0search_relevant",
			"indxr-10mcp0get_file_summary",
			"indxr-10mcp0lookup_symbol",
		])
		expect(keptNames).to.not.include("12345670mcp0test_tool")
	})

	it("applies create-story step 5 row and keeps only document read and write bundles", () => {
		const registeredTools = [
			makeRegisteredTool(ClineDefaultTool.LIST_FILES),
			makeRegisteredTool(ClineDefaultTool.SEARCH),
			makeRegisteredTool(ClineDefaultTool.LIST_CODE_DEF),
			makeRegisteredTool(ClineDefaultTool.FILE_READ),
			makeRegisteredTool(ClineDefaultTool.FILE_READ_RANGE),
			makeRegisteredTool(ClineDefaultTool.APPLY_PATCH),
			makeRegisteredTool(ClineDefaultTool.FILE_NEW),
			makeRegisteredTool(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST),
			makeRegisteredTool(ClineDefaultTool.USE_SUBAGENTS),
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
				activePlaceholderWorkflowName: "create-story.md",
				activePlaceholderWorkflowStepNumber: 5,
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
			ClineDefaultTool.ASK,
			ClineDefaultTool.SEND_USER_MESSAGE,
			ClineDefaultTool.ATTEMPT,
			ClineDefaultTool.BROWSER,
			ClineDefaultTool.MCP_ACCESS,
			ClineDefaultTool.NEW_TASK,
		])
		expect(keptIds).to.not.include(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST)
		expect(keptIds).to.not.include(ClineDefaultTool.LIST_CODE_DEF)
		expect(keptIds).to.not.include(ClineDefaultTool.USE_SUBAGENTS)
		expect(keptIds).to.not.include(ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS)
		expect(keptIds).to.not.include(ClineDefaultTool.WEB_SEARCH)
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
