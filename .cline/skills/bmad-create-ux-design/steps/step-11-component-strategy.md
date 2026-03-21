# Step 11: Component Strategy

## META
Goal: Define the component strategy and any custom UI building blocks.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Analyze Design System Coverage">
  <action>[Component need 1 from journey analysis]</action>
  <action>[Component need 2 from design requirements]</action>
  <action>[Component need 3 from core experience]</action>
  <action>[Gap 1 - needed but not available]</action>
  <action>[Gap 2 - needed but not available]</action>
</step>

<step n="2" goal="Design Custom Components">
  <action>Let's walk through each custom component systematically.</action>
  <ask>For each custom component needed, design thoroughly: For each custom component: [Component Name] Design: Purpose: What does this component do for users?</ask>
  <ask>Content: What information or data does it display?</ask>
  <ask>Actions: What can users do with this component?</ask>
</step>

<step n="3" goal="Document Component Specifications">
  <output>Create detailed specifications for each component: Component Specification Template:</output>
</step>

<step n="4" goal="Define Component Strategy">
  <action>[Foundation component 1]</action>
  <action>[Foundation component 2]</action>
  <action>[Custom component 1 with rationale]</action>
  <action>[Custom component 2 with rationale]</action>
  <action>Build custom components using design system tokens</action>
  <output>Create reusable patterns for common use cases</output>
</step>

<step n="5" goal="Plan Implementation Roadmap">
  <action>[Component 1] - needed for [critical flow]</action>
  <action>[Component 2] - needed for [critical flow]</action>
  <action>[Component 3] - enhances [user experience]</action>
  <action>[Component 4] - supports [design pattern]</action>
  <action>[Component 5] - optimizes [user journey]</action>
</step>

<step n="6" goal="Generate Component Strategy Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <action>This balances using proven design system components with custom components for your unique needs.</action>
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated component strategy content and present choices: I've defined the component strategy for .</output>
  <output>[A] Advanced Elicitation - Let's refine our component strategy [P] Party Mode - Bring technical perspectives on component design [C] Continue - Save this to the document and move to UX patterns</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current component strategy content</action>
  <action>Process the enhanced component insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current component strategy</action>
  <action>Process the collaborative component insights that come back</action>
  <action>Load ./step-12-ux-patterns.md</action>
  <ask>Ask user: Accept these improvements to the component strategy? (y/n)</ask>
  <ask>Ask user: Accept these changes to the component strategy? (y/n)</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
