# Step 1: Session Setup and Continuation Detection

## META

- Goal: Detect whether the brainstorming session should continue or start fresh, then route to the right technique path.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.

## EXECUTION

<step n="1" goal="Check for existing sessions">
  <action>List all files in `{output_folder}/brainstorming/` without reading file contents.</action>
  <branch if="existing session files are found" optional="true">
    <detail>Identify the most recent file by filename timestamp and treat it as the continuation candidate.</detail>
    <ask>Found existing session: `[filename]`. Would you like to continue this session, start a new session, or see all existing sessions?</ask>
    <branch if="the user chooses to continue" optional="true">
      <handoff path="./step-01b-continue.md">Resume the existing brainstorming session.</handoff>
    </branch>
    <branch if="the user chooses to start a new session" optional="true">
      <detail>Generate a new session filename and continue to fresh setup.</detail>
    </branch>
    <branch if="the user asks to see all sessions" optional="true">
      <detail>List the filenames and wait for the user's selection.</detail>
    </branch>
  </branch>
  <branch if="no existing session files are found" optional="true">
    <detail>Proceed directly to fresh workflow setup.</detail>
  </branch>
</step>

<step n="2" goal="Initialize a fresh brainstorming session">
  <action>Create the brainstorming session directory if needed.</action>
  <action>Copy `../template.md` into `{brainstorming_session_output_file}`.</action>
  <detail>If `{context_file}` is provided and readable, load it and use it to shape the discovery prompts.</detail>
  <ask>What are we brainstorming about, and what specific outcomes are you hoping for?</ask>
  <detail>Capture the topic and goals in session state before moving on.</detail>
</step>

<step n="3" goal="Confirm session parameters">
  <ask>Does this accurately capture what you want to achieve?</ask>
  <branch if="the user confirms" optional="true">
    <action>Update the session frontmatter with `stepsCompleted: [1]`, `session_topic`, `session_goals`, and `{context_file}` if present.</action>
    <output>Session setup complete. Ready to explore technique approaches.</output>
  </branch>
  <branch if="the user revises the session focus" optional="true">
    <detail>Refine the topic and goals, then confirm again before moving forward.</detail>
  </branch>
</step>

<step n="4" goal="Route to brainstorming approach selection">
  <ask>Which approach appeals to you most: user-selected techniques, AI-recommended techniques, random technique selection, or progressive technique flow?</ask>
  <branch if="the user chooses user-selected techniques" optional="true">
    <handoff path="./step-02a-user-selected.md">Load the user-selected techniques path.</handoff>
  </branch>
  <branch if="the user chooses AI-recommended techniques" optional="true">
    <handoff path="./step-02b-ai-recommended.md">Load the AI-recommended techniques path.</handoff>
  </branch>
  <branch if="the user chooses random technique selection" optional="true">
    <handoff path="./step-02c-random-selection.md">Load the random selection path.</handoff>
  </branch>
  <branch if="the user chooses progressive technique flow" optional="true">
    <handoff path="./step-02d-progressive-flow.md">Load the progressive flow path.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
