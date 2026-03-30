---
instructions:
  - Read this document from top to bottom before making any changes.
  - Execute only the current step.
  - Read the entire current step before starting it.
  - After completing a step, update that step's checkbox from `[ ]` to `[x]`.
  - After marking a step complete, stop and read the next step in full before doing any additional work.
  - Do not make edits outside the allowed-files list for the current step.
  - Do not make any change that is not explicitly prescribed here.
  - If any ambiguity is discovered, or any change appears necessary that is not explicitly prescribed here, stop immediately and ask for input.
  - Use `apply_patch` for all file edits.
---

# Test 31 Issue 2 Action Plan

## Goal
Remediate only Issue 2 from [test-31.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/test-31.md): the Step 3 workflow form auto-submits before the user finishes input, the runtime does not model a true staged source-selection flow, stale retry/error cards remain visible after later success, and retry does not restart the flow from the beginning.

## Scope Guard
- This plan covers only the Step 3 workflow-form staging and rendering defects documented under Issue 2 in [test-31.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/test-31.md).
- Do not address Issue 1 prompt-assembly ordering in this plan.
- Do not change prompt-assembly ordering, focus-chain prompt injection ordering, or any pre-turn interception timing in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts) beyond the workflow-form card replacement behavior explicitly prescribed below.

## Step 1
- [x] Introduce explicit staged runtime phases for source selection and concrete input collection.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/types.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- Prescribed changes:
  - In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts), update the shared `WorkflowFormPhase` type so it explicitly includes:
    - `select_source`
    - `collect_inputs`
    - keep the existing:
      - `confirm`
      - `retry_error`
      - `success`
    - remove `collect` from the shared phase contract
  - In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L16), replace the generic single `phase: WorkflowFormPhase` usage with explicit runtime support for these stages:
    - `confirm`
    - `select_source`
    - `collect_inputs`
    - `retry_error`
    - `success`
  - In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L26-L32), replace the current resolver interface methods:
    - `buildCollectPayload`
    - `buildRetryPayload`
    with explicit staged builders:
    - `buildSelectSourcePayload`
    - `buildCollectInputsPayload`
    - `buildRetryPayload`
    - keep `buildConfirmPayload`
    - keep `translateSubmissionToToolUse`
  - In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L42-L50), keep new sessions starting at `confirm`.
  - In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L53-L67), update `buildPayload()` so it dispatches by the new explicit phases:
    - `confirm -> buildConfirmPayload`
    - `select_source -> buildSelectSourcePayload`
    - `collect_inputs -> buildCollectInputsPayload`
    - `retry_error -> buildRetryPayload`
    - `success -> buildSuccessPayload`
  - In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L117-L166), replace the current confirm/collect handling with this exact state machine:
    - `confirm` + `SUBMIT(confirm=yes)` returns `render_form` with session phase `select_source`
    - `confirm` + `CANCEL` returns `fallback_to_agent`
    - `select_source` + `SUBMIT` does **not** invoke the tool
    - `select_source` + `SUBMIT` must only validate the source-selection controls and then return `render_form` with session phase `collect_inputs`
    - `collect_inputs` + `SUBMIT` may return `invoke_tool`
    - `retry_error` + `SUBMIT` may also return `invoke_tool`, using the corrected concrete inputs currently present in the session values
    - `retry_error` + `RETRY` must return `render_form` with a session reset back to `select_source`, preserving only `confirm=yes` and clearing the previously selected source/input fields
    - `retry_error` + `RETRY` must not directly re-invoke the tool
  - In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L57-L119), split the current `buildFieldDefinitions(values)` helper into two exact helpers:
    - `buildSourceSelectionFieldDefinitions()`:
      - returns only the `source.type` select field
      - `source.type` must be required and visible
      - no other fields may be included in this helper
    - `buildConcreteInputFieldDefinitions(values)`:
      - returns only the concrete inputs for the chosen source type
      - `commit -> source.commit, scoped_paths, context_lines`
      - `commit_range -> source.base, source.head, scoped_paths, context_lines`
      - `ref_diff -> source.base, source.head, scoped_paths, context_lines`
      - `worktree_head_scoped -> scoped_paths`
      - `source.type` must **not** appear in this helper
  - In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L152-L237), replace `buildCollectPayload()` with:
    - `buildSelectSourcePayload(session)`:
      - phase `select_source`
      - prompt remains artifact-focused and instructs the user to choose which diff source they have
      - fields come only from `buildSourceSelectionFieldDefinitions()`
      - `submitLabel: "Next"`
      - `cancelLabel: "Cancel"`
    - `buildCollectInputsPayload(session)`:
      - phase `collect_inputs`
      - prompt instructs the user to provide the concrete inputs needed for `review-input.diff`
      - fields come only from `buildConcreteInputFieldDefinitions(session.values)`
      - `submitLabel: "Submit"`
      - `cancelLabel: "Cancel"`
    - `buildRetryPayload(session)`:
      - remains phase `retry_error`
      - fields come only from `buildConcreteInputFieldDefinitions(session.values)`
      - `retryLabel: "Start Over"`
      - keep `submitLabel: "Submit"`
      - keep the existing error banner behavior

## Step 2
- [x] Update the chat UI so the selection stage cannot submit to the backend tool path and the visible cards do not accumulate stale error/success states.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- Prescribed changes:
  - In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L320-L324), replace the current generic `visibleWorkflowFormFields` / `isWorkflowFormSubmitDisabled` logic with stage-specific gating:
    - for `select_source`, compute button disablement from the source-selection fields only
    - for `collect_inputs` and `retry_error`, compute button disablement from the concrete input fields only
  - In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L1505-L1607), replace the current shared `(collect || retry_error)` rendering block with three distinct UI blocks:
    - `select_source` block:
      - render only the source-selection fields
      - render `Cancel`
      - render a single primary button labeled from `submitLabel` (`Next`)
      - do **not** render `Retry`
      - do **not** render a `Submit` button
    - `collect_inputs` block:
      - render only the concrete input fields
      - render `Cancel`
      - render a single primary button labeled `Submit`
    - `retry_error` block:
      - render the error banner first
      - render the concrete input fields below it
      - render `Cancel`
      - render a secondary button labeled from `retryLabel` (`Start Over`) that calls `WorkflowFormAction.RETRY`
      - render a primary `Submit` button for the corrected concrete inputs
  - In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L299-L308), keep resetting local form state from `workflowForm.values` on message change.
  - In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L481-L503), keep `handleWorkflowFormAction()` as the only UI submission path, but ensure:
    - `select_source` `Next` sends only the currently selected `source.type`
    - `collect_inputs` / `retry_error` `Submit` send the concrete inputs currently in local state
  - In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1375-L1412), change `renderWorkflowFormMessage()` so the active workflow-form session updates the existing workflow-form ask message even if tool output messages have been added since the previous render.
    - Use `sessionId` from the JSON payload as the matching key.
    - Search backward through `clineMessages` for the most recent `ask: "workflow_form"` whose parsed payload has the same `sessionId` as the new payload.
    - Update that message in place instead of appending a new one.
    - Only append a new workflow-form ask if no prior message exists for that `sessionId`.
  - Do not change `maybeResolveWorkflowFormBeforeApiTurn()` ordering in this step.

## Step 3
- [x] Rewrite and extend runtime tests for the staged Issue 2 flow only.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- Prescribed changes:
  - Replace the old “confirm to collect” expectation in [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L30-L54) with:
    - confirm `SUBMIT(confirm=yes)` -> `render_form`
    - session phase becomes `select_source`
    - payload phase becomes `select_source`
  - Add a new test proving:
    - `select_source` `SUBMIT` with only `source.type = commit` returns `render_form`
    - session phase becomes `collect_inputs`
    - outcome is **not** `invoke_tool`
  - Update the translation/invocation test at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L77-L124) so it uses a `collect_inputs` session instead of `collect`.
  - Add a new test proving:
    - `retry_error` + `SUBMIT` returns `invoke_tool`
    - the resulting tool input uses the corrected concrete values present on the retry screen
  - Add a new test proving:
    - `retry_error` + `RETRY` returns `render_form`
    - session phase becomes `select_source`
    - previously chosen source/input values are cleared except `confirm`
  - Add a new test proving:
    - a `select_source` submission containing only `source.type = commit` never produces a tool input with missing `source.commit`

## Step 4
- [x] Rewrite and extend chat-row UI tests for the staged Issue 2 flow only.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`
- Prescribed changes:
  - Replace the current helper at [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L40-L76) so it can create test messages for:
    - `confirm`
    - `select_source`
    - `collect_inputs`
    - `retry_error`
    - `success`
  - Add a test proving the `select_source` UI:
    - renders the source select control
    - renders `Next`
    - does **not** render `Submit`
  - Add a test proving the `collect_inputs` UI:
    - renders concrete input controls for the chosen `source.type = commit`
    - renders `Submit`
    - does **not** render `Next`
  - Add a test proving the `retry_error` UI:
    - renders the error banner
    - renders `Start Over`
    - renders `Submit`
  - Add a test proving the source-selection stage does not enable `Next` until `source.type` is chosen.
  - Add a test proving the input stage does not enable `Submit` until required concrete fields are populated.
  - Add a test proving the retry-error stage:
    - keeps `Submit` available for corrected concrete inputs
    - keeps `Start Over` available to restart the flow from the beginning

## Step 5
- [x] Add a focused regression test for workflow-form message replacement after tool output, then run the exact verification commands.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`
- Prescribed changes:
  - In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), add one new regression test that exercises the Step 3 workflow-form path through:
    - first tool failure -> `retry_error`
    - second tool success -> `success`
    - and asserts only one workflow-form ask message remains for the active `sessionId` after success
  - The new test must assert the surviving workflow-form message payload phase is `success`, not `retry_error`.
  - Do not add any Issue 1 assertions in this step.
  - Run these exact verification commands and no others:
```sh
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts --exit
cd webview-ui && npm run test -- src/components/chat/ChatRow.test.tsx
```
