---
name: 'step-06-update-sprint-status-and-finalize'
description: 'Validate the story file, update sprint status, and report completion'
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
thisStepFile: './step-06-update-sprint-status-and-finalize.md'
workflowFile: '{workflow_path}/workflow.md'
storyFile: '{implementation_artifacts}/{{story_key}}.md'
sprintStatusFile: '{implementation_artifacts}/sprint-status.yaml'
checklistFile: '{workflow_path}/checklist.md'
discoverInputsFile: '{workflow_path}/discover-inputs.md'
templateFile: '{workflow_path}/template.md'
---
# Step 6: Update Sprint Status and Finalize

## META

- current_phase: workflow::step-6
- goal: Validate the final story file, update sprint tracking, and report completion.
- Speak in `{communication_language}`.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
## EXECUTION
<step n="1" goal="Validate the final story file">
  <action>Validate `{storyFile}` against `{checklistFile}` and fix any required issues before finalizing.</action>
  <detail>Validate before reporting completion so the final artifact is consistent with the workflow checklist.</detail>
</step>

<step n="2" goal="Save the story document">
  <action>Save the story file unconditionally after validation.</action>
  <detail>Preserve the story structure, headings, and reference sections while saving.</detail>
</step>

<step n="3" goal="Update sprint status when available">
  <branch if="the sprint status file exists" optional="true">
    <action>Load the full sprint status file and find the entry matching `{{story_key}}`.</action>
    <action>Verify the current status is `backlog` before updating it.</action>
    <action>Update the story status to `ready-for-dev`.</action>
    <action>Update the `last_updated` field to the current date.</action>
    <action>Save the file while preserving comments, structure, and status definitions.</action>
  </branch>
</step>

<step n="4" goal="Report completion">
  <output>Present the created story details and next-step guidance to the user.</output>
  <detail>Include the story id, story key, file path, final status, and the next recommended workflow steps.</detail>
</step>

## CHECKPOINT
This phase can be marked complete only after the required outputs, approvals, and routing conditions are satisfied.

## ADVISORY
- Keep all user-facing text in `{communication_language}`.
- Update sprint tracking only when it exists.
- Preserve comments and structure while saving sprint status.
- This is the final gate for the workflow, so do not advance until validation and reporting are complete.
