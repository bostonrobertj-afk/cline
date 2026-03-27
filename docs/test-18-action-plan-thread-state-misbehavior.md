## Goal

Fix the intermittent post-`send_user_message` thread lock described in [test-18-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-18-findings.md) by making the webview treat `active_user` as authoritative over stale trailing partial rows and by adding logging/tests that prove the UI stays user-owned after the backend handoff.

## Root Principle

The backend already appears to be transitioning correctly in the captured case:
- `response_tool_turn_ended`
- `nextState: "active_user"`

The problem is therefore in webview state derivation, not task-loop handoff. The UI must not infer “task still running” from an old partial row when `threadDisplayState === "active_user"`.

## Implementation Steps

### 1. Make `active_user` override stale streaming rows in footer/button derivation

File: [webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts)

Current decision points:
- [buttonConfig.ts:227](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts#L227)
- [buttonConfig.ts:240](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts#L240)
- [buttonConfig.ts:249](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts#L249)

Problem:
- `getButtonConfig(...)` checks `message.partial === true` before it considers whether the thread is already user-owned.
- That means a trailing partial preview row can still produce the `partial` config (`Steer` / `Cancel`) even after the backend has transitioned the thread to `active_user`.

Required changes:
- Add an explicit `active_user` branch near the top of `getButtonConfig(...)`, before the streaming/partial branch.
- For `threadDisplayState === "active_user"`, return a user-owned config that does not expose `steer` or `cancel`.
- Preserve explicit pending-ask states if they ever coexist with `active_user`, but for ordinary `say`/partial rows the config should fall back to a non-running footer state.
- Do not reuse the current `api_req_active` config for `active_user`; that is the bug.

Recommended implementation shape:
- Add a dedicated `BUTTON_CONFIGS.active_user` entry or return `BUTTON_CONFIGS.default` for `active_user` non-ask rows.
- Keep `isPassiveThreadOpen(...)` unchanged; `active_user` is not passive. It just must not be treated as actively running.

Acceptance criteria:
- `getButtonConfig(...)` never returns `partial` or `api_req_active` when `threadDisplayState === "active_user"` and the last row is only a stale partial/say artifact.
- The primary action is not `steer` and the secondary action is not `cancel` for a user-owned thread.

### 2. Align message-send routing with the same authoritative ownership rule

File: [webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)

Current decision points:
- [useMessageHandlers.ts:17](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L17)
- [useMessageHandlers.ts:114](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L114)
- [useMessageHandlers.ts:146](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L146)

Problem:
- The hook already routes `active_user` correctly before `isTaskRunning`, but the logic is still split across:
  - `threadDisplayState`
  - `clineAsk`
  - `lastMessage.partial`
  - `lastMessage.say === "api_req_started"`
- That makes it easy for the footer and send-path logic to diverge again.

Required changes:
- Introduce one local derived condition for “thread is user-owned” and one for “task is actively running”.
- Make “actively running” explicitly false when `threadDisplayState === "active_user"`.
- Keep `active_user` normal-turn sends routed through `messageResponse`, even if the last row still looks like a partial stream artifact.
- Add targeted webview-side logging when:
  - `threadDisplayState === "active_user"`
  - the last row still looks streaming (`partial === true` or `say === "api_req_started"`)
  - a message is being sent or a button config is being derived

Recommended logging payload:
- `threadDisplayState`
- `lastMessage.type`
- `lastMessage.say`
- `lastMessage.partial`
- derived `isTaskRunning`
- derived route or button action

Acceptance criteria:
- For an `active_user` thread, composer sends always go through the normal next-turn path, not the steer path.
- Diagnostic logs make it obvious when the UI sees a stale partial row but still chooses the correct user-owned behavior.

### 3. Audit and neutralize trailing partial preview dominance after response-tool handoff

Primary files:
- [webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts)
- [webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)

Supporting runtime evidence:
- [src/core/task/index.ts:424](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L424)
- [src/core/task/index.ts:501](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L501)

Problem:
- The captured logs suggest the backend transitions to `active_user` correctly, but the webview can still behave as if a stream is active if the final visible row is a leftover partial preview.

Required changes:
- Treat any stale partial preview as lower priority than `active_user`.
- Confirm there is no other UI derivation path outside `buttonConfig.ts` / `useMessageHandlers.ts` that still infers “running” solely from the last row.
- If one exists, move that logic behind the same “user-owned thread wins” rule.

Acceptance criteria:
- Once the backend publishes `active_user`, no stale partial row can keep the footer in a steering/cancel state.

### 4. Update existing button-state regression coverage

File: [webview-ui/src/components/chat/chat-view/shared/buttonConfig.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.test.ts)

Current test to update:
- [buttonConfig.test.ts:68](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.test.ts#L68)

Required changes:
- Replace the current expectation that `active_user` yields `BUTTON_CONFIGS.api_req_active`.
- Add a focused regression test where:
  - `threadDisplayState === "active_user"`
  - `message.partial === true`
  - or `message.say === "api_req_started"`
- Assert that:
  - the config is not `BUTTON_CONFIGS.partial`
  - `primaryAction !== "steer"`
  - `secondaryAction !== "cancel"`
  - sending remains enabled

Acceptance criteria:
- The exact stale-partial + `active_user` case from the finding is covered in a unit test.

### 5. Extend active-user send-path hook tests for stale partial rows

File: [webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx)

Current test anchor:
- [useMessageHandlers.test.tsx:84](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx#L84)

Required changes:
- Keep the existing `active_user` next-turn routing test.
- Add a second case where:
  - `mockThreadDisplayState.value = "active_user"`
  - the last message is a stale partial row or `say: "api_req_started"`
- Assert that `handleSendMessage(...)` still calls `askResponse` with `responseType: "messageResponse"` and does not route through steer semantics.
- If webview logging is added, optionally spy on the logger/console to assert the mismatch case is surfaced.

Acceptance criteria:
- The send hook cannot regress into steer routing for user-owned threads just because the last row looks streaming.

### 6. Add a user-visible integration assertion for the handoff state

Recommended test surface:
- existing webview component tests around chat footer/action derivation, or add one if no suitable host exists

Candidate files to inspect/extend:
- [webview-ui/src/components/chat/ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx)
- any footer/action-button component tests already covering button derivation

Required assertion:
- Simulate the post-response-tool state:
  - last visible row still looks partial/running
  - `threadDisplayState === "active_user"`
- Assert:
  - composer remains enabled
  - the primary footer action is not `Steer`
  - the secondary footer action is not `Cancel`

This can be satisfied either by:
- a focused component-level footer test, or
- a stronger combined hook + config test if that is the lighter-weight existing pattern in this codebase

Acceptance criteria:
- There is at least one test that checks the user-visible outcome, not just the raw config helper.

## Verification

Run at least:

1. `npm run test:unit -- --exit webview-ui/src/components/chat/chat-view/shared/buttonConfig.test.ts`
2. `npm run test:unit -- --exit webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`
3. Any chat footer/component test added for the user-visible handoff state
4. `npx tsc --noEmit`

If the webview test command differs in this repo, use the existing frontend unit-test entrypoint that already covers the above files.

## Expected Result

After these changes:
- backend `response_tool_turn_ended -> active_user` handoff remains the source of truth
- stale partial rows can no longer force `Steer` / `Cancel` onto a user-owned thread
- the composer remains usable after `send_user_message` handoff
- future regressions are caught by targeted button-state, send-routing, and user-visible handoff tests
