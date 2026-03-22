# step 01b continue

## META

- Goal: Resume the UX design workflow from the saved design specification state.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
## EXECUTION

<step n="1" goal="Analyze the saved UX workflow state">
  <action>Read the existing design specification and its frontmatter completely.</action>
  <action>Identify `stepsCompleted`, `lastStep`, `inputDocuments`, and any saved workflow variables.</action>
  <output>Summarize current progress and the saved context available for continuation.</output>
</step>

<step n="2" goal="Restore the previously confirmed input context">
  <action>Reload every document listed in `inputDocuments`.</action>
  <branch if="a referenced input file is missing" optional="true">
    <output>Tell the user which file is missing and continue with the remaining available context.</output>
  </branch>
</step>

<step n="3" goal="Determine and confirm the continuation target">
  <action>Determine the next unfinished step from the saved workflow state.</action>
  <ask>Ask whether the user wants to continue from the recommended next step, revisit a previous step, or stop.</ask>
  <branch if="the workflow is already complete" optional="true">
    <output>Explain that the UX workflow is already complete and shift into wrap-up guidance instead of loading another step.</output>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Preserve completed sections unless the user explicitly wants to revisit them.
