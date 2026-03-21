---
name: 'step-01-determine-target-story'
description: 'Determine the target story from user input or sprint tracking'

# Path Definitions
workflow_path: '{project-root}/.cline/skills/bmad-create-story'

# File References
thisStepFile: './step-01-determine-target-story.md'
nextStepFile: './step-02-load-and-analyze-core-artifacts.md'
workflowFile: '{workflow_path}/workflow.md'
sprintStatusFile: '{implementation_artifacts}/sprint-status.yaml'

# Companion References
checklistFile: '{workflow_path}/checklist.md'
discoverInputsFile: '{workflow_path}/discover-inputs.md'
templateFile: '{workflow_path}/template.md'
---
# Step 1: Determine Target Story

## META
- managed_workflow_extraction: enabled
- phase_type: phase
- source_format: procedural

## EXECUTION
<step n="1" goal="Review Detailed Guidance">
  <action>Read the advisory, reference, and prose sections in this file completely before taking action.</action>
</step>

<step n="2" goal="Follow Phase Procedure">
  <action>Execute this file in order, preserving every approval gate, routing rule, document update instruction, and constraint described below.</action>
</step>

## CHECKPOINT
This phase can be marked complete only after the required outputs, approvals, and routing conditions in this file are satisfied.

## ADVISORY
- Treat the <prose> section as the authoritative detailed instructions for this file.
- Preserve all existing user-input pauses, continuation checks, and referenced companion files.
- Keep any document templates, frontmatter updates, and save instructions exactly as authored.

## REFERENCE
- Original authored procedure retained below for managed workflow extraction compatibility.

<prose>
## STEP GOAL

Determine which story should be created, either from explicit user input or from sprint tracking.

## MANDATORY RULES

- Never create story content before the target story is known.
- Read the full sprint-status file when auto-discovering the next backlog story.
- Ask the user when the workflow cannot confidently determine the target.
- Keep all responses in `{communication_language}`.

## EXECUTION

### 1. Accept explicit story input first

If the user provides a story identifier or path, accept formats like:

- `1-2-user-auth`
- `1.2`
- `epic 1 story 2`
- an explicit story file path

Parse the epic number, story number, and story title when possible, then continue to Step 2.
<detail>
If the user provides only a story-file path, store it as `story_path` and derive `story_key` only when the path or filename makes it clear.
</detail>

### 2. Fall back to sprint tracking

If no explicit target is provided, check whether `{sprintStatusFile}` exists.

<branch if="the sprint status file does not exist">
  <output>🚫 No sprint status file found and no story specified</output>
  <output>
    **Required Options:**
    1. Run `sprint-planning` to initialize sprint tracking
    2. Provide a specific epic-story number to create
    3. Provide a path to story documents if sprint tracking does not exist yet
  </output>
  <ask>Choose option [1], provide an epic-story number, provide a story docs path, or [q] to quit.</ask>
  <branch if="the user chooses `q`">
    <action>HALT - No work needed</action>
  </branch>
  <branch if="the user chooses `1`">
    <output>Run `sprint-planning` first to create `sprint-status.yaml`.</output>
    <action>HALT - User needs to run sprint-planning</action>
  </branch>
  <branch if="the user provides an epic-story number or path">
    <action>Parse the provided target and store `epic_num`, `story_num`, `story_title`, and `story_key` when available.</action>
    <action>Store the provided path as `story_path` when the user supplies a story docs path.</action>
    <action>Continue to Step 2.</action>
  </branch>
</branch>

<branch if="the sprint status file exists and no explicit target was provided">
  <action>Load the full sprint-status file from start to end.</action>
  <detail>
    Preserve order while scanning. Read every line and parse the `development_status` section completely.
  </detail>
  <action>Find the first story key in backlog status that matches the `number-number-name` pattern and is not an epic or retrospective entry.</action>
  <branch if="no backlog story is found">
    <output>📋 No backlog stories found in sprint-status.yaml</output>
    <output>
      All stories are already created, in progress, or done.

      **Options:**
      1. Run `sprint-planning` to refresh story tracking
      2. Load PM agent and run `correct-course` to add more stories
      3. Check whether the current sprint is complete and run a retrospective
    </output>
    <action>HALT</action>
  </branch>
  <action>Extract `epic_num`, `story_num`, `story_title`, and `story_key` from the found key.</action>
  <action>Set `story_id` to `{{epic_num}}.{{story_num}}`.</action>
  <action>Check whether this is the first story in epic `{{epic_num}}`.</action>
  <branch if="this is the first story in the epic">
    <action>Load the sprint status file and inspect epic `epic-{{epic_num}}`.</action>
    <branch if="epic status is `backlog` or legacy `contexted`">
      <action>Update the epic status to `in-progress`.</action>
      <output>📊 Epic {{epic_num}} status updated to in-progress</output>
    </branch>
    <branch if="epic status is `in-progress`">
      <action>No change is needed.</action>
    </branch>
    <branch if="epic status is `done`">
      <output>🚫 ERROR: Cannot create story in completed epic</output>
      <output>Epic {{epic_num}} is marked as `done`. All stories are complete.</output>
      <output>If more work is needed, move the epic back to `in-progress` or create a new epic.</output>
      <action>HALT - Cannot proceed</action>
    </branch>
    <branch if="epic status is anything else">
      <output>🚫 ERROR: Invalid epic status `{{epic_status}}`</output>
      <output>Expected: backlog, in-progress, contexted, or done</output>
      <action>HALT - Cannot proceed</action>
    </branch>
  </branch>
  <action>Continue to Step 2.</action>
</branch>

## NEXT STEP

Continue to `./step-02-load-and-analyze-core-artifacts.md`.

## SUCCESS METRICS

- The target story is known before any story file is created.
- Sprint tracking is handled safely when auto-discovering the next backlog item.
- Epic status is updated only when required.

## FAILURE MODES

- Skipping target resolution
- Failing to preserve sprint order when auto-discovering a backlog story
- Proceeding without a confirmed story key

</prose>
