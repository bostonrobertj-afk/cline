---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 05 scope

## META

- Goal: Define a realistic MVP scope with explicit boundaries and a clear future-product vision.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
## EXECUTION

<step n="1" goal="Define the MVP scope by balancing user value with delivery realism">
  <ask>Ask what the minimum viable product must include to solve the core problem, what features are essential, and what would make the product feel incomplete if those items were missing.</ask>
  <detail>Keep the conversation anchored to the smallest version that creates real user value rather than to the most ambitious possible first release.</detail>
</step>

<step n="2" goal="Separate MVP commitments from deferred work">
  <ask>Ask what should be intentionally out of scope for the MVP, what can wait for a later version, and how those tradeoffs should be explained.</ask>
  <ask>Ask what success signals should indicate that the team is ready to move beyond the MVP.</ask>
  <branch if="the user wants to explore the longer-term vision" optional="true">
    <ask>Ask how the product could evolve over two to three years if the MVP succeeds.</ask>
    <detail>Capture the future vision without allowing it to bloat the MVP definition.</detail>
  </branch>
</step>

<step n="3" goal="Draft the MVP scope section and refine it until approved">
  <output>Prepare the MVP Scope section, including core features, out-of-scope items, MVP success criteria, and future vision notes when relevant.</output>
  <ask>Ask whether the draft scope feels both ambitious enough to matter and constrained enough to ship.</ask>
  <branch if="the user requests changes" optional="true">
    <action>Revise the scope draft and re-present it.</action>
  </branch>
  <branch if="the user wants deeper exploration before approving" optional="true">
    <ask>Ask whether the user wants Advanced Elicitation or Party Mode for additional scope exploration.</ask>
    <branch if="the user chooses Advanced Elicitation" optional="true">
      <action>
        Dispatch a dedicated subagent for Advanced Elicitation.
        <detail>
          Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
          Prompt the subagent with the current scope draft and the instruction to deepen scope boundaries, tradeoffs, or prioritization.
          Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
        </detail>
      </action>
    </branch>
    <branch if="the user chooses Party Mode" optional="true">
      <action>
        Dispatch a dedicated subagent for Party Mode.
        <detail>
          Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
          Prompt the subagent with the current scope draft and the instruction to critique it from multiple stakeholder perspectives.
          Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
        </detail>
      </action>
    </branch>
  </branch>
  <branch if="the user approves the draft" optional="true">
    <action>Save the approved scope content to `{outputFile}` and update the workflow state for step 5 completion.</action>
    <handoff path="./step-06-complete.md">Proceed to workflow completion.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-06-complete.md
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
