# Placeholder Workflow Focus Chain Update

## Objective

Make placeholder workflows materially more actionable after their activation turn by:

- persisting a durable source descriptor for the active placeholder workflow
- extracting the detailed instructions for the first incomplete step from the workflow source document
- replacing generic percentage-based focus-chain prompting with step-focused prompting for placeholder workflows

This document is the implementation and QA handoff spec for that work.

## Problem Statement

Today, placeholder workflows behave like this:

- on the activation turn, the full workflow document is injected into the user message as `explicit_instructions`
- after that turn, the workflow source document is not durably available through task state
- focus-chain prompting for non-managed work is generic and progress-based
- later turns therefore do not reliably remind the model what the current workflow step actually says

This creates a gap between:

- the workflow source document, which may contain detailed step instructions
- the focus-chain checklist, which only tracks milestone labels such as `Step 1: Gather Context`

The goal of this project is to close that gap for placeholder workflows without changing managed workflow behavior.

## Scope

### In Scope

- placeholder workflow state model changes
- placeholder workflow source persistence
- a shared helper that maps the first incomplete focus-chain checklist item to its source workflow step details
- focus-chain prompt updates for placeholder workflows
- tests covering local, global, and remote placeholder workflows
- QA guidance and acceptance criteria

### Out of Scope

- changes to managed workflow extraction or rendering
- changes to the activation-turn `explicit_instructions` behavior
- redesigning focus-chain markdown file format
- rewriting the system prompt section layout
- changing OpenAI `instructions` vs `input` behavior

## Definitions

### Placeholder Workflow

The existing internal code term for the non-managed workflow path. Current state includes:

- `activePlaceholderWorkflowId`
- `activePlaceholderWorkflowValues`
- `activate_placeholder_workflow`

### Workflow Source Document

The stable markdown source from which the focus-chain step guidance should be recovered on later turns.

Examples:

- local workspace file path
- global workflow file path
- remote workflow contents

### Focus Chain Checklist

The markdown checklist currently stored in task state and optionally mirrored to disk, for example:

```md
- [ ] Step 1: Gather Context
- [ ] Step 2: Review
```

## Current Behavior

### Activation

- placeholder workflows are resolved by name
- on activation, the workflow contents are injected into the user message as `explicit_instructions`
- task state stores `activePlaceholderWorkflowId`, but not a durable source descriptor

### Later Turns

- focus-chain prompting is generated from `src/core/task/focus-chain/index.ts`
- non-managed prompting currently uses generic progress-based messaging
- the first incomplete checklist item is not mapped back to the source workflow document

### Managed Workflow Behavior

Managed workflows already have their own structured runtime state and prompt rendering. This project must not regress that path.

## Target Behavior

When a placeholder workflow is active and the focus-chain checklist has at least one incomplete item:

1. the runtime identifies the active placeholder workflow source
2. the runtime parses the focus-chain checklist and finds the first incomplete item
3. the runtime extracts the matching step section from the source workflow document
4. the focus-chain prompt injects step-specific instructions instead of generic percent-complete nudges

Example target prompt shape:

```md
# CURRENT WORKFLOW STEP

You are currently on this step: Step 1: Gather Context

Determine what to review from the user's prompt before asking follow-up questions.
Prefer these interpretations when they clearly apply:
- explicit story path or "review this story" means a provided story file
- "staged" or "staged changes" means staged changes only
...

Focus on completing this step.
If you are done with this step, include the `task_progress` parameter in your next tool call.
Once you do, I'll give you the next step's details if they can be resolved from the workflow source.
```

If step details cannot be resolved safely, the runtime must fall back to the existing generic focus-chain reminder behavior rather than injecting wrong instructions.

## Architecture Changes

## 1. New Persisted Placeholder Workflow Source Descriptor

Add a durable task-state field named `activePlaceholderWorkflowSource`.

Do not make this a bare enum. It must be a discriminated source descriptor that can actually identify or carry the workflow source.

Recommended shape:

```ts
export type ActivePlaceholderWorkflowSource =
	| {
			type: "local" | "global"
			name: string
			path: string
	  }
	| {
			type: "remote"
			name: string
			contents: string
	  }
```

### Required Properties

- `type`
- `name`
- `path` for local/global
- `contents` for remote

### Why This Is Needed

`activePlaceholderWorkflowId` alone is not enough to recover the workflow source later because it is only a logical name such as `pr-review.md` or `remote-review`.

## 2. Shared Helper For Active Step Detail Extraction

Create a shared helper for placeholder workflow step-detail recovery.

Recommended file:

[src/core/workflows/placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts)

Recommended exported types:

```ts
export type ActivePlaceholderWorkflowStepDetails = {
	checklistLabel: string
	stepNumber?: number
	stepTitle: string
	stepHeading: string
	details: string
	sourceName: string
	sourceType: "local" | "global" | "remote"
}
```

Recommended public function:

```ts
export async function getActivePlaceholderWorkflowStepDetails(args: {
	checklistMarkdown: string
	source: ActivePlaceholderWorkflowSource
}): Promise<ActivePlaceholderWorkflowStepDetails | undefined>
```

### Helper Responsibilities

- parse the focus-chain checklist
- find the first incomplete item
- parse the placeholder workflow source into step sections
- match the first incomplete checklist item to the best workflow step
- return the step body/details for prompt injection

### Matching Strategy

Use this priority order:

1. exact step-number match
2. normalized title match

Step-number matching is the primary strategy and should win whenever both the checklist item and workflow heading expose a parseable step number.

### Expected Workflow Heading Support

The helper should support at least:

- `## Step 1: Gather Context`
- `## Step 1 - Gather Context`
- `### Step 1: Gather Context`

The extraction boundary should be:

- start at the matched step heading
- stop at the next step heading of the same pattern
- exclude the next step heading from the current step body

### Expected Checklist Item Support

The helper should support checklist labels like:

- `- [ ] Step 1: Gather Context`
- `- [ ] Step 2: Review`

It may support additional non-step labels as best-effort fallback, but if no safe match exists, it must return `undefined`.

## 3. Prompting Update In Focus Chain

The main prompt update belongs in:

[src/core/task/focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)

The method to update is:

- `generateFocusChainInstructions()`

### Current Behavior To Replace

For non-managed workflows with an existing checklist, prompting currently branches mainly on completion percentages and injects generic reminders such as:

- `No items are marked complete yet...`
- `50% of items are complete. Proceed with the task.`
- `75% of items are complete! Focus on finishing the remaining items.`

### New Behavior

For placeholder workflows with:

- `activePlaceholderWorkflowSource`
- `currentFocusChainChecklist`
- at least one incomplete checklist item

the runtime should attempt to inject step-focused prompting using the helper output.

### New Prompting Requirements

If step details are resolved successfully, inject:

- the current checklist step label
- the extracted step details
- a direct reminder to focus on completing this step
- a direct reminder to include `task_progress` in the next tool call once the step is complete

Suggested prompt shape:

```md
# CURRENT WORKFLOW STEP

You are currently on this step: {{checklistLabel}}

{{details}}

Focus on completing this step.
If you are done with this step, include the `task_progress` parameter in your next tool call.
Once you do, I'll give you the next step's details if they can be resolved from the workflow source.
```

The injected guidance should be phrased as direct first-person user input, not as runtime narration. Prefer wording such as:

- `You are currently on this step...`
- `Focus on completing this step.`
- `If you are done with this step, include the task_progress parameter in your next tool call.`
- `Once you do, I'll give you the next step's details...`

Avoid wording such as:

- `the runtime will provide`
- `the system will provide`
- `the prompt will refresh with`

### Fallback Rule

If helper resolution fails for any reason:

- missing source
- unparsable checklist
- unparsable workflow source
- no safe match

then keep the existing generic focus-chain reminder behavior.

### Managed Workflow Rule

Do not change the managed workflow branch in `generateFocusChainInstructions()` for this project.

## 4. Activation And Persistence Changes

Update placeholder workflow activation and persistence so `activePlaceholderWorkflowSource` is set and restored wherever `activePlaceholderWorkflowId` is currently managed.

### Required Touchpoints

- `src/core/task/TaskState.ts`
- `src/core/task/index.ts`
- `src/core/slash-commands/index.ts`
- `src/core/task/tools/handlers/UseSkillToolHandler.ts`
- task metadata save/load
- any subagent state handoff path that needs placeholder workflow continuity

### Preferred Activation Behavior

When a placeholder workflow is activated from slash-command resolution:

- the runtime should already know whether the source is local, global, or remote
- the activation payload should carry enough source information to persist `activePlaceholderWorkflowSource` without requiring a second lookup later

### Minimum Acceptable Behavior

If activation cannot immediately carry the source descriptor, the runtime may re-resolve it before persistence, but the persisted state must still end with a full source descriptor, not only a name.

## Implementation Requirements

## Required Files To Update

- [src/core/task/TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
- [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- [src/core/slash-commands/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts)
- [src/core/task/tools/handlers/UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts)
- [src/core/task/focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)
- new shared helper file for step-detail extraction

### Likely Additional Files

- any metadata types or task-storage shapes that mirror task state
- subagent state propagation paths if placeholder workflow continuity is expected there
- unit tests for the helper and prompting behavior

## Implementation Sequence

1. Add the new source descriptor type.
2. Add task-state storage for `activePlaceholderWorkflowSource`.
3. Persist and restore the new field with task metadata.
4. Update placeholder workflow activation paths to populate the new field.
5. Implement the shared helper for first-incomplete-step detail extraction.
6. Update focus-chain prompting to use the helper for placeholder workflows.
7. Preserve current fallback behavior when helper resolution fails.
8. Add tests.

## Edge Cases

The implementation must handle these safely:

- no active placeholder workflow
- active placeholder workflow but no persisted source descriptor
- remote workflow with contents only
- empty or invalid focus-chain checklist
- no incomplete items
- checklist items that do not match any workflow heading
- workflow headings that do not follow `Step N` format
- mismatch between AI-generated checklist wording and workflow step headings
- focus-chain list edited manually by the user

Fallback behavior in all unresolved cases must preserve current non-step-specific prompting rather than injecting incorrect step details.

## Acceptance Criteria

### Functional

- when a local placeholder workflow is active, the runtime persists its source path in `activePlaceholderWorkflowSource`
- when a global placeholder workflow is active, the runtime persists its source path in `activePlaceholderWorkflowSource`
- when a remote placeholder workflow is active, the runtime persists its source contents in `activePlaceholderWorkflowSource`
- when a focus-chain checklist exists and the first incomplete item maps to a workflow step, the prompt includes that step’s details
- when step extraction fails, the runtime falls back to the existing generic focus-chain prompt behavior
- managed workflow prompting remains unchanged

### Prompting

- generic percentage-based nudges are no longer the primary behavior for placeholder workflows with resolvable step details
- prompt text explicitly tells the agent to focus on the current step
- prompt text explicitly tells the agent to include `task_progress` when the current step is complete
- prompt text is phrased as direct first-person user guidance rather than runtime narration
- prompt text does not claim follow-up step detail delivery unless that remains true under the implemented logic

### Persistence

- `activePlaceholderWorkflowSource` survives metadata save/load
- placeholder workflow step-detail prompting still works after task reload/resume

## Testing Requirements

## Unit Tests

Add unit tests for the shared helper covering:

- step-number match success
- title-only fallback match success
- no incomplete checklist items
- no matching workflow heading
- extraction boundary at next step heading
- local/global source via `path`
- remote source via `contents`

## Integration-Oriented Tests

Add tests covering:

- slash-command placeholder workflow activation persists `activePlaceholderWorkflowSource`
- `use_skill` placeholder workflow activation persists `activePlaceholderWorkflowSource`
- task metadata save/load round-trips the new field
- focus-chain prompting for placeholder workflows injects step-specific details when resolvable
- focus-chain prompting falls back to generic behavior when not resolvable
- managed workflow behavior is unchanged

## QA Review Action Plan

The QA reviewer should validate:

- local placeholder workflow activation path
- global placeholder workflow activation path
- remote placeholder workflow activation path
- resumed task behavior after metadata reload
- focus-chain prompt output with matching checklist and workflow step names
- focus-chain prompt output with intentionally mismatched checklist names
- no regression in managed workflow prompt output

## QA Findings

QA findings should be added to this section so a follow-up execution agent can address them in later passes.

Use this format:

```md
Finding: description of deficiency
Remediation Steps:
- [ ] Detailed task description
```

Finding: The automated coverage does not verify task metadata reload/resume for `activePlaceholderWorkflowSource`, so the spec's required persistence round-trip is still unproven.
Remediation Steps:
- [x] Add a test that saves task metadata with `activePlaceholderWorkflowSource`, runs the task-state restore path, and verifies the restored task can still resolve step-specific placeholder-workflow prompting after reload/resume.

Finding: The slash-command tests stop at `parseSlashCommands()` and do not exercise the runtime activation path in `src/core/task/index.ts`, leaving the primary UI workflow activation persistence path unverified.
Remediation Steps:
- [x] Add an integration-oriented test that drives a placeholder workflow activation through the persistent `activate_placeholder_workflow` action, verifies `activePlaceholderWorkflowSource` is written to task metadata, and confirms the saved state survives the next prompt-building turn.

QA pass 2026-03-24: This review found no negative findings. The prior persistence and slash-command coverage findings are addressed by `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`, and the targeted placeholder-workflow tests plus `npx tsc --noEmit` passed.

Final local QA pass 2026-03-24: No negative findings. I independently reviewed the placeholder workflow source descriptor wiring and focus-chain prompt path in `src/core/workflows/placeholder-workflow-step-details.ts`, `src/core/task/focus-chain/index.ts`, `src/core/task/index.ts`, `src/core/slash-commands/index.ts`, and `src/core/task/tools/handlers/UseSkillToolHandler.ts`, then reran the targeted placeholder-workflow unit suite and `npx tsc --noEmit`.

## Implementation Action Plan

- [x] Add `ActivePlaceholderWorkflowSource` type and wire it into task state.
- [x] Persist and restore `activePlaceholderWorkflowSource` with task metadata.
- [x] Populate `activePlaceholderWorkflowSource` in placeholder workflow activation paths.
- [x] Implement shared helper for first-incomplete-step detail extraction.
- [x] Update focus-chain prompting to use step-specific placeholder workflow guidance.
- [x] Preserve fallback behavior for unresolved helper cases.
- [x] Add unit tests for helper behavior.
- [x] Add integration tests for activation, persistence, and prompt output.

## QA Review Checklist

- [ ] Confirm implementation matches the source descriptor shape defined in this spec.
- [ ] Confirm prompt output includes current-step details for resolvable placeholder workflows.
- [ ] Confirm fallback behavior remains safe and generic when resolution fails.
- [ ] Confirm managed workflow prompting is unchanged.
- [ ] Confirm task reload/resume preserves placeholder workflow source state.

## Notes For Implementation Agents

- Do not try to solve this only inside `focus-chain/index.ts`; the prompt change depends on new persisted source state.
- Do not reuse `activePlaceholderWorkflowId` as the durable source reference; it is a logical workflow name, not a stable source descriptor.
- Do not regress the managed workflow path.
- Keep the helper shared and deterministic so it can be reused by future prompt surfaces if needed.
