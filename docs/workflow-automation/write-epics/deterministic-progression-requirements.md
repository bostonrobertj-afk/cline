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
