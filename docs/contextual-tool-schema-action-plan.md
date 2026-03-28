# Action Plan: Implement Contextual Native Tool Schema Filtering for Placeholder Workflows

Status: ready-for-dev

## Objective

Implement the placeholder-workflow-native-tool filtering described in [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md) so native tool schemas are trimmed by:

- active placeholder workflow name
- active placeholder workflow step number
- current provider mode (`act` vs `plan`)
- connected Indxr MCP tool availability

This pass is limited to native tool schemas. Do not change inline prompt tool catalogs or managed-workflow behavior.

## Non-Negotiable Implementation Choices

The executing agent must follow these choices exactly:

1. Do not scatter workflow-step gating into individual tool specs.
2. Do not edit native variant tool lists to make them context-specific.
3. Do not parse prompt text or workflow reminder strings to infer the active step.
4. Do not add any managed-workflow logic to this pass.
5. Apply contextual trimming only inside the native-tool path in [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts).
6. Keep `use_subagents`’ existing `isSubagentRun` suppression unchanged; do not re-implement that rule in another file.
7. Keep `set_workflow_placeholders` and `build_review_diff_output` broadly registered; perform placeholder-step narrowing centrally.

## Runtime Clarifications Required By Current Code

These points are required for a correct implementation even though the schema doc does not spell them out fully:

- `act_mode_respond` is an ACT-only response tool and must remain available in ACT mode when the current native variant exposes it.
  Source: [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L46)
- `new_task` is not a response tool and must remain untouched in this pass.
  Source: [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L68)
- Browser and static MCP helper tools remain always preserved in native schemas for this pass:
  - `browser_action`
  - `access_mcp_resource`
  - `load_mcp_documentation`
  This matches the current “complete-schema tools with no current placeholder-workflow rows” section in [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L307).

## Files To Create

Create exactly these new files:

1. `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
2. `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`
3. `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`

## Files To Modify

Modify exactly these existing files:

1. [src/core/prompts/system-prompt/types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L95)
2. [src/core/workflows/placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts#L21)
3. [src/core/workflows/__tests__/placeholder-workflow-step-details.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/__tests__/placeholder-workflow-step-details.test.ts#L1)
4. [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2794)
5. [src/core/task/tools/subagent/SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L937)
6. [src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L289)
7. [src/core/prompts/system-prompt/components/mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L6)
8. [src/core/prompts/system-prompt/registry/ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts#L170)
9. [src/core/prompts/system-prompt/__tests__/spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L121)
10. [src/core/prompts/system-prompt/__tests__/integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L250)
11. Native-tool snapshot baselines listed under “Snapshots To Update”

## Files Explicitly Not To Modify

Do not modify these files in this pass:

- [src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts#L7)
- [src/core/prompts/system-prompt/tools/build_review_diff_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_diff_output.ts#L7)
- [src/core/prompts/system-prompt/tools/subagent.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/subagent.ts#L7)
- [src/core/prompts/system-prompt/variants/native-gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts#L52)
- [src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts#L47)
- [src/core/prompts/system-prompt/variants/native-next-gen/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts#L43)
- [src/core/task/tools/response/ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L5)

## Step 1: Extend Prompt Context With Resolved Placeholder Workflow Name And Step

### 1A. Add two fields to `SystemPromptContext`

In [src/core/prompts/system-prompt/types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L107-L113), insert these two optional readonly fields immediately after `activeWorkflowSupportsPlaceholders`:

- `readonly activePlaceholderWorkflowName?: string`
- `readonly activePlaceholderWorkflowStepNumber?: number`

Do not rename any existing fields.

### 1B. Add a shared prompt-context resolver on top of the existing step helper

In [src/core/workflows/placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts#L21-L29), add a new exported type immediately after `ActivePlaceholderWorkflowStepDetails`:

```ts
export type ActivePlaceholderWorkflowPromptContext = {
	activePlaceholderWorkflowName?: string
	activePlaceholderWorkflowStepNumber?: number
}
```

Then, immediately after `getActivePlaceholderWorkflowStepDetails(...)` at [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts#L114-L157), add this new exported async helper:

- name: `resolveActivePlaceholderWorkflowPromptContext`
- input:
  - `checklistMarkdown?: string | null`
  - `source?: ActivePlaceholderWorkflowSource`
  - `stablePlaceholderValues?: Record<string, string>`
  - `placeholderValues?: Record<string, string>`
- output: `Promise<ActivePlaceholderWorkflowPromptContext>`

Exact behavior:

1. If `checklistMarkdown` is empty/falsy, return `{}`.
2. If `source` is missing, return `{}`.
3. Call `getActivePlaceholderWorkflowStepDetails(...)` with the provided values.
4. If it returns `undefined`, return `{}`.
5. Otherwise return:
   - `activePlaceholderWorkflowName: stepDetails.sourceName`
   - `activePlaceholderWorkflowStepNumber: stepDetails.stepNumber`

Do not import `SystemPromptContext` into this file. Keep the helper decoupled from prompt-layer types.

### 1C. Use the helper in main-task prompt assembly

In [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2794-L2837):

1. Add an import for `resolveActivePlaceholderWorkflowPromptContext`.
2. Immediately before `const promptContext: SystemPromptContext = { ... }`, compute:
   - `const activePlaceholderWorkflowPromptContext = await resolveActivePlaceholderWorkflowPromptContext(...)`
3. Pass:
   - `checklistMarkdown: this.taskState.currentFocusChainChecklist`
   - `source: this.taskState.activePlaceholderWorkflowSource`
   - `stablePlaceholderValues: this.taskState.activePlaceholderWorkflowStableValues`
   - `placeholderValues: this.taskState.activePlaceholderWorkflowValues`
4. Spread `...activePlaceholderWorkflowPromptContext` into the `promptContext` object immediately after `activeWorkflowSupportsPlaceholders`.

Do not gate this helper call on `shouldSendFullPromptAssembly`. It must run whenever checklist + placeholder source state are present.

### 1D. Use the helper in subagent prompt assembly

In [src/core/task/tools/subagent/SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L920-L956):

1. Add an import for `resolveActivePlaceholderWorkflowPromptContext`.
2. Immediately before the returned context object, compute:
   - `const activePlaceholderWorkflowPromptContext = await resolveActivePlaceholderWorkflowPromptContext(...)`
3. Pass:
   - `checklistMarkdown: params.state.currentFocusChainChecklist`
   - `source: params.state.activePlaceholderWorkflowSource`
   - `stablePlaceholderValues: params.state.activePlaceholderWorkflowStableValues`
   - `placeholderValues: params.state.activePlaceholderWorkflowValues`
4. Spread `...activePlaceholderWorkflowPromptContext` into the returned object immediately after `activeWorkflowSupportsPlaceholders`.

Again: do not gate this helper on `shouldSendFullPromptAssembly`.

## Step 2: Expand The Canonical Indxr Tool Name Set

In [src/core/prompts/system-prompt/components/mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L6-L8), replace `INDXR_TOOL_SIGNATURES` so it contains exactly these 19 canonical tool names:

- `lookup_symbol`
- `list_declarations`
- `search_signatures`
- `get_tree`
- `get_imports`
- `get_stats`
- `get_file_summary`
- `read_source`
- `get_file_context`
- `regenerate_index`
- `get_token_estimate`
- `search_relevant`
- `get_diff_summary`
- `batch_file_summaries`
- `get_callers`
- `get_public_api`
- `explain_symbol`
- `get_related_tests`
- `get_dependency_graph`

Keep these unchanged:

- `INDXR_ANCHOR_TOOL_SIGNATURES = new Set(["search_relevant", "get_file_summary", "get_token_estimate"])`
- `MIN_INDXR_SIGNATURE_MATCHES = 2`

Do not rewrite the prompt guidance strings in this file.

## Step 3: Add The Matrix Data File

Create `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`.

This file must export the following exact symbols:

1. `type PlaceholderToolBundle = ...`
2. `const PLACEHOLDER_BUILTIN_BUNDLE_TOOLS`
3. `const PLACEHOLDER_INDXR_BUNDLE_TOOLS`
4. `const ACT_MODE_RESPONSE_TOOL_IDS`
5. `const PLAN_MODE_RESPONSE_TOOL_IDS`
6. `const ALWAYS_PRESERVED_NATIVE_TOOL_IDS`
7. `const PLACEHOLDER_WORKFLOW_STEP_MATRIX`

### 3A. Bundle names

`PlaceholderToolBundle` must contain exactly:

- `DOC_READ`
- `CODE_READ`
- `DOC_WRITE`
- `LOCAL_EXEC`
- `PLACEHOLDER_WRITE`
- `WORKFLOW_ROUTE`
- `SUBAGENT_COORD`
- `DIFF_BUILD`
- `EXTERNAL_RESEARCH`
- `INDXR_DISCOVERY`
- `INDXR_SOURCE_READ`
- `INDXR_SYMBOL_GRAPH`
- `INDXR_MAINTENANCE`

### 3B. Built-in bundle tool mappings

Transcribe the built-in bundle mappings exactly from [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L273-L305), but use `ClineDefaultTool` ids instead of raw strings for built-in tools:

- `DOC_READ` -> `LIST_FILES`, `SEARCH`, `FILE_READ`, `FILE_READ_RANGE`
- `CODE_READ` -> `LIST_FILES`, `SEARCH`, `LIST_CODE_DEF`, `FILE_READ`, `FILE_READ_RANGE`
- `DOC_WRITE` -> `APPLY_PATCH`
- `LOCAL_EXEC` -> `BASH`
- `PLACEHOLDER_WRITE` -> `SET_WORKFLOW_PLACEHOLDERS`
- `WORKFLOW_ROUTE` -> `USE_SKILL`
- `SUBAGENT_COORD` -> `USE_SUBAGENTS`
- `DIFF_BUILD` -> `BUILD_REVIEW_DIFF_OUTPUT`
- `EXTERNAL_RESEARCH` -> `WEB_SEARCH`, `WEB_FETCH`

### 3C. Indxr bundle tool mappings

Use canonical suffix names exactly as documented at [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L294-L305):

- `INDXR_DISCOVERY`
  - `search_relevant`
  - `search_signatures`
  - `list_declarations`
  - `get_tree`
  - `get_imports`
  - `get_stats`
  - `get_diff_summary`
  - `get_token_estimate`
- `INDXR_SOURCE_READ`
  - `get_file_summary`
  - `read_source`
  - `get_file_context`
  - `batch_file_summaries`
- `INDXR_SYMBOL_GRAPH`
  - `lookup_symbol`
  - `explain_symbol`
  - `get_callers`
  - `get_public_api`
  - `get_related_tests`
  - `get_dependency_graph`
- `INDXR_MAINTENANCE`
  - `regenerate_index`

### 3D. Mode-scoped response-tool ids

Define these exact sets:

- `ACT_MODE_RESPONSE_TOOL_IDS`
  - `ASK`
  - `SEND_USER_MESSAGE`
  - `ATTEMPT`
  - `ACT_MODE`
- `PLAN_MODE_RESPONSE_TOOL_IDS`
  - `ASK`
  - `SEND_USER_MESSAGE`
  - `PLAN_MODE`

This is the runtime clarification that preserves `act_mode_respond` in ACT mode.

### 3E. Always-preserved native tool ids

Define `ALWAYS_PRESERVED_NATIVE_TOOL_IDS` as:

- `NEW_TASK`
- `BROWSER`
- `MCP_ACCESS`
- `MCP_DOCS`

Do not add any other ids to this set.

### 3F. Placeholder workflow matrix

Create `PLACEHOLDER_WORKFLOW_STEP_MATRIX` as:

```ts
Record<string, Record<number, readonly PlaceholderToolBundle[]>>
```

Populate it by copying the workflow-step rows exactly from [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L333-L686).

Implementation rules:

- Use the section heading text as the workflow key exactly, including the `.md` suffix.
- Use step numbers as numeric keys.
- For “no additional tools” rows, use `[]`.
- Do not add or remove any workflows.
- Do not infer or “simplify” any rows.

## Step 4: Add The Central Native Tool Filter

Create `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`.

This file must export exactly:

1. `canonicalizeMcpToolName(rawName: string): string`
2. `filterContextualNativeToolSpecs(input: { context: SystemPromptContext; registeredTools: ClineToolSpec[]; mcpTools: ClineToolSpec[] }): ClineToolSpec[]`

### 4A. `canonicalizeMcpToolName`

Implementation requirements:

- import `CLINE_MCP_TOOL_IDENTIFIER` from [src/shared/mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/mcp.ts#L6)
- if `rawName` contains `CLINE_MCP_TOOL_IDENTIFIER`, return the substring after the first delimiter
- otherwise return `rawName` unchanged

Use this exact rule described in [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L159-L187).

### 4B. Internal helper: normalize workflow name for matrix lookup

Inside this file, add a private helper with this exact behavior:

1. Try the raw `context.activePlaceholderWorkflowName` first.
2. If that exact key is not in `PLACEHOLDER_WORKFLOW_STEP_MATRIX` and the name does not end with `.md`, try `${name}.md`.
3. If that exact key is not in the matrix and the name does end with `.md`, try removing the `.md` suffix.
4. If none match, return `undefined`.

This normalization must be implemented exactly so matrix lookup is deterministic for both bare and suffixed workflow names.

### 4C. Response-tool filtering

At the start of `filterContextualNativeToolSpecs(...)`, first filter `registeredTools` by provider mode:

- if `context.providerInfo.mode === "act"`:
  - remove `PLAN_MODE`
  - keep `ACT_MODE` if present
- if `context.providerInfo.mode === "plan"`:
  - remove `ATTEMPT`
  - remove `ACT_MODE`
  - keep `PLAN_MODE` if present
- always keep `ASK` and `SEND_USER_MESSAGE`
- do not special-case `NEW_TASK`

Filter built-in tools by `tool.id`, not `tool.name`.

### 4D. Placeholder-workflow gating rules

After the response-tool filter, apply this exact control flow:

1. If `context.managedWorkflowActive === true`, return `[...responseFilteredRegisteredTools, ...mcpTools]` unchanged.
2. If `context.activePlaceholderWorkflowName` is missing, return `[...responseFilteredRegisteredTools, ...mcpTools]`.
3. If `context.activePlaceholderWorkflowStepNumber` is `undefined`, return `[...responseFilteredRegisteredTools, ...mcpTools]`.
4. Resolve the normalized workflow name using the helper from 4B.
5. If that normalized name is missing or has no row for the step number, return `[...responseFilteredRegisteredTools, ...mcpTools]`.
6. Otherwise:
   - compute the row bundles from `PLACEHOLDER_WORKFLOW_STEP_MATRIX`
   - build `allowedBuiltInToolIds` as:
     - current mode response-tool ids
     - all built-in tool ids from the row’s non-Indxr bundles
     - all ids from `ALWAYS_PRESERVED_NATIVE_TOOL_IDS`
   - filter `responseFilteredRegisteredTools` to only those whose `tool.id` is in `allowedBuiltInToolIds`
   - compute `allowedIndxrCanonicalNames` as the union of all tool names from the row’s Indxr bundles
   - filter `mcpTools` to only those whose canonicalized name is in `allowedIndxrCanonicalNames`

Important consequences:

- If the row does not include any Indxr bundles, all dynamic MCP tools must be removed for that turn.
- Non-Indxr dynamic MCP tools must be removed on matrix-filtered placeholder turns.
- `browser_action`, `access_mcp_resource`, `load_mcp_documentation`, and `new_task` remain preserved even when the current row does not list them.

### 4E. No per-tool context changes in this file

Do not mutate descriptions, parameters, or `contextRequirements` here. This file is strictly a post-selection native-schema filter.

## Step 5: Wire The Filter Into Native Tool Selection Only

In [src/core/prompts/system-prompt/registry/ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts#L170-L191):

1. Import `filterContextualNativeToolSpecs` from the new file.
2. Keep the existing `toolConfigs` and `mcpTools` collection logic unchanged.
3. Replace the current direct concatenation:

```ts
const enabledTools = [...toolConfigs, ...mcpTools].filter(...)
```

with:

```ts
const contextuallyFilteredTools = filterContextualNativeToolSpecs({
	context,
	registeredTools: toolConfigs,
	mcpTools,
})

const enabledTools = contextuallyFilteredTools.filter(
	(tool) => typeof tool.description === "string" && tool.description.trim().length > 0,
)
```

4. Leave `getEnabledToolSpecs(...)` at [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts#L136-L145) unchanged.
5. Leave `mcpToolToClineToolSpec(...)` at [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts#L198-L257) unchanged.

This pass is native-only. Do not change `PromptBuilder` or inline tool rendering.

## Step 6: Add Or Update Tests Exactly As Follows

### 6A. Placeholder workflow prompt-context helper tests

In [src/core/workflows/__tests__/placeholder-workflow-step-details.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/__tests__/placeholder-workflow-step-details.test.ts#L6-L11):

1. Import `resolveActivePlaceholderWorkflowPromptContext`.
2. Add a test immediately after the first `getActivePlaceholderWorkflowStepDetails` happy-path test asserting:
   - input workflow source name: `"remote-review"`
   - input checklist: `"- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"`
   - output:
     - `activePlaceholderWorkflowName === "remote-review"`
     - `activePlaceholderWorkflowStepNumber === 1`
3. Add a second test after the “returns undefined when there are no incomplete checklist items” test asserting the new helper returns `{}` when the checklist has no incomplete items.

### 6B. Subagent prompt-context propagation test

In [src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L289-L319):

Modify the existing “marks suppressed internal subagent turns…” test so it also sets:

- `state.activePlaceholderWorkflowSource = { type: "remote", name: "review-edge-case-hunter.md", contents: "# Flow\n\n## Step 1: Gather Context\nReview the diff.\n\n## Step 2: Review\nWrite findings.\n" }`

Then add these assertions to the existing block:

- `context.activePlaceholderWorkflowName === "review-edge-case-hunter.md"`
- `context.activePlaceholderWorkflowStepNumber === 1`

Do not create a second near-duplicate test; extend the existing one.

### 6C. Expand Indxr-name detection tests

In [src/core/prompts/system-prompt/__tests__/spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L121-L211):

Add these exact assertions to the “detects Indxr by connected tool signature” block:

- `expect(isIndxrToolName("lookup_symbol")).to.equal(true)`
- `expect(isIndxrToolName("get_dependency_graph")).to.equal(true)`
- `expect(isIndxrToolName("list_declarations")).to.equal(true)`

Then add one new test in the same `describe("Indxr MCP detection")` block:

- name: `"matches extended Indxr tool names while keeping the distinctive signature rule"`
- create a server whose tools are `lookup_symbol`, `get_callers`, and `search_relevant`
- assert:
  - `getIndxrToolMatches(server)` includes all three
  - `hasDistinctiveIndxrToolSignature(server) === true`

Do not remove the current weak-signal tests.

### 6D. Add dedicated native filter unit tests

Create `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`.

Add exactly four test cases:

1. `filters native response tools for ACT mode`
   - build `registeredTools` with ids: `ASK`, `SEND_USER_MESSAGE`, `ATTEMPT`, `PLAN_MODE`, `ACT_MODE`, `NEW_TASK`
   - call `filterContextualNativeToolSpecs` with `mode: "act"` and no placeholder workflow context
   - assert kept ids include `ASK`, `SEND_USER_MESSAGE`, `ATTEMPT`, `ACT_MODE`, `NEW_TASK`
   - assert `PLAN_MODE` is removed

2. `filters native response tools for PLAN mode`
   - same input set
   - call with `mode: "plan"`
   - assert kept ids include `ASK`, `SEND_USER_MESSAGE`, `PLAN_MODE`, `NEW_TASK`
   - assert `ATTEMPT` and `ACT_MODE` are removed

3. `applies code-review step 3 row and removes dynamic MCP tools when no Indxr bundles are allowed`
   - context:
     - `activePlaceholderWorkflowName: "code-review.md"`
     - `activePlaceholderWorkflowStepNumber: 3`
     - `mode: "act"`
   - `registeredTools` must include ids:
     - `LIST_FILES`, `SEARCH`, `FILE_READ`, `FILE_READ_RANGE`
     - `BASH`
     - `BUILD_REVIEW_DIFF_OUTPUT`
     - `APPLY_PATCH`
     - `SET_WORKFLOW_PLACEHOLDERS`
     - `USE_SUBAGENTS`
     - `WEB_SEARCH`
     - `ASK`, `SEND_USER_MESSAGE`, `ATTEMPT`, `PLAN_MODE`
     - `BROWSER`, `MCP_ACCESS`, `MCP_DOCS`, `NEW_TASK`
   - `mcpTools` must include:
     - one prefixed Indxr tool name such as `indxr-10mcp0search_relevant`
     - one non-Indxr prefixed tool name such as `12345670mcp0test_tool`
   - assert the result keeps:
     - doc-read built-ins
     - `BASH`
     - `BUILD_REVIEW_DIFF_OUTPUT`
     - `ASK`, `SEND_USER_MESSAGE`, `ATTEMPT`
     - `BROWSER`, `MCP_ACCESS`, `MCP_DOCS`, `NEW_TASK`
   - assert the result removes:
     - `PLAN_MODE`
     - `APPLY_PATCH`
     - `SET_WORKFLOW_PLACEHOLDERS`
     - `USE_SUBAGENTS`
     - `WEB_SEARCH`
     - both dynamic MCP tools

4. `applies review-edge-case-hunter step 2 row and keeps only allowed prefixed Indxr tools`
   - context:
     - `activePlaceholderWorkflowName: "review-edge-case-hunter.md"`
     - `activePlaceholderWorkflowStepNumber: 2`
     - `mode: "act"`
   - `registeredTools` must include code-read built-ins plus `BUILD_REVIEW_DIFF_OUTPUT`, `SET_WORKFLOW_PLACEHOLDERS`, `WEB_SEARCH`, response tools, and always-preserved tools
   - `mcpTools` must include these prefixed names:
     - `indxr-10mcp0search_relevant`
     - `indxr-10mcp0get_file_summary`
     - `indxr-10mcp0lookup_symbol`
     - `indxr-10mcp0get_callers`
     - `12345670mcp0test_tool`
   - assert the result keeps:
     - code-read built-ins
     - `search_relevant`
     - `get_file_summary`
     - `lookup_symbol`
     - `get_callers`
   - assert the result removes:
     - `BUILD_REVIEW_DIFF_OUTPUT`
     - `SET_WORKFLOW_PLACEHOLDERS`
     - `WEB_SEARCH`
     - `12345670mcp0test_tool`

### 6E. Update integration tests

In [src/core/prompts/system-prompt/__tests__/integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L575-L608):

1. Keep the existing `"keeps native response-tool specs aligned..."` test name.
2. Change its assertions so ACT-mode native GPT-5.1 tools now require:
   - `act_mode_respond` present
   - `attempt_completion` present
   - `generate_plan_output` absent
3. Keep the existing description-content assertions for the tools that remain present.

Then add a second test immediately after it:

- name: `"filters native response-tool specs for PLAN mode"`
- context:
  - `providerInfo: { ...makeProviderInfo("gpt-5-1", "openai"), mode: "plan" }`
  - `enableNativeToolCalls: true`
- assertions:
  - `generate_plan_output` present
  - `attempt_completion` absent
  - `act_mode_respond` absent
  - `ask_followup_question` present
  - `send_user_message` present

Then add two new placeholder-workflow tool-schema tests immediately after the placeholder guidance test block at [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L612-L667):

1. `filters native tools for code-review step 3`
   - context:
     - OpenAI GPT-5.4 native
     - `enableNativeToolCalls: true`
     - `useMinimalGptPrompt: true`
     - `activeWorkflowSupportsPlaceholders: true`
     - `managedWorkflowActive: false`
     - `activePlaceholderWorkflowName: "code-review.md"`
     - `activePlaceholderWorkflowStepNumber: 3`
     - `mcpHub: makeMcpHub([makeConnectedServer(), makeIndxrServer()])`
   - assert native tool names include:
     - `build_review_diff_output`
     - `execute_command`
     - `list_files`
     - `search_files`
     - `read_file`
     - `read_file_range`
     - `attempt_completion`
   - assert native tool names do not include:
     - `apply_patch`
     - `set_workflow_placeholders`
     - `generate_plan_output`
     - any prefixed Indxr MCP tool names

2. `filters native tools for a code-read placeholder step and retains only allowed prefixed Indxr tools`
   - context:
     - OpenAI GPT-5.4 native
     - `enableNativeToolCalls: true`
     - `useMinimalGptPrompt: true`
     - `activeWorkflowSupportsPlaceholders: true`
     - `managedWorkflowActive: false`
     - `activePlaceholderWorkflowName: "review-edge-case-hunter.md"`
     - `activePlaceholderWorkflowStepNumber: 2`
     - `mcpHub: makeMcpHub([makeConnectedServer(), makeIndxrServer({ tools: [...] })])`
   - provide `tools` on the Indxr server for:
     - `search_relevant`
     - `get_file_summary`
     - `lookup_symbol`
     - `get_callers`
   - assert native tool names include the prefixed MCP names for those four tools
   - assert native tool names do not include:
     - prefixed `test_tool`
     - `build_review_diff_output`
     - `set_workflow_placeholders`

Do not add prompt-text snapshot assertions for these new tests. Assert directly against the `tools` array.

## Step 7: Snapshot Updates

Because the base native ACT-mode tool sets will lose `generate_plan_output`, update exactly these snapshot files after the code and tests are in place:

1. [cline_native_next_gen.tools.snap](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_native_next_gen.tools.snap)
2. [openai_gpt_5_native.tools.snap](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5_native.tools.snap)
3. [openai_gpt_5_1_native.tools.snap](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5_1_native.tools.snap)
4. [vertex_gemini3.tools.snap](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/vertex_gemini3.tools.snap)
5. [vertex_gemini_3-parallel-tools.snap](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/vertex_gemini_3-parallel-tools.snap)

No prompt-text snapshot files should change in this pass. If any prompt snapshot changes, stop and investigate before proceeding.

## Validation Commands

Run these commands in this exact order:

1. `npx tsc --noEmit`
2. `npm run test:unit -- --exit src/core/workflows/__tests__/placeholder-workflow-step-details.test.ts src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`
3. If the integration test fails only because the five native-tool snapshots are outdated, run:
   - `npm run test:unit -- --exit --update-snapshots src/core/prompts/system-prompt/__tests__/integration.test.ts`
4. Re-run step 2 exactly and require it to pass cleanly.

## Definition Of Done

The work is complete only when all of these are true:

1. Native tool filtering is centralized in the new registry-layer filter and nowhere else.
2. `SystemPromptContext` carries resolved placeholder workflow name + step number in both main and subagent prompt assembly.
3. ACT-mode native schemas omit `generate_plan_output`.
4. PLAN-mode native schemas omit `attempt_completion` and `act_mode_respond`.
5. Placeholder workflow rows narrow built-in native tools exactly per the matrix.
6. Dynamic MCP tools are canonicalized via `0mcp0` splitting and filtered to the allowed Indxr canonical names for the active row.
7. `use_subagents`’ existing subagent suppression remains unchanged.
8. The exact validation commands above pass.
