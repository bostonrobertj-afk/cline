# Test 17 Action Plan

## Goal

Address the full remediation list from [docs/test-17-findings.md](docs/test-17-findings.md) by fixing:

1. thread-state observability and authority
2. end-turn response-tool isolation
3. unintended next-turn continuation
4. cancel/resume resurrection
5. placeholder-workflow `task_progress` misuse
6. native tool-call / tool-output mismatch

## 1. Make thread-state transitions explicit and observable

Primary code anchors:

- `src/core/task/index.ts:434-447`
- `src/core/task/index.ts:869-940`
- `src/core/task/index.ts:974-980`
- `src/core/task/index.ts:2064-2067`
- `src/core/task/index.ts:2085-2090`
- `src/core/task/index.ts:2179-2184`
- `src/core/task/index.ts:352-376`
- `src/core/controller/task/askResponse.ts:41-79`
- `src/core/controller/index.ts:352-399`

Changes needed:

- Add a single helper in `src/core/task/index.ts` to replace direct writes to `this.threadDisplayState`.
  Suggested shape: `transitionThreadDisplayState(nextState, reason, details?)`.
- Route every current state write through that helper, especially:
  - `ask(...)` when entering `awaiting_user_response` / `completed`
  - `ask(...)` when restoring `active_run` after an ask resolves
  - `continueTaskWithFeedback(...)`
  - `initiateTaskLoop(...)`
  - `abortTask()`
  - `handleCompletedResponseToolTurn(...)`
- Emit a structured log on every transition with:
  - task id
  - previous state
  - next state
  - reason
  - whether `isStreaming`, `isWaitingForFirstChunk`, `abort`, and `responseToolTurnShouldEnd` were set
  - whether a continuation payload was queued
- Add companion routing logs in `src/core/controller/task/askResponse.ts` showing:
  - inbound response type
  - current thread state
  - `controller.isTaskActivelyRunning()`
  - chosen routing path (`interrupt`, `continue`, `resumePassive`, `handleWebviewAskResponse`)

Why this matters:

- Current logs show behavior but not the actual state transitions, which makes lockups and reopen mismatches hard to prove after the fact.
- Right now thread state is written from multiple sites with no unified reason trail.

Tests to add or update:

- `src/core/task/__tests__/thread-display-state.test.ts`
- `src/core/controller/task/askResponse.test.ts`

## 2. Decouple end-turn response-tool results from next-turn model input

Primary code anchors:

- `src/core/task/ToolExecutor.ts:277-290`
- `src/core/task/ToolExecutor.ts:620-632`
- `src/core/task/index.ts:218-238`
- `src/core/task/index.ts:352-376`
- `src/core/task/index.ts:3913-3942`
- `src/core/task/TaskState.ts:140-167`
- `src/core/task/tools/response/ResponseToolRuntime.ts:161-176`
- `src/core/task/tools/handlers/SendUserMessageHandler.ts:35-39`

Changes needed:

- Add a dedicated TaskState buffer for completed end-turn response-tool results.
  Example: `completedResponseToolResultContent`.
- Change `ToolExecutor` so end-turn response tools do not push their success result into the general `userMessageContent` buffer that normal recursive requests consume.
  This should apply to tools marked `defaultTurnBehavior: "end_turn"` in `src/core/task/tools/response/ResponseToolRegistry.ts:5-54`.
- Update `persistCompletedResponseToolResultIfNeeded(...)` in `src/core/task/index.ts:218-238` to persist from the dedicated response-tool-result buffer, then clear only that buffer.
- Leave ordinary non-response-tool and explicit follow-up content on the existing `userMessageContent` path.
- Keep response-tool success visible to runtime bookkeeping, but not reusable as ordinary next-turn user content.

Why this matters:

- The current design persists response-tool success from `taskState.userMessageContent`, which is also the buffer used by generic recursive continuation.
- That is the exact seam that makes `send_user_message` success capable of leaking into another model turn if finalization falls through.

Tests to add or update:

- `src/core/task/__tests__/responseToolTurnFlow.test.ts`
- `src/core/task/tools/handlers/__tests__/SendUserMessageHandler.test.ts`

## 3. Gate new model turns on explicit continuation, not on display state alone

Primary code anchors:

- `src/core/task/index.ts:345-376`
- `src/core/task/index.ts:2027-2029`
- `src/core/task/index.ts:2064-2067`
- `src/core/task/index.ts:2085-2092`
- `src/core/task/index.ts:3913-3942`
- `src/core/controller/task/askResponse.ts:54-79`

Changes needed:

- Introduce a single continuation gate in `src/core/task/index.ts` that decides whether a new model turn is allowed to start.
  Suggested rule: a new request may start only when there is one of:
  - fresh human-authored input
  - queued response-tool follow-up content
  - queued steer content
  - an explicit resume path already accepted by the runtime
- Make `handleCompletedResponseToolTurn(...)` the only legal post-response-tool exit point for end-turn tools.
  If no continuation content exists, it must:
  - persist the response-tool result
  - transition thread state
  - stop
- Add a defensive guard before `recursivelyMakeClineRequests(this.taskState.userMessageContent)` at `src/core/task/index.ts:3941`.
  If the current turn just completed an end-turn response tool and no explicit continuation content exists, do not recurse.
- Keep `active_run` as a reflection of execution ownership, not as the permission source for starting a request.

Why this matters:

- The remediation requirement is that the backend must not begin next-turn assembly on its own.
- The safest implementation is not “wait for `active_run` first,” but “never create a new turn unless an explicit continuation trigger exists.”

Tests to add or update:

- `src/core/task/__tests__/responseToolTurnFlow.test.ts`
- `src/core/controller/__tests__/passiveThreadRouting.test.ts`

## 4. Fix cancel so preserve-visible-thread cannot resurrect the active loop

Primary code anchors:

- `src/core/controller/index.ts:352-399`
- `src/core/controller/index.ts:523-537`
- `src/core/controller/index.ts:545-580`
- `src/core/task/index.ts:2089-2092`
- `src/core/task/index.ts:2172-2184`

Changes needed:

- Stop using `openHistoricalTaskPassively(...)` on the same live task instance as part of the preserve-visible-thread cancel path.
  Today `openHistoricalTaskPassively(...)` clears:
  - `abort`
  - `abandoned`
  - `isStreaming`
  - `isWaitingForFirstChunk`
  which can re-arm the very task that was just cancelled.
- Split “preserve visible thread” into a passive-display operation that only reloads/render history, without mutating live-execution flags on the active task object.
- If needed, create a dedicated controller helper for “show cancelled thread passively” rather than reusing the same open path used for historical browsing.
- Add a hard invariant: once `abortTask()` sets `abort = true`, no controller/UI reopen path may clear that flag unless a deliberate resume path is taken.

Why this matters:

- This matches the observed symptom exactly: cancel pauses briefly, then the task resumes until the thread is closed.

Tests to add or update:

- `src/core/controller/__tests__/cancelTask.test.ts`
- `src/core/controller/__tests__/interruptTaskWithFeedback.test.ts`

## 5. Harden placeholder-workflow prompting and runtime handling of `task_progress`

Primary code anchors:

- `src/core/prompts/system-prompt/components/task_progress.ts:31-36`
- `src/core/task/focus-chain/index.ts:360-374`
- `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts:34-40`
- `src/core/task/focus-chain/updateFromToolResponse.ts:29-68`
- `src/core/task/focus-chain/index.ts:558-672`
- `src/core/task/focus-chain/file-utils.ts:97-118`

Changes needed:

- Update placeholder-workflow prompt copy in `src/core/prompts/system-prompt/components/task_progress.ts:31-36` so it explicitly says:
  - do not include `task_progress` on a tool call until the active step's "Done Signal" is true
  - when the Done Signal is true, use `__COMPLETE_NEXT_STEP__` only once on the next relevant tool call
- Update the current-step guidance in `src/core/task/focus-chain/index.ts:360-374` to reinforce the same rule, not just “include `task_progress` when you finish this step.”
- Update `getNextStepGuidance(...)` in `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts:34-40` to mirror the same wording after placeholder persistence succeeds.
- Add turn-scoped runtime protection so `__COMPLETE_NEXT_STEP__` can advance at most once per assistant turn.
  Suggested implementation:
  - add a TaskState flag or counter such as `completedNextStepUpdatesThisTurn`
  - reset it at the start of each request in `recursivelyMakeClineRequests(...)`
  - when `updateFCListFromToolResponse(...)` receives `__COMPLETE_NEXT_STEP__`, reject any second or later sentinel in the same turn
- Make the rejection feedback explicitly restate the placeholder-workflow rule:
  - `task_progress` must not appear until the active step's Done Signal is true
  - only one `__COMPLETE_NEXT_STEP__` advancement is accepted per assistant turn

Why this matters:

- The current bug is not just prompt weakness. It is also that `evaluateFocusChainChecklistUpdate(...)` will happily keep advancing the next incomplete item every time the sentinel is reused.

Tests to add or update:

- `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
- `src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts`
- `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`

## 6. Guarantee native tool-call / tool-output parity before the next OpenAI request

Primary code anchors:

- `src/core/task/index.ts:3605-3611`
- `src/core/task/index.ts:3837-3865`
- `src/core/task/index.ts:3877-3942`
- `src/core/task/index.ts:4233-4282`
- `src/core/task/ToolExecutor.ts:343-410`
- `src/core/task/ToolExecutor.ts:626-632`
- `src/core/task/tools/utils/ToolResultUtils.ts:13-101`

Changes needed:

- Add per-call execution tracking for native tool calls.
  Suggested state:
  - seen assistant tool-use call ids
  - executed call ids
  - rejected/skipped call ids
  - emitted tool-result call ids
- Make `presentAssistantMessage()` logging more truthful.
  Right now it logs “completed tool ...” after `executeTool(...)` even if `ToolExecutor` returned early without executing the handler.
  Return a structured outcome from `ToolExecutor.executeTool(...)` so the presenter can log `executed`, `skipped`, or `rejected` distinctly.
- Before persisting assistant tool-use blocks into API history at `src/core/task/index.ts:3837-3865`, ensure every finalized native tool call that will be exposed to OpenAI is in one of two safe states:
  - it has a matching finalized tool result
  - it was removed from the assistant history for this turn because it never truly executed
- Add a local validation step before any follow-up request is made:
  if a prior native tool call lacks a matching tool output, fail locally and log the mismatch instead of sending a broken request to OpenAI.
- Review `ToolResultUtils.resolveToolResultId(...)` and `pushToolResult(...)` to ensure call-id / tool-use-id mapping is preserved for every emitted native result, including rejection/error paths.

Why this matters:

- The new logs in `docs/test-17-findings.md` show `400 No tool output found for function call ...`, which means the runtime assembled a follow-up request with an unresolved tool call still exposed to OpenAI.

Tests to add or update:

- `src/core/task/__tests__/StreamResponseHandler.test.ts`
- `src/core/task/__tests__/ToolExecutor.test.ts`
- add a new task-loop regression test covering:
  - multiple native tool calls in one streamed turn
  - one call skipped or rejected
  - no follow-up request is sent unless every persisted call has a matching output

## 7. Recommended implementation order

1. Fix cancel/resurrection in `src/core/controller/index.ts` and add the matching controller tests.
2. Add thread-state transition logging and routing logs.
3. Isolate end-turn response-tool results from `userMessageContent`.
4. Add the explicit continuation gate around `handleCompletedResponseToolTurn(...)` and generic recursion.
5. Update placeholder-workflow prompt copy and add the per-turn `__COMPLETE_NEXT_STEP__` guard.
6. Add native tool-call / tool-output parity tracking and local validation.
7. Run the focused regression suite for thread routing, response-tool flow, focus-chain protection, placeholder prompts, and native tool handling.

## Done criteria

This action plan is complete when the implementation proves all of the following:

- every thread-state transition is logged with source and reason
- end-turn response-tool success is persisted without becoming generic next-turn model input
- no extra model turn starts after `send_user_message` unless explicit continuation content exists
- cancel with preserve-visible-thread does not resume execution
- placeholder workflows do not advance multiple checklist steps in one assistant turn
- OpenAI never receives a follow-up request referencing a native tool call that lacks a matching tool output
