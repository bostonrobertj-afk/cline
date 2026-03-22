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

## EXECUTION

<step n="1" goal="Load workflow configuration and route by mode">
  <action>Load and read `{project-root}/_bmad/tea/config.yaml` or the installed module config, then resolve `project_name`, `user_name`, `communication_language`, and `test_artifacts`.</action>
  <action>Determine whether the user wants `create`, `validate`, or `edit` based on the invocation.</action>
  <branch if="mode is unclear">
    <ask>Ask the user which mode they want: create, validate, or edit.</ask>
  </branch>
  <branch if="mode is create">
    <output>Start the teaching workflow by loading and following `./steps-c/step-01-init.md`.</output>
  </branch>
  <branch if="mode is validate">
    <output>Ask which workflow should be validated, then load and follow `./steps-v/step-v-01-validate.md`.</output>
  </branch>
  <branch if="mode is edit">
    <output>Ask what should be edited in the teaching workflow, then load and follow `./steps-e/step-e-01-assess-workflow.md`.</output>
  </branch>
</step>

## CHECKPOINT

Halt whenever mode selection, workflow selection, or other user input is required before continuing.

## ADVISORY

- Only the current mode-specific step file should be loaded next.
- Keep the workflow state aligned with the active session or edit path.
