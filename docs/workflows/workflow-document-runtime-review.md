# Workflow Document Runtime Review

## Purpose

This document is the runtime-oriented overview of how placeholder workflows are actually run and managed in this repo as of April 8, 2026.

It is meant to help new agents quickly understand the real placeholder-workflow lifecycle, not just one silo such as workflow-start forms.

## Scope

This document is about placeholder workflows, not managed workflows.

It covers the runtime capabilities that currently shape placeholder-workflow behavior:

- workflow activation and placeholder rendering
- checklist and active-step resolution
- workflow-start cards
- workflow-start forms
- step-triggered workflow forms and automatic-status cards
- deterministic workflow progression
- contextual native-tool filtering
- `workflow_progress_request` exposure and prompt teaching
- workflow persona activation
- workflow completion and teardown

## High-Level Runtime Flow

For placeholder workflows, the runtime currently follows this order:

1. Activate the workflow and load the workflow document.
2. Build stable placeholder values and preserve any previously-entered dynamic placeholder values when appropriate.
3. Render the workflow document with current placeholder state.
4. Build the checklist from markdown step headings in the rendered document.
5. Before the first API turn of a slash-command-started workflow, run the pre-turn system-owned loop:
   - workflow-start card, if the workflow has one
   - workflow-start form, if Step 1 raw details contain explicit start-form directives
   - step-triggered workflow forms or automatic-status cards, if the active step is registered for interception
   - deterministic progression after those system-owned actions mutate workflow state
6. If the pre-turn loop has no more eligible work, assemble the model prompt using:
   - active workflow reminder/instructions
   - current active step details
   - active workflow persona instructions
   - contextual tool filtering for the active workflow and step
   - prompt teaching for `workflow_progress_request` when that step supports it
7. During normal tool execution, focus-chain updates and deterministic progression continue to advance the workflow.
8. When the checklist becomes fully complete, the workflow completion runner may invoke workflow-end automation and then tear the workflow down.

Relevant seams:

- [workflow-activation.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts)
- [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts)
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)
- [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts)

## Placeholder Workflow State Model

Placeholder-workflow runtime behavior is driven primarily by task-owned state in [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts).

The important state buckets are:

- `activePlaceholderWorkflowId`
- `activePlaceholderWorkflowSource`
- `activePlaceholderWorkflowStableValues`
- `activePlaceholderWorkflowValues`
- `activePlaceholderWorkflowDeterministicState`
- `activePlaceholderWorkflowTaskWriteProofPaths`
- `activeWorkflowStartCardSession`
- `activeWorkflowFormSession`
- `pendingAutoCompletedPlaceholderWorkflowStepNotices`

Important implication:

- placeholder workflows are not managed only by the workflow document itself
- they are managed by the combination of rendered workflow text, checklist state, placeholder state, task-written artifact proofs, and current-turn tool context

## 1. Workflow Activation And Placeholder Rendering

Relevant code:

- [workflow-activation.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts)
- [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts)
- [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts)

What happens:

- `activatePlaceholderWorkflowInTaskState(...)` loads the workflow document and builds an `ActivePlaceholderWorkflowSource`.
- Stable placeholders are loaded through `buildWorkflowStablePlaceholders(...)`.
- Dynamic placeholder values come from `activePlaceholderWorkflowValues`.
- The runtime renders workflow text through `getRenderedActivePlaceholderWorkflowSourceContents(...)`.
- Unresolved placeholder tokens are logged, but rendering does not fail on them.
- Activation resets placeholder-workflow runtime state when the workflow changed.

Important implications:

- placeholder workflow documents are live runtime inputs, not passive docs
- literal `{placeholder}` tokens still matter because multiple runtime consumers depend on them
- slash-command activation does not directly hand Step 1 to the model; startup surfaces may intercept before Turn 1

## 2. Checklist And Active-Step Resolution

Relevant code:

- [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts)

What happens:

- `buildPlaceholderWorkflowChecklist(...)` parses rendered workflow text into checklist steps.
- A section becomes a workflow step only if its heading matches `Step <number>`.
- `getActivePlaceholderWorkflowStepDetails(...)` resolves the first incomplete checklist step.
- It returns both:
  - rendered `details`
  - unrendered `rawDetails`

Important implications:

- step headings are structural runtime contracts
- inner headings are safe only if they do not look like `Step <number>`
- rendered step details become agent-visible instructions
- raw step details remain available for document-derived parsing such as workflow-start requirement directives

## 3. Workflow-Start Cards

Relevant code:

- [WorkflowStartCardRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts)
- [buildWorkflowStartCardPayload.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/buildWorkflowStartCardPayload.ts)
- [index.ts:1756](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1756)
- [docs/workflow-automation/workflow-start-card/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/README.md)

What happens:

- before the first API turn of a slash-command-started placeholder workflow, `maybeResolveWorkflowStartCardBeforeApiTurn(...)` checks the code-owned registry
- if the workflow has an entry, the runtime creates `activeWorkflowStartCardSession`
- the payload title is generated from the workflow filename
- the markdown body comes from the code-owned registry
- the fixed CTA is `Get Started`
- the runtime waits for the session to clear before continuing startup

Important implications:

- workflow-start cards are pre-Turn-1 startup surfaces
- they are outside the workflow-step system
- they are not workflow forms
- they are code-owned, not document-derived

## 4. Workflow-Start Forms

Relevant code:

- [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- [workflowStartRequirements.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts)
- [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)

What happens:

- workflow-start forms are only considered for slash-command-started placeholder workflows
- the runtime resolves the active step and only proceeds when Step 1 is active
- start-form shape is derived from explicit directive lines in Step 1 raw details, not from generic placeholder extraction alone
- the recognized directives are:
  - `Required: {placeholder}`
  - `Optional: {placeholder}`
  - `One of: {placeholder_a}, {placeholder_b}`
- the runtime creates a workflow-form session owned by the slash-command start path
- field typing still comes from the `set_workflow_placeholders` tool schema and runtime dictionaries

Important implications:

- the older mental model “start forms are just placeholder-token extraction from Step 1” is no longer accurate
- Step 1 must contain explicit start-form directive lines if a workflow wants the generic start-form path
- start cards and start forms can both participate in startup, in sequence

## 5. Step-Triggered Workflow Forms And Automatic-Status Cards

Relevant code:

- [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- [index.ts:1796](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1796)

What happens:

- after the slash-command start form check, the runtime can intercept supported workflow steps through the step-trigger registry
- some resolvers render interactive forms
- some render non-interactive `automatic_status` cards for zero-human-input system-owned steps
- the runtime executes the corresponding tool through the normal tool path
- on success, the workflow-form session clears and deterministic progression can run again before the first AI turn
- on terminal failure, automatic-status cards can fall back to the normal agent path

Current examples include:

- `code-review.md`
- `write-remediation-story.md`
- `quick-spec.md`

Important implication:

- workflow forms are broader than startup input collection
- they are also used for step-owned deterministic preparation work before the model gets control

## 6. Deterministic Workflow Progression

Relevant code:

- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)
- [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md)

What happens:

- deterministic support is opt-in by exact workflow name
- the runtime resolves the current active step and dispatches to a workflow-specific evaluator
- evaluators may inspect:
  - placeholder values
  - file existence
  - file content
  - current-task write proofs
  - current-turn tool execution context
- when a step is proven complete, the checklist advances through the normal focus-chain path
- deterministic progression can loop across multiple steps in one pass
- auto-completion notices are recorded in task state

Important implications:

- deterministic progression is hardcoded per workflow, not inferred from free-form workflow prose
- workflow authoring alone does not make a workflow deterministic
- runtime completion logic for supported workflows lives in code

## 7. Contextual Tool Matrix And Native Tool Filtering

Relevant code:

- [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts)
- [contextualNativeToolFilter.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts)
- [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md)

What happens:

- prompt-side native-tool exposure for placeholder workflows is controlled by `PLACEHOLDER_WORKFLOW_STEP_MATRIX`
- each row is keyed by exact workflow name and step number
- matrix entries use bundle names, not raw tool ids
- the filter resolves those bundles into built-in tool ids and Indxr tool names
- if a workflow/step has a row, only the allowed native tools plus always-preserved tools and response tools remain visible

Important implications:

- placeholder workflow behavior is partly shaped by prompt-side tool visibility, not only by workflow text
- the contextual tool surface is code-owned
- changing workflow step structure without updating the matrix can create real runtime drift

## 8. `workflow_progress_request` Support And Prompt Teaching

Relevant code:

- [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts)
- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)
- [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts)

What happens:

- `workflow_progress_request` support is opt-in by exact workflow name and step number
- when the current step is in that allowlist:
  - the response tool is exposed
  - prompt teaching changes from normal placeholder-workflow completion guidance to runtime-owned Yes/No advancement guidance
- when the current step is not allowed, the response tool is not taught or exposed through that path

Important implications:

- not every placeholder-workflow step completes through `send_user_message + task_progress`
- some steps are intentionally mediated by runtime-owned `workflow_progress_request`
- this behavior is shared-code-driven, not document-derived

## 9. Persona Activation

Relevant code:

- [workflowPersonaRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts)
- [index.ts:2288](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2288)

What happens:

- placeholder workflows can map to a workflow persona by exact workflow name
- prompt assembly resolves persona instructions through the workflow persona registry
- those instructions are part of the workflow-aware prompt assembly path

Important implication:

- workflow behavior is also shaped by code-owned persona mapping, not only by the workflow document itself

## 10. Focus-Chain Prompt Injection

Relevant code:

- [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)
- [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts)

What happens:

- the focus-chain manager resolves the active step from the checklist
- current step details are injected into prompt assembly
- unresolved placeholders in the rendered step details are still detectable and surfaced

Important implication:

- workflow step bodies remain agent-visible runtime instructions
- any metadata or extra markdown authored inside a step may affect what the model sees unless another runtime layer filters it

## 11. Tool-Response Progression, Write Proofs, And Notices

Relevant code:

- [focus-chain/updateFromToolResponse.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/updateFromToolResponse.ts)
- [placeholderWorkflowWriteProofs.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts)
- [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts)

What happens:

- after tools run, focus-chain update logic can refresh the checklist
- deterministic progression can consume current-turn tool context such as:
  - executed tool name
  - tool params
  - tool result text
- some workflows also depend on current-task write-proof tracking for generated artifacts
- deterministic auto-completion reasons are recorded as notices for later prompt/UI surfacing

Important implication:

- placeholder workflows are managed partly through runtime facts gathered during tool execution, not just static document parsing

## 12. Workflow Completion And Teardown

Relevant code:

- [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts)
- [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts)
- [index.ts:1601](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1601)

What happens:

- when the checklist transitions to fully complete, `workflowCompletionRunner(...)` checks whether workflow-end handling should run
- the workflow completion handler may invoke workflow-end automation
- if completion handling does not fail terminally, the task tears the placeholder workflow down and clears its state

Important implication:

- placeholder workflows have a real runtime completion phase
- “all checklist items complete” is not always the last thing that happens

## Authoring Constraints Implied By The Current Runtime

The current runtime imposes these real constraints on placeholder workflow documents:

- workflow steps must use headings that match `Step <number>`
- inner headings are safe only if they do not accidentally create new `Step <number>` sections
- placeholder-dependent behavior still requires literal `{placeholder}` tokens where placeholder rendering or extraction matters
- workflow-start forms require explicit Step 1 directive lines in raw details
- workflow-start cards are not document-derived, so adding card copy to a workflow document does nothing by itself
- deterministic progression is code-owned per workflow
- contextual native-tool exposure is code-owned per workflow and step
- `workflow_progress_request` support is code-owned per workflow and step
- persona activation is code-owned per workflow

## Practical Takeaway

Placeholder workflows are currently governed by a shared runtime contract across multiple subsystems.

If you change or enable a workflow, you need to think across all of these seams:

- workflow activation and placeholder rendering
- checklist parsing and active-step resolution
- workflow-start cards
- workflow-start forms
- step-triggered workflow forms and automatic-status cards
- deterministic progression
- contextual native-tool filtering
- `workflow_progress_request` support and prompt teaching
- persona activation
- workflow completion and teardown

The workflow document is important, but it is only one part of the runtime contract.
