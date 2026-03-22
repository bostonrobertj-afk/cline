---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-08-domain-compliance-validation.md'
prdFile: '{prd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step 7: Implementation Leakage Validation

## META

- Goal: detect implementation leakage in requirements so the PRD stays focused on what, not how.
- Speak in `{communication_language}`.
- This step runs autonomously and focuses only on leakage detection.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Scan for implementation leakage">
  <action>Review functional and non-functional requirements for technology choices, architecture decisions, tool names, implementation details, or design-specific how-statements.</action>
</step>

<step n="2" goal="Categorize leakage findings">
  <action>Categorize leakage by type, such as technology leakage, architecture leakage, tooling leakage, or operational-detail leakage.</action>
  <action>Determine the overall leakage severity.</action>
</step>

<step n="3" goal="Append implementation leakage findings to the validation report">
  <action>Append a `## Implementation Leakage Validation` section to `{validationReportPath}` with categorized examples, severity, and correction guidance.</action>
</step>

<step n="4" goal="Report progress and continue">
  <output>State that implementation leakage validation is complete and report the severity.</output>
  <handoff path="{nextStepFile}" />
</step>

## CHECKPOINT

Do not pause for user input in this step unless the requirement sections cannot be evaluated.

## ADVISORY

- Focus on leakage in the PRD itself, not whether the implementation choices are good or bad.
- Preserve domain-specific specificity when it describes outcomes rather than implementation.
