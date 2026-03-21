# Step 02 - Project Context

Workflow ID: `bmad-create-architecture`

## EXECUTION
<step n="1" goal="Review project requirements">
  <action>Extract and analyze functional requirements, non-functional requirements, technical constraints, and dependencies.</action>
  <detail>Count and categorize requirements, then map epics and user stories to architectural components.</detail>
</step>

<step n="2" goal="Assess project scale and complexity">
  <action>Evaluate real-time needs, multi-tenancy, compliance, integration complexity, and user interaction complexity.</action>
</step>

<step n="3" goal="Reflect the architectural understanding">
  <action>Summarize the core functionality, critical NFRs, unique technical challenges, and any regulatory concerns.</action>
  <detail>If UX documents were loaded, include the relevant UX-driven technical implications in the summary.</detail>
</step>

<step n="4" goal="Draft the project context section">
  <action>Capture the primary domain, complexity level, and estimated architectural component count.</action>
  <detail>Use the gathered requirements to create a concise foundation for the rest of the architecture workflow.</detail>
</step>

<step n="5" goal="Present the draft and prompt for action">
  <output>Show the drafted project context analysis and explain that it will anchor the architecture decisions.</output>
  <ask>What would you like to do: [A] Advanced Elicitation, [P] Party Mode, or [C] Continue?</ask>
</step>

<step n="6" goal="Handle the selected menu option">
  <action>Use Advanced Elicitation or Party Mode to improve the context analysis when selected.</action>
  <action>Update frontmatter to `stepsCompleted: [1, 2]` when the user chooses C.</action>
  <output>Append the final content to `{planning_artifacts}/architecture.md` and return to the A/P/C menu when changes are accepted or rejected.</output>
</step>

## CHECKPOINT
Halt for required user confirmation, menu selection, continuation gating, or missing input before proceeding.

## ADVISORY
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
