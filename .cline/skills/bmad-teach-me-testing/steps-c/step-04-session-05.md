---
name: 'step-04-session-05'
description: 'Session 5: ATDD & Automate - red-green development, automation coverage, and API testing'

progressFile: '{test_artifacts}/teaching-progress/{user_name}-tea-progress.yaml'
sessionNotesTemplate: '../templates/session-notes-template.md'
sessionNotesFile: '{test_artifacts}/tea-academy/{user_name}/session-05-notes.md'
nextStepFile: './step-03-session-menu.md'
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 4: Session 5 - ATDD & Automate

## META

- Goal: teach ATDD and automation concepts, capture learner responses, and return to the session menu with updated progress.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

- Goal: teach red-green development, test generation for existing features, and practical API testing patterns.
- Keep the session focused on implementation and coverage growth.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Welcome the learner and mark the session in progress">
  <output>Introduce Session 5, its objective, and the 60-minute ATDD &amp; Automate path.</output>
  <action>Update `session-05-atdd-automate` to `status: 'in-progress'` and set `started_date` to `{current_date}`.</action>
</step>

<step n="2" goal="Teach ATDD">
  <output>Explain that ATDD starts with failing tests, then moves to implementation, so the test defines the behavior.</output>
  <detail>Connect the red phase to behavior discovery and the green phase to minimal implementation.</detail>
</step>

<step n="3" goal="Teach Automate">
  <output>Explain that Automate expands coverage for existing features by generating tests for known targets.</output>
  <detail>Make the difference from ATDD explicit: Automate starts from existing code, not from a failing specification.</detail>
</step>

<step n="4" goal="Teach supporting patterns">
  <output>Explain the component TDD red-green-refactor loop and the role of pure API tests in fast, direct validation.</output>
  <branch if="role == QA" optional="true">
    <detail>Highlight coverage growth and stable regression checks.</detail>
  </branch>
  <branch if="role == Dev" optional="true">
    <detail>Highlight test-first implementation discipline and quick feedback loops.</detail>
  </branch>
  <branch if="role == Lead" optional="true">
    <detail>Highlight adoption patterns that balance speed with consistency.</detail>
  </branch>
  <branch if="role == VP" optional="true">
    <detail>Highlight scalable quality practices that reduce manual teaching overhead.</detail>
  </branch>
</step>

<step n="5" goal="Check understanding">
  <ask>Ask three short knowledge-check questions about red-green TDD, the difference between ATDD and Automate, and why API tests are useful.</ask>
  <action>Score the answers and require at least 70% before continuing.</action>
</step>

<step n="6" goal="Generate notes and update progress">
  <action>Create `{sessionNotesFile}` from `{sessionNotesTemplate}` with the session summary, docs used, fragments referenced, and quiz result.</action>
  <action>Mark `session-05-atdd-automate` complete, store the score, append `step-04-session-05` to `stepsCompleted`, and update the next recommendation.</action>
</step>

<step n="7" goal="Return to the hub">
  <output>Confirm completion, share the score, and present the A/P/C menu.</output>
  <handoff path="./step-03-session-menu.md" />
</step>

## CHECKPOINT

Pause for quiz answers and for the user’s choice at the A/P/C menu.
