# Create Epics Workflow-Start Form Requirements

## Purpose

This document defines the requirements needed to make [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md) support the existing workflow-start form capability through the live slash-command placeholder-workflow path.

This document is intentionally constrained to the existing workflow-form architecture. It does not define deterministic progression behavior for `create-epics.md`; that is separated into its own companion requirements document.

## Source Of Truth

These requirements are grounded in the current runtime and capability docs:

- [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)
- [phase-2/requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-2/requirements.md)
- [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md)
- [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- [workflowStartRequirements.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts)
- [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)

## Current Workflow Audit

The current [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md) Step 1 is not yet compatible with the live workflow-start form contract.

Current gaps:

- Step 1 uses backticked bare keys on lines 5-6, not literal placeholder tokens such as `{architecture_document}`.
- Step 1 uses `PRD` on line 5, while later workflow steps use `{prd}` on lines 16, 18, and 35.
- Step 1 does not explicitly instruct the runtime/agent to store the collected values through `set_workflow_placeholders`.
- Step 1 done-signal wording is high level, but the current pre-turn system-owned path works best when the completion condition is reducible to placeholder state.

## Core Requirement

The `create-epics.md` workflow must support the existing workflow-start form path such that:

- the workflow is activated by slash command as a placeholder workflow
- the runtime resolves Step 1 through the existing `placeholder_workflow_start_set_workflow_placeholders` resolver
- the form collects the human-supplied inputs required to begin the workflow
- the submitted values are stored through the existing `set_workflow_placeholders` tool path
- the workflow-form session clears on success and returns control to the existing downstream runtime
- the buildout remains compatible with later deterministic progression work without defining that behavior here

## Step 1 Authoring Requirements

### 1. Step 1 must follow the live workflow-start directive format

Step 1 must contain explicit raw directive lines using literal placeholder tokens recognized by [workflowStartRequirements.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts).

The required Step 1 input contract for this workflow must be:

- `Required: {architecture_document}, {prd}, {mode}`
- `Optional: {ux_spec}, {ui_spec}`

`One of:` is not required for this workflow unless the input contract is changed later.

### 2. Step 1 must use canonical placeholder spellings

The workflow-start form buildout must standardize on these exact placeholder keys:

- `architecture_document`
- `prd`
- `mode`
- `ux_spec`
- `ui_spec`

`PRD` must not remain in Step 1. The workflow already consumes `{prd}` downstream, so the start-form contract must use the same canonical key.

### 3. Step 1 must explicitly reference `set_workflow_placeholders`

Step 1 must explicitly tell the agent that collected inputs are to be stored through `set_workflow_placeholders`.

This is required because the same Step 1 body serves both:

- as the source for the system-owned start form
- as the fallback instructions shown to the agent when the form path is cancelled, skipped, or fails

### 4. Step 1 must stay narrowly scoped to input gathering

Step 1 must not mix document creation, requirements extraction, or epic drafting into the start-form step body.

Those belong in Step 2 and later steps.

### 5. Step 1 done signal must be placeholder-state-based

The Step 1 done signal must be expressible as:

- required workflow-start placeholders are present for the active task
- optional placeholders may be absent

For this workflow, the required completion contract is:

- `architecture_document` is present and non-empty
- `prd` is present and non-empty
- `mode` is present and non-empty

## Workflow-Form Runtime Requirements

### 1. Use the existing workflow-start trigger path

This buildout must use the current slash-command start-form trigger path in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L46).

It must not add:

- a new trigger family
- per-workflow trigger registration for Step 1
- a new transport or ask type

### 2. Use the existing workflow-start resolver

This buildout must use the existing resolver id:

- `placeholder_workflow_start_set_workflow_placeholders`

It must continue to submit to `set_workflow_placeholders` using the existing canonical shape:

- `{"values": {...}}`

### 3. Keep field typing schema-driven

The start form must continue to inherit field typing from `set_workflow_placeholders` through [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L604).

Under the current runtime, that means every `create-epics.md` start-form field will be rendered as a string-backed field.

Important implication:

- `mode` will be a text field under the current capability, not a select/dropdown

This buildout must not introduce workflow-specific control-type logic just for `create-epics.md`.

### 4. Blank optional values must be omitted from the tool call

The submitted tool payload must include only parsed string values the human actually supplied.

Blank `ux_spec` and `ui_spec` values must not be persisted as empty-string placeholders.

## UX Override Requirements

The base start-form capability can function without a workflow-specific override, but this workflow should add a workflow-specific override in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L253) so the generated form is readable and self-explanatory.

The override must provide:

- a workflow-specific title
- a workflow-specific prompt
- label overrides for all collected fields
- help text overrides for all collected fields

The override must at minimum clarify:

- `architecture_document` expects a path to the architecture document
- `prd` expects a path to the PRD
- `mode` must be either `new` or `continue`
- `ux_spec` and `ui_spec` are optional supporting inputs

Because `mode` remains a text field in the current runtime, the help text must make the accepted literals explicit.

## Capability Boundary

This document does not define:

- deterministic Step 1 auto-completion
- deterministic allowlist registration for `create-epics.md`
- first-turn chaining from workflow-start success into Step 2
- deterministic progression test coverage

Those requirements belong in:

- [deterministic-progression-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/deterministic-progression-requirements.md)

## Persistence And Resume Requirements

This buildout must continue to use the existing workflow-form session persistence model.

It must not add workflow-specific persistence state for `create-epics.md`.

The unresolved start form must continue to:

- persist as the active workflow-form session
- resume correctly on reopen/reload while the owning workflow is still active
- clear on success, explicit cancel, or loss of the owning workflow context

## Fallback Requirements

If the workflow-start form is cancelled, skipped, or fails:

- the workflow must remain active
- Step 1 must remain the current workflow step
- the agent must receive fallback Step 1 instructions that are still usable because they explicitly mention the required placeholders and `set_workflow_placeholders`

## Test Requirements

### 1. Trigger parsing coverage

Add focused tests proving `create-epics.md` Step 1 produces a slash-command workflow-start candidate when authored with:

- `Required: {architecture_document}, {prd}, {mode}`
- `Optional: {ux_spec}, {ui_spec}`

Add negative coverage proving the candidate is absent when Step 1 regresses to bare keys or backticked names.

### 2. Resolver definition coverage

Add or extend tests proving the workflow-start resolver builds the expected `create-epics.md` field set and applies the new workflow-specific override copy.

### 3. Submission serialization coverage

Add tests proving the `create-epics.md` start form serializes into:

- `architecture_document`
- `prd`
- `mode`
- optional `ux_spec`
- optional `ui_spec`

and omits blank optional values.

### 4. Workflow-form persistence coverage

Add a persistence/runtime regression proving:

- slash-command activation opens the `create-epics.md` start form
- successful submission stores the placeholder values through `set_workflow_placeholders`
- the workflow-form session is cleared on success
- the form-specific runtime returns control to the existing downstream systems without introducing workflow-specific persistence state

## Non-Requirements

This buildout does not require:

- a new workflow-form runtime
- a new tool target
- a workflow-specific trigger registry entry for Step 1
- custom non-string form controls for `mode`
- `One of:` semantics for the current `create-epics.md` input contract
- deterministic Step 1 completion logic
- deterministic progression allowlist changes

## Practical Outcome

If the requirements above are met, `create-epics.md` will use the same workflow-start conventions as the current live capability:

- Step 1 becomes parseable by the existing workflow-start requirement parser
- the system-owned form can collect and store the required inputs through `set_workflow_placeholders`
- the workflow remains compatible with the existing fallback path and runtime architecture
- downstream deterministic progression work can be added separately without redefining the workflow-form capability
