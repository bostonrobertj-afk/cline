---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---

# Quick-Spec Workflow

## META

- Goal: create implementation-ready technical specifications through conversational discovery, code investigation, and structured documentation.
- Speak in the configured communication language.
- Keep the workflow on the current step only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load workflow configuration">
  <action>Load and read the full config from {main_config}.</action>
  <detail>
    Resolve {project_name}, {planning_artifacts}, {implementation_artifacts}, {user_name}, {communication_language}, {document_output_language}, {user_skill_level}, and {date}. Load any relevant project context file if present.
  </detail>
</step>

<step n="2" goal="Enter the first workflow step">
  <handoff path="./steps/step-01-understand.md" />
</step>
