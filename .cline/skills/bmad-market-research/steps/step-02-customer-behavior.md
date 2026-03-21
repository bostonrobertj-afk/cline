# Step 02 - Customer Behavior and Segments

Workflow ID: `bmad-market-research`

## EXECUTION
<step n="1" goal="Research customer behavior and segment signals">
  <action>Search current sources for customer behavior patterns, demographics, psychographics, segment profiles, behavior drivers, and interaction patterns related to `{{research_topic}}`.</action>
  <detail>Use multiple searches in parallel when possible and favor current, authoritative sources with clear URLs.</detail>
</step>

<step n="2" goal="Synthesize the behavior findings">
  <action>Compare the search results for recurring patterns, segment differences, and confidence levels.</action>
  <detail>Call out where the evidence is strong, where sources disagree, and where further validation would help.</detail>
</step>

<step n="3" goal="Append the customer-behavior section to the report">
  <action>Append the customer behavior analysis to `{outputFile}`.</action>
  <detail>
    Use these section headers in the report:
    - `## Customer Behavior and Segments`
    - `### Customer Behavior Patterns`
    - `### Demographic Segmentation`
    - `### Psychographic Profiles`
    - `### Customer Segment Profiles`
    - `### Behavior Drivers and Influences`
    - `### Customer Interaction Patterns`
  </detail>
</step>

<step n="4" goal="Present the continuation gate">
  <output>Summarize the key customer behavior findings and invite the user to continue.</output>
  <ask>Offer `[C] Continue` to save this phase and move to customer pain points.</ask>
  <branch if="user chooses `C`">
    <action>Update frontmatter `stepsCompleted: [1, 2]`.</action>
    <output>Load `./step-03-customer-pain-points.md`.</output>
  </branch>
</step>

## CHECKPOINT
Halt until the user explicitly continues.

## ADVISORY
- Keep the analysis grounded in current sources, not training-data recall.
- Preserve citations and note any gaps or limitations.
- Write the report section before advancing.
