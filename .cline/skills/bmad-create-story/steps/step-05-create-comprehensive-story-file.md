---
name: 'step-05-create-comprehensive-story-file'
description: 'Assemble the ready-for-dev story file from gathered context'

# Path Definitions
workflow_path: '{project-root}/.cline/skills/bmad-create-story'

# File References
thisStepFile: './step-05-create-comprehensive-story-file.md'
nextStepFile: './step-06-update-sprint-status-and-finalize.md'
workflowFile: '{workflow_path}/workflow.md'
outputFile: '{implementation_artifacts}/{{story_key}}.md'

# Companion References
checklistFile: '{workflow_path}/checklist.md'
discoverInputsFile: '{workflow_path}/discover-inputs.md'
templateFile: '{workflow_path}/template.md'
---
# Step 5: Create Comprehensive Story File

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

Assemble the final story file so the developer receives the complete implementation guide.

## MANDATORY RULES

- Build the story file from the gathered context, not by copying epics verbatim.
- Preserve all critical guardrails, learnings, and current technical specifics.
- Keep responses in `{communication_language}`.

## EXECUTION

### 1. Initialize the output file

Create the story file at `{outputFile}` from `{templateFile}`.

### 2. Populate the story structure

Fill the story with the gathered context in the following areas:

- story header
- story requirements
- developer context
- technical requirements
- architecture compliance
- library and framework requirements
- file structure requirements
- testing requirements
- previous-story intelligence
- git intelligence summary
- latest technical information
- project context reference
- completion status

<detail>
Preserve the template structure, but replace placeholders with the specific guidance gathered in the earlier steps.
</detail>

### 3. Set the story to ready-for-dev

Update the story status to `ready-for-dev` and add a completion note that the comprehensive context pass is complete.

## NEXT STEP

Continue to `./step-06-update-sprint-status-and-finalize.md`.

## SUCCESS METRICS

- The story file is complete and ready for implementation.
- The status is set to `ready-for-dev`.
- The developer gets the story context in a clear, actionable format.

## FAILURE MODES

- Leaving placeholders in the final story file
- Dropping architecture or testing guardrails
- Forgetting to set the ready-for-dev status

</prose>
