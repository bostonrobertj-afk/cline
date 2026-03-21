# Step 6: Design System

## META
Goal: Choose an appropriate design system approach for the product.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Present Design System Options">
  <action>Complete visual uniqueness</action>
  <action>Full control over every component</action>
  <action>Higher initial investment</action>
  <action>Perfect for established brands with unique needs</action>
  <action>Fast development with proven patterns</action>
</step>

<step n="2" goal="Analyze Project Requirements">
  <action>Platform: [platform from step 3]</action>
  <action>Timeline: [inferred from user conversation]</action>
  <action>Team Size: [inferred from user conversation]</action>
  <action>Brand Requirements: [inferred from user conversation]</action>
  <action>Technical Constraints: [inferred from user conversation]</action>
</step>

<step n="3" goal="Explore Specific Design System Options">
  <action>[Option 1] - [Key benefit] - [Best for scenario]</action>
  <action>[Option 2] - [Key benefit] - [Best for scenario]</action>
  <action>[Option 3] - [Key benefit] - [Best for scenario]</action>
  <action>Component library size and quality</action>
  <action>Documentation and community support</action>
</step>

<step n="4" goal="Facilitate Decision Process">
  <ask>What's most important: Speed, uniqueness, or balance?</ask>
  <ask>How much design expertise does your team have?</ask>
  <ask>Are there existing brand guidelines to follow?</ask>
</step>

<step n="5" goal="Finalize Design System Choice">
  <action>[Reason 1 based on project needs]</action>
  <action>[Reason 2 based on constraints]</action>
  <action>[Reason 3 based on team considerations]</action>
  <action>We'll customize this system to match your brand and needs</action>
  <action>Define component strategy for custom components needed</action>
</step>

<step n="6" goal="Generate Design System Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <action>This foundation will ensure consistency and speed up development.</action>
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated design system content and present choices: I've documented our design system choice for .</output>
  <output>[A] Advanced Elicitation - Let's refine our design system decision [P] Party Mode - Bring technical perspectives on design systems [C] Continue - Save this to the document and move to defining experience</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current design system content</action>
  <action>Process the enhanced design system insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current design system choice</action>
  <action>Process the collaborative design system insights that come back</action>
  <action>Load ./step-07-defining-experience.md</action>
  <ask>Ask user: Accept these improvements to the design system decision? (y/n)</ask>
  <ask>Ask user: Accept these changes to the design system decision? (y/n)</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
