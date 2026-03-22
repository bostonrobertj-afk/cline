# step 06 design system

## META

- Goal: Choose or define the design-system approach that will anchor the UX work.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
## EXECUTION

<step n="1" goal="Assess the design-system options">
  <ask>Ask whether the product should rely on an existing design system, adapt one, or define a lighter custom system.</ask>
  <ask>Ask what constraints exist around engineering capacity, brand uniqueness, and speed of delivery.</ask>
</step>

<step n="2" goal="Select the right design-system strategy">
  <action>Compare the viable options based on consistency, speed, customization, accessibility support, and maintainability.</action>
  <detail>Make the tradeoffs explicit so the design-system decision is useful to downstream design and engineering work.</detail>
</step>

<step n="3" goal="Draft, review, and save the design-system section">
  <output>Prepare the design-system strategy content for the UX specification.</output>
  <ask>Present the content and ask whether the user wants Advanced Elicitation, Party Mode, or to continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>Invoke `bmad-advanced-elicitation` using the design-system draft as context.</action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>Invoke `bmad-party-mode` using the design-system draft as context.</action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-07-defining-experience.md">Proceed to experience definition.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
