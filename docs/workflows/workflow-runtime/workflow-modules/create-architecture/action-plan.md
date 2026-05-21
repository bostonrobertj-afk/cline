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

This plan builds and registers the product-owned `create-architecture` workflow module described by [create-architecture-requirements.md](./create-architecture-requirements.md).

This plan also includes the minimum shared runtime support required by the create-architecture requirements:

- a runtime-owned singleton artifact family for `architecture.md`
- create-architecture module-owned document builders
- create-architecture module-owned per-step tool schemas
- create-architecture workflow definition, workflow form, prompt builders, decision trees, and registry wiring
- module, runtime, handler, and prompt-projection tests proving the workflow is deployable

Sibling-pattern audit summary:

- Artifact family registration must touch `artifactFamilies.ts`, `types.ts`, `WorkflowRuntime.ts`, and runtime/tool tests.
- Module-owned document creation must live in `createArchitectureDocument.ts` and must not read `architecture-template.md` at runtime.
- Prompt/tool exposure must live only in `createArchitectureToolSchemas.ts` through workflow step `buildToolSchema` delegation.
- Module registration must touch `WorkflowRegistry.ts`, runtime registry coverage, use-skill coverage, and prompt projection tests.

## Scope Boundary

- Do not migrate any workflow other than `create-architecture`.
- Do not implement `create-epics`, `create-prd`, `quick-spec`, or any other planning workflow in this plan.
- Do not read `/Users/robertboston/Documents/Cline/Workflows/create-architecture.md`, `architecture-template.md`, `_bmad/bmm/agents/architect.md`, BMAD workflow package files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime.
- Do not add workflow-specific backend tools for create-architecture.
- Do not add static/default prompt or native-tool schemas for `create_workflow_artifact`, `build_workflow_document`, `set_workflow_values`, or `workflow_progress_request`.
- Do not expose `create_workflow_artifact`, `build_workflow_document`, or `set_workflow_values` in any create-architecture model-facing step.
- Do not expose `execute_command` in the create-architecture workflow.
- Do not add module-local artifact filename, identity, numbering, discovery, path-resolution, or path-policy logic.
- Do not add compatibility aliases for `create-architecture.md`; the runtime workflow identity is `create-architecture`.

## Known Issues / Risks / Technical Debt

- Create-architecture user-facing workflow form and prompt copy is prescribed by the module requirements. The current workflow-runtime module pattern stores module-owned copy in workflow definition and prompt-builder code rather than a `strings.xml`-style resource file. This plan follows that existing approved pattern and requires tests around the module-owned copy.
- The legacy contextual tool matrix is reference material only. This plan uses the tool schema lists already prescribed in `create-architecture-requirements.md`; it does not reintroduce matrix-driven tool exposure.

## Tasks / Subtasks

### Phase 1 - Shared Runtime Artifact Support Required By Create Architecture

After completing this phase, pause for QA review before moving to Phase 2.

[x] Task 1. Add the runtime-owned `architecture.md` artifact family.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 1.1. In `src/core/task/workflow-runtime/artifactFamilies.ts`, add `WorkflowArtifactFamily.ArchitectureDocument = "architecture_document"` immediately after `WorkflowArtifactFamily.BrainstormingSession`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 1.2. In `src/core/task/workflow-runtime/artifactFamilies.ts`, extend `WorkflowSingletonProjectArtifactFamilyDefinition.family` so it includes `WorkflowArtifactFamily.ArchitectureDocument`, and extend `WorkflowSingletonProjectArtifactFamilyDefinition.singletonIdentity` so it includes `"architecture_document"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 1.3. In `src/core/task/workflow-runtime/artifactFamilies.ts`, add a `WORKFLOW_ARTIFACT_FAMILY_REGISTRY` entry for `WorkflowArtifactFamily.ArchitectureDocument` with allocation mode `singleton_project`, identity requirement `none`, filename pattern `architecture.md`, file extension `.md`, content kind `markdown`, numbering scope `project_singleton`, singleton identity `architecture_document`, and discovery pattern `/^architecture\.md$/`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 1.4. In `src/core/task/workflow-runtime/types.ts`, extend the singleton-project branch of `WorkflowArtifactDefinition` so `family` may be `WorkflowArtifactFamily.ArchitectureDocument`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 1.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add `WorkflowArtifactFamily.ArchitectureDocument` to the singleton identity branch in `resolveWorkflowArtifactIdentity(...)` so it returns the registry-owned `singletonIdentity`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 1.6. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add `WorkflowArtifactFamily.ArchitectureDocument` to the no-parsed-identity branch in `parseWorkflowArtifactFilenameIdentity(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 1.7. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving a workflow artifact definition using `WorkflowArtifactFamily.ArchitectureDocument` resolves to `<cwd>/docs/projects/architecture-artifact-project/planning/architecture.md`, persists `architecture_document` as artifact identity, uses `architecture.md` as artifact filename, and maps `artifactAbsolutePath` into module-defined `output_file`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 1.8. In `src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`, add handler coverage proving `create_workflow_artifact` can create the architecture singleton artifact through a real `WorkflowRuntime` and returns `artifact_family: "architecture_document"`, `artifact_identity: "architecture_document"`, `artifact_filename: "architecture.md"`, `artifact_relative_path: path.join("planning", "architecture.md")`, and `persisted_artifact_output_values.output_file` equal to the created absolute path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

### Phase 2 - Create Architecture Module Document And Tool-Schema Helpers

After completing this phase, pause for QA review before moving to Phase 3.

[x] Task 2. Create the module-owned architecture document builder.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureDocument.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts`

[x] Subtask 2.1. Create `src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureDocument.ts` with exported heading constants for every required heading in `create-architecture-requirements.md`: `Scope, Context, & Goals`, `Relevant Context`, `Scope`, `Architectural goals`, `Core architectural rules`, `Project Context Analysis`, `Interpretation`, `Responsibility boundaries`, `Durable vs transient ownership`, `Required additional baseline for authority enforcement`, `Current code assessment`, `Aligned`, `Partially aligned`, `Not aligned / conflicts`, `Key tradeoffs and risks`, `Tradeoffs`, `Risks`, `Project Blast Radius`, `Dependencies`, and `Project Roadmap`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureDocument.ts`

[x] Subtask 2.2. In `createArchitectureDocument.ts`, export `buildInitialCreateArchitectureDocument(): string` that returns exactly the heading shell from `docs/workflows/workflow-runtime/workflow-modules/create-architecture/architecture-template.md`, with blank lines between headings and a final trailing newline, without reading the template file or importing `fs`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureDocument.ts`

[x] Subtask 2.3. In `createArchitectureDocument.ts`, export `buildCreateArchitectureDocumentFromSession(session: ActiveWorkflowSession): string` that renders the same heading shell and inserts non-empty rendered workflow values under these headings only: `context_files` under `Relevant Context`, `scope` under `Scope`, `architectural_goals` under `Architectural goals`, and `core_architectural_rules` under `Core architectural rules`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureDocument.ts`

[x] Subtask 2.4. Create `src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts` with coverage proving `buildInitialCreateArchitectureDocument()` returns the exact required heading shell.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts`

[x] Subtask 2.5. In `createArchitectureDocument.test.ts`, add coverage proving `buildCreateArchitectureDocumentFromSession(...)` writes `context_files`, `scope`, `architectural_goals`, and `core_architectural_rules` under the matching headings, omits optional empty values, preserves the remaining empty headings, and does not render the boolean control values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts`

[x] Task 3. Create the module-owned create-architecture tool-schema helpers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts`

[x] Subtask 3.1. Create `src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts` importing `ClineToolSpec`, `AGENT_FEEDBACK_PARAMETER`, `ModelFamily`, and `ClineDefaultTool`, and define one module-local constant `CREATE_ARCHITECTURE_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.2. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureStep1ToolSchemas(): readonly ClineToolSpec[]` returning an empty readonly array.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.3. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureStep2ToolSchemas(): readonly ClineToolSpec[]` returning an empty readonly array.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.4. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureReadFileToolSchema(): ClineToolSpec` using `ClineDefaultTool.FILE_READ`, name `read_file`, one required string `path` parameter, and the same description/instruction shape used by `buildBrainstormingReadFileToolSchema`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.5. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureReadFileRangeToolSchema(): ClineToolSpec` using `ClineDefaultTool.FILE_READ_RANGE`, name `read_file_range`, and exactly three required parameters: string `path`, integer `start_line`, and integer `end_line`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.6. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureListFilesToolSchema(): ClineToolSpec` using `ClineDefaultTool.LIST_FILES`, name `list_files`, one required string `path` parameter, and one optional boolean `recursive` parameter.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.7. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureSearchFilesToolSchema(): ClineToolSpec` using `ClineDefaultTool.SEARCH`, name `search_files`, required string `path` and `regex` parameters, and optional string `file_pattern` parameter.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.8. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureListCodeDefinitionNamesToolSchema(): ClineToolSpec` using `ClineDefaultTool.LIST_CODE_DEF`, name `list_code_definition_names`, and one required string `path` parameter.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.9. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureApplyPatchToolSchema(): ClineToolSpec` using `ClineDefaultTool.APPLY_PATCH`, name `apply_patch`, one required string `input` parameter, and the same description/instruction shape used by `buildBrainstormingApplyPatchToolSchema`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.10. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureSendUserMessageToolSchema(): ClineToolSpec` using `ClineDefaultTool.SEND_USER_MESSAGE`, name `send_user_message`, one required string `message` parameter, and `AGENT_FEEDBACK_PARAMETER`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.11. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureAskFollowupQuestionToolSchema(): ClineToolSpec` using `ClineDefaultTool.ASK`, name `ask_followup_question`, required string `question`, required string-array `options`, and `AGENT_FEEDBACK_PARAMETER`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.12. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureWorkflowProgressRequestToolSchema(): ClineToolSpec` using `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST`, name `workflow_progress_request`, and no parameters.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.13. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureAttemptCompletionToolSchema(): ClineToolSpec` using `ClineDefaultTool.ATTEMPT`, name `attempt_completion`, and one required string `result` parameter.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.14. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureStep3ToolSchemas(): readonly ClineToolSpec[]` returning exactly `read_file`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`, in that order.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.15. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureStep4ToolSchemas(): readonly ClineToolSpec[]` returning exactly `list_files`, `search_files`, `list_code_definition_names`, `read_file`, `read_file_range`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`, in that order.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.16. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureStep5ToolSchemas`, `buildCreateArchitectureStep6ToolSchemas`, `buildCreateArchitectureStep7ToolSchemas`, and `buildCreateArchitectureStep8ToolSchemas` as direct aliases of `buildCreateArchitectureStep4ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.17. In `createArchitectureToolSchemas.ts`, export `buildCreateArchitectureStep9ToolSchemas(): readonly ClineToolSpec[]` returning exactly `read_file`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `attempt_completion`, in that order.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureToolSchemas.ts`

[x] Subtask 3.18. Create `src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts` with coverage proving Step 1 and Step 2 return empty arrays, Step 3 returns the exact five-tool schema, Steps 4 through 8 return the exact nine-tool schema, and Step 9 returns the exact five-tool completion schema.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts`

[x] Subtask 3.19. In `createArchitectureToolSchemas.test.ts`, add coverage proving no create-architecture step schema includes `create_workflow_artifact`, `build_workflow_document`, `set_workflow_values`, or `execute_command`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts`

### Phase 3 - Create Architecture Workflow Definition

After completing this phase, pause for QA review before moving to Phase 4.

[x] Task 4. Create the create-architecture workflow definition and module export.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 4.1. Create `src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts` importing workflow form types, `WorkflowArtifactFamily`, workflow runtime types, `buildInitialCreateArchitectureDocument`, `buildCreateArchitectureDocumentFromSession`, and every create-architecture step tool-schema builder.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.2. In `createArchitectureWorkflow.ts`, add enum `CreateArchitectureWorkflowValueKey` with exactly these values: `projectMode`, `projectTitle`, `projectFolderName`, `has_context_files`, `context_files`, `scope`, `has_architectural_goals`, `architectural_goals`, `has_core_architectural_rules`, `core_architectural_rules`, `output_file`, `output_artifact_family`, `output_artifact_identity`, `output_artifact_filename`, and `output_artifact_relative_path`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.3. In `createArchitectureWorkflow.ts`, add constants `CREATE_ARCHITECTURE_WORKFLOW_DISPLAY_NAME = "Create Architecture"`, `CREATE_ARCHITECTURE_WORKFLOW_DESCRIPTION = "Create a complete architecture document through collaborative discovery, explicit design decisions, and a final readiness review."`, `ARCHITECTURE_DOCUMENT_ARTIFACT_ID = "architecture_document"`, and `STEP_2_INPUT_FORM_ID = "step-2-user-input-form"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.4. In `createArchitectureWorkflow.ts`, add `CREATE_ARCHITECTURE_WORKFLOW_PERSONA: WorkflowPersonaDefinition` with `name: "Winston"`, `role: "Architect"`, `identity: "Designs scalable systems and chooses practical technology with care."`, capabilities `["distributed systems", "cloud", "API design", "scalability"]`, communication style `Calm, pragmatic, and tradeoff-aware.`, and the two principles prescribed in `create-architecture-requirements.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.5. In `createArchitectureWorkflow.ts`, add `CREATE_ARCHITECTURE_WORKFLOW_VALUE_KEYS` containing every `CreateArchitectureWorkflowValueKey` enum member exactly once.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.6. In `createArchitectureWorkflow.ts`, add `buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"]` returning a terminal conditional transition using `conditionSourceKey: "__terminal__"`, no branches, and `defaultTerminal: true`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.6a. In `createArchitectureWorkflow.ts`, add `sourceRouteMatches(sourceRoute: { branchId: string; routeId: string }, branchId: string, routeId: string): boolean` returning true only when both fields match exactly.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.6b. In `createArchitectureWorkflow.ts`, add `toolBackedOperationSucceeded(branchId: string, routeId: string): WorkflowDecisionBranchTrigger` matching only `tool_backed_operation_succeeded` events whose `sourceRoute` matches the supplied branch and route.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.6c. In `createArchitectureWorkflow.ts`, add `toolBackedOperationFailed(branchId: string, routeId: string): WorkflowDecisionBranchTrigger` matching only `tool_backed_operation_failed` events whose `sourceRoute` matches the supplied branch and route.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.6d. In `createArchitectureWorkflow.ts`, add `workflowFormCompleted(workflowFormId: string): WorkflowDecisionBranchTrigger` matching only `workflow_form_completed` events for the supplied workflow form id.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.6e. In `createArchitectureWorkflow.ts`, add `workflowProgressRequestConfirmed(): WorkflowDecisionBranchTrigger` returning the direct `on_event` trigger for `workflow_progress_request_confirmed`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.6f. In `createArchitectureWorkflow.ts`, add `workflowProgressRequestDenied(): WorkflowDecisionBranchTrigger` returning the direct `on_event` trigger for `workflow_progress_request_denied`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.6g. In `createArchitectureWorkflow.ts`, add `replaceOutputFilePlaceholder(input: WorkflowPromptBuilderInput, prompt: string): string` that replaces every `{output_file}` placeholder with `input.renderWorkflowValue(CreateArchitectureWorkflowValueKey.OutputFile)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.6h. In `createArchitectureWorkflow.ts`, add `createStepDefinition(args: { stepNumber: number; checklistLabel: string; decisionTree: WorkflowDecisionTree; buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]; buildToolSchema: WorkflowStepDefinition["buildToolSchema"] }): WorkflowStepDefinition` that sets `id` to `step-${args.stepNumber}`, uses the supplied `buildToolSchema` directly, and does not include any fallback empty schema body.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.7. In `createArchitectureWorkflow.ts`, implement `buildStep2InputWorkflowForm(): WorkflowFormDefinitionPayload` with seven panels matching `create-architecture-requirements.md`, using boolean fields for yes/no panels, `large_text` fields with `textareaSize: "large"` for user text panels, durable `workflowValueKey` destinations for every collected value, required validation on every field, and stale clearing for `context_files`, `architectural_goals`, and `core_architectural_rules` when the controlling boolean is false.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.8. In `createArchitectureWorkflow.ts`, implement `buildStep1DecisionTree()` so Step 1 always allocates `ARCHITECTURE_DOCUMENT_ARTIFACT_ID`, retries allocation exactly once after the first allocation failure, builds the initial document shell through `build_workflow_document` after allocation success, transitions to Step 2 after shell build success, and routes retry failure or shell build failure to `terminal_error` with architecture-specific error text.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.9. In `createArchitectureWorkflow.ts`, implement `buildStep2DecisionTree()` so Step 2 always renders `STEP_2_INPUT_FORM_ID`, builds the submitted-values document through `build_workflow_document` after that form completes, transitions to Step 3 after document write success, and routes document write failure to `terminal_error` with architecture-specific error text.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.10. In `createArchitectureWorkflow.ts`, implement one shared `buildProgressionDecisionTree(currentStepNumber: 3 | 4 | 5 | 6 | 7 | 8, nextStepNumber: 4 | 5 | 6 | 7 | 8 | 9): WorkflowDecisionTree` helper that returns `project_prompt` on entry, transitions to the next step on `workflow_progress_request_confirmed`, and returns to `project_prompt` on `workflow_progress_request_denied`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.11. In `createArchitectureWorkflow.ts`, implement `buildStep9DecisionTree()` so Step 9 returns `project_prompt` on entry and relies on normal `attempt_completion` workflow teardown rather than a workflow-specific completion handler.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.12. In `createArchitectureWorkflow.ts`, add the Step 3 prompt source so it instructs the model to read `{output_file}`, use relevant context files when useful, draft and save approved `Project Context Analysis` content, ensure the initial input sections are sufficient, draft and save approved `Interpretation` content, and then use `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.12a. In `createArchitectureWorkflow.ts`, add the Step 4 prompt source so it instructs the model to guide `Responsibility Boundaries`, `Durable vs Transient Ownership`, and `Required Additional Baseline for Authority Enforcement`, keep the content grounded in context/code/tests, save approved content to `{output_file}`, and then use `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.12b. In `createArchitectureWorkflow.ts`, add the Step 5 prompt source so it instructs the model to assess runtime code and tests, write findings under `Aligned`, `Partially aligned`, and `Not aligned / conflicts`, brief the user, revise as needed, and then use `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.12c. In `createArchitectureWorkflow.ts`, add the Step 6 prompt source so it instructs the model to identify tradeoffs and risks from `{output_file}`, perform additional code assessment if needed, save approved content under `Tradeoffs` and `Risks`, and then use `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.12d. In `createArchitectureWorkflow.ts`, add the Step 7 prompt source so it instructs the model to draft comprehensive project blast radius content, include files/modules/directories/shared components/integration boundaries, save approved content under `Project Blast Radius`, and then use `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.12e. In `createArchitectureWorkflow.ts`, add the Step 8 prompt source so it instructs the model to identify dependencies, save approved dependencies under `Dependencies`, build a sequencing roadmap based on dependencies and blast radius, save approved roadmap content under `Project Roadmap`, and then use `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.12f. In `createArchitectureWorkflow.ts`, add the Step 9 prompt source so it instructs the model to review the full architecture for coherence and pattern/structure alignment, classify issues as critical/important/minor, ask the user how to resolve critical issues, offer refinements for important/minor issues, and use `attempt_completion` with the required completion summary when ready.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.12g. In `createArchitectureWorkflow.ts`, verify every Step 3 through Step 9 prompt source uses `{output_file}` as the only output-document placeholder and does not reference legacy workflow file names, BMAD files, placeholder workflow surfaces, `build_workflow_document`, or `set_workflow_values`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.13. In `createArchitectureWorkflow.ts`, export `createArchitectureWorkflowDefinition: WorkflowDefinition` with `name`, `slashCommandName`, and `useSkillName` all set to `create-architecture`, `displayName`, `description`, and `persona` set to the constants above, `projectSubfolder: "planning"`, `workflowValueKeys` set to `CREATE_ARCHITECTURE_WORKFLOW_VALUE_KEYS`, and `entryPanel.promptMarkdown` set exactly to `CREATE_ARCHITECTURE_WORKFLOW_DESCRIPTION`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.14. In `createArchitectureWorkflow.ts`, add `entryProjectValueKeys` mapping `projectMode`, `projectTitle`, and `projectFolderName` to the matching `CreateArchitectureWorkflowValueKey` enum members.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.15. In `createArchitectureWorkflow.ts`, add `artifacts` with one `architecture_document` artifact definition using `WorkflowArtifactFamily.ArchitectureDocument`, `intentMode: "new"`, no parent or target identity source, and output value keys mapping `artifactAbsolutePath` to `CreateArchitectureWorkflowValueKey.OutputFile`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.16. In `createArchitectureWorkflow.ts`, add `workflowForms` containing `STEP_2_INPUT_FORM_ID: buildStep2InputWorkflowForm()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.17. In `createArchitectureWorkflow.ts`, add the `step-1` entry with step number `1`, checklist label `Generate Output Document`, `buildStep1DecisionTree()`, and direct `buildToolSchema: buildCreateArchitectureStep1ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.17a. In `createArchitectureWorkflow.ts`, add the `step-2` entry with step number `2`, checklist label `Gather User Inputs`, `buildStep2DecisionTree()`, and direct `buildToolSchema: buildCreateArchitectureStep2ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.17b. In `createArchitectureWorkflow.ts`, add the `step-3` entry with step number `3`, checklist label `Establish Architecture Foundational Elements`, `buildProgressionDecisionTree(3, 4)`, the Step 3 prompt source, and direct `buildToolSchema: buildCreateArchitectureStep3ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.17c. In `createArchitectureWorkflow.ts`, add the `step-4` entry with step number `4`, checklist label `Revolve Responsibility & Ownership`, `buildProgressionDecisionTree(4, 5)`, the Step 4 prompt source, and direct `buildToolSchema: buildCreateArchitectureStep4ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.17d. In `createArchitectureWorkflow.ts`, add the `step-5` entry with step number `5`, checklist label `Code Alignment Assessment`, `buildProgressionDecisionTree(5, 6)`, the Step 5 prompt source, and direct `buildToolSchema: buildCreateArchitectureStep5ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.17e. In `createArchitectureWorkflow.ts`, add the `step-6` entry with step number `6`, checklist label `Identify Key Tradeoffs & Risks`, `buildProgressionDecisionTree(6, 7)`, the Step 6 prompt source, and direct `buildToolSchema: buildCreateArchitectureStep6ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.17f. In `createArchitectureWorkflow.ts`, add the `step-7` entry with step number `7`, checklist label `Map out Blast Radius`, `buildProgressionDecisionTree(7, 8)`, the Step 7 prompt source, and direct `buildToolSchema: buildCreateArchitectureStep7ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.17g. In `createArchitectureWorkflow.ts`, add the `step-8` entry with step number `8`, checklist label `Build Project Roadmap`, `buildProgressionDecisionTree(8, 9)`, the Step 8 prompt source, and direct `buildToolSchema: buildCreateArchitectureStep8ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.17h. In `createArchitectureWorkflow.ts`, add the `step-9` entry with step number `9`, checklist label `Finalize Architecture Document`, `buildStep9DecisionTree()`, the Step 9 prompt source, and direct `buildToolSchema: buildCreateArchitectureStep9ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 4.18. Create `src/core/task/workflow-runtime/workflow-modules/create-architecture/index.ts` exporting `createArchitectureWorkflowDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/index.ts`

[x] Task 5. Add create-architecture module unit coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 5.1. Create `src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts` with coverage proving workflow identity, display name, description, use-skill name, slash command name, persona object, project subfolder, entry panel copy, checklist labels, workflow value inventory, and entry project value keys match `create-architecture-requirements.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 5.2. In `createArchitectureWorkflow.test.ts`, add coverage proving the architecture artifact definition uses `WorkflowArtifactFamily.ArchitectureDocument`, artifact id `architecture_document`, no parent or target identity sources, and maps `artifactAbsolutePath` to `output_file`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 5.3. In `createArchitectureWorkflow.test.ts`, add coverage proving Step 2 form panel ids, transitions, required field kinds, durable workflow value keys, and stale clearing rules match `create-architecture-requirements.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 5.4. In `createArchitectureWorkflow.test.ts`, add coverage proving Step 1 and Step 2 decision trees contain only runtime-driven actions and that Step 3 through Step 8 confirmed and denied progress routes select the required transition or project-prompt actions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 5.5. In `createArchitectureWorkflow.test.ts`, add coverage proving every step's `buildToolSchema` property is exactly the named exported builder from `createArchitectureToolSchemas.ts` and that `createArchitectureWorkflow.ts` contains no local `buildToolSchema` fallback body such as `() => []`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 5.6. In `createArchitectureWorkflow.test.ts`, add coverage proving Step 3 through Step 9 prompt builders render `output_file` through the runtime prompt-builder input and include the required section-specific instructions without mentioning `build_workflow_document`, `set_workflow_values`, BMAD files, or the legacy source workflow path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

### Phase 4 - Registration, Runtime Flow, And Prompt Projection

After completing this phase, pause for QA review before moving to Phase 5.

[x] Task 6. Register the create-architecture workflow as a shipped workflow.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`

[x] Subtask 6.1. In `src/core/task/workflow-runtime/WorkflowRegistry.ts`, import `createArchitectureWorkflowDefinition` from `@/core/task/workflow-runtime/workflow-modules/create-architecture`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[x] Subtask 6.2. In `src/core/task/workflow-runtime/WorkflowRegistry.ts`, add `createArchitectureWorkflowDefinition` to `shippedWorkflowDefinitions` after `brainstormingWorkflowDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[x] Subtask 6.3. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving `WorkflowRegistry.resolveWorkflowDefinition("create-architecture")` resolves the registered module and `WorkflowRegistry.resolveWorkflowDefinition("create-architecture.md")` returns `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 6.4. In `src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`, add coverage proving `use_skill` with `skill_name` `create-architecture` activates the shipped create-architecture workflow by canonical name and queues the runtime next action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`

[x] Task 7. Add runtime orchestration coverage for create-architecture activation, artifact creation, form persistence, and final completion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 7.1. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving activating `create-architecture` renders the mandatory shared entry form, uses the workflow description as the informational panel prompt, and projects a focus-chain checklist with all nine prescribed step labels.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 7.2. In `WorkflowRuntime.test.ts`, add coverage proving submitting a new project selection for create-architecture returns an `execute_tool_backed_operation` for `create_workflow_artifact` with `artifact_id: "architecture_document"` and keeps active step number `1`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 7.3. In `WorkflowRuntime.test.ts`, add coverage proving create-architecture Step 1 allocation success persists `output_file`, then routes to a `build_workflow_document` operation for the initial architecture shell using the runtime-resolved destination path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 7.4. In `WorkflowRuntime.test.ts`, add coverage proving successful create-architecture initial shell build transitions to Step 2 and returns the Step 2 workflow form.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 7.5. In `WorkflowRuntime.test.ts`, add coverage proving completing the Step 2 form persists `has_context_files`, `context_files`, `scope`, `has_architectural_goals`, `architectural_goals`, `has_core_architectural_rules`, and `core_architectural_rules` through workflow values and returns a `build_workflow_document` operation using the architecture submitted-values builder.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 7.6. In `WorkflowRuntime.test.ts`, add coverage proving Step 2 form submissions with false boolean answers clear stale dependent text workflow values for `context_files`, `architectural_goals`, and `core_architectural_rules`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 7.7. In `WorkflowRuntime.test.ts`, add coverage proving successful Step 2 submitted-values document build transitions to Step 3 and returns `project_prompt`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 7.8. In `WorkflowRuntime.test.ts`, add coverage proving `workflow_progress_request` confirmation advances create-architecture from Step 3 through Step 8 one step at a time, and denial on any of those steps returns to `project_prompt` without changing the active step number.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 7.9. In `WorkflowRuntime.test.ts`, add coverage proving successful final `attempt_completion` while Step 9 is active clears active workflow state through the existing generic final-delivery teardown path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 8. Add prompt-projection coverage for create-architecture.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts`

[x] Subtask 8.1. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, add a create-architecture prompt-context helper mirroring the active brainstorming helper but using `createArchitectureWorkflowDefinition`, `activeWorkflowName: "create-architecture"`, project subfolder `planning`, and `output_file: "/test/project/planning/architecture.md"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 8.2. In `integration.test.ts`, add coverage proving active create-architecture Step 3 native GPT-5 projection returns exactly `read_file`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`, and omits `create_workflow_artifact`, `build_workflow_document`, `set_workflow_values`, and `execute_command`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 8.3. In `integration.test.ts`, add coverage proving active create-architecture Step 4 native GPT-5 projection returns exactly `list_files`, `search_files`, `list_code_definition_names`, `read_file`, `read_file_range`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`, and omits `create_workflow_artifact`, `build_workflow_document`, `set_workflow_values`, and `execute_command`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 8.4. In `integration.test.ts`, add coverage proving active create-architecture Step 9 native GPT-5 projection returns exactly `read_file`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `attempt_completion`, and omits `workflow_progress_request`, `create_workflow_artifact`, `build_workflow_document`, `set_workflow_values`, and `execute_command`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 8.5. In `integration.test.ts`, add coverage proving the full-turn input payload for create-architecture includes workflow display name, workflow description, structured persona, workflow step list, and current-step details, while system instructions do not contain create-architecture current-step details.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 8.6. In `src/core/prompts/system-prompt/__tests__/response_tools.test.ts`, add coverage proving response-tool guidance for create-architecture workflow overrides is derived from the active workflow schema for Step 3, Step 4, and Step 9 and does not list response tools absent from those schemas.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts`

### Phase 5 - Validation

After completing this phase, pause for QA review before packaging or smoke testing.

[x] Task 9. Run targeted validation for the create-architecture module build.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

[x] Subtask 9.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`; it must pass before Task 9 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

[x] Subtask 9.2. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`; it must pass before Task 9 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

[x] Subtask 9.3. Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/prompts/system-prompt/__tests__/response_tools.test.ts`; it must pass before Task 9 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

[x] Subtask 9.4. Run `npm run check-types`; it must pass before Task 9 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

[x] Subtask 9.5. Run `npm run lint`; it must pass before Task 9 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

### Phase 6 - Runtime Entry Artifact Resolution For Create Architecture

Pause for QA review after completing this phase.

This phase aligns the create-architecture module with the runtime-owned entry singleton artifact resolution contract from Foundational Build Phases 58 and 59. The module must branch on `entry_artifact_resolution_completed` before allocating `architecture.md`, must skip allocation and initial document-building when the user continues an existing document, and must transition directly to Step 3 for continued existing architecture documents.

### Phase 6 Scope Boundary

- Do not change foundational runtime code in this phase.
- Do not revise any workflow module other than `create-architecture`.
- Do not add filesystem existence checks, archive behavior, or delete behavior to the create-architecture module.
- Do not expose `archive_workflow_artifact`, `delete_workflow_artifact`, `create_workflow_artifact`, or `build_workflow_document` through model-facing create-architecture tool schemas.
- Do not change Step 3 through Step 9 model-facing tool schemas in this phase.

[x] Task 10. Align create-architecture requirements with runtime-owned entry artifact resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/create-architecture-requirements.md`

[x] Subtask 10.1. In `create-architecture-requirements.md`, revise the output-artifact section so Step 1 begins by waiting for `entry_artifact_resolution_completed` for the `architecture_document` artifact instead of beginning with unconditional `allocate_artifact`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/create-architecture-requirements.md`

[x] Subtask 10.2. In `create-architecture-requirements.md`, add that when `entry_artifact_resolution_completed` reports `creationRequired: true` for `architecture_document`, Step 1 must allocate/create `architecture.md`, build the initial architecture document shell, and transition to Step 2 after the shell build succeeds.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/create-architecture-requirements.md`

[x] Subtask 10.3. In `create-architecture-requirements.md`, add that when `entry_artifact_resolution_completed` reports `creationRequired: false` for `architecture_document`, Step 1 must skip `allocate_artifact`, skip the initial `build_workflow_document`, skip the Step 2 input form and submitted-values document build, use the runtime-persisted `output_file`, and transition directly to Step 3.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/create-architecture-requirements.md`

[x] Task 11. Update the create-architecture Step 1 decision tree to consume runtime entry artifact resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 11.1. In `createArchitectureWorkflow.ts`, add `entryArtifactResolutionCompletedWithCreationRequired(creationRequired: boolean): WorkflowDecisionBranchTrigger` matching only `entry_artifact_resolution_completed` events whose `artifactResolutions` include `artifactId === ARCHITECTURE_DOCUMENT_ARTIFACT_ID` and the supplied `creationRequired` value.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 11.2. In `buildStep1DecisionTree()`, change `entryBranchId` from `"step-1-allocate-artifact"` to `"step-1-resolve-entry-artifact"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 11.3. In `buildStep1DecisionTree()`, replace the old `"step-1-allocate-artifact"` entry branch with a `"step-1-resolve-entry-artifact"` branch whose `creationRequired: true` route has id `"step-1-allocate-artifact"`, performs the existing `allocate_artifact` action for `ARCHITECTURE_DOCUMENT_ARTIFACT_ID`, and follows `"step-1-await-allocation"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 11.4. In the `"step-1-resolve-entry-artifact"` branch, add a `creationRequired: false` route with id `"step-1-continue-existing-artifact"` that performs a `transition_step` action targeting Step 3 entry branch.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 11.5. In `"step-1-await-allocation"`, update the first allocation success trigger to read from source route branch `"step-1-resolve-entry-artifact"` and route `"step-1-allocate-artifact"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 11.6. In `"step-1-await-allocation"`, update the first allocation failure trigger to read from source route branch `"step-1-resolve-entry-artifact"` and route `"step-1-allocate-artifact"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Task 12. Update create-architecture module tests for entry artifact resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 12.1. In `createArchitectureWorkflow.test.ts`, add test helpers for building an `entry_artifact_resolution_completed` trigger event for `architecture_document` with a caller-supplied `creationRequired` value and for asserting that a route matches that event.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 12.2. In `createArchitectureWorkflow.test.ts`, add coverage proving Step 1 uses entry branch `"step-1-resolve-entry-artifact"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 12.3. In `createArchitectureWorkflow.test.ts`, add coverage proving the Step 1 `creationRequired: true` route matches `entry_artifact_resolution_completed`, allocates `architecture_document`, and follows `"step-1-await-allocation"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 12.4. In `createArchitectureWorkflow.test.ts`, add coverage proving the Step 1 `creationRequired: false` route matches `entry_artifact_resolution_completed`, transitions directly to Step 3, and does not route to `allocate_artifact`, `build_workflow_document`, or `render_workflow_form`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 12.5. In `createArchitectureWorkflow.test.ts`, add coverage proving the first allocation success and failure routes listen to source branch `"step-1-resolve-entry-artifact"` and route `"step-1-allocate-artifact"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Task 13. Validate Phase 6.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/create-architecture-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts`

[x] Subtask 13.1. Run `rg -n "entryBranchId: \"step-1-allocate-artifact\"|toolBackedOperationSucceeded\\(\"step-1-allocate-artifact\", \"step-1-allocate-artifact\"\\)|toolBackedOperationFailed\\(\"step-1-allocate-artifact\", \"step-1-allocate-artifact\"\\)" src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`; it must return no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 13.2. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts`; it must pass before Phase 6 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts`

[x] Subtask 13.3. Run `npm run check-types`; it must pass before Phase 6 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 13.4. Run `npm run lint`; it must pass before Phase 6 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

### Phase 7 - Explicit Step 9 Completion Routing After `attempt_completion`

### Phase 7 Scope

Update the create-architecture workflow so successful `attempt_completion` is handled through the module decision tree. Step 9 must route the runtime-emitted `attempt_completion_succeeded` event to the runtime-owned `complete_workflow` action.

### Phase 7 Scope Boundary

- Do not change Step 1 through Step 8 behavior.
- Do not change any create-architecture model-facing tool schema.
- Do not add a workflow-specific completion handler or finalizer.
- Do not modify shared runtime behavior.
- Do not modify brainstorming, create-epics, or any other workflow module.

### Phase 7 Known Issues / Risks / Technical Debt

Historical completed phases in this action plan reference the older response-tool-driven teardown behavior. Phase 7 supersedes that runtime expectation for live create-architecture workflow behavior without rewriting completed historical task records.

[x] Task 14. Update the create-architecture Step 9 decision tree.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 14.1. In `buildStep9DecisionTree()`, update the existing `"step-9-project-prompt"` route so it keeps the existing `project_prompt` action and adds `followingBranchId: "step-9-await-attempt-completion"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 14.2. In `buildStep9DecisionTree()`, add a `"step-9-await-attempt-completion"` branch with route id `"step-9-complete-workflow-after-attempt-completion"`, trigger `{ kind: "on_event", eventKind: "attempt_completion_succeeded" }`, and action `{ kind: "complete_workflow" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Task 15. Update create-architecture workflow tests for explicit Step 9 completion routing.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 15.1. In `createArchitectureWorkflow.test.ts`, add coverage proving the `"step-9-project-prompt"` route keeps action kind `"project_prompt"` and sets `followingBranchId` to `"step-9-await-attempt-completion"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 15.2. In `createArchitectureWorkflow.test.ts`, add coverage proving route `"step-9-complete-workflow-after-attempt-completion"` in branch `"step-9-await-attempt-completion"` uses trigger `{ kind: "on_event", eventKind: "attempt_completion_succeeded" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 15.3. In `createArchitectureWorkflow.test.ts`, add coverage proving route `"step-9-complete-workflow-after-attempt-completion"` uses action `{ kind: "complete_workflow" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Task 16. Validate Phase 7.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/create-architecture-requirements.md`

[x] Subtask 16.1. Run `rg -n "After that final delivery, the workflow runtime must perform normal workflow completion and teardown|relies on normal attempt_completion workflow teardown|existing generic final-delivery teardown path" docs/workflows/workflow-runtime/workflow-modules/create-architecture/create-architecture-requirements.md src/core/task/workflow-runtime/workflow-modules/create-architecture`; it must return no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/create-architecture-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[x] Subtask 16.2. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts`; it must pass before Phase 7 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts`

[x] Subtask 16.3. Run `npm run check-types`; it must pass before Phase 7 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[x] Subtask 16.4. Run `npm run lint`; it must pass before Phase 7 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

### Phase 8 - Existing Architecture Revision Path And Conditional Final Prompting

Pause for QA review after completing this phase.

### Phase 8 Scope

Update create-architecture so Step 1 persists whether `architecture.md` creation is required, Step 2 always runs but starts at the creation-specific or existing-document panel, existing-document runs optionally collect `change_plan`, existing-document runs skip Steps 3 through 8 and transition directly to Step 9, and Step 9 prompt materialization follows the `creation_required` and `change_plan` workflow values prescribed in `create-architecture-requirements.md`.

### Phase 8 Scope Boundary

- Do not change shared workflow runtime code.
- Do not change create-architecture model-facing tool schemas.
- Do not change `createArchitectureDocument.ts` document-builder behavior.
- Do not add deterministic document appending for existing architecture documents.
- Do not add AI-facing `set_workflow_values`.
- Do not change any workflow module other than `create-architecture`.
- Do not change create-architecture registry identity, artifact family metadata, persona, or checklist labels.

### Phase 8 Known Issues / Risks / Technical Debt

The live runtime already supports the required `render_workflow_form.startPanelId`, `run_deterministic_procedure`, `build_workflow_document.workflowValueWrites`, `session_predicate`, and prompt-builder workflow-value reads. This phase must use those existing contracts rather than adding new runtime action kinds.

[ ] Task 17. Update create-architecture workflow values and Step 9 prompt helpers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `CreationRequired = "creation_required"` immediately after `ProjectFolderName = "projectFolderName"` in `CreateArchitectureWorkflowValueKey`, and add `ChangePlan = "change_plan"` immediately after `ContextFiles = "context_files"`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `CreateArchitectureWorkflowValueKey.CreationRequired` immediately after `CreateArchitectureWorkflowValueKey.ProjectFolderName` in `CREATE_ARCHITECTURE_WORKFLOW_VALUE_KEYS`, and add `CreateArchitectureWorkflowValueKey.ChangePlan` immediately after `CreateArchitectureWorkflowValueKey.ContextFiles`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add exact type imports `WorkflowDecisionAction` and `WorkflowDeterministicProcedureResult` to the existing type import list from `../../types`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `buildPersistCreationRequiredAction(creationRequired: boolean): Extract<WorkflowDecisionAction, { kind: "run_deterministic_procedure" }>` after `entryArtifactResolutionCompletedWithCreationRequired(...)`; it must return `{ kind: "run_deterministic_procedure", instruction: { run: (): WorkflowDeterministicProcedureResult => ({ kind: "succeeded", workflowValueWrites: { [CreateArchitectureWorkflowValueKey.CreationRequired]: creationRequired } }) } }`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, replace `workflowFormCompleted(workflowFormId: string): WorkflowDecisionBranchTrigger` with `workflowFormCompletedWithCreationRequired(workflowFormId: string, creationRequired: boolean): WorkflowDecisionBranchTrigger`; the returned trigger must be `{ kind: "event_predicate", matches: ({ triggerEvent, workflowValues }) => triggerEvent.kind === "workflow_form_completed" && triggerEvent.workflowFormId === workflowFormId && workflowValues[CreateArchitectureWorkflowValueKey.CreationRequired] === creationRequired }`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.6. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `renderWorkflowValueByKey(input: WorkflowPromptBuilderInput, key: CreateArchitectureWorkflowValueKey): string` after `replaceOutputFilePlaceholder(...)`; it must read `const value = input.session.workflowValues[key]`, return `input.renderWorkflowValue(key)` when `value === undefined`, and otherwise return `input.renderWorkflowValue(value)`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.7. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `readBooleanWorkflowValue(input: WorkflowPromptBuilderInput, key: CreateArchitectureWorkflowValueKey): boolean | undefined` after `renderWorkflowValueByKey(...)`; it must return the workflow value only when `typeof value === "boolean"` and otherwise return `undefined`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.8. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `readNonEmptyStringWorkflowValue(input: WorkflowPromptBuilderInput, key: CreateArchitectureWorkflowValueKey): string | undefined` after `readBooleanWorkflowValue(...)`; it must read `const value = input.session.workflowValues[key]`, return `undefined` when `typeof value !== "string"`, assign `const trimmedValue = value.trim()`, return `trimmedValue` when `trimmedValue.length > 0`, and otherwise return `undefined`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.9. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, delete the existing `STEP_9_PROMPT` constant.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.10. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `STEP_9_EXISTING_DOCUMENT_HEADER_PROMPT` with exact text `You have been called inside a workflow focused on revising an existing architecture document within the following project:\n- Project: {projectTitle}\n- Project Folder: {projectFolderName}\n- Architecture Document: {output_file}`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.11. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `STEP_9_CHANGE_PLAN_PROMPT_LINE` with exact text `- Change Management Plan: {change_plan}`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.12. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `STEP_9_EXISTING_DOCUMENT_BODY_PROMPT` with exact text `Steps 1-8 were automatically completed by the system.\nReview the architecture document and any files listed in the "Relevant Context" section.\nAfter reviewing, confirm the scope of revisions that the user wishes to make in the architecture document, then work with them to identify the correct revisions to the existing document and update {output_file} appropriately.`

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.13. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `STEP_9_NEW_DOCUMENT_REVIEW_PROMPT` with exact text `Review the full architecture for coherence and pattern and structure alignment.\nClassify any issues as critical, important, or minor.\nIf there are critical issues, present them and ask how the user wants to resolve them before implementation. If there are important or minor issues, present them as refinements and ask whether to address them now.`

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.14. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `STEP_9_FINAL_PROMPT` with exact text `When finished, present a short completion summary using attempt_completion and explain that the architecture document is now the technical source of truth and is ready to inform the create-epics workflow.`

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.15. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, replace `buildStep9PromptSource(...)` so it builds `const sections: string[] = []`, reads `creationRequired` through `readBooleanWorkflowValue(input, CreateArchitectureWorkflowValueKey.CreationRequired)`, appends the existing-document header/body only when `creationRequired === false`, appends the change-plan line only inside that `creationRequired === false` branch and only when `readNonEmptyStringWorkflowValue(input, CreateArchitectureWorkflowValueKey.ChangePlan)` returns a string, appends the new-document review prompt only when `creationRequired === true`, always appends `STEP_9_FINAL_PROMPT`, and returns `{ currentStepInstructions: sections.join("\n\n") }`; the existing-document header must replace `{projectTitle}` with `renderWorkflowValueByKey(input, CreateArchitectureWorkflowValueKey.ProjectTitle)`, `{projectFolderName}` with `renderWorkflowValueByKey(input, CreateArchitectureWorkflowValueKey.ProjectFolderName)`, and `{output_file}` through `replaceOutputFilePlaceholder(...)`; the change-plan line must replace `{change_plan}` with `input.renderWorkflowValue(changePlan)`; the existing-document body and new-document review prompt must run through `replaceOutputFilePlaceholder(...)`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.16. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `STEP_2_CHANGE_PLAN_CHECK_PANEL_ID = "step-2-change-plan-check-panel"` immediately after `STEP_2_INPUT_FORM_ID`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 17.17. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add `STEP_2_CHANGE_PLAN_DETAIL_PANEL_ID = "step-2-change-plan-detail-panel"` immediately after `STEP_2_CHANGE_PLAN_CHECK_PANEL_ID`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[ ] Task 18. Update create-architecture Step 1 and Step 2 routing.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 18.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, update the `"step-1-build-initial-shell"` `build_workflow_document` action instruction to include `workflowValueWrites: { [CreateArchitectureWorkflowValueKey.CreationRequired]: true }`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 18.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, update the `"step-1-build-initial-shell-after-retry"` `build_workflow_document` action instruction to include `workflowValueWrites: { [CreateArchitectureWorkflowValueKey.CreationRequired]: true }`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 18.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, replace the `"step-1-continue-existing-artifact"` route action with `buildPersistCreationRequiredAction(false)` and add `followingBranchId: "step-1-transition-existing-artifact-to-step-2"`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 18.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add branch `"step-1-transition-existing-artifact-to-step-2"` with exactly one route `{ id: "step-1-transition-existing-artifact-to-step-2", trigger: { kind: "always" }, action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } } }`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 18.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, replace the single route in branch `"step-2-render-input-form"` with route id `"step-2-render-creation-input-form"`, trigger `{ kind: "session_predicate", matches: ({ workflowValues }) => workflowValues[CreateArchitectureWorkflowValueKey.CreationRequired] === true }`, action `{ kind: "render_workflow_form", workflowFormId: STEP_2_INPUT_FORM_ID, startPanelId: "step-2-context-files-check-panel" }`, and `followingBranchId: "step-2-await-input-form"`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 18.6. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add a second route in branch `"step-2-render-input-form"` with id `"step-2-render-existing-document-form"`, trigger `{ kind: "session_predicate", matches: ({ workflowValues }) => workflowValues[CreateArchitectureWorkflowValueKey.CreationRequired] === false }`, action `{ kind: "render_workflow_form", workflowFormId: STEP_2_INPUT_FORM_ID, startPanelId: STEP_2_CHANGE_PLAN_CHECK_PANEL_ID }`, and `followingBranchId: "step-2-await-input-form"`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 18.7. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, update route `"step-2-build-submitted-values-document"` so its trigger is `workflowFormCompletedWithCreationRequired(STEP_2_INPUT_FORM_ID, true)`, while preserving the existing `build_workflow_document` action for `ARCHITECTURE_DOCUMENT_ARTIFACT_ID`, `buildCreateArchitectureDocumentFromSession`, and `followingBranchId: "step-2-await-submitted-values-document"`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 18.8. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add route `"step-2-transition-existing-document-to-step-9"` in branch `"step-2-await-input-form"` with trigger `workflowFormCompletedWithCreationRequired(STEP_2_INPUT_FORM_ID, false)` and action `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 9 } }`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[ ] Task 19. Add existing-document Step 2 form panels.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 19.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add Panel 8 to `buildStep2InputWorkflowForm().panels` using key `STEP_2_CHANGE_PLAN_CHECK_PANEL_ID`, `panelId: STEP_2_CHANGE_PLAN_CHECK_PANEL_ID`, `title: "Existing Architecture Document"`, `promptMarkdown: "It looks like this project already has an architecture document. Do you have a change management plan to provide?"`, one field `{ key: "has_change_plan", kind: "boolean", label: "select one", required: true, allowedValueType: "boolean", trueLabel: "yes", falseLabel: "no" }` with no `workflowValueKey`, `allowedActions: ["submit"]`, `actionLabels: { submit: "submit" }`, and transition `{ type: "conditional", conditionSourceKey: "has_change_plan", branches: [{ matchValue: true, nextPanelId: STEP_2_CHANGE_PLAN_DETAIL_PANEL_ID }, { matchValue: false, terminal: true, staleValueKeysToClear: [CreateArchitectureWorkflowValueKey.ChangePlan] }], defaultTerminal: true }`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

    [ ] Subtask 19.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, add Panel 9 to `buildStep2InputWorkflowForm().panels` using key `STEP_2_CHANGE_PLAN_DETAIL_PANEL_ID`, `panelId: STEP_2_CHANGE_PLAN_DETAIL_PANEL_ID`, `title: "Provide File Path"`, `promptMarkdown: "Please provide the full file path for your change management plan."`, one field `{ key: CreateArchitectureWorkflowValueKey.ChangePlan, workflowValueKey: CreateArchitectureWorkflowValueKey.ChangePlan, kind: "small_text", label: "file path", required: true, allowedValueType: "string" }`, `allowedActions: ["submit", "back"]`, `actionLabels: { submit: "submit", back: "back" }`, `backDestinationPanelId: STEP_2_CHANGE_PLAN_CHECK_PANEL_ID`, `backStaleValueKeysToClear: [CreateArchitectureWorkflowValueKey.ChangePlan]`, and `transition: buildTerminalTransition()`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

[ ] Task 20. Update create-architecture module tests for the new workflow contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, update the workflow value inventory assertion so the expected array includes `"creation_required"` immediately after `"projectFolderName"` and `"change_plan"` immediately after `"context_files"`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, update the Step 2 form panel id assertion so `Object.keys(form.panels)` deep-equals `["step-2-context-files-check-panel", "step-2-context-files-detail-panel", "step-2-scope-panel", "step-2-architectural-goals-check-panel", "step-2-architectural-goals-detail-panel", "step-2-core-rules-check-panel", "step-2-core-rules-detail-panel", "step-2-change-plan-check-panel", "step-2-change-plan-detail-panel"]`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, add Step 2 form assertions proving `getPanel(form, "step-2-change-plan-check-panel")` deep-equals `{ panelId: "step-2-change-plan-check-panel", title: "Existing Architecture Document", promptMarkdown: "It looks like this project already has an architecture document. Do you have a change management plan to provide?", fields: [{ key: "has_change_plan", kind: "boolean", label: "select one", required: true, allowedValueType: "boolean", trueLabel: "yes", falseLabel: "no" }], allowedActions: ["submit"], actionLabels: { submit: "submit" }, transition: { type: "conditional", conditionSourceKey: "has_change_plan", branches: [{ matchValue: true, nextPanelId: "step-2-change-plan-detail-panel" }, { matchValue: false, terminal: true, staleValueKeysToClear: ["change_plan"] }], defaultTerminal: true } }`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, add Step 2 form assertions proving `getPanel(form, "step-2-change-plan-detail-panel")` deep-equals `{ panelId: "step-2-change-plan-detail-panel", title: "Provide File Path", promptMarkdown: "Please provide the full file path for your change management plan.", fields: [{ key: "change_plan", workflowValueKey: "change_plan", kind: "small_text", label: "file path", required: true, allowedValueType: "string" }], allowedActions: ["submit", "back"], actionLabels: { submit: "submit", back: "back" }, backDestinationPanelId: "step-2-change-plan-check-panel", backStaleValueKeysToClear: ["change_plan"], transition: { type: "conditional", conditionSourceKey: "__terminal__", branches: [], defaultTerminal: true } }`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, update the existing-document Step 1 route test so route `"step-1-continue-existing-artifact"` still matches `entry_artifact_resolution_completed` with `creationRequired: false`; assign `const continueExistingAction = continueExistingRoute.action`, assert `continueExistingAction.kind === "run_deterministic_procedure"`, then narrow with `if (continueExistingAction.kind !== "run_deterministic_procedure") { throw new Error(\`Expected run_deterministic_procedure, received ${continueExistingAction.kind}.\`) }`; after that narrowing, call `const result = await Promise.resolve(continueExistingAction.instruction.run(createSession({})))`, assert `result` deep-equals `{ kind: "succeeded", workflowValueWrites: { creation_required: false } }`, and assert `continueExistingRoute.followingBranchId` equals `"step-1-transition-existing-artifact-to-step-2"`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.6. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, add coverage proving branch `"step-1-transition-existing-artifact-to-step-2"` contains exactly route `"step-1-transition-existing-artifact-to-step-2"` with trigger `{ kind: "always" }` and action `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } }`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.7. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, add coverage for route `"step-1-build-initial-shell"` in branch `"step-1-await-allocation"` and route `"step-1-build-initial-shell-after-retry"` in branch `"step-1-await-retry-allocation"`; for each route, assign `const action = route.action`, assert `action.kind === "build_workflow_document"`, narrow with `if (action.kind !== "build_workflow_document") { throw new Error(\`Expected build_workflow_document, received ${action.kind}.\`) }`, and only after that narrowing assert `action.instruction.workflowValueWrites` deep-equals `{ creation_required: true }`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.8. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, add coverage proving route `"step-2-render-creation-input-form"` uses action `{ kind: "render_workflow_form", workflowFormId: "step-2-user-input-form", startPanelId: "step-2-context-files-check-panel" }` and follows `"step-2-await-input-form"`; assign `const trigger = route.trigger`, assert `trigger.kind === "session_predicate"`, narrow with `if (trigger.kind !== "session_predicate") { throw new Error(\`Expected session_predicate, received ${trigger.kind}.\`) }`, then assert `trigger.matches({ activeBranchId: "step-2-render-input-form", workflowValues: { creation_required: true }, step: createArchitectureWorkflowDefinition.steps["step-2"] }) === true` and `trigger.matches({ activeBranchId: "step-2-render-input-form", workflowValues: { creation_required: false }, step: createArchitectureWorkflowDefinition.steps["step-2"] }) === false`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.9. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, add coverage proving route `"step-2-render-existing-document-form"` uses action `{ kind: "render_workflow_form", workflowFormId: "step-2-user-input-form", startPanelId: "step-2-change-plan-check-panel" }` and follows `"step-2-await-input-form"`; assign `const trigger = route.trigger`, assert `trigger.kind === "session_predicate"`, narrow with `if (trigger.kind !== "session_predicate") { throw new Error(\`Expected session_predicate, received ${trigger.kind}.\`) }`, then assert `trigger.matches({ activeBranchId: "step-2-render-input-form", workflowValues: { creation_required: false }, step: createArchitectureWorkflowDefinition.steps["step-2"] }) === true` and `trigger.matches({ activeBranchId: "step-2-render-input-form", workflowValues: { creation_required: true }, step: createArchitectureWorkflowDefinition.steps["step-2"] }) === false`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.10. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, add coverage proving route `"step-2-build-submitted-values-document"` uses an `event_predicate` trigger by assigning `const trigger = route.trigger`, asserting `trigger.kind === "event_predicate"`, narrowing with `if (trigger.kind !== "event_predicate") { throw new Error(\`Expected event_predicate, received ${trigger.kind}.\`) }`, then asserting `trigger.matches({ activeBranchId: "step-2-await-input-form", workflowValues: { creation_required: true }, step: createArchitectureWorkflowDefinition.steps["step-2"], triggerEvent: { kind: "workflow_form_completed", workflowFormId: "step-2-user-input-form" } }) === true` and the same object with `workflowValues: { creation_required: false }` returns `false`; assign `const action = route.action`, assert `action.kind === "build_workflow_document"`, narrow with `if (action.kind !== "build_workflow_document") { throw new Error(\`Expected build_workflow_document, received ${action.kind}.\`) }`, then assert `action.instruction.artifactId === "architecture_document"`, `action.instruction.buildContent === buildCreateArchitectureDocumentFromSession`, `action.instruction.workflowValueWrites === undefined`, and `route.followingBranchId === "step-2-await-submitted-values-document"`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.11. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, add coverage proving route `"step-2-transition-existing-document-to-step-9"` uses an `event_predicate` trigger by assigning `const trigger = route.trigger`, asserting `trigger.kind === "event_predicate"`, narrowing with `if (trigger.kind !== "event_predicate") { throw new Error(\`Expected event_predicate, received ${trigger.kind}.\`) }`, then asserting `trigger.matches({ activeBranchId: "step-2-await-input-form", workflowValues: { creation_required: false }, step: createArchitectureWorkflowDefinition.steps["step-2"], triggerEvent: { kind: "workflow_form_completed", workflowFormId: "step-2-user-input-form" } }) === true` and the same object with `workflowValues: { creation_required: true }` returns `false`; also assert the route action deep-equals `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 9 } }` and the route does not have `followingBranchId`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.12. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, update the local `buildPrompt(...)` helper signature to `buildPrompt(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues = { output_file: OUTPUT_FILE, creation_required: true }): string`, pass `workflowValues` into `createPromptInput(...)`, and preserve the existing missing-prompt guard.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.13. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, update the existing aggregate prompt test so it no longer contains a Step 9 `PromptExpectation`; rename the test description from `renders Step 3 through Step 9 prompt sources with output_file and required section instructions` to `renders Step 3 through Step 8 prompt sources with output_file and required section instructions`; keep the existing `expect(prompt).to.include(OUTPUT_FILE)` loop only for Step 3 through Step 8.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.14. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, add Step 9 prompt coverage for `{ output_file: OUTPUT_FILE, creation_required: true, projectTitle: "Create Architecture Project", projectFolderName: "create-architecture-project", change_plan: "/tmp/change-management-plan.md" }` proving the prompt is non-empty, excludes `OUTPUT_FILE`, excludes `"Create Architecture Project"`, excludes `"create-architecture-project"`, excludes `"/tmp/change-management-plan.md"`, and excludes raw placeholders `{output_file}`, `{projectTitle}`, `{projectFolderName}`, `{change_plan}`, and `output_document`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.15. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, add Step 9 prompt coverage for `{ output_file: OUTPUT_FILE, creation_required: false, projectTitle: "Create Architecture Project", projectFolderName: "create-architecture-project" }` proving the prompt is non-empty, includes `OUTPUT_FILE`, includes `"Create Architecture Project"`, includes `"create-architecture-project"`, and excludes raw placeholders `{output_file}`, `{projectTitle}`, `{projectFolderName}`, `{change_plan}`, and `output_document`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

    [ ] Subtask 20.16. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, add Step 9 prompt coverage for `{ output_file: OUTPUT_FILE, creation_required: false, projectTitle: "Create Architecture Project", projectFolderName: "create-architecture-project", change_plan: "/tmp/change-management-plan.md" }` proving the prompt is non-empty, includes `OUTPUT_FILE`, includes `"/tmp/change-management-plan.md"`, and excludes raw placeholders `{output_file}`, `{projectTitle}`, `{projectFolderName}`, `{change_plan}`, and `output_document`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

[ ] Task 21. Update runtime tests for the new create-architecture branch behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

    [ ] Subtask 21.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add `writeExistingArchitectureArtifact(projectName: string, content: string): Promise<string>` near the existing artifact fixture helpers; it must create `join(cwd, "docs", "projects", projectName, "planning")`, write `content` to `join(cwd, "docs", "projects", projectName, "planning", "architecture.md")` with `"utf8"`, and return the absolute file path.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

    [ ] Subtask 21.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update the create-architecture Step 1 allocation-success test so the expected `build_workflow_document` tool request includes `toolInput: { workflow_value_writes: { creation_required: true } }` and the existing `toolParams` object remains unchanged.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

    [ ] Subtask 21.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update `advanceCreateArchitectureToStep2Form(...)` so after `startCreateArchitectureInitialDocumentBuild(...)` returns `documentBuildAction` and before calling `runtime.handleToolBackedOperationToolResult(...)` for that document build, it calls `await runtime.applyWorkflowValueWrites({ taskState: state, values: { creation_required: true } })` and asserts the returned `changedValues` deep-equals `{ creation_required: true }`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

    [ ] Subtask 21.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update the test that transitions to Step 2 after initial shell build so before it calls `runtime.handleToolBackedOperationToolResult(...)` for the successful shell-build result, it calls `await runtime.applyWorkflowValueWrites({ taskState, values: { creation_required: true } })` and asserts the returned `changedValues` deep-equals `{ creation_required: true }`; after the successful shell-build result, assert `getActiveWorkflowSession(taskState).workflowValues.creation_required === true`, `activeStepNumber === 2`, returned form id `"step-2-user-input-form"`, and returned panel id `"step-2-context-files-check-panel"`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

    [ ] Subtask 21.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add runtime coverage for the existing architecture path: assign `const existingArchitecturePath = await writeExistingArchitectureArtifact("create-architecture-existing", "# Existing Architecture\n")`, register and activate `createArchitectureWorkflowDefinition`, call `setDiscoveredProjects(["create-architecture-existing"])`, assign `const conflictAction = await submitExistingProjectSelectionFromExistingFolder(taskState, "create-architecture-existing")`, assert `conflictAction.kind === "render_workflow_form"`, narrow with `if (conflictAction.kind !== "render_workflow_form") { throw new Error(\`Expected render_workflow_form, received ${conflictAction.kind}.\`) }`, assign `const conflictPanel = conflictAction.payload.panel`, narrow with `if (conflictPanel === undefined) { throw new Error("Expected entry artifact conflict panel.") }`, assert `conflictPanel.panelId === ENTRY_ARTIFACT_CONFLICT_PANEL_ID`, assign `const renderFormAction = await submitEntryArtifactConflictAction(taskState, "continue_existing")`, assert `renderFormAction.kind === "render_workflow_form"`, narrow with `if (renderFormAction.kind !== "render_workflow_form") { throw new Error(\`Expected render_workflow_form, received ${renderFormAction.kind}.\`) }`, assign `const panel = renderFormAction.payload.panel`, narrow with `if (panel === undefined) { throw new Error("Expected rendered workflow form panel.") }`, and then assert active step number is `2`, `workflowValues.output_file === existingArchitecturePath`, `workflowValues.creation_required === false`, `renderFormAction.formSession.workflowFormId === "step-2-user-input-form"`, and `panel.panelId === "step-2-change-plan-check-panel"`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

    [ ] Subtask 21.6. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add runtime coverage for Panel 8 no using a fresh `TaskState`: call `writeExistingArchitectureArtifact("create-architecture-existing-no-plan", "# Existing Architecture\n")`, register and activate `createArchitectureWorkflowDefinition`, call `setDiscoveredProjects(["create-architecture-existing-no-plan"])`, assign `const conflictAction = await submitExistingProjectSelectionFromExistingFolder(taskState, "create-architecture-existing-no-plan")`, assert `conflictAction.kind === "render_workflow_form"`, narrow with `if (conflictAction.kind !== "render_workflow_form") { throw new Error(\`Expected render_workflow_form, received ${conflictAction.kind}.\`) }`, assert `conflictAction.formSession.currentPanelId === ENTRY_ARTIFACT_CONFLICT_PANEL_ID`, call `await submitEntryArtifactConflictAction(taskState, "continue_existing")`, submit the active Step 2 form panel with exactly `[{ key: "has_change_plan", value: { booleanValue: false } }]`, and assert the returned action is `project_prompt`, active step number is `9`, `workflowValues.creation_required === false`, `workflowValues` has no `change_plan` property, and no `execute_tool_backed_operation` is returned for `build_workflow_document`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

    [ ] Subtask 21.7. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add runtime coverage for Panel 8 yes and Panel 9 submit using a fresh `TaskState`: call `writeExistingArchitectureArtifact("create-architecture-existing-with-plan", "# Existing Architecture\n")`, register and activate `createArchitectureWorkflowDefinition`, call `setDiscoveredProjects(["create-architecture-existing-with-plan"])`, assign `const conflictAction = await submitExistingProjectSelectionFromExistingFolder(taskState, "create-architecture-existing-with-plan")`, assert `conflictAction.kind === "render_workflow_form"`, narrow with `if (conflictAction.kind !== "render_workflow_form") { throw new Error(\`Expected render_workflow_form, received ${conflictAction.kind}.\`) }`, assert `conflictAction.formSession.currentPanelId === ENTRY_ARTIFACT_CONFLICT_PANEL_ID`, call `await submitEntryArtifactConflictAction(taskState, "continue_existing")`, assign `const changePlanFormAction = await submitActiveWorkflowFormPanelFields(taskState, [{ key: "has_change_plan", value: { booleanValue: true } }])`, assert `changePlanFormAction.kind === "render_workflow_form"`, narrow with `if (changePlanFormAction.kind !== "render_workflow_form") { throw new Error(\`Expected render_workflow_form, received ${changePlanFormAction.kind}.\`) }`, assign `const panel = changePlanFormAction.payload.panel`, narrow with `if (panel === undefined) { throw new Error("Expected rendered workflow form panel.") }`, assert `panel.panelId === "step-2-change-plan-detail-panel"`, submit Panel 9 with exactly `[{ key: "change_plan", value: { stringValue: "/tmp/change-management-plan.md" } }]`, and assert the returned action is `project_prompt`, active step number is `9`, and `workflowValues.change_plan === "/tmp/change-management-plan.md"`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

    [ ] Subtask 21.8. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add runtime prompt-projection coverage using a fresh `TaskState`: assign `const existingArchitecturePath = await writeExistingArchitectureArtifact("create-architecture-existing-projection", "# Existing Architecture\n")`, register and activate `createArchitectureWorkflowDefinition`, call `setDiscoveredProjects(["create-architecture-existing-projection"])`, assign `const conflictAction = await submitExistingProjectSelectionFromExistingFolder(taskState, "create-architecture-existing-projection")`, assert `conflictAction.kind === "render_workflow_form"`, narrow with `if (conflictAction.kind !== "render_workflow_form") { throw new Error(\`Expected render_workflow_form, received ${conflictAction.kind}.\`) }`, assert `conflictAction.formSession.currentPanelId === ENTRY_ARTIFACT_CONFLICT_PANEL_ID`, call `await submitEntryArtifactConflictAction(taskState, "continue_existing")`, submit Panel 8 with exactly `[{ key: "has_change_plan", value: { booleanValue: true } }]`, submit Panel 9 with exactly `[{ key: "change_plan", value: { stringValue: "/tmp/change-management-plan.md" } }]`, call `await runtime.buildTurnProjection({ taskState })`, assert `workflowInputPayloadBlock` is defined and non-empty, assert it contains `existingArchitecturePath` and `"/tmp/change-management-plan.md"`, and assert it does not contain raw placeholders `{output_file}`, `{projectTitle}`, `{projectFolderName}`, `{change_plan}`, or `output_document`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Task 22. Validate Phase 8.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

    [ ] Subtask 22.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts`; it must pass before Phase 8 is marked complete.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

    [ ] Subtask 22.2. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`; it must pass before Phase 8 is marked complete.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

    [ ] Subtask 22.3. Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/prompts/system-prompt/__tests__/response_tools.test.ts`; it must pass before Phase 8 is marked complete.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

    [ ] Subtask 22.4. Run `npm run check-types`; it must pass before Phase 8 is marked complete.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

    [ ] Subtask 22.5. Run `npm run lint`; it must pass before Phase 8 is marked complete.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

    [ ] Subtask 22.6. Run `npm run eval:smoke:ci`; it must pass before Phase 8 is marked complete so the repo-supported packaged smoke validation covers the create-architecture workflow behavior required by `create-architecture-requirements.md`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

    [ ] Subtask 22.7. Run `git diff --name-only` and `git ls-files --others --exclude-standard`; persistent tracked and untracked diffs must be limited to `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, and `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`.

    Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

## Validation

After every task and subtask is complete, run:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/prompts/system-prompt/__tests__/response_tools.test.ts
npm run check-types
npm run lint
npm run eval:smoke:ci
```

Packaged smoke validation must verify:

- `create-architecture` appears as a shipped workflow skill/slash-command identity without requiring `.md`.
- The mandatory shared entry `WorkflowForm` renders the create-architecture description.
- New project selection creates `docs/projects/{project}/planning/architecture.md`.
- Step 2 renders the creation-required form path starting at Panel 1 and writes submitted values under the correct headings.
- Existing architecture document selection persists `creation_required: false`, renders Step 2 starting at Panel 8, optionally persists `change_plan` through Panel 9, skips Steps 3 through 8, and routes directly to Step 9.
- Step 3 through Step 8 expose the required model-facing schemas, update `architecture.md` through governed file tools, and advance only through `workflow_progress_request`.
- Step 9 exposes `attempt_completion`, completes successfully, and tears down active workflow state.
