

# Requirements
- "Indxr-Aware Exploration" should not be injected into the prompt if no Indxr tools are in the turn's tool schema. If there are Indxr tools in the tool schema, only the Indxr tools present in the tool schema should be called out in the prompt. Do not list Indxr tools that are not in the tool schema for that turn in this prompt section.
- send_user_message does not have task_progress in it's schema, causing agents to think they cannot include it with that tool, which directly contradicts prompting that tells agents to send task_progress as a parameter on send_user_message
- ~/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts is still not aligned with workflow scripting and is missing tools that the workflow prompts drive them to use. workflow source documents are here: /Users/robertboston/Documents/Cline/Workflows/ 
    - we audited and produced findings to support resolution of this problem here: /Users/robertboston/Documents/Cline Extension/cline/docs/contextual-tool-matrix-audit-findings.md
- access_mcp_resource should only show up in prompts and tool schema when there is at least one connected MCP server with at least one readable resource or resource template.
- this section needs cleanup:
        RESPONSE TOOLS
    Use these tools to respond to the user. A reply reaches the human user only when you use the appropriate response tool.

    attempt_completion: Use once at the end of each workflow
    send_user_message: Use by default to send messages to the user
    ask_followup_question: Use to ask a question + present options for user to select
    generate_plan_output: Use to present a structured plan
    In ACT MODE, respond using these: attempt_completion, ask_followup_question and send_user_message. In PLAN MODE, respond using these: generate_plan_output, ask_followup_question and send_user_message.

    When a step sets a placeholder value, use set_workflow_placeholders.

- The "In ACT MODE... In PLAN MODE" line should be redudant, assuming the list above is filtered based on the current mode. 
- Need to ensure that this is deterministically tied to which response tools are present in the schema that turn- even if that means that they're sharing some filtering/logic source.
- The "When a step sets a placeholder value..." line is not necessary- placeholder workflow scripting reminds the agent of this tool whenever it should be used.

# Action Plan

## Execution Rules
- Treat this document and [contextual-tool-matrix-audit-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-matrix-audit-findings.md) as the sole implementation authorities for this cleanup.
- Use `apply_patch` for all manual edits.
- Do not widen scope beyond the issues documented above.
- Do not modify workflow source files in `/Users/robertboston/Documents/Cline/Workflows/`.
- Do not modify snapshot files.
- If any cited file has drifted enough that the cited line anchor and nearby anchor text below no longer identify a unique edit location, stop and ask for input before proceeding.
- If any change seems necessary that is not explicitly prescribed below, stop and ask for input before proceeding.

## Files Explicitly Not To Modify
- `/Users/robertboston/Documents/Cline/Workflows/**`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/contextual-tool-matrix-audit-findings.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`
- Any snapshot file

## Step 1: Make Prompt Context Schema-Aware
Allowed files:
- [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts)
- [PromptRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/PromptRegistry.ts)
- [SubagentBuilder.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts)
- [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)

Exact changes:
1. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L95), add one new optional field to `SystemPromptContext` immediately after `enableParallelToolCalling?` and before `terminalExecutionMode?`:
   - `readonly visibleNativeToolNames?: readonly string[]`
2. In [PromptRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/PromptRegistry.ts#L87), keep `this.nativeTools = ClineToolSet.getNativeTools(variant, context)` intact, then immediately derive `visibleNativeToolNames` from `this.nativeTools` using this rule:
   - if the tool shape is OpenAI-style and has `tool.function.name`, use that string
   - else if the tool shape has `tool.name`, use that string
   - else drop it
   - preserve order
3. In [PromptRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/PromptRegistry.ts#L93), create `promptContext = { ...context, visibleNativeToolNames }`.
4. In [PromptRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/PromptRegistry.ts#L98) and [PromptRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/PromptRegistry.ts#L101), pass `promptContext`, not `context`, into the continuation component and `PromptBuilder`.
5. In [SubagentBuilder.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts#L83), do not change `buildSystemPrompt(...)` behavior except to rely on the passed `context` containing `visibleNativeToolNames` when available.
6. In [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L528), reorder the native-tool path so that when native tool calls are enabled:
   - build subagent native tools first
   - derive `visibleNativeToolNames` from those built native tools using the same extraction rules as Step 1.2
   - create `promptContext = { ...context, visibleNativeToolNames }`
   - pass `promptContext` into `this.agent.buildSystemPrompt(...)`
   - keep the actual `nativeTools` array passed to the request unchanged
7. Do not add any other new `SystemPromptContext` fields in this step.

Pause Point 1:
- Stop after these four files are updated.
- Report:
  - the exact new `SystemPromptContext` field name
  - the exact extraction rule used for visible native tool names
  - whether both main-prompt and subagent-prompt paths now receive `visibleNativeToolNames`

## Step 2: Make Indxr Guidance Schema-Aware and Gate MCP Resource Access by Actual Resources
Allowed files:
- [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts)
- [access_mcp_resource.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/access_mcp_resource.ts)

Exact changes:
1. In [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L6), keep the existing Indxr signature sets unchanged.
2. In [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L30), replace the fixed `INDXR_EXPLORATION_PREFERENCE_GUIDANCE` string constant with helper-based rendering. Do not leave a prompt string that hardcodes tools which may not be present in schema.
3. Add these helpers in [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts) below the connected-server helpers and above `getIndxrExplorationGuidance(...)`:
   - `normalizeVisibleNativeToolName(name: string): string`
     - if the name contains MCP prefix material such as `...mcp...tool...`, return only the suffix after the final delimiter segment that corresponds to the actual MCP tool name
     - otherwise return the original name
   - `getVisibleNativeToolNames(context: SystemPromptContext): string[]`
     - return `context.visibleNativeToolNames ?? []`
   - `getVisibleIndxrToolNames(context: SystemPromptContext): string[]`
     - normalize each visible native tool name
     - keep only names where `isIndxrToolName(name)` is true
     - preserve order
     - de-duplicate
   - `hasConnectedMcpResources(context: SystemPromptContext): boolean`
     - return true only if at least one connected, non-disabled server has `resources` with length > 0 or `resourceTemplates` with length > 0
4. Rewrite [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L93) `getIndxrExplorationGuidance(context)` to follow this exact logic:
   - if `context.enableNativeToolCalls === true`:
     - compute `visibleIndxrToolNames = getVisibleIndxrToolNames(context)`
     - if `visibleIndxrToolNames.length === 0`, return `""`
     - else return one sentence that says to prefer exactly those visible Indxr tools for code exploration, followed by the existing built-in fallback sentence
   - else:
     - preserve the existing server-based fallback behavior for non-native prompt variants
5. Rewrite [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L99) `getSubagentIndxrExplorationGuidance(context)` to follow this exact logic:
   - if `context.enableNativeToolCalls === true`:
     - compute `visibleIndxrToolNames = getVisibleIndxrToolNames(context)`
     - if empty, return `""`
     - else return subagent guidance that names only those visible Indxr tools and retains the existing built-in fallback sentence
   - else preserve the current server-based fallback behavior
6. In [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L140), keep `getMcp(...)` structure intact, but ensure the `Indxr-Aware Exploration` section is emitted only when `getIndxrExplorationGuidance(context)` returns non-empty text.
7. In [access_mcp_resource.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/access_mcp_resource.ts#L23) and [access_mcp_resource.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/access_mcp_resource.ts#L47), replace the broad `context.mcpHub !== undefined && context.mcpHub !== null` gate with `hasConnectedMcpResources(context)`.
8. Import the new helper into [access_mcp_resource.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/access_mcp_resource.ts) from `../components/mcp`.
9. Do not modify `ALWAYS_PRESERVED_NATIVE_TOOL_IDS` in this step.

Pause Point 2:
- Stop after these two files are updated.
- Report:
  - the exact new helper names added in `mcp.ts`
  - whether native-tool prompts now omit `Indxr-Aware Exploration` when no visible Indxr tools survive filtering
  - whether `access_mcp_resource` is now gated on resources/resource templates rather than MCP presence alone

## Step 3: Clean Up Response-Tool Prompting and Fix send_user_message Schema
Allowed files:
- [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts)
- [send_user_message.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/send_user_message.ts)
- [native-gpt-5/template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/template.ts)
- [native-gpt-5-1/overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts)
- [gpt-5/template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/template.ts)
- [native-next-gen/template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/template.ts)

Exact changes:
1. In [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L3), keep the existing mode ordering semantics:
   - ACT mode canonical order: `attempt_completion`, `ask_followup_question` when allowed, `send_user_message`, `act_mode_respond` when present
   - PLAN mode canonical order: `generate_plan_output`, `ask_followup_question` when allowed, `send_user_message`
2. Replace the current section builder in [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L37) with schema-aware filtering:
   - if `context.enableNativeToolCalls === true` and `context.visibleNativeToolNames` is present, include only response tools whose names are actually present in `context.visibleNativeToolNames`
   - else include only the current mode’s response tools
   - do not render tools from the other mode
3. Keep `ask_followup_question` omitted when `yoloModeToggled === true`.
4. Remove the redundant final line at [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L56):
   - `In ACT MODE, respond using these... In PLAN MODE, respond using these...`
5. The final `RESPONSE TOOLS` section must contain:
   - the title
   - the explanatory sentence
   - only the bullet lines for tools actually present in the section
   - no other explanatory footer
6. In [send_user_message.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/send_user_message.ts#L18) and [send_user_message.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/send_user_message.ts#L35):
   - import `TASK_PROGRESS_PARAMETER` from `../types`
   - append `TASK_PROGRESS_PARAMETER` to the parameter arrays for both the generic and native GPT-5 definitions
   - do not create a custom duplicate parameter object
   - rely on `TASK_PROGRESS_PARAMETER.contextRequirements` to keep it hidden for supported deterministic workflows
7. In the four prompt variant files listed above, remove the `getWorkflowPlaceholderToolGuidance(...)` helper entirely and remove its interpolation from the `TOOL USE` template string.
8. Do not add any replacement line for placeholder writes. The placeholder workflow scripting already covers that tool.

Pause Point 3:
- Stop after these six files are updated.
- Report:
  - the final response-tools rendering rule in one sentence
  - whether `send_user_message` now includes `task_progress`
  - whether the extra `set_workflow_placeholders` reminder line has been removed from all four prompt variant files

## Step 4: Apply the Workflow Matrix Corrections from the Audit Findings
Allowed files:
- [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts)

Exact changes:
1. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L83), update `PLACEHOLDER_WORKFLOW_STEP_MATRIX` to exactly match the `Recommended matrix row` entries in [contextual-tool-matrix-audit-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-matrix-audit-findings.md).
2. For every workflow/step mismatch entry in the findings doc:
   - locate the workflow block in `PLACEHOLDER_WORKFLOW_STEP_MATRIX`
   - locate the numeric step key
   - replace that row with the exact `Recommended matrix row`
3. For every findings entry whose step title is `<no corresponding workflow step>`:
   - remove that stale numeric step key entirely from the workflow block
4. Do not modify workflows listed under `## No-Finding Workflows` in the findings doc.
5. Do not change the bundle type union.
6. Do not change bundle definitions in `PLACEHOLDER_BUILTIN_BUNDLE_TOOLS` or `PLACEHOLDER_INDXR_BUNDLE_TOOLS`.
7. Do not add any new bundle names. The audit found `0` bundle-model-gap rows.
8. Do not modify `ALWAYS_PRESERVED_NATIVE_TOOL_IDS` in this step.

Pause Point 4:
- Stop after the matrix file is updated.
- Report:
  - the number of workflow blocks changed
  - the number of numeric step rows updated
  - the number of stale numeric step rows removed
  - confirmation that every change came directly from a `Recommended matrix row` in the findings doc

## Step 5: Update and Add Tests for the Cleanup Behavior
Allowed files:
- [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts)
- [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts)
- [SubagentBuilder.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts)
- [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts)

Exact changes:
1. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L436), update the native GPT-5 minimal prompt assertions so they:
   - still expect `RESPONSE TOOLS`
   - do not expect the removed `In ACT MODE... In PLAN MODE...` line
   - only expect response tool names that are actually present in the current mode/schema for the tested case
2. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L484), replace the current Indxr MCP guidance assertion with schema-aware coverage:
   - one test where an Indxr server is connected but the current workflow-step matrix filtering removes all Indxr native tools; assert no `Indxr-Aware Exploration` section
   - one test where visible native schema retains a subset of Indxr tools; assert the prompt includes only those visible tool names and does not mention other Indxr tools
3. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L553), update the governed response-tool contract test so it asserts:
   - no redundant ACT/PLAN footer line
   - only current-mode tool bullets appear
4. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L636), remove the old assertion that placeholder workflows include the `When a step sets a placeholder value...` guidance line. Replace it with the inverse assertion that this line is absent across the previously covered variants.
5. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L250), add these exact coverage cases:
   - `send_user_message` native schema includes `task_progress` in a normal non-deterministic context
   - `send_user_message` native schema omits `task_progress` when `activeDeterministicPlaceholderWorkflowEnabled === true`
   - `access_mcp_resource` native schema is omitted when connected servers have no `resources` and no `resourceTemplates`
   - `access_mcp_resource` native schema is included when a connected server has `resources` or `resourceTemplates`
6. In [SubagentBuilder.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts#L248), replace the current server-only Indxr prompt test with schema-aware assertions:
   - one case where an Indxr server is connected but the passed `visibleNativeToolNames` list contains no Indxr tools; assert no Indxr guidance
   - one case where `visibleNativeToolNames` contains a subset of Indxr tools; assert only that subset is mentioned
7. In [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts), only update expectations that fail because matrix rows changed in Step 4. Do not add unrelated tests in this file.
8. Do not update snapshots. If any snapshot update appears necessary, stop and ask for input.

Pause Point 5:
- Stop after the test files are updated, before running tests.
- Report:
  - the new test cases added
  - which pre-existing assertions were removed or inverted
  - whether any snapshot updates appeared necessary

## Step 6: Validation
Allowed files:
- No code edits in this step unless a listed validation command fails. If a failure occurs, edit only the files already allowed in Steps 1 through 5.

Run these commands in this exact order:
1. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/spec.test.ts`
2. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/integration.test.ts`
3. `npm run test:unit -- --exit src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`
4. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`

Validation rules:
- If a command fails, fix only the files already allowed by Steps 1 through 5.
- Re-run only the failing command until it passes.
- After all individual failures are fixed, re-run the full four-command sequence in order.
- Do not run broader test suites.

## Final Report Requirements
- State whether execution matched this action plan exactly.
- List any deviations.
- Summarize each pause point outcome.
- Provide pass/fail status for each validation command.
- List every changed file.
- List any blockers, ambiguities, or unresolved issues.

# Remediation Addendum

## Remediation Execution Rules
- This addendum corrects the remaining gaps discovered after the original action plan was executed.
- Execute only the remediation steps below for this pass.
- Treat this addendum as the sole authority for the remediation work.
- Use `apply_patch` for all manual edits.
- Do not widen scope beyond the three findings listed below.
- If any line anchor or nearby anchor text below no longer identifies a unique edit location, stop and ask for input before proceeding.
- If any additional code or test change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.

## Remediation Scope
This addendum exists to fix these exact findings:
1. Subagent prompts still build the base system prompt from unfiltered main prompt context rather than the filtered subagent-visible schema context.
2. `getCodeExplorationGuidance(...)` still contains a dangling `INDXR_EXPLORATION_PREFERENCE_GUIDANCE` reference.
3. The remaining rules/code-exploration prompt paths still gate Indxr guidance by connected-server presence instead of visible schema.

## Remediation Step 7: Preserve Caller-Supplied Visible Native Tool Names and Use Them End-to-End for Subagent Prompt Assembly
Allowed files:
- [PromptRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/PromptRegistry.ts)
- [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)

Exact changes:
1. In [PromptRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/PromptRegistry.ts#L102), keep `this.nativeTools = ClineToolSet.getNativeTools(variant, context)` unchanged.
2. In [PromptRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/PromptRegistry.ts#L104), replace the current unconditional derived value with this exact rule:
   - if `context.visibleNativeToolNames !== undefined`, preserve it verbatim by copying it into a new array
   - otherwise derive visible names from `this.nativeTools` exactly as the file already does
3. In [PromptRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/PromptRegistry.ts#L105), keep `promptContext = { ...context, visibleNativeToolNames }`, but ensure the preserved caller-supplied value wins when present.
4. In [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L529), reorder the prompt-assembly logic for the main loop iteration so it becomes:
   - build `context`
   - build `candidateNativeTools` before calling `promptRegistry.get(...)`
   - derive `visibleNativeToolNames` from `candidateNativeTools`
   - create `promptContext = { ...context, visibleNativeToolNames }`
   - call `promptRegistry.get(promptContext)`, not `promptRegistry.get(context)`
   - compute `useNativeToolCalls` from `promptRegistry.nativeTools`
   - set `nativeTools = useNativeToolCalls ? candidateNativeTools : undefined`
   - pass `promptContext` into `this.agent.buildSystemPrompt(...)`
5. In [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L541), do not call `this.agent.buildNativeTools(context)` twice.
6. In [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L554), keep the existing error path intact when native tool calling is enabled but `nativeTools` is empty.

Pause Point 7:
- Stop after these two files are updated.
- Report:
  - the exact precedence rule now used in `PromptRegistry.get(...)` for `visibleNativeToolNames`
  - whether `SubagentRunner` now calls `promptRegistry.get(promptContext)` instead of `promptRegistry.get(context)`
  - whether subagent native tools are built only once per loop iteration

## Remediation Step 8: Fix the Shared Indxr Code-Exploration Helper and Remove the Remaining Server-Only Gates
Allowed files:
- [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts)
- [rules.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/rules.ts)
- [native-gpt-5-1/overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts)

Exact changes:
1. In [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L176), replace the entire `getCodeExplorationGuidance(context, fallbackWhenIndxrUnavailable)` implementation with this exact behavior:
   - compute `const indxrGuidance = getIndxrExplorationGuidance(context)`
   - if `indxrGuidance` is non-empty, return it
   - otherwise return `fallbackWhenIndxrUnavailable`
2. After Step 8.1, do not leave any reference to `INDXR_EXPLORATION_PREFERENCE_GUIDANCE` anywhere in [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts).
3. In [rules.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/rules.ts#L4), remove the unused `hasConnectedIndxrServer` import so the file imports only `getCodeExplorationGuidance` from `./mcp`.
4. In [rules.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/rules.ts#L12), change `getRulesTemplateText` from a single-expression arrow function to a block-body function that first computes:
   - `const codeExplorationGuidance = getCodeExplorationGuidance(context, "")`
5. In [rules.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/rules.ts#L19), replace the current `hasConnectedIndxrServer(context)` gate with this exact rendering rule:
   - if `codeExplorationGuidance` is non-empty, include the bullet `- ${codeExplorationGuidance}`
   - otherwise include nothing at that spot
6. In [native-gpt-5-1/overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L1), remove `hasConnectedIndxrServer` from the import list and keep only `getCodeExplorationGuidance`.
7. In [native-gpt-5-1/overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L84), replace the current ternary block with a single direct call:
   - `getCodeExplorationGuidance(context, "When in doubt about existing patterns, conventions, or dependencies, **investigate first** using search_files and list_code_definition_names before the first full read_file, then use read_file_range for focused follow-up checks whenever possible")`
8. Do not modify any other prompt variant file in this step.

Pause Point 8:
- Stop after these three files are updated.
- Report:
  - whether `getCodeExplorationGuidance(...)` now delegates entirely to `getIndxrExplorationGuidance(...)` plus fallback text
  - whether `rules.ts` and `native-gpt-5-1/overrides.ts` no longer gate on `hasConnectedIndxrServer(context)`
  - confirmation that `INDXR_EXPLORATION_PREFERENCE_GUIDANCE` is no longer referenced anywhere in `mcp.ts`

## Remediation Step 9: Add Regression Coverage for the Fixed Prompt-Assembly and Shared-Helper Paths
Allowed files:
- [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts)
- [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts)
- [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts)
- [SubagentBuilder.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts)

Exact changes:
1. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L127), extend the `Indxr MCP detection` block by importing and testing `getCodeExplorationGuidance(...)`.
2. Add these exact three new assertions in [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts) directly after the existing `getSubagentIndxrExplorationGuidance(...)` assertions:
   - native context with `enableNativeToolCalls: true`, connected Indxr server, and `visibleNativeToolNames: ["search_relevant"]` returns guidance that includes `` `search_relevant` `` and excludes `` `get_file_summary` ``
   - native context with `enableNativeToolCalls: true`, connected Indxr server, and `visibleNativeToolNames: []` returns exactly the provided fallback string
   - non-native context with a connected distinctive Indxr server returns a non-empty string and does not throw
3. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L557), add two new tests under `Context-Specific Features`:
   - one direct prompt-build test for a native GPT-5.1 context with a connected Indxr server and `visibleNativeToolNames: []`; assert the built prompt does not mention `` `search_relevant` `` or `Indxr-Aware Exploration`
   - one direct prompt-build test for a native GPT-5.1 context with a connected Indxr server and `visibleNativeToolNames: ["indxr-10mcp0search_relevant"]`; assert the built prompt includes `` `search_relevant` `` and excludes `` `get_file_summary` ``
4. For Step 9.3, use `PromptRegistry.getInstance().get(context)` directly instead of `runPromptTest(...)` so the test exercises caller-supplied `visibleNativeToolNames`.
5. In [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L252), add a new test adjacent to the existing prompt-context test that does all of the following:
   - stubs `SubagentBuilder.prototype.buildNativeTools` to return exactly `[ { name: "indxr-10mcp0search_relevant" }, { name: "search_files" } ]`
   - stubs `PromptRegistry.getInstance().get` and asserts that the passed context includes `visibleNativeToolNames` exactly equal to `["indxr-10mcp0search_relevant", "search_files"]`
   - stubs `SubagentBuilder.prototype.buildSystemPrompt` and asserts it receives the same `visibleNativeToolNames`
   - keeps the existing run completion path lightweight, as the surrounding tests do
6. In [SubagentBuilder.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts), do not add new test cases unless a Step 10 validation failure requires updating an expected string that changed only because `getCodeExplorationGuidance(...)` was corrected. If that happens, update only the failing expected string and nothing else.
7. Do not update snapshots in this step. If a snapshot update appears necessary, stop and ask for input.

Pause Point 9:
- Stop after the test files are updated, before running remediation validation.
- Report:
  - the exact new helper-level assertions added in `spec.test.ts`
  - the exact new direct prompt-build assertions added in `integration.test.ts`
  - the exact new `SubagentRunner.test.ts` assertion proving `visibleNativeToolNames` flows through `promptRegistry.get(...)` and `buildSystemPrompt(...)`
  - whether any `SubagentBuilder.test.ts` expectation had to be changed

## Remediation Step 10: Validation
Allowed files:
- No edits in this step unless one of the commands below fails. If a failure occurs, edit only files already allowed by Remediation Steps 7 through 9.

Run these commands in this exact order:
1. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/spec.test.ts`
2. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/integration.test.ts`
3. `npm run test:unit -- --exit src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
4. `npm run test:unit -- --exit src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

Validation rules:
- If a command fails, fix only files already allowed by Remediation Steps 7 through 9.
- Re-run only the failing command until it passes.
- After all failures are fixed, re-run the full four-command sequence in order.
- Do not run broader test suites.

## Remediation Final Report Requirements
- State whether execution matched this remediation addendum exactly.
- List any deviations.
- Summarize each remediation pause point outcome.
- Provide pass/fail status for each Remediation Step 10 command.
- List every changed file.
- List any blockers, ambiguities, or unresolved issues.
