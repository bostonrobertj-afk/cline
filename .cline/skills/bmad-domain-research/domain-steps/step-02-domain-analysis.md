## META

- Progress: Step 2 of 6
- Goal: analyze the domain’s industry structure, market dynamics, and economic context, then pause for confirmation.
- Speak in `{communication_language}`.
- Use current web-verified sources for factual claims.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Research the industry landscape">
  <action>Search for current, authoritative sources on market size, growth, segmentation, industry structure, and major economic dynamics relevant to `{{research_topic}}`.</action>
  <detail>
    Prefer recent market research, industry associations, regulator publications, major analyst reports, and authoritative company or institutional references.
  </detail>
</step>

<step n="2" goal="Synthesize the domain analysis findings">
  <action>Compare sources and extract the strongest findings about market size, growth drivers, barriers, segmentation, and industry evolution.</action>
  <action>Note important source disagreements or uncertainty where they materially affect interpretation.</action>
</step>

<step n="3" goal="Append the industry analysis to the research document">
  <action>Write an `## Industry Analysis` section into the research document.</action>
  <detail>
    Include clear subsections for market size and valuation, market dynamics and growth, structure and segmentation, and major industry trends where relevant.
  </detail>
</step>

<step n="4" goal="Present the findings and ask to continue">
  <output>Summarize the strongest industry findings and why they matter for `{{research_topic}}`.</output>
  <ask>Ask the user to choose `[C] Continue` to move to competitive landscape analysis or provide corrections and additions first.</ask>
  <branch if="the user selects `C`" optional="true">
    <action>Update frontmatter so `stepsCompleted` includes steps 1 and 2.</action>
    <handoff path="./step-03-competitive-landscape.md" />
  </branch>
</step>

## CHECKPOINT

Pause after the industry analysis is written and wait for explicit continuation before moving on.

## ADVISORY

- Preserve exact source references in the document.
- Surface uncertainty rather than smoothing over conflicting market claims.
