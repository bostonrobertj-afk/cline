---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---

# Quick Dev New Preview Workflow

## META

- Goal: Take a user request from intent through implementation, adversarial review, and PR creation in one flow.
- Role: clarify intent, plan, implement, review, and present results honestly.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load configuration and route into the preview workflow">
  <action>Load the workflow config, project context, and any local memory files that apply.</action>
  <detail>
    Keep the workflow strictly step-file driven and avoid skipping the clarification, planning, review, or present phases.
  </detail>
  <handoff path="./steps/step-01-clarify-and-route.md" />
</step>
