# Create Epics Deterministic Progression Requirements

## Purpose

This document defines the deterministic progression requirements needed for [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md) to auto-complete Step 1 from stored placeholder state after the workflow-start form or any equivalent placeholder-setting path succeeds.

This document is intentionally separate from the workflow-form capability requirements. It does not define how the inputs are collected. It defines only how the deterministic progression capability should evaluate and advance `create-epics.md`.

## Source Of Truth

These requirements are grounded in the current deterministic progression runtime and supporting docs:

- [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md)
- [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md)
- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)
- [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts)
- [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md)

## Capability Boundary

This document does not define:

- workflow-start trigger behavior
- workflow-form payloads or UI
- `set_workflow_placeholders` request assembly
- workflow-form persistence or resume behavior

Those requirements belong in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/requirements.md)

## Current Runtime Gap

`create-epics.md` is not currently included in the deterministic placeholder workflow support allowlist in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L32).

Because of that:

- the runtime can store Step 1 placeholder values
- but deterministic progression will not evaluate `create-epics.md`
- so Step 1 will not auto-complete before the first AI turn under the current implementation

## Core Requirement

The deterministic progression capability must support `create-epics.md` such that Step 1 auto-completes when the workflow has enough stored placeholder state to prove the input-gathering step is satisfied.

## Support Registration Requirements

### 1. Add `create-epics.md` to the deterministic support allowlist

`create-epics.md` must be added to the exact-name deterministic support allowlist in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L32).

The support model must remain consistent with the current capability:

- exact workflow-name opt-in
- explicit evaluator dispatch
- no inference from free-form prose alone

### 2. Add explicit evaluator dispatch for `create-epics.md`

The evaluator dispatch in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L726) must route `create-epics.md` to its own workflow-specific step evaluator.

This buildout must not piggyback on another workflow's evaluator.

## Step 1 Completion Requirements

### 1. Step 1 completion must be placeholder-state-driven

For `create-epics.md`, Step 1 must deterministically complete when all required Step 1 placeholders are present and non-empty:

- `architecture_document`
- `prd`
- `mode`

Optional placeholders must not block completion:

- `ux_spec`
- `ui_spec`

### 2. `mode` must use the workflow's canonical value contract

The Step 1 evaluator must treat `mode` as valid only when it matches the workflow's downstream contract:

- `new`
- `continue`

The evaluator must not complete Step 1 for arbitrary non-empty `mode` strings.

### 3. The evaluator must not require file existence checks for Step 1

Step 1 in `create-epics.md` is an input-confirmation step, not an artifact-production step.

The deterministic evaluator must therefore prove completion from stored placeholder values, not from:

- current-task write proofs
- generated artifacts
- output-file existence

Those concerns belong to later workflow steps if needed.

### 4. Completion reason must be concrete

When Step 1 auto-completes, the evaluator must return a concrete human-readable reason consistent with the existing deterministic progression conventions.

The reason must clearly indicate that the required workflow-start inputs were already available for `create-epics.md`.

## Non-Requirements

This deterministic buildout does not require:

- parsing arbitrary new workflow metadata
- `Required:` / `Optional:` parser changes
- workflow-form UI changes
- workflow-specific persistence state
- deterministic support for later `create-epics.md` steps unless separately specified

## Test Requirements

### 1. Support registration coverage

Add tests proving:

- `isDeterministicPlaceholderWorkflowSupported("create-epics.md") === true`
- near-miss names still return `false`

### 2. Step 1 positive coverage

Add a deterministic progression test proving Step 1 auto-completes for `create-epics.md` when:

- `architecture_document` is set
- `prd` is set
- `mode` is `new`

Add a second positive test for:

- `mode` is `continue`

### 3. Step 1 negative coverage

Add deterministic progression tests proving Step 1 does not auto-complete when:

- `architecture_document` is missing
- `prd` is missing
- `mode` is missing
- `mode` is not `new` or `continue`

### 4. Chaining coverage

Add a focused regression proving that once the required Step 1 placeholder state is present, deterministic progression advances the checklist exactly one step at a time using the normal checklist-update path.

This coverage should stay within deterministic progression behavior. It does not need to restate workflow-form collection mechanics.

## Practical Outcome

If the requirements above are met:

- `create-epics.md` becomes a supported deterministic placeholder workflow
- Step 1 can auto-complete from stored input state
- a successful workflow-start form submission can hand off cleanly to deterministic progression without mixing capability ownership

## Additional Per-Step Progression Requirements

This section extends the document from Step 1-only deterministic support into the per-step progression contract needed for the live `create-epics.md` workflow.

These requirements are intentionally runtime-facing. They define how step completion and transition must work in the extension runtime. They do not redefine the workflow prose itself.

### Step 1: Confirm the input set

Step 1 remains deterministic and placeholder-state-driven.

The Step 1 transition contract is:

- deterministic progression must evaluate Step 1 from merged placeholder state for the active placeholder workflow session
- Step 1 must auto-complete only when `architecture_document`, `prd`, and `mode` are present and non-empty
- `mode` must be accepted only when it is exactly `new` or `continue`
- `ux_spec` and `ui_spec` must remain optional and must not block Step 1 completion
- Step 1 completion must not depend on file existence, artifact writes, write proofs, or `output_file`
- when Step 1 is proven complete, the checklist must advance through the normal focus-chain completion path rather than through ad hoc checklist mutation

### Step 2: Build the requirements inventory

Step 2 must become a deterministic transition step backed by the existing system-owned `build_epics_document` execution path.

The capability boundary for Step 2 is:

- `build_epics_document` remains the system-owned step-execution mechanism
- deterministic progression owns the Step 2 completion decision after runtime state has been updated by that tool
- deterministic progression must not execute the tool itself

The Step 2 transition contract is:

- after `build_epics_document` updates workflow state, the existing focus-chain refresh path must re-enter deterministic progression
- deterministic progression must evaluate whether Step 2 is complete using repo-verifiable runtime state rather than a model judgment
- when Step 2 is proven complete, the checklist must advance exactly one step through the standard focus-chain sentinel path to Step 3

The Step 2 completion rule for `mode === "new"` must require all of the following:

- the canonical epics artifact path resolves to `{output_folder}/planning_artifacts/epics.md`
- that artifact was written during the current task through the current-task placeholder-workflow write-proof mechanism
- the artifact still exists on disk
- the active workflow placeholder state resolves `output_file` to that same canonical artifact path

The Step 2 completion rule for `mode === "continue"` must require all of the following:

- the canonical epics artifact path resolves to `{output_folder}/planning_artifacts/epics.md`
- that canonical artifact already exists on disk
- the active workflow placeholder state resolves `output_file` to that same canonical artifact path

Step 2 deterministic completion must not require the model to send `task_progress`.

Step 2 deterministic completion must not rely only on `output_file` being set. The canonical artifact path requirement must still be enforced so the workflow cannot advance from a mismatched or user-supplied alternate path.

The Step 2 completion reason must be concrete and must distinguish between:

- the artifact being built and persisted for `new`
- the canonical artifact being adopted and persisted for `continue`

### Step 3: Define the Epics

Step 3 remains model-driven for substantive work, but its step-transition confirmation must use `workflow_progress_request`.

The Step 3 capability boundary is:

- drafting, revising, and finalizing the epics remains model-and-user driven
- deterministic progression does not decide that Step 3 is complete on its own
- the runtime-owned transition confirmation uses the existing `workflow_progress_request` response-tool architecture

The Step 3 tool-exposure requirements are:

- the contextual tool matrix entry for `create-epics.md` Step 3 must expose `WORKFLOW_PROGRESS_REQUEST`
- that Step 3 tool row must continue exposing the existing tools already needed for the drafting step
- the shared `workflow_progress_request` exposure logic must recognize `create-epics.md` Step 3 in addition to the currently-supported `create-prd.md` steps

The Step 3 response-tool behavior must match the established `workflow_progress_request` contract:

- the tool remains parameterless from the model's perspective
- the runtime owns the exact question text `Ready to move on to the next step in the workflow?`
- the runtime owns the exact options `Yes` and `No`
- the tool remains unavailable in YOLO mode because no interactive response can be collected

The Step 3 `Yes` branch must behave as follows:

- the runtime must complete the next checklist step through the normal focus-chain path before the next model request is built
- the runtime must then continue normal response-tool prompt generation and carry the user's `Yes` back into the next model turn
- if that checklist advancement completes the workflow, normal workflow-completion bookkeeping and placeholder-workflow teardown may occur before the next prompt is built
- that workflow completion must not suppress the normal response-tool continuation behavior or end the conversation thread by itself

The Step 3 `No` branch must behave as follows:

- the runtime must not advance the checklist
- the runtime must carry the user's `No` back into the next model turn through the normal response-tool continuation path
- the runtime must not replace the model continuation with a hardcoded fallback assistant message

The Step 3 final-report turn must therefore support this pattern:

- the model sends its brief final epic-structure report for the step
- the model uses `workflow_progress_request` on that same turn instead of manually advancing workflow state
- the runtime handles the user's `Yes` or `No` using the normal governed response-tool flow

### Additional Test Requirements For Steps 2 And 3

Add focused coverage proving:

- `create-epics.md` Step 2 auto-completes after `build_epics_document` has established the required runtime facts for `mode === "new"`
- `create-epics.md` Step 2 auto-completes after the canonical artifact exists and `output_file` is aligned for `mode === "continue"`
- `create-epics.md` Step 2 does not auto-complete when the canonical artifact is missing
- `create-epics.md` Step 2 does not auto-complete when `output_file` is missing or points at a different path
- `create-epics.md` Step 2 does not auto-complete for `new` when the current-task write proof for the canonical artifact is absent
- `workflow_progress_request` becomes visible for `create-epics.md` Step 3 in prompt/contextual filtering surfaces
- `workflow_progress_request` accepts active `create-epics.md` Step 3 runtime context in the handler
- on `Yes`, `workflow_progress_request` advances the checklist first and still queues continuation content back to the model
- on `No`, `workflow_progress_request` leaves the checklist unchanged and still queues continuation content back to the model
- when `Yes` completes `create-epics.md`, workflow-completion bookkeeping may run before the next request, but the normal response-tool continuation path still remains intact
