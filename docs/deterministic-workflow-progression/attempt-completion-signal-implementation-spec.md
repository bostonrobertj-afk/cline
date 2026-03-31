# Attempt Completion Deterministic Signal Implementation Spec

## Purpose

This document defines the concrete implementation design for allowing `attempt_completion` to act as a deterministic placeholder-workflow progression signal.

This spec implements the requirements in:

- [attempt-completion-signal-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/deterministic-workflow-progression/attempt-completion-signal-requirements.md)

This spec is intentionally limited to the deterministic-progression plumbing needed to make `attempt_completion` available as a workflow-step signal.

It does not restore any older semantics where `attempt_completion` means:

- thread end
- task end
- user acceptance

## Scope

In scope:

- passing successful `attempt_completion` execution context into deterministic placeholder progression
- allowing workflow-step evaluators to inspect that signal
- removing the dedicated pre-tool focus-chain handling for `attempt_completion`
- routing `attempt_completion` through the same post-tool focus-chain path used by other response tools
- adding focused regression tests

Out of scope:

- generic lifecycle changes for all response tools
- changing `attempt_completion` presentation behavior
- changing checkpoint attachment behavior
- changing hook timing parity
- selecting or implementing a specific workflow step that uses this signal unless separately approved

## Current Runtime State

### Current Tool-Progress Update Flow

The tool-progress update flow currently lives in:

- [updateFromToolResponse.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/updateFromToolResponse.ts)

Current behavior:

- non-`attempt_completion` tools use the post-tool path
- `attempt_completion` uses a dedicated pre-tool path
- that pre-tool path sets `skipPostExecutionUpdate: true`

Current consequence:

- pre-tool checklist protection works
- but post-tool deterministic progression never sees a successful `attempt_completion` execution

### Current Deterministic Progression Flow

The deterministic placeholder workflow flow currently lives in:

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)
- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)

Current behavior:

- `toolContext` already exists as a type and is passed into `applyDeterministicPlaceholderProgression(...)`
- `evaluateDeterministicStep(...)` does not currently accept or forward `toolContext`
- per-workflow evaluators therefore cannot gate on a successful `attempt_completion`

## Design Principles

- Treat `attempt_completion` as a tool-execution fact, not a lifecycle event.
- Reuse the existing deterministic placeholder progression seam.
- Do not give `attempt_completion` a dedicated focus-chain timing path.
- Do not scatter `attempt_completion` progression logic across tool handlers.
- Keep workflow usage explicit and opt-in through per-workflow step evaluators.

## Target Runtime Behavior

The desired runtime sequence is:

1. A supported placeholder workflow is active.
2. The model calls `attempt_completion`.
3. `attempt_completion` executes normally.
4. The post-tool focus-chain update runs with a `toolContext` that includes:
   - `toolName: "attempt_completion"`
   - `toolParams`
   - `toolResult`
   - `toolWasExecuted: true`
5. Deterministic placeholder progression evaluates the active step with that `toolContext`.
6. If the workflow-specific evaluator declares the step complete based on successful `attempt_completion`, the runtime auto-completes the step and records the normal deterministic notice.

## Required Implementation Changes

## 1. Remove the Dedicated Pre-Tool Attempt Completion Branch

### File

- [updateFromToolResponse.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/updateFromToolResponse.ts)

### Required Change

Delete the `attempt_completion`-specific pre-tool branch from `applyPreToolTaskProgressUpdate(...)`.

After this change:

- `attempt_completion` must no longer be routed through a dedicated pre-tool focus-chain path
- `attempt_completion` must no longer set `skipPostExecutionUpdate: true` solely because of its tool name
- `attempt_completion` must use the same post-tool focus-chain update timing as other response tools

The expected result is that the existing `toolContext` passed in the post-tool path becomes available for deterministic evaluation after successful execution.

## 2. Thread Tool Context Through Deterministic Evaluation

### File

- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)

### Required Change

Update the deterministic evaluation function signatures so tool context is available all the way down to workflow-specific step evaluators.

Required minimum change:

```ts
async function evaluateDeterministicStep(args: {
  taskState: TaskState
  workflowName: DeterministicPlaceholderWorkflowName
  stepNumber: number
  toolContext?: DeterministicPlaceholderToolContext
}): Promise<DeterministicStepEvaluationResult>
```

Then forward `toolContext` into:

- `evaluateCodeReviewStep(...)`
- `evaluateDevStoryStep(...)`
- `evaluateReviewAdversarialGeneralStep(...)`

Even if only one workflow uses the signal first, the evaluator interface should support it consistently for all supported workflows.

## 3. Preserve the Existing Deterministic Entry Point

### File

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)

### Required Change

No architectural relocation is needed.

The existing call path is already correct:

- `updateFCListFromToolResponse(...)`
- `applyDeterministicPlaceholderWorkflowProgressionIfNeeded(...)`
- `applyDeterministicPlaceholderProgression(...)`

The implementation should preserve this entry point and only change:

- that `attempt_completion` now reaches it through the normal post-tool flow
- what data the evaluators receive

## 4. Add an Explicit Attempt Completion Gate Pattern

### File

- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)

### Required Change

Introduce a reusable helper for evaluating the current-turn `attempt_completion` signal.

Recommended shape:

```ts
function didSuccessfulAttemptCompletionOccur(toolContext?: DeterministicPlaceholderToolContext): boolean {
  return toolContext?.toolName === "attempt_completion" && toolContext.toolWasExecuted === true
}
```

This helper should be used by any workflow-step evaluator that explicitly wants this gate.

This keeps the rule:

- centralized
- machine-checkable
- separate from lifecycle semantics

## 5. Do Not Add a Global Attempt Completion Rule

This implementation must not introduce any logic that says:

- all workflows advance when `attempt_completion` happens

Instead:

- workflow/step evaluators must opt in explicitly

That preserves the current deterministic registry design.

## Test Plan

## 1. Remove the Old Attempt Completion Focus-Chain Protection Test

### File

- [ToolExecutor.focusChainProtection.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts)

### Requirement

Remove or rewrite the existing regression at line 97 that asserts `attempt_completion` is rejected in the same turn because of its dedicated pre-tool focus-chain protection.

After this change, the tests should reflect the new intended model:

- `attempt_completion` is not special-cased in focus-chain timing
- it follows the same post-tool focus-chain path as other response tools

## 2. Add Deterministic Tool-Context Coverage

### Files

- [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts)
- or equivalent existing deterministic-progression test files if current coverage is organized elsewhere

### Required Tests

Add focused tests proving:

- successful `attempt_completion` can reach deterministic progression as `toolContext`
- a workflow-step evaluator can complete a step from `toolContext.toolName === "attempt_completion"` and `toolWasExecuted === true`
- non-executed or failed `attempt_completion` does not auto-complete a step
- existing file-based deterministic gates continue to behave unchanged

## 3. Avoid Lifecycle Assertions

Tests added for this feature must not assert:

- thread end
- task end
- user acceptance

They must assert only:

- checklist progression behavior
- deterministic notice behavior
- tool-context-driven step completion behavior

## Compatibility Requirements

- Existing supported deterministic workflows must remain unchanged unless their evaluators are explicitly updated to consume the new signal.
- Existing checkpoint behavior must remain unchanged.
- Existing `attempt_completion` presentation behavior must remain unchanged.
- `attempt_completion` must no longer have a dedicated focus-chain timing exception.

## Recommended Next Step After This Spec

Write a focused action plan that:

- names the first workflow step that will consume the `attempt_completion` signal
- prescribes the exact code edits in `updateFromToolResponse.ts`
- prescribes the exact signature updates in `deterministicPlaceholderProgression.ts`
- prescribes the exact regression tests to add or modify

That workflow-selection decision is intentionally not made in this spec.
