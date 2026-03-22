---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-07-implementation-leakage-validation.md'
prdFile: '{prd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step 6: Traceability Validation

## META

- Goal: validate the traceability chain from executive summary through success criteria, user journeys, and requirements.
- Speak in `{communication_language}`.
- This step runs autonomously and focuses only on traceability.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Evaluate the traceability chain">
  <action>Check whether major functional requirements trace back to user journeys, success criteria, and the executive summary.</action>
  <action>Identify orphan requirements, unsupported goals, and broken reasoning chains.</action>
</step>

<step n="2" goal="Build the traceability summary">
  <action>Summarize valid chains, weak links, missing predecessors, and orphaned items.</action>
  <action>Determine the overall traceability severity.</action>
</step>

<step n="3" goal="Append traceability findings to the validation report">
  <action>Append a `## Traceability Validation` section to `{validationReportPath}` with the chain assessment, orphan list, and severity.</action>
</step>

<step n="4" goal="Report progress and continue">
  <output>State that traceability validation is complete and report the overall severity.</output>
  <handoff path="{nextStepFile}" />
</step>

## CHECKPOINT

Do not pause for user input in this step unless the traceability chain cannot be evaluated from the PRD content.

## ADVISORY

- Make broken traceability explicit rather than softening it.
- Preserve useful examples of strong traceability so the report shows what good alignment looks like.
