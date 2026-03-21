# Step 13: Responsive Accessibility

## META
Goal: Define responsive behavior and accessibility requirements for the product.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Define Responsive Strategy">
  <ask>How should we use extra screen real estate?</ask>
  <ask>Multi-column layouts, side navigation, or content density?</ask>
  <ask>What desktop-specific features can we include?</ask>
</step>

<step n="2" goal="Establish Breakpoint Strategy">
  <action>Mobile: 320px - 767px</action>
  <action>Tablet: 768px - 1023px</action>
  <action>Desktop: 1024px+</action>
  <ask>Use standard breakpoints or custom ones?</ask>
  <ask>Focus on mobile-first or desktop-first design?</ask>
  <ask>Have specific breakpoints for your key use cases?</ask>
</step>

<step n="3" goal="Design Accessibility Strategy">
  <action>Level A (Basic) - Essential accessibility for legal compliance</action>
  <action>Level AA (Recommended) - Industry standard for good UX</action>
  <action>Level AAA (Highest) - Exceptional accessibility (rarely needed)</action>
  <action>[Recommendation based on user base, legal requirements, etc.]</action>
  <action>Color contrast ratios (4.5:1 for normal text)</action>
</step>

<step n="4" goal="Define Testing Strategy">
  <action>Device testing on actual phones/tablets</action>
  <action>Browser testing across Chrome, Firefox, Safari, Edge</action>
  <action>Real device network performance testing</action>
  <action>Automated accessibility testing tools</action>
  <action>Screen reader testing (VoiceOver, NVDA, JAWS)</action>
</step>

<step n="5" goal="Document Implementation Guidelines">
  <action>Use relative units (rem, %, vw, vh) over fixed pixels</action>
  <action>Implement mobile-first media queries</action>
  <action>Test touch targets and gesture areas</action>
  <action>Optimize images and assets for different devices</action>
  <action>Semantic HTML structure</action>
</step>

<step n="6" goal="Generate Responsive &amp; Accessibility Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <action>This ensures your product works beautifully across all devices and is accessible to all users.</action>
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated responsive and accessibility content and present choices: I've defined the responsive design and accessibility strategy for .</output>
  <output>[A] Advanced Elicitation - Let's refine our responsive/accessibility strategy [P] Party Mode - Bring different perspectives on inclusive design [C] Continue - Save this to the document and complete the workflow</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current responsive/accessibility content</action>
  <action>Process the enhanced insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current responsive/accessibility strategy</action>
  <action>Process the collaborative insights that come back</action>
  <action>Load ./step-14-complete.md</action>
  <ask>Ask user: Accept these improvements to the responsive/accessibility strategy? (y/n)</ask>
  <ask>Ask user: Accept these changes to the responsive/accessibility strategy? (y/n)</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
