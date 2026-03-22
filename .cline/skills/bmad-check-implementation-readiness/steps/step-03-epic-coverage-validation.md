---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

# step 03 epic coverage validation

## META

- Goal: Validate that all functional requirements from the PRD are covered in the epics and stories document.

## EXECUTION

<step n="1" goal="Load the epics-and-stories document and extract its FR coverage claims">
  <action>Load the confirmed epics-and-stories source completely.</action>
  <action>Extract the FR coverage map or any equivalent requirement-to-epic linkage that the document provides.</action>
  <output>Document which epics or stories claim to cover each FR.</output>
</step>

<step n="2" goal="Compare epic coverage against the PRD requirements inventory">
  <action>Compare each PRD functional requirement against the extracted epic coverage claims.</action>
  <branch if="a PRD functional requirement is not covered" optional="true">
    <output>Document the missing FR, explain why the gap matters, and recommend where it should be added.</output>
  </branch>
  <branch if="an epic claims coverage for an FR that does not exist in the PRD" optional="true">
    <output>Document the mismatch so the team can decide whether the epic is overreaching or the PRD is incomplete.</output>
  </branch>
  <output>Append the FR coverage matrix, missing-coverage findings, and coverage statistics to `{outputFile}`.</output>
</step>

<step n="3" goal="Proceed directly into UX alignment">
  <handoff path="./step-04-ux-alignment.md">Use the validated document set to assess UX alignment and UX-document completeness.</handoff>
</step>

## CHECKPOINT

Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY

- Next handoff: ./step-04-ux-alignment.md
