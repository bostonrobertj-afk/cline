# Domain Research Step 3: Competitive Landscape

## META
- Goal: Research and document the competitive landscape for the selected domain.
- Guardrails: Use current source-backed facts, note conflicts, and keep the analysis aligned with the research goals.
- Execution note: Reveal only the active step’s details until it is completed.

## EXECUTION
<step n="1" goal="Resolve step context and operating rules">
  <action>Load the current research file and resolve `{user_name}`, `{communication_language}`, `{document_output_language}`, `{research_topic}`, `{research_goals}`, and `{date}` from config and the caller context.</action>
  <detail>
    - This step is for current web-backed competitive analysis.
    - The prompt only exposes detail for the active step. Do not rely on later-step detail until this step is marked complete.
    - If a later branch is optional and you do not need it, mark it complete so the next step can be revealed.
    - The markdown blocks below are document-structure guidance for the research artifact, not text to echo verbatim.
  </detail>
</step>

<step n="2" goal="Research and append competitive landscape analysis">
  <action>Search current web sources in parallel for key players, market share, positioning, strategies, and ecosystem relationships relevant to {research_topic}.</action>
  <action>Analyze the findings, note conflicts or gaps, and write the competitive landscape sections directly to the research file.</action>
  <detail>
    - Use recent authoritative sources, such as company sites, annual reports, investor decks, and competitive-intelligence coverage.
    - Prefer live, source-backed facts over training-data recall.
    - Record conflicting figures when sources disagree and state your confidence level.
    - Keep the content grounded in the research goals and the current topic.
  </detail>
  <detail>
    Append sections shaped like:
    - `## Competitive Landscape`
    - `### Key Players and Market Leaders`
    - `### Market Share and Competitive Positioning`
    - `### Competitive Strategies and Differentiation`
    - `### Business Models and Value Propositions`
    - `### Competitive Dynamics and Entry Barriers`
    - `### Ecosystem and Partnership Analysis`
  </detail>
  <ask>I've completed the competitive landscape draft. Continue and save it to the research file?</ask>
  <branch if="user chooses C">
    <action>Append the competitive landscape sections to the research file.</action>
    <action>Update frontmatter `stepsCompleted: [1, 2, 3]`.</action>
    <handoff path="./step-04-regulatory-focus.md" />
  </branch>
</step>
