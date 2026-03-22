# step 03 core experience

## META

- Goal: Define the core action, platform context, and critical moments that the UX must optimize.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
## EXECUTION

<step n="1" goal="Define the core user action and essential experience">
  <ask>Ask what users will do most frequently, what absolutely must feel effortless, and what interaction is critical to get right.</ask>
  <ask>Ask about platform requirements, device expectations, and any important interaction constraints.</ask>
</step>

<step n="2" goal="Identify delight and failure points">
  <ask>Ask what interactions should feel natural, where users currently struggle with similar products, what should create delight, and what failure would ruin the experience.</ask>
  <output>Distill a set of core experience principles that should guide later design choices.</output>
</step>

<step n="3" goal="Draft, review, and save the core-experience section">
  <output>Prepare the core-experience content for the UX specification.</output>
  <ask>Present the content and ask whether the user wants Advanced Elicitation, Party Mode, or to continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>Invoke `bmad-advanced-elicitation` using the current core-experience draft as context.</action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>Invoke `bmad-party-mode` using the current core-experience draft as context.</action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-04-emotional-response.md">Proceed to emotional response definition.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
