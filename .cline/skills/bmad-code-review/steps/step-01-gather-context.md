---
diff_output: '' # set at runtime
spec_file: '' # set at runtime (path or empty)
review_mode: '' # set at runtime: "full" or "no-spec"
---

# step 01 gather context

## META

- Goal: gather the diff, supporting context, and review scope needed before adversarial review begins.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Determine what should be reviewed">
  <action>
    Detect the review intent from the invocation text before asking the user to choose manually.
    <detail>
      Match phrases such as:
      - `staged` or `staged changes` -> staged changes only
      - `uncommitted`, `working tree`, or `all changes` -> staged and unstaged changes
      - `branch diff`, `vs main`, `against main`, or `compared to {branch}` -> branch diff
      - `commit range`, `last N commits`, or `{sha}..{sha}` -> specific commit range
      - `this diff`, `provided diff`, or `paste` -> user-provided diff
      Prefer the most specific match if multiple phrases appear.
    </detail>
  </action>
  <branch if="a clear review target is detected from the invocation text">
    <output>Announce the detected review mode and continue using that source.</output>
  </branch>
  <branch if="no clear review target is detected from the invocation text">
    <action>
      Check sprint tracking for any story currently in review.
      <detail>
        Look for sprint status files such as `*sprint-status*` in `{implementation_artifacts}` or `{planning_artifacts}`.
      </detail>
    </action>
    <branch if="exactly one story is in `review` status">
      <ask>Ask whether the user wants to review the changes for that story before falling back to manual source selection.</ask>
      <branch if="the user confirms the review-status story">
        <action>
          Use the story context to determine the review source.
          <detail>
            Prefer the story's branch when that context is available.
            If no branch context is available, fall back to the uncommitted changes associated with the working tree.
          </detail>
        </action>
      </branch>
    </branch>
    <branch if="multiple stories are in `review` status">
      <ask>Present the review-status stories as numbered choices plus a manual-choice option, then wait for the user to choose.</ask>
      <branch if="the user selects one of the review-status stories">
        <action>
          Use the selected story context to determine the review source.
          <detail>
            Prefer the story's branch when that context is available.
            If no branch context is available, fall back to the uncommitted changes associated with the working tree.
          </detail>
        </action>
      </branch>
    </branch>
    <branch if="no review target is resolved from invocation text or sprint tracking">
      <ask>
        Ask what the user wants to review.
        <detail>
          Present:
          - uncommitted changes
          - staged changes only
          - branch diff versus a base branch
          - specific commit range
          - provided diff or file list
        </detail>
      </ask>
    </branch>
  </branch>
</step>

<step n="2" goal="Construct the review diff from the chosen source">
  <action>Construct `{diff_output}` from the chosen review source.</action>
  <branch if="review source is uncommitted changes">
    <action>Build `{diff_output}` from staged and unstaged working-tree changes.</action>
  </branch>
  <branch if="review source is staged changes only">
    <action>Build `{diff_output}` from staged changes only.</action>
  </branch>
  <branch if="review source is branch diff">
    <action>Verify that the requested base branch exists before running `git diff`.</action>
    <ask if="the base branch does not exist">Ask the user for a valid base branch before proceeding.</ask>
  </branch>
  <branch if="review source is commit range">
    <action>Verify that the requested commit range resolves correctly.</action>
    <ask if="the commit range does not resolve">Ask the user for a valid commit range before proceeding.</ask>
  </branch>
  <branch if="review source is provided diff">
    <action>Validate that the provided diff content is non-empty and parseable as a unified diff.</action>
    <ask if="the provided diff is not parseable">Ask the user to provide a valid diff.</ask>
  </branch>
  <branch if="review source is file list">
    <action>
      Validate that each provided path exists in the working tree and build `{diff_output}` from those paths.
      <detail>
        If a path is untracked, use `git diff --no-index /dev/null <path>` so the new file can still be reviewed.
      </detail>
    </action>
    <ask if="the file-list diff is empty">Ask whether the user wants to review the full file contents or specify a different baseline.</ask>
  </branch>
  <ask if="`{diff_output}` is empty after construction">Tell the user there is nothing to review and halt.</ask>
</step>

<step n="3" goal="Determine whether spec or story context exists for the review">
  <ask>Ask whether there is a spec or story file that provides context for these changes.</ask>
  <branch if="the user provides a spec or story file">
    <action>Set `{spec_file}` to the provided path, verify that it exists and is readable, and set `{review_mode}` to `full`.</action>
  </branch>
  <branch if="the user does not provide a spec or story file">
    <action>Set `{review_mode}` to `no-spec`.</action>
  </branch>
</step>

<step n="4" goal="Load any additional context documents when full review context is available">
  <branch if="`{review_mode}` is `full` and the file at `{spec_file}` has a `context` field in its frontmatter">
    <action>
      Load each referenced context document.
      <detail>
        Warn the user about any referenced documents that cannot be found so the review can note missing context explicitly.
      </detail>
    </action>
  </branch>
</step>

<step n="5" goal="Manage oversized review scopes before adversarial review begins">
  <branch if="`{diff_output}` exceeds approximately 3000 lines">
    <output>Warn the user that the review scope is large and offer to chunk the review by file group.</output>
    <branch if="the user opts to chunk the review">
      <action>Agree on the first review group, narrow `{diff_output}` accordingly, and list the remaining groups for later follow-up reviews.</action>
    </branch>
    <branch if="the user declines chunking">
      <action>Proceed with the full diff as-is.</action>
    </branch>
  </branch>
</step>

## CHECKPOINT

Present a summary before proceeding: diff stats (files changed, lines added or removed), `{review_mode}`, and any loaded spec or context documents. Halt and wait for user confirmation before advancing.

## ADVISORY

- The prompt that triggered this workflow is the primary signal for review intent, not a vague hint.
- Do not modify any files in this phase. This phase is read-only and exists only to establish review scope and context.
