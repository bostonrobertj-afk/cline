# Step 03 - Starter Evaluation

Workflow ID: `bmad-create-architecture`

## EXECUTION
<step n="1" goal="Check technical preferences and project context">
  <action>Capture language, framework, database, platform, and tooling preferences from the user and any project context notes.</action>
  <detail>Use the loaded context to avoid re-asking questions that have already been answered.</detail>
</step>

<step n="2" goal="Identify the primary technology domain and UX needs">
  <action>Classify the project as web, mobile, backend, CLI, or full-stack and note any UX-driven starter requirements.</action>
  <detail>Consider animations, forms, real-time behavior, design systems, and offline capability when choosing a starter.</detail>
</step>

<step n="3" goal="Research current starter options">
  <action>Search the web for current, maintained starter templates and verify their current versions and commands.</action>
  <detail>Never rely on hardcoded versions; confirm current CLI usage and maintenance status from live sources.</detail>
</step>

<step n="4" goal="Investigate the strongest starter candidates">
  <action>Review the language/runtime setup, styling system, testing setup, linting/formatting, build tooling, and project organization for each promising starter.</action>
</step>

<step n="5" goal="Present the starter decision">
  <output>Explain that a starter can establish a solid architectural foundation and reduce low-level setup decisions.</output>
  <branch if="user_skill_level = expert">
    <ask>Found {starter_name}, which provides {starter_capabilities}. Should we use it as the base architecture?</ask>
  </branch>
  <branch if="user_skill_level = intermediate">
    <ask>I found {starter_name}, which is a well-maintained starter for this kind of project. Should we use it?</ask>
  </branch>
  <branch if="user_skill_level = beginner">
    <ask>I found {starter_name}, which is like a pre-built foundation for your project. It follows best practices and saves us from making dozens of small technical choices up front. Should we use it?</ask>
  </branch>
</step>

<step n="6" goal="Capture the current command and draft the starter summary">
  <action>When the user is interested in a starter, capture the exact current CLI command and the starter’s key decisions.</action>
  <output>Prepare the markdown content that records the chosen starter and the architectural decisions it provides.</output>
</step>

<step n="7" goal="Present the draft and menu">
  <ask>Show the drafted starter evaluation and ask what the user wants to do next.</ask>
  <output>Offer [A] Advanced Elicitation, [P] Party Mode, or [C] Continue.</output>
</step>

<step n="8" goal="Handle the selected menu option">
  <action>Use Advanced Elicitation or Party Mode to refine the starter analysis when requested.</action>
  <action>Update frontmatter to `stepsCompleted: [1, 2, 3]` when the user chooses C.</action>
  <output>Append the final content to `{planning_artifacts}/architecture.md` and continue to `./step-04-decisions.md`.</output>
</step>

## CHECKPOINT
Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
