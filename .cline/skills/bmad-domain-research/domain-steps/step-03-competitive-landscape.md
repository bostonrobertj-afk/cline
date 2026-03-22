## META

- Progress: Step 3 of 6
- Goal: analyze the competitive landscape, then pause for confirmation before continuing.
- Speak in `{communication_language}`.
- Use current web-verified sources for factual claims.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Research the competitive landscape">
  <action>Search for current sources on key players, market leaders, market share, competitive positioning, and entry barriers for `{{research_topic}}`.</action>
  <detail>
    Prefer current market analyses, company reports, investor materials, regulator filings, and authoritative industry publications when available.
  </detail>
</step>

<step n="2" goal="Synthesize the competitive findings">
  <action>Identify the major competitors, how they differentiate, where market power is concentrated, and what makes entry difficult or easier.</action>
  <action>Call out important uncertainties when market-share or positioning data is inconsistent across sources.</action>
</step>

<step n="3" goal="Append the competitive analysis to the research document">
  <action>Write an `## Competitive Landscape` section into the research document.</action>
  <detail>
    Include the major players, positioning patterns, value proposition differences, and competitive dynamics that matter strategically.
  </detail>
</step>

<step n="4" goal="Present the findings and ask to continue">
  <output>Summarize the strongest competitive insights and what they imply for the researched domain.</output>
  <ask>Ask the user to choose `[C] Continue` to move to regulatory analysis or provide corrections and additions first.</ask>
  <branch if="the user selects `C`" optional="true">
    <action>Update frontmatter so `stepsCompleted` includes steps 1 through 3.</action>
    <handoff path="./step-04-regulatory-focus.md" />
  </branch>
</step>

## CHECKPOINT

Pause after the competitive analysis is written and wait for explicit continuation before moving on.

## ADVISORY

- Favor current competitive evidence over generic commentary.
- Make the competitive takeaways useful for later synthesis, not just descriptive.
