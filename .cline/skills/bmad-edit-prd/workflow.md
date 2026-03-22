---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---

# workflow

## META

- Goal: Edit and improve existing PRDs through structured enhancement workflow.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Configuration Loading">
  <action>Resolve {project_name}, {output_folder}, {planning_artifacts}, and {user_name}.</action>
  <action>Resolve {communication_language}, {document_output_language}, and {user_skill_level}.</action>
  <action>Resolve {date} as the system-generated current datetime.</action>
  <output>✅ YOU MUST ALWAYS WRITE all artifact and document content in {document_output_language}.</output>
</step>

<step n="2" goal="Route to Edit Workflow">
  <ask>Which PRD would you like to edit? Please provide the path to the PRD.md file.</ask>
  <handoff path="./steps-e/step-e-01-discovery.md">Begin PRD discovery after the path is provided.</handoff>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
- Do not load future step files until the current phase is complete and the workflow directs the transition.
