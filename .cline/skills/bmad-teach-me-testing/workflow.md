---
name: bmad-teach-me-testing
description: 'Teach testing progressively through structured sessions. Use when the user says "lets learn testing" or "I want to study test practices"'
web_bundle: true
---

# Teach Me Testing

## META

- Goal: provide a multi-session learning path that teaches testing fundamentals through advanced practices.
- Follow the current mode and current step only.
- Keep the active prompt focused on the present phase; do not invent future checklist items.
- Speak in `{communication_language}`.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Load workflow configuration and route by mode">
  <action>Load and read `{project-root}/_bmad/tea/config.yaml` or the installed module config, then resolve `project_name`, `user_name`, `communication_language`, and `test_artifacts`.</action>
  <action>Determine whether the user wants `create`, `validate`, or `edit` based on the invocation.</action>
  <branch if="mode is unclear" optional="true">
    <ask>Ask the user which mode they want: create, validate, or edit.</ask>
  </branch>
  <branch if="mode is create" optional="true">
    <handoff path="./steps-c/step-01-init.md" />
  </branch>
  <branch if="mode is validate" optional="true">
    <ask>Which workflow should be validated?</ask>
    <handoff path="./steps-v/step-v-01-validate.md" />
  </branch>
  <branch if="mode is edit" optional="true">
    <ask>What should be edited in the teaching workflow?</ask>
    <handoff path="./steps-e/step-e-01-assess-workflow.md" />
  </branch>
</step>

## CHECKPOINT

Halt whenever mode selection, workflow selection, or other user input is required before continuing.
