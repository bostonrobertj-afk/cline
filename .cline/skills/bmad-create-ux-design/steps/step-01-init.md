# step 01 init

## META

- Goal: Initialize the UX design workflow by detecting continuation state and setting up the design specification document.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
## EXECUTION

<step n="1" goal="Detect whether this is a fresh run or a continuation">
  <action>Check whether `{planning_artifacts}/ux-design-specification.md` already exists.</action>
  <branch if="the design specification already exists and contains workflow state" optional="true">
    <action>Read the full file including frontmatter.</action>
    <handoff path="./step-01b-continue.md">Resume from the saved UX workflow state instead of reinitializing.</handoff>
  </branch>
  <branch if="the design specification does not exist" optional="true">
    <output>State that this is a fresh UX design run.</output>
  </branch>
</step>

<step n="2" goal="Discover and confirm supporting input documents for a fresh run">
  <action>Search `{planning_artifacts}`, `{output_folder}`, `{project_knowledge}`, and `{project-root}/docs` for relevant inputs.</action>
  <detail>Look for whole files and sharded folders with `index.md`, especially product briefs, PRDs, project docs, and `project-context.md`.</detail>
  <ask>Ask the user to confirm which discovered files should be loaded and whether any additional documents should be included.</ask>
</step>

<step n="3" goal="Create the UX specification workspace">
  <action>Load the confirmed inputs completely.</action>
  <action>Track the confirmed files in frontmatter `inputDocuments`.</action>
  <action>Copy `../ux-design-template.md` to `{planning_artifacts}/ux-design-specification.md` and initialize the workflow frontmatter.</action>
  <output>Summarize the created UX design workspace and the files that were loaded.</output>
</step>

<step n="4" goal="Offer continuation into discovery">
  <ask>Ask whether the user wants to continue into UX discovery or add more context first.</ask>
  <branch if="the user provides additional documents" optional="true">
    <action>Load them, update frontmatter, and re-present the initialization summary.</action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Append this step to `stepsCompleted` and persist the workflow state.</action>
    <handoff path="./step-02-discovery.md">Proceed to UX discovery.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Preserve the discovered context list in frontmatter so later phases can reload it during continuation.
