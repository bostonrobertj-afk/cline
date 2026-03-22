---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-11-holistic-quality-validation.md'
prdFile: '{prd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step 10: SMART Requirements Validation

## META

- Goal: assess functional requirements against SMART criteria and identify weak requirements that need revision.
- Speak in `{communication_language}`.
- Keep all report content in `{document_output_language}`.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Extract the functional requirements">
  <action>Extract all functional requirements from `{prdFile}`, preserving their identifiers and wording.</action>
</step>

<step n="2" goal="Score the requirements against SMART criteria">
  <action>Score each functional requirement for Specific, Measurable, Attainable, Relevant, and Traceable quality.</action>
  <detail>
    Use a `1-5` scale for each criterion and flag any requirement that scores below `3` in any category.
  </detail>
</step>

<step n="3" goal="Summarize requirement quality">
  <action>Calculate overall quality metrics, including the percentage of requirements with acceptable scores and the average quality score.</action>
  <action>Write targeted improvement suggestions for low-scoring requirements.</action>
</step>

<step n="4" goal="Append SMART findings to the validation report">
  <action>Append a `## SMART Requirements Validation` section to `{validationReportPath}` with the scoring table, quality summary, improvement suggestions, and severity.</action>
</step>

<step n="5" goal="Report progress and continue">
  <output>State that SMART requirements validation is complete and report the overall FR quality level.</output>
  <handoff path="{nextStepFile}" />
</step>

## CHECKPOINT

Do not pause for user input in this step unless functional requirements cannot be extracted from the PRD.

## ADVISORY

- Use SMART scoring to evaluate requirement quality, not business desirability.
- Keep the scoring transparent enough that later edits can act on it directly.
