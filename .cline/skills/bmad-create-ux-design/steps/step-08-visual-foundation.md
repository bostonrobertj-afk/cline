# step 08 visual foundation

## META

- Goal: Define the visual foundation for the UX specification.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
## EXECUTION

<step n="1" goal="Define the visual building blocks">
  <ask>Ask about typography direction, color attitude, density, spacing, surfaces, iconography, and any visual constraints already known.</ask>
</step>

<step n="2" goal="Translate visual choices into system guidance">
  <action>Turn the visual discussion into practical guidance for typography, color roles, spacing rhythm, visual hierarchy, and surface treatment.</action>
  <detail>Keep the visual foundation aligned with the earlier emotional and experience goals.</detail>
</step>

<step n="3" goal="Draft, review, and save the visual-foundation section">
  <output>Prepare the visual-foundation content for the UX specification.</output>
  <ask>Present the content and ask whether the user wants Advanced Elicitation, Party Mode, or to continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>Invoke `bmad-advanced-elicitation` using the visual-foundation draft as context.</action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>Invoke `bmad-party-mode` using the visual-foundation draft as context.</action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-09-design-directions.md">Proceed to design directions.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
