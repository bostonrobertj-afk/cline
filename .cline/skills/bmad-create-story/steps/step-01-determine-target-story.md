---
name: 'step-01-determine-target-story'
description: 'Resolve the story target from user input or sprint tracking'
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
thisStepFile: './step-01-determine-target-story.md'
nextStepFile: './step-02-load-and-analyze-core-artifacts.md'
workflowFile: '{workflow_path}/workflow.md'
sprintStatusFile: '{implementation_artifacts}/sprint-status.yaml'
checklistFile: '{workflow_path}/checklist.md'
discoverInputsFile: '{workflow_path}/discover-inputs.md'
templateFile: '{workflow_path}/template.md'
---
# Step 1: Determine Target Story

## META
- current_phase: workflow::step-1
- goal: Resolve the target story before any content is created.
- Speak in `{communication_language}`.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION
<step n="1" goal="Resolve the target from explicit input first">
  <action>Check the user request for an explicit story id or story file path.</action>
  <detail>Accept `1-2-user-auth`, `1.2`, `epic 1 story 2`, or a direct story file path. If only a path is given, store `story_path` and infer `story_key` only when the filename or path is unambiguous.</detail>
</step>

<step n="2" goal="Fall back to sprint tracking when needed">
  <action>Check whether `{sprintStatusFile}` exists when no explicit target is provided.</action>
  <branch if="the sprint status file does not exist" optional="true">
    <output>No sprint status file was found and no story was specified.</output>
    <output>Provide an epic-story number, provide a story docs path, or run sprint planning first.</output>
    <ask>Choose [1] to initialize sprint tracking, provide an epic-story number, provide a story docs path, or choose [q] to quit.</ask>
    <branch if="the user chooses q" optional="true">
      <action>Halt without making changes.</action>
    </branch>
    <branch if="the user chooses 1" optional="true">
      <output>Run sprint planning first to create `sprint-status.yaml`.</output>
      <action>Halt until sprint tracking exists.</action>
    </branch>
    <branch if="the user provides an epic-story number or path" optional="true">
      <action>Parse `epic_num`, `story_num`, `story_title`, and `story_key` when available.</action>
      <action>Store the provided path as `story_path` when the user supplies story documents.</action>
      <action>Continue once the target is resolved.</action>
    </branch>
  </branch>
  <branch if="the sprint status file exists and no explicit target was provided" optional="true">
    <action>Load the full sprint-status file from start to end.</action>
    <detail>Preserve order while scanning and parse the `development_status` section completely.</detail>
    <action>Find the first backlog story key that matches the `number-number-name` pattern and is not an epic or retrospective entry.</action>
    <branch if="no backlog story is found" optional="true">
      <output>No backlog stories were found in `sprint-status.yaml`.</output>
      <output>All stories are already created, in progress, or done.</output>
      <output>Refresh sprint tracking, add more stories, or run a retrospective.</output>
      <action>Halt.</action>
    </branch>
    <action>Extract `epic_num`, `story_num`, `story_title`, and `story_key` from the found key.</action>
    <action>Set `story_id` to `{{epic_num}}.{{story_num}}`.</action>
    <action>Check whether this is the first story in epic `{{epic_num}}`.</action>
    <branch if="this is the first story in the epic" optional="true">
      <action>Load the sprint status file and inspect epic `epic-{{epic_num}}`.</action>
      <branch if="epic status is backlog or legacy contexted" optional="true">
        <action>Update the epic status to `in-progress`.</action>
        <output>Epic `{{epic_num}}` status updated to in-progress.</output>
      </branch>
      <branch if="epic status is in-progress" optional="true">
        <action>No change is needed.</action>
      </branch>
      <branch if="epic status is done" optional="true">
        <output>Cannot create a story in a completed epic.</output>
        <action>Halt.</action>
      </branch>
      <branch if="epic status is anything else" optional="true">
        <output>Invalid epic status `{{epic_status}}`.</output>
        <action>Halt.</action>
      </branch>
    </branch>
    <action>Continue after the target story is confirmed.</action>
  </branch>
</step>

<step n="3" goal="Confirm the resolved target and hand off">
  <output>Target story resolved: `{{story_id}}` / `{{story_key}}`.</output>
  <detail>Only the current phase detail is visible now. If a branch was intentionally skipped, mark it complete before advancing so the next phase can surface.</detail>
  <action>Proceed to the core artifact analysis phase.</action>
</step>

## CHECKPOINT
Do not advance until the story target is known.

## ADVISORY
- Keep all user-facing text in `{communication_language}`.
- Use config-resolved variables instead of hard-coded project assumptions.
- Optional or skipped branches should be marked complete before moving on so the next phase can appear.
- The next phase details stay hidden until this phase is completed.
