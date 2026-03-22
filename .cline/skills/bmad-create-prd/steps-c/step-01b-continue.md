## META

- Goal: Restore context for an in-progress PRD workflow and route the user to the correct next step.
- Speak to the user in `{communication_language}`.
- Do not restart the workflow from scratch.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Analyze the saved PRD state">
  <action>Read the existing PRD document and its frontmatter completely.</action>
  <action>Identify `stepsCompleted`, `inputDocuments`, saved classification data, and the last completed workflow step.</action>
  <output>Summarize the current PRD status and the saved context that can be restored.</output>
</step>

<step n="2" goal="Restore the saved input context">
  <action>Reload every document listed in frontmatter `inputDocuments`.</action>
  <branch if="a referenced input file is missing" optional="true">
    <output>Tell the user exactly which file is missing and continue with the remaining available context.</output>
  </branch>
</step>

<step n="3" goal="Determine the correct continuation target">
  <branch if="`step-12-complete` is already present" optional="true">
    <output>State that the PRD workflow is already complete and switch to completion-style guidance.</output>
  </branch>
  <branch if="the workflow is not complete" optional="true">
    <action>Determine the next unfinished step from `stepsCompleted` and prepare that as the continuation target.</action>
  </branch>
</step>

<step n="4" goal="Present continuation options">
  <ask>Ask whether the user wants to continue from the recommended next step, revisit a previous step, or stop.</ask>
  <branch if="the user chooses to continue" optional="true">
    <detail>Route to the next unfinished step based on the saved workflow state rather than restarting the workflow.</detail>
  </branch>
</step>

## CHECKPOINT

Wait for the user to confirm whether to continue from the recommended next step or choose another path.

## ADVISORY

- Preserve the existing workflow state rather than rewriting completed sections unnecessarily.
- If the workflow is already complete, transition into wrap-up behavior instead of reopening unfinished-step menus.
