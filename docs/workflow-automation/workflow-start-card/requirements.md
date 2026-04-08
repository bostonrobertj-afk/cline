# Workflow Start Card Requirements

## Purpose

This document defines the requirements for a reusable workflow-start card capability for placeholder workflows.

The capability must:

- render a system-owned welcome card before Turn 1 begins for configured placeholder workflows
- support a runtime-generated heading plus workflow-specific body copy
- use one fixed CTA label for all workflows: `Get Started`
- resume the same pending card if the user has not clicked `Get Started`
- proceed normally with no card when the invoked workflow has no configured card entry

This slice is intended to be workflow-agnostic.

The first workflow to use it will be:

- `quick-spec.md`

## Source Of Truth

These requirements are grounded in:

- [workflow-start-messages.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md)
- [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md)
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
- [slash-commands/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts)
- [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
- [task.proto](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/task.proto)
- [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)
- [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)
- [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)

## Capability Boundary

This capability is not a workflow form.

It must be implemented as a sibling system-owned startup surface, separate from:

- workflow-start forms
- in-workflow step-triggered workflow forms
- automatic workflow-preparation status cards

It must:

- intercept placeholder workflow startup after slash-command activation and before Turn 1 begins
- render a workflow-specific welcome card when the active placeholder workflow is configured for one
- hand control back to the normal workflow startup path after the user clicks `Get Started`

It must not:

- collect structured inputs
- invoke `set_workflow_placeholders`
- masquerade as Step 1 of the workflow
- replace deterministic progression
- activate for managed workflows in this slice

## Overall Runtime Contract

For configured placeholder workflows, the startup sequence must be:

1. The slash command activates the placeholder workflow.
2. The runtime determines whether the active placeholder workflow has a configured workflow-start card.
3. If a card exists, the system renders the welcome card before Turn 1 begins.
4. The user clicks `Get Started`.
5. The runtime clears the pending workflow-start-card state.
6. Normal workflow Turn 1 begins.

Turn 1 may then be:

- a system-owned automated step, or
- an AI turn,

depending on the workflow's normal runtime behavior.

For placeholder workflows with no configured workflow-start card entry, startup must skip the capability entirely and proceed directly into the normal Turn 1 path.

## Reference File Contract

[workflow-start-messages.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md) is a documentation/reference file, not the runtime registry.

It exists to define the approved heading and body copy for each workflow that uses this capability.

The actual runtime registry must live in code.

This slice must require:

- a code-owned runtime registry keyed by exact workflow name
- exact workflow-specific body text
- runtime-generated heading text
- a fixed CTA label of `Get Started`

The runtime registry must stay aligned with the approved copy documented in `workflow-start-messages.md`.

## Activation Scope Requirements

This capability must activate only for placeholder workflows started through the placeholder-workflow slash-command path.

The activation gate must be based on the existing placeholder workflow startup seam, not on generic workflow name matching in unrelated startup paths.

This slice must not activate for:

- managed workflows
- non-workflow slash commands
- in-workflow step changes
- resumed tasks that are not carrying a pending workflow-start-card session

## Runtime Architecture Requirements

### 1. Dedicated capability model

The workflow-start card capability must have its own runtime model and registry, separate from the workflow-form runtime.

This includes distinct:

- registry definitions
- task state
- persistence fields
- rendering payload contract
- submission handling

It must not be implemented by overloading the workflow-form resolver registry with fake no-input forms.

### 2. Pre-Turn interception seam

The capability must plug into the same pre-turn startup phase where the task runtime already decides whether a system-owned startup surface should run before the API turn.

The correct runtime behavior is:

- startup interception occurs after placeholder workflow activation
- startup interception occurs before Turn 1 begins
- the capability may short-circuit entry into Turn 1 until the user clicks `Get Started`

### 3. Workflow-agnostic registry

The runtime must support a workflow-agnostic registry keyed by exact workflow filename.

Each registry entry must minimally define:

- exact workflow name
- markdown body

The CTA label must not be configurable per workflow in this slice.

The fixed CTA label for all workflows is:

- `Get Started`

### 4. Generated heading contract

The card heading must be generated at runtime from the exact workflow filename.

The transformation rule must be:

- start from the exact workflow filename, such as `quick-spec.md`
- strip the trailing `.md`
- split the remaining name on `-`
- title-case each token
- join the tokens with spaces
- render the final heading as:
  - `Welcome to the {Transformed Name} Workflow!`

Examples:

- `quick-spec.md` -> `Welcome to the Quick Spec Workflow!`
- `create-story.md` -> `Welcome to the Create Story Workflow!`

### 4. Missing-entry fallback

If the active placeholder workflow has no workflow-start-card registry entry, startup must proceed normally with no card.

This must be treated as a supported no-op path, not as an error.

## Rendering Contract

### 1. System-owned chat card

The workflow-start card must render as a system-owned chat surface, consistent with other system-owned runtime UI elements.

It must visibly distinguish itself from ordinary assistant prose.

### 2. Markdown body rendering

The workflow-specific body content must be rendered as markdown.

This must allow:

- paragraph breaks
- inline code formatting
- future list formatting if later approved in the reference doc

### 3. Fixed CTA

The card must render exactly one primary CTA:

- `Get Started`

This CTA must be the only success path needed to continue startup in this slice.

### 4. No cancel path requirement

This slice does not require a `Cancel` or alternate button on the start card.

If the user closes or abandons the task without clicking `Get Started`, the pending card session must remain resumable.

## Persistence And Resume Requirements

### 1. Pending card session persistence

If a workflow-start card is active and unresolved, the runtime must persist enough state to restore it after reload or resume.

At minimum, persistence must preserve:

- that a workflow-start card session is active
- which workflow it belongs to
- the card content identity needed to re-render it
- that the user has not yet clicked `Get Started`

### 2. Resume behavior

If the user resumes while the card is still pending, the runtime must re-render the same pending card instead of restarting startup from scratch.

### 3. Completion behavior

After the user clicks `Get Started`, the pending card session must be cleared so startup proceeds into Turn 1 and the card does not reappear for that same task unless the workflow is started again from the beginning.

## Submission Contract

This capability must have a dedicated submission path, separate from workflow-form submission.

It may reuse the shared task-service transport pattern, but it must not be modeled as a workflow-form submission.

The only required submit action in this slice is:

- continue startup after `Get Started`

The submit handler must:

- validate that the active pending start-card session matches the submitted session identity
- mark the card as completed
- clear the persisted pending card state
- allow normal Turn 1 startup to continue

## Task State Requirements

This slice must introduce dedicated task state for the workflow-start-card capability.

It must not reuse:

- `activeWorkflowFormSession`
- `suppressedWorkflowFormResolverIds`

The task state must be capable of representing:

- no active start-card session
- one active unresolved start-card session
- cleared/completed session state after `Get Started`

## Metadata Persistence Requirements

Any task metadata persistence introduced for this capability must follow the existing task-metadata persistence pattern used for other system-owned startup/runtime surfaces.

The persisted metadata must be sufficient to:

- restore a pending card after reload
- avoid restoring a completed card after `Get Started`

## UI Copy Requirements

### 1. Runtime source

The actual runtime body copy must be registered in code.

### 2. Documentation/reference alignment

The body copy used in the runtime registry must match the approved per-workflow text documented in:

- [workflow-start-messages.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md)

The heading must not be copied from the reference file. It must be generated from the workflow filename using the runtime heading contract above.

### 3. First delivery target

The first required runtime copy entry is for:

- `quick-spec.md`

This slice must make it straightforward to add future entries for other placeholder workflows without changing the underlying runtime mechanism.

## Testing Requirements

This slice must add focused tests covering:

- slash-command placeholder workflow startup with a configured workflow-start-card entry
- slash-command placeholder workflow startup with no configured entry
- persistence and resume of an unresolved card
- successful `Get Started` submission and handoff into normal Turn 1 startup
- proof that the card does not reuse the workflow-form runtime path
- webview rendering of the markdown body and fixed `Get Started` CTA

At minimum, tests must cover the relevant seams in:

- placeholder-workflow startup orchestration
- task metadata persistence and resume
- shared payload/submission contract
- chat-row rendering
- webview submission handling

## Documentation Requirements

This slice must add or update canonical documentation for the new capability.

At minimum, implementation must leave the repo with:

- this requirements document
- the approved message reference file at [workflow-start-messages.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md)
- capability documentation describing workflow-start cards as distinct from workflow forms if the current workflow-form documentation would otherwise imply that all pre-turn system-owned startup surfaces are forms

## Non-Goals

This slice does not define:

- managed workflow support
- Step 1 automation for `quick-spec.md`
- deterministic progression for `quick-spec.md`
- contextual tool exposure
- persona activation
- custom per-workflow CTA labels
- runtime loading of card copy directly from markdown docs
