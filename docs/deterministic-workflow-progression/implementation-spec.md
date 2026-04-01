# Deterministic Workflow Progression Implementation Spec

## Purpose

This document defines the concrete implementation design for deterministic placeholder-workflow progression for the first supported workflows:

- `code-review`
- `dev-story`

This spec is the bridge between:
- [core-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/deterministic-workflow-progression/core-requirements.md)
- the action plan document that will be written afterward

It is intentionally more implementation-specific than the requirements doc. The goal is to make later execution low-ambiguity, easy to review, and easy to extend.

## Scope

In scope:
- deterministic auto-completion for supported placeholder workflow steps
- explicit runtime notices when the system auto-completes a step
- prompt updates so supported workflows no longer depend solely on agent-authored `task_progress`
- centralized resolver architecture that is easy to extend
- focused first-pass support for `code-review` and `dev-story`

Out of scope:
- managed workflows
- broad placeholder-workflow support for every workflow in the first pass
- generic prose parsing of arbitrary `Done Signal:` text
- replacing `task_progress` for unsupported placeholder workflows

## Design Principles

- Centralize resolution logic. Do not scatter workflow-specific completion checks across unrelated handlers.
- Keep workflow prose human-facing and resolver logic machine-facing.
- Prefer runtime-observable artifacts over agent self-reporting.
- Auto-completion must be explainable to the model on the next turn.
- Unsupported workflows must retain existing behavior until they are explicitly onboarded.

## Current Runtime Seams

These are the primary seams the implementation should build on.

### Placeholder Workflow Step Resolution

- [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts)
  - `getActivePlaceholderWorkflowStepDetails(...)`
  - `resolveActivePlaceholderWorkflowPromptContext(...)`
  - `buildPlaceholderWorkflowChecklist(...)`

### Focus Chain / Placeholder Workflow Prompting

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)
  - `buildPlaceholderWorkflowStepPrompt(...)`
  - `refreshPlaceholderWorkflowChecklistProjection(...)`
  - `updateFCListFromToolResponse(...)`

### Tool-Response Integration

- [updateFromToolResponse.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/updateFromToolResponse.ts)
- [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts)

### Task State

- [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)

### Placeholder Value Storage

- [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts)
- [placeholder-workflow-rendering.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-rendering.ts)

## High-Level Runtime Flow

The first-pass runtime flow for supported placeholder workflows should be:

1. A placeholder workflow is active and has a focus-chain checklist.
2. A tool call completes.
3. The existing focus-chain update path runs.
4. If the active placeholder workflow is deterministically supported, the runtime evaluates the first incomplete step.
5. If the step is deterministically complete:
   - apply any runtime side effects needed for that step
   - advance the checklist by one step
   - record an auto-completion notice
6. Repeat Step 4 while the next active step is also deterministically complete.
7. On the next prompt build:
   - show any pending auto-completion notices
   - then show the actual current first incomplete step details

This loop allows cases like `code-review` Step 4 to be auto-completed immediately after Step 3 without waiting for the model to do bookkeeping.

## Supported Workflow Detection

The system should treat deterministic progression as opt-in by workflow name.

First-pass supported workflows:
- `code-review`
- `dev-story`

Matching should be based on the resolved active placeholder workflow name already available in prompt context and workflow source metadata.

Normalization rule:
- compare against the workflow source name without introducing fuzzy matching
- if the workflow name does not match a supported entry exactly, keep existing placeholder behavior

Rationale:
- avoid accidental auto-progression on unrelated workflows
- keep extension explicit and testable

## Core Architecture

## 1. Central Resolver Module

Create a central deterministic placeholder workflow resolver module under:

- `src/core/task/focus-chain/`

Responsibilities:
- determine whether deterministic progression is enabled for the current active placeholder workflow
- evaluate the current active step
- apply any runtime side effects
- return checklist-advance decisions
- return prompt notice payloads

Recommended structure:

```ts
type DeterministicPlaceholderStepEvaluation = {
  complete: boolean
  reason?: string
  sideEffects?: DeterministicPlaceholderStepSideEffect[]
}

type DeterministicPlaceholderStepSideEffect =
  | { type: "set_placeholder"; key: string; value: string }

type DeterministicPlaceholderResolverContext = {
  taskState: TaskState
  stepDetails: ActivePlaceholderWorkflowStepDetails
  checklistMarkdown: string
  toolContext?: DeterministicToolContext
}
```

This logic should not live:
- in workflow docs
- in prompt strings
- in individual tool handlers unless a tool emits data needed by the resolver

## 2. Workflow/Step Registry

The resolver module should use a registry keyed by:
- workflow name
- step number

Recommended shape:

```ts
type DeterministicPlaceholderStepResolver = {
  workflowName: string
  stepNumber: number
  evaluate: (context: DeterministicPlaceholderResolverContext) => Promise<DeterministicPlaceholderStepEvaluation>
}
```

Implementation recommendation:
- keep the registry data in a dedicated file
- keep reusable helper functions in separate utility files
- keep the focus-chain integration layer thin

## 3. Runtime Notice Model

Add a dedicated runtime concept for auto-completed placeholder steps.

Recommended state shape:

```ts
type PendingAutoCompletedPlaceholderStepNotice = {
  workflowName: string
  stepNumber: number
  checklistLabel: string
  reason: string
}
```

This state belongs in [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts).

Requirements:
- support multiple notices in one turn, because the runtime may auto-complete more than one step in sequence
- notices must survive until they are shown in the next prompt
- after being rendered into prompt context, they should be cleared

## 4. Tool Context Model

Some deterministic checks need filesystem state only.

Some deterministic checks need to know which tool just completed and whether it succeeded.

Recommended tool-context shape:

```ts
type DeterministicToolContext = {
  toolName: string
  toolParams?: Record<string, unknown>
  toolResult?: unknown
  toolWasExecuted: boolean
}
```

This context should be passed from the existing tool-execution path into the focus-chain deterministic resolver path.

Why this is needed:
- `code-review` Step 5 depends on subagent completion
- pure file-based steps do not need this, but the interface should support it from the start

## Prompting Changes Required

This is a required part of the implementation, not a later cleanup.

Supported deterministic workflows cannot continue receiving unconditional instructions that say:
- the runtime determines the active step only from `task_progress`
- the agent must always use `task_progress` to complete the next step

That guidance becomes false once auto-completion exists.

### Files That Must Be Updated

#### Placeholder workflow step prompt

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)

Current problematic strings include:
- `Keep task_progress moving so the active step and its details stay in sync.`
- `I determine the active step from your latest task_progress update.`
- `When the active step's "Done Signal" is true, use task_progress...`

Required change:
- for deterministically supported placeholder workflows, the prompt must say that:
  - some steps may be auto-completed by the runtime when their done signals are deterministically satisfied
  - the model will be told when that happens
  - `task_progress` remains required only for steps that are not auto-completed by the runtime

#### System prompt placeholder workflow task-progress guidance

- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)

Current problematic strings include:
- `DO inform the user ... and include task_progress ... to complete the step`
- `PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER`

Required change:
- introduce conditional wording for deterministically supported placeholder workflows
- supported workflows should be told:
  - the runtime may auto-complete supported steps
  - when the current supported step is not runtime-resolved, use the existing `task_progress` path
- unsupported workflows keep the current behavior

#### Native GPT-5 placeholder task-progress override

- [template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/template.ts)

Current problematic string:
- `When you complete the next step, use the next relevant send_user_message... include task_progress: "__COMPLETE_NEXT_STEP__"`

Required change:
- make this conditional so it does not instruct supported deterministic workflows to do redundant step completion when the runtime will handle it

#### Placeholder continuation guidance returned by tools

- [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts)

Current problematic guidance:
- `Continue the current placeholder workflow step... When the active step's "Done Signal" is true, use task_progress...`

Required change:
- when a supported deterministic workflow is active, the guidance should acknowledge runtime auto-completion
- do not instruct the agent to use `task_progress` unconditionally for the next step transition

## Auto-Completion Notice Prompt Contract

When the runtime auto-completes one or more steps, the next prompt must include a dedicated notice section before the current active step details.

Required content for each notice:
- step label
- that the runtime auto-completed it
- short deterministic reason
- explicit statement that no model action was required for that step

Recommended tone:
- factual, short, system-owned

Example shape:

```md
# AUTO-COMPLETED WORKFLOW STEP

The runtime auto-completed:
- Step 4: Set Review Mode

Reason:
- `review_mode` was derived deterministically from fresh review artifacts generated earlier in this task run.

No action was required from you for this step.
```

If multiple steps were auto-completed:
- render them in order
- then show the current active step details

## Workflow Resolver Contracts

## `code-review`

### Step 1

Completion condition:
- `{review_target}` exists in active placeholder values
- `{spec_file}` exists in active placeholder values

No runtime side effect required.

Reason string:
- `review_target` and `spec_file` are both present.

### Step 2

Completion condition:
- fresh file exists at the resolved review input artifact path

Path resolution order:
1. `{review_input}` placeholder if present
2. otherwise derive from `{output_folder}/review-input.md`

No runtime side effect required.

Reason string:
- fresh `review-input.md` exists for the current task run.

### Step 3

Completion condition:
- fresh file exists at the resolved diff artifact path

Path resolution order:
1. `{diff_output}` placeholder if present
2. otherwise derive from `{output_folder}/review-input.diff`

No runtime side effect required.

Reason string:
- fresh `review-input.diff` exists for the current task run.

### Step 4

Completion condition:
- the resolver can determine review mode from Step 2/3 artifact freshness

Derived values:
- both fresh => `full`
- review input only => `file-scope`
- diff only => `diff`

Runtime side effect:
- write `{review_mode}` into active placeholder workflow values

Reason string:
- `review_mode` was derived deterministically from fresh review artifacts.

Important implementation rule:
- this step is runtime-owned bookkeeping
- the agent should not be asked to use `set_workflow_placeholders` for Step 4 once deterministic progression is enabled for this workflow

### Step 5

Completion condition:
- for each required review layer:
  - a final subagent report has been received in the current task run
  - or a fresh fallback reviewer prompt file exists in `{output_folder}` for the current task run

Required layers:
- adversarial general
- edge case hunter

First-pass implementation recommendation:
- support both:
  - runtime-tracked final subagent report receipt
  - stable fallback artifact filenames

Fallback file expectations should be explicit in code and later action plan, not inferred from prose.

Reason string:
- every required review layer has a final report or a fresh fallback prompt artifact.

### Step 6

Completion condition:
- `{review_input}` exists
- `{review_input}` is fresh for the current task run
- `{review_input}` contains a top-level `Status:` field set to:
  - `ready-for-dev`
  - or `complete`

No runtime side effect required.

Reason string:
- `{review_input}` was updated and now contains a terminal review status.

### Step 7

Not runtime auto-completed.

Terminal signal:
- `attempt_completion`

The workflow ends through normal response-tool behavior.

## `dev-story`

### Step 1

Completion condition:
- `{story_path}` exists in active placeholder values
- the file at `{story_path}` exists

Reason string:
- `story_path` points to an existing story file.

### Step 2

Completion condition:
- `{story_path}` contains a `## Tasks / Subtasks` section
- within the slice from that heading to the next `## ` heading:
  - there is at least one checklist item
  - there are zero unchecked checklist items `- [ ]`

Parsing rules:
- include indented subtasks
- only inspect that section slice
- ignore checklist items outside the section

Reason string:
- the `## Tasks / Subtasks` section contains no unchecked items.

### Step 3

Completion condition:
- `{story_path}` exists
- `{story_path}` is fresh for the current task run
- `{story_path}` contains a top-level `Status:` field set to `review`

Reason string:
- the story file was updated and now contains `Status: review`.

### Step 4

Not runtime auto-completed.

Terminal signal:
- `attempt_completion`

## Helper Utilities Required

The resolver layer will need reusable helpers.

Recommended helpers:

- `getMergedPlaceholderValues(taskState)`
- `resolveWorkflowArtifactPath(placeholders, key, fallbackRelativeName)`
- `fileExistsAndIsFresh(path, taskStartTimeMs)`
- `readFileIfExists(path)`
- `hasTopLevelStatusValue(fileText, allowedValues)`
- `extractMarkdownSection(fileText, heading)`
- `sectionHasNoUncheckedChecklistItems(sectionText)`
- `advanceChecklistByOneStep(checklistMarkdown)`

These helpers should live near the deterministic resolver code, not inside workflow-specific files.

## Checklist Advancement Rules

The deterministic resolver should use the same checklist shape the focus-chain already owns.

For auto-completion:
- only the first incomplete checklist item may be completed at a time
- after auto-completing one step, the runtime should recompute the active step
- if the next step is also deterministically complete, repeat

This keeps the behavior aligned with the existing `__COMPLETE_NEXT_STEP__` semantics while moving the decision to the runtime.

## State Changes Required

## `TaskState`

Add fields for:
- pending auto-completed placeholder step notices
- optional workflow-specific deterministic runtime state if needed for Step 5 subagent tracking

These fields should be task-scoped because deterministic progression is task-thread scoped.

## Task Metadata Persistence

Persist any new placeholder auto-progression state that must survive restart.

At minimum, if pending auto-completion notices or workflow-specific deterministic state need restart continuity, they must be added to:
- [ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts)
- [disk.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/storage/disk.ts)

Persistence rule:
- persist only what is necessary for coherent continuation after restart
- do not persist ephemeral data that can be safely recomputed from task state and filesystem

## Tool Integration Requirements

The deterministic resolver should evaluate after tool execution, not before.

Required integration behavior:
- the existing tool execution result path must pass enough context into the focus-chain update path for deterministic checks
- the resolver should run even when `task_progress` is absent
- the resolver must not break existing managed-workflow behavior

This means the final implementation will likely need:
- a small expansion of the focus-chain update interface
- or a companion deterministic evaluation call adjacent to it

The implementation spec does not prescribe the exact function signature, but the action plan must.

## Behavior For Unsupported Placeholder Workflows

Unsupported workflows must keep the current placeholder behavior:
- active step details shown each turn
- explicit `task_progress` advancement required
- no deterministic auto-completion

This conditionality must exist in both:
- runtime progression
- prompt guidance

## Diagnostics Requirements

Deterministic progression must be easy to debug.

The runtime should be able to log:
- workflow name
- step number
- whether evaluation ran
- whether the step completed
- failure reason when not complete
- side effects applied
- checklist transitions performed

This is especially important for:
- file freshness bugs
- wrong-path bugs
- prompt confusion around auto-completed steps

## Tests Required

The later action plan should include focused tests for:

### Resolver utilities
- freshness checks
- section extraction
- status parsing
- checklist section parsing

### Placeholder workflow progression
- supported workflows auto-complete supported steps
- unsupported workflows do not auto-complete
- multi-step auto-completion chains work
- auto-completion notices are surfaced in the next prompt
- notices are cleared after being shown

### Prompting
- supported workflows get updated placeholder guidance
- unsupported workflows retain existing `task_progress` instructions

### Workflow-specific cases
- all supported steps listed above for `code-review`
- all supported steps listed above for `dev-story`

## Rollout Constraints

First pass:
- implement only for `code-review`
- implement only for `dev-story`
- keep the registry and helper structure generic so new workflows can be added without redesign

Do not:
- generalize by parsing arbitrary `Done Signal:` prose
- add support for additional workflows in the same implementation unless explicitly planned afterward

## Open Items That The Action Plan Must Pin Down

The action plan written after this spec must make exact calls on:
- the file names for the new deterministic resolver modules
- the exact `TaskState` additions
- whether pending auto-completion notices are persisted or recomputed
- the exact fallback reviewer prompt filenames used for `code-review` Step 5
- the exact function signatures used to pass tool execution context into deterministic evaluation
- the exact prompt strings to replace and their replacement text
- the exact tests and snapshots to update

## Summary

The implementation must introduce a central deterministic placeholder workflow progression layer that:
- lives at the focus-chain placeholder seam
- is workflow-opt-in
- auto-completes only well-defined supported steps
- tells the model when that happens
- leaves unsupported workflows on the existing `task_progress` path

The most important implementation requirement is not just correctness of step advancement. It is coherence across runtime, prompt text, and restart behavior, so that supported workflows feel intentional instead of half-automatic.
