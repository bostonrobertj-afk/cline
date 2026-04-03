# Capability Name

Workflow Forms

## Purpose

Request inputs from the user through a system-owned chat form, then invoke an appropriate tool with those inputs to resolve a workflow step deterministically without putting the raw human inputs into model context.

## System Context

BMAD workflows rely on documentation. In many cases the AI agent would otherwise need to:

- ask the human for a file path, ref, or other bookkeeping input
- read that input and often read the target artifact
- translate it into a tool call
- continue the workflow only after that bookkeeping is complete

That pattern is expensive and fragile:

- it creates unnecessary back-and-forth
- it consumes tokens on bookkeeping that does not require model reasoning
- it increases the risk of bookkeeping mistakes

Workflow Forms solve that by pausing normal agent execution at a supported trigger point, collecting structured human inputs in the UI, invoking the deterministic tool path directly, and then returning control to the existing workflow/runtime systems.

## Adding New Use Cases

- Start with the target workflow step or slash-command entry point.
- Verify that the target step is a good deterministic boundary and already has, or can be given, a clear done signal.
- Identify the tool the form will invoke.
- Review that tool's schema before deployment.
- If the tool expresses branching, variant selection, or required input structure only in prose, upgrade the tool schema so the workflow-form layer can consume that structure at runtime.
- Add or reuse a resolver in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts).
- Add or reuse a trigger reference in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts) or the slash-command start path.
- Add focused runtime, registry, and webview regressions.

## System Position

Workflow Forms sit between triggering runtime systems and normal tool execution.

Key seams:

- shared form payload contract:
  - [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
  - [task.proto](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/task.proto)
- capability-owned runtime:
  - [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- capability-owned resolver definitions:
  - [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- trigger references:
  - [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- task integration:
  - [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- chat rendering and submission:
  - [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)
  - [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)

The capability does not replace workflow progression, slash-command activation, or tool execution. It inserts at a defined point, resolves deterministic human-assisted input collection, then returns control.

## Responsibilities

- Represent workflow forms through a dedicated shared contract.
- Render a system-owned staged form in chat.
- Render non-interactive automatic workflow-preparation status cards in chat for zero-human-input system-owned steps.
- Keep raw form inputs out of model-visible conversational context.
- Derive field typing from the invoked tool schema at runtime.
- Allow use cases to specialize field discovery, ordering, labels, help text, and staged UX.
- Validate required and one-of semantics before invoking a tool.
- Translate submitted form values into the canonical tool call shape.
- Invoke the target tool through the existing tool execution path.
- Persist one active workflow-form session so reload/resume works.
- Return control to deterministic progression or workflow fallback behavior after resolution.

## Non-Responsibilities

- Owning workflow orchestration policy.
- Replacing done-signal evaluation.
- Replacing tool validation or tool handlers.
- Replacing slash-command activation.
- Persisting duplicate workflow state that already belongs to task/workflow systems.
- Injecting raw human inputs into AI-visible prompt context.
- Inventing a second workflow engine.

## Inputs

Primary inputs:

- active trigger context
  - deterministic workflow progression, or
  - slash-command-started workflow activation
- resolver id
- runtime-owned session state
- tool schema
- use-case-owned resolver configuration
- human-submitted field values

Current delivered use cases:

- workflow-start forms for slash-command-started placeholder workflows
- `code-review.md` Step 2 diff artifact form using `build_review_diff_output`
- `code-review.md` Step 3 automatic workflow-preparation status card using `build_review_input` with workflow-owned inputs

## Outputs

- a rendered workflow-form payload in chat
- persisted workflow-form session state while the interaction is active
- a canonical tool invocation through the existing tool-execution path
- retry or success workflow-form payloads
- normal downstream workflow effects such as:
  - placeholder state updates
  - deterministic workflow progression
  - next-step prompting

## Invariants

- Raw human form inputs must not be replayed into model context as ordinary user text or recap text.
- Workflow Forms must use the dedicated workflow-form transport, not generic ask-response text.
- The base capability must remain runtime-defined from the invoked tool schema.
- Any layer between schema, form definition, submission transport, payload assembly, and tool invocation must remain compatible with the runtime-defined contract.
- Use cases may override field discovery, staging, labels, help text, and requiredness when that responsibility belongs to the use case.
- Workflow-start forms specialize field discovery and required/optional semantics from workflow documents, but still inherit field typing from `set_workflow_placeholders`.
- Existing systems remain authoritative:
  - workflow progression
  - slash-command activation
  - tool execution
  - task persistence

## Core Logic

1. A trigger path decides that a workflow form is needed.
2. The runtime creates or resumes a workflow-form session.
3. The resolver builds the current staged form definition.
4. The webview renders that definition as either a system-owned staged form or a non-interactive automatic-status card.
5. For interactive forms, the user submits raw values through the dedicated workflow-form submission transport; for automatic-status cards, the runtime executes the tool immediately.
6. The runtime merges those values into session state and validates the current page.
7. If the current page is incomplete, the runtime re-renders the form with retry state.
8. If the submission is valid, the resolver builds the canonical tool input and tool params.
9. The task runtime executes the tool through the normal tool path.
10. The resolver evaluates the tool result and returns success or failure.
11. On success, the session is cleared and control returns to runtime-owned workflow progression first.
12. After a successful form resolution, the runtime may immediately re-enter deterministic progression and open another eligible system-owned form before any AI turn begins.
13. On failure, interactive forms remain active in `retry_error` while automatic-status failures render a terminal failure card and then fall back to the normal agent path.

Important implementation note:

- The shared transport now carries raw values generically.
- Runtime parsing is handled in [schema.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts).
- That means the webview does not hard-code business field typing.

## Failure Modes

- The trigger is not applicable for the current workflow state.
- The resolver id is unknown.
- The active form session is stale or mismatched.
- Required or one-of fields are unresolved.
- The resolver cannot derive a valid canonical tool request.
- The tool executes and returns a structured failure.
- The tool succeeds but the workflow-form evaluator fails to recognize the success result.
- The user cancels, which returns control to the normal fallback path.
- A supported use case is deployed against a tool whose schema is not machine-readable enough for the intended staged UX.

## Usage

Typical live `code-review.md` path:

1. A placeholder workflow is activated via slash command.
2. Before the first API turn, the runtime inspects the active Step 1 requirements and may open the workflow-start form.
3. The runtime invokes `set_workflow_placeholders` when the start form succeeds.
4. Deterministic progression re-evaluates the now-current checklist state immediately after that tool runs.
5. If Step 2 is now active and still unresolved, the runtime opens the Step 2 diff artifact form and invokes `build_review_diff_output` on success.
6. Deterministic progression runs again and may advance directly into the Step 3 automatic workflow-preparation status card, which invokes `build_review_input` from stored workflow state and then renders terminal success or fallback-to-manual status.
7. Deterministic progression then derives Step 4 `review_mode` when the current-task artifacts prove it.
8. The AI enters at Step 5 only after the pre-turn system-owned decision loop has no further eligible workflow-start or step-triggered form work to perform.

Typical live write-remediation-story.md path: Step 1 may open the workflow-start form to collect `story_path`, then deterministic progression may advance directly into the Step 2 automatic workflow-preparation status card, which invokes `build_review_input` from stored workflow state before the AI reaches Step 3.

## Extension Guidelines

- Keep resolver definitions capability-owned.
- Keep trigger references runtime-owned.
- Do not add a second submission transport.
- Do not pass raw form inputs into model context.
- Prefer schema-driven behavior over field-name-driven behavior.
- If a use case needs staged variant selection, make the relevant tool schema machine-readable enough to support it.
- If the use case needs better UX than the base capability can infer, specialize it in the resolver rather than hard-coding behavior in shared transport or shared UI submit logic.
- Preserve existing workflow fallback instructions in the workflow document even when the system-owned path is primary.

## Examples

Example 1: Phase 1 diff-source form

- resolver id: `code_review_step_3_diff_source`
- tool: `build_review_diff_output`
- stages:
  - `confirm`
  - `select_source`
  - `collect_inputs`

Example 2: Workflow-start placeholder form

- resolver id: `placeholder_workflow_start_set_workflow_placeholders`
- tool: `set_workflow_placeholders`
- typical stage:
  - `collect_inputs`

Example 3: Automatic review-input preparation

- resolver id: `write_remediation_story_step_2_review_input`
- tool: `build_review_input`
- presentation: `automatic_status`
- typical stage: `collect_inputs`

## (Optional) Performance

Workflow Forms improve performance mainly by reducing avoidable model work:

- fewer bookkeeping turns
- fewer token-expensive file reads whose only purpose is argument extraction
- less model involvement in deterministic tool invocation

They do add some runtime work:

- form-session persistence
- schema resolution
- resolver-driven form building

That extra runtime cost is acceptable because it is deterministic and much cheaper than replacing it with model turns.

## (Optional) Observability

Useful places to observe this capability:

- workflow-form session creation, persistence, and clearing in [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- runtime validation and phase transitions in [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- resolver behavior and tool-argument assembly in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- schema resolution and raw-value parsing in [schema.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts)
- chat rendering and submission in:
  - [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)
  - [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)

Focused regression coverage exists in:

- [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts)
- [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts)
- [schema.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts)
