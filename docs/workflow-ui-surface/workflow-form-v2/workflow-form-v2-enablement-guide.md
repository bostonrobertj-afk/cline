# Workflow Form V2 Enablement Guide

## Purpose

This guide is the practical checklist for adding or migrating a Workflow Form v2 use case in the live runtime.

Use it with:

- [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)
- [workflow-form-v2-architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/requirements.md)

## 1. Decide Whether Workflow Form v2 Is The Right Capability

Use Workflow Form v2 when all of these are true:

- the runtime needs human input or a human choice
- the interaction can be represented as one or more system-owned panels
- the result should invoke a deterministic backend tool path
- the raw human input should stay out of ordinary model context

Do not use Workflow Form v2 when:

- the step is zero-input deterministic work
- the runtime only needs to show progress or final status
- the interaction belongs to workflow-start cards rather than Workflow Forms

If the step is zero-input deterministic work, use `workflow_step_resolution_status` instead.
Brainstorming Step 2 zero-session startup is one of those cases: it belongs to `workflow_step_resolution_status`, not Workflow Form v2.

## 2. Choose The Orchestration Entry Path

There are two live entry paths:

### Slash-command startup

Use this when the interaction is a workflow-start form.

Requirements:

- Step 1 raw details must contain explicit directives:
  - `Required: {placeholder}`
  - `Optional: {placeholder}`
  - `One of: {placeholder_a}, {placeholder_b}`
- the start path must provide the initial `definitionPayload`

### Deterministic step interception

Use this when a specific workflow step needs human input before deterministic progression can continue.

Requirements:

- the workflow/step pair must be mapped in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- the trigger candidate must carry the initial `definitionPayload`

Do not introduce handler-owned follow-up orchestration to reach later panels. The live path is runtime-owned.

## 3. Author The V2 Definition Payload

The definition payload is the runtime-owned source of truth for the whole flow.

It must declare:

- `definitionVersion`
- `title`
- `toolDictionaryTitle`
- `toolDictionaryMarkdown`
- `firstPanelId`
- `panels`

Each panel must declare:

- `panelId`
- `title`
- `promptMarkdown`
- `fields`
- `allowedActions`
- `transition`

Use stable panel ids and stable field keys. Persist the full active definition payload in session state.

## 4. Understand Full Definition Payload Vs Resolved Panel Payload

The backend stores the full form graph.

The webview receives only the currently resolved active panel payload:

- active panel copy
- active resolved fields
- active allowed actions
- current user-visible values
- current failure or success state

Do not send the entire panel graph to the webview.

## 5. Model Field-Level Conditionality

Use field-level conditionality when the panel stays the same but field behavior changes.

Available live patterns:

- `visibilityCondition`
- `conditionalOptions`
- `conditionalFieldOverrides`
- `dependsOn`
- `resetValueKeysOnChange`
- `resetDataKeysOnChange`

Use this instead of duplicating panels when only a field’s visibility, option set, conditional allowed-value typing, validation metadata, or reset behavior changes.

Example use cases:

- Code Review Step 2 source-specific fields
- Brainstorming Step 4 technique options by category
- any panel where a field switches allowed value type or validation metadata after an upstream answer changes

## 6. Model Non-Terminal Deterministic Operations

Use `transition.type = "deterministic_operation"` when panel submission must invoke backend work.

Terminal operations:

- finish the form on success

Non-terminal operations:

- store returned operation data in `session.data` when `resultDataKey` is set
- optionally rebuild the definition with `rebuildDefinitionAfterSuccess`
- optionally recompute the next destination with `recomputeDestinationAfterSuccess`
- continue through the shared runtime path

Do not add use-case-specific continuation logic in `index.ts`. The shared runtime owns continuation.

## 7. Declare Stale-Value Clearing And Dependency Reset Behavior

Use shared reset metadata instead of bespoke cleanup logic.

Available live seams:

- field-level `dependsOn`
- field-level `resetValueKeysOnChange`
- field-level `resetDataKeysOnChange`
- transition-level stale-value clearing
- back-navigation stale-value clearing

Use them whenever an upstream choice invalidates downstream values or operation-produced data.

## 8. Model Workflow-Start `One of:` Requirements

Workflow-start `One of:` directives are parsed into one logical group.

Implementation rules:

- each participating field must carry the same `oneOfGroupId`
- the runtime must fail submission when none of the alternatives has a renderable value
- the current failure message is:
  - `Provide at least one of the allowed alternative inputs before submitting.`

This validation is shared runtime behavior, not resolver-specific business logic.

## 9. Submission Transport Rules

Workflow Form v2 uses typed submission payloads.

Key rules:

- integer fields must submit `integerValue`
- integer fields must not truncate decimals
- integer-typed `small_text` fields must emit `integerValue`, not `stringValue`
- array and object fields must submit structured values

The webview should build typed field values in [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts).

## 10. Required Regression Coverage

Every new or migrated Workflow Form v2 use case must add focused coverage for:

- resolver definition shape
- trigger candidate creation
- runtime validation and panel transitions
- non-terminal deterministic-operation continuation when used
- persistence/resume when operation-produced `session.data` matters
- webview typed submission behavior for any non-string field kinds

At minimum, review these suites:

- [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts)
- [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts)
- [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts)
- [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts)
- [useMessageHandlers.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx)

## 11. Practical Authoring Sequence

1. Confirm the step belongs to Workflow Forms and not `workflow_step_resolution_status`.
2. Choose the orchestration entry path.
3. Define the initial `definitionPayload`.
4. Add or update the resolver.
5. Add or update the trigger candidate.
6. Add any required backend-only deterministic tools or handlers.
7. Add focused runtime, persistence, and webview regression coverage.
8. Verify the webview only receives the resolved active panel payload.
9. Verify no part of the flow depends on handler-owned follow-up workflow-form launch paths.
