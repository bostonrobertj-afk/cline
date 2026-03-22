# workflow

## META

- Goal: Validate that the PRD, Architecture, Epics, Stories, and UX inputs are complete and aligned before implementation begins.


## EXECUTION

<step n="1" goal="Load configuration and begin the implementation-readiness assessment">
  <action>Load the workflow configuration values needed for this run, including {project_name}, {output_folder}, {planning_artifacts}, {user_name}, {communication_language}, and {document_output_language}.</action>
  <action>Use {communication_language} for agent-facing communication and {document_output_language} for the assessment artifact.</action>
  <handoff path="./steps/step-01-document-discovery.md">Begin by discovering and confirming the document set to assess.</handoff>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.



