# step 05 inspiration

## META

- Goal: Identify useful inspiration and reference patterns without copying them blindly.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
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
    <action>Invoke `bmad-advanced-elicitation` using the inspiration draft as context.</action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>Invoke `bmad-party-mode` using the inspiration draft as context.</action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved content and append this step to `stepsCompleted`.</action>
    <handoff path="./step-06-design-system.md">Proceed to design-system strategy.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
