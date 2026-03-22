# workflow

## META

- Goal: Validate that the PRD, Architecture, Epics, Stories, and UX inputs are complete and aligned before implementation begins.
- Persist workflow state updates whenever this workflow writes or updates a managed artifact.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load configuration and begin the implementation-readiness assessment">
  <action>Load the workflow configuration values needed for this run, including {project_name}, {output_folder}, {planning_artifacts}, {user_name}, {communication_language}, and {document_output_language}.</action>
  <action>Use {communication_language} for agent-facing communication and {document_output_language} for the assessment artifact.</action>
  <handoff path="./steps/step-01-document-discovery.md">Begin by discovering and confirming the document set to assess.</handoff>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.



