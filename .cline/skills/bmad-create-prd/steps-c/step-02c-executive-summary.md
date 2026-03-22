## META

- Goal: Create an executive summary grounded in the confirmed discovery and vision context.
- Speak to the user in `{communication_language}`.
- Keep the summary concise and decision-useful.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Synthesize the available context">
  <action>Review the current PRD state, confirmed classification, vision, and supporting source documents.</action>
</step>

<step n="2" goal="Draft the executive summary">
  <output>Create a concise executive summary covering what the product is, who it serves, what makes it special, and why now.</output>
</step>

<step n="3" goal="Review, save, and continue">
  <ask>Present the draft to the user for review and refinement.</ask>
  <branch if="the user approves the summary" optional="true">
    <action>Save the approved executive summary into the PRD.</action>
    <handoff path="./step-03-success.md">Proceed to success criteria discovery.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for the user to approve the executive summary before saving it.

## ADVISORY

- Keep the summary aligned with the classification and vision already confirmed.
