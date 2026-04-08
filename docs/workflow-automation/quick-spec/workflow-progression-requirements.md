# Quick Spec Workflow Progression Requirements

## Purpose

This document defines the requirements for deterministic workflow progression and shared workflow step-advancement support for [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md).

This slice covers:

- deterministic auto-completion for machine-checkable quick-spec steps
- shared `workflow_progress_request` support for user-approved quick-spec steps
- final-step advancement when the workflow closes successfully through `attempt_completion`

This document does not define:

- workflow-start card behavior
- workflow-start form behavior
- Step 2 scaffold-building implementation details beyond the completion proof this slice depends on
- contextual tool matrix configuration
- persona activation

Those belong to separate capability documents.

## Source Of Truth

These requirements are grounded in:

- [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md)
- [enablement-tracker](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/quick-spec/enablement-tracker)
- [step-2-automation-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/quick-spec/step-2-automation-requirements.md)
- [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md)
- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)
- [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
- [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts)
- [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts)
- [tech-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-quick-spec/tech-spec-template.md)

## Capability Boundary

This slice must add deterministic workflow support for `quick-spec.md` and must align the shared `workflow_progress_request` step map so runtime-owned advancement works correctly for the workflow's user-confirmed planning steps.

This slice must not:

- make unsupported quick-spec steps deterministic
- infer progression rules from free-form workflow prose at runtime
- build or rewrite the Step 2 scaffold artifact
- replace `workflow_progress_request` with deterministic document-state completion for Steps 3 through 9
- treat the workflow as complete without a successful final `attempt_completion`

## Core Requirement

The runtime must support `quick-spec.md` as an opt-in deterministic placeholder workflow with this exact advancement contract:

- Step 1 completes when `title` is already available in placeholder workflow state and is non-empty after trimming
- Step 2 completes when the canonical quick-spec scaffold already exists at the canonical `output_file` path and structurally matches the approved Step 2 scaffold contract
- Steps 3 through 9 do not auto-complete from document state and must advance only through `workflow_progress_request`
- Step 10 completes only when the current turn successfully executes `attempt_completion`

## Deterministic Workflow Registration Requirements

### 1. Supported-workflow allowlist

`quick-spec.md` must be added to the deterministic placeholder workflow support allowlist.

The exact workflow name must be:

- `quick-spec.md`

Support must be keyed by exact workflow name, not by loose filename matching or generic workflow metadata.

### 2. Deterministic workflow name union

`quick-spec.md` must be added to the deterministic workflow-name type union used by task state and auto-completion notices.

## Step Evaluation Requirements

### Step 1: Gather Project Info

Step 1 must complete when:

- `title` exists in merged placeholder workflow state
- `title.trim()` is non-empty

Step 1 must not require any file existence check.

The completion reason must clearly state that `title` was already available in workflow placeholder state.

### Step 2: Resolve or start the spec draft

Step 2 must complete only when the runtime can prove the quick-spec scaffold already exists and is structurally valid.

#### 1. Required placeholders

The evaluator must require:

- `output_file`
- `implementation_artifacts`
- `title`
- `date`

The evaluator must fail closed if any required placeholder is missing.

#### 2. Canonical artifact path

The evaluator must require `output_file` to resolve to the canonical artifact path:

- `{implementation_artifacts}/tech-spec-wip.md`

Step 2 must not complete when:

- `output_file` points somewhere else
- the file exists outside the canonical artifact path
- the file is missing

#### 3. Structural scaffold proof

The evaluator must require the artifact to satisfy all of the following:

- the file exists
- frontmatter contains:
  - `title: '<resolved title>'`
  - `slug: '<slug derived deterministically from title>'`
  - `created: '<resolved date>'`
  - `status: 'backlog'`
- the top heading is initialized as:
  - `# Tech-Spec: <resolved title>`
- the raw placeholder tokens are no longer present for:
  - `{title}`
  - `{slug}`
  - `{date}`
- the full required heading set from the canonical template is present:
  - `## Overview`
  - `### Problem Statement`
  - `### Solution`
  - `### Scope`
  - `#### In Scope`
  - `#### Out of Scope`
  - `## Context for Development`
  - `### Codebase Patterns`
  - `### Files to Reference`
  - `### Technical Decisions`
  - `## Implementation Plan`
  - `### Acceptance Criteria`
  - `### Implementation Seams`
  - `### Tasks`
  - `## Latest Review Findings`

#### 4. Structural proof scope

The Step 2 evaluator must use structural scaffold proof only.

This slice must not require full line-for-line template equivalence beyond the initialization fields and required headings listed above.

#### 5. Completion reason

The completion reason must clearly state that the canonical quick-spec scaffold already exists, preserves the required heading set, and is initialized correctly.

### Steps 3 Through 9

Steps 3 through 9 must not be evaluator-completed in deterministic progression.

Those steps are:

- Step 3: Identify the Objective
- Step 4: Identify a Workable Solution
- Step 5: Define the Scope
- Step 6: Build Project Context
- Step 7: Define Acceptance Criteria
- Step 8: Define Implementation Seams
- Step 9: Build Tasks / Subtasks

Even if `{output_file}` already contains content for one or more of those sections, deterministic progression must leave those steps incomplete until runtime-owned `workflow_progress_request` advances them.

### Step 10: Final Review & Closeuout

Step 10 must complete only when deterministic progression receives current-turn tool context showing that:

- `toolName === "attempt_completion"`
- `toolWasExecuted === true`

Step 10 must not complete from document state alone.

The completion reason must clearly state that `attempt_completion` was executed successfully for the final quick-spec closeout.

## Shared Workflow Progress Request Requirements

Quick-spec must be added to the shared `workflow_progress_request` workflow-step allowlist with this exact step set:

- `quick-spec.md`: `[3, 4, 5, 6, 7, 8, 9]`

That shared support must drive:

- tool exposure
- prompt teaching
- continuation-turn guidance
- runtime-owned `Yes` branch advancement for those steps

This slice must not add Step 10 to `workflow_progress_request`.

## Non-Requirements

This slice must not:

- make Step 2 depend on current-task write proof
- derive Step 3 through 9 completion from populated document sections
- treat user-authored document edits alone as a substitute for `workflow_progress_request`
- auto-complete Step 10 when `attempt_completion` was proposed but not executed
- add managed-workflow deterministic support

## Testing Requirements

Focused deterministic progression coverage must be added or updated for:

- supported-workflow registration for `quick-spec.md`
- Step 1 success when `title` is present
- Step 1 failure when `title` is missing or blank
- Step 2 success when the canonical scaffold exists with the required frontmatter initialization and required heading set
- Step 2 failure when `output_file` is missing
- Step 2 failure when the scaffold exists outside the canonical `implementation_artifacts/tech-spec-wip.md` path
- Step 2 failure when `status` is not `backlog`
- Step 2 failure when one or more required template headings are missing
- Step 2 failure when raw `{title}`, `{slug}`, or `{date}` placeholders remain
- proof that Steps 3 through 9 do not deterministically auto-complete from populated document state
- Step 10 success from successful `attempt_completion` tool context
- Step 10 failure when `attempt_completion` was not executed

Shared prompt/runtime coverage must also be added or updated for:

- `workflow_progress_request` support for quick-spec Steps 3 through 9
- omission of `workflow_progress_request` for quick-spec Steps 1, 2, and 10

## Documentation Requirements

After implementation, the deterministic progression documentation must be updated to include:

- `quick-spec.md` in the supported deterministic workflow list
- the quick-spec step contract:
  - Step 1 placeholder-state completion
  - Step 2 structural scaffold proof
  - Steps 3 through 9 governed by `workflow_progress_request`
  - Step 10 completion from successful `attempt_completion`
