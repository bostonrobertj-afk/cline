# Workflow UI Surface Phase 2 Requirements

## Purpose

This document defines the Phase 2 requirements for extending the workflow UI surface capability so it can resolve workflow-start inputs before the first AI turn begins.

Phase 2 builds on:

- [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/discovery.md)
- [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/architecture.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md)
- [phase-2-generalization-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-2-generalization-action-plan.md)

This phase is specifically about human invocation of placeholder workflows through slash commands, where Step 1 is authored as an input-gathering step that stores values through `set_workflow_placeholders`.

## Phase 2 Scope

Phase 2 delivers a new start-of-workflow use case:

- trigger point: slash-command-driven placeholder workflow activation before the first API turn
- target step: `Step 1`
- primary delivered use case: human invocation of `review-adversarial-general.md`
- invoked tool: `set_workflow_placeholders`

Phase 2 must implement that use case in a way that applies automatically to placeholder workflows started through slash commands when those workflows follow the Step 1 authoring contract defined below. It must not require per-workflow trigger registration just to enable the default Step 1 start-form behavior for slash-command-started placeholder workflows.

## Core Requirement

The system must support a workflow-start form path that:

- runs after a placeholder workflow has been activated
- runs before the first API call for that workflow
- inspects the active Step 1 details of the workflow
- determines whether unresolved dynamic workflow placeholders still need human input
- presents a system-owned form when those inputs are required
- translates the submitted values into the canonical `set_workflow_placeholders` argument shape
- executes `set_workflow_placeholders` through the existing tool execution path
- runs deterministic workflow progression immediately after that tool execution
- allows the first AI turn to begin from the updated workflow state

The capability must continue to reduce token consumption by keeping raw human form inputs out of model-visible conversational context.

## Phase 1 Readiness Gap

Phase 1 documentation required the workflow UI surface capability to be slash-command-ready in general, but the delivered Phase 1 runtime did not fully satisfy that requirement for start-of-workflow invocation.

In the current runtime:

- workflow-form interception is evaluated before pending slash-command workflow activation is applied
- the delivered Phase 1 workflow-form path therefore works for later in-workflow steps such as `code-review.md` Step 3
- but it does not yet cleanly support a slash-command-started Step 1 form path before the first workflow turn

Phase 2 must close that integration gap while preserving the general architectural direction established by the Phase 1 docs.

## Architectural Invariants

Everything below is mandatory for Phase 2.

### 1. Existing systems remain authoritative

This update must not replace:

- placeholder workflow activation
- deterministic workflow progression
- workflow done-signal evaluation
- tool execution
- tool validation
- task persistence
- existing slash-command activation behavior

The capability must pause those systems at a defined insertion point and then return control to them.

### 2. Raw human form inputs must not enter model context

The collected start-of-workflow inputs must not be replayed into the AI agent's context window as:

- ordinary user text
- user feedback
- synthetic recap text
- serialized `set_workflow_placeholders` arguments

Only the normal tool-result and workflow-state effects may remain visible to the runtime after execution.

### 3. Workflow Step 1 remains valid fallback guidance

For supported workflows, the system-owned form path is the primary path for Step 1 when unresolved human-supplied placeholders are present.

The Step 1 instructions in the workflow document must still remain sufficient fallback guidance for the AI agent if the form path is cancelled, skipped, or fails.

### 4. Existing post-step behavior remains unchanged

Once `set_workflow_placeholders` has produced the placeholder state that satisfies the workflow's existing Step 1 done signal, the existing deterministic workflow progression system must continue to own:

- detecting Step 1 completion
- advancing the checklist to the next step
- injecting the normal next-step prompting

This update must not create a parallel post-Step-1 workflow progression path.

## Trigger Requirements

### 1. Delivered Phase 2 trigger

Phase 2 must support a start-of-workflow trigger for placeholder workflows started through slash commands.

Specifically:

- the current user turn includes a slash-command activation of a placeholder workflow
- the placeholder workflow has been activated through the existing activation path
- the task is in the just-started workflow state before the first API turn
- the active checklist step is `Step 1`
- the system evaluates whether Step 1 still contains unresolved placeholder inputs requiring human collection
- if inputs are required, the runtime pauses normal agent execution and runs the workflow form
- after successful deterministic resolution, the first normal API turn begins from the updated state

This Phase 2 trigger must not run for placeholder workflows activated through `use_skill`.

### 2. Automatic default behavior

The delivered Step 1 start-form behavior must be automatic by default for placeholder workflows started through slash commands.

That means:

- no per-workflow trigger registration is required to enable the default Step 1 path for slash-command-started placeholder workflows
- the default detection rule is based on the active Step 1 details of the current placeholder workflow
- the runtime must treat workflows with no unresolved Step 1 placeholders as normal workflows and skip the form automatically
- the runtime must not trigger this UX merely because a workflow was started through `use_skill`

### 3. No-placeholder behavior

If a slash-command-started placeholder workflow's active Step 1 details do not contain any unresolved placeholder keys after normal placeholder rendering:

- no workflow form should be shown
- no error should be raised
- the workflow should proceed directly into the first AI turn

This behavior is required so workflows that do not need start-of-workflow human inputs can run without special opt-out configuration.

### 4. Future trigger compatibility

Phase 2 must preserve compatibility with the generalized trigger architecture established by the previous generalization work.

That means:

- shared resolver definitions remain capability-owned
- workflow-start trigger policy remains runtime-owned
- explicit slash-command trigger references remain a separate trigger-reference layer

Phase 2 may deliver a default slash-command-start trigger path rather than a manually populated slash-command trigger map, but it must keep that trigger policy separate from the later in-workflow step-trigger registry.

## Step 1 Authoring Contract

Phase 2 depends on a consistent placeholder-workflow authoring pattern for `Step 1`.

For workflows that should use the automatic start-of-workflow form path, Step 1 must:

- focus on gathering required workflow inputs
- explicitly name the placeholder tokens to be set
- explicitly state that the values should be stored via `set_workflow_placeholders`
- avoid mixing unrelated work into Step 1
- use a done signal that is based on placeholder state rather than vague narrative completion

A supported Step 1 should read as some variation of:

- ensure you have inputs `x`, `y`, and `z`
- store them using `set_workflow_placeholders`
- map them to placeholders `{a}`, `{b}`, and `{c}`

This contract is required so the same Step 1 text serves both:

- as the primary system-owned form source of truth
- as fallback instructions for the AI agent

## Placeholder Extraction Requirements

### 1. Source of truth

The default start-of-workflow form path must derive required input placeholders from the active Step 1 details of the current slash-command-started placeholder workflow.

The runtime must use the existing active-step resolution path rather than reparsing the workflow independently from checklist state.

### 2. Extraction stage

Placeholder extraction must occur after normal stable and already-known dynamic placeholder rendering has been applied to the active Step 1 details.

This is required so:

- stable config-backed placeholders do not appear as human-required inputs
- already-resolved dynamic placeholders do not get recollected
- only unresolved Step 1 placeholders remain candidates for form collection

### 3. Extracted-placeholder semantics

The extracted placeholder set is the default signal for which human inputs the form should collect.

Phase 2 may allow resolver-level UI overrides for:

- field labels
- help text
- field ordering
- field grouping
- control type

But those overrides must not change the core source of truth for whether Step 1 currently needs input collection.

## Form Behavior Requirements

### 1. Start-of-workflow form ownership

The form must render as a system-owned workflow-form interaction using the same dedicated workflow-form runtime and transport family already established in Phase 1.

It must not introduce:

- a new ask type
- a second submission transport
- a second workflow-form runtime

### 2. Tool target

For the delivered Phase 2 use case, successful submission must invoke `set_workflow_placeholders`.

The backend must translate the collected values into the canonical wrapper shape required by that tool:

- `{"values": {...}}`

### 3. Pre-first-turn completion

If the form succeeds and the resulting placeholder state satisfies Step 1, deterministic progression must run before the first AI turn begins.

The first AI turn should therefore begin:

- on Step 2 when Step 1 is completed by the form
- on Step 1 only when the form path did not resolve Step 1

### 4. Failure and fallback

If the form is cancelled, skipped, or fails:

- the workflow must remain active
- Step 1 must remain available as the normal current step
- the AI agent must receive the Step 1 fallback instructions from the workflow document

The system must not discard the workflow or bypass Step 1 in those cases.

### 5. Ordering requirement

The runtime must evaluate the Phase 2 start-of-workflow form path only after the slash-command placeholder workflow activation for the current turn is available to the interception logic.

That means the implementation must ensure one of the following is true:

- the slash-command activation has already been applied to task state before the workflow-form interception check runs
- or the pending slash-command activation for the current turn is explicitly available to that interception check

The implementation must not rely on `activeWorkflowJustStarted` alone, because that state is also reached by non-human workflow-start paths such as `use_skill`.

## Review-Adversarial-General Requirements

For the first delivered human-start use case, `review-adversarial-general.md` Step 1 must be supported through the automatic Phase 2 path.

That means:

- the form must be able to collect the user-provided review target for Step 1
- the backend must map the submission into `set_workflow_placeholders`
- the resulting placeholder state must be capable of satisfying the Step 1 done signal before the first AI turn

The supported placeholders for this initial use case are:

- `{review_input}`
- `{diff_output}`
- optional `{spec_file}` when supplied by the user

### Important constraint

For this workflow, Step 1 completion must not be treated as satisfied merely because a stable config-backed `diff_output` path exists in `.cline/workflow-config.yaml`.

Phase 2 must require actual resolved input state for the review target, such as:

- a human-submitted dynamic placeholder value
- an inherited dynamic value from a parent workflow/subagent path

A stable artifact location alone is not sufficient evidence that the human supplied a review target.

## Configuration Requirements

### 1. Default behavior requires no per-workflow config

The Phase 2 start-of-workflow path must work without workflow-specific configuration when a slash-command-started placeholder workflow follows the Step 1 authoring contract.

In the default case, the only authoring work required should be:

- structure Step 1 correctly
- reference the required placeholders explicitly
- use `set_workflow_placeholders` in the Step 1 instructions and done signal

### 2. Optional overrides

The architecture may support optional per-resolver or per-workflow overrides for UX quality, including:

- custom title
- custom prompt string
- field label/help overrides
- field ordering/grouping
- optional hidden or derived fields

Those overrides are optional refinements. They must not be required just to make the default Phase 2 Step 1 path function.

## Persistence And Resume Requirements

Phase 2 must continue to use the existing workflow-form persistence model.

The system must:

- persist one active workflow-form session per task
- restore an unresolved start-of-workflow form on resume when the owning workflow context is still valid
- clear the persisted session on success, explicit cancel, or loss of the owning workflow context

The persisted session must remain minimal and must not duplicate:

- workflow progression state already owned elsewhere
- tool execution result state already owned elsewhere
- model-visible user input history

## Out Of Scope

The following are out of scope for this Phase 2 requirements document.

### 1. Managed workflow automatic Step 1 forms

This phase is about placeholder workflows started through slash commands. It does not require the same default automatic Step 1 behavior for the managed workflow engine.

### 2. Arbitrary non-Step-1 automatic forms

This phase does not redefine the default behavior for steps other than `Step 1`.

Later workflow-step-driven form triggers remain supported by the existing generalized workflow-step trigger architecture.

### 3. Workflow document rewrites outside the delivered use case

This phase does not require rewriting every existing workflow immediately.

It defines the authoring contract that workflows must follow if they want the automatic Step 1 start-form behavior when invoked by slash command.
