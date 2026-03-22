---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

# step 06 final assessment

## META

- Goal: Summarize the readiness findings, determine the overall status, and complete the report with actionable recommendations.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Review the accumulated findings across the assessment">
  <action>Review the document-discovery findings, PRD analysis, FR coverage results, UX alignment assessment, and epic-quality findings already recorded in `{outputFile}`.</action>
  <output>Summarize the major issue categories and the most important readiness blockers.</output>
</step>

<step n="2" goal="Determine the overall readiness status and recommended actions">
  <action>Determine whether the project is ready, needs work, or is not ready for implementation.</action>
  <detail>Base the status on evidence from the earlier assessment steps rather than on a general impression.</detail>
  <output>Append a final summary section with overall readiness status, critical issues, and prioritized next steps.</output>
</step>

<step n="3" goal="Finalize and present the completed report">
  <action>Ensure the report is clearly written, the recommendations are actionable, and the assessor/date information is included.</action>
  <output>Save the final report and present the completion summary to the user, including the report path and the number or type of issues that need attention.</output>
  <output>Offer to help the user interpret the findings or choose the most appropriate next workflow.</output>
</step>

## CHECKPOINT

Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY

- Deliver the findings directly and clearly. The value of this workflow is in actionable honesty, not softened messaging.
