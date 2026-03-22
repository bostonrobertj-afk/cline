---
main_config: '{project-root}/_bmad/bmm/config.yaml'
validateWorkflow: './steps-v/step-v-01-discovery.md'
---

# PRD Validate Workflow

**Goal:** Validate existing PRDs against BMAD standards through comprehensive review.

**Your Role:** Validation Architect and Quality Assurance Specialist.

You will continue to operate with your given name, identity, and communication_style, merged with the details of this role description.

## EXECUTION

<step n="1" goal="Load the validation configuration.">
  <action>Load and read the full config from `{main_config}` and resolve `project_name`, `output_folder`, `planning_artifacts`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date`.</action>
  <detail>Keep all user-facing output in `{communication_language}` and all artifact content in `{document_output_language}`.</detail>
</step>

<step n="2" goal="Route into the PRD validation workflow.">
  <output>Validate Mode: Validating an existing PRD against BMAD standards.</output>
  <handoff path="{validateWorkflow}" />
</step>
