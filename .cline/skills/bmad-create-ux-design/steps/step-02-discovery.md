# step 02 discovery

## META

- Goal: Understand the project context, users, and UX challenges before making design decisions.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Review the loaded context and validate understanding">
  <action>Summarize the key insights already available from the loaded brief, PRD, and supporting context.</action>
  <ask>Ask the user whether that summary matches their understanding and what corrections or additions are needed.</ask>
</step>

<step n="2" goal="Fill in missing context where documents are incomplete">
  <branch if="the loaded documentation is missing important product or user context" optional="true">
    <ask>Ask what is being built, who it is for, what makes it special, and what the main user action or goal is.</ask>
  </branch>
</step>

<step n="3" goal="Explore the user and product context more deeply">
  <ask>Ask what problem users are trying to solve, what frustrates them today, and what would make them say the product is exactly what they needed.</ask>
  <action>Identify two or three key UX challenges and notable design opportunities based on the discussion.</action>
  <detail>Focus on UX-relevant framing rather than generic product-summary prose.</detail>
</step>

<step n="4" goal="Draft, review, and save the project-understanding section">
  <output>Prepare the project-understanding content that will be added to the UX design specification.</output>
  <ask>Present the content and ask whether the user wants Advanced Elicitation, Party Mode, or to continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current discovery draft and the instruction to deepen user, product, and UX framing before the next step.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current discovery draft and the instruction to critique it from multiple stakeholder perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Save the approved discovery content, append this step to `stepsCompleted`, and persist the updated workflow state.</action>
    <handoff path="./step-03-core-experience.md">Proceed to core-experience definition.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Use the loaded source documents to reduce redundant questioning, but do not assume missing UX-critical details.
