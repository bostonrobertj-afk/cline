# Managed Workflow Standardization Plan

This document describes the implementation plan for updating managed BMAD workflows to match the canonical formatting approach defined in [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md).

It is written to support two use cases:

- execution: an agent should be able to implement the work in order without missing major dependencies
- QA: a separate agent should be able to verify whether the implementation is complete, correct, and aligned with the agreed schema

## Objective

Standardize managed workflow support so that:

- workflow files are authored using the new canonical schema
- managed workflow extraction is based on structured workflow semantics rather than broad heuristics
- Focus Chain shows only step-level progress
- the active step prompt still surfaces required `action`, `ask`, and `output` obligations prominently
- detail-layer content remains visible to the model without becoming checklist noise

## Agreed Schema Decisions

These decisions are considered settled for this implementation:

1. `<step>` is the checklist/progress unit.
2. Focus Chain and managed checklist views should show only step-level items.
3. Required `<action>`, `<ask>`, and `<output>` content must still be surfaced prominently in the active-step prompt.
4. `<detail>` is prompt-visible supporting content and should not become a checklist item.
5. `optional="true"` means non-blocking.
6. `<branch if="...">` is the canonical conditional container.
7. Legacy `<check if="...">` should be treated as migration-compatible branch syntax.
8. `## CHECKPOINT` remains a special gating construct.
9. Routing directives should be standardized as explicit tags:
   - `<goto step="..."/>`
   - `<handoff path="..."/>`
   - `<return/>`
   - `<exit/>`
10. Annotation-style tags such as `<critical>`, `<note>`, and `<guideline>` belong to the detail layer.
11. `<template-output>` should be treated as prompt-visible detail-layer guidance, not as a checklist item.

## Non-Goals

This implementation does not need to:

- introduce a full deterministic execution engine for every workflow tag
- make `if="..."` conditions backend-evaluated in this pass
- preserve legacy heuristic extraction as the primary path for converted workflows

## Current Runtime Gaps

The current managed workflow system differs from the target model in several ways:

- extraction is still largely heuristic and flat
- child tags like `action`, `ask`, and `output` are turned into flat checklist items
- `<detail>` is not a recognized concept
- `<branch>` is not a recognized concept
- `<check>` is stripped only in narrow contexts
- raw phase file content is injected into prompts verbatim
- Focus Chain renders all extracted items flatly
- `template-output` currently behaves like a checklist-producing extraction source

## Primary Files To Change

### Runtime / Types

- [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/types.ts)
- [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts)
- [ManagedWorkflowRenderer.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts)
- [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts)
- [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)
- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)
- [complete_workflow_item.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/complete_workflow_item.ts)

### Registry / Config

- [managed-workflows.json](/Users/robertboston/Documents/Cline%20Extension/cline/_bmad/_config/managed-workflows.json)

### Tests

- [ManagedWorkflowPhaseExtractor.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/__tests__/ManagedWorkflowPhaseExtractor.test.ts)
- [ManagedWorkflowController.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/__tests__/ManagedWorkflowController.test.ts)
- add/update renderer-focused tests near [ManagedWorkflowController.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/__tests__/ManagedWorkflowController.test.ts)
- add/update prompt/focus-chain tests if needed

### Workflow Source Files

Initial conversion targets:

- `cline-skills/bmad-code-review/**`
- `cline-skills/bmad-create-architecture/steps/step-03-starter.md`
- `cline-skills/gds-sprint-status/workflow.md`

Subsequent waves:

- remaining phase-root managed workflows
- remaining single-file managed workflows

## Implementation Workstreams

## 1. Introduce Structured Managed Workflow Parsing

### Goal

Move from “extract labels from raw text” to “parse the workflow execution structure”.

### Required Changes

1. Add structured execution node types in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/types.ts).
2. Add a parsed representation for:
   - `step`
   - `branch`
   - `action`
   - `ask`
   - `output`
   - `detail`
   - `template-output`
   - annotation tags like `critical`, `note`, `guideline`
   - routing tags like `goto`, `handoff`, `return`, `exit`
3. Add a parsed execution field to `ManagedWorkflowPhaseState`.
4. Preserve raw `sourceContent` only as a fallback/debug field, not as the primary render source.

### Execution Notes

- Use tolerant text parsing, not a strict XML parser.
- The parser must tolerate imperfect authoring while still preferring the canonical format.
- The parser should scope primarily to `## EXECUTION`.

## 2. Make Step the Only Checklist Item Unit

### Goal

Checklist and Focus Chain should track only steps, not child actions/asks/outputs.

### Required Changes

1. Change extraction in [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts) so each `<step>` produces one `ManagedWorkflowItemState`.
2. Stop generating checklist items from:
   - `<action>`
   - `<ask>`
   - `<output>`
   - `<template-output>`
   - `<detail>`
   - bullets
   - numbered headings
   - bold fragments
3. Keep step-level `optional="true"` reflected in item metadata.
4. Preserve `## CHECKPOINT` as a separate blocked checkpoint item.

### Acceptance Condition

For converted workflows, Focus Chain should show one row per step plus any checkpoint item, not dozens of flattened child items.

## 3. Surface Required Child Obligations in the Active-Step Prompt

### Goal

Keep workflows interactive and explicit without making asks/outputs separate checklist rows.

### Required Changes

1. Update [ManagedWorkflowRenderer.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts) to render:
   - current step checklist row(s) with item IDs
   - current step details beneath the active step
2. For each active step, render child content in separate labeled groups:
   - `Actions`
   - `Asks`
   - `Outputs`
   - `Branches`
   - `Details`
   - `Annotations`
3. Ensure `ask` and `output` obligations are clearly presented as required step behavior.
4. Remove raw verbatim phase injection from the prompt.

### Important Constraint

The renderer must not make the prompt regress into raw XML dumps or duplicated prose blocks.

## 4. Teach the Extractor About Detail-Layer Content

### Goal

Support the new guide’s two-layer model.

### Required Changes

1. Treat `<detail>` as non-checklist prompt content.
2. Treat `<template-output>` as non-checklist prompt content.
3. Treat `<critical>`, `<note>`, `<guideline>`, and similar tags as non-checklist prompt content.
4. Preserve these under the relevant parent step or branch for rendering.

### Acceptance Condition

Supporting nuance still appears in the active workflow prompt, but not in Focus Chain checklist rows.

## 5. Normalize Conditional Containers

### Goal

Use `<branch if="...">` as the canonical conditional structure.

### Required Changes

1. Parse `<branch if="...">` as the primary conditional container.
2. Parse legacy `<check if="...">` as migration-compatible branch syntax.
3. Attach nested actions/asks/outputs to the correct branch.
4. Ensure branch details render under the relevant step in the prompt.

### Migration Rule

Converted workflow files should author new branch logic with `<branch>` rather than `<check>`.

## 6. Standardize Workflow Routing Semantics

### Goal

Make workflow control flow explicit and schema-based.

### Required Changes

1. Add support for routing tags in the structured parser:
   - `<goto step="..."/>`
   - `<handoff path="..."/>`
   - `<return/>`
   - `<exit/>`
2. Render them in step detail so the model can follow them.
3. Ensure they do not appear as checklist items.
4. During migration, convert prose routing directives like:
   - `Read fully and follow ...`
   - `Jump to Step ...`
   - `Continue to Step ...`
   - `Return to caller`
   - `Exit workflow`
   into these explicit tags.

## 7. Preserve Checkpoint Gating

### Goal

Keep `## CHECKPOINT` as a special controller-backed gate.

### Required Changes

1. Keep checkpoint extraction separate from ordinary step extraction.
2. Ensure checkpoint labels remain human-readable and not derived from malformed child tags.
3. Keep blocked checkpoint enforcement in [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts).

### Do Not

- do not fold checkpoint semantics into normal step completion in this pass

## 8. Simplify Config for Converted Workflows

### Goal

Make registry config reflect the new canonical format.

### Required Changes

1. Update converted workflows in [managed-workflows.json](/Users/robertboston/Documents/Cline%20Extension/cline/_bmad/_config/managed-workflows.json) so `strategyHints` prioritize `workflow-steps`.
2. For fully converted workflows, remove legacy heuristic strategy dependence where practical.
3. Immediately update `bmad-code-review`, which currently lacks `workflow-steps`.

### Acceptance Condition

Converted workflows should not fall back to legacy bullets/headings for item extraction.

## 9. Convert Initial Reference Workflows

### Goal

Prove the schema and runtime together before broader migration.

### First Conversion Wave

1. `bmad-code-review`
   - use [step-01-gather-context.md](/Users/robertboston/Documents/Cline%20Extension/cline/cline-skills/bmad-code-review/steps/step-01-gather-context.md) as the reference shape
2. `bmad-create-architecture/steps/step-03-starter.md`
   - use the saved branch-based rewrite as a second reference shape
3. `gds-sprint-status/workflow.md`
   - convert mode routing and data/validate branches explicitly

### Why These First

- they directly exercise:
  - step-level checklist rendering
  - branch handling
  - ask/output prominence
  - detail-layer separation
  - routing semantics
  - template-output handling

## 10. Update Tests

### Extractor Tests

Add or update tests to prove:

- `<detail>` is ignored for checklist extraction
- `<branch>` creates structured branch content
- `<check>` is parsed as legacy-compatible branching
- converted workflows produce step-only checklist items
- `optional="true"` becomes non-blocking metadata
- `<template-output>` does not produce checklist rows for converted workflows
- checkpoint extraction still works

### Renderer Tests

Add tests to prove:

- Focus Chain renders only step rows plus checkpoint rows
- active step prompt renders child asks/outputs/actions prominently
- raw XML phase dumps no longer appear in the prompt
- detail-layer content still appears beneath the relevant step

### Controller Tests

Add tests to prove:

- completing a step advances correctly
- optional steps remain non-blocking
- checkpoints still block advancement
- step-only item sets still work end-to-end

## Recommended Delivery Order

1. Add structured node types in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/types.ts).
2. Implement structured parsing in [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts).
3. Change checklist extraction to step-only.
4. Update [ManagedWorkflowRenderer.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts) for checklist-plus-detail prompt rendering.
5. Update Focus Chain rendering.
6. Update [managed-workflows.json](/Users/robertboston/Documents/Cline%20Extension/cline/_bmad/_config/managed-workflows.json) for first-wave converted workflows.
7. Convert first-wave workflow files.
8. Add/update tests.
9. Run the first-wave QA pass.
10. Convert remaining workflows in waves.

## Execution Checklist

- [ ] Structured workflow node types added
- [ ] Parsed execution tree stored in `ManagedWorkflowPhaseState`
- [ ] `step` becomes the only checklist item unit
- [ ] `detail` is ignored for checklist extraction
- [ ] `template-output` is treated as prompt detail, not a checklist item
- [ ] legacy `<check>` is supported as branch syntax
- [ ] `branch` is supported as canonical branch syntax
- [ ] routing tags are supported in the parser
- [ ] raw phase file injection removed from prompt rendering
- [ ] active step prompt renders `action`, `ask`, and `output` obligations clearly
- [ ] Focus Chain shows only steps and checkpoints
- [ ] checkpoint gating still works
- [ ] `bmad-code-review` config updated to include `workflow-steps`
- [ ] first-wave workflows converted
- [ ] extractor tests updated
- [ ] renderer tests updated
- [ ] controller tests updated

## Post-Execution QA Checklist

A separate QA agent should verify the following:

### Runtime Semantics

- [ ] Converted workflows no longer fall back to generic phase-level items.
- [ ] Focus Chain shows only step-level rows plus checkpoints.
- [ ] Completing a step requires completing the correct current step item ID.
- [ ] Optional steps do not block workflow completion.
- [ ] Checkpoints still block advancement until completed.

### Prompt Quality

- [ ] The active workflow prompt no longer includes raw `<managed_workflow_phase>` file dumps.
- [ ] The active step prompt clearly shows required `Actions`, `Asks`, and `Outputs`.
- [ ] `detail`, `critical`, `note`, and `template-output` content is still visible to the model under the appropriate step.
- [ ] Asks and outputs are not shown as separate Focus Chain rows.

### Config Alignment

- [ ] Converted workflows in [managed-workflows.json](/Users/robertboston/Documents/Cline%20Extension/cline/_bmad/_config/managed-workflows.json) prioritize `workflow-steps`.
- [ ] Legacy extraction strategies are not still doing the real work for converted workflows.

### Source File Conformance

- [ ] Converted workflow files follow the guide in [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md).
- [ ] No same-tag nesting remains in converted files.
- [ ] Conditional logic uses `<branch if="...">` instead of new `<check>` authoring.
- [ ] Checkpoint gates remain in `## CHECKPOINT`.
- [ ] Routing directives use explicit routing tags where converted.

### Regression Checks

- [ ] Existing managed workflows not yet converted still load without runtime crashes.
- [ ] Resume behavior still works for active runs whose structure has not changed.
- [ ] Converted workflow runs rebuild cleanly when prior phase layouts no longer match.

## QA Artifacts To Capture

The QA pass should capture:

- one example of a converted workflow prompt
- one example of Focus Chain output for a converted workflow
- test results for extractor/controller/renderer coverage
- a short list of any workflows that still rely on legacy heuristic extraction

## Suggested First QA Targets

1. `bmad-code-review`
2. `gds-sprint-status`
3. `bmad-create-architecture/steps/step-03-starter.md`

## Definition of Done

This standardization effort should be considered successful when:

- the runtime cleanly supports the new workflow schema
- converted workflows produce readable step-only checklists
- asks and outputs remain execution-prominent without becoming checklist noise
- detail-layer content remains visible to the model
- routing and branching semantics are explicit and consistent
- QA can verify all of the above using the checklist in this document
