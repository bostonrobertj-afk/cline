## META

- Progress: Step 3 of 6
- Goal: analyze customer pain points, unmet needs, and barriers, then pause for confirmation.
- Speak in {communication_language}.
- Use current web-verified sources for factual claims.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Research customer pain points and unmet needs">
  <action>Search for current sources on customer frustrations, unmet needs, adoption barriers, service pain points, and satisfaction gaps relevant to {{research_topic}}.</action>
  <detail>
    Prefer current surveys, customer research, review synthesis, support-pattern reporting, and analyst-backed market observations.
  </detail>
</step>

<step n="2" goal="Synthesize the pain-point findings">
  <action>Identify the most important frustrations, unmet needs, market gaps, and adoption barriers.</action>
  <action>Distinguish recurrent structural pain points from isolated complaints or weak anecdotal evidence.</action>
</step>

<step n="3" goal="Append the pain-point analysis to the research document">
  <action>Write a `## Customer Pain Points and Needs` section into the research document.</action>
  <detail>
    Include clear subsections for major challenges, unmet needs, adoption barriers, and service or support issues where relevant.
  </detail>
</step>

<step n="4" goal="Present the findings and ask to continue">
  <output>Summarize the strongest pain-point findings and why they matter for {{research_topic}}.</output>
  <ask>Ask the user to choose `[C] Continue` to move to customer decision-process analysis or provide corrections and additions first.</ask>
  <branch if="the user selects `C`" optional="true">
    <action>Update frontmatter so `stepsCompleted` includes steps 1 through 3.</action>
    <handoff path="./step-04-customer-decisions.md" />
  </branch>
</step>

## CHECKPOINT

Pause after the pain-point analysis is written and wait for explicit continuation before moving on.

## ADVISORY

- Keep the report focused on real customer pain rather than generic product opportunities.
- Surface uncertainty where evidence is sparse or highly anecdotal.
