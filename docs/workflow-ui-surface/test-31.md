# Test Results

## Issue 1: Prompt indicates failure immediately after turn 3 form success
- Step 3 automation ran via form/tool integration and succeeded
- Following turn prompt used the "automation failed, use fallback" verbiage

## Issue 2: Form Auto-Submits, Errors Before Completion
- The workflow form appears to try to call the tool too early. I saw an error that said this:[build_review_diff_output commit] Result: Error: source.commit is required when source.type is "commit".
Only I hadn't submitted the form yet, so there was no reason for that error to be present

# Root Cause

## Issue 1: Prompt Assembly Begins Before Form Flow Runs
- loadContext() generates the focus-chain prompt injection blocks and logs load_context_snapshot, focus_chain_generation, and load_context_final_summary in index.ts (line 4831).
- Those blocks include the CURRENT WORKFLOW STATUS / CURRENT WORKFLOW STEP text produced by FocusChainManager.generateFocusChainInstructions() (line 355).
- Only later, in attemptApiRequest(), the runtime calls maybeResolveWorkflowFormBeforeApiTurn() (line 3215).
- So the first post-form request is using stale prompt-injection content that was generated while the task was still on Step 3 fallback. That is why the prompt said:
    - Step 3 incomplete: system-owned path not completed
    - even though the form had already succeeded.

## Issue 2: Workflow Form is not Implemented as a Staged Flow
- Model uses one collect phase with direct Submit path
- visible collection fields are built on backend from session.values in WorkflowFormRegistry.ts (ln 57)
- User's in-progress selections only live in local UI state workflowFormValues in ChatRow.tsx (ln 295)
- The form's implementation has no distinct runtime-backed source-selection stage. It has confirm, collect, retry_error, and success in WorkFlowFormRuntime.ts (ln 47) and types.ts
- After confirm, WorkflowFormRuntime transitions directly to collect, and any collect-phase SUBMIT is translated into invoke_tool.
- In the UI, collect always has a direct Submit button in ChatRow.tsx (ln 1595), instead of the project requirements' "next, then input fields, then submit" flow.
- The apparent "which source do you have?" screen and the later "enter the concrete inputs" screen are both the same backend collect phase, not distinct runtime stages.
- Submit enablement is computed from backend-provided visible fields in ChatRow.tsx (ln 320-323), not from the user's latest local selection state, so required follow-on fields for the chosen source variant can still be absent when submission becomes possible.
- Because the source-selection screen is itself a submit-capable collect form, selecting a source variant can satisfy that screen's submit gate even though the concrete required inputs for that variant have not yet been collected.
- This allows an invalid backend submission path from the source-selection screen, which is how `source.type = commit` was able to reach tool invocation before `source.commit` had ever been entered by the user.
- Workflow-form ask cards are not reliably replaced after tool execution. Once the form invokes the tool, tool output messages sit after the prior form card, and later retry/success renders can append a new form card instead of replacing the stale one.
- Retry behavior does not restart the workflow form from the beginning. In WorkflowFormRuntime.ts, retry_error + Retry directly reinvokes the tool instead of rerunning the form steps from the start.

## Remediation Requirements

## Issue 1
- Workflow-form interception must run before next-turn prompt preparation begins for deterministic workflow steps that are runtime-owned.
- The runtime must not generate focus-chain prompt injection blocks, CURRENT WORKFLOW STATUS, or CURRENT WORKFLOW STEP text for a turn until any required pre-turn workflow form has either:
  - completed successfully, or
  - exited into an explicit fallback path.
- If a workflow form succeeds and advances the deterministic workflow, the first subsequent API request must be assembled from the updated task state, not from prompt context prepared before the form ran.
- The first post-success API request must not contain fallback-only verbiage for the step that the form just completed.
- The first post-success API request must reflect the newly active workflow step and any newly-resolved placeholder values that resulted from the successful form-driven tool execution.
- The system must not rely on a following user turn to "catch up" prompt state after a successful workflow-form turn; state and prompt context must be consistent within the same continuation turn.
- If the workflow form exits into fallback, only then may the fallback Step 3 instructions be included in the next-turn prompt context.
- Regression coverage must prove:
  - a successful Step 3 workflow-form run does not allow stale Step 3 fallback instructions into the first post-form API request
  - a successful Step 3 workflow-form run causes the first post-form API request to target the next active workflow step
  - fallback instructions appear only when the workflow form actually failed or was cancelled into fallback

## Issue 2
- The Step 3 workflow form must be implemented as the staged flow defined in [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/discovery.md), not as a single collect screen with an immediate submit path.
- After the user clicks `Yes` on the confirm screen, the form must first present the schema-driven selection stage:
  - one or more dropdowns for selecting the supported input/source variant(s)
  - a `Next` button
  - no tool execution from that stage
- The `Next` button must remain disabled until all required selection controls are resolved.
- Only after `Next` is clicked may the form advance to the input-entry stage that renders the concrete fields required by the user's prior selections.
- The `Submit` button must not be present on the selection stage.
- The `Submit` button must only appear on the input-entry stage.
- The `Submit` button must remain disabled until all required concrete input fields for the chosen source variant are populated.
- Tool invocation must never be triggered by selection changes alone.
- Tool invocation must only occur after an explicit `Submit` action from the input-entry stage.
- The set of visible required fields must be derived from the user's current in-progress selections, not only from previously persisted backend session values.
- The source-selection stage and the concrete input-entry stage must be modeled as distinct runtime stages, not as one shared `collect` phase with locally changing field visibility.
- The runtime phase model must explicitly distinguish:
  - source-selection / branch-selection
  - concrete input collection
  - retry from error
  - success
- The source-selection stage must be a non-submitting stage. It may only advance to the next form stage; it must not have any path that invokes `build_review_diff_output`.
- Backend tool invocation must be impossible from a state where only `source.type` is known and required variant-specific fields such as `source.commit`, `source.base`, or `source.head` have not yet been collected.
- When the user changes the selected source variant, the UI must recompute which fields are required before enabling progression or submission.
- After a workflow-form tool attempt, the system must update or replace the active workflow-form card in place; it must not leave stale retry/error cards visible above or beside a later success state for the same session.
- A successful Step 3 form submission must leave only the success state visible for that session, not a retained error/retry card from an earlier failed attempt.
- Retry from an error state must restart the staged form flow from the beginning, consistent with [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/discovery.md), instead of directly reinvoking the tool with the prior partial inputs.
- Retry behavior must restart the staged flow from the beginning, consistent with the requirements in [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/discovery.md).
- Regression coverage must prove:
  - selecting `commit` does not invoke `build_review_diff_output` until the commit value is entered and the user explicitly submits
  - the selection stage renders `Next`, not `Submit`
  - the input-entry stage renders `Submit` only after the user advances past the selection stage
  - required fields for the chosen source variant appear before tool invocation is possible
  - selecting `commit` on the source-selection stage cannot produce any backend submission that contains only `source.type = commit`
  - a failed Step 3 tool attempt followed by a successful retry leaves the session showing only the success state, not both error and success cards
  - Retry from the error screen returns the user to the first staged workflow-form step instead of directly re-running the tool
