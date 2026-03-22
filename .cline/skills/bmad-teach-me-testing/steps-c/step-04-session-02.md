---
name: 'step-04-session-02'
description: 'Session 2: Core Concepts - testing philosophy, risk-based prioritization, and quality standards'

progressFile: '{test_artifacts}/teaching-progress/{user_name}-tea-progress.yaml'
sessionNotesTemplate: '../templates/session-notes-template.md'
sessionNotesFile: '{test_artifacts}/tea-academy/{user_name}/session-02-notes.md'
nextStepFile: './step-03-session-menu.md'
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 4: Session 2 - Core Concepts

## META

- Goal: teach core testing concepts, capture learner responses, and return to the session menu with updated progress.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

- Goal: teach testing as engineering, risk-based testing, and TEA quality standards.
- Keep the session focused on the core mental models behind the curriculum.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Welcome the learner and mark the session in progress">
  <output>Introduce Session 2, its objective, and the 45-minute Core Concepts path.</output>
  <action>Update `session-02-concepts` to `status: 'in-progress'` and set `started_date` to `{current_date}`.</action>
</step>

<step n="2" goal="Teach testing as engineering">
  <output>Explain that tests should be designed, maintained, and reviewed like production engineering assets.</output>
  <detail>Connect this idea to architecture, quality standards, and deliberate test design.</detail>
</step>

<step n="3" goal="Teach risk-based testing and the TEA quality bar">
  <output>Explain the P0-P3 risk matrix and how probability multiplied by impact drives coverage priority.</output>
  <output>Explain TEA's quality standards: no flaky tests, no hard waits, stateless execution, no order dependence, and self-cleaning tests.</output>
  <branch if="role == QA" optional="true">
    <detail>Use coverage reporting and quality defense language.</detail>
  </branch>
  <branch if="role == Dev" optional="true">
    <detail>Use implementation and refactoring language that mirrors production code practices.</detail>
  </branch>
  <branch if="role == Lead" optional="true">
    <detail>Use architecture, budget, and team consistency language.</detail>
  </branch>
  <branch if="role == VP" optional="true">
    <detail>Use risk, ROI, and quality-metric language.</detail>
  </branch>
</step>

<step n="4" goal="Check understanding">
  <ask>Ask three short knowledge-check questions about testing as engineering, the P0-P3 matrix, and the Definition of Done.</ask>
  <action>Score the answers and require at least 70% before continuing.</action>
</step>

<step n="5" goal="Generate notes and update progress">
  <action>Create `{sessionNotesFile}` from `{sessionNotesTemplate}` with the teaching summary and quiz result.</action>
  <action>Mark `session-02-concepts` complete, store the score, append `step-04-session-02` to `stepsCompleted`, and update the next recommendation.</action>
</step>

<step n="6" goal="Return to the hub">
  <output>Confirm completion, share the score, and present the A/P/C menu.</output>
  <handoff path="./step-03-session-menu.md" />
</step>

## CHECKPOINT

Pause for quiz answers and for the user’s choice at the A/P/C menu.
