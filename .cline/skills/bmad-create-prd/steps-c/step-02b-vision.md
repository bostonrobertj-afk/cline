## META

- Goal: Refine the product vision now that the project classification is known.
- Speak to the user in `{communication_language}`.
- Stay focused on what makes the product meaningful and distinct.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Re-anchor the session in the confirmed discovery context">
  <action>Summarize the confirmed project classification and the context already gathered.</action>
  <action>Use that context to frame the vision discussion.</action>
</step>

<step n="2" goal="Explore what makes the product special">
  <ask>Ask what differentiates this product, why it matters, and what experience or value it should deliver better than alternatives.</ask>
  <detail>The vision should stay strategic and product-level rather than turning into a feature-by-feature list.</detail>
</step>

<step n="3" goal="Capture, validate, and persist the vision">
  <output>Draft a concise vision summary that reflects the user's goals, audience, and differentiators.</output>
  <ask>Ask the user to validate or refine the draft before it is saved.</ask>
  <branch if="the user confirms the vision" optional="true">
    <action>Save the confirmed vision material to the PRD or frontmatter as appropriate.</action>
    <handoff path="./step-02c-executive-summary.md">Proceed to executive summary generation.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for the user to confirm the vision summary before saving it.

## ADVISORY

- The vision should stay product-level and strategic, not become a feature list.
