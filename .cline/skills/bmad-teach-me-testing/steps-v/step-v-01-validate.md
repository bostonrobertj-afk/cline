---
name: 'step-v-01-validate'
description: 'Validate the teaching workflow against the managed formatting and workflow standards'

workflowPath: '../'
checklistFile: '../checklist.md'
validationReport: '{test_artifacts}/workflow-validation/teach-me-testing-validation-{date}.md'
---

# Validate Step 1: Quality Validation

## META

- Goal: validate workflow structure, step formatting, session content, and state-management consistency.
- Keep the validation focused on this workflow family.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Start validation">
  <output>Announce that the teach-me-testing workflow is being validated and summarize the areas to check.</output>
</step>

<step n="2" goal="Validate workflow structure">
  <action>Check that `workflow.md` exists, uses the managed format, and routes cleanly into the step folders.</action>
  <action>Confirm the tri-modal `steps-c`, `steps-e`, and `steps-v` structure is present.</action>
</step>

<step n="3" goal="Validate session and template files">
  <action>Review the step files, templates, and data files for completeness and consistency with the current workflow.</action>
  <detail>Focus on frontmatter, routing, progress state fields, and session artifact paths.</detail>
</step>

<step n="4" goal="Generate the validation report">
  <action>Create `{validationReport}` with the observed status, issues, and remediation guidance.</action>
</step>

<step n="5" goal="Report results">
  <output>Share the final validation status, quality score, and report location.</output>
</step>

## CHECKPOINT

Pause for any missing input, validation failure, or report generation problem.
