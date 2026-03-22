# Step 4: Idea Organization and Action Planning

## META

- Goal: Cluster the generated ideas, prioritize the strongest ones, and capture action plans.
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

<step n="1" goal="Review the generated ideas">
  <detail>Use the ideas captured during step 3 as the source of truth.</detail>
  <output>We’ve generated a strong set of ideas. Let’s organize them into themes.</output>
</step>

<step n="2" goal="Cluster ideas into themes">
  <detail>Group related ideas into a few meaningful themes, plus a small set of cross-cutting or breakthrough concepts.</detail>
  <detail>Keep the theme labels concise and useful for later action planning.</detail>
</step>

<step n="3" goal="Prioritize the strongest ideas">
  <ask>Which ideas feel most valuable to you right now: the highest-impact ones, the quick wins, or the most innovative concepts?</ask>
  <branch if="the user identifies priorities">
    <detail>Use impact, feasibility, innovation, and alignment to refine the shortlist.</detail>
  </branch>
</step>

<step n="4" goal="Develop action plans">
  <detail>For each prioritized idea, define immediate next steps, resource needs, obstacles, and success indicators.</detail>
  <ask>Would you like action plans for the other top ideas as well?</ask>
  <branch if="the user wants more action plans" optional="true">
    <detail>Continue expanding the action plan set before finalizing the document.</detail>
  </branch>
</step>

<step n="5" goal="Finalize the session document">
  <detail>Append the thematic organization, prioritization results, action plans, and session summary to `{brainstorming_session_output_file}`.</detail>
  <action>Update frontmatter with `stepsCompleted: [1, 2, 3, 4]`, `session_active: false`, and `workflow_completed: true`.</action>
  <output>Brainstorming session complete.</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
