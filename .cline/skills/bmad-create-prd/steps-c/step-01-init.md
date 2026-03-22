## META

- Progress: Step 1 of 11
- Goal: Initialize the PRD workflow, discover input documents, and prepare the output document.
- Speak to the user in `{communication_language}`.
- Do not generate product content in this step.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Detect whether this is a fresh run or a continuation">
  <action>Check whether `{outputFile}` already exists.</action>
  <branch if="the output file exists and represents an unfinished PRD workflow" optional="true">
    <action>Read the full file including frontmatter and saved workflow state.</action>
    <handoff path="./step-01b-continue.md">Resume the in-progress workflow instead of reinitializing it.</handoff>
  </branch>
  <branch if="the output file does not exist or is not an unfinished workflow" optional="true">
    <output>State that this run will initialize a fresh PRD workflow.</output>
  </branch>
</step>

<step n="2" goal="Discover and confirm the input context for a fresh run">
  <action>Search `{planning_artifacts}`, `{output_folder}`, `{project_knowledge}`, and `docs` for relevant source documents.</action>
  <detail>Search both whole markdown files and sharded folders with `index.md`, especially for product briefs, research documents, project documentation, and `project-context.md`.</detail>
  <ask>Ask the user to confirm which discovered files should be loaded and whether any additional files should be included before continuing.</ask>
</step>

<step n="3" goal="Create the PRD workspace and load the confirmed inputs">
  <action>Load all user-confirmed input documents completely.</action>
  <action>Track the successfully loaded files in frontmatter `inputDocuments`.</action>
  <action>Copy `../templates/prd-template.md` to `{outputFile}` and initialize the workflow frontmatter.</action>
  <output>Summarize the initialized PRD workspace, the files that were loaded, and whether the project currently appears brownfield or greenfield.</output>
</step>

<step n="4" goal="Offer continuation from initialization">
  <ask>Present the continuation menu for moving to Project Discovery and ask whether the user wants to continue or provide additional files.</ask>
  <branch if="the user provides additional files" optional="true">
    <action>Load the additional files, update frontmatter, and re-present the initialization summary.</action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Append this step to `stepsCompleted` and persist the updated workflow state.</action>
    <handoff path="./step-02-discovery.md">Proceed to project discovery.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for explicit user confirmation of the discovered or provided input documents, and wait again for explicit continuation selection before loading the next step.

## ADVISORY

- Bias future discovery toward any relevant `project-context.md` content that was loaded.
- Preserve counts for briefs, research, brainstorming, and project docs in frontmatter if the workflow tracks them.
