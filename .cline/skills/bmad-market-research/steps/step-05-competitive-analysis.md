## META

- Progress: Step 5 of 6
- Goal: analyze the competitive landscape and positioning, then pause for confirmation before final synthesis.
- Speak in `{communication_language}`.
- Use current web-verified sources for factual claims.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Research the competitive landscape">
  <action>Search for current sources on key market players, market share, positioning strategies, differentiation, and competitive threats relevant to `{{research_topic}}`.</action>
  <detail>
    Prefer current market analyses, analyst reports, company reports, investor materials, and authoritative industry publications.
  </detail>
</step>

<step n="2" goal="Synthesize the competitive findings">
  <action>Identify the major competitors, their positioning strategies, meaningful strengths and weaknesses, and the most important competitive risks and opportunities.</action>
  <action>Call out uncertainty where market-share or positioning claims are inconsistent across sources.</action>
</step>

<step n="3" goal="Append the competitive analysis to the research document">
  <action>Write a `## Competitive Landscape` section into the research document.</action>
  <detail>
    Include clear subsections for key market players, market share, competitive positioning, strengths and weaknesses, differentiation opportunities, and competitive threats.
  </detail>
</step>

<step n="4" goal="Present the findings and ask to continue">
  <output>Summarize the strongest competitive findings and why they matter for `{{research_topic}}`.</output>
  <ask>Ask the user to choose `[C] Continue` to move to final market-research synthesis or provide corrections and additions first.</ask>
  <branch if="the user selects `C`" optional="true">
    <action>Update frontmatter so `stepsCompleted` includes steps 1 through 5.</action>
    <handoff path="./step-06-research-completion.md" />
  </branch>
</step>

## CHECKPOINT

Pause after the competitive analysis is written and wait for explicit continuation before moving on.

## ADVISORY

- Keep the analysis useful for strategy, not just descriptive.
- Preserve exact source references and surface any major evidence gaps.
