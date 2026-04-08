---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not make changes outside the allowed files listed for the current step.
  - If any ambiguity is discovered, or if any change is needed outside the allowed files for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup beyond what is explicitly prescribed here.
---

# Workflow Start Card Action Plan

## Scope Lock

This plan implements the reusable placeholder-workflow startup card capability defined in [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/requirements.md).

Live seam audit completed before authoring this plan:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/requirements.md#L1) requires a pre-Turn-1, placeholder-workflow-only, ask-only startup card that is separate from workflow forms.
- [workflow-start-messages.md:97](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md#L97) and [workflow-start-messages.md:98](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md#L98) contain the approved first runtime body copy for `quick-spec`.
- [index.ts:1657](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1657) is the existing pre-turn workflow-form interception loop and [index.ts:5040](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L5040) is the current call site immediately before Turn 1 prompt assembly.
- [TaskState.ts:159](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L159) and [ContextTrackerTypes.ts:51](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L51) currently persist workflow-form state only; no start-card state exists yet.
- [workflow-activation.ts:46](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts#L46) and [workflow-activation.ts:117](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts#L117) are the canonical workflow-activation reset seams.
- [ExtensionMessage.ts:159](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L159), [ui.proto:35](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/ui.proto#L35), and [cline-message.ts:13](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto-conversions/cline-message.ts#L13) are the canonical ask-type transport seams.
- [task.proto:35](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/task.proto#L35) and [submitWorkflowForm.ts:1](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/submitWorkflowForm.ts#L1) are the sibling submission seams this capability must mirror without reusing workflow-form transport.
- [ChatRow.tsx:277](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L277) and [useMessageHandlers.ts:11](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L11) are the live workflow-form parse/render/submit seams that the new capability must parallel, not overload.
- [workflow-form-readme.md:1](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L1) currently describes pre-turn startup surfaces entirely in form terms and must be explicitly narrowed once start cards exist.

This plan must preserve the user-approved contract:

- ask type: `workflow_start_card`
- no `say` type for this slice
- shared payload type: `ClineWorkflowStartCard`
- task RPC: `submitWorkflowStartCard`
- task request: `WorkflowStartCardSubmissionRequest`
- task state field: `activeWorkflowStartCardSession`
- task metadata field: `activeWorkflowStartCardSession`
- proto enum: `WorkflowStartCardAction`
- only enum member: `CONTINUE = 1`
- controller file: `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/task/submitWorkflowStartCard.ts`
- runtime files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/buildWorkflowStartCardPayload.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/types.ts`

The first delivered runtime registry entry must be:

- workflow key: `quick-spec.md`
- body markdown:
  `In this workflow you will build a small implementation-ready tech spec through guided discovery, scoped planning, and a final review pass. You'll define the objective, solution, scope, context, acceptance criteria, seams, and executable tasks needed for quick implementation.`

This plan must remain independent from:

- workflow-start forms
- deterministic progression
- Step 1 automation for `quick-spec.md`
- managed-workflow startup behavior
- custom per-workflow CTA labels
- runtime loading of card copy from docs

## Action Plan

- [x] Step 1: Add the dedicated shared transport contract for workflow-start cards and regenerate protobuf outputs
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/ui.proto`
    - `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/task.proto`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto-conversions/cline-message.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto/cline/ui.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto/cline/task.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/generated/grpc-js/cline/ui.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/generated/grpc-js/cline/task.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/generated/nice-grpc/cline/ui.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/generated/nice-grpc/cline/task.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/generated/hosts/vscode/protobus-services.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/generated/hosts/vscode/protobus-service-types.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/generated/hosts/standalone/protobus-server-setup.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/services/grpc-client.ts`
  - In [ui.proto:35](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/ui.proto#L35), add the exact ask enum member `WORKFLOW_START_CARD = 19;` immediately after `WORKFLOW_FORM = 18;`. Do not add any `ClineSay` enum member for this capability.
  - In [task.proto:35](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/task.proto#L35), add `rpc submitWorkflowStartCard(WorkflowStartCardSubmissionRequest) returns (Empty);` immediately after `submitWorkflowForm(...)`.
  - In [task.proto:140](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/task.proto#L140), insert this exact contract immediately after `WorkflowFormSubmissionRequest` and before `ExecuteQuickWinRequest`:
    ```proto
    enum WorkflowStartCardAction {
      WORKFLOW_START_CARD_ACTION_UNSPECIFIED = 0;
      CONTINUE = 1;
    }

    message WorkflowStartCardSubmissionRequest {
      Metadata metadata = 1;
      string session_id = 2;
      WorkflowStartCardAction action = 3;
    }
    ```
  - In [ExtensionMessage.ts:159](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L159), add `"workflow_start_card"` immediately after `"workflow_form"` in `ClineAsk`. Do not add a `ClineSay` sibling.
  - In [ExtensionMessage.ts:455](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L455), add a new exported interface immediately after `ClineWorkflowForm`:
    ```ts
    export interface ClineWorkflowStartCard {
    	sessionId: string
    	title: string
    	markdownBody: string
    	ctaLabel: "Get Started"
    }
    ```
  - In [cline-message.ts:13](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto-conversions/cline-message.ts#L13), extend both ask-direction mappings so `workflow_start_card` round-trips to and from `ClineAsk.WORKFLOW_START_CARD`.
  - Do not hand-edit the generated protobuf outputs beyond what `npm run protos` produces from the source proto changes above.

- [x] Step 2: Create the dedicated workflow-start-card capability files and the first `quick-spec.md` runtime registry entry
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/types.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/buildWorkflowStartCardPayload.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-start-card/README.md`
  - Create [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/types.ts) with these exact exported interfaces:
    ```ts
    export interface WorkflowStartCardRegistryEntry {
    	workflowName: string
    	markdownBody: string
    }

    export interface WorkflowStartCardSessionState {
    	sessionId: string
    	workflowName: string
    	markdownBody: string
    }
    ```
  - Create [WorkflowStartCardRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts) with:
    - a `workflowStartCardRegistry` record keyed by exact workflow filename
    - one initial entry only for `"quick-spec.md"`
    - the exact markdown body string from [workflow-start-messages.md:98](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md#L98)
    - an exported helper named exactly `getWorkflowStartCardRegistryEntry(workflowName: string): WorkflowStartCardRegistryEntry | undefined`
  - Create [buildWorkflowStartCardPayload.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/buildWorkflowStartCardPayload.ts) with:
    - an exported helper named exactly `buildWorkflowStartCardPayload(session: WorkflowStartCardSessionState): ClineWorkflowStartCard`
    - an internal heading builder that implements the exact approved transform:
      - strip trailing `.md`
      - split on `-`
      - title-case each token
      - join with spaces
      - return `Welcome to the {Transformed Name} Workflow!`
    - payload fields:
      - `sessionId: session.sessionId`
      - `title: <generated heading>`
      - `markdownBody: session.markdownBody`
      - `ctaLabel: "Get Started"`
  - Do not create a workflow-form-style runtime class in this slice. The capability files for this step are limited to the registry, payload builder, and plain type declarations above.
  - Create [README.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/README.md) as the dedicated canonical capability doc. It must explicitly state:
    - workflow-start cards are pre-Turn-1 startup surfaces for placeholder workflows
    - they are not workflow forms
    - the runtime registry is code-owned
    - the docs file is reference-only
    - `quick-spec.md` is the first delivered workflow

- [x] Step 3: Wire task-state, persistence, pre-turn interception, and controller handling for the new ask-only startup card
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-activation.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/task/submitWorkflowStartCard.ts`
  - In [TaskState.ts:4](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L4), import `WorkflowStartCardSessionState` from `@/core/task/workflow-start-card/types`.
  - In [TaskState.ts:159](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L159), add `activeWorkflowStartCardSession?: WorkflowStartCardSessionState` immediately before `activeWorkflowFormSession`.
  - In [ContextTrackerTypes.ts:6](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L6), import `WorkflowStartCardSessionState` from `@/core/task/workflow-start-card/types`, then add `activeWorkflowStartCardSession?: WorkflowStartCardSessionState` immediately before `activeWorkflowFormSession` at [ContextTrackerTypes.ts:51](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L51).
  - In [workflow-activation.ts:46](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts#L46), clear `args.taskState.activeWorkflowStartCardSession` in the managed-workflow activation reset block immediately before `args.taskState.suppressedWorkflowFormResolverIds = []`.
  - In [workflow-activation.ts:121](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts#L121), clear `args.taskState.activeWorkflowStartCardSession` inside the `workflowChanged` block immediately before `args.taskState.suppressedWorkflowFormResolverIds = []`.
  - In [index.ts:683](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L683), treat `"workflow_start_card"` exactly like `"workflow_form"` in `getAwaitingUserResponseSubtypeForAsk(...)` so it always returns `AwaitingUserResponseSubtypes.SYSTEM`.
  - In [index.ts:1](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1), add the exact new imports needed for this slice:
    - `randomUUID` from `"crypto"`
    - `type ClineWorkflowStartCard` from `@shared/ExtensionMessage`
    - `WorkflowStartCardAction` and `WorkflowStartCardSubmissionRequest` from `@shared/proto/cline/task`
    - `buildWorkflowStartCardPayload` from `@/core/task/workflow-start-card/buildWorkflowStartCardPayload`
    - `getWorkflowStartCardRegistryEntry` from `@/core/task/workflow-start-card/WorkflowStartCardRegistry`
    - `type WorkflowStartCardSessionState` from `@/core/task/workflow-start-card/types`
  - In [index.ts:1331](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1331), add a sibling method named exactly `async handleWorkflowStartCardSubmission(request: WorkflowStartCardSubmissionRequest)` immediately before `handleWorkflowFormSubmission(...)`. Its exact behavior must be:
    - return immediately if `this.taskState.activeWorkflowStartCardSession` is missing
    - return immediately if `request.sessionId !== activeSession.sessionId`
    - return immediately if `request.action !== WorkflowStartCardAction.CONTINUE`
    - otherwise call `await this.clearWorkflowStartCardSession()`
  - Immediately before `persistWorkflowFormSession()` at [index.ts:1368](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1368), add:
    - `private async persistWorkflowStartCardSession()`
    - `private async clearWorkflowStartCardSession()`
    - `private async renderWorkflowStartCardMessage(payload: ClineWorkflowStartCard): Promise<void>`
  - Implement those three new methods with the same persistence/update pattern as the workflow-form siblings, with these exact differences:
    - persist `taskMetadata.activeWorkflowStartCardSession`
    - ask type must always be `"workflow_start_card"`
    - message type must always be `"ask"`
    - session matching for update must parse `message.text` as `ClineWorkflowStartCard` and compare `sessionId`
    - there is no `say` path and no success/failure variant
  - In [index.ts:1544](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1544), clear `this.taskState.activeWorkflowStartCardSession = undefined` immediately before `this.taskState.activeWorkflowFormSession = undefined`.
  - In [index.ts:1554](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1554), persist `taskMetadata.activeWorkflowStartCardSession = this.taskState.activeWorkflowStartCardSession` immediately before the existing `taskMetadata.activeWorkflowFormSession = ...` assignment inside `persistClearedPlaceholderWorkflowMetadata()`.
  - In [index.ts:2048](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2048), persist `taskMetadata.activeWorkflowStartCardSession = this.taskState.activeWorkflowStartCardSession` immediately before the existing `taskMetadata.activeWorkflowFormSession = ...` assignment.
  - In [index.ts:2210](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2210), restore `this.taskState.activeWorkflowStartCardSession = metadata.activeWorkflowStartCardSession as WorkflowStartCardSessionState | undefined` immediately before the existing workflow-form restore line.
  - Add a new method named exactly `private async maybeResolveWorkflowStartCardBeforeApiTurn(currentTurnSlashCommandAction?: PersistentSlashCommandAction): Promise<void>` immediately before [index.ts:1657](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1657). Its exact behavior must be:
    - if `this.taskState.activeWorkflowStartCardSession` already exists, build the payload from that session, render it with `renderWorkflowStartCardMessage(...)`, then wait with `pWaitFor(...)` until the session is cleared or `this.taskState.abort` becomes true
    - if no pending session exists, return immediately unless `currentTurnSlashCommandAction?.type === "activate_placeholder_workflow"`
    - read the active workflow name from `this.taskState.activePlaceholderWorkflowSource?.name`; return immediately if missing
    - look up the code-owned registry entry with `getWorkflowStartCardRegistryEntry(workflowName)`; return immediately if no entry exists
    - create a new `activeWorkflowStartCardSession` using `randomUUID()` with fields:
      - `sessionId`
      - `workflowName`
      - `markdownBody: registryEntry.markdownBody`
    - persist it through `persistWorkflowStartCardSession()`
    - build the payload, render it, and wait with `pWaitFor(...)` until the session is cleared or `this.taskState.abort` becomes true
    - do not invoke workflow forms, deterministic progression, or prompt assembly inside this method
  - In [index.ts:5040](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L5040), call `await this.maybeResolveWorkflowStartCardBeforeApiTurn(persistentSlashCommandAction)` immediately before the existing `maybeResolveWorkflowFormBeforeApiTurn(...)` call.
  - Create [submitWorkflowStartCard.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/submitWorkflowStartCard.ts) as the exact sibling of `submitWorkflowForm.ts`, but route to `controller.task.handleWorkflowStartCardSubmission(request)` and type the request as `WorkflowStartCardSubmissionRequest`.

- [x] Step 4: Add the dedicated webview parse/render/submit path without reusing workflow-form UI state
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
  - In [useMessageHandlers.ts:1](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L1), import `ClineWorkflowStartCard` from `@shared/ExtensionMessage` and `WorkflowStartCardAction`, `WorkflowStartCardSubmissionRequest` from `@shared/proto/cline/task`.
  - Immediately after `buildWorkflowFormSubmissionRequest(...)` at [useMessageHandlers.ts:11](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L11), add:
    - `buildWorkflowStartCardSubmissionRequest(workflowStartCard: ClineWorkflowStartCard): WorkflowStartCardSubmissionRequest`
    - `submitWorkflowStartCard(workflowStartCard: ClineWorkflowStartCard)`
  - Implement the new helper with this exact request shape:
    ```ts
    return WorkflowStartCardSubmissionRequest.create({
    	sessionId: workflowStartCard.sessionId,
    	action: WorkflowStartCardAction.CONTINUE,
    })
    ```
  - Implement `submitWorkflowStartCard(...)` by calling `TaskServiceClient.submitWorkflowStartCard(...)`.
  - In [useMessageHandlers.ts:74](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L74), keep the existing workflow-form guard and add a sibling guard named exactly `isWorkflowStartCardAwaitingSystemState` for `clineAsk === "workflow_start_card"`. Update the send-message early return at [useMessageHandlers.ts:94](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L94) so the composer is blocked while either system-owned surface is pending.
  - In [ChatRow.tsx:277](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L277), add a parallel `workflowStartCard` parser immediately before the existing `workflowForm` parser. It must parse only ask rows where `message.ask === "workflow_start_card"` and cast to `ClineWorkflowStartCard`.
  - Add dedicated local UI state for the start card immediately before the existing workflow-form state:
    - `workflowStartCardSubmissionPending`
  - Add a `useEffect(...)` immediately before the existing workflow-form reset effect at [ChatRow.tsx:296](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L296) that resets `workflowStartCardSubmissionPending` to `false` whenever the parsed `workflowStartCard` value changes or disappears.
  - Add a dedicated callback immediately before [ChatRow.tsx:521](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L521):
    - `handleWorkflowStartCardContinue`
    - it must call `submitWorkflowStartCard(workflowStartCard)`
    - it must not call `submitWorkflowForm(...)`
  - Add a dedicated renderer immediately before `renderWorkflowFormContent()` at [ChatRow.tsx:546](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L546). The rendered card must:
    - use the same bordered chat-surface container pattern as the workflow form card
    - render `workflowStartCard.title` as the card heading
    - render `workflowStartCard.markdownBody` with `MarkdownRow`
    - render exactly one primary button labeled from `workflowStartCard.ctaLabel`
    - disable the button while `workflowStartCardSubmissionPending` is true
    - not render a dictionary link, cancel path, alternate CTA, or workflow-form fields
  - In the ask switch at [ChatRow.tsx:1757](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L1757), add a new `case "workflow_start_card":` immediately before the existing `case "workflow_form":`, and return the new dedicated renderer there.
  - Do not add any `say` rendering branch for `workflow_start_card`.

- [x] Step 5: Add focused runtime, controller, transport, UI, and documentation coverage for the new capability
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/task/__tests__/submitWorkflowStartCard.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/thread-display-state.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`
    - `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md`
  - Create [WorkflowStartCardRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts) with three exact assertions:
    - `getWorkflowStartCardRegistryEntry("quick-spec.md")` returns an entry whose `workflowName` is exactly `"quick-spec.md"`
    - that same entry’s `markdownBody` exactly matches the approved `quick-spec.md` body string from Step 2
    - `buildWorkflowStartCardPayload(...)` generates:
      - `Welcome to the Quick Spec Workflow!` for `quick-spec.md`
      - `Welcome to the Create Story Workflow!` for `create-story.md`
      - `ctaLabel === "Get Started"`
  - Create [submitWorkflowStartCard.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/__tests__/submitWorkflowStartCard.test.ts) as the exact sibling of `submitWorkflowForm.test.ts`, but assert routing through `handleWorkflowStartCardSubmission`.
  - In [thread-display-state.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/thread-display-state.test.ts), add one new test proving `workflow_start_card` round-trips through `convertClineMessageToProto(...)` and `convertProtoToClineMessage(...)` as an ask type while preserving `AwaitingUserResponseSubtypes.SYSTEM`.
  - In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), add focused tests that prove:
    - a slash-command placeholder activation for `quick-spec.md` opens the workflow-start card before the workflow-form pre-turn loop runs
    - a slash-command placeholder activation for a workflow with no registry entry skips the start-card capability entirely
    - `activeWorkflowStartCardSession` restores from persisted metadata and re-renders on resume without requiring a new slash-command action
    - `handleWorkflowStartCardSubmission` clears the pending session only when the session id matches and the action is `WorkflowStartCardAction.CONTINUE`
  - In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx), add a dedicated `workflow_start_card` fixture and assert:
    - the generated heading text renders
    - the markdown body renders
    - the only CTA shown is `Get Started`
    - clicking `Get Started` calls `TaskServiceClient.submitWorkflowStartCard(...)`
  - In [useMessageHandlers.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx), add assertions that:
    - `buildWorkflowStartCardSubmissionRequest(...)` emits `WorkflowStartCardAction.CONTINUE`
    - `submitWorkflowStartCard(...)` routes to `TaskServiceClient.submitWorkflowStartCard(...)`
    - the composer send path is blocked while `clineAsk === "workflow_start_card"` and `awaitingUserResponseSubtype === "system"`
  - In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md), add one short paragraph immediately after the `## Purpose` section stating that workflow-start cards are a separate startup capability, are not workflow forms, and are documented in `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-start-card/README.md`.
  - Do not edit [workflow-start-messages.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md) in this implementation slice.

- [x] Step 6: Run the required verification commands and perform the final string-contract audit
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-start-card/action-plan.md`
  - Run these commands in this exact order:
    1. `npm run protos`
    2. `npm run test:unit -- src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts src/core/controller/task/__tests__/submitWorkflowStartCard.test.ts src/core/task/__tests__/thread-display-state.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
    3. `cd webview-ui && npm run test -- src/components/chat/ChatRow.test.tsx src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`
    4. `npx tsc --noEmit`
    5. `cd webview-ui && npx tsc --noEmit`
    6. `rg -n "workflow_start_card|WORKFLOW_START_CARD|submitWorkflowStartCard|WorkflowStartCardSubmissionRequest|WorkflowStartCardAction|activeWorkflowStartCardSession|ClineWorkflowStartCard" src proto webview-ui docs`
  - If any command fails, stop and resolve only the failure required to satisfy this plan. Do not widen scope.
  - After all commands pass, re-read this entire action plan and verify that every prescribed string contract appears consistently in the implemented source:
    - `workflow_start_card`
    - `WORKFLOW_START_CARD`
    - `submitWorkflowStartCard`
    - `WorkflowStartCardSubmissionRequest`
    - `WorkflowStartCardAction`
    - `CONTINUE`
    - `activeWorkflowStartCardSession`
    - `ClineWorkflowStartCard`
    - `quick-spec.md`
    - `Get Started`
  - Only after that final audit passes should this step be marked `[x]`.
