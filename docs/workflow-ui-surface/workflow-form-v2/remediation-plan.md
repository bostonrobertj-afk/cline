---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
  - Do not edit any file not listed in the current step's allowed-files list.
  - If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
  - This remediation plan exists to close the QA findings listed below; do not reopen unrelated Workflow Form v2 design decisions.
  - Do not preserve raw unresolved panel fields, resolver-owned non-terminal continuation logic, handler-owned Brainstorming Step 2 orchestration, unenforced workflow-start one-of semantics, integer truncation, or stale staged-form documentation where this plan explicitly replaces them.
---

# Workflow Form V2 QA Remediation Plan

## QA Findings Reference

This plan remediates the following QA findings exactly as reported:

1. `High`: the runtime is not sending a resolved panel payload to the webview. [buildWorkflowFormPayload.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/buildWorkflowFormPayload.ts#L4-L20), [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L493-L499), [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L400-L405), [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L699-L745), [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L248-L285)
2. `High`: non-terminal `deterministic_operation` transitions are not implemented as a shared V2 behavior. [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L484-L514), [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L663-L669), [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L41-L66), [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2067-L2082)
3. `High`: Brainstorming Step 2 and Step 4 are not migrated onto the shared Workflow Form v2 runtime. [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L207-L224), [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L706-L760), [PrepareBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts#L174-L279), [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts#L157-L162)
4. `Medium`: workflow-start `One of:` requirements are parsed but not enforced by the shared V2 contract/runtime. [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L18-L25), [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L354-L426), [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L562-L587)
5. `Medium`: integer typing is still wrong in the submission path. [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L81-L88), [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L120-L121), [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L274-L285), [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L229-L235)
6. `Low`: documentation-required contract surfaces are still on the older staged/automatic-status model. [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L73-L228), [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md#L175-L202)

## Scope

This remediation plan repairs the gaps above without reopening the approved Workflow Form v2 architecture or requirements.

The delivered end state for this remediation is:

- the webview receives only runtime-resolved panel payloads
- non-terminal deterministic operations continue through one shared runtime-owned path
- Brainstorming Step 2 and Step 4 run through Workflow Form v2 instead of the legacy handler-owned workaround
- workflow-start `One of:` rules are enforced by the shared runtime
- integer submission typing is correct end to end
- canonical docs and the required V2 enablement guide reflect the live boundary

## [x] Step 1: Send only resolved active-panel fields to the webview and prove it with shared runtime tests.
Allowed files: `src/core/task/workflow-form/buildWorkflowFormPayload.ts`, `src/core/task/workflow-form/WorkflowFormRuntime.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`, `webview-ui/src/components/chat/ChatRow.test.tsx`

In [buildWorkflowFormPayload.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/buildWorkflowFormPayload.ts#L4-L30), remove the raw `definition + panelId -> panel.fields` copier. Change the builder so it accepts an already-resolved `WorkflowFormResolvedPanelPayload` and uses that payload directly for `renderState: "panel"` and `renderState: "failure"`.

In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L176-L198), keep `resolvePanelFields(...)` as the only shared field-resolution helper for:

- `visible !== false`
- `visibilityCondition`
- `conditionalOptions`

Then add one runtime-owned helper immediately above [buildPayload(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L493-L499) that:

- accepts `session` plus `panelId`
- loads the raw panel from `session.definitionPayload.panels`
- applies `resolvePanelFields(panel, session)`
- returns `WorkflowFormResolvedPanelPayload` with:
  - `panelId`
  - `title`
  - `promptMarkdown`
  - resolved `fields`
  - `allowedActions`
  - `actionLabels`

In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L493-L521), update:

- `buildPayload(...)`
- `buildFailurePayload(...)`

so both pass the runtime-resolved panel payload into `buildWorkflowFormPayload(...)`. `buildSuccessPayload(...)` must continue to omit `panel`.

Do not add any field-level branching logic to the webview. The webview must continue rendering `workflowForm.panel.fields` as-is once the runtime starts sending resolved fields.

In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts), add focused coverage that proves:

- inactive conditional fields are absent from the emitted payload
- `conditionalOptions` are resolved before payload emission
- Code Review Step 2 emits only the active `scoped_paths` variant after `source.type` changes

In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx), replace any fixture that depends on raw hidden fields being present in the panel payload. Add one assertion that the renderer only sees the resolved field set already provided by the runtime.

## [x] Step 2: Move non-terminal deterministic-operation continuation into the shared V2 contract and shared runtime.
Allowed files: `src/shared/ExtensionMessage.ts`, `src/core/task/workflow-form/types.ts`, `src/core/task/workflow-form/WorkflowFormRuntime.ts`, `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/index.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L484-L514), extend the `deterministic_operation` transition branch so the payload can declare the non-terminal continuation metadata required by the V2 requirements. Add these exact fields:

- `resultDataKey?: string`
- `rebuildDefinitionAfterSuccess?: boolean`
- `recomputeDestinationAfterSuccess?: boolean`

Keep the existing `operationId`, `nextPanelId`, `terminal`, `successMessage`, and stale-key clearing fields.

In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L41-L66), change `WorkflowFormOperationApplicationResult` so a success branch no longer returns a mutated `session`. Replace that success shape with:

- `succeeded: true`
- optional `operationData?: Record<string, unknown>`
- optional `fallbackToAgent?: boolean`
- optional `terminalSuccessMessage?: string`

In the same file, extend the `kind: "invoke_deterministic_operation"` branch of `WorkflowFormRuntimeOutcome` so it carries:

- `operationId`
- optional `nextPanelId`
- optional `terminal`
- optional `resultDataKey`
- `rebuildDefinitionAfterSuccess`
- `recomputeDestinationAfterSuccess`

In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L650-L685), keep transition evaluation shared and runtime-owned, but when a panel resolves to `deterministic_operation`:

- emit the new continuation metadata from the transition
- do not rely on resolver-owned session mutation
- do not drop `nextPanelId` / continuation metadata from the runtime outcome

Add one shared runtime helper named `continueAfterDeterministicOperation(...)` in [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts) that:

- accepts the updated session after tool success
- rebuilds `definitionPayload` when `rebuildDefinitionAfterSuccess === true`
- resolves the next panel from either:
  - the declared `nextPanelId`, or
  - a recomputed destination when `recomputeDestinationAfterSuccess === true`
- returns the normal `render_form` runtime outcome with the rebuilt session/payload

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2067-L2082), preserve the normal backend tool path, but replace resolver-owned non-terminal continuation with the shared runtime path:

- call `applyOperationResult(...)` only to classify tool success/failure and parse `operationData`
- on non-terminal success, if `outcome.resultDataKey` is set, write the returned `operationData` to `session.data[outcome.resultDataKey]`
- call `workflowFormRuntime.continueAfterDeterministicOperation(...)`
- persist the returned rebuilt session
- continue the same workflow-form loop

In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L638-L760), update the currently shipped terminal resolvers so `applyOperationResult(...)` returns classification plus optional `operationData`, not a replacement session.

In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts), add coverage for:

- non-terminal deterministic operations that write operation data to `session.data`
- rebuilding the definition after operation success before next-panel selection
- recomputing the next destination from rebuilt session state

In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), add a persistence/resume test that proves a non-terminal operation result stored in `session.data` resumes without rerunning the operation.

## [x] Step 3: Add the missing Brainstorming backend-only operation tools and remove the legacy handler-launched workflow-form callback surface.
Allowed files: `src/shared/tools.ts`, `src/core/task/index.ts`, `src/core/task/tools/backendWorkflowToolContracts.ts`, `src/core/task/tools/ToolExecutorCoordinator.ts`, `src/core/task/ToolExecutor.ts`, `src/core/task/tools/types/TaskConfig.ts`, `src/core/task/tools/utils/ToolConstants.ts`, `src/core/workflows/brainstormingTechniqueLibrary.ts`, `src/core/workflows/brainstormingSessionFiles.ts`, `src/core/task/tools/handlers/ContinueBrainstormingSessionToolHandler.ts`, `src/core/task/tools/handlers/CreateBrainstormingSessionToolHandler.ts`, `src/core/task/tools/handlers/SelectBrainstormingSessionToolHandler.ts`, `src/core/task/tools/handlers/PersistBrainstormingApproachToolHandler.ts`, `src/core/task/tools/handlers/SelectRandomBrainstormingTechniqueToolHandler.ts`, `src/core/task/tools/handlers/PersistBrainstormingTechniqueToolHandler.ts`, `src/core/task/tools/handlers/RequestBrainstormingTechniqueSuggestionToolHandler.ts`, `src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts`, `src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts`, `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`, `src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts`

In [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8-L55), add these exact new backend-only tool ids:

- `CONTINUE_BRAINSTORMING_SESSION = "continue_brainstorming_session"`
- `CREATE_BRAINSTORMING_SESSION = "create_brainstorming_session"`
- `SELECT_BRAINSTORMING_SESSION = "select_brainstorming_session"`
- `PERSIST_BRAINSTORMING_APPROACH = "persist_brainstorming_approach"`
- `SELECT_RANDOM_BRAINSTORMING_TECHNIQUE = "select_random_brainstorming_technique"`
- `PERSIST_BRAINSTORMING_TECHNIQUE = "persist_brainstorming_technique"`
- `REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION = "request_brainstorming_technique_suggestion"`

In [backendWorkflowToolContracts.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts#L37-L63), register backend-only contracts for all seven new tools and remove the active contract entry for `prepare_brainstorming_session`.

In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L131-L136), register handlers for the seven new tools and remove `PrepareBrainstormingSessionToolHandler` from the live coordinator map.

In [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts#L157-L162), [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L138-L143), [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L223-L224), [ToolConstants.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/utils/ToolConstants.ts#L75-L76), and [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1097-L1138), remove the `runWorkflowFormSession` callback surface entirely. Workflow Form v2 must not retain a handler-launched follow-up entry path.

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1097-L1138), delete the `runWorkflowFormSession` argument from the `new ToolExecutor(...)` constructor call instead of leaving an unused callback in the task bootstrap path.

Create [brainstormingTechniqueLibrary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/brainstormingTechniqueLibrary.ts) as the shared CSV-backed loader for `.cline/skills/bmad-brainstorming/brain-methods.csv`. It must expose:

- category list in CSV order
- per-category technique options
- random technique selection from the full library
- name + description + category output for any selected technique

Create [brainstormingSessionFiles.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/brainstormingSessionFiles.ts) by extracting the reusable session discovery and session-path creation logic from [PrepareBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts#L181-L220).

Create the seven new handlers with the exact behaviors already approved in the main V2 plan:

- `ContinueBrainstormingSessionToolHandler`
- `CreateBrainstormingSessionToolHandler`
- `SelectBrainstormingSessionToolHandler`
- `PersistBrainstormingApproachToolHandler`
- `SelectRandomBrainstormingTechniqueToolHandler`
- `PersistBrainstormingTechniqueToolHandler`
- `RequestBrainstormingTechniqueSuggestionToolHandler`

Convert [PrepareBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts#L166-L291) into a removal shim that throws a hard runtime error telling maintainers Brainstorming Step 2 now resolves through Workflow Form v2 and this tool must not be used.

In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts), add focused handler coverage for all seven new Brainstorming tools. In [PrepareBrainstormingSessionToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts), replace the old interactive-flow coverage with one removal-shim assertion.

## [x] Step 4: Migrate Brainstorming Step 2 and Step 4 onto the shared Workflow Form v2 runtime and delete the legacy step-trigger gap.
Allowed files: `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`, `src/core/task/workflow-form/WorkflowFormRuntime.ts`, `src/core/task/index.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L706-L760), add these exact new resolver ids and definitions:

- `brainstorming_step_2_prepare_session`
- `brainstorming_step_4_choose_approach`

For `brainstorming_step_2_prepare_session`, implement these exact panels:

- `session_strategy`
- `session_selection`

`session_strategy` must present the three approved branch choices:

- `continue_newest`
- `start_new`
- `list_all`

Its transition behavior must be:

- `continue_newest` -> terminal `deterministic_operation` using `continue_brainstorming_session`
- `start_new` -> terminal `deterministic_operation` using `create_brainstorming_session`
- `list_all` -> `sequential` to `session_selection`

`session_selection` must render the current discovered-session dropdown and submit through terminal `deterministic_operation` using `select_brainstorming_session`.

Do not reintroduce handler-owned followup asks or `runWorkflowFormSession(...)` to reach `session_selection`.

For `brainstorming_step_4_choose_approach`, implement these exact panels:

- `approach_selection`
- `technique_selection`
- `random_preview`

Its shared V2 flow must be:

- `approach_selection` submit first runs non-terminal `persist_brainstorming_approach`
- after that operation, the runtime rebuilds the definition and routes by approach:
  - direct category-based choice -> `technique_selection`
  - `random_technique` -> non-terminal `select_random_brainstorming_technique`, then `random_preview`
  - `suggest_technique` -> terminal `request_brainstorming_technique_suggestion`
- `technique_selection` submit -> terminal `persist_brainstorming_technique`
- `random_preview` must show the operation-produced technique content from `session.data`, expose `Back`, and submit through terminal `persist_brainstorming_technique`

In [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L207-L224), add step-trigger coverage for:

- `brainstorming.md` Step 2 -> `brainstorming_step_2_prepare_session`
- `brainstorming.md` Step 4 -> `brainstorming_step_4_choose_approach`

For Step 2 trigger creation in the same file:

- if no brainstorming sessions exist under the resolved `output_folder/brainstorming`, do not create a workflow-form candidate
- if sessions do exist, discover them through `brainstormingSessionFiles.ts`, build the initial `definitionPayload` with those options already embedded, and return that payload on the trigger candidate

In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts), add one explicit builder helper for the Step 2 initial payload so the trigger registry does not hand-assemble panel structures itself.

In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts), use the shared non-terminal deterministic-operation continuation path from Step 2 for the Step 4 `persist approach` and `select random technique` operations. Do not add Brainstorming-specific continuation logic to `index.ts`.

In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts), add definition assertions for the new Step 2 and Step 4 resolvers. In [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts), add trigger coverage for:

- Brainstorming Step 2 with existing sessions
- Brainstorming Step 2 with no sessions
- Brainstorming Step 4

In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), add one resume case for a Brainstorming Step 4 session that already contains operation-produced random-technique data.

## [x] Step 5: Enforce workflow-start `One of:` semantics in the shared runtime and correct integer submission typing.
Allowed files: `src/shared/ExtensionMessage.ts`, `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/workflow-form/WorkflowFormRuntime.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`, `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`, `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`

In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L460-L482), add `oneOfGroupId?: string` to `WorkflowFormFieldDefinition`.

In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L354-L378), update `buildWorkflowStartPlaceholderFieldDefinitions(...)` so each field that belongs to `args.oneOfRequirement.fieldKeys` carries `oneOfGroupId: args.oneOfRequirement.id`.

In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L562-L587), add shared one-of validation after requiredness/type/selection validation and before transition resolution:

- group active resolved input fields by `oneOfGroupId`
- for each active group, require at least one field in the group to have a renderable submitted value
- on failure, return the current panel in failure state with this exact error message:
  - `Provide at least one of the allowed alternative inputs before submitting.`

In [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L78-L149), fix integer serialization exactly as follows:

- for `number` fields with `allowedValueType === "integer"`, reject non-integer decimal input instead of truncating with `Math.trunc`
- for `small_text` fields with `allowedValueType === "integer"`, emit `integerValue` when the trimmed value parses as an exact integer
- do not emit `stringValue` for integer-typed `small_text`

In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts), add a workflow-start definition assertion that the parsed `One of:` fields now carry `oneOfGroupId`.

In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts), add workflow-start submit coverage for:

- parsed `One of:` group with no populated alternative -> failure
- parsed `One of:` group with one populated alternative -> success

In [useMessageHandlers.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx), add assertions that:

- decimal input for an integer field is rejected instead of truncated
- integer-typed `small_text` emits `integerValue`
- Code Review `context_lines` submits as `integerValue`

## [x] Step 6: Reconcile the stale canonical docs and add the missing V2 enablement guide.
Allowed files: `docs/workflow-ui-surface/workflow-form-readme.md`, `docs/workflows/workflow-document-runtime-review.md`, `docs/system-prompt-tool-reference.md`, `docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md`, `docs/workflow-ui-surface/workflow-form-v2/requirements.md`, `docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-assessment.md`, `docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-gaps.md`, `docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-enablement-guide.md`

Update [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L73-L228) so it no longer describes:

- staged `select_source` / `collect_inputs` as the live capability model
- Back as a `select_source`-specific behavior
- raw-value transport as the live submission seam
- automatic-status cards as part of the live workflow-form boundary

Rewrite it around the delivered V2 behavior:

- typed definition payload
- resolved active-panel payloads
- panel-by-panel runtime exchange
- field-level conditionality
- shared non-terminal deterministic-operation continuation
- Brainstorming Step 2 and Step 4 as live use cases

Update [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md#L175-L202) so it no longer says workflow forms own `automatic_status` cards. Replace that section with the split between:

- Workflow Form v2 for human-input interactions
- `workflow_step_resolution_status` for zero-input deterministic step resolution

Update [system-prompt-tool-reference.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompt-tool-reference.md#L83-L95) so `prepare_brainstorming_session` is removed from the current backend-only tool list and the new Brainstorming backend-only tools are described consistently with the live runtime.

Create [workflow-form-v2-enablement-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-enablement-guide.md) as the required step-by-step guide. It must cover all of the following explicitly:

- when to use Workflow Form v2
- when not to use Workflow Form v2
- how to choose the orchestration entry path
- how to author the V2 definition payload
- how resolved panel payloads differ from full definition payloads
- how to model field-level conditionality
- how to model non-terminal deterministic-operation transitions
- how to declare stale-value clearing and dependency/reset behavior
- how to model workflow-start `One of:` requirements
- how to add the required regression coverage

Update [workflow-form-v2-architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md), [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/requirements.md), [workflow-form-v1-assessment.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-assessment.md), and [workflow-form-v1-gaps.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-gaps.md) only where they must be updated to stop contradicting the remediated runtime/doc boundary.

## [x] Step 7: Run the remediation verification suite and complete the final contract audit.
Allowed files: `docs/workflow-ui-surface/workflow-form-v2/remediation-plan.md`

Run these commands exactly:

```bash
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts --exit
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts --exit
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts --exit
npm run test:unit -- src/core/task/__tests__/placeholderWorkflowPersistence.test.ts --exit
npm run test:unit -- src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts --exit
npm run test:unit -- src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts --exit
cd webview-ui && npm run test -- src/components/chat/ChatRow.test.tsx
cd webview-ui && npm run test -- src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx
```

After the tests pass, perform this final audit before declaring remediation complete:

- confirm the webview receives only resolved panel payloads
- confirm non-terminal deterministic operations continue through one shared runtime path
- confirm no live Brainstorming Step 2 workflow-form path depends on `prepare_brainstorming_session`, `runWorkflowFormSession`, or `initialPhase: "collect_inputs"`
- confirm workflow-start `One of:` groups fail when none of the alternatives are populated
- confirm integer fields no longer truncate decimals
- confirm the docs listed in Step 6 no longer describe the staged/automatic-status model as the live contract

## Additional QA Findings Reference

This appended remediation section closes the later QA findings that remained after the first remediation pass:

1. `High`: Brainstorming Step 2 is blocked for fresh runs with no existing session files because Workflow Form v2 does not open and no zero-input runtime path creates the initial session.
2. `Medium-High`: the shared V2 field model still lacks first-class conditional allowed-value typing / conditional validation metadata, and structural validation still accepts field-kind / allowed-value-type mismatches.
3. `Medium`: Retry exists in the runtime but is not surfaced by the shipped Workflow Form v2 definitions.
4. `Medium`: Brainstorming Step 4 `technique_selection` lacks a Back path to `approach_selection`.

## [x] Step 8: Route Brainstorming Step 2 zero-session startup through workflow-step-resolution and leave Workflow Form v2 only for the existing-session path.
Allowed files: `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts`, `src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts`, `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRegistry.test.ts`, `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionTriggerRegistry.test.ts`

Subtasks:

- In [WorkflowStepResolutionRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts#L4-L7), add one new exported definition id immediately below the existing three ids:
  - `export const BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID = "brainstorming_step_2_create_session"`
- In the same file at [WorkflowStepResolutionRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts#L11-L16), add one new failure-message constant immediately below `QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_FAILURE_MESSAGE`:
  - `const BRAINSTORMING_STEP_2_CREATE_SESSION_FAILURE_MESSAGE = "The workflow could not create the initial brainstorming session file automatically. The workflow will return to the Step 2 fallback instructions."`
- In the `workflowStepResolutionRegistry` object at [WorkflowStepResolutionRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts#L55-L167), add a fourth definition entry with these exact semantics:
  - `id: BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID`
  - `toolName: ClineDefaultTool.CREATE_BRAINSTORMING_SESSION`
  - `buildStatusDefinition()` returns `buildDefaultStatusDefinition("Brainstorming Session File")`
  - `buildToolExecutionRequest()` returns `{ toolName: ClineDefaultTool.CREATE_BRAINSTORMING_SESSION, toolInput: {}, toolParams: {} }`
  - `evaluateToolExecutionResult(...)` returns `{ succeeded: true }` only when the parsed JSON payload has all of:
    - `persisted === true`
    - `output_file_available === true`
    - `created === true`
  - on failure text, return:
    - `succeeded: false`
    - `errorMessage: args.toolResultText?.trim() ?? BRAINSTORMING_STEP_2_CREATE_SESSION_FAILURE_MESSAGE`
    - `fallbackToAgent: true`
  - on all other non-success results, return:
    - `succeeded: false`
    - `errorMessage: BRAINSTORMING_STEP_2_CREATE_SESSION_FAILURE_MESSAGE`
    - `fallbackToAgent: true`
- In [WorkflowStepResolutionTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts#L1-L13), import `discoverBrainstormingSessions` from `@/core/workflows/brainstormingSessionFiles` and import `BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID` from the registry file.
- In [WorkflowStepResolutionTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts#L20-L47), keep the existing artifact helper unchanged. Immediately below it, add a new helper named `shouldInterceptUntilInitialBrainstormingSessionMustBeCreated(...)` with this exact behavior:
  - resolve `output_folder` from `getPlaceholderWorkflowValueMap(...)`
  - if `output_folder` is absent, return `false`
  - resolve `sessionDirectory = path.join(resolvedOutputFolder, "brainstorming")`
  - return `true` only when `(await discoverBrainstormingSessions(sessionDirectory)).length === 0`
  - return `false` when one or more canonical brainstorming session files already exist
- In the `workflowStepResolutionTriggerRegistry` array at [WorkflowStepResolutionTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts#L49-L76), prepend one new trigger entry with:
  - `workflowName: "brainstorming.md"`
  - `stepNumber: 2`
  - `definitionId: BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID`
  - `shouldIntercept(...) { return shouldInterceptUntilInitialBrainstormingSessionMustBeCreated({ cwd, taskState }) }`
- Do not change [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L118-L132). Its current `undefined` return when no sessions exist is now the correct handoff point to workflow-step-resolution.
- In [WorkflowStepResolutionRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRegistry.test.ts#L7-L87), add three exact assertions:
  - `getWorkflowStepResolutionDefinition(BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID).toolName === ClineDefaultTool.CREATE_BRAINSTORMING_SESSION`
  - success classification for `{"persisted":true,"output_file_available":true,"created":true}`
  - fallback failure classification for ordinary tool failure text using `BRAINSTORMING_STEP_2_CREATE_SESSION_FAILURE_MESSAGE`
- In [WorkflowStepResolutionTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionTriggerRegistry.test.ts#L7-L90), add three exact tests:
  - `getWorkflowStepResolutionTriggerDefinition("brainstorming.md", 2)?.definitionId === "brainstorming_step_2_create_session"`
  - `shouldIntercept === true` when `output_folder/brainstorming` exists but contains no session files
  - `shouldIntercept === false` when `output_folder/brainstorming` contains at least one canonical brainstorming session file

## [x] Step 9: Complete the shared conditional field contract and reject incompatible field-kind / allowed-value-type definitions.
Allowed files: `src/shared/ExtensionMessage.ts`, `src/core/task/workflow-form/WorkflowFormRuntime.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Subtasks:

- In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L453-L482), insert this new shared contract immediately below `WorkflowFormConditionalOptionDefinition`:
  - `export interface WorkflowFormConditionalFieldOverrideDefinition { when: WorkflowFormConditionDefinition; allowedValueType?: WorkflowFormAllowedValueType; required?: boolean; selectionCardinality?: WorkflowFormSelectionCardinality; selectionCount?: number; minimumSelectionCount?: number; contentMarkdown?: string }`
- In the same file at [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L458-L482), add one new optional field to `WorkflowFormFieldDefinition` immediately below `conditionalOptions?`:
  - `conditionalFieldOverrides?: WorkflowFormConditionalFieldOverrideDefinition[]`
- In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L177-L199), replace the current `resolvePanelFields(...)` body with one that still enforces `visible !== false` and `visibilityCondition`, but now resolves both:
  - the first matching `conditionalOptions` entry, if any, onto `options`
  - the first matching `conditionalFieldOverrides` entry, if any, onto:
    - `allowedValueType`
    - `required`
    - `selectionCardinality`
    - `selectionCount`
    - `minimumSelectionCount`
    - `contentMarkdown`
- In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L221-L258), strengthen `validateStructuredValueShape(...)` exactly as follows:
  - `date` accepts only `valueType === "string"` where `stringValue` matches `YYYY-MM-DD` and round-trips to a valid UTC calendar date
  - `date_time` accepts only `valueType === "string"` where `stringValue` contains an ISO-style `T` separator and `Date.parse(...)` succeeds
  - `file_path`, `directory_path`, and `artifact_picker` accept only `valueType === "string"` where `stringValue?.trim().length > 0` and the string contains no newline characters
  - keep the existing typed validation for boolean, number, text, dropdown, radio, multi-select, checkbox, markdown-display, and static-notice fields
- In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L933-L970), add one shared structural compatibility helper and call it for every field during `validateDefinition(...)`. Use this exact compatibility matrix:
  - `boolean` -> `allowedValueType` absent or `"boolean"`
  - `number` -> `allowedValueType` exactly `"integer"` or `"number"`
  - `small_text` -> `allowedValueType` absent, `"string"`, or `"integer"`
  - `large_text` -> `allowedValueType` absent, `"string"`, `"array"`, or `"object"`
  - `dropdown` -> `allowedValueType` absent or `"string"` when `selectionCardinality` is `"single"`; absent or `"array"` when `selectionCardinality` is `"fixed_count"` or `"unbounded"`
  - `radio_group` -> `allowedValueType` absent or `"string"`
  - `multi_select` and `checkbox_group` -> `allowedValueType` absent or `"array"`
  - `date`, `date_time`, `file_path`, `directory_path`, `artifact_picker` -> `allowedValueType` absent or `"string"`
  - `markdown_display` and `static_notice` -> `allowedValueType` must be absent
- When a field violates that matrix, throw this exact error text:
  - `Workflow form definition declares an unsupported allowed value type for field kind "<kind>": <allowedValueType>`
- In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1116-L1186), add one new test proving `resolvePanelFields(...)` applies `conditionalFieldOverrides` by changing a field’s `allowedValueType` from `"string"` to `"object"` when an upstream answer matches the declared condition.
- In the same file at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1259-L1418), add four new structural-validation tests that call `createSession(...)` and assert these exact failures:
  - `small_text` with `allowedValueType: "boolean"` throws `Workflow form definition declares an unsupported allowed value type for field kind "small_text": boolean`
  - `number` with `allowedValueType: "object"` throws `Workflow form definition declares an unsupported allowed value type for field kind "number": object`
  - `dropdown` with `selectionCardinality: "single"` and `allowedValueType: "array"` throws `Workflow form definition declares an unsupported allowed value type for field kind "dropdown": array`
  - `markdown_display` with any `allowedValueType` throws `Workflow form definition declares an unsupported allowed value type for field kind "markdown_display": string`
- In the same file, add three submit-validation tests proving:
  - invalid `date` strings fail with `Field "<fieldKey>" has an invalid value.`
  - invalid `date_time` strings fail with `Field "<fieldKey>" has an invalid value.`
  - empty or newline-containing `file_path` strings fail with `Field "<fieldKey>" has an invalid value.`

## [x] Step 10: Surface Retry on every shipped Workflow Form v2 panel that can enter failure recovery.
Allowed files: `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

Subtasks:

- In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L463-L478), change the workflow-start panel from:
  - `allowedActions: ["submit", "cancel"]`
  - to `allowedActions: ["submit", "cancel", "retry"]`
  - and add `retry: "Retry"` to `actionLabels`
- In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L507-L547), change both Code Review submit-bearing panels as follows:
  - `source_selection.allowedActions` -> `["submit", "cancel", "retry"]`
  - `source_selection.actionLabels` adds `retry: "Retry"`
  - `source_details.allowedActions` -> `["submit", "cancel", "back", "retry"]`
  - `source_details.actionLabels` adds `retry: "Retry"`
- In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L600-L668), change both Brainstorming Step 2 panels as follows:
  - `session_strategy.allowedActions` -> `["submit", "cancel", "retry"]`
  - `session_strategy.actionLabels` adds `retry: "Retry"`
  - `session_selection.allowedActions` -> `["submit", "cancel", "retry"]`
  - `session_selection.actionLabels` adds `retry: "Retry"`
- In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L560-L588), change the Brainstorming Step 3 panel to:
  - `allowedActions: ["submit", "cancel", "retry"]`
  - `actionLabels.retry = "Retry"`
- In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L760-L858), change all three live Brainstorming Step 4 panels as follows:
  - `approach_selection.allowedActions` -> `["submit", "cancel", "retry"]`
  - `approach_selection.actionLabels` adds `retry: "Retry"`
  - `technique_selection.allowedActions` -> `["submit", "cancel", "retry"]` in this step only
  - `technique_selection.actionLabels` adds `retry: "Retry"` in this step only
  - `random_preview.allowedActions` -> `["submit", "cancel", "back", "retry"]`
  - `random_preview.actionLabels` adds `retry: "Retry"`
- In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L347-L624), add exact assertions that:
  - workflow-start panel includes `"retry"`
  - Code Review `source_selection` and `source_details` include `"retry"`
  - Brainstorming Step 2 `session_strategy` and `session_selection` include `"retry"`
  - Brainstorming Step 3 includes `"retry"`
  - Brainstorming Step 4 `approach_selection`, `technique_selection`, and `random_preview` include `"retry"`

## [x] Step 11: Restore Back navigation from Brainstorming Step 4 `technique_selection` to `approach_selection`.
Allowed files: `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Subtasks:

- In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L785-L824), change the `technique_selection` panel as follows:
  - `allowedActions` must become `["submit", "cancel", "back", "retry"]`
  - `actionLabels` must include `back: "Back"` alongside the existing `submit`, `cancel`, and `retry`
  - add `backDestinationPanelId: BRAINSTORMING_STEP_4_APPROACH_SELECTION_PANEL_ID`
  - add `backStaleValueKeysToClear: [BRAINSTORMING_TECHNIQUE_CATEGORY_FIELD_KEY, BRAINSTORMING_TECHNIQUE_NAME_FIELD_KEY]`
  - do not add any `backStaleDataKeysToClear` entry on this panel
- In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L504-L547), extend the Brainstorming Step 4 definition assertions so they now require:
  - `definition.panels.technique_selection.allowedActions` contains `"back"`
  - `definition.panels.technique_selection.backDestinationPanelId === "approach_selection"`
  - `definition.panels.technique_selection.backStaleValueKeysToClear` exactly equals `["technique_category", "technique_name"]`
- In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts), add one focused runtime test that:
  - creates a Brainstorming Step 4 session at `currentPanelId: "technique_selection"`
  - seeds `values.selected_approach = "user_choose"`, `values.technique_category = "creative"`, and `values.technique_name = "Reverse Brainstorming"`
  - submits `WorkflowFormAction.BACK`
  - asserts the outcome is `render_form`
  - asserts `outcome.session.currentPanelId === "approach_selection"`
  - asserts `outcome.session.values.technique_category === undefined`
  - asserts `outcome.session.values.technique_name === undefined`
  - asserts `outcome.session.values.selected_approach` is retained

## [x] Step 12: Reconcile the docs with the approved Step 2 zero-session runtime split and the completed shared field contract.
Allowed files: `docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md`, `docs/workflow-ui-surface/workflow-form-v2/requirements.md`, `docs/workflow-ui-surface/workflow-form-readme.md`, `docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-enablement-guide.md`, `docs/workflows/workflow-document-runtime-review.md`, `docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/architecture.md`, `docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/requirements.md`

Subtasks:

- In [workflow-form-v2-architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md#L26-L31), replace the blanket statement that “Brainstorming Step 2 and Step 4 now run on the shared Workflow Form v2 runtime” with the exact split:
  - Brainstorming Step 2 uses Workflow Form v2 only when existing sessions are available for human choice
  - Brainstorming Step 2 zero-session startup resolves through zero-input workflow-step-resolution
  - Brainstorming Step 4 remains fully on Workflow Form v2
- In the same file at [workflow-form-v2-architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md#L258-L264) and [workflow-form-v2-architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md#L457-L481), remove any language that still requires Workflow Form v2 itself to own the zero-session Brainstorming Step 2 create-session path.
- In [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/requirements.md#L772-L784), rewrite Brainstorming Step 2 compatibility so it now says:
  - when one or more existing sessions exist, Workflow Form v2 must support the approved Step 2 session-choice flow
  - when no existing sessions exist, the runtime may satisfy Step 2 through zero-input deterministic session creation without opening a workflow form
- In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L103-L110), change the live-use-case list so Brainstorming Step 2 is described as:
  - existing-session preparation through Workflow Form v2
  - zero-session startup through `workflow_step_resolution_status`
- In [workflow-form-v2-enablement-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-enablement-guide.md#L22-L29) and [workflow-form-v2-enablement-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-enablement-guide.md#L95-L129), add both of these explicit points:
  - field-level conditionality now includes `conditionalFieldOverrides` for conditional allowed-value typing and validation metadata
  - Brainstorming Step 2 zero-session startup is not a Workflow Form v2 use case; it belongs to workflow-step-resolution
- In [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md#L193-L203), change the current split list so Brainstorming Step 2 is described as:
  - Workflow Form v2 for existing-session human choice
  - `workflow_step_resolution_status` for zero-session deterministic create-session startup
- In [non-interactive-deterministic-workflow-step-resolution/architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/architecture.md#L34-L39), append `brainstorming.md` Step 2 zero-session session creation to the live use-case list.
- In [non-interactive-deterministic-workflow-step-resolution/requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/requirements.md#L16-L29), expand delivered scope to include:
  - `brainstorming.md` Step 2 zero-session automatic session creation
  - deterministic workflow progression remains the triggering seam for that case

## [x] Step 13: Run the appended remediation verification suite and complete the follow-up audit.
Allowed files: `docs/workflow-ui-surface/workflow-form-v2/remediation-plan.md`

Run these commands exactly:

```bash
npm run test:unit -- src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRegistry.test.ts --exit
npm run test:unit -- src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionTriggerRegistry.test.ts --exit
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts --exit
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts --exit
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts --exit
```

After those tests pass, perform this exact audit before marking the appended remediation complete:

- confirm Brainstorming Step 2 no longer blocks fresh zero-session runs because workflow-step-resolution now owns automatic session creation
- confirm Workflow Form v2 still owns Brainstorming Step 2 only when existing sessions are available for human choice
- confirm `conditionalFieldOverrides` are resolved before panel emission and before submit validation
- confirm field-kind / allowed-value-type mismatches now fail structural definition validation
- confirm shipped Workflow Form v2 panels now surface `retry` wherever failure recovery is supported
- confirm Brainstorming Step 4 `technique_selection` now exposes `Back` to `approach_selection`
- confirm the docs listed in Step 12 no longer contradict the approved zero-session Brainstorming Step 2 runtime split

## Latest QA Findings Reference

This appended remediation section closes the later QA findings that remained after the previous remediation pass:

1. `High`: the Workflow Form v2 rollout is not type-clean across affected shared seams. [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L1224-L1293), [PersistBrainstormingApproachToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PersistBrainstormingApproachToolHandler.ts#L55-L58), [PersistBrainstormingTechniqueToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PersistBrainstormingTechniqueToolHandler.ts#L59-L64), [SelectBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectBrainstormingSessionToolHandler.ts#L44-L46), [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L93-L104)
2. `Medium`: Retry is exposed in normal panel states but is only honored by the runtime when `session.failure` exists. [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L756-L799), [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L701-L743), [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L468-L859)
3. `Medium`: option descriptions are present in the V2 contract but are dropped by the shared renderer. [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L404-L407), [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L121-L126), [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L679-L689), [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L815-L913)
4. `Medium`: structured `large_text` validation still stops at top-level `valueType` and does not enforce `valueSchema`. [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L153-L166), [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L133-L156), [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L229-L252), [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L713-L747)

## [x] Step 14: Make the new Workflow Form v2 shared seams type-clean before any runtime verification.
Allowed files: `src/core/assistant-message/index.ts`, `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/tools/response/ResponseToolRegistry.ts`, `src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`

Subtasks:

- In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/assistant-message/index.ts#L49-L60), replace the tail of `toolParamNames` so the array segment reads exactly:

```ts
	"task_progress",
	"output_file",
	"selected_approach",
	"technique_name",
	"technique_description",
	"timeout",
	"input",
	"from_ref",
	"to_ref",
	"skill_name",
	"item_id",
	"prompt_1",
	"prompt_2",
	"prompt_3",
	"prompt_4",
	"prompt_5",
```

- In [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L93-L104), replace the non-response-tool tail block so it reads exactly:

```ts
	[ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS]: undefined,
	[ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT]: undefined,
	[ClineDefaultTool.BUILD_REVIEW_INPUT]: undefined,
	[ClineDefaultTool.BUILD_EPICS_DOCUMENT]: undefined,
	[ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION]: undefined,
	[ClineDefaultTool.CREATE_BRAINSTORMING_SESSION]: undefined,
	[ClineDefaultTool.SELECT_BRAINSTORMING_SESSION]: undefined,
	[ClineDefaultTool.PERSIST_BRAINSTORMING_APPROACH]: undefined,
	[ClineDefaultTool.SELECT_RANDOM_BRAINSTORMING_TECHNIQUE]: undefined,
	[ClineDefaultTool.PERSIST_BRAINSTORMING_TECHNIQUE]: undefined,
	[ClineDefaultTool.REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION]: undefined,
	[ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION]: undefined,
	[ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC]: undefined,
	[ClineDefaultTool.SELECT_TARGET_EPIC]: undefined,
	[ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC]: undefined,
	[ClineDefaultTool.BUILD_STORY_DOCUMENT]: undefined,
	[ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT]: undefined,
	[ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE]: undefined,
	[ClineDefaultTool.USE_SUBAGENTS]: undefined,
```

- In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L29-L35), add `WorkflowFormToolExecutionRequest` to the `./types` type import so that block reads exactly:

```ts
import type {
	WorkflowFormResolverDefinition,
	WorkflowFormResolverId,
	WorkflowFormSessionState,
	WorkflowFormStartRequirements,
	WorkflowFormToolExecutionRequest,
} from "./types"
```

- In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L980-L1000), replace `buildBrainstormingStep2OperationRequest(...)` with this exact implementation:

```ts
function buildBrainstormingStep2OperationRequest(
	session: WorkflowFormSessionState,
	operationId: string,
): WorkflowFormToolExecutionRequest {
	switch (operationId) {
		case ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION:
			return {
				toolName: ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION,
				toolInput: {},
				toolParams: {},
			}
		case ClineDefaultTool.CREATE_BRAINSTORMING_SESSION:
			return {
				toolName: ClineDefaultTool.CREATE_BRAINSTORMING_SESSION,
				toolInput: {},
				toolParams: {},
			}
		case ClineDefaultTool.SELECT_BRAINSTORMING_SESSION: {
			const outputFile = getSubmittedStringValue(session, BRAINSTORMING_OUTPUT_FILE_FIELD_KEY) ?? ""
			return {
				toolName: ClineDefaultTool.SELECT_BRAINSTORMING_SESSION,
				toolInput: { output_file: outputFile },
				toolParams: { output_file: outputFile },
			}
		}
		default:
			throw new Error(`Unsupported workflow form operation: ${operationId}`)
	}
}
```

- In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L1018-L1065), replace `buildBrainstormingStep4OperationRequest(...)` with this exact implementation:

```ts
function buildBrainstormingStep4OperationRequest(
	session: WorkflowFormSessionState,
	operationId: string,
): WorkflowFormToolExecutionRequest {
	switch (operationId) {
		case ClineDefaultTool.PERSIST_BRAINSTORMING_APPROACH: {
			const selectedApproach = getSubmittedStringValue(session, BRAINSTORMING_SELECTED_APPROACH_FIELD_KEY) ?? ""
			return {
				toolName: ClineDefaultTool.PERSIST_BRAINSTORMING_APPROACH,
				toolInput: { selected_approach: selectedApproach },
				toolParams: { selected_approach: selectedApproach },
			}
		}
		case ClineDefaultTool.SELECT_RANDOM_BRAINSTORMING_TECHNIQUE:
			return {
				toolName: ClineDefaultTool.SELECT_RANDOM_BRAINSTORMING_TECHNIQUE,
				toolInput: {},
				toolParams: {},
			}
		case ClineDefaultTool.REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION:
			return {
				toolName: ClineDefaultTool.REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION,
				toolInput: {},
				toolParams: {},
			}
		case ClineDefaultTool.PERSIST_BRAINSTORMING_TECHNIQUE: {
			const randomPreviewData =
				session.data[BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY] &&
				typeof session.data[BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY] === "object" &&
				!Array.isArray(session.data[BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY])
					? (session.data[BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY] as Record<string, unknown>)
					: undefined
			const techniqueName =
				typeof randomPreviewData?.technique_name === "string"
					? randomPreviewData.technique_name
					: (getSubmittedStringValue(session, BRAINSTORMING_TECHNIQUE_NAME_FIELD_KEY) ?? "")
			const techniqueDescription =
				typeof randomPreviewData?.technique_description === "string"
					? randomPreviewData.technique_description
					: (resolveTechniqueDescriptionFromSelection(session) ?? "")

			return {
				toolName: ClineDefaultTool.PERSIST_BRAINSTORMING_TECHNIQUE,
				toolInput: {
					technique_name: techniqueName,
					technique_description: techniqueDescription,
				},
				toolParams: {
					technique_name: techniqueName,
					technique_description: techniqueDescription,
				},
			}
		}
		default:
			throw new Error(`Unsupported workflow form operation: ${operationId}`)
	}
}
```

- In [ResponseToolRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts#L82-L88), replace the existing non-response-tool assertion body with this exact block:

```ts
	it("keeps workflow-owned deterministic tools registered as non-response tools", () => {
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.BUILD_EPICS_DOCUMENT), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.SELECT_TARGET_EPIC), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.BUILD_STORY_DOCUMENT), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.CREATE_BRAINSTORMING_SESSION), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.SELECT_BRAINSTORMING_SESSION), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.PERSIST_BRAINSTORMING_APPROACH), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.SELECT_RANDOM_BRAINSTORMING_TECHNIQUE), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.PERSIST_BRAINSTORMING_TECHNIQUE), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION), undefined)
	})
```

## [x] Step 15: Hide Retry until the workflow form is actually in failure state.
Allowed files: `webview-ui/src/components/chat/ChatRow.tsx`, `webview-ui/src/components/chat/ChatRow.test.tsx`

Subtasks:

- In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L701-L743), replace the action render loop so it filters retry out of non-failure renders. Replace:

```tsx
{workflowFormPanel.allowedActions.map((allowedAction) => {
```

with:

```tsx
{workflowFormPanel.allowedActions
	.filter((allowedAction) => allowedAction !== "retry" || workflowForm.renderState === "failure")
	.map((allowedAction) => {
```

- Do not edit any `allowedActions` arrays in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L468-L859) in this step. The runtime contract remains failure-only; this step is renderer-only.

- In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L118-L152), insert this exact new test immediately after `it("renders a conditional workflow form with generic actions", ...)`:

```tsx
	it("hides Retry until the workflow form is rendering a failure state", () => {
		renderWorkflowForm(
			createWorkflowFormMessage({
				renderState: "panel",
				panel: {
					panelId: "normal_panel",
					title: "Normal Panel",
					promptMarkdown: "Normal state should not expose Retry.",
					fields: [],
					allowedActions: ["submit", "retry"],
					actionLabels: {
						submit: "Continue",
						retry: "Retry",
					},
				},
			}),
		)

		expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
	})
```

- Leave the existing failure-state test at [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L154-L186) intact. It must continue asserting that Retry appears when `renderState === "failure"`.

## [x] Step 16: Render workflow-form option descriptions everywhere the shared V2 contract provides them.
Allowed files: `webview-ui/src/components/chat/ChatRow.tsx`, `webview-ui/src/components/chat/ChatRow.test.tsx`

Subtasks:

- In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L815-L818), replace the dropdown option label block with this exact code:

```tsx
								{field.options?.map((option) => (
									<option key={option.value} value={option.value}>
										{option.description ? `${option.label} - ${option.description}` : option.label}
									</option>
								))}
```

- In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L881-L891), replace the radio-group option body with this exact code:

```tsx
								{field.options?.map((option) => (
									<label className="flex items-start gap-2 text-sm text-foreground" key={option.value}>
										<input
											checked={textValue === option.value}
											disabled={workflowFormSubmissionPending}
											name={field.key}
											onChange={() => handleWorkflowFormFieldChange(field.key, option.value)}
											type="radio"
										/>
										<span className="flex flex-col">
											<span>{option.label}</span>
											{option.description && <span className="text-xs text-muted-foreground">{option.description}</span>}
										</span>
									</label>
								))}
```

- In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L897-L913), replace the checkbox-group option body with this exact code:

```tsx
								{field.options?.map((option) => (
									<label className="flex items-start gap-2 text-sm text-foreground" key={option.value}>
										<input
											checked={arrayValue.includes(option.value)}
											disabled={workflowFormSubmissionPending}
											onChange={(event) => {
												handleWorkflowFormFieldChange(
													field.key,
													event.target.checked
														? [...arrayValue, option.value]
														: arrayValue.filter((entry) => entry !== option.value),
												)
											}}
											type="checkbox"
										/>
										<span className="flex flex-col">
											<span>{option.label}</span>
											{option.description && <span className="text-xs text-muted-foreground">{option.description}</span>}
										</span>
									</label>
								))}
```

- In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L188-L240), insert this exact test before `it("rebuilds field-level conditional options after rerender", ...)`:

```tsx
	it("renders option descriptions for dropdown, radio_group, and checkbox_group fields", () => {
		renderWorkflowForm(
			createWorkflowFormMessage({
				panel: {
					panelId: "described_options",
					title: "Described Options",
					promptMarkdown: "Render option descriptions.",
					fields: [
						{
							key: "dropdown_choice",
							kind: "dropdown",
							label: "Dropdown Choice",
							required: true,
							options: [{ value: "mind_map", label: "Mind Map", description: "Visual mapping technique" }],
						},
						{
							key: "radio_choice",
							kind: "radio_group",
							label: "Radio Choice",
							required: true,
							options: [{ value: "six_hats", label: "Six Hats", description: "Perspective shifting technique" }],
						},
						{
							key: "checkbox_choice",
							kind: "checkbox_group",
							label: "Checkbox Choice",
							required: false,
							options: [{ value: "reverse", label: "Reverse Brainstorming", description: "Invert the problem" }],
						},
					],
					allowedActions: ["submit"],
				},
			}),
		)

		expect(screen.getByRole("option", { name: "Mind Map - Visual mapping technique" })).toBeInTheDocument()
		expect(screen.getByText("Perspective shifting technique")).toBeInTheDocument()
		expect(screen.getByText("Invert the problem")).toBeInTheDocument()
	})
```

## [x] Step 17: Enforce `valueSchema` for structured Workflow Form v2 submissions.
Allowed files: `src/core/task/workflow-form/schema.ts`, `src/core/task/workflow-form/WorkflowFormRuntime.ts`, `src/core/task/workflow-form/__tests__/schema.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Subtasks:

- In [schema.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts#L264-L286), keep `convertWorkflowFormSubmittedValueToToolInput(...)` unchanged. Immediately below it, add these two exact helpers:

```ts
function validateToolInputAgainstWorkflowFormSchema(value: unknown, schema: WorkflowFormJsonSchema): boolean {
	if (schema.oneOf?.length) {
		return schema.oneOf.some((variant) => validateToolInputAgainstWorkflowFormSchema(value, variant))
	}

	if (schema.const !== undefined) {
		return value === schema.const
	}

	if (schema.enum) {
		return typeof value === "string" && schema.enum.includes(value)
	}

	switch (schema.type) {
		case "string":
			return typeof value === "string"
		case "integer":
			return Number.isInteger(value)
		case "boolean":
			return typeof value === "boolean"
		case "array":
			if (!Array.isArray(value)) {
				return false
			}

			return schema.items ? value.every((entry) => validateToolInputAgainstWorkflowFormSchema(entry, schema.items!)) : true
		case "object": {
			if (!value || typeof value !== "object" || Array.isArray(value)) {
				return false
			}

			const objectValue = value as Record<string, unknown>
			const requiredKeys = schema.required ?? []
			if (requiredKeys.some((key) => objectValue[key] === undefined)) {
				return false
			}

			const declaredProperties = schema.properties ?? {}
			for (const [key, propertySchema] of Object.entries(declaredProperties)) {
				if (objectValue[key] !== undefined && !validateToolInputAgainstWorkflowFormSchema(objectValue[key], propertySchema)) {
					return false
				}
			}

			if (schema.additionalProperties) {
				const declaredKeys = new Set(Object.keys(declaredProperties))
				for (const [key, entryValue] of Object.entries(objectValue)) {
					if (!declaredKeys.has(key) && !validateToolInputAgainstWorkflowFormSchema(entryValue, schema.additionalProperties)) {
						return false
					}
				}
			}

			return true
		}
		default:
			return false
	}
}

export function validateWorkflowFormSubmittedValueAgainstSchema(
	value: WorkflowFormSubmittedValuePayload | undefined,
	schema: WorkflowFormJsonSchema,
): boolean {
	return validateToolInputAgainstWorkflowFormSchema(convertWorkflowFormSubmittedValueToToolInput(value), schema)
}
```

- In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L18-L19), replace the schema import with this exact line:

```ts
import { normalizeWorkflowFormSubmittedValue, validateWorkflowFormSubmittedValueAgainstSchema } from "./schema"
```

- In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L723-L725), keep the existing `validateStructuredValueShape(...)` check. Immediately below it, add this exact schema-validation block:

```ts
						if (
							submittedValue &&
							field.valueSchema &&
							!validateWorkflowFormSubmittedValueAgainstSchema(submittedValue, field.valueSchema)
						) {
							return this.renderFailure(nextSession, activePanel.panelId, `Field "${field.key}" has an invalid value.`)
						}
```

- In [schema.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts#L4-L10), add `validateWorkflowFormSubmittedValueAgainstSchema` to the import list so it reads exactly:

```ts
import {
	convertWorkflowFormSubmittedValueToToolInput,
	deriveWorkflowFormFieldKind,
	deriveWorkflowFormOptions,
	normalizeWorkflowFormSubmittedValue,
	resolveWorkflowFormOneOfVariant,
	resolveWorkflowFormSchema,
	validateWorkflowFormSubmittedValueAgainstSchema,
} from "../schema"
```

- In [schema.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts#L115-L123), insert this exact new test immediately after `it("resolves build_review_diff_output source variants from oneOf by discriminator", ...)`:

```ts
	it("validates structured object submissions against required schema properties", () => {
		const submittedValue = normalizeWorkflowFormSubmittedValue({
			objectValue: {
				entries: [
					{
						key: "base",
						value: { stringValue: "main" },
					},
				],
			},
		})

		expect(
			validateWorkflowFormSubmittedValueAgainstSchema(submittedValue, {
				type: "object",
				required: ["base", "head"],
				properties: {
					base: { type: "string" },
					head: { type: "string" },
				},
			}),
		).to.equal(false)
	})
```

- In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1465-L1560), insert this exact runtime test immediately after the existing invalid `date_time` submission test:

```ts
	it("rejects structured large_text submissions that do not satisfy the declared schema", () => {
		const runtime = createRuntime(
			createResolver({
				id: "invalid_structured_payload",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "details",
						panels: {
							details: {
								panelId: "details",
								title: "Details",
								promptMarkdown: "Collect a structured payload.",
								fields: [
									{
										key: "payload",
										kind: "large_text",
										label: "Payload",
										required: true,
										allowedValueType: "object",
										valueSchema: {
											type: "object",
											required: ["base", "head"],
											properties: {
												base: { type: "string" },
												head: { type: "string" },
											},
										},
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "invalid_structured_payload")
		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "details",
				fields: [
					{
						key: "payload",
						value: {
							objectValue: {
								entries: [
									{
										key: "base",
										value: { stringValue: "main" },
									},
								],
							},
						},
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.failure).to.deep.equal({
				panelId: "details",
				errorMessage: 'Field "payload" has an invalid value.',
			})
		}
	})
```

## [ ] Step 18: Run the exact post-remediation verification gates.
Allowed files: `docs/workflow-ui-surface/workflow-form-v2/remediation-plan.md`

Run these commands exactly, in this order:

```bash
npm run check-types
npm run test:unit -- src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts --exit
npm run test:unit -- src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts --exit
npm run test:unit -- src/core/task/workflow-form/__tests__/schema.test.ts --exit
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts --exit
cd webview-ui && npm run test -- src/components/chat/ChatRow.test.tsx
```

After those commands pass, perform this exact audit before marking this appended remediation complete:

- confirm `npm run check-types` passes without any Workflow Form v2, Brainstorming handler, or response-tool-registry type errors
- confirm the shared renderer does not show `Retry` when `workflowForm.renderState === "panel"`
- confirm the shared renderer still shows `Retry` when `workflowForm.renderState === "failure"`
- confirm dropdown, radio-group, and checkbox-group option descriptions are visible in the UI
- confirm structured `large_text` submissions now fail when they violate `valueSchema`
