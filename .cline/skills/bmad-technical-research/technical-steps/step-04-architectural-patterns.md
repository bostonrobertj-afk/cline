## META

- Progress: Step 4 of 6
- Goal: analyze architectural patterns, write the findings to the research document, and pause for user confirmation.
- Speak to the user in `{communication_language}`.
- Use authoritative primary sources where possible.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Research architecture patterns and design principles">
  <action>Search for current primary sources on system architecture patterns, design principles, scalability patterns, and operational architecture relevant to `{{research_topic}}`.</action>
  <detail>
    Prefer architecture handbooks, official cloud guidance, ADR references, conference papers, and vendor engineering write-ups.
    Focus on trade-offs rather than generic pattern lists.
  </detail>
</step>

<step n="2" goal="Synthesize architectural decisions">
  <action>Compare monolith, modular monolith, microservices, event-driven, serverless, and cloud-native patterns where relevant.</action>
  <action>Identify design principles, scalability constraints, deployment implications, and quality attributes such as maintainability, resilience, and observability.</action>
  <action>Call out architectural disagreements or assumptions that should remain explicit in the document.</action>
</step>

<step n="3" goal="Append the architectural patterns analysis">
  <action>Write a `## Architectural Patterns and Design` section to the research document.</action>
  <detail>
    Include these subsections:
    - `### System Architecture Patterns`
    - `### Design Principles and Best Practices`
    - `### Scalability and Performance Patterns`
    - `### Integration and Communication Patterns`
    - `### Security Architecture Patterns`
    - `### Data Architecture Patterns`
    - `### Deployment and Operations Architecture`

    Keep the analysis specific to `{{research_topic}}` and grounded in current sources.
  </detail>
</step>

<step n="4" goal="Present the analysis and pause for confirmation">
  <output>Summarize the strongest architectural findings and explain how they affect `{{research_topic}}`.</output>
  <ask>Ask the user to choose `[C] Continue` to save the architectural analysis and move to implementation research, or provide corrections and additions first.</ask>
</step>

<step n="5" goal="Handle the continue decision">
  <branch if="the user selects `C`">
    <action>Update frontmatter so `stepsCompleted` includes `[1, 2, 3, 4]`.</action>
    <handoff path="./step-05-implementation-research.md" />
  </branch>
</step>

## CHECKPOINT

Pause after the architectural analysis is written and wait for explicit `C` before moving to implementation research.

## ADVISORY

- Preserve exact source URLs and note any architecture-specific assumptions.
- Keep the analysis focused on choices, trade-offs, and operational consequences.
