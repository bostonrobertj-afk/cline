# Non-Interactive Deterministic Workflow Step Resolution Requirements

## Purpose

This document defines the requirements record for the separate shared capability for zero-human-input deterministic workflow-step resolution and user-visible status notifications.

This workstream is now deployed. This document remains the requirements record for the shipped capability. For live runtime behavior, pair it with [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md) and [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md).

This document bridges:

- [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/architecture.md)
- [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md)
- [workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-automation-readme.md)
- [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)

to the implemented action plan for this workstream.

## Delivered Scope

This workstream delivers one new shared runtime capability and migrates the current zero-input workflow-step use cases that still live under Workflow Forms:

- `brainstorming.md` Step 2 zero-session automatic session creation
- `code-review.md` Step 3 review-input preparation
- `write-remediation-story.md` Step 2 review-input preparation
- `quick-spec.md` Step 2 tech-spec scaffold preparation

Delivered trigger scope for this workstream:

- deterministic workflow progression inside an already-active placeholder workflow

Deterministic workflow progression remains the triggering seam for `brainstorming.md` Step 2 zero-session automatic session creation as well.

The architecture must remain compatible with other runtime-owned orchestrators, but this requirements set does not expand the delivered scope beyond the currently migrated deterministic workflow-step use cases.

## Core Requirement

The system must support a new shared capability that:

- is invoked by an existing runtime orchestrator when a supported zero-human-input workflow step becomes active
- renders a non-interactive system-owned status notification in chat
- executes the deterministic backend operation through the existing task-owned tool path
- classifies the operation result as success, failure, or fallback-to-agent
- returns control to the existing deterministic workflow progression machinery without introducing a parallel progression path

This capability must replace the current `automatic_status` branch inside Workflow Forms for the migrated use cases.

## Architectural Invariants

Everything below is mandatory.

### 1. Existing systems remain authoritative

The new capability must not replace:

- deterministic workflow progression
- workflow done-signal evaluation
- tool execution
- task persistence
- workflow fallback instructions authored in workflow documents

It must insert into those systems at a defined point, perform the zero-input deterministic resolution work, and then return control.

### 2. The capability is non-interactive

The capability must not collect human input.

That means it must not introduce:

- interactive fields
- panel navigation
- user submission actions
- a dedicated webview-to-runtime submission request
- an awaiting-user-response thread state

### 3. The capability is separate from Workflow Forms

The new capability must not continue to overload Workflow Forms.

Specifically, the migrated use cases must no longer depend on:

- `WorkflowFormPresentationKind = "automatic_status"`
- automatic-status workflow-form resolver entries
- workflow-form runtime branches that exist only to support zero-input status execution
- workflow-form chat payloads carrying automatic-status state

### 4. The normal task-owned tool path remains authoritative

The migrated deterministic operations must continue to execute through the normal task-owned tool path rather than through backend-only silent internal-tool dispatch.

This is required so the capability preserves the same downstream effects the current automatic-status path relies on, including:

- normal task-owned tool execution ownership
- post-tool deterministic workflow progression sync
- compatibility with existing tool result handling

### 5. The capability remains additive

This capability must not introduce:

- a second workflow engine
- a second deterministic progression system
- a second workflow-completion system
- a second workflow-orchestration policy layer

## Contract Requirements

### 1. Dedicated shared status payload contract

The feature must introduce a dedicated shared payload family for this capability.

It must not continue to embed these runtime states inside the workflow-form payload contract.

The dedicated payload contract must support:

- capability/session identity
- workflow/step ownership metadata
- status state
- display copy needed by the UI
- any minimal runtime metadata needed for safe resume/reconstruction

### 2. Dedicated shared definition contract

The feature must introduce a dedicated shared definition/config seam for zero-input deterministic workflow-step resolution.

For each supported use case, that shared contract must be able to declare:

- the owning workflow step
- the deterministic operation to run
- pending/success/failure status copy
- result-classification rules
- fallback-to-agent policy when the deterministic operation fails

This contract must be separate from workflow-form resolver definitions.

### 3. Shared result-classification contract

The capability must own result classification as part of its shared contract rather than scattering nearly identical logic across workflow-form resolvers.

The shared contract must support:

- success
- failure
- fallback-to-agent on failure when the workflow should return to authored fallback instructions

### 4. No user-submission transport

Because the capability is non-interactive, it must not introduce or rely on:

- user-submission RPCs
- freeform ask-response text
- button-click submission semantics

The only shared transport this capability needs is the runtime-owned status payload sent to the webview.

## Runtime Requirements

### 1. Runtime-owned lifecycle

The shared runtime for this capability must own the lifecycle of:

- pending status emission
- deterministic operation execution
- result classification
- terminal success/failure status emission
- returning a structured outcome to the orchestrator

### 2. Session lifecycle

The runtime must support a session or run model that allows the status lifecycle to be reconstructed safely during resume when needed.

At minimum, the runtime must support:

- create
- resume
- render/update pending state
- render/update terminal state
- clear

### 3. Single status-entry lifecycle

For a given active run, the UI status lifecycle should remain one session-owned status entry that can progress from pending to terminal success or failure rather than creating unrelated message rows for each state transition.

### 4. Terminal outcomes

The runtime must return a structured terminal outcome that lets the orchestrator continue normal behavior.

At minimum, the runtime must support:

- success
- failure with fallback-to-agent
- failure without fallback-to-agent if a use case ever requires that later

For the currently migrated use cases, failure must continue to allow the workflow to fall back to the authored manual AI instructions for that step.

## Orchestration Requirements

### 1. Orchestration remains external

This capability must not decide when a workflow step should run.

That remains owned by the existing orchestrator that invokes it.

For the delivered scope, that means deterministic workflow progression remains the owner of:

- determining that the supported step is active
- deciding that the zero-input deterministic capability should run
- continuing normal progression once the capability returns

### 2. Deterministic progression compatibility

After a successful deterministic operation, the system must return to the existing deterministic progression machinery first.

The new capability must not directly advance checklist state on its own.

### 3. Fallback compatibility

If the deterministic operation fails and the use case is configured for fallback, the capability must return control so the workflow can continue using the existing authored fallback instructions for that step.

## UI Requirements

### 1. Non-interactive status notifications

The UI must render:

- pending status
- success status
- failure status

These notifications must be:

- system-owned
- non-interactive
- visible in chat
- not treated as ordinary user/assistant conversational turns

### 2. Reuse existing shared status-row pattern

The implementation must reuse the existing shared status-row rendering pattern already present in [WorkflowPreparationStatusRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/WorkflowPreparationStatusRow.tsx) or a direct successor of that same shared pattern.

It must not introduce per-workflow bespoke JSX for the migrated use cases.

### 3. No form affordances

The UI for this capability must not expose workflow-form affordances such as:

- input fields
- submit buttons
- cancel buttons
- Back or Retry controls
- tool-dictionary modal entry points intended for interactive input collection

## Persistence And Resume Requirements

The capability must use existing task persistence seams.

The system must:

- persist one active non-interactive deterministic step-resolution session per task when needed
- restore the unresolved or in-flight status surface on reopen when appropriate
- clear the persisted session on terminal resolution or loss of the owning workflow context

The persisted session must be minimal and must not duplicate:

- workflow progression state already owned elsewhere
- tool execution result state already owned elsewhere
- model-visible conversational history

Minimum persisted state must be limited to the data needed to reconstruct the status lifecycle safely, such as:

- session/run id
- owner/trigger metadata
- definition payload or a version-safe reference to it
- current status state
- terminal error/fallback metadata if present

## Migrated Use Case Requirements

### 1. `code-review.md` Step 3

The migrated capability must preserve the current machine-checkable behavior for Step 3 review-input preparation:

- deterministic operation: `build_review_input`
- success classification: tool result indicates `persisted === true` and `review_input_available === true`
- diff-mismatch failure remains a fallback-to-agent outcome
- general failure remains a fallback-to-agent outcome
- success must return control so deterministic progression can continue with the existing workflow logic

### 2. `write-remediation-story.md` Step 2

The migrated capability must preserve the current machine-checkable behavior for Step 2 review-input preparation:

- deterministic operation: `build_review_input`
- success classification: tool result indicates `persisted === true` and `review_input_available === true`
- failure remains a fallback-to-agent outcome that returns control to the authored Step 2 fallback instructions

### 3. `quick-spec.md` Step 2

The migrated capability must preserve the current machine-checkable behavior for Step 2 tech-spec scaffold preparation:

- deterministic operation: `build_tech_spec_document`
- success classification: tool result indicates `persisted === true` and `output_file_available === true`
- failure remains a fallback-to-agent outcome that returns control to the authored Step 2 fallback instructions

## Boundary Requirements

### 1. Workflow Forms must shed automatic status

Once the migrated use cases are covered by the new capability, Workflow Forms must no longer own zero-input automatic status execution.

That means the migration must remove the automatic-status responsibility from:

- workflow-form shared payload definitions
- workflow-form runtime behavior
- workflow-form resolver configuration for the migrated use cases
- workflow-form documentation that still describes automatic status as part of Workflow Forms

### 2. Workflow Form v2 must not inherit this responsibility

The new non-interactive capability is the implemented boundary for this work.

Workflow Form v2 requirements and implementation must not carry forward zero-input deterministic step-resolution/status behavior as part of the form boundary.

## Regression Requirements

The implementation must add or update focused regression coverage for:

- shared definition/result-classification behavior
- runtime lifecycle behavior
- task integration and orchestration handoff
- chat rendering of pending/success/failure states
- migration of all three current automatic-status use cases

## Out Of Scope

The following are out of scope for this requirements set:

- interactive workflow forms
- workflow-form v2 panel graphs, Back, Retry, or conditional input flows
- workflow-start cards
- workflow-completion automation
- expanding deterministic support to unrelated workflows not already using automatic status
- rewriting the underlying business logic of `build_review_input` or `build_tech_spec_document`
