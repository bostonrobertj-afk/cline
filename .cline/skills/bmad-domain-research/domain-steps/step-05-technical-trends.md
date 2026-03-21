# Domain Research Step 5: Technical Trends

## META
- Goal: Research and document technical trends and innovation patterns for the selected domain.
- Guardrails: Use current vendor, technical, and industry sources instead of training-data recall.
- Execution note: Keep this step focused on current technology and its implications.

## EXECUTION
<step n="1" goal="Resolve step context and operating rules">
  <action>Load the current research file and resolve `{user_name}`, `{communication_language}`, `{document_output_language}`, `{research_topic}`, `{research_goals}`, and `{date}` from config and the caller context.</action>
  <detail>
    - This step is for current web-backed technology and innovation analysis.
    - The prompt only exposes detail for the active step. Do not rely on later-step detail until this step is marked complete.
    - If a later branch is optional and you do not need it, mark it complete so the next step can be revealed.
    - The markdown blocks below are document-structure guidance for the research artifact, not text to echo verbatim.
  </detail>
</step>

<step n="2" goal="Research and append technical trends analysis">
  <action>Search current web sources for emerging technologies, digital transformation patterns, platform-specific advances, and future outlook relevant to {research_topic}.</action>
  <action>Analyze the findings, note conflicts or gaps, and write the technology sections directly to the research file.</action>
  <detail>
    - Prefer live vendor announcements, technical documentation, conference talks, and authoritative industry coverage.
    - Use source-backed facts instead of training-data recall.
    - Record conflicting guidance when sources disagree and state your confidence level.
    - Keep the content grounded in the research goals and the current topic.
  </detail>
  <detail>
    Append sections shaped like:
    - `## Technical Trends and Innovation`
    - `### Emerging Technologies`
    - `### Digital Transformation`
    - `### Innovation Patterns`
    - `### Future Outlook`
    - `### Implementation Opportunities`
    - `### Challenges and Risks`
    - `## Recommendations`
  </detail>
  <ask>I've completed the technical trends draft. Continue and save it to the research file?</ask>
  <branch if="user chooses C">
    <action>Append the technical trends sections to the research file.</action>
    <action>Update frontmatter `stepsCompleted: [1, 2, 3, 4, 5]`.</action>
    <handoff path="./step-06-research-synthesis.md" />
  </branch>
</step>
