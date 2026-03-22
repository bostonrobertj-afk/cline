# step 09 design directions

## META

- Goal: Develop concrete design directions that can be compared and narrowed.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
## EXECUTION

<step n="1" goal="Generate viable design directions">
  <action>Use the experience and visual foundation to define multiple plausible design directions.</action>
  <detail>Each direction should feel distinct enough to help the user choose, not like minor variations of the same idea.</detail>
</step>

<step n="2" goal="Compare and refine the directions">
  <ask>Ask which direction feels strongest, which risks exist in each, and what elements should be mixed, discarded, or amplified.</ask>
</step>

<step n="3" goal="Draft, review, and save the design-directions section">
  <output>Prepare the design-directions content for the UX specification.</output>
  <ask>Present the content and ask whether the user wants Advanced Elicitation, Party Mode, or to continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current design-directions draft and the instruction to deepen the contrasts, tradeoffs, or synthesis options.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current design-directions draft and the instruction to critique it from multiple stakeholder perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-10-user-journeys.md">Proceed to user-journey design.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
