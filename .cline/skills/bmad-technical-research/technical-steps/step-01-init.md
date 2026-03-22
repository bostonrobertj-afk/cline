## META

- Progress: Step 1 of 6
- Goal: confirm research scope, verify the starting state, and prepare the technical research workspace.
- Speak to the user in `{communication_language}`.
- Do not begin web research yet.

## EXECUTION

<step n="1" goal="Check the research workspace for continuation state">
  <action>Look for the current research document at `{planning_artifacts}/research/technical-{{research_topic}}-research-{{date}}.md`.</action>
  <action>If it exists, read the full file including frontmatter and current workflow state.</action>
</step>

<step n="2" goal="Route continuation runs correctly">
  <branch if="the document exists and has unfinished steps">
    <action>Handoff to `./step-01b-continue.md` immediately.</action>
    <return />
  </branch>
</step>

<step n="3" goal="Discover and confirm initialization inputs">
  <action>If this is a fresh workflow, discover relevant documents from `{planning_artifacts}`, `{output_folder}`, `{project_knowledge}`, and `docs`.</action>
  <action>Search for both whole markdown files and sharded folders with `index.md` files.</action>
  <action>Look for product briefs, research documents, project documentation, and `project-context.md`.</action>
  <ask>Confirm the discovered files with the user and ask whether any additional documents should be included before continuing.</ask>
  <detail>
    Bias discovery toward context that can improve technical scope, such as product requirements, architecture notes, research summaries, and project documentation.
  </detail>
</step>

<step n="4" goal="Load confirmed inputs and prepare the research workspace">
  <action>Load all user-confirmed input documents completely.</action>
  <action>Track all successfully loaded files in frontmatter `inputDocuments`.</action>
  <action>Copy `./research.template.md` to `{planning_artifacts}/research/technical-{{research_topic}}-research-{{date}}.md` and initialize workflow frontmatter.</action>
</step>

<step n="5" goal="Report initialization results and offer continuation">
  <output>Summarize the initialized research workspace, the files that were discovered and loaded, and the confirmed technical scope.</output>
  <ask>Present `[C] Continue` to confirm the scope and move to technology stack analysis, or let the user provide additional files or scope adjustments.</ask>
  <action>If the user provides additional files, load them, update frontmatter, and redisplay the initialization summary.</action>
  <action>If the user selects `C`, update frontmatter so this step is appended to `stepsCompleted`, then hand off to `./step-02-technical-overview.md`.</action>
</step>

## CHECKPOINT

Wait for explicit confirmation of the discovered or provided input documents, and wait again for explicit `C` selection before loading the next step.

## ADVISORY

- Preserve counts or lists for loaded input documents if the workflow tracks them.
- Keep the scope confirmation aligned with the research topic and goals already established.
