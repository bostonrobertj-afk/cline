---
title: Create Epics Per-Step Progression Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/generated-file/doc change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - This plan implements only the Step 2 deterministic transition and Step 3 workflow_progress_request progression requirements added to `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/write-epics/deterministic-progression-requirements.md`.
  - Do not modify `/Users/robertboston/Documents/Cline/Workflows/create-epics.md`, workflow-form code, or any earlier action-plan documents while executing this plan.
  - Treat prompt guidance as subordinate to step-level tool exposure: if `workflow_progress_request` is exposed for the current workflow step, the prompt must teach it even when the workflow is otherwise deterministic.
---

# Create Epics Per-Step Progression Action Plan

This plan implements the new per-step progression requirements appended to:

- [deterministic-progression-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/deterministic-progression-requirements.md)

Relevant runtime seams already verified for this plan:

- Step 2 execution is owned by [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L165).
- Step 2 and Step 3 transitions flow through [updatePlaceholderWorkflowProgressAndMaybeRunCompletion(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1483), [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts#L42), and the governed response-tool continuation path in [responseToolTurnFlow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/responseToolTurnFlow.test.ts#L231).
- `workflow_progress_request` is currently hardcoded to `create-prd` in [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1), [WorkflowProgressRequestToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts#L47), [workflow_progress_request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts#L12), and [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L482).
- `create-epics.md` Step 3 currently lacks `WORKFLOW_PROGRESS_REQUEST` in [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L179).
- Prompt guidance currently suppresses `workflow_progress_request` whenever `activeDeterministicPlaceholderWorkflowEnabled === true` in [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L62) and [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L14).

Locked decisions for this pass:

- Step 1 behavior remains unchanged.
- `create-epics.md` Step 2 becomes deterministically completable.
- `create-epics.md` Step 3 remains model-driven for content creation, but uses `workflow_progress_request` for transition confirmation.
- `workflow_progress_request` remains parameterless and keeps the exact runtime-owned question and `Yes` / `No` options.
- A Step 3 `Yes` on `create-epics.md` must still be carried back to the model through the normal governed response-tool continuation path even if workflow-completion bookkeeping and placeholder-workflow teardown run first.
- The Step 3 prompt should teach `workflow_progress_request` because the current-step contextual tool exposure permits it; no deterministic-workflow prompt short-circuit is allowed to hide that guidance.

## Step 1
[x] Generalize the shared `workflow_progress_request` contract from `create-prd`-only to the exact supported workflow/step set required by this pass.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/workflow-progress-request.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts`

Exact edits:
1. In [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1-L34), replace the single-workflow constants with one exported exact mapping named `WORKFLOW_PROGRESS_REQUEST_WORKFLOW_STEPS` whose value is exactly:
   - `"create-prd.md": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]`
   - `"create-epics.md": [3]`
2. In that same file, keep `WORKFLOW_PROGRESS_REQUEST_QUESTION` and `WORKFLOW_PROGRESS_REQUEST_OPTIONS` unchanged.
3. In that same file, insert a local helper named exactly `normalizeWorkflowProgressRequestWorkflowName(workflowName?: string)` directly below the options constant.
4. `normalizeWorkflowProgressRequestWorkflowName(...)` must:
   - normalize slashes with `replaceAll("\\", "/")`
   - take the basename with `split("/").at(-1)`
   - trim and lowercase the result
   - return exactly `"create-prd.md"` for either `create-prd.md` or `create-prd`
   - return exactly `"create-epics.md"` for either `create-epics.md` or `create-epics`
   - return `undefined` for any other value
5. Update `isWorkflowProgressRequestWorkflowName(...)` to return `normalizeWorkflowProgressRequestWorkflowName(workflowName) !== undefined`.
6. Change `isWorkflowProgressRequestStep(...)` so its signature becomes exactly `(workflowName?: string, stepNumber?: number): boolean`, and make it:
   - normalize the workflow name with `normalizeWorkflowProgressRequestWorkflowName(...)`
   - return `false` if the normalized workflow name is `undefined`
   - return `false` if `stepNumber` is `undefined`
   - otherwise read the allowed step list into a local named exactly `allowedSteps` typed exactly `readonly number[]` from `WORKFLOW_PROGRESS_REQUEST_WORKFLOW_STEPS[normalizedWorkflowName]`
   - return `allowedSteps.includes(stepNumber)`
7. Update `shouldExposeWorkflowProgressRequest(...)` to call `isWorkflowProgressRequestStep(workflowName, stepNumber)` instead of the old step-only helper.
8. In [WorkflowProgressRequestToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts#L47-L50), keep the runtime validation seam exactly where it is, but replace the unsupported-workflow error string with:
   - `workflow_progress_request can only be used during an active supported placeholder workflow step.`
9. In [workflow_progress_request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts#L12-L19), replace the tool description string with this exact text:
   - `Ask the user to confirm whether the active supported placeholder-workflow step is ready to advance. The runtime owns the exact Yes/No prompt and option labels. On success, this tool displays the runtime-owned prompt, returns \`[Message displayed.]\`, and ends your current turn. If the user selects \`Yes\`, the runtime completes the next placeholder-workflow step before the next model request is built. If the user selects \`No\`, the workflow does not advance and the user's reply arrives on the following turn as normal human-authored input.`
10. In [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L482-L483), replace the compact description string with this exact text:
    - `Ask whether the user is ready to move to the next supported workflow step. The runtime owns the Yes/No prompt, and the Yes branch advances the focus chain before the next request is built.`
11. In [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L7-L9), replace the `workflow_progress_request` bullet text with this exact line:
    - `- \`workflow_progress_request\`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing`
12. Do not change the runtime-owned question text, option labels, response-tool metadata, or continuation queueing behavior in this step.

## Step 2
[x] Expose `workflow_progress_request` for `create-epics.md` Step 3 and make the prompt teach it whenever that current-step exposure is active.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts`

Exact edits:
1. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L179-L184), replace the `create-epics.md` Step 3 row with exactly:
   - `3: ["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE", "WORKFLOW_PROGRESS_REQUEST"],`
2. Leave the `create-epics.md` Step 4 and Step 5 rows unchanged.
3. In [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L62-L74), reorder the two branches so `shouldExposeWorkflowProgressRequest(...)` is checked before the `activeDeterministicPlaceholderWorkflowEnabled === true` early return.
4. Do not change the existing `UPDATING_TASK_PROGRESS_WORKFLOW_PROGRESS_REQUEST` string literal in [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L32-L38).
5. In [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L13-L29), reorder the branches inside `getFocusChainReminderLine(...)` so `shouldExposeWorkflowProgressRequest(...)` is checked before `context.activeDeterministicPlaceholderWorkflowEnabled === true`.
6. Do not change the `workflow_progress_request` continuation reminder string literal in [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L25).
7. Do not add any new prompt heuristics keyed on workflow name. The only prompt-selection gate for this tool must be `shouldExposeWorkflowProgressRequest(...)`.

## Step 3
[x] Add the deterministic `create-epics.md` Step 2 completion rule to the shared progression runtime.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`

Exact edits:
1. In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L111-L118), insert a new helper directly below `resolveOutputFolderFile(...)` named exactly `getCreateEpicsCanonicalArtifactPath(placeholders: Record<string, string>): string | undefined`.
2. `getCreateEpicsCanonicalArtifactPath(...)` must:
   - read `placeholders.output_folder?.trim()`
   - return `undefined` if `output_folder` is absent or empty
   - otherwise build `path.join(outputFolder, "planning_artifacts", "epics.md")`
   - resolve that path through the existing `resolveArtifactPlaceholderPath(placeholders, ...)` helper before returning it
3. In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L656-L685), extend `evaluateCreateEpicsStep(...)` so it also trims `output_file` into a local named exactly `outputFile`.
4. Keep the existing Step 1 case completely unchanged.
5. Add a new `case 2` in `evaluateCreateEpicsStep(...)`.
6. `case 2` must:
   - return `{ completed: false }` when `mode` is missing or empty
   - return `{ completed: false }` when `mode` is neither `"new"` nor `"continue"`
   - compute `canonicalArtifactPath` via `getCreateEpicsCanonicalArtifactPath(placeholders)`
   - return `{ completed: false }` when `canonicalArtifactPath` is `undefined`
   - compute `resolvedOutputFilePath` by passing `outputFile` through `resolveArtifactPlaceholderPath(placeholders, outputFile)` when `outputFile` exists
   - return `{ completed: false }` when `resolvedOutputFilePath` is absent or does not match `canonicalArtifactPath` under the existing `arePathsEqual(...)` helper
7. For `mode === "new"`, `case 2` must additionally:
   - return `{ completed: false }` when `taskStateHasPlaceholderWorkflowWriteProof(args.taskState, canonicalArtifactPath)` is `false`
   - return `{ completed: false }` when `fileExistsForPlaceholderWorkflowWriteProof(canonicalArtifactPath)` resolves `false`
   - otherwise return exactly:
     - `completed: true`
     - `reason: "The canonical epics artifact was written in this task and persisted as output_file."`
8. For `mode === "continue"`, `case 2` must:
   - return `{ completed: false }` when `fileExistsForPlaceholderWorkflowWriteProof(canonicalArtifactPath)` resolves `false`
   - otherwise return exactly:
     - `completed: true`
     - `reason: "The canonical epics artifact already existed and was persisted as output_file."`
9. Do not add any deterministic Step 3 branch for `create-epics.md`.
10. Do not modify any other workflow evaluator, deterministic state shape, or placeholder mutation path in this step.

## Step 4
[x] Add focused deterministic-progression coverage for the new `create-epics.md` Step 2 rule.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`

Exact edits:
1. In [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L2482-L2515), keep the existing Step 1 chaining regression unchanged.
2. Immediately after that existing Step 1 chaining regression and before the unsupported-workflow test, add six new Step 2 tests.
3. Add a positive `mode=new` test titled exactly:
   - `completes create-epics step 2 when the canonical epics artifact exists with a current-task write proof and output_file matches`
4. In that `mode=new` test:
   - create a temp directory with `fs.mkdtemp(path.join(os.tmpdir(), ...))`
   - set `outputFolder = path.join(tempDir, "output")`
   - set `artifactPath = path.join(outputFolder, "planning_artifacts", "epics.md")`
   - use `workflowName: "create-epics.md"`
   - use workflow contents with these exact headings:
     - `## Step 2: (System-Owned) Build the requirements inventory`
     - `## Step 3: Define the Epics`
   - use checklist markdown exactly:
     - `- [ ] Step 2: (System-Owned) Build the requirements inventory`
     - `- [ ] Step 3: Define the Epics`
   - set `stablePlaceholderValues` to exactly:
     - `cwd: tempDir`
     - `project_root: tempDir`
     - `output_folder: outputFolder`
   - set `placeholderValues` to exactly:
     - `mode: "new"`
     - `output_file: artifactPath`
   - write the artifact to disk with the existing file helper pattern
   - record the current-task write proof with the existing `recordTaskWriteProof(taskState, artifactPath)` helper
   - assert the resulting checklist is exactly:
     - `- [x] Step 2: (System-Owned) Build the requirements inventory`
     - `- [ ] Step 3: Define the Epics`
   - assert the last notice reason is exactly:
     - `The canonical epics artifact was written in this task and persisted as output_file.`
5. Add a positive `mode=continue` test titled exactly:
   - `completes create-epics step 2 when the canonical epics artifact already exists and output_file matches`
6. That `mode=continue` test must mirror the temp-dir layout above, but:
   - set `placeholderValues` to exactly:
     - `mode: "continue"`
     - `output_file: artifactPath`
   - do not record a task write proof
   - keep the expected checklist advancement to Step 3
   - assert the last notice reason is exactly:
     - `The canonical epics artifact already existed and was persisted as output_file.`
7. Add four negative tests with these exact titles:
   - `does not complete create-epics step 2 when the canonical epics artifact is missing`
   - `does not complete create-epics step 2 when output_file is missing`
   - `does not complete create-epics step 2 when output_file does not match the canonical epics artifact`
   - `does not complete create-epics step 2 for mode=new when the current-task write proof is missing`
8. In each negative Step 2 test:
   - use the same Step 2 / Step 3 headings and checklist labels as the positive tests
   - keep `workflowName: "create-epics.md"`
   - keep `stablePlaceholderValues.cwd`, `project_root`, and `output_folder` aligned to the temp directory
   - vary only the missing runtime fact named in the test title
   - assert the checklist remains exactly:
     - `- [ ] Step 2: (System-Owned) Build the requirements inventory`
     - `- [ ] Step 3: Define the Epics`
   - assert `taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices` is exactly `[]`

## Step 5
[x] Add the Step 3 prompt, tool-filter, handler, and continuation regressions required by the new `workflow_progress_request` contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/responseToolTurnFlow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits:
1. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L355-L379), rename the gating test to exactly:
   - `gates workflow_progress_request to create-prd steps 3 through 14 and create-epics step 3`
2. In that spec test, keep the existing `create-prd.md` Step 3 and Step 2 assertions, and change the `create-epics.md` assertions to:
   - `activePlaceholderWorkflowName: "create-epics.md", activePlaceholderWorkflowStepNumber: 3` must return `true`
   - add one more assertion where `activePlaceholderWorkflowName: "create-epics.md", activePlaceholderWorkflowStepNumber: 2` returns `false`
3. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L886-L904), update the exact expected compact description string to:
   - `Ask whether the user is ready to move to the next supported workflow step. The runtime owns the Yes/No prompt, and the Yes branch advances the focus chain before the next request is built.`
4. In [task_progress.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts#L68-L82), keep the existing `create-prd.md` Step 3 test.
5. Immediately after it, add a new test titled exactly:
   - `teaches workflow_progress_request for create-epics step 3 even when the workflow is deterministic`
6. That new `task_progress` test must:
   - set `managedWorkflowActive: false`
   - set `activeWorkflowSupportsPlaceholders: true`
   - set `activeDeterministicPlaceholderWorkflowEnabled: true`
   - set `activePlaceholderWorkflowName: "create-epics.md"`
   - set `activePlaceholderWorkflowStepNumber: 3`
   - assert the returned string contains `workflow_progress_request`
   - assert it does not contain `send_user_message`
   - assert it contains `Do not include \`task_progress\` on \`workflow_progress_request\``
7. In [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L262-L305), keep the existing `create-prd` Step 3 test.
8. Immediately before that existing `create-prd` Step 3 test, add a new `create-epics` Step 3 test titled exactly:
   - `applies create-epics step 3 row and keeps workflow_progress_request with workflow routing tools`
9. That new contextual-filter test must:
   - register `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST` and `ClineDefaultTool.USE_SKILL` in addition to the existing doc-read/doc-write/response-tool set
   - call `filterContextualNativeToolSpecs(...)` with `activePlaceholderWorkflowName: "create-epics.md"` and `activePlaceholderWorkflowStepNumber: 3`
   - assert the kept IDs include:
     - `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST`
     - `ClineDefaultTool.USE_SKILL`
     - `ClineDefaultTool.LIST_FILES`
     - `ClineDefaultTool.SEARCH`
     - `ClineDefaultTool.FILE_READ`
     - `ClineDefaultTool.FILE_READ_RANGE`
     - `ClineDefaultTool.APPLY_PATCH`
     - `ClineDefaultTool.FILE_NEW`
     - `ClineDefaultTool.ASK`
     - `ClineDefaultTool.SEND_USER_MESSAGE`
     - `ClineDefaultTool.ATTEMPT`
     - `ClineDefaultTool.BROWSER`
     - `ClineDefaultTool.MCP_ACCESS`
     - `ClineDefaultTool.NEW_TASK`
   - assert the kept IDs do not include `ClineDefaultTool.PLAN_MODE`
10. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L668-L693), keep the existing `create-prd` continuation-turn test.
11. Immediately after it, add a new continuation-turn test titled exactly:
    - `generates a continuation prompt for create-epics step 3 with workflow_progress_request guidance`
12. That new integration test must:
    - set `providerInfo.mode: "act"`
    - set `isContinuationTurn: true`
    - set `currentFocusChainChecklist: "- [ ] Step 3: Define the Epics"`
    - set `activeWorkflowSupportsPlaceholders: true`
    - set `managedWorkflowActive: false`
    - set `activePlaceholderWorkflowName: "create-epics.md"`
    - set `activePlaceholderWorkflowStepNumber: 3`
    - assert the generated prompt includes `workflow_progress_request`
    - assert it includes `Do not include \`task_progress\``
    - assert it includes `runtime-owned \`Yes\` branch completes the next checklist step before the next model request is built`
    - assert it does not include `use \`send_user_message\` tool call to briefly tell the user what step you are completing`
13. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1237-L1300), keep the existing `create-epics` Step 2 and `create-prd` Step 3 native-tool tests.
14. Insert a new native-tool integration test between them titled exactly:
    - `filters native tools for create-epics step 3`
15. That new native-tool integration test must:
    - use `providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai")`
    - set `enableNativeToolCalls: true`
    - set `useMinimalGptPrompt: true`
    - set `activeWorkflowSupportsPlaceholders: true`
    - set `managedWorkflowActive: false`
    - set `activePlaceholderWorkflowName: "create-epics.md"`
    - set `activePlaceholderWorkflowStepNumber: 3`
    - assert the native tool names include:
      - `workflow_progress_request`
      - `attempt_completion`
      - `ask_followup_question`
      - `send_user_message`
      - `list_files`
      - `read_file`
      - `read_file_range`
      - `search_files`
    - assert the native tool names do not include:
      - `set_workflow_placeholders`
      - `generate_plan_output`
      - `execute_command`
16. In [WorkflowProgressRequestToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts#L102-L204):
    - keep the existing `Yes` and `No` branch assertions
    - change the first `Yes` test setup so `config.taskState.activePlaceholderWorkflowSource = { name: "create-epics.md" } as any`
    - keep the `currentFocusChainChecklist` assertion unchanged
    - add one new unsupported-workflow test titled exactly:
      - `returns a tool error when the active workflow is not supported`
    - in that new unsupported-workflow test, set `config.taskState.activePlaceholderWorkflowSource = { name: "brainstorming.md" } as any`, execute the handler, and assert the exact error string is:
      - `workflow_progress_request can only be used during an active supported placeholder workflow step.`
    - update the existing no-checklist test to use `create-epics.md` instead of `create-prd.md`
17. In [responseToolTurnFlow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/responseToolTurnFlow.test.ts#L231-L291), add a new test immediately after the existing “forces one more request” test titled exactly:
    - `continues workflow_progress_request followup after placeholder workflow teardown has already occurred`
18. That new response-tool continuation test must:
    - seed `taskState.completedResponseToolResultContent` with a single tool-result block whose `tool_use_id` is `toolu_workflow_progress_request`
    - set `taskState.setPendingResponseToolFollowup({ toolName: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST, route: "normal_user_turn", text: "Yes" })`
    - leave all active placeholder-workflow state unset to represent teardown already having happened
    - call `handleCompletedResponseToolTurn(...)` with `completedResponseTool.toolName = ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST`
    - assert `recursivelyMakeClineRequests(...)` is called exactly once with this exact array:
      - `{ type: "text", text: formatResponse.normalNextTurnDialogue("user_message", "Yes") }`
    - assert `setThreadDisplayState` and `postStateToWebview` are not called
19. In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L721-L839), add a new no-op workflow-completion teardown regression immediately after the existing “tears down placeholder workflow state...” test titled exactly:
    - `tears down create-epics placeholder workflow state when Step 3 completion finishes with no configured automation`
20. That new placeholder-workflow persistence test must:
    - mirror the existing no-op teardown fake-task setup
    - set `fakeTask.taskState.activePlaceholderWorkflowId = "create-epics.md"`
    - set `fakeTask.taskState.activePlaceholderWorkflowSource = { type: "remote", name: "create-epics.md", contents: "# Create Epics\\n\\n## Step 3: Define the Epics\\nFinish the workflow.\\n" }`
    - set `fakeTask.taskState.currentFocusChainChecklist = "- [ ] Step 3: Define the Epics"`
    - call `updatePlaceholderWorkflowProgressAndMaybeRunCompletion.call(fakeTask, "__COMPLETE_NEXT_STEP__")`
    - assert the same teardown/metadata-clearing outcomes as the existing no-op teardown test
21. In the existing `opens the create-epics workflow-start form on slash-command activation and stores only the supplied placeholders` test in [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2612-L2769), update the final message-type assertion so:
    - `expect(fakeTask.renderWorkflowFormMessage.secondCall.args[1]).to.equal("ask")`
    - do not change any other assertion in that workflow-start test

## Step 6
[x] Update the canonical deterministic-progression readme so it matches the new `create-epics.md` Step 2 runtime behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md`

Exact edits:
1. In [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L68-L76), add `- \`create-epics.md\`` to the supported-workflows list immediately after `code-review.md`.
2. In [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L96-L120), insert a new current-evaluator example block immediately after the `code-review.md` block:
   - `- \`create-epics.md\``
   - `  - Step 1 completes when \`architecture_document\`, \`prd\`, and a valid \`mode\` already exist in workflow placeholder state`
   - `  - Step 2 completes when the canonical epics artifact exists and \`output_file\` points to it; \`mode === "new"\` also requires a current-task write proof for that artifact`
3. In [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L166-L188), insert two new example bullets immediately after the Step 4 `code-review.md` example:
   - `- In \`create-epics.md\`, if \`architecture_document\`, \`prd\`, and \`mode\` already exist in placeholder state, Step 1 can complete immediately on the next deterministic pass.`
   - `- In \`create-epics.md\`, if the canonical epics artifact exists at \`{output_folder}/planning_artifacts/epics.md\` and \`output_file\` points to it, Step 2 can auto-complete; when \`mode\` is \`new\`, the artifact must also have a current-task write proof.`
4. Do not add any Step 3 deterministic claim to this readme.

## Step 7
[x] Run the full verification set and the string-contract audit for the new Step 2 / Step 3 progression buildout.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/write-epics/create-epics-per-step-progression-action-plan.md`

Exact commands:
1. `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
2. `npm run test:unit -- src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
3. `npm run test:unit -- src/core/task/__tests__/responseToolTurnFlow.test.ts`
4. `npm run test:unit -- src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
5. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts`
6. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
7. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
8. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`
9. `npx tsc --noEmit`
10. `rg -n "create-prd workflow step|create-prd placeholder workflow|active create-prd workflow step|active create-prd placeholder workflow" src/shared/workflow-progress-request.ts src/core/prompts/system-prompt/tools/workflow_progress_request.ts src/core/prompts/system-prompt/spec.ts src/core/prompts/system-prompt/components/response_tools.ts src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`

Completion criteria:
- Every command above passes.
- Command 10 returns no matches.
- No files outside the allowed files from Steps 1-6 are modified, except this action-plan document’s checkbox updates.
- If any command fails because of a seam not explicitly covered above, stop and report the failure without making any additional changes unless the failure is caused by an explicit mistake in this action plan.
