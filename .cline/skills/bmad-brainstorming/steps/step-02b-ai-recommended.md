# Step 2b: AI-Recommended Techniques

## META

- Goal: Recommend techniques that match the session goals, constraints, and tone.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Load the technique library and session context">
  <action>Load `../brain-methods.csv` on demand.</action>
  <detail>Use `session_topic`, `session_goals`, and any available constraints to guide matching.</detail>
</step>

<step n="2" goal="Analyze technique fit">
  <detail>Match innovation or new-idea goals to creative and wild categories, problem-solving to deep and structured categories, team-building to collaborative methods, personal insight to introspective-delight, and strategic planning to structured plus deep techniques.</detail>
  <detail>Factor in topic complexity, emotional tone, and time available when choosing the sequence.</detail>
</step>

<step n="3" goal="Present the recommended sequence">
  <output>Here is a technique sequence tailored to your session goals and context.</output>
  <detail>Show a small foundation-to-refinement sequence, explain why each technique fits, and note the expected outcome for each phase.</detail>
  <ask>Does this approach sound right, or would you like to adjust it?</ask>
  <branch if="the user wants more details" optional="true">
    <detail>Explain the rationale for any specific technique or phase.</detail>
  </branch>
  <branch if="the user wants to modify the recommendations" optional="true">
    <detail>Swap techniques while preserving the overall matching logic.</detail>
  </branch>
</step>

<step n="4" goal="Confirm the recommended techniques">
  <branch if="the user confirms">
    <action>Update frontmatter with `selected_approach: 'ai-recommended'`, the chosen techniques, and `stepsCompleted: [1, 2]`.</action>
    <handoff path="./step-03-technique-execution.md">Begin technique execution.</handoff>
  </branch>
  <branch if="the user asks to go back" optional="true">
    <handoff path="./step-01-session-setup.md">Return to approach selection.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
