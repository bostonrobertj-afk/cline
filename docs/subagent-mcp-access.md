
# Requirements
- Subagents must only be informed of, prompted about, and given schema access to MCP tools when the user has enabled automatic approval for MCP tasks in the UI.
- Subagent prompt assembly must pass mcpHub into subagent prompt context only when automatic MCP approval is enabled in UI settings

Include this prompt string in subagent prompts only when the Indxr MCP is configured and accessible:

Prefer these Indxr tools for code exploration and structural discovery over built-in tools like `search_files`, `list_code_definition_names`, `read_file`, or `read_file_range`:

Use:
- `search_relevant` for broad code discovery
- `lookup_symbol` or `explain_symbol` for symbol lookup/understanding
- `get_file_summary` for first-pass file understanding
- `read_source` for symbol-level or targeted source reads
- `get_file_context` for dependency and surrounding-file context
- `get_public_api` for interface-only understanding
- `get_callers` and `get_related_tests` for usage and test tracing
- `get_token_estimate` before large reads

Fall back to built-in file tools when Indxr is insufficient or when exact raw file text, regex search, or direct line inspection is required

# Action Plan
1. Add a single subagent MCP exposure gate helper in [SubagentBuilder.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts).
   Current anchors:
   - `SUBAGENT_DEFAULT_ALLOWED_TOOLS` at approximately lines 13-21
   - `buildNativeTools(...)` at approximately lines 78-90
   - `resolveAllowedTools(...)` at approximately lines 93-96

   Prescribed changes:
   - Add a file-local constant immediately below `SUBAGENT_DEFAULT_ALLOWED_TOOLS`:
     ```ts
     const SUBAGENT_MCP_TOOLS: ClineDefaultTool[] = [
     	ClineDefaultTool.MCP_USE,
     	ClineDefaultTool.MCP_ACCESS,
     	ClineDefaultTool.MCP_DOCS,
     ]
     ```
   - Add a new private method on `SubagentBuilder` below `getConfiguredSkills()`:
     ```ts
     private isSubagentMcpExposureEnabled(): boolean {
     	const autoApprovalSettings = this.baseConfig.services.stateManager.getGlobalSettingsKey("autoApprovalSettings")
     	return autoApprovalSettings?.actions?.useMcp === true
     }
     ```
   - Add a new public method directly below it:
     ```ts
     isMcpExposureEnabled(): boolean {
     	return this.isSubagentMcpExposureEnabled()
     }
     ```
   - Do not change `resolveAllowedTools(...)`.
     Required behavior: preserve the current permissive allowlist model. If a custom subagent YAML includes MCP tools while UI `useMcp` is off, those tools remain latent in `allowedTools`; they are not removed here.
   - Update `buildNativeTools(context)` so MCP tools are only emitted when the helper returns `true`.
     Replace the existing `.filter(...)` body with this exact logic:
     ```ts
     const mcpExposureEnabled = this.isSubagentMcpExposureEnabled()
     const filteredToolSpecs = toolSets
     	.map((toolSet) => toolSet.config)
     	.filter((toolSpec) => {
     		if (!this.allowedTools.includes(toolSpec.id)) {
     			return false
     		}
     		if (!mcpExposureEnabled && SUBAGENT_MCP_TOOLS.includes(toolSpec.id as ClineDefaultTool)) {
     			return false
     		}
     		return !toolSpec.contextRequirements || toolSpec.contextRequirements(context)
     	})
     ```
   - Do not add MCP tools to `SUBAGENT_DEFAULT_ALLOWED_TOOLS`.

2. Pass `mcpHub` into subagent prompt context only when the MCP auto-approval setting is enabled in [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts).
   Current anchor:
   - `buildPromptContext(...)` at approximately lines 883-928

   Prescribed changes:
   - In `buildPromptContext(...)`, immediately before the `return { ... }`, add:
     ```ts
     const includeMcpHub = this.agent.isMcpExposureEnabled()
     ```
   - In the returned `SystemPromptContext` object, add this property directly after `browserSettings`:
     ```ts
     mcpHub: includeMcpHub ? this.config.services.mcpHub : undefined,
     ```
   - Do not alter any other prompt-context fields.
   - Do not change handler registration in `createSubagentTaskConfig(...)`.
     Required behavior: the runtime continues to register any configured MCP handlers as it does today; this enhancement only controls whether subagents are informed of and given schema access to MCP capabilities.

3. Add a dedicated reusable subagent-only Indxr guidance string and helper in [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts).
   Current anchors:
   - Indxr constants at approximately lines 5-14
   - `hasConnectedIndxrServer(...)` at approximately lines 51-56
   - `getIndxrExplorationGuidance(...)` at approximately lines 59-63

   Prescribed changes:
   - Keep all existing main-agent Indxr guidance constants and behavior unchanged.
   - Immediately below `BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE`, add a new exported constant with this exact text:
     ```ts
     export const SUBAGENT_INDXR_EXPLORATION_GUIDANCE = `Prefer these Indxr tools for code exploration and structural discovery over built-in tools like \`search_files\`, \`list_code_definition_names\`, \`read_file\`, or \`read_file_range\`:
     
     Use:
     - \`search_relevant\` for broad code discovery
     - \`lookup_symbol\` or \`explain_symbol\` for symbol lookup/understanding
     - \`get_file_summary\` for first-pass file understanding
     - \`read_source\` for symbol-level or targeted source reads
     - \`get_file_context\` for dependency and surrounding-file context
     - \`get_public_api\` for interface-only understanding
     - \`get_callers\` and \`get_related_tests\` for usage and test tracing
     - \`get_token_estimate\` before large reads
     
     Fall back to built-in file tools when Indxr is insufficient or when exact raw file text, regex search, or direct line inspection is required.`
     ```
   - Directly below `getIndxrExplorationGuidance(...)`, add:
     ```ts
     export function getSubagentIndxrExplorationGuidance(context: SystemPromptContext): string {
     	return hasConnectedIndxrServer(context) ? SUBAGENT_INDXR_EXPLORATION_GUIDANCE : ""
     }
     ```
   - Do not replace or mutate `getIndxrExplorationGuidance(...)`; the new helper is additive and subagent-specific.

4. Inject the dedicated Indxr block into subagent system prompts only when Indxr is actually connected.
   Files:
   - [SubagentBuilder.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts)
   - [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts)

   Prescribed changes:
   - Update the import block at the top of `SubagentBuilder.ts`:
     - Change:
       ```ts
       import { PromptRegistry } from "@core/prompts/system-prompt"
       ```
     - To:
       ```ts
       import { PromptRegistry } from "@core/prompts/system-prompt"
       import { getSubagentIndxrExplorationGuidance } from "@core/prompts/system-prompt/components/mcp"
       ```
   - Add a new private method directly below `buildSystemPrompt(...)`:
     ```ts
     private buildConditionalMcpGuidance(context?: SystemPromptContext): string {
     	if (!context || !this.isSubagentMcpExposureEnabled()) {
     		return ""
     	}
     
     	const indxrGuidance = getSubagentIndxrExplorationGuidance(context)
     	if (!indxrGuidance) {
     		return ""
     	}
     
     	return `\n\n# Indxr-Aware Exploration\n${indxrGuidance}`
     }
     ```
   - Change the signature of `buildSystemPrompt(...)` from:
     ```ts
     buildSystemPrompt(generatedSystemPrompt: string): string
     ```
     to:
     ```ts
     buildSystemPrompt(generatedSystemPrompt: string, context?: SystemPromptContext): string
     ```
   - Replace the method body tail:
     ```ts
     return `${systemPrompt}${this.buildAgentIdentitySystemPrefix()}${SUBAGENT_SYSTEM_SUFFIX}`
     ```
     with:
     ```ts
     return `${systemPrompt}${this.buildAgentIdentitySystemPrefix()}${SUBAGENT_SYSTEM_SUFFIX}${this.buildConditionalMcpGuidance(context)}`
     ```
   - Do not add the Indxr block anywhere else in subagent runtime code.
     Required behavior: it appears only when both conditions are true:
     - UI `autoApprovalSettings.actions.useMcp === true`
     - `hasConnectedIndxrServer(context) === true`

5. Pass the built prompt context into subagent system-prompt assembly.
   File:
   - [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)

   Current anchor:
   - Search for the call site `this.agent.buildSystemPrompt(` in the main run loop.

   Prescribed changes:
   - Find the place where `buildPromptContext(...)` is called to produce the subagent context for prompt generation.
   - Find the subsequent call to `this.agent.buildSystemPrompt(generatedSystemPrompt)`.
   - Change that call to:
     ```ts
     this.agent.buildSystemPrompt(generatedSystemPrompt, promptContext)
     ```
   - If the local variable is not named `promptContext`, use the existing local context variable and do not rename unrelated symbols.
   - Do not rebuild context a second time just for this call; reuse the same context object already being passed into prompt generation/native tools.

6. Gate `load_mcp_documentation` exactly the same way as the executable MCP tools.
   Files:
   - [SubagentBuilder.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts)
   - [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)
   - [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts)

   Prescribed behavior:
   - `load_mcp_documentation` must remain hidden from subagent prompt/schema generation whenever UI `useMcp` is off.
   - No special-case exemption for docs is allowed.
   - Achieve this solely through the changes in steps 1 and 2; do not add any separate docs-only logic.

7. Add precise unit coverage for MCP gating in [SubagentBuilder.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts).
   Current anchors:
   - `createTaskConfig(...)` helper at approximately lines 12-28
   - existing tests ending around line 154

   Prescribed changes:
   - Update `createTaskConfig(...)` so `stateManager.getGlobalSettingsKey(...)` returns a usable `autoApprovalSettings` object when `key === "autoApprovalSettings"`.
     Add this exact branch:
     ```ts
     if (key === "autoApprovalSettings") {
     	return {
     		actions: {
     			useMcp: false,
     		},
     	}
     }
     ```
   - Add a new test after `"builds native tools by filtering allowed ids and context requirements then converting"`:
     ```ts
     it("suppresses MCP native tools when subagent MCP auto-approval is disabled", () => {
     	sinon.stub(AgentConfigLoader, "getInstance").returns({
     		getCachedConfig: () => ({
     			name: "mcp-agent",
     			description: "mcp aware",
     			tools: [ClineDefaultTool.MCP_USE, ClineDefaultTool.MCP_DOCS],
     			systemPrompt: "prompt",
     		}),
     	} as unknown as AgentConfigLoader)
     	sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)
     	sinon.stub(PromptRegistry.getInstance(), "getModelFamily").returns("test-family" as never)
     	sinon.stub(ClineToolSet, "getToolsForVariantWithFallback").returns([
     		{ config: { id: ClineDefaultTool.MCP_USE, contextRequirements: () => true } },
     		{ config: { id: ClineDefaultTool.MCP_DOCS, contextRequirements: () => true } },
     	] as never)
     	const converter = sinon.stub().callsFake((tool: { id: string }) => ({ converted: tool.id }))
     	sinon.stub(ClineToolSet, "getNativeConverter").returns(converter as never)
     
     	const builder = new SubagentBuilder(createTaskConfig("act", "openai"), "mcp-agent")
     	const result = builder.buildNativeTools({
     		providerInfo: { providerId: "openai", model: { id: "m1" } },
     		mcpHub: {} as any,
     	} as never)
     
     	assert.deepEqual(result, [])
     	assert.equal(builder.isMcpExposureEnabled(), false)
     })
     ```
   - Add a second test immediately after it:
     ```ts
     it("includes MCP native tools when subagent MCP auto-approval is enabled", () => {
     	sinon.stub(AgentConfigLoader, "getInstance").returns({
     		getCachedConfig: () => ({
     			name: "mcp-agent",
     			description: "mcp aware",
     			tools: [ClineDefaultTool.MCP_USE, ClineDefaultTool.MCP_DOCS],
     			systemPrompt: "prompt",
     		}),
     	} as unknown as AgentConfigLoader)
     	sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)
     	sinon.stub(PromptRegistry.getInstance(), "getModelFamily").returns("test-family" as never)
     	sinon.stub(ClineToolSet, "getToolsForVariantWithFallback").returns([
     		{ config: { id: ClineDefaultTool.MCP_USE, contextRequirements: () => true } },
     		{ config: { id: ClineDefaultTool.MCP_DOCS, contextRequirements: () => true } },
     	] as never)
     	const converter = sinon.stub().callsFake((tool: { id: string }) => ({ converted: tool.id }))
     	sinon.stub(ClineToolSet, "getNativeConverter").returns(converter as never)
     
     	const taskConfig = createTaskConfig("act", "openai")
     	;(taskConfig.services.stateManager.getGlobalSettingsKey as any) = (key: string) => {
     		if (key === "mode") return "act"
     		if (key === "autoApprovalSettings") {
     			return { actions: { useMcp: true } }
     		}
     		return undefined
     	}
     
     	const builder = new SubagentBuilder(taskConfig, "mcp-agent")
     	const result = builder.buildNativeTools({
     		providerInfo: { providerId: "openai", model: { id: "m1" } },
     		mcpHub: {} as any,
     	} as never)
     
     	assert.deepEqual(result, [
     		{ converted: ClineDefaultTool.MCP_USE },
     		{ converted: ClineDefaultTool.MCP_DOCS },
     	])
     	assert.equal(builder.isMcpExposureEnabled(), true)
     })
     ```
   - Add a third test verifying the Indxr prompt suffix:
     ```ts
     it("appends subagent-specific Indxr guidance only when MCP exposure is enabled and Indxr is connected", () => {
     	sinon.stub(AgentConfigLoader, "getInstance").returns({
     		getCachedConfig: () => undefined,
     	} as unknown as AgentConfigLoader)
     	sinon.stub(api, "buildApiHandler").returns({ getModel: sinon.stub(), createMessage: sinon.stub() } as never)
     
     	const taskConfig = createTaskConfig("act", "openai")
     	;(taskConfig.services.stateManager.getGlobalSettingsKey as any) = (key: string) => {
     		if (key === "mode") return "act"
     		if (key === "autoApprovalSettings") {
     			return { actions: { useMcp: true } }
     		}
     		return undefined
     	}
     
     	const builder = new SubagentBuilder(taskConfig)
     	const prompt = builder.buildSystemPrompt("generated", {
     		mcpHub: {
     			getServers: () => [
     				{
     					name: "workspace-index",
     					status: "connected",
     					config: '{"command":"indxr"}',
     					tools: [
     						{ name: "search_relevant", description: "Search relevant", inputSchema: { type: "object", properties: {} } },
     						{ name: "get_file_summary", description: "Summary", inputSchema: { type: "object", properties: {} } },
     					],
     				},
     			],
     		} as any,
     	} as never)
     
     	assert.match(prompt, /# Indxr-Aware Exploration/)
     	assert.match(prompt, /Prefer these Indxr tools for code exploration and structural discovery/)
     })
     ```

8. Add prompt-context gating tests in [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts).
   Current anchors:
   - `createTaskConfig(...)` helper at approximately lines 45-134
   - existing test `"does not reuse the parent ask callback inside subagent task configs"` at approximately line 191

   Prescribed changes:
   - In `createTaskConfig(...)`, expand the `autoApprovalSettings` fixture from:
     ```ts
     autoApprovalSettings: {
     	enableNotifications: false,
     	actions: { executeSafeCommands: false, executeAllCommands: false },
     },
     ```
     to:
     ```ts
     autoApprovalSettings: {
     	enableNotifications: false,
     	actions: { executeSafeCommands: false, executeAllCommands: false, useMcp: false },
     },
     ```
   - Add a new test after the existing first test:
     ```ts
     it("omits mcpHub from subagent prompt context when MCP auto-approval is disabled", async () => {
     	const runner = new SubagentRunner(createTaskConfig(false))
     	const context = await (runner as any).buildPromptContext({
     		providerInfo: { providerId: "openai", model: { id: "gpt-5" }, mode: "act" },
     		cwd: "/tmp",
     		ide: "TestIde",
     		skills: [],
     	})
     
     	assert.equal(context.mcpHub, undefined)
     })
     ```
   - Add a second test immediately after it:
     ```ts
     it("passes mcpHub into subagent prompt context when MCP auto-approval is enabled", async () => {
     	const config = createTaskConfig(false)
     	config.autoApprovalSettings.actions.useMcp = true
     	config.services.mcpHub = { getServers: () => [] } as any
     
     	const runner = new SubagentRunner(config)
     	const context = await (runner as any).buildPromptContext({
     		providerInfo: { providerId: "openai", model: { id: "gpt-5" }, mode: "act" },
     		cwd: "/tmp",
     		ide: "TestIde",
     		skills: [],
     	})
     
     	assert.equal(context.mcpHub, config.services.mcpHub)
     })
     ```
   - Add a third test that verifies the run loop passes prompt context into `buildSystemPrompt(...)`:
     ```ts
     it("passes the constructed prompt context into subagent system-prompt assembly", async () => {
     	const config = createTaskConfig(false)
     	config.autoApprovalSettings.actions.useMcp = true
     	config.services.mcpHub = { getServers: () => [] } as any
     
     	const buildSystemPromptStub = sinon.stub(SubagentBuilder.prototype, "buildSystemPrompt").callsFake((prompt, context) => {
     		assert.equal(prompt, "system prompt")
     		assert.equal(context?.mcpHub, config.services.mcpHub)
     		return "system prompt"
     	})
     	sinon.stub(SubagentBuilder.prototype, "buildNativeTools").returns([] as any)
     	sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
     	sinon.stub(PromptRegistry.getInstance(), "get").resolves("system prompt")
     	sinon.stub(skills, "discoverSkills").resolves([])
     	sinon.stub(skills, "getAvailableSkills").returns([])
     
     	const createMessage = sinon.stub()
     	createMessage.onFirstCall().callsFake(async function* () {
     		yield {
     			type: "tool_calls",
     			tool_call: {
     				function: {
     					id: "toolu_subagent_complete_mcp_context",
     					name: ClineDefaultTool.ATTEMPT,
     					arguments: JSON.stringify({ result: "done" }),
     				},
     			},
     		}
     	})
     	stubApiHandler(createMessage)
     	initializeHostProvider()
     
     	const runner = new SubagentRunner(config)
     	await runner.run("Finish quickly", () => {})
     	assert.equal(buildSystemPromptStub.called, true)
     })
     ```

9. Add MCP/Indxr prompt regression coverage in [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts).
   Current anchor:
   - `describe("Indxr MCP detection", ...)` beginning at approximately line 107

   Prescribed changes:
   - Update the import from `../components/mcp` to include the new helper and constant:
     ```ts
     getSubagentIndxrExplorationGuidance,
     SUBAGENT_INDXR_EXPLORATION_GUIDANCE,
     ```
   - Add a new test immediately after the existing Indxr detection block:
     ```ts
     it("returns the dedicated subagent Indxr guidance only when a distinctive Indxr server is connected", () => {
     	expect(getSubagentIndxrExplorationGuidance(indxrContext)).to.equal(SUBAGENT_INDXR_EXPLORATION_GUIDANCE)
     	expect(getSubagentIndxrExplorationGuidance(mockContext)).to.equal("")
     })
     ```
   - Do not modify any existing main-agent MCP expectation in this file.

10. Add system-prompt integration coverage so the new subagent Indxr text cannot silently drift.
   File:
   - [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts)

   Prescribed changes:
   - Do not add snapshot cases for subagents here.
   - Add a focused assertion-based test near the existing Indxr-specific tests (search for `makeIndxrServer()` around lines 390-440).
   - Add this exact test:
     ```ts
     it("keeps dedicated subagent Indxr guidance separate from the main MCP prompt guidance", async () => {
     	const context: SystemPromptContext = {
     		...baseContext,
     		mcpHub: makeMcpHub([makeIndxrServer()]),
     	}
     
     	const result = await getSystemPrompt(context)
     	expect(result.prompt).to.contain("When Indxr is available, prefer it for code exploration")
     	expect(result.prompt).to.not.contain("Prefer these Indxr tools for code exploration and structural discovery over built-in tools")
     })
     ```
   - This test locks the intended contract: the new verbose Indxr block is subagent-only and must not leak into normal top-level prompts.

11. Verification commands for the implementing agent.
   Run exactly these commands after code changes:
   - `npm run test:unit -- --exit src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`
   - `npx tsc --noEmit`

12. Definition of done.
   The implementation is only complete if all of the following are true:
   - With UI `autoApprovalSettings.actions.useMcp === false`, subagent prompt context does not include `mcpHub`, MCP tools are absent from subagent native-tool emission, and the dedicated Indxr block is absent from subagent prompts.
   - With UI `autoApprovalSettings.actions.useMcp === true`, subagent prompt context includes `mcpHub`, MCP tools including `load_mcp_documentation` are eligible for prompt/schema exposure, and the dedicated Indxr block appears only when a distinctive Indxr MCP server is connected.
   - Main-agent MCP prompt output remains unchanged except for any additive helper exports and test imports required by this plan.
   - No code path is added that strips MCP tools out of configured subagent allowlists or changes current handler-registration behavior.
