---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
  - Do not edit any file not listed in the current step's allowed-files list.
  - If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup, alternate transports, or unrelated refactors beyond what is explicitly prescribed here.
---

# Non-Interactive Deterministic Workflow Step Resolution Action Plan

## Scope

This plan implements the separate shared capability defined in:

- [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/architecture.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/requirements.md)

The delivered end state for this plan is:

- a new shared non-interactive, say-only capability for deterministic workflow-step resolution
- migration of the three current automatic-status use cases out of Workflow Forms:
  - `code_review_step_3_review_input`
  - `write_remediation_story_step_2_review_input`
  - `quick_spec_step_2_build_tech_spec_document`
- persistence and resume support for one active non-interactive step-resolution session
- continued rendering of old persisted `say: "workflow_form"` automatic-status rows so historical chat/task state does not break
- removal of live automatic-status production from the Workflow Form runtime, trigger registry, and resolver registry

This plan must not:

- add a new user-submission RPC
- add a new `ask` transport type
- change `proto/cline/task.proto`
- change `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`
- reroute these migrated steps through backend-only silent internal-tool execution
- rewrite the business logic of `build_review_input` or `build_tech_spec_document`

## String Contracts

Use these exact new shared names:

- `workflow_step_resolution_status` as the new `ClineSay` string
- `WORKFLOW_STEP_RESOLUTION_STATUS = 39` as the new `ClineSay` proto enum member
- `WorkflowStepResolutionStatusState = "pending" | "success" | "failure"`
- `WorkflowStepResolutionStatusDefinition`
- `ClineWorkflowStepResolutionStatus`
- `WorkflowStepResolutionDefinition`
- `WorkflowStepResolutionSessionState`
- `WorkflowStepResolutionRuntime`
- `WorkflowStepResolutionRegistry`
- `WorkflowStepResolutionTriggerRegistry`
- `activeWorkflowStepResolutionSession`
- `suppressedWorkflowStepResolutionDefinitionIds`

Preserve these exact existing definition ids when migrating the three live automatic-status use cases:

- `code_review_step_3_review_input`
- `write_remediation_story_step_2_review_input`
- `quick_spec_step_2_build_tech_spec_document`

## Action Plan

## [x] Step 1: Add the dedicated shared `say` transport contract for non-interactive workflow-step resolution status.
Allowed files: `src/shared/ExtensionMessage.ts`, `proto/cline/ui.proto`, `src/shared/proto-conversions/cline-message.ts`, `src/shared/proto/cline/ui.ts`, `src/generated/grpc-js/cline/ui.ts`, `src/generated/nice-grpc/cline/ui.ts`

In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L181-L222), append the new `ClineSay` member `| "workflow_step_resolution_status"` immediately after the existing `| "workflow_form"` line.

In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L439-L470), leave the existing workflow-form automatic-status types in place for legacy-history compatibility, and insert these exact new shared types immediately after `ClineWorkflowForm`:

- `export type WorkflowStepResolutionStatusState = "pending" | "success" | "failure"`
- `export interface WorkflowStepResolutionStatusDefinition { title: string; pendingLabel: string; successLabel: string; failureLabel: string }`
- `export interface WorkflowStepResolutionStatusOwner { workflowName: string; stepNumber: number }`
- `export interface ClineWorkflowStepResolutionStatus { sessionId: string; definitionId: string; owner: WorkflowStepResolutionStatusOwner; state: WorkflowStepResolutionStatusState; definition: WorkflowStepResolutionStatusDefinition }`

Do not modify `ClineAsk`, `ClineWorkflowForm`, or `ClineWorkflowStartCard` in this step.

In [ui.proto](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/ui.proto#L58-L99), add `WORKFLOW_STEP_RESOLUTION_STATUS = 39;` immediately after `WORKFLOW_FORM_SAY = 38;`. Do not add any new `ClineAsk` enum member.

In [cline-message.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto-conversions/cline-message.ts#L205-L279), update both `ClineSay` mapping tables so:

- `"workflow_step_resolution_status"` maps to `ClineSay.WORKFLOW_STEP_RESOLUTION_STATUS`
- `ClineSay.WORKFLOW_STEP_RESOLUTION_STATUS` maps back to `"workflow_step_resolution_status"`

After the manual edits above, run `npm run protos` so the generated UI proto files are updated in:

- [ui.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto/cline/ui.ts)
- [ui.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/generated/grpc-js/cline/ui.ts)
- [ui.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/generated/nice-grpc/cline/ui.ts)

Do not edit `proto/cline/task.proto`.

## [x] Step 2: Introduce the new shared step-resolution runtime, registry, payload builder, and trigger registry using the three existing automatic-status definition ids.
Allowed files: `src/core/task/workflow-step-resolution/types.ts`, `src/core/task/workflow-step-resolution/buildWorkflowStepResolutionStatusPayload.ts`, `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts`, `src/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime.ts`, `src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts`, `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRegistry.test.ts`, `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`

Create [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/types.ts) with the new shared runtime contract. Define these exact exported shapes:

- `WorkflowStepResolutionTriggerSource = "deterministic_workflow_progression"`
- `WorkflowStepResolutionSessionOwner = { kind: "placeholder_workflow_step"; workflowName: string; stepNumber: number }`
- `WorkflowStepResolutionEvaluationResult`
  - success branch: `{ succeeded: true }`
  - failure branch: `{ succeeded: false; errorMessage: string; fallbackToAgent?: boolean }`
- `WorkflowStepResolutionToolExecutionRequest`
  - `toolName`
  - `toolInput`
  - `toolParams`
- `WorkflowStepResolutionDefinition`
  - `id`
  - `toolName`
  - `buildStatusDefinition(session)`
  - `buildToolExecutionRequest(session)`
  - `evaluateToolExecutionResult(session, args)`
- `WorkflowStepResolutionSessionState`
  - `sessionId`
  - `definitionId`
  - `triggerSource`
  - `owner`
  - `state`
  - optional `lastError`
- `WorkflowStepResolutionRuntimeOutcome`
  - `success`
  - `failure`
  - `fallback_to_agent`

Create [buildWorkflowStepResolutionStatusPayload.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/buildWorkflowStepResolutionStatusPayload.ts) with one exported helper that accepts a `WorkflowStepResolutionSessionState` plus a `WorkflowStepResolutionStatusDefinition` and returns a `ClineWorkflowStepResolutionStatus` with:

- `sessionId` from the session
- `definitionId` from the session
- `owner.workflowName` and `owner.stepNumber` copied from the session owner
- `state` from the session
- `definition` from the builder input

Create [WorkflowStepResolutionRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts) and move the three live automatic-status definitions out of Workflow Forms into this new registry. Reuse the current machine-checkable behavior from [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L503-L713):

- `code_review_step_3_review_input`
  - `toolName: ClineDefaultTool.BUILD_REVIEW_INPUT`
  - `title: "Review Input Artifact"`
  - `pendingLabel: "Preparing workflow documents"`
  - `successLabel: "Workflow documents ready"`
  - `failureLabel: "Automatic workflow preparation failed- falling back to manual LLM workflow preparation."`
  - success when `persisted === true && review_input_available === true`
  - diff mismatch reason `diff_output does not identify recent changes to the story file.` returns `fallbackToAgent: true` with the same current diff-mismatch message
  - generic failure returns `fallbackToAgent: true` with the same current Step 3 fallback message
- `write_remediation_story_step_2_review_input`
  - same status labels as above
  - same `build_review_input` success/failure classification as its current resolver
- `quick_spec_step_2_build_tech_spec_document`
  - `toolName: ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT`
  - `title: "Tech Spec Scaffold"`
  - same status labels as above
  - success when `persisted === true && output_file_available === true`
  - generic failure returns `fallbackToAgent: true` with the same current Step 2 fallback message

In the same file, export the three preserved ids and `getWorkflowStepResolutionDefinition(id)`.

Create [WorkflowStepResolutionRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime.ts) with:

- `createSession({ definitionId, triggerSource, owner })`
  - generates `sessionId` with `randomUUID()`
  - initializes `state: "pending"`
- `buildPayload(session)`
  - rebuilds the status definition from the registry and calls the shared payload builder
- `buildTerminalSession(session, state, lastError?)`
  - returns the same session with the requested terminal state and optional `lastError`

Do not add any user-submission handling methods to this runtime.

Create [WorkflowStepResolutionTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts) with a dedicated deterministic-step trigger registry for the migrated use cases. Copy the artifact-gating logic currently used in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L103-L127) so the new registry exposes:

- `code-review.md` Step 3 -> `code_review_step_3_review_input` gated by `review_input`
- `write-remediation-story.md` Step 2 -> `write_remediation_story_step_2_review_input` gated by `review_input`
- `quick-spec.md` Step 2 -> `quick_spec_step_2_build_tech_spec_document` gated by `output_file`

Do not include `code-review.md` Step 2 or `brainstorming.md` Step 3 in this new registry.

In [WorkflowStepResolutionRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRegistry.test.ts), add exact coverage for:

- id -> tool metadata for all three definitions
- code-review Step 3 success classification
- code-review Step 3 diff-mismatch fallback classification
- write-remediation-story Step 2 success classification
- quick-spec Step 2 success classification

In [WorkflowStepResolutionRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts), add exact coverage for:

- session creation defaults to `state: "pending"`
- payload assembly returns the exact definition id and owner metadata
- terminal success session changes `state` to `"success"`
- terminal failure session changes `state` to `"failure"` and preserves `lastError`

## [x] Step 3: Add task-state persistence, orchestration, and legacy-resume migration for the new capability without changing user-submission plumbing.
Allowed files: `src/core/task/TaskState.ts`, `src/core/context/context-tracking/ContextTrackerTypes.ts`, `src/core/task/index.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

In [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L151-L167), insert these exact new task-state fields immediately after `activeWorkflowFormSession?`:

- `activeWorkflowStepResolutionSession?: WorkflowStepResolutionSessionState`
- `suppressedWorkflowStepResolutionDefinitionIds: string[] = []`

In [ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L41-L56), insert the matching optional metadata fields immediately after `activeWorkflowFormSession?`:

- `activeWorkflowStepResolutionSession?: WorkflowStepResolutionSessionState`
- `suppressedWorkflowStepResolutionDefinitionIds?: string[]`

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L229-L287), add a new exported helper `resolveWorkflowStepResolutionInterceptionCandidate(...)` beside `resolveWorkflowFormInterceptionCandidate(...)`. Mirror the existing active-step lookup path, but use the new trigger registry and `suppressedWorkflowStepResolutionDefinitionIds`.

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1471-L1564), add the new task-owned helpers:

- `persistWorkflowStepResolutionSession()`
- `clearWorkflowStepResolutionSession()`
- `renderWorkflowStepResolutionStatusMessage(payload: ClineWorkflowStepResolutionStatus)`

Implement the new renderer as a say-only message path that:

- always sets `ThreadDisplayStates.ACTIVE_RUN`
- never sets an awaiting-user subtype
- updates an existing `say: "workflow_step_resolution_status"` row by matching `sessionId`
- otherwise inserts a new `say: "workflow_step_resolution_status"` row

In the same file, add `executeWorkflowStepResolutionToolAndSync(...)` beside the existing workflow-form execution helpers. Reuse the same tool-execution path and deterministic progression sync strategy already used for workflow forms. Do not route through any backend-only silent execution path.

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1823-L1999), leave `maybeResolveWorkflowFormBeforeApiTurn(...)` focused on interactive workflow forms. Do not add new automatic-status logic there.

Add a new `maybeResolveWorkflowStepResolutionBeforeApiTurn(...)` method immediately after `maybeResolveWorkflowFormBeforeApiTurn(...)`. Implement this exact loop:

- if there is no active step-resolution session, call `resolveWorkflowStepResolutionInterceptionCandidate(...)`
- when a candidate exists, create a session through `WorkflowStepResolutionRuntime.createSession(...)` with:
  - `triggerSource: "deterministic_workflow_progression"`
  - `owner.kind: "placeholder_workflow_step"`
  - the active workflow name and step number
- persist the session
- dismiss trailing command-output ask the same way the workflow-form path already does
- build and render the pending payload once through `renderWorkflowStepResolutionStatusMessage(...)`
- build the tool request from `getWorkflowStepResolutionDefinition(session.definitionId).buildToolExecutionRequest(session)`
- execute it immediately through `executeWorkflowStepResolutionToolAndSync(...)`
- on success:
  - convert the session to terminal `"success"`
  - render the success payload
  - clear the session
  - restart the decision loop so another eligible system-owned step can run before the next model turn
- on failure with `fallbackToAgent === true`:
  - convert the session to terminal `"failure"`
  - render the failure payload
  - append the definition id to `suppressedWorkflowStepResolutionDefinitionIds`
  - clear the session
  - break back to the normal agent path
- on failure without fallback:
  - convert the session to terminal `"failure"`
  - render the failure payload
  - clear the session
  - break

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L5209-L5211), call `await this.maybeResolveWorkflowStepResolutionBeforeApiTurn()` immediately after `await this.maybeResolveWorkflowFormBeforeApiTurn(...)`.

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1657-L1700), [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2196-L2234), and [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2377-L2385), extend teardown, workflow-activation reset, persistence, and restore to include the two new fields.

In the restore block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2377-L2385), add a legacy-migration shim with these exact rules:

- if `metadata.activeWorkflowFormSession?.resolverId` equals one of the three migrated ids, convert that restored object into `activeWorkflowStepResolutionSession` by:
  - copying `sessionId`
  - copying the preserved id into `definitionId`
  - copying `triggerSource`
  - copying `owner`
  - setting `state: "pending"` unconditionally, because the old automatic-status workflow-form path only persisted the live pre-terminal session and cleared it before rendering terminal success/failure cards
  - copying `lastError` only if it is already present on the restored session object
- then clear `activeWorkflowFormSession`
- for each migrated id found inside `suppressedWorkflowFormResolverIds`, append that same id into `suppressedWorkflowStepResolutionDefinitionIds`
- keep all non-migrated workflow-form metadata untouched

Do not change `handleWorkflowFormSubmission(...)`, `submitWorkflowForm`, or the awaiting-user-response logic for workflow-form and workflow-start-card asks.

In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), replace the current workflow-form automatic-status expectations with step-resolution expectations. Add or update exact coverage for:

- Code Review Step 3 auto-run pending -> success through the new step-resolution runtime
- Code Review Step 3 diff-mismatch failure renders terminal `"failure"` and suppresses the definition id
- Write Remediation Story Step 2 migration onto the new capability
- Quick Spec Step 2 migration onto the new capability
- restore-time migration of a legacy persisted `activeWorkflowFormSession` with `resolverId: "code_review_step_3_review_input"` into `activeWorkflowStepResolutionSession`
- restore-time migration of legacy suppressed workflow-form resolver ids into `suppressedWorkflowStepResolutionDefinitionIds`

## [x] Step 4: Add dedicated chat rendering for the new `say` payload while preserving legacy `workflow_form` automatic-status history rendering.
Allowed files: `webview-ui/src/components/chat/ChatRow.tsx`, `webview-ui/src/components/chat/WorkflowPreparationStatusRow.tsx`, `webview-ui/src/components/chat/ChatRow.test.tsx`

Do not change [WorkflowPreparationStatusRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/WorkflowPreparationStatusRow.tsx#L1-L25) unless a type import is needed. It remains the shared renderer for pending/success/failure status rows.

In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L291-L305), keep the existing `workflowForm` parser exactly as the legacy workflow-form parser.

Immediately after that parser, add a new `useMemo` parser for:

- `message.type === "say" && message.say === "workflow_step_resolution_status"`
- parsed payload type `ClineWorkflowStepResolutionStatus`

Add a dedicated `renderWorkflowStepResolutionStatusContent()` helper beside `renderWorkflowFormContent()` that:

- returns `<InvisibleSpacer />` when the parsed payload is absent
- otherwise returns `<WorkflowPreparationStatusRow label={...} state={...} />`
- uses:
  - `state = payload.state`
  - `label = pendingLabel | successLabel | failureLabel` from `payload.definition`

In the `say` switch at [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L1667-L1670), add a new case for `workflow_step_resolution_status` that returns `renderWorkflowStepResolutionStatusContent()`.

Leave the existing `workflow_form` rendering branch in place so old persisted automatic-status rows still render through the legacy payload path.

In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L156-L190), keep the old `createAutomaticWorkflowStatusMessage(...)` helper for legacy-history coverage, and add a second helper that builds `say: "workflow_step_resolution_status"` messages with the new payload shape.

Then add these exact tests:

- `renders workflow_step_resolution_status rows with the pending label`
- `renders workflow_step_resolution_status rows with the success label`
- `renders workflow_step_resolution_status rows with the failure label`
- `continues to render legacy workflow_form automatic-status rows for persisted history`

For the new pending-row test, assert the same exact negatives currently asserted for automatic workflow preparation:

- no `Yes` button
- no `No` button
- no `Open inputs reference` button

## [x] Step 5: Remove live automatic-status production from Workflow Forms now that the new capability owns those steps.
Allowed files: `src/core/task/workflow-form/WorkflowFormRuntime.ts`, `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L503-L713), delete the three migrated automatic-status resolver entries entirely:

- `CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID`
- `WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_RESOLVER_ID`
- `QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_RESOLVER_ID`

Keep all remaining interactive entries unchanged, including:

- `CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID`
- `BRAINSTORMING_STEP_2_SELECT_SESSION_RESOLVER_ID`
- `BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID`
- `PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID`

In [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L163-L203), remove the three trigger entries that currently point at those migrated ids. Keep:

- `code-review.md` Step 2 diff-source form
- `brainstorming.md` Step 3 topic-capture form
- slash-command workflow-start handling

In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L85-L135), remove the automatic-status-only runtime branches:

- stop passing `automaticStatusState` from `buildPayload(...)`
- stop passing `automaticStatusState` from `buildSuccessPayload(...)`
- delete `buildFailurePayload(...)`

Do not change the interactive submission logic in `handleSubmission(...)`.

In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L182-L385), delete the custom automatic-status resolver and all automatic-status runtime tests. Keep the current coverage for:

- confirm sessions
- collect_inputs sessions
- select_source transitions
- Back behavior
- Retry behavior
- interactive invoke-tool outcomes

In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L22-L34) and [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L306-L383), remove the automatic-status resolver metadata and presentation tests for the three migrated ids. Do not delete the interactive brainstorming or code-review Step 2 assertions.

## [x] Step 6: Update the canonical docs so Workflow Forms no longer claim automatic-status ownership and the new capability is documented as the system-owned zero-input step surface.
Allowed files: `docs/workflow-ui-surface/workflow-form-readme.md`, `docs/agent-101.md`, `docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/architecture.md`, `docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/requirements.md`

In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L73-L86), remove the workflow-form responsibility bullet that says workflow forms render non-interactive automatic workflow-preparation status cards.

In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L111-L117), remove the delivered-use-case bullets for:

- `code-review.md` Step 3 automatic workflow-preparation status card
- `write-remediation-story.md` Step 2 automatic workflow-preparation status card

In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L149-L163), rewrite the core-logic bullets so they describe only interactive workflow-form behavior. Remove the statements that forms may render automatic-status cards or automatic-status failures.

In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L237-L242), remove the automatic review-input preparation example entirely.

In [agent-101.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/agent-101.md#L46-L53), add a third Workflow UI Surfaces bullet immediately after Workflow Forms:

- `Non-interactive deterministic workflow-step resolution:`
  - link to [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/architecture.md)
  - link to [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/requirements.md)

In the new capability docs in this same folder, update any wording that still says the split is “later” or “future” so the architecture and requirements now describe the capability as the active target implementation, not just a conceptual destination.

## [x] Step 7: Run the exact verification sweep and complete the final string-contract audit.
Allowed files: none

Run these exact commands in order:

```bash
npm run protos
```

```bash
npm run test:unit -- src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRegistry.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts --exit
```

```bash
npm run test:webview -- --run src/components/chat/ChatRow.test.tsx
```

If any command fails, stop and surface the failure instead of making unplanned fixes.

Before marking this step complete, verify all of these exact conditions:

- no live runtime producer still emits automatic zero-input step status through `say: "workflow_form"`
- `say: "workflow_step_resolution_status"` is mapped consistently in:
  - [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
  - [ui.proto](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/ui.proto)
  - [cline-message.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto-conversions/cline-message.ts)
  - the generated UI proto files
- the three migrated definition ids remain exactly:
  - `code_review_step_3_review_input`
  - `write_remediation_story_step_2_review_input`
  - `quick_spec_step_2_build_tech_spec_document`
- `proto/cline/task.proto` remains untouched
- `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts` remains untouched
- legacy persisted `say: "workflow_form"` automatic-status rows still render in `ChatRow`
- workflow forms still own only interactive flows after the migration

If any of those checks fail, fix only the mismatch inside the already-allowed files for the relevant earlier step. If any additional file seems necessary, stop and ask the user.

## Remediation Plan

## [x] Step 8: Clear restored workflow-step-resolution sessions when the owning workflow context is missing or no longer matches the resumed session.
Allowed files: `src/core/task/index.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2139-L2216), add a resume/ownership guard inside `maybeResolveWorkflowStepResolutionBeforeApiTurn()` immediately after:

- `const currentSession = this.taskState.activeWorkflowStepResolutionSession`
- the existing `if (!currentSession) { break }` branch

Implement the guard with these exact checks, in this exact order:

1. If `this.taskState.activePlaceholderWorkflowSource` is missing, call `await this.clearWorkflowStepResolutionSession()` and `break`.
2. If `this.taskState.currentFocusChainChecklist` is missing, call `await this.clearWorkflowStepResolutionSession()` and `break`.
3. If `currentSession.owner.workflowName !== this.taskState.activePlaceholderWorkflowSource.name`, call `await this.clearWorkflowStepResolutionSession()` and `break`.
4. Compute the live active step by calling `getActivePlaceholderWorkflowStepDetails(...)` with:
   - `checklistMarkdown: this.taskState.currentFocusChainChecklist`
   - `source: this.taskState.activePlaceholderWorkflowSource`
   - `stablePlaceholderValues: this.taskState.activePlaceholderWorkflowStableValues`
   - `placeholderValues: this.taskState.activePlaceholderWorkflowValues`
5. If the active step is missing or `activeStep.stepNumber !== currentSession.owner.stepNumber`, call `await this.clearWorkflowStepResolutionSession()` and `break`.
6. Look up the current trigger with `getWorkflowStepResolutionTriggerDefinition(this.taskState.activePlaceholderWorkflowSource.name, activeStep.stepNumber)`.
7. If that trigger is missing or `trigger.definitionId !== currentSession.definitionId`, call `await this.clearWorkflowStepResolutionSession()` and `break`.

Do not execute `dismissTrailingCommandOutputAskIfPresent(...)`, `buildPayload(...)`, `buildToolExecutionRequest(...)`, or `executeWorkflowStepResolutionToolAndSync(...)` when any of the guard checks above fails.

Do not change `resolveWorkflowStepResolutionInterceptionCandidate(...)` in this remediation step. The fix belongs in resumed-session handling, not in initial candidate discovery.

In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L546-L657), keep the existing metadata persistence and legacy migration tests unchanged.

Add these two exact regression tests near the existing workflow-step-resolution runtime tests:

- `clears a restored workflow-step-resolution session when the active workflow context is missing before resume`
- `clears a restored workflow-step-resolution session when the active workflow step no longer matches the resumed owner`

For the first test:

- seed `taskState.activeWorkflowStepResolutionSession` with:
  - `definitionId: "code_review_step_3_review_input"`
  - `owner.workflowName: "code-review.md"`
  - `owner.stepNumber: 3`
  - `state: "pending"`
- leave `taskState.activePlaceholderWorkflowSource` undefined
- leave `taskState.currentFocusChainChecklist` undefined
- stub `clearWorkflowStepResolutionSession` so it calls the real helper and records invocation
- stub `executeWorkflowStepResolutionToolAndSync` and assert it is never called
- call `maybeResolveWorkflowStepResolutionBeforeApiTurn`
- assert:
  - `clearWorkflowStepResolutionSession` is called once
  - `taskState.activeWorkflowStepResolutionSession === undefined`

For the second test:

- seed `taskState.activeWorkflowStepResolutionSession` with the same `code_review_step_3_review_input` owner/session shape
- seed `taskState.activePlaceholderWorkflowSource.name = "code-review.md"`
- seed `taskState.currentFocusChainChecklist` so the active step is Step 2, not Step 3:
  - `"- [x] Step 1: Determine Review Source\n- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence\n- [ ] Step 3: Construct & Persist Review Input File"`
- use a remote or local `code-review.md` workflow source whose contents contain at least Steps 1, 2, and 3 so `getActivePlaceholderWorkflowStepDetails(...)` can resolve the active step
- stub `clearWorkflowStepResolutionSession` so it calls the real helper and records invocation
- stub `executeWorkflowStepResolutionToolAndSync` and assert it is never called
- call `maybeResolveWorkflowStepResolutionBeforeApiTurn`
- assert:
  - `clearWorkflowStepResolutionSession` is called once
  - `taskState.activeWorkflowStepResolutionSession === undefined`

## [x] Step 9: Remove the stale migrated assertions from the workflow-form trigger tests and move that coverage onto a dedicated workflow-step-resolution trigger test file.
Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`, `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionTriggerRegistry.test.ts`

In [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts#L259-L330), remove every assertion that still treats the migrated automatic-status steps as workflow-form triggers. Delete these exact test cases:

- `maps code-review step 3 to the review-input workflow-form resolver`
- `maps write-remediation-story step 2 to the review-input workflow-form resolver`
- `maps quick-spec step 2 to the tech-spec workflow-form resolver`
- `does not intercept code-review step 3 when review_input has a current-task write proof and exists on disk`
- `intercepts code-review step 3 when review_input is missing a current-task write proof`
- `does not intercept write-remediation-story step 2 when review_input has a current-task write proof and exists on disk`
- `intercepts write-remediation-story step 2 when review_input is missing a current-task write proof`
- `does not intercept quick-spec step 2 when output_file has a current-task write proof and exists on disk`
- `intercepts quick-spec step 2 when output_file is missing a current-task write proof`

Keep the remaining workflow-form trigger coverage for:

- workflow-start requirement parsing
- `code-review.md` Step 2
- `brainstorming.md` Step 3

Add a new file at [WorkflowStepResolutionTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionTriggerRegistry.test.ts) that imports `getWorkflowStepResolutionTriggerDefinition(...)` from the new trigger registry and adds these exact tests:

- `maps code-review step 3 to the review-input workflow-step-resolution definition`
- `maps write-remediation-story step 2 to the review-input workflow-step-resolution definition`
- `maps quick-spec step 2 to the tech-spec workflow-step-resolution definition`
- `does not intercept code-review step 3 when review_input has a current-task write proof and exists on disk`
- `intercepts code-review step 3 when review_input is missing a current-task write proof`
- `does not intercept quick-spec step 2 when output_file has a current-task write proof and exists on disk`

Use the same temp-directory pattern already used in the workflow-form trigger tests:

- `fs.mkdtemp(path.join(os.tmpdir(), "workflow-step-resolution-trigger-"))`
- real files written to disk with `fs.writeFile(...)`
- `cwd: tempDir`
- `activePlaceholderWorkflowStableValues`
- `activePlaceholderWorkflowValues`
- `activePlaceholderWorkflowTaskWriteProofPaths`

Assert these exact mapping ids:

- `getWorkflowStepResolutionTriggerDefinition("code-review.md", 3)?.definitionId === "code_review_step_3_review_input"`
- `getWorkflowStepResolutionTriggerDefinition("write-remediation-story.md", 2)?.definitionId === "write_remediation_story_step_2_review_input"`
- `getWorkflowStepResolutionTriggerDefinition("quick-spec.md", 2)?.definitionId === "quick_spec_step_2_build_tech_spec_document"`

## [x] Step 10: Run the focused remediation verification sweep and complete the remediation audit.
Allowed files: none

Run these exact commands in order:

```bash
npm run test:unit -- src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionTriggerRegistry.test.ts --exit
```

If the command fails, stop and surface the failure instead of making unplanned fixes.

Before marking this step complete, verify all of these exact conditions:

- a restored `activeWorkflowStepResolutionSession` is cleared before execution when:
  - the active workflow source is missing
  - the active checklist is missing
  - the active workflow name does not match the session owner
  - the active step number does not match the session owner
  - the active trigger definition id does not match the resumed session definition id
- `maybeResolveWorkflowStepResolutionBeforeApiTurn()` no longer executes orphaned restored sessions
- `WorkflowFormTriggerRegistry.test.ts` only covers interactive workflow-form triggers after cleanup
- `WorkflowStepResolutionTriggerRegistry.test.ts` owns the migrated trigger mapping/interception coverage

If any of those checks fail, fix only the mismatch inside the already-allowed files for the relevant remediation step. If any additional file seems necessary, stop and ask the user.
