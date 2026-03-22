---
name: 'step-05-create-comprehensive-story-file'
description: 'Assemble the ready-for-dev story file from the gathered context'
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
thisStepFile: './step-05-create-comprehensive-story-file.md'
nextStepFile: './step-06-update-sprint-status-and-finalize.md'
workflowFile: '{workflow_path}/workflow.md'
outputFile: '{implementation_artifacts}/{{story_key}}.md'
checklistFile: '{workflow_path}/checklist.md'
discoverInputsFile: '{workflow_path}/discover-inputs.md'
templateFile: '{workflow_path}/template.md'
---
# Step 5: Create Comprehensive Story File

## META

- current_phase: workflow::step-5
- goal: Assemble the final story file so the developer receives the complete implementation guide.
- Speak in `{communication_language}` and write the artifact in `{document_output_language}`.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION
<step n="1" goal="Initialize the output file">
  <action>Create the story file at `{outputFile}` from `{templateFile}`.</action>
  <detail>Do not create duplicate story files. Update the existing target path only.</detail>
</step>

<step n="2" goal="Populate the story structure">
  <action>Fill the story with the gathered context in the story header, story requirements, developer context, technical requirements, architecture compliance, library and framework requirements, file structure requirements, testing requirements, previous-story intelligence, git intelligence summary, latest technical information, project context reference, and completion status sections.</action>
  <detail>Preserve the template structure, but replace placeholders with story-specific guidance gathered in the earlier phases.</detail>
</step>

<step n="3" goal="Set the story to ready-for-dev">
  <action>Update the story status to `ready-for-dev` and add a completion note that the comprehensive context pass is complete.</action>
  <detail>Template-like tokens such as `{{story_key}}`, `{{role}}`, and `Status: ready-for-dev` are output placeholders, not prose to keep intact.</detail>
</step>

## CHECKPOINT
This phase can be marked complete only after the required outputs, approvals, and routing conditions are satisfied.

## ADVISORY
- Keep all user-facing text in `{communication_language}`.
- Preserve source references so the developer can trace every major requirement back to its origin.
- Keep the story focused on implementation guidance instead of reprinting the source documents.
- The next phase details stay hidden until this phase is completed.
