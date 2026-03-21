# Step 05 - Competitive Analysis

Workflow ID: `bmad-market-research`

## EXECUTION
<step n="1" goal="Research the competitive landscape">
  <action>Search current sources for key market players, market share, positioning, strengths, weaknesses, differentiation, threats, and opportunities related to `{{research_topic}}`.</action>
  <detail>Prefer company sites, annual reports, market research publications, and recent industry coverage with clear citations.</detail>
</step>

<step n="2" goal="Synthesize competitive positioning insights">
  <action>Organize the evidence into a practical view of who leads the market, how competitors differentiate, and where gaps remain.</action>
  <detail>Call out threats, defensible advantages, and any segments or positioning opportunities that stand out.</detail>
</step>

<step n="3" goal="Append the competitive-analysis section to the report">
  <action>Append the competitive analysis to `{outputFile}`.</action>
  <detail>
    Use these section headers in the report:
    - `## Competitive Landscape`
    - `### Key Market Players`
    - `### Market Share Analysis`
    - `### Competitive Positioning`
    - `### Strengths and Weaknesses`
    - `### Market Differentiation`
    - `### Competitive Threats`
    - `### Opportunities`
  </detail>
</step>

<step n="4" goal="Present the completion gate">
  <output>Summarize the competitive findings and invite the user to complete the research.</output>
  <ask>Offer `[C] Complete Research` to save this phase and move to the final synthesis step.</ask>
  <branch if="user chooses `C`">
    <action>Update frontmatter `stepsCompleted: [1, 2, 3, 4, 5]`.</action>
    <output>Load `./step-06-research-completion.md`.</output>
  </branch>
</step>

## CHECKPOINT
Halt until the user explicitly completes the phase.

## ADVISORY
- Keep the analysis current, comparative, and source-backed.
- Write the competitive section before moving into final synthesis.
