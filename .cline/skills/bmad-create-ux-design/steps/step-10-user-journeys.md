# step 10 user journeys

## META

- Goal: Define the product's key user journeys from a UX perspective.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
## EXECUTION

<step n="1" goal="Identify the critical journeys to design">
  <ask>Ask which user flows matter most, where onboarding or activation happens, and which flows carry the highest UX risk.</ask>
</step>

<step n="2" goal="Map the journey structure">
  <action>Break each critical journey into stages, moments of friction, decisions, handoffs, and success states.</action>
  <detail>Focus on the experience arc and UX implications rather than restating product requirements in a different format.</detail>
</step>

<step n="3" goal="Draft, review, and save the user-journeys section">
  <output>Prepare the user-journey content for the UX specification.</output>
  <ask>Present the content and ask whether the user wants Advanced Elicitation, Party Mode, or to continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current journey draft and the instruction to deepen stages, friction points, or success conditions.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current journey draft and the instruction to critique it from multiple stakeholder perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-11-component-strategy.md">Proceed to component strategy.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
