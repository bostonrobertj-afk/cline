---
name: 'step-03-architecture-analysis-for-developer-guardrails'
description: 'Analyze architecture for story-specific guardrails and constraints'

# Path Definitions
workflow_path: '{project-root}/.cline/skills/bmad-create-story'

# File References
thisStepFile: './step-03-architecture-analysis-for-developer-guardrails.md'
nextStepFile: './step-04-web-research-for-latest-technical-specifics.md'
workflowFile: '{workflow_path}/workflow.md'

# Companion References
checklistFile: '{workflow_path}/checklist.md'
discoverInputsFile: '{workflow_path}/discover-inputs.md'
templateFile: '{workflow_path}/template.md'
---
# Step 3: Architecture Analysis for Developer Guardrails

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

Extract architecture constraints that the developer must follow and turn them into story guardrails.

## MANDATORY RULES

- Keep the analysis focused on implementation-relevant architecture only.
- Record any architectural decisions that override older patterns.
- Keep responses in `{communication_language}`.

## EXECUTION

### 1. Load and inspect the architecture context

Load the architecture source for the story, whether it is a single file or a sharded document set.

<detail>
Scan for:
- technical stack and versions
- code structure and naming conventions
- API patterns and contracts
- database schemas and relationships
- security requirements
- performance expectations
- testing standards
- deployment and environment patterns
- integration patterns and external services
</detail>

### 2. Extract story-specific guardrails

Turn the architecture into concrete implementation guardrails for the story:

- what must be followed exactly
- where the story must fit into the existing structure
- which dependencies, libraries, or frameworks are allowed
- which existing patterns should be reused instead of replaced

### 3. Capture overrides and special cases

<branch if="the architecture introduces a decision that overrides a previous convention">
  <action>Record the override clearly so the development story does not point the agent toward the older pattern.</action>
</branch>

### 4. Keep the next phase ready

Store the extracted guardrails so the upcoming research step can determine which technologies need latest-version verification.

## NEXT STEP

Continue to `./step-04-web-research-for-latest-technical-specifics.md`.

## SUCCESS METRICS

- Architecture constraints are translated into story guardrails.
- Overrides to prior patterns are called out explicitly.
- The next step has enough context to decide what needs web research.

## FAILURE MODES

- Missing a version-sensitive library or framework constraint
- Missing a structure or deployment rule that would change implementation
- Failing to call out an architectural override

</prose>
