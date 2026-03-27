**Findings**


# Medium: repeated partial native tool calls likely amplify all of this.

## Details
 The log behavior in `docs/test-16-findings.md` lines up with partial response-tool streaming where partials update UI state but do not constitute a final tool result; see [SendUserMessageHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SendUserMessageHandler.ts#L18). If the final non-partial completion is delayed or interrupted, the thread can be left in a stale half-running posture that makes the routing/state problems above much more visible.

**Likely root cause**

The strongest root cause is the early-return response-tool success path not persisting the finished tool result into conversation history. That appears to be what produces the later `result missing` artifacts and likely contributes to the thread state drift that made the UI/control flow feel suspended.

**Action Plan For Remaining Medium Finding**

# Goal

Keep provider streaming enabled for good UX, but treat partial response-tool updates as temporary preview state rather than durable conversation state.

# Target behavior

1. Partial tool-call updates are shown live in the UI.
2. Repeated partial updates for the same tool call update one in-progress preview instead of appending many pseudo-events.
3. Tool execution, tool-result creation, turn completion, and thread handoff happen only when the complete non-partial tool block arrives.
4. If streaming is interrupted before completion, the app discards or marks the preview as interrupted instead of leaving it looking like a completed tool turn.

# Detailed steps

## 1. Document the distinction between preview state and final state

Write down the rule in code comments and tests:

- partial tool blocks are preview-only
- complete tool blocks are authoritative

The code already leans this way in [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L541), but the surrounding behavior should consistently follow that rule.

## 2. Audit where partial native tool updates are currently emitted into UI state

Review the native tool streaming path end-to-end and identify every place partial tool calls are:

- appended as chat rows
- updated in place
- used to influence thread state
- used to influence completed-turn behavior

Primary files to inspect:

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts)
- [SendUserMessageHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SendUserMessageHandler.ts)
- [AttemptCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts)

## 3. Introduce an explicit per-call preview model for partial tool calls

Add or reuse a structure keyed by tool `call_id` so the app can track one in-progress preview per active tool call.

Recommended shape:

- `call_id`
- tool name
- current partial text/arguments
- preview status: `streaming`, `completed`, or `interrupted`

The important part is that multiple partial updates for the same tool call should map to one preview record, not many independent chat artifacts.

## 4. Coalesce partial updates by `call_id`

When a new partial update arrives for a tool call:

- find the existing preview for that `call_id`
- update its content in place
- do not append another separate visible row unless there is no existing preview yet

This should eliminate the “same partial tool call over and over” effect described in `test-16-findings.md`.

## 5. Restrict partial handlers to UI preview responsibilities only

Partial handlers like [SendUserMessageHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SendUserMessageHandler.ts#L18) should only:

- render/update preview text
- keep the preview associated with the same tool call

They should not:

- create durable `tool_result` content
- change thread state
- decide that a turn has completed
- influence persistence of API conversation history

## 6. Make complete non-partial tool blocks the only completion trigger

Only the final complete tool block should be allowed to:

- execute the tool
- create the real `tool_result`
- persist that result
- mark response-tool completion
- trigger `active_user` handoff or continued recursion

This preserves the current conceptual contract while making the partial path less brittle.

## 7. Add an explicit interruption cleanup path for partial previews

If the stream ends in error, cancellation, or provider interruption before a complete tool block arrives:

- find any preview records still marked `streaming`
- mark them `interrupted` or remove them
- do not leave them visually indistinguishable from completed output

This prevents the UI from looking like the tool almost-finished successfully when it actually did not.

## 8. Ensure thread-state transitions ignore partial preview state

Audit thread-state logic to make sure partial tool previews do not drive:

- turn handoff to `active_user`
- ask/completion state transitions
- final “done” behavior

Thread state should only move based on completed tool execution and completed response-tool turn handling, not partial previews.

## 9. Keep durable history based only on completed events

API conversation history should contain:

- the completed assistant tool call
- the completed `tool_result`

It should not contain synthetic durable entries representing partial preview updates.

That keeps history reconstruction stable and avoids mixing transport-level fragments with conversation-level state.

## 10. Add regression tests for coalescing behavior

Add tests that prove:

- repeated partial updates with the same `call_id` update one preview instead of creating multiple durable entries
- partial previews do not create `tool_result` history
- only the final complete block creates the persisted result

## 11. Add regression tests for interruption behavior

Add tests that prove:

- if a partial response-tool stream is interrupted before completion, the preview is marked interrupted or removed
- no completed turn state is produced from partial-only input
- no durable `tool_result` is persisted from an interrupted partial stream

## 12. Add regression tests for final replacement behavior

Add tests that prove:

- a partial preview is replaced or finalized by the complete tool block
- the final visible output is the completed tool result, not a leftover partial fragment
- turn completion only occurs after the final block

## 13. Verify OpenAI/native tool streaming specifically

Because the issue was observed with native response tools, run focused verification against the native streaming path for:

- `send_user_message`
- `attempt_completion`
- any other governed response tool that streams partial content

## 14. Manually validate failure and success cases

Run these scenarios manually after implementation:

1. Normal streamed `send_user_message` completion
2. Normal streamed `attempt_completion` completion
3. Interrupted partial `send_user_message`
4. Interrupted partial `attempt_completion`
5. Multiple repeated partial chunks for the same `call_id`

The expected outcome in each case is:

- one coherent preview while streaming
- one final completed result on success
- no fake completed result on interruption

## 15. Keep this issue scoped as secondary hardening

This work should remain scoped to preview-stream handling.
It should not re-open the already-fixed response-tool persistence path except where necessary to ensure that only complete blocks reach that persistence path.

# Definition of done

This medium finding is resolved when:

- partial response-tool updates are coalesced by `call_id`
- partial updates are preview-only
- complete tool blocks alone drive execution and persistence
- interrupted streams do not leave misleading pseudo-complete output behind
- repeated partial chunks no longer clutter the thread with many duplicate-looking lines
