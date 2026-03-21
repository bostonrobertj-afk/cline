# Step 10: User Journeys

## META
Goal: Map the key user journeys and the flow of decisions through the product.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Load PRD User Journeys as Foundation">
  <action>[Critical journey 1 identified from PRD narratives]</action>
  <action>[Critical journey 2 identified from PRD narratives]</action>
  <action>[Critical journey 3 identified from PRD narratives]</action>
</step>

<step n="2" goal="Design Each Journey Flow">
  <ask>How do users start this journey? (entry point)</ask>
  <ask>What information do they need at each step?</ask>
  <ask>What decisions do they need to make?</ask>
</step>

<step n="3" goal="Create Flow Diagrams">
  <action>Entry points and triggers</action>
  <action>Decision points and branches</action>
  <action>Success and failure paths</action>
  <action>Error recovery mechanisms</action>
  <action>Progressive disclosure of information</action>
</step>

<step n="4" goal="Optimize for Efficiency and Delight">
  <action>Minimizing steps to value (getting users to success quickly)</action>
  <action>Reducing cognitive load at each decision point</action>
  <action>Providing clear feedback and progress indicators</action>
  <action>Creating moments of delight or accomplishment</action>
  <action>Handling edge cases and error recovery gracefully</action>
</step>

<step n="5" goal="Document Journey Patterns">
  <action>[Navigation pattern 1]</action>
  <action>[Navigation pattern 2]</action>
  <action>[Decision pattern 1]</action>
  <action>[Decision pattern 2]</action>
  <action>[Feedback pattern 1]</action>
</step>

<step n="6" goal="Generate User Journey Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <action>These flows will guide the detailed design of each user interaction.</action>
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated user journey content and present choices: I've designed detailed user journey flows for .</output>
  <output>[A] Advanced Elicitation - Let's refine our user journey designs [P] Party Mode - Bring different perspectives on user flows [C] Continue - Save this to the document and move to component strategy</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current user journey content</action>
  <action>Process the enhanced journey insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current user journeys</action>
  <action>Process the collaborative journey insights that come back</action>
  <action>Load ./step-11-component-strategy.md</action>
  <ask>Ask user: Accept these improvements to the user journeys? (y/n)</ask>
  <ask>Ask user: Accept these changes to the user journeys? (y/n)</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
