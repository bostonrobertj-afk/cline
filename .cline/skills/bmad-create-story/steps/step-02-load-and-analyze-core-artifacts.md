---
name: 'step-02-load-and-analyze-core-artifacts'
description: 'Load planning artifacts and extract story foundation context'

# Path Definitions
workflow_path: '{project-root}/.cline/skills/bmad-create-story'

# File References
thisStepFile: './step-02-load-and-analyze-core-artifacts.md'
nextStepFile: './step-03-architecture-analysis-for-developer-guardrails.md'
workflowFile: '{workflow_path}/workflow.md'

# Companion References
checklistFile: '{workflow_path}/checklist.md'
discoverInputsFile: '{workflow_path}/discover-inputs.md'
templateFile: '{workflow_path}/template.md'
---
# Step 2: Load and Analyze Core Artifacts

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

Load the available planning context and extract the story foundation from the source documents.

## MANDATORY RULES

- Analyze all relevant artifacts thoroughly.
- Do not skip the previous-story context when a prior story exists.
- Keep responses in `{communication_language}`.

## EXECUTION

### 1. Load all relevant source material

Use the workflow input-discovery protocol to load the story's source context.

<detail>
Prefer full or selectively targeted loads for:
- epics
- GDD
- architecture
- UX
- project context
</detail>

### 2. Extract the epic and story foundation

From the epic source, capture:

- epic objectives and business value
- all stories in the epic for cross-story context
- the selected story's user story statement
- acceptance criteria and source hints
- technical requirements and constraints
- dependencies on other stories or epics

### 3. Extract previous-story intelligence when applicable

<branch if="story_num > 1">
  <action>Find the closest previous story file in the same epic and load it completely.</action>
  <action>Extract actionable learnings that could affect the current story.</action>
  <detail>
    Focus on dev notes, review feedback, created or modified files, testing patterns, solved problems, and conventions established by prior work.
  </detail>
</branch>

### 4. Capture git intelligence when available

<branch if="a git repository is detected and prior story context exists">
  <action>Inspect the most recent commits for implementation patterns relevant to the story.</action>
  <detail>
    Look for files changed, dependencies added or updated, architecture decisions, and testing approaches.
  </detail>
</branch>

### 5. Preserve usable context for the next phase

Summarize the extracted story foundation in working context so the next step can perform the architecture deep dive without re-discovering the basic requirements.

## NEXT STEP

Continue to `./step-03-architecture-analysis-for-developer-guardrails.md`.

## SUCCESS METRICS

- All relevant planning artifacts are loaded.
- Epic and story foundation are captured clearly.
- Prior-story and git learnings are preserved when available.

## FAILURE MODES

- Skipping context that could prevent implementation mistakes
- Ignoring previous-story learnings
- Failing to preserve the story foundation for the next step

</prose>
