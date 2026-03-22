# Generate Project Context Workflow

## META

- Goal: Create a concise `project-context.md` file containing the critical implementation rules AI agents need.
- This workflow is collaborative and step-file driven.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load configuration and begin context discovery">
  <action>Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve `project_name`, `output_folder`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date`.</action>
  <action>Set `output_file` to `{output_folder}/project-context.md`.</action>
  <action>Load the project context template and any existing context file if present.</action>
  <handoff path="./steps/step-01-discover.md" />
</step>
