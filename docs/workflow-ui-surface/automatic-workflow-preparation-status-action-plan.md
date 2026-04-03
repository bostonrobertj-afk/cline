---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not make changes outside the allowed files listed for the current step.
  - If any ambiguity is discovered, or if any change is needed outside the allowed files for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup, compatibility shims, or unrelated refactors beyond what is explicitly prescribed here.
---

# Automatic Workflow Preparation Status Action Plan

## Scope

This plan changes zero-human-input workflow preparation from an interactive workflow-form ask into a non-interactive, reusable automatic-status presentation that runs the tool immediately and shows status in chat.

The shipped baseline today is:

- interactive workflow-form payload contract in [src/shared/ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L401-L449)
- capability runtime in [src/core/task/workflow-form/WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L62-L299)
- task-loop orchestration in [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1386-L1785)
- code-review Step 3 zero-field resolver in [src/core/task/workflow-form/WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L457-L526)
- inline workflow-form UI rendering in [webview-ui/src/components/chat/ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L1530-L1744)

The required end state for this plan is:

- a reusable workflow-form presentation mode for automatic workflow preparation status
- a reusable webview chat component that renders the automatic status card and is not code-review-specific
- `code-review.md` Step 3 using that automatic status mode with these exact labels:
  - pending: `Preparing workflow documents`
  - success: `Workflow documents ready`
  - failure: `Automatic workflow preparation failed- falling back to manual LLM workflow preparation.`
- automatic-status workflow preparation rendering through `say: "workflow_form"` while the task stays in active execution
- failure still falling back to the manual LLM path, but without reopening the old confirm/submit UI

This plan must not:

- add a code-review-only UI special case in `ChatRow.tsx`
- change the `build_review_input` tool contract
- change deterministic workflow progression gates
- add `write-remediation-story.md` resolver/trigger wiring in this pass

## Action Plan

[x] Step 1: Extend the shared workflow-form payload contract so resolvers can declare reusable automatic-status presentation and payloads can carry pending/success/failure state.
Allowed files: `src/shared/ExtensionMessage.ts`, `src/core/task/workflow-form/types.ts`, `src/core/task/workflow-form/buildWorkflowFormPayload.ts`
In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L401-L449), insert these exact shared types immediately before `WorkflowFormDefinition`:
- `WorkflowFormPresentationKind = "interactive_form" | "automatic_status"`
- `WorkflowFormAutomaticStatusState = "pending" | "success" | "failure"`
- `WorkflowFormPresentation` as a discriminated union with:
  - `{ kind: "interactive_form" }`
  - `{ kind: "automatic_status"; pendingLabel: string; successLabel: string; failureLabel: string }`
Then make these exact contract changes in the same file:
- add optional `presentation?: WorkflowFormPresentation` to `WorkflowFormDefinition`
- add optional `automaticStatusState?: WorkflowFormAutomaticStatusState` to `ClineWorkflowForm`
Do not change `WorkflowFormRenderablePhase` or introduce a new workflow-form phase in this step.
In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L64-L74), add optional `defaultInitialPhase?: Exclude<WorkflowFormSessionPhase, "success">` to `WorkflowFormResolverDefinition`.
In [buildWorkflowFormPayload.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/buildWorkflowFormPayload.ts#L4-L34), add an optional `automaticStatusState?: WorkflowFormAutomaticStatusState` argument and include that field in the returned `ClineWorkflowForm` payload when it is provided.
Do not change how `errorMessage` or `successMessage` are populated in this step.

[x] Step 2: Add automatic-status runtime support and convert the code-review Step 3 review-input resolver to the reusable automatic preparation mode.
Allowed files: `src/core/task/workflow-form/WorkflowFormRuntime.ts`, `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L457-L526), change the `CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID` definition exactly as follows:
- add `defaultInitialPhase: "collect_inputs"` immediately after `toolName`
- in `buildDefinition()`, add:
  - `presentation: { kind: "automatic_status", pendingLabel: "Preparing workflow documents", successLabel: "Workflow documents ready", failureLabel: "Automatic workflow preparation failed- falling back to manual LLM workflow preparation." }`
- delete the `confirm` page entirely from this resolver
- keep `collect_inputs.fields` as `[]`
- keep `buildToolExecutionRequest(...)` returning `{ toolName: ClineDefaultTool.BUILD_REVIEW_INPUT, toolInput: {}, toolParams: {} }`
- keep `evaluateToolExecutionResult(...)` behavior unchanged
- keep `successMessage` unchanged; the new automatic-status card must use the presentation labels rather than this legacy string
In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L65-L111), make these exact runtime additions:
- in `createSession(...)`, when `options.initialPhase` is `undefined`, default to `resolver.defaultInitialPhase ?? "confirm"` instead of hardcoding `"confirm"`
- add `buildFailurePayload(session: WorkflowFormSessionState): ClineWorkflowForm`
- implement `buildFailurePayload(...)` by creating a `phase: "success"` session, reusing the resolver definition, and calling `buildWorkflowFormPayload(...)` with `automaticStatusState: "failure"`
- update `buildPayload(...)` so when `definition.presentation?.kind === "automatic_status"` it passes `automaticStatusState: "pending"`
- update `buildSuccessPayload(...)` so when `definition.presentation?.kind === "automatic_status"` it passes `automaticStatusState: "success"`
Do not change `handleSubmission(...)` in this step.
In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L182-L280), add these exact tests:
- `uses resolver defaultInitialPhase when createSession is called without an explicit initialPhase`
- `builds pending automatic-status payloads for automatic workflow preparation`
- `builds success automatic-status payloads for automatic workflow preparation`
- `builds failure automatic-status payloads for automatic workflow preparation`
For those tests, use a custom resolver whose definition includes `presentation.kind === "automatic_status"` and whose `defaultInitialPhase` is `"collect_inputs"`.
In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L18-L43), replace the current Step 3 field-list test with a contract test named exactly `declares the code-review step 3 review-input resolver as automatic workflow preparation` that asserts:
- `resolver.defaultInitialPhase === "collect_inputs"`
- `definition.presentation` deep equals the exact automatic-status object prescribed above
- `definition.pages.collect_inputs?.fields` deep equals `[]`
Keep the existing Step 3 tool-request serialization test in place, with `toolInput` and `toolParams` both still equal to `{}`.

[x] Step 3: Change the task pre-turn workflow-form loop so automatic-status preparation renders through `say: "workflow_form"`, auto-runs immediately, and renders a terminal failure status card before manual fallback.
Allowed files: `src/core/task/index.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1386-L1439), change `renderWorkflowFormMessage(...)` to accept a second parameter `messageType: "ask" | "say"`.
Then apply these exact rules inside that method:
- when `messageType === "ask"`, preserve the current `awaiting_user_response` + `AwaitingUserResponseSubtypes.SYSTEM` behavior exactly
- when `messageType === "say"`, set thread display state to `ThreadDisplayStates.ACTIVE_RUN` with the same `"workflow_form_render"` reason, and do not set an awaiting-user subtype
- when updating an existing workflow-form message by `sessionId`, match either:
  - `message.type === "ask" && message.ask === "workflow_form"`
  - `message.type === "say" && message.say === "workflow_form"`
- when inserting a new message, use:
  - `type: "ask", ask: "workflow_form"` for ask-mode
  - `type: "say", say: "workflow_form"` for say-mode
In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1681-L1691), stop hardcoding `initialPhase: "confirm"` for deterministic step-triggered sessions. Instead:
- look up the resolver once with `getWorkflowFormResolverDefinition(candidate.trigger.resolverId)`
- pass `initialPhase: resolver.defaultInitialPhase ?? "confirm"`
In the inner decision loop at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1699-L1779), insert an automatic-status branch before the existing `renderWorkflowFormMessage(...)` + `pWaitFor(...)` cycle:
- detect automatic mode from `this.workflowFormRuntime.buildPayload(currentSession).definition.presentation?.kind === "automatic_status"`
- for automatic mode:
  - render the pending payload once via `renderWorkflowFormMessage(payload, "say")`
  - build the invoke request directly from `getWorkflowFormResolverDefinition(currentSession.resolverId).buildToolExecutionRequest(currentSession, currentSession.values)`
  - call `executeWorkflowFormToolAndSync(...)` immediately without waiting for `pendingWorkflowFormOutcome`
  - on success:
    - render `this.workflowFormRuntime.buildSuccessPayload(currentSession, resolver.buildDefinition(currentSession).successMessage)` via `renderWorkflowFormMessage(..., "say")`
    - clear the session
    - restart the decision loop exactly as the current success path does
  - on `fallbackToAgent === true`:
    - render `this.workflowFormRuntime.buildFailurePayload(currentSession)` via `renderWorkflowFormMessage(..., "say")`
    - append the resolver id to `suppressedWorkflowFormResolverIds` exactly as the current fallback path does
    - clear the session
    - break back to normal agent fallback flow
  - do not enter `retry_error` for automatic-status sessions
Do not change the interactive form path for `code_review_step_3_diff_source` or workflow-start forms in this step.
In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1178-L1275), replace the current interactive Step 3 open test with a new test named exactly `auto-runs the Phase 3 review-input workflow preparation and renders pending then success status cards`.
That test must assert all of these exact conditions:
- `createSession(...)` is called with `initialPhase: "collect_inputs"` for `code_review_step_3_review_input`
- the first rendered payload is a `say` workflow-form payload for the same session with `automaticStatusState === "pending"`
- `executeWorkflowFormToolAndSync(...)` runs without any queued `pendingWorkflowFormOutcome`
- the second rendered payload is a `say` workflow-form payload for the same session with `automaticStatusState === "success"`
In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1359-L1494), replace the current mismatch fallback notice assertions so the test is renamed to `renders the automatic workflow preparation failure card, suppresses the resolver, and returns control to manual Step 3` and asserts:
- the second rendered payload is a `say` workflow-form payload with `automaticStatusState === "failure"`
- no mismatch-specific text is rendered in the terminal workflow-form card
- the resolver is still suppressed and the session is cleared
In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1496-L1605), make the same terminal-card assertion update for the tool-error fallback test: the terminal workflow-form payload must carry `automaticStatusState === "failure"` and the generic failure label, not the raw tool error text.

[x] Step 4: Add a reusable chat component for automatic workflow preparation status and switch workflow-form rendering to use it whenever the payload presentation mode is automatic.
Allowed files: `webview-ui/src/components/chat/WorkflowPreparationStatusRow.tsx`, `webview-ui/src/components/chat/ChatRow.tsx`, `webview-ui/src/components/chat/ChatRow.test.tsx`
Add a new component at [WorkflowPreparationStatusRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/WorkflowPreparationStatusRow.tsx) with this exact public prop shape:
```ts
interface WorkflowPreparationStatusRowProps {
	state: "pending" | "success" | "failure"
	label: string
}
```
Render it as a reusable chat card with these exact visual rules:
- container classes: `border border-editor-group-border rounded-xs bg-code/40 p-3`
- pending state uses `LoaderCircleIcon` with `animate-spin`
- success state uses `CheckIcon`
- failure state uses `TriangleAlertIcon`
- display only the icon plus the supplied label text
- do not render action buttons, dictionary controls, input fields, or code-review-specific copy in this component
In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L1530-L1744), make these exact changes:
- import the new `WorkflowPreparationStatusRow`
- in the `case "workflow_form"` branch, compute `const automaticPresentation = workflowForm.definition.presentation`
- if `automaticPresentation?.kind === "automatic_status"`, determine `state` from `workflowForm.automaticStatusState ?? "pending"` and determine `label` from:
  - `pending` -> `automaticPresentation.pendingLabel`
  - `success` -> `automaticPresentation.successLabel`
  - `failure` -> `automaticPresentation.failureLabel`
- return the new reusable `WorkflowPreparationStatusRow` immediately for that branch
- leave the existing interactive workflow-form renderer unchanged for every non-automatic presentation
In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L40-L142), add a helper that can build `say: "workflow_form"` messages with `definition.presentation.kind === "automatic_status"` and `automaticStatusState`.
Then add these exact tests:
- `renders automatic workflow preparation rows with the pending label and no interactive controls`
- `renders automatic workflow preparation rows with the success label`
- `renders automatic workflow preparation rows with the failure label`
For the pending-row test, assert all of these exact negatives:
- no `Yes` button
- no `No` button
- no `Open inputs reference` button

[x] Step 5: Update the canonical workflow-ui-surface docs so they describe the reusable automatic-status path and the repo’s UI component ownership pattern.
Allowed files: `docs/workflow-ui-surface/workflow-form-readme.md`, `docs/workflow-ui-surface/architecture.md`, `docs/workflow-ui-surface/requirements.md`
In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L60-L71), add a new responsibility bullet immediately after `Render a system-owned staged form in chat.`:
- `Render non-interactive automatic workflow-preparation status cards in chat for zero-human-input system-owned steps.`
In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L96-L100), replace the current Step 3 delivered-use-case bullet with:
- `` `code-review.md` Step 3 automatic workflow-preparation status card using `build_review_input` with workflow-owned inputs ``
In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L129-L141), update the core logic list so:
- step 4 says the webview renders either a staged form or a non-interactive automatic-status card
- step 5 distinguishes user submission for interactive forms versus immediate tool execution for automatic-status cards
- step 13 states that automatic-status failures render a terminal failure card and then fall back to the normal agent path
In [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/architecture.md#L390-L400), add this exact bullet immediately after the existing `webview-ui/src/components/chat/` bullet:
- [webview-ui/components.json](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/components.json)
Then add one paragraph immediately after the `Best-fit existing areas:` list stating:
- reusable workflow-form presentation components should live under `webview-ui/src/components/chat/`
- shared primitives should continue to come from `webview-ui/src/components/ui/` via the aliases declared in `webview-ui/components.json`
- workflow-specific copy must come from payload/resolver data rather than from code-review-specific JSX branches
In [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md#L151-L178), replace the Phase 1 interactive-only bullet list with a dual-mode requirement set that preserves interactive forms and adds this exact new rule:
- `support a non-interactive automatic workflow-preparation status card for zero-human-input system-owned steps, with pending, success, and fallback-to-manual terminal states`
Do not change the rest of the requirements document outside that UI Surface Requirements section.

[x] Step 6: Run the exact focused verification suite for the automatic-status workflow preparation buildout.
Allowed files: none
Run these exact commands in order:
```bash
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts --exit
```
```bash
npm run test:webview -- --run src/components/chat/ChatRow.test.tsx
```
If either command fails, stop and surface the failure instead of making unplanned fixes.

[x] Step 7: Perform a final string-contract and scope-boundary audit before handing the change back.
Allowed files: `src/shared/ExtensionMessage.ts`, `src/core/task/workflow-form/types.ts`, `src/core/task/workflow-form/buildWorkflowFormPayload.ts`, `src/core/task/workflow-form/WorkflowFormRuntime.ts`, `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/index.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`, `webview-ui/src/components/chat/WorkflowPreparationStatusRow.tsx`, `webview-ui/src/components/chat/ChatRow.tsx`, `webview-ui/src/components/chat/ChatRow.test.tsx`, `docs/workflow-ui-surface/workflow-form-readme.md`, `docs/workflow-ui-surface/architecture.md`, `docs/workflow-ui-surface/requirements.md`
Before marking this step complete, verify all of these exact conditions:
- the only automatic-status labels used by the code-review Step 3 resolver are:
  - `Preparing workflow documents`
  - `Workflow documents ready`
  - `Automatic workflow preparation failed- falling back to manual LLM workflow preparation.`
- no code-review-specific JSX branch or hardcoded Step 3 strings were added to the new reusable webview component
- automatic workflow-preparation rendering uses `say: "workflow_form"` and does not move the thread into `awaiting_user_response`
- the interactive workflow-form path still uses `ask: "workflow_form"`
- `code_review_step_3_diff_source` remains interactive and unchanged in behavior
- no file in the allowed set adds `write-remediation-story.md` trigger/resolver wiring in this pass
If any of those checks fail, fix only the mismatch inside the already-allowed files for the relevant earlier step. If any additional file seems necessary, stop and ask the user.
