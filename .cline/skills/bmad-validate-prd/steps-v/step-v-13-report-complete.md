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

<step n="4" goal="Present next-step options and close cleanly">
  <output>Present the available next-step paths: review detailed findings, use `bmad-edit-prd` for systematic remediation, fix simpler items manually, or stop.</output>
  <output>Report the saved validation report path and the final overall recommendation.</output>
  <action>Suggest the `bmad-help` skill for follow-up workflow guidance if needed.</action>
  <detail>
    Do not ask a new follow-up question just to keep the workflow open.
    If the user already requested a specific remediation path in the same task, acknowledge it in the closing guidance.
    Otherwise, stop cleanly after presenting the report and options.
  </detail>
</step>

## CHECKPOINT

Present the final summary and next-step options, then stop cleanly unless the user explicitly requested another action in the same task.

## ADVISORY

- Do not add new findings in the final summary; synthesize only what the validation steps already established.
- Keep the final recommendation actionable and aligned to the actual severity of the report.
