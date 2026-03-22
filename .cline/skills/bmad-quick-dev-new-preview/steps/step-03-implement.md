---
wipFile: '{implementation_artifacts}/tech-spec-wip.md'
deferred_work_file: '{implementation_artifacts}/deferred-work.md'
---

# Step 3: Implement

## META

- Speak in the configured communication language.
- Do not modify content inside `<frozen-after-approval>` in {spec_file}.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Implement the approved spec">
  <action>Verify {spec_file} exists and resolve `baseline_commit` before making changes.</action>
  <action>Update {spec_file} frontmatter status to `in-progress`.</action>
  <branch if="execution_mode is one-shot or there are no sub-agents/tasks available" optional="true">
    <action>Implement the intent directly.</action>
  </branch>
  <branch if="execution_mode is plan-code-review" optional="true">
    <action>Hand {spec_file} to a sub-agent or task for implementation.</action>
  </branch>
  <output>Proceed to review once implementation is complete.</output>
</step>
