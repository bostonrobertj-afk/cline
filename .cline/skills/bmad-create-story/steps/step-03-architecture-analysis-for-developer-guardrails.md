---
name: 'step-03-architecture-analysis-for-developer-guardrails'
description: 'Analyze architecture for story-specific guardrails and constraints'
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
thisStepFile: './step-03-architecture-analysis-for-developer-guardrails.md'
nextStepFile: './step-04-web-research-for-latest-technical-specifics.md'
workflowFile: '{workflow_path}/workflow.md'
checklistFile: '{workflow_path}/checklist.md'
discoverInputsFile: '{workflow_path}/discover-inputs.md'
templateFile: '{workflow_path}/template.md'
---
# Step 3: Architecture Analysis for Developer Guardrails

## META

- current_phase: workflow::step-3
- goal: Convert architecture context into concrete implementation guardrails.
- Speak in `{communication_language}`.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION
<step n="1" goal="Load and inspect the architecture context">
  <action>Load the architecture source for the story, whether it is a single file or a sharded document set.</action>
  <detail>Scan for technical stack and versions, code structure and naming conventions, API patterns and contracts, database schemas and relationships, security requirements, performance expectations, testing standards, deployment patterns, and integration patterns.</detail>
</step>

<step n="2" goal="Extract story-specific guardrails">
  <action>Turn the architecture into concrete implementation guardrails for the story.</action>
  <detail>Capture what must be followed exactly, where the story must fit in the existing structure, which dependencies and frameworks are allowed, and which existing patterns should be reused instead of replaced.</detail>
</step>

<step n="3" goal="Capture overrides and special cases">
  <branch if="the architecture introduces a decision that overrides a previous convention" optional="true">
    <action>Record the override clearly so the story does not point the developer toward the older pattern.</action>
  </branch>
</step>

<step n="4" goal="Keep the next phase ready">
  <action>Store the extracted guardrails so the research phase can determine which technologies need current verification.</action>
  <detail>Only the current phase detail is visible now. If a branch was intentionally skipped, mark it complete before advancing so the next phase can surface.</detail>
</step>

## CHECKPOINT
This phase can be marked complete only after the required outputs, approvals, and routing conditions are satisfied.

## ADVISORY
- Keep all user-facing text in `{communication_language}`.
- Convert architecture into story-ready guardrails instead of broad architectural commentary.
- Call out overrides to older conventions explicitly so the developer is not pointed at the wrong pattern.
- The next phase details stay hidden until this phase is completed.
