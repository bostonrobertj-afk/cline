---
wipFile: '{implementation_artifacts}/tech-spec-wip.md'
---

# Step 1: Analyze Requirement Delta

## META

- Progress: Step 1 of 4
- Next: Deep Investigation
- Focus on the requirement delta and scope.
- Speak in the configured communication language.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Resolve work-in-progress state">
  <action>Check whether {wipFile} exists.</action>
  <branch if="wip file exists" optional="true">
    <output>Found a tech-spec in progress.</output>
    <detail>
      Read the frontmatter and extract `title`, `slug`, and `stepsCompleted`.
      Report the current step progress as `lastStep = max(stepsCompleted)`.
    </detail>
    <ask>Do you want to continue the current tech-spec or archive it and start something new?</ask>
    <detail>Use `[Y]` to continue and `[N]` to archive or start fresh.</detail>
    <branch if="user chooses continue" optional="true">
      <detail>Route directly to the next needed step based on `stepsCompleted`.</detail>
      <branch if="stepsCompleted = [1]" optional="true">
        <goto step="2" />
      </branch>
      <branch if="stepsCompleted = [1, 2]" optional="true">
        <goto step="3" />
      </branch>
      <branch if="stepsCompleted = [1, 2, 3]" optional="true">
        <goto step="4" />
      </branch>
    </branch>
    <branch if="user chooses archive and start fresh" optional="true">
      <action>Rename {wipFile} to {implementation_artifacts}/tech-spec-{slug}-archived-{date}.md.</action>
      <detail>Then continue with the new-request path in this step.</detail>
      <goto step="2" />
    </branch>
  </branch>
</step>

<step n="2" goal="Gather the initial request and orient quickly">
  <branch if="wip file does not exist or the current file was archived" optional="true">
    <ask>What are we building today?</ask>
    <detail>Do not ask detailed questions yet. Gather just enough to know where to look.</detail>
  </branch>
  <action>Do a rapid orient scan to understand the landscape.</action>
  <detail>
    Check {implementation_artifacts} and {planning_artifacts} for PRDs, architecture docs, epics, and research.
    Check for `**/project-context.md` and skim it if present.
    Search for any existing stories or specs related to the request.
  </detail>
  <branch if="user mentioned specific code or features" optional="true">
    <action>Search for the relevant files, classes, or functions and note the visible patterns and file locations.</action>
  </branch>
  <branch if="no relevant code is found" optional="true">
    <action>Identify the likely target directory and the standard project utilities or boilerplate that should be used.</action>
  </branch>
</step>

<step n="3" goal="Ask informed questions and confirm the core understanding">
  <action>Ask clarifying questions informed by the quick scan.</action>
  <detail>
    Adapt the questions to {user_skill_level}.
    Ask about architecture, patterns, constraints, and any existing docs that should shape the work.
  </detail>
  <ask>Confirm the title, slug, problem statement, solution, in-scope items, and out-of-scope items before proceeding.</ask>
  <detail>Present the captured understanding back to the user so they can approve it.</detail>
</step>

<step n="4" goal="Initialize the WIP file and present the checkpoint menu">
  <action>Create the tech-spec WIP file from `../tech-spec-template.md`.</action>
  <detail>
    Populate frontmatter with `title`, `slug`, `created`, `status: in-progress`, `stepsCompleted: [1]`, `tech_stack: []`, `files_to_modify: []`, `code_patterns: []`, and `test_patterns: []`.
  </detail>
  <detail>Fill the Overview section with the problem statement, solution, and scope.</detail>
  <detail>Fill the Context for Development section with the technical preferences and constraints gathered during discovery.</detail>
  <output>Created: {wipFile}</output>
  <detail>Capture the title, problem, and scope in the user-facing summary before continuing.</detail>
  <output>Display the checkpoint menu for this step.</output>
  <ask>Choose [A] Advanced Elicitation, [P] Party Mode, or [C] Continue to Deep Investigation (Step 2 of 4).</ask>
  <branch if="user chooses A" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current tech-spec draft from `{wipFile}`, the current title and scope, and the instruction to deepen or clarify the draft before Step 2.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
    <detail>If the user accepts the improvements, update the WIP file and redisplay the menu.</detail>
  </branch>
  <branch if="user chooses P" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current tech-spec draft from `{wipFile}`, the current title and scope, and the instruction to critique and improve the draft from multiple perspectives.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
    <detail>If the user accepts the changes, update the WIP file and redisplay the menu.</detail>
  </branch>
  <branch if="user chooses C" optional="true">
    <goto step="2" />
  </branch>
  <detail>If the user asks an unrelated question at the menu, answer briefly and redisplay the menu.</detail>
</step>
