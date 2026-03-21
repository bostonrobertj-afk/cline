# Step 4: Emotional Response

## META
Goal: Define the emotional response the UX should create and avoid.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Explore Core Emotional Goals">
  <ask>What should users FEEL when using this product?</ask>
  <ask>What emotion would make them tell a friend about this?</ask>
  <ask>How should users feel after accomplishing their primary goal?</ask>
</step>

<step n="2" goal="Identify Emotional Journey Mapping">
  <ask>How should users feel when they first discover the product?</ask>
  <ask>What emotion during the core experience/action?</ask>
  <ask>How should they feel after completing their task?</ask>
</step>

<step n="3" goal="Define Micro-Emotions">
  <action>Confidence vs. Confusion</action>
  <action>Trust vs. Skepticism</action>
  <action>Excitement vs. Anxiety</action>
  <action>Accomplishment vs. Frustration</action>
  <action>Delight vs. Satisfaction</action>
</step>

<step n="4" goal="Connect Emotions to UX Decisions">
  <action>[Emotion 1] → [UX design approach]</action>
  <action>[Emotion 2] → [UX design approach]</action>
  <action>[Emotion 3] → [UX design approach]</action>
  <ask>If we want users to feel [emotional state], what UX choices support this?</ask>
  <ask>What interactions might create negative emotions we want to avoid?</ask>
  <ask>Where can we add moments of delight or surprise?</ask>
</step>

<step n="5" goal="Validate Emotional Goals">
  <ask>Check if emotional goals align with product vision: Let me make sure I understand the emotional vision for : Primary Emotional Goal: [Summarize main emotional response] Secondary Feelings: [List supporting emotional states] Emotions to Avoid: [List negative emotions to prevent] Does this capture the emotional experience you want to create?</ask>
  <ask>Any adjustments needed?</ask>
</step>

<step n="6" goal="Generate Emotional Response Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated emotional response content and present choices: I've defined the desired emotional responses for .</output>
  <output>These emotional goals will guide our design decisions to create the right user experience.</output>
  <output>[A] Advanced Elicitation - Let's refine the emotional response definition [P] Party Mode - Bring different perspectives on user emotional needs [C] Continue - Save this to the document and move to inspiration analysis</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current emotional response content</action>
  <action>Process the enhanced emotional insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current emotional response definition</action>
  <action>Process the collaborative emotional insights that come back</action>
  <action>Load ./step-05-inspiration.md</action>
  <ask>Ask user: Accept these improvements to the emotional response definition? (y/n)</ask>
  <ask>Ask user: Accept these changes to the emotional response definition? (y/n)</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
