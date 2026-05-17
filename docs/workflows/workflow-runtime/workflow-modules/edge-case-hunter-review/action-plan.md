## FrontMatter
- Read this plan from top to bottom before making any changes.
- Read each step in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
  - Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete. 
- After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".
- Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
- Do not edit any file not listed in the current task or subtask's allowed-files list.
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

[x] Task 1. Add the module-owned edge-case-hunter-review tool-schema builders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewToolSchemas.ts`

[x] Subtask 1.1. Add `edgeCaseHunterReviewToolSchemas.ts` with imports for `ClineToolSpec`, `AGENT_FEEDBACK_PARAMETER`, `ModelFamily`, and `ClineDefaultTool`; define `const EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5`; export `buildEdgeCaseHunterReviewStep1ToolSchemas(): readonly ClineToolSpec[]` returning `[]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewToolSchemas.ts`

[x] Subtask 1.2. In `edgeCaseHunterReviewToolSchemas.ts`, add exported source-inspection tool builders with these exact schema identities and parameter shapes: `buildEdgeCaseHunterReviewExecuteCommandToolSchema()` returns name `execute_command`, id `ClineDefaultTool.BASH`, required string parameter `command`, and required boolean parameter `requires_approval`; `buildEdgeCaseHunterReviewListFilesToolSchema()` returns name `list_files`, id `ClineDefaultTool.LIST_FILES`, required string parameter `path`, and optional boolean parameter `recursive`; `buildEdgeCaseHunterReviewSearchFilesToolSchema()` returns name `search_files`, id `ClineDefaultTool.SEARCH`, required string parameters `path` and `regex`, and optional string parameter `file_pattern`; `buildEdgeCaseHunterReviewListCodeDefinitionNamesToolSchema()` returns name `list_code_definition_names`, id `ClineDefaultTool.LIST_CODE_DEF`, and required string parameter `path`; `buildEdgeCaseHunterReviewReadFileToolSchema()` returns name `read_file`, id `ClineDefaultTool.FILE_READ`, and required string parameter `path`; `buildEdgeCaseHunterReviewReadFileRangeToolSchema()` returns name `read_file_range`, id `ClineDefaultTool.FILE_READ_RANGE`, required string parameter `path`, required integer parameter `start_line`, and required integer parameter `end_line`; every schema must include `variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT`, and every parameter object must include non-empty `instruction` and `description` strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewToolSchemas.ts`

[x] Subtask 1.3. In `edgeCaseHunterReviewToolSchemas.ts`, add exported edit and response tool builders with these exact schema identities and parameter shapes: `buildEdgeCaseHunterReviewApplyPatchToolSchema()` returns name `apply_patch`, id `ClineDefaultTool.APPLY_PATCH`, and required string parameter `input`; `buildEdgeCaseHunterReviewWriteToFileToolSchema()` returns name `write_to_file`, id `ClineDefaultTool.FILE_NEW`, and required string parameters `absolutePath` and `content`; `buildEdgeCaseHunterReviewSendUserMessageToolSchema()` returns name `send_user_message`, id `ClineDefaultTool.SEND_USER_MESSAGE`, required string parameter `message`, and `AGENT_FEEDBACK_PARAMETER`; `buildEdgeCaseHunterReviewAttemptCompletionToolSchema()` returns name `attempt_completion`, id `ClineDefaultTool.ATTEMPT`, and required string parameter `result`; every schema must include `variant: EDGE_CASE_HUNTER_REVIEW_TOOL_SCHEMA_VARIANT`, and every non-shared parameter object must include non-empty `instruction` and `description` strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewToolSchemas.ts`

[x] Subtask 1.4. In `edgeCaseHunterReviewToolSchemas.ts`, export `buildEdgeCaseHunterReviewStep2ToolSchemas(): readonly ClineToolSpec[]` returning these builders in this exact order: `execute_command`, `list_files`, `search_files`, `list_code_definition_names`, `read_file`, `read_file_range`, `apply_patch`, `write_to_file`, `send_user_message`, `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewToolSchemas.ts`

[x] Task 2. Add focused edge-case-hunter-review tool-schema tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts`

[x] Subtask 2.1. Add `edgeCaseHunterReviewToolSchemas.test.ts` importing `expect`, `describe`, `it`, `ModelFamily`, `ClineToolSpec`, and `buildEdgeCaseHunterReviewStep1ToolSchemas`/`buildEdgeCaseHunterReviewStep2ToolSchemas`; define typed helpers `schemaNames(schemas: readonly ClineToolSpec[]): readonly string[]` and `findSchemaByName(schemas: readonly ClineToolSpec[], name: string): ClineToolSpec` without casts.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts`

[x] Subtask 2.2. In `edgeCaseHunterReviewToolSchemas.test.ts`, add a test asserting Step 1 returns `[]` and Step 2 returns exactly `["execute_command", "list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "write_to_file", "send_user_message", "attempt_completion"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts`

[x] Subtask 2.3. In `edgeCaseHunterReviewToolSchemas.test.ts`, add a test asserting every Step 2 schema has `variant === ModelFamily.NATIVE_GPT_5` and that each schema's parameter names, `required` flags, and `type` values exactly match Subtasks 1.2 and 1.3.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts`

[x] Subtask 2.4. In `edgeCaseHunterReviewToolSchemas.test.ts`, add a forbidden-tool test asserting Step 1 and Step 2 do not include `web_search`, `web_fetch`, `browser_action`, `ask_followup_question`, `use_subagents`, `use_skill`, `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `workflow_progress_request`, `use_mcp_tool`, `access_mcp_resource`, `load_mcp_documentation`, `build_review_input`, `build_review_diff_output`, `code_review_spec_update`, or `record_findings`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts`

[x] Task 3. Run Phase 1 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 3.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 3.2. Run `npm run check-types`; if it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 3.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

### Phase 2 - Edge Case Hunter Workflow Module

After completing this phase, pause for QA review before moving to Phase 3.

[x] Task 4. Add the edge-case-hunter-review workflow constants, value contract, prerequisite declaration, artifact declarations, and Step 1 form.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 4.1. Add `edgeCaseHunterReviewWorkflow.ts` with imports for `readFile` and `writeFile` from `node:fs/promises`; `basename`, `dirname`, and `normalize` from `node:path`; `WorkflowFormDefinitionPayload`; `execa`; `WorkflowArtifactFamily`; type imports for `ActiveWorkflowSession`, `WorkflowDecisionBranchTrigger`, `WorkflowDecisionTree`, `WorkflowDefinition`, `WorkflowDeterministicProcedureResult`, `WorkflowFormContinuationReplacementBuilder`, `WorkflowPersonaDefinition`, `WorkflowPromptBuilderInput`, `WorkflowStepDefinition`, `WorkflowStepPromptSource`, and `WorkflowValues`; `buildEdgeCaseHunterReviewStep1ToolSchemas`/`buildEdgeCaseHunterReviewStep2ToolSchemas`; and `buildReviewScopeManifestMarkdown`, `buildReviewScopeManifestModel`, `parseGitShowNameStatus`, and `parseGitShowNumstat` from `../code-review/reviewScopeManifest`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 4.2. In `edgeCaseHunterReviewWorkflow.ts`, export identity constants exactly: `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_NAME = "edge-case-hunter-review"`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_SLASH_COMMAND_NAME = "edge-case-hunter-review"`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_USE_SKILL_NAME = "edge-case-hunter-review"`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DISPLAY_NAME = "edge case hunter review"`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DESCRIPTION = "In this workflow, the agent acts as a path tracer, walking every branching path to identify every edge case associated with recent code updates to ensure that no detail was overlooked during implementation."`, and `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PROJECT_SUBFOLDER = "review"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 4.3. In `edgeCaseHunterReviewWorkflow.ts`, export `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PERSONA: WorkflowPersonaDefinition` with exactly `name: "Fred"`, `role: "Quality Control"`, `identity: "Coordinates quality review after implementation to ensure that code is functional and compliant before it ships to production."`, `capabilities: ["rigorous edge case analysis of preproduction code"]`, `communicationStyle: "precise and detailed"`, and `principles: ["small details at overlooked boundaries can make or break a product. Finding the small things up-front saves countless hours of triage and bug-fixing later."]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 4.4. In `edgeCaseHunterReviewWorkflow.ts`, export enum `EdgeCaseHunterReviewWorkflowValueKey` with exactly these values: `ProjectMode = "projectMode"`, `ProjectTitle = "projectTitle"`, `ProjectFolderName = "projectFolderName"`, `TargetStory = "target_story"`, `SelectedStoryIdentity = "selected_story_identity"`, `ReviewCommitHash = "review_commit_hash"`, `ReviewCommitParent = "review_commit_parent"`, `ReviewScopeManifest = "review_scope_manifest"`, `ReviewScopeManifestArtifactFamily = "review_scope_manifest_artifact_family"`, `ReviewScopeManifestArtifactIdentity = "review_scope_manifest_artifact_identity"`, `ReviewScopeManifestArtifactFilename = "review_scope_manifest_artifact_filename"`, `ReviewScopeManifestArtifactRelativePath = "review_scope_manifest_artifact_relative_path"`, `EdgeCaseReviewOutput = "edge_case_review_output"`, `EdgeCaseReviewOutputArtifactFamily = "edge_case_review_output_artifact_family"`, `EdgeCaseReviewOutputArtifactIdentity = "edge_case_review_output_artifact_identity"`, `EdgeCaseReviewOutputArtifactFilename = "edge_case_review_output_artifact_filename"`, and `EdgeCaseReviewOutputArtifactRelativePath = "edge_case_review_output_artifact_relative_path"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 4.5. In `edgeCaseHunterReviewWorkflow.ts`, export `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_VALUE_KEYS` as `Object.values(EdgeCaseHunterReviewWorkflowValueKey)` and export `EDGE_CASE_HUNTER_REVIEW_ENTRY_PROJECT_VALUE_KEYS` mapping `projectMode`, `projectTitle`, and `projectFolderName` to the matching enum values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 4.6. In `edgeCaseHunterReviewWorkflow.ts`, export `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID = EdgeCaseHunterReviewWorkflowValueKey.TargetStory`, export `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_FILENAME_PATTERN = /^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/`, and export `EDGE_CASE_HUNTER_REVIEW_PREREQUISITE_FILES` with one required `target_story` prerequisite for producing workflow `dev-story`, `projectSubfolderSegments: ["implementation", "stories-review"]`, `match.kind: "naming_pattern"`, `workflowValueKey: EdgeCaseHunterReviewWorkflowValueKey.TargetStory`, and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 4.7. In `edgeCaseHunterReviewWorkflow.ts`, export `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID = EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest`, export `EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID = EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutput`, and export `EDGE_CASE_HUNTER_REVIEW_ARTIFACTS: NonNullable<WorkflowDefinition["artifacts"]>` containing both artifacts with `intentMode: "derived"`, `parentIdentitySource: undefined`, `targetIdentitySource: { kind: "workflow_value", key: EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity }`, families `WorkflowArtifactFamily.ReviewScopeManifest` and `WorkflowArtifactFamily.EdgeCaseReviewOutput`, and output value mappings to the matching artifact metadata enum keys plus `artifactAbsolutePath` mapped to `review_scope_manifest` or `edge_case_review_output`; each artifact must set `targetIdentity` to its own artifact identity workflow value key and `parentIdentity: undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 4.8. In `edgeCaseHunterReviewWorkflow.ts`, export `EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID = "step-1-edge-case-hunter-review-commit-form"`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID = "step-1-panel-a-commit-hash"`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID = "step-1-panel-b-invalid-commit"`, and `EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY = "commit_hash"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 4.9. In `edgeCaseHunterReviewWorkflow.ts`, add `buildRuntimeRoutedTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"]` returning `{ type: "runtime_routed" }`, add `buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"]` returning `{ type: "conditional", conditionSourceKey: "__terminal__", branches: [], defaultTerminal: true }`, and export `buildEdgeCaseHunterReviewStep1WorkflowForm(): WorkflowFormDefinitionPayload` with `definitionVersion: 2`, `title` and `toolDictionaryTitle` exactly `Identify Implementation Evidence`, `toolDictionaryMarkdown` exactly `Provide the commit hash for the target story's commit.`, first panel Panel A, Panel A title and prompt matching those strings, one required `small_text` string field keyed by `EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY` and labeled `commit hash`, Panel A `allowedActions: ["submit"]`, Panel A submit label `submit`, Panel A runtime-routed transition, Panel B title `Invalid Commit Hash`, Panel B prompt text exactly `The provided commit hash is invalid. Please go back and provide a valid commit hash.`, Panel B no fields, Panel B `allowedActions: ["back"]`, Panel B back label `back`, Panel B terminal transition, and Panel B `backDestinationPanelId` set to Panel A.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Task 5. Add deterministic helper functions and Step 2 prompt rendering.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 5.1. In `edgeCaseHunterReviewWorkflow.ts`, add interfaces `EdgeCaseHunterReviewSelectedProjectRoot` with `selectedProjectRoot` and `selectedStoryFilename`, and `EdgeCaseHunterReviewGitCommandResult` with `exitCode`, `stdout`, and `stderr`; each property must be explicitly typed and no optional properties are allowed.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 5.2. In `edgeCaseHunterReviewWorkflow.ts`, add `PRIMARY_STORY_FILENAME_PATTERN = /^Story-(\d+)-(\d+)\.md$/`, `REMEDIATION_STORY_FILENAME_PATTERN = /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/`, `readWorkflowStringValue(workflowValues: WorkflowValues, key: EdgeCaseHunterReviewWorkflowValueKey): string | undefined`, `renderWorkflowValueByKey(input: WorkflowPromptBuilderInput, key: EdgeCaseHunterReviewWorkflowValueKey): string`, and `readFormStringValue(session: ActiveWorkflowSession, key: string): string | undefined`; the string readers must return trimmed non-empty strings only and must not use truthy/falsy checks.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 5.3. In `edgeCaseHunterReviewWorkflow.ts`, add `renderEdgeCaseHunterReviewPromptTemplate(input: WorkflowPromptBuilderInput, template: string): string`; it must replace raw `review_scope_manifest`, `target_story`, `review_commit_hash`, `review_commit_parent`, and `edge_case_review_output` with `renderWorkflowValueByKey(...)` outputs, and it must replace longer placeholder names before shorter names so rendered paths cannot be partially rewritten.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 5.4. In `edgeCaseHunterReviewWorkflow.ts`, add `resolveEdgeCaseHunterReviewStoryProjectRoot(targetStory: string): EdgeCaseHunterReviewSelectedProjectRoot | { errorMessage: string }`; it must normalize `targetStory`, derive `selectedStoryFilename` from `basename(...)`, reject filenames that do not match `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_FILENAME_PATTERN`, require the story folder basename to be `stories-review`, require its parent basename to be `implementation`, and return `selectedProjectRoot: dirname(implementationFolder)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 5.5. In `edgeCaseHunterReviewWorkflow.ts`, add `deriveStoryIdentityFromFilename(selectedStoryFilename: string): string | { errorMessage: string }`; it must return `E.S` for `Story-E-S.md`, return `E.S.R` for `Remediation-story-E-S-R.md`, and return an error object when neither approved filename pattern matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 5.6. In `edgeCaseHunterReviewWorkflow.ts`, export `deriveEdgeCaseHunterReviewTargetStoryValues(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult>`; it must read `target_story`, fail if missing, derive the project-root result and story identity using Subtasks 5.4 and 5.5, fail with the returned error message when either derivation fails, and succeed with `workflowValueWrites: { [EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity]: selectedStoryIdentity }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 5.7. In `edgeCaseHunterReviewWorkflow.ts`, export `runEdgeCaseHunterReviewGitCommand(args: { selectedProjectRoot: string; gitArgs: readonly string[] }): Promise<EdgeCaseHunterReviewGitCommandResult>` using `execa("git", [...args.gitArgs], { cwd: args.selectedProjectRoot, shell: false, reject: false })`, normalize missing numeric `exitCode` to `1`, and add `gitCommandFailed(result: EdgeCaseHunterReviewGitCommandResult): boolean` returning `result.exitCode !== 0`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 5.8. In `edgeCaseHunterReviewWorkflow.ts`, export `validateAndPersistEdgeCaseHunterReviewCommit(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult>`; it must read `target_story`, fail if missing, resolve the selected project root from `target_story`, read form-local `commit_hash`, return succeeded with no writes when the form value is missing, run `git rev-parse --is-inside-work-tree`, `git rev-parse --verify ${submittedCommitHash}^{commit}`, and `git rev-parse ${normalizedCommitHash}^` in that order, return succeeded with no writes on any non-zero exit or empty stdout, and on success write `review_commit_hash: normalizedCommitHash` and `review_commit_parent: parentHash`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 5.9. In `edgeCaseHunterReviewWorkflow.ts`, add `formatGitCommandFailure(args: { operation: string; result: EdgeCaseHunterReviewGitCommandResult }): string` and `parseGitOutputFailure(args: { operation: string; failures: readonly { lineNumber: number; message: string }[] }): string`; both messages must start with `Edge Case Hunter Review review-scope preparation failed during` and must include stderr/stdout detail or line-number parse detail when available.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 5.10. In `edgeCaseHunterReviewWorkflow.ts`, export `buildAndPersistEdgeCaseHunterReviewScopeManifest(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult>`; it must require non-empty `target_story`, `review_scope_manifest`, `review_commit_hash`, and `review_commit_parent`, resolve the selected project root from `target_story`, run `git show --name-status --format= <commitHash>` and `git show --numstat --format= <commitHash>`, parse the outputs with `parseGitShowNameStatus` and `parseGitShowNumstat`, read `target_story` with `readFile(targetStory, "utf8")`, call `buildReviewScopeManifestModel({ commitHash, parentHash, targetStoryPath: targetStory, selectedProjectRoot, storyMarkdown, nameStatusRecords, numstatRecords })`, write `buildReviewScopeManifestMarkdown(manifestModel.manifest)` to `review_scope_manifest` with `writeFile(..., "utf8")`, and return failed results with concrete operation-specific reasons for git, parse, read, model-build, and write failures.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 5.11. In `edgeCaseHunterReviewWorkflow.ts`, export `failMissingInheritedEdgeCaseHunterReviewEvidence(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult`; it must inspect `target_story`, `review_commit_hash`, `review_commit_parent`, and `review_scope_manifest`, return `kind: "failed"`, and include every missing or empty key in the error message `Edge Case Hunter Review cannot start without parent-provided review evidence. Missing or invalid workflow values: <keys>.`

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 5.12. In `edgeCaseHunterReviewWorkflow.ts`, export `failEdgeCaseHunterReviewScopeManifestArtifactAllocation(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult` and `failEdgeCaseHunterReviewOutputArtifactAllocation(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult`; each must read `target_story` or fall back to `unknown target_story`, read `session.branchContext.failureState?.terminalErrorMessage` or fall back to `Tool-backed operation failed.`, and return failed error messages naming the failed artifact operation, the target story, and the backend reason.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Task 6. Add Step 1/Step 2 routing and workflow definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 6.1. In `edgeCaseHunterReviewWorkflow.ts`, add `createEmptyPromptSource(): WorkflowStepPromptSource` returning `{}`; add `createStepDefinition(args: { stepNumber: 1 | 2; checklistLabel: string; decisionTree: WorkflowDecisionTree; buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]; buildToolSchema: WorkflowStepDefinition["buildToolSchema"] }): WorkflowStepDefinition` returning `id: \`step-${args.stepNumber}\`` and defaulting only `buildPromptSource` to `createEmptyPromptSource`; add `sourceRouteMatches(sourceRoute: { branchId: string; routeId: string }, branchId: string, routeId: string): boolean`; add `toolBackedOperationSucceeded(...)` and `toolBackedOperationFailed(...)` event-predicate builders matching `tool_backed_operation_succeeded` or `tool_backed_operation_failed` with exact source-route correlation; add `workflowFormPanelSubmitted(panelId: string, action: "submit" | "back"): WorkflowDecisionBranchTrigger` scoped to `EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID`; add `attemptCompletionSucceeded(): WorkflowDecisionBranchTrigger` returning `{ kind: "on_event", eventKind: "attempt_completion_succeeded" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 6.2. In `edgeCaseHunterReviewWorkflow.ts`, add session predicate trigger builders: `reviewEvidenceValuesArePresent()` must require non-empty `target_story`, `review_commit_hash`, `review_commit_parent`, and `review_scope_manifest`; `reviewEvidenceValuesAreMissing()` must match when any of those four values is missing; `entryProjectValuesArePresent()` must require non-empty `projectMode`, `projectTitle`, and `projectFolderName`; `entryProjectValuesArePresentAndReviewEvidenceIsMissing()` must match only when all three entry project values are present and at least one review evidence value is missing; `entryProjectValuesAreMissingAndReviewEvidenceIsIncomplete()` must match only when at least one entry project workflow value is missing and at least one review evidence value is missing; `reviewCommitHashIsValid()` and `reviewCommitHashIsInvalid()` must match on non-empty or missing `review_commit_hash` and `review_commit_parent`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 6.3. In `edgeCaseHunterReviewWorkflow.ts`, add `buildStep1ContinuationReplacementBuilder(panelId: string): WorkflowFormContinuationReplacementBuilder` that reloads the panel from `buildEdgeCaseHunterReviewStep1WorkflowForm()`, throws a descriptive error when the panel is missing, and returns `{ panel, data: {} }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 6.4. In `edgeCaseHunterReviewWorkflow.ts`, add `buildStep1DecisionTree(): WorkflowDecisionTree` with entry branch `step-1-route-by-existing-values`; the entry branch routes must be ordered exactly: `step-1-fail-missing-inherited-review-evidence` using `entryProjectValuesAreMissingAndReviewEvidenceIsIncomplete()` and action `run_deterministic_procedure` `failMissingInheritedEdgeCaseHunterReviewEvidence`; `step-1-derive-existing-target-story-values` using `reviewEvidenceValuesArePresent()` and action `run_deterministic_procedure` `deriveEdgeCaseHunterReviewTargetStoryValues` followed by `step-1-allocate-edge-case-review-output`; `step-1-resolve-target-story` using `entryProjectValuesArePresentAndReviewEvidenceIsMissing()` and action `resolve_prerequisite_files` for `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID`, followed by `step-1-derive-target-story-values`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 6.5. In `edgeCaseHunterReviewWorkflow.ts`, add Step 1 main-agent branches `step-1-derive-target-story-values`, `step-1-render-commit-hash-panel`, `step-1-await-commit-form-panel`, and `step-1-route-after-commit-validation`; the branches must run `deriveEdgeCaseHunterReviewTargetStoryValues`, render `EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID` at Panel A, run `validateAndPersistEdgeCaseHunterReviewCommit` on Panel A submit, continue to Panel B through `continue_workflow_form` when `reviewCommitHashIsInvalid()` matches, and allocate `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID` when `reviewCommitHashIsValid()` matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 6.6. In `edgeCaseHunterReviewWorkflow.ts`, add Step 1 review-scope branches `step-1-await-review-scope-manifest-allocation` and `step-1-build-review-scope-manifest`; allocation success must run `buildAndPersistEdgeCaseHunterReviewScopeManifest` and then route to `step-1-allocate-edge-case-review-output`, while allocation failure must run `failEdgeCaseHunterReviewScopeManifestArtifactAllocation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 6.7. In `edgeCaseHunterReviewWorkflow.ts`, add Step 1 edge-case output branches `step-1-allocate-edge-case-review-output` and `step-1-await-edge-case-review-output-allocation`; output allocation success must transition to Step 2 entry branch, and output allocation failure must run `failEdgeCaseHunterReviewOutputArtifactAllocation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 6.8. In `edgeCaseHunterReviewWorkflow.ts`, add `EDGE_CASE_HUNTER_REVIEW_STEP_2_PROMPT` as the exact Step 2 prompt block prescribed in `edge-case-hunter-review-requirements.md`, add `buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` returning `currentStepInstructions: renderEdgeCaseHunterReviewPromptTemplate(input, EDGE_CASE_HUNTER_REVIEW_STEP_2_PROMPT)`, and do not read the source markdown file at runtime.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 6.9. In `edgeCaseHunterReviewWorkflow.ts`, add `buildStep2DecisionTree(): WorkflowDecisionTree` with entry branch `step-2-project-prompt`, a `project_prompt` route followed by `step-2-await-attempt-completion`, and a single `attempt_completion_succeeded` route with action `{ kind: "complete_workflow" }`; do not add story index, file move, remediation, subagent, or parent mutation actions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Subtask 6.10. In `edgeCaseHunterReviewWorkflow.ts`, export `edgeCaseHunterReviewWorkflowDefinition: WorkflowDefinition` with identity constants, persona, project subfolder, `workflowValueKeys`, entry project value keys, `entryPanel.promptMarkdown` equal to the module description, `workflowForms` containing only `EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID`, `prerequisiteFiles`, `artifacts`, `childInheritance` rules for `review_commit_hash`, `review_commit_parent`, `target_story`, and `review_scope_manifest`, Step 1 checklist label `Gather Inputs & Generate Output File`, Step 2 checklist label `Conduct Exhaustive Path Analysis`, and each step delegating `buildToolSchema` to the exported module tool-schema builders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`

[x] Task 7. Add module exports.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/index.ts`

[x] Subtask 7.1. Add `index.ts` exporting `buildEdgeCaseHunterReviewStep1ToolSchemas` and `buildEdgeCaseHunterReviewStep2ToolSchemas` from `./edgeCaseHunterReviewToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/index.ts`

[x] Subtask 7.2. In `index.ts`, export exactly these workflow symbols from `./edgeCaseHunterReviewWorkflow`: `EDGE_CASE_HUNTER_REVIEW_ARTIFACTS`, `EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY`, `EDGE_CASE_HUNTER_REVIEW_ENTRY_PROJECT_VALUE_KEYS`, `EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID`, `EDGE_CASE_HUNTER_REVIEW_PREREQUISITE_FILES`, `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID`, `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_FILENAME_PATTERN`, `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DESCRIPTION`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DISPLAY_NAME`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_NAME`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PERSONA`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PROJECT_SUBFOLDER`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_SLASH_COMMAND_NAME`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_USE_SKILL_NAME`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_VALUE_KEYS`, `EdgeCaseHunterReviewWorkflowValueKey`, `edgeCaseHunterReviewWorkflowDefinition`, `buildAndPersistEdgeCaseHunterReviewScopeManifest`, `buildEdgeCaseHunterReviewStep1WorkflowForm`, `deriveEdgeCaseHunterReviewTargetStoryValues`, `failEdgeCaseHunterReviewOutputArtifactAllocation`, `failEdgeCaseHunterReviewScopeManifestArtifactAllocation`, `failMissingInheritedEdgeCaseHunterReviewEvidence`, `runEdgeCaseHunterReviewGitCommand`, and `validateAndPersistEdgeCaseHunterReviewCommit`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/index.ts`

[x] Task 8. Add focused edge-case-hunter-review workflow tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.1. Add `edgeCaseHunterReviewWorkflow.test.ts` with these exact imports: `mkdir`, `mkdtemp`, `readFile`, `rm`, and `writeFile` from `node:fs/promises`; `tmpdir` from `node:os`; `basename` and `join` from `node:path`; type imports `WorkflowFormDefinitionPayload`, `WorkflowFormFieldDefinition`, `WorkflowFormPanelAction`, and `WorkflowFormPanelDefinition` from `@shared/ExtensionMessage`; `expect` from `chai`; `describe` and `it` from `mocha`; type import `WorkflowFormSessionState` from `@/core/task/workflow-form/types`; `WorkflowArtifactFamily` from `../../../artifactFamilies`; type imports `ActiveWorkflowSession`, `WorkflowBranchTriggerEvent`, `WorkflowDecisionAction`, `WorkflowDecisionBranchRoute`, `WorkflowDeterministicProcedureResult`, `WorkflowPromptBuilderInput`, `WorkflowStepDefinition`, `WorkflowValue`, and `WorkflowValues` from `../../../types`; and these exact imports from `..`: `EDGE_CASE_HUNTER_REVIEW_ARTIFACTS`, `EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY`, `EDGE_CASE_HUNTER_REVIEW_ENTRY_PROJECT_VALUE_KEYS`, `EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID`, `EDGE_CASE_HUNTER_REVIEW_PREREQUISITE_FILES`, `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`, `EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID`, `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DESCRIPTION`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DISPLAY_NAME`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_NAME`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PERSONA`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PROJECT_SUBFOLDER`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_SLASH_COMMAND_NAME`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_USE_SKILL_NAME`, `EDGE_CASE_HUNTER_REVIEW_WORKFLOW_VALUE_KEYS`, `EdgeCaseHunterReviewWorkflowValueKey`, `edgeCaseHunterReviewWorkflowDefinition`, `buildAndPersistEdgeCaseHunterReviewScopeManifest`, `buildEdgeCaseHunterReviewStep1WorkflowForm`, `deriveEdgeCaseHunterReviewTargetStoryValues`, `failEdgeCaseHunterReviewOutputArtifactAllocation`, `failEdgeCaseHunterReviewScopeManifestArtifactAllocation`, `failMissingInheritedEdgeCaseHunterReviewEvidence`, `runEdgeCaseHunterReviewGitCommand`, and `validateAndPersistEdgeCaseHunterReviewCommit`. Do not import `WorkflowRuntime`, `TaskState`, `WorkflowWorkspacePathPolicy`, `ClineDefaultTool`, or registry lookup functions in Phase 2 because registry-backed runtime activation and registry lookup coverage are sequenced in Phase 3.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.2. Add fixture constants exactly: `PROJECT_ROOT = "/tmp/edge-case-hunter-review-project"`, `TARGET_STORY_PATH = `${PROJECT_ROOT}/implementation/stories-review/Story-1-1.md``, `REVIEW_FOLDER_PATH = `${PROJECT_ROOT}/review``, `REVIEW_SCOPE_MANIFEST_PATH = `${REVIEW_FOLDER_PATH}/review-scope-1-1.md``, `EDGE_CASE_REVIEW_OUTPUT_PATH = `${REVIEW_FOLDER_PATH}/edge-case-hunter-1-1.md``, and `SAMPLE_WORKFLOW_VALUES: WorkflowValues` with exact entries for `TargetStory`, `SelectedStoryIdentity: "1.1"`, `ReviewCommitHash: "abc123"`, `ReviewCommitParent: "def456"`, `ReviewScopeManifest: REVIEW_SCOPE_MANIFEST_PATH`, `ReviewScopeManifestArtifactFamily: "review_scope_manifest"`, `ReviewScopeManifestArtifactIdentity: "1.1"`, `ReviewScopeManifestArtifactFilename: "review-scope-1-1.md"`, `ReviewScopeManifestArtifactRelativePath: "review/review-scope-1-1.md"`, `EdgeCaseReviewOutput: EDGE_CASE_REVIEW_OUTPUT_PATH`, `EdgeCaseReviewOutputArtifactFamily: "edge_case_review_output"`, `EdgeCaseReviewOutputArtifactIdentity: "1.1"`, `EdgeCaseReviewOutputArtifactFilename: "edge-case-hunter-1-1.md"`, and `EdgeCaseReviewOutputArtifactRelativePath: "review/edge-case-hunter-1-1.md"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.3. Add `STEP_2_TOOL_NAMES: readonly string[]` with exactly `["execute_command", "list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "write_to_file", "send_user_message", "attempt_completion"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.4. Add `FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[]` with exactly `["web_search", "web_fetch", "browser_action", "ask_followup_question", "use_subagents", "use_skill", "set_workflow_values", "build_workflow_document", "create_workflow_artifact", "archive_workflow_artifact", "delete_workflow_artifact", "move_workflow_project_file", "workflow_progress_request", "use_mcp_tool", "access_mcp_resource", "load_mcp_documentation", "build_review_input", "build_review_diff_output", "code_review_spec_update", "record_findings"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.5. Add `createSession(workflowValues: WorkflowValues, projectRoot = PROJECT_ROOT, branchContext: ActiveWorkflowSession["branchContext"] = { activeBranchId: "step-1-route-by-existing-values" }, formSession: WorkflowFormSessionState | undefined = undefined): ActiveWorkflowSession`; return a complete session with `activeStepNumber: 1`, supplied `workflowValues`, `projectSelection: { projectMode: "existing", projectTitle: basename(projectRoot), projectFolderName: basename(projectRoot) }`, `lifecycle: { projectSelectionCompleted: true }`, `entryArtifactResolution: undefined`, `ui: { formSession, stepResolutionSession: undefined, suppressedWorkflowFormIds: [], suppressedWorkflowStepResolutionRoutes: [] }`, and supplied `branchContext`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.6. Add `buildCommitFormSession(commitHash: string): WorkflowFormSessionState`; use `buildEdgeCaseHunterReviewStep1WorkflowForm()`, `sessionId: "test-edge-case-hunter-review-form-session"`, `workflowFormId: EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID`, Panel A as first/current panel, `data: {}`, and `values` containing `[EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY]: { valueType: "string", stringValue: commitHash }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.7. Add `getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition`; read `edgeCaseHunterReviewWorkflowDefinition.steps[stepId]`, throw `Missing step ${stepId}.` when missing, and return the step.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.8. Add `findRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute`; use `getStep(stepId)`, find by route id, throw `Missing route ${stepId}/${branchId}/${routeId}.` when missing, and return the route.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.9. Add `getWorkflowForm(workflowFormId: string): WorkflowFormDefinitionPayload`; read `edgeCaseHunterReviewWorkflowDefinition.workflowForms?.[workflowFormId]`, throw when missing, and return the form.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.10. Add `getPanel(form: WorkflowFormDefinitionPayload, panelId: string): WorkflowFormPanelDefinition`; read `form.panels[panelId]`, throw when missing, and return the panel.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.11. Add `getSingleField(panel: WorkflowFormPanelDefinition): WorkflowFormFieldDefinition`; read `panel.fields[0]`, throw when missing, and return the field.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.12. Add `renderWorkflowValue(value: WorkflowValue): string`; return string values directly, otherwise use `JSON.stringify(value)`, throw when the rendered value is `undefined`, and return the rendered string.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.13. Add `createPromptInput(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): WorkflowPromptBuilderInput`; use `const step = getStep(stepId)` and return `{ session: createSession(workflowValues), step, renderWorkflowValue }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.14. Add `buildPrompt(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): string`; call `getStep(stepId).buildPromptSource(createPromptInput(stepId, workflowValues)).currentStepInstructions`, throw when it is `undefined`, and return the prompt.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.15. Add `getToolNamesForStep(stepId: WorkflowStepDefinition["id"]): readonly string[]`; call `getStep(stepId).buildToolSchema(createPromptInput(stepId, {}))` and map to schema names.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.16. Add `buildWorkflowFormPanelSubmittedEvent(panelId: string, action: WorkflowFormPanelAction = "submit"): WorkflowBranchTriggerEvent`; return a complete event with `kind: "workflow_form_panel_submitted"`, `workflowFormId: EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID`, supplied `panelId`, supplied `action`, `submittedValueKeys: []`, and `clearedValueKeys: []`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.17. Add `buildToolBackedOperationSucceededEvent(branchId: string, routeId: string): WorkflowBranchTriggerEvent`; return `{ kind: "tool_backed_operation_succeeded", sourceRoute: { branchId, routeId } }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.18. Add `buildToolBackedOperationFailedEvent(branchId: string, routeId: string): WorkflowBranchTriggerEvent`; return `{ kind: "tool_backed_operation_failed", sourceRoute: { branchId, routeId }, errorMessage: "backend failure" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.19. Add `buildAttemptCompletionSucceededEvent(): WorkflowBranchTriggerEvent`; return `{ kind: "attempt_completion_succeeded" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.20. Add `expectTransitionStepAction(action: WorkflowDecisionAction, stepNumber: number): void`; first check `action.kind !== "transition_step"` and throw `Expected transition_step, received ${action.kind}.` on mismatch, then assert `action.target` deep-equals `{ kind: "entry_branch", stepNumber }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.21. Add `expectEventPredicateMatches(args: { stepId: WorkflowStepDefinition["id"]; route: WorkflowDecisionBranchRoute; workflowValues: WorkflowValues; triggerEvent: WorkflowBranchTriggerEvent }): void`; first require `args.route.trigger.kind === "event_predicate"` and throw on mismatch, then call `args.route.trigger.matches({ activeBranchId: "test-branch", workflowValues: args.workflowValues, step: getStep(args.stepId), triggerEvent: args.triggerEvent })` and assert it equals `true`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.22. Add `expectSessionPredicateMatches(args: { stepId: WorkflowStepDefinition["id"]; route: WorkflowDecisionBranchRoute; workflowValues: WorkflowValues }): void`; first require `args.route.trigger.kind === "session_predicate"` and throw on mismatch, then call `args.route.trigger.matches({ activeBranchId: "test-branch", workflowValues: args.workflowValues, step: getStep(args.stepId) })` and assert it equals `true`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.23. Add `expectSucceeded(result: WorkflowDeterministicProcedureResult): Extract<WorkflowDeterministicProcedureResult, { kind: "succeeded" }>`; assert `result.kind === "succeeded"`, throw `result.errorMessage` inside the `result.kind !== "succeeded"` branch, and return `result` only after that discriminant check.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.24. Add `expectSucceededWithoutCommitWrites(result: WorkflowDeterministicProcedureResult): void`; call `expectSucceeded(result)` and assert `workflowValueWrites === undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.25. Add `runRequiredGitCommand(selectedProjectRoot: string, gitArgs: readonly string[]): Promise<string>`; call `runEdgeCaseHunterReviewGitCommand({ selectedProjectRoot, gitArgs })`, throw `Git command failed: git ${gitArgs.join(" ")}\n${result.stderr}` when `result.exitCode !== 0`, and return `result.stdout.trim()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.26. Add `createTemporaryGitProject(): Promise<{ root: string; targetStory: string; firstCommitHash: string; secondCommitHash: string }>`; create `root` with `mkdtemp(join(tmpdir(), "edge-case-hunter-review-workflow-"))`, create `implementation/stories-review/Story-1-1.md`, write `# Story\n` to the target story, initialize Git, configure `user.email` to `edge-case-hunter-review@example.com`, configure `user.name` to `Edge Case Hunter Review Test`, write `implementation-source.ts` with `export const value = 1\n`, add/commit it as `first commit`, capture `firstCommitHash`, rewrite the file as `export const value = 2\n`, add/commit it as `second commit`, capture `secondCommitHash`, and return `{ root, targetStory, firstCommitHash, secondCommitHash }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.27. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `declares workflow identity, Fred persona, entry panel, value keys, and entry project keys`; assert `edgeCaseHunterReviewWorkflowDefinition.name`, `displayName`, `description`, `slashCommandName`, `useSkillName`, `projectSubfolder`, `persona`, `entryPanel.promptMarkdown`, `workflowValueKeys`, and `entryProjectValueKeys` exactly equal the imported edge-case constants.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.28. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `declares child inheritance for parent-provided review evidence`; assert `edgeCaseHunterReviewWorkflowDefinition.childInheritance` deep-equals exactly `[{ parentKey: "review_commit_hash", childKey: "review_commit_hash" }, { parentKey: "review_commit_parent", childKey: "review_commit_parent" }, { parentKey: "target_story", childKey: "target_story" }, { parentKey: "review_scope_manifest", childKey: "review_scope_manifest" }]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.29. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `declares the target story prerequisite`; read `edgeCaseHunterReviewWorkflowDefinition.prerequisiteFiles?.[EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID]`, assert it deep-equals `EDGE_CASE_HUNTER_REVIEW_PREREQUISITE_FILES[EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID]`, assert `producingWorkflowName === "dev-story"`, `projectSubfolderSegments` deep-equals `["implementation", "stories-review"]`, `workflowValueKey === EdgeCaseHunterReviewWorkflowValueKey.TargetStory`, `outputDocumentReference === "none"`, narrow `match.kind === "naming_pattern"` before reading `match.pattern`, and assert the pattern accepts `Story-1-1.md` and `Remediation-story-1-1-1.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.30. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `declares the review scope manifest artifact`; assert `edgeCaseHunterReviewWorkflowDefinition.artifacts` deep-equals `EDGE_CASE_HUNTER_REVIEW_ARTIFACTS`, read `EDGE_CASE_HUNTER_REVIEW_ARTIFACTS[EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID]`, assert `family === WorkflowArtifactFamily.ReviewScopeManifest`, `intentMode === "derived"`, `parentIdentitySource === undefined`, `targetIdentitySource` deep-equals `{ kind: "workflow_value", key: EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity }`, and `outputValueKeys` deep-equals the exact review-scope metadata mapping prescribed in Subtask 4.7.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.31. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `declares the edge-case review output artifact`; read `EDGE_CASE_HUNTER_REVIEW_ARTIFACTS[EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID]`, assert `family === WorkflowArtifactFamily.EdgeCaseReviewOutput`, `intentMode === "derived"`, `parentIdentitySource === undefined`, `targetIdentitySource` deep-equals `{ kind: "workflow_value", key: EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity }`, and `outputValueKeys` deep-equals the exact edge-case output metadata mapping prescribed in Subtask 4.7.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.32. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `defines the Step 1 commit form Panel A`; use `getWorkflowForm(EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID)`, assert the form deep-equals `buildEdgeCaseHunterReviewStep1WorkflowForm()`, assert `firstPanelId === EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`, read Panel A with `getPanel`, assert `title === "Identify Implementation Evidence"`, `promptMarkdown === "Provide the commit hash for the target story's commit."`, `allowedActions` deep-equals `["submit"]`, `actionLabels` deep-equals `{ submit: "submit" }`, `transition` deep-equals `{ type: "runtime_routed" }`, read the single field with `getSingleField`, and assert it deep-includes `{ key: EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY, kind: "small_text", label: "commit hash", required: true, allowedValueType: "string" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.33. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `defines the Step 1 invalid commit Panel B`; read Panel B with `getPanel`, assert `title === "Invalid Commit Hash"`, `promptMarkdown === "The provided commit hash is invalid. Please go back and provide a valid commit hash."`, `fields` deep-equals `[]`, `allowedActions` deep-equals `["back"]`, `actionLabels` deep-equals `{ back: "back" }`, `transition` deep-equals `{ type: "conditional", conditionSourceKey: "__terminal__", branches: [], defaultTerminal: true }`, and `backDestinationPanelId === EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.34. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `declares exact step labels and model-facing tool surfaces`; assert Step 1 checklist label is `Gather Inputs & Generate Output File`, Step 2 checklist label is `Conduct Exhaustive Path Analysis`, `getToolNamesForStep("step-1")` deep-equals `[]`, `getToolNamesForStep("step-2")` deep-equals `STEP_2_TOOL_NAMES`, and for both `step-1` and `step-2` no tool name from `FORBIDDEN_MODEL_FACING_TOOL_NAMES` is included.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.35. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `declares Step 1 entry route order`; read `getStep("step-1").decisionTree.branches["step-1-route-by-existing-values"]`, throw if missing, and assert route ids deep-equal `["step-1-fail-missing-inherited-review-evidence", "step-1-derive-existing-target-story-values", "step-1-resolve-target-story"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.36. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes missing inherited review evidence to deterministic failure`; find route `step-1/step-1-route-by-existing-values/step-1-fail-missing-inherited-review-evidence`, use `expectSessionPredicateMatches` with `{}` workflow values, narrow `route.action.kind === "run_deterministic_procedure"` before reading `instruction`, and assert `instruction.run === failMissingInheritedEdgeCaseHunterReviewEvidence`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.37. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes complete inherited review evidence to output allocation without prerequisite or form`; find route `step-1/step-1-route-by-existing-values/step-1-derive-existing-target-story-values`, call `expectSessionPredicateMatches` with `SAMPLE_WORKFLOW_VALUES`, narrow `route.action.kind === "run_deterministic_procedure"` before reading `instruction`, assert `instruction.run === deriveEdgeCaseHunterReviewTargetStoryValues`, and assert `followingBranchId === "step-1-allocate-edge-case-review-output"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.38. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes main-agent entry project values with missing evidence to prerequisite resolution`; find route `step-1/step-1-route-by-existing-values/step-1-resolve-target-story`, call `expectSessionPredicateMatches` with workflow values containing `projectMode: "existing"`, `projectTitle: "Edge Case Hunter Review Session"`, and `projectFolderName: "test-project"`, assert `route.action` deep-equals `{ kind: "resolve_prerequisite_files", prerequisiteIds: [EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID] }`, and assert `followingBranchId === "step-1-derive-target-story-values"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.39. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes Step 1 target-story derivation`; find route `step-1/step-1-derive-target-story-values/step-1-derive-target-story-values`, assert trigger deep-equals `{ kind: "always" }`, narrow `action.kind === "run_deterministic_procedure"` before reading `instruction`, assert `instruction.run === deriveEdgeCaseHunterReviewTargetStoryValues`, and assert `followingBranchId === "step-1-render-commit-hash-panel"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.40. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes Step 1 commit form rendering`; find route `step-1/step-1-render-commit-hash-panel/step-1-render-commit-hash-panel`, assert trigger deep-equals `{ kind: "always" }`, narrow `action.kind === "render_workflow_form"` before reading form fields, assert `workflowFormId === EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID`, assert `"startPanelId" in action` before reading it, assert `startPanelId === EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`, and assert `followingBranchId === "step-1-await-commit-form-panel"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.41. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes Panel A submission to commit validation`; find route `step-1/step-1-await-commit-form-panel/step-1-validate-commit-hash`, call `expectEventPredicateMatches` with `buildWorkflowFormPanelSubmittedEvent(EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)`, narrow `action.kind === "run_deterministic_procedure"` before reading `instruction`, assert `instruction.run === validateAndPersistEdgeCaseHunterReviewCommit`, and assert `followingBranchId === "step-1-route-after-commit-validation"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.42. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes valid commit metadata to review-scope artifact allocation`; find route `step-1/step-1-route-after-commit-validation/step-1-allocate-review-scope-manifest`, call `expectSessionPredicateMatches` with workflow values containing `ReviewCommitHash: "abc123"` and `ReviewCommitParent: "def456"`, assert `action` deep-equals `{ kind: "allocate_artifact", artifactId: EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID }`, and assert `followingBranchId === "step-1-await-review-scope-manifest-allocation"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.43. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes invalid commit metadata to Panel B continuation`; find route `step-1/step-1-route-after-commit-validation/step-1-continue-to-invalid-commit-panel`, call `expectSessionPredicateMatches` with `{}` workflow values, narrow `action.kind === "continue_workflow_form"` before reading form fields, assert `workflowFormId === EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID`, `panelId === EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID`, `followingBranchId === "step-1-await-commit-form-panel"`, and assert `await Promise.resolve(action.buildReplacement(createSession({})))` deep-equals `{ panel: getPanel(buildEdgeCaseHunterReviewStep1WorkflowForm(), EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID), data: {} }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.44. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes review-scope artifact allocation success to manifest build`; find route `step-1/step-1-await-review-scope-manifest-allocation/step-1-route-after-review-scope-manifest-allocation`, call `expectEventPredicateMatches` with `buildToolBackedOperationSucceededEvent("step-1-route-after-commit-validation", "step-1-allocate-review-scope-manifest")`, assert `action` deep-equals `{ kind: "no_op" }`, and assert `followingBranchId === "step-1-build-review-scope-manifest"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.45. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes review-scope artifact allocation failure to deterministic failure`; find route `step-1/step-1-await-review-scope-manifest-allocation/step-1-fail-after-review-scope-manifest-allocation`, call `expectEventPredicateMatches` with `buildToolBackedOperationFailedEvent("step-1-route-after-commit-validation", "step-1-allocate-review-scope-manifest")`, narrow `action.kind === "run_deterministic_procedure"` before reading `instruction`, and assert `instruction.run === failEdgeCaseHunterReviewScopeManifestArtifactAllocation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.46. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes review-scope manifest build to edge-case output allocation`; find route `step-1/step-1-build-review-scope-manifest/step-1-build-review-scope-manifest`, assert trigger deep-equals `{ kind: "always" }`, narrow `action.kind === "run_deterministic_procedure"` before reading `instruction`, assert `instruction.run === buildAndPersistEdgeCaseHunterReviewScopeManifest`, and assert `followingBranchId === "step-1-allocate-edge-case-review-output"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.47. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes edge-case output artifact allocation`; find route `step-1/step-1-allocate-edge-case-review-output/step-1-allocate-edge-case-review-output`, assert trigger deep-equals `{ kind: "always" }`, assert `action` deep-equals `{ kind: "allocate_artifact", artifactId: EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID }`, and assert `followingBranchId === "step-1-await-edge-case-review-output-allocation"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.48. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes edge-case output artifact allocation success to Step 2`; find route `step-1/step-1-await-edge-case-review-output-allocation/step-1-transition-to-step-2`, call `expectEventPredicateMatches` with `buildToolBackedOperationSucceededEvent("step-1-allocate-edge-case-review-output", "step-1-allocate-edge-case-review-output")`, and call `expectTransitionStepAction(route.action, 2)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.49. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes edge-case output artifact allocation failure to deterministic failure`; find route `step-1/step-1-await-edge-case-review-output-allocation/step-1-fail-after-edge-case-review-output-allocation`, call `expectEventPredicateMatches` with `buildToolBackedOperationFailedEvent("step-1-allocate-edge-case-review-output", "step-1-allocate-edge-case-review-output")`, narrow `action.kind === "run_deterministic_procedure"` before reading `instruction`, and assert `instruction.run === failEdgeCaseHunterReviewOutputArtifactAllocation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.50. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `derives primary story identity from target_story`; call `deriveEdgeCaseHunterReviewTargetStoryValues(createSession({ [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: TARGET_STORY_PATH }))`, pass the result through `expectSucceeded`, and assert `workflowValueWrites` deep-equals `{ [EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.51. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `derives remediation story identity from target_story`; call `deriveEdgeCaseHunterReviewTargetStoryValues(createSession({ [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: `${PROJECT_ROOT}/implementation/stories-review/Remediation-story-1-1-1.md` }))`, pass the result through `expectSucceeded`, and assert `workflowValueWrites` deep-equals `{ [EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1.1" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.52. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `fails target story derivation when target_story is missing`; call `deriveEdgeCaseHunterReviewTargetStoryValues(createSession({}))`, assert `result.kind === "failed"`, and assert `result.errorMessage` includes `target_story`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.53. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `fails target story derivation for unsupported story filename`; call `deriveEdgeCaseHunterReviewTargetStoryValues(createSession({ [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: `${PROJECT_ROOT}/implementation/stories-review/Not-a-story.md` }))`, assert `result.kind === "failed"`, and assert `result.errorMessage` includes `does not match`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.54. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `fails target story derivation for story outside implementation stories-review`; call `deriveEdgeCaseHunterReviewTargetStoryValues(createSession({ [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: `${PROJECT_ROOT}/implementation/stories-backlog/Story-1-1.md` }))`, assert `result.kind === "failed"`, and assert `result.errorMessage` includes `implementation/stories-review`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.55. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `validates and persists reviewed commit metadata from a temporary Git repository`; create `const project = await createTemporaryGitProject()`, call `validateAndPersistEdgeCaseHunterReviewCommit(createSession({ [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: project.targetStory }, project.root, { activeBranchId: "step-1-await-commit-form-panel" }, buildCommitFormSession(project.secondCommitHash)))`, pass result through `expectSucceeded`, assert `workflowValueWrites` deep-equals `{ [EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash]: project.secondCommitHash, [EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent]: project.firstCommitHash }`, and clean up in `finally` with `await rm(project.root, { recursive: true, force: true })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.56. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `does not write commit workflow values when commit form value is missing`; use `createTemporaryGitProject()`, call `validateAndPersistEdgeCaseHunterReviewCommit(createSession({ [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: project.targetStory }, project.root))`, assert with `expectSucceededWithoutCommitWrites`, and clean up in `finally`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.57. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `does not write commit workflow values for an invalid commit hash`; use `createTemporaryGitProject()`, call `validateAndPersistEdgeCaseHunterReviewCommit` with `buildCommitFormSession("not-a-commit")`, assert with `expectSucceededWithoutCommitWrites`, and clean up in `finally`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.58. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `does not write commit workflow values when the submitted commit has no parent`; use `createTemporaryGitProject()`, call `validateAndPersistEdgeCaseHunterReviewCommit` with `buildCommitFormSession(project.firstCommitHash)`, assert with `expectSucceededWithoutCommitWrites`, and clean up in `finally`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.59. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `does not write commit workflow values when selected project root is not a Git repository`; create `root` with `mkdtemp(join(tmpdir(), "edge-case-hunter-review-no-git-"))`, create `targetStory = join(root, "implementation", "stories-review", "Story-1-1.md")`, create its parent folder with `mkdir(..., { recursive: true })`, write `# Story\n`, call `validateAndPersistEdgeCaseHunterReviewCommit(createSession({ [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: targetStory }, root, { activeBranchId: "step-1-await-commit-form-panel" }, buildCommitFormSession("abc123")))`, assert with `expectSucceededWithoutCommitWrites`, and clean up in `finally` with `await rm(root, { recursive: true, force: true })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.60. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `builds and persists the review scope manifest`; create a temporary Git project with prefix `edge-case-hunter-review-manifest-`, create `implementation/stories-review/Story-1-1.md`, `review`, and `src` folders, write the target story markdown exactly with `# Story`, `## Tasks`, completed Task 1 allowed files `src/allowed.ts` and `src/deleted.ts`, completed Subtask 1.1 allowed file `src/renamed.ts`, and completed Task 2 allowed file `src/untouched.ts`; initialize Git and configure user email/name as in `createTemporaryGitProject`; first commit the story plus `src/allowed.ts`, `src/deleted.ts`, `src/renamed.ts`, and `src/untouched.ts`; second commit must modify `src/allowed.ts`, delete `src/deleted.ts`, and add `src/new-outside.ts`; capture first and second commit hashes; call `buildAndPersistEdgeCaseHunterReviewScopeManifest(createSession({ ...SAMPLE_WORKFLOW_VALUES, [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: targetStory, [EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest]: manifestPath, [EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash]: secondCommitHash, [EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent]: firstCommitHash }, root))`; pass result through `expectSucceeded`; read `manifestPath` with `readFile(..., "utf8")`; assert headings occur in this order: `# Review Scope Manifest`, `## Source`, `## Summary`, `## Changed Files`, `## Review Targets`, `## Suggested Review Strategy`; assert the markdown includes `Commit: ${secondCommitHash}`, `Parent: ${firstCommitHash}`, `Story: ${targetStory}`, `Generated from: git show --name-status --numstat ${secondCommitHash}`, `| Status | Path | Additions | Deletions |`, `allowed_and_touched: src/allowed.ts`, `allowed_and_touched: src/deleted.ts`, `touched_outside_allowed_files: src/new-outside.ts`, `allowed_not_touched: src/renamed.ts`, `allowed_not_touched: src/untouched.ts`, `Task 1: - [x] Task 1. Implement runtime helpers.`, `Subtask 1.1:   - [x] Subtask 1.1. Implement parser.`, `Task 2: - [x] Task 2. Add tests.`, `git show ${secondCommitHash} -- src/allowed.ts`, `git show ${secondCommitHash} -- src/deleted.ts`, and `git show ${secondCommitHash} -- src/new-outside.ts`; clean up in `finally` with `await rm(root, { recursive: true, force: true })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.61. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `fails review-scope manifest build when required workflow values are missing`; call `buildAndPersistEdgeCaseHunterReviewScopeManifest(createSession({}))`, assert `kind === "failed"`, and assert `errorMessage` includes `target_story`, `review_scope_manifest`, `review_commit_hash`, and `review_commit_parent`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.62. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `fails review-scope manifest build for bad target story path`; call `buildAndPersistEdgeCaseHunterReviewScopeManifest(createSession({ ...SAMPLE_WORKFLOW_VALUES, [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: `${PROJECT_ROOT}/implementation/stories-backlog/Story-1-1.md` }))`, assert `kind === "failed"`, and assert `errorMessage` includes `implementation/stories-review`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.63. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `fails review-scope manifest build when target story cannot be read`; create a temporary Git project with `createTemporaryGitProject()`, use `missingTargetStory = join(project.root, "implementation", "stories-review", "Story-9-9.md")`, call `buildAndPersistEdgeCaseHunterReviewScopeManifest(createSession({ ...SAMPLE_WORKFLOW_VALUES, [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: missingTargetStory, [EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash]: project.secondCommitHash, [EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent]: project.firstCommitHash, [EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest]: join(project.root, "review", "review-scope-1-1.md") }, project.root))`, assert `kind === "failed"`, assert `errorMessage` includes `target story read`, and clean up in `finally`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.64. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `fails review-scope manifest build when manifest parent folder does not exist`; use `createTemporaryGitProject()`, call `buildAndPersistEdgeCaseHunterReviewScopeManifest(createSession({ ...SAMPLE_WORKFLOW_VALUES, [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: project.targetStory, [EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash]: project.secondCommitHash, [EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent]: project.firstCommitHash, [EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest]: join(project.root, "missing-review-folder", "review-scope-1-1.md") }, project.root))`, assert `kind === "failed"`, assert `errorMessage` includes `review scope manifest write`, and clean up in `finally`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.65. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `reports every missing inherited evidence workflow value`; call `failMissingInheritedEdgeCaseHunterReviewEvidence(createSession({}))`, assert `kind === "failed"`, and assert `errorMessage` includes `target_story`, `review_commit_hash`, `review_commit_parent`, and `review_scope_manifest`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.66. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `preserves concrete review-scope allocation backend failure reason`; call `failEdgeCaseHunterReviewScopeManifestArtifactAllocation(createSession(SAMPLE_WORKFLOW_VALUES, PROJECT_ROOT, { activeBranchId: "step-1-await-review-scope-manifest-allocation", failureState: { retryAttemptCount: 1, terminalErrorMessage: "backend failure" } }))`, assert result deep-equals `{ kind: "failed", errorMessage: `Edge Case Hunter Review review-scope manifest artifact creation failed for target_story ${TARGET_STORY_PATH}: backend failure` }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.67. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `preserves concrete edge-case output allocation backend failure reason`; call `failEdgeCaseHunterReviewOutputArtifactAllocation(createSession(SAMPLE_WORKFLOW_VALUES, PROJECT_ROOT, { activeBranchId: "step-1-await-edge-case-review-output-allocation", failureState: { retryAttemptCount: 1, terminalErrorMessage: "backend failure" } }))`, assert result deep-equals `{ kind: "failed", errorMessage: `Edge Case Hunter Review output artifact creation failed for target_story ${TARGET_STORY_PATH}: backend failure` }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.68. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `projects Step 2 prompt instructions with materialized workflow values`; call `buildPrompt("step-2", SAMPLE_WORKFLOW_VALUES)`, assert the prompt is non-empty, assert it includes `REVIEW_SCOPE_MANIFEST_PATH`, `TARGET_STORY_PATH`, `"abc123"`, `"def456"`, and `EDGE_CASE_REVIEW_OUTPUT_PATH`, and assert it does not include raw placeholders `review_scope_manifest`, `target_story`, `review_commit_hash`, `review_commit_parent`, or `edge_case_review_output`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.69. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `routes Step 2 attempt completion directly to workflow completion`; find route `step-2/step-2-await-attempt-completion/step-2-complete-workflow`, assert `route.trigger` deep-equals `{ kind: "on_event", eventKind: buildAttemptCompletionSucceededEvent().kind }`, and assert `route.action` deep-equals `{ kind: "complete_workflow" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.70. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `does not add forbidden Step 2 completion side-effect actions`; iterate over every route in `getStep("step-2").decisionTree.branches`, collect `route.action.kind`, and assert none equal `update_story_index_status`, `move_project_file`, `run_deterministic_procedure`, `allocate_artifact`, `execute_tool_backed_operation`, `transition_step`, or `project_prompt` except the required pre-completion `step-2-project-prompt` route whose action kind must be exactly `project_prompt`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 8.71. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `does not use singleton entry artifact resolution startup flow`; iterate every Step 1 route, assert no route id includes `creationRequired`, assert no route trigger is `{ kind: "on_event", eventKind: "entry_artifact_resolution_completed" }`, and for every `event_predicate` route call `matches` with `triggerEvent: { kind: "entry_artifact_resolution_completed", artifactResolutions: [] }` plus `workflowValues: SAMPLE_WORKFLOW_VALUES` and assert it returns `false`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Task 9. Run Phase 2 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 9.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 9.2. Run `npm run check-types`; if it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 9.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

### Phase 3 - Registration, Prompt Integration, Code-Review Handoff, And Legacy Cleanup

After completing this phase, pause for QA review before moving to Phase 4.

[x] Task 10. Register edge-case-hunter-review in the workflow registry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 10.1. In `WorkflowRegistry.ts`, import `edgeCaseHunterReviewWorkflowDefinition` from `@/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review` and add it to `shippedWorkflowDefinitions` after `blindReviewWorkflowDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[x] Subtask 10.2. In `edgeCaseHunterReviewWorkflow.test.ts`, add imports for `resolveWorkflowDefinition`, `resolveWorkflowBySlashCommand`, and `resolveWorkflowByUseSkillName` from `../../../WorkflowRegistry`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 10.3. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `resolves edge-case-hunter-review through every registry lookup`; assert `resolveWorkflowDefinition("edge-case-hunter-review")`, `resolveWorkflowBySlashCommand("edge-case-hunter-review")`, and `resolveWorkflowByUseSkillName("edge-case-hunter-review")` each return `edgeCaseHunterReviewWorkflowDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 10.4. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `does not preserve retired edge-case-hunter workflow aliases`; for each name `review-edge-case-hunter`, `review-edge-case-hunter.md`, and `edge-case-hunter-review.md`, assert `resolveWorkflowDefinition(name)`, `resolveWorkflowBySlashCommand(name)`, and `resolveWorkflowByUseSkillName(name)` each return `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 10.5. In `edgeCaseHunterReviewWorkflow.test.ts`, add imports for `TaskState` from `@/core/task/TaskState`, `ClineDefaultTool` from `@/shared/tools`, `WorkflowRuntime` from `../../../WorkflowRuntime`, and type import `WorkflowWorkspacePathPolicy` from `../../../types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Subtask 10.6. In `edgeCaseHunterReviewWorkflow.test.ts`, add test `activates from a parent session through the registered workflow name`; define `const workspacePathPolicy: WorkflowWorkspacePathPolicy = { validateAccess: () => true }`, construct `const runtime = new WorkflowRuntime({ cwd: PROJECT_ROOT, workspacePathPolicy })`, construct `const taskState = new TaskState()`, construct `const parentSession = createSession(SAMPLE_WORKFLOW_VALUES)`, call `runtime.activateWorkflow({ taskState, workflowName: "edge-case-hunter-review", parentSession })`, assert `result.kind === "execute_tool_backed_operation"`, then after that discriminant check assert `result.toolRequest.toolName === ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT`, `result.toolRequest.toolParams.artifact_id === EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID`, `taskState.activeWorkflowName === "edge-case-hunter-review"`, `taskState.activeWorkflowSession` is not `undefined`, child `projectSelection` deep-equals but is not the same reference as `parentSession.projectSelection`, and child workflow values include the same `target_story`, `review_commit_hash`, `review_commit_parent`, and `review_scope_manifest` string values as `parentSession.workflowValues`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

[x] Task 11. Update code-review Step 2 to invoke the canonical edge-case-hunter-review child workflow name.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 11.1. In `codeReviewWorkflow.ts`, replace the Step 2 subagent assignment phrase `Skill: use_skill('review-edge-case-hunter')` with exactly `Skill: use_skill('edge-case-hunter-review')`; do not change any other Step 2 prompt wording.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 11.2. In `codeReviewWorkflow.test.ts`, update the Step 2 prompt test so it asserts the non-empty Step 2 prompt includes `Skill: use_skill('blind-review')` and `Skill: use_skill('edge-case-hunter-review')`, and asserts it does not include `Skill: use_skill('review-edge-case-hunter')`; keep the assertion limited to these stable workflow activation phrases and non-empty prompt shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Task 12. Add edge-case-hunter-review prompt integration coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.1. In `integration.test.ts`, add imports for `EdgeCaseHunterReviewWorkflowValueKey`, `edgeCaseHunterReviewWorkflowDefinition`, and `buildEdgeCaseHunterReviewStep2ToolSchemas` from `@/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.2. In `integration.test.ts`, add fixture constants near the blind-review prompt fixtures exactly: `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY = "/test/project/implementation/stories-review/Story-1-1.md"`, `EDGE_CASE_HUNTER_REVIEW_SELECTED_STORY_IDENTITY = "1.1"`, `EDGE_CASE_HUNTER_REVIEW_REVIEW_COMMIT_HASH = "abc1234"`, `EDGE_CASE_HUNTER_REVIEW_REVIEW_COMMIT_PARENT = "def5678"`, `EDGE_CASE_HUNTER_REVIEW_REVIEW_FOLDER = "/test/project/review"`, `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST = `${EDGE_CASE_HUNTER_REVIEW_REVIEW_FOLDER}/review-scope-1-1.md``, and `EDGE_CASE_HUNTER_REVIEW_OUTPUT = `${EDGE_CASE_HUNTER_REVIEW_REVIEW_FOLDER}/edge-case-hunter-1-1.md``.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.3. In `integration.test.ts`, add review-scope artifact metadata constants exactly: `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_FAMILY = "review_scope_manifest"`, `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_IDENTITY = "1.1"`, `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_FILENAME = "review-scope-1-1.md"`, and `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_RELATIVE_PATH = "review/review-scope-1-1.md"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.4. In `integration.test.ts`, add edge-case output artifact metadata constants exactly: `EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_FAMILY = "edge_case_review_output"`, `EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_IDENTITY = "1.1"`, `EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_FILENAME = "edge-case-hunter-1-1.md"`, and `EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_RELATIVE_PATH = "review/edge-case-hunter-1-1.md"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.5. In `integration.test.ts`, add `EDGE_CASE_HUNTER_REVIEW_FORBIDDEN_PROMPT_TOOL_NAMES: readonly string[]` with exactly the same forbidden tool names as `FORBIDDEN_MODEL_FACING_TOOL_NAMES` in Subtask 8.4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.6. In `integration.test.ts`, add `type EdgeCaseHunterReviewPromptStepNumber = 2`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.7. In `integration.test.ts`, add `getEdgeCaseHunterReviewEntryBranchId(activeStepNumber: EdgeCaseHunterReviewPromptStepNumber): string`; implement a `switch` with case `2` returning `edgeCaseHunterReviewWorkflowDefinition.steps["step-2"].decisionTree.entryBranchId`, then assign `const unreachableActiveStepNumber: never = activeStepNumber` after the switch and return it.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.8. In `integration.test.ts`, add `createEdgeCaseHunterReviewWorkflowValues(overrides: WorkflowValues = {}): WorkflowValues`; return a workflow-values object containing project mode/title/folder, target story, selected story identity, review commit hash, review commit parent, review scope manifest path, all four review-scope artifact metadata values, edge-case output path, all four edge-case output artifact metadata values, and spread `overrides` last.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.9. In `integration.test.ts`, add `createEdgeCaseHunterReviewWorkflowSession(activeStepNumber: EdgeCaseHunterReviewPromptStepNumber, workflowValues: WorkflowValues = createEdgeCaseHunterReviewWorkflowValues()): ActiveWorkflowSession`; return a complete session with `activeStepNumber`, supplied `workflowValues`, `projectSelection` `{ projectMode: "existing", projectTitle: "Edge Case Hunter Review Session", projectFolderName: "test-project" }`, `lifecycle.projectSelectionCompleted: true`, `entryArtifactResolution: undefined`, `ui: { formSession: undefined, stepResolutionSession: undefined, suppressedWorkflowFormIds: [], suppressedWorkflowStepResolutionRoutes: [] }`, and `branchContext.activeBranchId` from `getEdgeCaseHunterReviewEntryBranchId(activeStepNumber)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.10. In `integration.test.ts`, add `buildEdgeCaseHunterReviewPromptContext(activeStepNumber: EdgeCaseHunterReviewPromptStepNumber = 2, workflowValues: WorkflowValues = createEdgeCaseHunterReviewWorkflowValues()): Promise<SystemPromptContext & WorkflowPromptProjection>`; instantiate `WorkflowRuntime` with cwd `/test/project` and `workspacePathPolicy.validateAccess: () => true`, instantiate `TaskState`, set `activeWorkflowName = "edge-case-hunter-review"`, set `activeWorkflowSession = createEdgeCaseHunterReviewWorkflowSession(activeStepNumber, workflowValues)`, set `apiRequestCount = 1`, await `runtime.buildTurnProjection({ taskState })`, and return `{ ...baseContext, mcpHub: makeMcpHub([]), providerInfo: makeProviderInfo("gpt-5-codex", "openai"), enableNativeToolCalls: true, useMinimalGptPrompt: true, ...workflowProjection }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.11. In `integration.test.ts`, add `expectEdgeCaseHunterReviewProjectedToolSurface(testCtx: TestRunner, expectedToolSpecs: readonly ClineToolSpec[]): Promise<void>`; compute `expectedToolNames = expectedToolSpecs.map((tool) => tool.name)`, build context with `buildEdgeCaseHunterReviewPromptContext(2)`, assert `context.workflowToolSchemaOverride` deep-equals `expectedToolSpecs`, and call `runPromptTest(testCtx, context, "gpt-5-codex", async ({ tools }) => { expect(getNativeToolNames(tools)).to.deep.equal(expectedToolNames) })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.12. In `integration.test.ts`, add test `projects active edge-case-hunter-review Step 2 tools from module-owned builders into native GPT-5 prompts`; call `await expectEdgeCaseHunterReviewProjectedToolSurface(this, buildEdgeCaseHunterReviewStep2ToolSchemas())`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.13. In `integration.test.ts`, add test `projects edge-case-hunter-review Step 2 materialized values into full-turn and continuation payloads`; build context with `buildEdgeCaseHunterReviewPromptContext(2)`, require non-empty `workflowInputPayloadBlock` and non-empty `continuationWorkflowInputPayloadBlock`, iterate both payload blocks, and assert each includes `EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST`, `EDGE_CASE_HUNTER_REVIEW_TARGET_STORY`, `EDGE_CASE_HUNTER_REVIEW_REVIEW_COMMIT_HASH`, `EDGE_CASE_HUNTER_REVIEW_REVIEW_COMMIT_PARENT`, and `EDGE_CASE_HUNTER_REVIEW_OUTPUT`; assert neither block includes raw placeholders `review_scope_manifest`, `target_story`, `review_commit_hash`, `review_commit_parent`, or `edge_case_review_output`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.14. In `integration.test.ts`, add test `does not expose forbidden tools in edge-case-hunter-review Step 2 prompt projection`; build context with `buildEdgeCaseHunterReviewPromptContext(2)`, map `context.workflowToolSchemaOverride ?? []` to tool names, and assert every name in `EDGE_CASE_HUNTER_REVIEW_FORBIDDEN_PROMPT_TOOL_NAMES` is absent.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.15. In `integration.test.ts`, add test `does not expose forbidden native tools in edge-case-hunter-review Step 2 prompts`; build context with `buildEdgeCaseHunterReviewPromptContext(2)`, call `runPromptTest(this, context, "gpt-5-codex", async ({ tools }) => { const nativeToolNames = getNativeToolNames(tools); for each forbidden name assert `nativeToolNames` does not include it })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 12.16. In `integration.test.ts`, add test `renders edge-case-hunter-review Step 2 tools through non-native prompt text without forbidden tools`; build `nativeContext` with `buildEdgeCaseHunterReviewPromptContext(2)`, define `context: SystemPromptContext = { ...nativeContext, providerInfo: makeProviderInfo("gpt-3", "openai"), enableNativeToolCalls: false }`, compute approved tool names from `buildEdgeCaseHunterReviewStep2ToolSchemas().map((tool) => tool.name)`, call `runPromptTest(this, context, "gpt-3", async ({ systemPrompt, tools }) => { expect(tools).to.equal(undefined); assert every approved tool name appears in `systemPrompt`; assert every forbidden tool name is absent from `systemPrompt` })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Task 13. Delete the legacy edge-case-hunter workflow package.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-review-edge-case-hunter/SKILL.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-review-edge-case-hunter/bmad-skill-manifest.yaml`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-review-edge-case-hunter/workflow.md`

[x] Subtask 13.1. Delete `.cline/skills/bmad-review-edge-case-hunter/SKILL.md`; do not migrate text or behavior from this file into the runtime module.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-review-edge-case-hunter/SKILL.md`

[x] Subtask 13.2. Delete `.cline/skills/bmad-review-edge-case-hunter/bmad-skill-manifest.yaml`; do not migrate text or behavior from this file into the runtime module.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-review-edge-case-hunter/bmad-skill-manifest.yaml`

[x] Subtask 13.3. Delete `.cline/skills/bmad-review-edge-case-hunter/workflow.md`; do not migrate text or behavior from this file into the runtime module.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-review-edge-case-hunter/workflow.md`

[x] Task 14. Run Phase 3 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 14.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 14.2. Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 14.3. Run `test ! -f .cline/skills/bmad-review-edge-case-hunter/SKILL.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 14.4. Run `test ! -f .cline/skills/bmad-review-edge-case-hunter/bmad-skill-manifest.yaml`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 14.5. Run `test ! -f .cline/skills/bmad-review-edge-case-hunter/workflow.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 14.6. Run `rg -n "review-edge-case-hunter|review-edge-case-hunter\\.md|Review-edge-case-hunter|review_edge_case_hunter|ReviewEdgeCaseHunter" src/core/task/workflow-runtime src/core/prompts/system-prompt/__tests__/integration.test.ts`; treat exit code 1 with no output as success, inspect any output in context, and stop if any hit is active runtime code instead of an explicit negative test assertion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 14.7. Run `npm run check-types`; if it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 14.8. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

### Phase 4 - Final Validation

[x] Task 15. Run final validation for the completed edge-case-hunter-review module build.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 15.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 15.2. Run `test ! -f .cline/skills/bmad-review-edge-case-hunter/SKILL.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 15.3. Run `test ! -f .cline/skills/bmad-review-edge-case-hunter/bmad-skill-manifest.yaml`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 15.4. Run `test ! -f .cline/skills/bmad-review-edge-case-hunter/workflow.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 15.5. Run `rg -n "review-edge-case-hunter|review-edge-case-hunter\\.md|Review-edge-case-hunter|review_edge_case_hunter|ReviewEdgeCaseHunter" src/core/task/workflow-runtime src/core/prompts/system-prompt/__tests__/integration.test.ts`; treat exit code 1 with no output as success, inspect any output in context, and stop if any hit is active runtime code instead of an explicit negative test assertion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 15.6. Run `npm run check-types`; if it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 15.7. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

[x] Subtask 15.8. Run `git diff --name-only` and confirm the persistent diff is limited to files authorized by this action plan plus this action plan's checkbox updates, after accounting for the pre-existing dirty documentation files listed under Known Issues / Risks / Technical Debt; stop and report any other unrelated file as scope drift.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/edge-case-hunter-review/action-plan.md`

## Validation

The required validation sequence is phase-scoped:

- Phase 1 validates the new tool-schema file and then the repo static gates.
- Phase 2 validates the workflow module and tool-schema tests, then the repo static gates.
- Phase 3 validates the workflow module tests, code-review handoff test, prompt integration test, legacy package deletion, retired active-runtime string guard, and repo static gates.
- Phase 4 repeats the full focused test set, legacy deletion guard, retired active-runtime string guard, `npm run check-types`, `npm run lint`, and scoped diff review.

If any validation command fails because of generated proto files or host probing before TypeScript checking begins, run `npm run protos` and rerun the exact blocked command before classifying the failure as a code defect. If any validation command fails in files modified by the current phase, stop on that validation subtask and report the exact failure output before continuing.
