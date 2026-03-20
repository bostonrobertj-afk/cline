# Step 12: Workflow Completion

## META

- Goal: finalize the PRD workflow, update status tracking, and guide the user to next steps.
- Speak to the user in `{communication_language}`.
- Do not load any additional PRD steps after this file.

## EXECUTION

<step n="1" goal="Announce PRD completion">
  <output>Tell the user that the PRD is complete, polished, and ready for downstream work. Summarize the major sections that now exist in the document.</output>
</step>

<step n="2" goal="Update workflow status">
  <action>If a workflow status file exists, update it to record the completed PRD at `{outputFile}` and preserve file structure and comments.</action>
  <action>Record the completion timestamp if the status system supports it.</action>
</step>

<step n="3" goal="Offer validation options">
  <output>Present the available validation path: `bmad-check-implementation-readiness`, including when it should be used and why it is valuable.</output>
  <ask>Ask whether the user wants to run validation now or proceed directly to later workflows.</ask>
</step>

<step n="4" goal="Suggest next workflows">
  <action>Invoke the `bmad-help` skill so the user can see the relevant next workflow options for architecture, UX, epics, or validation.</action>
</step>

<step n="5" goal="Confirm completion clearly">
  <output>Confirm that the PRD now contains the executive summary, success criteria, user journeys, domain-specific requirements when applicable, innovation analysis when applicable, project-type requirements, functional requirements, non-functional requirements, and polished final content.</output>
</step>

## CHECKPOINT

Wait for the user to choose whether to run validation now or proceed to later workflows.

## ADVISORY

- The completed PRD should remain the source of truth for future design, architecture, and development planning.

## REFERENCE

- Completion should leave the user with a clear understanding of the PRD’s readiness and the most relevant next workflow choices.
