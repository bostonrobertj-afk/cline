# Workflow Completion Automation Readme

## Purpose

This document explains the generic workflow-completion automation capability now deployed through:

- [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts)
- [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts)

This capability is for **placeholder workflow completion**, not task completion. In this repo, a task is the conversation thread. The workflow-completion automation only handles the moment when an active placeholder workflow finishes and any optional end-of-workflow bookkeeping that should run at that moment.

## What Shipped

The deployed generic capability consists of four parts:

1. `workflowCompletionRunner`
- detects that the active placeholder workflow just completed during deterministic progression
- calls `workflowCompletionHandler`
- returns a structured decision to `Task`

2. `workflowCompletionHandler`
- owns only workflow-end automation dispatch
- checks whether the completed workflow has a configured internal tool mapping
- returns one of:
  - `no_op`
  - `tool_completed`
  - `tool_failed`

3. `Task` integration
- remains the owner of:
  - placeholder-workflow teardown
  - metadata persistence
  - checklist projection clearing
  - UI refresh

4. `ToolExecutor.executeInternalToolSilently(...)`
- gives `Task` and `workflowCompletionHandler` a way to invoke an internal runtime tool without routing through normal assistant-authored tool execution flow

## Current Deployment Status

The generic infrastructure is deployed, and the first workflow-specific production mapping is now configured in:

- [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts)

The live mapping is:

- `code-review.md` -> `code_review_spec_update`

That means:

- workflow completion detection and teardown are live
- optional workflow-end automation dispatch infrastructure is live
- the `code-review.md` placeholder workflow now runs `code_review_spec_update` at workflow completion through `workflowCompletionHandler`
- workflows without a configured registry entry still resolve to `no_op`

The workflow-specific requirements for this first mapping remain documented in:

- [code-review-completion.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/code-review-completion.md)

## Code Review Configuration

The currently configured workflow-specific completion behavior is:

- completed workflow id: `code-review.md`
- mapped internal runtime tool: `code_review_spec_update`

That live mapping is defined in:

- [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts)

At runtime, the code-review completion path works like this:

1. `workflowCompletionRunner(...)` detects that `code-review.md` just completed.
2. `workflowCompletionHandler(...)` looks up `code-review.md` in `workflowCompletionHandlerRegistry`.
3. The handler invokes `code_review_spec_update` through `ToolExecutor.executeInternalToolSilently(...)`.
4. If the tool succeeds, the handler returns `tool_completed`.
5. If the tool returns a failure result or throws, the handler returns `tool_failed`.
6. `Task` tears down placeholder-workflow state only when the runner result still allows teardown.

For this mapping, `workflowCompletionHandler` does not take over any of the tool's responsibilities. `code_review_spec_update` continues to own:

- placeholder resolution for `{review_input}` and `{spec_file}`
- approval and file-write behavior
- spec-file mutation
- `review_input.md` clearing
- write-proof recording for `{spec_file}`

The important failure rule for code review remains:

- if `code_review_spec_update` fails, `workflowCompletionHandler` returns `tool_failed`
- `workflowCompletionRunner` preserves the placeholder-workflow state instead of tearing it down

## Runtime Flow

The shipped runtime sequence is:

1. Placeholder deterministic progression runs.
- This happens after relevant tool execution and after workflow-form tool execution sync.

2. `Task` calls its post-progression completion check.
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- `updatePlaceholderWorkflowProgressAndMaybeRunCompletion(...)`

3. `Task` calls `workflowCompletionRunner(...)`.
- [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts)

4. `workflowCompletionRunner(...)` decides whether a workflow just completed.
- It requires:
  - an active placeholder workflow id
  - a fully completed checklist
  - either:
    - transition from incomplete to complete
    - or newly added auto-complete notices during that pass

5. If completion is detected, `workflowCompletionRunner(...)` calls `workflowCompletionHandler(...)`.

6. `workflowCompletionHandler(...)` checks its registry.
- no mapping -> `no_op`
- mapped tool success -> `tool_completed`
- mapped tool failure/throw -> `tool_failed`

7. `Task` interprets the runner result.
- `no_completion` -> do nothing
- `completed` + `shouldTeardown === false` -> preserve workflow state
- `completed` + `shouldTeardown === true` -> tear down placeholder-workflow state

## Ownership Boundaries

### `workflowCompletionRunner`

Owned by:

- [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts)

Responsibilities:

- determine whether placeholder workflow completion just occurred in the current progression pass
- call `workflowCompletionHandler(...)`
- return a structured result to `Task`

It does **not**:

- mutate `TaskState`
- persist metadata
- clear focus-chain state
- refresh the UI
- end the task/thread

### `workflowCompletionHandler`

Owned by:

- [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts)

Responsibilities:

- own the workflow-to-tool mapping seam
- dispatch an internal tool when a completed workflow has configured end automation
- return:
  - `no_op`
  - `tool_completed`
  - `tool_failed`

It does **not**:

- clear workflow state
- resolve placeholders on behalf of the mapped tool
- persist metadata
- own approval behavior
- change checklist state

### `Task`

Owned by:

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)

Responsibilities:

- call `workflowCompletionRunner(...)` after placeholder deterministic progression
- interpret the runner result
- clear placeholder-workflow runtime state when teardown is allowed
- clear the placeholder checklist projection
- persist cleared metadata
- refresh UI state

This separation is intentional. `Task` remains the owner of workflow teardown because it owns private runtime state such as `pendingWorkflowFormOutcome` and the metadata persistence seam.

## Internal Tool Dispatch

The internal dispatch seam is:

- [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts)
- `executeInternalToolSilently(...)`

This helper exists so workflow-end automation can invoke an internal runtime tool without pretending the AI asked for that tool in the conversation.

Its behavior:

- builds a normal `TaskConfig`
- executes the registered tool handler directly through the coordinator
- returns:
  - `true` when the tool result is not a formatted tool failure
  - `false` when the tool returns a formatted tool error
  - `false` when the tool throws

It intentionally does **not** route through normal tool execution side effects like:

- tool-result emission into conversation content
- checkpoint behavior
- focus-chain post-tool updates
- native tool-call tracking

## Placeholder Workflow Teardown

When `Task` receives a completed runner result with `shouldTeardown === true`, it clears placeholder-workflow state in:

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- `teardownCompletedPlaceholderWorkflow()`

The shipped teardown clears:

- `activePlaceholderWorkflowId`
- `activePlaceholderWorkflowSource`
- `activePlaceholderWorkflowValues`
- `activePlaceholderWorkflowStableValues`
- `activePlaceholderWorkflowDeterministicState`
- `activePlaceholderWorkflowTaskWriteProofPaths`
- `activeWorkflowFormSession`
- `suppressedWorkflowFormResolverIds`
- `pendingAutoCompletedPlaceholderWorkflowStepNotices`
- `activeWorkflowJustStarted`
- private `pendingWorkflowFormOutcome`

It then:

- clears the placeholder checklist projection
- persists cleared metadata

It does **not** clear unrelated runtime state such as:

- `activeAgentId`
- `activeAgentSkillName`
- `activeAgentInvokedSlashCommand`
- `activeWorkflowId`
- `managedWorkflowRun`

## Checklist Projection Clearing

The placeholder-workflow checklist projection clear path now exists in both:

- [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)
- `clearPlaceholderWorkflowChecklistProjection()`

and:

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- `clearPlaceholderWorkflowChecklistProjection()`

This clears:

- `currentFocusChainChecklist`
- `todoListWasUpdatedByUser`
- `apiRequestsSinceLastTodoUpdate`
- the persisted focus-chain markdown file on disk

## Failure Preservation Rule

The important safety rule is:

- if `workflowCompletionHandler(...)` returns `tool_failed`
- `Task` must **not** tear down the active placeholder workflow

This preserves:

- active placeholder values
- active placeholder workflow source
- current workflow context

That makes workflow-end bookkeeping retryable.

## Where The Runner Is Invoked

The generic completion check is invoked at the placeholder deterministic-progression seams in:

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- `updatePlaceholderWorkflowProgressAndMaybeRunCompletion(...)`
- `syncDeterministicProgressionAfterWorkflowFormTool(...)`

This means the completion runner is checked each time placeholder deterministic progression runs. It is not a startup poller and it is not a separate background process.

## Return Contracts

### `workflowCompletionHandler`

Returns only:

- `no_op`
- `tool_completed`
- `tool_failed`

### `workflowCompletionRunner`

Returns:

- `{ kind: "no_completion" }`

or:

- `{ kind: "completed", completedWorkflowId, handlerResult, shouldTeardown }`

This lets `Task` remain the owner of teardown while still keeping completion detection and handler orchestration isolated in a separate module.

## Tests Added For This Capability

The shipped generic coverage lives in:

- [workflowCompletionRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionRunner.test.ts)
- [ToolExecutor.nativeToolParity.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts)
- [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts)
- [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts)

These cover:

- completion detection
- no-op dispatch
- failure-preservation behavior
- silent internal-tool execution
- placeholder checklist clearing
- metadata persistence after teardown

## What This Capability Does Not Do

This deployment does **not** provide:

- a generic event bus
- a subscribable workflow-completed event system
- workflow-specific production mappings in the handler registry
- task/thread completion behavior
- prompt exposure for workflow-end automation tools

## Related Documents

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/requirements.md)
- [workflow-completion-handler-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/workflow-completion-handler-action-plan.md)
- [workflow-completion-runner-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/workflow-completion-runner-action-plan.md)
- [code-review-completion.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/code-review-completion.md)
