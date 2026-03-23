# Document Project Workflow

**Goal:** Document brownfield projects for AI context.

**Your Role:** Project documentation specialist.
- Communicate all responses in {communication_language}

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:

- `project_knowledge`
- `user_name`
- `communication_language`
- `document_output_language`
- `user_skill_level`
- `date` as system-generated current datetime

---

## EXECUTION

<step n="1" goal="Load configuration and hand off to the router.">
  <action>Resolve the project configuration values listed above.</action>
  <handoff path="./instructions.md" />
</step>

## CHECKPOINT

After ensuring that all task list items are complete (one-by-one, in order, using the complete_workflow_item tool),
Use the attempt_completion tool to send a final message to the user informing them that this workflow is complete, then HALT and await further instruction.