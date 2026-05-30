# Quick Review Workflow Module Requirements

## Scope

These requirements define the runtime workflow module for the Quick Review workflow. The module must implement the source workflow at `docs/workflows/workflow-runtime/workflow-modules/quick-review/quick-review.md` within the workflow-runtime module system.

The module must carry forward applicable runtime workflow requirements from `docs/workflows/workflow-runtime/requirements.md` and must follow the implementation constraints in `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`.

Quick Review is a quality-control workflow. It reviews a completed Quick Dev implementation phase, using the Quick Spec artifact moved by Quick Dev into the selected project's `review` subfolder. It collects the reviewed commit hash from the user, instructs the AI agent to validate the last-completed phase, appends findings to the Quick Spec artifact when findings exist, revises the reviewed phase's tasks/subtasks as needed, and completes after successful `attempt_completion`.

The source workflow document is a migration source of truth only. The runtime module must not read, import, or depend on the source markdown file, legacy `.cline/workflow-config.yaml`, legacy prompt files, BMAD workflow package files, or any legacy workflow assets at runtime.

## Source Wording Preservation

All user-authored source wording identified in these requirements must be preserved exactly in runtime prompts, workflow forms, and user-visible workflow metadata, except for supported workflow token rendering. The implementation must not rewrite, summarize, or stylistically recast the required prompt text.

The source document's authoring labels, including `# Module metadata:`, `# Persona`, `# Prerequisite Files`, `# Tool Schema Override`, `# Focus Chain Tasks`, `# Workflow Steps`, `### Prompt`, and field-structure labels such as `Workflow Form 1:`, `Panel A:`, `Field:`, and `allowedActions/ Labels:`, are not AI-facing prompt content and must not appear in rendered model prompts.

Source references to workflow values must be represented in prompt templates using runtime-owned workflow token syntax:

- `workflow.spec_file` must become `{workflow.spec_file}`
- `workflow.commit_hash` must become `{workflow.commit_hash}`

Prompt code must not use local string replacement for workflow values.

The Quick Review source does not provide custom module-owned terminal-error wording. The Quick Review module must not invent custom user-visible error messages. Required-prerequisite failure, rejection, cancellation, and no-match behavior must use the shared runtime-owned prerequisite-file panels and messages, with the module providing only the prerequisite declaration values prescribed below.

## Workflow Identity

The Quick Review workflow definition must expose exactly this workflow identity:

- `name`: `quick-review`
- `displayName`: `quick review`
- `slashCommandName`: `quick-review`
- `useSkillName`: `quick-review`
- `projectSubfolder`: `review`
- `description`: `This workflow performs a thorough assessment of a completed implementation spec to ensure that the prescribed updates were implemented correctly. You should only run this workflow after a phase within an implementation spec has been implemented via the Quick Dev workflow, and the files touched during implementation have been staged and committed.`

The workflow must be activated through runtime workflow registration by `name`, slash command, and skill name. It must not add or preserve a `.md` activation alias.

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above as the workflow overview text.

## Persona

The Quick Review workflow must define exactly this persona:

- `name`: `Fred`
- `role`: `Quality Control`
- `identity`: `Coordinates quality review after implementation to ensure that code is functional and compliant before it ships to production.`
- `capabilities`: `QA findings triage & documentation`
- `communicationStyle`: `precise and detailed`
- `principles`: `lazily formatted and noncompliant code must never hit the production environment.`

The module must copy this persona into module-owned constants and must not read BMAD persona files or the source workflow markdown at runtime.

## Runtime-Owned Values

The Quick Review module must declare every supported workflow value key in `workflowValueKeys`, per the runtime workflow value requirements.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include a workflow value key named `spec_file`. This value must hold the absolute path to the selected Quick Spec prerequisite file after runtime-owned prerequisite resolution succeeds.

The module must include a workflow value key named `commit_hash`. This value must hold the submitted Commit Hash form value after Workflow Form 1 completes.

No other Quick Review workflow value keys are required by the source workflow. Additional workflow values must not be added unless a later requirements revision explicitly authorizes them.

The Quick Review module must not define AI-writable workflow values, and no Quick Review step may expose `set_workflow_values`.

Workflow values must remain JSON-safe, must be cleared during workflow teardown, and must participate in runtime-owned session resume behavior.

## Required Prerequisite File

The Quick Review workflow requires one selected-project prerequisite file before review work can begin:

| Prerequisite id | Requirement | Producing workflow | Project subfolder | Match | Workflow value key | Output document reference |
| --- | --- | --- | --- | --- | --- | --- |
| `spec_file` | required | `quick-spec` | `review` | exact filename `quick-spec.md` | `spec_file` | `none` |

The prerequisite must be declared in `WorkflowDefinition.prerequisiteFiles` and resolved through the runtime-owned `resolve_prerequisite_files` decision action.

The prerequisite declaration must use:

- `id`: `spec_file`
- `requirement`: `required`
- `producingWorkflowName`: `quick-spec`
- `projectSubfolderSegments`: `["review"]`
- `match.kind`: `exact_filename`
- `match.filename`: `quick-spec.md`
- `workflowValueKey`: `spec_file`
- `outputDocumentReference`: `none`

The prerequisite file is the Quick Spec artifact originally generated by the `quick-spec` workflow and moved into the selected project's `review` subfolder by the `quick-dev` workflow. Quick Review must consume the selected prerequisite path only; it must not allocate, initialize, rebuild, rename, move, or overwrite the Quick Spec artifact as a workflow-owned output.

Prerequisite discovery must resolve only under the selected project root and must target the selected project's `review` subfolder. It must not accept absolute paths supplied by the model, parent-directory escapes, or files outside the selected project.

If no required `quick-spec.md` file is discoverable, if the user rejects or cancels prerequisite selection, or if prerequisite selection fails, the workflow must not proceed to commit-hash collection, model-driven review work, Quick Spec edits, or completion.

## Runtime Artifacts And Output Documents

Quick Review must not define workflow-owned artifacts.

Quick Review must not define a document builder, output document value, artifact allocation route, artifact initialization route, `build_workflow_document` action, or any module-owned document template.

The reviewed Quick Spec artifact is an existing prerequisite file. Any findings appended to that file and any task/subtask revisions inside that file are model-driven edits performed through governed file tools during Step 2. They are not workflow-owned artifact generation.

## Workflow Forms

Quick Review must define one module-owned active-step workflow form for Step 1.

The approved Workflow Form Title (WorkflowFormDefinitionPayload.title) is: Quick Review

The form must use exactly this user-visible dictionary copy:

- `toolDictionaryTitle`: `Quick Review`
- `toolDictionaryMarkdown`: `You can get the commit hash by opening the github pane, ensuring "graph" is enabled, and right-clicking on the commit from the phase's implementation.`

The form must contain exactly one panel.

Panel A must use exactly this user-visible configuration:

- `title`: `Commit Hash`
- `promptMarkdown`: `Please provide the commit hash for the phase to be reviewed`
- field kind: `small_text`
- field required: `true`
- field label: `commit hash`
- allowed action: `submit`
- submit action label: `continue`

The form field that collects `commit hash` must persist its submitted value to the durable workflow value key `commit_hash`.

The source document does not prescribe helper text, placeholder text, static notices, `contentMarkdown`, or additional fields for this form. The module must not add any such user-visible form content unless a later requirements revision provides exact wording.

## Steps

The workflow must define exactly two steps:

| Step id | Order | Checklist label | Purpose |
| --- | --- | --- | --- |
| `step-1` | 1 | `Gather Commit Info` | Resolve the required Quick Spec prerequisite file, render Workflow Form 1, persist `commit_hash`, and transition to Step 2. |
| `step-2` | 2 | `Perform Quality Review` | Render the source-authored review prompt, allow the AI agent to inspect code/tests and edit the Quick Spec prerequisite file, and complete the workflow after successful `attempt_completion`. |

No additional Quick Review steps may be added unless a later requirements revision explicitly authorizes them.

## Step 1 Routing

After the shared selected-project entry form is submitted, Step 1 must first run the runtime-owned required-prerequisite resolution for `spec_file`.

If required-prerequisite resolution succeeds, Step 1 must render Workflow Form 1.

When Workflow Form 1 is completed through the `submit` action, runtime must persist the submitted commit hash to `commit_hash` and the workflow must transition to Step 2.

Step 1 must not render an AI-facing prompt, must not route to model-driven work, and must not route directly to workflow completion.

## Step 1 Tool Schema

Step 1 must expose an empty model-facing tool schema because it is runtime-driven through required-prerequisite resolution and Workflow Form 1.

The empty schema must be returned from a named export in `quickReviewToolSchemas.ts`. The workflow definition must delegate to that named export and must not define an inline empty array or local fallback body.

Step 1 must not expose any model-facing tools, including `execute_command`, file tools, `send_user_message`, `attempt_completion`, `ask_followup_question`, `workflow_progress_request`, `set_workflow_values`, backend-only workflow actions, artifact lifecycle tools, `use_subagents`, `use_skill`, MCP tools, or web tools.

## Step 2 Routing

Step 2 must route to a `project_prompt` action that renders the Step 2 prompt with `{workflow.spec_file}` and `{workflow.commit_hash}` materialized from workflow values.

Successful use of `attempt_completion` must emit `attempt_completion_succeeded`, and the Step 2 decision tree must route that event to `complete_workflow`.

Step 2 must not expose `workflow_progress_request`, and no Step 2 route may transition to any later step because Quick Review has no later step.

## Step 2 Prompt

Step 2 must render this exact AI-facing prompt text, with workflow value references converted to runtime-owned prompt-template tokens:

```text
You have been called inside a review workflow to ensure that an implemented project phase meets quality standards, was implemented as prescribed, and meets expectations for performance and functionality.
Identify the last-completed phase in the implementation spec and ask the user to confirm that your review should focus on that phase.
Implementation Spec: {workflow.spec_file}
Commit hash for the completed phase: {workflow.commit_hash}

Perform a line-by-line validation of tasks and subtasks within the assigned phase. For each task/subtask, verify that the prescribed revisions were implemented as intended by directly reviewing the relevant runtime code and tests. Do not rely on test outcomes alone; assess the code configuration associated with each task/subtask directly. If needed you can use CLI commands with the provided commit hash to identify the revisions made during phase implementation.

Next, ensure that the tasks/subtasks and their associated revisions did not miss any edge cases by performing the following analysis:

Identify every changed file, changed symbol, changed workflow value, changed tool/schema contract, changed route/action, changed persisted artifact, changed test fixture, changed validation path, changed UI surface, or changed configuration surface described by the review scope.

For each changed item, trace outward to the adjacent surfaces that could be affected:
   - callers and callees
   - imports and exports
   - type definitions and discriminated unions
   - schema builders and tool handlers
   - runtime routing and workflow values
   - persisted files, artifact metadata, and cleanup paths
   - prompt projection and continuation behavior
   - validation, error handling, retry, and terminal-error paths
   - tests and fixtures that claim to cover the behavior

Walk the boundary paths for each changed or adjacent surface. Focus on edges where values, states, files, or control flow transition:
   - missing else/default branches
   - null, empty, malformed, duplicate, stale, or missing values
   - renamed, moved, copied, or deleted files
   - partial success, retry, rollback, cancellation, timeout, or failed cleanup
   - ordering dependencies between route actions
   - stale cache, stale workflow values, or un-cleared session state
   - incompatible old callers, persisted data, or restored sessions
   - changed tests that no longer match runtime behavior

Ask, for each boundary path: “Does the current implementation actually handle this path?” Verify using the changed code and narrowly relevant adjacent code. Do not assume coverage from intent, naming, or happy-path tests.

Ask, for each changed item: “What nearby file, registration, type, schema, route, prompt, fixture, or cleanup path should have changed with this, but did not?” Treat missing adjacent updates as findings when supported by evidence.

Once review is complete, do the following:
1. Add your findings (if any) to {workflow.spec_file} at the bottom of the file with a markdown heading identifying the phase they pertain to. For each finding, include:
    - finding: a short title
    - description: a detailed explanation including:
     - what is wrong
     - the trigger condition
     - the likely consequence if not addressed
     - exact supporting code location with file path, start line, and end line for the smallest supporting line range
     - if the finding depends on multiple non-contiguous locations, include each cited location
     - what the cited code proves
2. Reopen, edit, delete, or add tasks and subtasks to the reviewed phase as needed so that a dev agent can take action based on your findings. Do not make code or test changes yourself. Do not make changes to the implementation spec beyond the task and/or subtask revisions necessary based on your findings.
3. Call attempt_completion and include:
    - A summary of your findings or statement that QA passed without findings
    - A summary of any changes made to the target phase based on findings, if applicable
    - A reminder to return to the dev agent who implemented the reviewed phase to complete new and reopened tasks/ subtasks, if applicable
    - A reminder to run the Quick Dev workflow in a fresh conversation thread for the next incomplete phase, if applicable (no findings and there are additional incomplete phases in {workflow.spec_file})

 #### workflow must end on successful use of attempt_completion
```

The rendered prompt must include the resolved prerequisite file path in place of every `{workflow.spec_file}` token and the submitted commit hash in place of `{workflow.commit_hash}`. It must not include unresolved `{workflow.*}` tokens after rendering.

The prompt must not include source authoring headings or labels outside the prompt body.

## Step 2 Tool Schema

Step 2 must expose exactly the model-facing tools needed for the source action list: read files, write files, send general messages, use `attempt_completion`, and run CLI commands.

The Step 2 tool schema must declare this exact ordered `ClineDefaultTool[]`:

1. `ClineDefaultTool.BASH`
2. `ClineDefaultTool.LIST_FILES`
3. `ClineDefaultTool.SEARCH`
4. `ClineDefaultTool.LIST_CODE_DEF`
5. `ClineDefaultTool.FILE_READ`
6. `ClineDefaultTool.FILE_READ_RANGE`
7. `ClineDefaultTool.APPLY_PATCH`
8. `ClineDefaultTool.FILE_NEW`
9. `ClineDefaultTool.SEND_USER_MESSAGE`
10. `ClineDefaultTool.ATTEMPT`

The projected Step 2 tool names must be exactly:

- `execute_command`
- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`
- `apply_patch`
- `write_to_file`
- `send_user_message`
- `attempt_completion`

The Step 2 tool schema must reuse registered shared/default tool specs from `ClineToolSet` for the approved model family. It must not hand-build or copy shared/default `ClineToolSpec` objects.

Step 2 must not expose:

- `workflow_progress_request`
- `ask_followup_question`
- `set_workflow_values`
- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`
- workflow-specific backend tools
- artifact lifecycle tools
- story planning or status tools
- `use_subagents`
- `use_skill`
- MCP tools
- web tools
- browser tools

The prompt instructs the AI agent to ask the user to confirm the phase under review. The source tool schema authorizes `send general message`, not `ask_followup_question`; therefore Step 2 must expose `send_user_message` and must not expose `ask_followup_question` unless the source workflow and these requirements are revised.

## Prompt Projection Requirements

The system prompt integration must project the active Quick Review step instructions and only the active step's tool schema.

For Step 1 prompt/tool projection:

- Step 1 must not project an AI-facing current-step prompt.
- Step 1 must project an empty model-facing tool schema.

For Step 2 prompt/tool projection:

- the projected prompt must include the rendered resolved `spec_file` path
- the projected prompt must include the rendered `commit_hash`
- the projected prompt must not include `{workflow.spec_file}`, `{workflow.commit_hash}`, `workflow.spec_file`, or `workflow.commit_hash`
- the projected prompt must not include source authoring headings or labels
- the projected tool schema must include `attempt_completion`
- the projected tool schema must include `send_user_message`
- the projected tool schema must not include `workflow_progress_request`
- the projected tool schema must not include `ask_followup_question`
- no later-step, non-Quick-Review, backend-only, artifact, story, subagent, MCP, web, or browser tool names may be projected

Prompt tests must assert stable behavioral invariants and rendered workflow-value substitution. They must not assert the full editable prompt prose verbatim.

## Registration Requirements

The Quick Review module must be exported from its module-local `index.ts` file and registered in `WorkflowRegistry.ts`.

The registry must resolve the module by:

- `quick-review` workflow name
- `quick-review` slash command
- `quick-review` skill name

The workflow must be covered by shipped slash-command tests.

## Test Requirements

The implementation must include focused unit tests for the Quick Review workflow definition that verify:

- workflow identity
- persona fields
- workflow value inventory and entry project value keys
- required prerequisite file declaration for `spec_file`, including `projectSubfolderSegments: ["review"]`, exact filename `quick-spec.md`, `producingWorkflowName: "quick-spec"`, `workflowValueKey: "spec_file"`, and `outputDocumentReference: "none"`
- absence of workflow-owned artifacts and document builders
- exactly two steps with the required ids, checklist labels, and order values
- Step 1 route sequence, including required-prerequisite resolution, Workflow Form 1 rendering, durable persistence of `commit_hash`, and transition to Step 2 after form completion
- Workflow Form 1 exact `toolDictionaryTitle`, `toolDictionaryMarkdown`, panel title, `promptMarkdown`, field kind, required flag, field label, allowed action, and submit action label
- Step 1 empty prompt shape and empty tool schema
- Step 2 route sequence, including `project_prompt` entry and `attempt_completion_succeeded` routing to `complete_workflow`
- Step 2 prompt shape and required workflow-token references
- source authoring headings and labels are not present in rendered prompts

The implementation must include focused unit tests for Quick Review tool schemas that verify:

- Step 1 exposes exactly no model-facing tools
- Step 2 exposes exactly the required Step 2 tool names in the required order
- Step 2 resolves all normal shared tools through registered shared/default tool specs
- each step excludes the forbidden tools listed in these requirements

The implementation must include prompt projection and registry coverage that verifies:

- active Quick Review prompt content is projected through the system-prompt integration
- active Quick Review tool schemas are projected only for the active step
- Step 2 prompt projection materializes `spec_file` and `commit_hash`
- `quick-review` activates through workflow registry lookup, slash command, and skill name
- no `.md` activation alias activates Quick Review

The implementation must include focused regression coverage showing that Quick Review does not add runtime-owned artifacts, document builders, specialized backend tools, AI-writable workflow values, or child workflow inheritance.

## Validation Requirements For The Future Action Plan

The action plan derived from these requirements must prescribe focused validation commands for the touched runtime and test layers, including:

- focused Quick Review workflow unit tests
- focused Quick Review tool-schema unit tests
- focused system-prompt integration coverage for Quick Review prompt/tool projection
- shipped slash-command or registry coverage for `quick-review`
- `npm run check-types`
- the repository lint or formatting gate required by current project guidance
- package/build validation if required by current project guidance for workflow module buildout

The action plan must also prescribe static guard checks that verify:

- no `.md` activation alias is registered for Quick Review
- no runtime code depends on `docs/workflows/workflow-runtime/workflow-modules/quick-review/quick-review.md` or any external authored workflow markdown file
- Quick Review does not expose `set_workflow_values`, `ask_followup_question`, `workflow_progress_request`, artifact lifecycle tools, `use_subagents`, `use_skill`, MCP tools, web tools, or browser tools
- Step 1 exposes no model-facing tools
- Step 2 exposes exactly the required model-facing tools
- Quick Review does not define workflow-owned artifacts, document builders, output document allocation, or specialized backend tools
- source authoring headings and labels do not appear in runtime prompt templates

The action plan must include a scope-diff check using both `git diff --name-only` and `git ls-files --others --exclude-standard`.
