---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 02 vision

## META

- Goal: Define the core problem, solution vision, and differentiators through collaborative product-vision discovery.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
## EXECUTION

<step n="1" goal="Facilitate product-vision discovery from problem space to solution space">
  <ask>Ask what core problem the product is solving, who feels it most acutely, and what success would look like for those users.</ask>
  <ask>Ask how users currently solve the problem, what frustrates them about existing solutions, and what happens if the problem remains unsolved.</ask>
  <ask>Ask what an excellent solution would look like, what the simplest meaningful version could be, and what makes the proposed approach different from existing alternatives.</ask>
  <ask>Ask what the product's unfair advantage is and what would be difficult for competitors to copy.</ask>
  <detail>Keep the conversation grounded in real user pain, not just feature ideas. The goal here is a compelling problem statement, solution framing, and differentiation narrative.</detail>
</step>

<step n="2" goal="Draft the executive-summary and core-vision sections">
  <output>Prepare content for the Executive Summary and Core Vision sections of `{outputFile}`.</output>
  <detail>The draft should cover the problem statement, problem impact, why existing solutions fall short, the proposed solution, and the key differentiators.</detail>
</step>

<step n="3" goal="Review the draft with the user and refine it until approved">
  <output>Show the draft content that will be appended to the product brief.</output>
  <ask>Ask whether the draft accurately captures the problem, solution, and differentiation.</ask>
  <branch if="the user requests changes" optional="true">
    <action>Revise the vision draft and re-present it for approval.</action>
  </branch>
  <branch if="the user wants deeper exploration before approving" optional="true">
    <ask>Ask whether the user wants Advanced Elicitation or Party Mode for additional exploration.</ask>
    <branch if="the user chooses Advanced Elicitation" optional="true">
      <action>
        Dispatch a dedicated subagent for Advanced Elicitation.
        <detail>
          Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
          Prompt the subagent with the current vision draft and the instruction to deepen the problem statement, solution framing, or differentiation.
          Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
        </detail>
      </action>
    </branch>
    <branch if="the user chooses Party Mode" optional="true">
      <action>
        Dispatch a dedicated subagent for Party Mode.
        <detail>
          Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
          Prompt the subagent with the current vision draft and the instruction to critique it from multiple stakeholder perspectives.
          Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
        </detail>
      </action>
    </branch>
  </branch>
  <branch if="the user approves the draft" optional="true">
    <action>Save the approved vision content to `{outputFile}` and update the workflow state for step 2 completion.</action>
    <handoff path="./step-03-users.md">Proceed to target-user discovery.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-03-users.md
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
