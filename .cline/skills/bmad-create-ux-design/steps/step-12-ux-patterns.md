# step 12 ux patterns

## META

- Goal: Establish reusable UX patterns for consistency across the product.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Identify the pattern categories that matter">
  <action>Determine which pattern categories are critical for the product, such as buttons, feedback, forms, navigation, overlays, empty states, and loading states.</action>
</step>

<step n="2" goal="Define the product's UX consistency rules">
  <ask>Ask how these patterns should behave, what customizations are needed, and how consistency should be maintained while still fitting the product's unique needs.</ask>
  <action>Create clear usage guidance, implementation notes, accessibility expectations, and mobile-first considerations for the chosen patterns.</action>
</step>

<step n="3" goal="Draft, review, and save the UX-patterns section">
  <output>Prepare the UX-patterns content for the UX specification.</output>
  <ask>Present the content and ask whether the user wants Advanced Elicitation, Party Mode, or to continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current UX-patterns draft and the instruction to deepen consistency rules, implementation notes, or accessibility expectations.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current UX-patterns draft and the instruction to critique it from multiple stakeholder perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-13-responsive-accessibility.md">Proceed to responsive and accessibility strategy.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
