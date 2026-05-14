# Dev Story Workflow Module Requirements

## Scope

Build the product-owned `dev-story` workflow module using `/Users/robertboston/Documents/Cline/Workflows/dev-story.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use completed workflow module requirements only as structural references where they still align with the guide and current project requirements.

The dev-story workflow implements an existing story by executing the story document's prescribed tasks and subtasks, tracking task progress directly in the story file, moving the implemented story from the backlog folder to the review folder, updating the canonical story index, staging the implementation changes, and optionally committing the staged files.

The dev-story workflow must not create story identities, story filenames, story index entries, story files, remediation story entries, or review findings documents. Those responsibilities belong to upstream runtime-owned story planning, PI planning, create-story, and review workflows.

Do not rely on the source markdown workflow file, legacy BMAD workflow package files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime. Source files are migration references only.

## Source Verbiage Fidelity

The dev-story requirements must preserve the exact user-provided UI and AI prompt verbiage from `/Users/robertboston/Documents/Cline/Workflows/dev-story.md`.

The module must not invent, paraphrase, summarize, or add UI-visible panel titles, `promptMarkdown`, field labels, action labels, static notice content, helper text, descriptions, button labels, or AI prompt text.

If required UI-visible text or prompt text is missing from the source document, the module build must stop and request source-document clarification before action-plan or runtime implementation work proceeds.

## Workflow Identity

- `name`: `dev-story`
- `slashCommandName`: `dev-story`
- `useSkillName`: `dev-story`
- `displayName`: `dev-story`
- `description`: `In this workflow, a story's tasks and subtasks will be implemented through structured task execution. At the end of the workflow, the files touched during implementation will be staged and committed.`
- `persona`: `developer`
- `projectSubfolder`: `implementation`

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above as `entryPanel.promptMarkdown`.

## Persona

The module must copy the derived persona into module-owned constants and must not read `_bmad/bmm/agents/dev.md` or `/Users/robertboston/Documents/Cline/Workflows/dev-story.md` at runtime.

The module-owned persona must be a structured `WorkflowPersonaDefinition` for the mapped `developer` persona.

- `name` must be `Amelia`.
- `role` must be `Developer Agent`.
- `identity`: describe executing approved stories precisely and following team standards.
- `communicationStyle`: ultra-succinct, using file paths and acceptance-criteria or task IDs with no fluff.
- `capabilities`: story execution and code implementation.
- `principles`: all tests must pass before review and that every task and subtask must be covered with unit tests before being marked complete.


## Runtime-Owned Values

The dev-story module must define its workflow-owned value contract according to `FR-10a` through `FR-10c1`, `FR-21a`, and `FR-21b`.

The module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory per `FR-10c1`, `FR-35g1`, and `FR-35g2`.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`, per `FR-10j1` and `FR-10j2`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- `target_story`, the absolute path to the selected backlog story file
- `target_story_filename`, the selected story filename
- `selected_story_identity`, the selected story identity derived from the selected story filename
- `epic_identity`, the selected story's epic identity derived from the selected story identity
- `stories_index`, the derived `implementation/epic-{E}-stories.index.json` absolute path
- `selected_story_type`, the selected story type derived from the filename, either `primary` or `remediation`
- `story_general_instructions`, the content extracted from `## General Instructions`
- `story_objective`, the content extracted from `## Objective`
- `story_scope`, the content extracted from `## Scope`
- `story_scope_boundary`, the content extracted from `## Scope Boundary`
- `story_requirements`, the content extracted from `## Requirements`
- `story_issues`, the content extracted from `## Known Issues/ Risks/ Technical Debt`
- `story_task_inventory`, the parsed task and subtask inventory from `## Tasks`
- `current_story_task_id`, the task ID for the task currently being provided to the AI agent
- `unpermitted_file_paths`, the changed git paths not present in extracted allowed files
- `selected_unpermitted_file_paths`, the unpermitted file paths the user selected for inclusion
- `commit_staged_files`, the user's yes/no response on the commit confirmation panel

Any workflow form field whose submitted value must survive beyond form-local state must declare a durable workflow-value destination and persist through the runtime value seam, per `FR-39f` through `FR-39m`.

Workflow values must remain JSON-safe and preserve type/shape, per `FR-35i` through `FR-35k`. Prompt builders may render workflow values only through deterministic rendering, per `FR-35l`; runtime or tool code requiring string paths, identities, filenames, statuses, arrays, booleans, or object values must validate the expected type and shape per `FR-35m`.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state, per `FR-49a`, `FR-50`, and `FR-52` through `FR-52b`.

## AI-Writable Workflow Values

The dev-story module must not define AI-writable workflow values.

No dev-story step may expose `set_workflow_values`. Story selection, story frontmatter extraction, task inventory extraction, task progression, story index derivation, story status updates, story file movement, staging, and commit handling are runtime-owned deterministic behavior or governed backend tool behavior.

## Terminal Error Handling

When these requirements state that the workflow routes to `terminal_error`, the runtime must:

- stop the current workflow progression
- not transition to the next step
- not complete the workflow
- not perform later mutations after the failure point
- preserve any files, git index state, and workflow values already changed before the failure point unless the failing operation itself is atomic and can roll back safely
- show a user-visible error message that includes the failed operation name, relevant file path or story/task ID when applicable, the concrete reason, and the required user action when known

For AI-callable story task tools, invalid tool requests must return a model-visible tool failure with the same error-message detail and must not mutate the story file.

## Required Prerequisite File

The dev-story workflow requires one selected-project prerequisite file before model-driven work can begin:

| Prerequisite id | Requirement | Producing workflow | Project subfolder | Match | Workflow value key |
| --- | --- | --- | --- | --- | --- |
| `target_story` | required | `create-story` | `implementation/stories-backlog` | naming pattern `/^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/` | `target_story` |

The prerequisite must be declared in `WorkflowDefinition.prerequisiteFiles` and resolved through the runtime-owned `resolve_prerequisite_files` decision action, per `FR-20j6` through `FR-20j8`.

Prerequisite selection must not be implemented as a module-owned `selectorDiscovery` workflow form, and it must not mutate shared project-selection behavior.

Runtime-owned prerequisite discovery must resolve only under the selected project root and must target `implementation/stories-backlog`. It must not accept absolute paths, parent-directory escapes, or files outside the selected project.

If no required story file is discoverable or if the user rejects or cancels story selection, the workflow must inform the user that they must run the producing `create-story` workflow first and must not proceed to story parsing, model-driven work, story file movement, story index updates, staging, commit, or completion.

The prerequisite declaration must use `outputDocumentReference: "none"` because dev-story does not create a workflow output document that records selected prerequisite paths.

## Story Identity And Story Index Derivation

After `target_story` is selected, runtime/module logic must derive `target_story_filename` from the selected path basename.

Runtime/module logic must derive `selected_story_identity` from the selected filename:

- `Story-1-2.md` derives `1.2`
- `Remediation-story-1-2-1.md` derives `1.2.1`

Runtime/module logic must derive `epic_identity` from the first numeric segment of `selected_story_identity`:

- `1.2` derives epic `1`
- `1.2.1` derives epic `1`

Runtime/module logic must derive `selected_story_type` from the selected filename:

- `Story-{E}-{S}.md` derives `primary`
- `Remediation-story-{E}-{S}-{R}.md` derives `remediation`

Runtime/module logic must derive `stories_index` from the selected story filename as `implementation/epic-{E}-stories.index.json`, where `{E}` is `epic_identity`.

For example, `Story-1-2.md` and `Remediation-story-1-2-1.md` both derive `implementation/epic-1-stories.index.json`.

The dev-story workflow must not require `stories_index` as a prerequisite and must not ask the user to select a story index file. `stories_index` is a runtime-derived value.

The dev-story workflow may use the selected canonical story file as sufficient proof that upstream PI planning and create-story sequencing already occurred. It must still derive and validate `stories_index` before updating the story status in Step 4.

If the derived `stories_index` is missing, malformed, blocked by workspace path policy, or does not contain an entry whose `story_identity` and `story_file_name` match the selected story, Step 4 must route to `terminal_error` before moving the story file, staging files, committing files, or completing the workflow. The terminal error must identify the derived story index path, selected story identity, selected story filename, and the concrete validation failure.

## Story Document Parsing

After `target_story` is selected, Step 1 must read the target story document and extract these top-level sections:

- `## General Instructions` into `story_general_instructions`
- `## Objective` into `story_objective`
- `## Scope` into `story_scope`
- `## Scope Boundary` into `story_scope_boundary`
- `## Requirements` into `story_requirements`
- `## Known Issues/ Risks/ Technical Debt` into `story_issues`
- `## Tasks` into `story_task_inventory`

The parser must look for `## Tasks`. It must not look for or require the legacy heading `## Tasks / Subtasks`.

The parser must preserve the raw task and subtask lines exactly as written in the target story document when building prompt/tool output for the AI agent.

The parser must derive task IDs and subtask IDs from the story document. It must not generate task IDs or subtask IDs from array order, line order, or parser-created counters.

If a task or subtask line lacks a parseable explicit ID, the workflow must route to `terminal_error` instead of inventing an ID. The terminal error must identify the selected story file, the invalid task or subtask line, and the requirement that task and subtask IDs must be present in the story document.

The parser must identify completion state from the task and subtask checkbox markers in the story document. Completion state in the story document is the source of truth for Step 2 progression.

The parser must identify allowed files only from explicit allowed-file declarations attached to tasks or subtasks in the story document. It must not infer allowed files from prose, prompt text, edited files, git status, or AI tool calls.

If the completed story document contains a subtask without explicit allowed files, Step 4 must treat that subtask as contributing no allowed files. It must not infer paths for that subtask.

If any required frontmatter section is missing, Step 1 must route to `terminal_error` before model-driven work begins. The terminal error must identify the selected story file and the missing required heading.

If `## Tasks` is missing or contains no tasks, Step 1 must route to `terminal_error` before model-driven work begins. The terminal error must identify the selected story file and state that the `## Tasks` section is missing or empty.

## Entry And Steps

The shared entry `WorkflowForm` remains mandatory for user-facing main-agent workflow invocations. Workflow-specific entry copy must describe the dev-story workflow.

The module must define each workflow step as a `WorkflowStepDefinition` that satisfies the main workflow-runtime contract:

- `id` must use canonical `step-{stepNumber}` form and exactly match `stepNumber`, per `FR-29b1`.
- `stepNumber` must define the runtime step order.
- `checklistLabel` must define the focus-chain task text projected to the UI.
- `buildPromptSource` must provide module-owned prompt text per `FR-14a` through `FR-14g`.
- `buildToolSchema` must provide module-owned per-step tool schema per `FR-15` and `FR-35`.
- `decisionTree` must own step progression, form rendering, deterministic actions, transitions, model handoff, and completion behavior per `FR-16` and `FR-29`.
- Any workflow-form or deterministic operation selected by a step must follow `FR-39` through `FR-43`.
- Final-step completion must use workflow-runtime completion and teardown behavior per `FR-46` through `FR-49`.

The module must define these four steps, using these exact `checklistLabel` values:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Gather Inputs` | Resolve the required target-story prerequisite, derive story identity metadata, parse the selected story, persist extracted story frontmatter and task inventory, and transition to Step 2 only after valid story data exists. |
| `step-2` | 2 | `Execute Story Tasks` | Model-driven implementation step; provide story frontmatter and one task with subtasks at a time; expose story task progress tools; progress only after all tasks and subtasks are checked complete in the story document. |
| `step-3` | 3 | `Final User Recap` | Model-driven final recap step; expose `attempt_completion`; route `attempt_completion_succeeded` to Step 4. |
| `step-4` | 4 | `Update Project Records` | Runtime-driven finalization step; move the story file, update story index status, stage governed files, optionally collect user selection for unpermitted files, optionally commit, and complete the workflow. |

## Step 1: Gather Inputs

Step 1 must begin by resolving the `target_story` prerequisite.

After `target_story` is resolved, Step 1 must run deterministic module/runtime logic to:

- derive `target_story_filename`
- derive `selected_story_identity`
- derive `selected_story_type`
- derive `epic_identity`
- validate the selected story filename convention
- validate the selected story path remains under `implementation/stories-backlog`
- read and parse the target story document
- persist extracted story frontmatter and task inventory into workflow values

If deterministic story setup succeeds, Step 1 must transition to Step 2.

If deterministic story setup fails, Step 1 must route to a clear terminal error and must not enter model-driven work.

Step 1 must expose an empty model-facing tool schema.

## Step 2: Execute Story Tasks

Step 2 must enter model-driven work through a `project_prompt` decision action.

Step 2 `buildPromptSource` must construct the Step 2 prompt from module-owned code. The Step 2 prompt must preserve this exact source prompt text, with the listed placeholder labels populated from workflow values:

```text
You are tasked with implementing a story with a prescribed set of tasks and subtasks. You will be provided with the story's instructions and frontmatter, then will be provided with the assigned tasks one at a time. Once you've completed all subtasks for the provided task you will be provided with the next task.
You will use the following tools to manage your progress while implementing this story:
- story_task_complete: call this tool to mark a subtask complete. The tool will automatically mark a task complete once you complete all of it's subtasks.
- request_task_detail: call this tool to request the detailed instructions for a given task ID. This info is automatically provided when a task is completed and a new task is unlocked, but you can use this tool if you need the system to re-send that information at any time.
- show_incomplete_tasks: call this tool to request a list of incomplete tasks & subtasks. This tool does not provide detailed instructions; it only provides the list of tasks & subtasks with their IDs.

*** Story Frontmatter ***
General Instructions:
general_instructions

Objective:
story_objective

Scope:
story_scope

Scope Boundary:
story_scope_boundary

Requirements:
story_requirements

Known Issues/ Risks/ Technical Debt:
story_issues

**Continue task impelentation until instructed otherwise- when the final task is complete the next workflow step will unlock and further instructions will be provided.**

*** Current Story Task: ***
*** Conditional Prompting: ***
Runtime must provide the first task and it's subtasks exactly as they are written in the target story document. When all subtasks for the provided task are complete, Runtime must provide the next task from the story document in the same manner. Existing tool story_task_reminder can likely be updated to serve this purpose.
*** end conditional prompting block ***
```

The generated prompt must replace the placeholder labels with the corresponding workflow values:

- `general_instructions` renders `story_general_instructions`
- `story_objective` renders `story_objective`
- `story_scope` renders `story_scope`
- `story_scope_boundary` renders `story_scope_boundary`
- `story_requirements` renders `story_requirements`
- `story_issues` renders `story_issues`

The generated prompt must include the first incomplete task and that task's subtasks after `*** Current Story Task: ***`. The task and subtask text must be exactly the raw task/subtask text from the target story document.

Step 2 must expose model-facing tools sufficient for code implementation and story progress management. The Step 2 tool schema must include:

- governed file read/list/search tools needed to inspect the codebase
- governed file edit tools needed to implement the story
- governed command execution if required for story validation commands
- `story_task_complete`
- `request_task_detail`
- `show_incomplete_tasks`
- response tools needed to ask the user a question or send a user-visible message

Step 2 must not expose `story_notes_update`, `story_testing_complete`, `set_workflow_values`, `update_story_index_status`, `move_workflow_project_file`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, or `delete_workflow_artifact`.

The Step 2 progression rule is: all tasks and subtasks are marked as complete in the story file.

After any successful model-called `story_task_complete`, the workflow must evaluate the updated `## Tasks` completion state.

If the completed item does not complete its parent task, Step 2 must remain active and runtime must not automatically provide task detail again. The model may use `request_task_detail` if it needs task detail re-sent.

If the completed item completes its parent task and incomplete tasks remain, Step 2 must remain active and runtime must provide only the next unlocked task and that task's subtasks. This next-task rendering must use the same task-detail formatter as `story_task_reminder`, and runtime must not resend the full Step 2 prompt.

If all tasks and subtasks are complete, Step 2 must transition to Step 3.

Step 2 must not rely on `activeStoryTaskId`, `activeStorySubtaskIds`, `lastPromptedStoryTaskKey`, legacy focus-chain prompt injection, placeholder workflow state, or managed-workflow state for task prompting or progression.

## Story Task Tools

The dev-story module build must update or add story task tools so they operate against the active runtime `dev-story` workflow session and selected `target_story`.

All story task tools must read the target story document from the active workflow value `target_story`. They must not accept an arbitrary story path from the AI model.

All story task tools must parse `## Tasks`, not `## Tasks / Subtasks`.

All story task tools must derive task IDs and subtask IDs from the target story document. They must not generate task IDs or subtask IDs from array order, line order, or parser-created counters.

### `story_task_reminder`

`story_task_reminder` must read the target story document and return the current incomplete task detail.

The current incomplete task detail must include:

- the task ID from the story document
- the raw task line exactly as written
- each subtask ID under that task from the story document
- each raw subtask line exactly as written

`story_task_reminder` must not return tasks from `## Tasks / Subtasks`.

`story_task_reminder` must return a model-visible tool failure and must not mutate the story file if no active dev-story workflow session exists, if `target_story` is missing, if `## Tasks` is missing, if task IDs cannot be parsed, or if there is no incomplete task. The tool failure must identify the failed operation as `story_task_reminder` and include the relevant missing workflow value, story path, task parsing reason, or all-complete state.

`story_task_reminder` is the canonical implementation source for Step 2 current-task detail. Initial Step 2 current-task rendering, next-task rendering after parent task completion, and `request_task_detail` must use the same task-detail formatting behavior. `story_task_complete` must not return current-task detail or next-task detail.

### `story_task_complete`

`story_task_complete` must be AI-callable in Step 2.

`story_task_complete` must use this model-facing schema:

| Parameter | Required | Type | Description |
| --- | --- | --- | --- |
| `storyItemId` | yes | string | A task ID or subtask ID from the target story document. |

When `storyItemId` identifies a subtask, `story_task_complete` must check that subtask in the target story document.

When all subtasks under a task are checked complete, `story_task_complete` must automatically check the parent task complete.

When `storyItemId` identifies a parent task, `story_task_complete` may check the parent task only if that task has no subtasks or all subtasks under that task are already checked complete. It must reject parent task completion while any subtask under that task remains incomplete.

After a successful update, `story_task_complete` must return progress metadata only: the completed story item ID, whether the completed item was a task or subtask, the parent task ID when the completed item was a subtask, whether the parent task is complete after the update, and whether all story tasks are complete.

`story_task_complete` must not return raw task text, raw subtask text, current task detail, next task detail, story frontmatter, or allowed-file content.

`story_task_complete` must write only to `target_story`, must satisfy the existing file-write approval and hook seams, and must invalidate file cache for the target story after a successful write.

### `request_task_detail`

`request_task_detail` must be AI-callable in Step 2.

`request_task_detail` must use this model-facing schema:

| Parameter | Required | Type | Description |
| --- | --- | --- | --- |
| `storyTaskId` | yes | string | The task ID from the target story document. |

`request_task_detail` must not accept a story path, story filename, story index path, or arbitrary file path from the AI model.

`request_task_detail` must return the detailed instructions for the specified story task, including that task's subtasks.

For a given task, `request_task_detail` output must use the same task-detail format as `story_task_reminder`.

The `request_task_detail` response must include:

- the requested task ID
- the raw task line exactly as written in the target story document
- each subtask ID under that task from the story document
- each raw subtask line exactly as written in the target story document

`request_task_detail` must not filter task detail based on whether the task is complete or incomplete. Complete and incomplete task detail are both valid if the requested task ID exists in the target story document.

If the requested task exists and has no subtasks, the response must include the task detail and no subtask entries.

`request_task_detail` must return a model-visible tool failure and must not mutate the story file if no active dev-story workflow session exists, if `target_story` is missing, if `## Tasks` is missing, if task IDs cannot be parsed, or if the requested task ID does not exist. The tool failure must identify the failed operation as `request_task_detail`, the requested task ID when present, and the concrete validation failure.

### `show_incomplete_tasks`

`show_incomplete_tasks` must be AI-callable in Step 2.

`show_incomplete_tasks` must use this model-facing schema:

| Parameter | Required | Type | Description |
| --- | --- | --- | --- |
| none | n/a | n/a | The tool accepts no parameters. |

`show_incomplete_tasks` must not accept a story path, story filename, story index path, task ID, or arbitrary file path from the AI model.

`show_incomplete_tasks` must return only a list of incomplete task and subtask numbers for the target story.

`show_incomplete_tasks` must not include detailed task instructions, raw task text, raw subtask text, frontmatter content, requirements content, scope content, or allowed-file content.

The `show_incomplete_tasks` response must include:

- incomplete task IDs
- incomplete subtask IDs grouped under their parent task ID
- no task prose
- no subtask prose
- no story frontmatter
- no requirements, scope, or allowed-file content

If a task has incomplete subtasks, the response must include the task ID and the incomplete subtask IDs under it.

If a task has no subtasks and the task itself is incomplete, the response must include the task ID with no subtask IDs.

If all tasks and subtasks are complete, the response must return an empty incomplete list or an explicit all-complete result.

## Step 3: Final User Recap

Step 3 must enter model-driven work through a `project_prompt` decision action.

Step 3 `buildPromptSource` must construct the Step 3 prompt from module-owned code. The Step 3 prompt must preserve this exact source prompt text:

```text
Use attempt_completion to provide a final recap to the user summarizing the changes that you implemented during this workflow, and remind them to run the code-review workflow before committing the changed files.
```

Step 3 must expose `attempt_completion`.

Step 3 may expose only the additional read-only or user-response tools required to build the final recap. It must not expose story mutation tools, workflow-value mutation tools, story index update tools, file move tools, staging tools, or commit tools.

Upon successful `attempt_completion`, the workflow must progress to Step 4.

Step 3 must route `attempt_completion_succeeded` through an explicit `transition_step` action targeting Step 4. It must not complete the workflow directly from Step 3.

## Step 4: Update Project Records

Step 4 must be runtime-driven and must expose an empty model-facing tool schema.

Step 4 must execute these procedures in order:

1. Relocate the target story file from the backlog folder to the review folder.
2. Update the target story's status to `review` in the story index file.
3. Stage files revised, deleted, or generated during story implementation.
4. If unpermitted changed files exist, surface Panel A to let the user select which unpermitted files to include.
5. Surface Panel B to ask whether to commit the staged files.
6. If the user responds yes on Panel B, commit the staged files.
7. If the user responds no on Panel B, leave the files staged.
8. Complete the workflow after the selected procedures finish.

### Story File Relocation

Step 4 must move the selected story file from `implementation/stories-backlog` to `implementation/stories-review` using the runtime-owned file-move capability.

The move must preserve the selected story filename exactly.

The move must stay inside the selected project folder, satisfy runtime path-boundary checks, and satisfy workspace path-policy checks.

If the source backlog story is missing, blocked, or no longer matches the selected `target_story`, Step 4 must route to `terminal_error` and must not stage, commit, or complete. The terminal error must identify the failed operation as story file relocation, the selected `target_story` path, and the concrete reason.

If the destination review story already exists, Step 4 must route to `terminal_error` and must not overwrite it. The terminal error must identify the failed operation as story file relocation and include the destination review story path.

### Story Index Status Update

Step 4 must update the selected story's status to `review` in `stories_index`.

Step 4 must use the backend-only `update_story_index_status` path for the story index update.

Step 4 must pass:

- `stories_index`: the derived `implementation/epic-{E}-stories.index.json` absolute path
- `story_identity`: the selected `selected_story_identity`
- `status`: `review`
- `expected_current_status`: `backlog`

Step 4 must not expose `update_story_index_status` to the AI model.

If the status update fails because the story index is missing, malformed, blocked, missing the selected story, or the selected story is not currently `backlog`, Step 4 must route to `terminal_error` and must not stage, commit, or complete. The terminal error must identify the failed operation as story index status update, the derived `stories_index` path, the selected story identity, and the concrete reason.

### Allowed File Extraction

Before staging implementation files, Step 4 must parse the completed target story document's tasks and subtasks.

Step 4 must extract allowed files from each task or subtask's explicit allowed-file declarations.

Allowed-file entries may be repository-relative paths or absolute paths under the repository/workspace root.

Step 4 must normalize allowed-file entries against the repository/workspace root used for git status and staging.

Step 4 must reject any allowed-file entry that resolves outside the repository/workspace root or fails workspace path-policy validation.

Step 4 must not stage a file solely because it was edited by the AI agent. Staging eligibility must come from the story's allowed-file declarations or from explicit user selection in Panel A.

### Git Status And Staging

Step 4 must inspect changed, deleted, and untracked files using git status from the repository/workspace root.

Step 4 must compare git status paths against normalized allowed files.

Step 4 must stage:

- changed, deleted, and untracked files whose normalized paths match allowed files
- the moved target story file path in `implementation/stories-review`
- the removed source target story path in `implementation/stories-backlog`
- the updated `stories_index`
- changed, deleted, and untracked unpermitted files selected by the user in Panel A

Step 4 must not stage changed, deleted, or untracked unpermitted files that the user did not select in Panel A.

If a changed file is already staged before Step 4 begins and it is not an allowed file, not a required project-record update, and not selected in Panel A, Step 4 must ensure that file is not included in the dev-story commit. The implementation may unstage that file without changing its working tree content.

If no stageable files are found after project-record updates and allowed/user-selected file processing, Step 4 must route to `terminal_error` rather than creating an empty commit or reporting successful staging. The terminal error must identify the failed operation as staging and state that no allowed, selected, or required project-record files were stageable.

### Step 4 Workflow Form

Step 4 must use one same-session workflow form for final staging/commit confirmation.

If unpermitted changed files exist after allowed-file comparison, the form must start with Panel A.

If no unpermitted changed files exist, the form must start with Panel B.

Panel A must be configured exactly as follows:

- title: `Unpermitted File Changes Detected`
- promptMarkdown: `The following file(s) were created or modified, and are not included in the target story's allowed files list. Please select any files below which should be included in the story's commit.`
- field kind: `checkbox_group`
- field label: `unpermitted files`
- field required: `false`
- selectionCardinality: `unbounded`
- options: array consisting of revised/deleted/added files not present in the story's allowed files
- allowed actions: `submit`
- action label for `submit`: `submit`

Panel A option values must be normalized git paths. Panel A option labels must be the same normalized git paths. Panel A options must not include descriptions unless the source document is updated to provide approved description text.

Panel A submission must persist the selected values to `selected_unpermitted_file_paths`.

After Panel A submission, Step 4 must stage the selected unpermitted files and continue the same workflow form session to Panel B.

Panel B must be configured exactly as follows:

- title: `Commit Confirmation`
- promptMarkdown: empty string
- field kind: `boolean`
- field label: `Would you like to commit the staged files?`
- field required: `true`
- allowedValueType: `boolean`
- trueLabel: `Yes`
- falseLabel: `No`
- allowed actions: `submit`
- action label for `submit`: `submit`

Panel B submission must persist the submitted value to `commit_staged_files`.

If `commit_staged_files` is `true`, Step 4 must commit the staged files.

If `commit_staged_files` is `false`, Step 4 must leave the files staged and complete the workflow.

Because Panel B is required, a missing `commit_staged_files` value is invalid. Step 4 must not treat a missing value as `false`.

### Commit Handling

When the user confirms commit, Step 4 must commit the staged files with this commit message:

```text
dev-story workflow run: story: <story_identity>
```

The implementation must replace `<story_identity>` with `selected_story_identity`.

The commit operation must run from the repository/workspace root used for git status and staging.

If commit fails, Step 4 must route to `terminal_error`, leave the index and working tree in their current state, and must not report workflow completion. The terminal error must identify the failed operation as commit, include the selected story identity, and include the concrete git error when available.

The workflow must end after the selected Step 4 procedures are completed.

## Tool Cleanup And Legacy State Removal

The dev-story module build must delete these existing tools, including their handlers, registry entries, model-facing schema surfaces, prompt references, tests, and response registry entries:

- `story_notes_update`
- `story_testing_complete`

The dev-story module build must delete `src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts` and replace it with updated tests aligned to the runtime dev-story workflow and supporting tools.

The dev-story module build must delete the story prompt-state fields from `TaskState` and persisted `TaskMetadata`:

- `activeStoryTaskId`
- `activeStorySubtaskIds`
- `lastPromptedStoryTaskKey`

After the dev-story module owns task prompting and progression, these fields must not remain as unowned foundational runtime state, metadata mirror fields, restore fields, context-compaction fields, or subagent fields.

The dev-story module must store workflow-specific prompt/progression state only in the active runtime workflow session.

The dev-story module build must not migrate `.cline/skills/bmad-dev-story/**/*`. The approved disposition for the legacy BMAD dev-story workflow package is delete. Runtime implementation must not depend on those files before deletion.

## Tool Schema Ownership

The dev-story module must own its model-facing tool schemas in:

```text
src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryToolSchemas.ts
```

`devStoryWorkflow.ts` must not define inline `ClineToolSpec` objects, inline tool arrays, local tool-schema builder bodies, or fallback empty schemas.

Every `WorkflowStepDefinition.buildToolSchema(...)` must delegate to a named export from `devStoryToolSchemas.ts`.

The returned `readonly ClineToolSpec[]` is the complete model-visible workflow tool surface for that turn.

Model-facing schemas must not include backend-only runtime-owned tools unless a future requirement explicitly approves projection.

The dev-story module must not preserve `.md` activation aliases such as `dev-story.md`.

## Registration

The dev-story module must export its workflow definition from:

```text
src/core/task/workflow-runtime/workflow-modules/dev-story/index.ts
```

The shipped workflow registry must register dev-story by canonical:

- `name`
- `slashCommandName`
- `useSkillName`

The registry must reject or fail to resolve `dev-story.md` as a workflow name, slash command, or skill alias.

## Testing Requirements

The dev-story module build must add focused tests for:

- workflow identity, display name, description, slash command, skill name, persona, and project subfolder
- shared entry panel prompt using the module description
- workflow value inventory and entry project value keys
- required target-story prerequisite declaration using the canonical story/remediation-story filename pattern
- Step 1 prerequisite routing and deterministic story setup routing
- story filename to story identity, epic identity, story type, and derived story index path
- rejection of missing, malformed, blocked, or nonmatching derived story index files during Step 4
- target story parsing from `## Tasks`
- rejection of legacy `## Tasks / Subtasks`-only documents
- rejection of task/subtask rows whose IDs cannot be parsed from the story document
- frontmatter section extraction into workflow values
- Step 2 prompt source shape, including non-empty story frontmatter rendering and non-empty current task rendering
- Step 2 tool schema names and forbidden tool absence
- `story_task_reminder`, `story_task_complete`, `request_task_detail`, and `show_incomplete_tasks` handler behavior
- `story_task_complete` completing subtasks by `storyItemId`, completing eligible parent tasks by `storyItemId`, auto-completing parent tasks, rejecting parent task completion while subtasks remain incomplete, reporting parent/all-complete status, and not returning task-detail content
- Step 2 staying active without automatic task-detail projection when the current parent task remains incomplete
- Step 2 rendering only the next unlocked task and that task's subtasks after the current parent task becomes complete and more incomplete tasks remain, without resending the full Step 2 prompt
- Step 2 transition to Step 3 only after all tasks and subtasks are complete in the story file
- Step 3 prompt source shape and `attempt_completion` exposure
- Step 3 explicit `attempt_completion_succeeded` route to Step 4
- Step 4 story file move from `implementation/stories-backlog` to `implementation/stories-review`
- Step 4 `update_story_index_status` invocation with `expected_current_status: "backlog"`
- Step 4 allowed-file extraction and path normalization
- Step 4 rejection of allowed-file paths outside the repository/workspace root
- Step 4 staging of allowed changed/untracked/deleted files
- Step 4 staging of required project-record updates
- Step 4 Panel A shown only when unpermitted files exist
- Step 4 Panel A exact field shape, no invented option descriptions, and selected unpermitted file staging
- Step 4 Panel B exact field shape and commit/no-commit routing
- Step 4 commit message construction
- Step 4 commit failure behavior
- workflow completion only after Step 4 procedures finish
- removal of `story_notes_update` and `story_testing_complete` from tool registries and model-facing schemas
- deletion of story prompt-state fields from `TaskState` and persisted `TaskMetadata`
- absence of runtime reads from `/Users/robertboston/Documents/Cline/Workflows/dev-story.md`, `.cline/skills/bmad-dev-story/**/*`, and BMAD agent files

Prompt-related tests must avoid brittle full-prose assertions for editable prompt bodies. They must verify behavior, routing, schema exposure, non-empty prompt insertion where required, required placeholder rendering, and absence of forbidden legacy values.

Tool-schema tests must assert exact tool names and forbidden backend-only tool absence.

Handler tests must replace the legacy `DevStoryStoryTools.test.ts` suite with tests aligned to runtime workflow values and the `## Tasks` heading.

Prompt integration tests must prove:

- current step details appear in the input workflow block, not system instructions
- dev-story workflow schema is projected only when dev-story is active
- Step 2 projects the story task tools required by this document
- retired tools are not projected
- backend-only runtime tools are not statically exposed

## Validation Requirements

Implementation phases must use focused validation appropriate to each changed surface, including:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryToolSchemas.test.ts
npm run test:unit -- src/core/task/tools/handlers/__tests__/<dev-story-story-tools-test-file>.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
```

The action plan may refine exact focused test filenames after it inspects the final code/test layout, but it must keep validation scoped to the surfaces changed in each phase and must stop on the first non-environment validation failure.

Add focused negative `rg` checks for retired surfaces after the relevant cleanup phase, including:

```bash
rg -n "story_notes_update|story_testing_complete|activeStoryTaskId|activeStorySubtaskIds|lastPromptedStoryTaskKey|dev-story\\.md" src/core src/shared docs/workflows/workflow-runtime/workflow-modules/dev-story
```

Any `rg` hits in historical docs or explicit negative tests must be inspected in context before being treated as live-code failures.
