export interface WorkflowFormSystemDictionaryEntry {
	label: string
	medium: string
	long: string
	examples: string[]
	contextTags: string[]
}

export const PHASE_1_SYSTEM_DICTIONARY_KEYS = [
	"source",
	"commit",
	"commit_range",
	"ref_diff",
	"worktree_head_scoped",
	"scoped_paths",
	"context_lines",
	"git_ref",
	"commit_hash",
	"branch",
	"tag",
	"remote_branch_reference",
	"repo_relative_path",
	"base",
	"head",
	"staged_changes",
	"unstaged_changes",
	"unified_diff",
	"artifact",
] as const

export type WorkflowFormSystemDictionaryKey = (typeof PHASE_1_SYSTEM_DICTIONARY_KEYS)[number]

export const workflowFormSystemDictionary: Record<WorkflowFormSystemDictionaryKey, WorkflowFormSystemDictionaryEntry> = {
	source: {
		label: "Diff source",
		medium: "The Git-backed source definition that tells the tool what changes to turn into the review diff artifact.",
		long: "A source describes the Git history or worktree comparison to inspect before writing the stable review diff artifact for workflow Step 3.",
		examples: ['{"type":"commit","commit":"abc1234"}', '{"type":"ref_diff","base":"main","head":"feature/review"}'],
		contextTags: ["tool_input", "workflow_form"],
	},
	commit: {
		label: "Single commit",
		medium: "A source variant that builds the diff artifact from one Git commit.",
		long: "Use the commit source when one commit already contains the exact change set that should become the review diff artifact.",
		examples: ["abc1234", "HEAD~1"],
		contextTags: ["source_variant", "git"],
	},
	commit_range: {
		label: "Commit range",
		medium: "A source variant that compares a base Git ref to a head Git ref.",
		long: "Use the commit_range source when the review diff should cover all commits reachable from the head ref but not from the base ref.",
		examples: ["base=main, head=feature/review", "base=v1.2.0, head=HEAD"],
		contextTags: ["source_variant", "git"],
	},
	ref_diff: {
		label: "Git ref diff",
		medium: "A source variant that diffs two explicit Git refs directly.",
		long: "Use the ref_diff source when the desired review input comes from comparing two named refs such as branches, tags, or remote branch references.",
		examples: ["base=origin/main, head=origin/feature/review", "base=release, head=HEAD"],
		contextTags: ["source_variant", "git"],
	},
	worktree_head_scoped: {
		label: "HEAD-scoped worktree diff",
		medium: "A source variant that compares staged and unstaged worktree changes against HEAD for specific repository-relative paths.",
		long: "Use the worktree_head_scoped source when the review diff should come from the current worktree instead of a named historical Git ref comparison.",
		examples: ["src/components/Button.tsx", "packages/core/src/index.ts"],
		contextTags: ["source_variant", "worktree"],
	},
	scoped_paths: {
		label: "Scoped paths",
		medium: "A list of repository-relative paths that narrows the diff to specific files or directories.",
		long: "Scoped paths keep the review diff focused by restricting the Git comparison to one or more repository-relative paths instead of the entire repo.",
		examples: ["src/features/review", "packages/core/src/index.ts"],
		contextTags: ["tool_input", "path_filter"],
	},
	context_lines: {
		label: "Context lines",
		medium: "The number of unchanged unified diff lines to keep around each change hunk.",
		long: "Context lines control how much unchanged surrounding code the tool keeps in the generated unified diff artifact.",
		examples: ["3", "5"],
		contextTags: ["tool_input", "diff_format"],
	},
	git_ref: {
		label: "Git reference",
		medium: "A commit-ish identifier such as a commit hash, branch, tag, or remote branch reference.",
		long: "Git references are the names or hashes that Git can resolve to a commit or comparison point for the review diff source.",
		examples: ["main", "origin/feature/review", "abc1234"],
		contextTags: ["git", "identifier"],
	},
	commit_hash: {
		label: "Commit hash",
		medium: "A specific commit identifier, usually a full or short SHA.",
		long: "A commit hash points to one exact commit and is the most precise way to describe a single-commit diff source.",
		examples: ["abc1234", "f4c2b6171a9d"],
		contextTags: ["git", "identifier"],
	},
	branch: {
		label: "Branch",
		medium: "A movable Git ref that names a line of development.",
		long: "A branch is a named Git reference that usually follows the latest commit in a stream of work and can be used anywhere a Git ref is accepted.",
		examples: ["main", "feature/review-form"],
		contextTags: ["git", "identifier"],
	},
	tag: {
		label: "Tag",
		medium: "A named Git ref that usually marks a release or milestone.",
		long: "A tag is a stable Git reference that points at a specific commit and can be used as a base or head comparison point.",
		examples: ["v1.2.0", "release-2026-03-29"],
		contextTags: ["git", "identifier"],
	},
	remote_branch_reference: {
		label: "Remote branch reference",
		medium: "A remote-tracking Git ref such as origin/main.",
		long: "A remote branch reference names the last fetched state of a branch from a remote and is often useful for ref_diff comparisons.",
		examples: ["origin/main", "upstream/release"],
		contextTags: ["git", "identifier"],
	},
	repo_relative_path: {
		label: "Repository-relative path",
		medium: "A file or directory path written relative to the repository root.",
		long: "Repository-relative paths scope the diff without depending on an absolute machine-specific filesystem location.",
		examples: ["src/core/task/index.ts", "webview-ui/src/components/chat"],
		contextTags: ["path", "repository"],
	},
	base: {
		label: "Base reference",
		medium: "The starting Git ref for a two-sided comparison.",
		long: "The base reference marks the earlier or left-hand side of a commit_range or ref_diff comparison.",
		examples: ["main", "origin/main"],
		contextTags: ["git", "comparison"],
	},
	head: {
		label: "Head reference",
		medium: "The ending Git ref for a two-sided comparison, or the current HEAD commit when the worktree is compared against HEAD.",
		long: "The head reference marks the later or right-hand side of a commit_range or ref_diff comparison and also names the current checked-out commit in worktree-based comparisons.",
		examples: ["HEAD", "feature/review-form"],
		contextTags: ["git", "comparison"],
	},
	staged_changes: {
		label: "Staged changes",
		medium: "Worktree modifications already added to the Git index.",
		long: "Staged changes are edits prepared for the next commit and are included when the worktree_head_scoped diff source is built.",
		examples: ["git add src/core/task/index.ts", "indexed hunk selections"],
		contextTags: ["git", "worktree"],
	},
	unstaged_changes: {
		label: "Unstaged changes",
		medium: "Worktree modifications that are not yet added to the Git index.",
		long: "Unstaged changes are local edits still only in the working tree and are also included when the worktree_head_scoped diff source is built.",
		examples: ["modified file on disk", "local edits not yet added"],
		contextTags: ["git", "worktree"],
	},
	unified_diff: {
		label: "Unified diff",
		medium: "The standard patch format that shows added and removed lines with surrounding context.",
		long: "Unified diff is the patch representation the tool writes into the stable review artifact so downstream workflow steps can consume it consistently.",
		examples: ["@@ -10,3 +10,5 @@", "+new line"],
		contextTags: ["diff", "artifact_format"],
	},
	artifact: {
		label: "Review diff artifact",
		medium: "The stable persisted diff output file created for the workflow at {diff_output}.",
		long: "The artifact is the saved review-input diff file that Step 3 produces so later workflow steps can read a deterministic diff input.",
		examples: [".cline/review-input.diff", "review-input.diff"],
		contextTags: ["workflow", "output"],
	},
}

export function renderSystemDictionaryMarkdown(): string {
	const lines = [
		"# Workflow UI Surface System Dictionary",
		"",
		"Generated from `src/core/task/workflow-form/dictionaries/systemDictionary.ts`.",
		"",
	]

	for (const key of PHASE_1_SYSTEM_DICTIONARY_KEYS) {
		const entry = workflowFormSystemDictionary[key]
		lines.push(`## ${key}`)
		lines.push("")
		lines.push(`- Label: ${entry.label}`)
		lines.push(`- Medium: ${entry.medium}`)
		lines.push(`- Long: ${entry.long}`)
		lines.push(`- Examples: ${entry.examples.join(" | ")}`)
		lines.push(`- Context tags: ${entry.contextTags.join(", ")}`)
		lines.push("")
	}

	return `${lines.join("\n").trimEnd()}\n`
}
