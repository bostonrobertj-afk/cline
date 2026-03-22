---
# File references (ONLY variables used in this step)
nextStepFile: './step-v-02-format-detection.md'
prdPurpose: '../data/prd-purpose.md'
---

# Step 1: Document Discovery & Confirmation

## META

- Goal: confirm the PRD to validate, load supporting inputs, initialize the validation report, and route into validation.
- Speak in `{communication_language}`.
- Do not begin validation checks until discovery and setup are complete.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Load the BMAD PRD standards context">
  <action>Read `{prdPurpose}` completely and use it as the validation philosophy baseline for the rest of the workflow.</action>
</step>

<step n="2" goal="Discover and confirm the PRD to validate">
  <branch if="a PRD path was provided at invocation" optional="true">
    <action>Use the provided PRD path as the validation target.</action>
  </branch>
  <branch if="no PRD path was provided" optional="true">
    <action>Search `{planning_artifacts}` for whole PRD files and sharded PRD locations.</action>
    <branch if="exactly one PRD is found" optional="true">
      <output>Report the discovered PRD path and use it as the validation target.</output>
    </branch>
    <branch if="multiple PRDs are found" optional="true">
      <ask>Ask the user which discovered PRD should be validated.</ask>
    </branch>
    <branch if="no PRD is found" optional="true">
      <ask>Ask the user to provide the path to the PRD that should be validated.</ask>
    </branch>
  </branch>
</step>

<step n="3" goal="Load the PRD and supporting documents">
  <action>Verify that the selected PRD exists and load it completely, including frontmatter.</action>
  <branch if="the selected PRD path is invalid" optional="true">
    <ask>Ask the user to correct the PRD path before continuing.</ask>
  </branch>
  <action>Extract `inputDocuments` and other useful metadata from PRD frontmatter.</action>
  <action>Load each document listed in `inputDocuments` when it is available.</action>
  <detail>
    Track which supporting documents were successfully loaded and which were missing.
    If `inputDocuments` is absent, continue with PRD-only validation and record that fact.
  </detail>
</step>

<step n="4" goal="Ask about additional reference documents">
  <output>Summarize the documents already loaded from the PRD frontmatter.</output>
  <ask>Ask whether the user wants to include any additional reference documents before validation begins.</ask>
  <branch if="the user provides additional documents" optional="true">
    <action>Load the additional documents and add them to the validation input set.</action>
  </branch>
</step>

<step n="5" goal="Initialize the validation report">
  <action>Create `{validationReportPath}` next to the PRD.</action>
  <action>Initialize frontmatter with the validation target, validation date, loaded input documents, an empty `validationStepsCompleted` list, and `validationStatus: IN_PROGRESS`.</action>
  <action>Initialize the report body with the PRD path, validation date, input document list, and a `## Validation Findings` section.</action>
</step>

<step n="6" goal="Present the setup summary and route forward">
  <output>Summarize the selected PRD, the loaded input documents, and the validation report path.</output>
  <ask>Present the menu options `[A] Advanced Elicitation`, `[P] Party Mode`, and `[C] Format Detection`.</ask>
  <branch if="the user selects `A`" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the selected PRD, loaded input-document summary, and the instruction to surface missing assumptions or clarifications before validation begins.
        Tell the subagent to return concise proposed improvements and questions, then return to this setup menu.
      </detail>
    </action>
  </branch>
  <branch if="the user selects `P`" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the selected PRD, loaded input-document summary, and the instruction to critique validation readiness from multiple perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance, then return to this setup menu.
      </detail>
    </action>
  </branch>
  <branch if="the user selects `C`" optional="true">
    <handoff path="{nextStepFile}" />
  </branch>
  <branch if="the user provides more documents or follow-up questions" optional="true">
    <action>Handle the request, update the setup summary if needed, and re-present the menu.</action>
  </branch>
</step>

## CHECKPOINT

Pause until the PRD path is confirmed, the setup report is initialized, and the user explicitly chooses how to proceed.

## ADVISORY

- Keep all user-facing output in `{communication_language}`.
- Keep the validation report in `{document_output_language}`.
- Discovery is setup only; do not perform downstream validation checks in this step.
