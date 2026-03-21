# Step 07 - Validation

Workflow ID: `bmad-create-architecture`

## EXECUTION
<step n="1" goal="Validate coherence">
  <ask>Do the technology choices work together without conflicts?</ask>
  <ask>Are the versions compatible?</ask>
  <ask>Do the patterns align with the stack?</ask>
</step>

<step n="2" goal="Validate requirements coverage">
  <ask>Does every epic or functional area have architectural support?</ask>
  <ask>Are the cross-cutting dependencies handled architecturally?</ask>
</step>

<step n="3" goal="Validate implementation readiness">
  <ask>Are the critical decisions documented with versions?</ask>
  <ask>Are the patterns and boundaries clear enough for consistent implementation?</ask>
</step>

<step n="4" goal="Perform gap analysis">
  <action>Identify missing decisions, incomplete patterns, missing structure, and undefined integration points.</action>
</step>

<step n="5" goal="Address validation issues">
  <action>Present any critical, important, or minor issues and ask how the user wants to resolve them.</action>
</step>

<step n="6" goal="Draft the validation results">
  <output>Prepare the markdown content that records the validation findings, checklist, readiness assessment, and handoff guidance.</output>
</step>

<step n="7" goal="Present the draft and menu">
  <output>Summarize the architecture as coherent, covered, and ready for implementation unless the validation found issues.</output>
  <ask>Show the drafted validation results and ask what the user wants to do next.</ask>
  <output>Offer [A] Advanced Elicitation, [P] Party Mode, or [C] Continue.</output>
</step>

<step n="8" goal="Handle the selected menu option">
  <action>Use Advanced Elicitation or Party Mode to resolve any validation concerns when requested.</action>
  <action>Update frontmatter to `stepsCompleted: [1, 2, 3, 4, 5, 6, 7]` when the user chooses C.</action>
  <output>Append the final content to `{planning_artifacts}/architecture.md` and continue to `./step-08-complete.md`.</output>
</step>

## CHECKPOINT
Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
