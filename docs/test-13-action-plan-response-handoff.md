# Test 13 Action Plan: Add `active_user` And Restore Normal Dialogue Handoff

## Purpose

This action plan addresses the current-state issues surfaced in [test-13-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-13-findings.md):

- governed response tools are ending in the wrong shared thread state
- post-response user dialogue is being routed through passive reopen semantics
- reopened-thread prompt context is being injected where normal next-turn dialogue should be used
- workflow-aware `task_progress` prompting is incomplete for placeholder workflows
- prompt-level schema friction remains around `set_workflow_placeholders` and `attempt_completion`

This is a shared runtime, state-model, controller-routing, webview, and prompt-alignment plan. It is not a tool-level patch plan.

## Current-State Assessment

The current bug is caused by a missing first-class thread state for “the active thread is now waiting on normal human input.”

Today the relevant states are defined in [ExtensionMessage.ts:40-46](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L40):

- `active_run`
- `awaiting_user_response`
- `completed`
- `idle_open`
- `paused`

That is not enough to distinguish:

- the agent is actively working
- the thread is actively waiting on the human in the normal dialogue flow
- the thread is passively reopened from history
- the thread is waiting on a specific structured `ask(...)`

The current shared response-tool handoff is landing in the wrong one of those buckets:

- [ResponseToolRegistry.ts:9-49](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L9) currently ends all governed response tools in `idle_open`
- [askResponse.ts:38-55](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/askResponse.ts#L38) routes `idle_open` message responses into `resumePassiveTaskWithFeedback(...)`
- [buttonConfig.ts:29-35](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts#L29) treats `idle_open` and `paused` as passive-open states
- [MessagesArea.tsx:225-236](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/components/layout/MessagesArea.tsx#L225) shows `Conversation reopened` for passive-open threads
- [responses.ts:307-329](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/responses.ts#L307) injects reopened-thread prompt framing for that same path

So the current shared response-tool handoff is being treated as:

- passive reopen

when it should be treated as:

- active thread
- human now owns the turn
- next human message should start the next normal turn

## Required State Model Change

Add a new first-class thread display state:

- `active_user`

Its meaning must be:

- this is still the active thread
- the AI has ended its turn
- the human now owns the turn
- the composer should be enabled
- the next human message should continue the task as a normal next turn
- this is not a reopen/resume state
- this is not a pending structured-ask state

After this change, the intended meanings become:

- `active_run`
  - agent turn in progress

- `active_user`
  - active live thread
  - human turn
  - normal next-turn dialogue handoff

- `awaiting_user_response`
  - waiting on a specific `ask(...)` response

- `idle_open`
  - passive/reopened/cancelled thread visibility state

- `paused`
  - explicitly paused/interrupted thread

## Governed Response Tools That Must Use `active_user`

These tools must end the AI turn and set the thread to `active_user`:

- `attempt_completion`
- `send_user_message`
- `ask_followup_question`
- `generate_plan_output`
- `act_mode_respond`

## Exact Implementation Plan

### Phase 1: Add `active_user` To The Shared Thread State Model

1. Update [ExtensionMessage.ts:40-48](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L40).
   - Add `ACTIVE_USER: "active_user"` to `ThreadDisplayStates`.
   - Ensure `ThreadDisplayState` now includes `active_user`.

2. Update [proto/cline/ui.proto:17-25](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/ui.proto#L17).
   - Add a new enum member for `ACTIVE_USER`.
   - Do not repurpose an existing enum value.
   - Add it as a new explicit value so older states keep their meaning.

3. Regenerate/update the generated proto outputs that encode thread display state.
   - The repo already generates these from the proto, so the plan must include re-running proto generation after the enum change.
   - The generated outputs that will change include:
     - [src/shared/proto/cline/ui.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto/cline/ui.ts)

4. Update [cline-message.ts:78-120](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto-conversions/cline-message.ts#L78).
   - Add `active_user` to `convertClineThreadDisplayStateToProtoEnum(...)`.
   - Add `ProtoThreadDisplayState.ACTIVE_USER` to `convertProtoThreadDisplayStateToCline(...)`.

5. Update the thread-display-state tests in [thread-display-state.test.ts:37-69](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/thread-display-state.test.ts#L37).
   - Include `active_user` in round-trip coverage.
   - Assert it is distinct from `idle_open`, `awaiting_user_response`, and `active_run`.

### Phase 2: Reclassify Shared Runtime State Semantics

6. Update [index.ts:178-183](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L178).
   - Change `isActiveThreadDisplayState(...)` so it treats both:
     - `active_run`
     - `active_user`
     as active thread states.
   - Leave `isPassiveThreadDisplayState(...)` limited to:
     - `idle_open`
     - `paused`

7. Review [index.ts:213](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L213).
   - Keep the initial default if appropriate, but do not treat `idle_open` as the normal post-response state anymore.
   - The post-governed-response state must move to `active_user`, not `idle_open`.

8. Update [ResponseToolRegistry.ts:9-49](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L9).
   - Change `threadDisplayStateAfterTurnEnds` for all five governed response tools from `ThreadDisplayStates.IDLE_OPEN` to `ThreadDisplayStates.ACTIVE_USER`.
   - Do not introduce per-tool differences here.

9. Update shared response-runtime tests in [ResponseToolRuntime.test.ts:60-77](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts#L60).
   - Replace expectations of `IDLE_OPEN` with `ACTIVE_USER` for governed response tools.
   - Update any later assertions in this file that still encode `IDLE_OPEN`.

10. Update [index.ts:3678-3686](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3678).
    - Keep the shared completed-response-tool branch.
    - Ensure that when a governed response tool ends the turn, the task uses the registry-provided `ACTIVE_USER` state and posts that to the webview.
    - Do not add tool-level special handling here.

### Phase 3: Route `active_user` Through Normal Next-Turn Dialogue

11. Update [askResponse.ts:38-55](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/askResponse.ts#L38).
    - Keep the existing branches for:
      - active steering while running
      - passive reopen via `idle_open` / `paused`
      - pending `ask(...)` handling
    - Add a new explicit branch:
      - if `threadDisplayState === "active_user"`, route the message into a normal next-turn continuation path
    - That branch must not call `resumePassiveTaskWithFeedback(...)`.
    - That branch must not fall through to `handleWebviewAskResponse(...)`.

12. Add a controller helper parallel to [resumePassiveTaskWithFeedback(...) in controller/index.ts:552-566](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/index.ts#L552).
    - Add a new method such as `continueActiveUserThreadWithFeedback(...)`.
    - It must:
      - require a payload
      - call a task-side continuation method intended for normal next-turn dialogue
      - not use passive reopen/resume semantics

13. Add a task-side continuation method in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts).
    - Place it near other task continuation/resumption methods, especially around [resumeTaskFromHistory(...) in index.ts:1580-1675](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1580).
    - This new method must:
      - accept human text/images/files
      - build ordinary next-turn user content
      - set `threadDisplayState = ACTIVE_RUN`
      - continue the loop via the normal recursive request path
      - not call `resumeTaskFromHistory(...)`
      - not inject reopened-thread prompt context

14. Do not reuse [resumeTaskFromHistory("followup", ...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1613) for `active_user`.
    - That path is specifically tied to reopen/passive follow-up behavior.
    - It is the wrong semantic path for normal dialogue handoff.

15. Update [askResponse.test.ts:14-60](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/askResponse.test.ts#L14).
    - Preserve:
      - active steering test
      - passive reopen test
      - pending ask handling test
    - Add:
      - `active_user` routes to the new continuation helper
      - `active_user` does not route to `resumePassiveTaskWithFeedback(...)`
      - `active_user` does not call `task.handleWebviewAskResponse(...)`

### Phase 4: Align Webview Input And UI With `active_user`

16. Update [useMessageHandlers.ts:16-18](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L16).
    - Continue deriving `threadDisplayState` from `currentTaskItem`.
    - Add local handling for `threadDisplayState === "active_user"`.

17. Update [useMessageHandlers.ts:102-138](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L102).
    - Today, freeform composer sends only route automatically when:
      - the thread is passive-open
      - or the task is actively running
    - Add a new branch before passive-open handling:
      - if `threadDisplayState === "active_user"`, send `messageResponse` through the same gRPC request surface so the controller can route it into the new normal-next-turn continuation path
    - `active_user` should behave like a live conversational handoff, not like passive resume.

18. Leave passive-open UI logic scoped to passive states only.
    - [buttonConfig.ts:29-35](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts#L29) should continue treating only `idle_open` and `paused` as passive-open states.
    - [MessagesArea.tsx:225-236](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/components/layout/MessagesArea.tsx#L225) should continue showing `Conversation reopened` only for those passive states.
    - The fix is not to expand passive-open logic. The fix is to keep `active_user` out of it.

19. Review [ChatRow.tsx references found by search](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx).
    - Any presentation logic that currently treats passive-open rows as “Conversation reopened” must remain tied to passive states only.
    - No `active_user` row or state should inherit reopened wording.

20. Add/update webview tests for:
    - [MessagesArea.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/components/layout/MessagesArea.tsx)
    - [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)
    - [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)
    - Assertions required:
      - `active_user` does not show `Conversation reopened`
      - composer send works in `active_user`
      - `idle_open` still shows passive reopen UI

### Phase 5: Remove Reopened-Thread Prompt Framing From Normal Dialogue Handoff

21. Update [responses.ts:307-329](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/responses.ts#L307).
    - Keep `taskResumption(...)` for true reopen/passive resume.
    - Do not use this function for `active_user` continuation.
    - If needed, add a separate helper for normal-next-turn human input after governed response-tool handoff.
    - That helper must not contain:
      - `This conversation was reopened`
      - `Latest human-authored input for the reopened thread`

22. Audit task code that chooses between reopened-thread prompt framing and normal input framing.
    - The current `active_user` continuation path must use the normal latest-human-input framing, not `taskResumption(...)`.
    - If a dedicated helper is added, document it near [formatResponse.latestHumanInput(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/responses.ts#L82).

23. Update any prompt tests that explicitly encode reopened-thread copy for the governed response-tool follow-up path.
    - Keep reopened-thread tests only for true reopen/passive flows.

### Phase 6: Fix Workflow-Aware Prompting Gaps From Test 13

24. Update [task_progress.ts:33-60](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L33).
    - Add a placeholder-workflow-aware branch before the generic branch.
    - That branch must explicitly say:
      - a workflow with a task list has been created for you
      - use `task_progress` as a checklist parameter with `__COMPLETE_NEXT_STEP__` as you complete each step
      - use `task_progress` only as a checklist parameter on another tool call, not a standalone tool
    - Keep the wording concise.
    - Do not force this through model-family duplication if shared component context can drive it.

25. Update [set_workflow_placeholders.ts:8-22](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts#L8).
    - Expand the description or parameter instruction with one compact canonical example using the required `values` object shape.
    - Keep the example inline and short.

26. Update [attempt_completion.ts:8-39](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts#L8).
    - Add one compact canonical example that shows:
      - `result`
      - optional `task_progress` when relevant
    - Keep the wording aligned with the governed response-tool contract.

27. Update prompt integration and snapshot tests covering:
    - [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)
    - [set_workflow_placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts)
    - [attempt_completion.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts)

## Required Tests

### Shared State And Proto

1. Update [thread-display-state.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/thread-display-state.test.ts).
   - Add `active_user` round-trip coverage through proto conversion.
   - Assert `active_user` is active, not passive.

2. Re-run proto generation and type-checking after the enum change.

### Controller And Task Routing

3. Update [askResponse.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/askResponse.test.ts).
   - Add `active_user` routing coverage.
   - Keep `idle_open` coverage proving passive reopen still uses `resumePassiveTaskWithFeedback(...)`.
   - Keep `awaiting_user_response` coverage proving structured ask handling still works.

4. Add/update task runtime tests around the shared response-tool completion path.
   - [responseToolTurnFlow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/responseToolTurnFlow.test.ts)
   - [ResponseToolRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts)
   - Assertions required:
     - governed response tools end in `active_user`
     - the next human reply is treated as normal next-turn input
     - passive reopen routing is not used

### Webview

5. Add/update tests for:
   - [MessagesArea.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/components/layout/MessagesArea.tsx)
   - [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)
   - [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)

6. Assert:
   - `Conversation reopened` appears only for `idle_open` / `paused`
   - no reopen banner appears for `active_user`
   - composer send in `active_user` produces the next normal turn

### Prompts

7. Update prompt tests for:
   - normal-next-turn post-response handoff not using reopened-thread wording
   - placeholder-workflow `task_progress` wording
   - compact examples for `set_workflow_placeholders` and `attempt_completion`

## Acceptance Criteria

This action plan is complete only when all of the following are true:

- `active_user` exists as a first-class shared thread display state
- governed response tools end in `active_user`, not `idle_open`
- `idle_open` remains reserved for passive/reopened/cancelled thread visibility
- `awaiting_user_response` remains reserved for specific structured `ask(...)` waits
- the next human reply after governed response-tool output follows the normal next-turn dialogue path
- the `Conversation reopened` banner does not appear after governed response-tool success
- reopened-thread prompt framing is used only for true passive reopen
- placeholder workflows have a workflow-aware `UPDATING TASK PROGRESS` variant
- prompt guidance includes concise canonical examples for `set_workflow_placeholders` and `attempt_completion`

## Recommended Execution Order

1. add `active_user` to shared state, proto, and conversions
2. reclassify shared runtime semantics and response-tool end states
3. add controller/task routing for `active_user`
4. align webview composer/UI behavior with `active_user`
5. split reopened-thread prompt framing from normal next-turn dialogue
6. update workflow-aware prompt content and examples
7. run runtime, webview, proto, and prompt tests
