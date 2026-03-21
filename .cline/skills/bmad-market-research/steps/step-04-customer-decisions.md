# Step 04 - Customer Decisions and Journey

Workflow ID: `bmad-market-research`

## EXECUTION
<step n="1" goal="Research customer decision processes and journey signals">
  <action>Search current sources for decision stages, buying criteria, journey stages, touchpoints, information-gathering patterns, decision influencers, and purchase drivers related to `{{research_topic}}`.</action>
  <detail>Look for research studies, market reports, and other current sources that explain how customers evaluate and choose among options.</detail>
</step>

<step n="2" goal="Map the decision journey">
  <action>Synthesize the evidence into a clear view of awareness, consideration, decision, purchase, and post-purchase behavior.</action>
  <detail>Highlight the most important factors, the common points of friction, and the channels that shape the decision.</detail>
</step>

<step n="3" goal="Append the decision-analysis section to the report">
  <action>Append the customer decision analysis to `{outputFile}`.</action>
  <detail>
    Use these section headers in the report:
    - `## Customer Decision Processes and Journey`
    - `### Customer Decision-Making Processes`
    - `### Decision Factors and Criteria`
    - `### Customer Journey Mapping`
    - `### Touchpoint Analysis`
    - `### Information Gathering Patterns`
    - `### Decision Influencers`
    - `### Purchase Decision Factors`
    - `### Customer Decision Optimizations`
  </detail>
</step>

<step n="4" goal="Present the continuation gate">
  <output>Summarize the decision-process findings and invite the user to continue.</output>
  <ask>Offer `[C] Continue` to save this phase and move to competitive analysis.</ask>
  <branch if="user chooses `C`">
    <action>Update frontmatter `stepsCompleted: [1, 2, 3, 4]`.</action>
    <output>Load `./step-05-competitive-analysis.md`.</output>
  </branch>
</step>

## CHECKPOINT
Halt until the user explicitly continues.

## ADVISORY
- Keep the journey analysis current, cited, and oriented to decision behavior.
- Write the report section before moving to competition.
