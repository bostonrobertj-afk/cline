---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-10-smart-validation.md'
prdFile: '{prd_file_path}'
prdFrontmatter: '{prd_frontmatter}'
validationReportPath: '{validation_report_path}'
projectTypesData: '../data/project-types.csv'
---

# Step 9: Project-Type Compliance Validation

## META

- Goal: validate that the PRD includes the right sections for its project type and avoids sections that should be excluded.
- Speak in `{communication_language}`.
- This step runs autonomously and focuses only on project-type compliance.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Load project-type expectations">
  <action>Read `{projectTypesData}` and identify the required and excluded sections for the PRD’s project type.</action>
</step>

<step n="2" goal="Determine the PRD project type">
  <action>Use `{prdFrontmatter}` and PRD content to determine the applicable project type classification.</action>
</step>

<step n="3" goal="Validate required and excluded sections">
  <action>Check whether all required sections for the detected project type are present.</action>
  <action>Check whether excluded sections appear where they should not.</action>
  <action>Summarize compliance gaps and strong matches.</action>
</step>

<step n="4" goal="Append project-type findings to the validation report">
  <action>Append a `## Project-Type Compliance Validation` section to `{validationReportPath}` with required sections, excluded sections, compliance score, and severity.</action>
</step>

<step n="5" goal="Report progress and continue">
  <output>State that project-type compliance validation is complete.</output>
  <handoff path="{nextStepFile}" />
</step>

## CHECKPOINT

Do not pause for user input in this step unless the project type cannot be determined from available data.

## ADVISORY

- Required-section failures and excluded-section failures should both be explicit in the report.
- Use the CSV expectations as the validation anchor rather than improvising project-type rules.
