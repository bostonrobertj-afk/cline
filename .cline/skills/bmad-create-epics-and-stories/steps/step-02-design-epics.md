# step 02 design epics

## META

- Goal: Design and get approval for the epic structure that organizes the requirements into user-value-focused epics.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Review the approved requirements inventory and frame the epic-design criteria">
  <action>Load the approved requirements inventory from `{planning_artifacts}/epics.md`.</action>
  <action>Review the functional requirements, non-functional requirements, and additional technical or UX requirements together before proposing epics.</action>
  <output>Explain that epics must be organized around user value rather than technical layers.</output>
  <detail>Stress that each epic should deliver meaningful standalone value and that stories inside an epic must not depend on future stories in the same epic.</detail>
</step>

<step n="2" goal="Propose an epic structure and requirements coverage map collaboratively">
  <action>Identify natural requirement groupings, user journeys, and product outcomes that should become epics.</action>
  <action>Create a proposed epic list with user-centric epic titles, user outcomes, and FR coverage.</action>
  <output>Present the proposed epic list.</output>
  <output>Create and present a requirements coverage map showing how each FR maps to an epic.</output>
  <detail>Use examples only as design guidance. Good epics deliver user-facing outcomes; poor epics are organized around database setup, API layers, or component libraries without direct user value.</detail>
</step>

<step n="3" goal="Refine the epic structure until the user approves it">
  <ask>Ask whether the proposed epic structure aligns with the user's product vision and whether any epic groupings should change.</ask>
  <branch if="the user requests changes to the epic structure" optional="true">
    <action>Revise the epic list and coverage map based on the user's feedback.</action>
    <output>Re-present the updated epic structure for another approval pass.</output>
  </branch>
  <branch if="the user wants deeper exploration before approving" optional="true">
    <ask>Ask whether the user wants Advanced Elicitation or Party Mode before continuing the refinement.</ask>
    <branch if="the user chooses Advanced Elicitation" optional="true">
      <action>
        Dispatch a dedicated subagent for Advanced Elicitation.
        <detail>
          Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
          Prompt the subagent with the current epic-structure draft and the instruction to deepen grouping logic, value boundaries, or requirement coverage.
          Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
        </detail>
      </action>
    </branch>
    <branch if="the user chooses Party Mode" optional="true">
      <action>
        Dispatch a dedicated subagent for Party Mode.
        <detail>
          Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
          Prompt the subagent with the current epic-structure draft and the instruction to critique it from multiple stakeholder perspectives.
          Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
        </detail>
      </action>
    </branch>
  </branch>
  <branch if="the user approves the epic structure" optional="true">
    <action>Write the approved epic list and requirements coverage map into `{planning_artifacts}/epics.md`.</action>
    <output>State that the epic structure is approved and ready for story creation.</output>
  </branch>
</step>

<step n="4" goal="Present the continuation menu for story creation">
  <ask>Ask the user to choose whether to continue to story creation, use Advanced Elicitation, or use Party Mode.</ask>
  <detail>Keep the current menu available after conversational detours. Only advance when the user explicitly chooses Continue.</detail>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the approved or in-progress epic structure and the instruction to deepen or challenge it before story creation.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the approved or in-progress epic structure and the instruction to critique it from multiple stakeholder perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Persist the approved epic structure and workflow state in `{planning_artifacts}/epics.md`.</action>
    <handoff path="./step-03-create-stories.md">Proceed to story creation.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
