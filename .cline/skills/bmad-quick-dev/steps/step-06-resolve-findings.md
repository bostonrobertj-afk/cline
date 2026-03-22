---
---

# Step 6: Resolve Findings

## META

- Goal: Resolve adversarial review findings interactively and finish the workflow cleanly.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Review each finding and choose a resolution">
  <branch if="the user wants to walk through findings one by one" optional="true">
    <action>Present each finding with context and ask whether to fix, skip, or discuss it.</action>
  </branch>
  <branch if="the user wants automatic fixes" optional="true">
    <action>Fix findings classified as real and report what changed.</action>
  </branch>
  <branch if="the user wants to skip findings" optional="true">
    <action>Acknowledge the findings and proceed to completion.</action>
  </branch>
  <detail>
    If Mode A is active, update the tech-spec status and review notes after findings are resolved.
  </detail>
  <output>Provide the final review summary and close out the workflow.</output>
</step>
