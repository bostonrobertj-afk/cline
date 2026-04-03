# Workflow UI Surface Requirements

## Purpose

This document defines the Phase 1 requirements for introducing a workflow UI surface capability that can collect structured human input and resolve a deterministic workflow step without passing the raw human inputs through the AI agent's context window.

This document bridges:

- [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/discovery.md)
- [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/architecture.md)

to a later action plan.

## Phase 1 Scope

Phase 1 delivers one supported use case only:

- `code-review.md`
- Step 3
- deterministic workflow-progression-triggered form-driven resolution
- invoked tool: `build_review_diff_output`

Phase 1 must implement the new capability in a way that is ready to support slash-command-triggered use cases later, but Phase 1 must not yet bind the capability to any specific slash command.

## Core Requirement

The system must support a new workflow UI surface capability that:

- is triggered by deterministic workflow progression for the supported Phase 1 workflow step
- collects structured user input through a system-owned form interaction
- transforms that input into the canonical tool argument shape
- invokes the existing tool through the existing tool execution path
- allows the existing deterministic workflow progression system to continue from the tool's output exactly as it normally would

The capability must reduce AI token consumption by keeping the raw human form inputs out of model-visible conversational context.

## Architectural Invariants

Everything below is mandatory for Phase 1.

### 1. Existing systems remain authoritative

The new capability must not replace:

- deterministic workflow progression
- workflow done-signal evaluation
- tool execution
- tool validation
- task persistence
- existing slash-command activation behavior

It must insert into those systems, pause them when appropriate, and then return control so they continue their normal responsibilities.

### 2. Raw human form inputs must not enter model context

The form submission data collected from the user must not be replayed into the AI agent's context window as normal user input, user feedback, or system recap text.

This includes:

- selected options
- entered text values
- derived canonical tool arguments

### 3. Workflow-step execution remains system-owned

For the Phase 1 use case, the supported step is no longer primarily agent-executed.

The system-owned path is the primary path.
The AI agent path is fallback-only.

### 4. Existing post-step workflow behavior remains unchanged

Once the invoked tool produces the output that satisfies the workflow's existing done signal, the existing deterministic workflow progression machinery must continue to own:

- detecting completion
- advancing the workflow
- injecting the normal next-step prompting

This update must not create a parallel post-step progression path.

## Phase 1 Workflow Requirement

Phase 1 applies only to the `code-review.md` workflow Step 3 use case.

The associated workflow source must be updated so that:

- the Step 3 heading/description clearly indicates that the step is system-owned
- the Step 3 body is rewritten as fallback instructions for the AI agent
- those fallback instructions are intended to be used only if the form-driven deterministic path fails

## Trigger Requirements

### 1. Phase 1 delivered trigger

Phase 1 must support deterministic workflow progression as the delivered trigger for the supported use case.

Specifically:

- when the existing deterministic progression path reaches the supported system-owned step
- the runtime must pause normal agent execution
- the workflow UI surface capability must run
- after successful deterministic resolution, the normal deterministic workflow progression path must resume

### 2. Slash-command readiness requirement

Phase 1 must make the new capability slash-command-ready in general.

That means:

- the capability's contracts, ownership boundaries, and transport design must support future slash-command-triggered invocation
- Phase 1 must not hardcode assumptions that only workflow-progression triggers will ever invoke the capability

That does not mean:

- binding the capability to any specific slash command in Phase 1
- delivering the later slash-command-specific subroutine in Phase 1
- delivering the later net-new tool for slash-command-driven use cases in Phase 1

## Contract Requirements

### 1. Dedicated workflow-form ask/say contract

The feature must introduce a new dedicated workflow-form ask/say type.

It must not overload:

- `followup`
- plan response asks
- tool approval asks
- generic text-based ask semantics

### 2. Dedicated structured submission transport

The feature must introduce a new dedicated structured workflow-form submission request from webview to runtime.

It must not rely on stuffing workflow-form data into:

- generic `text`
- generic ask-response freeform payloads

### 3. Tool-like capability ownership

The capability itself must be implemented in a way that follows the repo's established tool architecture.

That includes:

- tool-like runtime ownership
- capability-owned resolver/form behavior
- trigger references remaining with the runtime systems that invoke the capability

## UI Surface Requirements

The system must provide a task-integrated, schema-driven, multi-field workflow form mechanism.

For Phase 1, that mechanism must:

- render as a system-owned interactive frame within the task/chat UI
- derive its field structure and required/optional semantics from the invoked tool's schema
- reuse existing UI-visible primitives and patterns where appropriate
- support a staged interactive flow for the Phase 1 use case:
  - initial system prompt/question
  - affirmative path into structured input collection
  - field selection / field entry
  - submit
  - failure with retry
  - success indication
- support a non-interactive automatic workflow-preparation status card for zero-human-input system-owned steps, with pending, success, and fallback-to-manual terminal states
- include a UI control that opens the human-friendly tool dictionary at the line or entry where the invoked tool's documentation begins so the user can understand:
  - what the tool does
  - what the tool produces
  - what inputs the form is asking for

The implementation must reuse existing UI-visible mechanisms where appropriate rather than hand-coding the entire experience from scratch, including:

- the inline system-generated interactive frame pattern already used for `ask_followup_question`
- inline answer buttons such as `OptionsButtons`
- existing dialog/alert primitives for modal presentation if needed
- existing button/select primitives

## Dictionary And Help Requirements

### 1. Read-only system dictionary

The feature must introduce a read-only system dictionary that provides human-friendly translations of technical terms used in the workflow-form experience.

At minimum, the dictionary must support:

- short label
- medium explanation
- long explanation
- examples
- context tags

### 2. Human-friendly tool dictionary

The feature must introduce a human-friendly tool dictionary layer that explains:

- what the tool does
- what it produces
- what its inputs are
- which inputs are required vs optional

This dictionary must remain schema-driven so it stays aligned with the workflow form and the invoked tool's canonical input contract.

This layer must:

- derive tool structure, inputs, and required/optional status from tool schema
- use the system dictionary to translate technical syntax into human-friendly terminology
- preserve a stable tool entry that the workflow form can open directly for the currently invoked tool

For Phase 1, this dictionary/help layer must support the `build_review_diff_output` use case.

## Form-to-Tool Execution Requirements

The workflow UI surface capability must include a workflow form-to-tool execution bridge that:

- accepts validated form data
- translates that data into the canonical tool shape
- invokes the tool through the existing tool execution path

The bridge must not:

- reimplement tool business logic
- directly advance workflow state on its own
- introduce a second tool-result handling model

## Persistence And Resume Requirements

Phase 1 must support persistence and resume of an in-progress workflow-form session using existing task persistence seams.

The system must:

- persist one active workflow-form session per task
- restore the unresolved workflow form on reopen/resume when appropriate
- clear the persisted session on success, explicit cancel, or loss of the owning workflow context

The persisted session must be minimal and must not duplicate:

- workflow progression state already owned elsewhere
- tool execution result state already owned elsewhere
- model-visible input history

## Phase 1 `code-review.md` Step 3 Requirements

For the supported Phase 1 use case:

- the workflow UI surface capability must gather the inputs needed to invoke `build_review_diff_output`
- the backend must translate the collected inputs into the tool's canonical argument shape
- the tool must run through the normal tool execution path
- the existing deterministic workflow progression system must treat the resulting tool output exactly as it treats ordinary successful completion of Step 3 today

The supported path is the tool-backed path for `build_review_diff_output`.

The fallback AI path must remain available if the form-driven deterministic path fails.

## Out Of Scope

The following are out of scope for Phase 1.

### 1. Additional workflow steps

No workflow step other than `code-review.md` Step 3 is in scope for delivered Phase 1 behavior.

### 2. Additional delivered workflow use cases

No additional workflow beyond the Phase 1 `code-review.md` Step 3 use case is in scope for delivered Phase 1 behavior.

### 3. Delivered slash-command bindings

Phase 1 must not yet bind the capability to specific slash commands.

### 4. Net-new Phase 2 subroutine/tooling

Phase 1 must not require delivery of:

- the slash-command-specific subroutine described for Phase 2
- the net-new `workflow_input_resolver`
- net-new deterministic tools beyond the already-existing `build_review_diff_output`
- `build_review_input`

### 5. Parallel workflow architecture

Phase 1 must not introduce:

- a second workflow engine
- a second progression engine
- a second persistence subsystem for workflow orchestration

## Required Behavioral Invariants

### 1. Trigger behavior must remain additive

The capability may pause an existing trigger path.
It must not swallow or replace the trigger's normal lifecycle behavior.

### 2. Capability output must flow through existing sysms

The capability's success path must produce outputs that flow through the existing runtime/tool/workflow systems rather than special-case side channels.

### 3. Existing repo patterns must be followed

Implementation must follow the repo's established tool, runtime, workflow, persistence, and UI extension patterns wherever this feature touches them.

## Acceptance Criteria

Phase 1 is complete only if all of the following are true:

1. The system supports a dedicated workflow-form ask/say contract and a dedicated structured workflow-form submission request.
2. The delivered Phase 1 use case is `code-review.md` Step 3 only.
3. The `code-review.md` Step 3 source is updated so the step is system-owned and the agent-facing instructions are fallback-only.
4. The runtime can invoke the workflow UI surface capability when deterministic workflow progression reaches the supported Phase 1 step.
5. The capability collects structured user input and invokes `build_review_diff_output` through the normal tool execution path.
6. Raw human form inputs are not replayed into model-visible conversational context.
7. Successful tool output resumes the existing deterministic workflow progression path rather than a special-case progression path.
8. The feature persists and restores one active workflow-form session per task using existing task persistence seams.
9. The implementation is slash-command-ready in general, but no specific slash-command binding is delivered in Phase 1.
10. The workflow form remains schema-driven, and the human-friendly tool dictionary also remains schema-driven so the two cannot drift apart.
11. The workflow form includes a user-accessible control that opens the invoked tool's dictionary entry so the user can understand the tool, its inputs, and its output before submitting.
12. The implementation reuses existing system/UI building blocks where appropriate instead of introducing a parallel subsystem for the same concerns.
