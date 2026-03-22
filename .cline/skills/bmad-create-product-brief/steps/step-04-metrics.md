---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 04 metrics

## META

- Goal: Define success metrics that connect user value to business outcomes and measurable indicators.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Define user-success and business-success signals collaboratively">
  <ask>Ask how the team will know the product is succeeding for users, what outcomes users are trying to achieve, and what behaviors show the product is delivering value.</ask>
  <ask>Ask what business success should look like over short- and longer-term horizons and which categories matter most, such as growth, engagement, financial impact, or strategic position.</ask>
  <detail>Push vague ideas toward measurable outcomes. Favor metrics that drive decisions over vanity metrics that only sound impressive.</detail>
</step>

<step n="2" goal="Turn the success signals into measurable indicators">
  <action>Define key performance indicators with a clear measurement method.</action>
  <action>Capture targets and timeframes where the user has enough context to set them.</action>
  <output>Prepare the Success Metrics section, including business objectives and key performance indicators.</output>
</step>

<step n="3" goal="Review the metrics draft and refine it until approved">
  <output>Show the draft metrics content that will be added to `{outputFile}`.</output>
  <ask>Ask whether the draft reflects the right user outcomes, business objectives, and measurable indicators.</ask>
  <branch if="the user requests revisions" optional="true">
    <action>Revise the metrics draft and re-present it.</action>
  </branch>
  <branch if="the user wants deeper exploration before approving" optional="true">
    <ask>Ask whether the user wants Advanced Elicitation or Party Mode for additional metric exploration.</ask>
    <branch if="the user chooses Advanced Elicitation" optional="true">
      <action>
        Dispatch a dedicated subagent for Advanced Elicitation.
        <detail>
          Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
          Prompt the subagent with the current metrics draft and the instruction to deepen measurability, success criteria, or KPI framing.
          Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
        </detail>
      </action>
    </branch>
    <branch if="the user chooses Party Mode" optional="true">
      <action>
        Dispatch a dedicated subagent for Party Mode.
        <detail>
          Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
          Prompt the subagent with the current metrics draft and the instruction to critique it from multiple stakeholder perspectives.
          Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
        </detail>
      </action>
    </branch>
  </branch>
  <branch if="the user approves the draft" optional="true">
    <action>Save the approved metrics content to `{outputFile}` and update the workflow state for step 4 completion.</action>
    <handoff path="./step-05-scope.md">Proceed to MVP scope definition.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-05-scope.md
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
