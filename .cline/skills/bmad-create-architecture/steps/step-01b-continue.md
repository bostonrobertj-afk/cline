# Step 01b - Continue Architecture

Workflow ID: `bmad-create-architecture`

## EXECUTION
<step n="1" goal="Analyze the current architecture document">
  <action>Read `stepsCompleted`, `inputDocuments`, `lastStep`, `project_name`, `user_name`, `date`, and the document sections that already exist.</action>
  <detail>Identify what has been completed, what remains incomplete, and whether the document looks interrupted or finished.</detail>
</step>

<step n="2" goal="Present a continuation summary">
  <output>Welcome back {{user_name}}! Share the current progress, document sections found, input documents loaded, and any incomplete or placeholder areas.</output>
  <detail>Keep the summary concise and explicit so the user can decide whether to resume, continue, overview remaining steps, or start over.</detail>
</step>

<step n="3" goal="Handle the user’s continuation choice">
  <branch if="user chooses R">
    <action>Identify the next step from `stepsCompleted` and load the matching step file.</action>
  </branch>
  <branch if="user chooses C">
    <action>Analyze the document to determine the next logical step and load it.</action>
  </branch>
  <branch if="user chooses O">
    <action>Present a brief overview of all remaining steps and let the user choose one.</action>
  </branch>
  <branch if="user chooses X">
    <ask>This will delete all existing architectural decisions. Are you sure? (y/n)</ask>
    <output>If confirmed, clear the document and return to `./step-01-init.md`.</output>
  </branch>
  <detail>If `stepsCompleted` is empty but the document has content, ask whether the workflow should be analyzed and repaired before proceeding.</detail>
</step>

<step n="4" goal="Navigate to the selected step">
  <action>Update `lastStep` in frontmatter to reflect the navigation choice.</action>
  <action>Load the selected step file and preserve all existing document content.</action>
  <detail>Keep `stepsCompleted` accurate and let the target step handle its own detailed logic.</detail>
</step>

<step n="5" goal="Handle special continuation cases">
  <detail>If the document is incomplete or corrupted, ask whether to recover what is there or start fresh.</detail>
  <detail>If the architecture appears complete but the workflow is not marked done, ask whether to finish the workflow or continue working.</detail>
</step>

## CHECKPOINT
Halt for required confirmation, menu selection, continuation gating, or missing input before proceeding.

## ADVISORY
- Next handoff: `./step-01-init.md`
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
