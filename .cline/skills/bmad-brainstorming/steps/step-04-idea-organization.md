# Step 4: Idea Organization and Action Planning

## META

- Goal: organize the generated ideas into themes, prioritize the strongest opportunities, and produce actionable next steps with complete session documentation.
- Execute this phase in order.
- Halt whenever a user response, confirmation, or routing choice is required.

## EXECUTION

<step n="1" goal="Review the creative output and identify themes">
  <action>Review all ideas generated during technique execution.</action>
  <output>Summarize the scale of the brainstorming session, including the number of ideas, the techniques used, and the session focus.</output>
  <action>Group related ideas into meaningful themes and identify cross-cutting concepts, breakthrough ideas, and implementation-ready opportunities.</action>
</step>

<step n="2" goal="Present organized themes and facilitate prioritization">
  <output>Present the ideas organized by theme, with a short explanation of each cluster and the most important ideas inside it.</output>
  <ask>
    Ask which themes or specific ideas feel most valuable to the user.
    <detail>
      Guide prioritization using criteria such as:
      - impact
      - feasibility
      - innovation
      - alignment with the user's original goals and constraints
    </detail>
  </ask>
</step>

<step n="3" goal="Develop action plans for the user's priority ideas">
  <action>
    Help the user turn selected ideas into concrete action plans.
    <detail>
      For each top idea, cover:
      - immediate next steps
      - resource requirements
      - likely obstacles
      - success metrics
      - practical timeline
    </detail>
  </action>
  <ask>Ask whether the user wants similar action plans for additional priority ideas.</ask>
</step>

<step n="4" goal="Create comprehensive session documentation and present completion">
  <action>
    Append the final organization, prioritization, and action-planning content to `{brainstorming_session_output_file}`.
    <detail>
      The final documentation should include:
      - thematic organization of ideas
      - prioritization results
      - action plans
      - key session achievements
      - reflections and major breakthroughs
    </detail>
  </action>
  <output>Summarize the value of the session, the prioritized opportunities, and the user's next steps.</output>
  <ask>
    Ask whether the user is ready to complete the session documentation.
    <detail>
      Completion option:
      - `[C]` Complete and finalize the brainstorming session
    </detail>
  </ask>
</step>

<step n="5" goal="Finalize the session and close the workflow">
  <branch if="user selects `[C]`">
    <action>Update frontmatter with `stepsCompleted: [1, 2, 3, 4]`, `session_active: false`, and `workflow_completed: true`.</action>
    <output>Close the session with a positive summary of the creative achievements and actionable outcomes.</output>
    <exit />
  </branch>
</step>

## CHECKPOINT

Halt for final completion confirmation before closing the workflow.

## ADVISORY

- Preserve the connection between the user's original goals and the final prioritized outcomes.
- Make the action plans specific enough to be useful immediately.
- Ensure the final session document is comprehensive, organized, and easy for the user to revisit later.
