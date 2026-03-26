These are the tools subject to centralized governance:
    - attempt_completion
    - send_user_message
    - ask_followup_question
    - generate_plan_output
    - act_mode_respond

These tools must only differ in this regard:
    - They have unique UI rendering methods.
    - They may require differently-shaped inputs to support their unique UI rendering capabilities


No other differentiation between these tools is permitted. In particular, all five response tools must:
    - emit [Message displayed] as the tool output to the AI Agent upon successful invocation, then end the AI agent's turn.
    - If the tool call fails once, it must emit a response to the AI agent that indicates the reason for failure and allow exactly one additional response tool invocation that turn. 
    - If a second response tool call fails on the same turn, an error must be emitted to the human user in the chat UI that indicates what tool was used, what error occured, and the detected cause for error.


Violation 1: 
Their defaultTurnBehavior in ResponseToolRegistry.ts is not aligned:
    attempt_completion = end_turn
    send_user_message = end_turn
    ask_followup_question = continue
    generate_plan_output = continue
    act_mode_respond = continue

Violation 2:
    attempt_completion requires result.

Violation 3:
The AI agent can use more than one of these five response tools on a single turn. Evidence:
    attempt_completion includes suppressBlockingAsk: true
Why this is a violation: the AI agent's turn must end when it uses one of these response tools to send a message to the human user.

Violation 4: 
ask_followup_question delivers the user response as tool output inside the same turn the question was sent in

Why this is a violation: The AI agent's turn must end when it uses one of these response tools to send a message to the human.

Violation 5: 
generate_plan_output can automatically return a response to the AI agent when yolomode is active, and delivers human response as same-turn tool output back to the AI agent.

Why this is a violation: The AI agent's turn must end when it uses one of these response tools to send a message to the human.

Violation 6: 
act_mode_respond returns user response to the AI agent as the tool output in the same turn that act_mode_respond was invoked

Why this is a violation: The AI agent's turn must end when it uses one of these response tools to send a message to the human.

# Non-Violations:

attempt_completion has a unique rendering method in the chat UI
ask_followup_question requires question and has a unique rendering method in the UI.

send_user_message:
    It requires message.
    Partial streaming shows partial text in the UI.
    Final execution:
    calls prepareForResponseDelivery(...)
    shows the message as text
    returns "[Message displayed.]" as the tool result
    finalizes through the shared runtime with end_turn
This is essentially how all five tools should work.

# Remediation Plan

## Current Code State

The repository is already partway through a response-runtime refactor. The following pieces exist now:

- shared response-tool files already exist:
    - `src/core/task/tools/response/ResponseToolRegistry.ts`
    - `src/core/task/tools/response/ResponseToolRuntime.ts`
    - `src/core/task/tools/response/types.ts`
- `src/core/task/TaskState.ts` already contains generic response-tool state:
    - `activeResponseToolName`
    - `responseToolTurnShouldEnd`
    - `responseToolTurnCompletedBy`
    - `pendingResponseToolFollowup`
- `src/core/task/index.ts` already has a generic completed-response-tool branch that can reinject deferred normal next-turn user content.
- `src/core/task/ToolExecutor.ts` already contains a guard that blocks later tool execution after a successful turn-ending response tool.
- `attempt_completion` already uses the generic deferred-next-turn user-input path rather than reopen/resume.
- `attempt_completion` command execution already has a partial `command_output` collision fix through `suppressBlockingAsk`.
- Legacy backend-managed workflow code still references `attempt_completion` as part of its completion path, especially in:
    - `src/core/task/managed-workflows/ManagedWorkflowRenderer.ts`
    - managed-workflow test coverage under `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`

Managed workflows are no longer a preserved product path here. Placeholder workflows replaced them, so any managed-workflow functionality loss caused by this remediation is known and expected.

That means the next plan must be a delta-based correction plan, not a greenfield plan.

## What Is Already Correct And Should Be Kept

These parts are already aligned enough to keep and build on:

- There is already a shared response-runtime surface instead of purely per-handler ad hoc logic.
- `attempt_completion` follow-up is already routed into normal next-turn human input rather than tool output.
- `ToolExecutor` already knows how to stop later tool execution after a successful turn-ending response tool.
- `index.ts` already has a generic reinjection path for deferred human follow-up.
- The `command_output` blocking-ask collision work is already partly in place and should be retained unless a better approach replaces it.
- Managed-workflow compatibility is not a design constraint for this remediation and must not weaken the governed response-tool contract.

## What Is Already Landed But Must Be Changed

These are the specific mismatches between the current code and the required contract:

- `ResponseToolRegistry.ts` still mixes turn semantics:
    - `attempt_completion` and `send_user_message` are `end_turn`
    - `ask_followup_question`, `generate_plan_output`, and `act_mode_respond` are still `continue`
- The success tool output is not yet standardized to `[Message displayed.]` across all five governed tools.
- `ask_followup_question` still captures the human reply inside the same tool invocation and returns it as tool-result content.
- `generate_plan_output` still captures and returns same-turn user response content in several branches.
- `act_mode_respond` still tells the AI to continue same-turn work after sending a human-visible message.
- There is no centralized governed-response failure budget yet:
    - no first-failure / one-retry rule
    - no second-failure human-visible chat error
- Prompt files and prompt sections still describe older response-tool semantics.
- Legacy managed-workflow prompt/rendering text may become stale after the corrected `attempt_completion` contract lands.
- Some managed-workflow tests may fail because they encode obsolete `attempt_completion` semantics that are no longer desired.

## Delta-Based Action Plan

This plan is intentionally written as a delta from the code that exists today.

The implementation must proceed by:

- retaining the shared response-runtime scaffolding that is already in place
- correcting the response-tool semantics that are still wrong
- adding the missing centralized failure-budget behavior
- updating prompts and tests so they match the corrected runtime

Do not restart from scratch. Modify the current implementation in place.

Managed workflows are explicitly out of scope as a preserved compatibility target. If the corrected governed response-tool contract breaks legacy managed-workflow behavior or tests, the response-tool contract wins.

## Required Stop Points For The Implementing Subagent

The implementing subagent must not execute this plan as one uninterrupted batch. They must stop at the milestones below, report what changed, report what remains, and wait for confirmation before moving on.

Stop Point 1:
- Complete Phase 1 only.
- Then stop.
- Report:
    - exact files changed
    - whether all five governed tools now share `end_turn`
    - whether shared success and failure state scaffolding is in place
    - any newly discovered blockers or contract ambiguities
- Do not start Phase 2 until told to continue.

Stop Point 2:
- Complete Phase 2 only after Stop Point 1 is reviewed and approved.
- Then stop.
- Report:
    - exact handler behaviors changed
    - which same-turn human-reply-as-tool-output paths were removed
    - whether all five governed tools now end the AI turn and route human replies through deferred next-turn normal input
    - any branches that were reclassified as non-governed internal control behavior
- Do not start Phase 3 until told to continue.

Stop Point 3:
- Complete Phase 3 only after Stop Point 2 is reviewed and approved.
- Then stop.
- Report:
    - exact centralized failure-budget changes
    - how first failure, second failure, and hard-stop behavior are enforced
    - whether the `attempt_completion` command-output path still behaves correctly
    - any edge cases still unresolved
- Do not start Phase 4 until told to continue.

Stop Point 4:
- Complete Phase 4 only after Stop Point 3 is reviewed and approved.
- Then stop.
- Report:
    - exact prompt files updated
    - any managed-workflow prompt text that was updated, quarantined, or removed
    - whether any stale prompt wording still exists outside the patched files
- Do not start Phase 5 until told to continue.

Stop Point 5:
- Complete Phase 5 only after Stop Point 4 is reviewed and approved.
- Then stop.
- Report:
    - tests added, updated, deleted, and intentionally skipped
    - managed-workflow tests updated or deleted due to obsolete assumptions
    - exact test commands run and results
    - any residual risks that remain after implementation

### Phase 1: Lock The Shared Contract To The Correct Semantics

1. Update `src/core/task/tools/response/ResponseToolRegistry.ts`.
   - Keep the registry itself.
   - Do not remove the governed-tool family concept.
   - Change the remaining three governed tools from `continue` to `end_turn`:
       - `ask_followup_question`
       - `generate_plan_output`
       - `act_mode_respond`
   - Review any other per-tool metadata and remove anything that creates behavior differences beyond:
       - UI rendering
       - AI-facing invocation payload shape
   - Keep `attempt_completion`'s command-output ask metadata only if it remains necessary after the final runtime changes.

2. Normalize shared success semantics in `src/core/task/tools/response/ResponseToolRuntime.ts`.
   - Keep the runtime file and the idea of a shared response-tool executor.
   - Replace tool-specific success strings with a single governed success output:
       - `[Message displayed.]`
   - Ensure the runtime, not individual handlers, owns this success contract.
   - Preserve centralized turn-finalization behavior in the runtime.

3. Tighten shared response-turn state in `src/core/task/TaskState.ts`.
   - Keep the existing generic response-tool state fields that are already useful.
   - Remove any remaining need for tool-specific turn-state differences among the governed five.
   - Add new centralized per-turn governed-response failure tracking:
       - failure count
       - last failed governed tool
       - last failure error
       - detected cause
   - Reset this state at the start of each new AI turn.

### Phase 2: Convert All Five Governed Tools To The Same Turn Model

4. Keep the generic response completion branch in `src/core/task/index.ts`, but make it the universal path for the governed five.
   - Do not replace the generic reinjection branch.
   - Remove remaining handler behaviors that bypass it.
   - After this phase, all governed-tool human follow-up must enter through this branch as normal next-turn user input.

5. Keep `src/core/task/tools/handlers/SendUserMessageHandler.ts` as the reference behavior and simplify around it if needed.
   - It is already the closest implementation to the desired model.
   - Keep its user-visible rendering behavior.
   - Keep its turn-ending behavior.
   - Ensure it relies on the shared runtime for standardized success output and turn completion instead of owning special behavior itself.

6. Correct `src/core/task/tools/handlers/AttemptCompletionHandler.ts` to conform fully instead of partially.
   - Keep:
       - distinct completion UI rendering
       - AI-facing payload shape
       - normal next-turn follow-up routing
       - command-output collision fix if still needed
   - Replace:
       - any unique success string with `[Message displayed.]`
       - any remaining attempt-completion-only turn semantics that differ from the governed contract
   - Confirm that `attempt_completion` differs only in rendering and invocation payload, not response-turn behavior.

7. Rework `src/core/task/tools/handlers/AskFollowupQuestionToolHandler.ts`.
   - Keep:
       - follow-up question UI
       - option UI
   - Remove:
       - same-turn answer serialization back to the AI
       - `<answer>...</answer>` same-turn tool output
   - Replace it with:
       - user answer captured for the UI
       - answer queued into deferred normal next-turn human input
       - standardized `[Message displayed.]` success output
       - governed turn end

8. Rework `src/core/task/tools/handlers/PlanModeRespondHandler.ts`.
   - Keep only true UI differences for plan-mode rendering.
   - Review each branch and split them into two categories:
       - governed response-tool behavior
       - non-response internal control behavior
   - For any branch that sends a message to the human user:
       - return `[Message displayed.]`
       - end the AI turn
       - route any human reply through deferred normal next-turn input
   - Remove same-turn human-response tool output such as `<user_message>...</user_message>` where the branch is actually governed response behavior.
   - If a branch is not actually a human-message response flow, isolate that logic so it is not incorrectly treated as governed response-tool behavior.

9. Rework `src/core/task/tools/handlers/ActModeRespondHandler.ts`.
   - Keep only its UI rendering difference.
   - Remove the current behavior where it sends a user-visible message and then explicitly continues same-turn AI work.
   - Successful invocation must become:
       - render
       - return `[Message displayed.]`
       - end the AI turn

10. Remove same-turn human-reply-as-tool-output behavior across the governed family.
   - Search for and eliminate patterns such as:
       - `<answer>`
       - `<user_message>`
       - any other same-turn tool-result payload constructed from human reply content
   - After this step, no governed response tool may feed a human reply back to the AI within the same turn.

### Phase 3: Add The Missing Centralized Failure Budget

11. Extend `src/core/task/tools/response/ResponseToolRuntime.ts` to own the governed-response failure contract.
   - First governed response-tool failure in a turn:
       - return an AI-visible failure result describing the reason
       - increment the centralized failure counter
       - permit exactly one additional governed response-tool invocation in that same turn
   - Second governed response-tool failure in the same turn:
       - emit a human-visible chat error
       - include:
           - tool name
           - failure text
           - detected cause
       - block any further governed response-tool attempts in that turn
   - Keep this behavior centralized rather than duplicating per handler.

12. Update `src/core/task/ToolExecutor.ts` to enforce the centralized failure budget.
   - Keep the existing success-path guard that stops later tool execution after a successful turn-ending response tool.
   - Add the missing first-failure allowance.
   - Add the missing second-failure hard stop.
   - Ensure this logic applies only to the five governed tools.
   - Ensure this logic is turn-scoped and resets correctly when a new AI turn starts.

13. Re-validate the `attempt_completion` command-output path against the corrected governed contract.
   - Review:
       - `src/integrations/terminal/types.ts`
       - `src/integrations/terminal/CommandExecutor.ts`
       - `src/integrations/terminal/CommandOrchestrator.ts`
   - Keep the useful part that prevents `command_output` from stealing the blocking ask channel.
   - Remove or revise any behavior that assumes `attempt_completion` is uniquely special beyond rendering and payload shape.

14. Explicitly quarantine legacy managed-workflow coupling instead of letting it bend the remediation.
   - Review legacy references that still instruct or assume old `attempt_completion` semantics, especially:
       - `src/core/task/managed-workflows/ManagedWorkflowRenderer.ts`
       - any managed-workflow-specific prompt/rendering helpers
       - managed-workflow-specific tests
   - Do not change the governed response-tool contract to preserve managed-workflow behavior.
   - If managed-workflow wording becomes stale, either update it to avoid teaching incorrect behavior or leave a clear note that the path is legacy and unsupported.
   - If managed-workflow tests fail because they assert obsolete `attempt_completion` behavior:
       - update them to stop asserting that obsolete behavior, or
       - delete them outright
   - Prefer deleting stale managed-workflow tests over mutating the response-tool work to satisfy them.

### Phase 4: Align Prompts With The Corrected Runtime

15. Update the shared response-tools prompt description in `src/core/prompts/system-prompt/components/response_tools.ts`.
   - Teach that the five governed tools are one family.
   - Teach that successful use:
       - sends a user-visible message
       - returns `[Message displayed.]`
       - ends the AI turn
   - Teach that any human reply is received later as normal human-authored next-turn input.
   - Teach the centralized failure budget:
       - first failure gives the AI one retry
       - second failure produces a human-visible error

16. Update each governed tool prompt file so the model is not taught stale behavior.
   - Review and patch:
       - `src/core/prompts/system-prompt/tools/attempt_completion.ts`
       - `src/core/prompts/system-prompt/tools/send_user_message.ts`
       - `src/core/prompts/system-prompt/tools/ask_followup_question.ts`
       - `src/core/prompts/system-prompt/tools/generate_plan_output.ts`
       - `src/core/prompts/system-prompt/tools/act_mode_respond.ts`
   - Remove any wording that implies:
       - same-turn continuation after successful message delivery
       - same-turn human replies returned as tool output
       - unique conversation-state semantics for `attempt_completion`

17. Audit variant and template prompt content for stale assumptions.
   - Review `src/core/prompts/system-prompt/variants/` and any nearby maintainer-facing prompt docs.
   - Remove stale wording that contradicts the governed contract.
   - If legacy managed-workflow prompt text still references superseded `attempt_completion` behavior, update or remove that language rather than preserving it.

### Phase 5: Verify The Delta Thoroughly

18. Update existing handler tests rather than treating this as a new greenfield suite.
   - Review and patch:
       - `src/core/task/tools/handlers/__tests__/SendUserMessageHandler.test.ts`
       - `src/core/task/tools/handlers/__tests__/AskFollowupQuestionToolHandler.test.ts`
       - `src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`
       - tests covering `PlanModeRespondHandler`
       - tests covering `ActModeRespondHandler`
   - Assert for every governed tool:
       - user-visible rendering occurs
       - success output is `[Message displayed.]`
       - AI turn ends
       - no same-turn AI continuation occurs
       - any human reply is queued as normal next-turn input

19. Expand shared response-runtime tests under `src/core/task/tools/response/__tests__/`.
   - Assert:
       - all five governed tools are `end_turn`
       - all five use the same success output
       - first failure gives exactly one retry
       - second failure emits the required human-visible error

20. Add task-loop integration coverage for the corrected turn model.
   - Add or update tests around `src/core/task/index.ts`
   - Cover at least:
       - `attempt_completion`
       - `ask_followup_question`
   - Verify:
       - turn ends after governed response-tool success
       - next AI turn begins only after human-authored input exists
       - human reply enters through the normal user-input path

21. Triage managed-workflow tests after the governed-contract changes land.
   - Review failures in:
       - `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
       - any other managed-workflow-specific suites
   - If a failing test is asserting old `attempt_completion` behavior that is no longer supported:
       - rewrite it to stop asserting that obsolete behavior, or
       - delete it outright
   - Do not introduce compatibility shims in the response-tool runtime just to keep managed-workflow tests green.
   - It is acceptable for managed-workflow test coverage to shrink if the remaining supported product surface is placeholder workflows.

22. Add prompt-level verification so prompt text cannot drift back to stale semantics.
   - Add tests, snapshots, or fragment assertions for:
       - `components/response_tools.ts`
       - each of the five governed tool prompt files
   - Assert that prompts no longer teach same-turn continuation or same-turn human-reply tool output.

23. Re-run targeted tests only after the runtime and prompt deltas are complete.
   - Include:
       - shared response runtime tests
       - governed handler tests
       - task-loop tests
       - command-output orchestration tests
       - prompt-fragment tests
   - Managed-workflow tests are optional in this pass. If they fail because they enforce obsolete behavior, update or delete them rather than weakening the remediation.

24. Manual verification checklist after patching:
   - `send_user_message` sends one message, returns `[Message displayed.]`, and the AI turn stops.
   - `ask_followup_question` sends the question, returns `[Message displayed.]`, and the human reply comes back only on the next turn as normal human input.
   - `generate_plan_output` behaves the same way for its governed response branches.
   - `act_mode_respond` sends its message, returns `[Message displayed.]`, and does not continue same-turn AI work.
   - `attempt_completion` still renders uniquely, but on success now returns `[Message displayed.]` and follows the same turn contract.
   - first governed response-tool failure allows one retry with an AI-visible failure reason.
   - second governed response-tool failure shows the required human-visible chat error.
   - system-generated prompt text shown to the AI matches the corrected governed response-tool contract.
   - `attempt_completion` command output does not trigger the old `command_output` ask collision.
   - if legacy managed-workflow tests were failing only because they encoded obsolete `attempt_completion` behavior, they were updated or removed instead of altering the remediation.

## Acceptance Criteria

- All five governed response tools are registered and treated as turn-ending.
- All five governed response tools emit `[Message displayed.]` to the AI agent on successful invocation.
- No governed response tool returns human reply content to the AI as same-turn tool output.
- The next AI turn begins only after real human-authored input exists.
- Deferred human replies from governed response tools are injected through the normal next-turn user-input path.
- On the first governed response-tool failure in a turn, the AI agent receives a failure reason and exactly one retry remains.
- On the second governed response-tool failure in the same turn, the human user receives the required chat error including tool name, error, and detected cause.
- System-generated prompt content accurately describes the governed response-tool contract and no longer teaches stale same-turn continuation behavior.
- Any legacy managed-workflow prompt or test behavior that depended on obsolete `attempt_completion` semantics has been updated, quarantined, or removed rather than preserved by mutating the governed response-tool contract.
- The only remaining differences across the five governed tools are:
    - UI rendering
    - AI-facing invocation payload shape needed to support that rendering
