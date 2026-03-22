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

## EXECUTION

<step n="1" goal="Verify completion state">
  <action>Read `{progressFile}` completely and confirm that all seven sessions are marked completed and `sessions_completed` is 7.</action>
  <branch if="any session is incomplete">
    <output>Explain how many sessions remain and route the learner back to the session menu.</output>
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

## ADVISORY

- Use the session 7 notes when assembling the final certificate artifacts.
- Do not continue to any further step after completion.
