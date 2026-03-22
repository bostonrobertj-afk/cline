# workflow

## META

- Goal: Execute story implementation from a ready-for-dev story file while keeping sprint status and story state in sync.
- Halt whenever user input, confirmation, or workflow gating is required.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve the stable placeholders used by this workflow:

- `{project_name}`
- `{user_name}`
- `{communication_language}`
- `{document_output_language}`
- `{user_skill_level}`
- `{implementation_artifacts}`
- `{date}`

### Dynamic Workflow State

- `{{story_path}}` = explicit story path supplied by the user or discovered during step 1

### Context Paths

- `{project_context}` = `**/project-context.md` when present

## EXECUTION

<step n="1" goal="Find the next ready story and load it" tag="sprint-status">
  <action>Use `{{story_path}}` directly if the user already provided one.</action>
  <branch if="a sprint-status file exists" optional="true">
    <action>Read the complete sprint-status file and find the first story marked `ready-for-dev` that is not an epic or retrospective.</action>
    <branch if="no ready-for-dev story is found" optional="true">
      <output>Present the available options and ask the user whether to create a story, validate a story, provide a path, or inspect sprint status.</output>
      <ask>Choose an option or provide a story file path.</ask>
    </branch>
  </branch>
  <branch if="no sprint-status file exists" optional="true">
    <action>Search the implementation artifacts for story files and pick a ready-for-dev story if one exists.</action>
    <branch if="no ready-for-dev story is found" optional="true">
      <output>Present the available options and ask the user what to do next.</output>
      <ask>Choose an option or provide a story file path.</ask>
    </branch>
  </branch>
  <action>Read the complete story file, extract the story key, and identify the first incomplete task.</action>
  <detail>
    If the story file is inaccessible or the remaining task is ambiguous, halt and ask the user for clarification before proceeding.
  </detail>
</step>

<step n="2" goal="Load project context and story information">
  <action>Load `{project_context}` if it exists and parse the story sections needed for implementation.</action>
  <output>Confirm that the story and project context are loaded and ready for implementation.</output>
</step>

<step n="3" goal="Detect review continuation and extract review context">
  <action>Check whether the story includes a senior developer review and review follow-up items.</action>
  <branch if="a prior review exists" optional="true">
    <output>Summarize the review outcome, action counts, and priorities.</output>
  </branch>
  <branch if="no prior review exists" optional="true">
    <output>Summarize the story status and first incomplete task.</output>
  </branch>
</step>

<step n="4" goal="Mark the story in progress" tag="sprint-status">
  <branch if="a sprint-status file exists" optional="true">
    <action>Update the story status to `in-progress` when appropriate and store the current sprint state for later use.</action>
  </branch>
  <branch if="no sprint-status file exists" optional="true">
    <output>Note that progress will be tracked in the story file only.</output>
  </branch>
</step>

<step n="5" goal="Implement the current task following the story file sequence">
  <critical>Only implement work that maps to the story file tasks and subtasks.</critical>
  <action>Write or update tests first when the task requires them, implement the minimum change, and refactor while keeping tests green.</action>
  <action>Document the approach in the story file's Dev Agent Record.</action>
  <branch if="new dependencies are required" optional="true">
    <ask>Ask the user for approval before introducing new dependencies.</ask>
  </branch>
  <branch if="required configuration is missing" optional="true">
    <ask>Ask the user to provide the missing configuration before continuing.</ask>
  </branch>
</step>

<step n="6" goal="Author comprehensive tests">
  <action>Create or update unit, integration, and E2E tests as required by the task and acceptance criteria.</action>
</step>

<step n="7" goal="Run validations and tests">
  <action>Determine the repo's test command and run the relevant test suite, plus lint or quality checks if configured.</action>
  <branch if="regressions or test failures occur" optional="true">
    <ask>Halt and request guidance if the failure is not obvious to fix quickly.</ask>
  </branch>
</step>

<step n="8" goal="Validate the completed task and mark it complete">
  <action>Verify the tests exist and pass, the acceptance criteria are satisfied, and the story file is updated with the completed task, file list, and completion notes.</action>
  <branch if="review follow-up tasks exist" optional="true">
    <action>Mark the corresponding review follow-up items and review action items as resolved.</action>
  </branch>
  <action>Save the story file and continue to the next incomplete task, or proceed to completion if none remain.</action>
</step>

<step n="9" goal="document files created, deleted, or modified during this run">
  <action>Update the `{{story_path}}` file's "File List" section with a complete list of all files that you created, deleted, or modified while executing this story.</action>
</step>

<step n="10" goal="Mark the story ready for review" tag="sprint-status">
  <action>Re-scan the story file, run the full regression suite, and confirm the definition-of-done checks pass.</action>
  <branch if="a sprint-status file exists" optional="true">
    <action>Update the story's sprint-status entry to `review` and save the file.</action>
  </branch>
  <output>Confirm the story status is ready for review.</output>
</step>

<step n="11" goal="Communicate completion and next steps">
  <action>Summarize the implementation, tests, files changed, and current story status for the user.</action>
  <output>Offer help with explanations, verification, or next steps such as code review.</output>
  <output>Remind the user to run bmad-code-review on the completed story before executing the next story</output>
</step>
