---
title: Test 27 Remediation Action Plan
scope: Remove the special post-attempt_completion completion_result ask so attempt_completion leaves thread state aligned with send_user_message.
execution:
  - Read this frontmatter first and follow it literally.
  - Read each step in full before making any change.
  - Execute only the current step.
  - After completing a step, update that step's checkbox from [ ] to [x].
  - Then stop and read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - Do not widen scope beyond the allowed-files list for the current step.
  - Do not make any change that is not explicitly prescribed in this plan.
  - Use apply_patch for all file edits.
  - Run only the exact verification command listed in Step 4.
  - If any ambiguity is discovered, or any additional change appears necessary but is not explicitly prescribed here, stop immediately and ask for input before proceeding.
---

# Scope

This plan covers only the `attempt_completion` completion-result ask/thread-state mismatch.

It does not cover:
- thread pause/resume behavior
- focus-chain persistence or restoration
- deterministic placeholder progression
- prompt payload composition or prompt-history injection
- any `attempt_completion` UX changes beyond removing the blocking `completion_result` ask/state transition

# Action Plan

- [x] Step 1: Remove the blocking `completion_result` ask from `attempt_completion`
  - Allowed files:
    - `docs/test-27-remediation.md`
    - `src/core/task/tools/handlers/AttemptCompletionHandler.ts`
  - Read [src/core/task/tools/handlers/AttemptCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts#L14) and [src/core/task/tools/handlers/AttemptCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts#L242) before editing.
  - In [src/core/task/tools/handlers/AttemptCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts#L14), remove the `buildUserFeedbackContent` import because it becomes unused once the post-completion reply path is removed.
  - In [src/core/task/tools/handlers/AttemptCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts#L232), keep everything through `runTaskCompleteHook(...)` and `runNotificationHook(...)` exactly as-is.
  - Replace the block at [src/core/task/tools/handlers/AttemptCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts#L242) through [src/core/task/tools/handlers/AttemptCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts#L281) with a single `return responseToolRuntime.finalizeSuccess(config, this.name)`.
  - Do not change any of the following in this step:
    - the streamed partial preview type `completion_result`
    - the final `callbacks.say("completion_result", ...)` row
    - checkpoint saving
    - telemetry emission
    - command execution behavior
    - managed-workflow gating
    - hook execution before finalization
  - The intended end state for this step is: `attempt_completion` still posts its result row and runs its existing completion-side effects, but it no longer opens a blocking ask and no longer accepts post-completion follow-up input inside the same handler.

- [x] Step 2: Remove the special completed-thread mapping for `completion_result` asks
  - Allowed files:
    - `docs/test-27-remediation.md`
    - `src/core/task/index.ts`
  - Read [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L606) before editing.
  - In [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L606), replace the entire `if (type === "completion_result") { return ThreadDisplayStates.COMPLETED }` branch so that `getThreadDisplayStateForAsk(...)` unconditionally returns `ThreadDisplayStates.AWAITING_USER_RESPONSE`.
  - Do not change any other ask lifecycle code in `index.ts`.
  - Do not touch any later `completion_result` handling branches in this file during this plan.
  - The intended end state for this step is defensive cleanup: if any code path still opens a `completion_result` ask in the future, it must no longer force the thread into `COMPLETED`.

- [x] Step 3: Update only the tests that currently encode the removed ask/follow-up behavior
  - Allowed files:
    - `docs/test-27-remediation.md`
    - `src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`
    - `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
    - `src/core/task/__tests__/responseToolTurnFlow.test.ts`
  - Read the following ranges before editing:
    - [src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts#L103)
    - [src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L175)
    - [src/core/task/__tests__/responseToolTurnFlow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/responseToolTurnFlow.test.ts#L20)
  - In [src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts#L103), replace the existing `"stores post-completion user input as deferred normal user turn content"` test with a new assertion set for the new behavior. The replacement test must:
    - execute `attempt_completion` with only `result: "done"`
    - assert the handler returns `RESPONSE_TOOL_SUCCESS_MESSAGE`
    - assert `callbacks.clearPartialResponseToolPreview` is called once
    - assert `callbacks.say` is called for the final `"completion_result"` row
    - assert `callbacks.ask` is not called
    - assert `callbacks.runUserPromptSubmitHook` is not called
    - assert `taskState.pendingResponseToolFollowup` remains `undefined`
    - assert `taskState.didAttemptCompletionEndTask === true`
    - assert `taskState.responseToolTurnShouldEnd === true`
    - assert `taskState.responseToolTurnCompletedBy === ClineDefaultTool.ATTEMPT`
  - In [src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts#L140) and [src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts#L193), remove the now-unused `callbacks.ask.resolves(...)` setup from the command and `agent_feedback` tests. Do not change the actual command-suppression or row-order assertions.
  - In [src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L175), keep the existing success-path assertions for managed-workflow completion, but replace the `callbacks.ask` expectations at lines 211-212 with a single assertion that `callbacks.ask` was not called.
  - In [src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L215), keep the existing command-path assertions, but replace the `callbacks.ask` expectations at lines 244-245 with a single assertion that `callbacks.ask` was not called.
  - In [src/core/task/__tests__/responseToolTurnFlow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/responseToolTurnFlow.test.ts#L20), delete the `"converts attempt_completion follow-up into normal next-turn user content"` test entirely. Do not replace it with a new helper-flow test in this plan.
  - Do not edit [src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts) in this plan.
  - Do not edit [src/core/task/__tests__/partialResponseToolPreview.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/partialResponseToolPreview.test.ts) in this plan.

- [x] Step 4: Run the exact verification command
  - Allowed files:
    - `docs/test-27-remediation.md`
  - Run exactly this command and no other verification command:
```bash
npm run test:unit -- src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts src/core/task/__tests__/responseToolTurnFlow.test.ts --exit
```
  - If this exact command fails, stop and ask for input before making any further changes.
