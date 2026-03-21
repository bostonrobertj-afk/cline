---
name: 'step-06-update-sprint-status-and-finalize'
description: 'Validate the story file, update sprint status, and report completion'

# Path Definitions
workflow_path: '{project-root}/.cline/skills/bmad-create-story'

# File References
thisStepFile: './step-06-update-sprint-status-and-finalize.md'
workflowFile: '{workflow_path}/workflow.md'
storyFile: '{implementation_artifacts}/{{story_key}}.md'
sprintStatusFile: '{implementation_artifacts}/sprint-status.yaml'

# Companion References
checklistFile: '{workflow_path}/checklist.md'
discoverInputsFile: '{workflow_path}/discover-inputs.md'
templateFile: '{workflow_path}/template.md'
---
# Step 6: Update Sprint Status and Finalize

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

Validate the final story file, update sprint tracking, and report completion.

## MANDATORY RULES

- Validate the story file before finalizing.
- Update sprint tracking only when it exists.
- Keep responses in `{communication_language}`.

## EXECUTION

### 1. Validate the final story file

Validate `{storyFile}` against `{checklistFile}` and fix any required issues before finalizing.

### 2. Save the story document

Save the story file unconditionally after validation.

### 3. Update sprint status when available

<branch if="the sprint status file exists">
  <action>Load the full sprint status file and find the entry matching `{{story_key}}`.</action>
  <action>Verify the current status is `backlog` before updating it.</action>
  <action>Update the story status to `ready-for-dev`.</action>
  <action>Update the `last_updated` field to the current date.</action>
  <action>Save the file while preserving comments, structure, and status definitions.</action>
</branch>

### 4. Report completion

Present the created story details and next-step guidance to the user.

<detail>
Include the story id, story key, file path, final status, and the next recommended workflow steps.
</detail>

## SUCCESS METRICS

- The story file passes validation.
- Sprint status is updated when available.
- The user receives a clear completion summary.

## FAILURE MODES

- Finalizing without validation
- Updating sprint tracking incorrectly
- Dropping comments or structure while saving sprint status

</prose>
