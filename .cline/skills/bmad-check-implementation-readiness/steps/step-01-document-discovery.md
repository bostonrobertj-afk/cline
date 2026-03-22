---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

# step 01 document discovery

## META

- Goal: Discover, inventory, and confirm the set of project documents to use for the readiness assessment.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Search for the assessment inputs and organize them by document type">
  <action>Search systematically for PRD, Architecture, Epics and Stories, and UX documents under `{planning_artifacts}`.</action>
  <detail>Search both whole-document patterns and sharded-folder patterns with `index.md` so the assessment does not miss split document sets.</detail>
  <action>Group sharded documents together and identify duplicates where both whole and sharded versions exist.</action>
  <output>Present the discovered document inventory organized by document type.</output>
</step>

<step n="2" goal="Resolve duplicate or missing documents before assessment proceeds">
  <branch if="duplicate whole and sharded versions exist for the same document type" optional="true">
    <output>Flag the duplicate formats as a critical issue and explain that the assessment needs one source of truth per document type.</output>
    <ask>Ask the user which version should be used for the assessment.</ask>
  </branch>
  <branch if="a required document type is missing" optional="true">
    <output>Warn that the missing document will reduce readiness confidence and identify which later assessment areas will be affected.</output>
  </branch>
  <ask>Ask the user to confirm the final set of documents to use for the assessment.</ask>
</step>

<step n="3" goal="Initialize the readiness report and record the chosen inputs">
  <action>Initialize `{outputFile}` from `../templates/readiness-report-template.md`.</action>
  <output>Record the confirmed document inventory and any duplicate-or-missing-document notes in the report.</output>
  <handoff path="./step-02-prd-analysis.md">Proceed to PRD analysis.</handoff>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
