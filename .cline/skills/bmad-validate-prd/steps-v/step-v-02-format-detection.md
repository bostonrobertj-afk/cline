---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-03-density-validation.md'
altStepFile: './step-v-02b-parity-check.md'
prdFile: '{prd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step 2: Format Detection & Structure Analysis

## META

- Goal: classify the PRD format and route standard, variant, and non-standard documents correctly.
- Speak in `{communication_language}`.
- Focus only on format detection and structural classification in this step.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Extract the PRD structure">
  <action>Read `{prdFile}` and extract its major headings, frontmatter, and structural organization.</action>
  <action>Identify whether the PRD contains the BMAD core sections expected for standard validation.</action>
  <detail>
    Use the BMAD PRD philosophy loaded in step 1 as the structural baseline.
  </detail>
</step>

<step n="2" goal="Classify the PRD format">
  <action>Classify the document as `BMAD Standard`, `BMAD Variant`, or `Non-Standard`.</action>
  <detail>
    - `BMAD Standard`: core sections are clearly present in expected form
    - `BMAD Variant`: the document substantially follows BMAD structure with acceptable variation
    - `Non-Standard`: fewer than three core BMAD sections or structure is too far from the expected shape
  </detail>
</step>

<step n="3" goal="Append the format findings to the validation report">
  <action>Append a `## Format Detection` section to `{validationReportPath}` with the classification, structural observations, and any notable gaps.</action>
</step>

<step n="4" goal="Route based on the detected format">
  <branch if="format is `BMAD Standard` or `BMAD Variant`" optional="true">
    <output>Explain that the document can proceed through the standard validation sequence.</output>
    <handoff path="{nextStepFile}" />
  </branch>
  <branch if="format is `Non-Standard`" optional="true">
    <output>Explain that the PRD is non-standard and may benefit from a parity check before continuing.</output>
    <ask>Ask whether to run parity analysis, continue with validation anyway, or stop.</ask>
    <branch if="the user selects parity analysis" optional="true">
      <handoff path="{altStepFile}" />
    </branch>
    <branch if="the user selects continue anyway" optional="true">
      <handoff path="{nextStepFile}" />
    </branch>
    <branch if="the user selects stop" optional="true">
      <exit />
    </branch>
  </branch>
</step>

## CHECKPOINT

Pause when a non-standard PRD is detected until the user chooses parity analysis, continuation, or exit.

## ADVISORY

- Keep classification language precise and easy to justify from the actual structure.
- Preserve enough detail in the report that later steps can understand why the PRD was classified the way it was.
