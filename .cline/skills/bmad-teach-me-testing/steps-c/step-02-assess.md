---
name: 'step-02-assess'
description: 'Gather role, experience level, learning goals, and optional pain points'

nextStepFile: './step-03-session-menu.md'
progressFile: '{test_artifacts}/teaching-progress/{user_name}-tea-progress.yaml'
---

# Step 2: Learner Assessment

## META

- Goal: gather learner context so teaching examples and recommendations can be personalized.
- Ask one question at a time and validate each required answer.
- Keep the step focused on assessment only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Introduce the assessment">
  <output>Explain that the assessment will capture role, experience level, learning goals, and optional pain points to tailor the rest of the workflow.</output>
</step>

<step n="2" goal="Collect and validate role">
  <ask>Ask the learner to choose one role: QA, Dev, Lead, or VP.</ask>
  <action>Validate the response case-insensitively and repeat until it matches one of the allowed roles.</action>
</step>

<step n="3" goal="Collect and validate experience level">
  <ask>Ask the learner to choose one experience level: Beginner, Intermediate, or Experienced.</ask>
  <action>Validate the response case-insensitively and repeat until it matches one of the allowed levels.</action>
</step>

<step n="4" goal="Collect learning goals">
  <ask>Ask what the learner wants to achieve with TEA Academy.</ask>
  <action>Require a meaningful response of at least a sentence, then store it for the progress file.</action>
</step>

<step n="5" goal="Collect optional pain points">
  <ask>Ask about current testing pain points and allow the learner to skip with `skip` or `none`.</ask>
  <action>Store the response when provided; otherwise set the field to null.</action>
</step>

<step n="6" goal="Summarize and persist assessment data">
  <output>Present a concise summary of the captured role, experience level, learning goals, and pain points.</output>
  <action>Update `{progressFile}` with the captured fields, append `step-02-assess` to `stepsCompleted`, and set `lastStep` to `step-02-assess`.</action>
</step>

<step n="7" goal="Preview next session choices">
  <output>Show a short recommendation based on the learner's experience level and explain that the session menu comes next.</output>
  <handoff path="./step-03-session-menu.md" />
</step>

## CHECKPOINT

Pause only if validation fails or the learner needs to clarify an answer.
