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
import { ModelFamily } from "@/shared/prompts"
import { isGPT5ModelFamily } from "@/utils/model-utils"
import { getSystemPrompt } from "../index"
import type { SystemPromptContext } from "../types"

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

const makeMcpHub = (servers: any[]): McpHub =>
	({
		getServers: () => servers,
	}) as unknown as McpHub

const makeConnectedServer = (overrides: Partial<any> = {}) => ({
	uid: "1234567",
	name: "test-server",
	status: "connected",
	config: '{"command": "test"}',
	tools: [{ name: "test_tool", description: "A test tool", inputSchema: { type: "object", properties: {} } }],
	resources: [],
	resourceTemplates: [],
	...overrides,
})

const makeIndxrServer = (overrides: Partial<any> = {}) =>
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

const makeWeakIndxrLikeServer = (toolName: string, overrides: Partial<any> = {}) =>
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
						const toolNames = (tools as any[]).map((tool) => {
							if (tool?.type === "function") {
								return tool.function?.name
							}
							return tool?.name
						})
						expect(toolNames).to.not.include("focus_chain")
						expect(JSON.stringify(tools)).to.not.include('"focus_chain"')
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
								const toolNames = (tools as any[]).map((tool) => {
									if (tool?.type === "function") {
										return tool.function?.name
									}
									return tool?.name
								})
								expect(toolNames).to.not.include("focus_chain")
							} else {
								expect(tools).to.be.undefined
							}

							expect(systemPrompt).to.be.a("string").with.length.greaterThan(100)
							expect(systemPrompt).to.not.include("{{TOOL_USE_SECTION}}")

							const snapshotName = `${providerId}_${modelId.replace(/[^a-zA-Z0-9]/g, "_")}-${contextName}.snap`
							await assertSnapshot(snapshotName, systemPrompt)
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
						await assertSnapshot(snapshotName, systemPrompt)
					})
				})
			}
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
					expect(systemPrompt).to.include(
						"Use `task_progress` only as a checklist parameter on the next tool call, not a standalone tool.",
					)
					expect(systemPrompt).to.include("RESPONSE TOOLS")
					expect(systemPrompt).to.include(
						"A reply reaches the human user only when you use the appropriate response tool.",
					)
					expect(systemPrompt).to.include("`attempt_completion`")
					expect(systemPrompt).to.include("`ask_followup_question`")
					expect(systemPrompt).to.include("`generate_plan_output`")
					expect(systemPrompt).to.include("`send_user_message`")
					expect(systemPrompt).to.include("In ACT MODE, respond using these:")
					expect(systemPrompt).to.not.include("# Tools")
					expect(systemPrompt).to.not.include("## execute_command")
				},
			)
		})

		it("includes the MCP section for native GPT-5 OpenAI prompts when MCP servers are connected", async function () {
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
					expect(systemPrompt).to.include("MCP SERVERS")
					expect(systemPrompt).to.include("Connected MCP servers: test-server")
					expect(systemPrompt).to.not.include("When Indxr is available, prefer it for code exploration")
				},
			)
		})

		it("adds Indxr-aware MCP guidance when a connected server exposes Indxr tool signatures", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					mcpHub: makeMcpHub([makeIndxrServer()]),
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt, tools }) => {
					expect(systemPrompt).to.include("Connected MCP servers: workspace-index")
					expect(systemPrompt).to.include(
						"When Indxr is available, prefer it for code exploration, structural summaries, and targeted source discovery before using built-in `search_files`, `list_code_definition_names`, `read_file`, or `read_file_range`.",
					)
					expect(systemPrompt).to.include(
						"Use built-in file tools when Indxr is unavailable, insufficient for the task, or when exact raw file contents, regex search, or line-based inspection are required.",
					)

					const nativeTools = (tools as any[]).map((tool) => (tool?.type === "function" ? tool.function : tool))
					const byName = new Map(nativeTools.map((tool) => [tool.name, tool.description]))

					expect(byName.get("search_files")).to.equal(
						"Regex-search raw files when Indxr is unavailable, insufficient, or when regex search is the better fit.",
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
					expect(systemPrompt).to.include("Connected MCP servers: weak-read_source-server")
					expect(systemPrompt).to.not.include("When Indxr is available, prefer it for code exploration")

					const nativeTools = (tools as any[]).map((tool) => (tool?.type === "function" ? tool.function : tool))
					const byName = new Map(nativeTools.map((tool) => [tool.name, tool.description]))

					expect(byName.get("search_files")).to.equal(
						"Request to perform a regex search across files in a specified directory, providing context-rich results.",
					)
				},
			)
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
					expect(systemPrompt).to.include(
						"A reply reaches the human user only when you use the appropriate response tool.",
					)
					expect(systemPrompt).to.include("`attempt_completion`: Use once at the end of each workflow")
					expect(systemPrompt).to.include("`send_user_message`: Use by default to send messages to the user")
					expect(systemPrompt).to.include(
						"`ask_followup_question`: Use to ask a question + present options for user to select",
					)
					expect(systemPrompt).to.include("`generate_plan_output`: Use to present a structured plan")
					expect(systemPrompt).to.include("In ACT MODE, respond using these:")
				},
			)
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

					const nativeTools = (tools as any[]).map((tool) => (tool?.type === "function" ? tool.function : tool))
					const byName = new Map(nativeTools.map((tool) => [tool.name, tool.description]))

					expect(byName.has("act_mode_respond")).to.equal(true)
					expect(byName.get("attempt_completion")).to.include(
						"returns `[Message displayed.]`, and ends your current turn",
					)
					expect(byName.get("send_user_message")).to.include(
						"returns `[Message displayed.]`, and ends your current turn",
					)
					expect(byName.get("attempt_completion")).to.include(
						'Example: result="Implemented the fix and verified it with tests."',
					)
					expect(byName.get("ask_followup_question")).to.include(
						"arrives on the following turn as normal human-authored input",
					)
					expect(byName.get("generate_plan_output")).to.include(
						"internal control flow rather than a governed user-facing response",
					)
					expect(byName.get("act_mode_respond")).to.include("ends your current turn")
					expect(byName.get("act_mode_respond")).to.include("wait for the user's next reply")
				},
			)
		})

		it("includes set_workflow_placeholders guidance for placeholder workflows across prompt variants", async function () {
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
						expect(systemPrompt).to.include(guidanceSnippet)
						expect(validTaskProgressSnippets.some((snippet) => systemPrompt.includes(snippet))).to.equal(true)
						expect(systemPrompt).to.not.include("managed workflow step")
					},
				)
			}
		})

		it("does not inline the verbose tool catalog for BMAD-active GPT-5.4 OpenAI turns", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					activeAgentId: "bmad-quick-flow-solo-dev",
					skills: [
						{
							name: "bmad-code-review",
							description: "workflow",
							path: "/skills/bmad-code-review/SKILL.md",
							source: "project",
						},
					],
					activeAgentRoleInstructions:
						"Agent Metadata\nName: Barry\nTitle: Quick Flow Solo Dev\n\nActivation\n1. Load config\n\nPersona\nRole: Quick Flow Solo Dev",
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("Agent Metadata")
					expect(systemPrompt).to.include("Persona")
					expect(systemPrompt).to.not.include("You are Cline operating under the active BMAD agent persona")
					expect(systemPrompt).to.not.include("<agent")
					expect(systemPrompt).to.not.include("<activation")
					expect(systemPrompt).to.not.include("<persona")
					expect(systemPrompt).to.not.include("Installed skills and workflow activations available on this turn")
					expect(systemPrompt).to.not.include("\nSKILLS\n")
					expect(systemPrompt.match(/Role: Quick Flow Solo Dev/g)?.length).to.equal(1)
					expect(systemPrompt).to.not.include("# Tools")
					expect(systemPrompt).to.not.include("## execute_command")
					expect(systemPrompt).to.not.include("Description: Request to execute a CLI command")
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
