# Code Review Findings: `6e7d8cc`

## Review Scope

- Target: commit `6e7d8cc`
- Review source: commit diff only
- Context loaded: `thread-idle-state-implementation-spec.md`, `thread-idle-execution-01-task-state-contract.md`, `thread-idle-execution-02-controller-open-cancel-steer.md`, `thread-idle-execution-03-prompt-copy-and-webview.md`

## Summary

This review validated 2 actionable issues and rejected 4 earlier candidate findings.

- Confirmed `patch`: passive-open send is shadowed by stale `clineAsk` routing in `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`.
- Confirmed `patch`: steer during `use_subagents` is not consumed live; the parent remains blocked on the subagent wait and the steer is only replayed after the batch completes.
- Rejected: duplicate `user_feedback`, missing `threadDisplayState` proto/schema coverage, frontend passive-state handling limited to `idle_open`, and passive reopen deleting task history.

## Findings

### 1) Passive-open composer input is shadowed by stale ask-state routing

- **Severity:** high
- **Category:** `patch`
- **Files:**
  - `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`
  - `src/core/controller/task/askResponse.ts`

**Detail:**
`handleSendMessage()` checks `clineAsk` before `isPassiveThreadOpenState`. If a reopened thread still carries a legacy `resume_task` or `resume_completed_task` ask in the last message, Enter is routed to `yesButtonClicked` instead of the passive-open `messageResponse` path, even when `currentTaskItem.threadDisplayState === "idle_open"`.

**Why it matters:**
Reopened passive threads can mis-handle freeform composer input and send the wrong response type.

**Recommended remediation:**
- Check `isPassiveThreadOpenState` before `clineAsk`, or explicitly bypass legacy resume asks when the thread is passive-open.
- Add a regression test that sends composer input from `idle_open` with a stale resume ask and verifies it becomes a visible new turn.

---

### 2) Steering during `use_subagents` is deferred until the batch completes

- **Severity:** high
- **Category:** `patch`
- **Files:**
  - `src/core/task/tools/handlers/SubagentToolHandler.ts`
  - `src/core/controller/task/askResponse.ts`
  - `src/core/controller/index.ts`
  - `src/core/task/index.ts`

**Detail:**
`UseSubagentsToolHandler.execute()` blocks on `await Promise.allSettled(execution)`. While that wait is in flight, the parent cannot consume steer directly. In the observed flow, the steer is not applied to the running subagent batch; it is only available again after the batch finishes and the parent resumes. That makes the input behave like deferred feedback rather than a live soft interrupt.

**Why it matters:**
Human steer during long-running subagent work is delayed until the batch ends, so the user cannot redirect or correct the parent while subagents are still running.

**Recommended remediation:**
- Add a resumable wait model for subagent execution, or explicitly queue and replay steer payloads at the parent boundary.
- Add an end-to-end regression test that sends steer while `use_subagents` is active and verifies the parent consumes it directly after, without requiring the subagent batch to complete first.

## Rejected / Not Findings

- duplicate `user_feedback`
- missing shared `threadDisplayState` schema update
- frontend passive-state handling limited to `idle_open`
- passive reopen deleting task history

## Summary counts

- intent_gap: 0
- bad_spec: 0
- patch: 2
- defer: 0
- rejected-noise: 4
