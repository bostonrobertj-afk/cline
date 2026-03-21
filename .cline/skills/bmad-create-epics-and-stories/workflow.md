# workflow

## META

- Goal: Transform PRD and Architecture requirements into epics and stories organized by user value, with complete acceptance criteria for development teams.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for checklist items and routing; use `<detail>` for supporting guidance.

## EXECUTION

<step n="1" goal="Load workflow configuration and begin prerequisite validation">
  <action>Load `{project-root}/_bmad/bmm/config.yaml` and resolve `project_name`, `output_folder`, `planning_artifacts`, `user_name`, `communication_language`, and `document_output_language`.</action>
  <output>Speak in the agent communication style using `{communication_language}`.</output>
  <handoff path="./steps/step-01-validate-prerequisites.md" />
  <detail>
    Only continue into the next step file after the configuration values are available.
  </detail>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
- Do not load future step files until the current phase is complete and the workflow directs the transition.
