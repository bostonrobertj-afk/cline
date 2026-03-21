# Domain Research Step 4: Regulatory Focus

## META
- Goal: Research and document the regulatory and compliance landscape for the selected domain.
- Guardrails: Prefer official sources and record effective dates, obligations, and risks.
- Execution note: Keep the current-step instructions active until the step is completed.

## EXECUTION
<step n="1" goal="Resolve step context and operating rules">
  <action>Load the current research file and resolve `{user_name}`, `{communication_language}`, `{document_output_language}`, `{research_topic}`, `{research_goals}`, and `{date}` from config and the caller context.</action>
  <detail>
    - This step is for current web-backed regulatory and compliance analysis.
    - The prompt only exposes detail for the active step. Do not rely on later-step detail until this step is marked complete.
    - If a later branch is optional and you do not need it, mark it complete so the next step can be revealed.
    - The markdown blocks below are document-structure guidance for the research artifact, not text to echo verbatim.
  </detail>
</step>

<step n="2" goal="Research and append regulatory analysis">
  <action>Search current web sources for regulations, standards, privacy requirements, licensing, and compliance obligations relevant to {research_topic}.</action>
  <action>Analyze the findings, note conflicts or gaps, and write the regulatory sections directly to the research file.</action>
  <detail>
    - Prefer official government, regulator, standards-body, and industry-association sources.
    - Use live sources to verify effective dates, obligations, and enforcement context.
    - Record conflicting guidance when sources disagree and state your confidence level.
    - Keep the content grounded in the research goals and the current topic.
  </detail>
  <detail>
    Append sections shaped like:
    - `## Regulatory Requirements`
    - `### Applicable Regulations`
    - `### Industry Standards and Best Practices`
    - `### Compliance Frameworks`
    - `### Data Protection and Privacy`
    - `### Licensing and Certification`
    - `### Implementation Considerations`
    - `### Risk Assessment`
  </detail>
  <ask>I've completed the regulatory analysis draft. Continue and save it to the research file?</ask>
  <branch if="user chooses C">
    <action>Append the regulatory sections to the research file.</action>
    <action>Update frontmatter `stepsCompleted: [1, 2, 3, 4]`.</action>
    <handoff path="./step-05-technical-trends.md" />
  </branch>
</step>
