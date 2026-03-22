# step 03 create stories

## META

- Goal: Generate all epic stories from the approved epic structure while keeping each story actionable, scoped, and ready for development.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load the approved epic structure and story-authoring context">
  <action>Load the approved epic list, requirements inventory, and FR coverage map from `{planning_artifacts}/epics.md`.</action>
  <action>Review any Architecture-derived and UX-derived requirements that need to be reflected in the story set.</action>
  <detail>UX design requirements should be incorporated as concrete story work, either inside feature epics or in a dedicated UX or design-system epic when that is the clearest fit.</detail>
</step>

<step n="2" goal="Facilitate story creation one epic at a time until the epic list is complete">
  <action>Work through the approved epics sequentially.</action>
  <action>For the current epic, propose a story breakdown that follows the template structure exactly.</action>
  <detail>Each story should be small enough for a single development session, deliver clear user value, include specific acceptance criteria, and avoid forward dependencies. Database or entity creation should happen only when a story actually needs it.</detail>
  <output>Present each proposed story with its title, user story statement, and testable acceptance criteria.</output>
  <ask>Ask whether each story captures the requirement correctly, is appropriately scoped, and has complete acceptance criteria.</ask>
  <branch if="the user requests changes to a story or epic breakdown" optional="true">
    <action>Revise the in-progress story set for the current epic and re-present it for approval.</action>
  </branch>
  <branch if="the user approves the current epic's stories" optional="true">
    <action>Append the approved stories to `{planning_artifacts}/epics.md` using the expected template structure.</action>
    <output>Show an epic summary, including the number of stories created and the requirements covered.</output>
  </branch>
</step>

<step n="3" goal="Finalize the complete epic-and-story document after all epics are approved">
  <action>Verify that `{planning_artifacts}/epics.md` still follows the template structure exactly.</action>
  <action>Confirm that the document includes the overview, requirements inventory, approved epic list, FR coverage map, and all epic story sections.</action>
  <output>State that the story set is complete and ready for final validation.</output>
</step>

<step n="4" goal="Present the continuation menu for final validation">
  <ask>Ask the user to choose whether to continue to final validation, use Advanced Elicitation, or use Party Mode.</ask>
  <detail>Keep the menu visible after answering side questions. Advance only when the user explicitly chooses Continue.</detail>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current epic-and-story document and the instruction to deepen story slicing, acceptance coverage, or sequencing.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current epic-and-story document and the instruction to critique it from multiple stakeholder perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Persist the current document state and workflow progress in `{planning_artifacts}/epics.md`.</action>
    <handoff path="./step-04-final-validation.md">Proceed to final validation.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-04-final-validation.md
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
