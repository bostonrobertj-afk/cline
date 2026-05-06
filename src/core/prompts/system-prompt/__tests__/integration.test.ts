/**
 * System Prompt Integration Tests with Snapshot Testing
 *
 * This test suite validates that system prompts remain consistent across different
 * model families and context configurations using snapshot testing.
 *
 * Usage:
 * - Run tests normally: `npm run test:unit`
 *   Tests will fail if generated prompts don't match existing snapshots
 *
 * - Update snapshots: `npm run test:unit -- --update-snapshots`
 *   This will regenerate all snapshot files with current prompt output
 *
 * When tests fail:
 * 1. Review the differences shown in the error message
 * 2. Determine if changes are intentional (e.g., prompt improvements)
 * 3. If changes are correct, run with --update-snapshots to update baselines
 * 4. If changes are unintentional, investigate why prompt generation changed
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"
import { expect } from "chai"
import { TaskState } from "@/core/task/TaskState"
import type { ActiveWorkflowSession, WorkflowValues, WorkflowWorkspacePathPolicy } from "@/core/task/workflow-runtime/types"
import { WorkflowRuntime } from "@/core/task/workflow-runtime/WorkflowRuntime"
import type { McpHub } from "@/services/mcp/McpHub"
import type { McpServer } from "@/shared/mcp"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool, type ClineTool } from "@/shared/tools"
import { isGPT5ModelFamily } from "@/utils/model-utils"
import { getSystemPrompt, PromptRegistry } from "../index"
import type { ClineToolSpec } from "../spec"
import type { SystemPromptContext } from "../types"

// ============================================================================
// Configuration
// ============================================================================

const UPDATE_SNAPSHOTS = process.argv.includes("--update-snapshots") || process.env.UPDATE_SNAPSHOTS === "true"
const SNAPSHOTS_DIR = path.join(__dirname, "__snapshots__")
const TEST_TIMEOUT = 30000
const MAX_DIFF_LINES = 10
const STALE_AGENT_FEEDBACK_PROMPT_TEXT =
	"- If you hit a meaningful blocker, material ambiguity, or unstable behavior that affects correctness or progress, include `agent_feedback` on your response tool call with a concise description of the issue."

// ============================================================================
// Snapshot Helpers
// ============================================================================

const formatSnapshotError = (snapshotName: string, details: string): string => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ SNAPSHOT MISMATCH: ${snapshotName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${details}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 To update snapshots: npm run test:unit -- --update-snapshots
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`

const compareStrings = (expected: string, actual: string): string | null => {
	if (expected === actual) {
		return null
	}

	const expectedLines = expected.split("\n")
	const actualLines = actual.split("\n")
	const diffs: string[] = []

	for (let i = 0; i < Math.max(expectedLines.length, actualLines.length) && diffs.length < MAX_DIFF_LINES; i++) {
		const exp = expectedLines[i] || ""
		const act = actualLines[i] || ""
		if (exp !== act) {
			diffs.push(`Line ${i + 1}:`)
			if (exp) {
				diffs.push(`  - Expected: ${exp.substring(0, 100)}${exp.length > 100 ? "..." : ""}`)
			}
			if (act) {
				diffs.push(`  + Actual:   ${act.substring(0, 100)}${act.length > 100 ? "..." : ""}`)
			}
		}
	}

	return [
		`Expected: ${expected.length} chars, ${expectedLines.length} lines`,
		`Actual: ${actual.length} chars, ${actualLines.length} lines`,
		"",
		...diffs,
		diffs.length >= MAX_DIFF_LINES ? "... and more differences" : "",
	].join("\n")
}

async function assertSnapshot(name: string, content: string): Promise<void> {
	const snapshotPath = path.join(SNAPSHOTS_DIR, name)

	if (UPDATE_SNAPSHOTS) {
		await fs.writeFile(snapshotPath, content, "utf-8")
		console.log(`Updated snapshot: ${name} (${content.length} chars)`)
		return
	}

	try {
		const existing = await fs.readFile(snapshotPath, "utf-8")
		const diff = compareStrings(existing, content)
		if (diff) {
			throw new Error(formatSnapshotError(name, diff))
		}
		console.log(`✓ Snapshot matches: ${name}`)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new Error(formatSnapshotError(name, `Snapshot does not exist. Run with --update-snapshots to create it.`))
		}
		throw error
	}
}

function normalizePromptSnapshotSurface(content: string): string {
	const lines = content.split("\n")
	const normalizedLines: string[] = []
	let inResponseToolsSection = false
	let inAccessMcpResourceToolSection = false
	let inVerboseToolSection = false

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		const nextLine = lines[i + 1] ?? ""

		if (
			line.startsWith("## ") &&
			(nextLine.startsWith("Description:") || nextLine.startsWith("Required params:") || nextLine.startsWith("Parameters:"))
		) {
			inVerboseToolSection = true
			continue
		}

		if (inVerboseToolSection) {
			if (
				line.startsWith("## ") &&
				(nextLine.startsWith("Description:") ||
					nextLine.startsWith("Required params:") ||
					nextLine.startsWith("Parameters:"))
			) {
				continue
			}
			if (line.startsWith("# ") || line.startsWith("## ") || line === "====") {
				inVerboseToolSection = false
			} else {
				continue
			}
		}

		if (line === "## access_mcp_resource") {
			inAccessMcpResourceToolSection = true
			continue
		}

		if (inAccessMcpResourceToolSection) {
			if (line.startsWith("## ")) {
				inAccessMcpResourceToolSection = false
			} else {
				continue
			}
		}

		if (line === "RESPONSE TOOLS") {
			inResponseToolsSection = true
			normalizedLines.push(line)
			continue
		}

		if (inResponseToolsSection) {
			if (
				line ===
				"Use these tools to respond to the user. A reply reaches the human user only when you use the appropriate response tool."
			) {
				normalizedLines.push(line)
				continue
			}

			if (line.trim() === "" || line.startsWith("- `") || line.startsWith("In ACT MODE, respond using these:")) {
				continue
			}

			inResponseToolsSection = false
		}

		if (line.startsWith("- ") && !line.includes("`") && !line.startsWith("- [")) {
			normalizedLines.push("- <GUIDANCE>")
			continue
		}

		if (
			!line.startsWith("#") &&
			!line.startsWith("##") &&
			!line.startsWith("```") &&
			!line.startsWith("<") &&
			line.trim().length > 0 &&
			!/^[A-Z0-9 _-]+$/.test(line)
		) {
			normalizedLines.push("<TEXT>")
			continue
		}

		normalizedLines.push(line)
	}

	return normalizedLines.join("\n").replace(/\n{3,}/g, "\n\n")
}

function expectResponseToolNames(prompt: string, expectedNames: string[], absentNames: string[] = []) {
	for (const name of expectedNames) {
		expect(prompt).to.include(name)
	}
	for (const name of absentNames) {
		expect(prompt).to.not.include(name)
	}
}

async function assertNormalizedSnapshot(name: string, content: string, normalizer: (content: string) => string): Promise<void> {
	const snapshotPath = path.join(SNAPSHOTS_DIR, name)

	if (UPDATE_SNAPSHOTS) {
		await fs.writeFile(snapshotPath, content, "utf-8")
		console.log(`Updated snapshot: ${name} (${content.length} chars)`)
		return
	}

	try {
		const existing = await fs.readFile(snapshotPath, "utf-8")
		const diff = compareStrings(normalizer(existing), normalizer(content))
		if (diff) {
			throw new Error(formatSnapshotError(name, diff))
		}
		console.log(`✓ Snapshot matches: ${name}`)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new Error(formatSnapshotError(name, `Snapshot does not exist. Run with --update-snapshots to create it.`))
		}
		throw error
	}
}

// ============================================================================
// Test Context Helpers
// ============================================================================

export const mockProviderInfo = {
	providerId: "test",
	model: { id: "fast", info: { supportsPromptCache: false } },
	mode: "act" as const,
}

const makeProviderInfo = (modelId: string, providerId = "test") => ({
	providerId: modelId.includes("ollama") ? "ollama" : providerId,
	model: { ...mockProviderInfo.model, id: modelId },
	mode: "act" as const,
	customPrompt: providerId.includes("lmstudio") || providerId.includes("ollama") ? "compact" : undefined,
})

type NativeToolEntry = {
	name?: string
	description?: string
}

const makeMcpHub = (servers: McpServer[]): McpHub =>
	({
		getServers: () => servers,
	}) as unknown as McpHub

const makeConnectedServer = (overrides: Partial<McpServer> = {}): McpServer => ({
	uid: "1234567",
	name: "test-server",
	status: "connected",
	config: '{"command": "test"}',
	tools: [{ name: "test_tool", description: "A test tool", inputSchema: { type: "object", properties: {} } }],
	resources: [],
	resourceTemplates: [],
	...overrides,
})

const makeIndxrServer = (overrides: Partial<McpServer> = {}) =>
	makeConnectedServer({
		uid: "indxr-1",
		name: "workspace-index",
		config: '{"command": "indxr"}',
		tools: [
			{ name: "search_relevant", description: "Search relevant code", inputSchema: { type: "object", properties: {} } },
			{ name: "get_file_summary", description: "Summarize file", inputSchema: { type: "object", properties: {} } },
			{ name: "read_source", description: "Read source", inputSchema: { type: "object", properties: {} } },
		],
		...overrides,
	})

const makeWeakIndxrLikeServer = (toolName: string, overrides: Partial<McpServer> = {}) =>
	makeConnectedServer({
		uid: `weak-${toolName}`,
		name: `weak-${toolName}-server`,
		config: '{"command": "generic"}',
		tools: [{ name: toolName, description: `Weak ${toolName}`, inputSchema: { type: "object", properties: {} } }],
		...overrides,
	})

const baseContext: SystemPromptContext = {
	cwd: "/test/project",
	ide: "TestIde",
	supportsBrowserUse: true,
	clineWebToolsEnabled: true,
	subagentsEnabled: true,
	mcpHub: makeMcpHub([makeConnectedServer()]),
	focusChainSettings: { enabled: true, remindClineInterval: 6 },
	browserSettings: { viewport: { width: 1280, height: 720 } },
	globalClineRulesFileInstructions: "Follow global rules",
	localClineRulesFileInstructions: "Follow local rules",
	preferredLanguageInstructions: "Prefer TypeScript",
	isTesting: true,
	providerInfo: mockProviderInfo,
	enableNativeToolCalls: false,
}

const genericWorkflowOverrideToolSpecs: ClineToolSpec[] = [
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.ATTEMPT,
		name: "attempt_completion",
		description: "Attempt completion override",
	},
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.ASK,
		name: "ask_followup_question",
		description: "Ask follow-up override",
	},
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.SEND_USER_MESSAGE,
		name: "send_user_message",
		description: "Send user message override",
	},
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.APPLY_PATCH,
		name: "apply_patch",
		description: "Apply patch override",
	},
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.FILE_READ,
		name: "read_file",
		description: "Read file override",
	},
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.MCP_USE,
		name: "indxr-10mcp0search_relevant",
		description: "workspace-index: Search relevant code",
	},
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.MCP_USE,
		name: "indxr-10mcp0get_file_summary",
		description: "workspace-index: Summarize file",
	},
]

const workflowProgressOnlyToolSpecs: ClineToolSpec[] = [
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
		name: "workflow_progress_request",
		description: "Ask the user to confirm whether the current workflow step is ready to advance.",
	},
]

const workflowBuildDocumentOnlyToolSpecs: ClineToolSpec[] = [
	{
		variant: ModelFamily.GENERIC,
		id: ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
		name: "build_workflow_document",
		description: "Build a workflow document.",
	},
]

const createWorkflowArtifactNativeOnlyToolSpecs: ClineToolSpec[] = [
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
		name: "create_workflow_artifact",
		description: "Create a runtime-allocated workflow artifact.",
		parameters: [
			{
				name: "artifact_id",
				required: true,
				instruction: "Workflow artifact definition id to create.",
				description: "Workflow artifact definition id to create.",
			},
		],
	},
]

const createWorkflowArtifactGenericToolSpecs: ClineToolSpec[] = [
	{
		variant: ModelFamily.GENERIC,
		id: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
		name: "create_workflow_artifact",
		description: "Create a runtime-allocated workflow artifact.",
		parameters: [
			{
				name: "artifact_id",
				required: true,
				instruction: "Workflow artifact definition id to create.",
				description: "Workflow artifact definition id to create.",
			},
		],
	},
]

const getNativeToolEntry = (tool: ClineTool): NativeToolEntry => {
	if ("type" in tool && tool.type === "function") {
		return {
			name: tool.function?.name,
			description: tool.function?.description,
		}
	}

	if ("name" in tool && typeof tool.name === "string") {
		return {
			name: tool.name,
			description: "description" in tool && typeof tool.description === "string" ? tool.description : undefined,
		}
	}

	return {}
}

const getNativeToolEntries = (tools: ClineTool[] | undefined): NativeToolEntry[] => (tools ?? []).map(getNativeToolEntry)

const getNativeToolNames = (tools: ClineTool[] | undefined): string[] =>
	getNativeToolEntries(tools).flatMap((tool) => (tool.name ? [tool.name] : []))

const createBrainstormingWorkflowSession = (input: {
	activeStepNumber: 3 | 4
	workflowValues: WorkflowValues
}): ActiveWorkflowSession => ({
	activeStepNumber: input.activeStepNumber,
	workflowValues: input.workflowValues,
	projectSelection: {
		projectMode: "new",
		projectTitle: "Brainstorming Session",
		projectFolderName: "brainstorming-session",
	},
	ui: {
		suppressedWorkflowFormIds: [],
		suppressedWorkflowStepResolutionRoutes: [],
	},
	branchContext: {
		activeBranchId: `step-${input.activeStepNumber}`,
	},
})

const buildBrainstormingPromptContext = async (input: {
	activeStepNumber: 3 | 4
	workflowValues: WorkflowValues
}): Promise<SystemPromptContext> => {
	const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
		validateAccess: () => true,
	}
	const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })
	const taskState = new TaskState()
	taskState.activeWorkflowName = "brainstorming"
	taskState.activeWorkflowSession = createBrainstormingWorkflowSession(input)
	taskState.apiRequestCount = 1
	const workflowProjection = await runtime.buildTurnProjection({ taskState })

	return {
		...baseContext,
		mcpHub: makeMcpHub([]),
		providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
		enableNativeToolCalls: true,
		useMinimalGptPrompt: true,
		...workflowProjection,
	}
}

const isNativeToolsFamily = (family: ModelFamily) =>
	[ModelFamily.NATIVE_NEXT_GEN, ModelFamily.NATIVE_GPT_5, ModelFamily.NATIVE_GPT_5_1, ModelFamily.GEMINI_3].includes(family)

type TestRunner = Mocha.Context & { skip(): void; timeout(ms: number): void }

async function runPromptTest(
	testCtx: TestRunner,
	context: SystemPromptContext,
	modelId: string,
	handler: (result: Awaited<ReturnType<typeof getSystemPrompt>>) => Promise<void>,
): Promise<void> {
	testCtx.timeout(TEST_TIMEOUT)
	try {
		const result = await getSystemPrompt(context)
		await handler(result)
	} catch (error) {
		if (error instanceof Error && error.message.includes("No prompt variant found")) {
			console.log(`Skipping ${modelId} - no variant available (expected)`)
			testCtx.skip()
		} else {
			throw error
		}
	}
}

// ============================================================================
// Test Data
// ============================================================================

const contextVariations: Array<{ name: string; override: Partial<SystemPromptContext> }> = [
	{ name: "basic", override: {} },
	{ name: "no-browser", override: { supportsBrowserUse: false } },
	{ name: "no-mcp", override: { mcpHub: { getServers: () => [] } as unknown as McpHub } },
	{ name: "no-focus-chain", override: { focusChainSettings: { enabled: false, remindClineInterval: 0 } } },
]

const modelTestCases = [
	{ family: ModelFamily.GENERIC, modelId: "gpt-3", providerId: "openai" },
	{ family: ModelFamily.GLM, modelId: "glm-4.6", providerId: "zai" },
	{ family: ModelFamily.HERMES, modelId: "hermes-4", providerId: "test" },
	{ family: ModelFamily.DEVSTRAL, modelId: "devstral", providerId: "cline" },
	{ family: ModelFamily.NEXT_GEN, modelId: "claude-sonnet-4", providerId: "anthropic" },
	{ family: ModelFamily.XS, modelId: "qwen3_coder", providerId: "lmstudio" },
	{ family: ModelFamily.NATIVE_NEXT_GEN, modelId: "claude-4-5-sonnet", providerId: "cline" },
	{ family: ModelFamily.GPT_5, modelId: "gpt-5", providerId: "openai" },
	{ family: ModelFamily.NATIVE_GPT_5, modelId: "gpt-5-codex", providerId: "openai" },
	{ family: ModelFamily.NATIVE_GPT_5_1, modelId: "gpt-5-1", providerId: "openai" },
	{ family: ModelFamily.GEMINI_3, modelId: "gemini-3", providerId: "vertex" },
	{ family: ModelFamily.TRINITY, modelId: "arcee-ai/trinity-large-preview", providerId: "openrouter" },
]
const gemini3ModelTestCases = modelTestCases.filter(({ family }) => family === ModelFamily.GEMINI_3)

// ============================================================================
// Tests
// ============================================================================

describe("Prompt System Integration Tests", () => {
	before(async () => {
		console.log(UPDATE_SNAPSHOTS ? "🔄 SNAPSHOT UPDATE MODE" : "✅ SNAPSHOT TEST MODE")
		await fs.mkdir(SNAPSHOTS_DIR, { recursive: true }).catch(() => {})
	})

	describe("Snapshot Testing", () => {
		for (const { family, modelId, providerId } of modelTestCases) {
			describe(`${family} Model Group`, () => {
				const enableNativeToolCalls = isNativeToolsFamily(family)

				it(`should generate consistent native tools object when enabled`, async function () {
					const context: SystemPromptContext = {
						...baseContext,
						providerInfo: makeProviderInfo(modelId, providerId),
						enableNativeToolCalls,
						useMinimalGptPrompt: isGPT5ModelFamily(modelId),
					}

					await runPromptTest(this, context, modelId, async ({ tools }) => {
						if (!enableNativeToolCalls) {
							expect(tools).to.be.undefined
							return
						}

						expect(tools).to.be.an("array").that.is.not.empty
						const toolNames = getNativeToolNames(tools)
						expect(toolNames).to.not.include("focus_chain")
						expect(JSON.stringify(tools)).to.not.include('"focus_chain"')
						expect(toolNames).to.not.include("build_workflow_document")
						expect(toolNames).to.not.include("create_workflow_artifact")
						const snapshotName = `${providerId}_${family.replace(/[^a-zA-Z0-9]/g, "_")}.tools.snap`
						await assertSnapshot(snapshotName, JSON.stringify(tools, null, 2))
					})
				})

				for (const { name: contextName, override } of contextVariations) {
					it(`should generate consistent prompt for ${providerId}/${modelId} with ${contextName} context`, async function () {
						const context: SystemPromptContext = {
							...baseContext,
							...override,
							providerInfo: makeProviderInfo(modelId, providerId),
							enableNativeToolCalls,
							useMinimalGptPrompt: isGPT5ModelFamily(modelId),
						}

						await runPromptTest(this, context, modelId, async ({ systemPrompt, tools }) => {
							if (enableNativeToolCalls) {
								expect(tools).to.be.an("array").that.is.not.empty
								const toolNames = getNativeToolNames(tools)
								expect(toolNames).to.not.include("focus_chain")
								expect(toolNames).to.not.include("build_workflow_document")
								expect(toolNames).to.not.include("create_workflow_artifact")
							} else {
								expect(tools).to.be.undefined
							}

							expect(systemPrompt).to.be.a("string").with.length.greaterThan(100)
							expect(systemPrompt).to.not.include("{{TOOL_USE_SECTION}}")
							expect(systemPrompt).to.not.include("create_workflow_artifact")

							const snapshotName = `${providerId}_${modelId.replace(/[^a-zA-Z0-9]/g, "_")}-${contextName}.snap`
							await assertNormalizedSnapshot(snapshotName, systemPrompt, normalizePromptSnapshotSurface)
						})
					})
				}
			})
		}

		describe("Gemini 3 Specific", () => {
			for (const { family, modelId, providerId } of gemini3ModelTestCases) {
				const enableNativeToolCalls = isNativeToolsFamily(family)
				it(`should include parallel tool-calling guidance for ${providerId}/${modelId} when enabled`, async function () {
					const context: SystemPromptContext = {
						...baseContext,
						providerInfo: makeProviderInfo(modelId, providerId),
						enableNativeToolCalls,
						enableParallelToolCalling: true,
					}

					await runPromptTest(this, context, modelId, async ({ systemPrompt }) => {
						expect(systemPrompt).to.include(
							"- When multiple operations are independent (for example reading several files or searching in multiple directories), call multiple tools in a single response rather than one at a time.",
						)
						const snapshotName = `${providerId}_${modelId.replace(/[^a-zA-Z0-9]/g, "_")}-parallel-tools.snap`
						await assertNormalizedSnapshot(snapshotName, systemPrompt, normalizePromptSnapshotSurface)
					})
				})
			}
		})
	})

	describe("Continuation Turn Prompt", () => {
		it("generates a basic ACT-mode continuation prompt", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "act" },
					isContinuationTurn: true,
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.not.include("TOOL USE")
					expect(systemPrompt).to.not.include("RULES")
					expect(systemPrompt).to.not.include("CAPABILITIES")
					expectResponseToolNames(systemPrompt, [
						"`attempt_completion`",
						"`ask_followup_question`",
						"`send_user_message`",
					])
					expect(systemPrompt).to.not.include("CURRENT TASK LIST")
				},
			)
		})

		it("omits stale agent_feedback guidance in continuation-turn prompts", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "act" },
					isContinuationTurn: true,
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include(STALE_AGENT_FEEDBACK_PROMPT_TEXT)
				},
			)
		})

		it("generates an ACT-mode continuation prompt with Indxr and checklist", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "act" },
					mcpHub: makeMcpHub([makeIndxrServer()]),
					isContinuationTurn: true,
					currentFocusChainChecklist: "- Review diff\n- Update tests",
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.not.include("TOOL USE")
					expect(systemPrompt).to.not.include("RULES")
					expect(systemPrompt).to.not.include("CAPABILITIES")
					expect(systemPrompt).to.not.include("CURRENT TASK LIST")
					expect(systemPrompt).to.include("`search_relevant`")
					expectResponseToolNames(systemPrompt, [
						"`attempt_completion`",
						"`ask_followup_question`",
						"`send_user_message`",
					])
				},
			)
		})

		it("renders workflow_progress_request in generic native GPT-5.1 continuation response guidance when visible", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					isContinuationTurn: true,
					enableNativeToolCalls: true,
					visibleNativeToolNames: [
						"attempt_completion",
						"ask_followup_question",
						"workflow_progress_request",
						"send_user_message",
					],
				},
				"gpt-5-1",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.include("workflow_progress_request")
					expect(systemPrompt).to.include("attempt_completion")
					expect(systemPrompt).to.include("ask_followup_question")
					expect(systemPrompt).to.include("send_user_message")
				},
			)
		})

		it("omits workflow_progress_request in generic native GPT-5.1 continuation prompts when it is not visible", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					isContinuationTurn: true,
					enableNativeToolCalls: true,
					visibleNativeToolNames: ["attempt_completion", "ask_followup_question", "send_user_message"],
				},
				"gpt-5-1",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.not.include("workflow_progress_request")
					expect(systemPrompt).to.include("attempt_completion")
					expect(systemPrompt).to.include("ask_followup_question")
					expect(systemPrompt).to.include("send_user_message")
				},
			)
		})
	})

	describe("Context-Specific Features", () => {
		const featureTests = [
			{ name: "browser-specific content when browser is enabled", context: { supportsBrowserUse: true }, check: "browser" },
			{ name: "MCP content when MCP servers are present", context: {}, check: "MCP" },
			{ name: "user instructions when provided", context: {}, check: "USER'S CUSTOM INSTRUCTIONS" },
		]

		for (const { name, context, check } of featureTests) {
			it(`should include ${name}`, async function () {
				await runPromptTest(this, { ...baseContext, ...context }, "default", async ({ systemPrompt }) => {
					expect(systemPrompt.toLowerCase()).to.include(check.toLowerCase())
				})
			})
		}

		it("keeps native GPT-5 minimal prompts on the concise variant-specific tool section", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
				},
				"gpt-5-codex",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("TOOL USE")
					expect(systemPrompt).to.not.include("task_progress")
					expect(systemPrompt).to.include("RESPONSE TOOLS")
					expectResponseToolNames(
						systemPrompt,
						["`attempt_completion`", "`ask_followup_question`", "`send_user_message`"],
						["`generate_plan_output`"],
					)
					expect(systemPrompt).to.not.include("In ACT MODE, respond using these:")
					expect(systemPrompt).to.not.include("# Tools")
					expect(systemPrompt).to.not.include("## execute_command")
				},
			)
		})

		it("omits the textual MCP section for native GPT-5 OpenAI prompts when only generic MCP servers are connected", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include("MCP SERVERS")
					expect(systemPrompt).to.not.include("## test-server (`test`)")
					expect(systemPrompt).to.not.include("Indxr-Aware Exploration")
				},
			)
		})

		it("omits Indxr guidance in native GPT-5.1 prompts when no visible Indxr tools survive filtering", async function () {
			this.timeout(TEST_TIMEOUT)

			const systemPrompt = await PromptRegistry.getInstance().get({
				...baseContext,
				mcpHub: makeMcpHub([makeIndxrServer()]),
				providerInfo: makeProviderInfo("gpt-5-1", "openai"),
				enableNativeToolCalls: true,
				visibleNativeToolNames: [],
			})

			expect(systemPrompt).to.not.include("Indxr-Aware Exploration")
			expect(systemPrompt).to.not.include("`search_relevant`")
		})

		it("names only the caller-supplied visible Indxr subset in native GPT-5.1 prompts", async function () {
			this.timeout(TEST_TIMEOUT)

			const systemPrompt = await PromptRegistry.getInstance().get({
				...baseContext,
				mcpHub: makeMcpHub([makeIndxrServer()]),
				providerInfo: makeProviderInfo("gpt-5-1", "openai"),
				enableNativeToolCalls: true,
				visibleNativeToolNames: ["indxr-10mcp0search_relevant"],
			})

			expect(systemPrompt).to.include("`search_relevant`")
			expect(systemPrompt).to.not.include("`get_file_summary`")
		})

		it("filters native tools through a generic workflow override schema in native GPT-5.1 prompts", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					mcpHub: makeMcpHub([
						makeIndxrServer({
							tools: [
								{
									name: "search_relevant",
									description: "Search relevant code",
									inputSchema: { type: "object", properties: {} },
								},
								{
									name: "get_file_summary",
									description: "Summarize file",
									inputSchema: { type: "object", properties: {} },
								},
								{
									name: "lookup_symbol",
									description: "Lookup symbol",
									inputSchema: { type: "object", properties: {} },
								},
							],
						}),
					]),
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: genericWorkflowOverrideToolSpecs,
				},
				"gpt-5-1",
				async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.deep.equal([
						"attempt_completion",
						"ask_followup_question",
						"send_user_message",
						"apply_patch",
						"read_file",
						"indxr-10mcp0search_relevant",
						"indxr-10mcp0get_file_summary",
					])
					expect(nativeToolNames).to.not.include("access_mcp_resource")
					expect(nativeToolNames).to.not.include("indxr-10mcp0lookup_symbol")
					expect(nativeToolNames).to.not.include("workflow_progress_request")
					expect(nativeToolNames).to.not.include("search_files")
					expect(nativeToolNames).to.not.include("build_review_input")
					expect(nativeToolNames).to.not.include("generate_plan_output")
				},
			)
		})

		it("renders response tools from workflow-projected native tool schema overrides", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: genericWorkflowOverrideToolSpecs,
				},
				"gpt-5-1",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("RESPONSE TOOLS")
					expectResponseToolNames(
						systemPrompt,
						["`attempt_completion`", "`ask_followup_question`", "`send_user_message`"],
						["`generate_plan_output`", "`workflow_progress_request`"],
					)
				},
			)
		})

		it("uses the workflow-projected schema as the exact native tool surface", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: workflowProgressOnlyToolSpecs,
				},
				"gpt-5-1",
				async ({ tools }) => {
					expect(getNativeToolNames(tools)).to.deep.equal(["workflow_progress_request"])
				},
			)
		})

		it("renders native workflow-projected workflow progress request guidance without default response tools", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: workflowProgressOnlyToolSpecs,
				},
				"gpt-5-1",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("RESPONSE TOOLS")
					expectResponseToolNames(
						systemPrompt,
						["`workflow_progress_request`"],
						["`attempt_completion`", "`ask_followup_question`", "`send_user_message`", "`generate_plan_output`"],
					)
				},
			)
		})

		it("omits default ACT response guidance from non-native workflow overrides without response tools", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-3", "openai"),
					enableNativeToolCalls: false,
					workflowToolSchemaOverride: workflowBuildDocumentOnlyToolSpecs,
				},
				"gpt-3",
				async ({ systemPrompt, tools }) => {
					expect(tools).to.be.undefined
					expect(systemPrompt).to.include("build_workflow_document")
					expect(systemPrompt).to.not.include("RESPONSE TOOLS")
					expectResponseToolNames(
						systemPrompt,
						[],
						[
							"`attempt_completion`",
							"`ask_followup_question`",
							"`send_user_message`",
							"`act_mode_respond`",
							"`generate_plan_output`",
						],
					)
				},
			)
		})

		it("omits invalid continuation response guidance for workflow overrides without response tools", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					isContinuationTurn: true,
					workflowToolSchemaOverride: workflowBuildDocumentOnlyToolSpecs,
				},
				"gpt-5-1",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.not.include("RESPONSE TOOLS")
					expect(systemPrompt).to.not.include("undefined")
					expect(systemPrompt).to.not.include("and undefined")
				},
			)
		})

		it("projects active brainstorming Step 3 suggest tools into native GPT-5 prompts", async function () {
			const context = await buildBrainstormingPromptContext({
				activeStepNumber: 3,
				workflowValues: {
					selected_approach: "I want you to suggest a technique",
					output_file: "/test/project/discovery/brainstorming.md",
				},
			})

			await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt, tools }) => {
				const nativeToolNames = getNativeToolNames(tools)
				const approvedStep3ToolNames = [
					"get_brainstorming_methods",
					"append_brainstorming_selected_technique",
					"read_file",
					"apply_patch",
					"send_user_message",
					"ask_followup_question",
					"workflow_progress_request",
				]

				expect(nativeToolNames).to.deep.equal(approvedStep3ToolNames)
				expect(nativeToolNames).to.not.include("build_workflow_document")
				expect(nativeToolNames).to.not.include("set_workflow_values")
				expect(systemPrompt).to.not.include("Workflow: brainstorming")
				expect(systemPrompt).to.not.include("Call `get_brainstorming_methods`")
				expect(systemPrompt).to.not.include("call `append_brainstorming_selected_technique`")
			})
		})

		it("projects active brainstorming Step 3 choose and random tools into native GPT-5 prompts", async function () {
			const selectedApproaches = ["I want to choose", "I want a random technique"] as const
			const approvedStep3ToolNames = [
				"get_brainstorming_methods",
				"append_brainstorming_selected_technique",
				"read_file",
				"apply_patch",
				"send_user_message",
				"ask_followup_question",
				"workflow_progress_request",
			]

			for (const selectedApproach of selectedApproaches) {
				const context = await buildBrainstormingPromptContext({
					activeStepNumber: 3,
					workflowValues: {
						selected_approach: selectedApproach,
						output_file: "/test/project/discovery/brainstorming.md",
					},
				})

				await runPromptTest(this, context, "gpt-5-codex", async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.deep.equal(approvedStep3ToolNames)
					expect(nativeToolNames).to.not.include("build_workflow_document")
					expect(nativeToolNames).to.not.include("set_workflow_values")
				})
			}
		})

		it("projects active brainstorming Step 4 completion tools without workflow progress requests", async function () {
			const context = await buildBrainstormingPromptContext({
				activeStepNumber: 4,
				workflowValues: {
					output_file: "/test/project/discovery/brainstorming.md",
				},
			})

			await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt, tools }) => {
				const nativeToolNames = getNativeToolNames(tools)

				expect(nativeToolNames).to.deep.equal([
					"read_file",
					"apply_patch",
					"send_user_message",
					"ask_followup_question",
					"attempt_completion",
				])
				expect(nativeToolNames).to.not.include("build_workflow_document")
				expect(nativeToolNames).to.not.include("set_workflow_values")
				expect(nativeToolNames).to.not.include("workflow_progress_request")
				expect(systemPrompt).to.not.include("Workflow: brainstorming")
				expect(systemPrompt).to.not.include("using `attempt_completion`")
				expect(systemPrompt).to.not.include("workflow_progress_request")
			})
		})

		it("projects create_workflow_artifact only through workflow override schemas", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: createWorkflowArtifactNativeOnlyToolSpecs,
				},
				"gpt-5-1",
				async ({ tools }) => {
					expect(getNativeToolNames(tools)).to.deep.equal(["create_workflow_artifact"])
				},
			)

			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-3", "openai"),
					enableNativeToolCalls: false,
					workflowToolSchemaOverride: createWorkflowArtifactGenericToolSpecs,
				},
				"gpt-3",
				async ({ systemPrompt, tools }) => {
					expect(tools).to.be.undefined
					expect(systemPrompt).to.include("create_workflow_artifact")
					expect(systemPrompt).to.include("artifact_id")
				},
			)
		})

		it("shows only the generic visible Indxr guidance exposed by a workflow override schema in native GPT-5.1 prompts", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					mcpHub: makeMcpHub([
						makeIndxrServer({
							tools: [
								{
									name: "search_relevant",
									description: "Search relevant code",
									inputSchema: { type: "object", properties: {} },
								},
								{
									name: "get_file_summary",
									description: "Summarize file",
									inputSchema: { type: "object", properties: {} },
								},
								{
									name: "lookup_symbol",
									description: "Lookup symbol",
									inputSchema: { type: "object", properties: {} },
								},
							],
						}),
					]),
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: genericWorkflowOverrideToolSpecs,
				},
				"gpt-5-1",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include("Indxr-Aware Exploration")
					expect(systemPrompt).to.not.include("search_relevant")
					expect(systemPrompt).to.not.include("get_file_summary")
					expect(systemPrompt).to.not.include("lookup_symbol")
				},
			)
		})

		it("does not add Indxr-aware guidance for a single weak matching tool", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					mcpHub: makeMcpHub([makeWeakIndxrLikeServer("read_source")]),
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt, tools }) => {
					expect(systemPrompt).to.not.include("## weak-read_source-server (`generic`)")
					expect(systemPrompt).to.include("Indxr-Aware Exploration")
					expect(systemPrompt).to.include("`read_source`")
					expect(systemPrompt).to.not.include("`search_relevant`")

					const nativeTools = getNativeToolEntries(tools)
					const byName = new Map(nativeTools.map((tool) => [tool.name, tool.description]))

					expect(byName.get("search_files")).to.equal(
						"Request to perform a regex search across files in a specified directory, providing context-rich results.",
					)
				},
			)
		})

		it("keeps dedicated subagent Indxr guidance separate from the main MCP prompt guidance", async () => {
			const context: SystemPromptContext = {
				...baseContext,
				mcpHub: makeMcpHub([makeIndxrServer()]),
			}

			const result = await getSystemPrompt(context)
			expect(result.systemPrompt).to.contain("`search_relevant`")
			expect(result.systemPrompt).to.not.contain("# Indxr-Aware Exploration")
		})

		it("teaches the governed response-tool contract in the active prompt guidance", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-3", "openai"),
					enableNativeToolCalls: false,
				},
				"gpt-3",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("RESPONSE TOOLS")
					expectResponseToolNames(
						systemPrompt,
						["`attempt_completion`", "`send_user_message`", "`ask_followup_question`"],
						["`generate_plan_output`"],
					)
					expect(systemPrompt).to.not.include("In ACT MODE, respond using these:")
				},
			)
		})

		it("omits stale agent_feedback guidance in a normal tool-use prompt", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-3", "openai"),
					enableNativeToolCalls: false,
				},
				"gpt-3",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include(STALE_AGENT_FEEDBACK_PROMPT_TEXT)
				},
			)
		})

		it("omits stale agent_feedback guidance in the GPT-5 tool-use prompt", async function () {
			this.timeout(TEST_TIMEOUT)

			const systemPrompt = await PromptRegistry.getInstance().get({
				...baseContext,
				providerInfo: makeProviderInfo("gpt-5", "openai"),
				enableNativeToolCalls: false,
			})

			expect(systemPrompt).to.not.include(STALE_AGENT_FEEDBACK_PROMPT_TEXT)
		})

		it("omits stale agent_feedback guidance in the Hermes tool-use prompt", async function () {
			this.timeout(TEST_TIMEOUT)

			const systemPrompt = await PromptRegistry.getInstance().get({
				...baseContext,
				providerInfo: makeProviderInfo("hermes-4", "test"),
				enableNativeToolCalls: false,
			})

			expect(systemPrompt).to.not.include(STALE_AGENT_FEEDBACK_PROMPT_TEXT)
		})

		it("keeps native response-tool specs aligned with the shared response-tool contract", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
				},
				"gpt-5-1",
				async ({ tools, systemPrompt }) => {
					expect(systemPrompt).to.include("RESPONSE TOOLS")

					const nativeTools = getNativeToolEntries(tools)
					const byName = new Map(nativeTools.map((tool) => [tool.name, tool.description]))

					expect(byName.has("act_mode_respond")).to.equal(true)
					expect(byName.has("attempt_completion")).to.equal(true)
					expect(byName.has("generate_plan_output")).to.equal(false)
					expect(byName.get("attempt_completion")).to.be.a("string").and.not.empty
					expect(byName.get("send_user_message")).to.be.a("string").and.not.empty
					expect(byName.get("ask_followup_question")).to.be.a("string").and.not.empty
					expect(byName.get("act_mode_respond")).to.be.a("string").and.not.empty
				},
			)
		})

		it("filters native response-tool specs for PLAN mode", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...makeProviderInfo("gpt-5-1", "openai"), mode: "plan" },
					enableNativeToolCalls: true,
				},
				"gpt-5-1",
				async ({ tools }) => {
					const nativeTools = getNativeToolEntries(tools)
					const byName = new Map(nativeTools.map((tool) => [tool.name, tool.description]))

					expect(byName.has("generate_plan_output")).to.equal(true)
					expect(byName.has("attempt_completion")).to.equal(false)
					expect(byName.has("act_mode_respond")).to.equal(false)
					expect(byName.has("ask_followup_question")).to.equal(true)
					expect(byName.has("send_user_message")).to.equal(true)
				},
			)
		})
		it("omits workflow placeholder output from full prompts while applying workflow tool overrides", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: workflowProgressOnlyToolSpecs,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt, tools }) => {
					expect(getNativeToolNames(tools)).to.deep.equal(["workflow_progress_request"])
					expect(systemPrompt).to.not.include("{{WORKFLOW")
					expect(systemPrompt).to.not.include("## WORKFLOW")
					expect(systemPrompt).to.not.include("# CURRENT WORKFLOW STEP")
				},
			)
		})

		it("omits workflow placeholder output from continuation prompts", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					isContinuationTurn: true,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.not.include("{{WORKFLOW")
					expect(systemPrompt).to.not.include("## WORKFLOW")
					expect(systemPrompt).to.not.include("# CURRENT WORKFLOW STEP")
				},
			)
		})

		it("omits the disabled skills section in non-agent prompts even when skills are provided", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					skills: [
						{
							name: "generic-skill",
							description: "Generic skill",
							path: "/skills/generic-skill/SKILL.md",
							source: "global",
						},
						{
							name: "generic-persona",
							description: "Generic persona",
							path: "/skills/generic-persona/SKILL.md",
							source: "project",
						},
					],
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include("Installed skills and workflow activations available on this turn")
					expect(systemPrompt).to.not.include("\nSKILLS\n")
					expect(systemPrompt).to.not.include("generic-persona")
				},
			)
		})
	})

	describe("Error Handling", () => {
		it("should handle completely invalid context gracefully", async function () {
			this.timeout(TEST_TIMEOUT)
			const { systemPrompt } = await getSystemPrompt({} as SystemPromptContext)
			expect(systemPrompt).to.be.a("string")
		})

		it("should handle undefined context properties", async function () {
			this.timeout(TEST_TIMEOUT)
			const contextWithNulls: SystemPromptContext = {
				cwd: undefined,
				ide: "",
				supportsBrowserUse: undefined,
				mcpHub: undefined,
				focusChainSettings: undefined,
				providerInfo: mockProviderInfo,
			}

			try {
				const { systemPrompt } = await getSystemPrompt(contextWithNulls)
				expect(systemPrompt).to.be.a("string")
				expect(systemPrompt).to.include("{{TOOL_USE_SECTION}}")
			} catch (error) {
				expect(error).to.be.instanceOf(Error)
			}
		})
	})
})
