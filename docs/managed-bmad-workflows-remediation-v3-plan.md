# Managed BMAD Workflows Remediation V3 Plan

## Purpose

This document captures the latest review findings against the managed BMAD workflow implementation and records the intended code-level remediation approach before any additional runtime changes are made.

This pass is focused on three remaining gaps:

1. Final workflow completion does not transition out of the last active phase
2. Item completion is still not enforced strictly in order
3. The extractor documentation overclaimed XML support because `<output>` was not yet implemented at review time

## Scope

This remediation pass should only address the three findings above.

It should not broaden the supported allowlist or redesign the managed-workflow state model beyond what is needed to close these gaps.

## Execution Status

This remediation plan has now been implemented in the repo.

- final workflow completion now transitions to a terminal no-active-phase state
- managed workflow item completion is now enforced in order for required items
- `<output>` XML tags are now extracted into explicit checklist items
- documentation has been narrowed so it no longer overclaims unsupported XML tags

Local verification note:

- `node scripts/generate-managed-workflows.mjs` passes
- `node scripts/verify-managed-workflow-assets.mjs` passes
- `node scripts/audit-managed-workflow-extraction.mjs` passes
- focused mocha execution remains blocked in this environment by the repo's current mocha/Node TypeScript loader issue

## Findings And Intended Fixes

### 1. Final Required Completion Does Not Exit The Active Phase

#### Finding

When the last required item in the final phase is completed, the run status flips to `completed`, but `currentPhaseIndex` still points at the final phase. Because of that:

- [ManagedWorkflowRenderer.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts) never reaches its “all required phases are complete” branch
- [CompleteWorkflowItemToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts) still reports a `Current phase`
- the runtime presents a logically completed workflow as though it still has an active phase

Impacted code:

- [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts)
- [ManagedWorkflowRenderer.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts)
- [CompleteWorkflowItemToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts)

#### Intent

Represent a fully completed workflow as having no active phase.

That allows the renderer, prompt builder, and item-completion response path to converge on the same terminal interpretation.

#### Line-Level Code Intent

1. In [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts):
   - Update `completeManagedWorkflowItem(...)`
   - After recomputing `allRequiredComplete`, set `currentPhaseIndex` to a terminal sentinel when the workflow is fully complete

2. Preferred sentinel approach:
   - Use `currentPhaseIndex = phases.length` when `allRequiredComplete === true`
   - Keep the existing 0-based phase indexing for active runs
   - This preserves the current state shape while allowing `run.phases[run.currentPhaseIndex]` to resolve to `undefined`

3. Keep intermediate phase advancement behavior intact:
   - If the current phase is complete and it is not the final phase, advance to the next phase as today
   - If the current phase is final and all required items are complete, move to the terminal sentinel index instead of staying on the final phase

4. In [ManagedWorkflowRenderer.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts):
   - No structural redesign should be necessary if the sentinel index is used correctly
   - Confirm `buildManagedWorkflowPrompt(...)` and any active-phase reads work correctly when `currentPhase` is `undefined`

5. In [CompleteWorkflowItemToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts):
   - Keep the current `currentPhase` lookup, but ensure the terminal branch is now hit after final completion
   - The handler response should say `All required workflow phases are complete.` when the last required item is completed

#### Acceptance Criteria

- Completing the last required item in the final phase removes the active phase
- Managed workflow prompt rendering reaches the completed-workflow branch
- `complete_workflow_item` reports final completion instead of a stale “Current phase”

### 2. The Runtime Still Does Not Enforce Strict In-Order Item Completion

#### Finding

The controller currently enforces checkpoint ordering, but it still allows later non-blocked items to be marked complete before earlier required non-blocked items. That is weaker than:

- the tool contract in [complete_workflow_item.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/complete_workflow_item.ts)
- the “advanced in order” progression model in [managed-bmad-workflows-implementation-spec.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflows-implementation-spec.md)

Impacted code:

- [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts)
- [CompleteWorkflowItemToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts)
- [complete_workflow_item.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/complete_workflow_item.ts)

#### Intent

Make managed workflow item completion strictly sequential within the active phase.

Checkpoint enforcement should remain, but it should become a special case of the broader in-order rule rather than the only ordering rule.

#### Line-Level Code Intent

1. In [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts):
   - Tighten `completeManagedWorkflowItem(...)` so only the first incomplete required item in the current phase may be completed

2. Compute the active item explicitly:
   - Scan `phase.items` from the start
   - Find the first item where `completed !== true` and `optional !== true`
   - Treat that item as the only valid required completion target

3. Enforce completion order:
   - If the requested `itemId` does not match the first incomplete required item, throw an error like:
     - `Item "<id>" is not the active workflow item. Complete "<activeId>" first.`

4. Preserve optional-item behavior carefully:
   - If optional items are kept in v1, decide whether they may be completed only when they become the first incomplete item, or whether they should be excluded from the active-item rule entirely
   - Preferred v1 behavior:
     - optional items do not block progression
     - required items still advance strictly in order
     - optional items may only be completed while their phase is active

5. Keep checkpoint logic, but simplify it under the stronger rule:
   - The strict first-incomplete-required-item rule should already prevent bypassing checkpoints
   - Checkpoint-specific error messages may still be preserved for clarity when the active item is a blocked checkpoint

6. In [CompleteWorkflowItemToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts):
   - No structural changes are required if controller errors surface cleanly
   - If needed, improve the returned error wording so the model sees which item is currently active

#### Acceptance Criteria

- A later required item cannot be completed before earlier required items
- A blocked checkpoint cannot be bypassed because it becomes the active required item when reached
- Managed progression is strictly in order within the active phase

### 3. `<output>` XML Extraction Support Was Missing

#### Finding

The remediation documentation claimed XML extraction support for `<step>`, `<action>`, `<check>`, `<ask>`, and `<output>`, but at review time the extractor only handled:

- `<action>`
- `<ask>`
- `<template-output>`
- bullet items

That means workflows with output-only obligations can still be flattened to a generic goal instead of extracting the authored output obligation directly.

Impacted code:

- [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts)
- [managed-bmad-workflows-remediation-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflows-remediation-plan.md)

#### Intent

Add explicit `<output>` extraction support and bring the documentation back into alignment with the actual parser behavior.

#### Line-Level Code Intent

1. In [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts):
   - Extend `extractWorkflowStepItems(...)`
   - Add a regex pass for:
     - `<output>(...)</output>`

2. Convert output tags into deterministic checklist labels:
   - Preferred label format:
     - `${goal}: Produce output - ${outputText}`
   - Or, if more consistent with existing naming:
     - `${goal}: ${outputText}`

3. Include `<output>` presence in the fallback suppression logic:
   - If a step contains `<output>` tags, do not fall back to the generic goal-only label

4. Update tests:
   - Add or extend extraction tests using a workflow that actually contains output-only obligations
   - The cited [bmad-sprint-status/workflow.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-sprint-status/workflow.md) is a good candidate

5. Update documentation:
   - If `<check>` is still not implemented, either implement it in the same pass or narrow the documentation to match actual parser support
   - The goal should be that the docs do not claim parser support that the extractor does not have

#### Acceptance Criteria

- `<output>` tags produce explicit checklist items
- output-only workflow steps no longer collapse to a generic goal-only item
- remediation/docs accurately describe actual XML extraction support

## Recommended Delivery Order

1. Final-phase terminal state fix
2. Strict in-order item completion
3. `<output>` extraction support
4. Tests for all three behaviors
5. Documentation alignment

## Test Intent For The Next Patch Set

The next implementation pass should add or extend tests for:

1. Final completion behavior
   - Completing the last required item in the final phase moves `currentPhaseIndex` to a terminal state
   - Renderer prompt switches to the completed-workflow branch
   - `CompleteWorkflowItemToolHandler` returns the completion message instead of `Current phase`

2. Strict ordering
   - A later required item cannot be completed before the first incomplete required item
   - Checkpoint items are still enforced under the stricter rule

3. XML output extraction
   - `<output>` tags create explicit checklist items
   - output-only steps do not collapse to generic fallback labels

## Review Checklist

- [x] Completing the last required item exits the final active phase
- [x] Managed item completion is enforced strictly in order
- [x] `<output>` extraction support is implemented
- [x] Documentation matches actual extractor capabilities
