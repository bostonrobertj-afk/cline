# step 03 starter

## META

- Goal: evaluate starter templates and decide whether a starter should establish part of the architecture foundation.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Verify current starter options before recommending them.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Gather technical preferences and identify the primary technology domain">
  <ask>
    Ask about technical preferences that affect starter selection.
    <detail>
      Cover:
      - languages and frameworks
      - tools and libraries
      - platform or deployment preferences
      - team familiarity
    </detail>
  </ask>
  <action>Identify the primary technology domain such as web, mobile, backend, CLI, or full-stack.</action>
  <action>Factor in UX and product requirements that influence starter suitability.</action>
</step>

<step n="2" goal="Research and evaluate current starter options">
  <action>Research current, maintained starter templates relevant to the identified technology domain.</action>
  <action>
    Analyze what each promising starter provides.
    <detail>
      Compare:
      - language and TypeScript setup
      - styling choices
      - testing setup
      - linting and formatting
      - build tooling
      - deployment assumptions
    </detail>
  </action>
</step>

<step n="3" goal="Present the starter recommendation">
  <output>Explain that a starter can provide a strong architectural foundation and reduce low-level setup decisions.</output>
  <branch if="user_skill_level = expert" optional="true">
    <ask>Present the strongest starter option with its technical decisions and ask whether to use it.</ask>
  </branch>
  <branch if="user_skill_level = intermediate" optional="true">
    <ask>Present the strongest starter option in practical terms and ask whether to use it.</ask>
  </branch>
  <branch if="user_skill_level = beginner" optional="true">
    <ask>Present the strongest starter option in beginner-friendly terms and ask whether to use it.</ask>
  </branch>
</step>

<step n="4" goal="Generate starter content and present the collaboration menu">
  <branch if="the user is interested in a starter" optional="true">
    <action>Capture the exact current setup commands and the architectural decisions the starter would establish.</action>
  </branch>
  <branch if="the user does not want a starter" optional="true">
    <action>Record that the architecture will be built without a starter template.</action>
  </branch>
  <output>Present the starter decision content that will be added to the architecture document.</output>
  <ask>Ask whether the user wants Advanced Elicitation, Party Mode, or Continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current starter decision content and the instruction to explore unconventional or custom starter approaches.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
    <ask>Ask whether to accept the returned starter-related refinements before returning to the menu.</ask>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current starter decision content and the instruction to review starter trade-offs from multiple perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
    <ask>Ask whether to accept the returned trade-off insights before returning to the menu.</ask>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Append the finalized starter decision section to `{planning_artifacts}/architecture.md`.</action>
    <action>Update workflow state so Step 3 is complete.</action>
    <handoff path="./step-04-decisions.md" />
  </branch>
</step>

## CHECKPOINT

Do not save the starter decision until the user chooses Continue.

## ADVISORY

- Verify starter recommendations against current external options.
- Treat starter selection as a foundation decision, not a mandatory requirement.
