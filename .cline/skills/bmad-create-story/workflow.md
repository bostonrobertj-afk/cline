---
main_config: '{project-root}/_bmad/gds/config.yaml'
workflow_path: '{project-root}/.cline/skills/bmad-create-story'
checklist_file: '{workflow_path}/checklist.md'
discover_inputs_file: '{workflow_path}/discover-inputs.md'
template_file: '{workflow_path}/template.md'
---
# workflow

## META

- managed_workflow_extraction: enabled
- phase_type: workflow
- source_format: procedural
- Goal: Create a comprehensive story file that gives the dev agent everything needed for flawless implementation.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the step files for the active phase and keep companion files aligned with them.

## EXECUTION

<step n="1" goal="Load the shared create-story configuration and begin story selection">
  <action>
    Load and resolve the shared configuration from `{main_config}`.
    <detail>
      Resolve `project_name`, `user_name`, `communication_language`, `document_output_language`, `game_dev_experience`, `planning_artifacts`, `implementation_artifacts`, and `date`.
    </detail>
  </action>
  <output>Continue with `./steps/step-01-determine-target-story.md`.</output>
</step>

## CHECKPOINT

Continue only after the active step completes its required work and any required user confirmation.

## ADVISORY

- This workflow is executed through the step files in `./steps/`.
- Keep the companion files aligned with the step files so prompt injection stays self-contained.
