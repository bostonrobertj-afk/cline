## META

- Progress: Step 5 of 6
- Goal: analyze technical trends and innovation patterns affecting the domain, then pause for confirmation before final synthesis.
- Speak in `{communication_language}`.
- Use current web-verified sources for factual claims.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Research technical trends and innovation patterns">
  <action>Search for current sources on emerging technologies, digital transformation, innovation patterns, and future technology outlook relevant to `{{research_topic}}`.</action>
  <detail>
    Focus on technologies and innovation patterns that materially change market structure, operations, compliance, customer expectations, or competitive positioning.
  </detail>
</step>

<step n="2" goal="Synthesize the technical trend findings">
  <action>Identify the most important current technical trends, enabling technologies, innovation themes, and plausible near-term shifts.</action>
  <action>Differentiate current adoption from speculative future possibilities.</action>
</step>

<step n="3" goal="Append the technical trends analysis to the research document">
  <action>Write an `## Technical Trends and Innovation` section into the research document.</action>
  <detail>
    Include emerging technologies, digital transformation themes, innovation patterns, future outlook, and meaningful implementation opportunities where relevant.
  </detail>
</step>

<step n="4" goal="Present the findings and ask to continue">
  <output>Summarize the strongest technical trend findings and why they matter for the domain.</output>
  <ask>Ask the user to choose `[C] Continue` to move to final research synthesis or provide corrections and additions first.</ask>
  <branch if="the user selects `C`" optional="true">
    <action>Update frontmatter so `stepsCompleted` includes steps 1 through 5.</action>
    <handoff path="./step-06-research-synthesis.md" />
  </branch>
</step>

## CHECKPOINT

Pause after the technical trends analysis is written and wait for explicit continuation before moving on.

## ADVISORY

- Keep the analysis grounded in present evidence.
- Call out uncertainty where “future outlook” claims are more speculative than current-state findings.
