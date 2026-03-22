# workflow

## META

- Goal: create a complete architecture document through collaborative discovery and explicit architectural decisions.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Treat this workflow as guided collaboration between architectural peers, not one-shot content generation.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Load architecture-workflow context">
  <action>Resolve `project_name`, `output_folder`, `planning_artifacts`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date` from `{project-root}/_bmad/bmm/config.yaml`.</action>
  <action>Carry those resolved values forward for the step files in this workflow.</action>
</step>

<step n="2" goal="Begin the architecture workflow">
  <handoff path="./steps/step-01-init.md" />
</step>

## CHECKPOINT

Do not advance beyond the current phase until its required asks, actions, outputs, and approval gates are satisfied.

## ADVISORY

- Only the current step file should be active at a time.
- Keep architectural content collaborative, explicit, and implementation-oriented.
