---
name: 'step-01b-continue'
description: 'Resume TEA Academy learning from saved progress and route to the session menu'

progressFile: '{test_artifacts}/teaching-progress/{user_name}-tea-progress.yaml'
nextStepFile: './step-03-session-menu.md'
---

# Step 1b: Continue TEA Academy

## META

- Goal: resume the learner from saved state, show progress, and route to the session menu.
- Do not teach new content here.
- Treat this as a continuation-only step.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Load saved progress">
  <action>Read `{progressFile}` completely and extract user profile, session statuses, scores, dates, and recommended next session.</action>
  <action>Update `lastContinued` to `{current_date}` while keeping the rest of the file intact.</action>
</step>

<step n="2" goal="Show the progress dashboard">
  <output>Display a welcome-back summary with role, experience level, start date, completion percentage, session-by-session status, and next recommendation.</output>
  <detail>Use clear status markers for completed, in-progress, and not-started sessions.</detail>
</step>

<step n="3" goal="Route to the hub">
  <output>After showing the dashboard, continue to the session menu.</output>
  <handoff path="./step-03-session-menu.md" />
</step>

## CHECKPOINT

Halt if the progress file cannot be read or if the stored state needs user correction.
