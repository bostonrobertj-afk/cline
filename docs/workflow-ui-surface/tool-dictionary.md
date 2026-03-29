# Workflow UI Surface Tool Dictionary

Generated from `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`.

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
