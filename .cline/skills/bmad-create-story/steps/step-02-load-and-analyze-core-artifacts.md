---
name: 'step-02-load-and-analyze-core-artifacts'
description: 'Load planning artifacts and extract the story foundation'
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
thisStepFile: './step-02-load-and-analyze-core-artifacts.md'
nextStepFile: './step-03-architecture-analysis-for-developer-guardrails.md'
workflowFile: '{workflow_path}/workflow.md'
checklistFile: '{workflow_path}/checklist.md'
discoverInputsFile: '{workflow_path}/discover-inputs.md'
templateFile: '{workflow_path}/template.md'
---
# Step 2: Load and Analyze Core Artifacts

## META

- current_phase: workflow::step-2
- goal: Build the story foundation from planning artifacts and prior work.
- Speak in `{communication_language}`.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION
<step n="1" goal="Load the relevant source material">
  <action>Use the discovery protocol to load the story's source context.</action>
  <detail>Prefer full or selectively targeted loads for epics, GDD, architecture, UX, and project context artifacts.</detail>
</step>

<step n="2" goal="Extract the epic and story foundation">
  <action>From the epic source, capture the epic objectives, business value, all stories in the epic, the target story statement, acceptance criteria, source hints, technical constraints, and dependencies.</action>
  <detail>Focus on the story's implementation foundation rather than copying the epic verbatim.</detail>
</step>

<step n="3" goal="Extract previous-story intelligence when applicable">
  <branch if="story_num > 1" optional="true">
    <action>Find the closest previous story file in the same epic and load it completely.</action>
    <action>Extract actionable learnings that could affect the current story.</action>
    <detail>Focus on dev notes, review feedback, created or modified files, testing patterns, solved problems, and conventions established by prior work.</detail>
  </branch>
</step>

<step n="4" goal="Capture git intelligence when available">
  <branch if="a git repository is detected and prior story context exists" optional="true">
    <action>Inspect recent commits for implementation patterns relevant to the story.</action>
    <detail>Look for files changed, dependencies added or updated, architecture decisions, and testing approaches.</detail>
  </branch>
</step>

<step n="5" goal="Preserve usable context for the next phase">
  <action>Summarize the extracted story foundation so the architecture phase can start from the current context instead of rediscovering basics.</action>
  <detail>Only the current phase detail is visible now. If a branch was intentionally skipped, mark it complete before advancing so the next phase can surface.</detail>
</step>

## CHECKPOINT
This phase can be marked complete only after the required outputs, approvals, and routing conditions are satisfied.

## ADVISORY
- Keep all user-facing text in `{communication_language}`.
- Use the discovered planning context to ground the next phase in real source material.
- If prior-story or git context is unavailable, note that explicitly and continue with the artifacts that do exist.
- The next phase details stay hidden until this phase is completed.
