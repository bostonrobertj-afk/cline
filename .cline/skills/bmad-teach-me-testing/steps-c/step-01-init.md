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
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- Keep the workflow strictly on initialization and routing.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Detect existing learner progress">
  <action>Check whether `{progressFile}` exists and can be read.</action>
  <branch if="progress file exists" optional="true">
    <action>Treat the learner as returning and prepare to resume.</action>
  </branch>
  <branch if="progress file does not exist" optional="true">
    <action>Treat the learner as new and prepare to create a fresh progress file.</action>
  </branch>
</step>

<step n="2" goal="Route returning learners to continuation">
  <branch if="progress file exists" optional="true">
    <output>Welcome the learner back.</output>
    <handoff path="./step-01b-continue.md" />
  </branch>
  <detail>The continuation step is responsible for reading the saved state and presenting the dashboard.</detail>
</step>

<step n="3" goal="Create initial progress for a new learner">
  <branch if="progress file does not exist" optional="true">
    <action>Load `{progressTemplate}` and create `{progressFile}` with the TEA progress schema.</action>
    <detail>
      Required fields include `user`, `role`, `experience_level`, `learning_goals`, `pain_points`, `started_date`, `last_session_date`, `sessions`, `sessions_completed`, `total_sessions`, `completion_percentage`, `next_recommended`, `stepsCompleted`, `lastStep`, `lastContinued`, `certificate_generated`, `certificate_path`, and `completion_date`.
    </detail>
    <detail>
      The `sessions` array should include all seven sessions:
      `session-01-quickstart`, `session-02-concepts`, `session-03-architecture`, `session-04-test-design`, `session-05-atdd-automate`, `session-06-quality-trace`, and `session-07-advanced`.
    </detail>
    <handoff path="./step-02-assess.md" />
  </branch>
</step>

## CHECKPOINT

Pause only if the progress file check fails in a way that requires user intervention.
