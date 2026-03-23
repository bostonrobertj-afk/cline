---
---

---
main_config: '{project-root}/_bmad/core/config.yaml'
agent_manifest_path: '{project-root}/_bmad/_config/agent-manifest.csv'
---

# Party Mode Workflow

## META

- Goal: Orchestrate group discussions between installed BMAD agents in a structured managed workflow.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Initialize Configuration and Party Mode State">
  <action>Load config from {main_config}.</action>
  <action>Resolve {project_name}, {output_folder}, {user_name}, {communication_language}, {document_output_language}, {user_skill_level}, and {date}.</action>
  <action>Resolve {agent_manifest_path} from the workflow configuration.</action>
  <detail>Party mode is a standalone interactive workflow that keeps the conversation in {communication_language}.</detail>
</step>

<step n="2" goal="Load the Agent Roster and Start Party Mode">
  <action>Load and parse the agent manifest CSV.</action>
  <action>Build the complete agent roster with merged personalities and communication styles.</action>
  <handoff path="./steps/step-01-agent-loading.md">Begin party mode activation with the agent-loading step.</handoff>
</step>

## CHECKPOINT

After ensuring that all task list items are complete (one-by-one, in order, using the complete_workflow_item tool),
Use the attempt_completion tool to send a final message to the user informing them that this workflow is complete, then HALT and await further instruction.