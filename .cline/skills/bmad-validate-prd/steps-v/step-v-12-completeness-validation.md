---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-13-report-complete.md'
prdFile: '{prd_file_path}'
prdFrontmatter: '{prd_frontmatter}'
validationReportPath: '{validation_report_path}'
---

# Step 12: Completeness Validation

## META

- Goal: perform the final completeness check, including template variables, required content, and frontmatter completeness.
- Speak in `{communication_language}`.
- This step runs autonomously and acts as the final validation gate before report completion.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Scan for template and placeholder residue">
  <action>Check `{prdFile}` for unresolved template variables, placeholder tokens, and other unfinished template artifacts.</action>
  <detail>
    Look for patterns such as `{variable}`, `{{variable}}`, `[placeholder]`, and other obviously unfinished scaffold text.
  </detail>
</step>

<step n="2" goal="Check content completeness by section">
  <action>Review the major PRD sections and determine whether each one is complete, incomplete, or missing.</action>
  <detail>
    Include at minimum:
    - Executive Summary
    - Success Criteria
    - Product Scope
    - User Journeys
    - Functional Requirements
    - Non-Functional Requirements
  </detail>
</step>

<step n="3" goal="Check section-specific completeness expectations">
  <action>Verify that success criteria are measurable, journeys cover the intended users, functional requirements cover MVP scope, and non-functional requirements include specific criteria.</action>
</step>

<step n="4" goal="Check frontmatter completeness">
  <action>Review `{prdFrontmatter}` and verify that required frontmatter fields are present and populated.</action>
  <detail>
    At minimum verify:
    - `stepsCompleted`
    - `classification`
    - `inputDocuments`
    - `date`
  </detail>
</step>

<step n="5" goal="Append completeness findings to the validation report">
  <action>Append a `## Completeness Validation` section to `{validationReportPath}` with template findings, section completeness, frontmatter completeness, overall completeness percentage, and severity.</action>
</step>

<step n="6" goal="Report progress and continue">
  <output>State that completeness validation is complete and report the overall completeness level.</output>
  <handoff path="{nextStepFile}" />
</step>

## CHECKPOINT

Do not pause for user input in this step unless the PRD or frontmatter cannot be read.

## ADVISORY

- Treat unresolved template variables as a serious completeness problem.
- Preserve the distinction between critical gaps and minor polish issues in the report.
