# step 05 patterns

## META

- Goal: define implementation patterns and consistency rules that prevent drift between different implementation agents.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Focus on consistency patterns rather than new product requirements.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Identify potential conflict points">
  <action>
    Identify the areas where different agents could make incompatible choices.
    <detail>
      Typical areas:
      - naming conventions
      - file and directory structure
      - API formats
      - data formats
      - event and state conventions
      - process patterns such as error handling or loading states
    </detail>
  </action>
</step>

<step n="2" goal="Facilitate the key pattern decisions">
  <ask>Ask the user to choose preferred patterns for the highest-conflict areas first.</ask>
  <action>
    Capture the selected standards clearly.
    <detail>
      Example categories:
      - database naming
      - API naming
      - code naming
      - project organization
      - response and error formats
    </detail>
  </action>
</step>

<step n="3" goal="Generate pattern content and present the collaboration menu">
  <output>Present the drafted implementation-patterns content for the architecture document.</output>
  <ask>Ask whether the user wants Advanced Elicitation, Party Mode, or Continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current implementation-pattern draft and the instruction to explore additional consistency rules and edge cases.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
    <ask>Ask whether to accept the returned pattern refinements before returning to the menu.</ask>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current implementation-pattern draft and the instruction to review implementation-pattern trade-offs from multiple perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
    <ask>Ask whether to accept the returned pattern refinements before returning to the menu.</ask>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Append the finalized implementation patterns to `{planning_artifacts}/architecture.md`.</action>
    <action>Update workflow state so Step 5 is complete.</action>
    <handoff path="./step-06-structure.md" />
  </branch>
</step>

## CHECKPOINT

Do not save the pattern rules until the user chooses Continue.

## ADVISORY

- Prioritize the patterns most likely to cause implementation conflicts if left unspecified.
- Make the standards concrete enough for multiple agents to follow consistently.
