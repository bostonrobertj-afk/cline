---
wipFile: '{implementation_artifacts}/tech-spec-wip.md'
deferred_work_file: '{implementation_artifacts}/deferred-work.md'
---

# Step 2: Plan

## META

- Speak in the configured communication language.
- Keep the plan grounded in the clarified intent and observed codebase patterns.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Investigate the codebase and write the working spec">
  <action>Inspect the codebase and, when useful, use sub-agents for distilled summaries only.</action>
  <action>Read `../tech-spec-template.md` fully and write the drafted spec to {wipFile}.</action>
  <action>Self-review the draft against the Ready for Development standard.</action>
  <branch if="the intent is still ambiguous or underspecified" optional="true">
    <ask>Ask the user the missing questions before proceeding.</ask>
  </branch>
  <branch if="the draft exceeds 1600 tokens" optional="true">
    <ask>Choose [S] split the scope or [K] keep the full spec.</ask>
  </branch>
  <output>Present the summary and checkpoint the user before freezing the spec.</output>
  <detail>
    If the user approves, rename {wipFile} to {spec_file}, set status to `ready-for-dev`, and lock the frozen section against further edits.
  </detail>
</step>
