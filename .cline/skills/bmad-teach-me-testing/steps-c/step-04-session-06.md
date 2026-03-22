---
name: 'step-04-session-06'
description: 'Session 6: Quality & Trace - test review, traceability, and release gate decisions'

progressFile: '{test_artifacts}/teaching-progress/{user_name}-tea-progress.yaml'
sessionNotesTemplate: '../templates/session-notes-template.md'
sessionNotesFile: '{test_artifacts}/tea-academy/{user_name}/session-06-notes.md'
nextStepFile: './step-03-session-menu.md'
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 4: Session 6 - Quality & Trace

## META

- Goal: teach test quality review, requirements traceability, and release gate reasoning.
- Keep the session focused on quality assurance and shipping decisions.

## EXECUTION

<step n="1" goal="Welcome the learner and mark the session in progress">
  <output>Introduce Session 6, its objective, and the 45-minute Quality &amp; Trace path.</output>
  <action>Update `session-06-quality-trace` to `status: 'in-progress'` and set `started_date` to `{current_date}`.</action>
</step>

<step n="2" goal="Teach Test Review">
  <output>Explain the five quality dimensions: determinism, isolation, assertions, structure, and performance.</output>
  <detail>Show that quality review is about more than whether the tests run.</detail>
</step>

<step n="3" goal="Teach Trace">
  <output>Explain how Trace maps requirements to tests and turns that mapping into a release gate decision.</output>
  <detail>Use GREEN, YELLOW, and RED as simple gate outcomes based on coverage gaps and risk.</detail>
</step>

<step n="4" goal="Teach the metrics that matter">
  <output>Explain why P0/P1 coverage, flakiness rate, execution time, and determinism matter more than vanity metrics like total line coverage or test count.</output>
  <branch if="role == QA">
    <detail>Emphasize quality scoring and release readiness language.</detail>
  </branch>
  <branch if="role == Dev">
    <detail>Emphasize feedback speed and reliable automation language.</detail>
  </branch>
  <branch if="role == Lead">
    <detail>Emphasize gatekeeping, risk visibility, and team standards language.</detail>
  </branch>
  <branch if="role == VP">
    <detail>Emphasize shipping confidence and measurable quality outcomes.</detail>
  </branch>
</step>

<step n="5" goal="Check understanding">
  <ask>Ask three short knowledge-check questions about Test Review, Trace gate decisions, and the metrics that matter.</ask>
  <action>Score the answers and require at least 70% before continuing.</action>
</step>

<step n="6" goal="Generate notes and update progress">
  <action>Create `{sessionNotesFile}` from `{sessionNotesTemplate}` with the session summary and quiz result.</action>
  <action>Mark `session-06-quality-trace` complete, store the score, append `step-04-session-06` to `stepsCompleted`, and update the next recommendation.</action>
</step>

<step n="7" goal="Return to the hub">
  <output>Confirm completion, share the score, and present the A/P/C menu before loading `./step-03-session-menu.md`.</output>
</step>

## CHECKPOINT

Pause for quiz answers and for the user’s choice at the A/P/C menu.

## ADVISORY

- Keep the review metrics explicit and actionable.
- Frame Trace as a release confidence tool, not just a documentation exercise.
