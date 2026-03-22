# step 06 structure

## META

- Goal: define the complete project structure and key integration boundaries implied by the architecture.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Map requirements and decisions to a concrete structure that implementation agents can follow.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Map requirements and decisions to architectural components">
  <action>Map the main requirements, epics, or functional areas to modules, services, directories, and shared components.</action>
  <action>Identify cross-epic dependencies, shared capabilities, and core integration boundaries.</action>
</step>

<step n="2" goal="Define the project structure and boundaries">
  <action>
    Define the core project directory structure.
    <detail>
      Include:
      - root configuration files
      - source code organization
      - test organization
      - build and distribution areas
      - documentation locations
    </detail>
  </action>
  <action>Define the major API, service, data, and frontend communication boundaries.</action>
</step>

<step n="3" goal="Generate structure content and present the collaboration menu">
  <output>Present the drafted project structure and architectural-boundary content.</output>
  <ask>Ask whether the user wants Advanced Elicitation, Party Mode, or Continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current structure draft and the instruction to explore project-organization alternatives.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
    <ask>Ask whether to accept the returned structure refinements before returning to the menu.</ask>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current structure draft and the instruction to review structure trade-offs from different development perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
    <ask>Ask whether to accept the returned structure refinements before returning to the menu.</ask>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Append the finalized structure section to `{planning_artifacts}/architecture.md`.</action>
    <action>Update workflow state so Step 6 is complete.</action>
    <handoff path="./step-07-validation.md" />
  </branch>
</step>

## CHECKPOINT

Do not save the structure section until the user chooses Continue.

## ADVISORY

- Prefer a concrete, implementation-ready structure over abstract placeholders.
- Keep the structure aligned with the earlier decisions and patterns.
