# Step 1b: Workflow Continuation

## META

- Goal: Resume an existing brainstorming session without repeating completed setup.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Analyze existing session state">
  <action>Load `{brainstorming_session_output_file}` and inspect the frontmatter plus the visible session summary.</action>
  <detail>Capture `stepsCompleted`, `session_topic`, `session_goals`, `selected_approach`, `techniques_used`, and `ideas_generated` if present.</detail>
  <output>Welcome back {{user_name}}. I found your existing brainstorming session and will resume from the current state.</output>
</step>

<step n="2" goal="Assess whether the session is complete">
  <branch if="the session appears complete" optional="true">
    <ask>Your brainstorming session appears to be complete. Would you like to review results, start a new session, or extend the session?</ask>
    <branch if="the user wants to review results" optional="true">
      <detail>Route to the organization or completion path that best matches the current state.</detail>
    </branch>
    <branch if="the user wants a new session" optional="true">
      <detail>Return to step-01-session-setup.md and start fresh.</detail>
    </branch>
    <branch if="the user wants to extend the session" optional="true">
      <detail>Continue with the next technique or phase.</detail>
    </branch>
  </branch>
  <branch if="the session is still in progress" optional="true">
    <output>Let's continue where you left off.</output>
  </branch>
</step>

<step n="3" goal="Restore session routing state">
  <action>Update session frontmatter to note continuation state and preserve the existing `stepsCompleted` values.</action>
  <detail>Do not repeat the completed setup questions; move straight to the next unresolved workflow choice.</detail>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
