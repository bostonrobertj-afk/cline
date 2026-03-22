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

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
