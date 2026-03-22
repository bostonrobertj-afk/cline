---
diff_output: '' # set at runtime
spec_file: '' # set at runtime (path or empty)
review_mode: '' # set at runtime: "full" or "no-spec"
---

# step 01 gather context

## META

- Goal: determine what to review, construct the diff input, and load any spec context needed for the review.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- This phase is read-only. Do not modify project files while gathering review context.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Determine the review target">
  <action>
    Detect review intent from the triggering prompt before asking the user to choose manually.
    <detail>
      - "staged" / "staged changes" -> staged changes only
      - "uncommitted" / "working tree" / "all changes" -> staged + unstaged changes
      - "branch diff" / "vs main" / "against main" / "compared to {branch}" -> branch diff
      - "commit range" / "last N commits" / "{sha}..{sha}" -> specific commit range
      - "this diff" / "provided diff" / "paste" -> user-provided diff
      - when multiple phrases match, prefer the most specific match
    </detail>
  </action>
  <branch if="a clear review mode is detected from the triggering prompt" optional="true">
    <output>Announce the detected review mode and proceed with that source.</output>
  </branch>
  <branch if="no clear review mode is detected from the triggering prompt" optional="true">
    <action>
      Check sprint tracking for stories currently in `review` status.
      <detail>
        Look for a sprint status file in `{implementation_artifacts}` or `{planning_artifacts}` and scan for stories in `review`.
      </detail>
    </action>
    <branch if="exactly one review story is found" optional="true">
      <ask>Ask whether the user wants to review that story's changes. Offer `[Y] Yes` or `[N] No, let me choose`.</ask>
      <branch if="the user confirms the suggested story" optional="true">
        <action>Use the selected story context to determine the diff source.</action>
      </branch>
      <branch if="the user declines the suggested story" optional="true">
        <ask>
          Ask what to review and present these options: uncommitted changes, staged changes only, branch diff, specific commit range, or provided diff/file list.
        </ask>
      </branch>
    </branch>
    <branch if="multiple review stories are found" optional="true">
      <ask>Present the review stories as numbered options plus a manual-choice option, then wait for the user to choose.</ask>
      <branch if="the user selects one of the review stories" optional="true">
        <action>Use the selected story context to determine the diff source.</action>
      </branch>
      <branch if="the user chooses a manual review source instead" optional="true">
        <ask>
          Ask what to review and present these options: uncommitted changes, staged changes only, branch diff, specific commit range, or provided diff/file list.
        </ask>
      </branch>
    </branch>
    <branch if="no review story is found in sprint tracking" optional="true">
      <ask>
        Ask what to review and present these options: uncommitted changes, staged changes only, branch diff, specific commit range, or provided diff/file list.
      </ask>
    </branch>
  </branch>
</step>

<step n="2" goal="Construct `{diff_output}` from the chosen source">
  <branch if="the chosen source is a branch diff" optional="true">
    <action>Verify the base branch exists before running `git diff`.</action>
    <ask if="the base branch does not exist">HALT and ask the user for a valid branch.</ask>
    <action>Construct `{diff_output}` from the selected branch diff.</action>
  </branch>
  <branch if="the chosen source is a commit range" optional="true">
    <action>Verify the range resolves before using it.</action>
    <ask if="the range does not resolve">HALT and ask the user for a valid commit range.</ask>
    <action>Construct `{diff_output}` from the selected commit range.</action>
  </branch>
  <branch if="the chosen source is a provided diff" optional="true">
    <action>Validate that the provided content is non-empty and parseable as a unified diff.</action>
    <ask if="the provided diff is empty or not parseable">HALT and ask the user to provide a valid diff.</ask>
    <action>Use the validated provided diff as `{diff_output}`.</action>
  </branch>
  <branch if="the chosen source is a provided file list" optional="true">
    <action>
      Validate each path exists in the working tree, then construct `{diff_output}` from those paths.
      <detail>
        - use `git diff HEAD -- <paths>` for tracked files with uncommitted changes
        - use `git diff --no-index /dev/null <path>` for untracked files that should be reviewed as new files
      </detail>
    </action>
    <ask if="any provided path does not exist">HALT and ask the user to correct the file list.</ask>
    <ask if="the resulting diff is empty">Ask whether to review the full file contents or choose a different baseline.</ask>
  </branch>
  <branch if="the chosen source is staged or uncommitted changes" optional="true">
    <action>Construct `{diff_output}` from the selected working-tree state.</action>
  </branch>
  <action>Verify `{diff_output}` is non-empty after construction.</action>
  <ask if="{diff_output} is empty">HALT and tell the user there is nothing to review.</ask>
</step>

<step n="3" goal="Load spec and context documents when available">
  <ask>Ask the user whether there is a spec or story file that provides context for these changes.</ask>
  <branch if="the user provides a spec or story file" optional="true">
    <action>Set `{spec_file}` to the provided path and verify the file exists and is readable.</action>
    <action>Set `{review_mode}` to `full`.</action>
    <action>
      If the file has a `context` field in its frontmatter listing additional docs, load each referenced document.
      <detail>Warn the user about any referenced docs that cannot be found.</detail>
    </action>
  </branch>
  <branch if="the user does not provide a spec or story file" optional="true">
    <action>Set `{review_mode}` to `no-spec`.</action>
  </branch>
</step>

<step n="4" goal="Check review size and confirm readiness">
  <action>Estimate whether `{diff_output}` exceeds roughly 3000 lines.</action>
  <branch if="{diff_output} exceeds roughly 3000 lines" optional="true">
    <output>Warn the user that the diff is large and offer to chunk the review by file group.</output>
    <branch if="the user opts to chunk the review" optional="true">
      <action>Agree on the first file group, narrow `{diff_output}` to that group, and list the remaining groups for follow-up runs.</action>
    </branch>
    <branch if="the user declines chunking" optional="true">
      <action>Proceed with the full diff.</action>
    </branch>
  </branch>
  <output>Present a summary with diff stats, `{review_mode}`, and any loaded spec/context docs.</output>
</step>

## CHECKPOINT

Halt after presenting the summary and wait for the user to confirm that review should proceed.

## ADVISORY

- Treat this phase as read-only unless the workflow explicitly says otherwise.
- Keep the gathered context focused on enabling the next review phase, not on starting the review early.
