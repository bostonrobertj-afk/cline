# step 07 validation

## META

- Goal: validate the complete architecture for coherence, coverage, and implementation readiness.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Focus on identifying real architectural gaps or conflicts before implementation begins.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Validate the architecture for coherence, coverage, and readiness">
  <action>
    Validate architectural coherence.
    <detail>
      Check:
      - technology compatibility
      - decision consistency
      - pattern alignment
      - structure alignment
    </detail>
  </action>
  <action>
    Validate requirement coverage.
    <detail>
      Check:
      - epic or requirement support
      - cross-epic dependencies
      - non-functional requirement support
      - architectural gaps
    </detail>
  </action>
  <action>
    Validate implementation readiness.
    <detail>
      Check:
      - decision completeness
      - pattern completeness
      - structure completeness
      - agent implementability
    </detail>
  </action>
</step>

<step n="2" goal="Classify and address validation issues">
  <action>Classify validation issues as critical, important, or minor.</action>
  <branch if="critical issues are found" optional="true">
    <output>Present the critical issues and explain that they should be resolved before implementation.</output>
    <ask>Ask how the user wants to resolve the critical issues.</ask>
  </branch>
  <branch if="important issues are found" optional="true">
    <output>Present the important issues and explain that resolving them would make implementation smoother.</output>
    <ask>Ask whether the user wants to address them now.</ask>
  </branch>
  <branch if="minor issues are found" optional="true">
    <output>Present the minor improvement suggestions as optional refinements.</output>
    <ask>Ask whether the user wants to address any of them now.</ask>
  </branch>
</step>

<step n="3" goal="Generate validation content and present the collaboration menu">
  <output>Present the drafted validation summary and readiness assessment.</output>
  <ask>Ask whether the user wants Advanced Elicitation, Party Mode, or Continue.</ask>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current validation summary and the instruction to work through the hardest validation concerns.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
    <ask>Ask whether to accept the returned improvements before returning to the menu.</ask>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current validation summary and the instruction to review readiness concerns from multiple perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
    <ask>Ask whether to accept the returned refinements before returning to the menu.</ask>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Append the finalized validation section to `{planning_artifacts}/architecture.md`.</action>
    <action>Update workflow state so Step 7 is complete.</action>
    <handoff path="./step-08-complete.md" />
  </branch>
</step>

## CHECKPOINT

Do not finalize the validation section until the user chooses Continue.

## ADVISORY

- Call out blocking issues directly instead of smoothing them over.
- Treat validation as the final readiness gate before completion.
