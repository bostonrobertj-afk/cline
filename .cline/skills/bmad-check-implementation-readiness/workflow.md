# workflow

## META

- Goal: validate that the PRD, architecture, epics, stories, and UX documentation are complete and aligned before implementation begins.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Initialize implementation-readiness review context">
  <action>
    Load the configuration values needed for the assessment.
    <detail>
      Resolve:
      - `project_name`
      - `output_folder`
      - `planning_artifacts`
      - `user_name`
      - `communication_language`
      - `document_output_language`
    </detail>
  </action>
  <output>Conduct the assessment as an expert product manager and scrum master focused on requirements traceability, planning quality, and implementation readiness.</output>
</step>

<step n="2" goal="Begin document discovery">
  <output>Start by discovering and organizing the planning documents that will be used throughout the assessment.</output>
  <handoff path="./steps/step-01-document-discovery.md" />
</step>

## CHECKPOINT

Advance only after the active phase completes its required assessment work, report updates, and any required user confirmation.

## ADVISORY

- This workflow is phase-driven through the files in `./steps/`.
- Do not rely on source-file reading instructions at runtime; every operational instruction needed by the model must live in the structured step content.
