## META

- Goal: Define narrative user journeys that connect user needs to product requirements.
- Speak to the user in `{communication_language}`.
- Keep journeys story-like and outcome-oriented.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Identify the user types to model">
  <action>Leverage already known user types and identify any missing user groups that need journeys.</action>
</step>

<step n="2" goal="Create narrative journeys">
  <ask>Guide the user through the main end-to-end journeys each important user type should experience.</ask>
  <action>Focus on goals, context, decision points, and friction.</action>
</step>

<step n="3" goal="Connect journeys to requirements">
  <action>Map each journey to the capabilities, flows, and requirements the product must support.</action>
  <output>Create PRD-ready user journey content and a concise journey requirements summary.</output>
</step>

<step n="4" goal="Review, save, and continue">
  <ask>Present the journeys to the user for review and refinement.</ask>
  <branch if="the user approves the journey set" optional="true">
    <action>Save the approved journey content into the PRD.</action>
    <handoff path="./step-05-domain.md">Proceed to domain requirements.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for the user to approve the journey set before saving it.

## ADVISORY

- The journeys should be comprehensive enough to drive later functional requirements without turning into UI specs.
