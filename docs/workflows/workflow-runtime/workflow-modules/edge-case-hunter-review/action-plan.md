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

This plan builds and registers the product-owned `edge-case-hunter-review` workflow module described by [edge-case-hunter-review-requirements.md](./edge-case-hunter-review-requirements.md).

The module performs an edge case hunter review of implementation changes using Git-backed evidence, the selected or inherited target story, and a review scope manifest. It resolves or inherits target story evidence, validates and persists commit metadata, creates and populates `review-scope-{target}.md` only for main-agent activation, creates `edge-case-hunter-{target}.md` for every run, projects the source-prescribed Step 2 prompt with materialized workflow values, exposes only the approved Step 2 model-facing tools, and completes after `attempt_completion`.

Approved implementation decisions:

- The existing runtime artifact families `WorkflowArtifactFamily.ReviewScopeManifest` and `WorkflowArtifactFamily.EdgeCaseReviewOutput` are the canonical artifact families for this workflow.
- No artifact-family runtime change is required because `review_scope_manifest` and `edge_case_review_output` are already registered target-derived families.
- The module derives `selected_story_identity` from the basename of `target_story` and uses that value as the target-derived artifact identity source for both artifacts.
- The module must not use the singleton `entry_artifact_resolution_completed` / `creationRequired` startup flow because this workflow has no entry singleton artifacts.
- Main-agent activation is identified by persisted entry project workflow values and incomplete review evidence; it uses prerequisite resolution, the commit-hash form, review-scope manifest allocation/population, edge-case output allocation, then Step 2.
- Child/subagent activation is identified by inherited review evidence values before entry project workflow values exist; it bypasses prerequisite resolution, forms, and review-scope manifest generation, then allocates only `edge_case_review_output`.
- If a child/subagent activation is missing one or more inherited evidence values, Step 1 routes to terminal error through a deterministic procedure that names the missing keys.
- Main-agent review-scope manifest generation reuses `buildReviewScopeManifestModel`, `buildReviewScopeManifestMarkdown`, `parseGitShowNameStatus`, and `parseGitShowNumstat` from `code-review/reviewScopeManifest.ts`.
- The code-review workflow's Step 2 subagent assignment prompt must be updated to invoke `edge-case-hunter-review`, not the retired `review-edge-case-hunter` name.
- Prompt tests must assert non-empty prompt projection, materialized workflow values, absent raw placeholders, required tool exposure, and forbidden tool absence. They must not assert full editable prompt prose.

Sibling-pattern audit summary:

- The workflow module follows the existing `blind-review` module shape for two-step child-capable review workflows.
- The Step 1 commit validation and target story identity derivation follow the `blind-review` and `code-review` deterministic-helper pattern.
- The review scope manifest population follows the current `code-review` implementation pattern but keeps orchestration local to `edgeCaseHunterReviewWorkflow.ts` as required.
- The Step 2 schema follows the module build guide tool-schema ownership rules and uses module-owned `ClineToolSpec` builders with `ModelFamily.NATIVE_GPT_5`.

## Scope Boundary

- Do not edit `/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md`.
- Do not read `/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md`, `_bmad/bmm/agents/quality-control.md`, `.cline/skills/bmad-review-edge-case-hunter`, or the legacy tool matrix at runtime.
- Do not add shared runtime architecture for child/main activation detection.
- Do not modify shared project-selection behavior.
- Do not implement target story selection as a module-owned selector form.
- Do not add a module-owned document helper, registry file, static data file, or additional module file beyond the files named in this plan.
- Do not create specialized edge-case-hunter backend tools.
- Do not expose `web_search`, `web_fetch`, `browser_action`, `ask_followup_question`, `use_subagents`, `use_skill`, `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `workflow_progress_request`, MCP tools, retired review tools, or backend-only runtime tools to the Step 2 model.
- Do not preserve `review-edge-case-hunter`, `review-edge-case-hunter.md`, or `edge-case-hunter-review.md` as workflow name, slash-command, or skill aliases.
- Do not preserve `Review-edge-case-hunter-{target}.md`, `review_edge_case_hunter`, `ReviewEdgeCaseHunter`, placeholder workflow state, managed-workflow state, or legacy contextual tool-matrix behavior as canonical runtime behavior.
- Do not make edge-case-hunter-review completion update story index status, move story files, generate remediation stories, dispatch subagents, or mutate parent workflow state.
- Do not add exact full-prose assertions for editable prompt text.

## Known Issues / Risks / Technical Debt

- Existing historical docs and test fixtures outside the active runtime module may still contain `review-edge-case-hunter` references. This plan updates only active runtime/prompt surfaces needed for the `edge-case-hunter-review` module and uses targeted negative checks to avoid treating unrelated historical documentation as runtime drift.
- `.cline/skills/bmad-review-edge-case-hunter` exists and must be deleted by this module build. No behavior from that package may be migrated into the new runtime module.
- The worktree already contains dirty user-authored documentation before this action plan is implemented: `docs/workflows/workflow-runtime/architecture.md`, `docs/workflows/workflow-runtime/requirements.md`, `docs/workflows/workflow-runtime/workflow-modules/acceptance-audit-review/acceptance-audit-review.md`, and `docs/workflows/workflow-runtime/workflow-modules/code-review/code-review-requirements.md`. Scope-diff validation must distinguish these pre-existing files from files changed by the phase implementation.
- `npm run check-types` may fail before TypeScript checking if generated proto files are missing or host probing fails. If that happens, run `npm run protos` and rerun the exact blocked validation command before treating the failure as a code defect.

## Tasks / Subtasks

### Phase 1 - Edge Case Hunter Tool Schemas

After completing this phase, pause for QA review before moving to Phase 2.

[ ] Task 1. Add the module-owned edge-case-hunter-review tool-schema builders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewToolSchemas.ts`

[ ] Subtask 1.1. Add `edgeCaseHunterReviewToolSchemas.ts` with imports for `ClineToolSpec`, `AGENT_FEEDBACK_PARAMETER`, `ModelFamily`, and `ClineDefaultTool`; define `const EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5`; export `buildEdgeCaseHunterReviewStep1ToolSchemas(): readonly ClineToolSpec[]` returning `[]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewToolSchemas.ts`

[ ] Subtask 1.2. In `edgeCaseHunterReviewToolSchemas.ts`, add exported source-inspection tool builders with these exact schema identities and parameter shapes: `buildEdgeCaseHunterReviewExecuteCommandToolSchema()` returns name `execute_command`, id `ClineDefaultTool.BASH`, required string parameter `command`, and required boolean parameter `requires_approval`; `buildEdgeCaseHunterReviewListFilesToolSchema()` returns name `list_files`, id `ClineDefaultTool.LIST_FILES`, required string parameter `path`, and optional boolean parameter `recursive`; `buildEdgeCaseHunterReviewSearchFilesToolSchema()` returns name `search_files`, id `ClineDefaultTool.SEARCH`, required string parameters `path` and `regex`, and optional string parameter `file_pattern`; `buildEdgeCaseHunterReviewListCodeDefinitionNamesToolSchema()` returns name `list_code_definition_names`, id `ClineDefaultTool.LIST_CODE_DEF`, and required string parameter `path`; `buildEdgeCaseHunterReviewReadFileToolSchema()` returns name `read_file`, id `ClineDefaultTool.FILE_READ`, and required string parameter `path`; `buildEdgeCaseHunterReviewReadFileRangeToolSchema()` returns name `read_file_range`, id `ClineDefaultTool.FILE_READ_RANGE`, required string parameter `path`, required integer parameter `start_line`, and required integer parameter `end_line`; every schema must include `variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT`, and every parameter object must include non-empty `instruction` and `description` strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewToolSchemas.ts`

[ ] Subtask 1.3. In `edgeCaseHunterReviewToolSchemas.ts`, add exported edit and response tool builders with these exact schema identities and parameter shapes: `buildEdgeCaseHunterReviewApplyPatchToolSchema()` returns name `apply_patch`, id `ClineDefaultTool.APPLY_PATCH`, and required string parameter `input`; `buildEdgeCaseHunterReviewWriteToFileToolSchema()` returns name `write_to_file`, id `ClineDefaultTool.FILE_NEW`, and required string parameters `absolutePath` and `content`; `buildEdgeCaseHunterReviewSendUserMessageToolSchema()` returns name `send_user_message`, id `ClineDefaultTool.SEND_USER_MESSAGE`, required string parameter `message`, and `AGENT_FEEDBACK_PARAMETER`; `buildEdgeCaseHunterReviewAttemptCompletionToolSchema()` returns name `attempt_completion`, id `ClineDefaultTool.ATTEMPT`, and required string parameter `result`; every schema must include `variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT`, and every non-shared parameter object must include non-empty `instruction` and `description` strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewToolSchemas.ts`

[ ] Subtask 1.4. In `edgeCaseHunterReviewToolSchemas.ts`, export `buildEdgeCaseHunterReviewStep2ToolSchemas(): readonly ClineToolSpec[]` returning these builders in this exact order: `execute_command`, `list_files`, `search_files`, `list_code_definition_names`, `read_file`, `read_file_range`, `apply_patch`, `write_to_file`, `send_user_message`, `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewToolSchemas.ts`

[ ] Task 2. Add focused edge-case-hunter-review tool-schema tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts`

[ ] Subtask 2.1. Add `edgeCaseHunterReviewToolSchemas.test.ts` importing `expect`, `describe`, `it`, `ModelFamily`, `ClineToolSpec`, and `buildEdgeCaseHunterReviewStep1ToolSchemas`/`buildEdgeCaseHunterReviewStep2ToolSchemas`; define typed helpers `schemaNames(schemas: readonly ClineToolSpec[]): readonly string[]` and `findSchemaByName(schemas: readonly ClineToolSpec[], name: string): ClineToolSpec` without casts.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts`

[ ] Subtask 2.2. In `edgeCaseHunterReviewToolSchemas.test.ts`, add a test asserting Step 1 returns `[]` and Step 2 returns exactly `["execute_command", "list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "write_to_file", "send_user_message", "attempt_completion"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts`

[ ] Subtask 2.3. In `edgeCaseHunterReviewToolSchemas.test.ts`, add a test asserting every Step 2 schema has `variant === ModelFamily.NATIVE_GPT_5` and that each schema's parameter names, `required` flags, and `type` values exactly match Subtasks 1.2 and 1.3.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts`

[ ] Subtask 2.4. In `edgeCaseHunterReviewToolSchemas.test.ts`, add a forbidden-tool test asserting Step 1 and Step 2 do not include `web_search`, `web_fetch`, `browser_action`, `ask_followup_question`, `use_subagents`, `use_skill`, `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `workflow_progress_request`, `use_mcp_tool`, `access_mcp_resource`, `load_mcp_documentation`, `build_review_input`, `build_review_diff_output`, `code_review_spec_update`, or `record_findings`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts`

[ ] Task 3. Run Phase 1 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 3.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 3.2. Run `npm run check-types`; if it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 3.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

### Phase 2 - Edge Case Hunter Workflow Module

After completing this phase, pause for QA review before moving to Phase 3.

[ ] Task 4. Add the edge-case-hunter-review workflow constants, value contract, prerequisite declaration, artifact declarations, and Step 1 form.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 4.1. Add `edgeCaseHunterReviewWorkflow.ts` with imports for `readFile` and `writeFile` from `node:fs/promises`; `basename`, `dirname`, and `normalize` from `node:path`; `WorkflowFormDefinitionPayload`; `execa`; `WorkflowArtifactFamily`; type imports for `ActiveWorkflowSession`, `WorkflowDecisionBranchTrigger`, `WorkflowDecisionTree`, `WorkflowDefinition`, `WorkflowDeterministicProcedureResult`, `WorkflowFormContinuationReplacementBuilder`, `WorkflowPersonaDefinition`, `WorkflowPromptBuilderInput`, `WorkflowStepDefinition`, `WorkflowStepPromptSource`, and `WorkflowValues`; `buildEdgeCaseHunterReviewStep1ToolSchemas`/`buildEdgeCaseHunterReviewStep2ToolSchemas`; and `buildReviewScopeManifestMarkdown`, `buildReviewScopeManifestModel`, `parseGitShowNameStatus`, and `parseGitShowNumstat` from `../code-review/reviewScopeManifest`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 4.2. In `edgeCaseHunterReviewWorkflow.ts`, export identity constants exactly: `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_NAME = "edge-case-hunter-review"`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_SLASH_COMMAND_NAME = "edge-case-hunter-review"`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_USE_SKILL_NAME = "edge-case-hunter-review"`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DISPLAY_NAME = "edge case hunter review"`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DESCRIPTION = "In this workflow, the agent acts as a path tracer, walking every branching path to identify every edge case associated with recent code updates to ensure that no detail was overlooked during implementation."`, and `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PROJECT_SUBFOLDER = "review"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 4.3. In `edgeCaseHunterReviewWorkflow.ts`, export `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PERSONA: WorkflowPersonaDefinition` with exactly `name: "Fred"`, `role: "Quality Control"`, `identity: "Coordinates quality review after implementation to ensure that code is functional and compliant before it ships to production."`, `capabilities: ["rigorous edge case analysis of preproduction code"]`, `communicationStyle: "precise and detailed"`, and `principles: ["small details at overlooked boundaries can make or break a product. Finding the small things up-front saves countless hours of triage and bug-fixing later."]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 4.4. In `edgeCaseHunterReviewWorkflow.ts`, export enum `EdgeCaseHunterReviewWorkflowValueKey` with exactly these values: `ProjectMode = "projectMode"`, `ProjectTitle = "projectTitle"`, `ProjectFolderName = "projectFolderName"`, `TargetStory = "target_story"`, `SelectedStoryIdentity = "selected_story_identity"`, `ReviewCommitHash = "review_commit_hash"`, `ReviewCommitParent = "review_commit_parent"`, `ReviewScopeManifest = "review_scope_manifest"`, `ReviewScopeManifestArtifactFamily = "review_scope_manifest_artifact_family"`, `ReviewScopeManifestArtifactIdentity = "review_scope_manifest_artifact_identity"`, `ReviewScopeManifestArtifactFilename = "review_scope_manifest_artifact_filename"`, `ReviewScopeManifestArtifactRelativePath = "review_scope_manifest_artifact_relative_path"`, `EdgeCaseReviewOutput = "edge_case_review_output"`, `EdgeCaseReviewOutputArtifactFamily = "edge_case_review_output_artifact_family"`, `EdgeCaseReviewOutputArtifactIdentity = "edge_case_review_output_artifact_identity"`, `EdgeCaseReviewOutputArtifactFilename = "edge_case_review_output_artifact_filename"`, and `EdgeCaseReviewOutputArtifactRelativePath = "edge_case_review_output_artifact_relative_path"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 4.5. In `edgeCaseHunterReviewWorkflow.ts`, export `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_VALUE_KEYS` as `Object.values(EdgeCaseHunterReviewWorkflowValueKey)` and export `EDGE_CASE_HUNTER_REVIEW_ENTRY_PROJECT_VALUE_KEYS` mapping `projectMode`, `projectTitle`, and `projectFolderName` to the matching enum values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 4.6. In `edgeCaseHunterReviewWorkflow.ts`, export `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID = EdgeCaseHunterReviewWorkflowValueKey.TargetStory`, export `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_FILENAME_PATTERN = /^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/`, and export `EDGE_CASE_HUNTER_REVIEW_PREREQUISITE_FILES` with one required `target_story` prerequisite for producing workflow `dev-story`, `projectSubfolderSegments: ["implementation", "stories-review"]`, `match.kind: "naming_pattern"`, `workflowValueKey: EdgeCaseHunterReviewWorkflowValueKey.TargetStory`, and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 4.7. In `edgeCaseHunterReviewWorkflow.ts`, export `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID = EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest`, export `EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID = EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutput`, and export `EDGE_CASE_HUNTER_REVIEW_ARTIFACTS: NonNullable<WorkflowDefinition["artifacts"]>` containing both artifacts with `intentMode: "derived"`, `parentIdentitySource: undefined`, `targetIdentitySource: { kind: "workflow_value", key: EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity }`, families `WorkflowArtifactFamily.ReviewScopeManifest` and `WorkflowArtifactFamily.EdgeCaseReviewOutput`, and output value mappings to the matching artifact metadata enum keys plus `artifactAbsolutePath` mapped to `review_scope_manifest` or `edge_case_review_output`; each artifact must set `targetIdentity` to its own artifact identity workflow value key and `parentIdentity: undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 4.8. In `edgeCaseHunterReviewWorkflow.ts`, export `EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID = "step-1-edge-case-hunter-review-commit-form"`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID = "step-1-panel-a-commit-hash"`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID = "step-1-panel-b-invalid-commit"`, and `EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY = "commit_hash"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 4.9. In `edgeCaseHunterReviewWorkflow.ts`, add `buildRuntimeRoutedTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"]` returning `{ type: "runtime_routed" }`, add `buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"]` returning `{ type: "conditional", conditionSourceKey: "__terminal__", branches: [], defaultTerminal: true }`, and export `buildEdgeCaseHunterReviewStep1WorkflowForm(): WorkflowFormDefinitionPayload` with `definitionVersion: 2`, `title` and `toolDictionaryTitle` exactly `Identify Implementation Evidence`, `toolDictionaryMarkdown` exactly `Provide the commit hash for the target story's commit.`, first panel Panel A, Panel A title and prompt matching those strings, one required `small_text` string field keyed by `EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY` and labeled `commit hash`, Panel A `allowedActions: ["submit"]`, Panel A submit label `submit`, Panel A runtime-routed transition, Panel B title `Invalid Commit Hash`, Panel B prompt text exactly `The provided commit hash is invalid. Please go back and provide a valid commit hash.`, Panel B no fields, Panel B `allowedActions: ["back"]`, Panel B back label `back`, Panel B terminal transition, and Panel B `backDestinationPanelId` set to Panel A.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Task 5. Add deterministic helper functions and Step 2 prompt rendering.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 5.1. In `edgeCaseHunterReviewWorkflow.ts`, add interfaces `EdgeCaseHunterReviewSelectedProjectRoot` with `selectedProjectRoot` and `selectedStoryFilename`, and `EdgeCaseHunterReviewGitCommandResult` with `exitCode`, `stdout`, and `stderr`; each property must be explicitly typed and no optional properties are allowed.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 5.2. In `edgeCaseHunterReviewWorkflow.ts`, add `PRIMARY_STORY_FILENAME_PATTERN = /^Story-(\d+)-(\d+)\.md$/`, `REMEDIATION_STORY_FILENAME_PATTERN = /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/`, `readWorkflowStringValue(workflowValues: WorkflowValues, key: EdgeCaseHunterReviewWorkflowValueKey): string | undefined`, `renderWorkflowValueByKey(input: WorkflowPromptBuilderInput, key: EdgeCaseHunterReviewWorkflowValueKey): string`, and `readFormStringValue(session: ActiveWorkflowSession, key: string): string | undefined`; the string readers must return trimmed non-empty strings only and must not use truthy/falsy checks.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 5.3. In `edgeCaseHunterReviewWorkflow.ts`, add `renderEdgeCaseHunterReviewPromptTemplate(input: WorkflowPromptBuilderInput, template: string): string`; it must replace raw `review_scope_manifest`, `target_story`, `review_commit_hash`, `review_commit_parent`, and `edge_case_review_output` with `renderWorkflowValueByKey(...)` outputs, and it must replace longer placeholder names before shorter names so rendered paths cannot be partially rewritten.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 5.4. In `edgeCaseHunterReviewWorkflow.ts`, add `resolveEdgeCaseHunterReviewStoryProjectRoot(targetStory: string): EdgeCaseHunterReviewSelectedProjectRoot | { errorMessage: string }`; it must normalize `targetStory`, derive `selectedStoryFilename` from `basename(...)`, reject filenames that do not match `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_FILENAME_PATTERN`, require the story folder basename to be `stories-review`, require its parent basename to be `implementation`, and return `selectedProjectRoot: dirname(implementationFolder)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 5.5. In `edgeCaseHunterReviewWorkflow.ts`, add `deriveStoryIdentityFromFilename(selectedStoryFilename: string): string | { errorMessage: string }`; it must return `E.S` for `Story-E-S.md`, return `E.S.R` for `Remediation-story-E-S-R.md`, and return an error object when neither approved filename pattern matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 5.6. In `edgeCaseHunterReviewWorkflow.ts`, export `deriveEdgeCaseHunterReviewTargetStoryValues(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult>`; it must read `target_story`, fail if missing, derive the project-root result and story identity using Subtasks 5.4 and 5.5, fail with the returned error message when either derivation fails, and succeed with `workflowValueWrites: { [EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity]: selectedStoryIdentity }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 5.7. In `edgeCaseHunterReviewWorkflow.ts`, export `runEdgeCaseHunterReviewGitCommand(args: { selectedProjectRoot: string; gitArgs: readonly string[] }): Promise<EdgeCaseHunterReviewGitCommandResult>` using `execa("git", [...args.gitArgs], { cwd: args.selectedProjectRoot, shell: false, reject: false })`, normalize missing numeric `exitCode` to `1`, and add `gitCommandFailed(result: EdgeCaseHunterReviewGitCommandResult): boolean` returning `result.exitCode !== 0`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 5.8. In `edgeCaseHunterReviewWorkflow.ts`, export `validateAndPersistEdgeCaseHunterReviewCommit(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult>`; it must read `target_story`, fail if missing, resolve the selected project root from `target_story`, read form-local `commit_hash`, return succeeded with no writes when the form value is missing, run `git rev-parse --is-inside-work-tree`, `git rev-parse --verify ${submittedCommitHash}^{commit}`, and `git rev-parse ${normalizedCommitHash}^` in that order, return succeeded with no writes on any non-zero exit or empty stdout, and on success write `review_commit_hash: normalizedCommitHash` and `review_commit_parent: parentHash`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 5.9. In `edgeCaseHunterReviewWorkflow.ts`, add `formatGitCommandFailure(args: { operation: string; result: EdgeCaseHunterReviewGitCommandResult }): string` and `parseGitOutputFailure(args: { operation: string; failures: readonly { lineNumber: number; message: string }[] }): string`; both messages must start with `Edge Case Hunter Review review-scope preparation failed during` and must include stderr/stdout detail or line-number parse detail when available.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 5.10. In `edgeCaseHunterReviewWorkflow.ts`, export `buildAndPersistEdgeCaseHunterReviewScopeManifest(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult>`; it must require non-empty `target_story`, `review_scope_manifest`, `review_commit_hash`, and `review_commit_parent`, resolve the selected project root from `target_story`, run `git show --name-status --format= <commitHash>` and `git show --numstat --format= <commitHash>`, parse the outputs with `parseGitShowNameStatus` and `parseGitShowNumstat`, read `target_story` with `readFile(targetStory, "utf8")`, call `buildReviewScopeManifestModel({ commitHash, parentHash, targetStoryPath: targetStory, selectedProjectRoot, storyMarkdown, nameStatusRecords, numstatRecords })`, write `buildReviewScopeManifestMarkdown(manifestModel.manifest)` to `review_scope_manifest` with `writeFile(..., "utf8")`, and return failed results with concrete operation-specific reasons for git, parse, read, model-build, and write failures.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 5.11. In `edgeCaseHunterReviewWorkflow.ts`, export `failMissingInheritedEdgeCaseHunterReviewEvidence(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult`; it must inspect `target_story`, `review_commit_hash`, `review_commit_parent`, and `review_scope_manifest`, return `kind: "failed"`, and include every missing or empty key in the error message `Edge Case Hunter Review cannot start without parent-provided review evidence. Missing or invalid workflow values: <keys>.`

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 5.12. In `edgeCaseHunterReviewWorkflow.ts`, export `failEdgeCaseHunterReviewScopeManifestArtifactAllocation(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult` and `failEdgeCaseHunterReviewOutputArtifactAllocation(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult`; each must read `target_story` or fall back to `unknown target_story`, read `session.branchContext.failureState?.terminalErrorMessage` or fall back to `Tool-backed operation failed.`, and return failed error messages naming the failed artifact operation, the target story, and the backend reason.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Task 6. Add Step 1/Step 2 routing and workflow definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 6.1. In `edgeCaseHunterReviewWorkflow.ts`, add `createEmptyPromptSource(): WorkflowStepPromptSource` returning `{}`; add `createStepDefinition(args: { stepNumber: 1 | 2; checklistLabel: string; decisionTree: WorkflowDecisionTree; buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]; buildToolSchema: WorkflowStepDefinition["buildToolSchema"] }): WorkflowStepDefinition` returning `id: \`step-${args.stepNumber}\`` and defaulting only `buildPromptSource` to `createEmptyPromptSource`; add `sourceRouteMatches(sourceRoute: { branchId: string; routeId: string }, branchId: string, routeId: string): boolean`; add `toolBackedOperationSucceeded(...)` and `toolBackedOperationFailed(...)` event-predicate builders matching `tool_backed_operation_succeeded` or `tool_backed_operation_failed` with exact source-route correlation; add `workflowFormPanelSubmitted(panelId: string, action: "submit" | "back"): WorkflowDecisionBranchTrigger` scoped to `EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID`; add `attemptCompletionSucceeded(): WorkflowDecisionBranchTrigger` returning `{ kind: "on_event", eventKind: "attempt_completion_succeeded" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 6.2. In `edgeCaseHunterReviewWorkflow.ts`, add session predicate trigger builders: `reviewEvidenceValuesArePresent()` must require non-empty `target_story`, `review_commit_hash`, `review_commit_parent`, and `review_scope_manifest`; `reviewEvidenceValuesAreMissing()` must match when any of those four values is missing; `entryProjectValuesArePresent()` must require non-empty `projectMode`, `projectTitle`, and `projectFolderName`; `entryProjectValuesArePresentAndReviewEvidenceIsMissing()` must match only when all three entry project values are present and at least one review evidence value is missing; `entryProjectValuesAreMissingAndReviewEvidenceIsIncomplete()` must match only when at least one entry project workflow value is missing and at least one review evidence value is missing; `reviewCommitHashIsValid()` and `reviewCommitHashIsInvalid()` must match on non-empty or missing `review_commit_hash` and `review_commit_parent`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 6.3. In `edgeCaseHunterReviewWorkflow.ts`, add `buildStep1ContinuationReplacementBuilder(panelId: string): WorkflowFormContinuationReplacementBuilder` that reloads the panel from `buildEdgeCaseHunterReviewStep1WorkflowForm()`, throws a descriptive error when the panel is missing, and returns `{ panel, data: {} }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 6.4. In `edgeCaseHunterReviewWorkflow.ts`, add `buildStep1DecisionTree(): WorkflowDecisionTree` with entry branch `step-1-route-by-existing-values`; the entry branch routes must be ordered exactly: `step-1-fail-missing-inherited-review-evidence` using `entryProjectValuesAreMissingAndReviewEvidenceIsIncomplete()` and action `run_deterministic_procedure` `failMissingInheritedEdgeCaseHunterReviewEvidence`; `step-1-derive-existing-target-story-values` using `reviewEvidenceValuesArePresent()` and action `run_deterministic_procedure` `deriveEdgeCaseHunterReviewTargetStoryValues` followed by `step-1-allocate-edge-case-review-output`; `step-1-resolve-target-story` using `entryProjectValuesArePresentAndReviewEvidenceIsMissing()` and action `resolve_prerequisite_files` for `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID`, followed by `step-1-derive-target-story-values`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 6.5. In `edgeCaseHunterReviewWorkflow.ts`, add Step 1 main-agent branches `step-1-derive-target-story-values`, `step-1-render-commit-hash-panel`, `step-1-await-commit-form-panel`, and `step-1-route-after-commit-validation`; the branches must run `deriveEdgeCaseHunterReviewTargetStoryValues`, render `EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID` at Panel A, run `validateAndPersistEdgeCaseHunterReviewCommit` on Panel A submit, continue to Panel B through `continue_workflow_form` when `reviewCommitHashIsInvalid()` matches, and allocate `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID` when `reviewCommitHashIsValid()` matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 6.6. In `edgeCaseHunterReviewWorkflow.ts`, add Step 1 review-scope branches `step-1-await-review-scope-manifest-allocation` and `step-1-build-review-scope-manifest`; allocation success must run `buildAndPersistEdgeCaseHunterReviewScopeManifest` and then route to `step-1-allocate-edge-case-review-output`, while allocation failure must run `failEdgeCaseHunterReviewScopeManifestArtifactAllocation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 6.7. In `edgeCaseHunterReviewWorkflow.ts`, add Step 1 edge-case output branches `step-1-allocate-edge-case-review-output` and `step-1-await-edge-case-review-output-allocation`; output allocation success must transition to Step 2 entry branch, and output allocation failure must run `failEdgeCaseHunterReviewOutputArtifactAllocation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 6.8. In `edgeCaseHunterReviewWorkflow.ts`, add `EDGE_CASE_HUNTER_REVIEW_STEP_2_PROMPT` as the exact Step 2 prompt block prescribed in `edge-case-hunter-review-requirements.md`, add `buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` returning `currentStepInstructions: renderEdgeCaseHunterReviewPromptTemplate(input, EDGE_CASE_HUNTER_REVIEW_STEP_2_PROMPT)`, and do not read the source markdown file at runtime.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 6.9. In `edgeCaseHunterReviewWorkflow.ts`, add `buildStep2DecisionTree(): WorkflowDecisionTree` with entry branch `step-2-project-prompt`, a `project_prompt` route followed by `step-2-await-attempt-completion`, and a single `attempt_completion_succeeded` route with action `{ kind: "complete_workflow" }`; do not add story index, file move, remediation, subagent, or parent mutation actions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Subtask 6.10. In `edgeCaseHunterReviewWorkflow.ts`, export `edgeCaseHunterReviewWorkflowDefinition: WorkflowDefinition` with identity constants, persona, project subfolder, `workflowValueKeys`, entry project value keys, `entryPanel.promptMarkdown` equal to the module description, `workflowForms` containing only `EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID`, `prerequisiteFiles`, `artifacts`, `childInheritance` rules for `review_commit_hash`, `review_commit_parent`, `target_story`, and `review_scope_manifest`, Step 1 checklist label `Gather Inputs & Generate Output File`, Step 2 checklist label `Conduct Exhaustive Path Analysis`, and each step delegating `buildToolSchema` to the exported module tool-schema builders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[ ] Task 7. Add module exports.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/index.ts`

[ ] Subtask 7.1. Add `index.ts` exporting `buildEdgeCaseHunterReviewStep1ToolSchemas` and `buildEdgeCaseHunterReviewStep2ToolSchemas` from `./edgeCaseHunterReviewToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/index.ts`

[ ] Subtask 7.2. In `index.ts`, export exactly these workflow symbols from `./edgeCaseHunterReviewWorkflow`: `EDGE_CASE_HUNTER_REVIEW_ARTIFACTS`, `EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY`, `EDGE_CASE_HUNTER_REVIEW_ENTRY_PROJECT_VALUE_KEYS`, `EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID`, `EDGE_CASE_HUNTER_REVIEW_PREREQUISITE_FILES`, `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID`, `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_FILENAME_PATTERN`, `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DESCRIPTION`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DISPLAY_NAME`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_NAME`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PERSONA`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PROJECT_SUBFOLDER`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_SLASH_COMMAND_NAME`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_USE_SKILL_NAME`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_VALUE_KEYS`, `EdgeCaseHunterReviewWorkflowValueKey`, `edgeCaseHunterReviewWorkflowDefinition`, `buildAndPersistEdgeCaseHunterReviewScopeManifest`, `buildEdgeCaseHunterReviewStep1WorkflowForm`, `deriveEdgeCaseHunterReviewTargetStoryValues`, `failEdgeCaseHunterReviewOutputArtifactAllocation`, `failEdgeCaseHunterReviewScopeManifestArtifactAllocation`, `failMissingInheritedEdgeCaseHunterReviewEvidence`, `runEdgeCaseHunterReviewGitCommand`, and `validateAndPersistEdgeCaseHunterReviewCommit`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/index.ts`

[ ] Task 8. Add focused edge-case-hunter-review workflow tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.1. Add `edgeCaseHunterReviewWorkflow.test.ts` with imports matching the current `blindReviewWorkflow.test.ts` fixture style plus imports for the edge-case module exports, `WorkflowArtifactFamily`, `WorkflowRuntime`, `TaskState`, `WorkflowValues`, `WorkflowValue`, `WorkflowWorkspacePathPolicy`, and `WorkflowFormSessionState`; define typed fixtures for `PROJECT_ROOT`, `TARGET_STORY_PATH`, `REVIEW_FOLDER_PATH`, `REVIEW_SCOPE_MANIFEST_PATH`, `EDGE_CASE_REVIEW_OUTPUT_PATH`, and `SAMPLE_WORKFLOW_VALUES` containing all evidence keys and artifact metadata keys for both artifacts.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.2. In `edgeCaseHunterReviewWorkflow.test.ts`, add typed helpers equivalent to the blind-review test helpers for creating sessions, commit form sessions, finding routes, reading panels/fields, rendering workflow values, building prompt input, building prompt strings, listing tool names, constructing `workflow_form_panel_submitted`, `tool_backed_operation_succeeded`, `tool_backed_operation_failed`, and `attempt_completion_succeeded` events; every event object must include all required fields such as `submittedValueKeys` and `clearedValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.3. In `edgeCaseHunterReviewWorkflow.test.ts`, add tests asserting workflow identity, persona, description-backed entry panel, workflow value inventory, entry project keys, and child inheritance exactly include `review_commit_hash`, `review_commit_parent`, `target_story`, and `review_scope_manifest`; do not include registry assertions in this phase.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.4. In `edgeCaseHunterReviewWorkflow.test.ts`, add tests asserting the `target_story` prerequisite declaration, both artifact definitions and output value key mappings, the Step 1 form panel shapes, the two checklist labels, Step 1 empty tool schema, Step 2 exact tool names, and absence of every forbidden Step 2 tool named in Subtask 2.4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.5. In `edgeCaseHunterReviewWorkflow.test.ts`, add Step 1 route tests asserting the entry branch contains exactly `step-1-fail-missing-inherited-review-evidence`, `step-1-derive-existing-target-story-values`, and `step-1-resolve-target-story` in that order; assert inherited complete evidence bypasses prerequisite/form and reaches edge-case output allocation; assert inherited missing evidence routes to `failMissingInheritedEdgeCaseHunterReviewEvidence`; assert main-agent entry project values with missing review evidence route to prerequisite resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.6. In `edgeCaseHunterReviewWorkflow.test.ts`, add Step 1 main-agent route tests asserting target derivation, Panel A render, commit validation, invalid Panel B continuation, review-scope manifest allocation, review-scope manifest deterministic build, review-scope allocation failure route, edge-case output allocation, edge-case output allocation failure route, and final transition to Step 2.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.7. In `edgeCaseHunterReviewWorkflow.test.ts`, add deterministic target-story tests for primary story and remediation story identity derivation, and failure tests for missing `target_story`, wrong filename, and wrong folder.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.8. In `edgeCaseHunterReviewWorkflow.test.ts`, add temporary Git repository tests for `validateAndPersistEdgeCaseHunterReviewCommit` covering successful normalized commit and parent persistence, missing form value writing no commit values, invalid commit writing no commit values, root commit parent failure writing no commit values, and non-Git selected project root writing no commit values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.9. In `edgeCaseHunterReviewWorkflow.test.ts`, add a temporary Git repository review-scope manifest test whose target story markdown includes all required dev-story sections and this `## Tasks` section: `- [x] Task 1 Implement runtime helpers.`, allowed files ``src/allowed.ts`` and ``src/deleted.ts``, `- [x] Subtask 1.1 Implement parser.`, allowed file ``src/renamed.ts``, and `- [x] Task 2 Add tests.`, allowed file ``src/untouched.ts``; the test must commit at least `src/allowed.ts` and `src/new-outside.ts`, allocate a `review_scope_manifest` path in the review folder, call `buildAndPersistEdgeCaseHunterReviewScopeManifest`, read the written file, and assert the exact heading order, `Commit:`, `Parent:`, `Story:`, `Generated from: git show --name-status --numstat`, changed-file table header, allowed-file comparison entries for allowed/touched, touched/outside, and allowed/not-touched, task/subtask summary entries, and targeted `git show <hash> -- <path>` commands are present.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.10. In `edgeCaseHunterReviewWorkflow.test.ts`, add failure tests for `buildAndPersistEdgeCaseHunterReviewScopeManifest` covering missing required workflow values, bad target story path, unreadable target story, and a `review_scope_manifest` path whose parent directory does not exist; each assertion must check `kind === "failed"` and a non-empty operation-specific error message containing the failed operation context.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.11. In `edgeCaseHunterReviewWorkflow.test.ts`, add tests for `failMissingInheritedEdgeCaseHunterReviewEvidence`, `failEdgeCaseHunterReviewScopeManifestArtifactAllocation`, and `failEdgeCaseHunterReviewOutputArtifactAllocation`; assert the inherited-evidence failure includes each omitted key from the test session, and assert both artifact-allocation failures include `TARGET_STORY_PATH` plus the fixture backend failure reason `backend failure`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.12. In `edgeCaseHunterReviewWorkflow.test.ts`, add Step 2 prompt tests asserting the prompt is non-empty, includes materialized `review_scope_manifest`, `target_story`, `review_commit_hash`, `review_commit_parent`, and `edge_case_review_output` values, and does not include the raw placeholder tokens `review_scope_manifest`, `target_story`, `review_commit_hash`, `review_commit_parent`, or `edge_case_review_output` when valid workflow values are present.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.13. In `edgeCaseHunterReviewWorkflow.test.ts`, add Step 2 completion tests asserting `attempt_completion_succeeded` routes directly to `{ kind: "complete_workflow" }` and no Step 2 route action kind is `update_story_index_status`, `move_project_file`, `run_deterministic_procedure`, `allocate_artifact`, `execute_tool_backed_operation`, `transition_step`, or `project_prompt` after completion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.14. In `edgeCaseHunterReviewWorkflow.test.ts`, add a runtime activation test using `WorkflowRuntime.activateWorkflow({ workflowName: "edge-case-hunter-review", parentSession })`; the parent session must include complete inherited evidence and project selection, the result must not be `render_workflow_form`, the child session must copy parent project selection by value, inherited workflow values must be present, and `review_scope_manifest` must not be regenerated before edge-case output allocation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 8.15. In `edgeCaseHunterReviewWorkflow.test.ts`, add a test asserting Step 1 decision tree has no trigger for `entry_artifact_resolution_completed`, no route id containing `creationRequired`, and no action that branches on singleton entry artifact resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Task 9. Run Phase 2 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 9.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 9.2. Run `npm run check-types`; if it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 9.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

### Phase 3 - Registration, Prompt Integration, Code-Review Handoff, And Legacy Cleanup

After completing this phase, pause for QA review before moving to Phase 4.

[ ] Task 10. Register edge-case-hunter-review in the workflow registry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Subtask 10.1. In `WorkflowRegistry.ts`, import `edgeCaseHunterReviewWorkflowDefinition` from `@/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review` and add it to `shippedWorkflowDefinitions` after `blindReviewWorkflowDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[ ] Subtask 10.2. In `edgeCaseHunterReviewWorkflow.test.ts`, add registry tests asserting `resolveWorkflowDefinition("edge-case-hunter-review")`, `resolveWorkflowBySlashCommand("edge-case-hunter-review")`, and `resolveWorkflowByUseSkillName("edge-case-hunter-review")` return `edgeCaseHunterReviewWorkflowDefinition`, while `review-edge-case-hunter`, `review-edge-case-hunter.md`, and `edge-case-hunter-review.md` return `undefined` for all three registry lookups.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[ ] Task 11. Update code-review Step 2 to invoke the canonical edge-case-hunter-review child workflow name.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[ ] Subtask 11.1. In `codeReviewWorkflow.ts`, replace the Step 2 subagent assignment phrase `Skill: use_skill('review-edge-case-hunter')` with exactly `Skill: use_skill('edge-case-hunter-review')`; do not change any other Step 2 prompt wording.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 11.2. In `codeReviewWorkflow.test.ts`, update the Step 2 prompt test so it asserts the non-empty Step 2 prompt includes `Skill: use_skill('blind-review')` and `Skill: use_skill('edge-case-hunter-review')`, and asserts it does not include `Skill: use_skill('review-edge-case-hunter')`; keep the assertion limited to these stable workflow activation phrases and non-empty prompt shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[ ] Task 12. Add edge-case-hunter-review prompt integration coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 12.1. In `integration.test.ts`, add imports for `EdgeCaseHunterReviewWorkflowValueKey`, `edgeCaseHunterReviewWorkflowDefinition`, and `buildEdgeCaseHunterReviewStep2ToolSchemas` from the edge-case-hunter-review module.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 12.2. In `integration.test.ts`, add edge-case prompt fixture constants near the blind-review prompt fixtures: target story path, selected story identity, review commit hash, review commit parent, review folder, review scope manifest path, edge-case review output path, artifact family/identity/filename/relative-path values for both `review_scope_manifest` and `edge_case_review_output`, and `EDGE_CASE_HUNTER_REVIEW_FORBIDDEN_PROMPT_TOOL_NAMES` matching the forbidden list from Subtask 2.4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 12.3. In `integration.test.ts`, add `type EdgeCaseHunterReviewPromptStepNumber = 2`, `getEdgeCaseHunterReviewEntryBranchId(activeStepNumber: EdgeCaseHunterReviewPromptStepNumber): string` with an exhaustive `never` assignment, `createEdgeCaseHunterReviewWorkflowValues(overrides: WorkflowValues = {}): WorkflowValues`, `createEdgeCaseHunterReviewWorkflowSession(activeStepNumber: EdgeCaseHunterReviewPromptStepNumber, workflowValues: WorkflowValues = createEdgeCaseHunterReviewWorkflowValues()): ActiveWorkflowSession`, and `buildEdgeCaseHunterReviewPromptContext(activeStepNumber: EdgeCaseHunterReviewPromptStepNumber = 2, workflowValues: WorkflowValues = createEdgeCaseHunterReviewWorkflowValues()): Promise<SystemPromptContext & WorkflowPromptProjection>` using a real `WorkflowRuntime` and complete `TaskState`; do not use forced casts, `as never`, `as any`, or incomplete `WorkflowPromptProjection` objects.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 12.4. In `integration.test.ts`, add `expectEdgeCaseHunterReviewProjectedToolSurface(testCtx: TestRunner, expectedToolSpecs: readonly ClineToolSpec[]): Promise<void>` mirroring `expectBlindReviewProjectedToolSurface`; it must assert `context.workflowToolSchemaOverride` deep-equals `buildEdgeCaseHunterReviewStep2ToolSchemas()` and native GPT-5 tool names exactly match the expected tool names.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 12.5. In `integration.test.ts`, add a prompt integration test asserting active edge-case-hunter-review Step 2 tools from `buildEdgeCaseHunterReviewStep2ToolSchemas()` project into native GPT-5 prompts.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 12.6. In `integration.test.ts`, add a prompt integration test asserting full-turn and continuation payload blocks are non-empty, include materialized values for review scope manifest, target story, commit hash, parent hash, and edge-case output, and do not include raw placeholders `review_scope_manifest`, `target_story`, `review_commit_hash`, `review_commit_parent`, or `edge_case_review_output`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 12.7. In `integration.test.ts`, add a prompt integration test asserting forbidden edge-case-hunter-review tools are absent from `workflowToolSchemaOverride` and native GPT-5 tools.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 12.8. In `integration.test.ts`, add a non-native prompt text test that builds a context from `buildEdgeCaseHunterReviewPromptContext(2)`, overrides provider to `gpt-3` with native tools disabled, asserts `tools` is `undefined`, asserts approved tool names from `buildEdgeCaseHunterReviewStep2ToolSchemas()` appear in the system prompt, and asserts every forbidden tool name is absent.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Task 13. Delete the legacy edge-case-hunter workflow package.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-review-edge-case-hunter/SKILL.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-review-edge-case-hunter/bmad-skill-manifest.yaml`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-review-edge-case-hunter/workflow.md`

[ ] Subtask 13.1. Delete `.cline/skills/bmad-review-edge-case-hunter/SKILL.md`, `.cline/skills/bmad-review-edge-case-hunter/bmad-skill-manifest.yaml`, and `.cline/skills/bmad-review-edge-case-hunter/workflow.md`; do not migrate text or behavior from those files into the runtime module.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-review-edge-case-hunter/SKILL.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-review-edge-case-hunter/bmad-skill-manifest.yaml`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-review-edge-case-hunter/workflow.md`

[ ] Task 14. Run Phase 3 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 14.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 14.2. Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 14.3. Run `test ! -f .cline/skills/bmad-review-edge-case-hunter/SKILL.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 14.4. Run `test ! -f .cline/skills/bmad-review-edge-case-hunter/bmad-skill-manifest.yaml`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 14.5. Run `test ! -f .cline/skills/bmad-review-edge-case-hunter/workflow.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 14.6. Run `rg -n "review-edge-case-hunter|review-edge-case-hunter\\.md|Review-edge-case-hunter|review_edge_case_hunter|ReviewEdgeCaseHunter" src/core/task/workflow-runtime src/core/prompts/system-prompt/__tests__/integration.test.ts`; treat exit code 1 with no output as success, inspect any output in context, and stop if any hit is active runtime code instead of an explicit negative test assertion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 14.7. Run `npm run check-types`; if it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 14.8. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

### Phase 4 - Final Validation

[ ] Task 15. Run final validation for the completed edge-case-hunter-review module build.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 15.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 15.2. Run `test ! -f .cline/skills/bmad-review-edge-case-hunter/SKILL.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 15.3. Run `test ! -f .cline/skills/bmad-review-edge-case-hunter/bmad-skill-manifest.yaml`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 15.4. Run `test ! -f .cline/skills/bmad-review-edge-case-hunter/workflow.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 15.5. Run `rg -n "review-edge-case-hunter|review-edge-case-hunter\\.md|Review-edge-case-hunter|review_edge_case_hunter|ReviewEdgeCaseHunter" src/core/task/workflow-runtime src/core/prompts/system-prompt/__tests__/integration.test.ts`; treat exit code 1 with no output as success, inspect any output in context, and stop if any hit is active runtime code instead of an explicit negative test assertion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 15.6. Run `npm run check-types`; if it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 15.7. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[ ] Subtask 15.8. Run `git diff --name-only` and confirm the persistent diff is limited to files authorized by this action plan plus this action plan's checkbox updates, after accounting for the pre-existing dirty documentation files listed under Known Issues / Risks / Technical Debt; stop and report any other unrelated file as scope drift.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

## Validation

The required validation sequence is phase-scoped:

- Phase 1 validates the new tool-schema file and then the repo static gates.
- Phase 2 validates the workflow module and tool-schema tests, then the repo static gates.
- Phase 3 validates the workflow module tests, code-review handoff test, prompt integration test, legacy package deletion, retired active-runtime string guard, and repo static gates.
- Phase 4 repeats the full focused test set, legacy deletion guard, retired active-runtime string guard, `npm run check-types`, `npm run lint`, and scoped diff review.

If any validation command fails because of generated proto files or host probing before TypeScript checking begins, run `npm run protos` and rerun the exact blocked command before classifying the failure as a code defect. If any validation command fails in files modified by the current phase, stop on that validation subtask and report the exact failure output before continuing.
