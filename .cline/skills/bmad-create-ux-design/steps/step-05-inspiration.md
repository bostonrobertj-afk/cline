# step 05 inspiration

## META

- Goal: Identify useful inspiration and reference patterns without copying them blindly.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
## EXECUTION

<step n="1" goal="Explore inspiration sources">
  <ask>Ask what products, interfaces, or experiences the user admires and what specifically resonates about them.</ask>
  <branch if="the user has no explicit inspiration references" optional="true">
    <ask>Ask what qualities the design should feel like so inspiration can be inferred by style and interaction goals.</ask>
  </branch>
</step>

<step n="2" goal="Extract actionable inspiration">
  <action>Translate the inspiration sources into reusable design lessons, interaction ideas, and cautionary notes.</action>
  <detail>Capture what to emulate and what to avoid instead of treating inspiration as a brand-copying exercise.</detail>
</step>

<step n="3" goal="Draft, review, and save the inspiration section">
  <output>Prepare the inspiration-analysis content for the UX specification.</output>
  <ask>Present the content and ask whether the user wants Advanced Elicitation, Party Mode, or to continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current inspiration draft and the instruction to deepen the reusable lessons, cautionary notes, or interaction ideas.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current inspiration draft and the instruction to critique it from multiple stakeholder perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-06-design-system.md">Proceed to design-system strategy.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
