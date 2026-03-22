---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

# step 05 epic quality review

## META

- Goal: Validate epics and stories against the create-epics-and-stories best practices for user value, independence, dependencies, and implementation readiness.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Review epic structure for user value and independence">
  <action>Evaluate each epic to determine whether it describes a user outcome instead of a technical milestone.</action>
  <action>Validate that each epic can deliver meaningful value using only the outputs of earlier epics, never later ones.</action>
  <branch if="an epic is really a technical milestone or requires a later epic to function" optional="true">
    <output>Document the structural defect and explain why it reduces implementation readiness.</output>
  </branch>
</step>

<step n="2" goal="Review story quality and within-epic dependency flow">
  <action>Evaluate whether each story delivers clear user value, is appropriately sized, and contains testable acceptance criteria.</action>
  <action>Check that stories depend only on already-completed stories and do not contain forward references.</action>
  <branch if="a story is oversized, vague, or dependent on future work" optional="true">
    <output>Document the issue with specific examples and explain the remediation needed.</output>
  </branch>
  <detail>Look especially for technical setup stories with no user value, vague Given/When/Then criteria, and stories that expect future capabilities to exist first.</detail>
</step>

<step n="3" goal="Apply special implementation-readiness checks">
  <branch if="the Architecture specifies a starter template" optional="true">
    <action>Verify that the first implementation story reflects the required starter-template setup and includes only the setup work actually needed at that point.</action>
  </branch>
  <action>Verify that tables, models, and other foundational technical assets are created only when first needed by a story.</action>
  <output>Append the epic-quality findings, best-practice violations, and remediation guidance to `{outputFile}`.</output>
</step>

<step n="4" goal="Prepare the final assessment handoff">
  <handoff path="./step-06-final-assessment.md">Synthesize all readiness findings into an overall readiness recommendation.</handoff>
</step>

## CHECKPOINT

Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY

- Be direct about structural issues. This step is a quality gate, not a reassurance pass.
