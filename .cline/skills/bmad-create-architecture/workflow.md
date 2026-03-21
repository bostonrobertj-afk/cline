# Architecture Workflow

Workflow ID: `bmad-create-architecture`

## EXECUTION
<step n="1" goal="Resolve workflow configuration">
  <action>Load `project_name`, `output_folder`, `planning_artifacts`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date` from `{project-root}/_bmad/bmm/config.yaml`.</action>
  <detail>Use these resolved values consistently for user-facing output and document updates throughout the workflow.</detail>
</step>

<step n="2" goal="Start architecture initialization">
  <output>Load `./steps/step-01-init.md` to detect continuation state or create a fresh architecture document.</output>
</step>

## CHECKPOINT
Workflow progress advances only after the required outputs, approvals, and routing conditions in the active step are satisfied.

## ADVISORY
- Next handoff: `./steps/step-01-init.md`
- Keep `stepsCompleted` accurate whenever this workflow writes to `{planning_artifacts}/architecture.md`.
- Preserve user pauses, confirmation gates, and continuation routing.
