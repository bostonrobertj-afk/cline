# Domain Research Step 2: Industry Analysis

## META
- Goal: Research and document current industry analysis for the selected domain.
- Guardrails: Use live web sources, note conflicts, and keep the writing grounded in the active topic.
- Execution note: Present the current-step continuation gate only after the analysis draft is ready.

## EXECUTION
<step n="1" goal="Resolve step context and operating rules">
  <action>Load the current research file and resolve `{user_name}`, `{communication_language}`, `{document_output_language}`, `{research_topic}`, `{research_goals}`, and `{date}` from config and the caller context.</action>
  <detail>
    - This step is for current web-backed industry analysis.
    - The prompt only exposes detail for the active step. Do not rely on later-step detail until this step is marked complete.
    - If a later branch is optional and you do not need it, mark it complete so the next step can be revealed.
    - The markdown blocks below are document-structure guidance for the research artifact, not text to echo verbatim.
  </detail>
</step>

<step n="2" goal="Research and append industry analysis">
  <action>Search current web sources in parallel for market size, growth, structure, and industry trends relevant to {research_topic}.</action>
  <action>Analyze the findings, note conflicts or gaps, and write the industry analysis sections directly to the research file.</action>
  <detail>
    - Use recent authoritative sources, such as market research firms, industry associations, and official reports.
    - Prefer live, source-backed facts over training-data recall.
    - Record conflicting figures when sources disagree and state your confidence level.
    - Keep the content grounded in the research goals and the current topic.
  </detail>
  <detail>
    Append sections shaped like:
    - `## Industry Analysis`
    - `### Market Size and Valuation`
    - `### Market Dynamics and Growth`
    - `### Market Structure and Segmentation`
    - `### Industry Trends and Evolution`
    - `### Competitive Dynamics`
  </detail>
  <ask>I've completed the industry analysis draft. Continue and save it to the research file?</ask>
  <branch if="user chooses C">
    <action>Append the industry analysis sections to the research file.</action>
    <action>Update frontmatter `stepsCompleted: [1, 2]`.</action>
    <handoff path="./step-03-competitive-landscape.md" />
  </branch>
</step>
