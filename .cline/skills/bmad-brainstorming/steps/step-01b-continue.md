# Step 1b: Workflow Continuation

## META

- Goal: analyze an existing brainstorming session, summarize its status, and route the user to the appropriate continuation path.
- Execute this phase in order.
- Halt whenever a user response, confirmation, or routing choice is required.

## EXECUTION

<step n="1" goal="Analyze the existing brainstorming session state">
  <action>Read `{brainstorming_session_output_file}` and analyze its frontmatter and current document content.</action>
  <detail>
    Capture:
    - `stepsCompleted`
    - `session_topic`
    - `session_goals`
    - `selected_approach`
    - `techniques_used`
    - `ideas_generated`
    - whether the session appears complete or still in progress
  </detail>
  <output>Welcome the user back and summarize the session topic, progress, techniques used, ideas generated, and current stage.</output>
</step>

<step n="2" goal="Present continuation options that match the current session state">
  <branch if="the existing session appears complete">
    <output>Explain that the session appears complete and present continuation options.</output>
    <ask>Ask whether the user wants to review results, start a new session, or extend the completed session with more exploration.</ask>
  </branch>
  <branch if="the existing session is still in progress">
    <output>Explain the current progress and the next logical step based on the saved workflow state.</output>
    <ask>Ask whether the user wants to continue from that point, start a new session, or change direction.</ask>
  </branch>
</step>

<step n="3" goal="Route the user based on continuation choice and saved progress">
  <branch if="user chooses to start a new session">
    <handoff path="./step-01-session-setup.md" />
  </branch>
  <branch if="user chooses to review a completed session">
    <output>Review the documented outcomes, priorities, and next steps from the completed session.</output>
    <ask>Ask whether the user wants to extend the session with more technique work or conclude after the review.</ask>
    <branch if="user chooses to extend the completed session after review">
      <handoff path="./step-03-technique-execution.md" />
    </branch>
    <branch if="user chooses to conclude after the review">
      <exit />
    </branch>
  </branch>
  <branch if="user chooses to continue an in-progress session or extend a completed one">
    <detail>
      Route by saved workflow state:
      - If only setup is complete and `selected_approach` is missing, return to `./step-01-session-setup.md`.
      - If setup is complete and `selected_approach = 'user-selected'`, continue at `./step-02a-user-selected.md`.
      - If setup is complete and `selected_approach = 'ai-recommended'`, continue at `./step-02b-ai-recommended.md`.
      - If setup is complete and `selected_approach = 'random-selection'`, continue at `./step-02c-random-selection.md`.
      - If setup is complete and `selected_approach = 'progressive-flow'`, continue at `./step-02d-progressive-flow.md`.
      - If technique selection is complete but technique execution is not, continue at `./step-03-technique-execution.md`.
      - If technique execution is complete but organization is not, continue at `./step-04-idea-organization.md`.
    </detail>
    <branch if="saved progress indicates the next phase is `step-01-session-setup`">
      <handoff path="./step-01-session-setup.md" />
    </branch>
    <branch if="saved progress indicates the next phase is `step-02a-user-selected`">
      <handoff path="./step-02a-user-selected.md" />
    </branch>
    <branch if="saved progress indicates the next phase is `step-02b-ai-recommended`">
      <handoff path="./step-02b-ai-recommended.md" />
    </branch>
    <branch if="saved progress indicates the next phase is `step-02c-random-selection`">
      <handoff path="./step-02c-random-selection.md" />
    </branch>
    <branch if="saved progress indicates the next phase is `step-02d-progressive-flow`">
      <handoff path="./step-02d-progressive-flow.md" />
    </branch>
    <branch if="saved progress indicates the next phase is `step-03-technique-execution`">
      <handoff path="./step-03-technique-execution.md" />
    </branch>
    <branch if="saved progress indicates the next phase is `step-04-idea-organization`">
      <handoff path="./step-04-idea-organization.md" />
    </branch>
  </branch>
</step>

<step n="4" goal="Update continuation metadata before resuming">
  <action>
    Update the session frontmatter to record that the session was resumed.
    <detail>
      Include continuation metadata such as:
      - `session_continued: true`
      - `continuation_date`
    </detail>
  </action>
</step>

## CHECKPOINT

Halt for the user's continuation choice before routing to the next phase.

## ADVISORY

- Respect existing workflow state and avoid repeating already completed work.
- Maintain continuity in tone and rapport by acknowledging prior progress.
- Build on existing ideas and insights instead of restarting the session from scratch.
