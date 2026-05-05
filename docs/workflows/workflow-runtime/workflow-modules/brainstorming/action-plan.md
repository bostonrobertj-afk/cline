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

This plan builds the product-owned `brainstorming` workflow module described by [brainstorming-requirements.md](./brainstorming-requirements.md) and registers it as a shipped workflow named `brainstorming`.

This plan also includes the minimum shared runtime support required by the brainstorming requirements:

- a runtime-owned singleton artifact family for `brainstorming.md`
- a non-tool deterministic decision action for Step 2 random technique selection
- the AI-callable `get_brainstorming_methods` and `append_brainstorming_selected_technique` tools
- generic workflow teardown after successful final delivery through `attempt_completion`

Sibling-pattern audit summary:

- Artifact family registration must touch `artifactFamilies.ts`, `types.ts`, `WorkflowRuntime.ts`, and runtime/tool tests.
- Tool registration must touch `shared/tools.ts`, `backendWorkflowToolContracts.ts`, `ToolExecutorCoordinator.ts`, handler files, and handler tests. No static prompt tool file may be added.
- Module registration must touch `WorkflowRegistry.ts` and module tests.
- Prompt/tool exposure must live only in the brainstorming module's `buildToolSchema` implementations and tests.

## Scope Boundary

- Do not migrate any workflow other than `brainstorming`.
- Do not reintroduce `brainstormingTechniqueLibrary.ts`, `brainstormingSessionFiles.ts`, `prepare-brainstorming-session.ts`, or `capture-brainstorming-topic.ts`.
- Do not read `.cline/skills/bmad-brainstorming/brain-methods.csv`, `_bmad/core/skills/bmad-brainstorming/brain-methods.csv`, `.cline/skills/bmad-brainstorming/template.md`, or `/Users/robertboston/Documents/Cline/Workflows/brainstorming.md` at runtime.
- Do not add static/default prompt or native-tool schemas for `get_brainstorming_methods`, `append_brainstorming_selected_technique`, `create_workflow_artifact`, `build_workflow_document`, `set_workflow_values`, or `workflow_progress_request`.
- Do not add `select_random_brainstorming_technique` as a tool, enum member, handler, contract, or schema.
- Do not change real markdown output filename `brainstorming.md`; only workflow identity must be unsuffixed.

## Known Issues / Risks / Technical Debt

- The current runtime action surface has no non-tool deterministic state-mutation action. Phase 1 must add that surface before the brainstorming module can implement random technique selection without violating `FR-16a` through `FR-16d`.
- `attempt_completion` currently does not notify `WorkflowRuntime` after final delivery. Phase 1 must add a generic workflow teardown hook for successful final delivery; do not solve this with a brainstorming-specific completion handler.
- The existing `workflowPersonaRegistry.ts` still contains a `brainstorming.md` workflow identifier. It is not the canonical module persona owner, but the brainstorming module build must update that remaining live reference to `brainstorming`.
- User-facing workflow form and prompt copy is prescribed by the brainstorming requirements and the current workflow-runtime pattern stores module-owned copy in workflow definitions/prompt builders, not in a `strings.xml`-style resource file. This plan follows that existing architecture and requires tests around the module-owned copy.
- This plan intentionally leaves physical deletion of `.cline/skills/bmad-brainstorming/**` package content for cleanup. The module build must make those files non-runtime dependencies by migrating required content into code.

## Tasks / Subtasks

### Phase 1 - Shared Runtime Support Required By Brainstorming

After completing this phase, pause for QA review before moving to Phase 2.

[x] Task 1. Add the runtime-owned `brainstorming.md` artifact family.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 1.1. In `src/core/task/workflow-runtime/artifactFamilies.ts`, add `WorkflowArtifactFamily.BrainstormingSession = "brainstorming_session"` and add a registry entry whose allocation mode is `singleton_project`, identity requirement is `none`, filename pattern is `brainstorming.md`, file extension is `.md`, content kind is `markdown`, numbering scope is `project_singleton`, singleton identity is `brainstorming_session`, and discovery pattern is `/^brainstorming\.md$/`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 1.2. In `src/core/task/workflow-runtime/artifactFamilies.ts`, extend `WorkflowSingletonProjectArtifactFamilyDefinition` so its `family` union includes `WorkflowArtifactFamily.BrainstormingSession` and its `singletonIdentity` union includes `"brainstorming_session"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 1.3. In `src/core/task/workflow-runtime/types.ts`, extend the singleton-project branch of `WorkflowArtifactDefinition` so `family` may be `WorkflowArtifactFamily.BrainstormingSession`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 1.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add `WorkflowArtifactFamily.BrainstormingSession` to the singleton identity branch in `resolveWorkflowArtifactIdentity(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 1.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add `WorkflowArtifactFamily.BrainstormingSession` to the no-parsed-identity branch in `parseWorkflowArtifactFilenameIdentity(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 1.6. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving a workflow artifact definition using `WorkflowArtifactFamily.BrainstormingSession` resolves to `<cwd>/<projectFolder>/discovery/brainstorming.md`, persists `brainstorming_session` as artifact identity, and maps `artifactAbsolutePath` into a module-defined `output_file` value key.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 1.7. In `src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`, add handler coverage proving `create_workflow_artifact` can create the brainstorming singleton artifact and returns `artifact_family: "brainstorming_session"`, `artifact_identity: "brainstorming_session"`, and `artifact_filename: "brainstorming.md"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Task 2. Add deterministic procedure support to the workflow decision-action surface.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 2.1. In `src/core/task/workflow-runtime/types.ts`, add `WorkflowDeterministicProcedureResult` as a union of `{ kind: "succeeded"; workflowValueWrites?: WorkflowValues }` and `{ kind: "failed"; errorMessage: string }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 2.2. In `src/core/task/workflow-runtime/types.ts`, add `WorkflowDeterministicProcedureActionInstruction` with `run(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult | Promise<WorkflowDeterministicProcedureResult>`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 2.3. In `src/core/task/workflow-runtime/types.ts`, add `{ kind: "run_deterministic_procedure"; instruction: WorkflowDeterministicProcedureActionInstruction }` to `WorkflowDecisionAction`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 2.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `buildNextActionFromDecisionTreeAction(...)` so `run_deterministic_procedure` executes the instruction, applies successful `workflowValueWrites` through `applyWorkflowValueWrites(...)`, re-enters `resolveNextAction(...)`, and routes failed results to `buildTerminalErrorNextAction(...)` with the returned error message.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `validateWorkflowDefinition(...)` so a `run_deterministic_procedure` route requires an instruction object with a callable `run` function.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.6. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving a deterministic procedure can persist workflow values and continue next-action evaluation without creating a tool-backed operation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 2.7. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving a failed deterministic procedure tears down through `terminal_error` and does not emit `execute_tool_backed_operation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 3. Add generic workflow teardown after successful `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 3.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add a public method `completeActiveWorkflowAfterFinalDelivery(args: { taskState: TaskState }): Promise<WorkflowNextAction>` that no-ops when no workflow is active, otherwise tears down the workflow and returns `persist_workflow_teardown`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 3.2. In `src/core/task/tools/handlers/AttemptCompletionHandler.ts`, after `responseToolRuntime.finalizeSuccess(...)` succeeds and before returning that success result, call `workflowRuntime.completeActiveWorkflowAfterFinalDelivery(...)` only when `taskState.activeWorkflowSession` exists.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts`

[x] Subtask 3.3. In `src/core/task/tools/handlers/AttemptCompletionHandler.ts`, queue the returned `persist_workflow_teardown` action through `callbacks.queueWorkflowNextAction(...)` when `completeActiveWorkflowAfterFinalDelivery(...)` returns a non-`no_op` next action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts`

[x] Subtask 3.4. In `src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`, add coverage proving successful `attempt_completion` with an active workflow clears workflow state and queues `persist_workflow_teardown`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`

[x] Subtask 3.5. In `src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`, add coverage proving denied, invalid, or failed `attempt_completion` does not clear active workflow state.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`

### Phase 2 - Brainstorming Module Data And Document Builders

After completing this phase, pause for QA review before moving to Phase 3.

[x] Task 4. Create the module-owned brainstorming technique registry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingTechniqueRegistry.test.ts`

[x] Subtask 4.1. Create `src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry.ts` with exported `BrainstormingTechniqueCategory` enum values `Collaborative`, `Creative`, `Deep`, `IntrospectiveDelight`, `Structured`, `Theatrical`, `Wild`, `Biomimetic`, `Quantum`, and `Cultural`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry.ts`

[x] Subtask 4.2. In `brainstormingTechniqueRegistry.ts`, add exported `BrainstormingTechnique` interface with required `id`, `name`, `category`, and `description` fields.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry.ts`

[x] Subtask 4.3. In `brainstormingTechniqueRegistry.ts`, migrate all 61 rows from `.cline/skills/bmad-brainstorming/brain-methods.csv` into a readonly `BRAINSTORMING_TECHNIQUES` array using lowercase kebab-case ids derived from each technique name, preserving each source technique name, category, and description exactly.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry.ts`

[x] Subtask 4.4. In `brainstormingTechniqueRegistry.ts`, export `listBrainstormingTechniqueCategories()` returning the ten display categories in the exact Step 2 dropdown order from the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry.ts`

[x] Subtask 4.5. In `brainstormingTechniqueRegistry.ts`, export `listBrainstormingTechniquesByCategory(category: BrainstormingTechniqueCategory): readonly BrainstormingTechnique[]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry.ts`

[x] Subtask 4.6. In `brainstormingTechniqueRegistry.ts`, export `findBrainstormingTechniqueByIdOrName(input: { id?: string; name?: string }): BrainstormingTechnique | undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry.ts`

[x] Subtask 4.7. In `brainstormingTechniqueRegistry.ts`, export `selectRandomBrainstormingTechnique(input: { excludedIds: readonly string[]; random?: () => number }): BrainstormingTechnique | undefined` that filters excluded ids, uses the supplied random function when present, and returns `undefined` when no eligible entries remain.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry.ts`

[x] Subtask 4.8. Create `src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingTechniqueRegistry.test.ts` with coverage for row count, category order, category filtering, id/name lookup, excluded-id random selection, and no-runtime-CSV dependency.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingTechniqueRegistry.test.ts`

[x] Task 5. Create brainstorming document and tool-schema helpers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingDocument.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingDocument.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingToolSchemas.test.ts`

[x] Subtask 5.1. Create `brainstormingDocument.ts` with exported heading constants for `stepsCompleted`, `inputDocuments`, `session topic`, `session goals`, `selected approach`, `selected techniques`, `ideas generated`, and `context file`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingDocument.ts`

[x] Subtask 5.2. In `brainstormingDocument.ts`, export `buildInitialBrainstormingDocument(): string` that returns a markdown document containing exactly those H1 headings in requirements order and no source-template file reads.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingDocument.ts`

[x] Subtask 5.3. In `brainstormingDocument.ts`, export `buildBrainstormingDocumentFromSession(session: ActiveWorkflowSession): string` that renders the same heading shell and inserts `context_file`, `session_topic`, `session_goals`, `selected_approach`, `selected_techniques`, `techniques_used`, and `ideas_generated` from workflow values when present.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingDocument.ts`

[x] Subtask 5.4. In `brainstormingDocument.ts`, render `selected_techniques` as bullet lines containing technique name and description when it is an array, and render non-array placeholder text only for the approved `user requested technique suggestion` line.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingDocument.ts`

[x] Subtask 5.5. Create `brainstormingToolSchemas.ts` with helper functions returning `ClineToolSpec` entries only for currently existing tools: `build_workflow_document`, `workflow_progress_request`, `set_workflow_values`, and `attempt_completion`. Do not add helpers for `get_brainstorming_methods` or `append_brainstorming_selected_technique` in Phase 2 because their `ClineDefaultTool` enum members are introduced in Phase 3.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingToolSchemas.ts`

[x] Subtask 5.6. In `brainstormingToolSchemas.ts`, make the Step 3 `set_workflow_values` schema expose only `techniques_used` and `ideas_generated`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingToolSchemas.ts`

[x] Subtask 5.7. In `brainstormingToolSchemas.ts`, do not include `create_workflow_artifact` or `select_random_brainstorming_technique` in any helper.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingToolSchemas.ts`

[x] Subtask 5.8. Create `brainstormingDocument.test.ts` with coverage for initial headings, Step 1 value rendering, selected-technique array rendering, suggestion placeholder rendering, and ideas/techniques-used rendering.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingDocument.test.ts`

[x] Subtask 5.9. Create `brainstormingToolSchemas.test.ts` with coverage proving the Phase 2 helper surface can build schemas for `build_workflow_document`, `workflow_progress_request`, `set_workflow_values`, and `attempt_completion`, and proving `selected_techniques` is never present in the `set_workflow_values` schema. Do not assert `get_brainstorming_methods` or `append_brainstorming_selected_technique` exposure until Phase 3 adds their enum members.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingToolSchemas.test.ts`

### Phase 3 - Shared Brainstorming Tools

After completing this phase, pause for QA review before moving to Phase 4.

[x] Task 6. Add the shared brainstorming method and selected-technique append tools.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/GetBrainstormingMethodsToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/AppendBrainstormingSelectedTechniqueToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/GetBrainstormingMethodsToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/AppendBrainstormingSelectedTechniqueToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingToolSchemas.test.ts`

[x] Subtask 6.1. In `src/shared/tools.ts`, add enum members `GET_BRAINSTORMING_METHODS = "get_brainstorming_methods"` and `APPEND_BRAINSTORMING_SELECTED_TECHNIQUE = "append_brainstorming_selected_technique"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[x] Subtask 6.2. In `src/shared/tools.ts`, add `ClineDefaultTool.GET_BRAINSTORMING_METHODS` to `READ_ONLY_TOOLS` and do not add `ClineDefaultTool.APPEND_BRAINSTORMING_SELECTED_TECHNIQUE` to `READ_ONLY_TOOLS`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[x] Subtask 6.3. In `src/core/task/tools/backendWorkflowToolContracts.ts`, add a zero-parameter backend contract for `ClineDefaultTool.GET_BRAINSTORMING_METHODS`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

[x] Subtask 6.4. In `src/core/task/tools/backendWorkflowToolContracts.ts`, add a backend contract for `ClineDefaultTool.APPEND_BRAINSTORMING_SELECTED_TECHNIQUE` with required string parameters `name` and `description`, optional string parameters `id` and `category`, and no additional mutation parameters.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

[x] Subtask 6.5. Create `src/core/task/tools/handlers/GetBrainstormingMethodsToolHandler.ts` with an `IToolHandler` implementation that accepts no parameters, reads the module-owned brainstorming technique registry, returns JSON containing category/name/description/id for every technique, never writes workflow values, and never touches the filesystem.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/GetBrainstormingMethodsToolHandler.ts`

[x] Subtask 6.6. Create `src/core/task/tools/handlers/AppendBrainstormingSelectedTechniqueToolHandler.ts` with an `IToolHandler` implementation that rejects calls unless `taskState.activeWorkflowName === "brainstorming"` and an active workflow session exists.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/AppendBrainstormingSelectedTechniqueToolHandler.ts`

[x] Subtask 6.7. In `src/core/task/tools/handlers/AppendBrainstormingSelectedTechniqueToolHandler.ts`, implement parameter parsing so `name` and `description` are required non-empty strings and `id` and `category` are optional non-empty strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/AppendBrainstormingSelectedTechniqueToolHandler.ts`

[x] Subtask 6.8. In `src/core/task/tools/handlers/AppendBrainstormingSelectedTechniqueToolHandler.ts`, validate the accepted technique against the brainstorming registry by stable id when provided, otherwise by name, and return a tool error when no registry entry matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/AppendBrainstormingSelectedTechniqueToolHandler.ts`

[x] Subtask 6.9. In `src/core/task/tools/handlers/AppendBrainstormingSelectedTechniqueToolHandler.ts`, read the existing `selected_techniques` workflow value, require it to be absent or an array of objects, append the accepted technique, de-dupe by stable id when present otherwise by name, and call `workflowRuntime.applyWorkflowValueWrites(...)` with the complete updated `selected_techniques` array.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/AppendBrainstormingSelectedTechniqueToolHandler.ts`

[x] Subtask 6.10. In `src/core/task/tools/handlers/AppendBrainstormingSelectedTechniqueToolHandler.ts`, after a successful changed write, call `workflowRuntime.resolveNextAction(...)` and queue any non-`no_op` result through `callbacks.queueWorkflowNextAction(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/AppendBrainstormingSelectedTechniqueToolHandler.ts`

[x] Subtask 6.11. In `src/core/task/tools/ToolExecutorCoordinator.ts`, import and register `GetBrainstormingMethodsToolHandler` under `ClineDefaultTool.GET_BRAINSTORMING_METHODS`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[x] Subtask 6.12. In `src/core/task/tools/ToolExecutorCoordinator.ts`, import and register `AppendBrainstormingSelectedTechniqueToolHandler` under `ClineDefaultTool.APPEND_BRAINSTORMING_SELECTED_TECHNIQUE`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[x] Subtask 6.13. Create `src/core/task/tools/handlers/__tests__/GetBrainstormingMethodsToolHandler.test.ts` with coverage proving the handler returns the full code-owned inventory and does not call workflow mutation APIs.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/GetBrainstormingMethodsToolHandler.test.ts`

[x] Subtask 6.14. Create `src/core/task/tools/handlers/__tests__/AppendBrainstormingSelectedTechniqueToolHandler.test.ts` with coverage for active-workflow gating, missing required parameters, registry validation failure, append-without-overwrite behavior, and de-dupe behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/AppendBrainstormingSelectedTechniqueToolHandler.test.ts`

[x] Subtask 6.15. In `brainstormingToolSchemas.ts`, after `ClineDefaultTool.GET_BRAINSTORMING_METHODS` and `ClineDefaultTool.APPEND_BRAINSTORMING_SELECTED_TECHNIQUE` exist, add helper support for `get_brainstorming_methods` and `append_brainstorming_selected_technique` so the Step 3 suggest variant can expose those tools.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingToolSchemas.ts`

[x] Subtask 6.16. In `brainstormingToolSchemas.test.ts`, add coverage proving Step 3 suggest exposes `get_brainstorming_methods` and `append_brainstorming_selected_technique`, and Step 3 choose/random omits those two tools.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingToolSchemas.test.ts`

[x] Subtask 6.17. In `src/core/task/tools/response/ResponseToolRegistry.ts`, add exhaustive `RESPONSE_TOOL_METADATA` entries for `ClineDefaultTool.GET_BRAINSTORMING_METHODS` and `ClineDefaultTool.APPEND_BRAINSTORMING_SELECTED_TECHNIQUE`, both set to `undefined` because they are backend workflow tools, not response tools.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

[x] Subtask 6.18. In `src/core/assistant-message/index.ts`, extend `toolParamNames` with backend workflow tool parameter names from `backendWorkflowToolContracts.ts` that are not already present: `values`, `artifact_id`, `destination_path`, `workflow_value_writes`, `name`, `description`, `id`, and `category`. Do not widen `ToolUse.params` to arbitrary string keys and do not reintroduce type assertions in tests to hide missing tool parameter names.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`

### Phase 4 - Brainstorming Workflow Definition And Registration

After completing this phase, pause for QA review before moving to Phase 5.

[ ] Task 7. Implement and register the brainstorming workflow definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 7.1. Create `brainstormingWorkflow.ts` exporting `brainstormingWorkflowDefinition` with `name`, `slashCommandName`, and `useSkillName` all set to `brainstorming`, `persona` set to `analyst`, and `projectSubfolder` set to `discovery`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.2. In `brainstormingWorkflow.ts`, declare `workflowValueKeys` containing every key listed in the Runtime-Owned Values section of `brainstorming-requirements.md`, including `output_file` and artifact metadata keys.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.3. In `brainstormingWorkflow.ts`, declare `entryProjectValueKeys` mapping exactly to `projectMode`, `projectTitle`, and `projectFolderName`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.4. In `brainstormingWorkflow.ts`, declare an artifact definition with id `brainstorming_session`, family `WorkflowArtifactFamily.BrainstormingSession`, intent mode `new`, no parent or target identity source, and `outputValueKeys.artifactAbsolutePath` mapped to `output_file`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.5. In `brainstormingWorkflow.ts`, add the mandatory entry-panel copy for the shared entry `WorkflowForm`, describing the brainstorming workflow without adding a landing page or unrelated workflow behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.6. In `brainstormingWorkflow.ts`, define the Step 1 setup workflow form as one multi-panel form with these exact panels: Panel 1 shows `You can provide a file to be used as context. If you have a file you'd like to use, enter the file path below. If not, leave the text box empty and click continue` and collects optional `context_file` through a small text area; Panel 2 shows `Please share the details of the topic, problem, or opportunity you'd like to focus on during this session` and collects required `session_topic` through a large text area; Panel 3 shows `Do you have any specific goals for this session?` and collects required `has_session_goals` through a yes/no boolean field; Panel 4 is conditional on `has_session_goals` being yes, shows `What are your goals for this session?`, and collects required `session_goals` through a large text area.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.7. In `brainstormingWorkflow.ts`, define the Step 2 approach workflow form as one multi-panel form whose first panel asks `How would you like to select the brainstorming approach for this session?` and collects required `selected_approach` with exactly these radio options: `I want to choose`, `I want a random technique`, and `I want you to suggest a technique`; whose choose-path category panel title is `Which category would you like to explore?` and uses one dropdown with exactly `Collaborative`, `Creative`, `Deep`, `Introspective Delight`, `Structured`, `Theatrical`, `Wild`, `Biomimetic`, `Quantum`, and `Cultural`; whose choose-path technique panel title is `Which technique would you like?` and uses one dropdown populated from the selected registry category; and whose random-confirmation panel shows `Random Technique: {technique name}`, `About This Technique: {technique description}`, and `Ready to get started?` before collecting required `random_technique_confirmation` with confirm/retry choices.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.8. In `brainstormingWorkflow.ts`, implement Step 1 decision tree routes in this exact order: allocate artifact, retry allocation once on failure, terminal error on retry failure, build initial shell, terminal error on initial-shell failure, render Step 1 form, build submitted-values document, transition to Step 2.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.9. In `brainstormingWorkflow.ts`, implement Step 2 choose-path decision routes so choosing category/technique persists `selected_approach` and `selected_techniques`, writes the selected technique under `selected techniques`, and transitions to Step 3 after the document write succeeds.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.10. In `brainstormingWorkflow.ts`, implement Step 2 random-path decision routes using `run_deterministic_procedure` to select `random_technique_candidate`, maintain `random_technique_rejected_ids`, render the random confirmation panel, persist confirmed candidates into `selected_techniques`, write the confirmed technique under `selected techniques`, retry on `random_technique_confirmation = retry`, and terminal-error when the registry has no eligible candidate.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.11. In `brainstormingWorkflow.ts`, implement Step 2 suggest-path decision routes so `selected_approach` is persisted, `user requested technique suggestion` is written under `selected techniques`, and Step 2 transitions to Step 3 only after that document write succeeds.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.12. In `brainstormingWorkflow.ts`, implement Step 3 `buildPromptSource(...)` keyed only from `selected_approach`: when it is `I want you to suggest a technique`, start with `Read {output_file}.` then instruct the model to call `get_brainstorming_methods`, select and propose an appropriate technique, call `append_brainstorming_selected_technique` only after user acceptance, not call `set_workflow_values` for `selected_techniques`, call `build_workflow_document` to replace `user requested technique suggestion` under `selected techniques` in `{output_file}`, and then continue with the shared facilitation instructions; when it is `I want to choose` or `I want a random technique`, start with `Read {output_file}.` then `Use the already selected brainstorming technique recorded in {output_file}. Do not call get_brainstorming_methods.` and then include the same shared facilitation instructions: `Goal: Guide an interactive brainstorming session from setup through technique selection, idea capture, and final organization, pausing whenever user input or confirmation is needed.`, `Engage the user in interactive brainstorming using the selected approach.`, `Keep the user in control at each decision point. Pause for clarification, a technique switch, or continuation whenever needed. Record techniques_used and ideas_generated in {output_file} as needed.`, `The goal is to generate as many ideas as possible without exhausting the user.`, `Techniques for keeping brainstorming going: ask probing questions, ask users how the current idea connects to an earlier idea, offer challenges to the user's idea or assumptions, offer new ideas or angles to keep the conversation going.`, and `Once the user indicates they're ready, use workflow_progress_request to confirm and unlock the next workflow step.`

Required Step 3 suggestion-variant prompt text:

```text
Read `{output_file}`.

Call `get_brainstorming_methods` to retrieve the list of supported brainstorming methods. Select a brainstorming technique that seems appropriate based on the topic indicated in `{output_file}`. Propose the selected technique to the user.

After the user accepts the proposed technique, call `append_brainstorming_selected_technique` with the accepted technique name, description, and category/id when available. Do not call `set_workflow_values` for `selected_techniques`.

Then call `build_workflow_document` to replace the `user requested technique suggestion` line under the `selected techniques` heading in `{output_file}` with the accepted technique name and description.

After the accepted technique has been appended and written to `{output_file}`, continue with the shared brainstorming facilitation instructions below.
```

Required Step 3 choose/random opening prompt text:

```text
Read `{output_file}`.

Use the already selected brainstorming technique recorded in `{output_file}`. Do not call `get_brainstorming_methods`.
```

Required Step 3 shared facilitation prompt text:

```text
Goal: Guide an interactive brainstorming session from setup through technique selection, idea capture, and final organization, pausing whenever user input or confirmation is needed.

- Engage the user in interactive brainstorming using the selected approach.
- Keep the user in control at each decision point. Pause for clarification, a technique switch, or continuation whenever needed. Record `techniques_used` and `ideas_generated` in `{output_file}` as needed.
- The goal is to generate as many ideas as possible without exhausting the user.
- Techniques for keeping brainstorming going: ask probing questions, ask users how the current idea connects to an earlier idea, offer challenges to the user's idea or assumptions, offer new ideas or angles to keep the conversation going.

Once the user indicates they're ready, use `workflow_progress_request` to confirm and unlock the next workflow step.
```

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.13. In `brainstormingWorkflow.ts`, implement Step 3 `buildToolSchema(...)` so the suggest variant exposes `get_brainstorming_methods`, `append_brainstorming_selected_technique`, `build_workflow_document`, and `workflow_progress_request`, while choose/random variants expose only `build_workflow_document`, `set_workflow_values` for `techniques_used` and `ideas_generated`, and `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.14. In `brainstormingWorkflow.ts`, implement Step 3 decision routes so `workflow_progress_request_confirmed` transitions to Step 4 and `workflow_progress_request_denied` returns to `project_prompt`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.15. In `brainstormingWorkflow.ts`, implement Step 4 `buildPromptSource(...)` with this exact source-derived prompt content: review captured ideas, cluster them into themes, identify strongest candidates, and ask the user which ideas matter most right now: high-impact, quick wins, or the most innovative concepts; for each prioritized idea, define next steps, resource needs, obstacles, and success indicators; do not extend into solutioning during this workflow, and if the user steers toward solutioning or planning actions, stop and say this workflow is scoped to idea-generation and direct them to `create architecture` for larger epic-scale solution work or `quick spec` for small patches; append the themes, priorities, and summary to `{output_file}`; then send the user a final message through `attempt_completion` indicating the brainstorming session is complete and including the full file path of `{output_file}`.

Required Step 4 prompt text:

```text
- Review the captured ideas, cluster them into themes, and identify the strongest candidates. Ask the user which ideas matter most right now: high-impact, quick wins, or the most innovative concepts.
- For each prioritized idea, define next steps, resource needs, obstacles, and success indicators.
- Do not extend into solutioning during this workflow. If the user attempts to steer the conversation toward solutioning or planning actions, STOP and tell them that this workflow is scoped to idea-generation, and that they should use one of these workflows for solutioning:
  - create architecture (if the solution(s) will likely require a large body of work consisting of one or more epics)
  - quick spec (if the solution(s) will likely require small patches that can be implemented quickly)
- Append the themes, priorities, and summary to `{output_file}`.
- Send the user a final message indicating that the brainstorming session is complete using `attempt_completion`. Include the full file path of `{output_file}` in this message.
```

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.16. In `brainstormingWorkflow.ts`, implement Step 4 `buildToolSchema(...)` so it exposes only `build_workflow_document` and `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.17. In `brainstormingWorkflow.ts`, implement Step 4 decision routes so Step 4 enters model-driven work through `project_prompt` and does not define a workflow-specific completion handler.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

[ ] Subtask 7.18. Create `src/core/task/workflow-runtime/workflow-modules/brainstorming/index.ts` exporting `brainstormingWorkflowDefinition` and the registry APIs needed by shared handlers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/index.ts`

[ ] Subtask 7.19. In `src/core/task/workflow-runtime/WorkflowRegistry.ts`, import `brainstormingWorkflowDefinition` and include it in `shippedWorkflowDefinitions`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[ ] Subtask 7.20. In `src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`, replace the `"brainstorming.md": "analyst"` key with `"brainstorming": "analyst"` and do not change real markdown filename references elsewhere.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`

[ ] Subtask 7.21. Create `brainstormingWorkflow.test.ts` with coverage for workflow identity, four checklist labels, workflow value inventory, entry project keys, artifact output key mapping, Step 1 form/pipeline, Step 2 choose/random/suggest paths, Step 3 prompt/tool variants, Step 3 progression, and Step 4 prompt/tool exposure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingWorkflow.test.ts`

[ ] Subtask 7.22. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add integration-style runtime coverage that activates `brainstorming`, renders the shared entry form, projects the four-step focus-chain checklist, and resolves the first Step 1 action after project selection.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

### Phase 5 - Prompt, Tool, Registry, And Cleanup Verification

After completing this phase, pause for QA review before moving to Validation.

[ ] Task 8. Verify prompt/native-tool projection for the registered brainstorming module.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 8.1. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, add coverage proving active `brainstorming` Step 3 suggest projection includes `get_brainstorming_methods` and `append_brainstorming_selected_technique`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 8.2. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, add coverage proving active `brainstorming` Step 3 choose/random projection omits `get_brainstorming_methods` and `append_brainstorming_selected_technique`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 8.3. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, add coverage proving active `brainstorming` Step 4 projection includes `attempt_completion` and omits `workflow_progress_request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Task 9. Verify shipped workflow registry and activation lookup.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`

[ ] Subtask 9.1. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving `resolveWorkflowDefinition("brainstorming")` resolves the registered module and `resolveWorkflowDefinition("brainstorming.md")` does not.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 9.2. In `src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`, add coverage proving `use_skill` with `brainstorming` activates the brainstorming workflow through `resolveWorkflowByUseSkillName(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`

[ ] Task 10. Verify legacy brainstorming-specific surfaces are not revived.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[ ] Subtask 10.1. In `brainstormingWorkflow.test.ts`, add an assertion that no Step 2 route or Step 3 tool schema references `select_random_brainstorming_technique`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingWorkflow.test.ts`

[ ] Subtask 10.2. In `src/shared/tools.ts`, confirm no enum member or tool name for `select_random_brainstorming_technique` exists; if one exists, delete only that enum member and its direct references.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[ ] Subtask 10.3. In `src/core/task/tools/ToolExecutorCoordinator.ts`, confirm no handler registration for `select_random_brainstorming_technique` exists; if one exists, delete only that registration and import.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

## Validation

Run these commands after all tasks and subtasks are complete:

1. `rg -n "select_random_brainstorming_technique|brainstormingTechniqueLibrary|brainstormingSessionFiles|prepare-brainstorming-session|capture-brainstorming-topic" src`
   - Expected: no live `src` references except deleted-file paths in test names only if those files still physically exist as dead code pending cleanup.

2. `rg -n "\"brainstorming.md\"" src`
   - Expected: no workflow-identity references. Matches are allowed only where `brainstorming.md` is artifact filename data, discovery data, or a test expectation for the real output file.

3. `npm run test:unit -- --grep "Brainstorming"`
   - Expected: all brainstorming registry, document, schema, workflow, and handler tests pass.

4. `npm run test:unit -- --grep "WorkflowRuntime"`
   - Expected: workflow runtime tests pass, including artifact family, deterministic procedure, activation, focus-chain projection, and teardown coverage.

5. `npm run test:unit -- --grep "WorkflowArtifact"`
   - Expected: workflow artifact handler/runtime coverage passes.

6. `npm run test:unit -- --grep "WorkflowValues"`
   - Expected: workflow-value persistence coverage passes, including append-tool adjacency.

7. `npm run test:unit -- --grep "AttemptCompletion"`
   - Expected: attempt-completion post-delivery workflow teardown coverage passes.

8. `npm run check-types`
   - Expected: TypeScript completes without errors.

9. `npm run lint`
   - Expected: lint completes without errors.

10. Manual code review:
    - Confirm no runtime code reads `.cline/skills/bmad-brainstorming/brain-methods.csv`, `_bmad/core/skills/bmad-brainstorming/brain-methods.csv`, `.cline/skills/bmad-brainstorming/template.md`, or `/Users/robertboston/Documents/Cline/Workflows/brainstorming.md`.
    - Confirm `get_brainstorming_methods` and `append_brainstorming_selected_technique` are exposed only through brainstorming Step 3 module-owned `buildToolSchema`.
    - Confirm Step 2 random selection uses `run_deterministic_procedure` and not any tool-backed operation.
    - Confirm Step 4 completion uses successful `attempt_completion` plus generic runtime teardown, with no workflow-specific completion handler.
