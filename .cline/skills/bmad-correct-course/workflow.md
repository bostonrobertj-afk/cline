# workflow

## META

- Goal: manage significant sprint-time changes by assessing impact across project artifacts and producing a structured Sprint Change Proposal.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Treat this workflow as change-navigation and proposal authoring, not silent replanning.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Initialize the change-navigation workflow">
  <action>Load `**/project-context.md` if it exists and contains useful project-wide patterns or standards.</action>
  <ask>Ask what specific issue, change, or newly discovered problem requires course correction.</ask>
  <ask>
    Ask which collaboration mode the user wants:
    <detail>
      - `Incremental` (recommended): refine each proposal collaboratively
      - `Batch`: review the full proposal set at the end
    </detail>
  </ask>
  <action>Store the selected mode for use throughout the workflow.</action>
  <action>
    Verify access to the core planning artifacts needed for impact analysis.
    <detail>
      Check for:
      - PRD
      - current epics and stories
      - architecture documentation
      - UI/UX specifications
    </detail>
  </action>
  <branch if="the change trigger is still unclear after the initial question" optional="true">
    <ask>HALT and ask the user to provide specific details about what must change and why.</ask>
  </branch>
  <branch if="core project documents are unavailable" optional="true">
    <ask>HALT and ask the user to make the essential project documents accessible before impact analysis continues.</ask>
  </branch>
</step>

<step n="2" goal="Work through the change-analysis checklist">
  <action>Load `checklist.md` and use it as the systematic analysis framework for the remainder of this step.</action>
  <action>Work through each checklist section interactively with the user.</action>
  <action>
    Record status for each checklist item.
    <detail>
      - `[x] Done` -> completed successfully
      - `[N/A] Skip` -> not applicable to this change
      - `[!] Action-needed` -> requires attention or follow-up
    </detail>
  </action>
  <action>Maintain running notes of findings, impacts, and open questions discovered during checklist review.</action>
  <output>Present checklist progress after each major section.</output>
  <branch if="the checklist cannot be completed because of blockers or missing information" optional="true">
    <output>Identify the blocking issues clearly.</output>
    <ask>Work with the user to resolve the blockers before the workflow continues.</ask>
  </branch>
</step>

<step n="3" goal="Draft explicit change proposals for affected artifacts">
  <action>Translate the checklist findings into concrete edit proposals for each affected artifact.</action>
  <action>
    Draft story-level changes with before-and-after wording and rationale.
    <detail>
      Include the story ID, the section being modified, the current text, the proposed text, and the rationale for the change.
    </detail>
  </action>
  <action>
    Draft PRD updates with exact affected sections, current content, proposed changes, and impact on scope or requirements.
  </action>
  <action>
    Draft architecture updates with the affected components, patterns, technology choices, and ripple effects.
  </action>
  <action>
    Draft UI/UX updates with the affected screens, components, flows, and user-experience implications.
  </action>
  <branch if="mode is Incremental" optional="true">
    <output>Present each edit proposal individually as it is drafted.</output>
    <ask>Ask whether to approve, edit, or skip each proposal: `[a] Approve`, `[e] Edit`, `[s] Skip`.</ask>
    <action>Iterate on each proposal based on the user's feedback before moving to the next one.</action>
  </branch>
  <branch if="mode is Batch" optional="true">
    <action>Collect all proposals and defer presentation until the end of this step.</action>
  </branch>
</step>

<step n="4" goal="Compile the Sprint Change Proposal document">
  <action>
    Build the Sprint Change Proposal document at `{default_output_file}`.
    <detail>
      Include:
      - Issue Summary
      - Impact Analysis
      - Recommended Approach
      - Detailed Change Proposals
      - Implementation Handoff
    </detail>
  </action>
  <action>
    Populate the Issue Summary with the triggering problem, discovery context, and supporting evidence.
  </action>
  <action>
    Populate the Impact Analysis with epic impact, story impact, artifact conflicts, and technical implications.
  </action>
  <action>
    Populate the Recommended Approach with the chosen path forward, rationale, risk, and expected delivery impact.
    <detail>
      Typical recommendation shapes:
      - direct adjustment
      - potential rollback
      - MVP review or scope reduction
    </detail>
  </action>
  <action>
    Populate the Detailed Change Proposals section by grouping the approved proposals by artifact type.
  </action>
  <action>
    Populate the Implementation Handoff section with scope classification, recipients, responsibilities, and success criteria.
    <detail>
      Scope classes:
      - `Minor`
      - `Moderate`
      - `Major`
    </detail>
  </action>
  <output>Present the completed Sprint Change Proposal to the user.</output>
  <ask>Ask whether to continue with the proposal as written or edit it: `[c] Continue`, `[e] Edit`.</ask>
</step>

<step n="5" goal="Approve and route the final proposal">
  <ask>Ask whether the user approves the Sprint Change Proposal for implementation: `yes`, `no`, or `revise`.</ask>
  <branch if="the user responds `no` or `revise`" optional="true">
    <action>Gather the specific feedback about what needs to change.</action>
    <branch if="the requested changes affect the detailed edit proposals" optional="true">
      <goto step="3" />
    </branch>
    <branch if="the requested changes affect the overall proposal framing or recommendation" optional="true">
      <goto step="4" />
    </branch>
  </branch>
  <branch if="the user approves the proposal" optional="true">
    <action>Finalize the Sprint Change Proposal document.</action>
    <action>
      Determine the change scope classification.
      <detail>
        - `Minor` -> can be implemented directly by the development team
        - `Moderate` -> requires backlog reorganization and PO/SM coordination
        - `Major` -> requires a broader PM/Architect replan
      </detail>
    </action>
    <branch if="scope is Minor" optional="true">
      <output>Route the result to the development team for direct implementation.</output>
      <output>Deliver finalized edit proposals and implementation tasks.</output>
    </branch>
    <branch if="scope is Moderate" optional="true">
      <output>Route the result to the Product Owner and Scrum Master.</output>
      <output>Deliver the Sprint Change Proposal plus a backlog-reorganization plan.</output>
    </branch>
    <branch if="scope is Major" optional="true">
      <output>Route the result to the Product Manager and Solution Architect.</output>
      <output>Deliver the complete Sprint Change Proposal plus an escalation notice.</output>
    </branch>
    <output>Confirm the chosen handoff path and next steps with the user.</output>
  </branch>
</step>

<step n="6" goal="Close the workflow">
  <output>
    Summarize the workflow execution.
    <detail>
      Include:
      - issue addressed: `{{change_trigger}}`
      - change scope: `{{scope_classification}}`
      - artifacts modified: `{{list_of_artifacts}}`
      - routed to: `{{handoff_recipients}}`
    </detail>
  </output>
  <output>
    Confirm that the deliverables were produced.
    <detail>
      - Sprint Change Proposal document
      - specific edit proposals with before/after wording
      - implementation handoff plan
    </detail>
  </output>
  <output>Report workflow completion to the user with a concise completion message.</output>
  <output>Remind the user of the success criteria and next steps for the implementation team.</output>
</step>

## CHECKPOINT

After ensuring that all task list items are complete (one-by-one, in order, using the complete_workflow_item tool),
Use the attempt_completion tool to send a final message to the user informing them that this workflow is complete, then HALT and await further instruction.
## ADVISORY

- Use `checklist.md` as the analysis framework, but keep the workflow prompt self-contained.
- Keep the workflow collaborative and explicit about impact across PRD, epics, architecture, and UX.
- Treat alternative branches and scope routes as conditional, non-simultaneous paths.
