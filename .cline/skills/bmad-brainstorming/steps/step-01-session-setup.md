# Step 1: Session Setup and Continuation Detection

## META

- Goal: detect whether the user wants to continue an existing brainstorming session or start a new one, then establish the session topic, goals, and technique-selection approach.
- Execute this phase in order.
- Halt whenever a user response, confirmation, or routing choice is required.

## EXECUTION

<step n="1" goal="Ensure necessary brainstorming session files are prepared and available">
  <action>
    List the files in `{output_folder}/brainstorming/` without opening any session document contents.
    <detail>
      - Identify the most recent session file by the date and time embedded in its filename.
      - If no session files exist, treat this as a fresh workflow.
      - Do not read any session file content during this detection step.
    </detail>
  </action>
  <branch if="one or more existing session files are found">
    <output>Show the most recent session filename without opening its content.</output>
    <ask>
      Ask whether the user wants to continue that session, start a new session, or see all existing sessions.
      <detail>
        Options:
        - `[1]` Continue the most recent session
        - `[2]` Start a new session
        - `[3]` See all existing sessions
      </detail>
    </ask>
    <branch if="user selects `[1]`">
      <action>Set `{brainstorming_session_output_file}` to the selected existing session path.</action>
      <handoff path="./step-01b-continue.md" />
    </branch>
    <branch if="user selects `[3]`">
      <output>List all available session filenames without opening their contents.</output>
      <ask>Ask which session to continue, or whether the user wants to start a new one.</ask>
      <branch if="user chooses an existing session from the list">
        <action>Set `{brainstorming_session_output_file}` to the chosen session path.</action>
        <handoff path="./step-01b-continue.md" />
      </branch>
    </branch>
  </branch>
  <branch if="no existing session files are found or the user chooses a new session">
    <action>Create the brainstorming output directory if needed.</action>
    <action if="`brainstorming_session_output_file` is not already set">Generate a new session filename using the current date and time.</action>
    <action>Initialize `{brainstorming_session_output_file}` from `../template.md`.</action>
    <action if="`context_file` is provided and readable">
      Load the context file and extract project-specific guidance that should shape the brainstorming session.
      <detail>
        Use the loaded context to identify focus areas, constraints, or success criteria that should inform the rest of the session setup.
      </detail>
    </action>
    <output>Welcome the user to the brainstorming session and explain that the goal is collaborative idea generation through structured creativity techniques.</output>
    <ask>
      Ask what the session is brainstorming about and what specific outcomes the user wants from the session.
      <detail>
        If a context file was loaded, mention the key focus areas it introduces before asking the setup questions.
      </detail>
    </ask>
  </branch>
</step>

<step n="2" goal="Confirm the session framing and capture topic and goals accurately">
  <action>Summarize the user's topic and goals after they respond.</action>
  <ask>
    Ask whether the summary accurately captures what the user wants to achieve.
    <detail>
      The confirmation should clearly restate:
      - the session topic
      - the primary goals or desired outcomes
      - any context-based focus areas or constraints that should guide later technique selection
    </detail>
  </ask>
</step>

<step n="3" goal="Write or update the session document and persistent state">
  <action>
    Write the confirmed topic, goals, and setup metadata into the session frontmatter.
    <detail>
      Include:
      - `stepsCompleted: [1]`
      - `inputDocuments: []`
      - `session_topic`
      - `session_goals`
      - `selected_approach: ''`
      - `techniques_used: []`
      - `ideas_generated: []`
      - `context_file` when provided
      If the current session document already contains frontmatter fields from the template or an earlier partial setup, update them to reflect the confirmed session framing rather than duplicating them.
    </detail>
  </action>
  <action>
    Write or refresh a session overview section in `{brainstorming_session_output_file}`.
    <detail>
      The session overview should capture:
      - topic
      - goals
      - context guidance, when present
      - session setup summary and facilitator framing
      If a session overview already exists in the document, update it so it stays aligned with the confirmed topic and goals instead of appending conflicting content.
    </detail>
  </action>
</step>

<step n="4" goal="Present technique-selection approaches and route to the chosen path">
  <output>Explain that session setup is complete and present the available brainstorming technique-selection approaches.</output>
  <ask>
    Ask the user to choose one of the four available approaches.
    <detail>
      Options:
      - `[1]` User-Selected Techniques
      - `[2]` AI-Recommended Techniques
      - `[3]` Random Technique Selection
      - `[4]` Progressive Technique Flow
    </detail>
  </ask>
  <branch if="user selects `[1]`">
    <action>Update frontmatter to record `selected_approach: 'user-selected'` and keep `stepsCompleted: [1]`.</action>
    <handoff path="./step-02a-user-selected.md" />
  </branch>
  <branch if="user selects `[2]`">
    <action>Update frontmatter to record `selected_approach: 'ai-recommended'` and keep `stepsCompleted: [1]`.</action>
    <handoff path="./step-02b-ai-recommended.md" />
  </branch>
  <branch if="user selects `[3]`">
    <action>Update frontmatter to record `selected_approach: 'random-selection'` and keep `stepsCompleted: [1]`.</action>
    <handoff path="./step-02c-random-selection.md" />
  </branch>
  <branch if="user selects `[4]`">
    <action>Update frontmatter to record `selected_approach: 'progressive-flow'` and keep `stepsCompleted: [1]`.</action>
    <handoff path="./step-02d-progressive-flow.md" />
  </branch>
</step>

## CHECKPOINT

Halt for any required existing-session decision, session-topic confirmation, or approach-selection choice before advancing.

## ADVISORY

- Treat this phase as setup and routing only; do not preload technique execution.
- Use collaborative facilitation language and maintain psychological safety for creative exploration.
- Do not invent session goals, constraints, or context details the user has not provided.
