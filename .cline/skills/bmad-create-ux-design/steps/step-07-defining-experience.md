# step 07 defining experience

## META

- Goal: Define the overall experience vision in a way that aligns the later visual and interaction work.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
## EXECUTION

<step n="1" goal="Define the desired experience qualities">
  <ask>Ask how the product should feel overall, what qualities should define the experience, and what should make it memorable.</ask>
  <ask>Ask how the experience should balance clarity, speed, personality, trust, and delight.</ask>
</step>

<step n="2" goal="Translate the vision into design criteria">
  <action>Convert the experience qualities into practical design criteria that later visual, directional, and component work can follow.</action>
  <detail>Use criteria that a designer or engineer could apply, not just adjectives.</detail>
</step>

<step n="3" goal="Draft, review, and save the experience-definition section">
  <output>Prepare the experience-definition content for the UX specification.</output>
  <ask>Present the content and ask whether the user wants Advanced Elicitation, Party Mode, or to continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>Invoke `bmad-advanced-elicitation` using the experience-definition draft as context.</action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>Invoke `bmad-party-mode` using the experience-definition draft as context.</action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-08-visual-foundation.md">Proceed to visual foundation.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
