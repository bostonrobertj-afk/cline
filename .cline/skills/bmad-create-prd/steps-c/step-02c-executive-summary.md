# Step 2c: Executive Summary

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
