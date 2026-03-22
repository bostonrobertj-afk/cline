---
# File references (ONLY variables used in this step)
validationReportPath: '{validation_report_path}'
prdFile: '{prd_file_path}'
---

# Step 13: Validation Report Complete

## META

- Goal: finalize the validation report, summarize the results, and offer the user next-step options.
- Speak in `{communication_language}`.
- Keep report content in `{document_output_language}`.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load and finalize the validation report">
  <action>Read `{validationReportPath}` completely.</action>
  <action>Update the report frontmatter with final completion status, completed validation steps, and the overall result.</action>
</step>

<step n="2" goal="Synthesize the final validation summary">
  <action>Summarize findings from all completed validation steps without inventing new findings.</action>
  <detail>
    Include:
    - overall status (`Pass`, `Warning`, or `Critical`)
    - quick results by major validation area
    - critical issues
    - warnings
    - strengths
    - holistic quality rating
    - top improvement opportunities
  </detail>
</step>

<step n="3" goal="Present the final summary to the user">
  <output>Present the completed validation summary conversationally and explain the recommendation.</output>
</step>

<step n="4" goal="Offer next-step options">
  <ask>Ask whether the user wants to review detailed findings, use the edit workflow, fix simpler items, or exit.</ask>
  <branch if="the user selects detailed review" optional="true">
    <output>Walk through the validation report section by section, then return to the menu.</output>
  </branch>
  <branch if="the user selects edit workflow" optional="true">
    <action>Explain that `bmad-edit-prd` is the best path for systematic remediation and offer to launch it with the validation report as context.</action>
  </branch>
  <branch if="the user selects simpler fixes" optional="true">
    <ask>Ask which simple fixes should be applied first.</ask>
  </branch>
  <branch if="the user selects exit" optional="true">
    <output>Report the saved validation report path and the final overall recommendation.</output>
    <action>Suggest the `bmad-help` skill for follow-up workflow guidance if needed.</action>
    <exit />
  </branch>
</step>

## CHECKPOINT

Pause after presenting the final summary until the user chooses a next-step option.

## ADVISORY

- Do not add new findings in the final summary; synthesize only what the validation steps already established.
- Keep the final recommendation actionable and aligned to the actual severity of the report.
