
# step 01b continue

## META

- Goal: Restore context for an in-progress PRD workflow and route the user back to the correct next step.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction and handoff.

## EXECUTION

<step n="1" goal="Analyze the current PRD state">
  <action>Read the existing PRD document and its frontmatter completely.</action>
  <action>Identify `stepsCompleted`, `inputDocuments`, saved classification data, and the last completed workflow step.</action>
</step>

<step n="2" goal="Restore input context">
  <action>Reload every document listed in frontmatter `inputDocuments`.</action>
  <action>If any referenced input file is missing, tell the user exactly what is missing and continue with the remaining available context.</action>
</step>

<step n="3" goal="Determine the correct continuation target">
  <action>If `step-12-complete` is already present, treat the workflow as finished and route to completion handling.</action>
  <action>Otherwise determine the next unfinished step from `stepsCompleted` and prepare to continue from that step.</action>
</step>

<step n="4" goal="Handle fully completed workflows">
  <output>If the PRD workflow is already complete, summarize the completed PRD and explain that no further step loading is required unless the user wants to edit or extend the document.</output>
</step>

<step n="5" goal="Summarize progress and present continuation options">
  <output>Summarize completed work, loaded context, and the next recommended PRD step.</output>
  <ask>Present continuation options so the user can continue from the recommended next step, revisit a previous step, or stop.</ask>
  <action>If the user chooses to continue, load the determined next step file and resume there.</action>
</step>

## CHECKPOINT

Wait for the user to confirm whether to continue from the recommended next step or choose another path.

## ADVISORY
- Preserve the existing workflow state rather than rewriting completed sections unnecessarily.
- If the workflow is already complete, transition into wrap-up behavior instead of reopening unfinished-step menus.
