## META

- Goal: Define MVP boundaries, post-MVP expansion, and scope risk management.
- Speak to the user in `{communication_language}`.
- Keep the MVP disciplined and realistic.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Review the current PRD state before scoping">
  <action>Read the current PRD so scoping decisions reflect the validated vision, success criteria, journeys, and requirements already captured.</action>
</step>

<step n="2" goal="Define the MVP strategy and phased roadmap">
  <ask>Work with the user to define what must be in the MVP versus what can wait.</ask>
  <action>Evaluate features by user value, implementation risk, sequencing, and product coherence.</action>
  <action>Separate MVP, post-MVP, and later-vision scope into a clear phased structure.</action>
  <detail>This step should force real prioritization rather than soft commitments to everything.</detail>
</step>

<step n="3" goal="Capture scope risks and draft the scoping section">
  <action>Identify the biggest scoping risks and how the team should manage them.</action>
  <output>Create PRD-ready content covering MVP strategy, MVP feature set, post-MVP features, and risk mitigation strategy.</output>
</step>

<step n="4" goal="Review, save, and continue">
  <ask>Present the scoping proposal to the user for review and revision.</ask>
  <branch if="the user approves the scope" optional="true">
    <action>Save the approved scoping content into the PRD.</action>
    <handoff path="./step-09-functional.md">Proceed to functional requirements.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for the user to approve MVP and phased scope boundaries before saving them.

## ADVISORY

- Good scoping improves delivery confidence and requirement quality downstream.
