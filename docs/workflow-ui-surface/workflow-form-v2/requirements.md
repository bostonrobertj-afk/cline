# Workflow Form V2 Requirements

## Purpose

This document defines the requirements for Workflow Form v2.

It translates:

- [workflow-form-v2-architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md)
- [workflow-form-v1-assessment.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-assessment.md)
- [workflow-form-v1-gaps.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-gaps.md)

into a concrete V2 contract that must be carried through into a complete implementation action plan.

This document is also grounded in the live Workflow Form v1 seams in:

- [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts)
- [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
- [schema.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts)
- [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)

## Core Requirement

The system must support one shared Workflow Form v2 capability that:

- is invoked by an existing runtime orchestrator when a supported human-input workflow interaction should open
- renders system-owned workflow panels in chat from one typed definition payload
- accepts typed structured panel submissions rather than a string-only submission transport
- supports multi-panel and branching panel flows
- validates submitted values against the declared contract and canonical tool contract
- allows successful panel submission to either:
  - advance to another panel
  - or hand off to runtime-owned deterministic execution
- persists only the state needed to resume an in-progress form session safely

Workflow Form v2 must replace Workflow Form v1’s phase-driven staged model across the shared workflow-form capability for the full V2 scope defined in this document.

## Completion Standard

Remediation status note:

- the live runtime now separates Workflow Form v2 from zero-input `workflow_step_resolution_status`
- workflow-start `One of:` requirements are enforced in the shared runtime
- integer submission transport is typed and no longer truncates decimal input
- Brainstorming Step 2 existing-session human choice and Brainstorming Step 4 are part of the live Workflow Form v2 scope
- Brainstorming Step 2 zero-session startup now resolves through zero-input `workflow_step_resolution_status`

Workflow Form v2 is not complete when only part of the contract exists.

The V2 body of work must be treated as incomplete unless all of the following are true:

- the shared contract supports the full V2 field model
- the shared contract supports the full V2 transition model
- the shared runtime supports graph-driven panel execution rather than phase-name-driven execution
- the shared renderer supports the V2 panel and field model generically
- the persistence layer supports V2 sessions correctly
- the in-scope workflow experiences named in this document are migrated onto the V2 capability
- the regression suite covers the V2 contract comprehensively
- the affected documentation set is reconciled comprehensively

Partial delivery of isolated pieces of the V2 contract is not an acceptable end state for this workstream.

## Architectural Invariants

Everything below is mandatory.

### 1. Workflow Form v2 remains a human-input capability

Workflow Form v2 must not own:

- zero-human-input automatic workflow-step execution/status
- workflow done-signal evaluation
- deterministic progression policy
- slash-command activation policy
- direct tool execution ownership

Those concerns remain outside the Workflow Form v2 boundary.

### 2. Orchestration remains external

Workflow Form v2 must not decide whether it should open.

That remains owned by the existing orchestrators:

- workflow-start activation
- deterministic in-workflow step progression

The Workflow Form v2 runtime may reject a structurally invalid payload, but it must not apply a second business-level “should this open?” gate.

### 3. Backend tool execution remains authoritative

Workflow Form v2 must not execute tools directly from the webview.

The required ownership remains:

- the webview renders panels and submits structured values
- the runtime validates the active panel
- the runtime resolves the panel outcome
- runtime-owned deterministic execution builds the canonical backend tool request and executes it through the normal tool path

### 4. Raw human inputs must stay out of model-visible context

Workflow Form v2 must preserve the current platform rule that human-entered workflow-form inputs are not replayed into ordinary model-visible conversational context.

### 5. Persistence remains minimal

Workflow Form v2 must use existing task metadata persistence seams and must not introduce:

- a second persistence subsystem
- a hidden per-use-case state bag
- duplicated workflow progression state

## Delivered V2 Scope

This requirements set covers the complete Workflow Form v2 workstream needed to deliver:

- the shared V2 payload/contract layer
- the shared graph-driven runtime
- the shared webview rendering/submission layer
- the shared persistence/resume layer
- the shared orchestration integration points needed for Workflow Forms
- the full documentation reconciliation set required by the new contract
- the full regression coverage required by the new contract
- migration of these in-scope human-input workflow experiences:
  - workflow-start forms
  - Code Review Step 2
  - Brainstorming Step 2 existing-session human choice
  - Brainstorming Step 4

This requirements set does not cover:

- the separate non-interactive workflow-step resolution capability
- workflow-completion automation
- workflow-start cards

## Contract Requirements

### 1. One typed workflow-form definition payload

Workflow Form v2 must be driven by one typed definition payload.

The payload must declare all of the following:

- a stable payload/version identifier
- panel definitions keyed by stable panel id
- the first panel id
- field definitions for each panel
- per-panel allowed actions
- per-panel transition definitions
- dependency/reset declarations
- field-level conditional rules
- the copy required by the UI
- the deterministic-operation handoff metadata required when a panel resolves into backend execution
- the deterministic-operation result-mapping metadata required when backend execution must update workflow-form session state before the next panel is built

The implementation must not ship a subset contract that only supports some of the required field, panel, or transition properties while deferring the rest to follow-on work inside this same V2 workstream.

The runtime-owned V2 definition payload is not the same thing as the per-render panel payload sent to the webview.

The implementation must support:

- one runtime-owned full definition payload for the active workflow-form session
- one per-render resolved panel payload for the currently active panel

### 1A. Typed submission transport

Workflow Form v2 must also use a typed submission transport.

The V2 submission path must not preserve V1's string-only `rawValue` assumption as the canonical transport shape.

The transport must be able to carry the submitted value in a type-safe way for the active field kind and allowed value type, including where applicable:

- `string`
- `boolean`
- `integer`
- `number`
- `array`
- `object`
- typed multi-value selections for `multi_select`, `checkbox_group`, and any multi-select dropdown mode

The runtime may still normalize or validate submitted values after receipt, but the submission transport itself must be typed rather than relying on runtime reparsing of a string-only payload for every field kind.

### 2. Three-layer state model

The V2 design must preserve these separate layers:

#### A. Form-definition payload

The declared contract that defines the flow.

#### B. Session values

The values collected from the user so far.

#### C. Minimal runtime metadata

Only the data needed to resume the form safely, such as:

- session id
- current panel id
- owner/trigger metadata
- last failure state if present
- payload/schema version metadata if needed

The active session must also retain the runtime-owned V2 definition payload or an equivalent version-safe representation of that full definition so the runtime can continue evaluating transitions after each panel submission.

## Field Model Requirements

### 1. Shared field input types

Workflow Form v2 must support these shared input types:

- `dropdown`
- `boolean`
- `small_text`
- `large_text`
- `number`
- `multi_select`
- `radio_group`
- `checkbox_group`
- `date`
- `date_time`
- `file_path`
- `directory_path`
- `artifact_picker`
- `markdown_display`
- `static_notice`

V2 must not rely on the V1 control names as the primary field model.

The webview may still render these shared types using whatever lower-level controls it needs, but the V2 payload contract must expose the semantic field type above.

The V2 implementation must deliver this broader field taxonomy as part of the shared capability rather than treating the second-wave field kinds as deferred enhancements.

The V2 field model must also distinguish clearly between:

- field kind
- allowed value type

Those are separate concerns and must not be collapsed into one contract property.

### 2. Dropdown requirements

A `dropdown` field must declare:

- its selectable options
- whether it allows:
  - one selection
  - a fixed number of selections
  - unlimited selections

The V2 payload must therefore support explicit dropdown selection cardinality.

The contract must explicitly express all of the following selection cardinality modes:

- `single`
- `fixed_count`
- `unbounded`

If the dropdown uses `fixed_count`, the payload must also declare the exact required selection count.

The runtime must enforce the declared selection cardinality before allowing the panel to resolve.

V2 must not ship with only single-select dropdown support while deferring fixed-count or unbounded multi-select behavior.

### 3. Multi-select and checkbox-group requirements

`multi_select` and `checkbox_group` fields must support:

- selectable options
- explicit minimum-selection rules when required
- explicit fixed-count rules when applicable
- unbounded selection when allowed

When a fixed count is declared, the runtime must enforce the exact required count before allowing the panel to resolve.

The submitted value for `multi_select` and `checkbox_group` must be an ordered or canonicalized array shape defined by the shared contract.

### 4. Dropdown option requirements

Each dropdown option must support:

- canonical value
- label
- optional descriptive/help text

V2 must support both:

- static options embedded directly in the payload
- dynamic options supplied as part of the payload for the active invocation

The contract must also support dropdown options whose allowed set is conditional on upstream session state without requiring the entire panel to be duplicated for each option set.

### 5. Boolean requirements

A `boolean` field is a first-class V2 field type.

It must not be modeled as a disguised dropdown solely because the current renderer can do that internally.

A `boolean` field must support:

- label
- help text
- requiredness
- explicit true/false presentation labels when needed

The runtime must validate the submitted value as boolean according to the shared contract.

### 6. Small-text requirements

A `small_text` field is the V2 single-line text-entry field.

It must support all of the following:

- label
- help text
- requiredness
- placeholder text
- declared allowed value type

`small_text` must support these allowed value types:

- `string`
- `integer`

The runtime must validate the submitted value against the declared allowed type before the panel can resolve.

### 7. Large-text requirements

A `large_text` field is the V2 multi-line text-entry field.

It must support all of the following:

- label
- help text
- requiredness
- placeholder text
- declared allowed value type

`large_text` must support these allowed value types:

- `string`
- `array`
- `object`

The runtime must validate the submitted value against the declared allowed type before the panel can resolve.

V2 must not defer `array` or `object` support for `large_text` fields to a later enhancement inside this workstream.

### 8. Number requirements

A `number` field is a first-class numeric-entry field.

It must support:

- label
- help text
- requiredness
- placeholder text
- declared numeric subtype

At minimum, the shared contract must support:

- `integer`
- `number`

The runtime must validate the submitted value against the declared numeric subtype before the panel can resolve.

### 9. Date and date-time requirements

`date` and `date_time` are first-class V2 field types.

They must support:

- label
- help text
- requiredness
- placeholder text or format hint when needed

The runtime must validate submitted values against the declared shared contract for those field kinds.

### 10. Path and artifact selection requirements

`file_path`, `directory_path`, and `artifact_picker` are first-class V2 field types.

They must support:

- label
- help text
- requiredness
- any declared selection constraints

The V2 contract must allow these field kinds even if some use cases render them initially through simpler controls while richer picker UX is implemented.

The field taxonomy must still expose them explicitly so future workflows do not need bespoke payload conventions to represent them.

### 11. Non-input field requirements

`markdown_display` and `static_notice` are first-class V2 field kinds for rendering non-editable content within a panel.

They must support:

- declarative display content
- placement within the panel field list
- conditional visibility based on session state

These field kinds are part of Workflow Form v2 because a panel may need to show structured result content or guidance alongside editable inputs.

### 12. Text-value validation requirements

For V2 text-entry fields:

- `small_text` with `integer` must reject non-integer input
- `large_text` with `array` must reject invalid array input
- `large_text` with `object` must reject invalid object input
- `large_text` with `string` must preserve multiline text as text rather than forcing structured parsing

Where a field is tool-backed, V2 must align those validations with the canonical tool contract whenever possible.

### 13. General field-kind validation requirements

The runtime must validate submitted values according to the declared field kind and allowed value type combination.

At minimum:

- `boolean` must validate as boolean
- `number` must validate as declared numeric subtype
- `dropdown` and `radio_group` must validate against allowed option values
- `multi_select` and `checkbox_group` must validate against allowed option values and declared count rules
- `date` and `date_time` must validate against the shared contract for those field kinds
- `file_path`, `directory_path`, and `artifact_picker` must validate according to their declared selection constraints
- non-input field kinds must not accept user-submitted values

### 14. Tool-contract alignment requirements

When a field corresponds to a tool-backed input:

- the field’s declared allowed type should come from the canonical tool contract whenever possible
- field derivation from tool schema remains the default
- workflow-specific copy, ordering, branching, and panel placement remain allowed on top of that

This preserves the schema-driven discipline already present in [schema.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts).

### 15. Field-level conditionality requirements

Workflow Form v2 must support field-level conditional behavior inside a panel.

That includes all of the following:

- fields whose visibility is conditional on upstream answers
- fields whose dropdown options are conditional on upstream answers
- fields whose allowed value type or validation is conditional on upstream answers
- fields whose displayed content is conditional on upstream answers or deterministic-operation-produced session state

The V2 implementation must not require duplicated panel definitions solely because one field, one option set, or one validation rule changes based on prior state.

When upstream input changes and a field-level conditional rule invalidates previously collected downstream input, the runtime must clear that stale value before the panel is rendered again.

## Panel Requirements

### 1. Panel shape

Each panel must be able to declare:

- panel id
- title
- prompt/body copy
- fields shown on that panel
- panel-specific action labels
- transition behavior for successful submission

The implementation must support the full required panel shape generically rather than shipping workflow-specific panel exceptions for missing contract features.

Panels must also be able to host field definitions whose actual visibility, options, or validation are conditional on current session state.

### 2. First-panel declaration

The V2 payload must explicitly declare the first panel of the workflow form.

Retry restart and initial entry must use that declared first panel rather than any hard-coded phase name.

### 3. Panel action requirements

The shared runtime must support these panel actions:

- submit
- cancel
- back
- retry

The payload must declare which of those actions are allowed on a given panel.

### 4. Back requirements

Back is a runtime-owned behavior.

The runtime must enforce:

- Back returns to the actual prior logical panel for the current branch
- Back is not shown on the first panel
- Back applies declared dependency/reset rules so stale downstream values are cleared when an upstream dependency changes

### 5. Retry requirements

Retry is a runtime-owned failure-recovery behavior.

The runtime must enforce:

- Retry restarts from the first panel of the workflow form
- Retry is only available from failure-recovery state
- Retry clears downstream values that no longer belong to the restarted flow

## Transition Requirements

### 1. Permitted transition families

Workflow Form v2 must support these graph-owned transition types:

- `sequential`
- `conditional`
- `deterministic_operation`

These are the only required transition families for V2.

The V2 implementation must support all three transition families in the shared capability.

It is not acceptable to ship only sequential transitions first and treat conditional or deterministic-operation transitions as deferred enhancements within the V2 workstream.

### 2. Sequential transitions

A `sequential` transition moves from the current panel to a declared next panel when submission succeeds.

The payload must declare the destination panel id explicitly.

### 3. Conditional transitions

A `conditional` transition routes to one of multiple panel destinations based on upstream submitted values.

The payload must be able to declare:

- which field or resolved answer is the condition source
- which values map to which destination panel ids

The runtime must use the submitted values plus the declared condition rules to determine the next panel.

### 4. Deterministic-operation transitions

A `deterministic_operation` transition runs runtime-owned deterministic backend execution at a transition point.

The payload must be able to declare the deterministic-operation handoff metadata required for the runtime to:

- identify the operation
- build the canonical backend tool request
- execute it through the normal tool path

The contract must support both:

- terminal deterministic-operation transitions that end the workflow-form flow
- non-terminal deterministic-operation transitions that update workflow-form session state and then continue the flow

For non-terminal deterministic-operation transitions, the payload must also be able to declare:

- where the operation result is written in workflow-form session state
- whether the next panel id is static or must be re-derived from the updated session state
- any result-dependent branching or panel-definition recomputation that occurs after the operation completes

### 5. Conditional stale-value rules

The payload must be able to declare which downstream values become stale when an upstream field changes.

The runtime must use those declarations to clear stale values when:

- the user goes Back and changes an upstream answer
- the user restarts through Retry
- a conditional branch change invalidates previously collected downstream values
- a field-level conditional rule changes the visible fields, allowed options, or allowed validation state within a downstream panel

## Runtime Requirements

### 1. Graph-driven runtime

Workflow Form v2 must replace phase-name-driven progression with a graph-driven runtime.

The runtime must no longer rely on hard-coded panel names such as:

- `confirm`
- `select_source`
- `collect_inputs`

as the primary sequencing model.

The V2 implementation must remove the architectural dependence on the V1 phase model for the in-scope V2 workflows named in this document.

### 2. Runtime-owned lifecycle

The runtime must still own these lifecycle concerns:

- entry into the form session
- active panel rendering
- validation failure / recovery
- terminal success handoff
- per-panel resolution after each submission
- transition evaluation between panels
- deterministic-operation pause/rebuild behavior

Those lifecycle concerns must be implemented in the shared runtime itself rather than reintroduced as bespoke per-workflow control flow to compensate for missing shared behavior.

### 3. Structural validation

The runtime must validate the definition payload structurally before running it.

It must reject payloads that do any of the following:

- declare a missing first panel
- reference nonexistent destination panels
- declare invalid dropdown cardinality
- declare an unsupported field type
- declare an unsupported allowed value type for a field

### 4. Submission validation

The runtime must validate all of the following before allowing a panel to resolve:

- requiredness
- dropdown selection-count rules
- declared allowed value types
- any one-of or dependency rules expressed by the payload
- any field-level conditional rules that affect visible fields, allowed options, or allowed validation state

### 5. Failure recovery

The runtime must preserve a shared failure-recovery state so the user can:

- retry from the first panel
- or use Back to revisit prior inputs where allowed

### 6. Deterministic-operation pause and rebuild behavior

When a panel resolves into a non-terminal `deterministic_operation` transition, the runtime must:

- pause panel progression
- execute the deterministic backend operation through the normal runtime tool path
- merge the operation result into workflow-form session state before any next panel is built
- rebuild the active V2 definition from the updated session state
- only then determine and render the next panel

The V2 implementation must not shortcut this by:

- rendering the next panel before the operation result has been applied
- treating operation results as ad hoc local UI state
- requiring workflow-specific runtime code outside the shared capability to manually rebuild the next panel

### 7. Panel-by-panel runtime exchange

Workflow Form v2 must operate as a panel-by-panel exchange between webview and runtime.

That means:

- the webview receives the currently resolved panel payload only
- the webview submits typed structured values for that panel only
- the runtime evaluates what happens next after each submission
- the runtime then emits the next resolved panel payload

The V2 implementation must not require the webview to hold or evaluate the full workflow-form graph in order to continue the flow.

The V2 implementation must also not rely on string-only submission payloads that recreate V1 parsing behavior behind a new panel contract.

## UI Requirements

### 1. Generic rendering

The webview must render panels generically from the typed V2 payload rather than from hard-coded phase names.

The V2 implementation must not ship new workflow-specific JSX branches as a substitute for missing shared panel or field support.

### 2. Structurally dumb webview

The webview must remain structurally dumb.

It may:

- render the declared panel
- render the declared fields
- render the declared allowed actions
- submit structured values

It must not own workflow-specific branching logic.

It must not own full-graph workflow-form progression logic either.

### 3. Required generic field rendering support

The shared renderer must support the V2 field types:

- `dropdown`
- `boolean`
- `small_text`
- `large_text`
- `number`
- `multi_select`
- `radio_group`
- `checkbox_group`
- `date`
- `date_time`
- `file_path`
- `directory_path`
- `artifact_picker`
- `markdown_display`
- `static_notice`

The webview must render those from the payload contract rather than from workflow-specific JSX branches.

### 4. Operation-produced panel rendering support

The shared renderer must be able to render panels whose displayed content, field options, or pathing were derived from deterministic-operation results already merged into workflow-form session state.

The webview must not own operation-result interpretation logic. It must only render the rebuilt payload it receives from the shared runtime.

### 5. Field-level conditional rendering support

The shared renderer must be able to render a panel whose fields, field visibility, dropdown options, or validation affordances changed because the runtime rebuilt the payload from updated session state.

The webview must not own field-level branching logic. It must only render the currently declared panel shape.

## Persistence And Resume Requirements

### 1. Existing persistence seam remains authoritative

Workflow Form v2 must persist and restore through existing task metadata seams.

### 2. Minimum persisted state

The persisted session must be limited to:

- session id
- owner/trigger metadata
- current panel id
- collected values
- operation-produced session data that is part of workflow-form session state for the active flow
- last failure state if present
- persisted copy of the active V2 definition payload or an equivalent version-safe reference

The V2 implementation must deliver real resume support for the V2 contract and must not defer payload-safe resume handling to a follow-on enhancement within this workstream.

### 3. Resume behavior

On resume, Workflow Form v2 must be able to reconstruct the active flow from the persisted V2 payload plus persisted session values.

If the active flow had already passed through one or more non-terminal deterministic-operation transitions, the persisted state must be sufficient to reconstruct the resulting downstream panels without rerunning those operations implicitly during resume.

## Compatibility Requirements

### 1. Workflow-start compatibility

The current Step 1 workflow-start path must still be representable as a single-panel V2 workflow form invoked from the slash-command startup path.

This compatibility must be delivered as part of the V2 workstream, not left on the V1 implementation path.

### 2. Code Review Step 2 compatibility

The current Code Review Step 2 flow must remain representable in V2 with equivalent user-visible behavior:

- staged source selection
- only branch-relevant downstream fields
- safe Back behavior that clears stale downstream state

This compatibility must be delivered as part of the V2 workstream, not treated as an optional proving ground that leaves the live use case on V1.

### 3. Brainstorming Step 2 compatibility

When one or more existing sessions exist, Brainstorming Step 2 must be representable directly in Workflow Form v2 without requiring handler-owned orchestration solely to compensate for missing form capabilities.

That existing-session path includes support for:

- a first panel with three branch choices
- branches that either:
  - trigger deterministic backend work immediately
- or advance to another declared panel
- non-terminal deterministic-operation transitions when backend work must update workflow-form session state before the next panel is built

When no existing sessions exist, the runtime may satisfy Brainstorming Step 2 through zero-input deterministic session creation without opening a workflow form.

This split compatibility is a required V2 outcome, not a later extension.

### 4. Brainstorming Step 4 compatibility

Brainstorming Step 4 must be representable directly in Workflow Form v2 with:

- conditional downstream panels
- branch-dependent field sets
- field-level conditional dropdown options and other field-level conditional behavior within a panel
- Back behavior that returns to the prior logical panel and clears stale downstream state
- deterministic-operation transitions whose results can feed later panels before the form completes

This compatibility is a required V2 outcome, not a later extension.

## Boundary Requirements

### 1. Workflow Forms must not own zero-input execution/status

Workflow Form v2 requirements and implementation must not carry forward zero-human-input deterministic workflow-step resolution/status.

That responsibility belongs to the separate non-interactive capability.

### 2. Workflow Forms remain one shared capability

Workflow Form v2 must not split into multiple parallel workflow-form systems for different workflows.

The same shared capability must serve:

- workflow-start
- Code Review Step 2
- Brainstorming Step 2 existing-session human choice
- Brainstorming Step 4

by consuming different typed definition payloads.

The V2 workstream must not leave any of the in-scope human-input workflow experiences on bespoke stopgap orchestration because the shared capability is still missing required features.

## Documentation Requirements

### 1. Documentation reconciliation is required work

The eventual Workflow Form v2 implementation action plan must include explicit documentation reconciliation work.

That work is required, not optional cleanup, follow-on enhancement, or deferred polish.

### 2. Documentation reconciliation must be comprehensive

When Workflow Form v2 is implemented, the action plan must perform a comprehensive documentation audit and update every affected in-repo document that would otherwise become misleading, incomplete, or stale.

This must include, but is not limited to:

- [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)
- [agent-101.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/agent-101.md)
- [workflow-form-v1-assessment.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-assessment.md)
- [workflow-form-v1-gaps.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-gaps.md)
- every older workflow-ui-surface document that still describes the V1 phase-driven workflow-form contract as current
- any adjacent workflow, runtime, or onboarding document whose guidance would become inaccurate because of the V2 contract

The action plan must not treat any affected documentation as outside scope merely because it is older, historical, or not part of the immediate implementation seam.

The documentation reconciliation work must be completed in the same V2 workstream rather than deferred to a later cleanup pass.

### 3. Documentation updates must reflect the V2 contract exactly

The documentation reconciliation work must update affected docs so they accurately describe:

- the V2 field model
- dropdown selection cardinality
- the permitted transition families
- the Back and Retry rules
- the declarative panel-graph model
- the split between Workflow Form v2 and the separate non-interactive workflow-step resolution capability

### 4. A comprehensive workflow-enablement guide is required

The documentation work must include a comprehensive, step-by-step guide for how to leverage Workflow Form v2 with additional workflows and additional workflow steps once the capability is deployed.

That guide must not be a short overview.

It must walk a future implementer through the full enablement path, including:

- how to determine whether a workflow interaction belongs in Workflow Form v2
- how to choose the correct orchestration entry path
- how to author the V2 definition payload
- how to choose field types and allowed value types correctly
- how to configure dropdown selection cardinality
- how to declare sequential, conditional, and deterministic-operation transitions
- how to configure dependency/reset behavior
- how to wire the workflow or workflow step into the correct runtime seam
- how to add or update regression coverage
- how to update documentation when expanding the capability to new workflow use cases

The guide must be complete enough that a future agent or maintainer can onboard a new workflow/workflow-step use case without reconstructing the V2 architecture from scattered docs or code archaeology.

### 5. No half-updated documentation set is acceptable

The Workflow Form v2 implementation must not be considered complete if the code has been updated but the affected documentation set still reflects the V1 contract in a way that would mislead a future maintainer or implementing agent.

If a document is no longer intended to be normative, the reconciliation work must make that status explicit rather than silently leaving contradictory instructions in place.

## Regression Requirements

The eventual implementation must add or update comprehensive regression coverage for:

- field-type validation
- dropdown cardinality validation
- large-text allowed-type validation
- conditional transition routing
- field-level conditional visibility, options, and stale-value clearing
- deterministic-operation handoff transitions
- non-terminal deterministic-operation pause/rebuild transitions
- Back stale-value clearing
- Retry restart-from-first-panel behavior
- workflow-start compatibility
- Code Review Step 2 compatibility
- Brainstorming Step 2 compatibility
- Brainstorming Step 4 compatibility

The V2 implementation must not be considered complete if any required portion of the shared contract is present in runtime code but absent from regression coverage.

## Shared-Seam Delivery Requirements

The Workflow Form v2 implementation must update every affected shared seam required by the new contract.

That includes:

- shared payload/contract definitions
- shared runtime definitions and execution flow
- shared registry/definition-production seams
- shared orchestration integration points
- shared persistence and resume behavior
- shared webview rendering and structured submission behavior
- canonical tests
- canonical documentation

The V2 workstream must not ship by updating only one or two seams while leaving the rest on V1 assumptions.

## Out Of Scope

The following are out of scope for this requirements set:

- the separate non-interactive deterministic workflow-step resolution capability
- workflow-start cards
- workflow-completion automation
- exact final TypeScript interface names
- the later implementation action plan
