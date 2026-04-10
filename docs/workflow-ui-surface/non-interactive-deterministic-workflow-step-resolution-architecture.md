# Non-Interactive Deterministic Workflow Step Resolution Architecture

## Purpose

This document defines the architecture for a separate shared capability that handles zero-human-input deterministic workflow-step resolution and user-visible status notifications in chat.

It is not a requirements document. Its job is to:

- establish the correct boundary for zero-input system-owned workflow steps
- map that boundary onto the live runtime seams that currently carry `automatic_status` inside Workflow Forms
- preserve broader platform architecture rules while removing this responsibility from Workflow Form v2
- provide the architectural foundation for a later requirements and action-plan document

This document is grounded in:

- the current workflow-form runtime in [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- the current automatic-status resolver definitions in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- the task-loop orchestration in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- the current shared payload contract in [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
- the current chat renderer in [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)
- the reusable status-row component in [WorkflowPreparationStatusRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/WorkflowPreparationStatusRow.tsx)
- the original automatic-status buildout doc in [automatic-workflow-preparation-status-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/automatic-workflow-preparation-status-action-plan.md)
- the Workflow Form v2 architecture in [workflow-form-v2-architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md)

## Current-State Summary

The live repo already has a shared zero-input workflow-step pattern, but it is currently carried inside the Workflow Form capability through:

- `definition.presentation.kind === "automatic_status"` in [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L439)
- automatic-status resolver entries in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L500)
- automatic-status handling branches inside [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L78) and [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1878)
- rendering through the workflow-form message type in [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L615)

That path is used today for zero-human-input workflow-owned steps such as:

- `code-review.md` Step 3 review-input preparation
- `write-remediation-story.md` Step 2 review-input preparation
- `quick-spec.md` Step 2 tech-spec scaffold preparation

The important finding is:

- the live code already proves there is a reusable shared runtime pattern for non-interactive deterministic workflow-step execution
- but that pattern is living under the wrong capability boundary

This architecture separates that concern into its own central capability.

## Architectural Scope

This capability is the shared system for:

- launching zero-human-input system-owned workflow-step execution
- surfacing pending/success/failure status notifications in chat
- executing a deterministic backend operation through the normal tool path
- returning control to deterministic workflow progression
- persisting enough runtime state to survive resume when necessary

This capability is not the shared system for:

- collecting human input
- rendering staged or branching input forms
- validating interactive field values
- owning workflow-step done-signal policy
- owning workflow orchestration policy
- executing tools outside the normal backend tool path

Workflow Forms and non-interactive deterministic workflow-step resolution are adjacent capabilities, not one capability.

## Invariants

The following platform rules remain mandatory.

- Workflow progression remains authoritative for when a zero-input system-owned step may run.
- Slash-command activation remains authoritative for startup orchestration when relevant.
- Backend tool execution stays on the normal task/tool path.
- The capability remains additive to existing runtime systems rather than replacing them.
- The chat surface remains system-owned and non-interactive for this capability.
- No raw workflow-owned step execution details are replayed into model context beyond the normal runtime effects already allowed by the platform.
- The capability must not introduce a second workflow engine or a second deterministic progression system.

## Core Decisions

### 1. This Must Be A Separate Shared Capability

Zero-human-input deterministic workflow-step execution/status should not remain part of Workflow Forms.

Workflow Forms are for:

- collecting human input
- driving branching/staged human-input UX

This capability is for:

- deterministic backend execution with no human input
- system-owned status notifications

Those are different responsibilities and should be modeled separately.

### 2. Orchestration Stays External

This capability should not decide whether a workflow step should run.

That remains owned by the existing orchestrators:

- deterministic workflow progression
- startup orchestration paths where applicable

The orchestrator decides when a non-interactive deterministic workflow step should run and provides the capability with the typed payload needed to do that work.

### 3. One Shared Runtime, Driven By A Typed Step-Resolution Payload

The capability should be driven by one typed payload that tells the central runtime:

- which workflow-owned deterministic step is being resolved
- which backend deterministic operation should run
- what status labels or copy the UI should show
- how success/failure/fallback should be classified from the operation result
- what runtime-owned metadata is needed for ownership and resumption

This is the non-interactive counterpart to the typed workflow-form definition payload in Workflow Form v2.

### 4. Status Notification Is A First-Class Part Of The Capability

The user must be able to see what is happening when a zero-input system-owned workflow step runs.

The capability therefore owns the lifecycle of:

- pending notification
- success notification
- failure notification

This notification path should be non-interactive and should not move the thread into an awaiting-user-response state.

### 5. Deterministic Operation Execution Remains Runtime-Owned

This capability should not execute tools from the renderer or from arbitrary UI logic.

The correct ownership remains:

- orchestrator hands the runtime a valid step-resolution payload
- runtime emits a pending status notification
- runtime executes the deterministic backend operation through the normal tool path
- runtime classifies the operation result
- runtime emits terminal success or failure notification
- runtime returns control to deterministic workflow progression

### 6. Result Classification Belongs In The Shared Capability Contract

The live automatic-status path currently duplicates success/failure/fallback result interpretation in resolver code.

This separate capability should absorb that concern into its own typed contract.

The contract must support:

- success classification
- failure classification
- fallback-to-agent classification when applicable

without requiring each use case to hand-roll nearly identical result handling in the old workflow-form resolver layer.

### 7. Chat Rendering Should Reuse Existing Shared Status UI

The repo already has a reusable non-interactive status-row component in [WorkflowPreparationStatusRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/WorkflowPreparationStatusRow.tsx).

The new capability should reuse that kind of shared component pattern instead of introducing workflow-specific JSX branches.

The capability should own a dedicated payload/contract, but it should reuse the existing chat/status rendering architecture where that is already appropriate.

### 8. Persistence Should Be Minimal

The capability may need resumability just like workflow forms, but it should persist only the minimum runtime state needed to continue or recover safely.

That likely includes:

- session id or run id
- owner/trigger metadata
- active step-resolution payload or version-safe reference
- current status state
- terminal error/fallback metadata if needed

It must not duplicate workflow progression state already owned elsewhere.

## Proposed Capability Shape

The exact type names are deferred to the later requirements document, but the architecture requires the following conceptual pieces.

### A. Typed step-resolution definition payload

Must declare:

- stable payload/version identifier
- workflow/step ownership metadata
- deterministic operation definition or canonical operation reference
- pending/success/failure labels or copy
- result-classification rules
- fallback policy when the deterministic operation fails

### B. Runtime session record

Must contain only:

- runtime id
- owner/trigger metadata
- current status state
- minimal persisted step-resolution payload or version-safe reference
- failure/fallback metadata if present

### C. Shared runtime

Must:

- accept or resume a session
- render pending notification
- execute the deterministic operation
- classify the result
- render success/failure notification
- clear or suppress the session as appropriate
- return control to deterministic workflow progression

### D. Dedicated shared payload/transport family

This capability should not keep reusing the `workflow_form` message type once it is split out.

The architecture should move toward a dedicated payload/transport family for non-interactive deterministic workflow-step resolution, because:

- there is no user submission step
- the capability is not a form
- the capability’s contract is status-driven, not input-driven

The exact message naming can be finalized later, but it should be separate from Workflow Forms.

## Current Code Seams This Capability Should Evolve

### Shared payload seam

[ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)

Today `automatic_status` is embedded inside the workflow-form payload.

This new capability should move to its own dedicated payload contract rather than continuing to overload the workflow-form contract.

### Runtime seam

[WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)

The new capability should absorb and replace the current automatic-status-specific runtime behavior now embedded in:

- `buildPayload(...)` pending automatic-status handling
- `buildSuccessPayload(...)` automatic-status success handling
- `buildFailurePayload(...)` failure-card handling

Those concerns belong in the new capability’s runtime, not in Workflow Form v2.

### Registry/config seam

[WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)

The current automatic builders prove the pattern, but they live in the wrong registry.

This capability needs its own shared definition/config seam for entries such as:

- code-review Step 3 review-input preparation
- write-remediation-story Step 2 review-input preparation
- quick-spec Step 2 tech-spec scaffold preparation

That seam should own:

- deterministic operation configuration
- result classification
- status copy

It should not live under the workflow-form resolver registry once the split happens.

### Task-loop orchestration seam

[index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)

The task-loop branch that currently detects `payload.definition.presentation?.kind === "automatic_status"` should move out of the workflow-form decision loop.

The task loop should instead:

- decide that a non-interactive deterministic workflow step should run
- create or resume a session for the new capability
- hand execution to that capability’s runtime
- let that runtime return a success/failure/fallback outcome
- then return to deterministic progression

### Chat/UI seam

[ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx) and [WorkflowPreparationStatusRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/WorkflowPreparationStatusRow.tsx)

The reusable status-row rendering should remain reusable, but it should be rendered from a dedicated capability payload rather than from `workflow_form` payloads carrying `automaticStatusState`.

## Relationship To Workflow Form V2

These two capabilities are siblings.

### Workflow Form v2 owns:

- human-input workflow interactions
- multi-panel input flows
- conditional and branching input UX
- user submission validation

### Non-interactive deterministic workflow-step resolution owns:

- zero-human-input system-owned workflow-step execution
- pending/success/failure status notifications
- deterministic operation result classification
- fallback-to-agent handoff when deterministic execution fails

The orchestrator may invoke either capability depending on the needs of the current workflow step.

## Compatibility Constraints

This new capability must preserve the live platform behavior that matters.

### 1. Code Review compatibility

The current Code Review Step 3 behavior must remain representable:

- pending notification
- deterministic review-input build
- terminal success or fallback notification
- return to deterministic progression

### 2. Write Remediation Story compatibility

The current Step 2 review-input build flow must migrate cleanly onto the new capability.

### 3. Quick Spec compatibility

The current Step 2 tech-spec scaffold build flow must migrate cleanly onto the new capability.

### 4. Deterministic progression compatibility

The capability must still return control to the existing deterministic progression machinery rather than introducing a parallel completion path.

### 5. Tool-path compatibility

Deterministic operations must still execute through the normal backend tool path.

## Migration Guidance

The architecture does not require a big-bang rewrite.

A safe migration sequence is:

1. Introduce the new shared payload/definition contract and runtime for non-interactive deterministic workflow-step resolution.
2. Reuse the existing shared status-row component pattern in chat.
3. Migrate:
   - Code Review Step 3
   - Write Remediation Story Step 2
   - Quick Spec Step 2
4. Remove `automatic_status` from the workflow-form boundary once the migrated use cases are covered.
5. Reconcile older V1 docs that currently describe automatic-status as part of Workflow Forms.

## Explicit Non-Goals

This architecture does not define:

- the exact final payload/interface names
- the exact status-copy conventions for every workflow
- the full requirements for the new capability
- migration timing for every existing automatic-status use case

Those belong in the later requirements and planning documents.

## Bottom Line

The live repo already demonstrates a real shared pattern for zero-human-input deterministic workflow-step execution with user-visible status.

The problem is not that the pattern does not exist.

The problem is that the pattern currently lives under the wrong capability boundary.

The correct fix is:

- formalize that pattern as its own central shared capability
- move automatic builders onto it
- keep Workflow Form v2 focused on human-input workflow interactions
