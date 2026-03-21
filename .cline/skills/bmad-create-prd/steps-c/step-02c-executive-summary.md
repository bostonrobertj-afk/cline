
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

- Goal: create an executive summary grounded in the confirmed discovery and vision context.
- Speak to the user in `{communication_language}`.
- Keep the summary concise and decision-useful.

## EXECUTION

<step n="1" goal="Synthesize available context">
  <action>Review the current PRD state, confirmed classification, vision, and supporting source documents.</action>
</step>

<step n="2" goal="Draft the executive summary">
  <output>Create a concise executive summary covering what the product is, who it serves, what makes it special, and why now.</output>
</step>

<step n="3" goal="Review, save, and continue">
  <ask>Present the draft to the user for review and refinement.</ask>
  <action>Save the approved executive summary into the PRD.</action>
  <ask>Present the continuation menu for moving to success criteria discovery.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-03-success.md`.</action>
</step>

## CHECKPOINT

Wait for the user to approve the executive summary before saving it.

## ADVISORY

- Keep the summary aligned with the classification and vision already confirmed.

## REFERENCE

- The executive summary is a high-level framing section, not a detailed requirements dump.
</prose>
