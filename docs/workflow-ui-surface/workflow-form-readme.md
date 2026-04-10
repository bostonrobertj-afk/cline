# Capability Name

Workflow Forms

## Purpose

Request structured human input through a system-owned chat form, then invoke the matching deterministic backend tool path without replaying those raw human inputs into model-visible conversational context.

Workflow Form v2 is the live human-input capability. Zero-input deterministic step execution and status now live in the separate `workflow_step_resolution_status` capability.

Workflow-start cards are also separate and are documented in [workflow-start-card/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/README.md).

Current-state caveat:

- Workflow Form v2 is live in the runtime, but the broader placeholder-workflow architecture is still being modernized.
- There is not yet one canonical per-workflow orchestration/config layer.
- Workflow-specific definition-building logic still exists in trigger and resolver registries, so this readme should be read as the live capability boundary plus active seams, not as proof that every workflow use case is already free of workflow-specific runtime configuration.

## System Context

Placeholder workflows often need bookkeeping inputs such as:

- file paths
- refs
- branch choices
- deterministic workflow options

Those inputs are expensive and error-prone when collected through ordinary model turns. Workflow Forms move that bookkeeping into a system-owned UI loop:

- the runtime opens a supported form at a supported orchestration point
- the webview renders only the active resolved panel
- the user submits typed structured values for that panel
- the runtime validates those values, updates session state, and either advances panels or invokes deterministic backend work
- deterministic progression then resumes through the existing workflow runtime

## Adding New Use Cases

- Start from the workflow step or slash-command entry point that needs human input.
- Confirm the interaction is actually a human-input problem. If the step is zero-input deterministic work, use `workflow_step_resolution_status` instead of Workflow Forms.
- Verify the backing tool schema is machine-readable enough for field typing and validation.
- If the use case is workflow-start, verify Step 1 raw details contain explicit directives:
  - `Required: {placeholder}`
  - `Optional: {placeholder}`
  - `One of: {placeholder_a}, {placeholder_b}`
- Add or reuse a resolver in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts).
- Add or reuse the trigger path in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts) or the slash-command startup path.
- Add focused runtime, registry, persistence, and webview regression coverage.

For implementation guidance, use [workflow-form-v2-enablement-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-enablement-guide.md).

## System Position

Workflow Forms sit between runtime orchestration and normal tool execution.

Key seams:

- shared form payload contract:
  - [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
  - [task.proto](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/task.proto)
- capability-owned runtime:
  - [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- capability-owned resolver definitions:
  - [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- capability-owned tool dictionaries:
  - [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts)
  - [systemDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts)
- trigger references:
  - [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- task integration:
  - [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- chat rendering and typed submission:
  - [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)
  - [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)

Workflow Forms do not replace workflow progression, slash-command activation, or backend tool execution. They resolve a human-input interaction at a supported seam, then return control.

## Responsibilities

- represent workflow forms through a dedicated typed shared contract
- persist the full active definition payload in session state
- render one resolved active panel payload at a time
- keep raw human form inputs out of ordinary model context
- derive field typing from canonical tool contracts and resolver-declared rules
- support field-level conditional visibility, option overrides, and dependency resets
- validate requiredness, one-of groups, value shape, and selection rules before resolution
- support shared Back and Retry runtime behavior through the panel graph
- support shared non-terminal deterministic-operation continuation through the runtime
- resume one active workflow-form session safely after reload

## Non-Responsibilities

- zero-human-input workflow-step execution/status
- workflow done-signal evaluation
- deterministic progression policy
- slash-command activation policy
- direct tool execution ownership
- a second workflow engine

## Inputs

Primary inputs:

- trigger context from workflow-start activation or deterministic step interception
- resolver id
- runtime-owned workflow-form session state
- runtime-owned definition payload
- human-submitted typed field values

Current live use cases:

- workflow-start forms for slash-command-started placeholder workflows
- `code-review.md` Step 2 diff artifact input collection
- `brainstorming.md` Step 2 existing-session preparation through Workflow Form v2
- `brainstorming.md` Step 2 zero-session startup through `workflow_step_resolution_status`
- `brainstorming.md` Step 3 topic capture
- `brainstorming.md` Step 4 approach and technique selection

## Outputs

- a resolved active-panel workflow-form payload in chat
- persisted workflow-form session state while the interaction is active
- canonical backend tool invocation through the existing tool executor
- rebuilt panel payloads after panel transitions or non-terminal deterministic operations
- success or failure workflow-form payloads
- normal downstream workflow effects such as placeholder updates and deterministic progression

## Invariants

- the backend/runtime owns the full definition payload for the active session
- the webview receives only the currently resolved active panel payload, not the full form graph
- submissions use typed structured values rather than string-only raw transport
- raw human form inputs must not be replayed into ordinary model context
- Workflow Forms remain additive to existing workflow orchestration and tool execution systems
- workflow-start forms are only recognized when Step 1 raw details include explicit directive lines
- workflow-start `One of:` groups must fail validation when none of the alternatives are populated
- non-terminal deterministic operations continue through one shared runtime-owned path
- zero-input deterministic workflow steps are outside the Workflow Form boundary

## Live Contract

1. An orchestrator decides a workflow form should open.
2. The runtime creates or resumes a workflow-form session and persists the full definition payload.
3. The webview receives the resolved active panel payload only.
4. The user submits typed values for the active panel.
5. The runtime merges those values into session state.
6. The runtime applies shared validation:
   - required fields
   - typed value shape
   - selection rules
   - workflow-start `One of:` groups
7. The runtime applies dependency-driven stale-value and stale-data clearing.
8. The runtime resolves the active panel transition:
   - sequential panel change
   - conditional panel change
   - deterministic operation
9. If a deterministic operation is terminal, the session clears on success.
10. If a deterministic operation is non-terminal, the runtime may:
    - store returned operation data in `session.data`
    - rebuild the definition payload
    - recompute the next destination
    - emit the next resolved panel
11. Deterministic progression then resumes through the normal runtime path.

## Human-Input Vs Zero-Input Boundary

Workflow Forms are for human-input interactions.

Use Workflow Forms when the runtime needs the human to provide or choose data, for example:

- workflow-start placeholders
- diff source selection and supporting inputs
- brainstorming session selection
- brainstorming approach or technique selection

Do not use Workflow Forms when the step is deterministic and needs no human input. Those steps now render through `workflow_step_resolution_status`, for example:

- `brainstorming.md` Step 2 zero-session session creation
- `code-review.md` Step 3 review-input preparation
- `write-remediation-story.md` Step 2 review-input preparation
- `quick-spec.md` Step 2 tech-spec scaffold preparation

## Examples

Example 1: Workflow-start form

- resolver id: `placeholder_workflow_start_set_workflow_placeholders`
- entry path: slash-command startup
- behavior:
  - Step 1 directives become workflow-start fields
  - the runtime enforces `Required`, `Optional`, and `One of:` semantics
  - success invokes `set_workflow_placeholders`

Example 2: Code Review Step 2

- resolver id: `code_review_step_3_diff_source`
- entry path: deterministic step trigger
- behavior:
  - source selection affects downstream active fields
  - the webview receives only the currently active resolved panel
  - success invokes `build_review_diff_output`

Example 3: Brainstorming Step 4

- resolver id: `brainstorming_step_4_choose_approach`
- entry path: deterministic step trigger
- behavior:
  - `approach_selection` can branch directly to a technique panel
  - or run non-terminal `select_random_brainstorming_technique`
  - the runtime stores preview data in `session.data`
  - the next payload renders `random_preview` from that stored operation data

## Observability

Useful places to inspect the live contract:

- session creation, persistence, and clearing:
  - [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- runtime validation, transition evaluation, and shared continuation:
  - [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- resolver definitions and backend request assembly:
  - [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- trigger mapping:
  - [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- chat rendering:
  - [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)
- typed submission building:
  - [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)
