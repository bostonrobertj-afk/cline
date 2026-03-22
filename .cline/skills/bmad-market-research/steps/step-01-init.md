## META

- Progress: Step 1 of 6
- Goal: confirm the market research scope, explain the planned approach, and wait for explicit continuation.
- Speak in {communication_language}.
- Do not begin market research yet.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Confirm the research topic and goals">
  <output>Restate the selected research topic {{research_topic}} and the current research goals {{research_goals}}.</output>
  <detail>
    Keep the restatement focused on market research outcomes rather than product implementation or unrelated industry analysis.
  </detail>
</step>

<step n="2" goal="Explain the planned market research scope">
  <output>Explain that the research will cover customer behavior, pain points, decision processes, competitive analysis, and final strategic synthesis.</output>
  <detail>
    Keep the scope aligned to the user’s stated goals instead of listing generic research categories that do not fit the topic.
  </detail>
</step>

<step n="3" goal="Explain the research methodology">
  <output>Explain that major claims will be verified against current public sources and that important claims should be cross-checked when possible.</output>
  <detail>
    Set the expectation that the market research will use current evidence, explicit source verification, and transparent uncertainty when the source picture is mixed.
  </detail>
</step>

<step n="4" goal="Ask whether to proceed with the market research plan">
  <ask>Ask whether the market research scope and approach align with the user's goals and whether to continue.</ask>
  <branch if="the user confirms and selects `C`" optional="true">
    <action>Append the confirmed scope and methodology to the research document.</action>
    <action>Update frontmatter so `stepsCompleted` includes step 1.</action>
    <handoff path="./step-02-customer-behavior.md" />
  </branch>
  <branch if="the user wants adjustments" optional="true">
    <action>Update the scope and goals based on the user's clarification, then re-present the confirmation.</action>
  </branch>
</step>

## CHECKPOINT

Pause until the user confirms the market research scope and explicitly chooses to continue.

## ADVISORY

- This step is for scope confirmation only.
- Do not begin substantive market research until the user confirms the plan.
