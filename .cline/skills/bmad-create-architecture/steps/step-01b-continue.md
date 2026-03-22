# step 01b continue

## META

- Goal: analyze existing architecture progress and help the user resume at the right point.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Preserve existing architecture work unless the user explicitly chooses to restart.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Analyze the current architecture document state">
  <action>
    Read the existing architecture document completely.
    <detail>
      Analyze:
      - `stepsCompleted`
      - `inputDocuments`
      - `lastStep`
      - current sections and headings
      - incomplete areas, placeholders, or TODOs
    </detail>
  </action>
</step>

<step n="2" goal="Present a continuation summary">
  <output>
    Summarize the current architecture progress.
    <detail>
      Include:
      - steps completed
      - last step worked on
      - loaded input documents
      - incomplete or placeholder areas if any
    </detail>
  </output>
</step>

<step n="3" goal="Ask how the user wants to continue">
  <ask>Ask whether to resume from the last step, continue to the next logical step, review the remaining steps, or start over.</ask>
  <branch if="the user chooses resume" optional="true">
    <action>Identify the next unfinished step from `stepsCompleted` and current content state.</action>
  </branch>
  <branch if="the user chooses continue to the next logical step" optional="true">
    <action>Analyze the document quality and select the next appropriate step based on what is complete versus incomplete.</action>
  </branch>
  <branch if="the user asks for an overview of remaining steps" optional="true">
    <output>Summarize the remaining architecture steps and let the user pick one.</output>
  </branch>
  <branch if="the user wants to start over" optional="true">
    <ask>Ask for explicit confirmation before deleting existing architecture work.</ask>
    <branch if="the user confirms restart" optional="true">
      <action>Delete the existing architecture document.</action>
      <handoff path="./step-01-init.md" />
    </branch>
    <branch if="the user declines restart" optional="true">
      <output>Return to the continuation options.</output>
    </branch>
  </branch>
</step>

<step n="4" goal="Route to the selected continuation point">
  <branch if="the next step is context analysis" optional="true">
    <handoff path="./step-02-context.md" />
  </branch>
  <branch if="the next step is starter evaluation" optional="true">
    <handoff path="./step-03-starter.md" />
  </branch>
  <branch if="the next step is architectural decisions" optional="true">
    <handoff path="./step-04-decisions.md" />
  </branch>
  <branch if="the next step is implementation patterns" optional="true">
    <handoff path="./step-05-patterns.md" />
  </branch>
  <branch if="the next step is project structure" optional="true">
    <handoff path="./step-06-structure.md" />
  </branch>
  <branch if="the next step is validation" optional="true">
    <handoff path="./step-07-validation.md" />
  </branch>
  <branch if="the next step is completion" optional="true">
    <handoff path="./step-08-complete.md" />
  </branch>
</step>

## CHECKPOINT

Do not route forward until the user has explicitly chosen how to continue.

## ADVISORY

- Preserve existing document content and progress state unless the user restarts.
- Be explicit about why a particular next step was chosen.
