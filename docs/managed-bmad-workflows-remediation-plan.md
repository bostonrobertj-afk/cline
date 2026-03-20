# Managed BMAD Workflows Remediation Plan

## Purpose

This document is the follow-up action plan for the gaps identified during review of the first managed BMAD workflow implementation.

It focuses on five confirmed issues:

1. Checklist extraction is too shallow for much of the supported workflow allowlist.
2. `bmad-problem-solving` alias normalization was promised but not implemented.
3. Managed `use_skill` activation always restarts instead of resuming in-progress workflow runs.
4. Asset verification checks source files and ignore rules, but not packaged artifacts.
5. Test coverage is too narrow for the risk profile of the feature.

The goal of this remediation pass is to bring runtime behavior back in line with the implementation spec and make the managed workflow claims defensible.

## Execution Status

This remediation plan has now been implemented in the repo.

- Extraction was upgraded from a shallow first-match parser to a layered, strategy-driven extractor with workflow-specific hints and audit tooling.
- `bmad-problem-solving` now resolves to the canonical managed workflow `bmad-cis-problem-solving`.
- Managed `use_skill` activation now starts or resumes instead of always rebuilding workflow state.
- Asset verification now checks built archives in addition to source-tree assets.
- Coverage was expanded for extraction fidelity, aliasing, completion gating, and item-completion persistence.

Local verification note:

- The remediation scripts run successfully in this repository state.
- Full TypeScript/mocha execution that traverses the broader task runtime is still partially blocked by the repo's existing generated-protobuf prerequisite in `src/shared/proto/**`.

## Success Criteria

- Backend-generated checklist items reflect real workflow work for all supported workflows, not just phase presence.
- `/bmad-problem-solving` activates the managed `bmad-cis-problem-solving` workflow path.
- Re-invoking a managed workflow through `use_skill` resumes the active run when appropriate.
- Packaging verification proves required workflow assets exist in built artifacts, not only in the source tree.
- Tests cover extraction fidelity, completion gating, and workflow-state persistence for representative managed workflows.

## Remediation Workstreams

### 1. Fix Checklist Extraction Fidelity

#### Problem

The current extractor in [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts) often reduces rich phase files to one checklist item or a generic fallback item. This weakens the backend-owned plan and makes `task_progress` an incomplete reflection of the authored workflow.

#### Plan

1. Replace the current extraction strategy with a layered parser.
   - Keep the current ordered-list extraction as one strategy, not the only strategy.
   - Add support for:
     - bullet lists under phase instruction sections
     - XML-like workflow blocks such as `<step>`, `<action>`, `<ask>`, `<template-output>`, and `<output>`
     - imperative subheadings that indicate required work
     - multi-line obligation blocks under numbered items

2. Add a normalized extraction pipeline in priority order.
   - Phase-specific override rules
   - Structured workflow markup extraction
   - Ordered list extraction
   - Bullet list extraction
   - Heading-derived extraction
   - Generic single fallback item only as a last resort

3. Introduce workflow-specific extraction overrides for known weak workflows.
   - Required first-wave targets:
     - `bmad-create-prd`
     - `bmad-create-epics-and-stories`
     - `bmad-create-architecture`
     - `bmad-create-product-brief`
     - `bmad-create-ux-design`
     - `bmad-check-implementation-readiness`
     - `bmad-edit-prd`
     - `bmad-create-story`
     - `bmad-dev-story`
     - `bmad-document-project`
     - `bmad-sprint-status`
     - `bmad-cis-innovation-strategy`
     - `bmad-cis-problem-solving`

4. Add extraction audit tooling.
   - Add a script that prints per-workflow counts:
     - phases discovered
     - items per phase
     - workflows with one-item total
     - workflows with one-item-per-phase patterns
   - Use it to prevent regressions as parser rules evolve.

#### Deliverables

- Updated [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts)
- New extraction helper or override module under [src/core/task/managed-workflows](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows)
- New audit script under [scripts](/Users/robertboston/Documents/Cline%20Extension/cline/scripts)

#### Acceptance Criteria

- No supported workflow is reduced to a single generic item unless the authored workflow truly contains only one actionable unit.
- Target workflows above produce materially richer item lists than the current implementation.
- `task_progress` for managed workflows is visibly more faithful to authored phase work.

### 2. Implement Alias Normalization for `bmad-problem-solving`

#### Problem

The spec said `bmad-problem-solving` normalizes to `bmad-cis-problem-solving`, but the runtime only recognizes the exact managed workflow ID.

#### Plan

1. Add alias support to managed workflow definitions.
   - Extend the managed workflow registry schema with an `aliases` field.

2. Register the alias in the committed registry source.
   - `bmad-cis-problem-solving` should include:
     - `aliases: ["bmad-problem-solving"]`

3. Update runtime lookup logic.
   - `getManagedWorkflowDefinition`
   - `getManagedWorkflowDefinitionBySlashCommand`
   - Any helper that currently uses exact-match only

4. Surface alias behavior in slash-command discovery if desired.
   - Either show only the canonical slash command and still accept the alias
   - Or expose both with the alias labeled as compatibility/deprecated

#### Deliverables

- Updated [managed-workflows.shared.mjs](/Users/robertboston/Documents/Cline%20Extension/cline/scripts/managed-workflows.shared.mjs)
- Updated [generate-managed-workflows.mjs](/Users/robertboston/Documents/Cline%20Extension/cline/scripts/generate-managed-workflows.mjs)
- Updated [ManagedWorkflowRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRegistry.ts)

#### Acceptance Criteria

- `/bmad-problem-solving` activates the managed `bmad-cis-problem-solving` run.
- `use_skill("bmad-problem-solving")` resolves the same managed workflow definition as `bmad-cis-problem-solving`.

### 3. Change Managed `use_skill` from Restart to Start-or-Resume

#### Problem

Managed `use_skill` currently rebuilds workflow state every time it is invoked, even if the same workflow is already active and partially completed.

#### Plan

1. Add explicit resume logic in [UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts).
   - If the current task already has an active `managedWorkflowRun` for the same workflow and it is not terminal, return the existing run.
   - Only create a new run when:
     - no run exists
     - the workflow differs
     - the prior run is completed/cancelled and restart is desired

2. Add a small controller helper.
   - Example: `startOrResumeManagedWorkflowRun(...)`

3. Preserve current checklist and phase position on resume.
   - Do not rebuild phases
   - Do not re-extract items
   - Do not clear completed items

4. Return a distinct tool message for resume vs start.
   - This helps debugging and future tests.

#### Deliverables

- Updated [UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts)
- Updated [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts)

#### Acceptance Criteria

- Re-invoking the same managed workflow via `use_skill` does not reset checklist progress.
- `task_progress` remains unchanged after resume except for backend refresh/render.

### 4. Upgrade Asset Verification to Validate Built Artifacts

#### Problem

Current verification proves source-tree correctness, but not packaged output correctness.

#### Plan

1. Keep the existing source-tree verification.
   - It is still useful as a fast pre-package validation layer.

2. Add artifact verification after packaging.
   - For extension packaging:
     - inspect the produced VSIX file
   - For standalone packaging:
     - inspect the generated zip

3. Validate every registered asset path against archive contents.
   - `_bmad/_config/managed-workflows.json`
   - all `packagedAssetPaths` from the registry

4. Make packaging fail if any managed workflow asset is absent from the archive.

5. Record artifact verification results in script output.
   - number of expected files
   - number found
   - first missing path if failure occurs

#### Deliverables

- Updated [verify-managed-workflow-assets.mjs](/Users/robertboston/Documents/Cline%20Extension/cline/scripts/verify-managed-workflow-assets.mjs)
- New archive-inspection helper script if needed under [scripts](/Users/robertboston/Documents/Cline%20Extension/cline/scripts)
- Updates to [package-standalone.mjs](/Users/robertboston/Documents/Cline%20Extension/cline/scripts/package-standalone.mjs) and any VSIX package path used in this repo

#### Acceptance Criteria

- Verification fails if an expected managed workflow asset is missing from a built artifact.
- Verification passes only when both source-tree and artifact checks succeed.

### 5. Expand Coverage Around High-Risk Managed Workflow Paths

#### Problem

Current tests validate only a small part of the feature and do not cover the failure modes surfaced in review.

#### Plan

1. Add extraction tests for representative weak workflows.
   - Required:
     - `bmad-create-prd`
     - `bmad-review-edge-case-hunter`
     - `bmad-sprint-status`
     - `bmad-create-story` or `bmad-dev-story`

2. Add completion gate tests.
   - Verify [AttemptCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts) rejects completion when required items remain.
   - Verify it allows completion once `allRequiredComplete` is true.

3. Add completion tool persistence tests.
   - Verify [CompleteWorkflowItemToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts) persists updated run state to task metadata.
   - Verify the saved state can be restored and resumed.

4. Add alias resolution tests.
   - `/bmad-problem-solving`
   - canonical `bmad-cis-problem-solving`

5. Add packaging verification tests if practical.
   - At minimum, test the verification script against a fixture registry and a mock archive/file list.

#### Deliverables

- Expanded tests under:
  - [src/core/task/managed-workflows](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows)
  - [src/core/task/tools/handlers](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers)
  - [src/test](/Users/robertboston/Documents/Cline%20Extension/cline/src/test)

#### Acceptance Criteria

- Tests cover extraction fidelity, completion gating, persistence, and aliasing for managed workflows.
- The review findings can be mapped directly to test cases.

## Recommended Delivery Order

1. Extraction fidelity
2. Alias normalization
3. Start-or-resume behavior
4. Test coverage for the above
5. Artifact verification

This order front-loads correctness of runtime behavior before tightening install/package guarantees.

## Review Checklist

- [x] No supported workflow is reduced to a misleading single-item plan
- [x] `/bmad-problem-solving` works as a managed alias
- [x] Managed `use_skill` resumes instead of resetting progress
- [x] Package verification checks built artifacts, not only source files
- [x] Tests cover the findings that triggered this remediation plan

## Notes

- This remediation pass should not broaden the supported allowlist.
- If extraction remains too lossy for a subset of workflows after parser improvements, the next escalation path should be explicit per-workflow manifests or authored item metadata rather than more prompt-side compensation.
