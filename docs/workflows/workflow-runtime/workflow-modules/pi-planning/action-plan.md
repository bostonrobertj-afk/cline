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

This plan builds and registers the product-owned `pi-planning` workflow module described by [pi-planning-requirements.md](./pi-planning-requirements.md).

This plan also includes the approved shared handler support needed for module-owned routes to advance after successful model-called story planning tools:

- `plan_story_artifacts` must ask workflow runtime for the next action after successful story-index persistence.
- `generate_story_files` must ask workflow runtime for the next action after successful story-file generation.

Approved implementation decisions:

- Panel A stores the selected epic's canonical `identity` as `epic_identity` using `jsonOptionsSource.valueProperty = "identity"`.
- `target_epic` and `stories_index` are derived deterministically after the Step 1 workflow form completes by reading the selected project's `planning/Epics.index.json`.
- `implementation_folder` and `drafts_folder` are derived from the resolved `epics_index` path using `projectRoot = dirname(dirname(epics_index))`, then `implementation_folder = join(projectRoot, "implementation")` and `drafts_folder = join(projectRoot, "implementation", "drafts")`.
- Panel B is an informational confirmation panel with no fields and `allowedActions: ["submit"]`.

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

[x] Subtask 14.4. Run `rg -n "toolBackedOperation|tool_backed_operation" src/core/task/workflow-runtime/workflow-modules/pi-planning` and confirm no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/action-plan.md`

## Validation

Required validation after all phases are complete:

```bash
npm run test:unit -- src/core/task/tools/handlers/__tests__/PlanStoryArtifactsToolHandler.test.ts src/core/task/tools/handlers/__tests__/GenerateStoryFilesToolHandler.test.ts
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
rg -n "Epic-\\{E\\}-delivery-spec|epic-delivery-spec|BuildEpicDeliverySpecToolHandler" src/core/task/workflow-runtime/workflow-modules/pi-planning
rg -n "build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|execute_command" src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts
rg -n "pi-planning\\.md|/Users/robertboston/Documents/Cline/Workflows/pi-planning.md|_bmad/bmm/agents/pm.md|\\.cline/workflow-config.yaml" src/core/task/workflow-runtime/workflow-modules/pi-planning src/core/task/workflow-runtime/WorkflowRegistry.ts
rg -n "toolBackedOperation|tool_backed_operation" src/core/task/workflow-runtime/workflow-modules/pi-planning
```

Expected `rg` result:

- The four `rg` commands above must return no matches. If a command returns matches, review whether the match is this action-plan document or a test-only negative fixture. Runtime source matches must be treated as failures unless explicitly justified by the requirements.
