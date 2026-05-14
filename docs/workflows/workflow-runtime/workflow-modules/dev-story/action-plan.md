## FrontMatter
- Read this plan from top to bottom before making any changes.
- Read each step in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
- After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".
- Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
- Do not edit any file not listed in the current step's allowed-files list.
- If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
- Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.
- You must avoid these banned development bad habits:
  - "any" typing
  - val as SomeType
  - as any in tests
  - optional properties most of the time (explicitly model which combinations exist and which don't whenever possible)
  - one-letter generics
  - non-boolean boolean checks
  - bang bang operators (explicitly check for the condition instead)
  - != null (explicitly check for the condition instead)
  - not declaring function return types
  - abuse of type assertions (use them only in special scenarios where the type is clearly known, and give priority to type declarations, interfaces, or generics)
  - Failing to use utility types (use utility types such as partial, pick, omit, etc when appropriate)
  - forcing assertions when types don't match
  - not using enums to manage constants
  - not using generics to abstract duplicated code
  - not using type narrowing
  - not explicitly defining generics parameters

## Scope

This plan builds and registers the product-owned `dev-story` workflow module described by [dev-story-requirements.md](./dev-story-requirements.md).

The module implements an existing story from `implementation/stories-backlog`, executes story tasks and subtasks through model-driven implementation, updates task completion directly in the selected story file, moves the completed story to `implementation/stories-review`, updates the derived story index entry to `review`, stages governed files, optionally stages user-selected unpermitted files, optionally commits the staged files, and completes the workflow.

Approved implementation decisions:

- `stories_index` is not a prerequisite. It is derived from the selected story filename and validated before Step 4 mutations.
- Story parsing uses the story document's explicit task/subtask IDs and `## Tasks`; it must not generate task IDs from parser order and must not read legacy `## Tasks / Subtasks`.
- Step 4 git finalization uses one backend-only tool, `dev_story_git_finalize`, invoked only by workflow-owned `execute_tool_backed_operation` routes. It is not projected to the AI model.
- `dev_story_git_finalize` supports exactly three operations: `prepare_staging`, `stage_selected_unpermitted`, and `commit_staged`.
- `dev_story_git_finalize` compares full file paths internally. It uses `TaskConfig.cwd` as the git root, derives the selected project root from `stories_index`, resolves git status paths against `TaskConfig.cwd`, and compares those full paths with allowed-file full paths from the story document.
- `dev_story_git_finalize` persists computed workflow values through `WorkflowRuntime.applyWorkflowValueWrites(...)`, following the existing `SetWorkflowValuesToolHandler` writeback seam.
- Tests for prompts must assert behavior and structure only. They must not assert exact editable prompt prose.

Sibling-pattern audit summary:

- New workflow identity, persona, value inventory, prerequisites, steps, routes, forms, prompt builders, and tool schemas live under `src/core/task/workflow-runtime/workflow-modules/dev-story`.
- New AI-callable story tools touch the shared tool enum, assistant-message parameter inventory, response-tool metadata, tool executor wiring, handlers, story parser helpers, prompt projection tests, and handler tests.
- The backend-only `dev_story_git_finalize` tool touches the shared tool enum, assistant-message parameter inventory, backend workflow tool contracts, response-tool metadata, tool executor wiring, handler implementation, handler tests, workflow-route tests, and prompt/schema non-exposure tests.
- Retired tools `story_notes_update` and `story_testing_complete` must be removed from enum surfaces, registrations, handlers, metadata, tests, and prompt projections.
- Retired story prompt-state fields `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey` must be deleted from `TaskState`, persisted metadata, persistence/restore paths, subagent cleanup, and tests.
- Legacy package files under `.cline/skills/bmad-dev-story/**/*` must be deleted after runtime no longer depends on them.

## Scope Boundary

- Do not edit `/Users/robertboston/Documents/Cline/Workflows/dev-story.md`.
- Do not change `dev-story-requirements.md` in this plan.
- Do not implement `code-review`, `create-story`, `pi-planning`, or any other workflow module.
- Do not introduce `stories_index` as a prerequisite or ask the user to select a story index file.
- Do not expose `set_workflow_values`, `update_story_index_status`, `move_workflow_project_file`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `dev_story_git_finalize`, `story_notes_update`, or `story_testing_complete` to the AI model.
- Do not keep compatibility aliases for `story_notes_update`, `story_testing_complete`, `activeStoryTaskId`, `activeStorySubtaskIds`, `lastPromptedStoryTaskKey`, `## Tasks / Subtasks`, or legacy BMAD dev-story package files.
- Do not add exact prompt-prose tests for editable dev-story step prompt wording.
- Do not change shared workflow-form behavior; Phase 68 foundational support is already complete.

## Known Issues / Risks / Technical Debt

- The current workflow module pattern stores UI and prompt copy in TypeScript constants. This plan follows that established pattern.
- The backend-only git finalization tool is introduced because existing deterministic workflow procedures do not receive the `TaskConfig` and tool-executor context needed to run git, apply workspace policy consistently, and persist computed workflow values.
- If implementation proves that a git command must run outside existing sandbox/approval behavior, stop and ask the user before changing command execution policy.

## Tasks / Subtasks

### Phase 1 - Story Parser And Story Task Tools

After completing this phase, pause for QA review before moving to Phase 2.

[ ] Task 1. Replace legacy story task parsing with dev-story story-document parsing.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/storyTaskDocument.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/__tests__/storyTaskDocument.test.ts`

[ ] Subtask 1.1. In `storyTaskDocument.ts`, replace the legacy `## Tasks / Subtasks` parser with a parser that reads only the `## Tasks` section.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/storyTaskDocument.ts`

[ ] Subtask 1.2. In `storyTaskDocument.ts`, add parsing for the required sections `## General Instructions`, `## Objective`, `## Scope`, `## Scope Boundary`, `## Requirements`, and `## Known Issues/ Risks/ Technical Debt`, preserving section content as raw strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/storyTaskDocument.ts`

[ ] Subtask 1.3. In `storyTaskDocument.ts`, model parsed tasks and subtasks with explicit IDs read from the story document, raw task/subtask line text, checkbox completion state, and attached allowed-file entries.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/storyTaskDocument.ts`

[ ] Subtask 1.4. In `storyTaskDocument.ts`, reject task or subtask lines that lack a parseable explicit ID by returning a typed parser failure that includes the invalid raw line.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/storyTaskDocument.ts`

[ ] Subtask 1.5. In `storyTaskDocument.ts`, implement helpers that return the first incomplete task detail, task detail by task ID, incomplete task/subtask summaries, all-complete status, and allowed-file entries for completed-story finalization.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/storyTaskDocument.ts`

[ ] Subtask 1.6. In `storyTaskDocument.ts`, add dev-story helpers used by the retained task tools while retaining legacy note/status helpers until the retired handlers are deleted in Phase 2.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/storyTaskDocument.ts`

[ ] Subtask 1.7. In `storyTaskDocument.test.ts`, replace legacy `## Tasks / Subtasks` tests with tests for `## Tasks`, required section extraction, explicit ID parsing, invalid ID rejection, raw line preservation, completion-state parsing, current task detail, task detail by ID, incomplete summary, all-complete status, and allowed-file extraction.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/__tests__/storyTaskDocument.test.ts`

[ ] Task 2. Add the dev-story AI-callable story task tool surface.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

[ ] Subtask 2.1. In `tools.ts`, add `ClineDefaultTool.REQUEST_TASK_DETAIL = "request_task_detail"` and `ClineDefaultTool.SHOW_INCOMPLETE_TASKS = "show_incomplete_tasks"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[ ] Subtask 2.2. In `tools.ts`, keep `story_task_reminder`, `request_task_detail`, and `show_incomplete_tasks` in the read-only tool list, and keep `story_task_complete` outside the read-only list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[ ] Subtask 2.3. In `assistant-message/index.ts`, add parser parameter names for `storyItemId` and `storyTaskId`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`

[ ] Subtask 2.4. In `ResponseToolRegistry.ts`, add registry entries for `request_task_detail` and `show_incomplete_tasks` with `undefined` metadata, matching ordinary non-response tools.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

[ ] Task 3. Update and add story task tool handlers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/StoryTaskReminderToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/StoryTaskCompleteToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RequestTaskDetailToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/ShowIncompleteTasksToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

[ ] Subtask 3.1. In `StoryTaskReminderToolHandler.ts`, change active story resolution to require an active `dev-story` workflow session and read `target_story` from workflow values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/StoryTaskReminderToolHandler.ts`

[ ] Subtask 3.2. In `StoryTaskReminderToolHandler.ts`, return current incomplete task detail from the `## Tasks` parser and return a model-visible tool failure for missing session, missing `target_story`, parser failure, or all-complete state.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/StoryTaskReminderToolHandler.ts`

[ ] Subtask 3.3. In `StoryTaskCompleteToolHandler.ts`, change active story resolution to require an active `dev-story` workflow session and read `target_story` from workflow values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/StoryTaskCompleteToolHandler.ts`

[ ] Subtask 3.4. In `StoryTaskCompleteToolHandler.ts`, accept required `storyItemId`, resolve whether it identifies a task or subtask from the parsed `## Tasks` story structure, update only the selected story file, auto-check the parent task when all subtasks are complete, reject parent task completion while child subtasks remain incomplete, invalidate the file cache after a successful write, and return progress metadata only: completed story item ID, completed item kind, parent task ID when applicable, parent-complete status, and all-story-tasks-complete status.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/StoryTaskCompleteToolHandler.ts`

[ ] Subtask 3.5. In `StoryTaskCompleteToolHandler.ts`, do not return raw task text, raw subtask text, current task detail, next task detail, story frontmatter, or allowed-file content. After successful completion, trigger workflow progression only when the completed item makes the parent task complete or when all story tasks are complete; do not trigger automatic Step 2 task-detail projection when the parent task remains incomplete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/StoryTaskCompleteToolHandler.ts`

[ ] Subtask 3.6. Create `RequestTaskDetailToolHandler.ts` to implement `request_task_detail` with required `storyTaskId`, no path parameters, task-detail output for existing complete or incomplete tasks, and model-visible failures for invalid requests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RequestTaskDetailToolHandler.ts`

[ ] Subtask 3.7. Create `ShowIncompleteTasksToolHandler.ts` to implement `show_incomplete_tasks` with no parameters and output limited to incomplete task/subtask IDs with no raw task details.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/ShowIncompleteTasksToolHandler.ts`

[ ] Subtask 3.8. In `ToolExecutorCoordinator.ts`, register `RequestTaskDetailToolHandler` and `ShowIncompleteTasksToolHandler`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[ ] Subtask 3.9. In `DevStoryStoryTools.test.ts`, replace legacy story-tool tests with handler tests for `story_task_reminder`, `story_task_complete`, `request_task_detail`, and `show_incomplete_tasks` using `target_story` workflow values and `## Tasks` documents. The `story_task_complete` tests must assert `storyItemId` handling for subtasks and eligible parent tasks, progress metadata, parent auto-completion, all-complete reporting, invalid parent completion rejection, and absence of raw task/subtask detail in the tool result.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

### Phase 2 - Retired Tool And Prompt-State Cleanup

After completing this phase, pause for QA review before moving to Phase 3.

[ ] Task 4. Delete retired story tool handlers and remove their executor wiring.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/storyTaskDocument.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/StoryNotesUpdateToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/StoryTestingCompleteToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

[ ] Subtask 4.1. Delete `StoryNotesUpdateToolHandler.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/StoryNotesUpdateToolHandler.ts`

[ ] Subtask 4.2. Delete `StoryTestingCompleteToolHandler.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/StoryTestingCompleteToolHandler.ts`

[ ] Subtask 4.3. In `ToolExecutorCoordinator.ts`, remove imports and registration branches for `StoryNotesUpdateToolHandler` and `StoryTestingCompleteToolHandler`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[ ] Subtask 4.4. In `tools.ts`, remove `ClineDefaultTool.STORY_NOTES_UPDATE` and `ClineDefaultTool.STORY_TESTING_COMPLETE`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[ ] Subtask 4.5. In `ResponseToolRegistry.ts`, delete the registry entries for `story_notes_update` and `story_testing_complete`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

[ ] Subtask 4.6. In `storyTaskDocument.ts`, delete helper functions whose only remaining responsibility supported `story_notes_update`, `story_testing_complete`, `markStoryStatusReview`, or generated-order prompt state.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/storyTaskDocument.ts`

[ ] Subtask 4.7. In `DevStoryStoryTools.test.ts`, add negative coverage proving retired `story_notes_update` and `story_testing_complete` handlers are no longer registered.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

[ ] Task 5. Remove retired story prompt-state fields from runtime state and persisted metadata.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[ ] Subtask 5.1. In `TaskState.ts`, delete `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`

[ ] Subtask 5.2. In `ContextTrackerTypes.ts`, delete `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey` from persisted task metadata types.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts`

[ ] Subtask 5.3. In `index.ts`, remove metadata persist/restore handling for `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[ ] Subtask 5.4. In `index.ts`, delete `persistActiveStoryTaskPromptState(...)` and its call sites.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[ ] Subtask 5.5. In `SubagentRunner.ts`, remove cleanup references to `lastPromptedStoryTaskKey`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[ ] Subtask 5.6. In `workflow-runtime-metadata.test.ts`, remove expectations for persisted `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey`, and add negative assertions that restored metadata no longer owns those keys.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[ ] Subtask 5.7. In `SubagentRunner.test.ts`, remove expectations that subagent cleanup mutates `lastPromptedStoryTaskKey`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Phase 3 - Backend Git Finalization Tool

After completing this phase, pause for QA review before moving to Phase 4.

[ ] Task 6. Implement backend-only dev-story git finalization.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/DevStoryGitFinalizeToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryGitFinalizeToolHandler.test.ts`

[ ] Subtask 6.1. In `tools.ts`, add `ClineDefaultTool.DEV_STORY_GIT_FINALIZE = "dev_story_git_finalize"` and do not add it to `READ_ONLY_TOOLS`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[ ] Subtask 6.2. In `assistant-message/index.ts`, add parser parameter name `operation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`

[ ] Subtask 6.3. In `backendWorkflowToolContracts.ts`, add a backend workflow tool contract with `id: ClineDefaultTool.DEV_STORY_GIT_FINALIZE`, `name: "dev_story_git_finalize"`, and one required string parameter named `operation` with description `Dev-story git finalization operation prepared by WorkflowRuntime.`

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

[ ] Subtask 6.4. In `ResponseToolRegistry.ts`, add a registry entry for backend-only `dev_story_git_finalize` with `undefined` metadata, matching ordinary non-response tools.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

[ ] Subtask 6.5. Create `DevStoryGitFinalizeToolHandler.ts` with handler name `dev_story_git_finalize` and required `operation` parameter.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/DevStoryGitFinalizeToolHandler.ts`

[ ] Subtask 6.6. In `DevStoryGitFinalizeToolHandler.ts`, reject any operation value other than `prepare_staging`, `stage_selected_unpermitted`, or `commit_staged` with a tool failure that does not mutate files, git index state, or workflow values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/DevStoryGitFinalizeToolHandler.ts`

[ ] Subtask 6.7. In `DevStoryGitFinalizeToolHandler.ts`, require an active `dev-story` workflow session, use `TaskConfig.cwd` as the git root, derive the selected project root from the parent folder of the `implementation` folder that contains `stories_index`, and validate `target_story_filename`, `selected_story_identity`, `stories_index`, and `selected_unpermitted_file_paths` or `commit_staged_files` only for the operations that need them.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/DevStoryGitFinalizeToolHandler.ts`

[ ] Subtask 6.8. In `DevStoryGitFinalizeToolHandler.ts`, implement `prepare_staging` to read the completed review story file from the derived selected project root, parse allowed files from `## Tasks`, run git status from `TaskConfig.cwd`, resolve git status paths to full paths under `TaskConfig.cwd`, compare them to allowed-file full paths, stage allowed changed/deleted/untracked files, stage the moved story record paths, stage the updated story index path, unstage unpermitted paths that were already staged, and persist `unpermitted_file_paths` as normalized git path strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/DevStoryGitFinalizeToolHandler.ts`

[ ] Subtask 6.9. In `DevStoryGitFinalizeToolHandler.ts`, implement `stage_selected_unpermitted` to treat `selected_unpermitted_file_paths` values as normalized git path strings, reject selections not present in the latest persisted `unpermitted_file_paths`, resolve accepted selections to full paths under `TaskConfig.cwd`, and stage only those resolved full paths.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/DevStoryGitFinalizeToolHandler.ts`

[ ] Subtask 6.10. In `DevStoryGitFinalizeToolHandler.ts`, implement `commit_staged` to commit staged files with message `dev-story workflow run: story: <story_identity>` only when `commit_staged_files` is `true`; replace `<story_identity>` with `selected_story_identity`; when `commit_staged_files` is `false`, return success without committing.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/DevStoryGitFinalizeToolHandler.ts`

[ ] Subtask 6.11. In `DevStoryGitFinalizeToolHandler.ts`, route missing/malformed story index, blocked paths, out-of-root allowed files, no stageable files, git failures, and commit failures to tool failures whose messages identify the operation, path or story ID, and concrete reason.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/DevStoryGitFinalizeToolHandler.ts`

[ ] Subtask 6.12. In `ToolExecutorCoordinator.ts`, register `DevStoryGitFinalizeToolHandler`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[ ] Subtask 6.13. Create `DevStoryGitFinalizeToolHandler.test.ts` covering `prepare_staging`, selected unpermitted staging, no-commit, commit, invalid operation, missing workflow values, backend contract registration, response registry metadata, out-of-root allowed files, no stageable files, workflow-value writeback through `WorkflowRuntime.applyWorkflowValueWrites(...)`, and git failure behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryGitFinalizeToolHandler.test.ts`

### Phase 4 - Dev-Story Workflow Module

After completing this phase, pause for QA review before moving to Phase 5.

[ ] Task 7. Add the dev-story workflow module files.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/index.ts`

[ ] Subtask 7.1. Create `devStoryWorkflow.ts` exporting the dev-story workflow definition, workflow value key constants, prerequisite constants, form constants, persona constants, and deterministic helper functions used by the module tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

[ ] Subtask 7.2. In `devStoryWorkflow.ts`, define workflow identity exactly as `name: "dev-story"`, `slashCommandName: "dev-story"`, `useSkillName: "dev-story"`, `displayName: "dev-story"`, `projectSubfolder: "implementation"`, and the approved description from the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

[ ] Subtask 7.3. In `devStoryWorkflow.ts`, define a module-owned developer persona with Amelia's required developer-agent fields and no runtime read from legacy agent or workflow markdown files.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

[ ] Subtask 7.4. In `devStoryWorkflow.ts`, declare the full `workflowValueKeys` inventory from the requirements and `entryProjectValueKeys` for `projectMode`, `projectTitle`, and `projectFolderName`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

[ ] Subtask 7.5. In `devStoryWorkflow.ts`, declare the single `target_story` prerequisite under `implementation/stories-backlog` using the approved story filename pattern and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

[ ] Subtask 7.6. In `devStoryWorkflow.ts`, implement Step 1 to resolve `target_story`, derive `target_story_filename`, `selected_story_identity`, `selected_story_type`, `epic_identity`, and `stories_index`, parse story sections and task inventory, persist workflow values, and route parser/setup failures to `terminal_error`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

[ ] Subtask 7.7. In `devStoryWorkflow.ts`, implement Step 2 as model-driven `project_prompt` using the exact approved Step 2 prompt text from `dev-story-requirements.md`, with deterministic workflow-value interpolation for story frontmatter and current task rendering from the same formatter used by `story_task_reminder`. Route successful `story_task_complete` events as follows: no prompt re-projection when the parent task remains incomplete; when the parent task becomes complete and incomplete tasks remain, render only the next unlocked task and that task's subtasks using the `story_task_reminder` formatter without resending the full Step 2 prompt; transition to Step 3 only after all tasks and subtasks are complete in the story file.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

[ ] Subtask 7.8. In `devStoryWorkflow.ts`, implement Step 3 as model-driven final recap using the exact approved Step 3 prompt text from `dev-story-requirements.md`, with `attempt_completion` exposure and explicit `attempt_completion_succeeded` transition to Step 4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

[ ] Subtask 7.9. In `devStoryWorkflow.ts`, implement Step 4 routes in this order: validate derived story index, move story from `stories-backlog` to `stories-review`, update story index status to `review` with `expected_current_status: "backlog"`, run `dev_story_git_finalize` through `execute_tool_backed_operation` with `toolParams.operation = "prepare_staging"`, render the same-session Step 4 form at Panel A when unpermitted files exist or Panel B when none exist, run `dev_story_git_finalize` with `toolParams.operation = "stage_selected_unpermitted"` after Panel A submit, run `dev_story_git_finalize` with `toolParams.operation = "commit_staged"` after Panel B submit, complete the workflow after selected procedures finish, and route every failed move/status/git operation to `terminal_error`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

[ ] Subtask 7.10. In `devStoryWorkflow.ts`, configure Step 4 Panel A exactly as required: title `Unpermitted File Changes Detected`, `promptMarkdown: "The following file(s) were created or modified, and are not included in the target story's allowed files list. Please select any files below which should be included in the story's commit."`, `checkbox_group`, label `unpermitted files`, `required: false`, unbounded selection, options from `unpermitted_file_paths`, no descriptions, and submit action label `submit`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

[ ] Subtask 7.11. In `devStoryWorkflow.ts`, configure Step 4 Panel B exactly as required: title `Commit Confirmation`, empty `promptMarkdown`, boolean field label `Would you like to commit the staged files?`, `required: true`, `trueLabel: "Yes"`, `falseLabel: "No"`, and submit action label `submit`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

[ ] Subtask 7.12. Create `devStoryToolSchemas.ts` so Step 1 and Step 4 expose empty model-facing schemas; Step 2 exposes exactly `read_file`, `read_file_range`, `list_files`, `search_files`, `list_code_definition_names`, `apply_patch`, `execute_command`, `story_task_complete`, `request_task_detail`, `show_incomplete_tasks`, `ask_followup_question`, and `send_user_message`; Step 2 `story_task_complete` requires string `storyItemId` whose description states that it may identify a task or subtask from the target story document; Step 2 `request_task_detail` requires string `storyTaskId`; Step 2 `show_incomplete_tasks` has no parameters; and Step 3 exposes exactly `read_file`, `read_file_range`, `list_files`, `search_files`, `ask_followup_question`, `send_user_message`, and `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryToolSchemas.ts`

[ ] Subtask 7.13. In `devStoryToolSchemas.ts`, explicitly exclude `set_workflow_values`, `update_story_index_status`, `move_workflow_project_file`, `dev_story_git_finalize`, `story_notes_update`, `story_testing_complete`, and workflow artifact tools from every dev-story model-facing schema.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryToolSchemas.ts`

[ ] Subtask 7.14. Create `index.ts` exporting the workflow definition, schema builders, value keys, prerequisite IDs, and form constants required by tests and registry wiring.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/index.ts`

[ ] Task 8. Register the dev-story module and prompt projection.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryToolSchemas.test.ts`

[ ] Subtask 8.1. In `WorkflowRegistry.ts`, import the dev-story workflow module and add it to `shippedWorkflowDefinitions`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[ ] Subtask 8.2. Create `devStoryWorkflow.test.ts` covering workflow identity, entry panel description shape, registry resolution by `dev-story`, registry rejection of `dev-story.md`, prerequisite declaration, value inventory, Step 1 setup routes, story metadata derivation, Step 2 progression, Step 3 completion route, Step 4 move/status/git/final-form routes, Panel A/B field shapes, and terminal-error routing. Include Step 2 routing tests proving ordinary subtask completion that leaves the parent incomplete does not project task detail, parent completion with remaining tasks renders only the next unlocked task and that task's subtasks without asserting exact prompt prose or resending the full Step 2 prompt, and all-complete state transitions to Step 3.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts`

[ ] Subtask 8.3. Create `devStoryToolSchemas.test.ts` covering Step 2 required tool exposure, Step 2 story-tool parameter schemas, Step 3 `attempt_completion` exposure, empty Step 1/Step 4 schemas, and forbidden tool absence from every model-facing dev-story schema.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryToolSchemas.test.ts`

[ ] Subtask 8.4. In `integration.test.ts`, add dev-story prompt-projection coverage that asserts active dev-story projects current step details in the input workflow block, projects Step 2 tool names only while dev-story Step 2 is active, and does not assert exact editable prompt prose.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

### Phase 5 - Legacy Package Cleanup And Final Guards

After completing this phase, pause for QA review before treating the dev-story module build as complete.

[ ] Task 9. Delete retired legacy dev-story package files.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-dev-story/SKILL.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-dev-story/checklist.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-dev-story/workflow.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-dev-story/bmad-skill-manifest.yaml`

[ ] Subtask 9.1. Delete `.cline/skills/bmad-dev-story/SKILL.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-dev-story/SKILL.md`

[ ] Subtask 9.2. Delete `.cline/skills/bmad-dev-story/checklist.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-dev-story/checklist.md`

[ ] Subtask 9.3. Delete `.cline/skills/bmad-dev-story/workflow.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-dev-story/workflow.md`

[ ] Subtask 9.4. Delete `.cline/skills/bmad-dev-story/bmad-skill-manifest.yaml`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-dev-story/bmad-skill-manifest.yaml`

[ ] Task 10. Add final regression guards for retired dev-story runtime assets.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/__tests__/storyTaskDocument.test.ts`

[ ] Subtask 10.1. In `devStoryWorkflow.test.ts`, add negative coverage proving the dev-story workflow does not reference legacy BMAD package paths, `## Tasks / Subtasks`, retired prompt-state fields, or `stories_index` as a prerequisite.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts`

[ ] Subtask 10.2. In `devStoryToolSchemas.test.ts`, add negative coverage proving `story_notes_update`, `story_testing_complete`, `set_workflow_values`, `update_story_index_status`, `move_workflow_project_file`, and `dev_story_git_finalize` are absent from model-facing dev-story schemas.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryToolSchemas.test.ts`

[ ] Subtask 10.3. In `DevStoryStoryTools.test.ts`, add negative coverage proving retired story tools cannot be executed through registered handlers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

[ ] Subtask 10.4. In `storyTaskDocument.test.ts`, add negative coverage proving a story document with only `## Tasks / Subtasks` is rejected.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/__tests__/storyTaskDocument.test.ts`

[ ] Task 11. Retire stale dev-story implementation planning notes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/dev-story/dev-story-implementation.md`

[ ] Subtask 11.1. Replace the contents of `dev-story-implementation.md` with a short supersession note that points to `dev-story-requirements.md` and `action-plan.md` as the controlling dev-story module-build documents and does not include retired tool names, retired prompt-state field names, legacy package paths, or the source markdown path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/dev-story/dev-story-implementation.md`

## Validation

Phase 1 validation:

1. Run `npm run test:unit -- src/core/task/story-tools/__tests__/storyTaskDocument.test.ts src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`.
2. Run `npm run check-types`.
3. Run `npm run lint`.

Phase 2 validation:

1. Run `npm run test:unit -- src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`.
2. Run `rg -n "activeStoryTaskId|activeStorySubtaskIds|lastPromptedStoryTaskKey|story_notes_update|story_testing_complete" src/core src/shared`. Treat exit code `1` with no output as success. Treat any match as a validation failure unless the match is a test asserting absence of the retired string.
3. Run `npm run check-types`.
4. Run `npm run lint`.

Phase 3 validation:

1. Run `npm run test:unit -- src/core/task/tools/handlers/__tests__/DevStoryGitFinalizeToolHandler.test.ts`.
2. Run `npm run check-types`.
3. Run `npm run lint`.

Phase 4 validation:

1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryToolSchemas.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`.
2. Run `npm run check-types`.
3. Run `npm run lint`.

Phase 5 validation:

1. Run `npm run test:unit -- src/core/task/story-tools/__tests__/storyTaskDocument.test.ts src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts src/core/task/tools/handlers/__tests__/DevStoryGitFinalizeToolHandler.test.ts src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryToolSchemas.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`.
2. Run `rg -n "activeStoryTaskId|activeStorySubtaskIds|lastPromptedStoryTaskKey|story_notes_update|story_testing_complete|## Tasks / Subtasks|\\.cline/skills/bmad-dev-story|/Users/robertboston/Documents/Cline/Workflows/dev-story\\.md" src/core src/shared docs/workflows/workflow-runtime/workflow-modules/dev-story`. Treat exit code `1` with no output as success. If matches are returned, inspect every match. Treat any live runtime code hit, `dev-story-implementation.md` hit, or non-negative-test hit outside `dev-story-requirements.md` and `action-plan.md` as a validation failure.
3. Run `rg --files .cline/skills/bmad-dev-story` and treat any returned file as a validation failure. Treat exit code `1` or `2` with no output as success because the directory may be empty or deleted.
4. Run `npm run check-types`.
5. Run `npm run lint`.
