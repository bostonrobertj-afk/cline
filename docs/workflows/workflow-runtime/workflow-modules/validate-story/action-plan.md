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

This plan builds and registers the product-owned `validate-story` workflow module described by [validate-story-requirements.md](./validate-story-requirements.md).

The module performs a Scrum Master pre-implementation review of an implementation-ready story or remediation story. It uses runtime-owned selected-project prerequisite-file resolution for `target_story`, `epics_document`, and `architecture_document`, projects the source-prescribed Step 1 prompt with those workflow values rendered, exposes only the approved shared/default Step 1 tools, and completes after successful `attempt_completion`.

Approved implementation decisions derived from the requirements and module build guide:

- The workflow uses `WorkflowDefinition.prerequisiteFiles` plus the runtime-owned `resolve_prerequisite_files` decision action for all required file selection.
- The workflow defines no module-owned workflow forms, artifacts, document builders, child inheritance rules, backend tools, or AI-writable workflow values.
- The Step 1 model-facing tool schema is resolved from registered shared/default `ClineToolSet` specs with `ModelFamily.NATIVE_GPT_5`.
- Prompt tests must assert non-empty prompt projection, materialized workflow values, absent raw placeholders, required tool exposure, and forbidden tool absence. They must not assert the complete editable Step 1 prompt body.

## Scope Boundary

- Do not edit `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story.md`.
- Do not read the validate-story source markdown, `.cline/skills/bmad-validate-story`, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or legacy workflow assets at runtime.
- Do not add shared runtime architecture, shared tool handlers, artifact families, document builders, workflow forms, child workflows, child inheritance rules, story-index validation, story status updates, story file moves, or project-file mutation.
- Do not expose `apply_patch`, `write_to_file`, `set_workflow_values`, `workflow_progress_request`, `ask_followup_question`, `use_subagents`, `create_workflow_artifact`, `build_workflow_document`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `resolve_prerequisite_files`, `resolve_existing_project_artifact`, or `validate_story_index_entry` in the validate-story model-facing schema.
- Do not preserve `validate-story.md` as a workflow name, slash-command alias, or skill alias.
- Do not add exact full-prose tests for editable prompt text.

## Known Issues / Risks / Technical Debt

- `npm run check-types` may fail before TypeScript checking if generated proto files are missing or host probing fails. If that happens, run `npm run protos` and rerun the exact blocked validation command before treating the failure as a code defect.
- The current workflow-module pattern stores module-owned prompt and workflow metadata copy in TypeScript constants instead of a string resource system. This plan follows the established workflow-runtime module pattern.

## Tasks / Subtasks

### Phase 1 - Validate Story Tool Schemas

Relevant requirements: Tool Schema Requirements, Module File Layout, Testing Requirements, Validation Requirements.

After completing this phase, pause for QA review before moving to Phase 2.

[ ] Task 1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`, add the validate-story shared/default tool-schema builder file.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 1.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`, create the file with exactly these imports: `ClineToolSet` from `@/core/prompts/system-prompt/registry/ClineToolSet`, type `ClineToolSpec` from `@/core/prompts/system-prompt/spec`, `registerClineToolSets` from `@/core/prompts/system-prompt/tools/init`, `ModelFamily` from `@/shared/prompts`, and `ClineDefaultTool` from `@/shared/tools`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 1.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`, add `const VALIDATE_STORY_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5` and export `VALIDATE_STORY_STEP_1_TOOL_IDS: readonly ClineDefaultTool[]` with this exact ordered array: `ClineDefaultTool.FILE_READ`, `ClineDefaultTool.FILE_READ_RANGE`, `ClineDefaultTool.LIST_FILES`, `ClineDefaultTool.SEARCH`, `ClineDefaultTool.LIST_CODE_DEF`, `ClineDefaultTool.BASH`, `ClineDefaultTool.SEND_USER_MESSAGE`, `ClineDefaultTool.ATTEMPT`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 1.3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`, add `function resolveValidateStorySharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec` that calls `registerClineToolSets()`, assigns `const tool = ClineToolSet.getToolByNameWithFallback(toolId, VALIDATE_STORY_TOOL_SCHEMA_VARIANT)`, throws `new Error(\`Missing shared/default tool schema for ${toolId}.\`)` when `tool === undefined`, and otherwise returns `tool.config`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 1.4: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`, export `function buildValidateStoryStep1ToolSchemas(): readonly ClineToolSpec[]` returning `VALIDATE_STORY_STEP_1_TOOL_IDS.map((toolId) => resolveValidateStorySharedToolSpec(toolId))`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

[ ] Task 2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`, add focused validate-story tool-schema tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 2.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`, create the file with exactly these imports: `expect` from `chai`, `describe` and `it` from `mocha`, `ClineToolSet` from `@/core/prompts/system-prompt/registry/ClineToolSet`, type `ClineToolSpec` from `@/core/prompts/system-prompt/spec`, `registerClineToolSets` from `@/core/prompts/system-prompt/tools/init`, `ModelFamily` from `@/shared/prompts`, `ClineDefaultTool` from `@/shared/tools`, and `buildValidateStoryStep1ToolSchemas` plus `VALIDATE_STORY_STEP_1_TOOL_IDS` from `../validateStoryToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 2.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`, add `const STEP_1_TOOL_NAMES: readonly string[] = ["read_file", "read_file_range", "list_files", "search_files", "list_code_definition_names", "execute_command", "send_user_message", "attempt_completion"]` and `const FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[] = ["apply_patch", "write_to_file", "set_workflow_values", "workflow_progress_request", "ask_followup_question", "use_subagents", "create_workflow_artifact", "build_workflow_document", "archive_workflow_artifact", "delete_workflow_artifact", "move_workflow_project_file", "resolve_prerequisite_files", "resolve_existing_project_artifact", "validate_story_index_entry"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 2.3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`, add `function schemaNames(schemas: readonly ClineToolSpec[]): readonly string[]` returning `schemas.map((schema) => schema.name)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 2.4: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`, add `function expectedSharedStep1ToolSpecs(): readonly ClineToolSpec[]` that calls `registerClineToolSets()`, maps `VALIDATE_STORY_STEP_1_TOOL_IDS`, gets each tool with `ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)`, throws `new Error(\`Missing shared/default tool schema for ${toolId}.\`)` when the tool is `undefined`, and returns each `tool.config`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 2.5: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`, add a `describe` block named `validateStoryToolSchemas`; inside it, add a test named `exposes the exact Step 1 shared/default tool schema order` asserting `schemaNames(buildValidateStoryStep1ToolSchemas())` deep-equals `STEP_1_TOOL_NAMES`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 2.6: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`, add a test named `uses shared default Step 1 tool specs without module-owned schema prose` asserting `buildValidateStoryStep1ToolSchemas()` deep-equals `expectedSharedStep1ToolSpecs()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 2.7: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`, add a test named `uses only the approved Cline default tool ids for Step 1` asserting `VALIDATE_STORY_STEP_1_TOOL_IDS` deep-equals `[ClineDefaultTool.FILE_READ, ClineDefaultTool.FILE_READ_RANGE, ClineDefaultTool.LIST_FILES, ClineDefaultTool.SEARCH, ClineDefaultTool.LIST_CODE_DEF, ClineDefaultTool.BASH, ClineDefaultTool.SEND_USER_MESSAGE, ClineDefaultTool.ATTEMPT]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 2.8: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`, add a test named `does not expose forbidden model-facing tools` that iterates `FORBIDDEN_MODEL_FACING_TOOL_NAMES` and asserts `schemaNames(buildValidateStoryStep1ToolSchemas())` does not include each forbidden tool name.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

[ ] Task 3: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run Phase 1 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 3.1: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 3.2: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 3.3: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 3.4: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `rg -n "apply_patch|write_to_file|set_workflow_values|workflow_progress_request|ask_followup_question|use_subagents|create_workflow_artifact|build_workflow_document|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|resolve_prerequisite_files|resolve_existing_project_artifact|validate_story_index_entry" src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts` and confirm it returns no matches; exit code `1` with no output is success for this no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 3.5: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `git diff --name-only && git ls-files --others --exclude-standard` and confirm persistent diffs and untracked files are limited to Phase 1 allowed files: `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`, and `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

### Phase 2 - Validate Story Workflow Definition

Relevant requirements: Workflow Identity, Persona, Runtime-Owned Values, AI-Writable Workflow Values, Runtime Artifacts And Output Documents, Required Prerequisite Files, Entry And Steps, Step 1, Decision Tree Requirements, Module File Layout, Testing Requirements.

After completing this phase, pause for QA review before moving to Phase 3.

[ ] Task 4: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add the validate-story workflow definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, create the file with exactly these imports: type `WorkflowDecisionTree`, `WorkflowDefinition`, `WorkflowPersonaDefinition`, `WorkflowPromptBuilderInput`, `WorkflowStepDefinition`, and `WorkflowStepPromptSource` from `../../types`, and `buildValidateStoryStep1ToolSchemas` from `./validateStoryToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add exported constants `VALIDATE_STORY_WORKFLOW_NAME = "validate-story"`, `VALIDATE_STORY_WORKFLOW_SLASH_COMMAND_NAME = "validate-story"`, `VALIDATE_STORY_WORKFLOW_USE_SKILL_NAME = "validate-story"`, `VALIDATE_STORY_WORKFLOW_DISPLAY_NAME = "validate story"`, `VALIDATE_STORY_WORKFLOW_DESCRIPTION = "In this workflow, the agent assesses an implementation-ready story to ensure that it is correctly-written in compliance with project requirements and workflow quality standards."`, and `VALIDATE_STORY_WORKFLOW_PROJECT_SUBFOLDER = "planning"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, export `VALIDATE_STORY_WORKFLOW_PERSONA: WorkflowPersonaDefinition` with exact fields `{ name: "Bob", role: "Scrum Master", identity: "producing clear, actionable stories.", capabilities: ["story validation & story task/ subtask authoring."], communicationStyle: "crisp, checklist-driven, and ambiguity-free.", principles: ["always assessing runtime code & tracing seams end-to-end to ensure task coverage is comprehensive."] }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.4: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, export enum `ValidateStoryWorkflowValueKey` with exact members `ProjectMode = "projectMode"`, `ProjectTitle = "projectTitle"`, `ProjectFolderName = "projectFolderName"`, `TargetStory = "target_story"`, `EpicsDocument = "epics_document"`, and `ArchitectureDocument = "architecture_document"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.5: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, export `VALIDATE_STORY_WORKFLOW_VALUE_KEYS: readonly ValidateStoryWorkflowValueKey[]` as `[ValidateStoryWorkflowValueKey.ProjectMode, ValidateStoryWorkflowValueKey.ProjectTitle, ValidateStoryWorkflowValueKey.ProjectFolderName, ValidateStoryWorkflowValueKey.TargetStory, ValidateStoryWorkflowValueKey.EpicsDocument, ValidateStoryWorkflowValueKey.ArchitectureDocument]` and export `VALIDATE_STORY_ENTRY_PROJECT_VALUE_KEYS` as `{ projectMode: ValidateStoryWorkflowValueKey.ProjectMode, projectTitle: ValidateStoryWorkflowValueKey.ProjectTitle, projectFolderName: ValidateStoryWorkflowValueKey.ProjectFolderName }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.6: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, export prerequisite constants `VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID = ValidateStoryWorkflowValueKey.TargetStory`, `VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID = ValidateStoryWorkflowValueKey.EpicsDocument`, `VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID = ValidateStoryWorkflowValueKey.ArchitectureDocument`, and `VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN = /^(Story-[1-9]\d*-[1-9]\d*|Remediation-story-[1-9]\d*-[1-9]\d*-[1-9]\d*)\.md$/`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.7: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, export `VALIDATE_STORY_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]>` with exactly three record entries keyed by the prerequisite id constants. The `target_story` entry must be `{ id: VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID, requirement: "required", producingWorkflowName: "create-story", projectSubfolderSegments: ["implementation", "stories-backlog"], match: { kind: "naming_pattern", pattern: VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN }, workflowValueKey: ValidateStoryWorkflowValueKey.TargetStory, outputDocumentReference: "none" }`. The `epics_document` entry must use `producingWorkflowName: "create-epics"`, `projectSubfolderSegments: ["planning"]`, `match: { kind: "exact_filename", filename: "Epics.md" }`, `workflowValueKey: ValidateStoryWorkflowValueKey.EpicsDocument`, and `outputDocumentReference: "none"`. The `architecture_document` entry must use `producingWorkflowName: "create-architecture"`, `projectSubfolderSegments: ["planning"]`, `match: { kind: "exact_filename", filename: "architecture.md" }`, `workflowValueKey: ValidateStoryWorkflowValueKey.ArchitectureDocument`, and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.8: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add `const VALIDATE_STORY_STEP_1_PROMPT_TEMPLATE =` using this exact template text:

```text
You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.
- Project: projectTitle
- Project Folder: projectFolderName
- Architecture Document: architecture_document
- Epics Documentation: epics_document
- Target Story: target_story

Perform a line-by-line review to ensure that the provided story document meets all relevant project and quality standards, including:
- Objective, scope, scope boundary, and requirements are appropriate for the story and aligned with the upstream epics and architecture documentation
- The story's tasks and subtasks fully comply with the following:
    - Tasks & subtasks must start on a new line beginning with "[ ]", then the ID, then the target file's full file path, then the prescribed change.
    - Tasks and subtasks are numbered sequentially with subtasks inheriting their parent task's ID, e.g. Task 1, Subtasks 1.1, 1.2
    - The tasks/subtasks fully satisfy the story's requirements & objective while adhering to the scope and scope boundary
    - Prescribed revisions are exact and leave no ambiguity for the developer to solve during implementation.
    - Prescribed changes must include exact shapes for helpers, functions, fixtures, transition objects, discriminant narrowing, and object fields.
    - Each subtask or task without subordinate subtasks prescribes exactly one revision in a single target file
    - Tasks & Subtasks align with these quality expectations:
        - Symbol lifecycle: every referenced helper, constant, type, builder, and test utility must be created, exported, and imported before first use. Import subtasks must list exact symbol names; phrases like "all helpers", "all exports", "the builders", or "matching sibling imports" are not permitted.
        - Live contract verification: every prescribed constructor call, method call, return type, runtime action object, path-policy object, session object, form-session object, event object, and submitted-value payload must match the live exported TypeScript contract or a symbol created earlier in the same plan.
        - Single-change granularity: a subtask must not bundle multiple helpers, multiple unrelated tests, or multiple runtime branches when splitting them would make sequencing, imports, or exact assertions clearer.
        - Stable object assertions: tests for machine-consumed contracts must use exact deep-equality or exact field assertions, not "include", "deep-include", "transition type", or "action kind", when the requirements prescribe stable object fields.
        - Fixture completeness: every test fixture must prescribe exact required object fields and exact setup calls/data, including runtime sessions, values, temp files, write data, cleanup, and second/fresh fixture setup where isolation is required.
        - Deterministic helper behavior: helper subtasks must prescribe exact narrowing, intermediate variables, empty checks, return values, and error paths. Internally contradictory wording is not permitted.
        - Filesystem/path-policy behavior: if a requirement involves selected-project containment, file type, workspace path policy, or runtime-owned artifact resolution, the story must prescribe that exact validation path.
        - Legacy/forbidden coverage: unit tests and final validation guards must enumerate every forbidden legacy concept required by the requirements.
    Tasks & subtasks must NEVER include the use of these low-quality code methods:
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
- Prescribed tests provide adequate coverage of both happy paths and failure paths for all code revisions
- Tests are prescribed only for behavior, contracts, regression, and material risks required by the story document and project documentation
- Any tests built via the story's tasks use exact assertions for canonical machine-consumed outputs and stable contracts, including tool names/ schema shape, artifact file formats, and persisted metadata.
- Any tests built via the story's tasks use shape and invariant assertions for editable content: required fields exist, strings are non-empty, mappings are correct, and forbidden legacy values are absent.
- Any tests built via the story's tasks do not add static guards unless they protect an approved boundary, forbidden legacy dependency, or known regression risk.

Once you've reviewed the story document, provide a response to the user using attempt_completion. In your response, list each story section and indicate "no violations" or provide specific violation details. For the task section, provide either a "no violations" or violations details for each task and subtask. If findings were present, instruct the user to run the create-story workflow and provide your findings to the agent in that workflow.
```

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.9: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add `function renderWorkflowValueByKey(input: WorkflowPromptBuilderInput, key: ValidateStoryWorkflowValueKey): string` that assigns `const value = input.session.workflowValues[key]`, returns `""` when `value === undefined`, and otherwise returns `input.renderWorkflowValue(value)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.10: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add `function renderValidateStoryPromptTemplate(input: WorkflowPromptBuilderInput, template: string): string` returning `template.replaceAll("projectTitle", renderWorkflowValueByKey(input, ValidateStoryWorkflowValueKey.ProjectTitle)).replaceAll("projectFolderName", renderWorkflowValueByKey(input, ValidateStoryWorkflowValueKey.ProjectFolderName)).replaceAll("architecture_document", renderWorkflowValueByKey(input, ValidateStoryWorkflowValueKey.ArchitectureDocument)).replaceAll("epics_document", renderWorkflowValueByKey(input, ValidateStoryWorkflowValueKey.EpicsDocument)).replaceAll("target_story", renderWorkflowValueByKey(input, ValidateStoryWorkflowValueKey.TargetStory))`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.11: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add `function buildStep1PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` returning `{ currentStepInstructions: renderValidateStoryPromptTemplate(input, VALIDATE_STORY_STEP_1_PROMPT_TEMPLATE) }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.12: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add `function createStepDefinition(args: { stepNumber: 1; checklistLabel: string; decisionTree: WorkflowDecisionTree; buildPromptSource: WorkflowStepDefinition["buildPromptSource"]; buildToolSchema: WorkflowStepDefinition["buildToolSchema"] }): WorkflowStepDefinition` returning `{ id: \`step-${args.stepNumber}\`, stepNumber: args.stepNumber, checklistLabel: args.checklistLabel, buildPromptSource: args.buildPromptSource, buildToolSchema: args.buildToolSchema, decisionTree: args.decisionTree }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.13: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add `function buildStep1DecisionTree(): WorkflowDecisionTree` returning `{ entryBranchId: "step-1-resolve-prerequisites", branches: { "step-1-resolve-prerequisites": { id: "step-1-resolve-prerequisites", routes: [{ id: "step-1-resolve-prerequisites", trigger: { kind: "always" }, action: { kind: "resolve_prerequisite_files", prerequisiteIds: [VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID, VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID, VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID] }, followingBranchId: "step-1-start-review" }] }, "step-1-start-review": { id: "step-1-start-review", routes: [{ id: "step-1-project-prompt", trigger: { kind: "always" }, action: { kind: "project_prompt" }, followingBranchId: "step-1-await-attempt-completion" }] }, "step-1-await-attempt-completion": { id: "step-1-await-attempt-completion", routes: [{ id: "step-1-complete-workflow", trigger: { kind: "on_event", eventKind: "attempt_completion_succeeded" }, action: { kind: "complete_workflow" } }] } } }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 4.14: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, export `validateStoryWorkflowDefinition: WorkflowDefinition` with exact fields `name: VALIDATE_STORY_WORKFLOW_NAME`, `slashCommandName: VALIDATE_STORY_WORKFLOW_SLASH_COMMAND_NAME`, `useSkillName: VALIDATE_STORY_WORKFLOW_USE_SKILL_NAME`, `displayName: VALIDATE_STORY_WORKFLOW_DISPLAY_NAME`, `description: VALIDATE_STORY_WORKFLOW_DESCRIPTION`, `projectSubfolder: VALIDATE_STORY_WORKFLOW_PROJECT_SUBFOLDER`, `persona: VALIDATE_STORY_WORKFLOW_PERSONA`, `entryPanel: { promptMarkdown: VALIDATE_STORY_WORKFLOW_DESCRIPTION }`, `workflowValueKeys: VALIDATE_STORY_WORKFLOW_VALUE_KEYS`, `entryProjectValueKeys: VALIDATE_STORY_ENTRY_PROJECT_VALUE_KEYS`, `prerequisiteFiles: VALIDATE_STORY_PREREQUISITE_FILES`, and `steps: { "step-1": createStepDefinition({ stepNumber: 1, checklistLabel: "Assess Story Before Implementation", decisionTree: buildStep1DecisionTree(), buildPromptSource: buildStep1PromptSource, buildToolSchema: buildValidateStoryStep1ToolSchemas }) }`. Do not add `workflowForms`, `artifacts`, `childInheritance`, or `aiWritableWorkflowValueKeys` properties.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

[ ] Task 5: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/index.ts`, add validate-story module exports.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 5.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/index.ts`, create the file with exactly `export * from "./validateStoryToolSchemas"` followed by `export * from "./validateStoryWorkflow"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

[ ] Task 6: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add focused validate-story workflow-definition tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 6.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, create the file with exactly these imports: `expect` from `chai`, `describe` and `it` from `mocha`, type `WorkflowDecisionBranchRoute`, `WorkflowPromptBuilderInput`, `WorkflowStepDefinition`, `WorkflowValue`, and `WorkflowValues` from `../../../types`, `buildValidateStoryStep1ToolSchemas` from `../validateStoryToolSchemas`, and these exact symbols from `../validateStoryWorkflow`: `VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID`, `VALIDATE_STORY_ENTRY_PROJECT_VALUE_KEYS`, `VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID`, `VALIDATE_STORY_PREREQUISITE_FILES`, `VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN`, `VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID`, `VALIDATE_STORY_WORKFLOW_DESCRIPTION`, `VALIDATE_STORY_WORKFLOW_DISPLAY_NAME`, `VALIDATE_STORY_WORKFLOW_NAME`, `VALIDATE_STORY_WORKFLOW_PERSONA`, `VALIDATE_STORY_WORKFLOW_PROJECT_SUBFOLDER`, `VALIDATE_STORY_WORKFLOW_SLASH_COMMAND_NAME`, `VALIDATE_STORY_WORKFLOW_USE_SKILL_NAME`, `VALIDATE_STORY_WORKFLOW_VALUE_KEYS`, `ValidateStoryWorkflowValueKey`, and `validateStoryWorkflowDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 6.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add fixture constants `PROJECT_TITLE = "Validate Story Session"`, `PROJECT_FOLDER_NAME = "validate-story-session"`, `TARGET_STORY_PATH = "/tmp/validate-story-project/implementation/stories-backlog/Story-1-1.md"`, `EPICS_DOCUMENT_PATH = "/tmp/validate-story-project/planning/Epics.md"`, and `ARCHITECTURE_DOCUMENT_PATH = "/tmp/validate-story-project/planning/architecture.md"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 6.3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition` that reads `const step = validateStoryWorkflowDefinition.steps[stepId]`, throws `new Error(\`Missing ${stepId}.\`)` when `step === undefined`, and returns `step`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 6.4: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `function findRoute(branchId: string, routeId: string): WorkflowDecisionBranchRoute` that reads `const branch = getStep("step-1").decisionTree.branches[branchId]`, throws `new Error(\`Missing branch ${branchId}.\`)` when `branch === undefined`, reads `const route = branch.routes.find((candidate) => candidate.id === routeId)`, throws `new Error(\`Missing route ${routeId}.\`)` when `route === undefined`, and returns `route`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 6.5: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `function createWorkflowValues(overrides: WorkflowValues = {}): WorkflowValues` returning exact base values `{ [ValidateStoryWorkflowValueKey.ProjectMode]: "existing", [ValidateStoryWorkflowValueKey.ProjectTitle]: PROJECT_TITLE, [ValidateStoryWorkflowValueKey.ProjectFolderName]: PROJECT_FOLDER_NAME, [ValidateStoryWorkflowValueKey.TargetStory]: TARGET_STORY_PATH, [ValidateStoryWorkflowValueKey.EpicsDocument]: EPICS_DOCUMENT_PATH, [ValidateStoryWorkflowValueKey.ArchitectureDocument]: ARCHITECTURE_DOCUMENT_PATH, ...overrides }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 6.6: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `function createPromptBuilderInput(workflowValues: WorkflowValues = createWorkflowValues()): WorkflowPromptBuilderInput` returning `{ session: { activeStepNumber: 1, workflowValues, projectSelection: { projectMode: "existing", projectTitle: PROJECT_TITLE, projectFolderName: PROJECT_FOLDER_NAME }, lifecycle: { projectSelectionCompleted: true }, entryArtifactResolution: undefined, ui: { formSession: undefined, stepResolutionSession: undefined, suppressedWorkflowFormIds: [], suppressedWorkflowStepResolutionRoutes: [] }, branchContext: { activeBranchId: "step-1-await-attempt-completion" } }, step: getStep("step-1"), renderWorkflowValue: (value: WorkflowValue): string => String(value) }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 6.7: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add a `describe` block named `validateStoryWorkflowDefinition`; inside it, add a test named `declares validate-story identity, persona, entry panel, and project folder` asserting exact equality for `name`, `slashCommandName`, `useSkillName`, `displayName`, `description`, `projectSubfolder`, and `persona` against the exported constants, and asserting `entryPanel` deep-equals `{ promptMarkdown: VALIDATE_STORY_WORKFLOW_DESCRIPTION }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 6.8: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add a test named `declares workflow values without AI-writable values forms artifacts or child inheritance` asserting `workflowValueKeys` deep-equals `VALIDATE_STORY_WORKFLOW_VALUE_KEYS`, `entryProjectValueKeys` deep-equals `VALIDATE_STORY_ENTRY_PROJECT_VALUE_KEYS`, `Reflect.has(validateStoryWorkflowDefinition, "aiWritableWorkflowValueKeys") === false`, `workflowForms === undefined`, `artifacts === undefined`, and `childInheritance === undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 6.9: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add a test named `declares required prerequisite files for target story epics document and architecture document` asserting `validateStoryWorkflowDefinition.prerequisiteFiles` deep-equals `VALIDATE_STORY_PREREQUISITE_FILES`, each prerequisite entry deep-equals its exact object from Subtask 4.7, `VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN.test("Story-1-1.md") === true`, `VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN.test("Remediation-story-1-1-1.md") === true`, `VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN.test("Story-0-1.md") === false`, and `VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN.test("notes.md") === false`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 6.10: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add a test named `declares Step 1 checklist label prompt builder and exact tool surface` asserting `getStep("step-1").checklistLabel === "Assess Story Before Implementation"`, `getStep("step-1").buildToolSchema(createPromptBuilderInput()).map((tool) => tool.name)` deep-equals `buildValidateStoryStep1ToolSchemas().map((tool) => tool.name)`, and `getStep("step-1").buildPromptSource(createPromptBuilderInput()).currentStepInstructions` is a non-empty string.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 6.11: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add a test named `renders Step 1 prompt with materialized workflow values and without raw placeholders` that calls `getStep("step-1").buildPromptSource(createPromptBuilderInput()).currentStepInstructions`, narrows it with `if (prompt === undefined || prompt === "") { throw new Error("Expected Step 1 prompt.") }`, asserts it includes `PROJECT_TITLE`, `PROJECT_FOLDER_NAME`, `TARGET_STORY_PATH`, `EPICS_DOCUMENT_PATH`, and `ARCHITECTURE_DOCUMENT_PATH`, and asserts it does not include raw placeholders `projectTitle`, `projectFolderName`, `target_story`, `epics_document`, or `architecture_document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 6.12: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add a test named `routes Step 1 through prerequisite resolution project prompt and completion` asserting `getStep("step-1").decisionTree.entryBranchId === "step-1-resolve-prerequisites"`, branch ids deep-equal `["step-1-resolve-prerequisites", "step-1-start-review", "step-1-await-attempt-completion"]`, `findRoute("step-1-resolve-prerequisites", "step-1-resolve-prerequisites").action` deep-equals `{ kind: "resolve_prerequisite_files", prerequisiteIds: [VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID, VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID, VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID] }`, that route's `followingBranchId === "step-1-start-review"`, `findRoute("step-1-start-review", "step-1-project-prompt").action` deep-equals `{ kind: "project_prompt" }`, that route's `followingBranchId === "step-1-await-attempt-completion"`, `findRoute("step-1-await-attempt-completion", "step-1-complete-workflow").trigger` deep-equals `{ kind: "on_event", eventKind: "attempt_completion_succeeded" }`, and the completion route action deep-equals `{ kind: "complete_workflow" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

[ ] Task 7: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run Phase 2 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 7.1: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 7.2: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 7.3: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 7.4: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `rg -n "validate-story\\.md|bmad-validate-story|placeholder workflow|managed-workflow|\\.cline/workflow-config\\.yaml|legacy contextual tool matrix|readFile|fs/promises|node:fs|ToolHandler|completionHandler|finalDeliveryFinalizer|build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|resolve_existing_project_artifact|validate_story_index_entry" src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts src/core/task/workflow-runtime/workflow-modules/validate-story/index.ts` and confirm it returns no matches; exit code `1` with no output is success for this no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 7.5: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `git diff --name-only && git ls-files --others --exclude-standard` and confirm persistent diffs and untracked files are limited to Phase 1 and Phase 2 allowed files: `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/index.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, and `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

### Phase 3 - Registry, Runtime Prerequisite Coverage, And Prompt Projection

Relevant requirements: Required Prerequisite Files, Decision Tree Requirements, Module File Layout, Historical Cleanup Expectations, Testing Requirements, Validation Requirements.

After completing this phase, pause for QA review before considering the action plan complete.

[ ] Task 8: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`, register the validate-story workflow.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 8.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`, add `import { validateStoryWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/validate-story"` after the existing `piPlanningWorkflowDefinition` import and before the `writeRemediationStoryWorkflowDefinition` import.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 8.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`, add `validateStoryWorkflowDefinition` to `shippedWorkflowDefinitions` immediately after `piPlanningWorkflowDefinition` and before `codeReviewWorkflowDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

[ ] Task 9: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add registry and runtime prerequisite behavior coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, update imports by adding `mkdir`, `mkdtemp`, `rm`, and `writeFile` from `node:fs/promises`; `tmpdir` from `node:os`; `dirname` and `join` from `node:path`; `WorkflowFormAction` and `WorkflowFormSubmissionRequest` from `@shared/proto/cline/task`; `TaskState` from `@/core/task/TaskState`; type `ActiveWorkflowSession`, `WorkflowNextAction`, and `WorkflowWorkspacePathPolicy` from `../../../types`; `resolveWorkflowBySlashCommand`, `resolveWorkflowByUseSkillName`, and `resolveWorkflowDefinition` from `../../../WorkflowRegistry`; and `WorkflowRuntime` from `../../../WorkflowRuntime`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add test constants `RUNTIME_PROJECT_FOLDER_NAME = "validate-story-runtime-project"`, `PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY = "__workflow_runtime_prerequisite_single_match_confirmation__"`, and `PREREQUISITE_CANNOT_CONTINUE_PANEL_ID = "__workflow_runtime_prerequisite_cannot_continue__"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `function createAllowAllWorkspacePathPolicy(): WorkflowWorkspacePathPolicy` returning `{ validateAccess: (): boolean => true }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.4: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `function createActiveRuntimeSession(workflowValues: WorkflowValues = {}): ActiveWorkflowSession` returning `{ activeStepNumber: 1, workflowValues, projectSelection: { projectMode: "existing", projectTitle: "Validate Story Runtime Project", projectFolderName: RUNTIME_PROJECT_FOLDER_NAME }, lifecycle: { projectSelectionCompleted: true }, entryArtifactResolution: undefined, ui: { formSession: undefined, stepResolutionSession: undefined, suppressedWorkflowFormIds: [], suppressedWorkflowStepResolutionRoutes: [] }, branchContext: { activeBranchId: "step-1-resolve-prerequisites" } }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.5: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `function getActiveWorkflowSession(state: TaskState): ActiveWorkflowSession` that reads `const activeSession = state.activeWorkflowSession`, throws `new Error("Expected an active workflow session.")` when `activeSession === undefined`, and returns `activeSession`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.6: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `function createFormSubmitRequest(args: { sessionId: string; panelId: string; action?: WorkflowFormAction; fields?: WorkflowFormSubmissionRequest["fields"] }): WorkflowFormSubmissionRequest` returning `WorkflowFormSubmissionRequest.create({ sessionId: args.sessionId, panelId: args.panelId, action: args.action ?? WorkflowFormAction.SUBMIT, fields: args.fields ?? [] })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.7: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `function expectRenderWorkflowForm(action: WorkflowNextAction): Extract<WorkflowNextAction, { kind: "render_workflow_form" }>` that asserts `action.kind === "render_workflow_form"`, throws `new Error(\`Expected render_workflow_form, received ${action.kind}.\`)` after narrowing fails, and returns `action`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.8: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `async function writeValidateStoryProjectFile(cwd: string, relativePath: string, content = "validate-story prerequisite"): Promise<string>` that sets `const absolutePath = join(cwd, "docs", "projects", RUNTIME_PROJECT_FOLDER_NAME, relativePath)`, calls `await mkdir(dirname(absolutePath), { recursive: true })`, calls `await writeFile(absolutePath, content, "utf8")`, and returns `absolutePath`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.9: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `async function submitSingleMatchConfirmation(runtime: WorkflowRuntime, taskState: TaskState, action: Extract<WorkflowNextAction, { kind: "render_workflow_form" }>, accepted: boolean): Promise<WorkflowNextAction>` returning `runtime.submitWorkflowForm({ taskState, request: createFormSubmitRequest({ sessionId: action.formSession.sessionId, panelId: action.formSession.currentPanelId, fields: [{ key: PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY, value: { booleanValue: accepted } }] }) })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.10: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `function createRuntimeFixture(cwd: string): { runtime: WorkflowRuntime; taskState: TaskState }` that creates `const runtime = new WorkflowRuntime({ cwd, workspacePathPolicy: createAllowAllWorkspacePathPolicy() })`, creates `const taskState = new TaskState()`, assigns `taskState.activeWorkflowName = VALIDATE_STORY_WORKFLOW_NAME`, assigns `taskState.activeWorkflowSession = createActiveRuntimeSession()`, and returns `{ runtime, taskState }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.11: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add a registry test named `resolves from the shipped workflow registry by canonical names only` asserting `resolveWorkflowDefinition(VALIDATE_STORY_WORKFLOW_NAME)`, `resolveWorkflowBySlashCommand(VALIDATE_STORY_WORKFLOW_SLASH_COMMAND_NAME)`, and `resolveWorkflowByUseSkillName(VALIDATE_STORY_WORKFLOW_USE_SKILL_NAME)` return `validateStoryWorkflowDefinition`, and asserting the same three resolver calls with `"validate-story.md"` return `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.12: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add a runtime test named `persists selected prerequisite paths and reaches the Step 1 project prompt` that creates `const cwd = await mkdtemp(join(tmpdir(), "validate-story-workflow-test-"))`, wraps the body in `try`/`finally` with `await rm(cwd, { recursive: true, force: true })`, assigns `const targetStoryPath = await writeValidateStoryProjectFile(cwd, "implementation/stories-backlog/Story-1-1.md")`, assigns `const epicsDocumentPath = await writeValidateStoryProjectFile(cwd, "planning/Epics.md")`, assigns `const architectureDocumentPath = await writeValidateStoryProjectFile(cwd, "planning/architecture.md")`, assigns `const { runtime, taskState } = createRuntimeFixture(cwd)`, assigns `const targetStoryPrompt = expectRenderWorkflowForm(await runtime.resolveNextAction({ taskState }))`, assigns `const epicsDocumentPrompt = expectRenderWorkflowForm(await submitSingleMatchConfirmation(runtime, taskState, targetStoryPrompt, true))`, assigns `const architectureDocumentPrompt = expectRenderWorkflowForm(await submitSingleMatchConfirmation(runtime, taskState, epicsDocumentPrompt, true))`, assigns `const finalAction = await submitSingleMatchConfirmation(runtime, taskState, architectureDocumentPrompt, true)`, and finally asserts `getActiveWorkflowSession(taskState).workflowValues[ValidateStoryWorkflowValueKey.TargetStory] === targetStoryPath`, `getActiveWorkflowSession(taskState).workflowValues[ValidateStoryWorkflowValueKey.EpicsDocument] === epicsDocumentPath`, `getActiveWorkflowSession(taskState).workflowValues[ValidateStoryWorkflowValueKey.ArchitectureDocument] === architectureDocumentPath`, asserts `finalAction.kind === "project_prompt"`, throws `new Error(\`Expected project_prompt, received ${finalAction.kind}.\`)` when `finalAction.kind !== "project_prompt"`, assigns `const workflowInputPayloadBlock = finalAction.promptProjection.workflowInputPayloadBlock`, throws `new Error("Expected validate-story runtime prompt payload.")` when `workflowInputPayloadBlock === undefined || workflowInputPayloadBlock === ""`, and asserts `workflowInputPayloadBlock` includes `targetStoryPath`, `epicsDocumentPath`, and `architectureDocumentPath`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.13: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add a runtime test named `stops before model-driven work when a required prerequisite has no match` that creates `const cwd = await mkdtemp(join(tmpdir(), "validate-story-workflow-test-"))`, wraps the body in `try`/`finally` with `await rm(cwd, { recursive: true, force: true })`, assigns `const { runtime, taskState } = createRuntimeFixture(cwd)` without writing prerequisite files, assigns `const result = expectRenderWorkflowForm(await runtime.resolveNextAction({ taskState }))`, asserts `result.payload.panel?.panelId === PREREQUISITE_CANNOT_CONTINUE_PANEL_ID`, asserts `getActiveWorkflowSession(taskState).workflowValues[ValidateStoryWorkflowValueKey.TargetStory] === undefined`, and asserts the returned action is not `project_prompt` by relying on the narrowed `render_workflow_form` result.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.14: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add a runtime test named `stops before model-driven work when a required prerequisite is rejected` that creates `const cwd = await mkdtemp(join(tmpdir(), "validate-story-workflow-test-"))`, wraps the body in `try`/`finally` with `await rm(cwd, { recursive: true, force: true })`, calls `await writeValidateStoryProjectFile(cwd, "implementation/stories-backlog/Story-1-1.md")`, assigns `const { runtime, taskState } = createRuntimeFixture(cwd)`, assigns `const prompt = expectRenderWorkflowForm(await runtime.resolveNextAction({ taskState }))`, assigns `const rejected = expectRenderWorkflowForm(await submitSingleMatchConfirmation(runtime, taskState, prompt, false))`, asserts `rejected.payload.panel?.panelId === PREREQUISITE_CANNOT_CONTINUE_PANEL_ID`, and asserts `getActiveWorkflowSession(taskState).workflowValues[ValidateStoryWorkflowValueKey.TargetStory] === undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 9.15: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add a runtime test named `stops before model-driven work when a required prerequisite selection is canceled` that creates `const cwd = await mkdtemp(join(tmpdir(), "validate-story-workflow-test-"))`, wraps the body in `try`/`finally` with `await rm(cwd, { recursive: true, force: true })`, calls `await writeValidateStoryProjectFile(cwd, "implementation/stories-backlog/Story-1-1.md")`, assigns `const { runtime, taskState } = createRuntimeFixture(cwd)`, assigns `const prompt = expectRenderWorkflowForm(await runtime.resolveNextAction({ taskState }))`, assigns `const cancelled = expectRenderWorkflowForm(await runtime.submitWorkflowForm({ taskState, request: createFormSubmitRequest({ sessionId: prompt.formSession.sessionId, panelId: prompt.formSession.currentPanelId, action: WorkflowFormAction.CANCEL }) }))`, asserts `cancelled.payload.panel?.panelId === PREREQUISITE_CANNOT_CONTINUE_PANEL_ID`, and asserts `getActiveWorkflowSession(taskState).workflowValues[ValidateStoryWorkflowValueKey.TargetStory] === undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

[ ] Task 10: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add validate-story prompt-projection coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 10.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add imports for `VALIDATE_STORY_WORKFLOW_NAME` and `ValidateStoryWorkflowValueKey` from `@/core/task/workflow-runtime/workflow-modules/validate-story`, and add import `buildValidateStoryStep1ToolSchemas` from `@/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 10.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add fixture constants `VALIDATE_STORY_PROJECT_ROOT = "/tmp/validate-story-project"`, `VALIDATE_STORY_TARGET_STORY = \`${VALIDATE_STORY_PROJECT_ROOT}/implementation/stories-backlog/Story-1-1.md\``, `VALIDATE_STORY_EPICS_DOCUMENT = \`${VALIDATE_STORY_PROJECT_ROOT}/planning/Epics.md\``, `VALIDATE_STORY_ARCHITECTURE_DOCUMENT = \`${VALIDATE_STORY_PROJECT_ROOT}/planning/architecture.md\``, and `VALIDATE_STORY_FORBIDDEN_PROMPT_TOOL_NAMES: readonly string[] = ["apply_patch", "write_to_file", "set_workflow_values", "workflow_progress_request", "ask_followup_question", "use_subagents", "create_workflow_artifact", "build_workflow_document", "archive_workflow_artifact", "delete_workflow_artifact", "move_workflow_project_file", "resolve_prerequisite_files", "resolve_existing_project_artifact", "validate_story_index_entry"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 10.3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add `function createValidateStoryWorkflowValues(overrides: WorkflowValues = {}): WorkflowValues` returning exact base values `{ [ValidateStoryWorkflowValueKey.ProjectMode]: "existing", [ValidateStoryWorkflowValueKey.ProjectTitle]: "Validate Story Session", [ValidateStoryWorkflowValueKey.ProjectFolderName]: "validate-story-project", [ValidateStoryWorkflowValueKey.TargetStory]: VALIDATE_STORY_TARGET_STORY, [ValidateStoryWorkflowValueKey.EpicsDocument]: VALIDATE_STORY_EPICS_DOCUMENT, [ValidateStoryWorkflowValueKey.ArchitectureDocument]: VALIDATE_STORY_ARCHITECTURE_DOCUMENT, ...overrides }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 10.4: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add `function createValidateStoryWorkflowSession(workflowValues: WorkflowValues = createValidateStoryWorkflowValues()): ActiveWorkflowSession` returning `{ activeStepNumber: 1, workflowValues, projectSelection: { projectMode: "existing", projectTitle: "Validate Story Session", projectFolderName: "validate-story-project" }, lifecycle: { projectSelectionCompleted: true }, entryArtifactResolution: undefined, ui: { formSession: undefined, stepResolutionSession: undefined, suppressedWorkflowFormIds: [], suppressedWorkflowStepResolutionRoutes: [] }, branchContext: { activeBranchId: "step-1-await-attempt-completion" } }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 10.5: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add `async function buildValidateStoryPromptContext(workflowValues: WorkflowValues = createValidateStoryWorkflowValues()): Promise<SystemPromptContext & WorkflowPromptProjection>` that creates `const workspacePathPolicy: WorkflowWorkspacePathPolicy = { validateAccess: () => true }`, creates `const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })`, creates `const taskState = new TaskState()`, sets `taskState.activeWorkflowName = VALIDATE_STORY_WORKFLOW_NAME`, sets `taskState.activeWorkflowSession = createValidateStoryWorkflowSession(workflowValues)`, sets `taskState.apiRequestCount = 1`, awaits `const workflowProjection = await runtime.buildTurnProjection({ taskState })`, and returns `{ ...baseContext, mcpHub: makeMcpHub([]), providerInfo: makeProviderInfo("gpt-5-codex", "openai"), enableNativeToolCalls: true, useMinimalGptPrompt: true, ...workflowProjection }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 10.6: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add a test named `projects active validate-story Step 1 tools from module-owned builders into native GPT-5 prompts` using Mocha's `async function ()` callback form so `this` is the Mocha context. The test must call `const context = await buildValidateStoryPromptContext()`, assert `context.workflowToolSchemaOverride` deep-equals `buildValidateStoryStep1ToolSchemas()`, and call `runPromptTest(this, context, "gpt-5-codex", async ({ tools }) => { expect(getNativeToolNames(tools)).to.deep.equal(buildValidateStoryStep1ToolSchemas().map((tool) => tool.name)) })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 10.7: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add a test named `projects validate-story Step 1 materialized values into full-turn and continuation payloads` that calls `const context = await buildValidateStoryPromptContext()`, narrows both `context.workflowInputPayloadBlock` and `context.continuationWorkflowInputPayloadBlock` by throwing `new Error("Expected validate-story Step 1 workflow input payload.")` or `new Error("Expected validate-story Step 1 continuation workflow input payload.")` when either is `undefined` or `""`, iterates both payload blocks, asserts each trimmed block is not `""`, asserts each includes `VALIDATE_STORY_TARGET_STORY`, `VALIDATE_STORY_EPICS_DOCUMENT`, `VALIDATE_STORY_ARCHITECTURE_DOCUMENT`, `"Validate Story Session"`, and `"validate-story-project"`, and asserts each does not include raw placeholders `target_story`, `epics_document`, `architecture_document`, `projectTitle`, or `projectFolderName`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 10.8: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add a test named `does not expose forbidden tools in validate-story Step 1 prompt projection` that calls `const context = await buildValidateStoryPromptContext()`, assigns `const projectedToolNames = (context.workflowToolSchemaOverride ?? []).map((tool) => tool.name)`, and asserts every `VALIDATE_STORY_FORBIDDEN_PROMPT_TOOL_NAMES` entry is absent from `projectedToolNames`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 10.9: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add a test named `renders validate-story Step 1 tools through non-native prompt text without forbidden tools` using Mocha's `async function ()` callback form so `this` is the Mocha context. The test must create `const nativeContext = await buildValidateStoryPromptContext()`, create `const context: SystemPromptContext = { ...nativeContext, providerInfo: makeProviderInfo("gpt-3", "openai"), enableNativeToolCalls: false }`, assign `const approvedToolNames = buildValidateStoryStep1ToolSchemas().map((tool) => tool.name)`, and call `runPromptTest(this, context, "gpt-3", async ({ systemPrompt, tools }) => { expect(tools).to.equal(undefined); for (const toolName of approvedToolNames) { expect(systemPrompt).to.include(toolName) } for (const forbiddenToolName of VALIDATE_STORY_FORBIDDEN_PROMPT_TOOL_NAMES) { expect(systemPrompt).not.to.include(forbiddenToolName) } })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

[ ] Task 11: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run Phase 3 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 11.1: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 11.2: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 11.3: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 11.4: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 11.5: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `rg -n "validate-story\\.md|bmad-validate-story|placeholder workflow|managed-workflow|\\.cline/workflow-config\\.yaml|legacy contextual tool matrix|readFile|fs/promises|node:fs|ToolHandler|completionHandler|finalDeliveryFinalizer|build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|resolve_existing_project_artifact|validate_story_index_entry" src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts src/core/task/workflow-runtime/workflow-modules/validate-story/index.ts` and confirm it returns no matches; exit code `1` with no output is success for this no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 11.6: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `rg -n "apply_patch|write_to_file|set_workflow_values|workflow_progress_request|ask_followup_question|use_subagents|create_workflow_artifact|build_workflow_document|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|resolve_prerequisite_files|resolve_existing_project_artifact|validate_story_index_entry" src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts` and confirm it returns no matches; exit code `1` with no output is success for this no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

    [ ] Subtask 11.7: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`, run `git diff --name-only && git ls-files --others --exclude-standard` and confirm persistent diffs and untracked files are limited to Phase 1, Phase 2, and Phase 3 allowed files: `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/index.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, and `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`

## Validation

Run these exact commands after all phases are complete:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
rg -n "validate-story\\.md|bmad-validate-story|placeholder workflow|managed-workflow|\\.cline/workflow-config\\.yaml|legacy contextual tool matrix|readFile|fs/promises|node:fs|ToolHandler|completionHandler|finalDeliveryFinalizer|build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|resolve_existing_project_artifact|validate_story_index_entry" src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts src/core/task/workflow-runtime/workflow-modules/validate-story/index.ts
rg -n "apply_patch|write_to_file|set_workflow_values|workflow_progress_request|ask_followup_question|use_subagents|create_workflow_artifact|build_workflow_document|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|resolve_prerequisite_files|resolve_existing_project_artifact|validate_story_index_entry" src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts
git diff --name-only && git ls-files --others --exclude-standard
```

The two `rg` commands must return no matches; exit code `1` with no output is success for these no-match guards. If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and then rerun `npm run check-types` before treating the failure as a code defect.
