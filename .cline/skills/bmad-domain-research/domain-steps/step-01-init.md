## META

- Progress: Step 1 of 6
- Goal: confirm the domain research scope, explain the research approach, and wait for explicit continuation.
- Speak in `{communication_language}`.
- Do not begin web research yet.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Confirm the research topic and goals">
  <output>Restate the selected research topic `{{research_topic}}` and the current research goals `{{research_goals}}`.</output>
  <detail>
    Make it clear that this workflow is focused on domain and industry research rather than product implementation details.
  </detail>
</step>

<step n="2" goal="Explain the planned domain research scope">
  <output>Explain that the research will cover industry analysis, regulatory requirements, technology trends, economic factors, and supply-chain or ecosystem considerations where relevant.</output>
  <detail>
    Keep the scope explanation aligned with the topic rather than presenting irrelevant domains or categories.
  </detail>
</step>

<step n="3" goal="Explain the research methodology">
  <output>Explain that major claims will be verified against current public sources and that important claims should be cross-checked when possible.</output>
  <detail>
    Set the expectation that confidence should reflect source quality and that uncertainty should be surfaced rather than hidden.
  </detail>
</step>

<step n="4" goal="Ask whether to proceed with the domain research plan">
  <ask>Ask whether the domain research scope and approach align with the user's goals and whether to continue.</ask>
  <branch if="the user confirms and selects `C`" optional="true">
    <action>Append the confirmed scope and methodology to the research document.</action>
    <action>Update frontmatter so `stepsCompleted` includes step 1.</action>
    <handoff path="./step-02-domain-analysis.md" />
  </branch>
  <branch if="the user wants adjustments" optional="true">
    <action>Update the scope and goals based on the user's clarification, then re-present the confirmation.</action>
  </branch>
</step>

## CHECKPOINT

Pause until the user confirms the domain research scope and explicitly chooses to continue.

## ADVISORY

- This step is for scope confirmation only.
- Do not begin substantive web research until the user confirms the plan.
