---
context_file: '' # Optional context file path for project-specific guidance
---

# Brainstorming Session Workflow

## META

- Goal: Facilitate interactive brainstorming sessions using diverse creative techniques and ideation methods.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Load configuration and initialize session state">
  <action>Load config from `{project-root}/_bmad/core/config.yaml`.</action>
  <action>Resolve `{project_name}`, `{output_folder}`, `{user_name}`, `{communication_language}`, `{document_output_language}`, `{user_skill_level}`, and `{date}`.</action>
  <action>Resolve `{brainstorming_session_output_file}` as `{output_folder}/brainstorming/brainstorming-session-{{date}}-{{time}}.md`.</action>
  <detail>Use `{communication_language}` for agent communication and `{document_output_language}` for all session artifacts.</detail>
</step>

<step n="2" goal="Begin the session setup workflow">
  <handoff path="./steps/step-01-session-setup.md">Start brainstorming session setup and continuation detection.</handoff>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
