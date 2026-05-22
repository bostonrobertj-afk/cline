## FrontMatter
- Read this plan from top to bottom before making any changes.
- Read each task and subtask in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
  - Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete.
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

This plan builds and registers the product-owned `pi-planning` workflow module described by [pi-planning-requirements.md](./pi-planning-requirements.md).

This plan also includes the approved shared handler support needed for module-owned routes to advance after successful model-called story planning tools:

- `plan_story_artifacts` must ask workflow runtime for the next action after successful story-index persistence.
- `generate_story_files` must ask workflow runtime for the next action after successful story-file generation.

Approved implementation decisions:

- Panel A stores the selected epic's canonical `identity` as `epic_identity` using `jsonOptionsSource.valueProperty = "identity"`.
- `target_epic`, `stories_index`, and `stories_index_existed_at_workflow_start` are derived deterministically after Panel A submission by reading the selected project's `planning/Epics.index.json`.
- `implementation_folder` and `drafts_folder` are derived from the resolved `epics_index` path using `projectRoot = dirname(dirname(epics_index))`, then `implementation_folder = join(projectRoot, "implementation")` and `drafts_folder = join(projectRoot, "implementation", "drafts")`.
- The removed Required Context panel must not remain in the active Step 1 workflow form. Panel B is the edit-intent panel, Panel C is the story-selection panel, and Panel D is the additional-context panel.

Sibling-pattern audit summary:

- Story planning handler re-entry support must touch only the two story tool handlers and their handler tests.
- Module-owned tool exposure must live only in `piPlanningToolSchemas.ts`.
- Module-owned workflow identity, values, prerequisites, forms, deterministic procedures, prompts, and decision trees must live in `piPlanningWorkflow.ts`.
- Module registration must touch `WorkflowRegistry.ts`, module tests, and prompt-projection tests.
- No new artifact family, backend tool, document builder, or runtime form capability is introduced by this plan.

## Scope Boundary

- Do not implement or revise `brainstorming`, `create-architecture`, `create-epics`, `create-prd`, `create-story`, `dev-story`, `code-review`, `write-remediation-story`, or any other workflow module in this plan.
- Do not read `/Users/robertboston/Documents/Cline/Workflows/pi-planning.md`, `_bmad/bmm/agents/pm.md`, BMAD workflow package files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime.
- Do not create or depend on `Epic-{E}-delivery-spec.md`.
- Do not add a pi-planning document builder.
- Do not add a new artifact family.
- Do not add a new backend tool.
- Do not expose `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, or `move_workflow_project_file` in any pi-planning model-facing tool schema.
- Do not expose `set_workflow_values` outside Step 4, and Step 4 must restrict it to `stories_index`.
- Do not expose `execute_command` in the pi-planning workflow.
- Do not add compatibility aliases for `pi-planning.md`; the runtime workflow identity is `pi-planning`.
- Do not add exact prompt-prose tests for editable step prompt wording unless the assertion protects a stable runtime contract or forbidden tool boundary.

## Known Issues / Risks / Technical Debt

- The current module pattern stores module-owned prompt and workflow-form copy in TypeScript constants instead of a string resource system. This plan follows the established workflow-runtime module pattern.
- `pi-planning-requirements.md` requires `additional_context` to be an array, but current workflow form large-text submissions persist strings unless transformed by code. This plan preserves form submission as text and requires prompt rendering to treat it as user-provided path text, matching existing workflow form behavior. If array normalization becomes required later, it should be added as explicit foundational form/value transformation support.
- The `PlanStoryArtifactsToolHandler` and `GenerateStoryFilesToolHandler` re-entry updates are shared handler changes. They are included here only because the user approved them as necessary for module-owned route progression after model-called story tools.

## Tasks / Subtasks

### Phase 1 - Shared Story Tool Handler Re-entry Support

After completing this phase, pause for QA review before moving to Phase 2.

[x] Task 1. Update story planning tool handlers so successful model-called tools re-enter workflow route evaluation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/PlanStoryArtifactsToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/GenerateStoryFilesToolHandler.ts`

[x] Subtask 1.1. In `PlanStoryArtifactsToolHandler.ts`, after successful `config.workflowRuntime.planStoryArtifacts(...)`, cache invalidation, `didEditFile` update, and `consecutiveMistakeCount` reset, call `config.workflowRuntime.resolveNextAction({ taskState: config.taskState })` before returning the success result.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/PlanStoryArtifactsToolHandler.ts`

[x] Subtask 1.2. In `PlanStoryArtifactsToolHandler.ts`, if the next action from `resolveNextAction(...)` is not `no_op`, queue it through `config.callbacks.queueWorkflowNextAction(nextAction)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/PlanStoryArtifactsToolHandler.ts`

[x] Subtask 1.3. In `GenerateStoryFilesToolHandler.ts`, after successful `config.workflowRuntime.generateStoryFiles(...)`, cache invalidation, `didEditFile` update, and `consecutiveMistakeCount` reset, call `config.workflowRuntime.resolveNextAction({ taskState: config.taskState })` before returning the success result.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/GenerateStoryFilesToolHandler.ts`

[x] Subtask 1.4. In `GenerateStoryFilesToolHandler.ts`, if the next action from `resolveNextAction(...)` is not `no_op`, queue it through `config.callbacks.queueWorkflowNextAction(nextAction)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/GenerateStoryFilesToolHandler.ts`

[x] Task 2. Update handler tests for successful next-action re-entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/PlanStoryArtifactsToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/GenerateStoryFilesToolHandler.test.ts`

[x] Subtask 2.1. In `PlanStoryArtifactsToolHandler.test.ts`, add a `resolveNextAction` Sinon stub to the default `workflowRuntime` test double, defaulting to `{ kind: "no_op" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/PlanStoryArtifactsToolHandler.test.ts`

[x] Subtask 2.2. In `PlanStoryArtifactsToolHandler.test.ts`, expose the `resolveNextAction` stub through the returned `stubs` object.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/PlanStoryArtifactsToolHandler.test.ts`

[x] Subtask 2.3. In the existing successful `plan_story_artifacts` test, assert `resolveNextAction` is called once with `{ taskState: config.taskState }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/PlanStoryArtifactsToolHandler.test.ts`

[x] Subtask 2.4. In `PlanStoryArtifactsToolHandler.test.ts`, add coverage proving a non-`no_op` next action returned by `resolveNextAction` is queued through `callbacks.queueWorkflowNextAction(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/PlanStoryArtifactsToolHandler.test.ts`

[x] Subtask 2.5. In `GenerateStoryFilesToolHandler.test.ts`, add a `resolveNextAction` Sinon stub to the default `workflowRuntime` test double, defaulting to `{ kind: "no_op" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/GenerateStoryFilesToolHandler.test.ts`

[x] Subtask 2.6. In `GenerateStoryFilesToolHandler.test.ts`, expose the `resolveNextAction` stub through the returned `stubs` object.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/GenerateStoryFilesToolHandler.test.ts`

[x] Subtask 2.7. In the existing successful `generate_story_files` test, assert `resolveNextAction` is called once with `{ taskState: config.taskState }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/GenerateStoryFilesToolHandler.test.ts`

[x] Subtask 2.8. In `GenerateStoryFilesToolHandler.test.ts`, add coverage proving a non-`no_op` next action returned by `resolveNextAction` is queued through `callbacks.queueWorkflowNextAction(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/GenerateStoryFilesToolHandler.test.ts`

### Phase 2 - Pi Planning Tool Schema Builders

After completing this phase, pause for QA review before moving to Phase 3.

[x] Task 3. Create the module-owned pi-planning tool-schema builders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`

[x] Subtask 3.1. Create `src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts` importing `ClineToolSpec`, `AGENT_FEEDBACK_PARAMETER`, `ModelFamily`, and `ClineDefaultTool`, and define module-local constant `PI_PLANNING_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.2. In `piPlanningToolSchemas.ts`, export `buildPiPlanningStep1ToolSchemas(): readonly ClineToolSpec[]` returning an empty readonly array.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.3. In `piPlanningToolSchemas.ts`, export `buildPiPlanningReadFileToolSchema(): ClineToolSpec` using `ClineDefaultTool.FILE_READ`, name `read_file`, and one required string `path` parameter matching the existing create-architecture read-file schema shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.4. In `piPlanningToolSchemas.ts`, export `buildPiPlanningReadFileRangeToolSchema(): ClineToolSpec` using `ClineDefaultTool.FILE_READ_RANGE`, name `read_file_range`, and required `path`, `start_line`, and `end_line` parameters matching the existing create-architecture read-file-range schema shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.5. In `piPlanningToolSchemas.ts`, export `buildPiPlanningListFilesToolSchema(): ClineToolSpec` using `ClineDefaultTool.LIST_FILES`, name `list_files`, required string `path`, and optional boolean `recursive` parameters matching the existing create-architecture list-files schema shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.6. In `piPlanningToolSchemas.ts`, export `buildPiPlanningSearchFilesToolSchema(): ClineToolSpec` using `ClineDefaultTool.SEARCH`, name `search_files`, required string `path` and `regex`, and optional string `file_pattern` parameters matching the existing create-architecture search-files schema shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.7. In `piPlanningToolSchemas.ts`, export `buildPiPlanningListCodeDefinitionNamesToolSchema(): ClineToolSpec` using `ClineDefaultTool.LIST_CODE_DEF`, name `list_code_definition_names`, and one required string `path` parameter matching the existing create-architecture list-code-definition-names schema shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.8. In `piPlanningToolSchemas.ts`, export `buildPiPlanningApplyPatchToolSchema(): ClineToolSpec` using `ClineDefaultTool.APPLY_PATCH`, name `apply_patch`, and one required string `input` parameter matching the existing create-architecture apply-patch schema shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.9. In `piPlanningToolSchemas.ts`, export `buildPiPlanningSendUserMessageToolSchema(): ClineToolSpec` using `ClineDefaultTool.SEND_USER_MESSAGE`, name `send_user_message`, one required string `message` parameter, and `AGENT_FEEDBACK_PARAMETER`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.10. In `piPlanningToolSchemas.ts`, export `buildPiPlanningAskFollowupQuestionToolSchema(): ClineToolSpec` using `ClineDefaultTool.ASK`, name `ask_followup_question`, required string `question`, required string-array `options`, and `AGENT_FEEDBACK_PARAMETER`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.11. In `piPlanningToolSchemas.ts`, export `buildPiPlanningWorkflowProgressRequestToolSchema(): ClineToolSpec` using `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST`, name `workflow_progress_request`, and no parameters.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.12. In `piPlanningToolSchemas.ts`, export `buildPiPlanningAttemptCompletionToolSchema(): ClineToolSpec` using `ClineDefaultTool.ATTEMPT`, name `attempt_completion`, and one required string `result` parameter.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.13. In `piPlanningToolSchemas.ts`, export `buildPiPlanningPlanStoryArtifactsToolSchema(): ClineToolSpec` using `ClineDefaultTool.PLAN_STORY_ARTIFACTS`, name `plan_story_artifacts`, required string `epic_identity`, and required integer `story_count`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.14. In `piPlanningToolSchemas.ts`, export `buildPiPlanningGenerateStoryFilesToolSchema(): ClineToolSpec` using `ClineDefaultTool.GENERATE_STORY_FILES`, name `generate_story_files`, and required string `epic_identity`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.15. In `piPlanningToolSchemas.ts`, export `buildPiPlanningSetWorkflowValuesToolSchema(): ClineToolSpec` using `ClineDefaultTool.SET_WORKFLOW_VALUES`, name `set_workflow_values`, and one required object parameter `values` with only one allowed property `stories_index` of type string and `requiredProperties: ["stories_index"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.16. In `piPlanningToolSchemas.ts`, export `buildPiPlanningStep2ToolSchemas()` returning exactly `read_file`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.17. In `piPlanningToolSchemas.ts`, export `buildPiPlanningStep3ToolSchemas()` returning exactly `list_files`, `search_files`, `list_code_definition_names`, `read_file`, `read_file_range`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.18. In `piPlanningToolSchemas.ts`, export `buildPiPlanningStep4ToolSchemas()` returning exactly `read_file`, `plan_story_artifacts`, `set_workflow_values`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.19. In `piPlanningToolSchemas.ts`, export `buildPiPlanningStep5ToolSchemas()` returning exactly `generate_story_files`, `send_user_message`, and `ask_followup_question`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Subtask 3.20. In `piPlanningToolSchemas.ts`, export `buildPiPlanningStep6ToolSchemas()` returning exactly `list_files`, `read_file`, `apply_patch`, `plan_story_artifacts`, `generate_story_files`, `send_user_message`, `ask_followup_question`, and `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

[x] Task 4. Add focused tool-schema tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`

[x] Subtask 4.1. Create `piPlanningToolSchemas.test.ts` with a `schemaNames(...)` helper that maps `readonly ClineToolSpec[]` to tool names.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`

[x] Subtask 4.2. In `piPlanningToolSchemas.test.ts`, add coverage proving Step 1 returns an empty schema array.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`

[x] Subtask 4.3. In `piPlanningToolSchemas.test.ts`, add exact-order coverage for Step 2 through Step 6 tool names matching Subtasks 3.16 through 3.20.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`

[x] Subtask 4.4. In `piPlanningToolSchemas.test.ts`, add coverage proving `set_workflow_values` appears only in Step 4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`

[x] Subtask 4.5. In `piPlanningToolSchemas.test.ts`, add coverage proving the Step 4 `set_workflow_values` schema only permits the `stories_index` value key.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`

[x] Subtask 4.6. In `piPlanningToolSchemas.test.ts`, add coverage proving model-facing schemas do not expose `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, or `execute_command`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`

### Phase 3 - Pi Planning Workflow Definition, Values, Prerequisites, And Forms

After completing this phase, pause for QA review before moving to Phase 4.

[x] Task 5. Create the pi-planning workflow definition scaffold and metadata.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 5.1. Create `piPlanningWorkflow.ts` importing `dirname` and `join` from `node:path`, `readFile` from `node:fs/promises`, `WorkflowFormDefinitionPayload`, the required workflow-runtime types, and all `buildPiPlanningStep{N}ToolSchemas` exports from `piPlanningToolSchemas.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 5.2. In `piPlanningWorkflow.ts`, add exported enum `PiPlanningWorkflowValueKey` with exactly `ProjectMode`, `ProjectTitle`, `ProjectFolderName`, `ImplementationFolder`, `DraftsFolder`, `ArchitectureDocument`, `EpicsDocument`, `EpicsIndex`, `BrainstormingDocument`, `AdditionalContext`, `TargetEpic`, `EpicIdentity`, and `StoriesIndex`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 5.3. In `piPlanningWorkflow.ts`, add constants for workflow name `pi-planning`, display name `PI Planning`, slash command `pi-planning`, use-skill name `pi-planning`, project subfolder `planning`, and description `Break a selected epic into implementation-ready draft story files using architecture, epics, and optional discovery context.`

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 5.4. In `piPlanningWorkflow.ts`, add `PI_PLANNING_WORKFLOW_PERSONA` with `name: "John"`, `role: "Product Manager"`, an identity describing breaking well-defined epics down into deliverable stories with clear scope, capabilities including breaking epics into deliverable stories with clear scope, communication style that is detailed, diligent, to-the-point, and does not encourage assumptions, and principles including validation of documentation coverage and consistency against existing runtime code.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 5.5. In `piPlanningWorkflow.ts`, add `PI_PLANNING_WORKFLOW_VALUE_KEYS` as `Object.values(PiPlanningWorkflowValueKey)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 5.6. In `piPlanningWorkflow.ts`, define prerequisite ids `ARCHITECTURE_PREREQUISITE_ID`, `EPICS_DOCUMENT_PREREQUISITE_ID`, `EPICS_INDEX_PREREQUISITE_ID`, and `BRAINSTORMING_PREREQUISITE_ID` matching their workflow value key strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 5.7. In `index.ts`, export `piPlanningWorkflowDefinition` from `./piPlanningWorkflow`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/index.ts`

[x] Task 6. Add Step 1 deterministic helpers and workflow form.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 6.1. In `piPlanningWorkflow.ts`, add typed helper `readWorkflowStringValue(workflowValues, key): string | undefined` that returns a trimmed non-empty string or `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 6.2. In `piPlanningWorkflow.ts`, add interfaces for the `Epics.index.json` schema: a valid epic index contains `version: 1` and `epics` entries with `identity`, `title`, and `"story-index-generated"` fields.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 6.3. In `piPlanningWorkflow.ts`, add a parser helper that accepts unknown JSON and returns the valid `Epics.index.json` shape only when `version` is `1`, `epics` is an array, each `identity` is a non-empty positive numeric string, each `title` is a non-empty string, and each `"story-index-generated"` value is boolean.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 6.4. In `piPlanningWorkflow.ts`, add `persistProjectFolderValuesFromEpicsIndex(session): WorkflowDeterministicProcedureResult` that reads `epics_index`, derives `projectRoot = dirname(dirname(epics_index))`, and writes `implementation_folder` and `drafts_folder`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 6.5. In `piPlanningWorkflow.ts`, add async deterministic helper `deriveSelectedEpicValuesFromForm(session): Promise<WorkflowDeterministicProcedureResult>` that reads `epic_identity` and `epics_index`, parses the index file, finds the matching epic, writes `target_epic` as `Epic {identity}: {title}`, and writes `stories_index` only when `"story-index-generated"` is `true`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 6.6. In `deriveSelectedEpicValuesFromForm(...)`, when `"story-index-generated"` is `false`, return workflow value writes for `target_epic` only and do not write `stories_index`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 6.7. In `piPlanningWorkflow.ts`, add `buildStep1InputWorkflowForm(): WorkflowFormDefinitionPayload` with `definitionVersion: 2`, title `PI Planning Inputs`, tool dictionary title `PI Planning Inputs`, and first panel id `step-1-target-epic-panel`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 6.8. In `buildStep1InputWorkflowForm()`, add Panel A id `step-1-target-epic-panel` with prompt `Which epic are we working on during this workflow?`, a required dropdown field keyed and persisted to `PiPlanningWorkflowValueKey.EpicIdentity`, `jsonOptionsSource` rooted at selected project root, `sourcePathSegments: ["planning", "Epics.index.json"]`, `itemsPath: "epics"`, `valueProperty: "identity"`, `labelTemplate: "Epic {identity}: {title}"`, and `descriptionTemplate: "Story index generated: {story-index-generated}"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 6.9. In `buildStep1InputWorkflowForm()`, make Panel A transition sequentially to Panel B id `step-1-required-context-panel`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 6.10. In `buildStep1InputWorkflowForm()`, add Panel B id `step-1-required-context-panel` with no fields, `allowedActions: ["submit"]`, submit label `Continue`, and prompt markdown listing `[Epics.index.json](<{workflow.epics_index}>)`, `[Epics.md](<{workflow.epics_document}>)`, and `[architecture.md](<{workflow.architecture_document}>)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 6.11. In `buildStep1InputWorkflowForm()`, make Panel B transition sequentially to Panel C id `step-1-additional-context-panel`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 6.12. In `buildStep1InputWorkflowForm()`, add Panel C id `step-1-additional-context-panel` with prompt `If you'd like to include any other files as workflow context please provide their full file paths below.`, one optional large-text field keyed and persisted to `PiPlanningWorkflowValueKey.AdditionalContext`, `presentation.textareaSize: "large"`, `allowedActions: ["submit", "back"]`, and a terminal transition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Task 7. Add the workflow definition with prerequisites and Step 1 routing.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.1. In `piPlanningWorkflow.ts`, add `buildTerminalTransition()` using the existing terminal conditional transition pattern from other shipped modules.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.2. In `piPlanningWorkflow.ts`, add trigger helpers `workflowFormCompleted(workflowFormId)`, `workflowProgressRequestConfirmed()`, `workflowProgressRequestDenied()`, `attemptCompletionSucceeded()`, `workflowValuesPersisted(...keys)`, `toolBackedOperationSucceeded(branchId, routeId)`, and `toolBackedOperationFailed(branchId, routeId)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.3. In `piPlanningWorkflow.ts`, add `createEmptyPromptSource()` and `createStepDefinition(...)` helpers matching the shipped module pattern, with required `buildToolSchema`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.4. In `piPlanningWorkflow.ts`, add `buildStep1DecisionTree()` whose entry route always runs `resolve_prerequisite_files` for `architecture_document`, `epics_document`, `epics_index`, and `brainstorming_document`, then follows to folder value persistence.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.5. In `buildStep1DecisionTree()`, after prerequisite resolution, run `persistProjectFolderValuesFromEpicsIndex` through `run_deterministic_procedure`, then follow to form rendering.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.6. In `buildStep1DecisionTree()`, render the Step 1 input form after folder values are persisted.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.7. In `buildStep1DecisionTree()`, after Step 1 input form completion, run `deriveSelectedEpicValuesFromForm` through `run_deterministic_procedure`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.8. In `buildStep1DecisionTree()`, after `deriveSelectedEpicValuesFromForm` persists its workflow values, transition to Step 2.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.9. In `piPlanningWorkflow.ts`, export `piPlanningWorkflowDefinition: WorkflowDefinition` with no `artifacts` property.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.10. In `piPlanningWorkflowDefinition`, set identity, display, slash command, use-skill, persona, project subfolder, workflow value keys, entry project value keys, and entry panel from the constants and enum defined in Task 5.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.11. In `piPlanningWorkflowDefinition`, declare `workflowForms` with only the Step 1 input workflow form.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.12. In `piPlanningWorkflowDefinition`, declare prerequisite `architecture_document` as required, producing workflow `create-architecture`, project subfolder `["planning"]`, exact filename `architecture.md`, workflow value key `architecture_document`, and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.13. In `piPlanningWorkflowDefinition`, declare prerequisite `epics_document` as required, producing workflow `create-epics`, project subfolder `["planning"]`, exact filename `Epics.md`, workflow value key `epics_document`, and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.14. In `piPlanningWorkflowDefinition`, declare prerequisite `epics_index` as required, producing workflow `create-epics`, project subfolder `["planning"]`, exact filename `Epics.index.json`, workflow value key `epics_index`, and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 7.15. In `piPlanningWorkflowDefinition`, declare prerequisite `brainstorming_document` as optional, producing workflow `brainstorming`, project subfolder `["discovery"]`, exact filename `brainstorming.md`, workflow value key `brainstorming_document`, and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

### Phase 4 - Pi Planning Prompts And Step Decision Trees

After completing this phase, pause for QA review before moving to Phase 5.

[x] Task 8. Add module-owned prompt builders for Step 2 through Step 6.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 8.1. In `piPlanningWorkflow.ts`, add `buildStep2PromptSource(...)` that renders instructions for context review, includes `target_epic`, `epics_index`, `epics_document`, `architecture_document`, optional `brainstorming_document`, and optional `additional_context`, and includes every Step 2 issue-assessment requirement from `pi-planning-requirements.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 8.2. In `piPlanningWorkflow.ts`, add `buildStep3PromptSource(...)` that renders the story-count analysis instructions, includes the existing-story-index conditional instruction only when `stories_index` is present, and includes the story-splitting and non-story guidance from `pi-planning-requirements.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 8.3. In `piPlanningWorkflow.ts`, add `buildStep4PromptSource(...)` that renders the existing-story-index branch when `stories_index` is present and the new-story-index branch when `stories_index` is absent, including instructions to use `epic_identity`, `story_count`, `plan_story_artifacts`, `set_workflow_values`, and `workflow_progress_request` exactly as prescribed in Step 4 requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 8.4. In `piPlanningWorkflow.ts`, add `buildStep5PromptSource(...)` that renders the existing-story-index branch when `stories_index` is present and the new-story-index branch when `stories_index` is absent, and instructs the AI to call `generate_story_files` with `epic_identity`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 8.5. In `piPlanningWorkflow.ts`, add `buildStep6PromptSource(...)` that renders the draft-story population instructions, dependency sequencing order, required headings `Scope`, `Scope Boundary`, `Requirements`, `Objective`, and `Known Issues/ Risks/ Technical Debt`, and the final user-alignment plus `attempt_completion` instructions from Step 6 requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Task 9. Add Step 2 through Step 6 decision trees and attach all steps to the workflow definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9.1. In `piPlanningWorkflow.ts`, add `buildStep2DecisionTree()` with entry `project_prompt`, confirmed `workflow_progress_request` transition to Step 3, and denied `workflow_progress_request` route back to the Step 2 project prompt.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9.2. In `piPlanningWorkflow.ts`, add `buildStep3DecisionTree()` with entry `project_prompt`, confirmed `workflow_progress_request` transition to Step 4, and denied `workflow_progress_request` route back to the Step 3 project prompt.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9.3. In `piPlanningWorkflow.ts`, add `buildStep4DecisionTree()` with entry `project_prompt` followed by a waiting branch whose first route handles `workflow_progress_request_denied` by returning to the Step 4 project prompt.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9.4. In `buildStep4DecisionTree()`, add the waiting branch's second route so `workflow_progress_request_confirmed` transitions to Step 5 for the no-additional-stories branch.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9.5. In `buildStep4DecisionTree()`, add the waiting branch's third route so `workflow_values_persisted` including `stories_index` transitions to Step 5; this route handles the new-story-index branch after `set_workflow_values` persists the generated story-index path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9.6. In `buildStep4DecisionTree()`, add the waiting branch's fourth route so successful tool-backed operation completion for `plan_story_artifacts` transitions to Step 5. This route handles successful `plan_story_artifacts` re-entry for epics that already had a story index at workflow start and must not match on `stories_index` presence alone.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9.7. In `piPlanningWorkflow.ts`, add `buildStep5DecisionTree()` with entry `project_prompt` followed by a waiting branch whose route transitions to Step 6 only after successful tool-backed operation completion for `generate_story_files`. Do not use an `always` route for Step 5 advancement.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9.8. In `piPlanningWorkflow.ts`, add `buildStep6DecisionTree()` with entry `project_prompt` followed by a route from `attempt_completion_succeeded` to `complete_workflow`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9.9. In `piPlanningWorkflowDefinition.steps`, add Step 1 through Step 6 using checklist labels exactly `Gather Inputs`, `Review Context`, `Determine How Many Stories Are Needed`, `Generate an Updated Story Index`, `Generate Story Files from the Story Index`, and `Populate Story Files with Initial Details`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9.10. In `piPlanningWorkflowDefinition.steps`, make Step 1 delegate to `buildPiPlanningStep1ToolSchemas`, Step 2 to `buildPiPlanningStep2ToolSchemas`, Step 3 to `buildPiPlanningStep3ToolSchemas`, Step 4 to `buildPiPlanningStep4ToolSchemas`, Step 5 to `buildPiPlanningStep5ToolSchemas`, and Step 6 to `buildPiPlanningStep6ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Task 9A. Remediate Phase 4 model-tool lifecycle routing after foundational Phase 66.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9A.1. In `buildStep4DecisionTree()`, replace the stale existing-index route that matches `stories_index` presence with an `event_predicate` route matching `model_tool_succeeded` and `toolName === ClineDefaultTool.PLAN_STORY_ARTIFACTS`, transitioning to Step 5.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9A.2. In `buildStep4DecisionTree()`, add an `event_predicate` route matching `model_tool_failed` and `toolName === ClineDefaultTool.PLAN_STORY_ARTIFACTS`, returning to the Step 4 `project_prompt` for AI recovery.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9A.3. In `buildStep5DecisionTree()`, replace the stale `always` transition route with an `event_predicate` route matching `model_tool_succeeded` and `toolName === ClineDefaultTool.GENERATE_STORY_FILES`, transitioning to Step 6.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9A.4. In `buildStep5DecisionTree()`, add an `event_predicate` route matching `model_tool_failed` and `toolName === ClineDefaultTool.GENERATE_STORY_FILES`, returning to the Step 5 `project_prompt` for AI recovery.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Task 9B. Remediate Phase 4 story-index start-state tracking and routing.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9B.1. In `PiPlanningWorkflowValueKey`, add `StoriesIndexExistedAtWorkflowStart = "stories_index_existed_at_workflow_start"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9B.2. In `piPlanningWorkflow.ts`, add `readWorkflowBooleanValue(workflowValues: WorkflowValues, key: PiPlanningWorkflowValueKey): boolean | undefined` immediately after `readWorkflowStringValue(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9B.3. In `piPlanningWorkflow.ts`, add a trigger helper for `plan_story_artifacts` success that matches only when `model_tool_succeeded`, `toolName === ClineDefaultTool.PLAN_STORY_ARTIFACTS`, and `stories_index_existed_at_workflow_start === true`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9B.4. In `piPlanningWorkflow.ts`, add a trigger helper for `workflow_values_persisted` including `stories_index` that matches only when `stories_index_existed_at_workflow_start === false`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9B.5. In `deriveSelectedEpicValuesFromForm(...)`, update the `"story-index-generated": true` branch so its `workflowValueWrites` include `stories_index_existed_at_workflow_start: true`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9B.6. In `deriveSelectedEpicValuesFromForm(...)`, update the `"story-index-generated": false` branch so its `workflowValueWrites` include `stories_index_existed_at_workflow_start: false`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9B.7. In `buildStep3PromptSource(...)`, render the existing-story-index instruction based on `stories_index_existed_at_workflow_start === true`, not current `stories_index` presence.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9B.8. In `buildStep4PromptSource(...)`, render the existing-index branch based on `stories_index_existed_at_workflow_start === true`, not current `stories_index` presence.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9B.9. In `buildStep5PromptSource(...)`, render the existing-index branch based on `stories_index_existed_at_workflow_start === true`, not current `stories_index` presence.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9B.10. In `buildStep4DecisionTree()`, update `step-4-transition-to-step-5-after-stories-index-persisted` to use the new persisted-stories-index trigger guarded by `stories_index_existed_at_workflow_start === false`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

[x] Subtask 9B.11. In `buildStep4DecisionTree()`, update `step-4-transition-to-step-5-after-existing-stories-index-reentry` to use the new `plan_story_artifacts` success trigger guarded by `stories_index_existed_at_workflow_start === true`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

### Phase 5 - Pi Planning Module Tests

After completing this phase, pause for QA review before moving to Phase 6.

[x] Task 10. Add workflow definition tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.1. Create `piPlanningWorkflow.test.ts` with coverage proving workflow name, display name, slash command, use-skill name, description, project subfolder, and no `.md` identity aliases in the module definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.2. In `piPlanningWorkflow.test.ts`, add shape/invariant coverage for persona fields: name `John`, role `Product Manager`, non-empty identity, non-empty capabilities, non-empty communication style, and principles that include documentation/runtime-code validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.3. In `piPlanningWorkflow.test.ts`, add coverage proving every expected workflow value key is declared, including `stories_index_existed_at_workflow_start`, and no undeclared entry project value key is used.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.4. In `piPlanningWorkflow.test.ts`, add coverage proving the workflow has no artifact definitions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.5. In `piPlanningWorkflow.test.ts`, add coverage proving the four prerequisite declarations exactly match required/optional requirement, producing workflow, project subfolder, exact filename, workflow value key, and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.6. In `piPlanningWorkflow.test.ts`, add coverage proving Step 1 form Panel A uses `jsonOptionsSource` for `planning/Epics.index.json`, `itemsPath: "epics"`, `valueProperty: "identity"`, and persists `epic_identity`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.7. In `piPlanningWorkflow.test.ts`, add coverage proving Step 1 form Panel B is informational, has `fields: []`, lists the three required prerequisite workflow-value hyperlinks, and advances with submit.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.8. In `piPlanningWorkflow.test.ts`, add coverage proving Step 1 form Panel C persists optional `additional_context`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.9. In `piPlanningWorkflow.test.ts`, add coverage proving Step 1 routes through prerequisite resolution, deterministic folder persistence, form rendering, selected-epic derivation, and transition to Step 2.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.10. In `piPlanningWorkflow.test.ts`, add coverage proving selected epic derivation writes `target_epic` and `stories_index_existed_at_workflow_start` for every selected epic; writes `stories_index` only when the selected epic has `"story-index-generated": true`; writes `stories_index_existed_at_workflow_start: true` for existing-index epics; and writes `stories_index_existed_at_workflow_start: false` for new-index epics.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.11. In `piPlanningWorkflow.test.ts`, add coverage proving Step 2 through Step 6 prompt sources include required workflow value references and forbidden backend-only tool names are absent from prompt instructions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.12. In `piPlanningWorkflow.test.ts`, add coverage proving Step 3, Step 4, and Step 5 prompt builders use `stories_index_existed_at_workflow_start`, not current `stories_index` presence, for existing-story-index conditional behavior; include a regression case where `stories_index` is present and `stories_index_existed_at_workflow_start` is false.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.13. In `piPlanningWorkflow.test.ts`, add route-structure coverage proving Step 2 and Step 3 advance only on confirmed workflow progress requests and return to project prompt on denied requests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.14. In `piPlanningWorkflow.test.ts`, add route-structure coverage proving Step 4 advances on `model_tool_succeeded` for `plan_story_artifacts` only when `stories_index_existed_at_workflow_start` is true, advances on `workflow_values_persisted` including `stories_index` only when `stories_index_existed_at_workflow_start` is false, advances on confirmed `workflow_progress_request`, returns to `project_prompt` on denied `workflow_progress_request`, and returns to `project_prompt` on `model_tool_failed` for `plan_story_artifacts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.15. In `piPlanningWorkflow.test.ts`, add route-structure coverage proving Step 5 advances only on `model_tool_succeeded` for `generate_story_files` and returns to `project_prompt` on `model_tool_failed` for `generate_story_files`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

[x] Subtask 10.16. In `piPlanningWorkflow.test.ts`, add route-structure coverage proving Step 6 routes `attempt_completion_succeeded` to `complete_workflow`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

### Phase 6 - Registry And Prompt Projection

After completing this phase, pause for QA review before moving to Phase 7.

[x] Task 11. Register the pi-planning workflow.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 11.1. In `WorkflowRegistry.ts`, import `piPlanningWorkflowDefinition` from `@/core/task/workflow-runtime/workflow-modules/pi-planning`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[x] Subtask 11.2. In `WorkflowRegistry.ts`, append `piPlanningWorkflowDefinition` to `shippedWorkflowDefinitions`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[x] Subtask 11.3. In `WorkflowRuntime.test.ts`, add registry coverage proving `resolveWorkflowDefinition("pi-planning")`, `resolveWorkflowBySlashCommand("pi-planning")`, and `resolveWorkflowByUseSkillName("pi-planning")` return the pi-planning workflow.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 11.4. In `WorkflowRuntime.test.ts`, add registry coverage proving `resolveWorkflowDefinition("pi-planning.md")`, `resolveWorkflowBySlashCommand("pi-planning.md")`, and `resolveWorkflowByUseSkillName("pi-planning.md")` return `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 12. Add prompt-projection integration coverage for pi-planning.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.1. In `integration.test.ts`, import `piPlanningWorkflowDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.2. In `integration.test.ts`, add helper `createPiPlanningWorkflowSession(activeStepNumber)` that provides representative workflow values for `architecture_document`, `epics_document`, `epics_index`, `brainstorming_document`, `additional_context`, `target_epic`, `epic_identity`, `implementation_folder`, `drafts_folder`, `stories_index`, and `stories_index_existed_at_workflow_start`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.3. In `integration.test.ts`, add helper `buildPiPlanningPromptContext(activeStepNumber)` that activates `pi-planning`, sets the active branch for the requested model-driven step, and returns runtime turn projection using native GPT-5 prompt settings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.4. In `integration.test.ts`, add coverage proving active Step 2 projects exactly `read_file`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.5. In `integration.test.ts`, add coverage proving active Step 3 projects exactly `list_files`, `search_files`, `list_code_definition_names`, `read_file`, `read_file_range`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.6. In `integration.test.ts`, add coverage proving active Step 4 projects exactly `read_file`, `plan_story_artifacts`, `set_workflow_values`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.7. In `integration.test.ts`, add coverage proving active Step 5 projects exactly `generate_story_files`, `send_user_message`, and `ask_followup_question`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.8. In `integration.test.ts`, add coverage proving active Step 6 projects exactly `list_files`, `read_file`, `apply_patch`, `plan_story_artifacts`, `generate_story_files`, `send_user_message`, `ask_followup_question`, and `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.9. In `integration.test.ts`, add coverage proving pi-planning current step details appear in the workflow input payload and not in the system prompt.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.10. In `integration.test.ts`, add coverage proving pi-planning prompt projection never statically exposes `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, or `move_workflow_project_file`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

### Phase 7 - Final Validation

[x] Task 13. Run focused unit validation for pi-planning and shared story handlers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

[x] Subtask 13.1. Run `npm run test:unit -- src/core/task/tools/handlers/__tests__/PlanStoryArtifactsToolHandler.test.ts src/core/task/tools/handlers/__tests__/GenerateStoryFilesToolHandler.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

[x] Subtask 13.2. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

[x] Subtask 13.3. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

[x] Subtask 13.4. Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

[x] Subtask 13.5. Run `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

[x] Subtask 13.6. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

[x] Task 14. Run focused static regression checks.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

[x] Subtask 14.1. Run `rg -n "Epic-\\{E\\}-delivery-spec|epic-delivery-spec|BuildEpicDeliverySpecToolHandler" src/core/task/workflow-runtime/workflow-modules/pi-planning` and confirm no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

[x] Subtask 14.2. Run `rg -n "build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|execute_command" src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts` and confirm no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

[x] Subtask 14.3. Run `rg -n "pi-planning\\.md|/Users/robertboston/Documents/Cline/Workflows/pi-planning.md|_bmad/bmm/agents/pm.md|\\.cline/workflow-config.yaml" src/core/task/workflow-runtime/workflow-modules/pi-planning src/core/task/workflow-runtime/WorkflowRegistry.ts` and confirm no runtime dependency on migration source files or `.md` workflow identity aliases.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

[x] Subtask 14.4. This static guard was superseded by Phase 8 because pi-planning now requires a workflow-owned `execute_tool_backed_operation` route for deterministic missing-story generation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

### Phase 8 - Existing Story Edit Path

Relevant requirements:

- `pi-planning-requirements.md` Step 1 Panel B, Panel C, Panel D, edit-intent routing, missing-story generation, and draft/backlog `target_story` resolution requirements.
- `pi-planning-requirements.md` Step 6 initial-buildout and edit-existing-story prompt/tool-schema variant requirements.
- `pi-planning-requirements.md` Testing Requirements covering Required Context panel absence, edit-intent/story-selection panels, selected-story metadata derivation, direct Step 6 routing, `target_story` fail-closed behavior, and conditional prompt/tool projection.

After completing this phase, pause for QA review.

[ ] Task 15. Update PI Planning Step 1 values, form panels, selected-story metadata derivation, and routing through existing runtime-owned story actions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

    [ ] Subtask 15.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, update the `@shared/ExtensionMessage` type import to include exact symbols `WorkflowFormDefinitionPayload`, `WorkflowFormPanelAction`, `WorkflowFormOptionDefinition`, `WorkflowFormPanelDefinition`, and `WorkflowStepResolutionStatusDefinition`.

    [ ] Subtask 15.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add type import from `@/core/task/workflow-step-resolution/types` with exact symbols `WorkflowToolBackedActionInstruction`, `WorkflowToolBackedOperationEvaluationResult`, and `WorkflowToolBackedOperationExecutionRequest`.

    [ ] Subtask 15.3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, update the `../../types` import to include exact symbols `WorkflowDecisionAction` and `WorkflowFormContinuationReplacement`.

    [ ] Subtask 15.4: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add import `WorkflowArtifactFamily` from `../../artifactFamilies`.

    [ ] Subtask 15.5: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add type import `WorkflowStoryStatus` from `../../storyArtifacts`; do not import `parseWorkflowStoryIndexJson` or `WorkflowStoryIndexEntry` for selected-story derivation because the canonical parser rejects invalid `story_file_name` before the module-owned invalid-filename branch can run.

    [ ] Subtask 15.6: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add exported enum `PiPlanningEditIntent` with exact members `CompleteInitialStoryBuildout = "Complete initial story buildout"` and `EditExistingStoryFile = "edit existing story file"`.

    [ ] Subtask 15.7: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add exact `PiPlanningWorkflowValueKey` enum members `EditIntent = "edit_intent"`, `SelectedStoryIdentity = "selected_story_identity"`, `SelectedStoryFileName = "selected_story_file_name"`, `SelectedStoryStatus = "selected_story_status"`, and `TargetStory = "target_story"`.

    [ ] Subtask 15.8: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, delete constant `STEP_1_REQUIRED_CONTEXT_PANEL_ID`.

    [ ] Subtask 15.9: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add constants `STEP_1_EDIT_INTENT_PANEL_ID = "step-1-edit-intent-panel"` and `STEP_1_SELECT_STORY_PANEL_ID = "step-1-select-story-panel"`.

    [ ] Subtask 15.10: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function buildRuntimeRoutedTransition(): WorkflowFormPanelDefinition["transition"]` returning exactly `{ type: "runtime_routed" }`.

    [ ] Subtask 15.11: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function buildOption(value: string): WorkflowFormOptionDefinition` returning exactly `{ value, label: value }`.

    [ ] Subtask 15.12: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function sourceRouteMatches(sourceRoute: { branchId: string; routeId: string }, branchId: string, routeId: string): boolean` returning `sourceRoute.branchId === branchId && sourceRoute.routeId === routeId`.

    [ ] Subtask 15.13: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function toolBackedOperationSucceeded(branchId: string, routeId: string): WorkflowDecisionBranchTrigger` returning an `event_predicate` trigger whose `matches` function first narrows `triggerEvent.kind === "tool_backed_operation_succeeded"` and then returns `sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId)`.

    [ ] Subtask 15.14: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function toolBackedOperationFailed(branchId: string, routeId: string): WorkflowDecisionBranchTrigger` returning an `event_predicate` trigger whose `matches` function first narrows `triggerEvent.kind === "tool_backed_operation_failed"` and then returns `sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId)`.

    [ ] Subtask 15.15: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function workflowFormPanelSubmitted(panelId: string, action: WorkflowFormPanelAction): WorkflowDecisionBranchTrigger` returning an `event_predicate` trigger whose `matches` function first narrows `triggerEvent.kind === "workflow_form_panel_submitted"` and then requires `triggerEvent.workflowFormId === STEP_1_INPUT_FORM_ID`, `triggerEvent.panelId === panelId`, and `triggerEvent.action === action`.

    [ ] Subtask 15.16: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function selectedEpicHasStoriesIndex(): WorkflowDecisionBranchTrigger` as a `session_predicate` whose `matches` function returns true only when `readWorkflowStringValue(workflowValues, PiPlanningWorkflowValueKey.StoriesIndex) !== undefined`.

    [ ] Subtask 15.17: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function selectedEpicDoesNotHaveStoriesIndex(): WorkflowDecisionBranchTrigger` as a `session_predicate` whose `matches` function returns true only when `readWorkflowStringValue(workflowValues, PiPlanningWorkflowValueKey.StoriesIndex) === undefined`.

    [ ] Subtask 15.18: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function editIntentMatches(editIntent: PiPlanningEditIntent): WorkflowDecisionBranchTrigger` as a `session_predicate` whose `matches` function returns true only when `readWorkflowStringValue(workflowValues, PiPlanningWorkflowValueKey.EditIntent) === editIntent`.

    [ ] Subtask 15.19: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function selectedStoryStatusMatches(status: Extract<WorkflowStoryStatus, "draft" | "backlog">): WorkflowDecisionBranchTrigger` as a `session_predicate` whose `matches` function returns true only when `readWorkflowStringValue(workflowValues, PiPlanningWorkflowValueKey.SelectedStoryStatus) === status`.

    [ ] Subtask 15.20: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function selectedStoryStatusUnsupported(): WorkflowDecisionBranchTrigger` as a `session_predicate` whose `matches` function assigns `const selectedStoryStatus = readWorkflowStringValue(workflowValues, PiPlanningWorkflowValueKey.SelectedStoryStatus)` and returns true only when `selectedStoryStatus !== undefined && selectedStoryStatus !== "draft" && selectedStoryStatus !== "backlog"`.

    [ ] Subtask 15.21: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function workflowFormCompletedWithStoriesIndexExistedAtWorkflowStart(expected: boolean): WorkflowDecisionBranchTrigger` returning an `event_predicate` trigger whose `matches` function first narrows `triggerEvent.kind === "workflow_form_completed"`, then requires `triggerEvent.workflowFormId === STEP_1_INPUT_FORM_ID`, and then compares `readWorkflowBooleanValue(workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) === expected`.

    [ ] Subtask 15.22: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function workflowFormCompletedWithEditIntent(editIntent: PiPlanningEditIntent): WorkflowDecisionBranchTrigger` returning an `event_predicate` trigger whose `matches` function first narrows `triggerEvent.kind === "workflow_form_completed"`, then requires `triggerEvent.workflowFormId === STEP_1_INPUT_FORM_ID`, and then compares `readWorkflowStringValue(workflowValues, PiPlanningWorkflowValueKey.EditIntent) === editIntent`.

    [ ] Subtask 15.23: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `deriveSelectedEpicValuesFromForm(...)`, preserve the existing selected-epic parsing behavior and make the existing-index success write set exactly `{ [PiPlanningWorkflowValueKey.TargetEpic]: targetEpic, [PiPlanningWorkflowValueKey.StoriesIndex]: storiesIndexPath, [PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: true }`.

    [ ] Subtask 15.24: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `deriveSelectedEpicValuesFromForm(...)`, make the missing-index success write set exactly `{ [PiPlanningWorkflowValueKey.TargetEpic]: targetEpic, [PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: false }` and do not write `PiPlanningWorkflowValueKey.StoriesIndex`.

    [ ] Subtask 15.25: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function findStoryIndexRecord(args: { stories: readonly unknown[]; storyIdentity: string }): Record<string, unknown> | undefined` that iterates through `args.stories`, narrows each item with `isRecord(storyValue) === true`, returns the first narrowed record whose `story_identity` equals `args.storyIdentity`, and returns `undefined` when no narrowed record matches.

    [ ] Subtask 15.26: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `async function deriveSelectedStoryValuesFromForm(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult>` that reads `selected_story_identity` with `readWorkflowStringValue(session.workflowValues, PiPlanningWorkflowValueKey.SelectedStoryIdentity)` and returns `{ kind: "failed", errorMessage: "PI Planning requires a selected story identity before resolving the target story." }` when it is `undefined`.

    [ ] Subtask 15.27: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `deriveSelectedStoryValuesFromForm(...)`, read `stories_index` with `readWorkflowStringValue(session.workflowValues, PiPlanningWorkflowValueKey.StoriesIndex)` and return `{ kind: "failed", errorMessage: "PI Planning requires a resolved stories_index path before resolving the target story." }` when it is `undefined`.

    [ ] Subtask 15.28: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `deriveSelectedStoryValuesFromForm(...)`, read and parse the story index as loose JSON by declaring `let parsedStoryIndex: unknown`, then inside a `try` block assigning `const storyIndexText = await readFile(storiesIndex, "utf8")` and `parsedStoryIndex = JSON.parse(storyIndexText)`; if `readFile(...)` or `JSON.parse(...)` throws, return `{ kind: "failed", errorMessage: "I could not read or parse the selected story index before resolving the target story." }`. After the `try` block, if `isRecord(parsedStoryIndex) === false`, `parsedStoryIndex.version !== 1`, or `Array.isArray(parsedStoryIndex.stories) === false`, return the same failed result. After those guards, assign `const storyRecords: readonly unknown[] = parsedStoryIndex.stories`.

    [ ] Subtask 15.29: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `deriveSelectedStoryValuesFromForm(...)`, assign `const selectedStory = findStoryIndexRecord({ stories: storyRecords, storyIdentity: selectedStoryIdentity })` and return `{ kind: "failed", errorMessage: "The selected story was not found in the selected story index." }` when `selectedStory === undefined`.

    [ ] Subtask 15.30: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `deriveSelectedStoryValuesFromForm(...)`, assign `const selectedStoryType = selectedStory.story_type` and `const selectedStoryStatus = selectedStory.status`; require `selectedStoryType === "primary"` and `(selectedStoryStatus === "draft" || selectedStoryStatus === "backlog")`; otherwise return `{ kind: "failed", errorMessage: "The selected story has an unsupported story status." }`.

    [ ] Subtask 15.31: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `deriveSelectedStoryValuesFromForm(...)`, assign `const selectedStoryFileName = selectedStory.story_file_name`; require `typeof selectedStoryFileName === "string"` and `selectedStoryFileName.trim().length > 0`; otherwise return `{ kind: "failed", errorMessage: "The selected story has an invalid story_file_name." }`.

    [ ] Subtask 15.32: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `deriveSelectedStoryValuesFromForm(...)`, return `{ kind: "succeeded", workflowValueWrites: { [PiPlanningWorkflowValueKey.SelectedStoryFileName]: selectedStoryFileName, [PiPlanningWorkflowValueKey.SelectedStoryStatus]: selectedStoryStatus } }` after all selected-story validations pass.

    [ ] Subtask 15.33: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function buildGenerateMissingStoryFilesInstruction(): WorkflowToolBackedActionInstruction` returning an object with exact fields `toolName: ClineDefaultTool.GENERATE_STORY_FILES`, `buildStatusDefinition: (): WorkflowStepResolutionStatusDefinition => ({ title: "Generate Missing Story Files", pendingLabel: "Generating missing story files", successLabel: "Generated missing story files", failureLabel: "Failed to generate missing story files" })`, `buildToolExecutionRequest: ({ activeWorkflowSession }): WorkflowToolBackedOperationExecutionRequest => ({ toolName: ClineDefaultTool.GENERATE_STORY_FILES, toolInput: {}, toolParams: { epic_identity: readWorkflowStringValue(activeWorkflowSession.workflowValues, PiPlanningWorkflowValueKey.EpicIdentity) ?? "" } })`, and `evaluateToolExecutionResult: (): WorkflowToolBackedOperationEvaluationResult => ({ succeeded: true })`.

    [ ] Subtask 15.34: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function buildValidateSelectedStoryIndexEntryAction(status: Extract<WorkflowStoryStatus, "draft" | "backlog">): WorkflowDecisionAction` returning exactly `{ kind: "validate_story_index_entry", storyIndexWorkflowValueKey: PiPlanningWorkflowValueKey.StoriesIndex, storyIdentityWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryIdentity, storyFilenameWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryFileName, requiredStoryType: "primary", requiredStatus: status, missingOrMalformedIndexErrorMessage: "I could not read or parse the selected story index before resolving the target story.", missingEntryErrorMessage: "The selected story was not found in the selected story index.", invalidEntryErrorMessage: "The selected story has an invalid story_file_name." }`.

    [ ] Subtask 15.35: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function buildResolveDraftTargetStoryAction(): WorkflowDecisionAction` returning exactly `{ kind: "resolve_existing_project_artifact", artifactFamily: WorkflowArtifactFamily.Story, artifactIdentityWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryIdentity, projectSubfolderSegments: ["implementation", "drafts"], outputWorkflowValueKey: PiPlanningWorkflowValueKey.TargetStory, missingArtifactErrorMessage: "The target story path does not exist." }`.

    [ ] Subtask 15.36: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function buildResolveBacklogTargetStoryAction(): WorkflowDecisionAction` returning exactly `{ kind: "resolve_existing_project_artifact", artifactFamily: WorkflowArtifactFamily.Story, artifactIdentityWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryIdentity, projectSubfolderSegments: ["implementation", "stories-backlog"], outputWorkflowValueKey: PiPlanningWorkflowValueKey.TargetStory, missingArtifactErrorMessage: "The target story path does not exist." }`.

    [ ] Subtask 15.37: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function buildStep1TargetEpicPanel(): WorkflowFormPanelDefinition` returning exact panel fields `panelId: STEP_1_TARGET_EPIC_PANEL_ID`, `title: "Target Epic"`, `promptMarkdown: "Which epic are we working on during this workflow?"`, one dropdown field with `key` and `workflowValueKey` equal to `PiPlanningWorkflowValueKey.EpicIdentity`, `label: "Target Epic"`, `required: true`, `allowedValueType: "string"`, `jsonOptionsSource` equal to `{ root: { kind: "selected_project_root" }, sourcePathSegments: ["planning", "Epics.index.json"], itemsPath: "epics", valueProperty: "identity", labelTemplate: "Epic {identity}: {title}", descriptionTemplate: "Story index generated: {story-index-generated}" }`, `allowedActions: ["submit"]`, `actionLabels: { submit: "Continue" }`, and `transition: buildRuntimeRoutedTransition()`.

    [ ] Subtask 15.38: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function buildStep1EditIntentPanel(): WorkflowFormPanelDefinition` returning exact panel fields `panelId: STEP_1_EDIT_INTENT_PANEL_ID`, `title: "Provide Edit Intent"`, `promptMarkdown: "It looks like the selected epic already has a story index file with generated story files. Please select one of the following options:"`, one dropdown field with `key` and `workflowValueKey` equal to `PiPlanningWorkflowValueKey.EditIntent`, `label: "select one"`, `required: true`, `allowedValueType: "string"`, `options: [buildOption(PiPlanningEditIntent.CompleteInitialStoryBuildout), buildOption(PiPlanningEditIntent.EditExistingStoryFile)]`, `allowedActions: ["submit", "back"]`, `actionLabels: { submit: "Continue", back: "Back" }`, `backDestinationPanelId: STEP_1_TARGET_EPIC_PANEL_ID`, and `transition: buildRuntimeRoutedTransition()`.

    [ ] Subtask 15.39: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function buildStep1SelectStoryPanel(): WorkflowFormPanelDefinition` returning exact panel fields `panelId: STEP_1_SELECT_STORY_PANEL_ID`, `title: "Select Story"`, `promptMarkdown: "Which story would you like to edit?"`, one dropdown field with `key` and `workflowValueKey` equal to `PiPlanningWorkflowValueKey.SelectedStoryIdentity`, `label: "Select Story"`, `required: true`, `allowedValueType: "string"`, `jsonOptionsSource` equal to `{ root: { kind: "selected_project_root" }, sourcePathSegments: ["implementation", "epic-{workflow.epic_identity}-stories.index.json"], itemsPath: "stories", valueProperty: "story_identity", labelTemplate: "Story {story_identity}: {story_file_name}" }`, `allowedActions: ["submit", "back"]`, `actionLabels: { submit: "Continue", back: "Back" }`, `backDestinationPanelId: STEP_1_EDIT_INTENT_PANEL_ID`, and `transition: buildRuntimeRoutedTransition()`.

    [ ] Subtask 15.40: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function buildStep1AdditionalContextPanel(): WorkflowFormPanelDefinition` returning exact panel fields `panelId: STEP_1_ADDITIONAL_CONTEXT_PANEL_ID`, `title: "Additional Context"`, `promptMarkdown: "If you'd like to include any other files as workflow context please provide their full file paths below."`, one large-text field with `key` and `workflowValueKey` equal to `PiPlanningWorkflowValueKey.AdditionalContext`, `label: "Additional context file paths"`, `required: false`, `allowedValueType: "string"`, `presentation: { textareaSize: "large" }`, `allowedActions: ["submit", "back"]`, `actionLabels: { submit: "Continue", back: "Back" }`, and `transition: buildTerminalTransition()`.

    [ ] Subtask 15.41: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, replace `buildStep1InputWorkflowForm()` panel construction so it returns exact form metadata `definitionVersion: 2`, `title: "PI Planning Inputs"`, `toolDictionaryTitle: "PI Planning Inputs"`, `toolDictionaryMarkdown: "Provide PI Planning target epic and context confirmation inputs."`, `firstPanelId: STEP_1_TARGET_EPIC_PANEL_ID`, and `panels` containing only keys `[STEP_1_TARGET_EPIC_PANEL_ID]`, `[STEP_1_EDIT_INTENT_PANEL_ID]`, `[STEP_1_SELECT_STORY_PANEL_ID]`, and `[STEP_1_ADDITIONAL_CONTEXT_PANEL_ID]` built by the corresponding panel helpers.

    [ ] Subtask 15.42: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, add `function buildStep1ContinuationReplacement(panel: WorkflowFormPanelDefinition): WorkflowFormContinuationReplacement` returning exact object `{ panel, data: {} }`.

    [ ] Subtask 15.43: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, update route `step-1-render-input-form` so its `followingBranchId` is exactly `"step-1-await-target-epic-panel"`.

    [ ] Subtask 15.44: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, replace the old completed-form derivation route with branch `step-1-await-target-epic-panel` containing route `step-1-derive-selected-epic-values`, trigger `workflowFormPanelSubmitted(STEP_1_TARGET_EPIC_PANEL_ID, "submit")`, action `{ kind: "run_deterministic_procedure", instruction: { run: deriveSelectedEpicValuesFromForm } }`, and `followingBranchId: "step-1-route-after-target-epic-panel"`.

    [ ] Subtask 15.45: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add branch `step-1-route-after-target-epic-panel` with route `step-1-continue-to-edit-intent-panel`, trigger `selectedEpicHasStoriesIndex()`, action `{ kind: "continue_workflow_form", workflowFormId: STEP_1_INPUT_FORM_ID, panelId: STEP_1_EDIT_INTENT_PANEL_ID, buildReplacement: () => buildStep1ContinuationReplacement(buildStep1EditIntentPanel()) }`, and `followingBranchId: "step-1-await-edit-intent-panel"`.

    [ ] Subtask 15.46: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add route `step-1-continue-to-additional-context-after-new-index-epic` in branch `step-1-route-after-target-epic-panel`, trigger `selectedEpicDoesNotHaveStoriesIndex()`, action `{ kind: "continue_workflow_form", workflowFormId: STEP_1_INPUT_FORM_ID, panelId: STEP_1_ADDITIONAL_CONTEXT_PANEL_ID, buildReplacement: () => buildStep1ContinuationReplacement(buildStep1AdditionalContextPanel()) }`, and `followingBranchId: "step-1-await-final-form-submit"`.

    [ ] Subtask 15.47: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add branch `step-1-await-edit-intent-panel` with route `step-1-route-after-edit-intent`, trigger `workflowFormPanelSubmitted(STEP_1_EDIT_INTENT_PANEL_ID, "submit")`, action `{ kind: "no_op" }`, and `followingBranchId: "step-1-route-after-edit-intent-panel"`.

    [ ] Subtask 15.48: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add branch `step-1-route-after-edit-intent-panel` with route `step-1-continue-to-additional-context-after-complete-initial-buildout`, trigger `editIntentMatches(PiPlanningEditIntent.CompleteInitialStoryBuildout)`, action `{ kind: "continue_workflow_form", workflowFormId: STEP_1_INPUT_FORM_ID, panelId: STEP_1_ADDITIONAL_CONTEXT_PANEL_ID, buildReplacement: () => buildStep1ContinuationReplacement(buildStep1AdditionalContextPanel()) }`, and `followingBranchId: "step-1-await-final-form-submit"`.

    [ ] Subtask 15.49: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add route `step-1-continue-to-select-story-panel` in branch `step-1-route-after-edit-intent-panel`, trigger `editIntentMatches(PiPlanningEditIntent.EditExistingStoryFile)`, action `{ kind: "continue_workflow_form", workflowFormId: STEP_1_INPUT_FORM_ID, panelId: STEP_1_SELECT_STORY_PANEL_ID, buildReplacement: () => buildStep1ContinuationReplacement(buildStep1SelectStoryPanel()) }`, and `followingBranchId: "step-1-await-select-story-panel"`.

    [ ] Subtask 15.50: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add branch `step-1-await-select-story-panel` with route `step-1-derive-selected-story-values`, trigger `workflowFormPanelSubmitted(STEP_1_SELECT_STORY_PANEL_ID, "submit")`, action `{ kind: "run_deterministic_procedure", instruction: { run: deriveSelectedStoryValuesFromForm } }`, and `followingBranchId: "step-1-continue-to-additional-context-after-story-selection"`.

    [ ] Subtask 15.51: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add branch `step-1-continue-to-additional-context-after-story-selection` with route `step-1-continue-to-additional-context-after-story-selection`, trigger `{ kind: "always" }`, action `{ kind: "continue_workflow_form", workflowFormId: STEP_1_INPUT_FORM_ID, panelId: STEP_1_ADDITIONAL_CONTEXT_PANEL_ID, buildReplacement: () => buildStep1ContinuationReplacement(buildStep1AdditionalContextPanel()) }`, and `followingBranchId: "step-1-await-final-form-submit"`.

    [ ] Subtask 15.52: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add branch `step-1-await-final-form-submit` with route `step-1-transition-to-step-2-after-new-index-epic`, trigger `workflowFormCompletedWithStoriesIndexExistedAtWorkflowStart(false)`, and action `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } }`.

    [ ] Subtask 15.53: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add route `step-1-transition-to-step-2-after-complete-initial-buildout` in branch `step-1-await-final-form-submit`, trigger `workflowFormCompletedWithEditIntent(PiPlanningEditIntent.CompleteInitialStoryBuildout)`, and action `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } }`.

    [ ] Subtask 15.54: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add route `step-1-generate-missing-story-files-before-edit` in branch `step-1-await-final-form-submit`, trigger `workflowFormCompletedWithEditIntent(PiPlanningEditIntent.EditExistingStoryFile)`, action `{ kind: "execute_tool_backed_operation", instruction: buildGenerateMissingStoryFilesInstruction() }`, and `followingBranchId: "step-1-await-missing-story-generation"`.

    [ ] Subtask 15.55: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add branch `step-1-await-missing-story-generation` with route `step-1-route-target-story-status-after-missing-story-generation`, trigger `toolBackedOperationSucceeded("step-1-await-final-form-submit", "step-1-generate-missing-story-files-before-edit")`, action `{ kind: "no_op" }`, and `followingBranchId: "step-1-route-target-story-status"`.

    [ ] Subtask 15.56: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add route `step-1-fail-after-missing-story-generation` in branch `step-1-await-missing-story-generation`, trigger `toolBackedOperationFailed("step-1-await-final-form-submit", "step-1-generate-missing-story-files-before-edit")`, and action `{ kind: "terminal_error", errorMessage: "Failed to generate missing story files" }`.

    [ ] Subtask 15.57: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add branch `step-1-route-target-story-status` with route `step-1-validate-draft-story-index-entry`, trigger `selectedStoryStatusMatches("draft")`, action `buildValidateSelectedStoryIndexEntryAction("draft")`, and `followingBranchId: "step-1-resolve-draft-target-story"`.

    [ ] Subtask 15.58: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add route `step-1-validate-backlog-story-index-entry` in branch `step-1-route-target-story-status`, trigger `selectedStoryStatusMatches("backlog")`, action `buildValidateSelectedStoryIndexEntryAction("backlog")`, and `followingBranchId: "step-1-resolve-backlog-target-story"`.

    [ ] Subtask 15.59: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add route `step-1-fail-unsupported-selected-story-status` in branch `step-1-route-target-story-status`, trigger `selectedStoryStatusUnsupported()`, and action `{ kind: "terminal_error", errorMessage: "The selected story has an unsupported story status." }`.

    [ ] Subtask 15.60: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add branch `step-1-resolve-draft-target-story` with route `step-1-resolve-draft-target-story`, trigger `{ kind: "always" }`, action `buildResolveDraftTargetStoryAction()`, and `followingBranchId: "step-1-await-target-story-resolution"`.

    [ ] Subtask 15.61: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add branch `step-1-resolve-backlog-target-story` with route `step-1-resolve-backlog-target-story`, trigger `{ kind: "always" }`, action `buildResolveBacklogTargetStoryAction()`, and `followingBranchId: "step-1-await-target-story-resolution"`.

    [ ] Subtask 15.62: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in `buildStep1DecisionTree()`, add branch `step-1-await-target-story-resolution` with route `step-1-transition-to-step-6-after-target-story-resolution`, trigger `workflowValuesPersisted(PiPlanningWorkflowValueKey.TargetStory)`, and action `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 6 } }`.

[ ] Task 16. Update PI Planning Step 6 prompt and tool-schema variants.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`

    [ ] Subtask 16.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, update `buildStep6PromptSource(...)` to branch on `readWorkflowStringValue(input.session.workflowValues, PiPlanningWorkflowValueKey.EditIntent) === PiPlanningEditIntent.EditExistingStoryFile`.

    [ ] Subtask 16.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in the Step 6 edit-existing-story branch, render this exact approved prompt text with `projectTitle`, `projectFolderName`, `architecture_document`, `epics_document`, and `target_story` materialized by calling `renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.ProjectTitle)`, `renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.ProjectFolderName)`, `renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.ArchitectureDocument)`, `renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.EpicsDocument)`, and `renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.TargetStory)`: `You have been called inside a workflow designed to revise the initial sections of an implementation-ready story file in response to violations found during pre-implementation validation.\n- Project: projectTitle\n- Project Folder: projectFolderName\n- Architecture Document: architecture_document\n- Epics Documentation: epics_document\n- Target Story: target_story\n\nFirst, ask the user to share the feedback gathered during story validation. Then, review the following sections in the story document, identify the exact revisions needed to address the violations, and provide them to the user as a proposed story revision.\nOnce the user approves of your revisions, update the story document. Do not edit the tasks section of the story document.\nSections to review and revise based on validation findings:\n- Scope\n- Scope Boundary\n- Requirements\n- Objective\n- Known Issues/ Risks/ Technical Debt\n\nOnce the approved revisions are saved to the story document, use attempt_completion to provide the user with final confirmation and end this workflow.`

    [ ] Subtask 16.3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, in the Step 6 initial-buildout branch used when `edit_intent` is absent or equals `PiPlanningEditIntent.CompleteInitialStoryBuildout`, render this exact approved prompt text after replacing both occurrences of `drafts_folder` with `renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.DraftsFolder)`: `Populate the generated story files in drafts_folder to set implementation sequence and story-specific details.\n\nSequence stories by dependency:\n1. Contracts, state shape, and invariants.\n2. Core runtime/backend behavior.\n3. User-facing forms or lifecycle flows.\n4. Prompt/tool/schema behavior.\n5. Workflow/module consumers.\n6. Cleanup, migration, and validation.\n\nRead each story file with read_file, then use apply_patch to add story-specific content under these existing headings:\n\nScope:\nDefine what is in-scope\n\nScope Boundary:\nDefine items which are out of scope. Should not be overly exhaustive- focus on the things that could be mistakenly interpreted as in-scope to establish a firm scope boundary.\n\nRequirements:\n- List the source requirements this story satisfies.\n- State the behavior, constraints, and validation expectations.\n- Include relevant “must not” rules or invariants.\n- Do not include implementation tasks, subtasks, file lists, or commands.\n\nObjective:\nAs a [user/system/workflow/runtime actor]\nI want [one capability outcome]\nso that [the value or enabled downstream behavior]\n\nKnown Issues/ Risks/ Technical Debt\nInclude items relevant to the story\n\nDo not create story files manually- use the appropriate plan_story_artifacts -> generate_story_files process if new stories or story files are needed at any point.\n\nOnce every story file in drafts_folder contains the required information, send an update to the user informing them that you've updated the epic's stories with initial story details. Ask the user to review and provide feedback. Continue refining the stories as needed based on user feedback.\n\nOnce the user is fully aligned with the story set and each story's content, use attempt_completion to provide a final workflow recap to the user, and remind them to run create_story for each generated story to generate story tasks before implementation.` This branch must not include the edit-existing-story validation-feedback instructions or `target_story`.

    [ ] Subtask 16.4: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`, import type `WorkflowPromptBuilderInput` from `../../types`.

    [ ] Subtask 16.5: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`, change `buildPiPlanningStep6ToolSchemas()` to `buildPiPlanningStep6ToolSchemas(input: WorkflowPromptBuilderInput): readonly ClineToolSpec[]`.

    [ ] Subtask 16.6: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`, in `buildPiPlanningStep6ToolSchemas(input)`, return exactly `read_file`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `attempt_completion` when `input.session.workflowValues.edit_intent === "edit existing story file"`.

    [ ] Subtask 16.7: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`, in `buildPiPlanningStep6ToolSchemas(input)`, return exact initial-buildout schema order `list_files`, `read_file`, `apply_patch`, `plan_story_artifacts`, `generate_story_files`, `send_user_message`, `ask_followup_question`, and `attempt_completion` when `input.session.workflowValues.edit_intent` is absent or equals `"Complete initial story buildout"`.

[ ] Task 17. Update PI Planning workflow module tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`

    [ ] Subtask 17.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, update `SAMPLE_WORKFLOW_VALUES` to include exact keys and values `[PiPlanningWorkflowValueKey.ProjectTitle]: "PI Planning Project"`, `[PiPlanningWorkflowValueKey.ProjectFolderName]: "pi-planning-project"`, `[PiPlanningWorkflowValueKey.EditIntent]: "Complete initial story buildout"`, `[PiPlanningWorkflowValueKey.SelectedStoryIdentity]: "1.1"`, `[PiPlanningWorkflowValueKey.SelectedStoryFileName]: "Story-1-1.md"`, `[PiPlanningWorkflowValueKey.SelectedStoryStatus]: "draft"`, and `[PiPlanningWorkflowValueKey.TargetStory]: "/tmp/pi-planning-project/implementation/drafts/Story-1-1.md"`.

    [ ] Subtask 17.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, update workflow value inventory coverage to include `PiPlanningWorkflowValueKey.EditIntent`, `PiPlanningWorkflowValueKey.SelectedStoryIdentity`, `PiPlanningWorkflowValueKey.SelectedStoryFileName`, `PiPlanningWorkflowValueKey.SelectedStoryStatus`, and `PiPlanningWorkflowValueKey.TargetStory` in exact enum order.

    [ ] Subtask 17.3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, replace the Required Context panel test with a test asserting `getStep1InputForm().panels["step-1-required-context-panel"] === undefined`.

    [ ] Subtask 17.4: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, update Panel A coverage to assert exact target-epic field shape and exact `transition` deep-equals `{ type: "runtime_routed" }`.

    [ ] Subtask 17.5: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Panel B coverage asserting exact panel id `step-1-edit-intent-panel`, title `Provide Edit Intent`, promptMarkdown `It looks like the selected epic already has a story index file with generated story files. Please select one of the following options:`, required dropdown field keyed and persisted to `edit_intent`, label `select one`, options exactly `[{ value: "Complete initial story buildout", label: "Complete initial story buildout" }, { value: "edit existing story file", label: "edit existing story file" }]`, actions `["submit", "back"]`, labels `{ submit: "Continue", back: "Back" }`, `backDestinationPanelId: "step-1-target-epic-panel"`, and transition `{ type: "runtime_routed" }`.

    [ ] Subtask 17.6: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Panel C coverage asserting exact panel id `step-1-select-story-panel`, title `Select Story`, promptMarkdown `Which story would you like to edit?`, required dropdown field keyed and persisted to `selected_story_identity`, label `Select Story`, exact `jsonOptionsSource` object `{ root: { kind: "selected_project_root" }, sourcePathSegments: ["implementation", "epic-{workflow.epic_identity}-stories.index.json"], itemsPath: "stories", valueProperty: "story_identity", labelTemplate: "Story {story_identity}: {story_file_name}" }`, `field.jsonOptionsSource?.descriptionTemplate === undefined`, actions `["submit", "back"]`, labels `{ submit: "Continue", back: "Back" }`, `backDestinationPanelId: "step-1-edit-intent-panel"`, and transition `{ type: "runtime_routed" }`.

    [ ] Subtask 17.7: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, update Additional Context coverage to call it Panel D and assert exact panel id `step-1-additional-context-panel`, title `Additional Context`, promptMarkdown `If you'd like to include any other files as workflow context please provide their full file paths below.`, optional large text field keyed and persisted to `additional_context`, label `Additional context file paths`, presentation `{ textareaSize: "large" }`, actions `["submit", "back"]`, labels `{ submit: "Continue", back: "Back" }`, and terminal transition.

    [ ] Subtask 17.8: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add helper `buildWorkflowFormPanelSubmittedEvent(panelId: string, action: "submit" | "back"): WorkflowBranchTriggerEvent` returning exact object `{ kind: "workflow_form_panel_submitted", workflowFormId: "step-1-input-form", panelId, action, submittedValueKeys: [], clearedValueKeys: [] }`.

    [ ] Subtask 17.9: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add helper `buildToolBackedOperationSucceededEvent(sourceRoute: { branchId: string; routeId: string }): WorkflowBranchTriggerEvent` returning exact object `{ kind: "tool_backed_operation_succeeded", sourceRoute }`.

    [ ] Subtask 17.10: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add helper `buildToolBackedOperationFailedEvent(sourceRoute: { branchId: string; routeId: string }): WorkflowBranchTriggerEvent` returning exact object `{ kind: "tool_backed_operation_failed", sourceRoute }`.

    [ ] Subtask 17.11: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add async helper `async function expectContinueWorkflowFormAction(action: WorkflowDecisionAction, panelId: string): Promise<Extract<WorkflowDecisionAction, { kind: "continue_workflow_form" }>>` that narrows `action.kind === "continue_workflow_form"`, asserts `action.workflowFormId === "step-1-input-form"`, asserts `action.panelId === panelId`, calls `const replacement = await action.buildReplacement(createSession(SAMPLE_WORKFLOW_VALUES))`, asserts `replacement` deep-equals `{ panel: getPanel(getStep1InputForm(), panelId), data: {} }`, and returns the narrowed action.

    [ ] Subtask 17.12: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add helper `expectExecuteToolBackedOperationAction(action: WorkflowDecisionAction): Extract<WorkflowDecisionAction, { kind: "execute_tool_backed_operation" }>` that narrows `action.kind === "execute_tool_backed_operation"` and returns the narrowed action.

    [ ] Subtask 17.13: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add helper `expectValidateStoryIndexEntryAction(action: WorkflowDecisionAction): Extract<WorkflowDecisionAction, { kind: "validate_story_index_entry" }>` that narrows `action.kind === "validate_story_index_entry"` and returns the narrowed action.

    [ ] Subtask 17.14: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add helper `expectResolveExistingProjectArtifactAction(action: WorkflowDecisionAction): Extract<WorkflowDecisionAction, { kind: "resolve_existing_project_artifact" }>` that narrows `action.kind === "resolve_existing_project_artifact"` and returns the narrowed action.

    [ ] Subtask 17.15: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, update Step 1 route-structure coverage so route `step-1-render-input-form` has action kind `render_workflow_form`, workflow form id `step-1-input-form`, a compile-safe `"buildSessionData" in route.action` narrowing before asserting `typeof route.action.buildSessionData === "function"`, and `followingBranchId === "step-1-await-target-epic-panel"`.

    [ ] Subtask 17.16: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Step 1 Panel A submission route coverage for route `step-1-derive-selected-epic-values` in branch `step-1-await-target-epic-panel`, using `buildWorkflowFormPanelSubmittedEvent("step-1-target-epic-panel", "submit")`, asserting the event predicate matches, asserting action kind `run_deterministic_procedure`, and asserting `followingBranchId === "step-1-route-after-target-epic-panel"`.

    [ ] Subtask 17.17: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Step 1 existing-index route coverage for route `step-1-continue-to-edit-intent-panel` in branch `step-1-route-after-target-epic-panel`, asserting the session predicate matches with `stories_index` present, using `await expectContinueWorkflowFormAction(route.action, "step-1-edit-intent-panel")`, and asserting `followingBranchId === "step-1-await-edit-intent-panel"`.

    [ ] Subtask 17.18: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Step 1 missing-index route coverage for route `step-1-continue-to-additional-context-after-new-index-epic` in branch `step-1-route-after-target-epic-panel`, asserting the session predicate matches when `stories_index` is absent, using `await expectContinueWorkflowFormAction(route.action, "step-1-additional-context-panel")`, and asserting `followingBranchId === "step-1-await-final-form-submit"`.

    [ ] Subtask 17.19: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Step 1 Panel B submission route coverage for route `step-1-route-after-edit-intent` in branch `step-1-await-edit-intent-panel`, using `buildWorkflowFormPanelSubmittedEvent("step-1-edit-intent-panel", "submit")`, asserting the event predicate matches, asserting action deep-equals `{ kind: "no_op" }`, and asserting `followingBranchId === "step-1-route-after-edit-intent-panel"`.

    [ ] Subtask 17.20: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Step 1 Panel B complete-initial-buildout route coverage for route `step-1-continue-to-additional-context-after-complete-initial-buildout` in branch `step-1-route-after-edit-intent-panel`, asserting the session predicate matches when `edit_intent === "Complete initial story buildout"`, using `await expectContinueWorkflowFormAction(route.action, "step-1-additional-context-panel")`, and asserting `followingBranchId === "step-1-await-final-form-submit"`.

    [ ] Subtask 17.21: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Step 1 Panel B edit-existing-story route coverage for route `step-1-continue-to-select-story-panel` in branch `step-1-route-after-edit-intent-panel`, asserting the session predicate matches when `edit_intent === "edit existing story file"`, using `await expectContinueWorkflowFormAction(route.action, "step-1-select-story-panel")`, and asserting `followingBranchId === "step-1-await-select-story-panel"`.

    [ ] Subtask 17.22: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Step 1 Panel C story-selection route coverage for route `step-1-derive-selected-story-values` in branch `step-1-await-select-story-panel`, using `buildWorkflowFormPanelSubmittedEvent("step-1-select-story-panel", "submit")`, asserting the event predicate matches, asserting action kind `run_deterministic_procedure`, and asserting `followingBranchId === "step-1-continue-to-additional-context-after-story-selection"`.

    [ ] Subtask 17.23: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Step 1 route coverage for route `step-1-continue-to-additional-context-after-story-selection` in branch `step-1-continue-to-additional-context-after-story-selection`, asserting trigger deep-equals `{ kind: "always" }`, using `await expectContinueWorkflowFormAction(route.action, "step-1-additional-context-panel")`, and asserting `followingBranchId === "step-1-await-final-form-submit"`.

    [ ] Subtask 17.24: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Step 1 final-form route coverage for route `step-1-transition-to-step-2-after-new-index-epic`, asserting it matches `buildWorkflowFormCompletedEvent("step-1-input-form")` only when `stories_index_existed_at_workflow_start === false` and asserting action deep-equals `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } }`.

    [ ] Subtask 17.25: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Step 1 final-form route coverage for route `step-1-transition-to-step-2-after-complete-initial-buildout`, asserting it matches `buildWorkflowFormCompletedEvent("step-1-input-form")` only when `edit_intent === "Complete initial story buildout"` and asserting action deep-equals `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } }`.

    [ ] Subtask 17.26: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Step 1 final-form route coverage for route `step-1-generate-missing-story-files-before-edit`, asserting it matches `buildWorkflowFormCompletedEvent("step-1-input-form")` only when `edit_intent === "edit existing story file"`, using `expectExecuteToolBackedOperationAction(route.action)`, asserting `instruction.toolName === ClineDefaultTool.GENERATE_STORY_FILES`, exact status definition `{ title: "Generate Missing Story Files", pendingLabel: "Generating missing story files", successLabel: "Generated missing story files", failureLabel: "Failed to generate missing story files" }`, exact tool execution request `{ toolName: ClineDefaultTool.GENERATE_STORY_FILES, toolInput: {}, toolParams: { epic_identity: "1" } }`, exact evaluation result `{ succeeded: true }`, and `followingBranchId === "step-1-await-missing-story-generation"`.

    [ ] Subtask 17.27: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add generation-success route coverage for route `step-1-route-target-story-status-after-missing-story-generation`, using `buildToolBackedOperationSucceededEvent({ branchId: "step-1-await-final-form-submit", routeId: "step-1-generate-missing-story-files-before-edit" })`, asserting the event predicate matches in active branch `step-1-await-missing-story-generation`, asserting action deep-equals `{ kind: "no_op" }`, and asserting `followingBranchId === "step-1-route-target-story-status"`.

    [ ] Subtask 17.28: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add generation-failure route coverage for route `step-1-fail-after-missing-story-generation`, using `buildToolBackedOperationFailedEvent({ branchId: "step-1-await-final-form-submit", routeId: "step-1-generate-missing-story-files-before-edit" })`, asserting the event predicate matches in active branch `step-1-await-missing-story-generation`, and asserting action deep-equals `{ kind: "terminal_error", errorMessage: "Failed to generate missing story files" }`.

    [ ] Subtask 17.29: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add draft validation route coverage for route `step-1-validate-draft-story-index-entry` in branch `step-1-route-target-story-status`, asserting the session predicate matches only when `selected_story_status === "draft"`, using `expectValidateStoryIndexEntryAction(route.action)`, asserting exact action fields `{ kind: "validate_story_index_entry", storyIndexWorkflowValueKey: "stories_index", storyIdentityWorkflowValueKey: "selected_story_identity", storyFilenameWorkflowValueKey: "selected_story_file_name", requiredStoryType: "primary", requiredStatus: "draft", missingOrMalformedIndexErrorMessage: "I could not read or parse the selected story index before resolving the target story.", missingEntryErrorMessage: "The selected story was not found in the selected story index.", invalidEntryErrorMessage: "The selected story has an invalid story_file_name." }`, and asserting `followingBranchId === "step-1-resolve-draft-target-story"`.

    [ ] Subtask 17.30: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add backlog validation route coverage for route `step-1-validate-backlog-story-index-entry` in branch `step-1-route-target-story-status`, asserting the session predicate matches only when `selected_story_status === "backlog"`, using `expectValidateStoryIndexEntryAction(route.action)`, asserting exact action fields `{ kind: "validate_story_index_entry", storyIndexWorkflowValueKey: "stories_index", storyIdentityWorkflowValueKey: "selected_story_identity", storyFilenameWorkflowValueKey: "selected_story_file_name", requiredStoryType: "primary", requiredStatus: "backlog", missingOrMalformedIndexErrorMessage: "I could not read or parse the selected story index before resolving the target story.", missingEntryErrorMessage: "The selected story was not found in the selected story index.", invalidEntryErrorMessage: "The selected story has an invalid story_file_name." }`, and asserting `followingBranchId === "step-1-resolve-backlog-target-story"`.

    [ ] Subtask 17.31: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add unsupported status route coverage for route `step-1-fail-unsupported-selected-story-status` in branch `step-1-route-target-story-status`, asserting the session predicate matches when `selected_story_status === "review"` and asserting action deep-equals `{ kind: "terminal_error", errorMessage: "The selected story has an unsupported story status." }`.

    [ ] Subtask 17.32: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add draft target-story resolution route coverage for route `step-1-resolve-draft-target-story`, asserting trigger deep-equals `{ kind: "always" }`, using `expectResolveExistingProjectArtifactAction(route.action)`, asserting exact action fields `{ kind: "resolve_existing_project_artifact", artifactFamily: "story", artifactIdentityWorkflowValueKey: "selected_story_identity", projectSubfolderSegments: ["implementation", "drafts"], outputWorkflowValueKey: "target_story", missingArtifactErrorMessage: "The target story path does not exist." }`, and asserting `followingBranchId === "step-1-await-target-story-resolution"`.

    [ ] Subtask 17.33: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add backlog target-story resolution route coverage for route `step-1-resolve-backlog-target-story`, asserting trigger deep-equals `{ kind: "always" }`, using `expectResolveExistingProjectArtifactAction(route.action)`, asserting exact action fields `{ kind: "resolve_existing_project_artifact", artifactFamily: "story", artifactIdentityWorkflowValueKey: "selected_story_identity", projectSubfolderSegments: ["implementation", "stories-backlog"], outputWorkflowValueKey: "target_story", missingArtifactErrorMessage: "The target story path does not exist." }`, and asserting `followingBranchId === "step-1-await-target-story-resolution"`.

    [ ] Subtask 17.34: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add target-story persistence route coverage for route `step-1-transition-to-step-6-after-target-story-resolution`, asserting it matches `buildWorkflowValuesPersistedEvent(["target_story"])` and asserting action deep-equals `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 6 } }`.

    [ ] Subtask 17.35: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, update selected epic derivation coverage to assert existing-index write set exactly equals `{ target_epic: "Epic 1: Existing story index epic", stories_index: join(projectRoot, "implementation", "epic-1-stories.index.json"), stories_index_existed_at_workflow_start: true }` and missing-index write set exactly equals `{ target_epic: "Epic 2: New story index epic", stories_index_existed_at_workflow_start: false }`.

    [ ] Subtask 17.36: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add selected-story derivation success coverage that creates a temp `implementation/epic-1-stories.index.json` with `version: 1` and `stories` containing a draft primary story `{ story_identity: "1.1", story_file_name: "Story-1-1.md", story_type: "primary", parent_story_identity: null, story_file_generated: true, status: "draft" }` and a backlog primary story `{ story_identity: "1.2", story_file_name: "Story-1-2.md", story_type: "primary", parent_story_identity: null, story_file_generated: true, status: "backlog" }`, invokes the `step-1-derive-selected-story-values` route instruction for both identities, and asserts exact success writes `{ selected_story_file_name: "Story-1-1.md", selected_story_status: "draft" }` and `{ selected_story_file_name: "Story-1-2.md", selected_story_status: "backlog" }`.

    [ ] Subtask 17.37: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add selected-story derivation failure coverage for missing `selected_story_identity`, using a fully shaped `ActiveWorkflowSession` whose `workflowValues` contains `stories_index` but omits `selected_story_identity`, and assert exact failed result `{ kind: "failed", errorMessage: "PI Planning requires a selected story identity before resolving the target story." }`.

    [ ] Subtask 17.38: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add selected-story derivation failure coverage for missing `stories_index`, using a fully shaped `ActiveWorkflowSession` whose `workflowValues` contains `selected_story_identity` but omits `stories_index`, and assert exact failed result `{ kind: "failed", errorMessage: "PI Planning requires a resolved stories_index path before resolving the target story." }`.

    [ ] Subtask 17.39: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add selected-story derivation failure coverage for unreadable or malformed story index by writing `"{ invalid json"` to the temp `stories_index` path and asserting exact failed result `{ kind: "failed", errorMessage: "I could not read or parse the selected story index before resolving the target story." }`.

    [ ] Subtask 17.40: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add selected-story derivation failure coverage for selected story identity absent from the index by writing a valid index whose only story identity is `"1.9"` while the session selects `"1.1"`, and assert exact failed result `{ kind: "failed", errorMessage: "The selected story was not found in the selected story index." }`.

    [ ] Subtask 17.41: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add selected-story derivation failure coverage for unsupported entries by writing a loose JSON story index whose selected record has matching `story_identity: "1.1"` and `story_file_name: "Story-1-1.md"` for each exact case `{ story_type: "primary", status: "review" }`, `{ story_type: "primary", status: "complete" }`, and `{ story_type: "remediation", status: "draft" }`, then assert each case returns exact failed result `{ kind: "failed", errorMessage: "The selected story has an unsupported story status." }`.

    [ ] Subtask 17.42: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add selected-story derivation failure coverage for invalid `story_file_name` by writing a loose JSON story record with `story_identity: "1.1"`, `story_type: "primary"`, `status: "draft"`, and `story_file_name: "   "`, then assert exact failed result `{ kind: "failed", errorMessage: "The selected story has an invalid story_file_name." }`.

    [ ] Subtask 17.43: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, split Step 6 prompt coverage into an initial-buildout case that builds the expected prompt by replacing both `drafts_folder` occurrences in Subtask 16.3's exact approved prompt text with `SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.DraftsFolder].toString()`, asserts `prompt === expectedPrompt`, and asserts the prompt excludes raw placeholders `drafts_folder` and `target_story` plus the edit-existing-story phrase `feedback gathered during story validation`.

    [ ] Subtask 17.44: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, add Step 6 edit-existing-story prompt coverage using `edit_intent: "edit existing story file"` and asserting the prompt includes rendered values `SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.ProjectTitle].toString()`, `SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.ProjectFolderName].toString()`, `SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.ArchitectureDocument].toString()`, `SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.EpicsDocument].toString()`, `SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.TargetStory].toString()`, plus `Scope`, `Scope Boundary`, `Requirements`, `Objective`, and `Known Issues/ Risks/ Technical Debt`; excludes `drafts_folder`, `plan_story_artifacts`, `generate_story_files`, `create_story`, and raw placeholders `projectTitle`, `projectFolderName`, `architecture_document`, `epics_document`, and `target_story`.

    [ ] Subtask 17.45: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, update the Step 3 through Step 5 conditional prompt test to remain focused on `stories_index_existed_at_workflow_start` and not infer Step 6 behavior from `stories_index` presence.

    [ ] Subtask 17.46: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`, import type `WorkflowPromptBuilderInput` from `../../../types`, import `PiPlanningEditIntent`, `PiPlanningWorkflowValueKey`, and `piPlanningWorkflowDefinition` from `../piPlanningWorkflow`, replace `PI_PLANNING_STEP_BUILDERS` with `PI_PLANNING_NON_STEP_6_BUILDERS` containing only Step 1 through Step 5 zero-argument builders, and add helper `createStep6ToolSchemaInput(editIntent: PiPlanningEditIntent | undefined): WorkflowPromptBuilderInput` returning exact object fields `session`, `step: piPlanningWorkflowDefinition.steps["step-6"]`, and `renderWorkflowValue: (value) => (typeof value === "string" ? value : JSON.stringify(value))`; the returned `session` must be a fully shaped `ActiveWorkflowSession` with `activeStepNumber: 6`, `workflowValues` containing exact base values `{ projectTitle: "PI Planning Project", projectFolderName: "pi-planning-project", architecture_document: "/tmp/pi-planning-project/planning/architecture.md", epics_document: "/tmp/pi-planning-project/planning/Epics.md", epics_index: "/tmp/pi-planning-project/planning/Epics.index.json", brainstorming_document: "/tmp/pi-planning-project/discovery/brainstorming.md", additional_context: "/tmp/pi-planning-project/research/context.md", target_epic: "Epic 1: Improve workflow runtime", epic_identity: "1", implementation_folder: "/tmp/pi-planning-project/implementation", drafts_folder: "/tmp/pi-planning-project/implementation/drafts", stories_index: "/tmp/pi-planning-project/implementation/epic-1-stories.index.json", stories_index_existed_at_workflow_start: true, selected_story_identity: "1.1", selected_story_file_name: "Story-1-1.md", selected_story_status: "draft", target_story: "/tmp/pi-planning-project/implementation/drafts/Story-1-1.md" }` plus `edit_intent` only when the argument is provided, `projectSelection: { projectMode: "existing", projectTitle: "PI Planning Project", projectFolderName: "pi-planning-project" }`, `lifecycle: { projectSelectionCompleted: true }`, `entryArtifactResolution: undefined`, `ui: { formSession: undefined, stepResolutionSession: undefined, suppressedWorkflowFormIds: [], suppressedWorkflowStepResolutionRoutes: [] }`, and `branchContext: { activeBranchId: "step-6-project-prompt" }`.

    [ ] Subtask 17.47: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`, update exact-order coverage so Step 6 initial-buildout schema with absent `edit_intent` equals `list_files`, `read_file`, `apply_patch`, `plan_story_artifacts`, `generate_story_files`, `send_user_message`, `ask_followup_question`, and `attempt_completion`.

    [ ] Subtask 17.48: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`, add exact-order coverage so Step 6 edit-existing-story schema with `edit_intent: PiPlanningEditIntent.EditExistingStoryFile` equals `read_file`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `attempt_completion`.

    [ ] Subtask 17.49: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`, update forbidden-tool coverage to call Step 6 with both initial-buildout and edit-existing-story fixtures and assert forbidden tool names remain absent from both returned schema arrays.

[ ] Task 18. Update prompt projection integration coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

    [ ] Subtask 18.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add constant `PI_PLANNING_TARGET_STORY = "/test/project/implementation/drafts/Story-7-1.md"`, update `createPiPlanningWorkflowSession(activeStepNumber)` to accept optional second parameter `{ editIntent?: string }`, persist `edit_intent` only when the parameter is provided, and add exact workflow values `projectTitle: "PI Planning Session"`, `projectFolderName: "pi-planning-session"`, `selected_story_identity: "7.1"`, `selected_story_file_name: "Story-7-1.md"`, `selected_story_status: "draft"`, and `target_story: PI_PLANNING_TARGET_STORY`.

    [ ] Subtask 18.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, update `buildPiPlanningPromptContext(activeStepNumber)` to accept and forward optional `{ editIntent?: string }`.

    [ ] Subtask 18.3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, keep the active Step 6 initial-buildout projection test and call `buildPiPlanningPromptContext(6, { editIntent: "Complete initial story buildout" })`; assert exact native tool names `list_files`, `read_file`, `apply_patch`, `plan_story_artifacts`, `generate_story_files`, `send_user_message`, `ask_followup_question`, and `attempt_completion`.

    [ ] Subtask 18.4: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add active Step 6 edit-existing-story projection coverage using `buildPiPlanningPromptContext(6, { editIntent: "edit existing story file" })`; assert exact native tool names `read_file`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `attempt_completion`.

    [ ] Subtask 18.5: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, update pi-planning backend-only prompt projection coverage so the active step cases include Step 6 initial-buildout and Step 6 edit-existing-story projections, and assert `plan_story_artifacts` and `generate_story_files` are absent from the Step 6 edit-existing-story native tool list.

[ ] Task 19. Run Phase 8 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

    [ ] Subtask 19.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`.

    [ ] Subtask 19.2: Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/workflow-runtime/tool-handlers/__tests__/PlanStoryArtifactsToolHandler.test.ts`.

    [ ] Subtask 19.3: Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`.

    [ ] Subtask 19.4: Run `npm run check-types`.

    [ ] Subtask 19.5: Run `npm run lint`.

    [ ] Subtask 19.6: Run `rg -n "step-1-required-context-panel|Required Context|Confirm the required context files" src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/index.ts` and confirm no runtime source matches.

    [ ] Subtask 19.7: Run `rg -n "resolve_story_index_target_story|WorkflowResolveStoryIndexTargetStory|WORKFLOW_STORY_STATUS_FOLDER_SEGMENTS" src/core/task/workflow-runtime src/core/task/workflow-runtime/workflow-modules/pi-planning` and confirm no source matches.

    [ ] Subtask 19.8: Run `rg -n "build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|execute_command|set_workflow_values" src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts` and confirm any `set_workflow_values` matches are limited to the Step 4 schema builder and the Step 4-only `buildPiPlanningSetWorkflowValuesToolSchema` helper, with no matches for the other guarded tool names.

    [ ] Subtask 19.9: Run `git diff --name-only && git ls-files --others --exclude-standard` and confirm persistent diffs and untracked files are limited to Phase 8 allowed files: `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, and `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`.

## Validation

Required validation after all phases are complete:

```bash
npm run test:unit -- src/core/task/tools/handlers/__tests__/PlanStoryArtifactsToolHandler.test.ts src/core/task/tools/handlers/__tests__/GenerateStoryFilesToolHandler.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
rg -n "Epic-\\{E\\}-delivery-spec|epic-delivery-spec|BuildEpicDeliverySpecToolHandler" src/core/task/workflow-runtime/workflow-modules/pi-planning
rg -n "step-1-required-context-panel|Required Context|Confirm the required context files" src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/index.ts
rg -n "resolve_story_index_target_story|WorkflowResolveStoryIndexTargetStory|WORKFLOW_STORY_STATUS_FOLDER_SEGMENTS" src/core/task/workflow-runtime src/core/task/workflow-runtime/workflow-modules/pi-planning
rg -n "build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|execute_command|set_workflow_values" src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts
rg -n "pi-planning\\.md|/Users/robertboston/Documents/Cline/Workflows/pi-planning.md|_bmad/bmm/agents/pm.md|\\.cline/workflow-config.yaml" src/core/task/workflow-runtime/workflow-modules/pi-planning src/core/task/workflow-runtime/WorkflowRegistry.ts
git diff --name-only
git ls-files --others --exclude-standard
```

Expected `rg` result:

- The five `rg` commands above must return no matches. If a command returns matches, review whether the match is this action-plan document or a test-only negative fixture. Runtime source matches must be treated as failures unless explicitly justified by the requirements.
