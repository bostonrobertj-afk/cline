## META

- Progress: Step 5 of 6
- Goal: research implementation approaches, write the findings to the research document, and pause for user confirmation.
- Speak to the user in `{communication_language}`.
- Use authoritative primary sources where possible.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Research adoption and delivery practices">
  <action>Search for current primary sources on technology adoption, migration patterns, development workflows, testing, operations, and team practices relevant to `{{research_topic}}`.</action>
  <detail>
    Favor case studies, official engineering docs, cloud adoption guidance, DevOps references, and other sources that show implementation reality rather than theory.
  </detail>
</step>

<step n="2" goal="Synthesize implementation guidance">
  <action>Compare gradual adoption versus big-bang migration, legacy modernization approaches, CI/CD patterns, testing strategies, observability, and operational controls.</action>
  <action>Identify skills, operating models, cost drivers, and migration risks that matter for successful delivery.</action>
  <action>Capture any constraints or caveats that should remain explicit in the document.</action>
</step>

<step n="3" goal="Append the implementation research">
  <action>Write a `## Implementation Approaches and Technology Adoption` section to the research document.</action>
  <detail>
    Include these subsections:
    - `### Technology Adoption Strategies`
    - `### Development Workflows and Tooling`
    - `### Testing and Quality Assurance`
    - `### Deployment and Operations Practices`
    - `### Team Organization and Skills`
    - `### Cost Optimization and Resource Management`
    - `### Risk Assessment and Mitigation`
    - `## Technical Research Recommendations`
    - `### Implementation Roadmap`
    - `### Technology Stack Recommendations`
    - `### Skill Development Requirements`
    - `### Success Metrics and KPIs`

    Keep recommendations practical and aligned to the confirmed research goals.
  </detail>
</step>

<step n="4" goal="Present the analysis and pause for confirmation">
  <output>Summarize the strongest implementation findings and explain how they affect `{{research_topic}}`.</output>
  <ask>Ask the user to choose `[C] Continue` to save the implementation analysis and move to technical synthesis, or provide corrections and additions first.</ask>
</step>

<step n="5" goal="Handle the continue decision">
  <branch if="the user selects `C`">
    <action>Update frontmatter so `stepsCompleted` includes `[1, 2, 3, 4, 5]`.</action>
    <handoff path="./step-06-research-synthesis.md" />
  </branch>
</step>

## CHECKPOINT

Pause after the implementation analysis is written and wait for explicit `C` before moving to technical synthesis.

## ADVISORY

- Keep recommendations tied to concrete implementation constraints and team realities.
- Preserve exact source URLs so the final synthesis can cite them cleanly.
