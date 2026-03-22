# workflow

## META

- Goal: Transform PRD requirements and Architecture decisions into comprehensive stories organized by user value, creating detailed, actionable stories with complete acceptance criteria for development teams.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load workflow configuration and establish the first handoff">
  <action>Load the workflow configuration values needed for this run, including {project_name}, {output_folder}, {planning_artifacts}, {user_name}, {communication_language}, and {document_output_language}.</action>
  <action>Use {communication_language} consistently in agent-facing communication throughout the workflow.</action>
  <handoff path="./steps/step-01-validate-prerequisites.md">Begin by validating prerequisites and extracting the requirements inventory.</handoff>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this workflow writes or updates a managed artifact.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
