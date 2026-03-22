## META

- Goal: Finalize the PRD workflow, update status tracking, and guide the user to next steps.
- Speak to the user in `{communication_language}`.
- Do not load any additional PRD steps after this file.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Announce PRD completion">
  <output>Tell the user that the PRD is complete, polished, and ready for downstream work, and summarize the major sections that now exist in the document.</output>
</step>

<step n="2" goal="Update workflow status">
  <branch if="a workflow status file exists" optional="true">
    <action>Update it to record the completed PRD at `{outputFile}` while preserving file structure and comments.</action>
    <action>Record the completion timestamp if the status system supports it.</action>
  </branch>
</step>

<step n="3" goal="Offer validation and next-step options">
  <output>Present `bmad-check-implementation-readiness` as the validation path and explain when it is valuable.</output>
  <ask>Ask whether the user wants to run validation now or proceed directly to later workflows.</ask>
  <action>Invoke the `bmad-help` skill so the user can see the most relevant next workflow options for architecture, UX, epics, or validation.</action>
</step>

<step n="4" goal="Confirm completion clearly">
  <output>Confirm that the PRD now contains the executive summary, success criteria, user journeys, domain-specific requirements when applicable, innovation analysis when applicable, project-type requirements, functional requirements, non-functional requirements, and polished final content.</output>
</step>

## CHECKPOINT

Wait for the user to choose whether to run validation now or proceed to later workflows.

## ADVISORY

- The completed PRD should remain the source of truth for future design, architecture, and development planning.
