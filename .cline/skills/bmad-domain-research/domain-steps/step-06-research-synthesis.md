# Domain Research Step 6: Research Synthesis and Completion

## META
- Goal: Synthesize the complete research document and finish the workflow.
- Guardrails: Replace the starter overview placeholder, then assemble the final comprehensive document.
- Execution note: This is the final step; only complete after the document is ready to save.

## EXECUTION
<step n="1" goal="Resolve step context and operating rules">
  <action>Load the current research file and resolve `{user_name}`, `{communication_language}`, `{document_output_language}`, `{research_topic}`, `{research_goals}`, and `{date}` from config and the caller context.</action>
  <detail>
    - This is the final synthesis step.
    - The prompt only exposes detail for the active step. Do not rely on later-step detail until this step is marked complete.
    - If a later branch is optional and you do not need it, mark it complete so the next step can be revealed.
    - The markdown blocks below are document-structure guidance for the final artifact, not text to echo verbatim.
  </detail>
</step>

<step n="2" goal="Synthesize the complete research document">
  <action>Search the web for current context that strengthens the introduction and methodology, then synthesize the completed industry, competitive, regulatory, and technical sections into one authoritative document.</action>
  <action>Replace the starter file’s `## Research Overview` placeholder with a concise 2-3 paragraph overview before appending the full final document structure.</action>
  <action>Append the complete research document to the research file and keep the narrative cohesive across sections.</action>
  <detail>
    - Build the final document with a compelling title, executive summary, table of contents, introduction, methodology, synthesized sections, recommendations, future outlook, source verification, appendices, and conclusion.
    - Use the existing section content as source material rather than duplicating it.
    - Keep every factual claim source-backed and note any remaining uncertainties.
    - The final document structure below is the output shape to generate, not a block to paste unchanged into the prompt.
  </detail>
  <detail>
    Final document sections:
    - `## Executive Summary`
    - `## Table of Contents`
    - `## 1. Research Introduction and Methodology`
    - `## 2. {{research_topic}} Industry Overview and Market Dynamics`
    - `## 3. Technology Landscape and Innovation Trends`
    - `## 4. Regulatory Framework and Compliance Requirements`
    - `## 5. Competitive Landscape and Ecosystem Analysis`
    - `## 6. Strategic Insights and Domain Opportunities`
    - `## 7. Implementation Considerations and Risk Assessment`
    - `## 8. Future Outlook and Strategic Planning`
    - `## 9. Research Methodology and Source Verification`
    - `## 10. Appendices and Additional Resources`
    - `## Research Conclusion`
  </detail>
  <ask>I've completed the full research synthesis draft. Complete and save the document?</ask>
  <branch if="user chooses C">
    <action>Append the complete comprehensive research document to the research file.</action>
    <action>Update frontmatter `stepsCompleted: [1, 2, 3, 4, 5, 6]`.</action>
    <exit />
  </branch>
</step>
