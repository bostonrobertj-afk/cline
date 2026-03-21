---
name: 'step-e-01-discovery'
description: 'Discover the PRD path, edit goals, validation guidance, and routing path'
workflowPath: '../'
prdPurpose: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/data/prd-purpose.md'
---

# Edit Step 1: Discover the PRD and edit scope

## META

- Goal: Discover the target PRD, capture the user's edit goals, and determine whether the PRD needs conversion before review.
- Execute this phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Keep the discovery step focused on context gathering and routing only.

## EXECUTION

<step n="1" goal="Load PRD standards">
  <action>Resolve and load `{prdPurpose}`.</action>
  <detail>Use the PRD quality standards as the baseline for all later recommendations and edits.</detail>
</step>

<step n="2" goal="Get the PRD path from the user">
  <ask>Which PRD would you like to edit? Please provide the path to the PRD file.</ask>
  <detail>Do not load the PRD until the path is provided.</detail>
</step>

<step n="3" goal="Load the PRD and check for validation guidance">
  <action>Confirm the PRD exists at the provided path and load the complete file, including frontmatter.</action>
  <detail>If the path is invalid, ask the user to correct it before proceeding.</detail>
  <action>Look for the most recent validation report in the same PRD folder.</action>
  <branch if="a validation report exists">
    <ask>Would you like to use the validation report or skip it?</ask>
    <action if="the user chooses to use the report">Load it and extract findings, severity, and suggested fixes.</action>
    <action if="the user chooses to skip the report">Proceed with manual edit discovery.</action>
  </branch>
  <branch if="no validation report exists">
    <output>No validation report was found in the PRD folder.</output>
  </branch>
</step>

<step n="4" goal="Capture edit goals and classify the PRD">
  <ask>What would you like to edit in this PRD?</ask>
  <action>Inspect the loaded PRD structure and classify it as BMAD Standard, BMAD Variant, or Legacy.</action>
  <detail>
    Use the BMAD core sections as the baseline:
    Executive Summary, Success Criteria, Product Scope, User Journeys, Functional Requirements, and Non-Functional Requirements.
  </detail>
</step>

<step n="5" goal="Route to the correct follow-up phase">
  <branch if="the PRD is Legacy and the user wants restructuring">
    <handoff path="./step-e-01b-legacy-conversion.md" />
  </branch>
  <branch if="the PRD is BMAD Standard, BMAD Variant, or the user wants targeted edits on a Legacy PRD">
    <handoff path="./step-e-02-review.md" />
  </branch>
  <detail>
    If the user chose to use a validation report, carry its findings into the next phase as review guidance.
  </detail>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- This phase only discovers context and routes the workflow.
- Keep the user's edit goals, validation choice, and PRD classification available for the next phase.
- Do not edit the PRD in this step.
