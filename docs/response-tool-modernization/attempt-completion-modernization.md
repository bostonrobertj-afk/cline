# Current State

`attempt_completion` is still treated as more than a response-tool presentation variant.

Today it still performs or triggers several non-UI behaviors:

- emits the `completion_result` UI/message variant in `src/core/task/tools/handlers/AttemptCompletionHandler.ts`
- optionally executes a completion-time shell command when `params.command` is present
- creates a special completion checkpoint association by attaching a checkpoint hash to the emitted `completion_result` message
- records completion telemetry via `telemetryService.captureTaskCompleted(...)`
- blocks on incomplete managed workflows
- enforces the double-check-completion loop when that feature is enabled
- runs the `TaskComplete` hook
- runs the notification hook for `task_complete`
- shows a task-complete system notification when notifications are enabled
- sets `TaskState.didAttemptCompletionEndTask = true`

Outside the handler, `attempt_completion` is also still treated specially in a few places:

- it has a dedicated pre-tool focus-chain validation path in `src/core/task/focus-chain/updateFromToolResponse.ts`
- it skips normal `PreToolUse` and `PostToolUse` hook handling
- some tests and comments still encode the older assumption that `attempt_completion` semantically ends a task

This is out of alignment with the modern response-tool direction, where response tools should share the same lifecycle behavior and differ primarily in presentation.

# Target State

`attempt_completion` should no longer be treated as a task-ending or thread-ending lifecycle signal.

Its immediate role should be narrowed to:

- presenting the `completion_result` response variant in the UI/history
- optionally running the attached `command`
- creating and attaching the special completion checkpoint marker used by checkpoint-driven UX

Everything else should stop keying off of `attempt_completion`.

In particular, `attempt_completion` should no longer:

- imply that a task or thread has ended
- block on managed workflow state
- trigger the double-check-completion feature
- run completion-specific hooks
- show a task-complete system notification
- emit completion telemetry solely because this tool was used
- set dedicated task-ended state such as `didAttemptCompletionEndTask`

Timing parity work is intentionally deferred. The immediate goal is to stop `attempt_completion` from doing or triggering behaviors that are no longer wanted.

# Necessary Updates

1. Simplify `AttemptCompletionHandler`.

- Remove managed-workflow blocking from `src/core/task/tools/handlers/AttemptCompletionHandler.ts`.
- Remove double-check-completion gating from `src/core/task/tools/handlers/AttemptCompletionHandler.ts`.
- Remove completion telemetry emission from `src/core/task/tools/handlers/AttemptCompletionHandler.ts`.
- Remove `TaskComplete` hook execution from `src/core/task/tools/handlers/AttemptCompletionHandler.ts`.
- Remove notification-hook execution from `src/core/task/tools/handlers/AttemptCompletionHandler.ts`.
- Remove the system-notification branch from `src/core/task/tools/handlers/AttemptCompletionHandler.ts`.
- Retain:
  - `completion_result` emission
  - optional `command` execution
  - completion checkpoint creation/association
  - existing response-tool finalization behavior

2. Remove obsolete task-ended state coupling.

- Remove `didAttemptCompletionEndTask` from `src/core/task/TaskState.ts`.
- Update any tests that assert this field.

3. Preserve the useful completion-checkpoint behavior without treating it as thread/task termination.

- Keep the checkpoint association logic that ties a checkpoint hash to the emitted `completion_result` message.
- Preserve the downstream features that depend on that marker, such as "See New Changes" and "Explain Changes."
- Do not describe this marker as ending the task or thread; treat it as a completion milestone/bookmark only.

4. Update tests to reflect the narrowed contract.

- Update `AttemptCompletionHandler` tests so they assert only the retained behaviors.
- Remove assertions that `attempt_completion` ended the task.
- Remove assertions that completion-specific hooks or telemetry fire.
- Keep assertions for:
  - `completion_result` emission
  - optional command execution
  - completion checkpoint behavior

5. Defer follow-up cleanup to a later pass.

- The `attempt_completion`-specific focus-chain timing path is not part of this immediate behavior-reduction pass.
- The `attempt_completion`-specific hook-timing exceptions in `ToolExecutor` and `ToolHookUtils` should be reevaluated later, after the unwanted side effects above are removed.

# Requirements

- `attempt_completion` must not be treated as a thread-ending or task-ending signal.
- `attempt_completion` must continue to render its distinct `completion_result` presentation.
- `attempt_completion` must continue to support optional `params.command` execution.
- `attempt_completion` must continue to create the special completion checkpoint association used by checkpoint-derived UX.
- `attempt_completion` must not block on managed workflow state.
- `attempt_completion` must not trigger the double-check-completion feature.
- `attempt_completion` must not run `TaskComplete`.
- `attempt_completion` must not run the notification hook for task completion.
- `attempt_completion` must not trigger the task-complete system notification.
- `attempt_completion` must not emit completion telemetry solely because this tool was called.
- No runtime state should record that `attempt_completion` itself ended the task.
- Existing checkpoint-derived features that rely on the completion marker must continue to work.
- Focus-chain timing changes are explicitly out of scope for this immediate modernization pass.
