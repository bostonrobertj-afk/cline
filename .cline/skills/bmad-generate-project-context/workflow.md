# Generate Project Context Workflow

## META

- Goal: Create a concise `project-context.md` file containing the critical implementation rules AI agents need.
- This workflow is collaborative and step-file driven.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Load configuration and begin context discovery">
  <action>Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve {project_name}, {output_folder}, {user_name}, {communication_language}, {document_output_language}, {user_skill_level}, and {date}.</action>
  <action>Set `output_file` to `{output_folder}/project-context.md`.</action>
  <action>Load the project context template and any existing context file if present.</action>
  <handoff path="./steps/step-01-discover.md" />
</step>
