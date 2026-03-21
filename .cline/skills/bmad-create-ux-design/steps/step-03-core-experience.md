# Step 3: Core Experience

## META
Goal: Define the core user action and the experience that must feel effortless.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Define Core User Action">
  <ask>What's the ONE thing users will do most frequently?</ask>
  <ask>What user action is absolutely critical to get right?</ask>
  <ask>What should be completely effortless for users?</ask>
</step>

<step n="2" goal="Explore Platform Requirements">
  <ask>Web, mobile app, desktop, or multiple platforms?</ask>
  <ask>Will this be primarily touch-based or mouse/keyboard?</ask>
  <ask>Any specific platform requirements or constraints?</ask>
</step>

<step n="3" goal="Identify Effortless Interactions">
  <ask>What user actions should feel completely natural and require zero thought?</ask>
  <ask>Where do users currently struggle with similar products?</ask>
  <ask>What interaction, if made effortless, would create delight?</ask>
</step>

<step n="4" goal="Define Critical Success Moments">
  <ask>What's the moment where users realize 'this is better'?</ask>
  <ask>When does the user feel successful or accomplished?</ask>
  <ask>What interaction, if failed, would ruin the experience?</ask>
</step>

<step n="5" goal="Synthesize Experience Principles">
  <action>[Principle 1 based on core action focus]</action>
  <action>[Principle 2 based on effortless interactions]</action>
  <action>[Principle 3 based on platform considerations]</action>
  <action>[Principle 4 based on critical success moments]</action>
</step>

<step n="6" goal="Generate Core Experience Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <action>This establishes the foundation for all our UX design decisions.</action>
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated core experience content and present choices: I've defined the core user experience for based on our conversation.</output>
  <output>[A] Advanced Elicitation - Let's refine the core experience definition [P] Party Mode - Bring different perspectives on the user experience [C] Continue - Save this to the document and move to emotional response definition</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current core experience content</action>
  <action>Process the enhanced experience insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current core experience definition</action>
  <action>Process the collaborative experience improvements that come back</action>
  <action>Load ./step-04-emotional-response.md</action>
  <ask>Ask user: Accept these improvements to the core experience definition? (y/n)</ask>
  <ask>Ask user: Accept these changes to the core experience definition? (y/n)</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
