## META

- Goal: Define user, business, technical, and scope success criteria for the PRD.
- Speak to the user in `{communication_language}`.
- Push for clear, measurable outcomes where possible.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Begin the success conversation">
  <ask>Ask how the user will know the product is successful for real users, the business, and the delivery team.</ask>
</step>

<step n="2" goal="Define user, business, and technical success">
  <action>Explore user outcomes, adoption signals, and evidence of user success.</action>
  <action>Capture business outcomes, operational goals, and technical outcomes that matter for this product.</action>
  <detail>Challenge vague metrics and convert them into sharper measures when possible.</detail>
</step>

<step n="3" goal="Frame realistic scope success">
  <action>Use the validated vision to separate MVP, growth, and longer-term scope.</action>
  <output>Create PRD-ready success criteria content covering user success, business success, technical success, measurable outcomes, and scope framing.</output>
</step>

<step n="4" goal="Review, save, and continue">
  <ask>Present the success criteria to the user for approval or revision.</ask>
  <branch if="the user approves the success criteria" optional="true">
    <action>Save the approved content into the PRD.</action>
    <handoff path="./step-04-journeys.md">Proceed to user journeys.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for the user to approve the success criteria before saving them.

## ADVISORY

- Measurable outcomes are better than aspirational language.
- Scope framing should stay aligned with the MVP discipline of the project.
