# step 04 decisions

## META

- Goal: facilitate the remaining core architecture decisions that are not already fixed by the project context or starter choice.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Build on prior decisions instead of re-deciding what is already settled.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Identify the remaining architecture decisions">
  <action>Review the user preferences, project context, and starter decisions that have already been captured.</action>
  <action>
    Identify the remaining decision categories that still need explicit architectural choices.
    <detail>
      Typical categories:
      - data architecture
      - authentication and security
      - API and communication
      - frontend architecture
      - infrastructure and deployment
    </detail>
  </action>
</step>

<step n="2" goal="Facilitate collaborative decision making across the remaining categories">
  <ask>For each remaining category, present the key decision, its main options, and ask for the user's preference.</ask>
  <action>Record the chosen decision, rationale, and any notable trade-offs.</action>
  <branch if="the user wants deeper exploration of a decision" optional="true">
    <action>Provide deeper explanation of the options and their consequences before locking the decision.</action>
  </branch>
  <branch if="the user wants to defer a non-critical decision" optional="true">
    <action>Record the deferral explicitly so it is visible in the architecture document.</action>
  </branch>
</step>

<step n="3" goal="Generate decision content and present the collaboration menu">
  <output>Present the drafted architecture-decision content that will be appended to the document.</output>
  <ask>Ask whether the user wants Advanced Elicitation, Party Mode, or Continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current decision draft and the specific categories that need deeper exploration.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
    <ask>Ask whether to accept the elicited refinements before returning to the menu.</ask>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current decision draft and the instruction to review decision trade-offs from multiple perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
    <ask>Ask whether to accept the returned refinements before returning to the menu.</ask>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Append the finalized architectural decisions to `{planning_artifacts}/architecture.md`.</action>
    <action>Update workflow state so Step 4 is complete.</action>
    <handoff path="./step-05-patterns.md" />
  </branch>
</step>

## CHECKPOINT

Do not save the decision set until the user chooses Continue.

## ADVISORY

- Focus on unresolved decisions only.
- Keep the decisions explicit enough that later implementation agents cannot diverge silently.
