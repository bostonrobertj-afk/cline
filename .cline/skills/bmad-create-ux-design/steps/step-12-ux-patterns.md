# Step 12: UX Patterns

## META
Goal: Establish UX consistency patterns for common interaction situations.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Identify Pattern Categories">
  <action>Button hierarchy and actions</action>
  <action>Feedback patterns (success, error, warning, info)</action>
  <action>Form patterns and validation</action>
  <action>Navigation patterns</action>
  <action>Modal and overlay patterns</action>
</step>

<step n="2" goal="Define Critical Patterns First">
  <action>Visual hierarchy (primary vs. secondary actions)</action>
  <action>Feedback mechanisms</action>
  <action>Error recovery</action>
  <action>Accessibility requirements</action>
  <action>Mobile vs. desktop considerations</action>
</step>

<step n="3" goal="Establish Pattern Guidelines">
  <action>Document specific design decisions: Pattern Guidelines Template:</action>
</step>

<step n="4" goal="Design System Integration">
  <action>[Custom rule 1]</action>
  <action>[Custom rule 2]</action>
  <action>[Custom rule 3]</action>
  <ask>How do these patterns complement our design system components?</ask>
  <ask>What customizations are needed?</ask>
  <ask>How do we maintain consistency while meeting unique needs?</ask>
</step>

<step n="5" goal="Create Pattern Documentation">
  <action>Clear usage guidelines for each pattern</action>
  <action>Visual examples and specifications</action>
  <action>Implementation notes for developers</action>
  <action>Accessibility checklists</action>
  <action>Mobile-first considerations</action>
</step>

<step n="6" goal="Generate UX Patterns Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <action>These patterns ensure users have a consistent, predictable experience across all interactions.</action>
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated UX patterns content and present choices: I've established UX consistency patterns for .</output>
  <output>[A] Advanced Elicitation - Let's refine our UX patterns [P] Party Mode - Bring different perspectives on consistency patterns [C] Continue - Save this to the document and move to responsive design</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current UX patterns content</action>
  <action>Process the enhanced pattern insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current UX patterns</action>
  <action>Process the collaborative pattern insights that come back</action>
  <action>Load ./step-13-responsive-accessibility.md</action>
  <ask>Ask user: Accept these improvements to the UX patterns? (y/n)</ask>
  <ask>Ask user: Accept these changes to the UX patterns? (y/n)</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
