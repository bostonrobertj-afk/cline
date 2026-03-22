---
---

# Step 2: Context Gathering (Direct Mode)

## META

- Goal: Quickly gather the files, patterns, and dependencies needed for direct implementation.
- This step only runs in direct mode.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Identify the files and patterns that matter">
  <action>Search for relevant files and note their locations and purpose.</action>
  <action>Inspect nearby code for patterns, imports, error handling, and tests.</action>
  <action>Note dependencies and related configuration files that may need updates.</action>
</step>

<step n="2" goal="Create a focused implementation plan">
  <output>Summarize the files to modify, the patterns identified, the inferred acceptance criteria, and the order of operations.</output>
  <ask>Ready to proceed, or do you want to adjust the plan or gather more context?</ask>
  <detail>
    If the user confirms, route to `./step-03-execute.md`. If not, keep gathering context and re-present the plan.
  </detail>
</step>
