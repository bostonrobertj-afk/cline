---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 03 users

## META

- Goal: Define the target users, personas, and key journeys that the product brief should serve.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
## EXECUTION

<step n="1" goal="Discover the user segments that matter most">
  <ask>Ask who experiences the problem most directly, whether there are multiple user types, and who gets the greatest value from the product.</ask>
  <action>Develop the primary user segments with realistic context, motivations, goals, and current pain points.</action>
  <detail>Make the personas concrete enough to guide future product decisions rather than keeping them as generic demographics.</detail>
</step>

<step n="2" goal="Explore secondary users and decision influencers">
  <ask>Ask who else benefits from the product, who influences adoption or purchase decisions, and whether support, admin, or oversight roles should be modeled.</ask>
  <branch if="no meaningful secondary segment emerges" optional="true">
    <output>Record that the brief does not currently require a secondary-user section beyond a simple note.</output>
  </branch>
</step>

<step n="3" goal="Map the user journeys that matter most">
  <ask>Ask how the primary persona discovers the product, what onboarding looks like, how day-to-day usage works, and where the user's value-realization moment happens.</ask>
  <detail>Focus on the journey moments that will later shape requirements, success metrics, and MVP scope.</detail>
</step>

<step n="4" goal="Draft the target-users section and refine it with the user">
  <output>Prepare the Target Users section, including primary users, secondary users when relevant, and the user journey narrative.</output>
  <ask>Ask whether the personas and journey reflect the product accurately.</ask>
  <branch if="the user requests changes" optional="true">
    <action>Revise the user content and re-present it for approval.</action>
  </branch>
  <branch if="the user wants deeper exploration before approving" optional="true">
    <ask>Ask whether the user wants Advanced Elicitation or Party Mode for additional persona or journey exploration.</ask>
    <branch if="the user chooses Advanced Elicitation" optional="true">
      <action>
        Dispatch a dedicated subagent for Advanced Elicitation.
        <detail>
          Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
          Prompt the subagent with the current user-content draft and the instruction to deepen personas, user needs, or journey framing.
          Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
        </detail>
      </action>
    </branch>
    <branch if="the user chooses Party Mode" optional="true">
      <action>
        Dispatch a dedicated subagent for Party Mode.
        <detail>
          Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
          Prompt the subagent with the current user-content draft and the instruction to critique it from multiple stakeholder perspectives.
          Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
        </detail>
      </action>
    </branch>
  </branch>
  <branch if="the user approves the draft" optional="true">
    <action>Save the approved user content to `{outputFile}` and update the workflow state for step 3 completion.</action>
    <handoff path="./step-04-metrics.md">Proceed to success-metrics definition.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-04-metrics.md
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
