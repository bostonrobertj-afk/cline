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

# Quick Dev Workflow Realignment Action Plan

## Scope Lock

This plan implements the combined workflow-progression and contextual-tool realignment slice defined in [workflow-realignment-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/quick-dev/workflow-realignment-requirements.md).

Live seam audit completed before authoring this plan:

- [TaskState.ts:31-41](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L31) currently does not include `quick-dev.md` in `DeterministicPlaceholderWorkflowName`.
- [deterministicPlaceholderProgression.ts:32-44](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L32) currently does not support `quick-dev.md` in `isDeterministicPlaceholderWorkflowSupported(...)`.
- [deterministicPlaceholderProgression.ts:796-878](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L796) shows the live `dev-story.md` execution-step pattern that must be mirrored for quick-dev Step 3, but no existing workflow currently has a hardened `git commit` deterministic gate.
- [ToolExecutor.ts:797-806](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L797) passes `toolParams: (block.params as Record<string, unknown>) ?? undefined` into deterministic progression, so the Step 4 detector must read `toolContext.toolParams.command`.
- [workflow-progress-request.ts:1-36](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1) currently has no `quick-dev.md` entry or normalization branch.
- [contextualToolMatrix.ts:374-380](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L374) still contains a stale 6-step `quick-dev.md` row.
- [contextual-tool-schema.md:589-596](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L589) still documents the same stale 6-step row.
- There are currently no `quick-dev.md`-specific progression or contextual-tool regression tests in:
  - [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts)
  - [task_progress.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts)
  - [response_tools.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts)
  - [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts)
  - [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts)

Approved exact string contracts for this slice:

- helper: `didSuccessfulGitCommitOccur`
- Step 1 reason: `spec_file resolves to an existing file path.`
- Step 3 reason: `The ### Tasks section contains no unchecked items.`
- Step 4 reason: `A git commit command was executed successfully for the commit step.`
- Step 5 reason: `attempt_completion was executed successfully for the final quick-dev closeout.`
- Step 4 command detector:
  - `toolName === "execute_command"`
  - `toolWasExecuted === true`
  - `toolParams.command` is a string
  - the command string starts with `git commit`, or includes `&& git commit`, or includes `; git commit`
  - `toolResult` is a string beginning with `Command executed successfully (exit code 0).`

## Steps

- [x] Step 1: Add deterministic workflow support for `quick-dev.md`
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
  - In [TaskState.ts:31-41](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L31), add `"quick-dev.md"` to the `DeterministicPlaceholderWorkflowName` union between the existing deterministic workflow names. Do not remove any existing workflow name.
  - In [deterministicPlaceholderProgression.ts:32-44](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L32), add `workflowName === "quick-dev.md"` to `isDeterministicPlaceholderWorkflowSupported(...)`.
  - In [deterministicPlaceholderProgression.ts:176-181](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L176), keep `sectionHasNoUncheckedChecklistItems(...)` unchanged and add a new helper immediately after it:
    ```ts
    function didSuccessfulGitCommitOccur(toolContext?: DeterministicPlaceholderToolContext): boolean {
    	if (toolContext?.toolName !== "execute_command" || toolContext.toolWasExecuted !== true) {
    		return false
    	}
    
    	const command = typeof toolContext.toolParams?.command === "string" ? toolContext.toolParams.command : undefined
    	if (!command) {
    		return false
    	}
    
    	return /(^|&&\s*|;\s*)git commit\b/.test(command)
    }
    ```
  - In [deterministicPlaceholderProgression.ts:970-1004](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L970), keep `evaluateQuickSpecStep(...)` unchanged.
  - Immediately after `evaluateQuickSpecStep(...)`, add a new `async function evaluateQuickDevStep(...)` with this exact behavior:
    - merge placeholders via `getMergedPlaceholderValues(args.taskState)`
    - trim `spec_file` into a local `specFile`
    - `case 1`:
      - require non-empty `specFile`
      - require `await fs.access(specFile)` to succeed
      - return reason exactly `spec_file resolves to an existing file path.`
    - `case 2`:
      - return `{ completed: false }`
    - `case 3`:
      - require non-empty `specFile`
      - read the file via `readFileIfExists(specFile)`
      - extract the `### Tasks` section via `extractMarkdownSection(specText, "### Tasks")`
      - require the section to exist
      - require the section to contain at least one checklist item using the same regex pattern used by `evaluateDevStoryStep(...)`
      - require `sectionHasNoUncheckedChecklistItems(tasksSection)` to be true
      - return reason exactly `The ### Tasks section contains no unchecked items.`
    - `case 4`:
      - require `didSuccessfulGitCommitOccur(args.toolContext)`
      - return reason exactly `A git commit command was executed successfully for the commit step.`
    - `case 5`:
      - require `didSuccessfulAttemptCompletionOccur(args.toolContext)`
      - return reason exactly `attempt_completion was executed successfully for the final quick-dev closeout.`
    - `default`:
      - return `{ completed: false }`
  - In [deterministicPlaceholderProgression.ts:1234-1261](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L1234), insert a new dispatch branch between `quick-spec.md` and `create-story.md`:
    ```ts
    if (args.workflowName === "quick-dev.md") {
    	return evaluateQuickDevStep({
    		taskState: args.taskState,
    		stepNumber: args.stepNumber,
    		toolContext: args.toolContext,
    	})
    }
    ```
  - Do not change any existing evaluator reason strings outside the new quick-dev branch.

- [x] Step 2: Add shared `workflow_progress_request` support for `quick-dev.md` Step 2 only
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/shared/workflow-progress-request.ts`
  - In [workflow-progress-request.ts:1-7](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1), add:
    ```ts
    "quick-dev.md": [2],
    ```
    between the existing `create-story.md` and `quick-spec.md` entries.
  - In [workflow-progress-request.ts:20-35](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L20), add a normalization branch immediately before the existing `quick-spec.md` branch:
    ```ts
    if (normalized === "quick-dev.md" || normalized === "quick-dev") {
    	return "quick-dev.md"
    }
    ```
  - Do not change `WORKFLOW_PROGRESS_REQUEST_QUESTION`.
  - Do not change `WORKFLOW_PROGRESS_REQUEST_OPTIONS`.

- [x] Step 3: Replace the stale `quick-dev.md` contextual-tool row and update the canonical schema doc
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/contextual-tool-schema.md`
  - In [contextualToolMatrix.ts:374-380](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L374), replace the current `quick-dev.md` row:
    ```ts
    "quick-dev.md": {
    	1: ["DOC_READ", "LOCAL_EXEC"],
    	2: ["CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"],
    	3: ["CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC"],
    	4: ["DOC_READ", "DOC_WRITE"],
    	5: ["DOC_READ", "LOCAL_EXEC", "SUBAGENT_COORD"],
    	6: ["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC"],
    },
    ```
    with:
    ```ts
    "quick-dev.md": {
    	1: ["PLACEHOLDER_WRITE"],
    	2: ["DOC_READ", "DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
    	3: ["DOC_READ", "DOC_WRITE", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "LOCAL_EXEC"],
    	4: ["LOCAL_EXEC"],
    	5: [],
    },
    ```
  - Do not edit the adjacent `quick-dev-new-preview.md` row.
  - In [contextual-tool-schema.md:589-596](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L589), replace the existing `quick-dev.md` doc block with:
    ```md
    ### quick-dev.md
    
    - Step 1: `PLACEHOLDER_WRITE`
    - Step 2: `DOC_READ`, `DOC_WRITE`, `WORKFLOW_PROGRESS_REQUEST`
    - Step 3: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `LOCAL_EXEC`
    - Step 4: `LOCAL_EXEC`
    - Step 5: no additional tools
    ```
  - Do not change any other workflow section in `contextual-tool-schema.md`.

- [x] Step 4: Add deterministic progression regression coverage for `quick-dev.md`
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md`
  - In [deterministicPlaceholderProgression.test.ts:45-61](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L45), add:
    ```ts
    expect(isDeterministicPlaceholderWorkflowSupported("quick-dev.md")).to.equal(true)
    expect(isDeterministicPlaceholderWorkflowSupported("quick-dev")).to.equal(false)
    ```
    alongside the existing supported-workflow assertions.
  - Immediately after the existing `dev-story.md` tests at [deterministicPlaceholderProgression.test.ts:1795-1818](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L1795), add a new `describe("quick-dev.md", () => { ... })` block with these tests titled exactly:
    - `it("completes quick-dev step 1 when spec_file resolves to an existing file", async () => { ... })`
    - `it("does not complete quick-dev step 1 when spec_file is missing", async () => { ... })`
    - `it("does not complete quick-dev step 1 when spec_file points to a missing file", async () => { ... })`
    - `it("completes quick-dev step 3 when the ### Tasks section has only checked items", async () => { ... })`
    - `it("does not complete quick-dev step 3 when the ### Tasks section has an unchecked nested item", async () => { ... })`
    - `it("ignores checklist items outside the ### Tasks section for quick-dev step 3", async () => { ... })`
    - `it("completes quick-dev step 4 from successful execute_command tool context running git commit", async () => { ... })`
    - `it("does not complete quick-dev step 4 when execute_command runs a non-commit command", async () => { ... })`
    - `it("does not complete quick-dev step 4 when execute_command was not executed", async () => { ... })`
    - `it("completes quick-dev step 5 from successful attempt_completion tool context", async () => { ... })`
    - `it("does not complete quick-dev step 5 when attempt_completion was not executed", async () => { ... })`
  - Use the same `createTaskState(...)`, `getChecklistMarkdown(...)`, `writeFileWithMtime(...)`, and `fs.mkdtemp(...)` helpers already used by the neighboring deterministic tests.
  - For the Step 3 success fixture, write a spec file containing:
    ```md
    # Tech-Spec: Quick Dev Work
    
    ## Implementation Plan
    
    ### Tasks
    - [x] Main task
      - [x] Nested task
    
    ## Latest Review Findings
    None.
    ```
  - For the Step 3 outside-section negative fixture, keep `### Tasks` with at least one checked item and put an unchecked checklist item under a different heading such as `## Later Work`; assert the step still completes.
  - For the Step 4 success fixture, use:
    ```ts
    toolContext: {
    	toolName: "execute_command",
    	toolParams: { command: "cd /repo && git commit -m \"quick dev closeout\"" },
    	toolResult: "[execute_command for 'cd /repo && git commit -m \"quick dev closeout\"'] Result:\n[done]",
    	toolWasExecuted: true,
    }
    ```
  - For the Step 4 non-commit negative fixture, change `toolParams.command` to `cd /repo && git status`.
  - Assert the exact reason strings approved in Scope Lock for Steps 1, 3, 4, and 5.
  - In [deterministic-workflow-progression-readme.md:73-76](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L73), add `quick-dev.md` to the supported deterministic workflow list immediately before `quick-spec.md`.
  - In [deterministic-workflow-progression-readme.md:154-204](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L154), add a new `quick-dev.md` bullet block after the `create-story.md` block describing:
    - Step 1 existing `spec_file`
    - Step 2 `workflow_progress_request`
    - Step 3 `### Tasks` section with no unchecked items
    - Step 4 successful `git commit`
    - Step 5 successful `attempt_completion`
  - In [deterministic-workflow-progression-readme.md:195-222](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L195), add quick-dev example bullets immediately before the existing `quick-spec.md` examples and before the existing `dev-story.md` examples, matching the exact quick-dev contract above.

- [x] Step 5: Add prompt-teaching and contextual-native-tool regression coverage for `quick-dev.md`
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
  - In [spec.test.ts:463-540](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L463), rename the existing workflow-progress gating test title to:
    - `it("gates workflow_progress_request to create-prd steps 3 through 14, create-story steps 3 and 4, quick-dev step 2, quick-spec steps 3 through 9, create-epics step 3, and pi-planning steps 4 and 5", () => { ... })`
  - In that same test, insert assertions for:
    - `quick-dev.md` Step 2 -> `true`
    - `quick-dev.md` Step 1 -> `false`
    - `quick-dev.md` Step 3 -> `false`
  - In [task_progress.test.ts:179-207](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts#L179), add two tests immediately before the existing quick-spec tests:
    - `it("teaches workflow_progress_request for quick-dev step 2", async () => { ... })`
    - `it("does not teach workflow_progress_request for quick-dev step 3", async () => { ... })`
  - For the Step 2 task-progress test, assert:
    - `progress` contains `workflow_progress_request`
    - `progress` does not contain `send_user_message`
    - `progress` contains `Do not include \`task_progress\` on \`workflow_progress_request\``
  - For the Step 3 task-progress test, assert:
    - `progress` does not contain `workflow_progress_request`
    - `progress` does not contain `Do not include \`task_progress\` on \`workflow_progress_request\``
  - In [response_tools.test.ts:144-173](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts#L144), add a new `describe("quick-dev response tools prompt helpers", ...)` block immediately before the existing quick-spec block.
  - Add two tests in that block:
    - `it("includes workflow_progress_request in response tools for quick-dev step 2", () => { ... })`
    - `it("omits workflow_progress_request from response tools for unsupported quick-dev step 3", () => { ... })`
  - Use the existing `createStoryBaseContext` pattern with `activePlaceholderWorkflowName: "quick-dev.md"`.
  - In [contextualNativeToolFilter.test.ts:35-82](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L35), add a new canonical row test immediately after the existing quick-spec row test:
    ```ts
    it("defines the canonical quick-dev 5-step row", () => {
    	expect(PLACEHOLDER_WORKFLOW_STEP_MATRIX["quick-dev.md"]).to.deep.equal({
    		1: ["PLACEHOLDER_WRITE"],
    		2: ["DOC_READ", "DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
    		3: ["DOC_READ", "DOC_WRITE", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "LOCAL_EXEC"],
    		4: ["LOCAL_EXEC"],
    		5: [],
    	})
    })
    ```
  - In the same file, add four focused quick-dev native-filter tests after the existing quick-spec Step 2 test at [contextualNativeToolFilter.test.ts:540-583](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L540):
    - `it("applies quick-dev step 1 row and keeps only placeholder-write among workflow-specific bundles", () => { ... })`
    - `it("applies quick-dev step 2 row and keeps workflow_progress_request with document read and write bundles", () => { ... })`
    - `it("applies quick-dev step 4 row and keeps only local-exec among workflow-specific bundles", () => { ... })`
    - `it("applies quick-dev step 5 row with no workflow-specific native bundles", () => { ... })`
  - Use the same registered built-ins pattern as the neighboring tests and assert:
    - Step 1 includes `SET_WORKFLOW_PLACEHOLDERS` and excludes `BASH`, `WORKFLOW_PROGRESS_REQUEST`, doc read/write bundles, and code-read bundles
    - Step 2 includes `LIST_FILES`, `SEARCH`, `FILE_READ`, `FILE_READ_RANGE`, `APPLY_PATCH`, `FILE_NEW`, `WORKFLOW_PROGRESS_REQUEST`; excludes `BASH`, `SET_WORKFLOW_PLACEHOLDERS`, `LIST_CODE_DEF`
    - Step 4 includes `BASH`; excludes `SET_WORKFLOW_PLACEHOLDERS`, `WORKFLOW_PROGRESS_REQUEST`, `LIST_FILES`, `FILE_READ`, `APPLY_PATCH`, `FILE_NEW`
    - Step 5 excludes all workflow-specific native bundles and keeps only response tools plus always-preserved native tools
  - In [integration.test.ts:867-909](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L867), insert two continuation tests immediately before the existing quick-spec continuation tests:
    - `it("generates a continuation prompt for quick-dev step 2 with workflow_progress_request guidance", async function () { ... })`
    - `it("does not generate workflow_progress_request guidance for quick-dev step 3", async function () { ... })`
  - For the Step 2 continuation test, assert:
    - `systemPrompt` includes `workflow_progress_request`
    - `systemPrompt` includes `Do not include \`task_progress\``
    - `systemPrompt` includes `runtime-owned \`Yes\` branch completes the next checklist step before the next model request is built`
  - For the Step 3 continuation test, assert:
    - `systemPrompt` does not include `workflow_progress_request`
    - `systemPrompt` does not include `Do not include \`task_progress\``
  - In [integration.test.ts:1672-1696](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1672), add four quick-dev native-tool tests immediately before the existing quick-spec Step 2 native-tool test:
    - `it("filters native tools for quick-dev step 1", async function () { ... })`
    - `it("filters native tools for quick-dev step 2", async function () { ... })`
    - `it("filters native tools for quick-dev step 4", async function () { ... })`
    - `it("filters native tools for quick-dev step 5", async function () { ... })`
  - For those native-tool tests, use the same `runPromptTest(...)` GPT-5 native-tool pattern as the neighboring quick-spec test and assert:
    - Step 1 includes `set_workflow_placeholders`, excludes `read_file`, `apply_patch`, `execute_command`, `workflow_progress_request`
    - Step 2 includes `read_file`, `read_file_range`, `search_files`, `apply_patch`, `workflow_progress_request`; excludes `execute_command`, `set_workflow_placeholders`, `list_code_definition_names`
    - Step 4 includes `execute_command`; excludes `read_file`, `apply_patch`, `workflow_progress_request`, `set_workflow_placeholders`
    - Step 5 excludes `execute_command`, `read_file`, `apply_patch`, `workflow_progress_request`, and `set_workflow_placeholders`

- [x] Step 6: Run the prescribed verification commands
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/shared/workflow-progress-request.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/contextual-tool-schema.md`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md`
  - Run exactly:
    - `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
    - `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/prompts/system-prompt/__tests__/task_progress.test.ts src/core/prompts/system-prompt/__tests__/response_tools.test.ts src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`
    - `npx tsc --noEmit`
    - `rg -n "quick-dev\\.md|The ### Tasks section contains no unchecked items\\.|A git commit command was executed successfully for the commit step\\.|attempt_completion was executed successfully for the final quick-dev closeout\\.|spec_file resolves to an existing file path\\." src docs`
  - If any command fails, stop and report the failure before making any unplanned edits.

## Remediation Addendum

- [x] Remediation Step 1: Fix the quick-dev Step 3 section-boundary bug and complete the missing deterministic coverage
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md`
  - In [deterministicPlaceholderProgression.ts:1034-1063](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L1034), stop using the trimmed raw `spec_file` value directly for filesystem access and file reads.
  - Update quick-dev Step 1 and Step 3 so they:
    - trim `spec_file`
    - resolve it through `resolveArtifactPlaceholderPath(placeholders, specFile)` into a local resolved path before any filesystem access
    - use the resolved path for `fs.access(...)` in Step 1
    - use the resolved path for `readFileIfExists(...)` in Step 3
  - Keep the Step 1 completion reason exactly:
    - `spec_file resolves to an existing file path.`
  - In [deterministicPlaceholderProgression.ts:1055-1081](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L1055), do not keep the quick-dev Step 3 evaluator on the generic `extractMarkdownSection(specText, "### Tasks")` path.
  - Replace only the `const tasksSection = ...` logic in quick-dev Step 3 with a quick-dev-specific extraction block that:
    - finds the exact `### Tasks` heading
    - starts the section immediately after that heading
    - stops at the next sibling-or-higher heading, meaning the next line matching either `^###\s+` or `^##\s+`
    - trims the resulting section before checklist checks
  - Do not change the existing generic `extractMarkdownSection(...)` helper in this remediation.
  - Keep the Step 3 completion reason exactly:
    - `The ### Tasks section contains no unchecked items.`
  - In [deterministicPlaceholderProgression.test.ts:1979-2005](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L1979), replace the current outside-section quick-dev Step 3 test fixture so it proves the missing requirement exactly:
    - keep the title `it("does not complete quick-dev step 3 when checklist items exist only outside the ### Tasks section", async () => { ... })`
    - the fixture must contain a `### Tasks` heading with no checklist items inside it
    - place an unchecked checklist item under a later `## Later Work` heading
    - assert the checklist remains incomplete
  - Immediately after that test, add a second quick-dev Step 3 test titled exactly:
    - `it("ignores unchecked checklist items under a sibling ### heading after ### Tasks for quick-dev step 3", async () => { ... })`
  - For that sibling-heading fixture:
    - keep `### Tasks` with at least one checked checklist item
    - add a later sibling heading under the same `## Implementation Plan` section, for example `### Notes`
    - put an unchecked checklist item under `### Notes`
    - assert quick-dev Step 3 still completes
  - Immediately after the existing quick-dev Step 1 success test, add a new relative-path Step 1 test titled exactly:
    - `it("completes quick-dev step 1 when spec_file is a stable relative path that resolves from workflow cwd", async () => { ... })`
  - For that Step 1 relative-path fixture:
    - create a real spec file under a temp directory
    - set `stablePlaceholderValues.cwd` and `stablePlaceholderValues.project_root` to that temp directory
    - set `placeholderValues.spec_file` to a relative path such as `specs/tech-spec.md`
    - change `process.cwd()` to a different temporary directory before calling `applyDeterministicPlaceholderProgression(...)`
    - restore the original cwd in `finally`
    - assert Step 1 completes with the exact reason `spec_file resolves to an existing file path.`
  - Immediately after the existing quick-dev Step 3 success test, add a new relative-path Step 3 test titled exactly:
    - `it("completes quick-dev step 3 when spec_file is a stable relative path that resolves from workflow cwd", async () => { ... })`
  - For that Step 3 relative-path fixture:
    - use the same relative-path setup pattern as the Step 1 relative-path test
    - populate the resolved file with a valid `### Tasks` section containing only checked items
    - assert Step 3 completes with the exact reason `The ### Tasks section contains no unchecked items.`
  - Do not change the existing `dev-story.md` tests.
  - In [deterministic-workflow-progression-readme.md:124-126](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L124), keep the quick-dev resolved-path description aligned with the implementation after the changes above. Do not broaden the documented quick-dev contract beyond the approved requirements.

- [x] Remediation Step 2: Add the remaining quick-dev prompt/native/doc-alignment coverage and rerun verification
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/contextual-tool-schema.md`
  - In [spec.test.ts:463-540](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L463), extend the existing quick-dev assertions so they explicitly prove:
    - `quick-dev.md` Step 4 -> `false`
    - `quick-dev.md` Step 5 -> `false`
  - In [task_progress.test.ts:179-208](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts#L179), keep the existing Step 2 positive and Step 3 negative tests unchanged, then add:
    - `it("does not teach workflow_progress_request for quick-dev step 4", async () => { ... })`
    - `it("does not teach workflow_progress_request for quick-dev step 5", async () => { ... })`
  - In [response_tools.test.ts:144-173](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts#L144), keep the existing Step 2 positive and Step 3 negative tests unchanged, then add:
    - `it("omits workflow_progress_request from response tools for unsupported quick-dev step 4", () => { ... })`
    - `it("omits workflow_progress_request from response tools for unsupported quick-dev step 5", () => { ... })`
  - In [integration.test.ts:867-910](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L867), keep the existing Step 2 positive and Step 3 negative continuation tests unchanged, then add:
    - `it("does not generate workflow_progress_request guidance for quick-dev step 4", async function () { ... })`
    - `it("does not generate workflow_progress_request guidance for quick-dev step 5", async function () { ... })`
  - In [contextualNativeToolFilter.test.ts:646-760](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L646), add a missing quick-dev Step 3 native-filter test titled exactly:
    - `it("applies quick-dev step 3 row and keeps document, code-read, Indxr, and local-exec bundles without workflow_progress_request or placeholder-write", () => { ... })`
  - For that Step 3 filter test:
    - use the same registered built-ins pattern as the neighboring quick-dev filter tests
    - include `LIST_FILES`, `SEARCH`, `LIST_CODE_DEF`, `FILE_READ`, `FILE_READ_RANGE`, `APPLY_PATCH`, `FILE_NEW`, `BASH`, `WORKFLOW_PROGRESS_REQUEST`, `SET_WORKFLOW_PLACEHOLDERS`, response tools, and always-preserved tools
    - include Indxr MCP tools for discovery, source read, and symbol graph
    - assert included ids:
      - `LIST_FILES`
      - `SEARCH`
      - `LIST_CODE_DEF`
      - `FILE_READ`
      - `FILE_READ_RANGE`
      - `APPLY_PATCH`
      - `FILE_NEW`
      - `BASH`
      - response tools
      - always-preserved native tools
    - assert excluded ids:
      - `WORKFLOW_PROGRESS_REQUEST`
      - `SET_WORKFLOW_PLACEHOLDERS`
    - assert kept MCP names include at least one discovery tool, one source-read tool, and one symbol-graph tool
  - In [integration.test.ts:1717-1775](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1717), add a missing quick-dev Step 3 native-tool test titled exactly:
    - `it("filters native tools for quick-dev step 3", async function () { ... })`
  - For that Step 3 integration test:
    - use the same GPT-5 native-tool test pattern as the neighboring quick-dev native-tool tests
    - include `mcpHub: makeMcpHub([makeIndxrServer()])` in the test context so Indxr-native tools are actually available to the prompt runtime
    - assert included names:
      - `read_file`
      - `read_file_range`
      - `search_files`
      - `list_code_definition_names`
      - `apply_patch`
      - `execute_command`
      - `attempt_completion`
    - assert excluded names:
      - `workflow_progress_request`
      - `set_workflow_placeholders`
    - assert at least one native tool name starts with `indxr-`
  - In [contextualNativeToolFilter.test.ts:84-92](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L84), immediately after the canonical quick-dev row test, add a doc-alignment test titled exactly:
    - `it("keeps the canonical quick-dev docs block aligned with the runtime matrix row", () => { ... })`
  - In that new doc-alignment test:
    - add `import fs from "fs"` and `import path from "path"` at the top of the file if they are not already present
    - read `/Users/robertboston/Documents/Cline Extension/cline/docs/contextual-tool-schema.md`
    - assert the file contains this exact quick-dev block:
      ```md
      ### quick-dev.md

      - Step 1: `PLACEHOLDER_WRITE`
      - Step 2: `DOC_READ`, `DOC_WRITE`, `WORKFLOW_PROGRESS_REQUEST`
      - Step 3: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `LOCAL_EXEC`
      - Step 4: `LOCAL_EXEC`
      - Step 5: no additional tools
      ```
  - After making the remediation edits above, rerun exactly:
    - `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
    - `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/prompts/system-prompt/__tests__/task_progress.test.ts src/core/prompts/system-prompt/__tests__/response_tools.test.ts src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`
    - `npx tsc --noEmit`
  - If any remediation command fails, stop and report the failure before making any additional unplanned edits.

- [ ] Remediation Step 3: Tighten the quick-dev Step 4 git-commit success gate and add failed-commit coverage
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
  - In [deterministicPlaceholderProgression.ts:176-199](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L176), update `didSuccessfulGitCommitOccur(...)` so it proves both:
    - the executed command is a `git commit` invocation under the approved command-pattern rules
    - the command result is a successful shell completion
  - Keep the existing command-shape checks:
    - `toolName === "execute_command"`
    - `toolWasExecuted === true`
    - `toolParams.command` is a string
    - command starts with `git commit`, or includes `&& git commit`, or includes `; git commit`
  - Add the success check using the real command-execution status string from [CommandOrchestrator.ts:589-604](/Users/robertboston/Documents/Cline%20Extension/cline/src/integrations/terminal/CommandOrchestrator.ts#L589):
    - require `typeof toolContext.toolResult === "string"`
    - require `toolContext.toolResult.startsWith("Command executed successfully (exit code 0).")`
  - Do not broaden this remediation into a new shared command-result schema.
  - Keep the Step 4 completion reason exactly:
    - `A git commit command was executed successfully for the commit step.`
  - In [deterministicPlaceholderProgression.test.ts:2162-2225](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L2162), update the existing quick-dev Step 4 test fixtures so the success and non-commit cases use the real command-status prefix:
    - success fixture `toolResult` must begin with:
      - `Command executed successfully (exit code 0).`
    - non-commit fixture `toolResult` must begin with:
      - `Command executed successfully (exit code 0).`
  - Immediately after the existing non-commit quick-dev Step 4 test, add a new test titled exactly:
    - `it("does not complete quick-dev step 4 when git commit returns a failed command result", async () => { ... })`
  - For that failed-commit fixture:
    - use `toolName: "execute_command"`
    - use `toolWasExecuted: true`
    - use `toolParams.command: 'cd /repo && git commit -m "quick dev closeout"'`
    - use `toolResult` beginning with:
      - `Command failed with exit code 1.`
    - include representative output such as:
      - `Output:\nnothing to commit, working tree clean`
    - assert the checklist remains incomplete
    - assert no auto-completed notice is added
  - After making the Step 4 success-gate changes above, rerun exactly:
    - `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
    - `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/prompts/system-prompt/__tests__/task_progress.test.ts src/core/prompts/system-prompt/__tests__/response_tools.test.ts src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`
    - `npx tsc --noEmit`
  - If any command fails, stop and report the failure before making any additional unplanned edits.
