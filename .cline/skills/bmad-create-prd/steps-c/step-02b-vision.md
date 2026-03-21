
# step 02b vision

## META

- Goal: Refine the product vision now that the project classification is known.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction and handoff.

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
