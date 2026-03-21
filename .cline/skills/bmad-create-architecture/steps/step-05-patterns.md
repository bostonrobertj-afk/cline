# Step 05 - Implementation Patterns

Workflow ID: `bmad-create-architecture`

## EXECUTION
<step n="1" goal="Identify likely conflict points">
  <action>Look for naming, structure, format, communication, and process choices that different agents might implement differently.</action>
</step>

<step n="2" goal="Facilitate pattern decisions">
  <action>Define the consistency rules that prevent those conflicts across the codebase.</action>
  <detail>Keep the focus on conventions and enforcement, not on implementation details that belong in later work.</detail>
</step>

<step n="3" goal="Define the pattern categories">
  <action>Cover database naming, API naming, code naming, project organization, file organization, API formats, data formats, event systems, state management, error handling, and loading states.</action>
  <detail>Ask the user about ambiguous choices such as pluralization, casing, and identifier format whenever they matter.</detail>
</step>

<step n="4" goal="Draft the pattern summary">
  <output>Prepare the markdown content that records implementation patterns, enforcement guidance, examples, and anti-patterns.</output>
</step>

<step n="5" goal="Present the draft and menu">
  <ask>Show the drafted implementation patterns and ask what the user wants to do next.</ask>
  <output>Offer [A] Advanced Elicitation, [P] Party Mode, or [C] Continue.</output>
</step>

<step n="6" goal="Handle the selected menu option">
  <action>Use Advanced Elicitation or Party Mode to refine consistency rules when requested.</action>
  <action>Update frontmatter to `stepsCompleted: [1, 2, 3, 4, 5]` when the user chooses C.</action>
  <output>Append the final content to `{planning_artifacts}/architecture.md` and continue to `./step-06-structure.md`.</output>
</step>

## CHECKPOINT
Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
