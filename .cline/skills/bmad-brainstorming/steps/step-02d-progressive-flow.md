# Step 2d: Progressive Technique Flow

## META

- Goal: Move from broad ideation to prioritized action through a staged technique sequence.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Design the creative journey">
  <detail>Map the session into four phases: expansive exploration, pattern recognition, idea development, and action planning.</detail>
  <detail>Choose techniques for each phase based on the session topic, tone, and available time.</detail>
</step>

<step n="2" goal="Present the journey map">
  <output>Here is the progressive flow for your brainstorming session.</output>
  <detail>Show the four phases, the selected technique for each phase, and the transition point between phases.</detail>
  <ask>Would you like to use this flow, customize any phase, or go back?</ask>
  <branch if="the user wants to customize" optional="true">
    <detail>Adjust the phase techniques or the pacing while keeping the overall progression intact.</detail>
  </branch>
  <branch if="the user asks for details" optional="true">
    <detail>Explain any phase or technique in more depth.</detail>
  </branch>
  <branch if="the user chooses Back" optional="true">
    <handoff path="./step-01-session-setup.md">Return to approach selection.</handoff>
  </branch>
</step>

<step n="3" goal="Confirm the progressive flow">
  <branch if="the user confirms">
    <action>Update frontmatter with `selected_approach: 'progressive-flow'`, the phase techniques, and `stepsCompleted: [1, 2]`.</action>
    <handoff path="./step-03-technique-execution.md">Begin technique execution.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
