---
---

# Step 5: Present

## META

- Speak in the configured communication language.
- Do not auto-push.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Finalize the spec and present the result">
  <action>Update {spec_file} status to `done` in the frontmatter.</action>
  <action>If version control is available and the tree is dirty, create a local commit with a conventional message derived from the spec title.</action>
  <output>Summarize the work, include the commit hash if one was created, and offer to help with push or PR creation.</output>
</step>
