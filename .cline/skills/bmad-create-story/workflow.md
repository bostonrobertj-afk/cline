---
config_source: '{project-root}/_bmad/gds/config.yaml'
project_name: '{config_source}:project_name'
user_name: '{config_source}:user_name'
communication_language: '{config_source}:communication_language'
document_output_language: '{config_source}:document_output_language'
game_dev_experience: '{config_source}:game_dev_experience'
planning_artifacts: '{config_source}:planning_artifacts'
implementation_artifacts: '{config_source}:implementation_artifacts'
project_knowledge: '{config_source}:project_knowledge'
date: system-generated current datetime
workflow_path: '{project-root}/.cline/skills/bmad-create-story'
step_dir: '{workflow_path}/steps'
checklist_file: '{workflow_path}/checklist.md'
discover_inputs_file: '{workflow_path}/discover-inputs.md'
template_file: '{workflow_path}/template.md'
---
# bmad-create-story Workflow

## META
- goal: Create a ready-for-dev story file with complete implementation context.
- Speak in `{communication_language}` and write artifacts in `{document_output_language}`.
- Use `{user_name}` and `{game_dev_experience}` from config to tune tone and depth.
- Only the active phase should be rendered in detail; later phases stay hidden until the current phase is completed.
- If an optional branch is intentionally skipped, mark it complete before advancing so the next phase can be revealed.
- Treat template-like tokens such as `{{story_key}}`, `{{epic_num}}`, and `Status: ready-for-dev` as output placeholders, not instructions to the model.

## EXECUTION
<step n="1" goal="Determine the target story">
  <action>Resolve the target story from explicit user input or sprint tracking.</action>
  <detail>Accept identifiers such as `1-2-user-auth`, `1.2`, `epic 1 story 2`, or a direct story file path.</detail>
</step>

<step n="2" goal="Load and analyze the core artifacts">
  <action>Load the planning artifacts that establish the story foundation.</action>
  <detail>Use the discovery protocol to pull in epic, GDD, UX, architecture, project context, and prior-story material when available.</detail>
</step>

<step n="3" goal="Extract architecture guardrails">
  <action>Analyze the architecture context for implementation constraints and overrides.</action>
  <detail>Translate stack, structure, testing, security, and dependency requirements into concrete story guardrails.</detail>
</step>

<step n="4" goal="Verify version-sensitive technical details">
  <action>Research current details only for technologies that materially affect the story.</action>
  <detail>Skip unrelated technologies and capture only practical updates, breaking changes, or security concerns.</detail>
</step>

<step n="5" goal="Assemble the ready-for-dev story file">
  <action>Build the story file from the gathered context and template.</action>
  <detail>Replace placeholders with story-specific guidance, preserve source references, and keep the output aligned with `{document_output_language}`.</detail>
</step>

<step n="6" goal="Validate, save, and finalize">
  <action>Validate the story file, save it, update sprint status when available, and report completion.</action>
  <detail>Keep sprint-status edits minimal and preserve existing structure and comments.</detail>
</step>

## CHECKPOINT
Workflow progress advances only after the required outputs, approvals, and routing conditions are satisfied.

## ADVISORY
- The current phase should expose only its own details; the next phase becomes available after completion.
- Optional or intentionally skipped branches should be marked complete before moving on.
- The rendered step text is execution guidance, and template literals are output placeholders rather than prose to quote back.
