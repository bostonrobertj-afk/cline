---
name: 'step-04-web-research-for-latest-technical-specifics'
description: 'Verify current technical details for version-sensitive dependencies'
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
thisStepFile: './step-04-web-research-for-latest-technical-specifics.md'
nextStepFile: './step-05-create-comprehensive-story-file.md'
workflowFile: '{workflow_path}/workflow.md'
checklistFile: '{workflow_path}/checklist.md'
discoverInputsFile: '{workflow_path}/discover-inputs.md'
templateFile: '{workflow_path}/template.md'
---
# Step 4: Web Research for Latest Technical Specifics

## META

- current_phase: workflow::step-4
- goal: Verify version-sensitive technologies before the story file is written.
- Speak in `{communication_language}`.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
## EXECUTION
<step n="1" goal="Identify version-sensitive technologies">
  <action>Use the architecture guardrails to decide which libraries, APIs, frameworks, or tools need current verification.</action>
  <detail>Prioritize items mentioned in architecture, items with breaking-change risk, dependencies with security concerns, and tooling that affects build, test, or deployment behavior.</detail>
</step>

<step n="2" goal="Verify current technical specifics">
  <action>Research the latest stable version and any relevant changes for each identified technology.</action>
  <detail>Capture only the details the developer needs: supported versions, breaking changes, security concerns, deprecations, performance improvements, and current best practices.</detail>
</step>

<step n="3" goal="Translate research into implementation guidance">
  <action>Summarize the research as story-ready guidance that a fresh developer can apply directly.</action>
  <branch if="no version-sensitive technology is involved" optional="true">
    <action>Record that no external verification was required for this story.</action>
  </branch>
  <detail>Only the current phase detail is visible now. If a branch was intentionally skipped, mark it complete before advancing so the next phase can surface.</detail>
</step>

## CHECKPOINT
This phase can be marked complete only after the required outputs, approvals, and routing conditions are satisfied.

## ADVISORY
- Keep all user-facing text in `{communication_language}`.
- Do not research technologies that are not relevant to the current story.
- Treat the results as implementation guidance, not a general research summary.
- The next phase details stay hidden until this phase is completed.
