---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-05-measurability-validation.md'
prdFile: '{prd_file_path}'
productBrief: '{product_brief_path}'
validationReportPath: '{validation_report_path}'
---

# Step 4: Product Brief Coverage Validation

## META

- Goal: confirm whether the PRD covers the input product brief when one exists.
- Speak in `{communication_language}`.
- This step runs autonomously and should only validate brief coverage.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Determine whether product brief coverage applies">
  <branch if="no product brief was loaded as an input" optional="true">
    <action>Append a `## Product Brief Coverage` section to `{validationReportPath}` noting that no product brief was provided.</action>
    <handoff path="{nextStepFile}" />
  </branch>
  <branch if="a product brief exists" optional="true">
    <action>Load `{productBrief}` and compare its content to the PRD.</action>
  </branch>
</step>

<step n="2" goal="Map product brief coverage">
  <branch if="a product brief exists" optional="true">
    <action>Map key product brief themes, goals, scope, constraints, and assumptions to the corresponding PRD sections.</action>
    <action>Identify coverage gaps, weak translation, or missing material.</action>
  </branch>
</step>

<step n="3" goal="Append brief coverage findings to the validation report">
  <branch if="a product brief exists" optional="true">
    <action>Append a `## Product Brief Coverage` section to `{validationReportPath}` with the coverage map, gap summary, and severity.</action>
  </branch>
</step>

<step n="4" goal="Report progress and continue">
  <output>State that product brief coverage validation is complete.</output>
  <handoff path="{nextStepFile}" />
</step>

## CHECKPOINT

Do not pause for user input in this step unless the brief path exists but cannot be read.

## ADVISORY

- Treat missing product-brief content as a traceability problem, not just a completeness issue.
- If no brief was supplied, clearly mark the step as skipped rather than failed.
