---
main_config: '{project-root}/_bmad/bmm/config.yaml'
outputFile: '{planning_artifacts}/prd.md'
---

# workflow

## META

- Goal: Create a comprehensive PRD through structured collaborative facilitation.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load configuration and begin the create workflow">
  <action>Load the workflow configuration values needed for this run, including {project_name}, {output_folder}, {planning_artifacts}, {user_name}, {communication_language}, {document_output_language}, and {user_skill_level}.</action>
  <action>Use {communication_language} for agent-facing communication and {document_output_language} for artifact content.</action>
  <handoff path="./steps-c/step-01-init.md">Begin by initializing or resuming the PRD workflow.</handoff>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this workflow writes or updates a managed artifact.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
