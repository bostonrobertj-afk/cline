---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-06-traceability-validation.md'
prdFile: '{prd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step 5: Measurability Validation

## META

- Goal: validate that functional and non-functional requirements are measurable, testable, and specific enough to verify.
- Speak in `{communication_language}`.
- This step runs autonomously and focuses only on measurability.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Evaluate functional requirement measurability">
  <action>Extract the PRD’s functional requirements and assess whether each one is specific, measurable, and testable.</action>
</step>

<step n="2" goal="Evaluate non-functional requirement measurability">
  <action>Extract the PRD’s non-functional requirements and assess whether each one includes clear criteria, thresholds, or validation signals.</action>
</step>

<step n="3" goal="Summarize the measurability findings">
  <action>Tally requirement-level violations, partial passes, and strong examples.</action>
  <action>Determine the overall measurability severity for the PRD.</action>
</step>

<step n="4" goal="Append measurability findings to the validation report">
  <action>Append a `## Measurability Validation` section to `{validationReportPath}` with requirement-level findings, severity, and targeted improvement notes.</action>
</step>

<step n="5" goal="Report progress and continue">
  <output>State that measurability validation is complete and report the overall severity.</output>
  <handoff path="{nextStepFile}" />
</step>

## CHECKPOINT

Do not pause for user input in this step unless the requirements sections cannot be located.

## ADVISORY

- Focus on measurable outcomes and testability.
- Do not drift into implementation leakage or broader quality judgment in this step.
