# workflow

## META

- Goal: manage significant changes during sprint execution by analyzing impact across project artifacts and producing a structured Sprint Change Proposal.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Load the change-management configuration and discover the relevant project artifacts">
  <action>
    Load the shared configuration from `{project-root}/_bmad/bmm/config.yaml` and resolve the values needed for this workflow.
    <detail>
      Resolve:
      - `project_name`
      - `user_name`
      - `communication_language`
      - `document_output_language`
      - `user_skill_level`
      - `implementation_artifacts`
      - `planning_artifacts`
      - `project_knowledge`
      - `date`
      - `default_output_file = {planning_artifacts}/sprint-change-proposal-{date}.md`
    </detail>
  </action>
  <action if="a `project-context.md` file exists">Load the project context file so the workflow can account for project-wide standards and constraints.</action>
  <action>
    Discover the relevant project artifacts needed for change-impact analysis.
    <detail>
      Search for:
      - PRD documents
      - epics and stories
      - architecture documentation
      - UX design documentation
      - tech specs
      - document-project knowledge when available
    </detail>
    <detail>
      For PRD, epics, architecture, UX, and tech specs:
      - prefer the whole document when both whole and sharded versions exist
      - if only a sharded version exists, load the `index.md` and all section files in that shard set
    </detail>
    <detail>
      For document-project knowledge:
      - load `{project_knowledge}/index.md` when it exists
      - then load only the sections relevant to the impacted areas instead of loading everything
    </detail>
    <detail>
      Use flexible matching for file names such as `prd.md`, `bmm-prd.md`, or `product-requirements.md`.
    </detail>
  </action>
  <ask if="PRD or epics cannot be found">Tell the user the workflow cannot proceed until the essential planning artifacts are available.</ask>
  <output>Act as a Scrum Master navigating change management with clear analysis, structured impact assessment, and actionable handoff guidance.</output>
</step>

<step n="2" goal="Confirm the triggering issue and establish the working mode">
  <ask>Ask what specific issue, discovery, or change trigger requires course correction.</ask>
  <action>Capture the triggering story or work item when one exists, along with the user’s description of the problem and the evidence behind it.</action>
  <ask>
    Ask the user which working mode they want for the change proposals.
    <detail>
      Present:
      - Incremental: refine each proposed change collaboratively
      - Batch: review the full proposal set at once
    </detail>
  </ask>
  <action>Store the selected mode for later proposal review and refinement.</action>
  <ask if="the triggering issue is still unclear">Tell the user the workflow cannot proceed without a clear explanation of what changed and why it matters.</ask>
</step>

<step n="3" goal="Execute the systematic change-impact checklist">
  <action>
    Load `./checklist.md` and work through it systematically with the user.
    <detail>
      Treat the checklist as the structured analysis framework for:
      - trigger and context understanding
      - epic impact assessment
      - artifact conflict analysis
      - path-forward evaluation
      - Sprint Change Proposal content
      - final review and handoff readiness
    </detail>
  </action>
  <action>
    Record checklist status as the analysis proceeds.
    <detail>
      Use:
      - `[x]` Done
      - `[N/A]` Skip
      - `[!]` Action-needed
    </detail>
  </action>
  <action>Maintain running notes of findings, impacts, open decisions, and blocked items as each checklist section is completed.</action>
  <output>Present progress updates after each major checklist section so the user can see how the change analysis is evolving.</output>
  <branch if="a checklist section reveals a blocker">
    <ask>Pause to resolve the blocker with the user before continuing the analysis.</ask>
  </branch>
</step>

<step n="4" goal="Draft explicit change proposals for every affected artifact">
  <action>
    Create concrete edit proposals from the checklist findings for each affected artifact.
    <detail>
      For story changes:
      - show old -> new text
      - include story ID and section name
      - include rationale
    </detail>
    <detail>
      For PRD changes:
      - specify the exact sections that need updates
      - show current versus proposed content
      - explain the impact on MVP scope and requirements
    </detail>
    <detail>
      For architecture changes:
      - identify affected components, patterns, and technology choices
      - describe diagram or structural updates needed
      - note ripple effects on related components
    </detail>
    <detail>
      For UI or UX changes:
      - reference the affected screens, flows, or components
      - describe the design or flow adjustments needed
      - connect the change to user-experience impact
    </detail>
  </action>
  <branch if="mode is Incremental">
    <action>Present each proposed change individually.</action>
    <ask>Ask whether to approve, edit, or skip each proposal before moving to the next one.</ask>
    <action>Iterate each proposal based on the user’s feedback until it is approved, edited, or intentionally skipped.</action>
  </branch>
  <branch if="mode is Batch">
    <action>Collect all proposed changes and hold them for a single batch review at the end of this step.</action>
  </branch>
</step>

<step n="5" goal="Generate the Sprint Change Proposal document">
  <action>
    Compile the full Sprint Change Proposal in `{default_output_file}`.
    <detail>
      Include:
      - Issue Summary
      - Impact Analysis
      - Recommended Approach
      - Detailed Change Proposals
      - Implementation Handoff
    </detail>
    <detail>
      The recommended approach should clearly identify whether the right path is:
      - direct adjustment
      - potential rollback
      - MVP review
      - or a hybrid path
    </detail>
    <detail>
      The implementation handoff should classify the change scope as:
      - Minor
      - Moderate
      - Major
    </detail>
  </action>
  <output>Present the complete Sprint Change Proposal to the user for review.</output>
  <ask>Ask whether the user wants to continue with this proposal or edit it further.</ask>
</step>

<step n="6" goal="Finalize approval and route the change proposal to the right owners">
  <ask>Ask whether the user approves the Sprint Change Proposal for implementation.</ask>
  <branch if="the user wants revisions">
    <action>Gather the user’s specific feedback on what should change.</action>
    <branch if="the revisions affect the detailed change proposals">
      <goto step="4" />
    </branch>
    <branch if="the revisions affect the proposal framing, recommendation, or handoff structure">
      <goto step="5" />
    </branch>
  </branch>
  <branch if="the user approves the proposal">
    <action>
      Finalize the Sprint Change Proposal and classify the change scope.
      <detail>
        Use:
        - Minor for direct implementation by the development team
        - Moderate for backlog reorganization with Product Owner or Scrum Master involvement
        - Major for fundamental replanning with Product Manager or Architect involvement
      </detail>
    </action>
    <branch if="scope is Minor">
      <output>Route the finalized proposal to the development team for direct implementation.</output>
    </branch>
    <branch if="scope is Moderate">
      <output>Route the proposal to Product Owner or Scrum Master ownership for backlog reorganization and implementation planning.</output>
    </branch>
    <branch if="scope is Major">
      <output>Route the proposal to Product Manager or Solution Architect ownership for strategic replanning and escalation.</output>
    </branch>
    <action>Update `sprint-status.yaml` when approved epic or story changes require the sprint plan to be adjusted.</action>
    <action>Document the handoff and next-step responsibilities clearly in the final proposal or execution log.</action>
  </branch>
</step>

<step n="7" goal="Close the workflow with a clear execution summary">
  <output>
    Summarize the completed workflow for the user.
    <detail>
      Include:
      - the issue addressed
      - the final change scope classification
      - the affected artifacts
      - the handoff recipients
      - the deliverables produced
    </detail>
  </output>
  <output>Confirm that the Sprint Change Proposal and the implementation handoff plan have been produced, then tell the user what happens next.</output>
</step>

## CHECKPOINT

Halt whenever the workflow requires user input on the triggering issue, working mode, checklist blockers, proposal review, or final approval before advancing.

## ADVISORY

- Speak in the configured `communication_language` and tailor conversation style to `user_skill_level`, but keep document outputs clear and actionable regardless of skill level.
- The workflow may load external project artifacts and `checklist.md` as supporting materials, but do not rely on the model having direct source-file visibility unless the workflow explicitly loads that artifact.
