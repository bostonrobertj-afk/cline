
# step 01 init

## META

- Goal: Initialize a new PRD workspace or route an unfinished PRD back into continuation flow.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction and handoff.

## EXECUTION

<step n="1" goal="Check for existing workflow state">
  <action>Look for `{outputFile}`.</action>
  <action>If it exists, read the complete file, including frontmatter and `stepsCompleted`.</action>
</step>

<step n="2" goal="Route unfinished workflows immediately">
  <action>If the PRD exists and appears unfinished, load `./step-01b-continue.md` immediately.</action>
  <detail>
    Do not perform fresh initialization work when the workflow should resume from saved state.
  </detail>
</step>

<step n="3" goal="Discover and confirm initialization inputs">
  <action>Search `{planning_artifacts}`, `{output_folder}`, `{project_knowledge}`, and `docs` for relevant context.</action>
  <detail>
    Look for whole markdown files and sharded folders with `index.md` files.
    Prioritize product briefs, research documents, project documentation, and `project-context.md`.
  </detail>
  <ask>Confirm the discovered files with the user and ask whether any additional documents should be included before continuing.</ask>
</step>

<step n="4" goal="Load confirmed inputs and prepare the PRD workspace">
  <action>Load all user-confirmed input documents completely.</action>
  <action>Track every successfully loaded file in frontmatter `inputDocuments`.</action>
  <action>Copy `../templates/prd-template.md` to `{outputFile}` and initialize frontmatter for the workflow.</action>
</step>

<step n="5" goal="Report initialization results and offer continuation">
  <output>Summarize the initialized PRD workspace, the files that were discovered and loaded, and whether the project appears brownfield or greenfield.</output>
  <ask>Present the menu `[C] Continue - Save this and move to Project Discovery (Step 2 of 11)` and ask whether the user wants to continue or provide additional files.</ask>
  <action>If the user provides additional files, load them, update frontmatter, and redisplay the initialization summary.</action>
  <action>If the user selects `C`, append this step to `stepsCompleted`, then load `./step-02-discovery.md`.</action>
</step>

## CHECKPOINT

Wait for explicit user confirmation of the discovered or provided input documents, and wait again for explicit `C` selection before loading the next step.

## ADVISORY
- Bias future discovery toward any relevant `project-context.md` content that was loaded.
- Preserve counts for briefs, research, brainstorming, and project docs in frontmatter if the workflow tracks them.
