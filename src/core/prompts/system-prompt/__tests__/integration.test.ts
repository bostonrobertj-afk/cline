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
import type { McpHub } from "@/services/mcp/McpHub"
import type { McpServer } from "@/shared/mcp"
import { ModelFamily } from "@/shared/prompts"
import type { ClineTool } from "@/shared/tools"
import { isGPT5ModelFamily } from "@/utils/model-utils"
import { getSystemPrompt, PromptRegistry } from "../index"
import { resolveWorkflowPersonaInstructions } from "../registry/workflowPersonaRegistry"
import type { SystemPromptContext } from "../types"
import { AGENT_FEEDBACK_PROMPT_GUIDANCE } from "../types"

// ============================================================================
// Configuration
// ============================================================================

const UPDATE_SNAPSHOTS = process.argv.includes("--update-snapshots") || process.env.UPDATE_SNAPSHOTS === "true"
const SNAPSHOTS_DIR = path.join(__dirname, "__snapshots__")
const TEST_TIMEOUT = 30000
const MAX_DIFF_LINES = 10

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

		if (line === AGENT_FEEDBACK_PROMPT_GUIDANCE) {
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

		if (line.includes("When a step sets a placeholder value, use `set_workflow_placeholders`.")) {
			continue
		}

		if (
			line === "When switching domains or task_progress steps, you may want to provide a brief preamble explaining:" ||
			line === "When switching domains or major phases of work, you may want to provide a brief preamble explaining:"
		) {
			normalizedLines.push(
				"When switching domains or major phases of work, you may want to provide a brief preamble explaining:",
			)
			continue
		}

		if (
			line ===
				'Format: "Now that we have [very brief summary of last task_progress items that was completed], I will use [ToolName] to [specific action/goal]"' ||
			line ===
				'Format: "Now that we have [very brief summary of the last completed phase], I will use [ToolName] to [specific action/goal]"'
		) {
			normalizedLines.push(
				'Format: "Now that we have [very brief summary of the last completed phase], I will use [ToolName] to [specific action/goal]"',
			)
			continue
		}

		if (
			line === "- Use `__COMPLETE_NEXT_STEP__` as the `task_progress` value to complete the next incomplete step." ||
			line ===
				'- When you complete the next step, use the next relevant `send_user_message` tool call to briefly tell the user what you finished and include `task_progress: "__COMPLETE_NEXT_STEP__"` on that same tool call.'
		) {
			normalizedLines.push(
				"- Use `__COMPLETE_NEXT_STEP__` as the `task_progress` value to complete the next incomplete step.",
			)
			continue
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

const getNativeFunctionTool = (tools: ClineTool[] | undefined, name: string) =>
	getNativeToolEntries(tools).find((tool) => tool.name === name)

const getNativeFunctionDescription = (tools: ClineTool[] | undefined, name: string): string =>
	getNativeFunctionTool(tools, name)?.description ?? ""

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
						expect(toolNames).to.include("build_review_diff_output")
						expect(toolNames).to.include("build_review_input")
						expect(toolNames).to.include("build_epics_document")
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
								expect(toolNames).to.include("build_review_diff_output")
								expect(toolNames).to.include("build_review_input")
								expect(toolNames).to.include("build_epics_document")
							} else {
								expect(tools).to.be.undefined
							}

							expect(systemPrompt).to.be.a("string").with.length.greaterThan(100)
							expect(systemPrompt).to.not.include("{{TOOL_USE_SECTION}}")

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

		it("includes the shared agent_feedback guidance in continuation-turn prompts", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "act" },
					isContinuationTurn: true,
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include(AGENT_FEEDBACK_PROMPT_GUIDANCE)
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
					activeWorkflowSupportsPlaceholders: false,
					managedWorkflowActive: false,
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.not.include("TOOL USE")
					expect(systemPrompt).to.not.include("RULES")
					expect(systemPrompt).to.not.include("CAPABILITIES")
					expect(systemPrompt).to.include("CURRENT TASK LIST")
					expect(systemPrompt).to.include("```text")
					expect(systemPrompt).to.include("Review diff")
					expect(systemPrompt).to.include("Update tests")
					expect(systemPrompt).to.include("`search_relevant`")
					expectResponseToolNames(systemPrompt, [
						"`attempt_completion`",
						"`ask_followup_question`",
						"`send_user_message`",
					])
				},
			)
		})

		it("uses direct-material-first Indxr guidance in continuation prompts for review-edge-case-hunter step 2", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "act" },
					mcpHub: makeMcpHub([makeIndxrServer()]),
					isContinuationTurn: true,
					currentFocusChainChecklist: "- Inspect changed file",
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "review-edge-case-hunter.md",
					activePlaceholderWorkflowStepNumber: 2,
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("primary review boundary")
					expect(systemPrompt).to.include("`search_relevant`")
					expect(systemPrompt).to.not.include(
						"before built-in `search_files`, `list_code_definition_names`, `read_file`, or `read_file_range` whenever feasible",
					)
				},
			)
		})

		it("generates a PLAN-mode continuation prompt with multi-root and placeholder workflow", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "plan" },
					isContinuationTurn: true,
					isMultiRootEnabled: true,
					currentFocusChainChecklist: "- Inspect task state\n- Apply patch",
					activeWorkflowSupportsPlaceholders: true,
					activePlaceholderWorkflowName: "code-review.md",
					activePlaceholderWorkflowStepNumber: 1,
					managedWorkflowActive: false,
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.not.include("TOOL USE")
					expect(systemPrompt).to.not.include("RULES")
					expect(systemPrompt).to.not.include("CAPABILITIES")
					expect(systemPrompt).to.not.include("CURRENT TASK LIST")
					expect(systemPrompt).to.not.include("Inspect task state")
					expect(systemPrompt).to.not.include("Apply patch")
					expect(systemPrompt).to.include("task_progress")
					expect(systemPrompt).to.include("__COMPLETE_NEXT_STEP__")
					expectResponseToolNames(systemPrompt, [
						"`generate_plan_output`",
						"`ask_followup_question`",
						"`send_user_message`",
					])
				},
			)
		})

		it("generates a continuation prompt for create-prd step 3 with workflow_progress_request guidance", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "act" },
					isContinuationTurn: true,
					currentFocusChainChecklist: "- [ ] Step 3: Discover and classify the project",
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "create-prd.md",
					activePlaceholderWorkflowStepNumber: 3,
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("workflow_progress_request")
					expect(systemPrompt).to.include("Do not include `task_progress`")
					expect(systemPrompt).to.include(
						"runtime-owned `Yes` branch completes the next checklist step before the next model request is built",
					)
					expect(systemPrompt).to.not.include(
						"use `send_user_message` tool call to briefly tell the user what step you are completing",
					)
				},
			)
		})

		it("generates a continuation prompt for create-epics step 3 with workflow_progress_request guidance", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "act" },
					isContinuationTurn: true,
					currentFocusChainChecklist: "- [ ] Step 3: Define the Epics",
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "create-epics.md",
					activePlaceholderWorkflowStepNumber: 3,
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("workflow_progress_request")
					expect(systemPrompt).to.include("Do not include `task_progress`")
					expect(systemPrompt).to.include(
						"runtime-owned `Yes` branch completes the next checklist step before the next model request is built",
					)
					expect(systemPrompt).to.not.include(
						"use `send_user_message` tool call to briefly tell the user what step you are completing",
					)
				},
			)
		})

		it("generates a continuation prompt for pi-planning step 4 with workflow_progress_request guidance", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "act" },
					isContinuationTurn: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "pi-planning.md",
					activePlaceholderWorkflowStepNumber: 4,
					currentFocusChainChecklist: "- [ ] Step 4: Align on planning expectations",
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("workflow_progress_request")
					expect(systemPrompt).to.include("Do not include `task_progress`")
					expect(systemPrompt).to.include(
						"runtime-owned `Yes` branch completes the next checklist step before the next model request is built",
					)
					expect(systemPrompt).to.not.include(
						"Once you correctly complete the current step, the next step's details will be shown automatically.",
					)
					expect(systemPrompt).to.not.include(
						"use `send_user_message` tool call to briefly tell the user what step you are completing",
					)
					expect(systemPrompt).to.include("`workflow_progress_request`")
				},
			)
		})

		it("generates a continuation prompt for pi-planning step 5 with workflow_progress_request guidance", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "act" },
					isContinuationTurn: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "pi-planning.md",
					activePlaceholderWorkflowStepNumber: 5,
					currentFocusChainChecklist: "- [ ] Step 5: Refine stories in the delivery spec",
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("workflow_progress_request")
					expect(systemPrompt).to.include("Do not include `task_progress`")
					expect(systemPrompt).to.include(
						"runtime-owned `Yes` branch completes the next checklist step before the next model request is built",
					)
					expect(systemPrompt).to.not.include(
						"Once you correctly complete the current step, the next step's details will be shown automatically.",
					)
					expect(systemPrompt).to.not.include(
						"use `send_user_message` tool call to briefly tell the user what step you are completing",
					)
					expect(systemPrompt).to.include("`workflow_progress_request`")
				},
			)
		})
	})

	describe("Context-Specific Features", () => {
		const featureTests = [
			{ name: "browser-specific content when browser is enabled", context: { supportsBrowserUse: true }, check: "browser" },
			{ name: "MCP content when MCP servers are present", context: {}, check: "MCP" },
			{ name: "TODO content when focus chain is enabled", context: {}, check: "TODO" },
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
					expect(systemPrompt).to.include("task_progress")
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

		it("omits Indxr-aware MCP guidance for code-review step 3 when connected Indxr tools are fully filtered out of the native schema", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					mcpHub: makeMcpHub([makeIndxrServer()]),
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "code-review.md",
					activePlaceholderWorkflowStepNumber: 3,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include("Indxr-Aware Exploration")
					expect(systemPrompt).to.not.include("`search_relevant`")
					expect(systemPrompt).to.not.include("`get_file_summary`")
				},
			)
		})

		it("omits Indxr-aware MCP guidance for dev-story step 2 when the matrix removes all Indxr tools", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					mcpHub: makeMcpHub([makeIndxrServer()]),
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "dev-story.md",
					activePlaceholderWorkflowStepNumber: 2,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt, tools }) => {
					expect(systemPrompt).to.not.include("Indxr-Aware Exploration")
					expect(systemPrompt).to.not.include("`search_relevant`")
					expect(systemPrompt).to.not.include("`get_file_summary`")

					const nativeToolNames = getNativeToolNames(tools)
					expect(nativeToolNames).to.include("read_file")
					expect(nativeToolNames).to.include("read_file_range")
					expect(nativeToolNames).to.include("search_files")
					expect(nativeToolNames).to.include("apply_patch")
					expect(nativeToolNames).to.include("execute_command")
					expect(nativeToolNames).to.include("story_task_reminder")
					expect(nativeToolNames).to.include("story_task_complete")
					expect(nativeToolNames).to.include("story_notes_update")
					expect(nativeToolNames.some((name) => name.startsWith("indxr-"))).to.equal(false)
				},
			)
		})

		it("keeps Indxr-aware MCP guidance visible for dev-story step 3 while exposing validation tools", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					mcpHub: makeMcpHub([makeIndxrServer()]),
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "dev-story.md",
					activePlaceholderWorkflowStepNumber: 3,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt, tools }) => {
					expect(systemPrompt).to.include("Indxr-Aware Exploration")
					expect(systemPrompt).to.include("`search_relevant`")
					expect(systemPrompt).to.include("`get_file_summary`")

					const nativeToolNames = getNativeToolNames(tools)
					expect(nativeToolNames).to.include("story_notes_update")
					expect(nativeToolNames).to.include("story_testing_complete")
					expect(nativeToolNames).to.not.include("story_task_reminder")
					expect(nativeToolNames).to.not.include("story_task_complete")
					expect(nativeToolNames.some((name) => name.startsWith("indxr-"))).to.equal(true)
				},
			)
		})

		it("names only the visible subset of Indxr tools in native MCP guidance", async function () {
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
							],
						}),
					]),
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "review-edge-case-hunter.md",
					activePlaceholderWorkflowStepNumber: 2,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("Indxr-Aware Exploration")
					expect(systemPrompt).to.include("primary review boundary")
					expect(systemPrompt).to.include("`search_relevant`")
					expect(systemPrompt).to.include("`get_file_summary`")
					expect(systemPrompt).to.not.include("`lookup_symbol`")
					expect(systemPrompt).to.not.include("`read_source`")
					expect(systemPrompt).to.not.include("`get_public_api`")
					expect(systemPrompt).to.not.include(
						"before built-in `search_files`, `list_code_definition_names`, `read_file`, or `read_file_range` whenever feasible",
					)
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

		it("includes the shared agent_feedback guidance in a normal tool-use prompt", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-3", "openai"),
					enableNativeToolCalls: false,
				},
				"gpt-3",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include(AGENT_FEEDBACK_PROMPT_GUIDANCE)
				},
			)
		})

		it("includes the shared agent_feedback guidance in the GPT-5 tool-use prompt", async function () {
			this.timeout(TEST_TIMEOUT)

			const systemPrompt = await PromptRegistry.getInstance().get({
				...baseContext,
				providerInfo: makeProviderInfo("gpt-5", "openai"),
				enableNativeToolCalls: false,
			})

			expect(systemPrompt).to.include(AGENT_FEEDBACK_PROMPT_GUIDANCE)
		})

		it("includes the shared agent_feedback guidance in the Hermes tool-use prompt", async function () {
			this.timeout(TEST_TIMEOUT)

			const systemPrompt = await PromptRegistry.getInstance().get({
				...baseContext,
				providerInfo: makeProviderInfo("hermes-4", "test"),
				enableNativeToolCalls: false,
			})

			expect(systemPrompt).to.include(AGENT_FEEDBACK_PROMPT_GUIDANCE)
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

		it("omits the extra set_workflow_placeholders reminder line across the covered prompt variants", async function () {
			const guidanceSnippet = "When a step sets a placeholder value, use `set_workflow_placeholders`."
			const validTaskProgressSnippets = [
				"The user has triggered a workflow with a prebuilt checklist.",
				"Use `task_progress` only as a checklist parameter on the next tool call, not a standalone tool.",
			]

			const cases = [
				{
					name: "GPT-5",
					context: {
						providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
						enableNativeToolCalls: false,
					},
				},
				{
					name: "Native GPT-5.1",
					context: {
						providerInfo: makeProviderInfo("gpt-5-1", "openai"),
						enableNativeToolCalls: true,
					},
				},
				{
					name: "Native GPT-5",
					context: {
						providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
						enableNativeToolCalls: true,
					},
				},
				{
					name: "Native Next Gen",
					context: {
						providerInfo: makeProviderInfo("claude-sonnet-4", "cline"),
						enableNativeToolCalls: true,
					},
				},
			] as const

			for (const testCase of cases) {
				await runPromptTest(
					this,
					{
						...baseContext,
						...testCase.context,
						activeWorkflowSupportsPlaceholders: true,
						managedWorkflowActive: false,
					},
					testCase.name,
					async ({ systemPrompt }) => {
						expect(systemPrompt).to.not.include(guidanceSnippet)
						expect(validTaskProgressSnippets.some((snippet) => systemPrompt.includes(snippet))).to.equal(true)
						expect(systemPrompt).to.not.include("managed workflow step")
					},
				)
			}
		})

		it("filters native tools for code-review step 2", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "code-review.md",
					activePlaceholderWorkflowStepNumber: 2,
					mcpHub: makeMcpHub([
						makeConnectedServer(),
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
				},
				"gpt-5.4-2026-03-05",
				async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.include.members([
						"build_review_diff_output",
						"execute_command",
						"list_files",
						"search_files",
						"read_file",
						"read_file_range",
						"apply_patch",
						"attempt_completion",
					])
					expect(nativeToolNames).to.not.include("set_workflow_placeholders")
					expect(nativeToolNames).to.not.include("generate_plan_output")
					expect(nativeToolNames.some((name) => name.includes("search_relevant"))).to.equal(true)
					expect(nativeToolNames.some((name) => name.includes("get_file_summary"))).to.equal(true)
					expect(nativeToolNames.some((name) => name.includes("lookup_symbol"))).to.equal(true)
				},
			)
		})

		it("filters native tools for code-review step 3", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "code-review.md",
					activePlaceholderWorkflowStepNumber: 3,
					mcpHub: makeMcpHub([
						makeConnectedServer(),
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
				},
				"gpt-5.4-2026-03-05",
				async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.include.members([
						"set_workflow_placeholders",
						"list_files",
						"search_files",
						"read_file",
						"read_file_range",
						"apply_patch",
						"attempt_completion",
					])
					expect(nativeToolNames).to.not.include("build_review_diff_output")
					expect(nativeToolNames).to.not.include("build_review_input")
					expect(nativeToolNames).to.not.include("execute_command")
					expect(nativeToolNames.some((name) => name.includes("search_relevant"))).to.equal(false)
					expect(nativeToolNames.some((name) => name.includes("get_file_summary"))).to.equal(false)
					expect(nativeToolNames.some((name) => name.includes("lookup_symbol"))).to.equal(false)
				},
			)
		})

		it("filters native tools for create-epics step 2", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "create-epics.md",
					activePlaceholderWorkflowStepNumber: 2,
				},
				"gpt-5.4-2026-03-05",
				async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.include.members([
						"build_epics_document",
						"list_files",
						"search_files",
						"read_file",
						"read_file_range",
						"apply_patch",
						"attempt_completion",
					])
					expect(nativeToolNames).to.not.include("set_workflow_placeholders")
					expect(nativeToolNames).to.not.include("execute_command")
					expect(nativeToolNames).to.not.include("generate_plan_output")
					expect(nativeToolNames.some((name) => name.startsWith("indxr-"))).to.equal(false)
				},
			)
		})

		it("filters native tools for pi-planning step 2", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "pi-planning.md",
					activePlaceholderWorkflowStepNumber: 2,
				},
				"gpt-5.4-2026-03-05",
				async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.include.members(["select_target_epic", "attempt_completion"])
					expect(nativeToolNames).to.not.include("set_workflow_placeholders")
					expect(nativeToolNames).to.not.include("read_file")
					expect(nativeToolNames).to.not.include("execute_command")
					expect(nativeToolNames).to.not.include("generate_plan_output")
				},
			)
		})

		it("filters native tools for pi-planning step 3", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "pi-planning.md",
					activePlaceholderWorkflowStepNumber: 3,
				},
				"gpt-5.4-2026-03-05",
				async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.include.members(["build_epic_delivery_spec", "attempt_completion"])
					expect(nativeToolNames).to.not.include("set_workflow_placeholders")
					expect(nativeToolNames).to.not.include("read_file")
					expect(nativeToolNames).to.not.include("execute_command")
					expect(nativeToolNames).to.not.include("generate_plan_output")
				},
			)
		})

		it("filters native tools for pi-planning step 4", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "pi-planning.md",
					activePlaceholderWorkflowStepNumber: 4,
				},
				"gpt-5.4-2026-03-05",
				async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.include.members([
						"workflow_progress_request",
						"attempt_completion",
						"ask_followup_question",
						"send_user_message",
					])
					expect(nativeToolNames).to.not.include("list_files")
					expect(nativeToolNames).to.not.include("search_files")
					expect(nativeToolNames).to.not.include("read_file")
					expect(nativeToolNames).to.not.include("read_file_range")
					expect(nativeToolNames).to.not.include("apply_patch")
					expect(nativeToolNames).to.not.include("write_to_file")
					expect(nativeToolNames).to.not.include("set_workflow_placeholders")
					expect(nativeToolNames).to.not.include("execute_command")
					expect(nativeToolNames).to.not.include("generate_plan_output")
				},
			)
		})

		it("filters native tools for pi-planning step 5", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "pi-planning.md",
					activePlaceholderWorkflowStepNumber: 5,
				},
				"gpt-5.4-2026-03-05",
				async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.include.members([
						"workflow_progress_request",
						"attempt_completion",
						"ask_followup_question",
						"send_user_message",
						"list_files",
						"search_files",
						"read_file",
						"read_file_range",
						"apply_patch",
					])
					expect(nativeToolNames).to.not.include("set_workflow_placeholders")
					expect(nativeToolNames).to.not.include("execute_command")
					expect(nativeToolNames).to.not.include("generate_plan_output")
				},
			)
		})

		it("filters native tools for create-epics step 3", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "create-epics.md",
					activePlaceholderWorkflowStepNumber: 3,
				},
				"gpt-5.4-2026-03-05",
				async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.include.members([
						"workflow_progress_request",
						"attempt_completion",
						"ask_followup_question",
						"send_user_message",
						"list_files",
						"read_file",
						"read_file_range",
						"search_files",
					])
					expect(nativeToolNames).to.not.include("set_workflow_placeholders")
					expect(nativeToolNames).to.not.include("generate_plan_output")
					expect(nativeToolNames).to.not.include("execute_command")
				},
			)
		})

		it("filters native tools for create-prd step 3", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "create-prd.md",
					activePlaceholderWorkflowStepNumber: 3,
				},
				"gpt-5.4-2026-03-05",
				async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.include.members([
						"workflow_progress_request",
						"attempt_completion",
						"ask_followup_question",
						"send_user_message",
						"apply_patch",
					])
					expect(nativeToolNames).to.not.include("read_file")
					expect(nativeToolNames).to.not.include("read_file_range")
					expect(nativeToolNames).to.not.include("search_files")
					expect(nativeToolNames).to.not.include("generate_plan_output")
				},
			)
		})

		for (const { modelId, stepNumber, snapshotName } of [
			{
				modelId: "gpt-5-codex",
				stepNumber: 2,
				snapshotName: "openai_gpt_5_native_code_review_step_2.tools.snap",
			},
			{
				modelId: "gpt-5-1",
				stepNumber: 2,
				snapshotName: "openai_gpt_5_1_native_code_review_step_2.tools.snap",
			},
			{
				modelId: "gpt-5-codex",
				stepNumber: 3,
				snapshotName: "openai_gpt_5_native_code_review_step_3.tools.snap",
			},
			{
				modelId: "gpt-5-1",
				stepNumber: 3,
				snapshotName: "openai_gpt_5_1_native_code_review_step_3.tools.snap",
			},
		]) {
			it(`preserves the native bounded-read tool descriptions for code-review step ${stepNumber} on ${modelId}`, async function () {
				await runPromptTest(
					this,
					{
						...baseContext,
						providerInfo: makeProviderInfo(modelId, "openai"),
						enableNativeToolCalls: true,
						useMinimalGptPrompt: true,
						activeWorkflowSupportsPlaceholders: true,
						managedWorkflowActive: false,
						activePlaceholderWorkflowName: "code-review.md",
						activePlaceholderWorkflowStepNumber: stepNumber,
						mcpHub: makeMcpHub([
							makeConnectedServer(),
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
					},
					modelId,
					async ({ tools }) => {
						const nativeTools = tools
						const nativeToolNames = getNativeToolNames(nativeTools)
						const readFileDescription = getNativeFunctionDescription(nativeTools, "read_file")
						const readFileRangeDescription = getNativeFunctionDescription(nativeTools, "read_file_range")

						if (stepNumber === 2) {
							expect(nativeToolNames.some((name) => name.includes("search_relevant"))).to.equal(true)
							expect(readFileDescription).to.include("800 lines and 65536 bytes")
							expect(readFileDescription).to.be.a("string").and.not.empty
							expect(readFileRangeDescription).to.be.a("string").and.not.empty
						} else {
							expect(nativeToolNames.some((name) => name.includes("search_relevant"))).to.equal(false)
							expect(readFileDescription).to.equal("Request to read the contents of a file at the specified path.")
							expect(readFileRangeDescription).to.equal(
								"Request to read only a specific 1-based line range from a text file.",
							)
						}

						await assertSnapshot(snapshotName, JSON.stringify(nativeTools, null, 2))
					},
				)
			})
		}

		it("filters native tools for a code-read placeholder step and retains only allowed prefixed Indxr tools", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowSupportsPlaceholders: true,
					managedWorkflowActive: false,
					activePlaceholderWorkflowName: "review-edge-case-hunter.md",
					activePlaceholderWorkflowStepNumber: 2,
					mcpHub: makeMcpHub([
						makeConnectedServer(),
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
								{
									name: "get_callers",
									description: "Get callers",
									inputSchema: { type: "object", properties: {} },
								},
							],
						}),
					]),
				},
				"gpt-5.4-2026-03-05",
				async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.include.members(["indxr-10mcp0search_relevant", "indxr-10mcp0get_file_summary"])
					expect(nativeToolNames).to.not.include("indxr-10mcp0lookup_symbol")
					expect(nativeToolNames).to.not.include("indxr-10mcp0get_callers")
					expect(nativeToolNames).to.not.include("12345670mcp0test_tool")
					expect(nativeToolNames).to.not.include("build_review_diff_output")
					expect(nativeToolNames).to.not.include("set_workflow_placeholders")
				},
			)
		})

		it("injects workflow persona guidance for GPT-5.4 OpenAI full prompts without XML artifacts", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowName: "code-review.md",
					activeWorkflowPersonaInstructions: resolveWorkflowPersonaInstructions("code-review.md"),
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("Persona")
					expect(systemPrompt).to.include("Role: QA Agent")
					expect(systemPrompt).to.not.include("<agent")
					expect(systemPrompt).to.not.include("<persona")
					expect(systemPrompt).to.not.include("Active BMAD agent persona")
				},
			)
		})

		it("injects scrum-master workflow persona guidance for pi-planning full prompts without XML artifacts", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeWorkflowName: "pi-planning.md",
					activeWorkflowPersonaInstructions: resolveWorkflowPersonaInstructions("pi-planning.md"),
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					const personaInstructions = resolveWorkflowPersonaInstructions("pi-planning.md") ?? ""

					expect(personaInstructions).to.not.equal("")
					expect(systemPrompt).to.include(personaInstructions)
					expect(systemPrompt).to.include("Role: Scrum Master")
					expect(systemPrompt).to.not.include("<agent")
					expect(systemPrompt).to.not.include("<persona")
					expect(systemPrompt).to.not.include("Active BMAD agent persona")
				},
			)
		})

		it("omits workflow persona guidance on continuation turns", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					isContinuationTurn: true,
					activeWorkflowName: "code-review.md",
					activeWorkflowPersonaInstructions: undefined,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include("Role: QA Agent")
					expect(systemPrompt).to.not.include(
						"Identity: Meticulous code reviewer who finds every error, edge case, and missed detail.",
					)
				},
			)
		})

		it("omits pi-planning workflow persona guidance on continuation turns", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					isContinuationTurn: true,
					activeWorkflowName: "pi-planning.md",
					activeWorkflowPersonaInstructions: undefined,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					const personaInstructions = resolveWorkflowPersonaInstructions("pi-planning.md") ?? ""

					expect(personaInstructions).to.not.equal("")
					expect(systemPrompt).to.not.include(personaInstructions)
					expect(systemPrompt).to.not.include("Role: Scrum Master")
				},
			)
		})

		it("lists managed BMAD workflows but excludes BMAD persona entries in non-agent prompts", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					skills: [
						{
							name: "bmad-code-review",
							description: "Managed workflow: bmad-code-review",
							path: "managed-workflow://bmad-code-review",
							source: "project",
						},
						{
							name: "create-pull-request",
							description: "Create a pull request",
							path: "/skills/create-pull-request/SKILL.md",
							source: "global",
						},
						{
							name: "address-pr-comments.md",
							description: "Workspace workflow: address-pr-comments.md",
							path: "/project/.clinerules/workflows/address-pr-comments.md",
							source: "project",
						},
						{
							name: "bmad-dev",
							description: "BMAD Developer persona",
							path: "/skills/bmad-dev/SKILL.md",
							source: "project",
						},
					],
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include("Installed skills and workflow activations available on this turn")
					expect(systemPrompt).to.not.include("\nSKILLS\n")
					expect(systemPrompt).to.not.include("bmad-dev")
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
