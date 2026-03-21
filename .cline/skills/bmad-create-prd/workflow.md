---
main_config: '{project-root}/_bmad/bmm/config.yaml'
outputFile: '{planning_artifacts}/prd.md'
---

# bmad create prd workflow

## META

- Goal: Create a complete PRD through guided discovery, validation, and polish.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction and handoff.

## EXECUTION

<step n="1" goal="Load workflow configuration">
  <action>Resolve `project_name`, `output_folder`, `planning_artifacts`, `user_name`, `communication_language`, `document_output_language`, and `user_skill_level` from `{main_config}`.</action>
  <action>Resolve `date` as the system-generated current datetime.</action>
  <output>Speak to the user in `{communication_language}` and write PRD content in `{document_output_language}`.</output>
</step>

<step n="2" goal="Begin the PRD workflow">
  <output>Load and follow `./steps-c/step-01-init.md`.</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./steps-c/step-01-init.md
- Persist workflow state updates whenever this workflow writes or updates `{outputFile}`.
- Do not load future step files until the current step directs the transition.
