---
wipFile: '{implementation_artifacts}/tech-spec-wip.md'
---

# Step 4: Review & Finalize

## META

- Progress: Step 4 of 4
- Final step.
- Present the complete spec content and iterate until the user is satisfied.
- Speak in the configured communication language.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Load and present the complete spec">
  <action>Read {wipFile} completely and extract `slug` from frontmatter for later use.</action>
  <output>Here's your complete tech-spec. Please review:</output>
  <detail>Display the complete spec content, including all sections.</detail>
  <detail>
    Summarize the review status with the task count, acceptance criteria count, and files to modify count.
  </detail>
</step>

<step n="2" goal="Present the review menu and handle feedback">
  <ask>Choose [C] Continue, [E] Edit, [Q] Questions, [A] Advanced Elicitation, or [P] Party Mode.</ask>
  <branch if="user chooses C" optional="true">
    <action>Proceed to finalization if the spec meets the READY FOR DEVELOPMENT standard.</action>
  </branch>
  <branch if="user chooses E" optional="true">
    <action>Apply the requested edits to {wipFile} and re-present the affected sections.</action>
  </branch>
  <branch if="user chooses Q" optional="true">
    <output>Answer the user's questions and redisplay the review menu.</output>
  </branch>
  <branch if="user chooses A" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current spec content from `{wipFile}` and the instruction to improve clarity, completeness, and developer usefulness before finalization.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
    <detail>If the user accepts the improvements, update the spec and redisplay the review menu.</detail>
  </branch>
  <branch if="user chooses P" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current spec content from `{wipFile}` and the instruction to critique the plan from multiple perspectives before finalization.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
    <detail>If the user accepts the changes, update the spec and redisplay the review menu.</detail>
  </branch>
  <detail>
    If the spec does not yet meet the READY FOR DEVELOPMENT standard, point out the missing or weak sections and propose specific improvements.
  </detail>
</step>

<step n="3" goal="Finalize the spec">
  <branch if="user confirms the spec is good and it meets the READY FOR DEVELOPMENT standard" optional="true">
    <action>Update {wipFile} frontmatter to `status: 'ready-for-dev'` and `stepsCompleted: [1, 2, 3, 4]`.</action>
    <action>Rename {wipFile} to {implementation_artifacts}/tech-spec-{slug}.md.</action>
    <output>The spec has been finalized.</output>
  </branch>
</step>

<step n="4" goal="Present the final menu">
  <output>Tech-Spec Complete!</output>
  <detail>
    Saved to: {implementation_artifacts}/tech-spec-{slug}.md
  </detail>
  <output>Display the final menu with Advanced Elicitation, Adversarial Review, Begin Development, Done, and Party Mode.</output>
  <detail>
    Recommend running implementation in a fresh context and provide the quick-dev command for the final file.
  </detail>
  <ask>Choose [A], [R], [B], [D], or [P].</ask>
  <branch if="user chooses A" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the finalized spec content at `{implementation_artifacts}/tech-spec-{slug}.md` and the instruction to suggest high-value refinements only.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="user chooses R" optional="true">
    <action>
      Dispatch a dedicated subagent for adversarial review.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-review-adversarial-general"`.
        Prompt the subagent with `{implementation_artifacts}/tech-spec-{slug}.md` and tell it to perform a skeptical review of the finalized spec.
        Tell the subagent to return concise markdown findings with titles, evidence, and concrete risks.
      </detail>
    </action>
    <detail>If zero findings are returned, stop and request user guidance.</detail>
  </branch>
  <branch if="user chooses B" optional="true">
    <action>
      Dispatch a fresh implementation subagent.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-quick-dev"`.
        Prompt the subagent with `{implementation_artifacts}/tech-spec-{slug}.md` and tell it to begin the quick-dev workflow from that finalized tech spec in a fresh thread.
        Tell the subagent to acknowledge the spec path and continue implementation work in its own thread.
      </detail>
    </action>
  </branch>
  <branch if="user chooses D" optional="true">
    <output>All done. The tech-spec is ready at {implementation_artifacts}/tech-spec-{slug}.md.</output>
    <exit />
  </branch>
  <branch if="user chooses P" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the finalized spec content at `{implementation_artifacts}/tech-spec-{slug}.md` and the instruction to critique it from multiple perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
  </branch>
</step>
