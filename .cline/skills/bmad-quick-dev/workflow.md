# workflow

## META

- Goal: Execute implementation tasks efficiently from either a tech-spec or direct user instructions.
- Halt whenever user input, confirmation, or workflow gating is required.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Initialize quick dev and hand off to mode detection">
  <action>Load the workflow configuration, project context, and any prerequisites needed to start implementation.</action>
  <detail>
    - Keep the workflow linear and step-file driven.
    - Persist workflow state through variables such as `{baseline_commit}`, `{execution_mode}`, and `{tech_spec_path}`.
  </detail>
  <handoff path="./steps/step-01-mode-detection.md" />
</step>
