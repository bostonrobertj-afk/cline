---
name: 'step-e-03-edit'
description: 'Apply the approved edits to the PRD'
workflowPath: '../'
prdPurpose: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/data/prd-purpose.md'
validationWorkflow: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/steps-v/step-v-01-discovery.md'
---

# Edit Step 3: Apply the approved edits

## META

- Goal: Apply the approved change plan to the PRD, update frontmatter if needed, and verify the result.
- Execute this phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Keep the edit work limited to the approved plan.

## EXECUTION

<step n="1" goal="Load the approved change plan">
  <action>Retrieve the approved section-by-section plan and the user's edit goals.</action>
  <detail>If the plan is incomplete, pause and ask for clarification before editing.</detail>
</step>

<step n="2" goal="Apply the approved edits">
  <action>Load the current PRD section by section and apply only the approved changes.</action>
  <detail>Keep the work scoped to the approved plan: add missing content, revise weak content, remove leakage, and preserve unaffected sections.</detail>
</step>

<step n="3" goal="Update the PRD frontmatter and verify the result">
  <action>Update the PRD frontmatter fields that exist in the file so they stay accurate after editing.</action>
  <action>Verify that the revised PRD still reads cleanly and that no unintended changes were introduced.</action>
  <detail>Record the edit history or workflow status if the PRD already tracks that information.</detail>
</step>

<step n="4" goal="Route to completion">
  <handoff path="./step-e-04-complete.md" />
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Apply only the approved changes.
- Keep the PRD structure coherent and the edits traceable.
- Do not broaden scope beyond the approved plan.
- After the edits are saved, hand off to the completion summary phase.
