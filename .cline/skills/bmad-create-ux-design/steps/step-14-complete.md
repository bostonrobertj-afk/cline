
# Step

## META
- managed_workflow_extraction: enabled
- phase_type: phase
- source_format: procedural

## EXECUTION
<step n="1" goal="Review Detailed Guidance">
  <action>Read the advisory, reference, and prose sections in this file completely before taking action.</action>
</step>

<step n="2" goal="Follow Phase Procedure">
  <action>Execute this file in order, preserving every approval gate, routing rule, document update instruction, and constraint described below.</action>
</step>

## CHECKPOINT
This phase can be marked complete only after the required outputs, approvals, and routing conditions in this file are satisfied.

## ADVISORY
- Treat the <prose> section as the authoritative detailed instructions for this file.
- Preserve all existing user-input pauses, continuation checks, and referenced companion files.
- Keep any document templates, frontmatter updates, and save instructions exactly as authored.

## REFERENCE
- Original authored procedure retained below for managed workflow extraction compatibility.

<prose>
## META

- Goal: finalize the UX design workflow, update status tracking, and guide the user to the most relevant next workflows.
- Speak to the user in `{communication_language}`.
- Do not load additional UX design phase files after this step.

## EXECUTION

<step n="1" goal="Announce UX design completion">
  <output>Tell the user the UX design specification is complete and summarize the major areas that were created: project understanding, core experience, emotional goals, inspiration analysis, design system choice, design direction, journeys, component strategy, patterns, and responsive accessibility guidance.</output>
</step>

<step n="2" goal="Identify the final deliverables">
  <output>State clearly where the completed UX design assets live, including `{planning_artifacts}/ux-design-specification.md`, `{planning_artifacts}/ux-color-themes.html`, and `{planning_artifacts}/ux-design-directions.html` when they exist.</output>
</step>

<step n="3" goal="Update workflow status tracking">
  <action>Update the workflow status file if one exists.</action>
  <action>Record the UX design specification path and completion timestamp while preserving existing file structure and comments.</action>
  <action>Update output frontmatter so this step is appended to `stepsCompleted`.</action>
</step>

<step n="4" goal="Suggest relevant next workflows">
  <action>Invoke the `bmad-help` skill so the user can choose the most relevant next workflow.</action>
  <output>Explain that likely next workflows include architecture, epic creation, development planning, or visual design follow-on work.</output>
</step>

<step n="5" goal="Confirm the workflow is finished">
  <output>Congratulate the user and confirm that the UX workflow is complete and ready to guide visual design, prototyping, architecture, and implementation.</output>
</step>

## CHECKPOINT

Wait for the user to decide which next workflow path they want to take after completion.

## ADVISORY

- Suggested next actions such as wireframes, prototypes, architecture, Figma work, or epic creation are advisory follow-on options, not blocking completion tasks for this workflow.

## REFERENCE

- This completion step should not reopen unfinished design phases.
- The UX design specification should remain the canonical reference for downstream design and development work.
</prose>
