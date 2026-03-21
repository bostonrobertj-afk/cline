---
name: 'step-04-web-research-for-latest-technical-specifics'
description: 'Verify current technical details for any version-sensitive dependencies'

# Path Definitions
workflow_path: '{project-root}/.cline/skills/bmad-create-story'

# File References
thisStepFile: './step-04-web-research-for-latest-technical-specifics.md'
nextStepFile: './step-05-create-comprehensive-story-file.md'
workflowFile: '{workflow_path}/workflow.md'

# Companion References
checklistFile: '{workflow_path}/checklist.md'
discoverInputsFile: '{workflow_path}/discover-inputs.md'
templateFile: '{workflow_path}/template.md'
---
# Step 4: Web Research for Latest Technical Specifics

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

Verify any version-sensitive technologies before the story file is written.

## MANDATORY RULES

- Only research technologies that matter to the current story.
- Do not spend time on technologies that are clearly not involved.
- Keep responses in `{communication_language}`.

## EXECUTION

### 1. Identify version-sensitive technologies

Use the architecture guardrails to decide which libraries, APIs, or frameworks need current verification.

<detail>
Prioritize:
- libraries or frameworks mentioned in architecture
- APIs with breaking-change risk
- dependencies with security advisories or recent major releases
- tooling that affects build, test, or deployment behavior
</detail>

### 2. Verify current technical specifics

Research the latest stable version and any relevant changes for each identified technology.

Capture only the details the developer needs:

- supported versions
- breaking changes
- security concerns
- deprecations
- performance improvements
- current best practices

### 3. Translate research into implementation guidance

Summarize the research as story-ready guidance that a fresh developer can apply directly.

<branch if="no version-sensitive technology is involved">
  <action>Record that no external verification was required for this story.</action>
</branch>

## NEXT STEP

Continue to `./step-05-create-comprehensive-story-file.md`.

## SUCCESS METRICS

- Version-sensitive technologies are verified when relevant.
- The story receives only practical, current guidance.
- No unnecessary research noise is introduced.

## FAILURE MODES

- Researching technologies that are not relevant to the story
- Missing a breaking change or security concern
- Recording vague research that cannot help implementation

</prose>
