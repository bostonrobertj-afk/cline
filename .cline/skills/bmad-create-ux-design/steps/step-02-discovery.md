# Step 2: UX Discovery

## META
Goal: Build shared understanding of the product, users, and UX opportunities.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Review Loaded Context">
  <action>Synthesize the loaded PRD, brief, and supporting documents into a concise UX understanding of the product.</action>
  <ask>Summarize the project vision, target users, and key features or goals, then ask whether that matches the user’s understanding.</ask>
  <ask>Invite corrections or additions.</ask>
</step>

<step n="2" goal="Fill Context Gaps (If no documents or gaps exist)">
  <ask>If documentation is incomplete, ask what is being built, who it is for, what makes it different, and what the main user action is.</ask>
</step>

<step n="3" goal="Explore User Context Deeper">
  <ask>What problem are users trying to solve?</ask>
  <ask>What frustrates them with current solutions?</ask>
  <ask>What would make them say "this is exactly what I needed"?</ask>
</step>

<step n="4" goal="Identify UX Design Challenges">
  <action>Identify 2-3 key UX challenges based on the project type and user needs.</action>
  <action>Note any platform-specific considerations.</action>
  <action>Highlight any complex user flows or interactions.</action>
  <action>Note any opportunities for innovative UX patterns.</action>
  <output>Capture the areas where strong UX could create competitive advantage.</output>
</step>

<step n="5" goal="Generate Project Understanding Content">
  <output>Prepare the content to append to the document as an Executive Summary with Project Vision, Target Users, Key Design Challenges, and Design Opportunities.</output>
</step>

<step n="6" goal="Present Content and Menu">
  <action>Show the generated project understanding content and explain that it will guide the rest of the workflow.</action>
  <ask>What would you like to do next?</ask>
  <output>[C] Continue - Save this to the document and move to core experience definition</output>
</step>

<step n="7" goal="Handle Menu Selection">
  <action>Update frontmatter so `stepsCompleted` includes steps 1 and 2.</action>
  <action>Load `./step-03-core-experience.md`.</action>
  <output>Append the final content to `{planning_artifacts}/ux-design-specification.md`.</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-03-core-experience.md
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
