## META

- Progress: Step 2 of 6
- Goal: analyze customer behavior and segmentation, then pause for confirmation.
- Speak in {communication_language}.
- Use current web-verified sources for factual claims.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Research customer behavior and segmentation">
  <action>Search for current, authoritative sources on customer behavior patterns, demographic segments, psychographic characteristics, and behavior drivers relevant to {{research_topic}}.</action>
  <detail>
    Prefer current customer research, analyst reports, survey-backed findings, and credible market publications.
  </detail>
</step>

<step n="2" goal="Synthesize the customer behavior findings">
  <action>Identify the most important behavior patterns, segment differences, motivations, and engagement patterns that matter strategically.</action>
  <action>Note source disagreement or uncertainty where it materially affects the interpretation.</action>
</step>

<step n="3" goal="Append the customer behavior analysis to the research document">
  <action>Write a `## Customer Behavior and Segments` section into the research document.</action>
  <detail>
    Include clear subsections for behavior patterns, demographic segmentation, psychographics, and the main behavior drivers or influences.
  </detail>
</step>

<step n="4" goal="Present the findings and ask to continue">
  <output>Summarize the strongest customer behavior findings and why they matter for {{research_topic}}.</output>
  <ask>Ask the user to choose `[C] Continue` to move to customer pain points analysis or provide corrections and additions first.</ask>
  <branch if="the user selects `C`" optional="true">
    <action>Update frontmatter so `stepsCompleted` includes steps 1 and 2.</action>
    <handoff path="./step-03-customer-pain-points.md" />
  </branch>
</step>

## CHECKPOINT

Pause after the customer behavior analysis is written and wait for explicit continuation before moving on.

## ADVISORY

- Preserve exact source references in the document.
- Separate strong evidence from weaker inference when describing customer segments and behavior patterns.
