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

This plan builds and registers the product-owned `blind-review` workflow module described by [blind-review-requirements.md](./blind-review-requirements.md).

The module performs a blind adversarial review of implementation changes using Git-backed evidence. It resolves a target story or remediation story, collects or inherits reviewed commit metadata, creates the target-derived `blind-review-{target}.md` output artifact, projects the source-prescribed blind review prompt, exposes only the approved model-facing Step 2 tools, and completes after `attempt_completion`.

Approved implementation decisions:

- The existing runtime artifact family `WorkflowArtifactFamily.BlindReviewOutput` is the canonical artifact family for `blind_review_output`.
- The workflow derives `selected_story_identity` from the basename of `target_story` and uses that workflow value as the target-derived artifact identity source.
- Step 1 uses workflow-value state as its activation-path gate. If `target_story`, `review_commit_hash`, and `review_commit_parent` are present as non-empty strings, Step 1 skips prerequisite selection and the commit form, derives `selected_story_identity`, allocates `blind_review_output`, and transitions to Step 2.
- Main-agent runs without complete evidence values use the shared prerequisite resolver and one module-owned commit-hash workflow form.
- Child/subagent runs rely on existing `childInheritance` and parent project-selection copy behavior. This plan does not add an activation-source marker or other shared runtime architecture.
- Prompt tests must assert behavior, non-empty prompt projection, materialized workflow values, absent raw placeholders, required tool exposure, and forbidden tool absence. They must not assert full editable prompt prose.

Sibling-pattern audit summary:

- `WorkflowArtifactFamily.BlindReviewOutput` and target-derived runtime allocation already exist in `artifactFamilies.ts`, `types.ts`, and `WorkflowRuntime.ts`; no artifact-family runtime change is required.
- The workflow module follows the current module pattern under `src/core/task/workflow-runtime/workflow-modules/{workflowId}` with module-owned workflow definition, tool schemas, tests, exports, registry wiring, and prompt-projection tests.
- The Step 1 commit validation and `selected_story_identity` derivation follow the current code-review deterministic-helper pattern, narrowed to the blind-review requirements.
- The Step 2 schema follows the module build guide tool-schema ownership rules and uses `ModelFamily.NATIVE_GPT_5` module-owned `ClineToolSpec` builders.

## Scope Boundary

- Do not edit `/Users/robertboston/Documents/Cline/Workflows/blind-review.md`.
- Do not read `/Users/robertboston/Documents/Cline/Workflows/blind-review.md`, `_bmad/bmm/agents/quality-control.md`, legacy `.cline/skills` workflow packages, or the legacy tool matrix at runtime.
- Do not add shared runtime architecture for child/main activation detection.
- Do not modify shared project-selection behavior.
- Do not implement target story selection as a module-owned selector form.
- Do not add a module-owned document builder or registry file.
- Do not create specialized blind-review backend tools.
- Do not expose `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `workflow_progress_request`, `use_subagents`, `use_skill`, MCP tools, web tools, browser tools, retired blind-review/code-review tools, or backend-only runtime tools to the Step 2 model.
- Do not preserve `blind-review.md` as a workflow name, slash-command alias, or skill alias.
- Do not preserve `Review-blind-hunter-{target}.md`, `Adversarial-review-{target}.md`, `review-adversarial-general`, placeholder workflow state, managed-workflow state, or legacy contextual tool-matrix behavior as canonical runtime behavior.
- Do not add exact full-prose assertions for editable prompt text.

## Known Issues / Risks / Technical Debt

- Existing docs and legacy assets contain historical `blind-review.md`, `review-adversarial-general`, `Review-blind-hunter`, and `Adversarial-review` references. This plan does not clean unrelated historical documentation or legacy skill packages; tests must protect only the new runtime module and prompt-projection surfaces.
- `npm run check-types` may fail before TypeScript checking if generated proto files are missing or host probing fails. If that happens, run `npm run protos` and rerun the exact blocked validation command before treating the failure as a code defect.

## Tasks / Subtasks

### Phase 1 - Blind Review Tool Schemas

After completing this phase, pause for QA review before moving to Phase 2.

[x] Task 1. Add the module-owned blind-review tool-schema builders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewToolSchemas.ts`

[x] Subtask 1.1. Add `blindReviewToolSchemas.ts` with imports for `ClineToolSpec`, `AGENT_FEEDBACK_PARAMETER`, `ModelFamily`, and `ClineDefaultTool`; define `const BLIND_REVIEW_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5`; export `buildBlindReviewStep1ToolSchemas(): readonly ClineToolSpec[]` returning `[]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewToolSchemas.ts`

[x] Subtask 1.2. In `blindReviewToolSchemas.ts`, add exported builders for source-inspection tools with these exact schema identities and parameter shapes: `buildBlindReviewExecuteCommandToolSchema()` returns name `execute_command`, id `ClineDefaultTool.BASH`, required string parameter `command`, and required boolean parameter `requires_approval`; `buildBlindReviewListFilesToolSchema()` returns name `list_files`, id `ClineDefaultTool.LIST_FILES`, required string parameter `path`, and optional boolean parameter `recursive`; `buildBlindReviewSearchFilesToolSchema()` returns name `search_files`, id `ClineDefaultTool.SEARCH`, required string parameters `path` and `regex`, and optional string parameter `file_pattern`; `buildBlindReviewListCodeDefinitionNamesToolSchema()` returns name `list_code_definition_names`, id `ClineDefaultTool.LIST_CODE_DEF`, and required string parameter `path`; `buildBlindReviewReadFileToolSchema()` returns name `read_file`, id `ClineDefaultTool.FILE_READ`, and required string parameter `path`; `buildBlindReviewReadFileRangeToolSchema()` returns name `read_file_range`, id `ClineDefaultTool.FILE_READ_RANGE`, required string parameter `path`, required integer parameter `start_line`, and required integer parameter `end_line`; every schema must include `variant: BLIND_REVIEW_TOOL_SCHEMA_VARIANT`, and every parameter object must include non-empty `instruction` and `description` strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewToolSchemas.ts`

[x] Subtask 1.3. In `blindReviewToolSchemas.ts`, add exported builders for edit and response tools with these exact schema identities and parameter shapes: `buildBlindReviewApplyPatchToolSchema()` returns name `apply_patch`, id `ClineDefaultTool.APPLY_PATCH`, and required string parameter `input`; `buildBlindReviewWriteToFileToolSchema()` returns name `write_to_file`, id `ClineDefaultTool.FILE_NEW`, and required string parameters `absolutePath` and `content`; `buildBlindReviewSendUserMessageToolSchema()` returns name `send_user_message`, id `ClineDefaultTool.SEND_USER_MESSAGE`, required string parameter `message`, and `AGENT_FEEDBACK_PARAMETER`; `buildBlindReviewAttemptCompletionToolSchema()` returns name `attempt_completion`, id `ClineDefaultTool.ATTEMPT`, and required string parameter `result`; every schema must include `variant: BLIND_REVIEW_TOOL_SCHEMA_VARIANT`, and every non-shared parameter object must include non-empty `instruction` and `description` strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewToolSchemas.ts`

[x] Subtask 1.4. In `blindReviewToolSchemas.ts`, export `buildBlindReviewStep2ToolSchemas(): readonly ClineToolSpec[]` returning these builders in this exact order: `execute_command`, `list_files`, `search_files`, `list_code_definition_names`, `read_file`, `read_file_range`, `apply_patch`, `write_to_file`, `send_user_message`, `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewToolSchemas.ts`

[x] Task 2. Add focused tool-schema tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewToolSchemas.test.ts`

[x] Subtask 2.1. Add `blindReviewToolSchemas.test.ts` importing `expect`, `describe`, `it`, `ModelFamily`, `ClineToolSpec`, and `buildBlindReviewStep1ToolSchemas`/`buildBlindReviewStep2ToolSchemas`; define typed helper `schemaNames(schemas: readonly ClineToolSpec[]): readonly string[]` and `findSchemaByName(schemas: readonly ClineToolSpec[], name: string): ClineToolSpec` without casts.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewToolSchemas.test.ts`

[x] Subtask 2.2. In `blindReviewToolSchemas.test.ts`, add a test asserting Step 1 returns `[]` and Step 2 returns exactly `["execute_command", "list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "write_to_file", "send_user_message", "attempt_completion"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewToolSchemas.test.ts`

[x] Subtask 2.3. In `blindReviewToolSchemas.test.ts`, add a test asserting every Step 2 schema has `variant === ModelFamily.NATIVE_GPT_5` and that each schema's parameter names, `required` flags, and `type` values exactly match Subtasks 1.2 and 1.3.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewToolSchemas.test.ts`

[x] Subtask 2.4. In `blindReviewToolSchemas.test.ts`, add a forbidden-tool test that checks Step 1 and Step 2 do not include `web_search`, `web_fetch`, `browser_action`, `ask_followup_question`, `use_subagents`, `use_skill`, `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `workflow_progress_request`, `use_mcp_tool`, `access_mcp_resource`, `load_mcp_documentation`, `build_review_input`, `build_review_diff_output`, `code_review_spec_update`, or `record_findings`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewToolSchemas.test.ts`

[x] Task 3. Run Phase 1 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 3.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewToolSchemas.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 3.2. Run `npm run check-types`; if it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 3.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

### Phase 2 - Blind Review Workflow Module

After completing this phase, pause for QA review before moving to Phase 3.

[x] Task 4. Add the blind-review workflow definition constants, value contract, prerequisite declaration, artifact declaration, and Step 1 workflow form.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 4.1. Add `blindReviewWorkflow.ts` with imports for `execa`, `basename`, `dirname`, `normalize`, `WorkflowFormDefinitionPayload`, `WorkflowArtifactFamily`, `ActiveWorkflowSession`, `WorkflowDecisionBranchTrigger`, `WorkflowDecisionTree`, `WorkflowDefinition`, `WorkflowDeterministicProcedureResult`, `WorkflowFormContinuationReplacementBuilder`, `WorkflowPersonaDefinition`, `WorkflowPromptBuilderInput`, `WorkflowStepDefinition`, `WorkflowStepPromptSource`, `WorkflowValues`, and `buildBlindReviewStep1ToolSchemas`/`buildBlindReviewStep2ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 4.2. In `blindReviewWorkflow.ts`, export identity constants exactly: `BLIND_REVIEW_WORKFLOW_NAME = "blind-review"`, `BLIND_REVIEW_WORKFLOW_SLASH_COMMAND_NAME = "blind-review"`, `BLIND_REVIEW_WORKFLOW_USE_SKILL_NAME = "blind-review"`, `BLIND_REVIEW_WORKFLOW_DISPLAY_NAME = "blind review"`, `BLIND_REVIEW_WORKFLOW_DESCRIPTION = "This workflow performs a blind adversarial review using git-backed evidence to identify misconfiguration and use of bad coding habits."`, and `BLIND_REVIEW_WORKFLOW_PROJECT_SUBFOLDER = "review"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 4.3. In `blindReviewWorkflow.ts`, export `BLIND_REVIEW_WORKFLOW_PERSONA: WorkflowPersonaDefinition` with exactly `name: "Jasmine"`, `role: "Quality Control"`, `identity: "You are a cynical, jaded reviewer with zero patience for sloppy work. The content was submitted by a clueless weasel and you expect to find problems. Be skeptical of everything. Look for what's missing, not just what's wrong. Use a precise, professional tone — no profanity or personal attacks."`, `capabilities: ["thorough code review"]`, `communicationStyle: "precise and detailed"`, and `principles: ["lazily formatted and noncompliant code must never hit the production environment."]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 4.4. In `blindReviewWorkflow.ts`, export enum `BlindReviewWorkflowValueKey` with exactly these values: `ProjectMode = "projectMode"`, `ProjectTitle = "projectTitle"`, `ProjectFolderName = "projectFolderName"`, `TargetStory = "target_story"`, `SelectedStoryIdentity = "selected_story_identity"`, `ReviewCommitHash = "review_commit_hash"`, `ReviewCommitParent = "review_commit_parent"`, `BlindReviewOutput = "blind_review_output"`, `BlindReviewOutputArtifactFamily = "blind_review_output_artifact_family"`, `BlindReviewOutputArtifactIdentity = "blind_review_output_artifact_identity"`, `BlindReviewOutputArtifactFilename = "blind_review_output_artifact_filename"`, and `BlindReviewOutputArtifactRelativePath = "blind_review_output_artifact_relative_path"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 4.5. In `blindReviewWorkflow.ts`, export `BLIND_REVIEW_WORKFLOW_VALUE_KEYS` as `Object.values(BlindReviewWorkflowValueKey)` and export `BLIND_REVIEW_ENTRY_PROJECT_VALUE_KEYS` mapping `projectMode`, `projectTitle`, and `projectFolderName` to the matching enum values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 4.6. In `blindReviewWorkflow.ts`, export `BLIND_REVIEW_TARGET_STORY_PREREQUISITE_ID = BlindReviewWorkflowValueKey.TargetStory`, export `BLIND_REVIEW_TARGET_STORY_FILENAME_PATTERN = /^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/`, and export `BLIND_REVIEW_PREREQUISITE_FILES` with one required `target_story` prerequisite for producing workflow `dev-story`, `projectSubfolderSegments: ["implementation", "stories-review"]`, `match.kind: "naming_pattern"`, `workflowValueKey: BlindReviewWorkflowValueKey.TargetStory`, and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 4.7. In `blindReviewWorkflow.ts`, export `BLIND_REVIEW_OUTPUT_ARTIFACT_ID = BlindReviewWorkflowValueKey.BlindReviewOutput` and export `BLIND_REVIEW_ARTIFACTS: NonNullable<WorkflowDefinition["artifacts"]>` containing only `[BLIND_REVIEW_OUTPUT_ARTIFACT_ID]` with `id: BLIND_REVIEW_OUTPUT_ARTIFACT_ID`, `family: WorkflowArtifactFamily.BlindReviewOutput`, `intentMode: "derived"`, `parentIdentitySource: undefined`, `targetIdentitySource: { kind: "workflow_value", key: BlindReviewWorkflowValueKey.SelectedStoryIdentity }`, and `outputValueKeys` exactly `{ projectTitle: BlindReviewWorkflowValueKey.ProjectTitle, projectFolderName: BlindReviewWorkflowValueKey.ProjectFolderName, artifactFamily: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactFamily, artifactIdentity: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactIdentity, artifactFilename: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactFilename, artifactRelativePath: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactRelativePath, artifactAbsolutePath: BlindReviewWorkflowValueKey.BlindReviewOutput, parentIdentity: undefined, targetIdentity: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactIdentity }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 4.8. In `blindReviewWorkflow.ts`, export `BLIND_REVIEW_STEP_1_FORM_ID = "step-1-blind-review-commit-form"`, `BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID = "step-1-panel-a-commit-hash"`, `BLIND_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID = "step-1-panel-b-invalid-commit"`, and `BLIND_REVIEW_COMMIT_HASH_FIELD_KEY = "commit_hash"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 4.9. In `blindReviewWorkflow.ts`, add `buildRuntimeRoutedTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"]` returning exactly `{ type: "runtime_routed" }`, and add `buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"]` returning exactly `{ type: "conditional", conditionSourceKey: "__terminal__", branches: [], defaultTerminal: true }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 4.10. In `blindReviewWorkflow.ts`, export `buildBlindReviewStep1WorkflowForm(): WorkflowFormDefinitionPayload` with `definitionVersion: 2`, `title` and `toolDictionaryTitle` exactly `Identify Implementation Evidence`, `toolDictionaryMarkdown` exactly `Provide the commit hash for the target story's commit.`, first panel Panel A, Panel A containing one required `small_text` string field labeled `commit hash`, Panel A `allowedActions: ["submit"]`, Panel A submit label `submit`, Panel A runtime-routed transition, Panel B title `Invalid Commit Hash`, Panel B prompt text exactly `The provided commit hash is invalid. Please go back and provide a valid commit hash.`, Panel B no fields, Panel B `allowedActions: ["back"]`, Panel B back label `back`, Panel B terminal transition, and Panel B `backDestinationPanelId` set to Panel A.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Task 5. Add blind-review deterministic helpers and prompt rendering.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.1. In `blindReviewWorkflow.ts`, add interfaces `BlindReviewSelectedProjectRoot` with `selectedProjectRoot` and `selectedStoryFilename`, and `BlindReviewGitCommandResult` with `exitCode`, `stdout`, and `stderr`; each property must be explicitly typed and no optional properties are allowed.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.2. In `blindReviewWorkflow.ts`, add `PRIMARY_STORY_FILENAME_PATTERN = /^Story-(\d+)-(\d+)\.md$/` and `REMEDIATION_STORY_FILENAME_PATTERN = /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.3. In `blindReviewWorkflow.ts`, add `readWorkflowStringValue(workflowValues: WorkflowValues, key: BlindReviewWorkflowValueKey): string | undefined` that returns the trimmed string only when the workflow value is a non-empty string.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.4. In `blindReviewWorkflow.ts`, add `renderWorkflowValueByKey(input: WorkflowPromptBuilderInput, key: BlindReviewWorkflowValueKey): string` and `renderBlindReviewPromptTemplate(input: WorkflowPromptBuilderInput, template: string): string`; the renderer must replace `<review_commit_parent>`, `<review_commit_hash>`, raw `review_commit_parent`, raw `review_commit_hash`, and raw `blind_review_output` with rendered workflow values, replacing bracketed command placeholders before raw placeholder tokens.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.5. In `blindReviewWorkflow.ts`, add `readFormStringValue(session: ActiveWorkflowSession, key: string): string | undefined` that returns a trimmed string only when `session.ui.formSession?.values[key]` exists with `valueType === "string"` and a non-empty `stringValue`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.6. In `blindReviewWorkflow.ts`, add `resolveBlindReviewStoryProjectRoot(targetStory: string): BlindReviewSelectedProjectRoot | { errorMessage: string }`; it must normalize `targetStory`, derive `selectedStoryFilename` from `basename(...)`, reject filenames that do not match `BLIND_REVIEW_TARGET_STORY_FILENAME_PATTERN`, require the story folder basename to be `stories-review`, require its parent basename to be `implementation`, and return `selectedProjectRoot: dirname(implementationFolder)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.7. In `blindReviewWorkflow.ts`, add `deriveStoryIdentityFromFilename(selectedStoryFilename: string): string | { errorMessage: string }`; it must return `E.S` for `Story-E-S.md`, return `E.S.R` for `Remediation-story-E-S-R.md`, and return an error object when neither approved filename pattern matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.8. In `blindReviewWorkflow.ts`, export `deriveBlindReviewTargetStoryValues(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult>`; it must read `target_story`, fail if missing, derive the project-root result and story identity using Subtasks 5.6 and 5.7, fail with the returned error message when either derivation fails, and succeed with `workflowValueWrites: { [BlindReviewWorkflowValueKey.SelectedStoryIdentity]: selectedStoryIdentity }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.9. In `blindReviewWorkflow.ts`, export `runBlindReviewGitCommand(args: { selectedProjectRoot: string; gitArgs: readonly string[] }): Promise<BlindReviewGitCommandResult>` using `execa("git", [...args.gitArgs], { cwd: args.selectedProjectRoot, shell: false, reject: false })`, and normalize missing numeric `exitCode` to `1`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.10. In `blindReviewWorkflow.ts`, add `gitCommandFailed(result: BlindReviewGitCommandResult): boolean` returning `result.exitCode !== 0`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.11. In `blindReviewWorkflow.ts`, export `validateAndPersistBlindReviewCommit(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult>`; it must read `target_story`, fail if missing, resolve the selected project root from `target_story`, read the form-local `commit_hash`, return succeeded with no writes when the form value is missing, run the three required git commands in order (`rev-parse --is-inside-work-tree`, `rev-parse --verify ${submittedCommitHash}^{commit}`, `rev-parse ${normalizedCommitHash}^`), return succeeded with no writes on any non-zero exit or empty stdout, and on success write `review_commit_hash: normalizedCommitHash` and `review_commit_parent: parentHash`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.12. In `blindReviewWorkflow.ts`, define `BLIND_REVIEW_STEP_2_PROMPT` as a module-local constant whose text is exactly the following block, preserving wording and line order; the only runtime substitutions must be performed by `renderBlindReviewPromptTemplate(...)`:

```text
Your job is to perform a blind adversarial review using git-backed evidence to identify misconfigured or lazily-written code. You are not to read any project documentation during this review.
Use these commit hashes:
commit hash: review_commit_hash
parent hash: review_commit_parent

Use only the provided commit hash and parent hash to inspect the implementation changes.

1. Run `git diff --name-status <review_commit_parent> <review_commit_hash>` to identify every changed, added, deleted, renamed, or copied file.

2. For each changed file from the name-status output, inspect the implementation diff with:
   `git diff <review_commit_parent> <review_commit_hash> -- <path>`
   - Ignore project documents which were included in the name-status output.

3. Review every changed file that is not a project document. Do not skip files because they appear small, generated, deleted, renamed, copied, test-only, or configuration-only.
  - Ignore files located in docs/projects

4. For renamed or copied files, assess both the path change and the content change shown by Git.

5. Do not read the story document, review scope manifest, epics document, architecture document, requirements, action plan, or other planning/source-instruction documents. This is a blind review of the implementation diff only.

6. Based only on the implementation diff, assess the changes using these review lenses:

- Contract pass:
  - For every changed symbol, ask what visible caller, callee, serializer, validator, storage path, UI path, or test depends on this shape, name, default, or behavior.
  - Look for changed code that references symbols, files, routes, tools, values, or tests that were not updated in the same commit.
  - Look for broken or stale imports/exports, inconsistent names/constants, and deleted or renamed files that leave visible stale references.

- Omission pass:
  - Ask what should have changed with this based only on the diff.
  - Look for missing wiring, registrations, migrations, feature flags, permissions, cleanup, or tests that are implied by changed code.

- Failure-path pass:
  - Ignore happy path and test the diff mentally under null, empty, malformed, duplicate, stale, slow, unauthorized, partial, retried, and concurrent conditions.
  - Look for missing error handling around newly introduced failure paths.

- State pass:
  - Track changed state lifecycle by hand: where it is created, transformed, cached, invalidated, retried, rolled back, and cleared.
  - Look for new persistence/writes without a corresponding read/use path visible in the diff.

- Config pass:
  - Check assumptions in constants, defaults, env vars, paths, timeout values, fallback branches, and temporary bypasses.
  - Look for hardcoded values where the diff itself shows an existing constant, enum, helper, or configuration path should be used.

- Compatibility pass:
  - Ask what older callers, persisted data, or partial deploys would do against the changed behavior when that risk is visible from the diff.
  - Look for interface drift: renamed fields, changed enums, altered return shapes, optionality changes, and default changes.

- Type-safety pass:
  - Look for `any`, `as any`, forced casts used instead of narrowing, non-null assertions where runtime absence is possible, incomplete discriminated-union handling, missing explicit return types on new helpers, and truthy/falsy checks where explicit checks are needed.

- Implementation hygiene pass:
  - Look for unused imports, unused helpers, dead branches, commented-out experiments, duplicate logic, partial scaffolding, broad catches, silent fallbacks, optionalized requirements, deferred TODOs, and code that appears added only to satisfy checks rather than to preserve correctness.

- Test skepticism pass:
  - Treat tests as claims, not proof.
  - Look for tests asserting implementation trivia without behavior, incomplete or malformed fixtures, tests updated inconsistently with runtime behavior, happy-path-only coverage, snapshots hiding logic changes, mocks that no longer match reality, and missing regression coverage.

- Behavioral-risk pass:
  - Look for changed conditionals that appear inverted or unreachable.
  - Look for new async operations without awaiting or error handling.
  - Look for boundary violations visible in the diff, such as trust moved from server to client, authorization checked only in UI, skipped sanitization, or path/command injection risk.

7. Document your findings in blind_review_output including:
   - any findings, ordered by severity.
   - for each finding, include:
    - a brief title for the finding
    - file/path references for each finding
    - a detailed description of the finding
   - a clear statement if no actionable issues were found

Once you've completed your review and documented your findings, use attempt_completion to provide a review summary including:
- number of findings, or statement that no findings were identified
- full file path for your output: blind_review_output
```

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.13. In `blindReviewWorkflow.ts`, add `buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` returning `{ currentStepInstructions: renderBlindReviewPromptTemplate(input, BLIND_REVIEW_STEP_2_PROMPT) }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 5.14. In `blindReviewWorkflow.ts`, export `failBlindReviewOutputArtifactAllocation(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult`; it must read `target_story` through `readWorkflowStringValue(...)`, read the concrete backend reason from `session.branchContext.failureState?.terminalErrorMessage ?? "Tool-backed operation failed."`, and return `{ kind: "failed", errorMessage: \`Blind Review output artifact creation failed for target_story ${targetStory}: ${backendReason}\` }`, using `unknown target_story` when `target_story` is absent.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Task 6. Add blind-review decision trees and workflow definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 6.1. In `blindReviewWorkflow.ts`, add `createEmptyPromptSource(): WorkflowStepPromptSource` returning `{}`, and add `createStepDefinition(args: { stepNumber: 1 | 2; checklistLabel: string; decisionTree: WorkflowDecisionTree; buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]; buildToolSchema: WorkflowStepDefinition["buildToolSchema"] }): WorkflowStepDefinition` returning `id: \`step-${args.stepNumber}\``, the provided step number, label, prompt source defaulting to `createEmptyPromptSource`, provided tool-schema builder, and provided decision tree.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 6.2. In `blindReviewWorkflow.ts`, add `sourceRouteMatches(sourceRoute: { branchId: string; routeId: string }, branchId: string, routeId: string): boolean` returning strict equality on both fields; add `toolBackedOperationSucceeded(branchId: string, routeId: string): WorkflowDecisionBranchTrigger` returning an `event_predicate` that matches only `triggerEvent.kind === "tool_backed_operation_succeeded"` and `sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId)`; add `toolBackedOperationFailed(branchId: string, routeId: string): WorkflowDecisionBranchTrigger` returning an `event_predicate` that matches only `triggerEvent.kind === "tool_backed_operation_failed"` and `sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 6.3. In `blindReviewWorkflow.ts`, add `workflowFormPanelSubmitted(panelId: string, action: "submit" | "back"): WorkflowDecisionBranchTrigger` returning an `event_predicate` that matches only `triggerEvent.kind === "workflow_form_panel_submitted"`, `triggerEvent.workflowFormId === BLIND_REVIEW_STEP_1_FORM_ID`, `triggerEvent.panelId === panelId`, and `triggerEvent.action === action`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 6.4. In `blindReviewWorkflow.ts`, add `attemptCompletionSucceeded(): WorkflowDecisionBranchTrigger` returning exactly `{ kind: "on_event", eventKind: "attempt_completion_succeeded" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 6.5. In `blindReviewWorkflow.ts`, add `reviewEvidenceValuesArePresent(): WorkflowDecisionBranchTrigger` and `reviewEvidenceValuesAreMissing(): WorkflowDecisionBranchTrigger`; both must be `session_predicate` triggers using `readWorkflowStringValue(...)`, where present means `target_story`, `review_commit_hash`, and `review_commit_parent` are all non-empty strings, and missing means at least one of those three values is absent.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 6.6. In `blindReviewWorkflow.ts`, add `reviewCommitHashIsValid(): WorkflowDecisionBranchTrigger` and `reviewCommitHashIsInvalid(): WorkflowDecisionBranchTrigger`; both must be `session_predicate` triggers using `readWorkflowStringValue(...)`, where valid means `review_commit_hash` and `review_commit_parent` are both non-empty strings, and invalid means either value is absent.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 6.7. In `blindReviewWorkflow.ts`, add `buildStep1ContinuationReplacementBuilder(panelId: string): WorkflowFormContinuationReplacementBuilder` returning the requested panel from `buildBlindReviewStep1WorkflowForm()` and `{ data: {} }`, throwing an error if the panel id is missing.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 6.8. In `blindReviewWorkflow.ts`, add `buildStep1DecisionTree(): WorkflowDecisionTree` with entry branch `step-1-route-by-existing-values`; that branch must first route `reviewEvidenceValuesArePresent()` to `run_deterministic_procedure` using `deriveBlindReviewTargetStoryValues` with `followingBranchId: "step-1-allocate-blind-review-output"`, and must route `reviewEvidenceValuesAreMissing()` to `resolve_prerequisite_files` for `[BLIND_REVIEW_TARGET_STORY_PREREQUISITE_ID]` with `followingBranchId: "step-1-derive-target-story-values"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 6.9. In `blindReviewWorkflow.ts`, complete `buildStep1DecisionTree()` with main-agent branches `step-1-derive-target-story-values`, `step-1-render-commit-hash-panel`, `step-1-await-commit-form-panel`, and `step-1-route-after-commit-validation`; these branches must run `deriveBlindReviewTargetStoryValues`, render Panel A through `render_workflow_form`, wait for Panel A submit, run `validateAndPersistBlindReviewCommit`, route `reviewCommitHashIsValid()` to `step-1-allocate-blind-review-output`, and route `reviewCommitHashIsInvalid()` to `continue_workflow_form` for Panel B with `followingBranchId: "step-1-await-commit-form-panel"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 6.10. In `blindReviewWorkflow.ts`, complete `buildStep1DecisionTree()` so `step-1-allocate-blind-review-output` performs `allocate_artifact` for `BLIND_REVIEW_OUTPUT_ARTIFACT_ID`; the allocation success route in `step-1-await-blind-review-output-allocation` must match `tool_backed_operation_succeeded` from branch `step-1-allocate-blind-review-output` and route `step-1-allocate-blind-review-output`, then perform `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } }`; the allocation failure route in the same branch must match `tool_backed_operation_failed` from the same source route and run `failBlindReviewOutputArtifactAllocation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 6.11. In `blindReviewWorkflow.ts`, add `buildStep2DecisionTree(): WorkflowDecisionTree` with entry branch `step-2-project-prompt`; it must project the prompt, set `followingBranchId: "step-2-await-attempt-completion"`, and route `attempt_completion_succeeded` to `{ kind: "complete_workflow" }` without any story index update, story move, remediation story generation, subagent dispatch, workflow progress request, or parent-state mutation action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Subtask 6.12. In `blindReviewWorkflow.ts`, export `blindReviewWorkflowDefinition: WorkflowDefinition` with the constants, persona, `projectSubfolder`, `workflowValueKeys`, `entryProjectValueKeys`, `entryPanel.promptMarkdown` equal to `BLIND_REVIEW_WORKFLOW_DESCRIPTION`, `workflowForms` containing only `BLIND_REVIEW_STEP_1_FORM_ID`, `prerequisiteFiles: BLIND_REVIEW_PREREQUISITE_FILES`, `artifacts: BLIND_REVIEW_ARTIFACTS`, `childInheritance` containing exactly `{ parentKey: "review_commit_hash", childKey: "review_commit_hash" }`, `{ parentKey: "review_commit_parent", childKey: "review_commit_parent" }`, and `{ parentKey: "target_story", childKey: "target_story" }`, and exactly two steps with checklist labels `Prepare Inputs & Set Workflow Variables` and `Perform Blind Adversarial Review`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

[x] Task 7. Add module exports.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/index.ts`

[x] Subtask 7.1. Add `index.ts` exporting `buildBlindReviewStep1ToolSchemas` and `buildBlindReviewStep2ToolSchemas` from `blindReviewToolSchemas.ts`, and exporting these exact names from `blindReviewWorkflow.ts`: `blindReviewWorkflowDefinition`, `BlindReviewWorkflowValueKey`, `BLIND_REVIEW_WORKFLOW_NAME`, `BLIND_REVIEW_WORKFLOW_SLASH_COMMAND_NAME`, `BLIND_REVIEW_WORKFLOW_USE_SKILL_NAME`, `BLIND_REVIEW_WORKFLOW_DISPLAY_NAME`, `BLIND_REVIEW_WORKFLOW_DESCRIPTION`, `BLIND_REVIEW_WORKFLOW_PROJECT_SUBFOLDER`, `BLIND_REVIEW_WORKFLOW_PERSONA`, `BLIND_REVIEW_WORKFLOW_VALUE_KEYS`, `BLIND_REVIEW_ENTRY_PROJECT_VALUE_KEYS`, `BLIND_REVIEW_TARGET_STORY_PREREQUISITE_ID`, `BLIND_REVIEW_TARGET_STORY_FILENAME_PATTERN`, `BLIND_REVIEW_PREREQUISITE_FILES`, `BLIND_REVIEW_OUTPUT_ARTIFACT_ID`, `BLIND_REVIEW_ARTIFACTS`, `BLIND_REVIEW_STEP_1_FORM_ID`, `BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`, `BLIND_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID`, `BLIND_REVIEW_COMMIT_HASH_FIELD_KEY`, `buildBlindReviewStep1WorkflowForm`, `deriveBlindReviewTargetStoryValues`, `runBlindReviewGitCommand`, `validateAndPersistBlindReviewCommit`, and `failBlindReviewOutputArtifactAllocation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/index.ts`

[x] Task 8. Add focused workflow module tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 8.1. Add `blindReviewWorkflow.test.ts` with direct imports from the blind-review module, not `WorkflowRegistry`; define `PROJECT_ROOT`, `TARGET_STORY_PATH`, `REVIEW_FOLDER_PATH`, `SAMPLE_WORKFLOW_VALUES`, `createSession(...)`, `buildCommitFormSession(commitHash: string)`, `getStep(...)`, `findRoute(...)`, `getWorkflowForm(...)`, `getPanel(...)`, `getSingleField(...)`, `renderWorkflowValue(...)`, `createPromptInput(...)`, `buildPrompt(...)`, `getToolNamesForStep(...)`, `buildWorkflowFormPanelSubmittedEvent(...)`, `buildToolBackedOperationSucceededEvent(...)`, `buildToolBackedOperationFailedEvent(...)`, `buildAttemptCompletionSucceededEvent(...)`, `expectActionKind(...)`, `expectTransitionStepAction(...)`, `expectEventPredicateMatches(...)`, `expectSessionPredicateMatches(...)`, and `expectSucceeded(...)` with explicit return types and no casts; `buildCommitFormSession(...)` must return a complete `WorkflowFormSessionState` with `sessionId`, `workflowFormId`, `definitionVersion`, `definitionPayload`, `firstPanelId`, `currentPanelId`, `values`, and `data`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 8.2. In `blindReviewWorkflow.test.ts`, add a workflow identity test asserting the exact workflow name, display name, description, slash command, use-skill name, project subfolder, Jasmine persona object, entry panel description reuse, workflow value keys, entry project value keys, and exact `childInheritance` array.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 8.3. In `blindReviewWorkflow.test.ts`, add a prerequisite declaration test asserting the single `target_story` prerequisite exactly matches `BLIND_REVIEW_PREREQUISITE_FILES`, uses producing workflow `dev-story`, scans `["implementation", "stories-review"]`, writes `BlindReviewWorkflowValueKey.TargetStory`, uses `outputDocumentReference: "none"`, and accepts `Story-1-1.md` and `Remediation-story-1-1-1.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 8.4. In `blindReviewWorkflow.test.ts`, add an artifact declaration test asserting `blindReviewWorkflowDefinition.artifacts` equals `BLIND_REVIEW_ARTIFACTS`, the only artifact id is `BLIND_REVIEW_OUTPUT_ARTIFACT_ID`, family is `WorkflowArtifactFamily.BlindReviewOutput`, intent mode is `derived`, target identity source is `SelectedStoryIdentity`, and output value keys map to the blind-review artifact metadata keys and `BlindReviewOutput`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 8.5. In `blindReviewWorkflow.test.ts`, add a Step 1 form test asserting Panel A and Panel B titles, promptMarkdown values, field shape, allowed actions, action labels, runtime-routed Panel A transition, terminal Panel B transition, and Panel B back destination exactly match the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 8.6. In `blindReviewWorkflow.test.ts`, add a step-label and tool-surface test asserting Step 1 label `Prepare Inputs & Set Workflow Variables`, Step 2 label `Perform Blind Adversarial Review`, Step 1 tool names `[]`, Step 2 tool names exactly the approved ten-tool list, and all forbidden model-facing tool names from Subtask 2.4 are absent from both steps.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 8.7. In `blindReviewWorkflow.test.ts`, add a Step 1 routing test asserting the entry branch first routes complete `target_story`, `review_commit_hash`, and `review_commit_parent` values to `deriveBlindReviewTargetStoryValues`, routes missing values to `resolve_prerequisite_files`, then derives target story values, renders Panel A, validates Panel A submission, routes invalid commit metadata to Panel B, routes valid commit metadata to artifact allocation, transitions to Step 2 only after the allocation success event, and routes the allocation failure event to `failBlindReviewOutputArtifactAllocation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 8.8. In `blindReviewWorkflow.test.ts`, add tests for `deriveBlindReviewTargetStoryValues(...)` proving `Story-1-1.md` writes `selected_story_identity: "1.1"`, `Remediation-story-1-1-1.md` writes `selected_story_identity: "1.1.1"`, a missing `target_story` returns `kind: "failed"`, a wrong filename returns `kind: "failed"`, and a path outside `implementation/stories-review` returns `kind: "failed"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 8.9. In `blindReviewWorkflow.test.ts`, add tests for `validateAndPersistBlindReviewCommit(...)` using a temporary Git repository: initialize the repo, set local `user.email` and `user.name`, create two commits, submit the second commit through `buildCommitFormSession(secondCommitHash)`, assert successful writes for normalized `review_commit_hash` and `review_commit_parent`, then assert missing form value, invalid commit hash, root commit parent resolution failure, and non-Git project root all return `kind: "succeeded"` without commit workflow writes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 8.10. In `blindReviewWorkflow.test.ts`, add a Step 2 prompt test asserting the prompt is non-empty, includes materialized `review_commit_hash`, `review_commit_parent`, and `blind_review_output` values, includes command text `git diff --name-status def456 abc123` and `git diff def456 abc123 -- <path>` when using `SAMPLE_WORKFLOW_VALUES`, does not include raw `review_commit_hash`, raw `review_commit_parent`, or raw `blind_review_output`, and does not include the absolute `target_story` path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 8.11. In `blindReviewWorkflow.test.ts`, add a Step 2 completion-routing test asserting the `attempt_completion_succeeded` route action is exactly `{ kind: "complete_workflow" }` and that Step 2 contains no actions of kind `update_story_index_status`, `move_project_file`, `run_deterministic_procedure`, `allocate_artifact`, `execute_tool_backed_operation`, or `transition_step`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Task 9. Run Phase 2 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 9.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 9.2. Run `npm run check-types`; if it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 9.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

### Phase 3 - Registry And Prompt Projection

After completing this phase, pause for QA review before final validation.

[x] Task 10. Register blind-review as a shipped workflow.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 10.1. In `WorkflowRegistry.ts`, import `blindReviewWorkflowDefinition` from `@/core/task/workflow-runtime/workflow-modules/blind-review` and add it to `shippedWorkflowDefinitions` after `codeReviewWorkflowDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[x] Subtask 10.2. In `blindReviewWorkflow.test.ts`, add a registry test asserting `resolveWorkflowDefinition("blind-review")`, `resolveWorkflowBySlashCommand("blind-review")`, and `resolveWorkflowByUseSkillName("blind-review")` all return `blindReviewWorkflowDefinition`, and asserting `blind-review.md` returns `undefined` through all three resolver APIs.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 10.3. In `blindReviewWorkflow.test.ts`, add a child-style activation test importing `TaskState`, `WorkflowRuntime`, and type `WorkflowWorkspacePathPolicy`; construct `const workspacePathPolicy: WorkflowWorkspacePathPolicy = { validateAccess: () => true }`, `const runtime = new WorkflowRuntime({ cwd: PROJECT_ROOT, workspacePathPolicy })`, `const taskState = new TaskState()`, and a parent `ActiveWorkflowSession` from `createSession(SAMPLE_WORKFLOW_VALUES)`; call `runtime.activateWorkflow({ taskState, workflowName: "blind-review", parentSession })`; assert the first returned action kind is not `render_workflow_form`, `taskState.activeWorkflowSession?.workflowValues` contains inherited `target_story`, `review_commit_hash`, and `review_commit_parent`, `taskState.activeWorkflowSession?.projectSelection` deeply equals the parent project selection, and the child project-selection object is not the same object reference as `parentSession.projectSelection`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Subtask 10.4. In `blindReviewWorkflow.test.ts`, add an artifact allocation failure test using the `TaskState`, `WorkflowRuntime`, and `WorkflowWorkspacePathPolicy` imports from Subtask 10.3; construct a `WorkflowRuntime` with `cwd: PROJECT_ROOT` and `validateAccess: () => true`, set `taskState.activeWorkflowName = "blind-review"`, set `taskState.activeWorkflowSession = createSession(SAMPLE_WORKFLOW_VALUES, PROJECT_ROOT, { activeBranchId: "step-1-await-blind-review-output-allocation", lastTriggerEvent: buildToolBackedOperationFailedEvent("step-1-allocate-blind-review-output", "step-1-allocate-blind-review-output"), failureState: { retryAttemptCount: 1, terminalErrorMessage: "backend failure" } })`, call `runtime.resolveNextAction({ taskState })`, and assert the returned action is `{ kind: "terminal_error", errorMessage: \`Blind Review output artifact creation failed for target_story ${TARGET_STORY_PATH}: backend failure\` }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`

[x] Task 11. Add blind-review prompt integration coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.1. In `integration.test.ts`, import `blindReviewWorkflowDefinition`, `BlindReviewWorkflowValueKey`, and `buildBlindReviewStep2ToolSchemas` from the blind-review module.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.2. In `integration.test.ts`, add blind-review prompt fixture constants for target story, selected story identity, review commit hash, review commit parent, review folder, blind review output path, artifact family, artifact identity, artifact filename, and artifact relative path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.3. In `integration.test.ts`, add `type BlindReviewPromptStepNumber = 2`, `getBlindReviewEntryBranchId(activeStepNumber: BlindReviewPromptStepNumber): string`, `createBlindReviewWorkflowValues(overrides: WorkflowValues = {}): WorkflowValues`, `createBlindReviewWorkflowSession(activeStepNumber: BlindReviewPromptStepNumber, workflowValues: WorkflowValues = createBlindReviewWorkflowValues()): ActiveWorkflowSession`, and `buildBlindReviewPromptContext(...)`; the session object must include all required `ActiveWorkflowSession` fields and the helper return types must be explicit.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.4. In `integration.test.ts`, add a native GPT-5 prompt-projection test that calls the existing projected-tool helper style for active blind-review Step 2 and asserts the projected tools match `buildBlindReviewStep2ToolSchemas()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.5. In `integration.test.ts`, add a blind-review Step 2 prompt payload test asserting full-turn and continuation payload blocks are non-empty, include materialized commit hash, parent hash, and blind review output path, and do not include raw `review_commit_hash`, `review_commit_parent`, or `blind_review_output` placeholders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.6. In `integration.test.ts`, add a blind-review forbidden-tool prompt-projection test asserting `workflowToolSchemaOverride` and native GPT-5 tools do not include `web_search`, `web_fetch`, `browser_action`, `ask_followup_question`, `use_subagents`, `use_skill`, `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `workflow_progress_request`, `use_mcp_tool`, `access_mcp_resource`, `load_mcp_documentation`, `build_review_input`, `build_review_diff_output`, `code_review_spec_update`, or `record_findings`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.7. In `integration.test.ts`, add a non-native prompt-projection test using the active blind-review Step 2 context with `providerInfo: makeProviderInfo("gpt-3", "openai")` and `enableNativeToolCalls: false`; assert `tools` is `undefined`, `systemPrompt` includes every approved Step 2 tool name, and `systemPrompt` does not include any forbidden tool name listed in Subtask 11.6.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Task 12. Run Phase 3 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 12.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 12.2. Run `npm run check-types`; if it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 12.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

### Phase 4 - Final Validation

[x] Task 13. Run final validation for the blind-review workflow module.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 13.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 13.2. Run `npm run check-types`; if it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 13.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

[x] Subtask 13.4. Run `git diff --name-only` and verify the persistent diff is limited to files allowed by this action plan plus checkbox updates in this file.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/blind-review/action-plan.md`

## Validation

Each implementation phase contains its own focused validation before the QA pause. Final validation is:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
git diff --name-only
```

If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run:

```bash
npm run protos
npm run check-types
```

Do not treat a proto-generation or host-probing failure as a TypeScript implementation defect until `npm run protos` and the exact blocked validation command have been rerun.
