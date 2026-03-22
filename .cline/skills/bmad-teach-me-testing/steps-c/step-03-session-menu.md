---
name: 'step-03-session-menu'
description: 'Present the learning hub, show session status, and route to a selected session or completion'

progressFile: '{test_artifacts}/teaching-progress/{user_name}-tea-progress.yaml'
session01File: './step-04-session-01.md'
session02File: './step-04-session-02.md'
session03File: './step-04-session-03.md'
session04File: './step-04-session-04.md'
session05File: './step-04-session-05.md'
session06File: './step-04-session-06.md'
session07File: './step-04-session-07.md'
completionFile: './step-05-completion.md'
---

# Step 3: Session Menu

## META

- Goal: act as the routing hub for all seven sessions, show progress, and route to the chosen teaching session or completion path.
- Show progress clearly before asking the learner to choose a path.
- Keep this step focused on navigation, not teaching.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load progress and determine completion state">
  <action>Read `{progressFile}` completely and extract session statuses, completion percentage, next recommendation, and certificate state.</action>
  <action>Determine whether all seven sessions are complete.</action>
</step>

<step n="2" goal="Display the hub">
  <output>Show a menu that includes each session title, duration, and status indicator, along with overall progress and the recommended next session.</output>
  <detail>
    Session titles:
    1. Quick Start
    2. Core Concepts
    3. Architecture &amp; Patterns
    4. Test Design
    5. ATDD &amp; Automate
    6. Quality &amp; Trace
    7. Advanced Patterns
  </detail>
</step>

<step n="3" goal="Route based on completion state">
  <branch if="all sessions are complete and certificate_generated is not true" optional="true">
    <output>Celebrate completion.</output>
    <handoff path="./step-05-completion.md" />
  </branch>
  <branch if="all sessions are complete and certificate_generated is true" optional="true">
    <output>The certificate already exists; keep the hub available so the learner can revisit sessions or exit.</output>
  </branch>
  <branch if="sessions remain" optional="true">
    <ask>Ask the learner to choose a session number or `X` to exit.</ask>
    <detail>The learner can also ask questions before choosing; keep the hub visible and wait for a selection.</detail>
  </branch>
</step>

<step n="4" goal="Route to the selected session">
  <action>When the learner chooses 1-7, load the matching session file and continue there.</action>
  <action>When the learner chooses `X`, save progress and exit without advancing to a session.</action>
</step>

## CHECKPOINT

Halt for any user choice at the hub, especially session selection, exit, or completion routing.
