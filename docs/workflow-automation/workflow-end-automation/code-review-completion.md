# Code Review Workflow Completion Requirements

## Purpose

This document defines the first workflow-specific completion use case for `workflowCompletionHandler`.

It exists to ensure the generic workflow-completion capability can support `code-review.md` without narrowing the generic runtime contract to code review only.

This document does not redefine the generic responsibilities of:

- `workflowCompletionRunner`
- `workflowCompletionHandler`

Those generic responsibilities remain defined in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/requirements.md)

## Workflow-Specific Goal

When the `code-review.md` placeholder workflow completes, `workflowCompletionHandler` must invoke the already-built internal runtime tool `code_review_spec_update`.

That tool is responsible for:

- merging the final review-authored writable content from `review_input.md` into `{spec_file}`
- clearing `review_input.md`
- recording write proof for `{spec_file}`

The tool contract itself is already defined in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review-final-documentation/requirements.md)

## Trigger Contract

This use case applies only when:

- `workflowCompletionRunner` has already determined that the active placeholder workflow just completed
- `completedWorkflowId === "code-review.md"`

This workflow-specific document must not change the generic workflow-completion trigger mechanism.

## Dispatch Contract

For this use case, `workflowCompletionHandler` must:

- recognize `completedWorkflowId === "code-review.md"`
- map that workflow id to the internal runtime tool id `code_review_spec_update`
- invoke that internal tool with direct call + await

The dispatch must be internal runtime behavior only.

It must not:

- expose `code_review_spec_update` to AI prompt tool catalogs
- expose `code_review_spec_update` in the contextual native-tool matrix
- require new agent-authored tool calls
- require new workflow-form behavior

## Success And Failure Contract

For `completedWorkflowId === "code-review.md"`:

- if `code_review_spec_update` succeeds, `workflowCompletionHandler` must return `tool_completed`
- if `code_review_spec_update` fails or returns a failure result, `workflowCompletionHandler` must return `tool_failed`

`workflowCompletionHandler` must not reinterpret or rewrite the tool's result contract.

It may translate the internal dispatch outcome into:

- `tool_completed`
- `tool_failed`

but it must not replace the tool's own approval behavior, placeholder resolution, merge behavior, or file-write behavior.

## Approval And File Mutation Behavior

For this use case, `workflowCompletionHandler` must rely on the existing `code_review_spec_update` tool behavior for:

- placeholder resolution
- file approval behavior
- spec-file mutation
- review-input clearing
- write-proof recording

`workflowCompletionHandler` must not duplicate any of those responsibilities.

## Failure Preservation Rule

If `code_review_spec_update` returns failure for `code-review.md` completion:

- `workflowCompletionHandler` must return `tool_failed`
- `workflowCompletionRunner` must leave placeholder-workflow runtime state intact

This is required so the workflow-end bookkeeping for code review can be retried safely without losing:

- active placeholder values
- the active workflow id
- the active workflow source

## Non-Goals

This code-review-specific completion support is not responsible for:

- deciding when the workflow completed
- clearing workflow-active runtime state
- ending the task or conversation thread
- defining generic workflow-end automation for all workflows
- redefining the `code_review_spec_update` merge contract
