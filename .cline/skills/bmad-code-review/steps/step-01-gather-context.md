---
diff_output: '' # set at runtime; path to the persisted exact diff artifact when one exists
spec_file: '' # set at runtime (path or empty)
review_input: '' # set at runtime; path to the persisted review-input.md artifact when one exists
review_mode: '' # set at runtime: "full" or "no-spec"
review_input_type: '' # set at runtime: "diff", "file-bundle", or "file-scope"
---

# Code Review

## Meta
- Goal: determine what should be reviewed and construct normalized review input without starting the actual code review.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Preserve contextual review artifacts such as story-derived scope manifests even when an exact diff is also recovered.
- If the current step establishes a dynamic workflow-state valuE, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

- [ ] Step 1: Determine Review Source
## Details
Determine what to review from the user's prompt before asking follow-up questions.

Prefer these interpretations when they clearly apply:
- completed story: the user provided a story file, or mentioned a story by name or number such as `1.2`
- specific files or files: the user provided a list of files or a folder to focus on
- git-backed: the user referenced a git-backed source without providing a story file, story name, or story number
- provided diff: the user pasted or attached diff content directly

For git-backed requests, prefer these interpretations:
- `staged` or `staged changes` means staged changes only
- `uncommitted`, `working tree`, or `all changes` means staged and unstaged changes against `HEAD`
- `latest commit` or similar means the latest committed change
- `specific commit`, `commit hash`, or an explicit SHA means a specific committed change by hash
- `commit range`, `last N commits`, or an explicit SHA range means a commit range
- `branch diff`, `vs main`, `against main`, or similar means a branch diff
- `remote branch`, `pushed changes`, or similar means the remote branch state

If the review source is still unclear, ask the user to choose explicitly using this tool shape:

<ask_followup_question>
<question>What should I review?</question>
<options>["Provided story file", "staged changes only", "staged + unstaged changes against HEAD", "latest committed change", "specific committed change by commit hash", "committed changes across a specific commit range", "committed changes on the current branch against the base branch", "committed + pushed changes exactly as they exist on the remote branch", "provided diff", "provided file list"]</options>
</ask_followup_question>

- [ ] Step 2: Construct Review Input
## Details
Construct a normalized review input without starting the actual code review yet.

When the user provides a concrete story file or spec file path, load it directly with the file-reading tool rather than broad discovery:

<read_file>
<path>THE_USER_PROVIDED_STORY_OR_SPEC_PATH</path>
</read_file>

If the user mentions a story or story number but does not provide a full path, search `{output_folder}` for the matching story file and load that file directly with the file-reading tool.

When processing a story file in this step:
- Do not perform the code review yet.
- Parse only the story context needed to build normalized review input:
  - status
  - acceptance criteria
  - completion notes
  - change log
  - Dev Agent Record
  - File List or any equivalent list of touched files
- If the story describes what changed and which files were touched, but does not provide commit hashes, branch references, PR references, or explicit date/time anchors, treat the story as a scoped hint rather than an exact git-backed change source.
- Use story-provided change descriptions and touched-file lists to define candidate review scope, but do not assume they uniquely identify the exact Git change set.
- Do not bulk-read the full contents of every listed implementation file in this phase unless the user explicitly supplied those files or a later step requires targeted inspection.
- Persist a normalized story-derived review artifact as `review-input.md` in `{output_folder}` and set `{review_input}` to that artifact path using the `set_workflow_placeholders` tool.
- When the story provides enough scope to attempt Git correlation, also try to recover an exact diff for the work so downstream blind review can use actual changed-code evidence.
- Do not treat a heuristic history match as exact unless the recovered diff can be justified directly from the available Git evidence.

After loading a story file:
- Set `{spec_file}` to the resolved story file path using the `set_workflow_placeholders` tool.
- Set `{review_mode}` to `full` using the `set_workflow_placeholders` tool.

If the story contains a `### File List` section or equivalent:
- Validate each listed path when the file should still exist in the workspace.
- Capture only:
  - the normalized file path list
  - the file count
  - any story-described notes about what changed
- Keep the normalized scope/context in `review-input.md`.
- Attempt to build an exact `review-input.diff` for the scoped files as well.
- Prefer exact diff recovery in this order when applicable:
  - an explicit commit, commit range, branch diff, or remote branch reference from the user or story
  - `git diff HEAD -- <scoped-paths>` for tracked scoped files with unstaged and/or staged changes
  - another exact Git-backed diff source that can be directly justified from available evidence
- If an exact diff is recovered:
  - persist it as `review-input.diff` in `{output_folder}`
  - set `{diff_output}` to that artifact path using the `set_workflow_placeholders` tool
  - set `{review_input_type}` to `diff` using the `set_workflow_placeholders` tool
- If no exact diff can be recovered:
  - keep `{review_input}` as the primary artifact
  - set `{review_input_type}` to `file-scope` using the `set_workflow_placeholders` tool

If the story file lacks a usable File List but names changed files elsewhere:
- Build the same lightweight scope manifest from the paths documented in completion notes, change log, or other story sections.
- Keep that manifest in `review-input.md`.
- Attempt to recover an exact `review-input.diff` using any directly supportable Git evidence tied to the documented scope.
- If an exact diff is recovered:
  - persist it as `review-input.diff` in `{output_folder}`
  - set `{diff_output}` to that artifact path using the `set_workflow_placeholders` tool
  - set `{review_input_type}` to `diff` using the `set_workflow_placeholders` tool
- If no exact diff can be recovered:
  - keep `{review_input}` as the primary artifact
  - set `{review_input_type}` to `file-scope` using the `set_workflow_placeholders` tool

If the story file documents a specific commit range or another explicit diff source:
- Use that documented range or diff source only when it is explicitly available and more faithful than the lightweight file-scope manifest.
- If that exact diff source is recovered successfully:
  - persist it as `review-input.diff` in `{output_folder}`
  - set `{diff_output}` to that artifact path using the `set_workflow_placeholders` tool
  - set `{review_input_type}` to `diff` using the `set_workflow_placeholders` tool

If the story file does not identify changed files well enough to build review scope:
- Ask the user to provide either the intended file list, a diff, or a commit range.
- Do not guess a commit range from time or branch history alone.

If no exact git reference is available:
- Use the story file's own last Git-tracked update and/or filesystem modified time only as heuristic search anchors.
- If later steps correlate Git history from those anchors, clearly mark the resulting match as `inferred`, `likely`, or `ambiguous` rather than exact.

For exact git-backed review sources, prefer these precise commands:

- staged changes only:
<execute_command>
<command>git diff --cached</command>
<requires_approval>false</requires_approval>
</execute_command>

- staged + unstaged changes against `HEAD`:
<execute_command>
<command>git diff HEAD</command>
<requires_approval>false</requires_approval>
</execute_command>

- latest committed change:
<execute_command>
<command>git show --stat --patch HEAD</command>
<requires_approval>false</requires_approval>
</execute_command>

- specific committed change by commit hash:
<execute_command>
<command>git show --stat --patch &lt;commit-hash&gt;</command>
<requires_approval>false</requires_approval>
</execute_command>

- committed changes across a specific commit range:
<execute_command>
<command>git diff &lt;older-commit&gt;..&lt;newer-commit&gt;</command>
<requires_approval>false</requires_approval>
</execute_command>

- committed changes on the current branch against the base branch:
<execute_command>
<command>git diff origin/main...HEAD</command>
<requires_approval>false</requires_approval>
</execute_command>

- committed + pushed changes exactly as they exist on the remote branch:
<execute_command>
<command>git diff origin/main...origin/&lt;branch-name&gt;</command>
<requires_approval>false</requires_approval>
</execute_command>

When constructing exact diff-based review input:
- For a branch diff, verify the base branch exists before running the diff. If it does not exist, ask the user for a valid branch.
- For a commit range, verify the range resolves before using it. If it does not resolve, ask the user for a valid commit range.
- For a provided diff, validate that the content is non-empty and parseable as a unified diff. If it is empty or invalid, ask the user to provide a valid diff.
- Persist the resulting exact diff as `review-input.diff` in `{output_folder}`.
- Set `{diff_output}` to the persisted artifact path using the `set_workflow_placeholders` tool.
- Set `{review_input_type}` to `diff` using the `set_workflow_placeholders` tool.

If the chosen source is a provided file list:
- Validate each listed path exists in the working tree. If any provided path does not exist, ask the user to correct the file list.
- Persist a normalized scope manifest as `review-input.md` in `{output_folder}` and set `{review_input}` to that artifact path using the `set_workflow_placeholders` tool.
- Construct review input from those paths:
  - use `git diff HEAD -- <paths>` for tracked files with uncommitted changes
  - use `git diff --no-index /dev/null <path>` for untracked files that should be reviewed as new files
- If the resulting diff is non-empty:
  - persist it as `review-input.diff` in `{output_folder}`
  - set `{diff_output}` to the persisted artifact path using the `set_workflow_placeholders` tool
  - set `{review_input_type}` to `diff` using the `set_workflow_placeholders` tool
- If the resulting diff is empty:
  - ask the user whether to review the full file contents or choose a different baseline
  - if the user chooses full file contents, build a labeled file bundle in `review-input.md`, keep `{review_input}` pointed at that artifact path, and set `{review_input_type}` to `file-bundle`

If the chosen source is staged or uncommitted changes:
- Construct review input from the selected working-tree state using the exact git commands above.
- Persist the resulting diff as `review-input.diff` in `{output_folder}`.
- Set `{diff_output}` to the persisted artifact path using the `set_workflow_placeholders` tool.
- Set `{review_input_type}` to `diff` using the `set_workflow_placeholders` tool.

After constructing review input from any source:
- Verify that at least one usable persisted artifact exists:
  - `{diff_output}` when an exact diff was recovered
  - `{review_input}` when contextual scope or file-bundle input was prepared
- Prefer keeping both artifacts when both are available and faithful.
- If neither usable artifact exists, halt and tell the user there is nothing to review.

- [ ] Step 3: Load Spec and Context Documents
## Details
Load declared context only.
Do not start comparing implementation against the spec in this phase.

If the chosen review source was a provided story file:
- The story file is already loaded as primary review context.
- If the story file has a `context` field in its frontmatter listing additional docs, load each referenced document.
- Warn the user about any referenced docs that cannot be found.

If the chosen review source was not a provided story file:
- Ask the user whether there is a spec or story file that provides context for these changes.

If the user provides a spec or story file:
- Set `{spec_file}` to the provided path using the `set_workflow_placeholders` tool.
- Verify the file exists and is readable.
- Set `{review_mode}` to `full` using the `set_workflow_placeholders` tool.
- If the file has a `context` field in its frontmatter listing additional docs, load each referenced document.
- Warn the user about any referenced docs that cannot be found.

If the user does not provide a spec or story file:
- Set `{review_mode}` to `no-spec` using the `set_workflow_placeholders` tool.

- [ ] Step 4: Check Review Size and Confirm Readiness
## Details
Estimate whether the artifact that downstream reviewers will actually use exceeds roughly 3000 lines:
- prefer `{diff_output}` when an exact diff exists
- otherwise use `{review_input}`

If that downstream review artifact exceeds roughly 3000 lines:
- Warn the user that the review input is large and offer to chunk the review by file group.
- If the user opts to chunk the review:
  - agree on the first file group
  - narrow the downstream review artifact to that group
  - list the remaining groups for follow-up runs
- If the user declines chunking:
  - proceed with the full prepared review input

Before leaving this phase:
- Present a summary with `{review_input_type}`, whether `{diff_output}` was recovered, whether `{review_input}` was prepared, scope stats, `{review_mode}`, and any loaded spec/context docs.
- Ask whether the review should proceed with the prepared scope.
- Offer at least these options: `[P] Proceed`, `[C] Change scope`, and `[S] Stop review`.

If the user chooses to change scope:
- Return to review-source selection and rebuild the relevant review artifacts using the updated scope.

If the user chooses to stop review:
- Stop the workflow cleanly and confirm that no review findings were produced.


