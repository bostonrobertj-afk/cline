---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-04-brief-coverage-validation.md'
prdFile: '{prd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step 3: Information Density Validation

## META

- Goal: validate that the PRD meets BMAD information density standards and avoids filler, redundancy, and bloated phrasing.
- Speak in `{communication_language}`.
- This step runs autonomously and should not pause for user input.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Scan the PRD for density issues">
  <action>Review `{prdFile}` for conversational filler, wordy phrasing, duplicated meaning, and low-density explanatory text.</action>
  <detail>
    Look for anti-patterns such as repeated framing, obvious filler phrases, redundant restatements, and long sections that carry little decision-making value.
  </detail>
</step>

<step n="2" goal="Classify findings and determine severity">
  <action>Categorize each finding as minor, moderate, or severe based on how much it reduces clarity and density.</action>
  <action>Determine the overall density severity for the PRD.</action>
</step>

<step n="3" goal="Append density findings to the validation report">
  <action>Append a `## Information Density Validation` section to `{validationReportPath}` with findings, examples, and the overall severity.</action>
</step>

<step n="4" goal="Report progress and continue">
  <output>State that information density validation is complete and report the severity level.</output>
  <handoff path="{nextStepFile}" />
</step>

## CHECKPOINT

Do not pause for user input in this step unless the PRD cannot be read at all.

## ADVISORY

- Focus on density and concision, not general quality or correctness.
- Preserve meaningful summaries and orientation aids when they add real value rather than treating all repetition as failure.
