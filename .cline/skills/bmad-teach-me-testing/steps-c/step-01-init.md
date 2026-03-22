---
name: 'step-01-init'
description: 'Initialize TEA Academy, detect continuation, and route to the next phase'

nextStepFile: './step-02-assess.md'
continueFile: './step-01b-continue.md'
progressFile: '{test_artifacts}/teaching-progress/{user_name}-tea-progress.yaml'
progressTemplate: '../templates/progress-template.yaml'
---

# Step 1: Initialize TEA Academy

## META

- Goal: detect existing progress, initialize state when needed, and route to continuation or assessment.
- Do not teach content yet.
- Keep the workflow strictly on initialization and routing.

## EXECUTION

<step n="1" goal="Detect existing learner progress">
  <action>Check whether `{progressFile}` exists and can be read.</action>
  <action>If it exists, treat the learner as returning and prepare to resume.</action>
  <action>If it does not exist, treat the learner as new and prepare to create a fresh progress file.</action>
</step>

<step n="2" goal="Route returning learners to continuation">
  <output>Welcome the learner back and load `./step-01b-continue.md` when progress already exists.</output>
  <detail>The continuation step is responsible for reading the saved state and presenting the dashboard.</detail>
</step>

<step n="3" goal="Create initial progress for a new learner">
  <action>Load `{progressTemplate}` and create `{progressFile}` with the TEA progress schema.</action>
  <detail>
    Required fields include `user`, `role`, `experience_level`, `learning_goals`, `pain_points`, `started_date`, `last_session_date`, `sessions`, `sessions_completed`, `total_sessions`, `completion_percentage`, `next_recommended`, `stepsCompleted`, `lastStep`, `lastContinued`, `certificate_generated`, `certificate_path`, and `completion_date`.
  </detail>
  <detail>
    The `sessions` array should include all seven sessions:
    `session-01-quickstart`, `session-02-concepts`, `session-03-architecture`, `session-04-test-design`, `session-05-atdd-automate`, `session-06-quality-trace`, and `session-07-advanced`.
  </detail>
  <output>After creating the file, load and follow `./step-02-assess.md`.</output>
</step>

## CHECKPOINT

Pause only if the progress file check fails in a way that requires user intervention.

## ADVISORY

- This step is an auto-route entry point.
- Keep future session files unloaded until the progress state is known.
