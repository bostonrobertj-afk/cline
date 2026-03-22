## META

- Progress: Step 2 of 6
- Goal: analyze the technology stack, write the findings to the research document, and pause for user confirmation.
- Speak to the user in `{communication_language}`.
- Use authoritative primary sources where possible.

## EXECUTION

<step n="1" goal="Establish the current technology landscape">
  <action>Use the current topic and goals from step 01 to frame the analysis.</action>
  <action>Search for current primary sources on programming languages, frameworks, databases, tools, and deployment platforms relevant to `{{research_topic}}`.</action>
  <detail>
    Prefer official documentation, standards bodies, research papers, and vendor-maintained references.
    Use parallel searches when possible so language, framework, data, and platform coverage can be compared side by side.
  </detail>
</step>

<step n="2" goal="Synthesize the stack findings">
  <action>Compare the results across languages, frameworks, databases, tooling, and cloud platforms.</action>
  <action>Identify current adoption patterns, maturity signals, migration trends, and any source disagreements.</action>
  <action>Assign confidence levels to uncertain claims and keep the analysis anchored in current public sources.</action>
</step>

<step n="3" goal="Append the technology stack analysis">
  <action>Write a `## Technology Stack Analysis` section to the research document.</action>
  <detail>
    Include these subsections:
    - `### Programming Languages`
    - `### Development Frameworks and Libraries`
    - `### Database and Storage Technologies`
    - `### Development Tools and Platforms`
    - `### Cloud Infrastructure and Deployment`
    - `### Technology Adoption Trends`

    Each subsection should include concise analysis, a source line, and any notable limitations or conflicting signals.
  </detail>
</step>

<step n="4" goal="Present the analysis and pause for confirmation">
  <output>Summarize the strongest stack findings and explain how they affect `{{research_topic}}`.</output>
  <ask>Ask the user to choose `[C] Continue` to save the stack analysis and move to integration patterns, or provide corrections and additions first.</ask>
</step>

<step n="5" goal="Handle the continue decision">
  <branch if="the user selects `C`">
    <action>Update frontmatter so `stepsCompleted` includes `[1, 2]`.</action>
    <handoff path="./step-03-integration-patterns.md" />
  </branch>
</step>

## CHECKPOINT

Pause after the technology stack analysis is written and wait for explicit `C` before moving to integration patterns.

## ADVISORY

- Keep the document language aligned with `{document_output_language}`.
- Preserve exact source URLs in the document so downstream synthesis can cite them cleanly.
- When sources disagree, surface the disagreement rather than smoothing it over.
