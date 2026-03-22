---
name: 'step-04-session-07'
description: 'Session 7: Advanced Patterns - guided exploration of TEA knowledge fragments'

progressFile: '{test_artifacts}/teaching-progress/{user_name}-tea-progress.yaml'
sessionNotesTemplate: '../templates/session-notes-template.md'
sessionNotesFile: '{test_artifacts}/tea-academy/{user_name}/session-07-notes.md'
nextStepFile: './step-03-session-menu.md'
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 4: Session 7 - Advanced Patterns

## META

- Goal: teach advanced testing patterns, capture learner responses, and return to the session menu with updated progress.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

- Goal: let the learner explore advanced TEA knowledge fragments in a menu-driven, repeatable format.
- No quiz is required in this session.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Welcome the learner and mark the session in progress">
  <output>Introduce Session 7, its exploratory purpose, and the fact that this session can be revisited anytime.</output>
  <action>Update `session-07-advanced` to `status: 'in-progress'` the first time the session is entered.</action>
</step>

<step n="2" goal="Show the fragment categories">
  <output>Present the fragment categories and let the learner choose a category or a specific fragment to explore.</output>
  <detail>
    Categories:
    - Testing Patterns
    - Playwright Utils
    - Configuration &amp; Governance
    - Quality Frameworks
    - Authentication &amp; Security
  </detail>
  <detail>
    Keep the fragment list aligned with the existing knowledge base, and preserve the GitHub source link for each exploration.
  </detail>
</step>

<step n="3" goal="Support the exploration loop">
  <branch if="the learner selects a category" optional="true">
    <action>Show the fragments in that category and ask which fragment to open.</action>
  </branch>
  <branch if="the learner selects a fragment" optional="true">
    <action>Present the fragment's key concepts, a role-adapted example, and the source link.</action>
  </branch>
  <branch if="the learner wants another fragment" optional="true">
    <action>Return to the category list and continue the loop.</action>
  </branch>
  <branch if="the learner chooses X" optional="true">
    <action>Proceed to the session summary and completion flow.</action>
  </branch>
</step>

<step n="4" goal="Summarize the exploration">
  <output>Summarize the fragments explored, the key takeaways, and the fact that the learner can revisit the session later.</output>
  <action>Create `{sessionNotesFile}` with the fragments explored, key insights, source links, and completion-based score of 100.</action>
  <action>Mark `session-07-advanced` complete, store the score, append `step-04-session-07` to `stepsCompleted`, and update the next recommendation.</action>
</step>

<step n="5" goal="Return to the hub">
  <output>Confirm completion, share the fragment summary, and present the A/P/C menu.</output>
  <handoff path="./step-03-session-menu.md" />
</step>

<detail>
  Fragment inventory to keep available during the loop:
  - Testing Patterns: fixture-architecture.md, fixtures-composition.md, network-first.md, data-factories.md, component-tdd.md, api-testing-patterns.md, test-healing-patterns.md, selector-resilience.md, timing-debugging.md
  - Playwright Utils: overview.md, api-request.md, network-recorder.md, intercept-network-call.md, recurse.md, log.md, file-utils.md, burn-in.md, network-error-monitor.md, contract-testing.md, visual-debugging.md
  - Configuration &amp; Governance: playwright-config.md, ci-burn-in.md, selective-testing.md, feature-flags.md, risk-governance.md, adr-quality-readiness-checklist.md
  - Quality Frameworks: test-quality.md, test-levels-framework.md, test-priorities-matrix.md, probability-impact.md, nfr-criteria.md
  - Authentication &amp; Security: email-auth.md, auth-session.md, error-handling.md
</detail>

## CHECKPOINT

Pause for every fragment choice, every return-to-categories decision, and the final A/P/C menu.
