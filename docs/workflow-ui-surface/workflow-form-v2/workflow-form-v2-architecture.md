# Workflow Form V2 Architecture

## Purpose

This document defines the target architecture for Workflow Form v2.

It is not a requirements document. Its job is to:

- establish the correct architectural boundary for Workflow Forms
- map the agreed V2 direction onto the live runtime seams
- preserve broader platform invariants that the current runtime already depends on
- provide a stable basis for the later requirements and action-plan documents

This document is grounded in:

- the live workflow-form runtime in [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- the live workflow-form contracts in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts) and [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
- the live capability registry in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- the live runtime integration in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- the live trigger integration in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- the live webview rendering/submission path in [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx) and [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)
- the V1 assessment and gap analysis in [workflow-form-v1-assessment.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-assessment.md) and [workflow-form-v1-gaps.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-gaps.md)

## Current-State Summary

Remediation status note:

- the live runtime now follows the human-input-only boundary described in this document
- zero-input deterministic step execution/status now lives in the separate `workflow_step_resolution_status` capability
- Brainstorming Step 2 now uses the shared Workflow Form v2 runtime only when existing sessions are available for human choice
- Brainstorming Step 2 zero-session startup now resolves through zero-input `workflow_step_resolution_status`
- Brainstorming Step 4 now runs on the shared Workflow Form v2 runtime
- the runtime persists the full active `definitionPayload` and emits only resolved active-panel payloads to the webview

Workflow Form v1 already has one shared runtime, one shared transport, one shared renderer, and one shared persistence loop.

What is still too narrow in v1 is not reuse. It is the contract that reuse depends on.

Today the runtime still hard-codes:

- fixed phase names
- fixed Back behavior
- fixed Retry restart behavior
- a narrow shared session-context shape
- special handling for staged forms that resemble `confirm -> select_source -> collect_inputs`

That works for:

- `code-review.md` Step 2
- workflow-start forms
- simple one-panel interactive forms

but it does not cleanly express richer branching system-owned interactions such as:

- Brainstorming Step 2 existing-session human choice
- Brainstorming Step 4

The current implementation also still carries zero-human-input automatic workflow-step execution under the workflow-form umbrella. V2 should not carry that abstraction boundary forward.

## Architectural Scope

Workflow Form v2 is the shared capability for:

- rendering system-owned human-input workflow panels in chat
- supporting multi-panel and branching human-input flows
- validating submitted values
- handing validated outcomes off to runtime-owned deterministic execution
- resuming an in-progress input flow from persisted task metadata

Workflow Form v2 is not the shared capability for:

- zero-human-input automatic workflow-step execution/status
- workflow-step done-signal evaluation
- workflow-start orchestration policy
- deterministic progression policy
- slash-command activation policy
- direct tool execution ownership

Automatic zero-input workflow-step execution/status should move to a separate shared capability.

## Invariants

The following rules remain mandatory in V2.

- Raw human workflow-form inputs must not be replayed into model-visible prompt context.
- Workflow Forms must keep their dedicated ask/say and structured submission transport family.
- Workflow Forms must remain additive to existing runtime systems rather than replacing them.
- Workflow progression and slash-command activation remain authoritative for orchestration.
- Tool execution remains on the normal backend tool path.
- Workflow Form v2 must not become a second workflow engine.
- Persisted state must remain minimal and resumable.

## Core Decisions

### 1. One Shared Runtime, Driven By A Typed Definition Payload

Workflow Form v2 should remain one shared capability, but the runtime should be driven by a single typed workflow-form definition payload rather than by a fixed phase enum plus ad hoc resolver logic.

That typed definition payload is the primary V2 contract.

It must tell the shared runtime:

- which panels exist
- which panel is first
- which fields each panel contains
- which fields are required
- which actions are allowed on each panel
- which transitions are possible from each panel
- which static or dynamic options belong to a field
- which copy the UI should render for titles, prompts, labels, help text, and action labels

The shared runtime should validate that payload structurally, then execute it.

The runtime-owned definition payload is not the same thing as the per-render payload sent to the webview.

Workflow Form v2 should preserve a panel-by-panel runtime exchange:

- the backend/runtime retains the full declarative workflow-form definition plus session state
- the webview receives only the currently resolved panel payload needed for the active render
- the webview submits typed structured values for the active panel rather than a string-only raw-value bag
- after each panel submission, the runtime validates the typed submission, updates session state, evaluates transitions, runs deterministic operations if required, and then emits the next resolved panel payload

The V2 transport therefore needs to evolve in two dimensions:

- the runtime-owned definition payload is typed
- the workflow-form submission transport is also typed

Workflow Form v2 should not preserve V1's string-first submission assumption at the transport seam for field kinds such as:

- `boolean`
- `multi_select`
- `checkbox_group`
- `large_text` with `array`
- `large_text` with `object`
- `date`
- `date_time`
- `file_path`
- `directory_path`
- `artifact_picker`

### 2. Outer Orchestration Still Decides When To Invoke Workflow Forms

Workflow Form v2 should not decide whether it ought to run for a workflow step.

That decision remains outside the capability in the existing orchestration layers:

- workflow-start activation path
- deterministic in-workflow step progression

If the orchestrator provides a valid V2 workflow-form definition payload, the shared workflow-form runtime should run it.

The runtime may reject structurally invalid payloads, but it should not apply a second business-level “should this open?” gate.

### 3. The V2 State Model Has Three Layers

Workflow Form v2 should separate state into three distinct layers.

#### A. Form-definition payload

This is the typed contract that defines the active workflow-form flow.

It replaces most of what v1 currently spreads across:

- fixed phase names
- bespoke staged-form helpers
- one-off session-context fields

The full form-definition payload belongs to runtime/session state, not to a permanent full-graph payload cached in the webview.

#### B. Session values

These are the user-entered or user-selected values collected so far.

This remains a separate layer from the form-definition payload.

#### C. Minimal runtime metadata

This includes only the minimum runtime state needed to resume the flow safely, such as:

- session id
- current panel id
- owner/trigger metadata
- payload/schema version metadata if needed for resume safety

V2 should not rely on a growing bag of one-off shared session-context properties.

### 4. Panel Graph, Not Fixed Phase Names

V2 should replace the current fixed phase model as the primary sequencing mechanism with a declarative panel graph.

The graph must support:

- arbitrary named panels
- sequential transitions
- conditional transitions
- branch destinations
- terminal transitions that hand off to runtime-owned deterministic execution

The current runtime lifecycle concerns should remain shared and runtime-owned:

- entry into the form session
- active panel rendering
- validation failure / recovery
- terminal success handoff
- per-panel resolution after each submission
- transition evaluation between panels
- deterministic-operation pause/rebuild behavior

This preserves the architectural protections v1 was providing without forcing workflows to pretend their panels are `confirm`, `select_source`, or `collect_inputs`.

### 5. Conditional Panels Are First-Class

Conditional panels should be part of the shared capability, not a bespoke pattern reconstructed per use case.

The payload must be able to declare:

- which answers affect downstream panels
- which branch activates which panel
- which fields belong to which branch
- which downstream values become stale when an upstream choice changes

This is the V2 mechanism that lets Brainstorming Step 4 and the current Code Review Step 2 both fit naturally in one shared model.

Conditionality must also exist below the panel level.

The shared capability must support field-level conditional behavior within a panel, including:

- fields whose visibility depends on upstream answers
- fields whose allowed options depend on upstream answers
- fields whose allowed value types or validation rules depend on upstream answers
- fields whose displayed content depends on upstream answers or on deterministic-operation-produced session state

V2 should not require a separate duplicate panel definition every time the panel itself stays the same but one field, one dropdown option set, or one validation rule changes based on prior state.

### 6. Back And Retry Are Shared Runtime Behaviors

Back and Retry should remain runtime-owned behaviors, but they should be driven by the panel graph rather than by fixed phase names.

#### Back

- Back returns to the actual prior logical panel for the current branch
- Back is not shown on the first panel of a workflow form
- Back applies shared stale-value-clearing rules when moving upstream

#### Retry

- Retry is a failure-recovery action
- Retry restarts from the first panel of the workflow form
- Retry clears downstream values appropriately when restarting

### 7. Branch Outcomes May Either Advance Panels Or Run Deterministic Operations

The V2 graph must support more than “go to the next panel.”

For some workflows, a successful panel submission needs to do one of two things:

- advance to another panel
- trigger an immediate deterministic backend operation

This is required to express flows like the Brainstorming Step 2 existing-session choice path directly through the shared workflow-form capability:

- one branch continues the newest session
- one branch starts a new session
- one branch advances to a later panel for explicit selection

The zero-session Brainstorming Step 2 startup path does not need a workflow form. That automatic create-session path now belongs to `workflow_step_resolution_status`.

The runtime therefore needs a typed way to represent deterministic-operation transition points instead of always routing directly to another panel.

Those transition points must support both:

- terminal deterministic operations that end the workflow-form flow
- non-terminal deterministic operations that enrich workflow-form session state and then continue the flow

For non-terminal deterministic operations, the required runtime behavior is:

- the panel submission reaches a declared deterministic-operation transition point
- the runtime pauses panel progression
- the runtime executes the declared deterministic backend operation through the normal backend tool path
- the runtime merges the operation result into workflow-form session state
- the runtime rebuilds the active workflow-form definition from the updated session state
- only then does the runtime determine and render the next panel

This is required for cases where deterministic backend work affects:

- which panel comes next
- which branch is active
- which fields appear on the next panel
- which dropdown options are available
- which operation-produced result content the next panel must display

### 8. Deterministic Execution Stays Runtime-Owned

Workflow Form v2 should not execute tools directly from the webview or from arbitrary payload logic.

The correct ownership remains:

- the webview submits structured values
- the shared runtime validates the active panel
- the runtime resolves the declared transition outcome of that panel
- if the transition requires deterministic execution, runtime-owned code builds the canonical backend tool request and executes it through the normal tool path
- if that deterministic execution is non-terminal, the runtime merges the operation result into workflow-form session state before rebuilding the next panel

This preserves the broader platform rule that tool execution stays on the existing backend execution path.

### 9. The Webview Receives Resolved Panels, Not Runtime Graph Ownership

Workflow Form v2 should preserve a clear ownership boundary between runtime and webview.

The webview should receive the currently resolved panel payload and submit structured values for that panel.

The webview should not become the owner of:

- the full workflow-form graph
- transition evaluation
- conditional logic resolution
- deterministic-operation orchestration
- operation-result-to-state merging

Those remain runtime-owned responsibilities.

### 10. Tool-Contract Alignment Remains A First-Class Rule

The live repo already has a schema/tool-contract helper layer in [schema.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts).

V2 should preserve that principle:

- when a field corresponds to a tool-backed input, the field’s typing should come from the canonical tool contract whenever possible
- schema-driven derivation remains the default
- workflow-specific copy, ordering, and branching remain allowed on top of that

This preserves compatibility with current code-review behavior and avoids inventing a parallel input-contract system.

### 11. Workflow Forms And Automatic Workflow-Step Status Must Be Split

V1 currently treats interactive forms and automatic zero-input workflow-step execution/status as one capability.

V2 should not preserve that boundary.

Workflow Form v2 should be scoped to human-input workflow interactions only.

Automatic workflow-step execution/status should move to a separate shared capability that can:

- run zero-input deterministic workflow-owned work
- surface pending/success/failure notices in the UI
- return control to deterministic progression

That keeps Workflow Form v2 aligned with its actual purpose.

## V2 Contract Shape

The exact type names are deferred to the requirements document, but the architecture requires a contract with the following shape.

### Workflow-form definition payload

Must include:

- stable payload/version identifier
- panel definitions keyed by panel id
- first panel id
- field definitions with:
  - label
  - help text
  - presentation hints
  - requiredness
  - value typing
  - static or dynamic options
- panel actions
- transition definitions
- dependency/reset declarations
- tool/reference/help content shown to the user

### Session record

Must include only:

- session id
- trigger/owner metadata
- current panel id
- collected values
- last failure state if present
- persisted copy of the active form-definition payload or an equivalent version-safe reference

## Current Code Seams V2 Should Evolve

### Shared contract seam

[ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)

V2 should evolve the shared payload away from fixed phase semantics and toward panel ids plus typed transition/action definitions.

### Runtime seam

[WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)

V2 should replace:

- fixed phase progression
- special `select_source` handling
- phase-specific Back behavior
- phase-specific Retry restart behavior

with a graph-driven panel runtime.

### Capability-owned definition seam

[WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)

The current resolver registry is the natural migration seam.

In V2, this layer should evolve from:

- phase-driven mini-engines

to:

- producers of typed workflow-form definition payloads
- producers of deterministic operation handoff metadata needed by the runtime

The exact naming can be settled later. The important architectural change is declarative flow definition rather than per-phase procedural control flow.

### Trigger/orchestration seam

[WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts) and [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)

These remain orchestration-owned seams.

V2 should preserve:

- slash-command startup invocation
- in-workflow deterministic-step invocation

while eliminating the architectural need for handler-owned orchestration workarounds like the current Brainstorming Step 2 pattern.

### Webview seam

[ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx) and [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)

V2 should render panels generically from the typed payload rather than from fixed phase cases.

The webview should remain structurally dumb:

- render the declared panel
- render the declared fields and actions
- submit structured values

It should not own workflow-specific branching logic.

## Compatibility Constraints

V2 must preserve these behaviors from the live platform.

### 1. Workflow-start compatibility

The current Step 1 workflow-start path must still be representable as a single-panel workflow form invoked from the slash-command startup path.

### 2. Code Review compatibility

The current Code Review Step 2 staged diff-source interaction must map cleanly onto the V2 panel-graph model without changing its user-visible semantics unnecessarily.

### 3. Brainstorming compatibility

Brainstorming Step 2 existing-session human choice and Brainstorming Step 4 must be representable directly through the shared workflow-form capability without requiring handler-owned orchestration solely to compensate for missing form capabilities.

Brainstorming Step 2 zero-session startup is a separate zero-input deterministic use case and belongs to `workflow_step_resolution_status`, not Workflow Form v2.

### 4. Persistence/resume compatibility

Task metadata persistence remains the persistence seam.

V2 must not introduce a second persistence subsystem or separate workflow state engine.

### 5. Tool-path compatibility

Validated workflow-form outcomes must still execute through the normal backend tool path rather than through a parallel execution model.

## Migration Guidance

The architecture does not require an all-at-once replacement.

A safe migration shape is:

1. Introduce the V2 typed definition payload and graph-driven runtime behind the existing workflow-form capability boundary.
2. Prove compatibility by expressing:
   - workflow-start
   - Code Review Step 2
3. Add the missing branching/direct-operation support needed for the Brainstorming Step 2 existing-session choice flow and Brainstorming Step 4.
4. Migrate automatic zero-input workflow-step execution/status onto its own shared capability instead of carrying that responsibility into Workflow Form v2.

## Explicit Non-Goals

This architecture does not define:

- the detailed requirements for every field or transition property
- the exact final TypeScript interface names
- the separate automatic workflow-step execution/status capability
- migration timing for every current V1 use case

Those belong in follow-on requirements and planning documents.

## Bottom Line

Workflow Form v2 should remain one shared capability, but it should become a truly declarative, typed, panel-graph-driven runtime for human-input workflow interactions.

It should preserve the platform rules that already matter:

- external orchestration remains external
- tool execution remains backend-owned
- persistence remains minimal
- raw human input stays out of model context

And it should stop carrying concerns that do not belong inside workflow forms:

- fixed phase semantics
- handler-owned orchestration workarounds
- zero-input automatic workflow-step execution/status
