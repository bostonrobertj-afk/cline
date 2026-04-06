# PI Planning Step Progression Requirements

## Purpose

This document defines the step-progression requirements for [pi-planning.md](/Users/robertboston/Documents/Cline/Workflows/pi-planning.md).

It covers:

- deterministic progression for the system-owned Steps 1 through 3
- governed step-transition behavior for Steps 4 and 5

It does not define:

- workflow-start form UX or submission transport
- Step 2 menu/modal behavior
- Step 3 artifact-generation implementation details
- contextual tool matrix edits
- workflow persona activation

Those belong in separate capability requirements documents.

## Source Of Truth

These requirements are grounded in the current runtime and the authored workflow:

- [pi-planning.md](/Users/robertboston/Documents/Cline/Workflows/pi-planning.md)
- [progress-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/pi-planning/progress-tracker.md)
- [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md)
- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)
- [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
- [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts)
- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)
- [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts)

## Capability Boundary

This document defines only how the runtime decides that each `pi-planning.md` step is complete and how the workflow transitions to the next step.

This document does not define how the runtime:

- collects Step 1 inputs
- renders the Step 2 epic-selection UI
- creates the Step 3 delivery-spec artifact
- teaches or exposes tools outside the progression contract itself

## Current Runtime Gap

`pi-planning.md` is not currently a supported deterministic placeholder workflow in:

- [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)

Because of that:

- deterministic progression will not currently evaluate `pi-planning.md`
- Steps 1 through 3 cannot currently auto-complete from workflow state
- Steps 4 and 5 cannot currently rely on `workflow_progress_request` as part of the `pi-planning.md` progression contract

## Core Requirement

The runtime must support `pi-planning.md` as a step-driven placeholder workflow whose progression contract is:

- Step 1 completes when the required workflow-start placeholders are already stored
- Step 2 completes when `target_epic` is present and non-empty
- Step 3 completes either from an existing provided `epic_delivery_spec` artifact or from a newly-created current-task `epic_delivery_spec` artifact
- Step 4 advances only when `workflow_progress_request` receives `Yes`
- Step 5 advances only when `workflow_progress_request` receives `Yes`

## Support Registration Requirements

### 1. Add `pi-planning.md` to deterministic support

`pi-planning.md` must be added to the exact-name deterministic workflow support surface in the same explicit style used by the current capability.

The support model must remain:

- exact workflow-name opt-in
- explicit workflow-specific evaluator dispatch
- no inference from free-form prose alone

### 2. Add explicit evaluator dispatch for `pi-planning.md`

The deterministic progression runtime must dispatch `pi-planning.md` to its own workflow-specific evaluator.

This buildout must not piggyback on another workflow’s evaluator.

## Per-Step Progression Requirements

### Step 1: Gather Requirements

Step 1 is deterministic and placeholder-state-driven.

Step 1 must complete when all required Step 1 placeholders are present and non-empty:

- `epics_document`
- `architecture_document`

`epic_delivery_spec` is optional for Step 1 and must not block Step 1 completion.

Step 1 completion must not require:

- file existence checks
- current-task write proofs
- artifact creation

Step 1 completion must be proven from stored workflow placeholder state only.

When Step 1 auto-completes, the runtime must advance the checklist through the normal focus-chain completion path rather than by ad hoc checklist mutation.

The Step 1 completion reason must clearly indicate that the required workflow-start inputs were already available in workflow placeholder state.

### Step 2: Identify Target Epic

Step 2 is deterministic and placeholder-state-driven.

Step 2 must complete when:

- `target_epic` is present in merged workflow placeholder state
- `target_epic` is non-empty after trimming

Step 2 deterministic completion must not require the runtime to re-parse `{epics_document}` for validation.

The upstream Step 2 system-owned UI path is expected to constrain the user to valid choices; deterministic progression only checks whether the workflow state now contains the chosen target epic.

Step 2 completion must not require:

- file existence checks
- current-task write proofs
- artifact creation

When Step 2 auto-completes, the runtime must advance the checklist through the normal focus-chain completion path.

The Step 2 completion reason must clearly indicate that `target_epic` was already available in workflow placeholder state.

### Step 3: Build Epic Delivery Spec

Step 3 completes when:

- `epic_delivery_spec` is present and non-empty in merged workflow placeholder state
- the resolved `epic_delivery_spec` path exists on disk

Immediately after Step 2 auto-completes, deterministic progression must re-evaluate Step 3 in the same progression pass.

If `epic_delivery_spec` already resolves to an existing file at that point, Step 3 must complete immediately.

If `epic_delivery_spec` does not yet resolve to an existing file, Step 3 must remain active until the Step 3 automation creates the artifact and sets `epic_delivery_spec`.

If the resolved file has a current-task placeholder-workflow write proof, the Step 3 completion reason must indicate that the delivery spec was written during the current task.

If the resolved file exists without a current-task placeholder-workflow write proof, the Step 3 completion reason must indicate that an existing delivery spec already resolved.

#### Shared Step 3 rules

- progression is keyed from `epic_delivery_spec`
- the runtime must resolve relative paths through the same workflow placeholder path-resolution behavior used by the deterministic progression system
- completion must not depend on model-authored `task_progress`
- completion must not require the deterministic evaluator to create or modify the artifact itself

When Step 3 auto-completes, the runtime must advance the checklist through the normal focus-chain completion path.

The Step 3 completion reason must distinguish between:

- an existing provided delivery spec being adopted
- a delivery spec being created during the current task

### Step 4: Set Expectations

Step 4 is not deterministically auto-completed by the evaluator.

Step 4 transition is governed by `workflow_progress_request`.

The Step 4 transition contract is:

- the step remains active until the model uses `workflow_progress_request`
- the checklist advances only if the user selects `Yes`
- if the user selects `No`, the checklist does not advance and the conversation continues normally on the next model turn

The Step 4 `Yes` branch must use the existing governed `workflow_progress_request` behavior:

- complete the next checklist step through the normal focus-chain path before the next request is built
- then carry the user’s `Yes` back into the next model turn through the normal response-tool continuation path

The Step 4 `No` branch must:

- not advance the checklist
- carry the user’s `No` back into the next model turn through the normal response-tool continuation path
- not replace that continuation with a hardcoded fallback runtime-authored assistant message

### Step 5: Build User Stories

Step 5 is not deterministically auto-completed by the evaluator.

Step 5 transition is also governed by `workflow_progress_request`.

The Step 5 transition contract matches Step 4:

- the step remains active until the model uses `workflow_progress_request`
- the checklist advances only if the user selects `Yes`
- if the user selects `No`, the checklist does not advance and the conversation continues normally on the next model turn

If a Step 5 `Yes` completes the workflow:

- normal workflow-completion bookkeeping may run before the next request is built
- normal response-tool continuation behavior must still occur
- that workflow completion must not by itself terminate the conversation thread

## Non-Requirements

This step-progression buildout does not require:

- workflow-form schema changes
- new workflow-form transport primitives
- Step 2 menu rendering requirements
- Step 3 artifact-template authoring requirements
- persona activation requirements
- deterministic completion rules beyond Steps 1 through 3

## Test Requirements

### 1. Support registration coverage

Add tests proving:

- `isDeterministicPlaceholderWorkflowSupported("pi-planning.md") === true`
- near-miss names still return `false`

### 2. Step 1 deterministic coverage

Add deterministic progression tests proving Step 1 auto-completes when:

- `epics_document` is present
- `architecture_document` is present

Add negative coverage proving Step 1 does not auto-complete when either required placeholder is missing.

### 3. Step 2 deterministic coverage

Add deterministic progression tests proving Step 2 auto-completes when:

- `target_epic` is present and non-empty

Add negative coverage proving Step 2 does not auto-complete when:

- `target_epic` is missing
- `target_epic` is blank after trimming

### 4. Step 3 deterministic coverage

Add deterministic progression tests requiring:

- one positive existing-file test
- one positive current-task-written-file test
- one missing-placeholder negative test
- one missing-file negative test
- one chaining test proving Step 3 is re-checked immediately after Step 2 in the same deterministic pass

### 5. Step 4 and Step 5 transition coverage

Add focused coverage proving that `pi-planning.md` Step 4 and Step 5 transition through `workflow_progress_request` rather than deterministic evaluator completion.

This coverage must prove:

- `Yes` advances the checklist before the next request is built
- `No` does not advance the checklist
- both responses continue through the normal response-tool continuation path

## Practical Outcome

If these requirements are met:

- `pi-planning.md` becomes a supported step-progression workflow
- the workflow can move through its system-owned setup steps without unnecessary model turns
- existing provided `epic_delivery_spec` artifacts can be reused cleanly
- Steps 4 and 5 use the governed `workflow_progress_request` transition model instead of ad hoc checklist advancement
