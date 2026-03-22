---
name: 'step-04-session-01'
description: 'Session 1: Quick Start - TEA Lite introduction, Automate overview, and first knowledge check'

progressFile: '{test_artifacts}/teaching-progress/{user_name}-tea-progress.yaml'
sessionNotesTemplate: '../templates/session-notes-template.md'
sessionNotesFile: '{test_artifacts}/tea-academy/{user_name}/session-01-notes.md'
nextStepFile: './step-03-session-menu.md'
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 4: Session 1 - Quick Start

## META

- Goal: teach the quick-start session, capture learner responses, and return to the session menu with updated progress.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

- Goal: introduce TEA, show the TEA Lite learning model, validate understanding, and create session notes.
- Keep the session focused on the Quick Start experience.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Welcome the learner and mark the session in progress">
  <output>Introduce Session 1, its objective, and the 30-minute Quick Start path.</output>
  <action>Update `session-01-quickstart` to `status: 'in-progress'` and set `started_date` to `{current_date}`.</action>
</step>

<step n="2" goal="Explain what TEA is">
  <output>Explain TEA as a testing framework, a set of workflows, and a knowledge system that scales teaching.</output>
  <detail>
    Cover the core ideas: structured workflows, risk-based testing, quality standards, and knowledge fragments for just-in-time learning.
  </detail>
  <detail>
    Mention the main engagement modes: TEA Lite, TEA Solo, TEA Integrated, TEA Enterprise, and TEA Brownfield.
  </detail>
</step>

<step n="3" goal="Show how TEA Lite and Automate fit together">
  <output>Explain the Automate workflow as a practical way to generate tests from described targets and project structure.</output>
  <branch if="role == QA" optional="true">
    <detail>Emphasize coverage expansion and reduced boilerplate.</detail>
  </branch>
  <branch if="role == Dev" optional="true">
    <detail>Emphasize maintainable tests that follow fixture patterns and implementation-friendly structure.</detail>
  </branch>
  <branch if="role == Lead" optional="true">
    <detail>Emphasize standardization across the team and repeatable test architecture.</detail>
  </branch>
  <branch if="role == VP" optional="true">
    <detail>Emphasize scalable onboarding and broader testing adoption without manual training overhead.</detail>
  </branch>
</step>

<step n="4" goal="Check understanding">
  <ask>Ask three short knowledge-check questions covering TEA's purpose, risk-based prioritization, and quality standards.</ask>
  <action>Score the answers and require at least 70% before continuing.</action>
  <detail>Use the session's existing quiz logic, but keep the interaction concise and directly tied to the three core concepts.</detail>
</step>

<step n="5" goal="Generate notes and update progress">
  <action>Create `{sessionNotesFile}` from `{sessionNotesTemplate}` with the session summary, key concepts, and quiz outcome.</action>
  <action>Mark `session-01-quickstart` complete, store the score, append `step-04-session-01` to `stepsCompleted`, and update the next recommendation.</action>
</step>

<step n="6" goal="Return to the hub">
  <output>Confirm completion, share the score, and present the A/P/C menu.</output>
  <handoff path="./step-03-session-menu.md" />
</step>

## CHECKPOINT

Pause for quiz answers and for the user’s choice at the A/P/C menu.
