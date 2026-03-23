---
diff_output: '' # set at runtime
spec_file: '' # set at runtime (path or empty)
review_mode: '' # set at runtime: "full" or "no-spec"
review_input_type: '' # set at runtime: "diff" or "file-bundle"
---

# step 01 gather context

## META

- Goal: determine what to review, construct the normalized review input, and load any spec context needed for the review.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- This phase is read-only. Do not modify project files while gathering review context.
- Do not start the substantive code review in this phase.
- Do not perform QA, bug hunting, acceptance checking, or architectural critique unless the workflow clearly instructs you to.
- Only inspect files far enough to determine scope, construct the normalized review input, and load declared context.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh into the next phase before doing any next-phase work.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
- Remember: complete_workflow_item is your tool to mark checklist items as complete, attempt_completion is your tool to mark the checkpoint at the end of the phase complete.

## EXECUTION

<step n="1" goal="Determine the review target">
  <detail>
    This step is for source selection only.
    Do not inspect implementation files for defects, reason about regressions, or begin review findings here.
    If the user provided a story, diff, or file list, identify the correct source type and stop at scope determination.
  </detail>
  <action>
    Detect review intent from the triggering prompt before asking the user to choose manually.
    <detail>
      - an explicit story file path or "review this story" / "review completed story" -> provided story file
      - "staged" / "staged changes" -> staged changes only
      - "uncommitted" / "working tree" / "all changes" -> staged + unstaged changes
      - "branch diff" / "vs main" / "against main" / "compared to {branch}" -> branch diff
      - "commit range" / "last N commits" / "{sha}..{sha}" -> specific commit range
      - "this diff" / "provided diff" / "paste" -> user-provided diff
      - when multiple phrases match, prefer the most specific match
    </detail>
  </action>
  <branch if="a clear review mode is detected from the triggering prompt" optional="true">
    <output>Announce the detected review mode and proceed with that source without beginning QA or review analysis yet.</output>
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
          Ask what to review and present these options: provided story file, uncommitted changes, staged changes only, branch diff, specific commit range, or provided diff/file list.
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
          Ask what to review and present these options: provided story file, uncommitted changes, staged changes only, branch diff, specific commit range, or provided diff/file list.
        </ask>
      </branch>
    </branch>
    <branch if="no review story is found in sprint tracking" optional="true">
      <ask>
        Ask what to review and present these options: provided story file, uncommitted changes, staged changes only, branch diff, specific commit range, or provided diff/file list.
      </ask>
    </branch>
  </branch>
</step>

<step n="2" goal="Construct `{diff_output}` from the chosen source">
  <detail>
    Construct the normalized review input mechanically.
    Do not interpret the code, judge implementation quality, or generate findings while building scope.
  </detail>
  <branch if="the chosen source is a provided story file" optional="true">
    <action>
      Read the complete story file first and treat it as the primary review source rather than defaulting to commit hunting.
      <detail>
        - parse status, acceptance criteria, completion notes, change log, and Dev Agent Record sections
        - look specifically for the story's File List or equivalent list of changed files
        - if the story describes what changed and which files were touched, use that information before considering commits
      </detail>
    </action>
    <action>Set `{spec_file}` to the story file path and set `{review_mode}` to `full`.</action>
    <branch if="the story file has a usable File List" optional="true">
      <action>
        Build a scoped review bundle from the listed files.
        <detail>
          - validate each listed path exists when it should still be present
          - read the current contents of each listed file
          - assemble `{diff_output}` as a labeled file bundle with clear per-file headers so downstream reviewers can inspect the resulting implementation
          - set `{review_input_type}` to `file-bundle`
        </detail>
      </action>
    </branch>
    <branch if="the story file lacks a usable File List but names changed files elsewhere" optional="true">
      <action>
        Build the same scoped file bundle from the paths documented in completion notes, change log, or other story sections.
      </action>
      <action>Set `{review_input_type}` to `file-bundle`.</action>
    </branch>
    <branch if="the story file documents a specific commit range or reviewable diff source explicitly" optional="true">
      <action>
        Use that documented range or diff source only when it is explicitly available and more faithful than the file bundle.
      </action>
    </branch>
    <branch if="the story file does not identify changed files well enough to build scope" optional="true">
      <ask>
        Ask the user to provide either the intended file list, a diff, or a commit range.
        Do not guess a commit range from time or branch history.
      </ask>
    </branch>
  </branch>
  <branch if="the chosen source is a branch diff" optional="true">
    <action>Verify the base branch exists before running `git diff`.</action>
    <ask if="the base branch does not exist">HALT and ask the user for a valid branch.</ask>
    <action>Construct `{diff_output}` from the selected branch diff.</action>
    <action>Set `{review_input_type}` to `diff`.</action>
  </branch>
  <branch if="the chosen source is a commit range" optional="true">
    <action>Verify the range resolves before using it.</action>
    <ask if="the range does not resolve">HALT and ask the user for a valid commit range.</ask>
    <action>Construct `{diff_output}` from the selected commit range.</action>
    <action>Set `{review_input_type}` to `diff`.</action>
  </branch>
  <branch if="the chosen source is a provided diff" optional="true">
    <action>Validate that the provided content is non-empty and parseable as a unified diff.</action>
    <ask if="the provided diff is empty or not parseable">HALT and ask the user to provide a valid diff.</ask>
    <action>Use the validated provided diff as `{diff_output}`.</action>
    <action>Set `{review_input_type}` to `diff`.</action>
  </branch>
  <branch if="the chosen source is a provided file list" optional="true">
    <action>
      Validate each path exists in the working tree, then construct `{diff_output}` from those paths.
      <detail>
        - use `git diff HEAD -- <paths>` for tracked files with uncommitted changes
        - use `git diff --no-index /dev/null <path>` for untracked files that should be reviewed as new files
        - if the files are already committed and the diff is empty, offer a file-bundle review using the current file contents instead of forcing a commit-based path
      </detail>
    </action>
    <ask if="any provided path does not exist">HALT and ask the user to correct the file list.</ask>
    <branch if="the resulting diff is non-empty" optional="true">
      <action>Set `{review_input_type}` to `diff`.</action>
    </branch>
    <branch if="the resulting diff is empty" optional="true">
      <ask>Ask whether to review the full file contents or choose a different baseline.</ask>
      <branch if="the user chooses full file contents" optional="true">
        <action>Build `{diff_output}` as a labeled file bundle from the provided paths.</action>
        <action>Set `{review_input_type}` to `file-bundle`.</action>
      </branch>
    </branch>
  </branch>
  <branch if="the chosen source is staged or uncommitted changes" optional="true">
    <action>Construct `{diff_output}` from the selected working-tree state.</action>
    <action>Set `{review_input_type}` to `diff`.</action>
  </branch>
  <action>Verify `{diff_output}` is non-empty after construction.</action>
  <ask if="{diff_output} is empty">HALT and tell the user there is nothing to review.</ask>
</step>

<step n="3" goal="Load spec and context documents when available">
  <detail>
    Load declared context only.
    Do not start comparing implementation against the spec in this phase.
  </detail>
  <branch if="the chosen source was a provided story file" optional="true">
    <output>The story file is already loaded as primary review context.</output>
    <action>
      If the story file has a `context` field in its frontmatter listing additional docs, load each referenced document.
      <detail>Warn the user about any referenced docs that cannot be found.</detail>
    </action>
  </branch>
  <branch if="the chosen source was not a provided story file" optional="true">
    <ask>Ask the user whether there is a spec or story file that provides context for these changes.</ask>
  </branch>
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
    <output>Warn the user that the review input is large and offer to chunk the review by file group.</output>
    <branch if="the user opts to chunk the review" optional="true">
      <action>Agree on the first file group, narrow `{diff_output}` to that group, and list the remaining groups for follow-up runs.</action>
    </branch>
    <branch if="the user declines chunking" optional="true">
      <action>Proceed with the full prepared review input.</action>
    </branch>
  </branch>
  <output>Present a summary with `{review_input_type}`, scope stats, `{review_mode}`, and any loaded spec/context docs.</output>
  <ask>
    Ask whether the review should proceed with the prepared scope.
    Offer at least these options: `[P] Proceed`, `[C] Change scope`, and `[S] Stop review`.
  </ask>
  <branch if="the user chooses to change scope" optional="true">
    <action>Return to review-source selection and rebuild `{diff_output}` using the updated scope.</action>
  </branch>
  <branch if="the user chooses to stop review" optional="true">
    <output>Stop the workflow cleanly and confirm that no review findings were produced.</output>
  </branch>
</step>

## CHECKPOINT

Halt after presenting the summary and wait for the user to confirm that review should proceed.
Once the indicate alignment with proceeding, use attempt_completion to resolve this checkpoint and unlock the next phase.

## ADVISORY

- Treat this phase as read-only unless the workflow explicitly says otherwise.
- Keep the gathered context focused on enabling the next review phase, not on starting the review early.
- If you notice a possible defect while gathering context, do not pursue it yet. Carry that concern into the actual review phase instead of doing ad hoc QA here.

