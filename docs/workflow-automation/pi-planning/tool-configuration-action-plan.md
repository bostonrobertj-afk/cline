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

# PI Planning Tool Configuration Action Plan

## Scope Lock

This plan implements the final `pi-planning.md` tool-configuration slice defined in [tool-configuration-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/pi-planning/tool-configuration-requirements.md).

Live seam audit completed before authoring this plan:

- [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1) already includes `pi-planning.md: [4, 5]`
- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L62) already keys off `shouldExposeWorkflowProgressRequest(...)`
- [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L14) already keys off `shouldExposeWorkflowProgressRequest(...)`
- [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L17) already keys off `shouldExposeWorkflowProgressRequest(...)`

Because those seams already match the requirements, this plan must not edit them in this slice. The only production-code change required is the missing `pi-planning.md` Step 4 and Step 5 contextual matrix rows.

## Steps

- [x] Step 1: Add the missing `pi-planning.md` Step 4 and Step 5 contextual rows
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
  - At [contextualToolMatrix.ts:318](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L318), replace the current `pi-planning.md` row:
    ```ts
    "pi-planning.md": {
    	2: ["TARGET_EPIC_SELECT"],
    	3: ["EPIC_DELIVERY_SPEC_BUILD"],
    },
    ```
    with:
    ```ts
    "pi-planning.md": {
    	2: ["TARGET_EPIC_SELECT"],
    	3: ["EPIC_DELIVERY_SPEC_BUILD"],
    	4: ["WORKFLOW_PROGRESS_REQUEST"],
    	5: ["DOC_READ", "DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
    },
    ```
  - Do not edit any other workflow row.
  - Do not edit bundle declarations above this matrix.
  - Do not edit [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1); it is already aligned for `pi-planning.md` Steps 4 and 5.

- [x] Step 2: Add focused prompt-teaching regression coverage for `pi-planning.md` Steps 4 and 5
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
  - In [task_progress.test.ts:100](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts#L100), keep the existing Step 4 test unchanged.
  - Immediately after that test, add a second test titled exactly:
    - `it("teaches workflow_progress_request for pi-planning step 5 even when the workflow is deterministic", async () => { ... })`
  - Use the same setup shape as the Step 4 test, but set `activePlaceholderWorkflowStepNumber: 5`.
  - Assert exactly:
    - `progress` is a string
    - it contains `workflow_progress_request`
    - it does not contain `send_user_message`
    - it contains `Do not include \`task_progress\` on \`workflow_progress_request\``
  - Create the new file [response_tools.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts).
  - In that file, add focused unit coverage for the exported helpers in [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L57):
    - import `expect` from `chai`
    - import `describe` and `it` from `mocha`
    - import `getCurrentModeResponseToolsLine` and `getResponseToolsSection`
    - construct a minimal `SystemPromptContext` with:
      - `providerInfo.mode: "act"`
      - `providerInfo.providerId: "test"`
      - `providerInfo.model.id: "test-model"`
      - `providerInfo.model.info.supportsPromptCache: false`
      - `activePlaceholderWorkflowName: "pi-planning.md"`
      - `activeWorkflowSupportsPlaceholders: true`
      - `managedWorkflowActive: false`
    - Add one Step 4 test and one Step 5 test.
  - For both Step 4 and Step 5 response-tools tests, assert:
    - `getCurrentModeResponseToolsLine(...)` includes `` `workflow_progress_request` ``
    - `getCurrentModeResponseToolsLine(...)` includes `` `attempt_completion` ``
    - `getCurrentModeResponseToolsLine(...)` includes `` `ask_followup_question` ``
    - `getCurrentModeResponseToolsLine(...)` includes `` `send_user_message` ``
    - `getResponseToolsSection(...)` includes `RESPONSE TOOLS`
    - `getResponseToolsSection(...)` includes `- \`workflow_progress_request\`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing`
  - Add one unsupported-step guard test in the same file for `pi-planning.md` Step 3 asserting:
    - `getCurrentModeResponseToolsLine(...)` does not include `` `workflow_progress_request` ``
    - `getResponseToolsSection(...)` does not include `- \`workflow_progress_request\``
  - Do not edit [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L62), [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L14), or [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L17) in this step.

- [x] Step 3: Extend contextual native-tool filter coverage for `pi-planning.md` Steps 4 and 5
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
  - In [contextualNativeToolFilter.test.ts:304](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L304), keep the existing Step 2 and Step 3 tests unchanged.
  - Immediately after the existing Step 3 test, add a Step 4 test titled exactly:
    - `it("applies pi-planning step 4 row and keeps workflow_progress_request without doc read or write bundles", () => { ... })`
  - For that Step 4 test:
    - include these registered built-ins:
      - `LIST_FILES`
      - `SEARCH`
      - `FILE_READ`
      - `FILE_READ_RANGE`
      - `APPLY_PATCH`
      - `FILE_NEW`
      - `WORKFLOW_PROGRESS_REQUEST`
      - `SET_WORKFLOW_PLACEHOLDERS`
      - `ASK`
      - `SEND_USER_MESSAGE`
      - `ATTEMPT`
      - `PLAN_MODE`
      - `BROWSER`
      - `MCP_ACCESS`
      - `NEW_TASK`
    - set context to `activePlaceholderWorkflowName: "pi-planning.md"` and `activePlaceholderWorkflowStepNumber: 4`
    - assert included ids:
      - `WORKFLOW_PROGRESS_REQUEST`
      - `ASK`
      - `SEND_USER_MESSAGE`
      - `ATTEMPT`
      - `BROWSER`
      - `MCP_ACCESS`
      - `NEW_TASK`
    - assert excluded ids:
      - `LIST_FILES`
      - `SEARCH`
      - `FILE_READ`
      - `FILE_READ_RANGE`
      - `APPLY_PATCH`
      - `FILE_NEW`
      - `SET_WORKFLOW_PLACEHOLDERS`
      - `PLAN_MODE`
  - Immediately after that, add a Step 5 test titled exactly:
    - `it("applies pi-planning step 5 row and keeps workflow_progress_request with document read and write bundles", () => { ... })`
  - For that Step 5 test:
    - use the same registered tool set as the Step 4 test
    - set context to `activePlaceholderWorkflowName: "pi-planning.md"` and `activePlaceholderWorkflowStepNumber: 5`
    - assert included ids:
      - `WORKFLOW_PROGRESS_REQUEST`
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
      - `SET_WORKFLOW_PLACEHOLDERS`
      - `PLAN_MODE`

- [x] Step 4: Extend integration coverage for `pi-planning.md` Steps 4 and 5 continuation prompts and native tool surfaces
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
  - In [integration.test.ts:668](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L668), keep the existing `create-prd` and `create-epics` continuation tests unchanged.
  - Immediately after the `create-epics` continuation test, add two continuation tests titled exactly:
    - `it("generates a continuation prompt for pi-planning step 4 with workflow_progress_request guidance", async function () { ... })`
    - `it("generates a continuation prompt for pi-planning step 5 with workflow_progress_request guidance", async function () { ... })`
  - For both continuation tests:
    - use the same `runPromptTest(...)` pattern and `"fast"` model id as the existing sibling tests
    - set:
      - `providerInfo.mode: "act"`
      - `isContinuationTurn: true`
      - `activeWorkflowSupportsPlaceholders: true`
      - `managedWorkflowActive: false`
      - `activePlaceholderWorkflowName: "pi-planning.md"`
    - set `activePlaceholderWorkflowStepNumber` to `4` or `5`
    - set `currentFocusChainChecklist` to a plausible single-item checklist string that names the active step
    - assert:
      - `systemPrompt` includes `workflow_progress_request`
      - `systemPrompt` includes `Do not include \`task_progress\``
      - `systemPrompt` includes `runtime-owned \`Yes\` branch completes the next checklist step before the next model request is built`
      - `systemPrompt` does not include `Once you correctly complete the current step, the next step's details will be shown automatically.`
      - `systemPrompt` does not include `use \`send_user_message\` tool call to briefly tell the user what step you are completing`
      - `systemPrompt` includes `` `workflow_progress_request` `` on the current-mode response-tools line
  - In [integration.test.ts:1298](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1298), keep the existing `pi-planning` Step 2 and Step 3 native-tool tests unchanged.
  - Immediately after the existing Step 3 native-tool test, add:
    - `it("filters native tools for pi-planning step 4", async function () { ... })`
    - `it("filters native tools for pi-planning step 5", async function () { ... })`
  - For both tests:
    - use the same native GPT test pattern as the existing `pi-planning` Step 2 and Step 3 tests:
      - `providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai")`
      - `enableNativeToolCalls: true`
      - `useMinimalGptPrompt: true`
      - `activeWorkflowSupportsPlaceholders: true`
      - `managedWorkflowActive: false`
      - `activePlaceholderWorkflowName: "pi-planning.md"`
    - set `activePlaceholderWorkflowStepNumber` to `4` or `5`
  - For the Step 4 native-tool test, assert included names:
    - `workflow_progress_request`
    - `attempt_completion`
    - `ask_followup_question`
    - `send_user_message`
  - For the Step 4 native-tool test, assert excluded names:
    - `list_files`
    - `search_files`
    - `read_file`
    - `read_file_range`
    - `apply_patch`
    - `set_workflow_placeholders`
    - `execute_command`
    - `generate_plan_output`
  - For the Step 5 native-tool test, assert included names:
    - `workflow_progress_request`
    - `attempt_completion`
    - `ask_followup_question`
    - `send_user_message`
    - `list_files`
    - `search_files`
    - `read_file`
    - `read_file_range`
    - `apply_patch`
  - For the Step 5 native-tool test, assert excluded names:
    - `set_workflow_placeholders`
    - `execute_command`
    - `generate_plan_output`
  - Do not update snapshots in this slice.

- [x] Step 5: Run verification and string-contract audit
  - Allowed files:
    - none
  - Run these commands in order, and stop on the first failure:
    1. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
    2. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
    3. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
    4. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`
    5. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts`
    6. `npx tsc --noEmit`
    7. `rg -n '"pi-planning.md"|WORKFLOW_PROGRESS_REQUEST|TARGET_EPIC_SELECT|EPIC_DELIVERY_SPEC_BUILD|workflow_progress_request|select_target_epic|build_epic_delivery_spec|apply_patch' src/core/prompts/system-prompt src/shared docs/workflow-automation/pi-planning`
  - Verification expectations:
    - no snapshot updates are required
    - no changes are allowed in [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1)
    - no changes are allowed in [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L62)
    - no changes are allowed in [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L14)
    - no changes are allowed in [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L17)
  - If any verification failure suggests one of those already-aligned helper/prompt files must change, stop and ask for input instead of expanding the slice automatically.
