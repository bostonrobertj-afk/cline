---
title: Workflow Form Back Navigation Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - The action-plan file itself may be edited only to update the current step checkbox.
  - Do not make edits outside the allowed-files list for the current step.
  - If any ambiguity is discovered, or any code/test/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - Use `apply_patch` for all non-generated file edits.
---

# Workflow Form Back Navigation Action Plan

## Goal

Add a narrow v1 `Back` capability to the shared workflow-form system so a staged form can return from `collect_inputs` or `retry_error` to `select_source` without introducing generic page-history state.

This plan implements only the workflow-form capability change itself. It does not add the future brainstorming resolver or modify any workflow document under `/Users/robertboston/Documents/Cline/Workflows/`.

## Locked Decisions

- `Back` is a new `WorkflowFormAction` enum value named exactly `BACK`.
- `Back` is supported only from `collect_inputs` and `retry_error`.
- `Back` returns to `select_source` only.
- `Back` preserves:
  - `confirm`
  - any values whose keys are present on the resolver's live `select_source` page
- `Back` clears all downstream `collect_inputs` / `retry_error` field values so stale inputs do not survive a category or source change.
- If a resolver does not define `select_source`, a `BACK` submission is a no-op re-render of the current session rather than a fallback, cancel, retry, or throw.
- `RETRY` keeps its existing semantics and remains distinct from `BACK`.
- No new `TaskState` fields, no workflow-form page-history stack, and no `src/core/task/index.ts` submission-transport changes are part of this pass.

## Scope Guard

- Do not edit:
  - `/Users/robertboston/Documents/Cline/Workflows/**`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/task/submitWorkflowForm.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`
- Do not add a generic browser-style history stack or a resolver-owned custom back transport.
- Do not broaden `Back` beyond the staged `select_source -> collect_inputs` workflow-form path in this plan.

## Step 1
[x] Add `BACK` to the shared workflow-form transport contract and regenerate the task-proto outputs.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/task.proto`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto/cline/task.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/grpc-js/cline/task.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/nice-grpc/cline/task.ts`

Exact edits:
1. In [task.proto](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/task.proto#L109-L114), update `WorkflowFormAction` so it becomes exactly:

```proto
enum WorkflowFormAction {
  WORKFLOW_FORM_ACTION_UNSPECIFIED = 0;
  SUBMIT = 1;
  CANCEL = 2;
  RETRY = 3;
  BACK = 4;
}
```

2. Do not change `WorkflowFormSubmissionRequest`, `TaskService`, or any other proto message or RPC in this step.
3. Run `npm run protos` exactly once after the proto edit above.
4. Keep the generated enum updates produced by `npm run protos` in:
   - [task.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto/cline/task.ts#L21-L63)
   - [task.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/generated/grpc-js/cline/task.ts#L33-L75)
   - [task.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/generated/nice-grpc/cline/task.ts#L22-L64)
5. In each generated file above, keep the generated `fromJSON(...)` and `toJSON(...)` mappings aligned to the new `BACK = 4` enum member.
6. Do not hand-edit generated files beyond what `npm run protos` produces from the source proto change above.

## Step 2
[x] Extend the shared workflow-form page-definition contract and expose `Back` only on the live staged resolver that actually has a `select_source` page.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

Exact edits:
1. In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L424-L431), add one optional property to `WorkflowFormPageDefinition` immediately after `cancelLabel?: string`:

```ts
	backLabel?: string
```

2. Do not add `backLabel` anywhere else in `ExtensionMessage.ts`.
3. In the `code_review_step_3_diff_source` resolver inside [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L380-L398):
   - leave `confirm` unchanged
   - leave `select_source` unchanged
   - in `pages.collect_inputs`, insert `backLabel: "Back"` immediately after `cancelLabel: "Cancel"`
   - in `pages.retry_error`, insert `backLabel: "Back"` immediately after `cancelLabel: "Cancel"`
4. Do not add `backLabel` to:
   - `placeholder_workflow_start_set_workflow_placeholders`
   - `code_review_step_3_review_input`
   - `write_remediation_story_step_2_review_input`
   - `quick_spec_step_2_build_tech_spec_document`
5. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts), add one new test immediately after `"derives Phase 1 source-selection options from the build_review_diff_output schema"` that:
   - builds the `code_review_step_3_diff_source` definition once with `phase: "collect_inputs"` and `values: { "source.type": { rawValue: "commit" } }`
   - asserts `definition.pages.select_source?.backLabel === undefined`
   - asserts `definition.pages.collect_inputs?.backLabel === "Back"`
   - asserts `definition.pages.retry_error?.backLabel === "Back"`
6. Do not change any resolver ids, tool names, prompts, or fallback messages in this step.

## Step 3
[x] Implement the shared runtime `BACK` behavior so staged forms can return from `collect_inputs` or `retry_error` to `select_source` while clearing downstream inputs.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Exact edits:
1. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L51-L60), insert this local helper immediately after `buildValuesFromSubmissions(...)`:

```ts
function filterWorkflowFormValues(values: WorkflowFormValues, allowedKeys: string[]): WorkflowFormValues {
	return Object.fromEntries(Object.entries(values).filter(([key]) => allowedKeys.includes(key)))
}
```

2. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L133-L309), add one new `BACK` branch immediately after the existing `CANCEL` branch and before the `confirm` branch with this exact behavior:
   - it only runs when:
     - `request.action === WorkflowFormAction.BACK`
     - and `session.phase === "collect_inputs"` or `session.phase === "retry_error"`
   - compute:
     - `const selectSourceSession = { ...session, phase: "select_source" as const, values: nextValues, lastError: undefined }`
     - `const selectSourceFields = resolver.buildDefinition(selectSourceSession).pages.select_source?.fields ?? []`
   - if `resolver.buildDefinition(selectSourceSession).pages.select_source` is missing, return:

```ts
{
	kind: "render_form",
	session,
	payload: this.buildPayload(session),
}
```

   - otherwise build `const allowedKeys = ["confirm", ...selectSourceFields.map((field) => field.key)]`
   - build `const nextSession: WorkflowFormSessionState = { ...session, phase: "select_source", values: filterWorkflowFormValues(nextValues, allowedKeys), lastError: undefined }`
   - return:

```ts
{
	kind: "render_form",
	session: nextSession,
	payload: this.buildPayload(nextSession),
}
```

3. Do not change:
   - the existing `CANCEL` behavior
   - the existing `SUBMIT` behavior
   - the existing `RETRY` behavior
4. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts), add these three tests after the existing confirm-transition tests and before the automatic-status tests:
   - `"returns from collect_inputs to select_source when BACK is submitted"`
     - use the live `runtime` and resolver id `code_review_step_3_diff_source`
     - seed a session with:
       - `phase: "collect_inputs"`
       - `initialPhase: "confirm"`
       - `values.confirm.rawValue = "yes"`
       - `values["source.type"].rawValue = "commit"`
       - `values["source.commit"].rawValue = "abc1234"`
       - `values.context_lines.rawValue = "5"`
     - submit `WorkflowFormSubmissionRequest.create({ sessionId: session.sessionId, action: WorkflowFormAction.BACK, fields: [] })`
     - assert `outcome.kind === "render_form"`
     - assert `outcome.session.phase === "select_source"`
     - assert `outcome.payload.phase === "select_source"`
     - assert `outcome.session.values` deep-equals only:

```ts
{
	confirm: { rawValue: "yes" },
	"source.type": { rawValue: "commit" },
}
```

   - `"returns from retry_error to select_source when BACK is submitted and clears downstream values"`
     - use the live `runtime` and resolver id `code_review_step_3_diff_source`
     - seed a session with:
       - `phase: "retry_error"`
       - `lastError: "required fields are missing input"`
       - `values.confirm.rawValue = "yes"`
       - `values["source.type"].rawValue = "commit_range"`
       - `values["source.base"].rawValue = "main"`
       - `values["source.head"].rawValue = "feature/review-form"`
       - `values.context_lines.rawValue = "7"`
     - submit `WorkflowFormAction.BACK`
     - assert `outcome.kind === "render_form"`
     - assert `outcome.session.phase === "select_source"`
     - assert `outcome.session.lastError === undefined`
     - assert `outcome.session.values` deep-equals only:

```ts
{
	confirm: { rawValue: "yes" },
	"source.type": { rawValue: "commit_range" },
}
```

   - `"re-renders the current phase unchanged when BACK is submitted for a resolver without select_source"`
     - use `createConfirmToCollectRuntime()`
     - seed a session with:
       - `resolverId: "confirm_to_collect_form"`
       - `phase: "collect_inputs"`
       - `initialPhase: "confirm"`
       - `values.confirm.rawValue = "yes"`
       - `values.placeholder_value.rawValue = "example"`
     - submit `WorkflowFormAction.BACK`
     - assert `outcome.kind === "render_form"`
     - assert `outcome.session.phase === "collect_inputs"`
     - assert `outcome.payload.phase === "collect_inputs"`
     - assert `outcome.session.values.placeholder_value?.rawValue === "example"`

## Step 4
[x] Add the Back button to the workflow-form webview and cover both the rendered UX and the structured submission transport.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`

Exact edits:
1. In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L734-L760), add a Back button to the `collect_inputs` action row between the existing `Cancel` and `Submit` buttons:
   - button label: `workflowFormPage?.backLabel || "Back"`
   - click handler:

```ts
void handleWorkflowFormAction(
	WorkflowFormAction.BACK,
	Object.fromEntries(
		concreteWorkflowFormFields.map((field) => [field.key, workflowFormValues[field.key] ?? ""]),
	),
)
```

   - disabled condition: `workflowFormSubmissionPending`
   - className should match the existing secondary buttons in that action row, not the primary submit button
2. In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L787-L823), add the same Back button to the `retry_error` action row between the existing `Cancel` and `Start Over` buttons, with the same label, handler, and disabled condition.
3. Do not render a Back button on:
   - `confirm`
   - `select_source`
   - `success`
   - automatic-status workflow forms
4. In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L97-L127), update the synthetic workflow-form fixture definition so:
   - `pages.collect_inputs.backLabel = "Back"`
   - `pages.retry_error.backLabel = "Back"`
5. In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L450-L474):
   - update `"renders the collect_inputs workflow form with concrete commit inputs and Submit"` so it also asserts `screen.getByRole("button", { name: "Back" })` is present
   - update `"renders the retry_error workflow form with the error banner, Start Over, and Submit"` so it also asserts `screen.getByRole("button", { name: "Back" })` is present
6. In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx), add one new test immediately after the existing collect-inputs button-rendering test:
   - `"submits BACK from collect_inputs through the workflow-form transport"`
   - render the `collect_inputs` fixture
   - change `Commit` to `abc1234`
   - click the `Back` button
   - assert `mockSubmitWorkflowForm` was called once with:

```ts
expect.objectContaining({
	sessionId: "session-1",
	action: WorkflowFormAction.BACK,
	fields: [
		{ key: "source.commit", value: { rawValue: "abc1234" } },
	],
})
```

7. In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx), add one new test immediately after the existing retry-error button-rendering test:
   - `"submits BACK from retry_error through the workflow-form transport"`
   - render the `retry_error` fixture
   - change `Commit` to `def5678`
   - click the `Back` button
   - assert `mockSubmitWorkflowForm` was called once with:

```ts
expect.objectContaining({
	sessionId: "session-1",
	action: WorkflowFormAction.BACK,
	fields: [
		{ key: "source.commit", value: { rawValue: "def5678" } },
	],
})
```

8. In [useMessageHandlers.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx#L100-L128), update the synthetic workflow-form fixture definition so:
   - `pages.collect_inputs.backLabel = "Back"`
   - `pages.retry_error.backLabel = "Back"`
9. In [useMessageHandlers.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx#L334-L419), add one new test immediately after `"routes structured workflow form submissions through submitWorkflowForm"`:
   - `"routes BACK workflow-form submissions through submitWorkflowForm using the current page fields"`
   - create a `collect_inputs` fixture with two fields:
     - `source.commit` text field
     - `context_lines` number field
   - call:

```ts
await submitWorkflowForm(workflowForm, WorkflowFormAction.BACK, {
	"source.commit": "abc1234",
	context_lines: "5",
})
```

   - assert `mockSubmitWorkflowForm` was called with:

```ts
expect.objectContaining({
	sessionId: "session-1",
	action: WorkflowFormAction.BACK,
	fields: [
		{ key: "source.commit", value: { rawValue: "abc1234" } },
		{ key: "context_lines", value: { rawValue: "5" } },
	],
})
```

10. Do not edit [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts) in this step. The existing generic `submitWorkflowForm(...)` helper must remain action-agnostic.

## Step 5
[x] Update the canonical workflow-form docs so the staged-flow contract and capability readme match the delivered Back behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md`

Exact edits:
1. In [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md#L160-L166), update the staged interactive-flow bullet list so it becomes:
   - `initial system prompt/question`
   - `affirmative path into structured input collection`
   - `field selection / field entry`
   - `back navigation to an earlier structured selection page when the resolver exposes it`
   - `submit`
   - `failure with retry`
   - `success indication`
2. In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L73-L85), add one responsibility bullet immediately after `Allow use cases to specialize field discovery, ordering, labels, help text, and staged UX.`:
   - `Allow staged forms with a live \`select_source\` page to expose a Back action that returns to that page without preserving downstream collected-input values.`
3. In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L148-L160), rewrite the numbered core-logic list items 5-10 so they reflect this exact flow:
   - interactive forms submit raw values through the dedicated transport
   - the runtime merges those values into session state
   - if the user submits `BACK` from `collect_inputs` or `retry_error` and the resolver exposes `select_source`, the runtime returns to `select_source` while preserving only `confirm` plus the live `select_source` fields
   - if the current page is incomplete, the runtime re-renders the form with retry state
   - if the submission is valid, the resolver builds the canonical tool input and tool params
   - the task runtime executes the tool through the normal tool path
   - the resolver evaluates the tool result and returns success or failure
4. In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L214-L222), update Example 1 so it still lists:
   - `confirm`
   - `select_source`
   - `collect_inputs`
   and then adds one flat bullet immediately after the stage list:
   - `\`collect_inputs\` and \`retry_error\` may expose \`Back\`, which returns to \`select_source\` and clears downstream concrete-input values.`
5. Do not update any other workflow-ui-surface doc in this step.

## Step 6
[x] Run the exact verification commands for the Back-navigation change and no others.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/task.proto`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto/cline/task.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/grpc-js/cline/task.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/nice-grpc/cline/task.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md`

Prescribed changes:
1. Do not make any edits in this step except changing the checkbox after successful verification.
2. Run these exact commands and no others:

```sh
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts --exit
```

```sh
cd webview-ui && npm run test -- src/components/chat/ChatRow.test.tsx src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx
```
