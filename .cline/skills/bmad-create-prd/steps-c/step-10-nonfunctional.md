## META

- Goal: Define the non-functional requirements that matter for this product.
- Speak to the user in `{communication_language}`.
- Only include categories that are relevant to this project.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Frame the non-functional requirements discussion">
  <action>Explain that non-functional requirements define quality attributes and operational expectations rather than product features.</action>
</step>

<step n="2" goal="Assess the relevant NFR categories">
  <action>Review the project context and determine which NFR categories are actually relevant, such as performance, security, scalability, accessibility, or integration.</action>
</step>

<step n="3" goal="Explore and sharpen the relevant categories">
  <ask>Ask targeted questions for each relevant NFR category so the resulting requirements are specific and measurable.</ask>
  <action>Convert vague quality expectations into concrete standards, thresholds, or operational expectations wherever possible.</action>
</step>

<step n="4" goal="Generate, review, and save the NFR section">
  <output>Create PRD-ready non-functional requirements content covering only the relevant categories.</output>
  <ask>Present the NFR section to the user for review and refinement.</ask>
  <branch if="the user approves the NFRs" optional="true">
    <action>Save the approved NFRs into the PRD.</action>
    <handoff path="./step-11-polish.md">Proceed to document polish.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for the user to approve the non-functional requirements before saving them.

## ADVISORY

- Exclude generic NFR boilerplate that does not materially apply to the project.
