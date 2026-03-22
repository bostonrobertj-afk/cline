# step 06 structure

## META

- Goal: define the complete project structure and key integration boundaries implied by the architecture.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Map requirements and decisions to a concrete structure that implementation agents can follow.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

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
    <action>Invoke `bmad-advanced-elicitation` to explore project-organization alternatives.</action>
    <ask>Ask whether to accept the returned structure refinements before returning to the menu.</ask>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>Invoke `bmad-party-mode` to review structure trade-offs from different development perspectives.</action>
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
