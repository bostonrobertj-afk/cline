---
---

# Step 4: Self-Check

## META

- Goal: Audit the completed work against tasks, tests, acceptance criteria, and project patterns before review.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Verify completion, testing, and acceptance criteria">
  <action>Confirm all tasks are complete and any blocked items are documented.</action>
  <action>Confirm the relevant tests pass and new tests were added where needed.</action>
  <action>Confirm the implementation satisfies the acceptance criteria and follows existing patterns.</action>
  <action>Update the story or tech-spec status when Mode A requires it.</action>
  <output>Prepare a concise implementation summary and continue to adversarial review.</output>
</step>
