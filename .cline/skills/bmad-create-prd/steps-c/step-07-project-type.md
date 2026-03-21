
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

- Goal: capture requirements that are specific to the project’s type or delivery model.
- Speak to the user in `{communication_language}`.
- Use the confirmed classification as the driver for this step.

## EXECUTION

<step n="1" goal="Load project-type guidance">
  <action>Load any project-type configuration or reference data relevant to the current classification.</action>
</step>

<step n="2" goal="Run guided project-type discovery">
  <ask>Ask the key questions needed to expose project-type-specific requirements, implementation considerations, and constraints.</ask>
</step>

<step n="3" goal="Document project-type requirements">
  <action>Capture the requirements and architectural implications that are unique to this project type.</action>
</step>

<step n="4" goal="Generate project-type content">
  <output>Create PRD-ready content covering overview, technical architecture considerations, and implementation considerations for this project type.</output>
</step>

<step n="5" goal="Review, save, and continue">
  <ask>Present the project-type content to the user for review and refinement.</ask>
  <action>Save the approved content into the PRD.</action>
  <ask>Present the continuation menu for moving to scoping.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-08-scoping.md`.</action>
</step>

## CHECKPOINT

Wait for the user to approve the project-type section before saving it.

## ADVISORY

- Keep this section grounded in the actual project type rather than generic software advice.

## REFERENCE

- Project-type content should make later architecture and planning work easier, not noisier.
</prose>
