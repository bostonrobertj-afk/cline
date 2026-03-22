---
name: 'step-04-session-04'
description: 'Session 4: Test Design - risk assessment, coverage planning, and priority matrices'

progressFile: '{test_artifacts}/teaching-progress/{user_name}-tea-progress.yaml'
sessionNotesTemplate: '../templates/session-notes-template.md'
sessionNotesFile: '{test_artifacts}/tea-academy/{user_name}/session-04-notes.md'
nextStepFile: './step-03-session-menu.md'
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 4: Session 4 - Test Design

## META

- Goal: teach risk assessment, coverage planning, and the TEA Test Design workflow.
- Keep the session focused on planning before implementation.

## EXECUTION

<step n="1" goal="Welcome the learner and mark the session in progress">
  <output>Introduce Session 4, its objective, and the 60-minute Test Design path.</output>
  <action>Update `session-04-test-design` to `status: 'in-progress'` and set `started_date` to `{current_date}`.</action>
</step>

<step n="2" goal="Teach the Test Design workflow">
  <output>Explain that the workflow starts with context, then evaluates risk, then turns that into a coverage plan.</output>
  <detail>Emphasize design-before-code and the value of planning tests before implementation starts.</detail>
</step>

<step n="3" goal="Teach risk and testability assessment">
  <output>Explain risk as probability multiplied by impact and use it to identify P0 through P3 priorities.</output>
  <output>Explain testability as a separate check on whether a feature can be tested cleanly and efficiently.</output>
  <branch if="role == QA">
    <detail>Use test coverage defense and risk calibration language.</detail>
  </branch>
  <branch if="role == Dev">
    <detail>Use implementation and dependency management language.</detail>
  </branch>
  <branch if="role == Lead">
    <detail>Use scope, prioritization, and planning language.</detail>
  </branch>
  <branch if="role == VP">
    <detail>Use impact, efficiency, and investment language.</detail>
  </branch>
</step>

<step n="4" goal="Teach coverage planning and priorities">
  <output>Explain how unit, integration, and E2E coverage map differently to P0, P1, P2, and P3 work.</output>
  <output>Summarize the priority matrix and the target mix of coverage for the highest-risk work.</output>
</step>

<step n="5" goal="Check understanding">
  <ask>Ask three short knowledge-check questions about the Test Design workflow, the risk formula, and the P0 coverage strategy.</ask>
  <action>Score the answers and require at least 70% before continuing.</action>
</step>

<step n="6" goal="Generate notes and update progress">
  <action>Create `{sessionNotesFile}` from `{sessionNotesTemplate}` with the session summary and quiz result.</action>
  <action>Mark `session-04-test-design` complete, store the score, append `step-04-session-04` to `stepsCompleted`, and update the next recommendation.</action>
</step>

<step n="7" goal="Return to the hub">
  <output>Confirm completion, share the score, and present the A/P/C menu before loading `./step-03-session-menu.md`.</output>
</step>

## CHECKPOINT

Pause for quiz answers and for the user’s choice at the A/P/C menu.

## ADVISORY

- Keep the planning logic explicit so the learner can apply it to new work.
- Reinforce the difference between risk and testability.
