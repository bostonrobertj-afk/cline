---
name: 'bmad-sprint-planning'
description: 'Generate sprint status tracking from epics. Use when the user says "run sprint planning" or "generate sprint plan"'
config_source: '{project-root}/_bmad/bmm/config.yaml'
project_name: '{config_source}:project_name'
user_name: '{config_source}:user_name'
communication_language: '{config_source}:communication_language'
document_output_language: '{config_source}:document_output_language'
planning_artifacts: '{config_source}:planning_artifacts'
implementation_artifacts: '{config_source}:implementation_artifacts'
workflow_path: '{project-root}/.cline/skills/bmad-sprint-planning'
workflow_file: '{workflow_path}/workflow.md'
project_context: '**/project-context.md'
epics_location: '{planning_artifacts}'
epics_pattern: '*epic*.md'
story_location: '{implementation_artifacts}'
story_location_absolute: '{implementation_artifacts}'
status_file: '{implementation_artifacts}/sprint-status.yaml'
tracking_system: 'file-system'
project_key: 'NOKEY'
date: system-generated current datetime
---
# Sprint Planning Workflow

## META

- Goal: Generate sprint status tracking from epics, detect current story statuses, and build a complete `sprint-status.yaml` file.
- Speak in `{communication_language}`.
- Halt whenever user input, confirmation, or workflow gating is required.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION
<step n="1" goal="Load epic source material and map all work items">
  <action>Load `{project_context}` if it exists and is relevant.</action>
  <action>Search `{epics_location}` for files matching `{epics_pattern}`.</action>
  <branch if="no epic files are found" optional="true">
    <output>No epic files were found in `{epics_location}`.</output>
    <output>Run the epic and story planning workflow first, then re-run sprint planning.</output>
    <exit />
  </branch>
  <action>Prefer a single whole epic document when one exists; otherwise load the sharded epic index and every listed epic section.</action>
  <action>Read each epic file completely and extract every epic number, story ID, story title, and source ordering cue.</action>
  <detail>
    - Epic headers typically look like `## Epic 1: ...`
    - Story headers typically look like `### Story 1.1: ...`
    - Convert `1.1` to `1-1` and title text to kebab-case for story keys
    - Preserve the source ordering from the epic files
    - Use the project config as the source of truth for language and artifact paths
  </detail>
  <action>Build a complete inventory of all epics, stories, and retrospectives implied by the source files.</action>
</step>

<step n="2" goal="Build the sprint status map">
  <action>For each epic, create entries in this order: epic, its stories, its retrospective.</action>
  <detail>
    - Epic entry key: `epic-{num}` with default status `backlog`
    - Story entry key: `{epic}-{story}-{title}` with default status `backlog`
    - Retrospective entry key: `epic-{num}-retrospective` with default status `optional`
  </detail>
  <action>Preserve the source order exactly when laying out `development_status`.</action>
  <action>Initialize the file structure for the output YAML.</action>
</step>

<step n="3" goal="Apply status detection and preservation rules">
  <action>Check whether `{status_file}` already exists.</action>
  <action>For each story, detect whether its corresponding story file exists at `{story_location_absolute}/{story-key}.md`.</action>
  <detail>
    - If the story file exists, upgrade that story to at least `ready-for-dev`
    - If an existing `{status_file}` already contains a more advanced status, preserve it
    - Never downgrade a status
    - Treat `drafted` as legacy only if encountered in an existing file
    - Treat `contexted` as legacy epic status only if encountered in an existing file
    - Preserve existing progress instead of resetting statuses during regeneration
  </detail>
  <action>Apply the standard status flow: epic `backlog` → `in-progress` → `done`; story `backlog` → `ready-for-dev` → `in-progress` → `review` → `done`; retrospective `optional` ↔ `done`.</action>
</step>

<step n="4" goal="Write the sprint status file">
  <action>Create or update `{status_file}` with the generated metadata and `development_status` entries.</action>
  <detail>
    - Include the metadata keys required by downstream workflows: `generated`, `last_updated`, `project`, `project_key`, `tracking_system`, `story_location`
    - Keep the documentation comments and YAML fields aligned, but do not duplicate the same explanatory prose in separate sections
    - Write the full `development_status` map in the exact source order
    - Keep the generated order as epic, then story, then retrospective for each epic
  </detail>
  <action>Ensure the output is valid YAML and that metadata values are populated from config-resolved variables.</action>
</step>

<step n="5" goal="Validate and report the generated sprint tracking">
  <action>Validate that every epic, story, and retrospective from the source files appears in `{status_file}` exactly once.</action>
  <action>Validate that no extra `development_status` entries were introduced.</action>
  <action>Validate that all status values use the supported state sets.</action>
  <action>Count totals for epics, stories, in-progress epics, and done stories.</action>
  <output>Report the completed file location, totals, and any notable risks or inconsistencies in `{communication_language}`.</output>
</step>

## CHECKPOINT
After ensuring that all task list items are complete (one-by-one, in order, using the complete_workflow_item tool),
Use the attempt_completion tool to send a final message to the user informing them that this workflow is complete, then HALT and await further instruction.