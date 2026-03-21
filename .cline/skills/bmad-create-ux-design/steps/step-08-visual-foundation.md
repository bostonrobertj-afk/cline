# Step 8: Visual Foundation

## META
Goal: Establish the visual foundation, including color, type, spacing, and layout direction.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Brand Guidelines Assessment">
  <action>If no, I'll generate theme options based on your project's personality and emotional goals from our earlier discussion.</action>
  <ask>Check for existing brand requirements: Do you have existing brand guidelines or a specific color palette I should follow?</ask>
  <output>(y/n) If yes, I'll extract and document your brand colors and create semantic color mappings.</output>
</step>

<step n="2" goal="Generate Color Theme Options (If no brand guidelines)">
  <action>🎨 I can generate comprehensive HTML color theme visualizers with multiple theme options, complete UI examples, and the ability to see how colors work in real interface contexts.</action>
  <action>This will help you make an informed decision about the visual direction for .</action>
  <output>Create visual exploration opportunities: If no existing brand guidelines, I'll create a color theme visualizer to help you explore options.</output>
</step>

<step n="3" goal="Define Typography System">
  <action>Choose primary and secondary typefaces</action>
  <action>Establish type scale (h1, h2, h3, body, etc.)</action>
  <action>Define line heights and spacing relationships</action>
  <action>Consider readability and accessibility</action>
  <ask>What should the overall tone feel like? (Professional, friendly, modern, classic?)</ask>
  <ask>How much text content will users read? (Headings only? Long-form content?)</ask>
  <ask>Any accessibility requirements for font sizes or contrast?</ask>
</step>

<step n="4" goal="Establish Spacing and Layout Foundation">
  <action>[Layout principle 1 based on product type]</action>
  <action>[Layout principle 2 based on user needs]</action>
  <action>[Layout principle 3 based on platform requirements]</action>
  <ask>How should the overall layout feel? (Dense and efficient? Airy and spacious?)</ask>
  <ask>What spacing unit should we use? (4px, 8px, 12px base?)</ask>
  <ask>How much white space should be between elements?</ask>
</step>

<step n="5" goal="Create Visual Foundation Strategy">
  <action>[Color strategy based on brand guidelines or generated themes]</action>
  <action>Semantic color mapping (primary, secondary, success, warning, error, etc.)</action>
  <action>Accessibility compliance (contrast ratios)</action>
  <action>[Typography strategy based on content needs and tone]</action>
  <action>Type scale and hierarchy</action>
</step>

<step n="6" goal="Generate Visual Foundation Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <action>This provides the building blocks for consistent, beautiful design.</action>
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated visual foundation content and present choices: I've established the visual design foundation for .</output>
  <output>[A] Advanced Elicitation - Let's refine our visual foundation [P] Party Mode - Bring design perspectives on visual choices [C] Continue - Save this to the document and move to design directions</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current visual foundation content</action>
  <action>Process the enhanced visual insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current visual foundation</action>
  <action>Process the collaborative visual insights that come back</action>
  <action>Load ./step-09-design-directions.md</action>
  <ask>Ask user: Accept these improvements to the visual foundation? (y/n)</ask>
  <ask>Ask user: Accept these changes to the visual foundation? (y/n)</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
