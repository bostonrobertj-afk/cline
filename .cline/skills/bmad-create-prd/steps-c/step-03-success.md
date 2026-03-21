
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

- Goal: define user, business, technical, and scope success criteria for the PRD.
- Speak to the user in `{communication_language}`.
- Push for clear, measurable outcomes where possible.

## EXECUTION

<step n="1" goal="Begin the success conversation">
  <ask>Ask how the user will know the product is successful for real users, the business, and the delivery team.</ask>
</step>

<step n="2" goal="Define user success">
  <action>Explore the user outcomes, adoption signals, and qualitative or quantitative evidence of user success.</action>
</step>

<step n="3" goal="Define business and technical success">
  <action>Capture business outcomes, operational goals, and technical outcomes that matter for this product.</action>
  <action>Challenge vague metrics and convert them into sharper measures when possible.</action>
</step>

<step n="4" goal="Negotiate realistic product scope">
  <action>Use the validated vision to separate MVP, growth, and longer-term scope.</action>
</step>

<step n="5" goal="Generate success criteria content">
  <output>Create PRD-ready success criteria content covering user success, business success, technical success, measurable outcomes, and scope framing.</output>
</step>

<step n="6" goal="Review, save, and continue">
  <ask>Present the success criteria to the user for approval or revision.</ask>
  <action>Save the approved content into the PRD.</action>
  <ask>Present the continuation menu for moving to user journeys.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-04-journeys.md`.</action>
</step>

## CHECKPOINT

Wait for the user to approve the success criteria before saving them.

## ADVISORY

- Measurable outcomes are better than aspirational language.
- Scope framing should stay aligned with the MVP discipline of the project.

## REFERENCE

- This step should leave the PRD with explicit success and scope anchors for later requirement synthesis.
</prose>
