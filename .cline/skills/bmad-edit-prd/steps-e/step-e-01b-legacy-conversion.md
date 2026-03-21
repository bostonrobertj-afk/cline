---
name: 'step-e-01b-legacy-conversion'
description: 'Assess legacy PRD conversion effort and route the workflow'
workflowPath: '../'
prdPurpose: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/data/prd-purpose.md'
---

# Edit Step 1B: Assess legacy conversion

## META

- Goal: Analyze a legacy PRD against BMAD standards, estimate the conversion effort, and let the user choose how to proceed.
- Execute this phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Keep the conversion assessment separate from the actual review and edit phases.

## EXECUTION

<step n="1" goal="Assess legacy PRD conversion effort">
  <action>Compare the loaded PRD against the BMAD core sections and note which sections are present, partial, or missing.</action>
  <detail>Capture the effort required for each section and estimate whether the overall work is quick, moderate, or substantial.</detail>
</step>

<step n="2" goal="Present the conversion assessment">
  <output>Summarize the structure, gap analysis, and recommended path.</output>
  <detail>Highlight which existing content can be reused and which sections need new material.</detail>
</step>

<step n="3" goal="Ask how to proceed">
  <ask>How would you like to proceed?</ask>
  <detail>
    [R] Restructure to BMAD
    [I] Targeted Improvements
    [E] Edit &amp; Restructure
    [X] Exit
  </detail>
</step>

<step n="4" goal="Store the chosen conversion strategy">
  <action>Record the selected mode and the user's edit goals for the review phase.</action>
  <branch if="the user selected X">
    <exit />
  </branch>
  <branch if="the user selected R, I, or E">
    <handoff path="./step-e-02-review.md" />
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- This phase only estimates conversion effort and routes the workflow.
- Keep the BMAD section analysis visible for the next phase.
- Do not convert the PRD in this step.
