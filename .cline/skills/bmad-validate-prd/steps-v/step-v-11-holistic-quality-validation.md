---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-12-completeness-validation.md'
prdFile: '{prd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step 11: Holistic Quality Assessment

## META

- Goal: assess the PRD as a cohesive BMAD document, including flow, dual-audience effectiveness, and overall quality.
- Speak in `{communication_language}`.
- Keep all report content in `{document_output_language}`.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Assess the document holistically">
  <action>Review the PRD as a complete document rather than as isolated sections.</action>
  <action>Assess document flow, coherence, audience effectiveness, BMAD principle alignment, and overall usefulness.</action>
  <detail>
    Consider both human readers and LLM consumers where relevant, but keep the PRD aligned to BMAD authoring principles.
  </detail>
</step>

<step n="2" goal="Synthesize a quality rating">
  <action>Assign an overall quality rating and identify the most important strengths and weaknesses.</action>
  <action>Identify the top improvement opportunities that would most materially improve the PRD.</action>
</step>

<step n="3" goal="Append holistic findings to the validation report">
  <action>Append a `## Holistic Quality Assessment` section to `{validationReportPath}` with the rating, strengths, weaknesses, top improvements, and overall severity.</action>
</step>

<step n="4" goal="Report progress and continue">
  <output>State that holistic quality validation is complete and report the overall rating.</output>
  <handoff path="{nextStepFile}" />
</step>

## CHECKPOINT

Do not pause for user input in this step unless the PRD cannot be evaluated as a coherent whole.

## ADVISORY

- This is not the place to relitigate every individual requirement.
- Focus on the document as a complete BMAD artifact with a usable structure, signal quality, and reader utility.
