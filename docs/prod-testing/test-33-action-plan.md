---
instructions:
  - Read this document from top to bottom before making any changes.
  - Execute only the current step.
  - Read the entire current step before starting it.
  - After completing a step, update that step's checkbox from `[ ]` to `[x]`.
  - After marking a step complete, stop and read the next step in full before doing any additional work.
  - Do not make edits outside the allowed-files list for the current step.
  - Do not make any change that is not explicitly prescribed here.
  - If any ambiguity is discovered, or any change appears necessary that is not explicitly prescribed here, stop immediately and ask for input.
  - Use `apply_patch` for all file edits.
---

# Test 33 Action Plan

## Goal
Implement the desired start-of-turn workflow-form decision loop for placeholder workflows so system-owned work fully settles before any AI turn begins, while also fixing the trailing `command_output` collision and keeping workflow completion, fallback, persistence, and resume behavior intact.

## Source Of Truth
- Requirements: [test-33-remediation](/Users/robertboston/Documents/Cline%20Extension/cline/docs/prod-testing/test-33-remediation)
- Runtime seam: [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1642)
- Start-form trigger seam: [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L45)
- Step-trigger seam: [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L125)
- Deterministic progression seam: [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L176)
- Existing `command_output` dismissal precedent: [ResponseToolRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRuntime.ts#L67)

## Scope Guard
- This plan fixes orchestration and regression coverage for the start-of-turn workflow-form flow.
- This plan does not redesign workflow-form transport, workflow-form field staging, retry UX, or deterministic evaluator semantics.
- Do not change the success/fallback contract in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts) for:
  - `placeholder_workflow_start_set_workflow_placeholders`
  - `code_review_step_3_diff_source`
  - `code_review_step_3_review_input`
- Do not change the trigger eligibility rules in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L45-L141). The fix must come from orchestration in `maybeResolveWorkflowFormBeforeApiTurn()`, not from broadening or weakening resolver rules.
- Do not change deterministic progression logic in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts) unless a prescribed test in this plan proves that a code change there is still required after the orchestration fix. If that happens, stop and ask for input.
- Do not change workflow completion runtime logic in:
  - [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts)
  - [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts)
  Existing behavior must be preserved and verified, not reauthored.

## Step 1
- [x] Add a shared trailing-`command_output` dismissal helper and migrate the response-tool path to use it.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/utils/dismissTrailingCommandOutputAsk.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRuntime.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`
- Prescribed changes:
  - Create [dismissTrailingCommandOutputAsk.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/utils/dismissTrailingCommandOutputAsk.ts) as a new shared helper module.
  - In that new file, export exactly one async function named `dismissTrailingCommandOutputAskIfPresent`.
  - The helper must accept one object argument with this exact structural contract:
    - `getClineMessages: () => Array<{ ask?: string }>`
    - `dismissCommandOutputAsk: () => Promise<void>`
  - The helper must:
    - read the last message from `getClineMessages()`
    - return `false` immediately when the last message is not `ask === "command_output"`
    - call `dismissCommandOutputAsk()` and then return `true` when the trailing ask is `command_output`
  - Do not add any other exports to this helper file.
  - In [ResponseToolRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRuntime.ts#L67-L87), replace the inline `command_output` dismissal at lines 75-76 with a call to `dismissTrailingCommandOutputAskIfPresent(...)`.
  - Preserve the existing metadata gate at [ResponseToolRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRuntime.ts#L70-L72): if `dismissCommandOutputAskBeforeBlockingAsk` is falsy, the runtime must still return without calling the helper.
  - In [ResponseToolRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts#L17-L38), keep the existing dismissal regression intact and update it only as needed for the helper-backed implementation.
  - Add one new test immediately after the existing dismissal test asserting that `prepareForResponseDelivery()` does not call `say("command_output", "")` when the last message is not a `command_output` ask.

## Step 2
- [x] Refactor the pre-turn workflow-form orchestration into a restartable decision loop and wire the shared `command_output` helper into Task-side workflow-form rendering.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/utils/dismissTrailingCommandOutputAsk.ts`
- Prescribed changes:
  - In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1642-L1758), replace the current single-pass `maybeResolveWorkflowFormBeforeApiTurn()` body with a two-level loop:
    - an outer decision loop that can rediscover another eligible form after a successful form/tool resolution
    - an inner session loop that preserves the existing `render_form`, `invoke_tool`, `retry_error`, and `fallback_to_agent` handling for the currently active session
  - Preserve the method signature exactly:
    - `private async maybeResolveWorkflowFormBeforeApiTurn(currentTurnSlashCommandAction?: PersistentSlashCommandAction): Promise<void>`
  - Add a local boolean named exactly `startFormHandledForCurrentTurn`.
  - Initialize `startFormHandledForCurrentTurn` to `this.taskState.activeWorkflowFormSession?.owner.kind === "slash_command"` before the outer loop begins. This locks in the rule that a resumed slash-command start session counts as already handled for the current turn.
  - In the outer loop, candidate discovery must occur in this exact order when `this.taskState.activeWorkflowFormSession` is falsy:
    1. if `startFormHandledForCurrentTurn` is `false`, call [resolveWorkflowFormSlashCommandStartCandidate(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L45-L90)
    2. if a slash-start candidate exists, create the session exactly as the current implementation does, persist it, and immediately set `startFormHandledForCurrentTurn = true`
    3. otherwise call [resolveWorkflowFormInterceptionCandidate(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L217-L259)
    4. if no candidate exists, break the outer loop
  - Do not move or modify the existing session creation payloads for slash-command sessions or deterministic-workflow-progression sessions other than wrapping them in the new outer-loop control flow.
  - Immediately before each inner session-processing cycle begins, reset `this.pendingWorkflowFormOutcome = undefined`. Do not allow a stale outcome from a prior session to carry into the next rediscovery pass.
  - Inside the inner session loop, immediately before [renderWorkflowFormMessage(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1688), call `dismissTrailingCommandOutputAskIfPresent(...)` with:
    - `getClineMessages: () => this.messageStateHandler.getClineMessages()`
    - `dismissCommandOutputAsk: async () => { await this.say("command_output", "") }`
  - Add a local boolean named exactly `restartDecisionLoop` and initialize it to `false` each time a session begins processing.
  - In the `invoke_tool` success branch at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1713-L1723):
    - keep the existing calls to `executeWorkflowFormToolAndSync(...)`, `clearWorkflowFormSession()`, and `renderWorkflowFormMessage(successPayload)`
    - set `restartDecisionLoop = true`
    - break the inner loop
  - In the explicit `fallback_to_agent` branch at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1707-L1711):
    - do not re-enter candidate discovery
    - leave `restartDecisionLoop = false`
    - break the inner loop
  - In the `toolExecution.fallbackToAgent === true` branch at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1726-L1739):
    - keep the existing fallback notice render, suppression update, and session clearing
    - leave `restartDecisionLoop = false`
    - break the inner loop
  - In the `retry_error` branch at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1742-L1748), keep the current retry behavior exactly and continue the inner loop without touching `restartDecisionLoop`.
  - After the inner loop ends:
    - if `restartDecisionLoop` is `true`, continue the outer loop
    - otherwise break the outer loop
  - Keep the final `workflow_form_resolved` thread-state transition at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1755-L1758), but emit it only once after the outer loop fully finishes.
  - Do not change:
    - [handleWorkflowFormSubmission(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1332-L1367)
    - workflow-form session persistence methods at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1369-L1383)
    - [loadContext()](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L5006-L5007) ordering

## Step 3
- [x] Add direct Task-side regression coverage for the new decision loop, including the Step 1 non-reentry guard and the `command_output` dismissal behavior.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- Prescribed changes:
  - In the existing test [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1008-L1098) currently named `"builds the first post-form prompt from the next active step after a successful Step 2 diff-output resolution"`, replace the old single-pass expectation with the new loop contract:
    - rename the test to `"chains successful Step 2 diff-output resolution into the Step 3 workflow form before returning control"`
    - keep the Step 2 success setup, but make the second eligible Step 3 form explicit instead of expecting prompt generation immediately after Step 2 success
    - stub `workflowFormRuntime.createSession` to return a Step 2 diff session first and a Step 3 review-input session second
    - make the first render yield `invoke_tool` for the Step 2 session
    - make the third render yield `fallback_to_agent` for the Step 3 session so the loop stops deterministically
    - assert that `createSession` was called exactly twice and in this exact resolver order:
      - `code_review_step_3_diff_source`
      - `code_review_step_3_review_input`
    - remove the old post-Step-2 prompt-generation assertions from this test because immediate AI prompt assembly after Step 2 success is no longer the required behavior
  - In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1490-L1567), keep the existing tests for:
    - resumed unresolved slash-command sessions
    - workflow-start success semantics when Step 1 remains active
  - Immediately after the resumed-session test at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1490-L1514), add a new integration-style test named exactly:
    - `"chains slash-command workflow-start success into the code-review Step 2 diff form before returning control"`
  - That new test must:
    - pass a real `PersistentSlashCommandAction` fixture with `type: "activate_placeholder_workflow"` using the exact action shape already used elsewhere in this file at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1762-L1770)
    - begin with Step 1 active for `code-review.md`
    - use Step 1 workflow markdown whose start requirements are expressed with real placeholder-token syntax, for example `Optional: {{review_input}}`, so [parseWorkflowStartRequirements(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts#L20-L52) produces a valid start-form candidate
    - stub `workflowFormRuntime.createSession` so the first call returns a `placeholder_workflow_start_set_workflow_placeholders` session and the second call returns a `code_review_step_3_diff_source` session
    - stub `executeWorkflowFormToolAndSync(...)` for the first session so it mutates `taskState.currentFocusChainChecklist` to Step 2 active and leaves the Step 2 diff-form trigger eligible
    - stop the loop by returning `fallback_to_agent` for the Step 2 session
    - assert that `createSession` was called exactly twice and in this exact resolver order:
      - `placeholder_workflow_start_set_workflow_placeholders`
      - `code_review_step_3_diff_source`
  - Immediately after the existing workflow-start success semantics test at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1517-L1567), add a new test named exactly:
    - `"does not reopen the workflow-start form when workflow-start success leaves Step 1 active"`
  - That new test must:
    - use the same `activate_placeholder_workflow` action shape
    - use Step 1 workflow markdown whose start requirements are expressed with real placeholder-token syntax, for example `Optional: {{review_input}}`, so the start-form resolver remains eligible on the first pass
    - have `executeWorkflowFormToolAndSync(...)` leave `taskState.currentFocusChainChecklist` on Step 1
    - assert that `workflowFormRuntime.createSession` is called exactly once for `placeholder_workflow_start_set_workflow_placeholders`
    - assert that the method returns without opening a second workflow-start form in the same turn
  - Immediately after the existing Step 3 form-open regression at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1104-L1195), add a new test named exactly:
    - `"dismisses a trailing command_output ask before rendering a step-triggered workflow form"`
  - That new test must:
    - start on active `code-review.md` Step 2 with no active session
    - include `fakeTask.messageStateHandler = { getClineMessages: sinon.stub().returns([{ ask: "command_output" }]) }`
    - provide `fakeTask.say` as a stub
    - stop the loop by returning `fallback_to_agent` from the rendered Step 2 form
    - assert that `fakeTask.say` was called exactly once with `("command_output", "")`
    - assert that this dismissal happened before the first `renderWorkflowFormMessage(...)` call

## Step 4
- [x] Add prompt-assembly regression coverage proving `loadContext()` sees the fully settled system-owned chain before any AI-visible step prompt is built.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
- Prescribed changes:
  - In [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L263-L350), keep the existing ordering regression test intact.
  - Immediately after that test, add one new test named exactly:
    - `"builds the first AI prompt from the fully settled code-review system-owned chain"`
  - In that new test:
    - start with a fake `code-review.md` task whose checklist is on Step 1 or Step 2 fallback prose
    - stub `maybeResolveWorkflowFormBeforeApiTurn()` to mutate `taskState.currentFocusChainChecklist` directly to a settled post-chain state where Step 5 is active
    - also mutate any supporting placeholder state needed so the Step 5 prompt is coherent
    - assert `maybeResolveWorkflowFormBeforeApiTurn()` still runs before `generateFocusChainInstructions()`
    - assert the final prompt injection text:
      - does not contain the Step 2 fallback sentence `You are in the fallback path because the system-owned workflow-form path was not completed.`
      - does not identify Step 1, Step 2, Step 3, or Step 4 as the current step
      - does identify Step 5 as the current step

## Step 5
- [x] Update the canonical workflow-form and deterministic-progression docs so they match the live `code-review.md` runtime flow and the new pre-turn decision-loop contract.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md`
- Prescribed changes:
  - In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L96-L104), replace the stale delivered-use-case inventory with the live set:
    - workflow-start forms for slash-command-started placeholder workflows
    - `code-review.md` Step 2 diff artifact form using `build_review_diff_output`
    - `code-review.md` Step 3 review-input form using `build_review_input`
  - In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L131-L144), update the Core Logic section so success does not imply immediate AI entry. Add explicit wording that after successful form resolution the runtime may immediately re-enter deterministic progression and another eligible system-owned form before any AI turn begins.
  - In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L166-L184), replace the stale `code-review.md` Step 3-only usage path with the live chain:
    - slash-command workflow-start form
    - Step 2 diff form
    - Step 3 review-input form
    - deterministic Step 4 review-mode derivation
    - AI entry at Step 5 only when no more system-owned work remains
  - In [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L129-L133), add one explicit sentence stating that when deterministic progression is reached from pre-turn workflow-form resolution, focus-chain prompting and AI invocation begin only after the pre-turn system-owned decision loop has no further eligible work.

## Step 6
- [ ] Run the exact verification suite for the command-output helper, pre-turn decision loop, prompt gating, and workflow completion preservation.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/utils/dismissTrailingCommandOutputAsk.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRuntime.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflowCompletionRunner.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md`
- Prescribed changes:
  - Do not make any edits in this step except changing the checkbox after successful verification.
  - Run this exact command and no others:
```sh
npm run test:unit -- src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts src/core/task/__tests__/workflowCompletionRunner.test.ts src/core/task/__tests__/workflowCompletionHandler.test.ts --exit
```
