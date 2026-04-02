---
title: Workflow Direct-Path Prompt And Tooling Implementation
instructions:
  - Read every step in full before making any change.
  - Execute only the current step.
  - After completing a step, change its checkbox from "[ ]" to "[x]".
  - After completing a step, re-read the next step in full before proceeding.
  - Do not edit any file not listed in the current step's allowed-files list.
  - Do not widen scope or redesign the implementation.
  - Do not edit any workflow markdown file; those edits are intentionally out of scope.
  - Stop and ask for input if any required change is not explicitly prescribed here.
---

# Action Plan

## Goal

Implement the direct-path recommendations from [dev-story-step-2-direct-path-recommendation.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/context-management/dev-story-step-2-direct-path-recommendation.md) by changing:

- workflow-step tool availability in the contextual matrix
- workflow-sensitive Indxr/MCP prompt guidance
- workflow-sensitive compact native tool descriptions

This plan intentionally excludes editing:

- `/Users/robertboston/Documents/Cline/Workflows/dev-story.md`
- `/Users/robertboston/Documents/Cline/Workflows/blind-review.md`
- `/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md`
- `/Users/robertboston/Documents/Cline/Workflows/review-adversarial-general.md`
- `src/core/prompts/system-prompt/components/tool_use/guidelines.ts`

## Verified Runtime Seams

- Workflow-specific native tool filtering is driven by `SystemPromptContext.activePlaceholderWorkflowName` and `SystemPromptContext.activePlaceholderWorkflowStepNumber` in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L97) and consumed by [contextualNativeToolFilter.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts#L82).
- Workflow-step tool bundles are declared in [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L74).
- Indxr-aware MCP prompt guidance and tool-description placeholder substitution live in [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L146) and [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L189).
- Continuation-turn prompts reuse `getIndxrExplorationGuidance(context)` in [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L49), so updating `mcp.ts` changes both the MCP section and continuation-turn guidance.
- Compact native tool descriptions for GPT-5 native tool calls are produced in [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L455).
- Existing test coverage already exercises:
  - matrix filtering in [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L34)
  - compact native descriptions in [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L607)
  - workflow-aware MCP/system prompt generation in [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L731)

## Locked Scope

- Do not edit any workflow markdown file under `/Users/robertboston/Documents/Cline/Workflows`.
- Do not edit [tool_use/guidelines.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/tool_use/guidelines.ts). The recommendation is to keep the generic tool-use section essentially unchanged.
- Do not add new workflow state fields, prompt-context fields, or registry files. Use the existing `activePlaceholderWorkflowName` and `activePlaceholderWorkflowStepNumber` fields only.
- Do not change non-target workflow rows in the contextual tool matrix.
- Do not update snapshot files unless a prescribed test unexpectedly requires it; if that happens, stop and ask for input instead of widening scope.

## Step 1

- [x] Narrow the contextual tool matrix and align matrix-filter tests with the new workflow rows.

Allowed files:
- `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
- `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- `src/core/prompts/system-prompt/__tests__/integration.test.ts`

Exact edits:
- In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L211), replace the `dev-story.md` Step 2 row at line 213:
  - from:
    - `["DOC_READ", "DOC_WRITE", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "LOCAL_EXEC"]`
  - to:
    - `["DOC_READ", "DOC_WRITE", "CODE_READ", "LOCAL_EXEC"]`
- In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L343), replace these review rows exactly:
  - line 345 `review-adversarial-general.md` Step 2:
    - from:
      - `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"]`
    - to:
      - `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ"]`
  - line 350 `blind-review.md` Step 2:
    - from:
      - `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE"]`
    - to:
      - `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "DOC_WRITE"]`
  - lines 355-356 `review-edge-case-hunter.md` Steps 2 and 3:
    - from:
      - `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"]`
    - to:
      - `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ"]`
- In [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L214), update the existing `review-edge-case-hunter` Step 2 test so the allowed MCP names no longer include:
  - `"indxr-10mcp0lookup_symbol"`
  - `"indxr-10mcp0get_callers"`
- In that same test, keep only:
  - `"indxr-10mcp0search_relevant"`
  - `"indxr-10mcp0get_file_summary"`
- In [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L270), update the existing `blind-review` Step 2 test so the allowed MCP names no longer include:
  - `"indxr-10mcp0lookup_symbol"`
- Keep only:
  - `"indxr-10mcp0search_relevant"`
  - `"indxr-10mcp0get_file_summary"`
- Immediately after the `review-edge-case-hunter` Step 2 test, add a new test named exactly:
  - `it("applies review-adversarial-general step 2 row without symbol-graph Indxr tools", () => { ... })`
- In that new test:
  - set `activePlaceholderWorkflowName: "review-adversarial-general.md"`
  - set `activePlaceholderWorkflowStepNumber: 2`
  - pass MCP tools:
    - `"indxr-10mcp0search_relevant"`
    - `"indxr-10mcp0get_file_summary"`
    - `"indxr-10mcp0lookup_symbol"`
    - `"indxr-10mcp0get_callers"`
  - assert only:
    - `"indxr-10mcp0search_relevant"`
    - `"indxr-10mcp0get_file_summary"`
    survive
  - assert `"indxr-10mcp0lookup_symbol"` and `"indxr-10mcp0get_callers"` do not survive
- Immediately after the existing `blind-review` Step 2 test, add a new test named exactly:
  - `it("applies dev-story step 2 row without any Indxr MCP tools", () => { ... })`
- In that new test:
  - set `activePlaceholderWorkflowName: "dev-story.md"`
  - set `activePlaceholderWorkflowStepNumber: 2`
  - include registered built-ins for:
    - `LIST_FILES`
    - `SEARCH`
    - `LIST_CODE_DEF`
    - `FILE_READ`
    - `FILE_READ_RANGE`
    - `APPLY_PATCH`
    - `FILE_NEW`
    - `BASH`
    - response tools
    - `BROWSER`
    - `MCP_ACCESS`
    - `NEW_TASK`
  - include MCP tools:
    - `"indxr-10mcp0search_relevant"`
    - `"indxr-10mcp0get_file_summary"`
    - `"indxr-10mcp0read_source"`
    - `"indxr-10mcp0lookup_symbol"`
  - assert the kept built-ins include:
    - `LIST_FILES`
    - `SEARCH`
    - `LIST_CODE_DEF`
    - `FILE_READ`
    - `FILE_READ_RANGE`
    - `APPLY_PATCH`
    - `FILE_NEW`
    - `BASH`
  - assert no tool name starting with `"indxr-"` survives
- In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1257), update the existing `filters native tools for a code-read placeholder step and retains only allowed prefixed Indxr tools` test so the expected surviving MCP tools no longer include:
  - `"indxr-10mcp0lookup_symbol"`
  - `"indxr-10mcp0get_callers"`
- In that same integration test, keep only these surviving MCP tools in the assertion:
  - `"indxr-10mcp0search_relevant"`
  - `"indxr-10mcp0get_file_summary"`
- In that same integration test, add negative assertions that:
  - `"indxr-10mcp0lookup_symbol"` is not included
  - `"indxr-10mcp0get_callers"` is not included

## Step 2

- [x] Make the MCP/Indxr prompt guidance workflow-sensitive and cover the changed prompt behavior with integration tests.

Allowed files:
- `src/core/prompts/system-prompt/components/mcp.ts`
- `src/core/prompts/system-prompt/__tests__/integration.test.ts`

Exact edits:
- In [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L99), add these new exported helpers immediately after `getVisibleNativeToolNames(...)` and before `getVisibleIndxrToolNames(...)`:
  - `normalizeActivePlaceholderWorkflowName(context: SystemPromptContext): string | undefined`
    - return `undefined` when `activePlaceholderWorkflowName` is absent
    - otherwise trim it and ensure the returned name ends with `.md`
  - `isDevStoryImplementationStep(context: SystemPromptContext): boolean`
    - return `true` only when the normalized workflow name is `dev-story.md` and `activePlaceholderWorkflowStepNumber === 2`
  - `isDirectMaterialReviewStep(context: SystemPromptContext): boolean`
    - return `true` only for:
      - `blind-review.md` Step 2
      - `review-adversarial-general.md` Step 2
      - `review-edge-case-hunter.md` Step 2
      - `review-edge-case-hunter.md` Step 3
- In [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L146), change `getIndxrExplorationGuidance(context)` so it becomes workflow-sensitive:
  - keep the existing default behavior for all contexts that are not covered by the two new helpers
  - if `isDevStoryImplementationStep(context)` is true and visible Indxr names exist, return exactly:
    - `For this implementation step, open story-named or cited files first. Use exactly these visible Indxr tools only if direct file reads and narrow built-in search do not reveal the implementation seam: ${renderIndxrToolNames(toolNames)}.`
  - if `isDirectMaterialReviewStep(context)` is true and visible Indxr names exist, return exactly:
    - `Use the supplied diff, review input, or directly changed code as the primary review boundary. Use exactly these visible Indxr tools only for targeted discovery and source reads on directly changed or directly referenced code: ${renderIndxrToolNames(toolNames)}. Broaden structural traversal only when a concrete unresolved question remains after direct inspection.`
  - for the non-native branch (`enableNativeToolCalls !== true`), reuse the existing default tool list arrays but apply the same two exact workflow-specific sentences above when the helper conditions match
- In [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L189), update `replacePromptPlaceholders(...)` so it branches on the new helpers before the existing `hasUsableIndxr` branch:
  - for `isDevStoryImplementationStep(context)`, set the exact placeholder guidance strings to:
    - `searchFilesGuidance`:
      - `Start with story-named or cited files. Use this only after those direct file reads fail to reveal the implementation seam, or when exact raw-text regex search is specifically required.`
    - `listCodeDefinitionsGuidance`:
      - `Use this only after direct file reads fail to reveal the implementation seam and you need a built-in top-level definition pass.`
    - `readFileGuidance`:
      - `For this implementation step, prefer direct reads of story-named or cited files before MCP exploration. Use read_file when you need the exact full raw contents of one concrete file at or below 800 lines and 65536 bytes.`
    - `readFileRangeGuidance`:
      - `Use this for targeted line-based inspection in a directly relevant file, or when a concrete file exceeds the full-read limit.`
    - `useMcpToolGuidance`:
      - ` For this implementation step, open story-named or cited files first. Use connected MCP exploration only if those direct file reads and narrow built-in search do not reveal the implementation seam.`
  - for `isDirectMaterialReviewStep(context)`, set the exact placeholder guidance strings to:
    - `searchFilesGuidance`:
      - `Use this only after inspecting the supplied diff, review input, or directly changed code, or when exact raw-text regex search is specifically required.`
    - `listCodeDefinitionsGuidance`:
      - `Use this only after direct inspection of the changed or directly referenced file reveals a concrete need for a built-in top-level definition pass.`
    - `readFileGuidance`:
      - `Start with directly changed or directly referenced files. Use read_file when you need the exact full raw contents of one concrete file at or below 800 lines and 65536 bytes to confirm a review finding.`
    - `readFileRangeGuidance`:
      - `Use this for targeted line-based inspection in directly changed or directly referenced code, or when a concrete file exceeds the full-read limit.`
    - `useMcpToolGuidance`:
      - ` Start from the supplied diff, review input, or directly changed code. Use connected MCP tools only for targeted discovery or source reads on directly changed or directly referenced code. Broaden structural traversal only when a concrete unresolved question remains after direct inspection.`
- In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L754), update the existing `review-edge-case-hunter` native MCP guidance test so it also asserts:
  - `systemPrompt` includes `primary review boundary`
  - `systemPrompt` does not include `before built-in \`search_files\`, \`list_code_definition_names\`, \`read_file\`, or \`read_file_range\` whenever feasible`
- Immediately after the existing continuation-turn test with Indxr and checklist at [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L574), add a new test named exactly:
  - `it("uses direct-material-first Indxr guidance in continuation prompts for review-edge-case-hunter step 2", async function () { ... })`
- In that new continuation-turn test:
  - set `isContinuationTurn: true`
  - set `currentFocusChainChecklist` to any non-empty checklist
  - set `mcpHub` to `makeMcpHub([makeIndxrServer()])`
  - set `activePlaceholderWorkflowName: "review-edge-case-hunter.md"`
  - set `activePlaceholderWorkflowStepNumber: 2`
  - assert `systemPrompt` includes:
    - `primary review boundary`
    - `` `search_relevant` ``
  - assert `systemPrompt` does not include:
    - `before built-in \`search_files\`, \`list_code_definition_names\`, \`read_file\`, or \`read_file_range\` whenever feasible`
- Immediately after the existing `code-review` Step 3 MCP-omission test at [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L731), add a new test named exactly:
  - `it("omits Indxr-aware MCP guidance for dev-story step 2 when the matrix removes all Indxr tools", async function () { ... })`
- In that new test:
  - use a native GPT-5.4 context
  - set `enableNativeToolCalls: true`
  - set `useMinimalGptPrompt: true`
  - set `mcpHub: makeMcpHub([makeIndxrServer()])`
  - set `activePlaceholderWorkflowName: "dev-story.md"`
  - set `activePlaceholderWorkflowStepNumber: 2`
  - assert `systemPrompt` does not include:
    - `Indxr-Aware Exploration`
    - `` `search_relevant` ``
    - `` `get_file_summary` ``
  - assert the native tool list contains:
    - `read_file`
    - `read_file_range`
    - `search_files`
    - `apply_patch`
    - `execute_command`
  - assert no native tool name begins with `indxr-`

## Step 3

- [x] Make compact native tool descriptions workflow-sensitive and add focused description tests.

Allowed files:
- `src/core/prompts/system-prompt/spec.ts`
- `src/core/prompts/system-prompt/__tests__/spec.test.ts`

Exact edits:
- In [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L7), extend the existing `mcp.ts` import so it also imports:
  - `isDevStoryImplementationStep`
  - `isDirectMaterialReviewStep`
- In [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L485-L504), update the `getNativeToolDescription(...)` switch for these five tool names:
  - `use_mcp_tool`
  - `search_files`
  - `list_code_definition_names`
  - `read_file`
  - `read_file_range`
- For each of those five tool names:
  - first branch on `isDevStoryImplementationStep(context)` and return these exact compact descriptions:
    - `use_mcp_tool`:
      - `Use a connected MCP tool only after direct reads of story-named or cited files and narrow built-in search fail to reveal the implementation seam.`
    - `search_files`:
      - `Use only after direct reads of story-named or cited files fail to reveal the implementation seam, or when exact raw-text regex search is specifically required.`
    - `list_code_definition_names`:
      - `Use only after direct reads of story-named or cited files fail to reveal the implementation seam and you need a built-in top-level definition pass.`
    - `read_file`:
      - `For this implementation step, prefer direct reads of story-named or cited files before MCP exploration. Use read_file when you need the exact full raw contents of one concrete file at or below 800 lines and 65536 bytes.`
    - `read_file_range`:
      - `Use this for targeted line-based inspection in a directly relevant file, or when a concrete file exceeds the full-read limit.`
  - otherwise branch on `isDirectMaterialReviewStep(context)` and return these exact compact descriptions:
    - `use_mcp_tool`:
      - `Use a connected MCP tool only after inspecting the supplied diff, review input, or directly changed code. Use it for targeted discovery or source reads on directly changed or directly referenced code, and broaden structural traversal only when a concrete unresolved question remains after direct inspection.`
    - `search_files`:
      - `Use only after inspecting the supplied diff, review input, or directly changed code, or when exact raw-text regex search is specifically required.`
    - `list_code_definition_names`:
      - `Use only after direct inspection of the changed or directly referenced file reveals a concrete need for a built-in top-level definition pass.`
    - `read_file`:
      - `Start with directly changed or directly referenced files. Use read_file when you need the exact full raw contents of one concrete file at or below 800 lines and 65536 bytes to confirm a review finding.`
    - `read_file_range`:
      - `Use this for targeted line-based inspection in directly changed or directly referenced code, or when a concrete file exceeds the full-read limit.`
  - leave the current default Indxr-first behavior unchanged for all other workflows and steps
- In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L607), keep the existing generic Indxr-connected test unchanged.
- Immediately after that existing generic test, add a new test named exactly:
  - `it("uses direct-material-first compact exploration descriptions for review-edge-case-hunter step 2", () => { ... })`
- In that new test:
  - start from the same native GPT-5.4 context shape used by the existing generic test
  - set:
    - `activePlaceholderWorkflowName: "review-edge-case-hunter.md"`
    - `activePlaceholderWorkflowStepNumber: 2`
    - `visibleNativeToolNames: ["search_relevant", "get_file_summary"]`
  - create the same five tool definitions used in the existing test:
    - `search_files`
    - `list_code_definition_names`
    - `read_file`
    - `read_file_range`
    - `use_mcp_tool`
  - assert their compact descriptions exactly match the five review-step strings prescribed above
- Immediately after that, add a second new test named exactly:
  - `it("uses file-first compact exploration descriptions for dev-story step 2", () => { ... })`
- In that new test:
  - use the same native GPT-5.4 context shape
  - set:
    - `activePlaceholderWorkflowName: "dev-story.md"`
    - `activePlaceholderWorkflowStepNumber: 2`
    - `visibleNativeToolNames: ["search_relevant", "get_file_summary"]`
  - create the same five tool definitions
  - assert their compact descriptions exactly match the five `dev-story` strings prescribed above

## Step 4

- [x] Run the focused prompt/tooling regression command and stop if any additional failure appears.

Allowed files:
- None

Exact commands:

```bash
npm run test:unit -- src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts src/core/prompts/system-prompt/__tests__/spec.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts --grep "uses direct-material-first Indxr guidance in continuation prompts for review-edge-case-hunter step 2|omits Indxr-aware MCP guidance for dev-story step 2 when the matrix removes all Indxr tools|names only the visible subset of Indxr tools in native MCP guidance|filters native tools for a code-read placeholder step and retains only allowed prefixed Indxr tools"
```

Completion criteria:
- Both commands exit successfully.
- No snapshot file edits are made.
- If the command reports a snapshot mismatch or any failure that requires files outside this plan, stop and ask for input instead of widening scope.

## Consistency Notes

- This plan intentionally changes prompt/tooling behavior only for:
  - `dev-story.md` Step 2
  - `blind-review.md` Step 2
  - `review-adversarial-general.md` Step 2
  - `review-edge-case-hunter.md` Steps 2 and 3
- The generic Indxr-first behavior remains the default for other workflows and non-target steps.
- The generic tool-use guidance file remains untouched.
- The continuation-turn prompt behavior is covered indirectly by changing `getIndxrExplorationGuidance(context)` and directly by the new continuation integration test.
