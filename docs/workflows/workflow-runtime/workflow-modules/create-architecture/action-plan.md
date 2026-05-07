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

[ ] Task 9. Run targeted validation for the create-architecture module build.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

[ ] Subtask 9.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`; it must pass before Task 9 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

[ ] Subtask 9.2. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`; it must pass before Task 9 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

[ ] Subtask 9.3. Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/prompts/system-prompt/__tests__/response_tools.test.ts`; it must pass before Task 9 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

[ ] Subtask 9.4. Run `npm run check-types`; it must pass before Task 9 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/action-plan.md`

[ ] Subtask 9.5. Run `npm run lint`; it must pass before Task 9 is marked complete.

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
```

Packaged smoke validation must verify:

- `create-architecture` appears as a shipped workflow skill/slash-command identity without requiring `.md`.
- The mandatory shared entry `WorkflowForm` renders the create-architecture description.
- New project selection creates `docs/projects/{project}/planning/architecture.md`.
- Step 2 renders the seven-panel input form and writes submitted values under the correct headings.
- Step 3 through Step 8 expose the required model-facing schemas, update `architecture.md` through governed file tools, and advance only through `workflow_progress_request`.
- Step 9 exposes `attempt_completion`, completes successfully, and tears down active workflow state.
