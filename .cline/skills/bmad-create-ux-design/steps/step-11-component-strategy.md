# step 11 component strategy

## META

- Goal: Define the component strategy and the custom component needs for the product.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
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
    <action>Invoke `bmad-advanced-elicitation` using the component-strategy draft as context.</action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>Invoke `bmad-party-mode` using the component-strategy draft as context.</action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-12-ux-patterns.md">Proceed to UX patterns.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
