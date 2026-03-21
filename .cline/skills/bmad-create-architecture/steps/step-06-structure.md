# Step 06 - Project Structure

Workflow ID: `bmad-create-architecture`

## EXECUTION
<step n="1" goal="Map requirements to structure">
  <action>Connect epics, user stories, or requirement categories to the modules, services, routes, tests, and supporting files they should live in.</action>
</step>

<step n="2" goal="Define directory and boundary structure">
  <action>Describe the project layout, integration boundaries, and the locations of configuration, source, tests, and assets.</action>
  <detail>Make the structure specific enough that multiple agents can place code in the same locations without guessing.</detail>
</step>

<step n="3" goal="Create the complete project tree">
  <output>Prepare the full directory tree that reflects the chosen architecture and technology stack.</output>
</step>

<step n="4" goal="Draft the structure summary">
  <output>Prepare the markdown content that records the project structure, boundaries, mapping, and workflow integration.</output>
</step>

<step n="5" goal="Present the draft and menu">
  <ask>Show the drafted project structure and ask what the user wants to do next.</ask>
  <output>Offer [A] Advanced Elicitation, [P] Party Mode, or [C] Continue.</output>
</step>

<step n="6" goal="Handle the selected menu option">
  <action>Use Advanced Elicitation or Party Mode to refine the structure when requested.</action>
  <action>Update frontmatter to `stepsCompleted: [1, 2, 3, 4, 5, 6]` when the user chooses C.</action>
  <output>Append the final content to `{planning_artifacts}/architecture.md` and continue to `./step-07-validation.md`.</output>
</step>

## CHECKPOINT
Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
