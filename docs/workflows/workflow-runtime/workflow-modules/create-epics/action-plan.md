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

This plan builds and registers the product-owned `create-epics` workflow module described by [create-epics-requirements.md](./create-epics-requirements.md).

This plan also includes the approved shared runtime support required by the create-epics requirements:

- an optional workflow final-delivery finalization hook invoked after successful `attempt_completion` and before workflow teardown
- the specialized model-facing `upsert_epic` backend workflow tool
- create-epics module-owned document builders, epic parser/upsert/index helpers, per-step tool schemas, workflow definition, workflow forms, decision trees, registry wiring, and tests

Approved implementation decision:

- The user approved adding an optional workflow-definition finalization hook. `WorkflowRuntime.completeActiveWorkflowAfterFinalDelivery(...)` must invoke this hook before teardown. The create-epics module must use the hook to generate `Epics.index.json`. Workflows without a hook must retain existing teardown behavior.
- The finalization hook must receive a runtime-owned final-delivery artifact resolver so create-epics can resolve and persist `Epics.index.json` artifact metadata without allocating an empty index file, without module-local path construction, and without repurposing or renaming the existing `WorkflowArtifactAllocationOutput` capability.

Sibling-pattern audit summary:

- Final-delivery hook support must touch `types.ts`, `WorkflowRuntime.ts`, and runtime/attempt-completion tests.
- Tool registration must touch `shared/tools.ts`, `backendWorkflowToolContracts.ts`, `ToolExecutorCoordinator.ts`, `ResponseToolRegistry.ts`, `autoApprove.ts`, assistant-message parameter inventory, the handler file, and handler tests.
- Module-owned document/index logic must live under `src/core/task/workflow-runtime/workflow-modules/create-epics/`.
- Prompt/tool exposure must live only in `createEpicsToolSchemas.ts` through workflow step `buildToolSchema` delegation.
- Module registration must touch `WorkflowRegistry.ts`, registry/use-skill tests, module tests, and prompt-projection tests.

## Scope Boundary

- Do not migrate or revise `brainstorming`, `create-architecture`, `create-prd`, `pi-planning`, `create-story`, or any other workflow in this plan.
- Do not read `/Users/robertboston/Documents/Cline/Workflows/create-epics.md`, `.cline/skills/create-epics/epic-delivery-spec-template.md`, `_bmad/bmm/agents/pm.md`, BMAD workflow package files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime.
- Do not add static/default prompt or native-tool schemas for `create_workflow_artifact`, `build_workflow_document`, `set_workflow_values`, `archive_workflow_artifact`, `delete_workflow_artifact`, or `move_workflow_project_file`.
- Do not expose `build_workflow_document`, `apply_patch`, `set_workflow_values`, `workflow_progress_request`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, or `move_workflow_project_file` in the create-epics Step 2 model-facing schema.
- Do not ask the AI agent to write raw markdown sections into `Epics.md`; model-facing epic document mutation must happen through `upsert_epic`.
- Do not let create-epics generate stories, tasks, subtasks, action plans, acceptance criteria, or delivery specs.
- Do not add module-local artifact filename, identity, numbering, discovery, path-resolution, or path-policy logic for `Epics.md` or `Epics.index.json`.
- Do not add compatibility aliases for `create-epics.md`; the runtime workflow identity is `create-epics`.

## Known Issues / Risks / Technical Debt

- Current native tool-call handling serializes object and array parameters into JSON strings before handlers execute. `upsert_epic` must explicitly parse both already-materialized values and JSON strings so it works with current native and non-native tool-call paths.
- The final-delivery hook is a shared runtime seam, but this plan adds only the minimum hook behavior approved for create-epics. Do not extend it into a generalized workflow job framework.
- User-facing workflow form and prompt copy is prescribed by the module requirements. The current workflow-runtime module pattern stores module-owned copy in workflow definition and prompt-builder code rather than a `strings.xml`-style resource file. This plan follows that existing approved pattern and requires tests around the module-owned copy.

## Tasks / Subtasks

### Phase 1 - Shared Final-Delivery Finalization Hook

After completing this phase, pause for QA review before moving to Phase 2.

[x] Task 1. Add the optional workflow final-delivery finalization hook contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 1.1. In `src/core/task/workflow-runtime/types.ts`, add exported `WorkflowFinalDeliveryArtifactResolution` with required fields `artifactId`, `projectTitle`, `projectFolderName`, `artifactFamily`, `artifactIdentity`, `artifactFilename`, `artifactRelativePath`, `artifactAbsolutePath`, `parentIdentity`, `targetIdentity`, and `workflowValueWrites`. This type is final-delivery specific and must not replace, alias, or rename `WorkflowArtifactAllocationOutput`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 1.2. In `src/core/task/workflow-runtime/types.ts`, add `WorkflowFinalDeliveryFinalizationResult` as a union of `{ kind: "succeeded"; workflowValueWrites?: WorkflowValues }` and `{ kind: "failed"; errorMessage: string }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 1.3. In `src/core/task/workflow-runtime/types.ts`, add `WorkflowFinalDeliveryFinalizationInput` with required `session: ActiveWorkflowSession`, `workflowName: WorkflowName`, and `resolveArtifactOutput(artifactId: string): Promise<WorkflowFinalDeliveryArtifactResolution>` fields.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 1.4. In `src/core/task/workflow-runtime/types.ts`, add `WorkflowFinalDeliveryFinalizer` as an interface with `finalize(input: WorkflowFinalDeliveryFinalizationInput): WorkflowFinalDeliveryFinalizationResult | Promise<WorkflowFinalDeliveryFinalizationResult>`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 1.5. In `src/core/task/workflow-runtime/types.ts`, add optional `finalDeliveryFinalizer?: WorkflowFinalDeliveryFinalizer` to `WorkflowDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Task 2. Invoke the optional finalizer before workflow teardown.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`

[x] Subtask 2.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `completeActiveWorkflowAfterFinalDelivery(...)` so it resolves the active workflow definition and active session before teardown.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `completeActiveWorkflowAfterFinalDelivery(...)` so when the active workflow definition has no `finalDeliveryFinalizer`, it preserves the current behavior: teardown and return `persist_workflow_teardown`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `completeActiveWorkflowAfterFinalDelivery(...)` so it passes `resolveArtifactOutput(artifactId)` to the finalizer, backed by a new final-delivery-specific runtime artifact resolver that does not call, replace, alias, rename, or mutate `resolveWorkflowArtifactAllocation(...)` or `WorkflowArtifactAllocationOutput`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `completeActiveWorkflowAfterFinalDelivery(...)` so when `finalDeliveryFinalizer.finalize(...)` returns `{ kind: "succeeded" }`, it applies any returned `workflowValueWrites` through `applyWorkflowValueWrites(...)`, tears down the workflow, and returns `persist_workflow_teardown`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `completeActiveWorkflowAfterFinalDelivery(...)` so when `finalDeliveryFinalizer.finalize(...)` returns `{ kind: "failed" }`, it does not tear down the workflow and returns `terminal_error` with the finalizer error message.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.6. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `validateWorkflowDefinition(...)` so a provided `finalDeliveryFinalizer` must be an object with a callable `finalize` function.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.7. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, preserve the existing local `WorkflowArtifactAllocationOutput` interface and all existing allocation method signatures that use it. Do not add a compatibility alias for this type.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.8. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving a workflow with no finalizer retains the existing successful final-delivery teardown behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 2.9. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving a successful finalizer runs before teardown and receives the active workflow name, active session, and a working `resolveArtifactOutput(...)` helper.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 2.10. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving workflow-value writes returned by a successful finalizer are applied before teardown.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 2.11. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving a failed finalizer returns `terminal_error` and leaves `taskState.activeWorkflowName` and `taskState.activeWorkflowSession` intact.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 2.12. In `src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`, update or add coverage proving successful `attempt_completion` queues `persist_workflow_teardown` only after a successful workflow finalizer.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`

[x] Subtask 2.13. In `src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`, add coverage proving a failed workflow finalizer causes `attempt_completion` to queue `terminal_error` rather than `persist_workflow_teardown`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`

### Phase 2 - Create-Epics Document, Upsert, And Index Helpers

After completing this phase, pause for QA review before moving to Phase 3.

[x] Task 3. Create module-owned document and epic-section helpers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsDocument.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsDocument.test.ts`

[x] Subtask 3.1. Create `src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsDocument.ts` with exported heading constants for `# Context`, `## Architecture`, `## Brainstorming`, `## Additional Context`, and `# Epics`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsDocument.ts`

[x] Subtask 3.2. In `createEpicsDocument.ts`, export `buildInitialCreateEpicsDocumentFromSession(session: ActiveWorkflowSession): string` that renders exactly the required heading shell and writes non-empty `architecture_document`, `brainstorming_document`, and `additional_context_files` workflow values under their matching context headings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsDocument.ts`

[x] Subtask 3.3. In `createEpicsDocument.ts`, add exported `CreateEpicSectionInput` with required `identity`, `title`, `objective`, `description`, `requirements`, `scope`, and `scopeBoundary` fields matching the create-epics requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsDocument.ts`

[x] Subtask 3.4. In `createEpicsDocument.ts`, export `buildCanonicalEpicSection(input: CreateEpicSectionInput): string` that returns the exact markdown shape prescribed in the `upsert_epic` requirements, with a final trailing newline.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsDocument.ts`

[x] Subtask 3.5. In `createEpicsDocument.ts`, export `upsertCanonicalEpicSection(documentContent: string, input: CreateEpicSectionInput): string` that inserts or replaces exactly one `## Epic {identity}: {title}` section under `# Epics`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsDocument.ts`

[x] Subtask 3.6. In `createEpicsDocument.ts`, make `upsertCanonicalEpicSection(...)` preserve all other canonical epic sections and sort resulting epic sections by numeric identity.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsDocument.ts`

[x] Subtask 3.7. In `createEpicsDocument.ts`, export `parseCanonicalEpicIndexEntries(documentContent: string): readonly { identity: string; title: string }[]` that returns canonical `## Epic {identity}: {title}` headings with positive numeric identities and non-empty titles.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsDocument.ts`

[x] Subtask 3.8. In `createEpicsDocument.ts`, export `buildEpicsIndexJson(documentContent: string): string` that returns exactly the JSON schema `{ "version": 1, "epics": [{ "identity": "1", "title": "..." }] }`, ordered by numeric identity, with pretty JSON formatting and a final trailing newline.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsDocument.ts`

[x] Subtask 3.9. In `createEpicsDocument.ts`, make `buildEpicsIndexJson(...)` throw clear `Error` messages for no canonical epics and duplicate canonical epic identities. Malformed identities and empty titles must be rejected by `upsert_epic` before persistence, not handled as normal index-generation input.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsDocument.ts`

[x] Subtask 3.10. Create `src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsDocument.test.ts` with coverage proving the initial document builder renders the exact heading order and required context values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsDocument.test.ts`

[x] Subtask 3.11. In `createEpicsDocument.test.ts`, add coverage proving `buildCanonicalEpicSection(...)` returns the exact required epic markdown shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsDocument.test.ts`

[x] Subtask 3.12. In `createEpicsDocument.test.ts`, add coverage proving `upsertCanonicalEpicSection(...)` inserts, replaces, preserves other canonical sections, and orders sections by numeric identity.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsDocument.test.ts`

[x] Subtask 3.13. In `createEpicsDocument.test.ts`, add coverage proving `buildEpicsIndexJson(...)` succeeds for one and multiple canonical epics and returns no story, review, objective, scope, or requirements data.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsDocument.test.ts`

[x] Subtask 3.14. In `createEpicsDocument.test.ts`, add coverage proving `buildEpicsIndexJson(...)` fails clearly for no canonical epics and duplicate canonical epic identities.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsDocument.test.ts`

### Phase 3 - Upsert Epic Backend Tool

After completing this phase, pause for QA review before moving to Phase 4.

[x] Task 4. Register the `upsert_epic` tool identity and backend contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`

[x] Subtask 4.1. In `src/shared/tools.ts`, add `UPSERT_EPIC = "upsert_epic"` to `ClineDefaultTool` immediately after `APPEND_BRAINSTORMING_SELECTED_TECHNIQUE`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[x] Subtask 4.2. In `src/shared/tools.ts`, do not add `ClineDefaultTool.UPSERT_EPIC` to `READ_ONLY_TOOLS`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[x] Subtask 4.3. In `src/core/assistant-message/index.ts`, add `identity`, `objective`, `requirements`, `scope`, and `scope_boundary` to `toolParamNames`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`

[x] Subtask 4.4. In `src/core/task/tools/backendWorkflowToolContracts.ts`, add a `ClineDefaultTool.UPSERT_EPIC` contract with required parameters `identity`, `title`, `objective`, `description`, `requirements`, `scope`, and `scope_boundary`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

[x] Subtask 4.5. In `src/core/task/tools/backendWorkflowToolContracts.ts`, define the `objective` contract as an object with required string properties `as_a`, `i_want`, and `so_that`; omit `additionalProperties` because `BackendWorkflowToolSchemaNode` does not model boolean `false`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

[x] Subtask 4.6. In `src/core/task/tools/backendWorkflowToolContracts.ts`, define `requirements`, `scope`, and `scope_boundary` as arrays whose items are strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

[x] Subtask 4.7. In `src/core/task/tools/response/ResponseToolRegistry.ts`, add `ClineDefaultTool.UPSERT_EPIC: undefined` so the registry remains exhaustive and `upsert_epic` is not treated as a response tool.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

[x] Subtask 4.8. In `src/core/task/tools/autoApprove.ts`, add `ClineDefaultTool.UPSERT_EPIC` to the same write/edit approval branches as `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` and `ClineDefaultTool.APPLY_PATCH`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`

[x] Task 5. Implement and register `UpsertEpicToolHandler`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpsertEpicToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UpsertEpicToolHandler.test.ts`

[x] Subtask 5.1. Create `src/core/task/tools/handlers/UpsertEpicToolHandler.ts` exporting `UpsertEpicToolHandler implements IToolHandler` with `readonly name = ClineDefaultTool.UPSERT_EPIC`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpsertEpicToolHandler.ts`

[x] Subtask 5.2. In `UpsertEpicToolHandler.ts`, implement request parsing that accepts JSON-string or already-materialized values for `objective`, `requirements`, `scope`, and `scope_boundary`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpsertEpicToolHandler.ts`

[x] Subtask 5.3. In `UpsertEpicToolHandler.ts`, reject missing, empty, non-string, non-array, malformed, partial, or unsupported parameter shapes with a clear tool error.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpsertEpicToolHandler.ts`

[x] Subtask 5.4. In `UpsertEpicToolHandler.ts`, validate that `taskState.activeWorkflowName === "create-epics"` and `taskState.activeWorkflowSession` exists before reading or writing files.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpsertEpicToolHandler.ts`

[x] Subtask 5.5. In `UpsertEpicToolHandler.ts`, resolve the destination path only from the active workflow session's `output_file` workflow value, and reject calls when `output_file` is absent or not a non-empty string.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpsertEpicToolHandler.ts`

[x] Subtask 5.6. In `UpsertEpicToolHandler.ts`, validate the resolved `output_file` path through `ToolValidator.checkClineIgnorePath(...)` before file reads or writes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpsertEpicToolHandler.ts`

[x] Subtask 5.7. In `UpsertEpicToolHandler.ts`, read existing `Epics.md`, update it with `upsertCanonicalEpicSection(...)`, and write the updated content atomically only when the content changes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpsertEpicToolHandler.ts`

[x] Subtask 5.8. In `UpsertEpicToolHandler.ts`, mark `taskState.didEditFile = true` and clear the lowercased file-read cache entry when the document changes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpsertEpicToolHandler.ts`

[x] Subtask 5.9. In `UpsertEpicToolHandler.ts`, return structured JSON containing `persisted`, `identity`, `title`, and `epics` inventory from the updated canonical epic sections.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UpsertEpicToolHandler.ts`

[x] Subtask 5.10. In `src/core/task/tools/ToolExecutorCoordinator.ts`, import `UpsertEpicToolHandler` and register it for `ClineDefaultTool.UPSERT_EPIC` using the shared `ToolValidator`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[x] Subtask 5.11. Create `src/core/task/tools/handlers/__tests__/UpsertEpicToolHandler.test.ts` with coverage for active workflow gating, missing parameter rejection, malformed JSON rejection, empty value rejection, positive numeric identity validation, non-empty title validation, and `output_file` path resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UpsertEpicToolHandler.test.ts`

[x] Subtask 5.12. In `UpsertEpicToolHandler.test.ts`, add coverage for insertion, same-identity replacement, numeric ordering, preservation of other canonical epic sections, structured JSON result shape, and file-read cache invalidation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UpsertEpicToolHandler.test.ts`

[x] Subtask 5.13. In `UpsertEpicToolHandler.test.ts`, add coverage proving the handler rejects story/task/subtask/acceptance-criteria fields and unsupported extra top-level fields.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UpsertEpicToolHandler.test.ts`

[x] Subtask 5.14. In `UpsertEpicToolHandler.test.ts`, add coverage proving clineignore/path-policy rejection happens before file mutation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UpsertEpicToolHandler.test.ts`

### Phase 4 - Create-Epics Module Tool Schemas And Workflow Definition

After completing this phase, pause for QA review before moving to Phase 5.

[x] Task 6. Create module-owned create-epics tool schemas.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsToolSchemas.test.ts`

[x] Subtask 6.1. Create `src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsToolSchemas.ts` with exported `buildCreateEpicsStep1ToolSchemas(): readonly ClineToolSpec[]` returning an empty readonly array.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsToolSchemas.ts`

[x] Subtask 6.2. In `createEpicsToolSchemas.ts`, add named builders for `read_file`, `upsert_epic`, `send_user_message`, `ask_followup_question`, and `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsToolSchemas.ts`

[x] Subtask 6.3. In `createEpicsToolSchemas.ts`, define the `upsert_epic` schema with required parameters `identity`, `title`, `objective`, `description`, `requirements`, `scope`, and `scope_boundary`, using object/array schema shapes matching the backend contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsToolSchemas.ts`

[x] Subtask 6.4. In `createEpicsToolSchemas.ts`, export `buildCreateEpicsStep2ToolSchemas(): readonly ClineToolSpec[]` returning exactly `read_file`, `upsert_epic`, `send_user_message`, `ask_followup_question`, and `attempt_completion` in that order.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsToolSchemas.ts`

[x] Subtask 6.5. Create `src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsToolSchemas.test.ts` proving Step 1 returns an empty array and Step 2 returns exactly `read_file`, `upsert_epic`, `send_user_message`, `ask_followup_question`, and `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsToolSchemas.test.ts`

[x] Subtask 6.6. In `createEpicsToolSchemas.test.ts`, add coverage proving Step 2 does not include `build_workflow_document`, `apply_patch`, `set_workflow_values`, `workflow_progress_request`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, or `move_workflow_project_file`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsToolSchemas.test.ts`

[ ] Task 7. Create the create-epics workflow definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

[ ] Subtask 7.1. Create `src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts` with `CreateEpicsWorkflowValueKey` enum containing every workflow value key listed in `create-epics-requirements.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.2. In `createEpicsWorkflow.ts`, add module-owned identity constants for `name: "create-epics"`, `displayName: "Create Epics"`, `slashCommandName: "create-epics"`, `useSkillName: "create-epics"`, `projectSubfolder: "planning"`, and the exact requirements-prescribed description.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.3. In `createEpicsWorkflow.ts`, add the module-owned product-manager persona exactly as prescribed in `create-epics-requirements.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.4. In `createEpicsWorkflow.ts`, define artifact ids `EPICS_DOCUMENT_ARTIFACT_ID = "epics"` and `EPICS_INDEX_ARTIFACT_ID = "epics_index"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.5. In `createEpicsWorkflow.ts`, define artifact definitions for `WorkflowArtifactFamily.Epics` and `WorkflowArtifactFamily.EpicsIndex`, mapping `artifactAbsolutePath` to `output_file` and `epics_index_file` respectively.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.6. In `createEpicsWorkflow.ts`, add a Step 1 architecture prerequisite workflow form using `selectorDiscovery.root.kind: "selected_project_root"` and target path segments `["planning"]` for `architecture.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.7. In `createEpicsWorkflow.ts`, ensure the Step 1 architecture prerequisite form persists the selected architecture path to `architecture_document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.8. In `createEpicsWorkflow.ts`, ensure the Step 1 architecture prerequisite form copy identifies `create-architecture` as the workflow the user must run first when no valid architecture file is available.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.9. In `createEpicsWorkflow.ts`, add the Step 1 context workflow form with Panel A, Panel B, and Panel C exactly as prescribed in `create-epics-requirements.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.10. In `createEpicsWorkflow.ts`, configure Panel A to persist required boolean `has_brainstorming_document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.11. In `createEpicsWorkflow.ts`, configure Panel B to appear only when Panel A is yes, require a small text area, and persist `brainstorming_document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.12. In `createEpicsWorkflow.ts`, configure Panel A's no branch to clear stale `brainstorming_document` before Panel C.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.13. In `createEpicsWorkflow.ts`, configure Panel C as an optional large text area that persists `additional_context_files` only when provided.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.14. In `createEpicsWorkflow.ts`, define Step 1 decision-tree branches so `entry_artifact_resolution_completed` with `creationRequired: true` renders the architecture prerequisite form, then the context form, then allocates `Epics.md`, then builds the initial document shell, then transitions to Step 2.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.15. In `createEpicsWorkflow.ts`, define Step 1 decision-tree branches so `entry_artifact_resolution_completed` with `creationRequired: false` renders the architecture prerequisite form, then the context form, then transitions to Step 2 without `allocate_artifact` and without `build_workflow_document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.16. In `createEpicsWorkflow.ts`, define Step 1 allocation retry behavior exactly once before `terminal_error` when allocation fails.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.17. In `createEpicsWorkflow.ts`, define Step 1 initial shell build failure behavior as `terminal_error`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.18. In `createEpicsWorkflow.ts`, define Step 2 prompt source with the exact Step 2 behavior from `create-epics-requirements.md`, including `upsert_epic` instructions and the final `pi-planning` reminder.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.19. In `createEpicsWorkflow.ts`, ensure Step 2 prompt source renders `output_file`, `architecture_document`, `brainstorming_document`, and `additional_context_files` through `input.renderWorkflowValue(...)` rather than reconstructing paths.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.20. In `createEpicsWorkflow.ts`, define Step 2 decision tree to enter model-driven work through `project_prompt`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.21. In `createEpicsWorkflow.ts`, add `finalDeliveryFinalizer` that uses `input.resolveArtifactOutput(EPICS_INDEX_ARTIFACT_ID)` to resolve the runtime-owned `Epics.index.json` artifact output.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.22. In `createEpicsWorkflow.ts`, make `finalDeliveryFinalizer` read `output_file`, build index JSON with `buildEpicsIndexJson(...)`, write to the resolved index artifact absolute path, and return `{ kind: "succeeded"; workflowValueWrites: resolvedIndexArtifact.workflowValueWrites }` on success.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.23. In `createEpicsWorkflow.ts`, make `finalDeliveryFinalizer` return `{ kind: "failed"; errorMessage }` when `output_file`, artifact output resolution, file reading, index parsing, or index writing fails.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.24. In `createEpicsWorkflow.ts`, export `createEpicsWorkflowDefinition` with exactly two steps: `step-1` checklist label `Gather Inputs` and `step-2` checklist label `Draft Epics`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

[ ] Subtask 7.25. Create `src/core/task/workflow-runtime/workflow-modules/create-epics/index.ts` exporting `createEpicsWorkflowDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/index.ts`

[ ] Subtask 7.26. Create `src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts` with coverage for workflow identity, metadata, persona, project subfolder, workflow value inventory, entry project value keys, artifact definitions, and output value mappings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

[ ] Subtask 7.27. In `createEpicsWorkflow.test.ts`, add coverage for the Step 1 architecture prerequisite form, missing-architecture user-facing failure copy, and selected architecture persistence to `architecture_document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

[ ] Subtask 7.28. In `createEpicsWorkflow.test.ts`, add coverage for Step 1 context form Panel A, Panel B, Panel C, stale `brainstorming_document` clearing, and optional `additional_context_files` persistence.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

[ ] Subtask 7.29. In `createEpicsWorkflow.test.ts`, add coverage for Step 1 `creationRequired: true` route through prerequisite form, context form, allocation, shell build, and Step 2 transition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

[ ] Subtask 7.30. In `createEpicsWorkflow.test.ts`, add coverage for Step 1 `creationRequired: false` route through prerequisite form, context form, and Step 2 transition with no allocation and no shell build.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

[ ] Subtask 7.31. In `createEpicsWorkflow.test.ts`, add coverage for Step 2 prompt source, Step 2 exact tool schema output, absence of forbidden model-facing tools, and final-delivery finalizer success/failure behavior including returned `epics_index_file` workflow-value writes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

### Phase 5 - Workflow Registration And Prompt Projection

After completing this phase, pause for QA review before moving to Phase 6.

[ ] Task 8. Register the create-epics workflow.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`

[ ] Subtask 8.1. In `src/core/task/workflow-runtime/WorkflowRegistry.ts`, import `createEpicsWorkflowDefinition` from the create-epics module.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[ ] Subtask 8.2. In `src/core/task/workflow-runtime/WorkflowRegistry.ts`, add `createEpicsWorkflowDefinition` to `shippedWorkflowDefinitions`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[ ] Subtask 8.3. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add registry coverage proving `resolveWorkflowDefinition("create-epics")` returns the workflow and `resolveWorkflowDefinition("create-epics.md")` returns undefined.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 8.4. In `src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`, add coverage proving `resolveWorkflowByUseSkillName("create-epics")` returns the create-epics workflow.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`

[ ] Task 9. Add prompt-projection and response-tool integration coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[ ] Subtask 9.1. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, add coverage proving create-epics current step details appear in the input payload and not workflow system instructions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 9.2. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, add coverage proving create-epics Step 2 native tool schema projection is exactly `read_file`, `upsert_epic`, `send_user_message`, `ask_followup_question`, and `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 9.3. In `src/core/prompts/system-prompt/__tests__/response_tools.test.ts`, add or update coverage proving create-epics Step 2 response-tool guidance includes only projected response tools from the active schema and does not mention `upsert_epic` as a response tool.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts`

[ ] Subtask 9.4. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, add coverage proving create-epics workflow metadata persists workflow identity, persona, steps, `output_file`, and `epics_index_file` values without `.md` workflow identity aliases.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

### Phase 6 - Validation

[ ] Task 10. Run focused create-epics module and handler validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/action-plan.md`

[ ] Subtask 10.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsDocument.test.ts src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/action-plan.md`

[ ] Subtask 10.2. Run `npm run test:unit -- src/core/task/tools/handlers/__tests__/UpsertEpicToolHandler.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/action-plan.md`

[ ] Task 11. Run shared runtime and prompt-projection validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/action-plan.md`

[ ] Subtask 11.1. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/action-plan.md`

[ ] Subtask 11.2. Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/prompts/system-prompt/__tests__/response_tools.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/action-plan.md`

[ ] Task 12. Run typecheck, lint, and static guards.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/action-plan.md`

[ ] Subtask 12.1. Run `npm run check-types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/action-plan.md`

[ ] Subtask 12.2. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/action-plan.md`

[ ] Subtask 12.3. Run `rg -n "build_workflow_document|apply_patch|set_workflow_values|workflow_progress_request|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file" src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsToolSchemas.ts` and confirm no forbidden tool appears in Step 2 schema output.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/action-plan.md`

[ ] Subtask 12.4. Run `rg -n "create-epics\\.md|createEpics\\.md|/Users/robertboston/Documents/Cline/Workflows/create-epics.md|epic-delivery-spec-template.md|_bmad/bmm/agents/pm.md" src/core/task/workflow-runtime/workflow-modules/create-epics src/core/task/workflow-runtime/WorkflowRegistry.ts` and confirm no runtime dependency on migration source files or `.md` workflow identity aliases.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/action-plan.md`
