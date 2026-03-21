---
name: 'step-e-02-review'
description: 'Review the PRD and build an approved change plan'
workflowPath: '../'
prdPurpose: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/data/prd-purpose.md'
---

# Edit Step 2: Review the PRD and plan changes

## META

- Goal: Review the PRD, incorporate any validation findings, and prepare a detailed change plan before editing.
- Execute this phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Keep this phase focused on analysis and planning only.

## EXECUTION

<step n="1" goal="Load the review context">
  <action>Review the loaded PRD, the user's edit goals, and any validation report findings.</action>
  <detail>If a validation report is available, map each finding to the PRD section it affects before drafting the plan.</detail>
</step>

<step n="2" goal="Build the change plan">
  <action>For each affected section, capture the current state, the issues found, the changes needed, and the priority.</action>
  <detail>Include additions, updates, removals, and any structural adjustments needed to satisfy the edit goals.</detail>
</step>

<step n="3" goal="Present the plan for approval">
  <output>Show the proposed changes, their priority order, and the estimated effort.</output>
  <ask>Does this change plan align with what you had in mind?</ask>
  <ask>Any sections I should add, remove, or reprioritize?</ask>
</step>

<step n="4" goal="Finalize the approved plan and route to edits">
  <action>If the user requests adjustments, revise the plan before continuing.</action>
  <action>If the user approves the plan, store it for the edit phase.</action>
  <handoff path="./step-e-03-edit.md" />
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- This phase only analyzes and plans edits.
- Keep the approved plan section-by-section so the edit phase can apply it without rework.
- Do not modify the PRD in this step.
