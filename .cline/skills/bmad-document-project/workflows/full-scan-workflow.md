# Full Project Scan Workflow

Workflow ID: `bmad-document-project`

## EXECUTION
<step n="1" goal="Resolve scan workflow configuration">
  <action>Load and resolve `project_knowledge`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date` from `{project-root}/_bmad/bmm/config.yaml`.</action>
  <detail>Use the resolved values for the scan prompts and every generated document in this workflow branch.</detail>
</step>

<step n="2" goal="Enter the full-scan instruction set">
  <output>Load `./full-scan-instructions.md` as the active phase. Only the current step's detail is visible now; the next step's detail appears after the current step is completed. Mark skipped optional steps complete so the backend can reveal the next step.</output>
  <detail>
    - This workflow branch covers `initial_scan` and `full_rescan`.
    - Markup-like tokens such as `<step>`, `<action>`, `<ask>`, `<output>`, and `<detail>` are workflow tags, not user-facing prose.
  </detail>
</step>

## CHECKPOINT
Workflow progress advances only after the required outputs, approvals, and routing conditions in the active phase are satisfied.

## ADVISORY
- Keep advisory guidance attached to the active step inside `full-scan-instructions.md`.
- Preserve backend-owned state file updates and archive behavior.
