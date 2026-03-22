# step 04 emotional response

## META

- Goal: Define the emotional tone and feelings the product should create for its users.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Explore the target emotional response">
  <ask>Ask how users should feel when they first encounter the product, while using it, and after completing important tasks.</ask>
  <ask>Ask what emotional states the design should reduce, such as anxiety, confusion, or overwhelm.</ask>
</step>

<step n="2" goal="Translate emotions into design direction">
  <action>Convert the emotional goals into practical design implications for tone, interaction, pacing, and reassurance.</action>
  <detail>Anchor the emotional guidance in the real product context instead of abstract brand language.</detail>
</step>

<step n="3" goal="Draft, review, and save the emotional-response section">
  <output>Prepare the emotional-response content for the UX specification.</output>
  <ask>Present the content and ask whether the user wants Advanced Elicitation, Party Mode, or to continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current emotional-response draft and the instruction to deepen the intended feelings, reassurance patterns, or emotional risks.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current emotional-response draft and the instruction to critique it from multiple stakeholder perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-05-inspiration.md">Proceed to inspiration analysis.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
