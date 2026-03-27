# Test 19 Remediation Plan

## Goal

Resolve the `test-19` failure mode where the agent finishes with `send_user_message`, the thread transitions to `active_user`, but the human cannot respond because stale ask-derived UI state still overrides the canonical thread state.

This implementation must enforce one rule throughout the stack:

- `threadDisplayState` is the authoritative source for allowed UI actions and message routing.
- Ask/message metadata such as `clineAsk` may inform presentation, but must not override canonical thread ownership.

## Verified Root Cause

The logs show this sequence:

- ordinary tool preview streaming moves the task into `awaiting_user_response` via `ask_partial_started`
  - [docs/test-19-logs.md:67](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-19-logs.md#L67)
  - [docs/test-19-logs.md:405](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-19-logs.md#L405)
  - [docs/test-19-logs.md:1037](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-19-logs.md#L1037)
  - [docs/test-19-logs.md:1286](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-19-logs.md#L1286)
- the final `send_user_message` completes while the thread is still in that ask-owned state
  - [docs/test-19-logs.md:2099](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-19-logs.md#L2099)
  - [docs/test-19-logs.md:2100](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-19-logs.md#L2100)
- only then does the response-tool runtime hand off to `active_user`
  - [docs/test-19-logs.md:2107](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-19-logs.md#L2107)

The backend task loop therefore does reach `active_user`, but the webview still gives priority to stale ask metadata:

- `clineAsk` is derived solely from the last visible message in [useChatState.ts:30](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useChatState.ts#L30)
- send routing checks `clineAsk` before `active_user` in [useMessageHandlers.ts:72](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L72)
- button derivation still allows ask rows to win inside `active_user` in [buttonConfig.ts:245](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts#L245)

There is also a backend ask-lifecycle asymmetry:

- partial ask start sets thread state at [index.ts:943](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L943)
- the `isUpdatingPreviousPartial` completion branch updates the message but does not emit `ask_completed` or post full state at [index.ts:959](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L959)
- removing a partial ask row does not repair thread state at [index.ts:1222](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1222)

## Required Changes

### 1. Make `threadDisplayState` authoritative in frontend send routing

File to edit:

- [webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)

Relevant current lines:

- [useMessageHandlers.ts:17](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L17)
- [useMessageHandlers.ts:72](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L72)
- [useMessageHandlers.ts:114](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L114)
- [useMessageHandlers.ts:134](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L134)
- [useMessageHandlers.ts:157](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L157)

Prescribed changes:

1. Reorder `handleSendMessage(...)` so state-based routing runs before `clineAsk` routing.
2. Keep the `messages.length === 0` new-task branch first.
3. Immediately after that, add explicit canonical-state routing in this order:
   - `active_user` -> always send `AskResponseRequest { responseType: "messageResponse" }`
   - passive-open (`idle_open` / `paused`) -> send `messageResponse`
   - `active_run` -> send `steerMessage` for interruption/steer semantics
   - `awaiting_user_response` -> only here may `clineAsk` drive ask-response behavior
4. Move the current `else if (clineAsk)` branch so it executes only when `threadDisplayState === "awaiting_user_response"`.
5. Add a diagnostic log when `clineAsk` is present but ignored because canonical thread state is `active_user`, `active_run`, `idle_open`, or `paused`.
6. Do not leave any code path where stale `clineAsk` can preempt `active_user`.

Implementation note:

- Do not remove `clineAsk` from the hook entirely in this change. Keep it available for true ask-owned threads, but make it subordinate to canonical state.

### 2. Make button/config derivation obey canonical thread state first

File to edit:

- [webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts)

Relevant current lines:

- [buttonConfig.ts:236](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts#L236)
- [buttonConfig.ts:240](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts#L240)
- [buttonConfig.ts:245](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts#L245)
- [buttonConfig.ts:269](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts#L269)

Prescribed changes:

1. Change the `active_user` override so it returns `BUTTON_CONFIGS.default` for all last-message types, including `ask`.
2. Keep the existing stale-streaming diagnostic, but expand it so it also logs stale ask rows suppressed inside `active_user`.
3. Do not allow `message.type === "ask"` alone to produce buttons when `threadDisplayState === "active_user"`.
4. Preserve current button behavior for real ask-owned threads when `threadDisplayState === "awaiting_user_response"`.

Result required after this change:

- if the task says `active_user`, the footer must show a normal open composer with no ask-driven buttons, even if the last visible row is an old `ask:"tool"` message.

### 3. Close the backend ask lifecycle when partial asks are finalized

File to edit:

- [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)

Relevant current lines:

- [index.ts:943](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L943)
- [index.ts:959](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L959)
- [index.ts:990](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L990)
- [index.ts:1040](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1040)
- [index.ts:1061](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1061)

Prescribed changes:

1. In the `ask(...)` method, update the `isUpdatingPreviousPartial` branch at [index.ts:959](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L959).
2. After `updateClineMessage(...)`, call:
   - `setThreadDisplayState(threadDisplayState ?? getThreadDisplayStateForAsk(type), "ask_completed", { askType: type, partial: false, updatedPartial: true })`
   - `postStateToWebview()`
3. Keep the stable timestamp behavior exactly as-is; do not change the message `ts`.
4. Keep the partial message event emission, but do not rely on it as the only state propagation for a completed ask.
5. Do not change the later `ask_resolved` logic at [index.ts:1061](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1061). That path should still restore `active_run` when a true ask response arrives.

Why this exact change is required:

- The current code emits `ask_partial_started` but can skip `ask_completed` for the same ask row.
- This leaves the state timeline incomplete and is the direct reason the logs show `awaiting_user_response` persisting until a later unrelated transition overwrites it.

### 4. Repair thread state when a stale partial ask row is explicitly removed

File to edit:

- [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)

Relevant current lines:

- [index.ts:1222](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1222)

Prescribed changes:

1. Extend `removeLastPartialMessageIfExistsWithType(...)` so removing a partial `ask` row is not only a message-history mutation.
2. After removing the last partial ask row:
   - inspect the new last message
   - if the task is currently `awaiting_user_response`
   - and the new last message is not a pending `ask`
   - and the task is not aborted
   - then call `setThreadDisplayState(ThreadDisplayStates.ACTIVE_RUN, "partial_ask_removed")`
   - then call `postStateToWebview()`
3. Do not perform this repair when removing a `say` row.
4. Do not change passive/open/completed thread states in this helper.

This change is required because several handlers deliberately remove stale partial ask rows before replacing them with `say` rows or final messages:

- [ReadFileToolHandler.ts:48](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/ReadFileToolHandler.ts#L48)
- [ListFilesToolHandler.ts:49](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/ListFilesToolHandler.ts#L49)
- [SearchFilesToolHandler.ts:198](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SearchFilesToolHandler.ts#L198)
- [ReadFileRangeToolHandler.ts:45](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/ReadFileRangeToolHandler.ts#L45)

Today those removals can leave the task in `awaiting_user_response` even after the ask row is gone.

### 5. Add regression tests that lock the contract

#### Frontend send-routing tests

File to edit:

- [webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx)

Relevant current lines:

- [useMessageHandlers.test.tsx:84](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx#L84)

Add these tests:

1. `active_user` + last message is `ask:"tool"` + `clineAsk === "tool"`:
   - `handleSendMessage(...)` must still send `responseType: "messageResponse"`
   - it must not branch into ask-reply handling
2. `active_user` + stale `ask:"followup"` row:
   - same expectation; state wins over stale ask metadata
3. `awaiting_user_response` + `clineAsk === "tool"`:
   - preserve current ask-response behavior
   - `responseType` should remain `messageResponse`

#### Frontend button-config tests

File to edit:

- [webview-ui/src/components/chat/chat-view/shared/buttonConfig.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.test.ts)

Relevant current lines:

- [buttonConfig.test.ts:68](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.test.ts#L68)
- [buttonConfig.test.ts:84](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.test.ts#L84)

Add these tests:

1. `threadDisplayState === "active_user"` with a last message of `type:"ask", ask:"tool"` returns `BUTTON_CONFIGS.default`
2. `threadDisplayState === "active_user"` with a last message of `type:"ask", ask:"followup"` returns `BUTTON_CONFIGS.default`
3. `threadDisplayState === "awaiting_user_response"` with `type:"ask", ask:"tool"` still returns the ask-driven config

#### Backend ask lifecycle tests

Create a new test file:

- `src/core/task/__tests__/askLifecycle.test.ts`

Prescribed tests:

1. `Task.ask(...)` partial-finalization branch emits `ask_completed` and posts state:
   - seed a partial ask message
   - invoke the `isUpdatingPreviousPartial` code path
   - assert `setThreadDisplayState(..., "ask_completed", ...)` was called
   - assert `postStateToWebview()` was called
2. `removeLastPartialMessageIfExistsWithType("ask", ...)` repairs stale `awaiting_user_response`:
   - seed `threadDisplayState = "awaiting_user_response"`
   - seed a last partial ask row
   - remove it
   - assert the state is restored to `active_run`
   - assert `postStateToWebview()` was called
3. Removing a partial `say` row must not alter thread state.

#### Response-tool regression test

File to edit:

- [src/core/task/__tests__/responseToolTurnFlow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/responseToolTurnFlow.test.ts)

Relevant current lines:

- [responseToolTurnFlow.test.ts:97](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/responseToolTurnFlow.test.ts#L97)

Add one more test:

1. If the task reaches `active_user` after `send_user_message`, stale ask metadata from the previous row must not change the next-turn routing contract.
   - simulate a stale `ask:"tool"` message still present in `clineMessages`
   - verify the follow-up path still behaves like a fresh human-authored next turn

## Implementation Order

The implementer must follow this order exactly:

1. Update backend `ask(...)` completion/state propagation in [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts).
2. Update backend partial-ask removal repair in the same file.
3. Update frontend routing in [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts).
4. Update frontend button derivation in [buttonConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts).
5. Add backend tests.
6. Add frontend tests.
7. Run the verification commands below.

## Verification Commands

Run these commands after implementation:

1. `npm run test:unit -- --exit src/core/task/__tests__/askLifecycle.test.ts src/core/task/__tests__/responseToolTurnFlow.test.ts`
2. `cd webview-ui && npm run test -- src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx src/components/chat/chat-view/shared/buttonConfig.test.ts`
3. `npx tsc --noEmit`

## Definition of Done

This remediation is complete only when all of the following are true:

1. `test-19` style logs no longer show a stale `ask_partial_started` timeline with no corresponding completion/state repair before `active_user`.
2. Once the task reaches `active_user`, the composer always sends a normal next-turn `messageResponse`, even if the last visible row is an old ask.
3. In `active_user`, no stale ask row can produce `Approve`, `Reject`, `Proceed`, `Steer`, or `Cancel` controls.
4. `clineAsk` remains usable only inside a true `awaiting_user_response` thread.
5. All verification commands pass.
