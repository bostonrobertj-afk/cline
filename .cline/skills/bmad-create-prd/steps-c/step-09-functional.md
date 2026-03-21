
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

- Goal: synthesize functional requirements by capability area.
- Speak to the user in `{communication_language}`.
- Requirements should be complete, organized, and implementation-useful.

## EXECUTION

<step n="1" goal="Understand the purpose of the FR section">
  <action>Frame the functional requirements section as the capability contract for design, architecture, and development.</action>
</step>

<step n="2" goal="Extract capabilities from the PRD">
  <action>Review the current PRD and extract the major capability areas implied by the vision, journeys, and scope.</action>
</step>

<step n="3" goal="Organize requirements by capability">
  <action>Group functional requirements under coherent capability areas instead of generating one undifferentiated list.</action>
</step>

<step n="4" goal="Generate comprehensive functional requirements">
  <output>Create a complete functional requirements section organized by capability area.</output>
</step>

<step n="5" goal="Self-validate the requirement set">
  <action>Check that requirements are clear, non-duplicative, and sufficiently complete to support downstream work.</action>
</step>

<step n="6" goal="Review, save, and continue">
  <ask>Present the functional requirements to the user for review and correction.</ask>
  <action>Save the approved requirement set into the PRD.</action>
  <ask>Present the continuation menu for moving to non-functional requirements.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-10-nonfunctional.md`.</action>
</step>

## CHECKPOINT

Wait for the user to approve the functional requirements before saving them.

## ADVISORY

- Favor concrete behavior and capability language over implementation detail.

## REFERENCE

- The FR section is the core capability contract for the product.
</prose>
