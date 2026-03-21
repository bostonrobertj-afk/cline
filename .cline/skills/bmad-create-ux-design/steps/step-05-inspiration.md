# Step 5: Inspiration

## META
Goal: Analyze inspiring products and extract useful UX patterns and principles.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Identify User's Favorite Apps">
  <action>Name 2-3 apps your target users already love and USE frequently</action>
  <ask>For each one, what do they do well from a UX perspective?</ask>
  <ask>What makes the experience compelling or delightful?</ask>
  <ask>What keeps users coming back to these apps?</ask>
</step>

<step n="2" goal="Analyze UX Patterns and Principles">
  <ask>What core problem does it solve elegantly?</ask>
  <ask>What makes the onboarding experience effective?</ask>
  <ask>How do they handle navigation and information hierarchy?</ask>
</step>

<step n="3" goal="Extract Transferable Patterns">
  <action>[Pattern 1] - could work for your [specific use case]</action>
  <action>[Pattern 2] - might solve your [specific challenge]</action>
  <action>[Pattern 1] - excellent for [your user goal]</action>
  <action>[Pattern 2] - addresses [your user pain point]</action>
  <action>[Pattern 1] - supports your [emotional goal]</action>
</step>

<step n="4" goal="Identify Anti-Patterns to Avoid">
  <action>[Anti-pattern 1] - users find this confusing/frustrating</action>
  <action>[Anti-pattern 3] - doesn't align with your [emotional goals]</action>
  <output>[Anti-pattern 2] - this creates unnecessary friction</output>
</step>

<step n="5" goal="Define Design Inspiration Strategy">
  <action>[Specific pattern] - because it supports [your core experience]</action>
  <action>[Specific pattern] - because it aligns with [user needs]</action>
  <action>[Specific pattern] - modify for [your unique requirements]</action>
  <action>[Specific pattern] - simplify for [your user skill level]</action>
  <action>[Specific anti-pattern] - conflicts with [your goals]</action>
</step>

<step n="6" goal="Generate Inspiration Analysis Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <action>This gives us a solid foundation of proven patterns to build upon.</action>
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated inspiration analysis content and present choices: I've analyzed inspiring UX patterns and products to inform our design strategy for .</output>
  <output>[A] Advanced Elicitation - Let's deepen our UX pattern analysis [P] Party Mode - Bring different perspectives on inspiration sources [C] Continue - Save this to the document and move to design system choice</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current inspiration analysis content</action>
  <action>Process the enhanced pattern insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current inspiration analysis</action>
  <action>Process the collaborative pattern insights that come back</action>
  <ask>Ask user: Accept these improvements to the inspiration analysis? (y/n)</ask>
  <ask>Ask user: Accept these changes to the inspiration analysis? (y/n)</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-06-design-system.md
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
