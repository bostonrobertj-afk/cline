---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
  - Do not edit any file not listed in the current step's allowed-files list.
  - If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
  - Do not preserve V1 workflow-form phases, handler-launched workflow forms, string-only submission payloads, or bespoke workflow-specific stopgaps where this plan explicitly replaces them with shared V2 behavior.
  - Do not invent additional workflow-form capabilities beyond what is explicitly prescribed here.
---

# Workflow Form V2 Action Plan

## Scope

This plan implements the full Workflow Form v2 workstream defined in:

- [workflow-form-v2-architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/requirements.md)

The delivered end state for this plan is:

- one shared graph-driven Workflow Form v2 capability
- one typed runtime-owned definition payload contract
- one typed panel-by-panel submission transport
- one generic webview renderer that receives only the active resolved panel payload
- runtime-owned Back, Retry, conditional-panel, field-level-conditional, and deterministic-operation behavior
- migration of all in-scope human-input workflow experiences onto the shared V2 capability:
  - workflow-start forms
  - Code Review Step 2
  - Brainstorming Step 2
  - Brainstorming Step 4
- removal of the handler-launched Brainstorming Step 2 workflow-form path
- comprehensive regression coverage
- comprehensive documentation reconciliation, including a step-by-step workflow-enablement guide

This plan assumes the separate non-interactive deterministic workflow-step resolution workstream is also delivered for the three migrated zero-input use cases identified in:

- [workflow-form-v2-architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/requirements.md)

Workflow Form v2 must not be treated as complete if those zero-input `automatic_status` use cases still remain under the workflow-form capability boundary.

This plan does not:

- redesign the separate non-interactive deterministic workflow-step resolution capability
- preserve V1 phase-driven workflow-form execution as a live runtime path for the in-scope V2 workflows
- add any second workflow-form system

The user has explicitly confirmed that no live-user migration layer is needed for unresolved V1 workflow-form sessions. The implementation should therefore preserve only code correctness and test stability, not compatibility for already-persisted personal V1 sessions.

## String Contracts

Use these exact new shared names in the V2 implementation.

Shared workflow-form contract names:

- `WorkflowFormFieldKind`
- `WorkflowFormAllowedValueType`
- `WorkflowFormSelectionCardinality`
- `WorkflowFormPanelAction`
- `WorkflowFormResolvedPanelPayload`
- `WorkflowFormDefinitionPayload`
- `WorkflowFormSubmittedValuePayload`
- `WorkflowFormSessionState`
- `WorkflowFormRuntime`

Typed submission transport names:

- `WorkflowFormValue`
- `WorkflowFormValueArray`
- `WorkflowFormValueObject`
- `WorkflowFormValueObjectEntry`

New Brainstorming Step 2 backend-only tool ids:

- `continue_brainstorming_session`
- `create_brainstorming_session`
- `select_brainstorming_session`

New Brainstorming Step 4 backend-only tool ids:

- `persist_brainstorming_approach`
- `select_random_brainstorming_technique`
- `persist_brainstorming_technique`
- `request_brainstorming_technique_suggestion`

Preserve these exact existing workflow-form resolver ids:

- `code_review_step_3_diff_source`
- `brainstorming_step_3_capture_topic`
- `placeholder_workflow_start_set_workflow_placeholders`

Replace this current Step 2 handler-owned resolver id entirely:

- `brainstorming_step_2_select_session`

Add these exact new V2 workflow-form resolver ids:

- `brainstorming_step_2_prepare_session`
- `brainstorming_step_4_choose_approach`

## Action Plan

## [x] Step 1: Replace the shared workflow-form payload and submission transport contracts with the V2 typed contract.
Allowed files: `src/shared/ExtensionMessage.ts`, `proto/cline/task.proto`, `src/shared/proto/cline/task.ts`, `src/generated/grpc-js/cline/task.ts`, `src/generated/nice-grpc/cline/task.ts`

In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L381-L472), remove the V1 phase/page/control contract as the primary workflow-form payload model and replace that block with one V2 shared contract that exposes:

- `WorkflowFormFieldKind` with these exact members:
  - `dropdown`
  - `boolean`
  - `small_text`
  - `large_text`
  - `number`
  - `multi_select`
  - `radio_group`
  - `checkbox_group`
  - `date`
  - `date_time`
  - `file_path`
  - `directory_path`
  - `artifact_picker`
  - `markdown_display`
  - `static_notice`
- `WorkflowFormAllowedValueType` with these exact members:
  - `string`
  - `boolean`
  - `integer`
  - `number`
  - `array`
  - `object`
- `WorkflowFormSelectionCardinality` with these exact members:
  - `single`
  - `fixed_count`
  - `unbounded`
- `WorkflowFormPanelAction` with these exact members:
  - `submit`
  - `cancel`
  - `back`
  - `retry`

In the same block, define the V2 shared payload family so that the runtime-to-webview contract is panel-oriented, not phase-oriented:

- `WorkflowFormOptionDefinition`
- `WorkflowFormFieldDefinition`
- `WorkflowFormTransitionDefinition`
- `WorkflowFormPanelDefinition`
- `WorkflowFormDefinitionPayload`
- `WorkflowFormResolvedPanelPayload`
- `WorkflowFormSubmittedValuePayload`
- `ClineWorkflowForm`

The V2 `ClineWorkflowForm` payload must carry:

- `sessionId`
- `resolverId`
- `title`
- `toolDictionaryTitle`
- `toolDictionaryMarkdown`
- `renderState` with exact members `panel | failure | success`
- optional `panel`
- `values`
- optional `errorMessage`
- optional `successMessage`

The V2 `panel` payload must carry:

- `panelId`
- `title`
- `promptMarkdown`
- `fields`
- `allowedActions`
- per-action labels

`WorkflowFormPanelDefinition` and `WorkflowFormResolvedPanelPayload` must both carry the panel title and panel-specific action labels. Do not rely on the top-level form title as a substitute for the per-panel title required by the V2 contract.

Do not retain `WorkflowFormPhase`, `WorkflowFormRenderablePhase`, `WorkflowFormPageDefinition`, `WorkflowFormPresentation`, or `automaticStatusState` as live V2 workflow-form payload fields.

In [task.proto](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/task.proto#L120-L142), keep `WorkflowFormAction` as the submission action enum, but replace `WorkflowFormFieldValue` and `WorkflowFormSubmissionRequest` with a typed transport:

- add `string panel_id = 3;` to `WorkflowFormSubmissionRequest` immediately after `session_id`
- renumber `action` to field `4`
- renumber `fields` to field `5`
- replace `WorkflowFormFieldValue { string raw_value = 1; }` with:
  - `WorkflowFormValue`
  - `WorkflowFormValueArray`
  - `WorkflowFormValueObject`
  - `WorkflowFormValueObjectEntry`

Implement `WorkflowFormValue` as a proto `oneof` that carries:

- `string string_value`
- `bool boolean_value`
- `sint64 integer_value`
- `double number_value`
- `WorkflowFormValueArray array_value`
- `WorkflowFormValueObject object_value`

`WorkflowFormValueArray` must hold repeated `WorkflowFormValue`.
`WorkflowFormValueObject` must hold repeated `WorkflowFormValueObjectEntry`.
`WorkflowFormValueObjectEntry` must hold `key` plus nested `WorkflowFormValue`.

Do not change any non-workflow-form task proto surface in this step.

After the manual proto edit, run `npm run protos` so the generated task proto outputs are updated in:

- [task.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto/cline/task.ts)
- [task.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/generated/grpc-js/cline/task.ts)
- [task.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/generated/nice-grpc/cline/task.ts)

## [x] Step 2: Replace the V1 phase-driven workflow-form runtime contract with the V2 session, definition-builder, and payload-builder contract.
Allowed files: `src/core/task/workflow-form/types.ts`, `src/core/task/workflow-form/buildWorkflowFormPayload.ts`, `src/core/task/workflow-form/WorkflowFormRuntime.ts`, `src/core/task/workflow-form/schema.ts`, `src/core/task/workflow-form/__tests__/schema.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L11-L110), replace the V1 phase-centric runtime types with a V2 graph/session contract.

Use these exact exported shapes:

- `WorkflowFormTriggerSource = "deterministic_workflow_progression" | "slash_command"`
- `WorkflowFormSessionOwner`
  - preserve `kind: "placeholder_workflow_step" | "slash_command"`
  - preserve `workflowName?`
  - preserve `stepNumber?`
- `WorkflowFormSessionValues = Record<string, WorkflowFormSubmittedValuePayload>`
- `WorkflowFormSessionData = Record<string, WorkflowFormSubmittedValuePayload | Record<string, unknown> | unknown[] | string | number | boolean | undefined>`
- `WorkflowFormToolExecutionRequest`
  - `toolName`
  - `toolInput`
  - `toolParams`
- `WorkflowFormOperationApplicationResult`
  - success branch with updated `session`
  - failure branch with `errorMessage`
  - optional `fallbackToAgent`
  - optional `terminalSuccessMessage`
- `WorkflowFormResolverDefinition`
  - `id`
  - `buildDefinition(session): WorkflowFormDefinitionPayload`
  - `buildOperationRequest(session, operationId): WorkflowFormToolExecutionRequest`
  - `applyOperationResult(session, args): WorkflowFormOperationApplicationResult`
  - `buildFailureFallbackMessage(session, operationId): string`
- `WorkflowFormSessionState`
  - `sessionId`
  - `resolverId`
  - `triggerSource`
  - `owner`
  - `definitionVersion`
  - `definitionPayload`
  - `firstPanelId`
  - `currentPanelId`
  - `values`
  - `data`
  - optional `failure`
- `WorkflowFormRuntimeCreateSessionOptions`
  - `resolverId`
  - `triggerSource`
  - `owner`
  - `definitionPayload`
- `WorkflowFormRuntimeOutcome`
  - `render_form`
  - `invoke_deterministic_operation`
  - `fallback_to_agent`
  - `complete_success`

The V2 session `failure` object must carry:

- `panelId`
- `errorMessage`

In [schema.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts#L1-L229), replace V1 control derivation and `parseWorkflowFormRawValue(...)` with V2 helpers that:

- derive a default V2 `WorkflowFormFieldKind` from tool schema where the field kind is schema-derived
- derive default dropdown or multi-select options from tool schema where appropriate
- convert typed submitted transport values into canonical tool-input values without assuming string-only submission
- preserve the existing backend-workflow-tool-contract lookup path in [schema.ts:21-52](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts#L21-L52)

Do not preserve `deriveWorkflowFormControl(...)` or `parseWorkflowFormRawValue(...)` as the active V2 parsing seam.

In [buildWorkflowFormPayload.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/buildWorkflowFormPayload.ts#L1-L42), replace the phase-based payload builder with a V2 builder that:

- builds `renderState: "panel"` from `currentPanelId`
- builds `renderState: "failure"` from `failure.panelId`
- builds `renderState: "success"` from a provided success message
- includes the resolved current panel payload only

In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L66-L349), replace hard-coded phase logic with V2 graph logic:

- `createSession(...)` must accept `WorkflowFormRuntimeCreateSessionOptions.definitionPayload`, structurally validate that payload before the session is created, and initialize:
  - `definitionVersion: 2`
  - persisted `definitionPayload` equal to the provided `definitionPayload`
  - `firstPanelId` from `definitionPayload.firstPanelId`
  - `currentPanelId` equal to `firstPanelId`
  - empty `values`
  - empty `data`
- `buildPayload(...)` must resolve the current panel from the persisted `definitionPayload` plus session state and return the V2 payload
- the session must persist the full active V2 `definitionPayload` so resume reconstructs the exact active flow, including any dynamic field/transition structure already established for that session
- `handleSubmission(...)` must:
  - reject stale `panel_id` mismatches
  - validate the typed field submissions against the active panel definition
  - merge submitted values into session state
  - resolve `cancel`, `back`, `retry`, and `submit` from the active panel definition plus runtime-owned failure behavior
  - on `submit`, evaluate the active panel transition family:
    - `sequential` -> move to next panel and return `render_form`
    - `conditional` -> compute destination and return `render_form`
    - `deterministic_operation` -> return `invoke_deterministic_operation`
- `retry` must restart to `firstPanelId`, clear failure state, and clear downstream values/data using declared reset rules
- `back` must return to the prior logical panel for the current branch and apply declared stale-value clearing

Before any session is allowed to run, the runtime must structurally validate the resolver-built V2 definition payload and reject definitions that:

- declare a missing first panel
- reference a nonexistent destination panel
- declare invalid dropdown cardinality
- declare an unsupported field kind
- declare an unsupported allowed value type

Implement this structural validation in the shared runtime itself, not in workflow-specific resolver code.

In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts), replace the V1 phase tests with focused V2 runtime coverage for:

- session creation
- `panel_id` mismatch rejection
- sequential transition
- conditional transition
- back navigation and stale-value clearing
- retry restart to first panel
- non-terminal deterministic-operation dispatch
- terminal deterministic-operation completion
- failure-state rendering
- structural rejection of a missing first panel
- structural rejection of a nonexistent destination panel
- structural rejection of invalid dropdown cardinality
- structural rejection of an unsupported field kind
- structural rejection of an unsupported allowed value type

In [schema.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts), replace V1 raw-string parsing assertions with V2 typed transport parsing assertions for:

- boolean
- integer
- number
- string arrays
- object values
- schema-derived dropdown option defaults

## [x] Step 3: Update task state, persistence, and the pre-turn workflow-form orchestration loop to run the V2 runtime.
Allowed files: `src/core/task/TaskState.ts`, `src/core/context/context-tracking/ContextTrackerTypes.ts`, `src/core/task/index.ts`, `src/core/controller/task/submitWorkflowForm.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

In [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L152-L168) and [ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L42-L58), keep `activeWorkflowFormSession` and `suppressedWorkflowFormResolverIds`, but update their imported type references to the V2 `WorkflowFormSessionState`.

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1428-L1462), update `handleWorkflowFormSubmission(...)` so it:

- expects typed `WorkflowFormSubmissionRequest`
- accepts `render_form`, `invoke_deterministic_operation`, `fallback_to_agent`, and `complete_success`
- persists the updated V2 session after any non-terminal outcome
- clears the session only on fallback or terminal success

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1536-L1587), remove the handler-only `runWorkflowFormSession(...)` entry point entirely. V2 must not keep a `tool_handler` trigger path.

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1845-L1919), rename the execution helper behavior in place so it becomes the shared deterministic-operation executor for V2 workflow forms:

- preserve the normal backend tool path
- preserve deterministic progression sync after the tool call
- pass the tool result into `applyOperationResult(...)` rather than V1 `evaluateToolExecutionResult(...)`

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1993-L2135), replace the phase-driven `maybeResolveWorkflowFormBeforeApiTurn(...)` loop with a V2 loop that:

- creates V2 sessions from trigger candidates only
- passes `candidate.definitionPayload` into every `createSession(...)` call instead of asking the runtime to infer or rebuild the initial definition at session-creation time
- renders the current panel payload
- waits for typed submission
- on `invoke_deterministic_operation`, executes the declared backend operation
- on non-terminal operation success:
  - applies the operation result to session state
  - persists the updated session
  - continues the same session loop without clearing the workflow-form session
- on terminal operation success:
  - renders the success payload
  - clears the session
  - restarts the outer deterministic decision loop
- on failure without fallback:
  - stores `failure.panelId` and `failure.errorMessage`
  - persists the session
  - re-renders in failure state
- on failure with fallback:
  - renders the fallback notice as terminal success text
  - appends the resolver id to `suppressedWorkflowFormResolverIds`
  - clears the session

In the same function, preserve the existing trailing `command_output` dismissal and restartable outer decision-loop behavior from the current pre-turn implementation.

In the restore path inside `restoreBmadStateFromMetadata(...)`, accept only V2-shaped active workflow-form sessions. If the restored object lacks `definitionVersion === 2`, `definitionPayload`, `firstPanelId`, or `currentPanelId`, clear `activeWorkflowFormSession` and persist the cleared metadata rather than attempting V1 resume.

In [submitWorkflowForm.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/submitWorkflowForm.ts#L1-L12), keep the controller routing unchanged except for the updated typed request shape.

In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), replace the V1 workflow-form persistence fixtures with V2-shaped session fixtures and add coverage for:

- restoring an active V2 workflow-form session
- restoring a non-V2-shaped session and clearing it
- resuming a session that already contains non-terminal deterministic-operation-produced session data
- rejecting a would-be V2 session that lacks the persisted active `definitionPayload`

## [x] Step 4: Replace the V1 phase-specific webview workflow-form renderer and string serializer with a generic V2 renderer and typed submit builder.
Allowed files: `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`, `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`, `webview-ui/src/components/chat/ChatRow.tsx`, `webview-ui/src/components/chat/ChatRow.test.tsx`

In [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L18-L57), replace `buildWorkflowFormSubmissionRequest(...)` so it:

- reads `workflowForm.panel.panelId`
- serializes only the currently resolved panel fields
- emits typed `WorkflowFormValue` entries rather than `rawValue`
- preserves `WorkflowFormAction`

Implement typed submit builders for:

- `string`
- `boolean`
- `integer`
- `number`
- string-array selection values
- structured `array`
- structured `object`

Do not preserve any phase checks such as `confirm`, `select_source`, or `collect_inputs` in the submit-builder path.

In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L624-L874), remove the V1 phase-based render branches entirely and replace them with one generic workflow-form render path that:

- renders `title`
- renders `panel.title` as the active panel heading
- renders `promptMarkdown`
- renders the dictionary button when `renderState !== "success"`
- renders generic action buttons from `panel.allowedActions`
- renders `errorMessage` only when `renderState === "failure"`
- renders `successMessage` only when `renderState === "success"`

Do not treat the top-level workflow-form title as a substitute for the required per-panel title. The generic renderer must show both the overall form title and the active panel title whenever `renderState` is `panel` or `failure`.

In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L894-Lend-of-field-renderer), replace the V1 control renderer with a V2 field-kind renderer that supports every required V2 field kind:

- `dropdown`
- `boolean`
- `small_text`
- `large_text`
- `number`
- `multi_select`
- `radio_group`
- `checkbox_group`
- `date`
- `date_time`
- `file_path`
- `directory_path`
- `artifact_picker`
- `markdown_display`
- `static_notice`

`markdown_display` and `static_notice` must render as non-editable content rows and must never contribute submitted values.

Do not add workflow-specific JSX branches for Code Review or Brainstorming.

In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L51-L829), replace the V1 phase fixtures with V2 fixtures and add generic rendering coverage for:

- one simple sequential form
- one conditional form
- one failure-state form with Retry and Back
- one success-state form
- one field-level conditional panel where options change after Back and reselection
- every V2 field kind

In [useMessageHandlers.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx#L63-L136), replace the V1 fixture factory and add typed submission assertions for:

- boolean values
- integer values
- number values
- multi-select arrays
- object-backed `large_text`
- panel-id submission

## [x] Step 5: Rebuild the shared workflow-form registry and trigger registry around V2 definitions, and migrate workflow-start plus Code Review Step 2 onto the shared V2 payload.
Allowed files: `src/core/task/workflow-form/types.ts`, `src/core/task/workflow-form/WorkflowFormRuntime.ts`, `src/core/task/index.ts`, `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`, `src/core/task/workflow-form/workflowStartRequirements.ts`, `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`, `src/core/task/workflow-form/dictionaries/systemDictionary.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`

In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L79-L83), extend `WorkflowFormRuntimeCreateSessionOptions` so it requires `definitionPayload: WorkflowFormDefinitionPayload`. Do not add `context`, `initialData`, or any other hidden workflow-start bootstrap bag in this step.

In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L480-L500), update `createSession(...)` so it no longer calls `this.buildValidatedDefinition(draftSession)` during initial session creation. Instead, it must:

- structurally validate `options.definitionPayload`
- persist `definitionPayload` equal to the validated caller-supplied payload
- set `firstPanelId` from `options.definitionPayload.firstPanelId`
- set `currentPanelId` from that same `firstPanelId`

Do not allow `createSession(...)` to rebuild or replace the initial definition internally in this step. The bootstrap source of truth must be the candidate-supplied `definitionPayload` that arrived from `WorkflowFormTriggerRegistry.ts` through `index.ts`.

In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L304-L345), preserve `getWorkflowStartOrderedFieldKeys(...)` and `buildWorkflowStartPlaceholderFieldDefinitions(...)`, and add one exported helper named `buildWorkflowStartDefinitionPayload(...)` that accepts:

- `workflowName`
- the parsed workflow-start requirements returned by [parseWorkflowStartRequirements(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts#L20-L52)

That helper must build and return the full initial V2 `WorkflowFormDefinitionPayload` for `placeholder_workflow_start_set_workflow_placeholders`, including:

- the ordered placeholder field list derived from the parsed requirements
- the runtime dictionary content from `buildWorkflowStartRuntimeToolDictionary(...)`
- the terminal deterministic-operation transition for `set_workflow_placeholders`

This helper is the only approved workflow-start definition bootstrap seam for V2 slash-command startup. Do not reintroduce a generic workflow-start `context` bag.

In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L37-L718), replace the V1 page-builder registry with V2 definition builders while preserving these existing ids:

- `code_review_step_3_diff_source`
- `brainstorming_step_3_capture_topic`
- `placeholder_workflow_start_set_workflow_placeholders`

For `placeholder_workflow_start_set_workflow_placeholders`:

- build one single-panel V2 definition
- derive field kinds and allowed value types from `set_workflow_placeholders`
- preserve existing workflow-start ordered field logic from [WorkflowFormRegistry.ts:304-345](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L304-L345)
- keep runtime dictionary generation from `buildWorkflowStartRuntimeToolDictionary(...)`
- terminal submit must execute `set_workflow_placeholders`

For `code_review_step_3_diff_source`:

- express the flow through three V2 panel ids:
  - `confirm_resolution`
  - `source_selection`
  - `source_details`
- preserve existing field keys:
  - `source.type`
  - `source.commit`
  - `source.base`
  - `source.head`
  - `scoped_paths`
  - `context_lines`
- preserve the current schema-driven branch narrowing from [WorkflowFormRegistry.ts:90-223](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L90-L223)
- use field-level conditional visibility and validation inside `source_details` instead of V1 page names
- `Back` from `source_details` must clear all downstream source-detail values and return to `source_selection`
- terminal submit must execute `build_review_diff_output`
- success/failure classification must preserve the existing machine-checkable behavior from [WorkflowFormRegistry.ts:474-495](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L474-L495)

Leave `brainstorming_step_3_capture_topic` in place as a V2 single-panel large-text form in this step, but do not yet add Brainstorming Step 2 or Step 4 here.

In [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L46-L177), keep the two external trigger families:

- slash-command startup
- deterministic workflow progression

but remove all V1-only return-shape fields:

- `initialPhase`
- V1 `context` dependence for workflow-start and brainstorming-session options

For slash-command startup, `resolveWorkflowFormSlashCommandStartCandidate(...)` must continue parsing the live workflow-start directives from `activeStep.rawDetails`, then call `buildWorkflowStartDefinitionPayload(...)`, and then return that exact `definitionPayload` on the start candidate object alongside `resolverId`, `triggerSource`, `owner`, and `activeStep`.

For deterministic progression candidates in this same file, return the initial V2 `definitionPayload` on the candidate object as well. Code Review Step 2 and Brainstorming Step 3 must both reach `index.ts` with a fully built initial definition payload instead of relying on runtime-side definition inference during session creation.

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2003-L2035), update both `createSession(...)` call sites so they pass the candidate-supplied `definitionPayload` into the V2 session. The slash-command start path must not rebuild workflow-start requirements a second time, must not synthesize a hidden fallback payload, and must not depend on a missing V1 `context` bag.

The deterministic registry must remain:

- `code-review.md` Step 2 -> `code_review_step_3_diff_source`
- `brainstorming.md` Step 3 -> `brainstorming_step_3_capture_topic`

Do not add Brainstorming Step 2 or Step 4 until Step 7.

In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts), replace the V1 page-definition assertions with V2 definition assertions for:

- workflow-start
- Code Review Step 2
- Brainstorming Step 3

In [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts), replace the V1 phase assertions with trigger-candidate coverage for:

- workflow-start V2 start candidate
- Code Review Step 2 trigger
- Brainstorming Step 3 trigger

Those trigger tests must assert that each candidate now carries a built `definitionPayload`, and the workflow-start test must assert that the candidate payload reflects the parsed directive-driven field ordering from the live step source.

## [ ] Step 6: Add the new backend-only Brainstorming Step 2 and Step 4 deterministic-operation tools plus the shared brainstorming technique/session utilities they depend on.
Allowed files: `src/shared/tools.ts`, `src/core/task/tools/backendWorkflowToolContracts.ts`, `src/core/task/tools/ToolExecutorCoordinator.ts`, `src/core/workflows/brainstormingTechniqueLibrary.ts`, `src/core/workflows/brainstormingSessionFiles.ts`, `src/core/task/tools/handlers/ContinueBrainstormingSessionToolHandler.ts`, `src/core/task/tools/handlers/CreateBrainstormingSessionToolHandler.ts`, `src/core/task/tools/handlers/SelectBrainstormingSessionToolHandler.ts`, `src/core/task/tools/handlers/PersistBrainstormingApproachToolHandler.ts`, `src/core/task/tools/handlers/SelectRandomBrainstormingTechniqueToolHandler.ts`, `src/core/task/tools/handlers/PersistBrainstormingTechniqueToolHandler.ts`, `src/core/task/tools/handlers/RequestBrainstormingTechniqueSuggestionToolHandler.ts`, `src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts`, `src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts`, `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`, `src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts`

In [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8-L55), add these exact new backend-only tool ids:

- `CONTINUE_BRAINSTORMING_SESSION = "continue_brainstorming_session"`
- `CREATE_BRAINSTORMING_SESSION = "create_brainstorming_session"`
- `SELECT_BRAINSTORMING_SESSION = "select_brainstorming_session"`
- `PERSIST_BRAINSTORMING_APPROACH = "persist_brainstorming_approach"`
- `SELECT_RANDOM_BRAINSTORMING_TECHNIQUE = "select_random_brainstorming_technique"`
- `PERSIST_BRAINSTORMING_TECHNIQUE = "persist_brainstorming_technique"`
- `REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION = "request_brainstorming_technique_suggestion"`

In [backendWorkflowToolContracts.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts#L4-L94), register backend-only contracts for all seven new tools. Remove `PREPARE_BRAINSTORMING_SESSION` from the active backend-workflow contract map in this same step.

In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L98-L147), register handlers for the seven new tools and remove `PrepareBrainstormingSessionToolHandler` from the static handler map.

Create [brainstormingTechniqueLibrary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/brainstormingTechniqueLibrary.ts) as the shared CSV-backed loader for [brain-methods.csv](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-brainstorming/brain-methods.csv). It must expose:

- category list in CSV order
- per-category technique option list
- random-technique selection from the full library
- name + description output for any selected technique

Create [brainstormingSessionFiles.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/brainstormingSessionFiles.ts) by extracting the file-discovery and session-path creation logic currently embedded in [PrepareBrainstormingSessionToolHandler.ts:24-157](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts#L24-L157).

Create the seven new handlers so they split the current bespoke orchestration into dedicated runtime-owned actions:

- `ContinueBrainstormingSessionToolHandler`
  - resolves newest existing session file
  - persists `output_file`
- `CreateBrainstormingSessionToolHandler`
  - creates the next brainstorming session file from the template
  - records write proof
  - persists `output_file`
- `SelectBrainstormingSessionToolHandler`
  - validates a chosen existing session file
  - persists `output_file`
- `PersistBrainstormingApproachToolHandler`
  - writes the selected approach into `## Selected Approach`
  - persists `selected_approach`
- `SelectRandomBrainstormingTechniqueToolHandler`
  - selects one technique at random from the CSV
  - returns machine-readable technique name, description, and category
  - does not write the output file
- `PersistBrainstormingTechniqueToolHandler`
  - writes the chosen technique name and description under `## Selected Techniques`
  - persists `selected_technique`
- `RequestBrainstormingTechniqueSuggestionToolHandler`
  - writes `user requested technique suggestion` under `## Selected Techniques`
  - persists `selected_technique`

In [CaptureBrainstormingTopicToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts#L76-L94), do not change Step 3 business behavior, but extract any reusable section-replacement helper needed by the new Step 4 write handlers into the new shared brainstorming workflow utilities rather than duplicating section-edit logic.

In [PrepareBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts#L159-L291), convert the file to a removal shim for this workstream:

- delete the interactive followup ask path
- delete the handler-owned workflow-form launch path
- replace the handler body with a hard error telling maintainers that Brainstorming Step 2 now resolves through Workflow Form v2 and this tool must not be used

In [PrepareBrainstormingSessionToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts), replace the old interactive-flow tests with one removal-shim assertion.

In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts), add focused runtime tests for all seven new backend-only Brainstorming tools, including:

- newest-session resolution
- new-session creation
- selected-session validation
- approach persistence
- random technique selection result shape
- selected-technique persistence
- suggestion sentinel persistence

## [ ] Step 7: Migrate Brainstorming Step 2 and Brainstorming Step 4 onto the shared V2 workflow-form capability and remove the bespoke handler-owned Step 2 path.
Allowed files: `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`, `src/core/task/index.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L37-L718), remove `BRAINSTORMING_STEP_2_SELECT_SESSION_RESOLVER_ID` entirely and add these exact new V2 resolvers:

- `brainstorming_step_2_prepare_session`
- `brainstorming_step_4_choose_approach`

`brainstorming_step_2_prepare_session` must define:

- first panel id `session_decision`
- second panel id `session_selection`
- `session_decision` field kind `radio_group` with exact options:
  - `continue_newest`
  - `start_new`
  - `list_all`
- transition behavior:
  - `continue_newest` -> terminal `deterministic_operation` using `continue_brainstorming_session`
  - `start_new` -> terminal `deterministic_operation` using `create_brainstorming_session`
  - `list_all` -> sequential transition to `session_selection`
- `session_selection` field `output_file` as a single-select `dropdown`
- session-selection options must come from runtime definition-building via the shared session-file utility, not from persisted bespoke session context
- `session_selection` submit -> terminal `deterministic_operation` using `select_brainstorming_session`

`brainstorming_step_4_choose_approach` must define:

- first panel id `approach_selection`
- branch panels:
  - `category_selection`
  - `technique_selection`
  - `random_preview`
- `approach_selection` field kind `radio_group` with exact options:
  - `user_choose`
  - `random_technique`
  - `suggest_technique`
- `approach_selection` submit must first run non-terminal `persist_brainstorming_approach`
- branch behavior after that operation:
  - `user_choose` -> `category_selection`
  - `random_technique` -> non-terminal `select_random_brainstorming_technique`, then `random_preview`
  - `suggest_technique` -> terminal `request_brainstorming_technique_suggestion`
- `category_selection` field kind `dropdown` with categories from the CSV utility in CSV order
- `technique_selection` field kind `dropdown` with options conditional on the selected category
- `technique_selection` submit -> terminal `persist_brainstorming_technique`
- `random_preview` must render the selected technique name and description through non-input V2 field kinds and must allow:
  - `submit` to confirm and run terminal `persist_brainstorming_technique`
  - `back` to return to `approach_selection`

Implement stale-value clearing rules so that:

- changing the Step 4 category clears the chosen technique
- going Back from `technique_selection` to `category_selection` clears only the technique choice
- going Back from `random_preview` to `approach_selection` clears the operation-produced random technique result
- reselecting `random_technique` after going Back causes the shared runtime to execute `select_random_brainstorming_technique` again

In [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L160-L177), expand the deterministic trigger registry so it becomes:

- `code-review.md` Step 2 -> `code_review_step_3_diff_source`
- `brainstorming.md` Step 2 -> `brainstorming_step_2_prepare_session`
- `brainstorming.md` Step 3 -> `brainstorming_step_3_capture_topic`
- `brainstorming.md` Step 4 -> `brainstorming_step_4_choose_approach`

Implement the new Step 2 and Step 4 `shouldIntercept(...)` logic as real file-backed gates:

- Step 2 must intercept while `output_file` is unresolved
- Step 4 must intercept while the resolved `output_file` exists but the `## Selected Approach` or `## Selected Techniques` sections remain empty

Use the real template headings from [template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-brainstorming/template.md#L2-L12) when checking Step 4 readiness.

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1993-L2135), remove any remaining dependency on handler-launched workflow-form sessions. The only valid V2 workflow-form entry paths after this step are:

- slash-command startup
- deterministic workflow progression

In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts), add Brainstorming Step 2 and Step 4 definition coverage, including:

- Step 2 branch-to-operation mapping
- Step 2 session-selection panel options
- Step 4 branch structure
- Step 4 field-level conditional technique options
- Step 4 random-preview non-input content fields

In [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts), add trigger coverage for:

- Step 2 unresolved session state
- Step 4 empty selected-approach / selected-techniques sections
- Step 4 resolved sections no longer intercepting

In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), add end-to-end persistence/resume coverage for:

- Brainstorming Step 2 active V2 session
- Brainstorming Step 4 active V2 session after a non-terminal random-technique operation has already populated session data

## [ ] Step 8: Replace the old V1-focused regression suite with comprehensive V2 coverage across runtime, task, webview, and migrated workflow behavior.
Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`, `src/core/task/workflow-form/__tests__/schema.test.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`, `webview-ui/src/components/chat/ChatRow.test.tsx`, `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`

Replace the remaining V1-specific test assumptions, including:

- phase names
- `select_source`
- `collect_inputs`
- `retry_error`
- `rawValue`
- handler-launched Brainstorming Step 2 forms

The final V2 regression set must explicitly cover:

- typed submission transport round-trips
- generic rendering of every required field kind
- sequential transitions
- conditional transitions
- field-level conditional option rebuilding
- Back stale-value clearing
- Retry restart-to-first-panel behavior
- non-terminal deterministic-operation transitions
- terminal deterministic-operation transitions
- workflow-start compatibility
- Code Review Step 2 compatibility
- Brainstorming Step 2 compatibility
- Brainstorming Step 4 compatibility
- persistence and resume after non-terminal deterministic-operation results
- structural payload validation failure coverage for:
  - missing first panel
  - nonexistent destination panel
  - invalid dropdown cardinality
  - unsupported field kind
  - unsupported allowed value type

Do not leave any test file asserting live V1 phase-driven behavior for the in-scope V2 workflows after this step.

## [ ] Step 9: Perform comprehensive documentation reconciliation and add the required workflow-enablement guide.
Allowed files: `docs/agent-101.md`, `docs/workflows/workflow-document-runtime-review.md`, `docs/workflows/workflow-automation-readme.md`, `docs/workflows/deterministic-workflow-progression-readme.md`, `docs/workflow-ui-surface/action-plan.md`, `docs/workflow-ui-surface/architecture.md`, `docs/workflow-ui-surface/requirements.md`, `docs/workflow-ui-surface/discovery.md`, `docs/workflow-ui-surface/workflow-form-readme.md`, `docs/workflow-ui-surface/automatic-workflow-preparation-status-action-plan.md`, `docs/workflow-ui-surface/phase-2-generalization-action-plan.md`, `docs/workflow-ui-surface/schema-driven-workflow-form-contract-action-plan.md`, `docs/workflow-ui-surface/workflow-form-back-action-plan.md`, `docs/workflow-ui-surface/remediation.md`, `docs/workflow-ui-surface/remediation-action-plan.md`, `docs/workflow-ui-surface/test-1-results.md`, `docs/workflow-ui-surface/test-31.md`, `docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-assessment.md`, `docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-gaps.md`, `docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md`, `docs/workflow-ui-surface/workflow-form-v2/requirements.md`, `docs/workflow-ui-surface/workflow-form-v2/additional-supported-workflow-guide.md`, `docs/workflow-automation/brainstorming/enablement-tracker.md`, `docs/workflow-automation/brainstorming/step-2-automation-requirements.md`, `docs/workflow-automation/brainstorming/step-3-automation-requirements.md`

Update every listed document so it no longer misstates the live workflow-form boundary or runtime contract.

At minimum, the reconciliation work must do all of the following:

- update [agent-101.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/agent-101.md#L37-L53) so the workflow-form reference points at the V2 contract and no longer suggests the V1 phase model is current
- rewrite [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L1-L260) around:
  - typed payload
  - typed submission transport
  - panel graph
  - field taxonomy
  - runtime-owned deterministic operations
  - Brainstorming Step 2 and Step 4 as live use cases
- update [docs/workflow-ui-surface/architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/architecture.md) and [docs/workflow-ui-surface/requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md) so they are explicitly marked historical Phase 1 documents and no longer read as the current normative contract
- update [docs/workflow-ui-surface/action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/action-plan.md), [docs/workflow-ui-surface/test-1-results.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/test-1-results.md), and [docs/workflow-ui-surface/test-31.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/test-31.md) so they are explicitly marked historical V1 artifacts where they would otherwise read as live implementation guidance
- update [workflow-form-v1-assessment.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-assessment.md) and [workflow-form-v1-gaps.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-gaps.md) so they clearly point readers to the finalized V2 architecture/requirements/action-plan set as the current target
- update adjacent runtime/onboarding docs such as [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md), [workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-automation-readme.md), and [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md) wherever the V2 contract changes their runtime guidance
- update the Brainstorming workflow-automation docs so they describe:
  - Step 2 as a direct Workflow Form v2 flow
  - Step 4 as a direct Workflow Form v2 flow
  - the removal of the Step 2 handler-owned orchestration workaround
- update the old workflow-ui-surface plans listed above so they are explicitly marked superseded where they would otherwise mislead a maintainer about the live contract

Create [additional-supported-workflow-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/additional-supported-workflow-guide.md) as the required step-by-step enablement guide. It must cover:

- when to use Workflow Form v2
- when not to use Workflow Form v2
- how to choose the correct orchestration entry path
- how to add a new resolver definition
- how to author the V2 definition payload
- how to choose field kinds and allowed value types
- how to configure dropdown cardinality
- how to model sequential, conditional, and deterministic-operation transitions
- how to model field-level conditional behavior
- how to declare dependency/reset behavior and stale-value clearing rules
- how to model non-terminal deterministic-operation results
- how to add trigger references
- how to add backend-only deterministic-operation tools when needed
- how to add persistence and regression coverage
- how to reconcile docs when onboarding a new workflow/workflow-step use case

Do not leave any listed document silently contradictory.

## [ ] Step 10: Run the full V2 verification suite and perform the final string-contract / scope-boundary audit.
Allowed files: `docs/workflow-ui-surface/workflow-form-v2/action-plan.md`, `src/shared/proto/cline/task.ts`, `src/generated/grpc-js/cline/task.ts`, `src/generated/nice-grpc/cline/task.ts`

Run these commands exactly:

```bash
npm run protos
npm run test:unit -- src/core/task/workflow-form/__tests__/schema.test.ts --exit
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts --exit
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts --exit
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts --exit
npm run test:unit -- src/core/task/__tests__/placeholderWorkflowPersistence.test.ts --exit
npm run test:unit -- src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts --exit
npm run test:unit -- src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts --exit
npm run test:unit -- webview-ui/src/components/chat/ChatRow.test.tsx --exit
npm run test:unit -- webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx --exit
```

After the tests pass, perform this final audit before declaring the work complete:

- confirm `prepare_brainstorming_session` is no longer part of the live Workflow Form path
- confirm `tool_handler` is no longer a valid live `WorkflowFormTriggerSource`
- confirm `WorkflowFormRuntime.ts`, `types.ts`, `ExtensionMessage.ts`, `task.proto`, `ChatRow.tsx`, and `useMessageHandlers.ts` no longer rely on V1 phase names
- confirm the in-scope workflows all resolve through the one shared V2 capability:
  - workflow-start
  - Code Review Step 2
  - Brainstorming Step 2
  - Brainstorming Step 4
- confirm all new tool ids, resolver ids, panel ids, field ids, and section headings match the exact strings prescribed in this plan
- confirm the documentation reconciliation step updated every listed file and created the enablement guide

If any command fails, or any audit item is not satisfied, stop and ask the user before making unplanned corrective changes.
