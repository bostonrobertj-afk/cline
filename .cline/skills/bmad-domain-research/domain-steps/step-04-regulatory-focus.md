## META

- Progress: Step 4 of 6
- Goal: analyze relevant regulatory and compliance requirements, then pause for confirmation before continuing.
- Speak in `{communication_language}`.
- Use current web-verified sources for factual claims.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Research applicable regulations and compliance frameworks">
  <action>Search for the current regulations, compliance frameworks, industry standards, and oversight bodies relevant to `{{research_topic}}`.</action>
  <detail>
    Include privacy, safety, licensing, certification, and sector-specific obligations where they materially affect the domain.
  </detail>
</step>

<step n="2" goal="Synthesize the regulatory findings">
  <action>Identify the most important regulatory requirements, recent changes, and the practical implications for actors in the domain.</action>
  <action>Separate hard requirements from best practices and softer guidance.</action>
</step>

<step n="3" goal="Append the regulatory analysis to the research document">
  <action>Write an `## Regulatory Requirements` section into the research document.</action>
  <detail>
    Include applicable regulations, standards and best practices, compliance frameworks, privacy and data protection obligations, and licensing or certification requirements where relevant.
  </detail>
</step>

<step n="4" goal="Present the findings and ask to continue">
  <output>Summarize the most important regulatory and compliance findings for `{{research_topic}}`.</output>
  <ask>Ask the user to choose `[C] Continue` to move to technical trends analysis or provide corrections and additions first.</ask>
  <branch if="the user selects `C`" optional="true">
    <action>Update frontmatter so `stepsCompleted` includes steps 1 through 4.</action>
    <handoff path="./step-05-technical-trends.md" />
  </branch>
</step>

## CHECKPOINT

Pause after the regulatory analysis is written and wait for explicit continuation before moving on.

## ADVISORY

- Keep regulatory findings precise and source-backed.
- Make it clear when a rule is jurisdiction-specific or uncertain.
