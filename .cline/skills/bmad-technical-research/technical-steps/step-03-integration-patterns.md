## META

- Progress: Step 3 of 6
- Goal: analyze integration patterns, write the findings to the research document, and pause for user confirmation.
- Speak to the user in `{communication_language}`.
- Use authoritative primary sources where possible.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Research API and protocol choices">
  <action>Search for current primary sources on API design patterns, communication protocols, data formats, and interoperability relevant to `{{research_topic}}`.</action>
  <detail>
    Prefer official API docs, protocol specifications, standards bodies, and vendor engineering references.
    Parallelize searches for APIs, protocols, service integration, and event-driven messaging when possible.
  </detail>
</step>

<step n="2" goal="Synthesize integration findings">
  <action>Compare REST, GraphQL, RPC, webhook, messaging, and service-to-service patterns as they apply to the topic.</action>
  <action>Identify trade-offs between direct integration, gateways, service meshes, and event-driven architectures.</action>
  <action>Call out security implications, protocol constraints, and any source disagreements.</action>
</step>

<step n="3" goal="Append the integration patterns analysis">
  <action>Write a `## Integration Patterns Analysis` section to the research document.</action>
  <detail>
    Include these subsections:
    - `### API Design Patterns`
    - `### Communication Protocols`
    - `### Data Formats and Standards`
    - `### System Interoperability Approaches`
    - `### Microservices Integration Patterns`
    - `### Event-Driven Integration`
    - `### Integration Security Patterns`

    Keep each subsection concise, current, and source-backed.
  </detail>
</step>

<step n="4" goal="Present the analysis and pause for confirmation">
  <output>Summarize the strongest integration findings and explain how they affect `{{research_topic}}`.</output>
  <ask>Ask the user to choose `[C] Continue` to save the integration analysis and move to architectural patterns, or provide corrections and additions first.</ask>
</step>

<step n="5" goal="Handle the continue decision">
  <branch if="the user selects `C`">
    <action>Update frontmatter so `stepsCompleted` includes `[1, 2, 3]`.</action>
    <handoff path="./step-04-architectural-patterns.md" />
  </branch>
</step>

## CHECKPOINT

Pause after the integration analysis is written and wait for explicit `C` before moving to architectural patterns.

## ADVISORY

- Keep protocol and standards references precise.
- Surface incompatibilities or adoption gaps instead of smoothing them over.
- Preserve exact source URLs so the final synthesis can cite them cleanly.
