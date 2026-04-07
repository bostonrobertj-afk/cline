---
instructions:
  - Read each step in full before making any changes.
  - Execute only the current step.
  - After completing the current step, update that step's checkbox from `[ ]` to `[x]`.
  - After updating the checkbox, read the next step in full before making any further changes.
  - Do not pre-apply edits from later steps.
  - Do not edit any file not listed in the current step's allowed-files list.
  - If any ambiguity, conflicting live seam, or unplanned required change is discovered, stop and ask for input before proceeding.
---

# Create Story Tool Configuration Action Plan

## Scope Lock

This plan implements the `create-story.md` contextual tool-matrix slice defined in [tool-configuration-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/create-story/tool-configuration-requirements.md).

Live seam audit completed before authoring this plan:

- [create-story.md](/Users/robertboston/Documents/Cline/Workflows/create-story.md#L24) now has five authored steps, with `workflow_progress_request` exit behavior only in Step 3 and Step 4.
- [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L214) still contains the stale six-step `create-story.md` row.
- [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1) does not yet include `create-story.md`.
- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L32) already keys off `shouldExposeWorkflowProgressRequest(...)`.
- [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L13) already keys off `shouldExposeWorkflowProgressRequest(...)`.
- [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L17) already keys off `shouldExposeWorkflowProgressRequest(...)`.
- [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L467) still documents the stale six-step `create-story.md` row.

Because the prompt components already rely on the shared helper, this plan must not edit [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L32), [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L13), [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L17), or [workflow_progress_request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts#L1) in this slice.

This plan also must not define a Step 2 `create-story.md` tool contract. Step 2 remains owned by the separate Step 2 automation slice.

## Steps

- [x] Step 1: Replace the stale `create-story.md` contextual tool-matrix row with the approved Steps 3 through 5 row set
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
  - At [contextualToolMatrix.ts:214](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L214), replace the entire current `create-story.md` row:
    ```ts
    "create-story.md": {
    	1: ["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"],
    	2: ["DOC_READ", "LOCAL_EXEC"],
    	3: ["DOC_READ"],
    	4: ["EXTERNAL_RESEARCH"],
    	5: ["DOC_READ", "DOC_WRITE"],
    	6: ["DOC_READ", "DOC_WRITE"],
    },
    ```
    with:
    ```ts
    "create-story.md": {
    	1: ["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"],
    	2: ["DOC_READ", "LOCAL_EXEC"],
    	3: ["DOC_READ", "DOC_WRITE", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "WORKFLOW_PROGRESS_REQUEST"],
    	4: ["DOC_READ", "DOC_WRITE", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "SUBAGENT_COORD", "WORKFLOW_PROGRESS_REQUEST"],
    	5: ["DOC_READ", "DOC_WRITE"],
    },
    ```
  - Do not edit any other workflow row.
  - Do not edit any bundle declarations above the matrix.
  - Preserve Step 1 and Step 2 exactly as they currently appear; this slice must not invent a new Step 2 tool contract.

- [x] Step 2: Add `create-story.md` Step 3 and Step 4 to the shared `workflow_progress_request` support map
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/shared/workflow-progress-request.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
  - In [workflow-progress-request.ts:1](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1), update `WORKFLOW_PROGRESS_REQUEST_WORKFLOW_STEPS` so it includes:
    ```ts
    "create-story.md": [3, 4],
    ```
    between the existing `create-prd.md` and `create-epics.md` entries.
  - In that same file, extend `normalizeWorkflowProgressRequestWorkflowName(...)` at [workflow-progress-request.ts:14](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L14) with a new branch:
    ```ts
    if (normalized === "create-story.md" || normalized === "create-story") {
    	return "create-story.md"
    }
    ```
    Insert this branch immediately after the existing `create-prd` branch and before the existing `create-epics` branch.
  - In [spec.test.ts:409](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L409), rename the existing test title:
    - from `it("gates workflow_progress_request to create-prd steps 3 through 14, create-epics step 3, and pi-planning steps 4 and 5", () => {`
    - to `it("gates workflow_progress_request to create-prd steps 3 through 14, create-story steps 3 and 4, create-epics step 3, and pi-planning steps 4 and 5", () => {`
  - In that same test, insert these three assertions immediately after the existing `create-prd` assertions and before the existing `create-epics` assertions:
    ```ts
    expect(
    	tool.contextRequirements?.({
    		...mockContext,
    		activePlaceholderWorkflowName: "create-story.md",
    		activePlaceholderWorkflowStepNumber: 3,
    	}),
    ).to.equal(true)
    expect(
    	tool.contextRequirements?.({
    		...mockContext,
    		activePlaceholderWorkflowName: "create-story.md",
    		activePlaceholderWorkflowStepNumber: 4,
    	}),
    ).to.equal(true)
    expect(
    	tool.contextRequirements?.({
    		...mockContext,
    		activePlaceholderWorkflowName: "create-story.md",
    		activePlaceholderWorkflowStepNumber: 5,
    	}),
    ).to.equal(false)
    ```
  - Do not edit `shouldExposeWorkflowProgressRequest(...)` logic beyond what is required by the new mapping and normalization entry.

- [x] Step 3: Add focused prompt-teaching regression coverage for `create-story.md` Steps 3 through 5
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
  - In [task_progress.test.ts:116](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts#L116), keep the existing `pi-planning` tests unchanged.
  - Immediately after the existing `pi-planning` Step 5 test and before the closing `})` of the `placeholder workflow task progress prompt` describe block, add exactly three tests titled:
    - `it("teaches workflow_progress_request for create-story step 3", async () => { ... })`
    - `it("teaches workflow_progress_request for create-story step 4", async () => { ... })`
    - `it("does not teach workflow_progress_request for create-story step 5", async () => { ... })`
  - For the Step 3 and Step 4 tests:
    - reuse the same setup pattern as the existing `create-prd` and `pi-planning` tests
    - set:
      - `managedWorkflowActive: false`
      - `activeWorkflowSupportsPlaceholders: true`
      - `activeDeterministicPlaceholderWorkflowEnabled: false`
      - `activePlaceholderWorkflowName: "create-story.md"`
      - `activePlaceholderWorkflowStepNumber: 3` or `4`
    - assert:
      - `progress` is a string
      - `progress` contains `workflow_progress_request`
      - `progress` does not contain `send_user_message`
      - `progress` contains `Do not include \`task_progress\` on \`workflow_progress_request\``
  - For the Step 5 test:
    - use the same setup shape, but set `activePlaceholderWorkflowStepNumber: 5`
    - assert:
      - `progress` is a string
      - `progress` does not contain `workflow_progress_request`
      - `progress` does not contain `Do not include \`task_progress\` on \`workflow_progress_request\``
  - In [response_tools.test.ts:6](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts#L6), keep the existing `pi-planning.md` coverage intact.
  - Immediately after the existing unsupported `pi-planning` Step 3 test, add a second base context constant named exactly `createStoryBaseContext` with:
    - `providerInfo.mode: "act"`
    - `providerInfo.providerId: "test"`
    - `providerInfo.model.id: "test-model"`
    - `providerInfo.model.info.supportsPromptCache: false`
    - `activePlaceholderWorkflowName: "create-story.md"`
    - `activeWorkflowSupportsPlaceholders: true`
    - `managedWorkflowActive: false`
  - After the existing `pi-planning` describe block, add a second `describe("create-story response tools prompt helpers", () => { ... })` block with exactly three tests:
    - `it("includes workflow_progress_request in response tools for create-story step 3", () => { ... })`
    - `it("includes workflow_progress_request in response tools for create-story step 4", () => { ... })`
    - `it("omits workflow_progress_request from response tools for unsupported create-story step 5", () => { ... })`
  - For the Step 3 and Step 4 tests:
    - construct `context` from `createStoryBaseContext`
    - set `activePlaceholderWorkflowStepNumber: 3` or `4`
    - assert:
      - `getCurrentModeResponseToolsLine(context)` contains `` `workflow_progress_request` ``
      - `getCurrentModeResponseToolsLine(context)` contains `` `attempt_completion` ``
      - `getCurrentModeResponseToolsLine(context)` contains `` `ask_followup_question` ``
      - `getCurrentModeResponseToolsLine(context)` contains `` `send_user_message` ``
      - `getResponseToolsSection(context)` contains `RESPONSE TOOLS`
      - `getResponseToolsSection(context)` contains `- \`workflow_progress_request\`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing`
  - For the Step 5 unsupported-step test:
    - set `activePlaceholderWorkflowStepNumber: 5`
    - assert:
      - `getCurrentModeResponseToolsLine(context)` does not contain `` `workflow_progress_request` ``
      - `getResponseToolsSection(context)` does not contain `- \`workflow_progress_request\``
  - Do not edit [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L32) or [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L17) in this step.

- [x] Step 4: Add focused contextual native-tool filter coverage for `create-story.md` Steps 3 through 5
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
  - In [contextualNativeToolFilter.test.ts:442](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L442), keep the existing `create-epics` and `create-prd` tests unchanged.
  - Immediately before the existing `create-epics` Step 3 test at [contextualNativeToolFilter.test.ts:442](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L442), add exactly three tests titled:
    - `it("applies create-story step 3 row and keeps workflow_progress_request with document, code-read, and Indxr bundles but without subagent coordination", () => { ... })`
    - `it("applies create-story step 4 row and keeps workflow_progress_request with document, code-read, Indxr, and subagent bundles", () => { ... })`
    - `it("applies create-story step 5 row and keeps only document read and write bundles", () => { ... })`
  - For the Step 3 and Step 4 tests, register this exact built-in tool set:
    - `LIST_FILES`
    - `SEARCH`
    - `LIST_CODE_DEF`
    - `FILE_READ`
    - `FILE_READ_RANGE`
    - `APPLY_PATCH`
    - `FILE_NEW`
    - `WORKFLOW_PROGRESS_REQUEST`
    - `USE_SUBAGENTS`
    - `SET_WORKFLOW_PLACEHOLDERS`
    - `WEB_SEARCH`
    - `ASK`
    - `SEND_USER_MESSAGE`
    - `ATTEMPT`
    - `PLAN_MODE`
    - `BROWSER`
    - `MCP_ACCESS`
    - `MCP_DOCS`
    - `NEW_TASK`
  - For the Step 3 and Step 4 tests, register this exact MCP tool set:
    - `indxr-10mcp0search_relevant`
    - `indxr-10mcp0get_file_summary`
    - `indxr-10mcp0lookup_symbol`
    - `12345670mcp0test_tool`
  - For the Step 3 test:
    - set context to `activePlaceholderWorkflowName: "create-story.md"` and `activePlaceholderWorkflowStepNumber: 3`
    - assert included ids:
      - `LIST_FILES`
      - `SEARCH`
      - `LIST_CODE_DEF`
      - `FILE_READ`
      - `FILE_READ_RANGE`
      - `APPLY_PATCH`
      - `FILE_NEW`
      - `WORKFLOW_PROGRESS_REQUEST`
      - `ASK`
      - `SEND_USER_MESSAGE`
      - `ATTEMPT`
      - `BROWSER`
      - `MCP_ACCESS`
      - `NEW_TASK`
    - assert excluded ids:
      - `USE_SUBAGENTS`
      - `SET_WORKFLOW_PLACEHOLDERS`
      - `WEB_SEARCH`
      - `PLAN_MODE`
    - assert included MCP names:
      - `indxr-10mcp0search_relevant`
      - `indxr-10mcp0get_file_summary`
      - `indxr-10mcp0lookup_symbol`
    - assert excluded MCP name:
      - `12345670mcp0test_tool`
  - For the Step 4 test:
    - set context to `activePlaceholderWorkflowName: "create-story.md"` and `activePlaceholderWorkflowStepNumber: 4`
    - assert included ids:
      - every included Step 3 id
      - `USE_SUBAGENTS`
    - assert excluded ids:
      - `SET_WORKFLOW_PLACEHOLDERS`
      - `WEB_SEARCH`
      - `PLAN_MODE`
    - assert the same included and excluded MCP names as Step 3
  - For the Step 5 test:
    - use the same built-in tool set but pass `mcpTools: []`
    - set context to `activePlaceholderWorkflowName: "create-story.md"` and `activePlaceholderWorkflowStepNumber: 5`
    - assert included ids:
      - `LIST_FILES`
      - `SEARCH`
      - `FILE_READ`
      - `FILE_READ_RANGE`
      - `APPLY_PATCH`
      - `FILE_NEW`
      - `ASK`
      - `SEND_USER_MESSAGE`
      - `ATTEMPT`
      - `BROWSER`
      - `MCP_ACCESS`
      - `NEW_TASK`
    - assert excluded ids:
      - `WORKFLOW_PROGRESS_REQUEST`
      - `LIST_CODE_DEF`
      - `USE_SUBAGENTS`
      - `SET_WORKFLOW_PLACEHOLDERS`
      - `WEB_SEARCH`
      - `PLAN_MODE`

- [x] Step 5: Add continuation-prompt and native-schema integration coverage for `create-story.md` Steps 3 through 5
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
  - In [integration.test.ts:722](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L722), keep the existing `pi-planning` continuation tests unchanged.
  - Immediately after the existing `pi-planning` Step 5 continuation test at [integration.test.ts:753](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L753), add exactly three continuation tests titled:
    - `it("generates a continuation prompt for create-story step 3 with workflow_progress_request guidance", async function () { ... })`
    - `it("generates a continuation prompt for create-story step 4 with workflow_progress_request guidance", async function () { ... })`
    - `it("does not generate workflow_progress_request guidance for create-story step 5", async function () { ... })`
  - For the Step 3 and Step 4 continuation tests:
    - use the same `runPromptTest(...)` pattern and `"fast"` model id as the existing sibling tests
    - set:
      - `providerInfo.mode: "act"`
      - `isContinuationTurn: true`
      - `activeWorkflowSupportsPlaceholders: true`
      - `managedWorkflowActive: false`
      - `activePlaceholderWorkflowName: "create-story.md"`
      - `activePlaceholderWorkflowStepNumber: 3` or `4`
      - `currentFocusChainChecklist` to a plausible single-item checklist string naming the active step
    - assert:
      - `systemPrompt` includes `workflow_progress_request`
      - `systemPrompt` includes `Do not include \`task_progress\``
      - `systemPrompt` includes `runtime-owned \`Yes\` branch completes the next checklist step before the next model request is built`
      - `systemPrompt` does not include `Once you correctly complete the current step, the next step's details will be shown automatically.`
      - `systemPrompt` does not include `use \`send_user_message\` tool call to briefly tell the user what step you are completing`
      - `systemPrompt` includes `` `workflow_progress_request` ``
  - For the Step 5 continuation test:
    - use the same setup pattern, but set `activePlaceholderWorkflowStepNumber: 5`
    - assert:
      - `systemPrompt` does not include `workflow_progress_request`
      - `systemPrompt` does not include `Do not include \`task_progress\``
  - In [integration.test.ts:1483](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1483), keep the existing `create-epics` and `create-prd` native-tool tests unchanged.
  - Immediately before the existing `create-epics` Step 3 native-tool test at [integration.test.ts:1483](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1483), add exactly three native-tool tests titled:
    - `it("filters native tools for create-story step 3", async function () { ... })`
    - `it("filters native tools for create-story step 4", async function () { ... })`
    - `it("filters native tools for create-story step 5", async function () { ... })`
  - For all three native-tool tests:
    - use the same native GPT test pattern as the existing `pi-planning` and `create-epics` tests:
      - `providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai")`
      - `enableNativeToolCalls: true`
      - `useMinimalGptPrompt: true`
      - `activeWorkflowSupportsPlaceholders: true`
      - `managedWorkflowActive: false`
      - `activePlaceholderWorkflowName: "create-story.md"`
    - set `activePlaceholderWorkflowStepNumber` to `3`, `4`, or `5`
  - For the Step 3 native-tool test, assert included names:
    - `workflow_progress_request`
    - `attempt_completion`
    - `ask_followup_question`
    - `send_user_message`
    - `list_files`
    - `search_files`
    - `read_file`
    - `read_file_range`
    - `list_code_definition_names`
    - `apply_patch`
  - For the Step 3 native-tool test, assert excluded names:
    - `use_subagents`
    - `set_workflow_placeholders`
    - `web_search`
    - `execute_command`
    - `generate_plan_output`
  - For the Step 4 native-tool test, assert included names:
    - every included Step 3 name
    - `use_subagents`
  - For the Step 4 native-tool test, assert excluded names:
    - `set_workflow_placeholders`
    - `web_search`
    - `execute_command`
    - `generate_plan_output`
  - For the Step 5 native-tool test, assert included names:
    - `attempt_completion`
    - `ask_followup_question`
    - `send_user_message`
    - `list_files`
    - `search_files`
    - `read_file`
    - `read_file_range`
    - `apply_patch`
  - For the Step 5 native-tool test, assert excluded names:
    - `workflow_progress_request`
    - `list_code_definition_names`
    - `use_subagents`
    - `set_workflow_placeholders`
    - `web_search`
    - `execute_command`
    - `generate_plan_output`
  - Do not update snapshots in this slice.

- [x] Step 6: Update the canonical contextual-tool schema document for `create-story.md`
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/contextual-tool-schema.md`
  - At [contextual-tool-schema.md:467](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L467), replace the entire current `create-story.md` subsection:
    ```md
    ### create-story.md

    - Step 1: `DOC_READ`, `DOC_WRITE`
    - Step 2: `DOC_READ`, `LOCAL_EXEC`
    - Step 3: `DOC_READ`
    - Step 4: `EXTERNAL_RESEARCH`
    - Step 5: `DOC_READ`, `DOC_WRITE`
    - Step 6: `DOC_READ`, `DOC_WRITE`
    ```
    with:
    ```md
    ### create-story.md

    - Step 1: `DOC_READ`, `DOC_WRITE`
    - Step 2: `DOC_READ`, `LOCAL_EXEC`
    - Step 3: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `WORKFLOW_PROGRESS_REQUEST`
    - Step 4: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `SUBAGENT_COORD`, `WORKFLOW_PROGRESS_REQUEST`
    - Step 5: `DOC_READ`, `DOC_WRITE`
    ```
  - Do not add Step 6 back into this row.
  - Do not document a new Step 2 bundle in this slice; preserve the current Step 2 line exactly until the separate Step 2 automation slice is defined.

- [x] Step 7: Run verification and string-contract audit
  - Allowed files:
    - none
  - Run these commands in order, and stop on the first failure:
    1. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts`
    2. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
    3. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
    4. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
    5. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`
    6. `npx tsc --noEmit`
    7. `rg -n '"create-story.md"|WORKFLOW_PROGRESS_REQUEST|workflow_progress_request|SUBAGENT_COORD|INDXR_DISCOVERY|INDXR_SOURCE_READ|INDXR_SYMBOL_GRAPH' src/core/prompts/system-prompt src/shared docs/workflow-automation/create-story docs/contextual-tool-schema.md`
  - Verification expectations:
    - `create-story.md` Steps 3 and 4 are the only `workflow_progress_request` steps introduced by this slice
    - `create-story.md` Step 5 remains unsupported by `workflow_progress_request`
    - no changes are allowed in [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L32)
    - no changes are allowed in [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L13)
    - no changes are allowed in [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L17)
    - no changes are allowed in [workflow_progress_request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts#L1)
    - no snapshot updates are required
  - If any verification failure suggests that one of those already-aligned prompt/helper files must change, stop and ask for input instead of expanding the slice automatically.
