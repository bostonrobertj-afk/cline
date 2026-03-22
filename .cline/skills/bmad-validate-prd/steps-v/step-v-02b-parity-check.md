---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-03-density-validation.md'
prdFile: '{prd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step 2B: Document Parity Check

## META

- Goal: analyze how far a non-standard PRD is from BMAD parity and let the user decide whether to continue.
- Speak in `{communication_language}`.
- Use this step only when the PRD was classified as non-standard.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Analyze BMAD parity gaps">
  <action>Compare `{prdFile}` against the expected BMAD PRD section set.</action>
  <action>Identify missing sections, weak substitutes, and structural mismatches that prevent parity.</action>
  <detail>
    For each core BMAD section, note whether it is present, partially represented, or missing.
  </detail>
</step>

<step n="2" goal="Estimate the effort required to reach parity">
  <action>Estimate whether the gap to BMAD parity is low, medium, or high effort.</action>
  <action>Identify the most important missing sections or structural repairs needed before the PRD would resemble a BMAD-standard document.</action>
</step>

<step n="3" goal="Append the parity analysis to the validation report">
  <action>Append a `## Parity Analysis` section to `{validationReportPath}` with the gap analysis and effort estimate.</action>
</step>

<step n="4" goal="Ask whether to continue validation">
  <output>Summarize the parity gaps and the estimated effort to reach BMAD alignment.</output>
  <ask>Ask whether to continue validation anyway or stop here.</ask>
  <branch if="the user chooses to continue" optional="true">
    <handoff path="{nextStepFile}" />
  </branch>
  <branch if="the user chooses to stop" optional="true">
    <exit />
  </branch>
</step>

## CHECKPOINT

Pause after presenting the parity analysis until the user chooses whether to continue validation.

## ADVISORY

- This step is diagnostic, not corrective.
- Preserve the user’s ability to continue even when parity is poor, but make the trade-off explicit.
