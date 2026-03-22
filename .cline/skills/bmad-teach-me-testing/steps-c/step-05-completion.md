---
name: 'step-05-completion'
description: 'Generate the completion certificate, finalize progress, and close the workflow'

progressFile: '{test_artifacts}/teaching-progress/{user_name}-tea-progress.yaml'
sessionNotesFile: '{test_artifacts}/tea-academy/{user_name}/session-07-notes.md'
certificateTemplate: '../templates/certificate-template.md'
certificateFile: '{test_artifacts}/tea-academy/{user_name}/tea-completion-certificate.md'
---

# Step 5: Completion & Certificate Generation

## META

- Goal: verify the learner has completed all seven sessions, create the certificate, and finalize the record.
- This is the terminal step for the teaching workflow.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Verify completion state">
  <action>Read `{progressFile}` completely and confirm that all seven sessions are marked completed and `sessions_completed` is 7.</action>
  <branch if="any session is incomplete" optional="true">
    <output>Explain how many sessions remain and route the learner back to the session menu.</output>
    <handoff path="./step-03-session-menu.md" />
  </branch>
</step>

<step n="2" goal="Calculate final metrics">
  <action>Compute the average score across all seven sessions and determine the total duration from `started_date` to `{current_date}`.</action>
  <detail>Use the stored session scores and dates rather than estimating from memory.</detail>
</step>

<step n="3" goal="Celebrate completion">
  <output>Congratulate the learner and summarize the completion date, duration, average score, and individual session scores.</output>
</step>

<step n="4" goal="Generate the certificate">
  <action>Load `{certificateTemplate}` and create `{certificateFile}` using the final progress data and session scores.</action>
  <detail>Include the learner role, dates, duration, and all seven completed sessions in the certificate.</detail>
</step>

<step n="5" goal="Finalize progress">
  <action>Update `{progressFile}` with `sessions_completed: 7`, `completion_percentage: 100`, `certificate_generated: true`, `certificate_path`, and `completion_date`.</action>
  <action>Append `step-05-completion` to `stepsCompleted` and set `lastStep` accordingly.</action>
</step>

<step n="6" goal="Close the workflow">
  <output>Confirm that the certificate was generated, the progress file was finalized, and the workflow is complete.</output>
</step>

## CHECKPOINT

Stop if the progress file does not show all seven sessions complete.
