
# Step

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
## META

- Goal: define narrative user journeys that connect user needs to product requirements.
- Speak to the user in `{communication_language}`.
- Keep journeys story-like and outcome-oriented.

## EXECUTION

<step n="1" goal="Identify the user types to model">
  <action>Leverage already known user types and identify any missing user groups that need journeys.</action>
</step>

<step n="2" goal="Create narrative journeys">
  <ask>Guide the user through the main end-to-end journeys each important user type should experience.</ask>
  <action>Focus on goals, context, decision points, and friction.</action>
</step>

<step n="3" goal="Connect journeys to requirements">
  <action>Map each journey to the capabilities, flows, and requirements the product must support.</action>
</step>

<step n="4" goal="Generate journey content">
  <output>Create PRD-ready user journey content and a concise journey requirements summary.</output>
</step>

<step n="5" goal="Review, save, and continue">
  <ask>Present the journeys to the user for review and refinement.</ask>
  <action>Save the approved journey content into the PRD.</action>
  <ask>Present the continuation menu for moving to domain requirements.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-05-domain.md`.</action>
</step>

## CHECKPOINT

Wait for the user to approve the journey set before saving it.

## ADVISORY

- The journeys should be comprehensive enough to drive later functional requirements without turning into UI specs.

## REFERENCE

- Good journeys expose missing requirements early and help keep scope user-centered.
</prose>
