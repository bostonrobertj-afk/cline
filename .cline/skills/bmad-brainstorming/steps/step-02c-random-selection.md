# Step 2c: Random Technique Selection

## META

- Goal: Select a surprising but workable set of techniques at random.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Load the technique library">
  <action>Load `../brain-methods.csv` on demand.</action>
  <detail>Use the session context only as a light compatibility filter.</detail>
</step>

<step n="2" goal="Select complementary techniques">
  <detail>Choose three techniques from different categories when possible, while avoiding obvious conflicts in energy or flow.</detail>
  <detail>Keep the result surprising but still practical for a live brainstorming session.</detail>
</step>

<step n="3" goal="Present the random combination">
  <output>Here is your random technique combination.</output>
  <detail>Show the three techniques, why each is interesting, and how the sequence creates a creative arc.</detail>
  <ask>Would you like to use this combination, shuffle for a different one, or go back?</ask>
  <branch if="the user chooses Shuffle" optional="true">
    <detail>Generate a fresh random combination and present it again.</detail>
  </branch>
  <branch if="the user asks for details" optional="true">
    <detail>Explain any technique or combination in more depth.</detail>
  </branch>
  <branch if="the user chooses Back" optional="true">
    <handoff path="./step-01-session-setup.md">Return to approach selection.</handoff>
  </branch>
</step>

<step n="4" goal="Confirm the random selection">
  <branch if="the user confirms">
    <action>Update frontmatter with `selected_approach: 'random-selection'`, the chosen techniques, and `stepsCompleted: [1, 2]`.</action>
    <handoff path="./step-03-technique-execution.md">Begin technique execution.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
