---
---

# Step 5: Adversarial Code Review

## META

- Goal: Construct the change set, run adversarial review, and present the findings.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
## EXECUTION

<step n="1" goal="Construct the review diff">
  <action>List the files modified during the workflow and include any new files created.</action>
  <detail>
    If Git is available, use the baseline commit to build an accurate diff. If not, summarize the changed files and their current state.
  </detail>
</step>

<step n="2" goal="Invoke adversarial review and process findings">
  <action>Send the diff to the adversarial review skill and capture its findings.</action>
  <action>Turn the findings into actionable review items and present them to the user.</action>
  <ask>How would you like to resolve the findings: walk through them, fix them automatically, or skip them?</ask>
</step>
