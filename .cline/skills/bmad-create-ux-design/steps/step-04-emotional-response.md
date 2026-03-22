# step 04 emotional response

## META

- Goal: Define the emotional tone and feelings the product should create for its users.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
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
    <action>Invoke `bmad-advanced-elicitation` using the emotional-response draft as context.</action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>Invoke `bmad-party-mode` using the emotional-response draft as context.</action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-05-inspiration.md">Proceed to inspiration analysis.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
