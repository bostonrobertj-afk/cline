# Step 01 - Initialize Architecture

Workflow ID: `bmad-create-architecture`

## EXECUTION
<step n="1" goal="Check for an existing architecture document">
  <action>Look for `{planning_artifacts}/architecture.md`.</action>
  <detail>Read the complete file, including frontmatter, if it exists.</detail>
</step>

<step n="2" goal="Route continuation when work already exists">
  <branch if="architecture.md exists and frontmatter includes `stepsCompleted`">
    <output>Stop here and load `./step-01b-continue.md` immediately.</output>
    <detail>Do not perform fresh initialization when continuation state is present.</detail>
  </branch>
</step>

<step n="3" goal="Initialize a fresh architecture workspace">
  <action>Discover context documents in `{planning_artifacts}`, `{output_folder}`, `{project_knowledge}`, and `{project-root}/docs`.</action>
  <detail>Search sharded folders first, then single markdown files. Look for product briefs, PRDs, UX design docs, research docs, project documentation, and project context files.</detail>
  <ask>Confirm the discovered documents with the user and ask whether anything else should be included.</ask>
  <ask if="no PRD is found">Architecture requires a PRD to work from. Please run the PRD workflow first or provide the PRD file path.</ask>
  <action>Create `{planning_artifacts}/architecture.md` from `../architecture-decision-template.md`.</action>
  <output>Report the setup summary, discovered files, and invite the user to continue.</output>
</step>

## CHECKPOINT
Halt for required confirmation, menu selection, continuation gating, or missing input before proceeding.

## ADVISORY
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
- Keep the fresh-init path separate from the continuation path.
