# Execution 01: Runtime Checkpoint Decoupling

## Objective

Refactor managed workflow runtime behavior so workflow progression no longer depends on `attempt_completion` as the mechanism for satisfying checkpoints or final workflow exit.

This workstream owns the core runtime contract only. It must not edit prompt-copy files, authored workflow markdown in `.cline/skills`, or human-facing docs.

## Why This Exists

Current behavior couples two unrelated concerns:

- `attempt_completion` is the user-facing response/finalization tool.
- managed workflow checkpoints, especially the final checkpoint, currently depend on `attempt_completion` to progress or complete the workflow.

That coupling creates brittle failure modes:

- the agent must solve a hidden tool-selection puzzle at the end of a workflow
- choosing the wrong tool can strand the workflow in an unrecoverable or semi-recoverable state
- interaction between the human user and the agent becomes gated by workflow mechanics instead of remaining independently recoverable

## Discovery Summary

The current coupling is implemented in these places:

- [AttemptCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts)
  - blocks `attempt_completion` while any required managed workflow items remain incomplete
  - implicitly serves as the final checkpoint path once `allRequiredComplete === true`
- [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts)
  - treats the final checkpoint like any other required blocked item
- [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts)
  - extracts `## CHECKPOINT` into a blocked `::checkpoint` item
- [CompleteWorkflowItemToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts)
  - only supports regular checklist item completion
- [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts)
  - asserts the current `attempt_completion`-gated behavior

## Owned Write Scope

This workstream owns only these areas:

- `src/core/task/managed-workflows/**`
- `src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts`
- `src/core/task/tools/handlers/AttemptCompletionHandler.ts`
- `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
- any new runtime-only managed workflow tool handler files under `src/core/task/tools/handlers/`
- any supporting runtime types under `src/core/task/managed-workflows/types.ts`

This workstream must not edit:

- `src/core/prompts/**`
- `webview-ui/**`
- `.cline/skills/**`
- `docs/managed-bmad-workflow-formatting-guide.md`

## Required Design Outcome

After this refactor:

1. `attempt_completion` must mean only:
   - present a final/direct response to the human user
   - finalize a task turn using the normal completion path
2. Managed workflow checkpoint progression must be controlled by workflow-specific state transitions, not by `attempt_completion`.
3. The final checkpoint in a managed workflow must become satisfiable without hijacking the user-response tool.
4. Using the wrong workflow-progress tool must produce a recoverable tool error, not a communication deadlock.

## Required Runtime Changes

### 1. Introduce a workflow-native way to resolve checkpoints

Implement one of these runtime models:

- extend `complete_workflow_item` so it can explicitly resolve checkpoint items once checkpoint conditions are satisfied
- or add a new managed-workflow-specific tool such as `resolve_workflow_checkpoint`

Requirements:

- regular checklist items and checkpoint items must have distinct semantics
- the runtime must reject misuse with clear errors
- the tool contract must not require the agent to use `attempt_completion` to satisfy a checkpoint

### 2. Separate workflow completion from task completion

Refactor managed workflow state so:

- a workflow can reach a completed backend state independently of whether the agent has already delivered a final user-facing response
- final workflow completion does not require `AttemptCompletionHandler` to act as the last checkpoint resolver

Expected direction:

- final phase checkpoint resolution should set workflow status to completed
- `attempt_completion` should then be allowed because the workflow is already complete
- `AttemptCompletionHandler` should not be the component that advances workflow checklist state

### 3. Rework final-checkpoint logic

Current final behavior relies on:

- `ManagedWorkflowRenderer` telling the agent to resolve final checkpoint with `attempt_completion`
- `AttemptCompletionHandler` allowing completion only once all required items are complete

Runtime target:

- the final checkpoint is resolved by workflow-state logic
- once resolved, the workflow is complete
- the next user-facing response can use `attempt_completion` normally

### 4. Preserve strict ordering without preserving tool coupling

Keep these current protections:

- sequential completion of required items
- blocked checkpoint gating
- duplicate completion rejection

But remove the assumption that the final blocked item must be satisfied by `attempt_completion`.

### 5. Ensure recoverability after a wrong tool call

If the agent:

- tries `complete_workflow_item` on a checkpoint when that is no longer valid
- or calls `attempt_completion` before the workflow is actually complete

the system must return a clear error and remain recoverable in-thread.

Acceptance requirement:

- the human and agent must still be able to continue interacting after the error
- no stranded managed-workflow state
- no reliance on reopen/resume tricks

## Required Test Changes

Update or add tests for:

- regular item completion still works
- checkpoint resolution works through the new workflow-native path
- final workflow completion no longer depends on `attempt_completion`
- `attempt_completion` is rejected when workflow state is incomplete
- `attempt_completion` succeeds once workflow state is complete
- duplicate checkpoint resolution is rejected cleanly
- wrong-tool usage produces recoverable errors

Minimum targets:

- [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts)
- [ManagedWorkflowController.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/__tests__/ManagedWorkflowController.test.ts)

## Deliverables

- updated managed workflow runtime contract
- updated handler tests
- updated controller tests
- a short implementation note in this file under `## Completion Notes`

## Completion Notes

- Added a checkpoint-specific workflow path so blocked `::checkpoint` items resolve through workflow state instead of the normal step-completion path.
- Updated `complete_workflow_item` handling and managed workflow tests to cover both regular item completion and checkpoint resolution.
- QA review: the runtime checkpoint-decoupling slice is PASS. The checkpoint-specific resolver path is present, `attempt_completion` remains blocked until managed workflow state is complete, and the targeted managed-workflow controller/handler tests passed. The unrelated failures observed during the broader unit run were outside this execution slice.
