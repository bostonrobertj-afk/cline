---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
epicsFile: '{planning_artifacts}/*epic*.md'
---

# step 02 prd analysis

## META

- Goal: Read the PRD completely and extract all functional, non-functional, and additional requirements needed for downstream validation.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Load the confirmed PRD source and read it completely">
  <branch if="the confirmed PRD source is a whole document" optional="true">
    <action>Load and read the full PRD document.</action>
  </branch>
  <branch if="the confirmed PRD source is a sharded document set" optional="true">
    <action>Load and read all files in the sharded PRD set, using the index first to understand the structure.</action>
  </branch>
  <detail>Do not skip files or summarize prematurely. This step is the foundation for every later readiness judgment.</detail>
</step>

<step n="2" goal="Extract the requirements inventory from the PRD">
  <action>Extract all functional requirements, including numbered FRs, explicit functional-requirement statements, user-facing capabilities, and core business rules.</action>
  <action>Extract all non-functional requirements, including performance, security, usability, reliability, scalability, and compliance requirements.</action>
  <branch if="the PRD contains additional constraints or implementation-relevant assumptions" optional="true">
    <action>Extract the additional constraints, technical assumptions, integration requirements, and business limitations that affect implementation readiness.</action>
  </branch>
  <output>Append the complete requirements inventory and a PRD completeness assessment to `{outputFile}`.</output>
</step>

<step n="3" goal="Proceed directly into epic coverage validation">
  <handoff path="./step-03-epic-coverage-validation.md">Use the extracted PRD requirements to validate epic and story coverage.</handoff>
</step>

## CHECKPOINT

Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY

- Next handoff: ./step-03-epic-coverage-validation.md
