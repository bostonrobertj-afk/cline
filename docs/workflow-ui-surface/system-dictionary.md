# Workflow UI Surface System Dictionary

Generated from `src/core/task/workflow-form/dictionaries/systemDictionary.ts`.

## source

- Label: Diff source
- Medium: The Git-backed source definition that tells the tool what changes to turn into the review diff artifact.
- Long: A source describes the Git history or worktree comparison to inspect before writing the stable review diff artifact for workflow Step 3.
- Examples: {"type":"commit","commit":"abc1234"} | {"type":"ref_diff","base":"main","head":"feature/review"}
- Context tags: tool_input, workflow_form

## commit

- Label: Single commit
- Medium: A source variant that builds the diff artifact from one Git commit.
- Long: Use the commit source when one commit already contains the exact change set that should become the review diff artifact.
- Examples: abc1234 | HEAD~1
- Context tags: source_variant, git

## commit_range

- Label: Commit range
- Medium: A source variant that compares a base Git ref to a head Git ref.
- Long: Use the commit_range source when the review diff should cover all commits reachable from the head ref but not from the base ref.
- Examples: base=main, head=feature/review | base=v1.2.0, head=HEAD
- Context tags: source_variant, git

## ref_diff

- Label: Git ref diff
- Medium: A source variant that diffs two explicit Git refs directly.
- Long: Use the ref_diff source when the desired review input comes from comparing two named refs such as branches, tags, or remote branch references.
- Examples: base=origin/main, head=origin/feature/review | base=release, head=HEAD
- Context tags: source_variant, git

## worktree_head_scoped

- Label: HEAD-scoped worktree diff
- Medium: A source variant that compares staged and unstaged worktree changes against HEAD for specific repository-relative paths.
- Long: Use the worktree_head_scoped source when the review diff should come from the current worktree instead of a named historical Git ref comparison.
- Examples: src/components/Button.tsx | packages/core/src/index.ts
- Context tags: source_variant, worktree

## scoped_paths

- Label: Scoped paths
- Medium: A list of repository-relative paths that narrows the diff to specific files or directories.
- Long: Scoped paths keep the review diff focused by restricting the Git comparison to one or more repository-relative paths instead of the entire repo.
- Examples: src/features/review | packages/core/src/index.ts
- Context tags: tool_input, path_filter

## context_lines

- Label: Context lines
- Medium: The number of unchanged unified diff lines to keep around each change hunk.
- Long: Context lines control how much unchanged surrounding code the tool keeps in the generated unified diff artifact.
- Examples: 3 | 5
- Context tags: tool_input, diff_format

## git_ref

- Label: Git reference
- Medium: A commit-ish identifier such as a commit hash, branch, tag, or remote branch reference.
- Long: Git references are the names or hashes that Git can resolve to a commit or comparison point for the review diff source.
- Examples: main | origin/feature/review | abc1234
- Context tags: git, identifier

## commit_hash

- Label: Commit hash
- Medium: A specific commit identifier, usually a full or short SHA.
- Long: A commit hash points to one exact commit and is the most precise way to describe a single-commit diff source.
- Examples: abc1234 | f4c2b6171a9d
- Context tags: git, identifier

## branch

- Label: Branch
- Medium: A movable Git ref that names a line of development.
- Long: A branch is a named Git reference that usually follows the latest commit in a stream of work and can be used anywhere a Git ref is accepted.
- Examples: main | feature/review-form
- Context tags: git, identifier

## tag

- Label: Tag
- Medium: A named Git ref that usually marks a release or milestone.
- Long: A tag is a stable Git reference that points at a specific commit and can be used as a base or head comparison point.
- Examples: v1.2.0 | release-2026-03-29
- Context tags: git, identifier

## remote_branch_reference

- Label: Remote branch reference
- Medium: A remote-tracking Git ref such as origin/main.
- Long: A remote branch reference names the last fetched state of a branch from a remote and is often useful for ref_diff comparisons.
- Examples: origin/main | upstream/release
- Context tags: git, identifier

## repo_relative_path

- Label: Repository-relative path
- Medium: A file or directory path written relative to the repository root.
- Long: Repository-relative paths scope the diff without depending on an absolute machine-specific filesystem location.
- Examples: src/core/task/index.ts | webview-ui/src/components/chat
- Context tags: path, repository

## base

- Label: Base reference
- Medium: The starting Git ref for a two-sided comparison.
- Long: The base reference marks the earlier or left-hand side of a commit_range or ref_diff comparison.
- Examples: main | origin/main
- Context tags: git, comparison

## head

- Label: Head reference
- Medium: The ending Git ref for a two-sided comparison, or the current HEAD commit when the worktree is compared against HEAD.
- Long: The head reference marks the later or right-hand side of a commit_range or ref_diff comparison and also names the current checked-out commit in worktree-based comparisons.
- Examples: HEAD | feature/review-form
- Context tags: git, comparison

## staged_changes

- Label: Staged changes
- Medium: Worktree modifications already added to the Git index.
- Long: Staged changes are edits prepared for the next commit and are included when the worktree_head_scoped diff source is built.
- Examples: git add src/core/task/index.ts | indexed hunk selections
- Context tags: git, worktree

## unstaged_changes

- Label: Unstaged changes
- Medium: Worktree modifications that are not yet added to the Git index.
- Long: Unstaged changes are local edits still only in the working tree and are also included when the worktree_head_scoped diff source is built.
- Examples: modified file on disk | local edits not yet added
- Context tags: git, worktree

## unified_diff

- Label: Unified diff
- Medium: The standard patch format that shows added and removed lines with surrounding context.
- Long: Unified diff is the patch representation the tool writes into the stable review artifact so downstream workflow steps can consume it consistently.
- Examples: @@ -10,3 +10,5 @@ | +new line
- Context tags: diff, artifact_format

## artifact

- Label: Review diff artifact
- Medium: The stable persisted diff output file created for the workflow at {diff_output}.
- Long: The artifact is the saved review-input diff file that Step 3 produces so later workflow steps can read a deterministic diff input.
- Examples: .cline/review-input.diff | review-input.diff
- Context tags: workflow, output
