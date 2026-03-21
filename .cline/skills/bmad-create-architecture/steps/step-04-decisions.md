# Step 04 - Architectural Decisions

Workflow ID: `bmad-create-architecture`

## EXECUTION
<step n="1" goal="Load the decision framework and existing preferences">
  <action>Review the technical preferences, starter template decisions, and project context captured in earlier steps.</action>
  <detail>Identify what is already decided, what remains critical, and what can be deferred.</detail>
</step>

<step n="2" goal="Work through the remaining architectural decision categories">
  <action>Facilitate the data architecture, security, API/communication, frontend, and infrastructure decisions that are still open.</action>
  <detail>Verify current technology versions when specific tools or frameworks are being chosen.</detail>
</step>

<step n="3" goal="Facilitate each decision collaboratively">
  <action>Adapt the explanation depth to the user’s skill level, capture their preference, and record the implications of each choice.</action>
  <detail>If the user asks for more detail or alternatives, pause and explore those options before recording the decision.</detail>
</step>

<step n="4" goal="Check cascading implications">
  <action>Identify related decisions that become relevant after each major choice and make them explicit.</action>
</step>

<step n="5" goal="Draft the decision summary">
  <output>Prepare the markdown content that records critical, important, and deferred decisions plus their impact on the architecture.</output>
</step>

<step n="6" goal="Present the draft and menu">
  <ask>Show the drafted architectural decisions and ask what the user wants to do next.</ask>
  <output>Offer [A] Advanced Elicitation, [P] Party Mode, or [C] Continue.</output>
</step>

<step n="7" goal="Handle the selected menu option">
  <action>Use Advanced Elicitation or Party Mode to refine specific decision areas when requested.</action>
  <action>Update frontmatter to `stepsCompleted: [1, 2, 3, 4]` when the user chooses C.</action>
  <output>Append the final content to `{planning_artifacts}/architecture.md` and continue to `./step-05-patterns.md`.</output>
</step>

## CHECKPOINT
Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
