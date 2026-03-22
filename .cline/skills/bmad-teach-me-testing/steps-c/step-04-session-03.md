---
name: 'step-04-session-03'
description: 'Session 3: Architecture & Patterns - fixture composition, network-first patterns, data factories, and step-file architecture'

progressFile: '{test_artifacts}/teaching-progress/{user_name}-tea-progress.yaml'
sessionNotesTemplate: '../templates/session-notes-template.md'
sessionNotesFile: '{test_artifacts}/tea-academy/{user_name}/session-03-notes.md'
nextStepFile: './step-03-session-menu.md'
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 4: Session 3 - Architecture & Patterns

## META

- Goal: teach architecture and testing-pattern concepts, capture learner responses, and return to the session menu with updated progress.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

- Goal: teach the architecture patterns behind TEA, including fixtures, network control, and workflow structure.
- Keep the session focused on reusable patterns and why they matter.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Welcome the learner and mark the session in progress">
  <output>Introduce Session 3, its objective, and the 60-minute Architecture &amp; Patterns path.</output>
  <action>Update `session-03-architecture` to `status: 'in-progress'` and set `started_date` to `{current_date}`.</action>
</step>

<step n="2" goal="Teach fixture architecture and composition">
  <output>Explain composable fixtures, fixture reuse, and why shared setup should be layered instead of copied.</output>
  <detail>Point out the benefits: DRY setup, cleanup control, and test typing/structure.</detail>
</step>

<step n="3" goal="Teach network-first patterns and data factories">
  <output>Explain how network-first setup removes timing races and makes tests deterministic.</output>
  <output>Explain how data factories replace hard-coded test data with reusable builders and override-friendly defaults.</output>
  <branch if="role == QA" optional="true">
    <detail>Connect the patterns to flake reduction and coverage reliability.</detail>
  </branch>
  <branch if="role == Dev" optional="true">
    <detail>Connect the patterns to implementation speed and maintainability.</detail>
  </branch>
  <branch if="role == Lead" optional="true">
    <detail>Connect the patterns to standardization and shared team conventions.</detail>
  </branch>
  <branch if="role == VP" optional="true">
    <detail>Connect the patterns to onboarding scale and repeatable quality.</detail>
  </branch>
</step>

<step n="4" goal="Teach step-file architecture">
  <output>Explain the workflow pattern the learner is currently experiencing: micro-file design, just-in-time loading, sequential enforcement, and progress tracking.</output>
  <detail>Keep the explanation tied to the way this learning workflow is organized, rather than abstract architecture theory.</detail>
</step>

<step n="5" goal="Check understanding">
  <ask>Ask three short knowledge-check questions about fixtures, network-first behavior, and step-file architecture.</ask>
  <action>Score the answers and require at least 70% before continuing.</action>
</step>

<step n="6" goal="Generate notes and update progress">
  <action>Create `{sessionNotesFile}` from `{sessionNotesTemplate}` with the teaching summary and quiz result.</action>
  <action>Mark `session-03-architecture` complete, store the score, append `step-04-session-03` to `stepsCompleted`, and update the next recommendation.</action>
</step>

<step n="7" goal="Return to the hub">
  <output>Confirm completion, share the score, and present the A/P/C menu.</output>
  <handoff path="./step-03-session-menu.md" />
</step>

## CHECKPOINT

Pause for quiz answers and for the user’s choice at the A/P/C menu.
