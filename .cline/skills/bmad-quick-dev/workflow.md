# workflow

## META

- Goal: Execute implementation tasks efficiently from either a tech-spec or direct user instructions.
- Halt whenever user input, confirmation, or workflow gating is required.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Initialize quick dev and hand off to mode detection">
  <action>Load the workflow configuration, project context, and any prerequisites needed to start implementation.</action>
  <detail>
    - Keep the workflow linear and step-file driven.
    - Persist workflow state through variables such as `{baseline_commit}`, `{execution_mode}`, and `{tech_spec_path}`.
  </detail>
  <handoff path="./steps/step-01-mode-detection.md" />
</step>
