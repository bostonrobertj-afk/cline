# Code Review Findings: `6e7d8cc`

## Review Scope

- Target: commit `6e7d8cc`
- Review source: commit diff only
- Context loaded: `thread-idle-state-implementation-spec.md`, `thread-idle-execution-01-task-state-contract.md`, `thread-idle-execution-02-controller-open-cancel-steer.md`

## Summary

This review found 6 actionable issues.

- The first 3 findings came directly from the commit review.
- Findings 4-6 came from follow-up runtime validation of the same change set.
- Findings 1, 2, 4, and 5 are directly fixable implementation problems.
- Findings 3 and 6 are real integration risks, though 6 still needs deeper root-cause confirmation.

## Findings

### 1) Passive-open composer input is swallowed instead of starting a new turn

- **Severity:** high
- **Category:** `patch`
- **Files:**
  - `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`
  - `src/core/controller/task/askResponse.ts`

**Detail:**
When a thread is reopened in `idle_open`, the UI send handler routes the composer text through `TaskServiceClient.askResponse(... messageResponse ...)`. That API only stores a response for an *already pending* ask. In a passive-open thread there is no pending ask, so the message is not turned into a visible chat turn or a new task. The current handler then marks the message as sent and disables the composer, which leaves the user with an input that appears to have been accepted but is effectively dropped.

**Why it matters:**
This breaks the main passive-open flow: a reopened thread is supposed to remain interactable and allow the human to speak first.

**Recommended remediation:**
- Add an explicit "start new turn" path for `idle_open` threads instead of calling `askResponse()`.
- Only use `askResponse()` when the backend is actually waiting on a real ask.
- Add a targeted test that sends a message from `idle_open` and verifies it becomes a new visible turn rather than a dormant ask response.

---

### 2) Steering with feedback duplicates `user_feedback`

- **Severity:** medium
- **Category:** `patch`
- **Files:**
  - `src/core/controller/index.ts`
  - `src/core/task/index.ts`

**Detail:**
`interruptTaskWithFeedback()` now persists the steering payload by calling `interruptedTask.say("user_feedback", ...)` before aborting. It then resumes the task from history with `response: "messageResponse"`. Inside `resumeTaskFromHistory()`, the same payload is emitted again because the method also calls `say("user_feedback", ...)` whenever it sees a message response or text payload. That means the user’s steering input is written twice.

**Why it matters:**
This produces duplicate user-feedback bubbles and can double-count the same steering content in the conversation history.

**Recommended remediation:**
- Emit `user_feedback` in exactly one place.
- Prefer keeping the explicit persistence in the controller, and add a suppression flag or branch in `resumeTaskFromHistory()` so it does not re-emit feedback that has already been recorded.
- Add a regression test that steers with text/images/files and asserts only one `user_feedback` message is appended.

---

### 3) The `threadDisplayState` wire contract is incomplete in this commit

- **Severity:** medium
- **Category:** `patch`
- **Files:**
  - `src/shared/ExtensionMessage.ts`
  - `src/shared/proto-conversions/cline-message.ts`

**Detail:**
The app-side contract now carries `threadDisplayState` and the conversion layer imports `ProtoThreadDisplayState`, but this commit does not include the matching shared proto/schema update in the tracked source tree. As a result, the new field is not fully defined as a wire-level contract in this change set, so round-tripping the passive state through the shared backend protocol is not guaranteed.

**Why it matters:**
The new passive lifecycle only works if the backend, controller, and webview all agree on the serialized representation. Without the schema update, the new state is easy to lose or break during serialization.

**Recommended remediation:**
- Update the shared proto/schema source that generates `@shared/proto/cline/ui` to include `threadDisplayState` / `ThreadDisplayState`.
- Regenerate any derived code and verify the field round-trips end-to-end.
- Add a serialization test that exercises `convertClineMessageToProto()` and `convertProtoToClineMessage()` with `idle_open`.

## Remediation Priorities

1. Fix passive-open message handling so composer input starts a real turn.
2. Remove the duplicate `user_feedback` emission in the steer path.
3. Add/verify the shared proto schema update for `threadDisplayState`.

## Specific Remediation Action Plan

The fixes should be implemented as a small coordinated series rather than as isolated patches. The main goal is to restore a predictable interaction contract:

- passive-open threads must accept human input as a real new turn
- steering must never disappear just because the parent is blocked on `use_subagents`
- passive reopen must prefer the freshest state and must not mutate task history as a read side effect
- frontend passive rendering must agree with the backend state machine

### Root-cause focus from `6e7d8cc`

The most important thing to fix is not "`use_subagents` is new" in the abstract. The sharper problem introduced by `6e7d8cc` is a contract mismatch:

- the commit made passive, visible, interactable thread states first-class (`idle_open`, `paused`)
- the webview was updated to allow freeform human input in those states
- but the backend still only has two real delivery modes for freeform text:
  - interrupt active work when `controller.isTaskActivelyRunning()` is true
  - store the text as a response to an already pending ask

That means `6e7d8cc` introduced a third interaction state without introducing a matching third input-routing policy. In practice, the same `messageResponse` payload can now arrive from a thread that is:

- visible and interactable
- not actively streaming
- not waiting on a concrete ask
- still logically in the middle of a long-running parent operation

The current code has no durable semantics for that state, so the message either gets parked as dormant `askResponse` data or requires a narrow "active task" predicate that does not cover long-running waits like `use_subagents`.

The remediation plan below should be read through that lens: the fix is to add an explicit interaction policy for "human input arrives while the agent is conversationally open but not currently inside an ask and not actively streaming."

### Phase 1: Repair steer delivery semantics before more workflow testing

**Goal:** make soft interrupt behavior credible again, especially during long `use_subagents` waits.

- Do not treat "the tool is still running" and "the agent is blocked waiting on the tool" as the same thing.
- For `use_subagents`, move from the current fully blocking wait model to an asynchronous wait model: the subagent batch must keep running even if the parent agent temporarily stops sitting in the blocking wait state.
- When a steer request arrives during that wait, the parent agent must be able to see it immediately and choose to act on it immediately.
- Acting on the steer must not abort, restart, or discard the already-running subagent batch by default.
- After handling the steer request, the parent agent must be able to resume waiting on the same in-flight `use_subagents` operation and later receive its result normally.
- If the product later wants an explicit "cancel subagents" action, that should be a separate control and not a side effect of ordinary steer handling.
- Keep the current "soft interrupt" policy for short-lived active work if desired, but do not allow multi-minute subagent waits to leave the human effectively disconnected from the thread.

**Required behavioral contract:**
- If the agent can see a steer request, it must be able to choose to stop blocking on the wait and read/respond to that request.
- Doing so must not terminate the tool it was waiting on.
- After responding, the agent must be able to re-enter the waiting state for that same tool request without reissuing it.
- A solution where the steer is visible but cannot be acted on until the tool finishes is not sufficient.
- A solution where acting on the steer forces the tool request to restart is also not sufficient.

**Implementation targets:**
- `src/core/controller/task/askResponse.ts`
- `src/core/controller/index.ts`
- `src/core/task/index.ts`
- `src/core/task/tools/handlers/SubagentToolHandler.ts`
- `src/core/task/TaskState.ts`
- any supporting tool-execution state needed to represent a resumable in-flight long-running tool wait

**Why these files are the actual hotspot from `6e7d8cc`:**
- `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts` gained a new passive-open branch that sends `messageResponse` even when there is no pending ask.
- `src/core/task/index.ts` introduced first-class passive thread states (`IDLE_OPEN`, `PAUSED`) and made those states part of normal task lifecycle.
- `src/core/controller/index.ts` changed active steer recovery away from the old reopen-into-followup pattern and toward passive reopen.
- `src/core/controller/task/askResponse.ts` did **not** gain a new routing mode to match those new passive states; it still only distinguishes "active interrupt" vs "hand the response to the current ask waiter."

Taken together, those changes make `6e7d8cc` the likely source of the regression even though `use_subagents` itself predates the commit.

**Test coverage to add:**
- blocked parent awaiting `use_subagents` receives steer text/images/files
- parent can leave the blocking wait, read/respond to the steer, and then resume waiting
- the original subagent batch continues running while the parent handles steer
- the parent later receives the result of that original in-flight batch without restarting it
- parent does not need a subagent to "tell it" that a steer happened

**Design note:**
- This aligns with the Codex-inspired policy direction already captured in the spec: `queue / steer / interrupt` should be an explicit interaction model, not an accidental side effect of whether the parent is currently inside a long-running tool wait.
- The current `use_subagents` implementation does **not** satisfy this requirement yet: it blocks inside `await Promise.allSettled(execution)`, which means Cline currently lacks a generic detached-wait/resume pattern for this tool path even though other parts of the product already track background activity.

### Phase 2: Fix passive-open human input so reopened threads are actually usable

**Goal:** make `idle_open` behave like a legitimate human-first conversation state.

- Replace the current passive-open `askResponse(messageResponse)` path with an explicit "start new turn from passive thread" path.
- Reserve `askResponse()` for real pending asks only.
- Ensure the UI does not optimistically clear or disable the composer until the backend has accepted the new turn.

**Implementation targets:**
- `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`
- `src/core/controller/task/askResponse.ts`
- `src/core/controller/index.ts`

**Test coverage to add:**
- sending text from `idle_open` creates a visible new turn
- sending text from `idle_open` does not silently set dormant `askResponse` state
- passive-open composer remains usable after the send completes

### Phase 3: Make passive reopen prefer live state and stop mutating history on failed reads

**Goal:** remove stale-history reopen behavior and the destructive `deleteTaskFromState()` side effect.

- When passively reopening the currently loaded task, treat in-memory `apiConversationHistory` and `clineMessages` as the primary source of truth.
- Only fall back to disk-loaded history when the current task is not already loaded or when in-memory state is clearly absent.
- Remove or isolate the `deleteTaskFromState()` behavior from `getTaskWithId()` so failed reads do not silently rewrite task history during passive reopen.
- If cleanup of corrupt history entries is still needed, move that into an explicit repair path rather than a normal read path.

**Implementation targets:**
- `src/core/controller/index.ts`

**Test coverage to add:**
- cancel during recent streaming reopens with the freshest visible in-memory messages
- passive reopen does not remove the task from history when a persisted file is missing
- steer/cancel fallback keeps history and visible thread state aligned

### Phase 4: Unify passive display-state handling across backend and webview

**Goal:** make the UI treat the backend's actual passive states consistently during abort cleanup and reopen.

- Treat both `PAUSED` and `IDLE_OPEN` as passive display states in the webview.
- Keep the "Thinking..." row, active action buttons, and any active-run affordances suppressed for both passive states.
- Audit any other UI components that key off `currentTaskItem.threadDisplayState` to ensure they do not assume `idle_open` is the only passive state.

**Implementation targets:**
- `webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts`
- `webview-ui/src/components/chat/chat-view/components/layout/ActionButtons.tsx`
- `webview-ui/src/components/chat/chat-view/components/layout/MessagesArea.tsx`
- `webview-ui/src/components/chat/ChatRow.tsx`

**Test coverage to add:**
- abort transition renders passive UI for `PAUSED`
- transition from `PAUSED` to `IDLE_OPEN` does not re-enable active controls or "Thinking..." in between

### Phase 5: Finish the contract cleanup and close the regression gaps

**Goal:** make the passive-thread model durable instead of behaviorally fragile.

- Verify the `threadDisplayState` proto/schema source is updated, regenerated, and round-tripping end-to-end.
- Keep the `user_feedback` de-duplication fix from `e45ec3a` as the single source of truth for active steer persistence.
- Add controller/webview/task regression coverage for:
  - passive reopen
  - cancel with preserve-visible-thread
  - active steer
  - deferred steer during `use_subagents`
  - passive-open new-turn send
- Re-run the built-in workflow / subagent review scenario after the above fixes land to confirm the parent no longer becomes effectively detached from the user during long subagent waits.

### Recommended delivery order

1. Land Phase 1 first, because long-running `use_subagents` waits currently create the most damaging interaction failure.
2. Land Phase 2 next, because passive-open threads are otherwise still misleadingly interactive.
3. Land Phases 3 and 4 together, since both are part of making passive reopen deterministic and visually correct.
4. Finish with Phase 5 contract/tests cleanup and then repeat the same runtime validation scenario.

## Secondary Action Plan For Outstanding Items

This follow-on plan is intentionally narrower. It assumes the in-flight patch work has already improved:

- finding `#2` active steer duplication
- finding `#4` passive reopen freshness / read-side deletion
- finding `#5` passive UI handling for `PAUSED`

The remaining work should focus only on the still-open gaps: `#1`, `#3`, and `#6`.

### Outstanding A: Close finding `#1` with a real passive-open continuation path

**Problem still open:**
- passive-open send is still too easy to route through `askResponse(messageResponse)` as if it were just another pending-ask response
- that does not create a clear, explicit human-first continuation contract for reopened threads

**Required fix:**
- add an explicit passive-open continuation path that turns human input into a real resumed turn
- do not rely on the generic dormant `askResponse` storage behavior
- keep the UI and backend semantics aligned so the composer only clears when the continuation is actually accepted

**Proof required:**
- a focused test showing that input from `idle_open` becomes a real resumed turn
- no dormant `askResponse` state left behind

### Outstanding B: Prove and fix the `use_subagents` steer regression from `6e7d8cc`

**Working hypothesis to validate:**
- `6e7d8cc` introduced new passive/open state routing
- while `use_subagents` is active, the parent still has live work in progress, but it may no longer satisfy the narrow active-work predicate used by `askResponse()`
- as a result, steer is misrouted because the parent is no longer classified correctly during the subagent-execution window

**What must be proven in code/tests:**
- whether the parent thread is left in the wrong interaction classification after `use_subagents` approval resolves
- whether subagent status streaming inherits or preserves the wrong `threadDisplayState`
- whether `controller.isTaskActivelyRunning()` is now too narrow for the `use_subagents` execution window under the post-`6e7d8cc` state model

**Required fix characteristics:**
- restore the pre-`6e7d8cc` behavior where the parent can still engage with steer while subagents are active
- do not broaden this into a brand-new detached async-tool architecture unless the code proves that is unavoidable
- fix the specific state/routing regression first

**Proof required:**
- a focused regression test that reproduces the broken `use_subagents` steer path under the new state model
- a passing test that shows steer is routed correctly again while subagents are active
- evidence that the fix does not regress ordinary passive-open behavior

### Outstanding C: Finish finding `#3` contract cleanup

**Problem still open:**
- the `threadDisplayState` contract and round-trip coverage are still not fully closed out as part of this remediation sequence

**Required fix:**
- verify the schema / proto source of truth is actually aligned with the runtime types
- verify regenerated artifacts are correct if regeneration is needed
- add or tighten round-trip coverage so the passive/open states are not merely app-local assumptions

**Proof required:**
- serialization / round-trip test coverage for the passive states used by the runtime

### Verification Rules For The Follow-On Patch

- Do not claim `#6` is fixed unless there is a focused regression test that demonstrates the repaired `use_subagents` steer path.
- Do not claim `#1` is fixed unless the passive-open path is explicit and tested.
- If `#6` cannot be fully fixed in one pass, the patch must still identify the exact failure point in code and lock it down with a failing-or-now-passing focused test so the team stops guessing.
- Keep the patch as narrow as possible and avoid redesigning unrelated tool execution behavior.

---

## Additional Runtime Validation Findings

### 4) Passive reopen can overwrite fresher in-memory state with stale disk history and may delete the task from history

- **Severity:** high
- **Category:** `patch`
- **Files:**
  - `src/core/controller/index.ts`

**Detail:**
`openHistoricalTaskPassively()` snapshots live in-memory `apiConversationHistory` and `clineMessages`, but then overwrites them with persisted task data whenever `getTaskWithId()` succeeds. That means a cancel or steer that lands while disk persistence is still racing can reopen the thread using stale on-disk history instead of the fresher just-aborted in-memory state.

There is a second problem in the same path: if `getTaskWithId()` cannot find the API history file, it calls `deleteTaskFromState(id)` before throwing. In the passive-open flow, that means the controller can fall back to keeping the conversation visible in memory while silently removing its history entry from task history.

**Why it matters:**
This can make passive reopen nondeterministic, lose newly generated context, or orphan a still-visible thread from its persisted task history.

**Recommended remediation:**
- Prefer live in-memory state when passively reopening the currently loaded task.
- Treat disk state as a fallback only when in-memory state is unavailable or clearly incomplete.
- Remove the destructive `deleteTaskFromState()` side effect from this read path, or at minimum prevent it from firing during passive reopen of the active task.
- Add a regression test that cancels/steers during recent streaming activity and verifies passive reopen preserves the newest visible history and keeps the task in history.

---

### 5) Frontend only treats `idle_open` as passive even though the backend emits `PAUSED` during abort cleanup

- **Severity:** medium
- **Category:** `patch`
- **Files:**
  - `webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts`
  - `webview-ui/src/components/chat/chat-view/components/layout/ActionButtons.tsx`
  - `webview-ui/src/components/chat/chat-view/components/layout/MessagesArea.tsx`
  - `webview-ui/src/components/chat/ChatRow.tsx`
  - `src/core/task/index.ts`

**Detail:**
The frontend helper `isPassiveThreadOpen()` only recognizes `idle_open`. However, `abortTask()` explicitly sets `threadDisplayState = PAUSED` and posts state before later settling on `IDLE_OPEN`. During that window, the UI still treats the thread as active and can continue showing "Thinking..." or active action controls instead of the passive reopened-thread presentation.

**Why it matters:**
Cancel and steer flows can briefly show the wrong interaction model while abort cleanup is still unwinding, which risks contradictory controls and confusing transitions.

**Recommended remediation:**
- Treat both `PAUSED` and `idle_open` as passive display states in the webview.
- Add a focused UI-state test that exercises the abort transition and confirms the passive presentation is stable across both states.

---

### 6) While blocked in `use_subagents`, the parent agent appears unable to consume human steer input directly

- **Severity:** high
- **Category:** `patch`
- **Files:**
  - `src/core/task/tools/handlers/SubagentToolHandler.ts`
  - `src/core/controller/task/askResponse.ts`
  - `src/core/controller/index.ts`
  - `src/core/task/index.ts`

**Detail:**
In live validation, the parent agent remained active enough to receive subagent progress and completion output while blocked inside `use_subagents`, but it did not appear to consume a human steer attempt sent during that wait. After the subagents completed, the parent agent resumed work and only reasoned about the steer attempt because the subagent findings mentioned it.

This suggests a split state where the parent remains connected to internal subagent/event plumbing but is effectively detached from the human thread input path while awaiting `use_subagents` completion.

**Why it matters:**
That behavior undermines steer as a soft interrupt. Even if deferral during subagent execution is acceptable, the steer input should still be delivered to the parent once the wait completes rather than being lost as direct user feedback.

**Recommended remediation:**
- Treat steer attempts that arrive during `use_subagents` as deferred user feedback that must be replayed to the parent when the tool completes.
- Add an end-to-end regression test where the parent is blocked awaiting subagents, the user sends steer text, and the parent later consumes that steer directly rather than only learning of it through subagent output.
- Investigate whether non-active or waiting thread-state interactions are being exposed to sibling/subagent runs through an unintended channel.
