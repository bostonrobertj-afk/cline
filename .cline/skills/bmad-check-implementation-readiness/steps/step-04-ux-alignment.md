---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

# step 04 ux alignment

## META

- Goal: Determine whether UX documentation exists and whether the UX, PRD, and Architecture artifacts align.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Determine whether UX documentation exists and whether UX is required">
  <branch if="a UX document exists" optional="true">
    <action>Load the confirmed UX document set completely.</action>
  </branch>
  <branch if="no UX document exists" optional="true">
    <ask>Ask whether the product is user-facing and whether UI or user-journey work is implied by the PRD or Architecture.</ask>
  </branch>
</step>

<step n="2" goal="Assess UX alignment across the planning artifacts">
  <branch if="a UX document exists" optional="true">
    <action>Validate that UX requirements and journeys align with the PRD requirements and use cases.</action>
    <action>Validate that the Architecture accounts for the UX requirements, including responsiveness, performance, interaction, and UI support needs.</action>
    <branch if="the UX introduces requirements not reflected in the PRD or unsupported by Architecture" optional="true">
      <output>Document the alignment gaps and explain why they matter for implementation readiness.</output>
    </branch>
  </branch>
  <branch if="no UX document exists but UX is clearly implied" optional="true">
    <output>Document a warning that UX work appears necessary but is not explicitly captured in the planning set.</output>
  </branch>
  <output>Append the UX alignment assessment and any warnings to `{outputFile}`.</output>
</step>

<step n="3" goal="Proceed into epic quality review">
  <handoff path="./step-05-epic-quality-review.md">Evaluate epic and story quality against implementation-readiness standards.</handoff>
</step>

## CHECKPOINT

Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY

- Next handoff: ./step-05-epic-quality-review.md
