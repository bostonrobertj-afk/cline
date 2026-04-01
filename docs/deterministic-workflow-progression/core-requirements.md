# Deterministic Placeholder Workflow Progression

## Purpose

This document defines the design for automatic step completion in placeholder workflows when a step's done signal can be evaluated deterministically by the runtime.

Initial scope:
- `code-review`
- `dev-story`

Out of scope for the first implementation:
- managed workflows
- broad placeholder-workflow support across every workflow
- runtime parsing of freeform `Done Signal:` prose as the source of truth

The first rollout should prove the design on two high-usage workflows before the system is expanded to other placeholder workflows.

## Goals

- Remove unnecessary agent bookkeeping when a placeholder workflow step can be completed by the runtime with high confidence.
- Preserve workflow intent. Internal step mechanics may change, but the behavior the step is supposed to accomplish must not change.
- Keep the system explainable. If the runtime auto-completes a step, the next prompt must explicitly tell the model that this happened and why.
- Keep the design easy to debug.
- Keep the design easy to extend to additional workflows later without scattering `if` statements across unrelated files.

## Non-Goals

- Replacing placeholder workflows with managed workflows.
- Making every placeholder workflow fully deterministic in the first pass.
- Removing the existing `task_progress` path entirely. It remains the fallback for steps that are not yet runtime-resolvable.

## Existing Runtime Behavior

Current placeholder workflow behavior is driven by the focus chain:

- The placeholder workflow source is parsed into checklist rows.
- The first incomplete checklist item is treated as the active step.
- The active step's details are injected into the prompt each turn.
- The agent is currently expected to advance the checklist by sending `task_progress` with `__COMPLETE_NEXT_STEP__` when the active step's done signal is true.

Current runtime seam:
- `src/core/task/focus-chain/index.ts`
  - `buildPlaceholderWorkflowStepPrompt(...)`
  - `updateFCListFromToolResponse(...)`
- `src/core/workflows/placeholder-workflow-step-details.ts`
  - `getActivePlaceholderWorkflowStepDetails(...)`

This is the correct seam for deterministic progression because:
- it already owns placeholder checklist state
- it already knows the active step
- every tool response already flows through the focus-chain update path

## Core Requirements

- Identify a deterministic completion trigger for each supported placeholder-workflow step.
- If a step can be resolved 100% deterministically, the runtime should complete it automatically.
- If a step is auto-completed, the following turn's prompt must explicitly say that the runtime auto-completed the step and why.
- Requiring the agent to set a placeholder only to signal completion is a valid last-resort fallback, but should be avoided when a stronger signal exists.

## Freshness Rules

### File Created

If a step's completion trigger is "file created", use this approach:
- require the artifact file to exist at the expected path
- require `mtimeMs >= taskState.taskStartTimeMs` as a freshness guard

Meaning:
- if the file exists and `mtimeMs >= taskState.taskStartTimeMs`, it was created during the current task run
- if the file does not exist, or `mtimeMs < taskState.taskStartTimeMs`, the step is not complete

### File Edited

If a step's completion trigger is "file edited", use this approach:
- require the artifact file to satisfy a step-specific, machine-checkable content condition
- use `mtimeMs >= taskState.taskStartTimeMs` only as a freshness guard

Meaning:
- the step is complete only if the file contains the step's required content markers or structure
- and `mtimeMs >= taskState.taskStartTimeMs`, which means the file was updated during the current task run
- if `mtimeMs < taskState.taskStartTimeMs`, the file is stale from a prior run and cannot satisfy the step

## Assumption

The first-pass design assumes:
- one placeholder workflow run per conversation thread
- no repeated runs of that workflow in the same thread
- no additional placeholder workflow runs in that same thread

Under that assumption, `taskState.taskStartTimeMs` is a valid freshness baseline for first-pass deterministic checks.

## Why Auto-Completed Steps Must Be Surfaced

Silent auto-completion is not acceptable.

If the runtime auto-completes a placeholder step without telling the model:
- the model may think it missed instructions
- the model may enter a recovery/debugging loop
- the model may try to redo work for a step that the runtime already completed

Therefore, the runtime must introduce an explicit concept of:
- auto-completed placeholder workflow steps
- with a user-visible prompt note explaining:
  - which step was auto-completed
  - that no agent action was required
  - why the runtime was able to complete it deterministically

## Proposed Runtime Architecture

### 1. Central Deterministic Resolver Layer

Add one central resolver layer for placeholder workflows.

Responsibilities:
- inspect the current active placeholder workflow
- inspect the current active step
- evaluate whether that step is deterministically complete
- optionally apply runtime-side side effects required by that step
- advance the checklist when the step is satisfied
- record an auto-completion notice for the next prompt

This logic should live near the focus-chain placeholder workflow path, not inside tool prompt text and not inside unrelated tool handlers.

Recommended location:
- `src/core/task/focus-chain/`

Recommended shape:
- one central resolver entry point
- one registry-like workflow/step mapping
- helper functions for file freshness and file-content checks

### 2. Explicit Runtime Notice State

Add explicit runtime state for pending auto-completed placeholder steps.

Minimum concept:
- pending auto-completed step notices

Each notice should contain:
- workflow name
- step number
- checklist label
- short deterministic reason

This state is then rendered into the next placeholder-workflow prompt section and cleared after being shown.

### 3. Optional Runtime Workflow State

Some deterministic steps require runtime-owned derived state that is not just a checklist transition.

Example:
- `code-review` Step 4 derives `{review_mode}` from freshly generated artifacts

The deterministic resolver layer should be allowed to:
- write derived placeholder values into active placeholder workflow values

This is acceptable because Step 4 is pure bookkeeping and does not require agent judgment.

### 4. Deterministic Evaluation Trigger

The resolver should run after tool execution when placeholder workflows are active.

Why:
- file creation/edit signals become true after a tool succeeds
- placeholder-setting signals become true after `set_workflow_placeholders`
- subagent-report signals become true after `use_subagents`

The runtime should re-evaluate deterministically after each relevant tool result and auto-advance as far as safely possible.

That loop should continue until:
- the next active step is not deterministically complete
- or the workflow ends

## Prompting Behavior

The placeholder prompt should no longer imply that the active step is determined only by agent-authored `task_progress`.

Current wording is too narrow if the runtime can auto-complete steps.

The placeholder step prompt should instead communicate:
- the runtime may auto-complete some steps when the done signal is deterministically satisfied
- the model will be told when that happens
- `task_progress` remains the mechanism for steps that still require explicit model signaling

Required prompt behavior:
- if one or more placeholder steps were auto-completed since the last turn, include a dedicated prompt section before the current step details
- the current step prompt must remain the active first incomplete step after auto-completion

## Registry Design

The system should not parse `Done Signal:` prose at runtime as the authority.

Instead:
- the workflow files define the human contract
- the runtime keeps a parallel deterministic resolver registry keyed by workflow name + step number

This avoids:
- brittle prose parsing
- hidden prompt-side logic
- step-resolution logic being spread across many tools

Recommended shape:

```ts
type DeterministicPlaceholderStepResolver = {
  workflowName: string
  stepNumber: number
  evaluate: (context) => Promise<{
    complete: boolean
    reason?: string
    sideEffects?: () => Promise<void>
  }>
}
```

For future scale, the runtime should use:
- one workflow-to-step resolver map
- helper utilities reused across workflows

## Workflow-Specific Design

## `code-review`

### Step 1: Determine Review Source

Deterministic signal:
- `{review_target}` is set
- `{spec_file}` is set

Reason this is acceptable:
- these are real workflow variables used by later steps
- they are not synthetic completion-only placeholders

### Step 2: Construct & Persist Review Input File

Deterministic signal:
- `review-input.md` exists at the expected artifact path
- it is fresh for the current task run

Expected path:
- prefer `{review_input}` if set
- otherwise derive `{output_folder}/review-input.md`

### Step 3: Construct & Persist Diff Output File

Deterministic signal:
- `review-input.diff` exists at the expected artifact path
- it is fresh for the current task run

Expected path:
- prefer `{diff_output}` if set
- otherwise derive `{output_folder}/review-input.diff`

### Step 4: Set Review Mode

This step should be runtime-owned bookkeeping.

Deterministic signal:
- Step 2 and Step 3 artifact freshness are evaluated by the runtime
- runtime derives `{review_mode}`

Derivation:
- fresh `review-input.md` + fresh `review-input.diff` => `full`
- fresh `review-input.md` only => `file-scope`
- fresh `review-input.diff` only => `diff`

Required runtime side effect:
- write derived `{review_mode}` into active placeholder workflow values

Required prompt behavior:
- next turn must explicitly state that Step 4 was auto-completed by the runtime because review mode was derived deterministically from the generated artifacts

### Step 5: Use Subagents for Specialized Reviews, then Collect Findings

Deterministic signal:
- for each required review layer, either:
  - a final subagent report has been received during the current task run
  - or a fresh fallback reviewer prompt file exists during the current task run

Required review layers in first pass:
- adversarial general
- edge case hunter

Important design note:
- this step requires explicit runtime tracking of subagent-layer completion or stable file naming for fallback artifacts
- the design must not rely on a synthetic placeholder like `{subagent_review_status}`

### Step 6: Triage

Deterministic signal:
- `{review_input}` is fresh for the current task run
- `{review_input}` contains a top-level `Status:` field set to:
  - `ready-for-dev`
  - or `complete`

This step uses the triaged review artifact rather than the source story/spec document.

### Step 7: Present QA Findings to the Human User

Deterministic signal:
- `attempt_completion` is called

No additional runtime work is required here.

## `dev-story`

### Step 1: Configure Context & Variables

Deterministic signal:
- `{story_path}` is set
- the file at `{story_path}` exists

### Step 2: Execute Incomplete Tasks & Subtasks

Deterministic signal:
- `{story_path}` contains a `## Tasks / Subtasks` section
- within that section, before the next `## ` heading, there are no unchecked checklist items `- [ ]`

Important parsing rules:
- only inspect the slice from `## Tasks / Subtasks` to the next `## ` heading
- count both top-level checklist items and indented subtasks
- the section must exist

### Step 3: Validation

Deterministic signal:
- `{story_path}` is fresh for the current task run
- `{story_path}` contains a top-level `Status:` field set to `review`

### Step 4: Closeout

Deterministic signal:
- `attempt_completion` is called

No additional runtime work is required here.

## Runtime Data Needed

The deterministic resolver layer needs access to:
- `taskState.taskStartTimeMs`
- active placeholder workflow id/source
- active stable and dynamic placeholder values
- current placeholder checklist
- the active step details
- current tool execution context

For first-pass support, the resolver may also need lightweight runtime-owned state for:
- pending auto-completed step notices
- workflow-specific deterministic step state
  - example: code-review review-layer completion tracking

## Tool Context Needed

Some resolvers can be evaluated from filesystem and placeholders alone.

Others, especially `code-review` Step 5, need visibility into what tool just completed.

The deterministic progression layer should be able to inspect:
- the executed tool name
- the executed tool params when relevant
- the tool result when relevant

Why:
- `use_subagents` completion is part of the done signal for `code-review` Step 5
- file-based steps do not need tool result content, but subagent-completion steps do

## Recommended First-Pass Integration Points

### `src/core/task/focus-chain/index.ts`

Primary integration point.

Expected responsibilities:
- invoke deterministic placeholder step evaluation after tool responses
- advance checklist state when a supported step is satisfied
- record pending auto-completion notices
- render those notices into the next placeholder workflow prompt

### `src/core/task/focus-chain/updateFromToolResponse.ts`

Potential adapter seam.

Why:
- all tool-driven focus-chain updates already flow through this adapter
- this is the natural place to start passing executed tool context into the focus-chain placeholder resolver

### `src/core/task/TaskState.ts`

Add explicit runtime state for:
- pending auto-completed placeholder step notices
- any first-pass workflow-specific deterministic runtime signals that are needed between tool turns

## First-Pass Debuggability Requirements

Deterministic progression must be easy to debug.

Minimum expectation:
- when a deterministic check succeeds, the runtime can tell us:
  - workflow name
  - step number
  - reason
- when a deterministic check fails, the runtime can tell us:
  - workflow name
  - step number
  - which condition failed

This does not need to be exposed to the model by default, but it should be easy to log and test.

## Testing Strategy

The first implementation should add focused tests around the focus-chain placeholder path.

Minimum test coverage:

### Prompting
- auto-completed placeholder step notices appear in the next prompt
- the current step shown to the model is the correct post-auto-completion step

### `code-review`
- Step 1 auto-completes when `{review_target}` and `{spec_file}` are set
- Step 2 auto-completes when fresh `review-input.md` exists
- Step 3 auto-completes when fresh `review-input.diff` exists
- Step 4 auto-completes and derives `{review_mode}` correctly
- Step 5 auto-completes when required review layers have runtime-confirmed final reports or fresh fallback files
- Step 6 auto-completes when `{spec_file}` is fresh and has top-level `Status: ready-for-dev|complete`

### `dev-story`
- Step 1 auto-completes when `{story_path}` exists
- Step 2 auto-completes when the `## Tasks / Subtasks` section has no unchecked checklist items
- Step 3 auto-completes when `{story_path}` is fresh and has top-level `Status: review`

### Safety
- unsupported workflows do not auto-advance
- supported workflows do not auto-advance when freshness/content conditions are not met
- runtime does not silently skip steps without surfacing an auto-completion notice

## Rollout Strategy

Phase 1:
- implement only `code-review`
- implement only `dev-story`
- keep all other placeholder workflows on manual `task_progress`

Phase 2:
- observe real runs
- refine any weak signals or ambiguous runtime checks
- update workflow docs when a step's deterministic contract needs tightening

Phase 3:
- add additional workflows by extending the central deterministic resolver registry

## Extension Rule For Later Workflows

A new placeholder workflow step should only be added to deterministic auto-progression if:
- its done signal is strong enough to evaluate without model judgment
- its runtime checks are easy to explain
- its failure modes are easy to debug

If a step cannot meet that standard yet:
- keep it on explicit `task_progress`
- or use placeholder-setting as a last resort until a better deterministic signal exists

## Summary

The correct first-pass design is:
- central deterministic resolver logic at the focus-chain placeholder seam
- explicit runtime notice state for auto-completed steps
- workflow-step resolvers keyed by workflow name + step number
- file freshness and file-content utilities reused across workflows
- first-pass support only for `code-review` and `dev-story`

The most important constraint is not automation by itself. It is explainable automation. If the runtime auto-completes a placeholder step, the model must be told exactly what happened so the workflow remains coherent from turn to turn.
