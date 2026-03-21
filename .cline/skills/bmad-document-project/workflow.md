---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---
# Document Project Workflow

Workflow ID: `bmad-document-project`

## META
- Workflow ID: `bmad-document-project`
- Managed mode: backend-owned current-phase rendering
- Branches: router, full-scan, deep-dive

## EXECUTION
<step n="1" goal="Resolve workflow configuration">
  <action>Load and resolve `project_knowledge`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date` from `{main_config}`.</action>
  <detail>Use the resolved values for every user-facing prompt, every generated artifact, and every continuation gate in this workflow family.</detail>
</step>

<step n="2" goal="Enter the current managed phase">
  <output>Continue with the current phase injected by the backend. Only the active step's detail is visible right now; the next step's detail appears after the current step is marked complete. If you skip an optional step, mark it complete so the next step can be revealed.</output>
  <detail>
    - Phase title, checklist, and active step are driven by backend-managed state.
    - Markup-like tokens such as `<step>`, `<action>`, `<ask>`, `<output>`, `<branch>`, and `<detail>` are workflow tags, not end-user content.
  </detail>
</step>

## CHECKPOINT
Workflow progress can advance only after the required outputs, approvals, and routing conditions in the active step are satisfied.

## ADVISORY
- Keep advisory guidance attached to the active step that needs it.
- Preserve user-input pauses, continuation checks, and referenced companion files.
- Do not duplicate checklist logic here; the backend owns the active phase view.
