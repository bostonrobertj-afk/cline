# Test 8 Action Plan: Central Response Tool Runtime

This document tracks the remediation and implementation plan for the primary-agent response-tool deficiencies identified in [test-8-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-8-findings.md).

# Remediation

## Response Tool Deficiencies

There does not appear to be a central runtime abstraction for response tools today. The prompt layer groups them conceptually in `RESPONSE TOOLS`, but the runtime only registers them as ordinary handlers by name in [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L79). The coordinator knows how to instantiate `attempt_completion`, `ask_followup_question`, `send_user_message`, `generate_plan_output`, and `act_mode_respond`, but it does not know that they are all part of the same response-tool family or that they should share lifecycle behavior.

As a result, shared response behavior is being implemented piecemeal inside individual handlers:

- [AttemptCompletionHandler.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts#L56) validates `result`, owns its own UI rendering path, captures post-completion input itself, and sets task-level control flags such as `didAttemptCompletionEndTask`.
- [AskFollowupQuestionToolHandler.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/AskFollowupQuestionToolHandler.ts#L49) owns its own ask flow, UI updates, option-selection behavior, and serializes the human reply into tool-result content itself.
- [SendUserMessageHandler.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/SendUserMessageHandler.ts#L23) simply displays text and returns `"[Message displayed.]"`, with no shared turn-finalization behavior.
- [PlanModeRespondHandler.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/PlanModeRespondHandler.ts#L36) owns a separate ask lifecycle, separate task-state flags, and its own follow-up routing behavior.
- [ActModeRespondHandler.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/ActModeRespondHandler.ts#L30) has its own non-blocking response semantics and its own consecutive-use rule based on `lastToolName`.

There are a few helper layers, but none of them solve the missing shared runtime contract:

- [ToolResultUtils.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/utils/ToolResultUtils.ts#L30) centralizes generic tool-result formatting, but it treats response tools like any other tool and does not know how the current assistant turn should end after a user-visible response is delivered.
- [UIHelpers.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/types/UIHelpers.ts) centralizes access to `say` and `ask`, but only as low-level primitives.
- [TaskState.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts#L37) contains ad hoc response-related fields such as `isAwaitingPlanResponse`, `didAttemptCompletionEndTask`, and `pendingAttemptCompletionFollowup*`, but these are tool-specific state islands rather than a unified response-tool model.

The main loop therefore has to special-case individual response tools after the fact. The clearest example is the one-off `didAttemptCompletionEndTask` branch in [index.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts#L3637), which proves the loop already needs centralized response semantics but currently only has them for `attempt_completion`.

In short, the deficiency is not just that one handler is buggy. The deficiency is architectural: the runtime lacks a single place where response-tool lifecycle rules are defined and enforced. Because of that, behavior that should be shared across response tools is being hand-implemented inside each tool handler, which makes inconsistency and drift very likely.

# Action Plan

## Central Response Tool Runtime

The clean solution is to introduce a dedicated central runtime for response tools under `src/core/task/tools/response/`. This should be a new runtime layer near `ToolExecutor`, not more special cases inside individual handlers.

Suggested file structure:

- `src/core/task/tools/response/types.ts`
- `src/core/task/tools/response/ResponseToolRegistry.ts`
- `src/core/task/tools/response/ResponseToolRuntime.ts`
- optional: `src/core/task/tools/response/ResponseToolUtils.ts`

This runtime should define a shared response-tool contract that every response tool uses. The contract should include:

- tool classification
  - whether the tool is a response tool at all
  - which response family it belongs to
- presentation metadata
  - whether it renders through `say` or `ask`
  - the user-visible message type (`text`, `completion_result`, `followup`, `generate_plan_output`, etc.)
  - whether it supports partial streaming UI
- follow-up behavior
  - whether the tool expects a human reply
  - whether that reply should be routed back as a normal user turn, tool-result content, or not at all
  - whether user feedback should also be echoed into the chat UI as `user_feedback`
- loop behavior
  - whether the current assistant turn should end after the response tool succeeds
  - whether execution should continue immediately after success
  - whether a deferred user turn should be reinjected into the next request
- state behavior
  - what task-state fields should be set/cleared when the tool starts, succeeds, fails, or collects follow-up input

The registry should be the central source of truth for response-tool metadata. `ToolExecutorCoordinator` should continue mapping tool names to handlers, but `ToolExecutor` should also be able to ask a central response registry whether a given tool is a response tool and what shared lifecycle rules apply.

The runtime should own the shared response lifecycle, including:

- rendering the final user-visible message
- rendering partial UI updates consistently
- capturing follow-up input consistently when the tool expects it
- updating shared response state in `TaskState`
- deciding whether the current assistant turn is complete
- deciding whether any follow-up input should be converted into a normal next user turn
- arbitrating overlapping `ask(...)` usage for response-tool flows, especially when command execution and response delivery both want to own the current ask lifecycle

Handlers should then become thinner and more tool-specific. Their role should mainly be:

- validate tool-specific parameters
- build tool-specific payloads
- delegate common response lifecycle work to the central response runtime

That would let `attempt_completion`, `ask_followup_question`, `send_user_message`, `generate_plan_output`, and `act_mode_respond` share the same underlying lifecycle semantics while still having different user-visible message types and tool-specific rules.

`TaskState` should also move toward generic response-turn state rather than tool-specific flags. Instead of continuing to add one-off fields for `attempt_completion` and plan mode, the runtime should own generic state such as:

- the currently active response tool, if any
- whether a response tool has satisfied the current assistant turn
- any pending follow-up content waiting to be reinjected
- how that follow-up should be routed on the next request

The main loop in [index.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts#L3628) should then consult that generic response state instead of special-casing `attempt_completion`. The existing `buildUserMessageContent(...)` helper in [buildUserMessageContent.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/utils/buildUserMessageContent.ts) is a good example of a reusable building block that can plug into such a runtime, but it currently only serves the `attempt_completion` follow-up path.

The overall build plan should therefore be:

1. Add a central response-tool registry and response-tool runtime.
2. Teach `ToolExecutor` to recognize response tools and hand their shared lifecycle to that runtime.
3. Convert existing response-tool handlers to delegate shared response behavior instead of implementing it locally.
4. Replace the current `attempt_completion`-specific loop branch with a generic response-runtime branch.
5. Add explicit handling for `command_output` ask collisions so response-tool delivery does not get superseded by overlapping command-output asks in the same assistant cycle.

This would preserve the intended design goal from the earlier response-handling work: `attempt_completion` remains just one response-tool variant rather than a special conversation-state exception, while shared response-tool behavior becomes consistent across the runtime.
