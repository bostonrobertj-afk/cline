---
title: Workflow UI Surface Phase 2 Form Success Semantics Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - The action-plan file itself may be edited only to update the current step checkbox.
  - If any ambiguity is discovered, or any code/test/doc/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Workflow UI Surface Phase 2 Form Success Semantics Action Plan

This plan is a standalone follow-up to the Phase 2 implementation in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-2/requirements.md)
- [action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-2/action-plan.md)

The goal of this pass is to correct workflow-form success semantics so the workflow-form capability reports success when its own tool action succeeds, while deterministic workflow progression remains the sole authority for workflow-step completion and advancement.

Locked decisions for this pass:

- Keep this fix inside the workflow-form/task runtime layer. Do not broaden the public `ToolExecutor` contract in [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L47).
- Workflow-form success must no longer be inferred by re-running the workflow-form interception gate in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1521).
- Deterministic progression must still run immediately after every workflow-form-owned tool invocation.
- Resolver definitions must become the authority for interpreting whether their tool result represents workflow-form success or failure.
- The slash-command Step 1 `set_workflow_placeholders` form must require at least one non-empty submitted placeholder value.
- The minimum-one-input rule must be enforced both in the runtime and in the webview submit-button UX.
- Preserve the delivered `code-review.md` Step 3 behavior except for the intentional success-semantics change above.
- Do not modify any workflow file under `/Users/robertboston/Documents/Cline/Workflows/`.

## Step 1
[x] Extend the shared workflow-form contracts so resolver-owned success evaluation and start-form minimum-input metadata can be expressed without changing the tool executor.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/phase-2/form-success-semantics-action-plan.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/types.ts`

Exact edits:
1. In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L405), add these two optional properties to `ClineWorkflowForm` immediately after `fields?`:
   - `minimumFilledFieldCount?: number`
   - `minimumFilledFieldErrorMessage?: string`
2. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L21), insert this new interface immediately after `WorkflowFormToolExecutionRequest`:

```ts
export interface WorkflowFormToolExecutionEvaluation {
	succeeded: boolean
	errorMessage?: string
}
```

3. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L31), add these optional properties to `WorkflowFormSessionContext` immediately after `placeholderFieldKeys`:
   - `minimumFilledFieldCount?: number`
   - `minimumFilledFieldErrorMessage?: string`
4. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L54), add this required method to `WorkflowFormResolverDefinition` immediately after `buildToolExecutionRequest(...)`:

```ts
evaluateToolExecutionResult(
	session: WorkflowFormSessionState,
	args: { toolResultText?: string },
): WorkflowFormToolExecutionEvaluation
```

5. Do not change `WorkflowFormToolExecutionRequest`, `WorkflowFormRuntimeOutcome`, or the `ToolExecutor` public types in this step.

## Step 2
[x] Teach the resolver registry to emit the new start-form validation metadata and to interpret tool results per resolver instead of relying on interception-state rechecks.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/phase-2/form-success-semantics-action-plan.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

Exact edits:
1. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L1), add `formatResponse` from `@/core/prompts/responses` to the imports.
2. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L199), update `buildWorkflowStartFormSessionContext(...)` so the returned context also includes:
   - `minimumFilledFieldCount: 1`
   - `minimumFilledFieldErrorMessage: "Provide at least one workflow start input before submitting."`
3. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L229), extend `buildBasePayload(...)` so its `overrides` type and returned object both support:
   - `minimumFilledFieldCount`
   - `minimumFilledFieldErrorMessage`
4. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L227), insert these exact helper functions immediately before `buildBasePayload(...)`:

```ts
function parseWorkflowFormJsonToolResult(text?: string): Record<string, unknown> | undefined {
	if (!text) {
		return undefined
	}

	try {
		const parsed = JSON.parse(text)
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : undefined
	} catch {
		return undefined
	}
}

function isWorkflowFormFailureText(text?: string): boolean {
	const trimmed = text?.trim()
	if (!trimmed) {
		return true
	}

	return (
		trimmed === formatResponse.toolDenied() ||
		trimmed.startsWith("The tool execution failed with the following error:") ||
		trimmed.startsWith("Error:")
	)
}
```

5. In the `code_review_step_3_diff_source` resolver inside [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L270), add `evaluateToolExecutionResult(...)` with these exact rules:
   - parse `args.toolResultText` with `parseWorkflowFormJsonToolResult(...)`
   - if the parsed object has `persisted === true` and `diff_available === true`, return `{ succeeded: true }`
   - else if the parsed object has a string `reason`, return `{ succeeded: false, errorMessage: parsed.reason }`
   - else if `isWorkflowFormFailureText(args.toolResultText)` is true, return `{ succeeded: false, errorMessage: args.toolResultText?.trim() ?? this.buildToolExecutionFailureFallbackMessage(session) }`
   - else return `{ succeeded: false, errorMessage: this.buildToolExecutionFailureFallbackMessage(session) }`
6. In the `placeholder_workflow_start_set_workflow_placeholders` resolver inside [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L390):
   - update `buildCollectInputsPayload(...)` and `buildRetryPayload(...)` so both pass `minimumFilledFieldCount: context.minimumFilledFieldCount` and `minimumFilledFieldErrorMessage: context.minimumFilledFieldErrorMessage` into `buildBasePayload(...)`
   - add `evaluateToolExecutionResult(...)` with these exact rules:
     - if `isWorkflowFormFailureText(args.toolResultText)` is true, return `{ succeeded: false, errorMessage: args.toolResultText?.trim() ?? this.buildToolExecutionFailureFallbackMessage(session) }`
     - otherwise return `{ succeeded: true }`
   - do not inspect checklist state or deterministic progression state in this method
7. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L70), update the existing workflow-start context test so it also asserts:
   - `context.minimumFilledFieldCount === 1`
   - `context.minimumFilledFieldErrorMessage === "Provide at least one workflow start input before submitting."`
8. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L88), extend the workflow-start resolver test coverage with these two additional tests:
   - `"treats stored workflow-start placeholder results as success"` by calling `evaluateToolExecutionResult(...)` with `toolResultText: "Stored 1 workflow placeholder: review_input."` and asserting `succeeded === true`
   - `"treats the empty-values set_workflow_placeholders error as failure"` by calling `evaluateToolExecutionResult(...)` with `toolResultText: "Error: Missing required parameter 'values'. Provide at least one placeholder value to store."` and asserting `succeeded === false`
9. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L34), add these two tests for the Phase 1 resolver:
   - `"treats persisted diff-output tool results as success"` using `toolResultText: JSON.stringify({ persisted: true, diff_available: true, artifact_path: "/tmp/review-input.diff" })`
   - `"treats non-persisted diff-output tool results as failure"` using `toolResultText: JSON.stringify({ persisted: false, diff_available: false, reason: "No Git-backed diff content was available for the requested source and scope." })` and asserting the returned `errorMessage` matches that `reason`

## Step 3
[x] Add runtime-side enforcement of the minimum-one-input rule so empty start-form submissions never invoke `set_workflow_placeholders`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/phase-2/form-success-semantics-action-plan.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Exact edits:
1. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L1-L30), add these two local helpers above `buildValuesFromSubmissions(...)`:

```ts
function hasWorkflowFormValue(value: WorkflowFormFieldValuePayload | undefined): boolean {
	if (!value) {
		return false
	}

	if (typeof value.stringValue === "string" && value.stringValue.trim().length > 0) {
		return true
	}

	if (typeof value.integerValue === "number") {
		return true
	}

	return Array.isArray(value.stringArrayValue) && value.stringArrayValue.some((entry) => entry.trim().length > 0)
}

function countFilledWorkflowFormValues(values: WorkflowFormValues, keys: string[]): number {
	return keys.filter((key) => hasWorkflowFormValue(values[key])).length
}
```

2. Update the imports in [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L1) so `WorkflowFormFieldValuePayload` is imported from `@shared/ExtensionMessage`.
3. In the `collect_inputs` / `retry_error` submit branch at [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L177), insert this validation before the `nextSession` used for `invoke_tool`:
   - derive `const minimumFilledFieldCount = session.context?.minimumFilledFieldCount ?? 0`
   - derive `const candidateKeys = session.context?.placeholderFieldKeys ?? []`
   - if `minimumFilledFieldCount > 0` and `countFilledWorkflowFormValues(nextValues, candidateKeys) < minimumFilledFieldCount`, build `nextSession` with:
     - `phase: "retry_error"`
     - `values: nextValues`
     - `lastError: session.context?.minimumFilledFieldErrorMessage ?? "Provide at least one workflow start input before submitting."`
   - return `{ kind: "render_form", session: nextSession, payload: resolver.buildRetryPayload(nextSession) }`
   - do not invoke the tool in that case
4. Leave the rest of the confirm/select-source Phase 1 flow unchanged.
5. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L62), update the custom start-session context object so it includes:
   - `minimumFilledFieldCount: 1`
   - `minimumFilledFieldErrorMessage: "Provide at least one workflow start input before submitting."`
6. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L238), add this new test:
   - `"renders retry_error instead of invoking the tool when a collect_inputs start session is submitted without any values"` using the existing `generic_form` resolver, `initialPhase: "collect_inputs"`, `placeholderFieldKeys: ["review_input", "spec_file"]`, and an empty submit; assert `outcome.kind === "render_form"`, `outcome.session.phase === "retry_error"`, and `outcome.session.lastError === "Provide at least one workflow start input before submitting."`
7. In the same file, add this additional test immediately after it:
   - `"still invokes the tool when a collect_inputs start session includes one non-empty placeholder value"` using the same resolver/session shape but with `review_input` populated; assert `outcome.kind === "invoke_tool"` and the emitted `toolInput` remains `{ values: { review_input: "docs/review.md" } }`

## Step 4
[x] Change task-side workflow-form success handling so success is resolver-evaluated tool success, while deterministic progression still runs after every workflow-form tool invocation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/phase-2/form-success-semantics-action-plan.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits:
1. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1481), replace the current `getWorkflowFormToolErrorMessage(...)` implementation with these two helpers in this exact order:
   - `private getWorkflowFormToolResultText(previousUserMessageContentLength: number): string | undefined`
   - `private getWorkflowFormToolErrorMessage(session: WorkflowFormSessionState, previousUserMessageContentLength: number): string`
2. Implement `getWorkflowFormToolResultText(...)` by moving the current appended-content extraction logic out of `getWorkflowFormToolErrorMessage(...)` unchanged:
   - inspect `this.taskState.userMessageContent.slice(previousUserMessageContentLength)`
   - return the first appended non-empty `text` or string `tool_result` content
   - return `undefined` if none is present
3. Implement the replacement `getWorkflowFormToolErrorMessage(...)` as:
   - `const textContent = this.getWorkflowFormToolResultText(previousUserMessageContentLength)`
   - return `textContent ?? getWorkflowFormResolverDefinition(session.resolverId).buildToolExecutionFailureFallbackMessage(session)`
4. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1504), update `executeWorkflowFormToolAndSync(...)` with these exact changes:
   - keep the `toolExecutor.executeTool(...)` call exactly where it is
   - keep the `syncDeterministicProgressionAfterWorkflowFormTool(...)` call exactly where it is
   - delete the `shouldInterceptWorkflowFormBeforeApiTurn(...)` call entirely from this method
   - after deterministic sync, derive:

```ts
const resolver = getWorkflowFormResolverDefinition(outcome.session.resolverId)
const toolResultText = this.getWorkflowFormToolResultText(previousUserMessageContentLength)
const evaluation = resolver.evaluateToolExecutionResult(outcome.session, { toolResultText })
```

   - return:

```ts
return {
	succeeded: evaluation.succeeded,
	errorMessage:
		evaluation.errorMessage ??
		this.getWorkflowFormToolErrorMessage(outcome.session, previousUserMessageContentLength),
}
```

5. Do not change the success branch in `maybeResolveWorkflowFormBeforeApiTurn(...)` at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1601); it should continue clearing the session when `toolExecution.succeeded` is true.
6. In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L780), add these three direct `executeWorkflowFormToolAndSync(...)` tests using `Task.prototype` with a fake task object:
   - `"treats workflow-start placeholder storage as workflow-form success even when Step 1 remains active"`:
     - use resolver id `placeholder_workflow_start_set_workflow_placeholders`
     - stub `toolExecutor.executeTool(...)` so it appends a text item `"Stored 1 workflow placeholder: review_input."` to `taskState.userMessageContent`
     - stub `syncDeterministicProgressionAfterWorkflowFormTool(...)` to leave the checklist on Step 1
     - assert the method returns `{ succeeded: true, ... }`
   - `"keeps the workflow-start form in failure state when set_workflow_placeholders returns the empty-values error"`:
     - append `"Error: Missing required parameter 'values'. Provide at least one placeholder value to store."`
     - assert `succeeded === false` and `errorMessage` matches that exact string
   - `"treats a non-persisted Phase 1 diff result as workflow-form failure"`:
     - use resolver id `code_review_step_3_diff_source`
     - append `JSON.stringify({ persisted: false, diff_available: false, reason: "No Git-backed diff content was available for the requested source and scope." })`
     - assert `succeeded === false` and `errorMessage === "No Git-backed diff content was available for the requested source and scope."`

## Step 5
[x] Surface the minimum-one-input rule to the webview so empty slash-command start forms are blocked before the submission round-trip.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/phase-2/form-success-semantics-action-plan.md`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`

Exact edits:
1. In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L320), insert these exact local helpers immediately before `const isWorkflowFormSubmitDisabled = ...`:

```ts
const hasWorkflowFormFieldValue = (value: string | undefined) => {
	if (typeof value !== "string") {
		return false
	}

	return value.trim().length > 0
}

const filledConcreteWorkflowFormFieldCount = concreteWorkflowFormFields.filter((field) =>
	hasWorkflowFormFieldValue(workflowFormValues[field.key]),
).length
```

2. Replace the existing `collect_inputs` / `retry_error` branch inside `isWorkflowFormSubmitDisabled` at [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L323) with this exact logic:
   - keep the existing required-field validation
   - additionally disable submit when:
     - `typeof workflowForm.minimumFilledFieldCount === "number"`
     - and `filledConcreteWorkflowFormFieldCount < workflowForm.minimumFilledFieldCount`
3. Do not change the `select_source` behavior.
4. Do not change `workflowFormValues` state shape in [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L295); it must remain `Record<string, string>`.
5. In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L40), change `createWorkflowFormMessage(...)` so it accepts a second optional parameter:

```ts
overrides?: Partial<Record<string, unknown>>
```

and then spread `...overrides` into the serialized workflow-form object immediately before returning the message.
6. In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L331), add this new test:
   - `"keeps Submit disabled for a workflow-start collect_inputs form until one optional placeholder field is populated"`
   - construct the message with:
     - `phase: "collect_inputs"`
     - `resolverId: "placeholder_workflow_start_set_workflow_placeholders"`
     - `toolName: "set_workflow_placeholders"`
     - three visible text fields for `review_input`, `diff_output`, and `spec_file`, all with `required: false`
     - `minimumFilledFieldCount: 1`
     - `minimumFilledFieldErrorMessage: "Provide at least one workflow start input before submitting."`
   - assert `Submit` starts disabled
   - populate `Review Input File`
   - assert `Submit` becomes enabled

## Step 6
[x] Run the targeted backend and webview regression suites for this follow-up change.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/phase-2/form-success-semantics-action-plan.md`

Exact validation commands:
1. From `/Users/robertboston/Documents/Cline Extension/cline`, run:

```bash
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts --exit
```

2. From `/Users/robertboston/Documents/Cline Extension/cline/webview-ui`, run:

```bash
npm run test -- src/components/chat/ChatRow.test.tsx
```

3. If either command fails, stop and report the exact failing test output before making any unplanned changes.
