---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-09-project-type-validation.md'
prdFile: '{prd_file_path}'
prdFrontmatter: '{prd_frontmatter}'
validationReportPath: '{validation_report_path}'
domainComplexityData: '../data/domain-complexity.csv'
---

# Step 8: Domain Compliance Validation

## META

- Goal: validate domain-specific compliance requirements when the PRD belongs to a high-complexity domain.
- Speak in `{communication_language}`.
- This step runs autonomously and only evaluates domain-specific compliance needs.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Load the domain-complexity reference data">
  <action>Read `{domainComplexityData}` and identify the expectations for low-, medium-, and high-complexity domains.</action>
</step>

<step n="2" goal="Determine the PRD domain complexity">
  <action>Use `{prdFrontmatter}` and PRD content to identify the domain classification.</action>
  <action>Determine whether the PRD belongs to a high-complexity domain that requires extra compliance and regulatory coverage.</action>
</step>

<step n="3" goal="Validate required domain-specific coverage when applicable">
  <branch if="the domain is high complexity" optional="true">
    <action>Check for the required special sections, constraints, or compliance coverage expected for the detected domain.</action>
    <action>Identify missing or weak domain-specific material.</action>
    <action>Append a `## Domain Compliance Validation` section to `{validationReportPath}` with the compliance matrix, findings, and severity.</action>
  </branch>
  <branch if="the domain is not high complexity" optional="true">
    <action>Append a `## Domain Compliance Validation` section to `{validationReportPath}` noting that detailed domain compliance checks were not required.</action>
  </branch>
</step>

<step n="4" goal="Report progress and continue">
  <output>State that domain compliance validation is complete.</output>
  <handoff path="{nextStepFile}" />
</step>

## CHECKPOINT

Do not pause for user input in this step unless the domain classification cannot be determined from the PRD and metadata.

## ADVISORY

- Treat this as conditional validation, not a universal failure mechanism.
- When a high-complexity domain is detected, be explicit about which required coverage items are present or missing.
