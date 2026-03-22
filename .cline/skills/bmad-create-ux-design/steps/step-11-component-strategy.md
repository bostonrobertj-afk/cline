# step 11 component strategy

## META

- Goal: Define the component strategy and the custom component needs for the product.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Analyze design-system coverage against product needs">
  <action>Compare the chosen design-system capabilities against the journey and interaction needs identified earlier.</action>
  <detail>Call out what is already covered, what needs adaptation, and what requires new custom components.</detail>
</step>

<step n="2" goal="Define the custom component strategy">
  <ask>Ask what each custom component needs to do, what content and actions it supports, what states it must handle, and what accessibility considerations apply.</ask>
  <action>Define the foundation-versus-custom split and the component prioritization sequence.</action>
</step>

<step n="3" goal="Draft, review, and save the component-strategy section">
  <output>Prepare the component-strategy content for the UX specification.</output>
  <ask>Present the content and ask whether the user wants Advanced Elicitation, Party Mode, or to continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current component-strategy draft and the instruction to deepen component boundaries, priorities, or accessibility concerns.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current component-strategy draft and the instruction to critique it from multiple stakeholder perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-12-ux-patterns.md">Proceed to UX patterns.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
