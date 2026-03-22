# step 13 responsive accessibility

## META

- Goal: Define the responsive strategy and accessibility requirements for the product.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Define the responsive strategy">
  <ask>Ask how the design should adapt across desktop, tablet, and mobile contexts and what layout or density changes matter at each range.</ask>
  <ask>Ask whether mobile-first or desktop-first thinking should dominate and whether there are special breakpoint needs.</ask>
</step>

<step n="2" goal="Define the accessibility and testing strategy">
  <ask>Ask what accessibility standard is appropriate, what assistive and inclusive design needs matter most, and how the team should validate responsive behavior and accessibility in practice.</ask>
  <action>Convert the answers into implementation guidance for breakpoints, testing, semantic structure, accessibility checks, and device coverage.</action>
  <detail>Make this guidance actionable for both design and implementation teams instead of leaving it as general principle statements.</detail>
</step>

<step n="3" goal="Draft, review, and save the responsive-accessibility section">
  <output>Prepare the responsive and accessibility content for the UX specification.</output>
  <ask>Present the content and ask whether the user wants Advanced Elicitation, Party Mode, or to continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current responsive-and-accessibility draft and the instruction to deepen breakpoint strategy, accessibility expectations, or validation guidance.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current responsive-and-accessibility draft and the instruction to critique it from multiple stakeholder perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-14-complete.md">Proceed to workflow completion.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
