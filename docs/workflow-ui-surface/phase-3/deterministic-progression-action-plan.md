---
title: Workflow UI Surface Phase 3 Deterministic Progression Silo Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - This plan follows the live reauthored `/Users/robertboston/Documents/Cline/Workflows/code-review.md` workflow. Any stale Phase 3 requirement wording that still implies `build_review_input` completes Step 2 must be implemented as Step 3 behavior, per the live workflow and explicit user clarification that the AI fallback path does not get access to `build_review_input`.
---

# Workflow UI Surface Phase 3 Deterministic Progression Silo Action Plan

This plan implements only the Phase 3 deterministic progression silo described in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-3/requirements.md)
- [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-3/discovery.md)
- [additional-supported-workflow-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/deterministic-workflow-progression/additional-supported-workflow-guide.md)

This plan does not implement the tool silo or the workflow-form silo.

Locked decisions for this pass:

- The live `code-review.md` step order is authoritative:
  - Step 2 = `(System-Owned) Diff Source Resolution And Diff Output Persistence`
  - Step 3 = `Construct & Persist Review Input File`
- Deterministic completion for `code-review.md` must therefore be:
  - Step 2 completes on current-task write proof for `diff_output`
  - Step 3 completes on current-task write proof for `review_input`
  - Step 4 remains deterministic `review_mode` derivation from the available current-task artifacts
- The AI fallback path does not get access to `build_review_input`
- The `code-review.md` step/tool-schema matrix must therefore be:
  - Step 2: `DOC_READ`, `DOC_WRITE`, `LOCAL_EXEC`, `DIFF_BUILD`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`
  - Step 3: `DOC_READ`, `DOC_WRITE`, `PLACEHOLDER_WRITE`
- This pass must not modify:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/**`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/**`
  - `/Users/robertboston/Documents/Cline/Workflows/**`

## Step 1
[x] Update the `code-review.md` deterministic evaluator to match the live Step 2/Step 3 artifact order, and realign the focused deterministic progression regression suite to the canonical `review-input.diff` / `review-input.md` filenames.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`

Exact edits:
1. In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L154-L240), update only `evaluateCodeReviewStep(...)`:
   - `case 2` must resolve `placeholderKey: "diff_output"`
   - `case 2` success `reason` must be exactly `diff_output was written during this task and the artifact still exists.`
   - `case 3` must resolve `placeholderKey: "review_input"`
   - `case 3` success `reason` must be exactly `review_input was written during this task and the artifact still exists.`
2. Do not change:
   - `case 1`
   - `case 4` review-mode derivation logic
   - `case 5` / `case 6` / `case 7`
   - `resolveTaskWrittenPlaceholderArtifactPath(...)`
3. In [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L522-L803), swap the code-review Step 2 and Step 3 regression intent to match the live workflow:
   - the current Step 2 tests that still target `review_input` must be rewritten to target `diff_output`
   - the current Step 3 tests that still target `diff_output` must be rewritten to target `review_input`
4. Update the four affected test titles exactly as follows:
   - `does not complete code-review step 2 from fallback file existence alone when diff_output is missing`
   - `completes code-review step 2 when diff_output is stored as a relative path resolved from workflow cwd`
   - `completes code-review step 3 when review_input points to a fresh review-input.md artifact`
   - `completes code-review step 3 when review_input is stored as a relative path resolved from workflow cwd`
5. In those same Step 2 / Step 3 tests:
   - use the live workflow copy:
     - Step 2 heading text must reference `System-Owned Diff Source Resolution And Diff Output Persistence`
     - Step 3 heading text must reference `Construct & Persist Review Input File`
   - use placeholder values that match the new gate ownership:
     - Step 2 fixtures use `diff_output`
     - Step 3 fixtures use `review_input`
6. In every Step 3 `review_input` path fixture touched in this file, use the canonical stable artifact filename `review-input.md`, not `review_input.md`, to match [.cline/workflow-config.yaml](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/workflow-config.yaml#L14).
7. Do not change the already-correct review-mode tests except where a touched fixture still uses the stale underscore filename `review_input.md`; normalize only those touched path strings to `review-input.md`.

## Step 2
[x] Realign the deterministic prompt/persistence regression coverage so the current-step guidance and post-form advancement follow the live Step 2 diff form and Step 3 review-input form ordering.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits:
1. In [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L283-L347), replace the existing interception test with one expanded test titled exactly:
   - `intercepts code-review step 2 until diff_output is satisfied and step 3 until review_input is satisfied`
2. In that rewritten interception test:
   - first use a checklist where Step 2 is active and Step 3 is incomplete
   - set only `diff_output` in `activePlaceholderWorkflowStableValues`
   - assert interception stays `true` until the file both exists and has a current-task write proof
   - assert suppression with `code_review_step_3_diff_source` disables interception for that Step 2 case
   - then switch the checklist so Step 2 is complete and Step 3 is active
   - set `review_input` in `activePlaceholderWorkflowStableValues`
   - assert interception stays `true` until the file both exists and has a current-task write proof
   - assert suppression with `code_review_step_3_review_input` disables interception for that Step 3 case
3. In [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L171-L314), update the existing `resolves a pending workflow form before generating focus-chain prompt injections` test so it reflects the live Step 2 -> Step 3 progression:
   - the workflow source markdown must use:
     - Step 2 = `System-Owned Diff Source Resolution And Diff Output Persistence`
     - Step 3 = `Construct & Persist Review Input File`
     - Step 4 = `Set Review Mode`
   - the initial checklist must show Step 2 incomplete and Step 3 / Step 4 incomplete
   - the fake `maybeResolveWorkflowFormBeforeApiTurn` callback must mark Step 2 complete and leave Step 3 incomplete
   - the assertion inside the stubbed `generateFocusChainInstructions` must confirm the checklist contains `- [x] Step 2` and `- [ ] Step 3: Construct & Persist Review Input File`
4. Still in [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L103-L119), update the shared fake `code-review.md` source/checklist seed so its Step 2 heading text matches the live workflow’s Step 2 diff step rather than the old review-input step.
5. In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L444-L516), rewrite the stale test titled `advances Step 2 after placeholder resolution when review_input exists with a stale mtime but has a current-task write proof` so it instead:
   - is titled `advances Step 3 after placeholder resolution when review_input exists with a stale mtime but has a current-task write proof`
   - uses workflow markdown where Step 2 is the diff-output step and Step 3 is the review-input step
   - seeds the checklist with Step 1 and Step 2 already complete and Step 3 incomplete
   - preserves the `set_workflow_placeholders` tool context, because the manual Step 3 fallback still sets `{review_input}`
   - expects the resulting checklist to mark Step 3 complete
6. In every touched workflow markdown fixture or checklist in [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), ensure:
   - Step 2 labels the diff-output step
   - Step 3 labels the review-input step
   - `review_input` artifact paths use `review-input.md`

## Step 3
[x] Update the `code-review.md` step/tool-schema matrix and its prompt-filter regressions so Step 2 exposes diff-building and Indxr discovery while Step 3 remains manual fallback-only with placeholder write support and no `build_review_input`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

Exact edits:
1. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L145-L153), update only the `code-review.md` row:
   - Step 2 must be exactly:
     - `["DOC_READ", "DOC_WRITE", "LOCAL_EXEC", "DIFF_BUILD", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"]`
   - Step 3 must be exactly:
     - `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`
   - leave Steps 1, 4, 5, 6, and 7 unchanged
2. Do not add any new bundle for `build_review_input`, and do not expose `build_review_input` through the matrix.
3. In [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L84-L142), retarget the existing code-review matrix-row test to Step 2:
   - rename it to `applies code-review step 2 row and keeps the configured Indxr bundles`
   - set `activePlaceholderWorkflowStepNumber: 2`
   - keep `build_review_diff_output` in the allowed built-in tool set
   - remove `set_workflow_placeholders` from the allowed built-in tool expectations
   - keep the existing three Indxr tool expectations:
     - `search_relevant`
     - `get_file_summary`
     - `lookup_symbol`
4. Still in [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts), add one new test immediately after the rewritten Step 2 test:
   - title: `applies code-review step 3 row without diff-build or Indxr tools`
   - set `activePlaceholderWorkflowStepNumber: 3`
   - assert the kept built-in ids include:
     - `list_files`
     - `search_files`
     - `read_file`
     - `read_file_range`
     - `apply_patch`
     - `set_workflow_placeholders`
     - `ask_followup_question`
     - `send_user_message`
     - `attempt_completion`
     - `browser_action`
     - `access_mcp_resource`
     - `new_task`
   - assert the kept built-in ids do not include:
     - `build_review_diff_output`
     - `execute_command`
     - `use_subagents`
   - assert no Indxr-prefixed MCP tool names survive filtering
5. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L683-L706), keep the existing no-Indxr-guidance test on `activePlaceholderWorkflowStepNumber: 3`, but update its title to reference `code-review step 3` explicitly.
6. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L965-L997), retarget the existing `filters native tools for code-review step 3` test to Step 2:
   - rename it to `filters native tools for code-review step 2`
   - set `activePlaceholderWorkflowStepNumber: 2`
   - keep `build_review_diff_output`, `execute_command`, `list_files`, `search_files`, `read_file`, `read_file_range`, `apply_patch`, and `attempt_completion` in the expected tool list
   - assert `set_workflow_placeholders` is absent
   - assert at least these Indxr tools are present:
     - one name containing `search_relevant`
     - one name containing `get_file_summary`
     - one name containing `lookup_symbol`
7. Add one new integration test immediately after the rewritten Step 2 integration test:
   - title: `filters native tools for code-review step 3`
   - set `activePlaceholderWorkflowStepNumber: 3`
   - assert the visible tool names include:
     - `set_workflow_placeholders`
     - `list_files`
     - `search_files`
     - `read_file`
     - `read_file_range`
     - `apply_patch`
     - `attempt_completion`
   - assert the visible tool names do not include:
     - `build_review_diff_output`
     - `build_review_input`
     - `execute_command`
   - assert no visible tool name contains `search_relevant`, `get_file_summary`, or `lookup_symbol`

## Step 4
[x] Run the focused deterministic-progression silo verification.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/phase-3/deterministic-progression-action-plan.md`

Exact commands:
1. `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts --exit`
2. `npx tsc --noEmit`

Completion criteria:
- Both commands pass.
- No files outside the allowed files from Steps 1-3 are modified, except this action-plan document’s checkbox updates.
- If either command fails because of a file or seam not explicitly covered above, stop and report the failure without making any additional changes unless the failure is caused by an explicit mistake in this action plan.
