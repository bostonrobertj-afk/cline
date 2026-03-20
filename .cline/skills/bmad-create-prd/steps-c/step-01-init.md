## META

- Progress: Step 1 of 11
- Goal: initialize the PRD workflow, discover input documents, and prepare the output document.
- Speak to the user in `{communication_language}`.
- Do not generate product content in this step.

## EXECUTION

<step n="1" goal="Check for existing workflow state">
  <action>Check whether `{outputFile}` already exists.</action>
  <action>If it exists, read the full file including frontmatter and existing workflow state.</action>
</step>

<step n="2" goal="Route continuation runs correctly">
  <action>If the document exists and `stepsCompleted` is present but `step-12-complete` is not present, immediately load `./step-01b-continue.md`.</action>
  <action>Do not perform fresh initialization tasks when the workflow should continue from an existing document.</action>
</step>

<step n="3" goal="Discover and confirm initialization inputs">
  <action>If this is a fresh workflow, discover relevant documents from `{planning_artifacts}`, `{output_folder}`, `{project_knowledge}`, and `docs`.</action>
  <action>Search for both whole markdown files and sharded folders with `index.md` files.</action>
  <action>Look for product briefs, research documents, project documentation, and `project-context.md`.</action>
  <ask>Confirm the discovered files with the user and ask whether any additional documents should be included before continuing.</ask>
</step>

<step n="4" goal="Load confirmed inputs and prepare the PRD workspace">
  <action>Load all user-confirmed input documents completely.</action>
  <action>Track all successfully loaded files in frontmatter `inputDocuments`.</action>
  <action>Copy `../templates/prd-template.md` to `{outputFile}` and initialize frontmatter for the workflow.</action>
</step>

<step n="5" goal="Report initialization results and offer continuation">
  <output>Summarize the initialized PRD workspace, the files that were discovered and loaded, and whether this appears to be a brownfield or greenfield project.</output>
  <ask>Present the menu `[C] Continue - Save this and move to Project Discovery (Step 2 of 11)` and ask whether the user wants to continue or provide additional files.</ask>
  <action>If the user provides additional files, load them, update frontmatter, and redisplay the initialization summary.</action>
  <action>If the user selects `C`, update frontmatter so this step is appended to `stepsCompleted`, then load `./step-02-discovery.md`.</action>
</step>

## CHECKPOINT

Wait for explicit user confirmation of the discovered or provided input documents, and wait again for explicit `C` selection before loading the next step.

## ADVISORY

- Bias future discovery toward any relevant `project-context.md` content that was loaded.
- Preserve counts for briefs, research, brainstorming, and project docs in frontmatter if the workflow tracks them.

## REFERENCE

- Fresh initialization only happens when the output document does not already represent an unfinished workflow.
- The initialization summary should make it clear where the PRD file lives and what context was loaded.
