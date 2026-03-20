# Managed BMAD Workflows Remediation V5 Plan

## Purpose

This document captures the next remediation pass for managed BMAD workflows after review of the current implementation against the repo code and prior remediation docs.

The main conclusion from the latest review is:

- the managed workflow runtime is substantially implemented
- but it is not yet fully complete against its own documentation for the whole 24-workflow allowlist

## Execution Status

Status: Implemented for the scoped v5 pass.

Delivered in this pass:

- Added required-vs-advisory item support to the managed workflow item model.
- Added first-wave branch-aware extraction controls for single-file workflows through registry-backed extraction metadata.
- Tuned `bmad-sprint-status` so alternate branch sections are not enforced as one universal required path.
- Tuned `bmad-create-ux-design` so completion-phase next-step guidance is rendered as advisory instead of blocking.
- Updated completion gating so only required items block phase advancement and `allRequiredComplete`.
- Rejected duplicate `complete_workflow_item` calls as invalid transitions.
- Brought the extraction audit script into parity with runtime behavior for section scoping, `<output>`, branch-aware filtering, required-vs-advisory counts, fallback handling, and checkpoint inclusion.
- Updated the implementation spec to document required-vs-advisory semantics and first-wave branch-aware behavior.

Verification run after implementation:

- `node scripts/generate-managed-workflows.mjs`
- `node scripts/verify-managed-workflow-assets.mjs`
- `node scripts/audit-managed-workflow-extraction.mjs`

Verification note:

- The audit now reports required and advisory item counts using the same modeled extraction rules as the runtime.
- Focused mocha execution remains blocked in this environment by the repo's existing test harness and generated-proto prerequisites, so this document does not claim end-to-end green test execution.

The largest remaining gap is not activation, persistence, or completion gating. It is workflow modeling fidelity for single-file workflows that encode branches, alternate execution modes, or end-state guidance inside one document.

This plan focuses on the three confirmed findings:

1. Single-file workflow extraction is still too linear and overstates required work for some allowlisted workflows
2. `complete_workflow_item` still allows duplicate completion of an already-completed item
3. The extraction audit script has drifted from the production extractor and no longer measures the same parser behavior

## Scope

This remediation pass should only address the three issues above.

It should not:

- broaden the managed workflow allowlist
- redesign the overall managed workflow persistence model
- replace the current phase/item runtime with a full declarative branch engine

This pass should instead make the current architecture more faithful and more defensible for the existing allowlist.

## Findings

### 1. Single-File Workflow Extraction Still Overstates Required Work

#### Summary

The current extractor still treats many single-file workflows as one linear list of required steps, even when the authored file contains:

- alternate execution branches
- mode-specific subflows
- decision-driven forks
- “next steps” or follow-up guidance that should not be mandatory for the current run

This makes the backend-owned checklist too strict for at least part of the allowlist.

#### Confirmed Symptoms

- [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts) does not recognize `## INSTRUCTIONS` as a scoping boundary
- the step extractor walks every `<step>` block it sees in scoped content
- [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts) currently requires all non-optional extracted items before completion
- this flattens authored control flow in workflows like:
  - [bmad-sprint-status/workflow.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-sprint-status/workflow.md#L44)
  - [bmad-sprint-status/workflow.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-sprint-status/workflow.md#L197)
  - [bmad-sprint-status/workflow.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-sprint-status/workflow.md#L218)
- it also risks turning “what to do next” guidance into mandatory work, for example:
  - [step-14-complete.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-ux-design/steps/step-14-complete.md#L138)

#### Why This Matters

This was the main reason the implementation could not be described as complete for the supported allowlist. This pass narrows that gap with first-wave branch-aware filtering for the known problematic single-file workflows, but it still does not claim to be a general-purpose branch engine.

### 2. Duplicate Completion Is Still Too Permissive

#### Summary

The runtime currently accepts completion of an item that is already complete and returns success instead of rejecting the call.

#### Confirmed Symptoms

- [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts) returns the current run unchanged when the target item is already completed
- that is looser than the contract implied by:
  - [managed-bmad-workflows-implementation-spec.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflows-implementation-spec.md#L323)
  - [complete_workflow_item.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/complete_workflow_item.ts#L11)

#### Why This Matters

It does not corrupt state, but it hides model mistakes and weakens debugging. For a deterministic workflow system, duplicate completion should be treated as invalid state transition, not a no-op success.

### 3. The Audit Script No Longer Matches Production Extraction

#### Summary

The extraction audit is being used as evidence that checklist extraction is healthy, but it no longer matches the production extractor exactly.

#### Confirmed Symptoms

- runtime extraction supports `<output>` in:
  - [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts)
- the audit script still omits that logic in:
  - [audit-managed-workflow-extraction.mjs](/Users/robertboston/Documents/Cline%20Extension/cline/scripts/audit-managed-workflow-extraction.mjs)
- therefore, “audit passes” statements in:
  - [managed-bmad-workflows-remediation-v3-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflows-remediation-v3-plan.md)
  - [managed-bmad-workflows-remediation-v4-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflows-remediation-v4-plan.md)
  are weaker than they appear

#### Why This Matters

This is not a runtime bug by itself, but it undermines the trustworthiness of the validation story. The audit should either call the same extraction logic as production or be clearly labeled as an approximation.

## Remediation Strategy

### Workstream 1: Make Single-File Workflow Extraction Branch-Aware Enough For The Allowlist

#### Goal

Stop treating every discovered step in a single-file workflow as a mandatory linear obligation.

The objective for this pass is not to build a full branch engine. It is to prevent obvious alternate-mode and “next steps” content from being enforced as universal required work.

#### Approach

Use a layered remediation strategy:

1. Improve section scoping
2. Add branch-aware step filtering for single-file workflows
3. Add workflow-specific extraction policies for the known problematic workflows
4. Distinguish required execution items from advisory/follow-up items

#### Detailed Action Plan

##### 1. Expand candidate-section scoping

In [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts):

- update the section discovery logic to recognize `## INSTRUCTIONS`
- review other high-signal authored section names that should be considered primary execution scopes for single-file workflows
- ensure the extractor does not accidentally pull in unrelated “reference” or “handoff” sections when a clearer execution section exists

Intent:

- reduce accidental extraction from broad documents where only one or two sections are the actual executable workflow

##### 2. Introduce workflow extraction modes for single-file workflows

Add a new concept to the managed workflow registry or extractor config:

- `singleFileMode?: "linear" | "branch-aware" | "guided"`

For this pass:

- `linear` keeps current behavior
- `branch-aware` enables filtering of mutually exclusive or advisory steps
- `guided` can be used for workflows where only a subset of the document should become required checklist items

Intent:

- avoid forcing one generic parser behavior across all 24 supported workflows

##### 3. Add workflow-specific extraction policies for known problematic files

For first-wave branch-aware handling, explicitly target:

- `bmad-sprint-status`
- `bmad-create-ux-design`

Potentially also review:

- any other single-file allowlisted workflow whose authored control flow mixes execution and follow-up guidance in one file

For each targeted workflow, add a small extractor override contract such as:

- include only the primary execution branch for the active default mode
- exclude advisory “next action” option lists from required checklist items
- exclude alternative subflows that are clearly mode-specific unless the runtime explicitly selected that mode

Intent:

- solve the actual allowlist issue quickly and safely instead of waiting for a universal branch parser

##### 4. Separate required items from advisory items

Extend item generation so extracted entries can carry richer metadata, for example:

- `required: true | false`
- `advisory: true`
- `branchTag?: string`
- `modeTag?: string`

For this pass, the minimum useful addition is:

- a way to mark extracted items as non-required when they represent advisory/follow-up guidance

Then update completion logic so only required items are included in:

- phase completion checks
- `allRequiredComplete`
- attempt-completion gating

Intent:

- preserve visibility of “what next” content without forcing it to block workflow completion

##### 5. Do not yet implement deep runtime branch execution

Explicit non-goal for this pass:

- do not build a full state machine with dynamic branch selection and branch pruning unless necessary

Instead:

- apply static filtering and item classification sufficient for the current allowlist

#### Line-Level Code Intent

In [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts):

- extend candidate section recognition to include `## INSTRUCTIONS`
- introduce a post-extraction normalization pass for single-file workflows
- add workflow-specific filtering hooks keyed by `workflow.workflowId`
- allow extracted items to be marked non-required/advisory where appropriate

In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/types.ts):

- add item metadata needed for required vs advisory distinction
- if needed, add workflow-level extraction mode config

In [managed-workflows.shared.mjs](/Users/robertboston/Documents/Cline%20Extension/cline/scripts/managed-workflows.shared.mjs):

- annotate known problematic workflows with extraction mode or override hints

In [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts):

- make completion gating depend on required items rather than all extracted items

#### Acceptance Criteria

- supported single-file workflows no longer force obviously alternate or advisory branches as universal required work
- `bmad-sprint-status` does not require all branch sections in one run
- `bmad-create-ux-design` completion-phase “next steps” guidance is not treated as blocking required work
- docs can honestly describe the allowlist as supported without overstating branch fidelity

### Workstream 2: Reject Duplicate `complete_workflow_item` Calls

#### Goal

Treat duplicate completion as an invalid workflow transition rather than silently succeeding.

#### Detailed Action Plan

In [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts):

- replace the current no-op return for `targetItem.completed === true`
- throw an explicit error instead, for example:
  - `Item "<id>" is already complete. Do not mark it complete again.`

In [CompleteWorkflowItemToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts):

- no structural change should be needed if controller errors surface naturally
- if desired, increment mistake count or improve error text for model clarity

In tests:

- add a regression test proving duplicate completion is rejected

#### Acceptance Criteria

- duplicate completion attempts are rejected
- the model gets a clear error message instead of silent success
- workflow debugging becomes more transparent when the model repeats an item

### Workstream 3: Make The Audit Use Production Extraction Logic

#### Goal

Ensure the extraction audit measures the same parser behavior used at runtime.

#### Detailed Action Plan

Preferred path:

1. Extract shared pure parsing helpers from [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts)
2. Reuse those helpers from:
   - runtime extraction
   - audit script

If that is too disruptive:

1. update [audit-managed-workflow-extraction.mjs](/Users/robertboston/Documents/Cline%20Extension/cline/scripts/audit-managed-workflow-extraction.mjs)
2. manually bring it into parity with current runtime extraction, including:
   - `<output>`
   - any new branch-aware filtering logic introduced in Workstream 1

The better long-term design is shared parser logic, not copy-pasted parallel logic.

#### Line-Level Code Intent

Option A, preferred:

- move parsing utilities into a shared module under:
  - [src/core/task/managed-workflows](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows)
- make both the runtime extractor and the audit script depend on that shared implementation

Option B, acceptable for this pass:

- patch the audit script to mirror the production parser exactly
- add an explicit note in the script header that it must remain in sync with runtime extraction

#### Acceptance Criteria

- the audit script produces results using the same extraction logic as runtime
- audit evidence is trustworthy again
- future parser changes are less likely to drift silently from audit behavior

## Test Plan

### 1. Single-File Branch Fidelity Tests

Add or extend extraction tests for:

- `bmad-sprint-status`
  - verify alternate branch sections are not all treated as required in one run
  - verify required extracted items reflect the main execution path only

- `bmad-create-ux-design`
  - verify completion-phase next-step options are not blocking required items

### 2. Completion Contract Tests

Add controller/handler tests for:

- duplicate `complete_workflow_item` rejection
- required-only phase completion
- advisory items not blocking `allRequiredComplete`

### 3. Audit Parity Tests

Add at least one test or script assertion that:

- runtime extraction and audit extraction agree for a representative workflow using `<output>`
- ideally also for a single-file branch-aware workflow

## Documentation Updates Required

After the remediation lands:

- update [managed-bmad-workflows-implementation-spec.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflows-implementation-spec.md) if needed to reflect required vs advisory item semantics
- update the most recent remediation tracker to reflect execution status
- remove or narrow any language that still implies the full allowlist is completely faithful if branch-aware filtering is still partial

## Recommended Delivery Order

1. Add required vs advisory item support
2. Implement branch-aware extraction for the first-wave problematic single-file workflows
3. Update completion gating to use required items only
4. Reject duplicate completion
5. Bring the audit script into parity with runtime extraction
6. Add focused regression coverage
7. Update remediation tracking docs

## Review Checklist

- [x] Single-file allowlisted workflows no longer flatten alternate branches into universal required work
- [x] Advisory/next-step guidance is not treated as blocking required checklist work
- [x] Duplicate `complete_workflow_item` calls are rejected
- [x] Audit extraction matches production extraction behavior
- [x] Documentation no longer overstates allowlist completeness
