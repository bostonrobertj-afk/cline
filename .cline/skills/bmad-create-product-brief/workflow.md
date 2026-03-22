# workflow

## META

- Goal: Create a comprehensive product brief through collaborative step-by-step discovery with the user as a peer.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Load configuration and begin the product-brief workflow">
  <action>Load the workflow configuration values needed for this run, including {project_name}, {output_folder}, {planning_artifacts}, {user_name}, {communication_language}, {document_output_language}, and {user_skill_level}.</action>
  <action>Use {communication_language} for agent-facing communication and {document_output_language} for artifact content.</action>
  <handoff path="./steps/step-01-init.md">Begin by initializing or resuming the product brief document.</handoff>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this workflow writes or updates a managed artifact.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
