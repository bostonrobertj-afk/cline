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

# Test 31 Issue 1 Action Plan

## Goal
Remediate only Issue 1 from [test-31.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/test-31.md): the Step 3 workflow-form flow succeeds, but the immediately following API turn is still prompted with stale Step 3 fallback instructions because prompt assembly began before the form flow ran.

## Scope Guard
- This plan covers only the prompt-ordering / stale post-form prompt defect documented under Issue 1 in [test-31.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/test-31.md).
- Do not address Issue 2 staged form behavior, source-selection submission, retry restart semantics, or workflow-form card replacement in this plan.
- Do not edit:
  - `src/core/task/workflow-form/WorkflowFormRuntime.ts`
  - `src/core/task/workflow-form/types.ts`
  - `src/core/task/workflow-form/WorkflowFormRegistry.ts`
  - `webview-ui/src/components/chat/ChatRow.tsx`
- Keep the fix limited to task prompt-assembly ordering and the tests that cover that behavior.

## Step 1
- [x] Move workflow-form interception ahead of prompt-context generation for the next API turn.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- Prescribed changes:
  - In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3205-L3216), remove the existing `await this.maybeResolveWorkflowFormBeforeApiTurn()` call from `attemptApiRequest()`.
  - In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L4802-L4887), insert `await this.maybeResolveWorkflowFormBeforeApiTurn()` at the start of `loadContext()`, before:
    - `getEnvironmentDetails(...)`
    - `logFocusChainDiagnosticEvent(..., "load_context_snapshot", ...)`
    - `FocusChainManager.generateFocusChainInstructions()`
    - any prompt-injection block creation
  - Place the call immediately before the `Promise.all([...processContentBlock..., this.getEnvironmentDetails(...)])` block that begins at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L4807).
  - Do not move any other prompt-assembly logic across function boundaries.
  - Do not change the implementation of `maybeResolveWorkflowFormBeforeApiTurn()` itself in this step.
  - The intent of this edit is exact:
    - any required Step 3 workflow-form run must fully resolve before `load_context_snapshot`, `focus_chain_generation`, `load_context_final_summary`, or `CURRENT WORKFLOW STEP` prompt text are generated for the next API request.

## Step 2
- [x] Ensure the first post-form prompt is rebuilt from updated workflow state after a successful form-driven Step 3 completion.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- Prescribed changes:
  - In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1508-L1584), do not change the while-loop behavior of `maybeResolveWorkflowFormBeforeApiTurn()`.
  - After Step 1’s reordering, keep the existing post-success path intact:
    - `executeWorkflowFormToolAndSync(...)`
    - `clearWorkflowFormSession()`
    - `renderWorkflowFormMessage(successPayload)`
    - `workflow_form_resolved`
  - Add one short code comment near the new `loadContext()` interception call explaining the ordering rule:
    - the workflow form is a pre-turn gate for deterministic workflow steps and must resolve before prompt assembly begins
  - Do not add comments anywhere else in this step.

## Step 3
- [x] Update prompt-assembly tests so they verify the workflow-form gate runs before focus-chain prompt generation.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
- Prescribed changes:
  - In [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L159-L234), add a new test that stubs `maybeResolveWorkflowFormBeforeApiTurn()` on a fake task and proves:
    - `loadContext()` calls it before generating prompt injection blocks
    - the stubbed call can mutate task state before `FocusChainManager.generateFocusChainInstructions()` runs
    - the resulting prompt-injection text reflects the updated workflow state, not the pre-form state
  - The test must assert this specific outcome:
    - the final prompt injection text does **not** contain the Step 3 fallback string:
      - `You are in the fallback path because the system-owned workflow-form path was not completed.`
    - and instead reflects a later active step after the stubbed pre-turn state update
  - Use an existing fake-task pattern from this file; do not introduce a new test helper module.

## Step 4
- [x] Add focused regression coverage for the stale Step 3 fallback prompt and for the allowed fallback case.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- Prescribed changes:
  - In [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L341-L390), keep the existing fallback prompt test intact as the control case.
  - In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), add one new integration-style regression test that simulates:
    - active code-review Step 3
    - a successful workflow-form-driven `diff_output` completion before prompt assembly
    - then a subsequent prompt build
  - The new test must assert:
    - the first post-form prompt no longer contains:
      - `You are in the fallback path because the system-owned workflow-form path was not completed.`
    - the first post-form prompt no longer identifies Step 3 as the current step
    - the prompt instead identifies the next active workflow step
  - The new test must not change or widen any Issue 2 behavior.

## Step 5
- [x] Run the exact verification commands for the Issue 1 fix and no others.
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- Prescribed changes:
  - Do not make any edits in this step except changing the checkbox after successful verification.
  - Run these exact verification commands and no others:
```sh
npm run test:unit -- src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts --exit
```
