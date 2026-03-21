# Step 7: Defining Experience

## META
Goal: Define the experience mechanics that make the product distinctive.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Identify the Defining Experience">
  <action>Tinder: Swipe to match with people</action>
  <action>Snapchat: Share photos that disappear</action>
  <action>Instagram: Share perfect moments with filters</action>
  <action>Spotify: Discover and play any song instantly</action>
</step>

<step n="2" goal="Explore the User's Mental Model">
  <ask>How do users currently solve this problem?</ask>
  <ask>What mental model do they bring to this task?</ask>
  <ask>What's their expectation for how this should work?</ask>
</step>

<step n="3" goal="Define Success Criteria for Core Experience">
  <action>[Success indicator 1]</action>
  <action>[Success indicator 2]</action>
  <action>[Success indicator 3]</action>
  <ask>What makes users say 'this just works'?</ask>
  <ask>When do they feel smart or accomplished?</ask>
  <ask>What feedback tells them they're doing it right?</ask>
</step>

<step n="4" goal="Identify Novel vs. Established Patterns">
  <ask>Use established UX patterns that users already understand?</ask>
  <ask>Require novel interaction design that needs user education?</ask>
  <ask>Combine familiar patterns in innovative ways?</ask>
</step>

<step n="5" goal="Define Experience Mechanics">
  <ask>How does the user start this action?</ask>
  <ask>What triggers or invites them to begin?</ask>
  <ask>What does the user actually do?</ask>
</step>

<step n="6" goal="Generate Defining Experience Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated defining experience content and present choices: I've defined the core experience for - the interaction that will make users love this product.</output>
  <output>[A] Advanced Elicitation - Let's refine the core experience definition [P] Party Mode - Bring different perspectives on the defining interaction [C] Continue - Save this to the document and move to visual foundation</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current defining experience content</action>
  <action>Process the enhanced experience insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current defining experience</action>
  <action>Process the collaborative experience insights that come back</action>
  <action>Load ./step-08-visual-foundation.md</action>
  <ask>Ask user: Accept these improvements to the defining experience? (y/n)</ask>
  <ask>Ask user: Accept these changes to the defining experience? (y/n)</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
