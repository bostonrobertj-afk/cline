# Step 9: Design Directions

## META
Goal: Explore and select design directions that guide the visual system.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Generate Design Direction Variations">
  <action>Different layout approaches and information hierarchy</action>
  <action>Various interaction patterns and visual weights</action>
  <action>Alternative color applications from our foundation</action>
  <action>Different density and spacing approaches</action>
  <action>Various navigation and component arrangements</action>
</step>

<step n="2" goal="Create HTML Design Direction Showcase">
  <action>6-8 full-screen mockup variations</action>
  <action>Interactive states and hover effects</action>
  <action>Side-by-side comparison tools</action>
  <action>Complete UI examples with real content</action>
  <action>Responsive behavior demonstrations</action>
</step>

<step n="3" goal="Present Design Exploration Framework">
  <action>Take your time exploring - this is a crucial decision that will guide all our design work!</action>
  <ask>Guide evaluation criteria: As you explore the design directions, look for: ✅ Layout Intuitiveness - Which information hierarchy matches your priorities?</ask>
  <ask>✅ Interaction Style - Which interaction style fits your core experience?</ask>
  <ask>✅ Visual Weight - Which visual density feels right for your brand?</ask>
</step>

<step n="4" goal="Facilitate Design Direction Selection">
  <action>Pick a favorite direction as-is</action>
  <action>Combine elements from multiple directions</action>
  <action>Request modifications to any direction</action>
  <action>Use one direction as a base and iterate</action>
  <ask>Which layout feels most intuitive for your users?</ask>
  <ask>Which visual weight matches your brand personality?</ask>
  <ask>Which interaction style supports your core experience?</ask>
</step>

<step n="5" goal="Document Design Direction Decision">
  <action>Capture the chosen approach: Based on your exploration, I'm understanding your design direction preference: Chosen Direction: [Direction number or combination] Key Elements: [Specific elements you liked] Modifications Needed: [Any changes requested] Rationale: [Why this direction works for your product] This will become our design foundation moving forward.</action>
  <ask>Are we ready to lock this in, or do you want to explore variations?</ask>
</step>

<step n="6" goal="Generate Design Direction Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <action>This visual approach will guide all our detailed design work.</action>
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated design direction content and present choices: I've documented our design direction decision for .</output>
  <output>[A] Advanced Elicitation - Let's refine our design direction [P] Party Mode - Bring different perspectives on visual choices [C] Continue - Save this to the document and move to user journey flows</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current design direction content</action>
  <action>Process the enhanced design insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current design direction</action>
  <action>Process the collaborative design insights that come back</action>
  <action>Load ./step-10-user-journeys.md</action>
  <ask>Ask user: Accept these improvements to the design direction? (y/n)</ask>
  <ask>Ask user: Accept these changes to the design direction? (y/n)</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
