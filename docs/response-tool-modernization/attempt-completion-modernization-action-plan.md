---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not make changes outside the allowed files listed for the current step.
  - If any ambiguity is discovered, or if any change is needed outside the allowed files for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup beyond what is explicitly prescribed here.
---

# Attempt Completion Modernization Action Plan

[x] Step 1: Align the modernization doc with the approved scope.
Allowed files: `docs/response-tool-modernization/attempt-completion-modernization.md`
Change `docs/response-tool-modernization/attempt-completion-modernization.md` so it explicitly matches the approved immediate target.
At lines 5-15, add a bullet stating that `attempt_completion` currently shows a system notification when notifications are enabled.
At lines 37-44, add a bullet stating that `attempt_completion` should no longer show a task-complete system notification.
At lines 50-56, add an explicit instruction to remove the system-notification branch from `src/core/task/tools/handlers/AttemptCompletionHandler.ts`.
At lines 91-100, add a requirement stating that `attempt_completion` must not trigger the task-complete system notification.
Do not change the scope boundary at lines 84-87: focus-chain timing remains out of scope for this pass.

[x] Step 2: Remove non-approved side effects from `AttemptCompletionHandler` while preserving presentation, command execution, and completion-checkpoint behavior.
Allowed files: `src/core/task/tools/handlers/AttemptCompletionHandler.ts`
In `src/core/task/tools/handlers/AttemptCompletionHandler.ts`, remove the unused imports at lines 2-6, 9, 12, and 19 after this refactor: `getHookModelContext`, `getHooksEnabledSafe`, `showSystemNotification`, `telemetryService`, `Logger`, `listIncompleteManagedWorkflowItems`, and `getTaskCompletionTelemetry`.
Delete the now-unused `TASK_PREVIEW_MAX_CHARS` constant and `getInitialTaskPreview(...)` helper at lines 22-37.
Delete the managed-workflow blocking branch at lines 73-79.
Delete the double-check-completion branch at lines 83-106.
Delete the system-notification branch at lines 120-126.
Delete the telemetry calls at lines 180 and 227, leaving the surrounding `saveCheckpoint(...)`, `addNewChangesFlagToLastCompletionResultMessage()`, and `emitAgentFeedbackOnce()` logic intact.
Delete the post-completion hook calls at lines 231-239.
Delete the private helper methods `runTaskCompleteHook(...)` and `runNotificationHook(...)` at lines 244-322 in full.
Do not change the retained behaviors at lines 174-229: `completion_result` emission, optional `command` handling, checkpoint saving, completion-checkpoint association, agent feedback emission, and `responseToolRuntime.finalizeSuccess(...)` must remain intact.

[x] Step 3: Remove the obsolete attempt-completion-ended-task flag from task state.
Allowed files: `src/core/task/TaskState.ts`
In `src/core/task/TaskState.ts`, delete the `didAttemptCompletionEndTask` field at line 168.
At lines 177-187, remove the assignment at line 186 so `markResponseToolTurnComplete(...)` only updates the generic response-tool turn state.
At lines 189-203, remove the reset at line 201 from `consumeCompletedResponseTool()`.
At lines 337-345, remove the reset at line 345 from `clearResponseToolTurnState()`.
Do not change any other response-tool turn fields in this file.

[x] Step 4: Update the focused tests to lock in the narrowed contract.
Allowed files: `src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`, `src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.doubleCheck.test.ts`, `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
In `src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`, remove the assertion at line 122 that expects `taskState.didAttemptCompletionEndTask` to be `true`.
In that same file, add one regression test that stubs `showSystemNotification`, executes `AttemptCompletionHandler` with `config.autoApprovalSettings.enableNotifications = true`, and asserts that the notification function is not called. Do not stub `telemetryService`, because `src/services/telemetry/index.ts` exports it as a `Proxy` rather than a concrete own-property object. Keep the existing assertions that `completion_result` is emitted, no follow-up ask is opened, and command execution still works.
Delete `src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.doubleCheck.test.ts` entirely, because it only tests the removed double-check-completion behavior.
In `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`, replace the test at lines 157-173 with a new regression test that keeps `managedWorkflowRun` incomplete and asserts that `attempt_completion` now succeeds, emits `completion_result`, does not call `ask`, and does not increment `consecutiveMistakeCount`.
In `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`, remove the `didAttemptCompletionEndTask` assertions at lines 207 and 235, and leave the remaining generic response-tool assertions in place.
Do not modify any other managed-workflow tests below line 246.

[x] Step 5: Verify only the touched behavior and stop.
Allowed files: none
Run `npm run test:unit -- src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts src/core/task/__tests__/responseToolTurnFlow.test.ts`.
If that command fails because the deleted double-check test file is still referenced elsewhere, stop and ask the user before expanding scope.
If that command fails because the old telemetry-stub version of the regression test is still present locally, update the test to match Step 4 exactly and rerun the same command.
After the targeted tests pass, do not make any additional cleanup changes in focus-chain timing, `ToolExecutor`, `ToolHookUtils`, telemetry service internals, or checkpoint internals during this plan.
