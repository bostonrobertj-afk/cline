# step 02 context

## META

- Goal: analyze the project requirements and generate the project-context section of the architecture document.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Focus on architectural implications of the loaded project documents, not implementation decisions yet.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Analyze the project requirements and constraints">
  <action>
    Review the loaded project documents for architectural implications.
    <detail>
      Analyze:
      - functional requirements
      - non-functional requirements
      - technical constraints
      - epic and story structure
      - UX implications when UX documents exist
    </detail>
  </action>
  <action>Assess project scale, complexity, integrations, compliance, and cross-cutting concerns.</action>
</step>

<step n="2" goal="Generate the project-context analysis content">
  <action>
    Draft the Project Context Analysis section for the architecture document.
    <detail>
      Include:
      - requirements overview
      - scale and complexity assessment
      - technical constraints and dependencies
      - cross-cutting concerns
    </detail>
  </action>
</step>

<step n="3" goal="Present the context analysis and collaboration menu">
  <output>Present the drafted Project Context Analysis content to the user.</output>
  <ask>Ask whether the user wants Advanced Elicitation, Party Mode, or Continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current context analysis and the instruction to deepen or clarify the architecture-relevant implications.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
    <ask>Ask whether to accept the returned enhancements before returning to the A/P/C menu.</ask>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current context analysis and the instruction to critique it from multiple stakeholder perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
    <ask>Ask whether to accept the returned improvements before returning to the A/P/C menu.</ask>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Append the final Project Context Analysis to `{planning_artifacts}/architecture.md`.</action>
    <action>Update workflow state so Steps 1 and 2 are complete.</action>
    <handoff path="./step-03-starter.md" />
  </branch>
</step>

## CHECKPOINT

Do not save the generated context analysis until the user chooses Continue.

## ADVISORY

- Keep the analysis grounded in the loaded documents.
- Use elicitation and party mode only as optional refinement loops.
