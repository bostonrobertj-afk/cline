
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

- Goal: identify whether the product contains meaningful innovation that the PRD should capture explicitly.
- Speak to the user in `{communication_language}`.
- This step may be skipped if no real innovation needs documenting.

## EXECUTION

<step n="1" goal="Check whether innovation analysis is needed">
  <action>Review the project context and classification for signs of genuine novelty, market differentiation, or unusual implementation patterns.</action>
</step>

<step n="2" goal="Explore innovation signals">
  <ask>If innovation is present, ask how the product differs from existing approaches, what new patterns it introduces, and what risks or validation needs come with that novelty.</ask>
</step>

<step n="3" goal="Decide whether to document innovation explicitly">
  <output>State clearly whether this project has meaningful innovation that warrants a dedicated PRD section.</output>
</step>

<step n="4" goal="Generate innovation content when needed">
  <action>If innovation is present, create PRD-ready content covering innovation areas, market context, validation approach, and risk mitigation.</action>
  <action>If innovation is not present, explicitly tell the user this step can be skipped without adding filler content.</action>
</step>

<step n="5" goal="Review, save, and continue">
  <ask>Present the innovation result to the user for approval or skip confirmation.</ask>
  <action>Save the approved content if this step produced a section.</action>
  <ask>Present the continuation menu for moving to project-type requirements.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-07-project-type.md`.</action>
</step>

## CHECKPOINT

Wait for the user to confirm whether this step should produce innovation content or be treated as an intentional skip.

## ADVISORY

- Do not manufacture innovation language for ordinary products.

## REFERENCE

- Innovation analysis is only useful when it clarifies differentiation, validation needs, or delivery risk.
</prose>
