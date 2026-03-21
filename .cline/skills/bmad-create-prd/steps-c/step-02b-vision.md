
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

- Goal: refine the product vision now that the project classification is known.
- Speak to the user in `{communication_language}`.
- Stay focused on what makes the product meaningful and distinct.

## EXECUTION

<step n="1" goal="Acknowledge the established context">
  <action>Summarize the confirmed project classification and the context already gathered.</action>
  <action>Use that context to frame the vision discussion.</action>
</step>

<step n="2" goal="Explore what makes the product special">
  <ask>Ask what differentiates this product, why it matters, and what experience or value it should deliver better than alternatives.</ask>
</step>

<step n="3" goal="Capture and validate the vision">
  <output>Draft a concise vision summary that reflects the user’s goals, audience, and differentiators.</output>
  <ask>Ask the user to validate or refine the draft before it is saved.</ask>
</step>

<step n="4" goal="Persist the vision and continue">
  <action>Save the confirmed vision material to the PRD document or frontmatter as appropriate.</action>
  <ask>Present the continuation menu for moving to executive summary generation.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-02c-executive-summary.md`.</action>
</step>

## CHECKPOINT

Wait for the user to confirm the vision summary before saving it.

## ADVISORY

- The vision should stay product-level and strategic, not become a feature list.

## REFERENCE

- Later success, scope, and journey work should trace back to the validated vision.
</prose>
