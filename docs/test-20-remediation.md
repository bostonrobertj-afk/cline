
# Requirements
- Steer/Cancel button availability must be driven by a local isProcessing flag in ActionButtons.tsx instead of setEnablebuttons, which should be removed.
- setSendingDisabled must be state-driven ONLY:
    active_user: setsendingDisabled(false)
    idle_open: setSendingDisabled(false)
    active_run: setSendingDisabled(true)
    completed: setSendingDisabled(false)
    paused: setSendingDisabled(false)
    awaiting_user_response (user): setSendingDisabled(false)
    awaiting_user_response (system): setSendingDisabled(true)


state: awaiting_user_response
    Child state: awaiting_user_response.user
        Scope: The run is awaiting human input, approval, or selection. The composer is user-enabled and the next response resumes the blocked ask/run.
    Child state: awaiting_user_response.system
        Scope: The current ask/message state is internal system or tool-preview plumbing, not a true human wait state. The composer must not treat this as a user-owned turn.

## Proposed Update Sites for new awaiting_user_response subtypes:

Definite:
- [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)
  This is the big one.
  It currently has one `isAwaitingUserResponseThreadState` bucket for send routing.
  If you add a subtype:
  - `awaiting_user_response.user` should allow human reply semantics
  - `awaiting_user_response.system` should not

  user note: agree

- [ChatTextArea.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatTextArea.tsx) indirectly, via whatever derives `sendingDisabled`
  As you said, composer enablement must branch here at some level.

  user note: agree

Very likely:
- [buttonConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts)
  If `awaiting_user_response.user` and `.system` should present different footer controls, this file must branch.
  Example:
  - user wait: maybe followup/approve/etc. controls
  - system wait: likely no user-directed controls

  user note: This is governed by setEnableButtons, and we already aligned to migrating this to a local isProcessing flag so that it only becomes false for a brief window after a user message is sent.

- [messageUtils.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/utils/messageUtils.ts)
  It currently treats `awaiting_user_response` as a user-ready state for suppressing the thinking loader.
  If `.system` is not truly user-ready, this helper would need to branch.

  user note: agree

Likely on backend/controller side:
- [askResponse.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/askResponse.ts)
  Right now it doesn’t special-case `awaiting_user_response`; those requests fall through to `handleWebviewAskResponse(...)`.
  If `awaiting_user_response.system` should not accept ordinary human reply flow the same way, this route likely needs to know the subtype.

  user note: disagree- leave as-is.

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
  Wherever `setThreadDisplayState(... awaiting_user_response ...)` happens for asks, you would need to decide whether each call site is:
  - `.user`
  - or `.system`

user note: agree

Possibly, depending on your UX goals:
- [MessagesArea.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/components/layout/MessagesArea.tsx)

user note: leave alone for now.

  Only if you want different visible loading/placeholder behavior.
- [extensionStateUtils.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/context/extensionStateUtils.ts)
  Probably not unless subtype affects message preservation/reconnect behavior.

user note: leave alone for now.

