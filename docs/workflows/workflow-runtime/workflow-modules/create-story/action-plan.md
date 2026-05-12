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

This plan builds and registers the product-owned `create-story` workflow module described by [create-story-requirements.md](./create-story-requirements.md).

This plan also includes the approved shared runtime support required by the create-story module:

- `jsonOptionsSource` may derive selected-project-relative `sourcePathSegments` from existing lookup-only workflow-form interpolation before resolving a JSON option file.
- Runtime may update an existing story's `status` in `implementation/epic-{E}-stories.index.json` through a backend-only `update_story_index_status` tool-backed action.

Approved implementation decisions:

- Use `jsonOptionsSource.root = { kind: "selected_project_root" }` for Panel B story selection, with `sourcePathSegments` deriving the story-index filename from persisted workflow values.
- Add backend-only `update_story_index_status` as `ClineDefaultTool.UPDATE_STORY_INDEX_STATUS`.
- Add `WorkflowDecisionAction.kind = "update_story_index_status"` so modules can route story-index status changes through runtime-owned tool-backed success and failure handling.
- The `update_story_index_status` backend tool accepts `stories_index`, `story_identity`, `status`, and optional `expected_current_status`.
- The AI model must never see or call `update_story_index_status`; create-story uses it only through module-owned decision-tree actions.

Sibling-pattern audit summary:

- New JSON option source support touches shared form types, runtime source resolution and validation, runtime/form tests, and module-build-guide documentation.
- New backend tool support touches tool enum, assistant-message parameter inventory, backend contracts, handler, coordinator wiring, response-tool metadata, auto-approval policy, workflow decision-action types, runtime action building, handler/runtime tests, and module-build-guide documentation.
- Create-story module-owned tool exposure lives only in `createStoryToolSchemas.ts`.
- Create-story module-owned workflow identity, values, prerequisites, forms, deterministic procedures, prompts, and decision trees live in `createStoryWorkflow.ts`.
- Create-story registration touches `WorkflowRegistry.ts`, module tests, and prompt-projection tests.
- Legacy story prompt-state fields remain out of scope because they belong to the future dev-story module build.
- Legacy create-story package cleanup does not delete `workflow.md` or `steps/**/*.md`; it deletes `template.md` because create-story edits existing story files generated upstream by pi-planning.

## Scope Boundary

- Do not implement `dev-story`, `code-review`, `write-remediation-story`, or any other workflow module in this plan.
- Do not add compatibility aliases for `create-story.md`; the runtime workflow identity is `create-story`.
- Do not allow create-story to create canonical story identities, canonical story filenames, story index entries, story files, remediation story entries, or review findings documents.
- Do not expose `set_workflow_values`, `plan_story_artifacts`, `plan_remediation_story_artifact`, `generate_story_files`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, or `update_story_index_status` in any create-story model-facing tool schema.
- Do not expose `execute_command` in the create-story workflow.
- Do not read `/Users/robertboston/Documents/Cline/Workflows/create-story.md`, `_bmad/bmm/agents/sm.md`, BMAD workflow package files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime.
- Do not delete `.cline/skills/bmad-create-story/workflow.md` or `.cline/skills/bmad-create-story/steps/**/*.md`.
- Do not edit or remove legacy dev-story implementation prompt-state fields, including `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey`.
- Do not recreate, rename, or remap `BuildStoryDocumentToolHandler.ts`.
- Do not add exact prompt-prose tests for editable step prompt wording unless the assertion protects a stable runtime contract or forbidden tool boundary.

## Known Issues / Risks / Technical Debt

- The current module pattern stores module-owned prompt and workflow-form copy in TypeScript constants instead of a string resource system. This plan follows the established workflow-runtime module pattern.
- `update_story_index_status` is intentionally backend-only. The action plan must validate non-exposure in create-story schemas and prompt-projection surfaces.

## Tasks / Subtasks

### Phase 1 - Canonical Documentation For Approved Shared Support

After completing this phase, pause for QA review before moving to Phase 2.

[x] Task 1. Record the approved shared form and story-index status support in canonical docs.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`

[x] Subtask 1.1. In `requirements.md`, add a functional requirement under the workflow form requirements stating that JSON-backed workflow form options may be sourced either from selected-project-relative `sourcePathSegments` or from an absolute JSON file path stored in a declared workflow value.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md`

[x] Subtask 1.2. In `requirements.md`, add a functional requirement near the story index requirements stating that runtime/tooling must provide backend-only `update_story_index_status` for governed updates to an existing story entry's `status` in `epic-{E}-stories.index.json`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md`

[x] Subtask 1.3. In `architecture.md`, update the workflow form/json option architecture text to state that `jsonOptionsSource` can resolve a source JSON file either from selected-project-relative segments or from an active workflow value containing a governed absolute path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md`

[x] Subtask 1.4. In `architecture.md`, update the story lifecycle architecture text to state that workflow modules can route deterministic story-status changes through a backend-only runtime story-index status update action before workflow completion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md`

[x] Subtask 1.5. In `module-build-guide.md`, revise the `jsonOptionsSource` guidance to document both `selected_project_root` and `workflow_value_path` roots, including the rule that `workflow_value_path` must name a declared workflow value containing a governed absolute JSON file path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`

[x] Subtask 1.6. In `module-build-guide.md`, add `update_story_index_status` to the story lifecycle guidance as a backend-only runtime status mutation action that must not be included in model-facing tool schemas.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`

### Phase 2 - Dynamic JSON Source Path Segment Interpolation

After completing this phase, pause for QA review before moving to Phase 3.

[x] Task 2. Extend selected-project JSON option sources so `sourcePathSegments` can derive safe concrete path segments from existing workflow-form interpolation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 2.1. In `requirements.md`, replace `FR-39i1` with: `FR-39i1`: JSON-backed workflow form options must resolve source JSON files from the selected project root and module-declared `sourcePathSegments`. `sourcePathSegments` may contain existing lookup-only workflow-form placeholders using `{workflow.*}` and `{data.*}` interpolation. Runtime must interpolate each source path segment before resolving the source file, reject unresolved placeholders, reject unsafe resolved path segments, enforce selected-project-root containment, and apply workspace path policy before reading the JSON source.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md`

[x] Subtask 2.2. In `architecture.md`, replace the workflow form JSON option sentence that mentions active workflow values containing governed absolute paths with: JSON-backed option lists resolve source JSON files from selected-project-relative `sourcePathSegments`. Source path segments may use the existing lookup-only workflow-form interpolation from workflow/session values; runtime interpolates those segments before selected-root path resolution and validates unresolved placeholders, resolved path segments, selected-root containment, and workspace path policy before file read.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md`

[x] Subtask 2.3. In `module-build-guide.md`, replace the `jsonOptionsSource` guidance paragraph so it documents only `root.kind = "selected_project_root"` with `sourcePathSegments`, including that a segment may use lookup-only placeholders such as `epic-{workflow.epic_identity}-stories.index.json`; do not document `workflow_value_path`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`

[x] Subtask 2.4. In `WorkflowRuntime.ts`, pass the current workflow form session through the JSON dynamic-options call chain from `resolveWorkflowFormPanelFields(...)` to `resolveWorkflowFormJsonOptionsSourcePath(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.5. In `WorkflowRuntime.ts`, update `resolveWorkflowFormJsonOptionsSourcePath(...)` so each configured `sourcePathSegments` entry is interpolated with the existing `interpolateWorkflowFormText(...)` before source path resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.6. In `WorkflowRuntime.ts`, reject any interpolated `sourcePathSegments` entry that still contains an unresolved `{...}` placeholder before attempting to read the JSON source file.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.7. In `WorkflowRuntime.ts`, validate each interpolated `sourcePathSegments` entry with `isWorkflowDiscoveryTargetPathSegment(...)`, then preserve the existing selected-project-root containment check and workspace path-policy check.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.8. In `WorkflowRuntime.test.ts`, add coverage proving a dropdown renders story options from `implementation/epic-{workflow.epic_identity}-stories.index.json` when `epic_identity` is already persisted in workflow values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 2.9. In `WorkflowRuntime.test.ts`, add coverage proving unresolved dynamic `sourcePathSegments` placeholders fail before JSON file read.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 2.10. In `WorkflowRuntime.test.ts`, add coverage proving a workflow value that resolves a dynamic source path segment into an unsafe segment is rejected before JSON file read.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 2.11. In `WorkflowRuntime.test.ts`, preserve coverage proving static selected-project `jsonOptionsSource` behavior still renders `planning/Epics.index.json` options and still rejects invalid static `sourcePathSegments`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

### Phase 3 - Backend-Only Story Index Status Update Support

After completing this phase, pause for QA review before moving to Phase 4.

[ ] Task 3. Add the backend-only `update_story_index_status` tool surface and runtime action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpdateStoryIndexStatusToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UpdateStoryIndexStatusToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 3.1. In `tools.ts`, add `UPDATE_STORY_INDEX_STATUS = "update_story_index_status"` to `ClineDefaultTool` next to the other story workflow tools.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[x] Subtask 3.2. In `assistant-message/index.ts`, add `stories_index`, `story_identity`, `status`, and `expected_current_status` to `toolParamNames`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`

[x] Subtask 3.3. In `backendWorkflowToolContracts.ts`, add a backend workflow tool contract for `ClineDefaultTool.UPDATE_STORY_INDEX_STATUS` with required string parameters `stories_index`, `story_identity`, and `status`, plus optional string parameter `expected_current_status`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

[x] Subtask 3.4. In `ResponseToolRegistry.ts`, add `ClineDefaultTool.UPDATE_STORY_INDEX_STATUS: undefined` so the tool is explicitly not a response tool.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

[x] Subtask 3.5. In `autoApprove.ts`, include `ClineDefaultTool.UPDATE_STORY_INDEX_STATUS` in the same edit-file approval branches as `PLAN_STORY_ARTIFACTS`, `GENERATE_STORY_FILES`, and `MOVE_WORKFLOW_PROJECT_FILE`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`

[x] Subtask 3.6. Add `UpdateStoryIndexStatusToolHandler.ts` implementing an `IToolHandler` for `ClineDefaultTool.UPDATE_STORY_INDEX_STATUS` that rejects partial blocks, rejects unsupported parameters, validates required non-empty string parameters, validates `status` as `draft`, `backlog`, `review`, or `complete`, and accepts optional non-empty `expected_current_status`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpdateStoryIndexStatusToolHandler.ts`

[x] Subtask 3.7. In `UpdateStoryIndexStatusToolHandler.ts`, before mutation, call the backend contract guard, validate the `stories_index` path through `ToolValidator.checkClineIgnorePath(...)`, apply standard approval/pre-tool-use handling following the `PlanStoryArtifactsToolHandler` path-mutation pattern, then call `config.workflowRuntime.updateStoryIndexStatus(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpdateStoryIndexStatusToolHandler.ts`

[x] Subtask 3.8. In `UpdateStoryIndexStatusToolHandler.ts`, after successful runtime mutation, set `didEditFile`, invalidate `fileReadCache` for the story index path, reset `consecutiveMistakeCount`, and return JSON containing `persisted: true`, `stories_index`, `story_identity`, `previous_status`, and `status`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpdateStoryIndexStatusToolHandler.ts`

[x] Subtask 3.9. In `ToolExecutorCoordinator.ts`, import and register `UpdateStoryIndexStatusToolHandler` in `toolHandlersMap`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[x] Subtask 3.10. In `types.ts`, add a `WorkflowDecisionAction` variant `{ kind: "update_story_index_status"; storyIndexWorkflowValueKey: string; storyIdentityWorkflowValueKey: string; status: WorkflowStoryStatus; expectedCurrentStatus?: WorkflowStoryStatus }` and import `WorkflowStoryStatus` from `storyArtifacts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 3.11. In `WorkflowRuntime.ts`, add public `updateStoryIndexStatus(...)` runtime method that validates the active session, validates the expected story index path against the supplied path, reads/parses the existing story index, locates the selected story by identity, enforces `expectedCurrentStatus` when supplied, updates only the selected entry's `status`, writes the story index with `writeWorkflowStoryIndex(...)`, and returns previous/new status metadata.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 3.12. In `WorkflowRuntime.ts`, add a `buildNextActionFromDecisionTreeAction(...)` branch for `update_story_index_status` that reads required string workflow values from `storyIndexWorkflowValueKey` and `storyIdentityWorkflowValueKey`, builds an `execute_tool_backed_operation` for `ClineDefaultTool.UPDATE_STORY_INDEX_STATUS`, and passes `stories_index`, `story_identity`, `status`, and optional `expected_current_status` as tool params.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 3.13. In `WorkflowRuntime.ts`, extend workflow definition validation so `update_story_index_status.storyIndexWorkflowValueKey` and `update_story_index_status.storyIdentityWorkflowValueKey` must be trimmed, non-empty, and declared in `workflowValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 3.14. Add `UpdateStoryIndexStatusToolHandler.test.ts` covering missing params, unsupported params, invalid status, cline-ignore denial, approval denial, expected-current-status mismatch, successful mutation, cache invalidation, and no direct model response behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UpdateStoryIndexStatusToolHandler.test.ts`

[x] Subtask 3.15. In `WorkflowRuntime.test.ts`, add coverage proving `update_story_index_status` decision actions build an `UPDATE_STORY_INDEX_STATUS` tool-backed operation with params sourced from workflow values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 3.16. In `WorkflowRuntime.test.ts`, add coverage proving successful `update_story_index_status` tool results route through `tool_backed_operation_succeeded` and failed/denied results route through `tool_backed_operation_failed`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 3.17. In `workflow-runtime-metadata.test.ts`, add assertions that `UPDATE_STORY_INDEX_STATUS` is present in backend workflow tool contracts with the exact approved parameter names and is not treated as a response tool.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

### Phase 4 - Create-Story Tool Schema Builders

After completing this phase, pause for QA review before moving to Phase 5.

[x] Task 4. Add module-owned create-story tool-schema builders and tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`

[x] Subtask 4.1. Create `createStoryToolSchemas.ts` with module-local schema builders for `read_file`, `read_file_range`, `list_files`, `search_files`, `list_code_definition_names`, `apply_patch`, `send_user_message`, `ask_followup_question`, `workflow_progress_request`, and `attempt_completion`, following the current pi-planning/create-architecture schema shapes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`

[x] Subtask 4.2. In `createStoryToolSchemas.ts`, export `buildCreateStoryStep1ToolSchemas()` returning an empty readonly tool array.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`

[x] Subtask 4.3. In `createStoryToolSchemas.ts`, export `buildCreateStoryStep2ToolSchemas()` returning exactly `read_file`, `send_user_message`, `ask_followup_question`, `workflow_progress_request`, `apply_patch`, `list_files`, `search_files`, `list_code_definition_names`, and `read_file_range`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`

[x] Subtask 4.4. In `createStoryToolSchemas.ts`, export `buildCreateStoryStep3ToolSchemas()` returning exactly `list_files`, `search_files`, `list_code_definition_names`, `read_file`, `read_file_range`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`

[x] Subtask 4.5. In `createStoryToolSchemas.ts`, export `buildCreateStoryStep4ToolSchemas()` returning exactly `read_file`, `read_file_range`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`

[x] Subtask 4.6. Add `createStoryToolSchemas.test.ts` asserting exact tool-name order for Step 1 through Step 4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`

[x] Subtask 4.7. In `createStoryToolSchemas.test.ts`, add negative assertions proving no step exposes `set_workflow_values`, `plan_story_artifacts`, `plan_remediation_story_artifact`, `generate_story_files`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `update_story_index_status`, or `execute_command`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`

[x] Subtask 4.8. In `WorkflowRuntime.ts`, in the `update_story_index_status` decision-action branch, replace the inferred ternary `toolParams` object with an explicit `const toolParams: Record<string, string>` containing `stories_index`, `story_identity`, and `status`; add `expected_current_status` to that record only inside an `if (action.expectedCurrentStatus !== undefined)` block before passing `toolParams` to the `UPDATE_STORY_INDEX_STATUS` tool-backed operation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

### Phase 5 - Create-Story Workflow Definition And Step 1 Routing

After completing this phase, pause for QA review before moving to Phase 6.

[ ] Task 5. Add the create-story workflow definition with runtime-driven Step 1 behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

[ ] Subtask 5.1. Create `createStoryWorkflow.ts` exporting constants for workflow identity, description, project subfolder, and structured `WorkflowPersonaDefinition` matching `create-story-requirements.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.2. In `createStoryWorkflow.ts`, define an enum for every create-story workflow value key required by `create-story-requirements.md`, including entry project keys, prerequisite paths, selected epic/story values, remediation context values, `revise_backlog_story`, and `target_story_filename_for_move`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.3. In `createStoryWorkflow.ts`, define `CREATE_STORY_WORKFLOW_VALUE_KEYS` from the enum values and set `entryProjectValueKeys` to `projectMode`, `projectTitle`, and `projectFolderName`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.4. In `createStoryWorkflow.ts`, define `prerequisiteFiles` for `architecture_document`, `epics_document`, `epics_index`, and optional `brainstorming_document`, using exact filename matches, required/optional status, project subfolders, producing workflow names, workflow value keys, and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.5. In `createStoryWorkflow.ts`, add typed helpers for reading/parsing `Epics.index.json`, resolving `stories_index` as `implementation/epic-{E}-stories.index.json`, reading/parsing the selected story index, resolving story file paths from status, and deriving remediation parent/finding paths.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.6. In `createStoryWorkflow.ts`, add a Step 1 target-epic workflow form containing only Panel A, with a required epic dropdown populated from `planning/Epics.index.json` through `jsonOptionsSource.root.kind = "selected_project_root"` and a terminal transition after submission.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.7. In `createStoryWorkflow.ts`, add a deterministic procedure that runs after the target-epic form completes, reads the submitted `epic_identity`, derives and persists `target_epic`, derives the selected epic `stories_index` path, and persists `stories_index` only when the story index file exists.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.8. In `createStoryWorkflow.ts`, add a Step 1 story-selection workflow form whose first panel is Panel B, with a required story dropdown populated through `jsonOptionsSource.root.kind = "selected_project_root"` and `sourcePathSegments` deriving `implementation/epic-{workflow.epic_identity}-stories.index.json` from persisted workflow values, and a terminal transition after submission.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.9. In `createStoryWorkflow.ts`, add Panel C to the story-selection workflow form with the prescribed backlog revision yes/no field, a terminal submit transition, `allowedActions: ["submit", "back"]`, and back behavior returning to Panel B while clearing `revise_backlog_story`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.10. In `createStoryWorkflow.ts`, add Panel D to the story-selection workflow form as the prescribed no-revision confirmation panel with no story mutation behavior and a terminal submit transition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.11. In `createStoryWorkflow.ts`, add Panel E to the story-selection workflow form as the prescribed review/complete blocked-story panel with `allowedActions: ["back"]` and back behavior returning to Panel B.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.12. In `createStoryWorkflow.ts`, add Step 1 cannot-continue form behavior for missing `stories_index` and `story_file_generated: false`, rendering the prescribed user-facing messages without transitioning to model-driven work.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.13. In `createStoryWorkflow.ts`, add Step 1 decision-tree routes that resolve prerequisites, render the target-epic form, run selected-epic derivation after that form completes, render the story-selection form only when `stories_index` exists, and render the missing-story-index cannot-continue form when `stories_index` does not exist.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.14. In `createStoryWorkflow.ts`, add Step 1 decision-tree routes that run selected-story derivation after Panel B completes, branch `story_file_generated: false` to the cannot-continue form, branch `draft` stories to Step 2 after deriving `target_story` and remediation context, branch `backlog` stories to Panel C, and branch `review` or `complete` stories to Panel E.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.15. In `createStoryWorkflow.ts`, add Step 1 decision-tree routes that branch Panel C yes to Step 2 after deriving `target_story` and remediation context, branch Panel C no to Panel D, and route Panel D confirmation directly to `complete_workflow`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.16. In `createStoryWorkflow.ts`, define the exported `createStoryWorkflowDefinition` with Step 1 only, no artifacts, no AI-writable workflow values, all Step 1 workflow forms, and Step 1 tool-schema delegation to `buildCreateStoryStep1ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 5.17. Create `index.ts` exporting `createStoryWorkflowDefinition` and any module constants required by tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/index.ts`

[ ] Subtask 5.18. Add `createStoryWorkflow.test.ts` coverage for workflow identity, metadata, persona shape, workflow value inventory, absence of AI-writable workflow values, entry project keys, prerequisite declarations, and no artifacts.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

[ ] Subtask 5.19. In `createStoryWorkflow.test.ts`, add Step 1 route/form coverage proving Panel A completion persists `epic_identity` and derives `stories_index` before Panel B can render, missing story-index blocks before Panel B, Panel B uses selected-project `jsonOptionsSource` with interpolated `sourcePathSegments`, selected-story derivation occurs after Panel B completion, generated-file blocking works, status-based branching works, Panel C back returns to Panel B, Panel D confirmation completes, and Panel E back returns to Panel B.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

### Phase 6 - Create-Story Model Steps And Finalization Routing

After completing this phase, pause for QA review before moving to Phase 7.

[ ] Task 6. Add model-driven Step 2 through Step 4 prompts, progression routes, and finalization routes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

[ ] Subtask 6.1. In `createStoryWorkflow.ts`, add Step 2 prompt-source builder that renders the context-review instructions required by `create-story-requirements.md` for primary draft, remediation draft, and backlog revision variants.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 6.2. In `createStoryWorkflow.ts`, add Step 2 decision tree that enters `project_prompt`, transitions to Step 3 only on `workflow_progress_request_confirmed`, and returns to the Step 2 project prompt on `workflow_progress_request_denied`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 6.3. In `createStoryWorkflow.ts`, add Step 3 prompt-source builder that renders the task/subtask authoring instructions required by `create-story-requirements.md` for draft and backlog revision variants.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 6.4. In `createStoryWorkflow.ts`, add Step 3 decision tree that enters `project_prompt`, transitions to Step 4 only on `workflow_progress_request_confirmed`, and returns to the Step 3 project prompt on `workflow_progress_request_denied`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 6.5. In `createStoryWorkflow.ts`, add Step 4 prompt-source builder that renders final story handoff validation instructions and tells the AI to call `attempt_completion` only after validation passes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 6.6. In `createStoryWorkflow.ts`, add Step 4 decision tree entry route to `project_prompt` and an `attempt_completion_succeeded` route for draft stories that runs `update_story_index_status` from `draft` to `backlog`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 6.7. In `createStoryWorkflow.ts`, add draft-story success routing from `update_story_index_status` to `move_project_file` from `implementation/drafts` to `implementation/stories-backlog` using `target_story_filename_for_move`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 6.8. In `createStoryWorkflow.ts`, add draft-story success routing from successful `move_project_file` to `complete_workflow`, and route failed status update or failed move to `terminal_error`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 6.9. In `createStoryWorkflow.ts`, add Step 4 `attempt_completion_succeeded` routing for backlog revisions that confirms or sets story status to `backlog` through `update_story_index_status` and routes successful status confirmation to `complete_workflow`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 6.10. In `createStoryWorkflow.ts`, update `createStoryWorkflowDefinition.steps` to include Step 2, Step 3, and Step 4 with exact checklist labels and direct tool-schema delegation to the named builders in `createStoryToolSchemas.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`

[ ] Subtask 6.11. In `createStoryWorkflow.test.ts`, add prompt-source coverage for Step 2 primary draft, remediation draft, and backlog revision variants using shape/invariant assertions rather than exact editable prose equality.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

[ ] Subtask 6.12. In `createStoryWorkflow.test.ts`, add prompt-source coverage for Step 3 draft and backlog revision variants using shape/invariant assertions rather than exact editable prose equality.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

[ ] Subtask 6.13. In `createStoryWorkflow.test.ts`, add Step 4 prompt-source coverage proving it contains validation/final handoff requirements and exposes completion only through Step 4 schema.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

[ ] Subtask 6.14. In `createStoryWorkflow.test.ts`, add decision-tree route coverage for Step 2 and Step 3 progress confirmation/denial behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

[ ] Subtask 6.15. In `createStoryWorkflow.test.ts`, add Step 4 decision-tree route coverage proving draft story finalization performs status update, then file move, then workflow completion, and routes failures to terminal error.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

[ ] Subtask 6.16. In `createStoryWorkflow.test.ts`, add Step 4 decision-tree route coverage proving backlog revision finalization performs story-index status confirmation without file movement before workflow completion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

### Phase 7 - Registry And Prompt Projection Integration

After completing this phase, pause for QA review before moving to Phase 8.

[ ] Task 7. Register create-story and validate prompt-projection behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

[ ] Subtask 7.1. In `WorkflowRegistry.ts`, import `createStoryWorkflowDefinition` from the create-story module and add it to `shippedWorkflowDefinitions`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[ ] Subtask 7.2. In `createStoryWorkflow.test.ts`, add registry-facing assertions proving the workflow identity, slash command, and skill name are all `create-story` and no `.md` alias is registered by the module.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

[ ] Subtask 7.3. In `integration.test.ts`, add prompt integration coverage proving create-story current step details appear in input payload, not workflow system instructions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 7.4. In `integration.test.ts`, add prompt integration coverage proving each active create-story step projects the exact native tool surface returned by its module-owned tool-schema builder.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 7.5. In `integration.test.ts`, add prompt integration coverage proving response-tool guidance includes `workflow_progress_request` only for Step 2 and Step 3 and includes `attempt_completion` only for Step 4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 7.6. In `integration.test.ts`, add negative prompt-projection assertions proving backend-only runtime tools, story planning tools, `set_workflow_values`, and `update_story_index_status` are not statically exposed for create-story.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

### Phase 8 - Legacy Create-Story Package Cleanup

After completing this phase, pause for QA review before moving to Phase 9.

[ ] Task 8. Remove retired create-story package files and verify retired story document handler absence.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-create-story/SKILL.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-create-story/bmad-skill-manifest.yaml`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-create-story/checklist.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-create-story/discover-inputs.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-create-story/template.md`

[ ] Subtask 8.1. Delete `.cline/skills/bmad-create-story/SKILL.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-create-story/SKILL.md`

[ ] Subtask 8.2. Delete `.cline/skills/bmad-create-story/bmad-skill-manifest.yaml`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-create-story/bmad-skill-manifest.yaml`

[ ] Subtask 8.3. Delete `.cline/skills/bmad-create-story/checklist.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-create-story/checklist.md`

[ ] Subtask 8.4. Delete `.cline/skills/bmad-create-story/discover-inputs.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-create-story/discover-inputs.md`

[ ] Subtask 8.5. Delete `.cline/skills/bmad-create-story/template.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-create-story/template.md`

### Phase 9 - Final Validation

[ ] Task 9. Run final validation for the complete create-story buildout.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-story/action-plan.md`

[ ] Subtask 9.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts` and mark this subtask complete only if it passes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-story/action-plan.md`

[ ] Subtask 9.2. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` and mark this subtask complete only if it passes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-story/action-plan.md`

[ ] Subtask 9.3. Run `npm run test:unit -- src/core/task/tools/handlers/__tests__/UpdateStoryIndexStatusToolHandler.test.ts` and mark this subtask complete only if it passes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-story/action-plan.md`

[ ] Subtask 9.4. Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts` and mark this subtask complete only if it passes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-story/action-plan.md`

[ ] Subtask 9.5. Run `rg -n "BuildStoryDocumentToolHandler" src .cline` and mark this subtask complete only if it returns no active runtime matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-story/action-plan.md`

[ ] Subtask 9.6. Run `rg -n "build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|update_story_index_status|set_workflow_values|plan_story_artifacts|plan_remediation_story_artifact|generate_story_files|execute_command" src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts` and mark this subtask complete only if it returns no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-story/action-plan.md`

[ ] Subtask 9.7. Run `rg -n "_bmad|sm\\.md|create-story\\.md|\\.cline/skills/bmad-create-story" src/core/task/workflow-runtime/workflow-modules/create-story` and mark this subtask complete only if it returns no runtime dependency matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-story/action-plan.md`

[ ] Subtask 9.8. Run `npm run check-types` and mark this subtask complete only if it passes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-story/action-plan.md`

[ ] Subtask 9.9. Run `npm run lint` and mark this subtask complete only if it passes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-story/action-plan.md`

## Validation

Phase-level QA must run the focused tests added or changed by that phase, plus `npm run check-types` and `npm run lint` before the phase is considered commit-ready.

Final validation is prescribed in Phase 9 and must pass before the create-story workflow module buildout is considered complete.
