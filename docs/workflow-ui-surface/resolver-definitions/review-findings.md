# Workflow Form Resolver Review Findings

This document is organized around one question only:

- when the user clicks `Open inputs reference`, what exact text appears?

The shared UI behavior comes from [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L580-L605):

- the hyperlink is rendered only when the resolver is not in `success`
- automatic-status resolvers never render the hyperlink because the UI returns early at [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L561)
- every visible reference modal includes the same dialog description text:
  - `Read-only reference for the current workflow form tool.`

## 1. `code_review_step_3_diff_source`

- Resolver definition:
  - [WorkflowFormRegistry.ts#L364-L483](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L364)
- Reference hyperlink is shown on these panels:
  - `confirm`
  - `select_source`
  - `collect_inputs`
  - `retry_error`
- Reference modal title is set at:
  - [WorkflowFormRegistry.ts#L371](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L371)
- Reference modal body is generated from:
  - [buildToolDictionary.ts#L55-L77](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L55)
  - [buildToolDictionary.ts#L108-L109](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L108)
  - term text used inside that body comes from [systemDictionary.ts#L26-L179](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L26)

Exact text shown after the user clicks `Open inputs reference`:

```md
## Diff Source Reference

Read-only reference for the current workflow form tool.

## build_review_diff_output

Review diff artifact. The stable persisted diff output file created for the workflow at {diff_output}.

Diff source. The Git-backed source definition that tells the tool what changes to turn into the review diff artifact.

### Supported Source Variants

- `commit`: Single commit. A source variant that builds the diff artifact from one Git commit.
- `commit_range`: Commit range. A source variant that compares a base Git ref to a head Git ref.
- `ref_diff`: Git ref diff. A source variant that diffs two explicit Git refs directly.
- `worktree_head_scoped`: HEAD-scoped worktree diff. A source variant that compares staged and unstaged worktree changes against HEAD for specific repository-relative paths.

### Parameters

- `source` (required, object): Diff source. The Git-backed source definition that tells the tool what changes to turn into the review diff artifact. Supported variants: `commit`, `commit_range`, `ref_diff`, and `worktree_head_scoped`.
- `scoped_paths` (optional, array): Scoped paths. A list of repository-relative paths that narrows the diff to specific files or directories. Required when the source is `worktree_head_scoped`.
- `context_lines` (optional, integer): Context lines. The number of unchanged unified diff lines to keep around each change hunk. Defaults to 3 when omitted.

### Term Reference

- `source`: Diff source. The Git-backed source definition that tells the tool what changes to turn into the review diff artifact.
- `commit`: Single commit. A source variant that builds the diff artifact from one Git commit.
- `commit_range`: Commit range. A source variant that compares a base Git ref to a head Git ref.
- `ref_diff`: Git ref diff. A source variant that diffs two explicit Git refs directly.
- `worktree_head_scoped`: HEAD-scoped worktree diff. A source variant that compares staged and unstaged worktree changes against HEAD for specific repository-relative paths.
- `scoped_paths`: Scoped paths. A list of repository-relative paths that narrows the diff to specific files or directories.
- `context_lines`: Context lines. The number of unchanged unified diff lines to keep around each change hunk.
- `git_ref`: Git reference. A commit-ish identifier such as a commit hash, branch, tag, or remote branch reference.
- `commit_hash`: Commit hash. A specific commit identifier, usually a full or short SHA.
- `branch`: Branch. A movable Git ref that names a line of development.
- `tag`: Tag. A named Git ref that usually marks a release or milestone.
- `remote_branch_reference`: Remote branch reference. A remote-tracking Git ref such as origin/main.
- `repo_relative_path`: Repository-relative path. A file or directory path written relative to the repository root.
- `base`: Base reference. The starting Git ref for a two-sided comparison.
- `head`: Head reference. The ending Git ref for a two-sided comparison, or the current HEAD commit when the worktree is compared against HEAD.
- `staged_changes`: Staged changes. Worktree modifications already added to the Git index.
- `unstaged_changes`: Unstaged changes. Worktree modifications that are not yet added to the Git index.
- `unified_diff`: Unified diff. The standard patch format that shows added and removed lines with surrounding context.
- `artifact`: Review diff artifact. The stable persisted diff output file created for the workflow at {diff_output}.
```

## 2. `code_review_step_3_review_input`

- Resolver definition:
  - [WorkflowFormRegistry.ts#L484-L556](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L484)
- Presentation mode:
  - `automatic_status` at [WorkflowFormRegistry.ts#L494-L499](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L494)
- UI behavior:
  - the user sees the automatic-status card only
  - the reference hyperlink is not rendered because [ChatRow.tsx#L561](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L561) returns `WorkflowPreparationStatusRow` before the hyperlink block

Exact text shown after the user clicks `Open inputs reference`:

```text
No reference hyperlink is shown for this resolver in the live UI, so no reference modal can be opened.
```

Resolver-configured reference values that exist in code but are not user-clickable in this UI path:

- title source:
  - [WorkflowFormRegistry.ts#L492](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L492)
- body source:
  - [buildToolDictionary.ts#L78-L91](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L78)
  - [buildToolDictionary.ts#L108-L109](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L108)

## 3. `write_remediation_story_step_2_review_input`

- Resolver definition:
  - [WorkflowFormRegistry.ts#L557-L629](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L557)
- Presentation mode:
  - `automatic_status` at [WorkflowFormRegistry.ts#L567-L572](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L567)
- UI behavior:
  - the user sees the automatic-status card only
  - the reference hyperlink is not rendered because [ChatRow.tsx#L561](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L561) returns `WorkflowPreparationStatusRow` before the hyperlink block

Exact text shown after the user clicks `Open inputs reference`:

```text
No reference hyperlink is shown for this resolver in the live UI, so no reference modal can be opened.
```

Resolver-configured reference values that exist in code but are not user-clickable in this UI path:

- title source:
  - [WorkflowFormRegistry.ts#L565](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L565)
- body source:
  - [buildToolDictionary.ts#L78-L91](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L78)
  - [buildToolDictionary.ts#L108-L109](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L108)

## 4. `placeholder_workflow_start_set_workflow_placeholders`

- Resolver definition:
  - [WorkflowFormRegistry.ts#L630-L702](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L630)
- Reference hyperlink is shown on these panels:
  - `collect_inputs`
  - `retry_error`
- Reference modal title is set at:
  - [WorkflowFormRegistry.ts#L652](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L652)
- Reference modal body is generated from:
  - [WorkflowFormRegistry.ts#L235-L244](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L235)
  - [buildToolDictionary.ts#L24-L51](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L24)
  - [buildToolDictionary.ts#L108-L109](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L108)
  - the `values` parameter type comes from [set_workflow_placeholders.ts#L12-L24](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts#L12)

Exact text shown after the user clicks `Open inputs reference`:

```md
## Workflow Placeholder Reference

Read-only reference for the current workflow form tool.

## set_workflow_placeholders

Persist dynamic placeholder values for the active workflow before the first AI turn begins.

### Parameters

- `values` (required, object): Workflow placeholder key/value map. Submit only the placeholders the human actually supplied.

### Term Reference
```
