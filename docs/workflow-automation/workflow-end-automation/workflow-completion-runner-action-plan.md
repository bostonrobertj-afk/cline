---
title: Workflow Completion Runner Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Workflow Completion Runner Action Plan

This plan implements the generic `workflowCompletionRunner` capability described in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/requirements.md#L2)

This pass depends on the standalone base handler plan already being implemented:

- [workflow-completion-handler-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/workflow-completion-handler-action-plan.md)

This pass is limited to the generic runner build only. It does not implement:

- any workflow-specific `workflowCompletionHandler` mapping in production code
- any edit to [code-review-completion.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/code-review-completion.md)
- any prompt exposure or contextual native-tool exposure
- any task-ending, thread-ending, or response-tool-end behavior
- any managed-workflow teardown changes
- any `/Users/robertboston/Documents/Cline/Workflows/**` edits

Locked decisions for this pass:

- The runner file is [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts).
- `workflowCompletionRunner` is a separate helper module invoked by `Task`.
- `workflowCompletionRunner` returns a structured decision to `Task`; `Task` remains the owner of teardown, metadata persistence, and UI refresh.
- The runner result contract is exactly:
  - `{ kind: "no_completion" }`
  - `{ kind: "completed", completedWorkflowId: string, handlerResult: "no_op" | "tool_completed" | "tool_failed", shouldTeardown: boolean }`
- The internal-tool callback is a new public `ToolExecutor` helper named `executeInternalToolSilently(...)`.
- The generic `workflowCompletionHandler` production registry must remain empty in this pass.

## Step 1
[x] Add the standalone `workflowCompletionRunner` module and focused unit coverage for its transition detection and handler orchestration contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflowCompletionRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflowCompletionRunner.test.ts`

Exact edits:
1. Add a new file at [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts) with these exact imports:
   - `type ClineDefaultTool` from `@shared/tools`
   - `parseFocusChainListCounts` from [utils.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/utils.ts#L10)
   - `workflowCompletionHandler` and `type WorkflowCompletionHandlerResult` from [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts)
2. In that new file, export these exact interfaces and types:
   - `WorkflowCompletionRunnerArgs`
   - `WorkflowCompletionRunnerCompletedResult`
   - `WorkflowCompletionRunnerResult`
3. `WorkflowCompletionRunnerArgs` must contain exactly:
   - `previousChecklist: string | null | undefined`
   - `currentChecklist: string | null | undefined`
   - `activePlaceholderWorkflowId: string | undefined`
   - `noticeCountBefore: number`
   - `noticeCountAfter: number`
   - `invokeInternalTool: (toolName: ClineDefaultTool) => Promise<boolean>`
4. `WorkflowCompletionRunnerResult` must be this exact discriminated union:

```ts
export interface WorkflowCompletionRunnerCompletedResult {
	kind: "completed"
	completedWorkflowId: string
	handlerResult: WorkflowCompletionHandlerResult
	shouldTeardown: boolean
}

export type WorkflowCompletionRunnerResult =
	| { kind: "no_completion" }
	| WorkflowCompletionRunnerCompletedResult
```

5. Add two private file-local helpers in [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts):
   - `checklistHasIncompleteStep(checklist: string | null | undefined): boolean`
   - `checklistIsFullyComplete(checklist: string | null | undefined): boolean`
6. Both helpers must:
   - return `false` for `undefined`, `null`, or blank checklist strings
   - call `parseFocusChainListCounts(...)`
   - treat completion as valid only when `totalItems > 0`
7. Add the exported function:

```ts
export async function workflowCompletionRunner(
	args: WorkflowCompletionRunnerArgs,
): Promise<WorkflowCompletionRunnerResult>
```

8. Implement `workflowCompletionRunner(...)` with this exact decision sequence:
   - if `args.activePlaceholderWorkflowId` is falsy, return `{ kind: "no_completion" }`
   - if `checklistIsFullyComplete(args.currentChecklist)` is `false`, return `{ kind: "no_completion" }`
   - compute:
     - `transitionedFromIncompleteToComplete = checklistHasIncompleteStep(args.previousChecklist)`
     - `noticesAdded = args.noticeCountAfter > args.noticeCountBefore`
   - if both `transitionedFromIncompleteToComplete` and `noticesAdded` are `false`, return `{ kind: "no_completion" }`
   - otherwise call `workflowCompletionHandler(...)` with:
     - `completedWorkflowId: args.activePlaceholderWorkflowId`
     - `invokeInternalTool: args.invokeInternalTool`
   - return:

```ts
{
	kind: "completed",
	completedWorkflowId: args.activePlaceholderWorkflowId,
	handlerResult,
	shouldTeardown: handlerResult !== "tool_failed",
}
```

9. Do not import `Task`, `TaskState`, `FocusChainManager`, or [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts) into this module.
10. Add a new file at [workflowCompletionRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionRunner.test.ts).
11. In that test file, import exactly:
   - `assert` from `node:assert/strict`
   - `beforeEach`, `describe`, `it` from `mocha`
   - `sinon` from `sinon`
   - `ClineDefaultTool` from `@shared/tools`
   - `workflowCompletionHandlerRegistry` from [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts)
   - `workflowCompletionRunner` and `type WorkflowCompletionRunnerResult` from [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts)
12. Add a `beforeEach` that deletes every own key from `workflowCompletionHandlerRegistry`.
13. Add these exact test cases:
   - `"returns no_completion when no placeholder workflow is active"`
   - `"returns no_completion when the current checklist is not fully complete"`
   - `"returns completed with no_op and shouldTeardown=true when the checklist transitioned from incomplete to complete and no workflow mapping exists"`
   - `"returns completed with tool_completed and shouldTeardown=true when a configured workflow mapping succeeds"`
   - `"returns completed with tool_failed and shouldTeardown=false when a configured workflow mapping reports failure"`
   - `"returns completed when notices were added even if previousChecklist is absent"`
14. In the configured-workflow tests, seed only the synthetic registry mapping:

```ts
workflowCompletionHandlerRegistry["example-workflow.md"] = {
	toolName: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE,
}
```

15. In every test that awaits the runner result, assign the awaited value to a variable typed as `WorkflowCompletionRunnerResult` before asserting.
16. Do not seed any real production workflow id into the registry in this step.

## Step 2
[x] Add the silent internal-tool execution helper to `ToolExecutor` and focused parity coverage for its success and failure contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/ToolExecutor.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts`

Exact edits:
1. In [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L237-L240), immediately after `executeTool(...)`, add a new public method with this exact signature:

```ts
public async executeInternalToolSilently(toolName: ClineDefaultTool): Promise<boolean>
```

2. Implement that method so it:
   - calls `this.asToolConfig()`
   - constructs this exact synthetic block:

```ts
const block: ToolUse = {
	type: "tool_use",
	name: toolName,
	params: {},
	partial: false,
}
```

   - calls `this.coordinator.execute(config, block)` directly
   - returns `true` only when `this.responseToolRuntime.classifyFailureResult(result)` returns `undefined`
   - returns `false` when `classifyFailureResult(...)` returns a failure
   - catches thrown errors, logs them with `Logger.error(...)`, and returns `false`
3. Do not call `handleCompleteBlock(...)`, `execute(...)`, `pushToolResult(...)`, `applyPreToolTaskProgressUpdate(...)`, `applyPostToolTaskProgressUpdate(...)`, or `saveCheckpoint(...)` from `executeInternalToolSilently(...)`.
4. Do not mutate:
   - `taskState.lastToolName`
   - `taskState.userMessageContent`
   - `taskState.completedResponseToolResultContent`
   - native tool-call tracking sets
5. In [ToolExecutor.nativeToolParity.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts), keep the existing `createExecutor()` helper and add these exact tests:
   - `"returns true when executeInternalToolSilently receives a non-failure tool result"`
   - `"returns false when executeInternalToolSilently receives a formatted tool error result"`
   - `"returns false when executeInternalToolSilently catches a coordinator throw"`
6. In the success test:
   - set `executeStub.resolves("ok")`
   - call `await executor.executeInternalToolSilently(ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE)`
   - assert the returned value is `true`
   - assert `executeStub.calledOnce`
   - assert `executeStub.firstCall.args[1]` deep-equals the exact synthetic `ToolUse` block above
   - assert `taskState.userMessageContent` remains `[]`
7. In the formatted-error test:
   - import `formatResponse` from [responses.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/responses.ts#L206)
   - set `executeStub.resolves(formatResponse.toolError("boom"))`
   - assert `executeInternalToolSilently(...)` returns `false`
8. In the thrown-error test:
   - set `executeStub.rejects(new Error("boom"))`
   - assert `executeInternalToolSilently(...)` returns `false`
9. Do not add any workflow-specific registry mapping in production code during this step.

## Step 3
[x] Add placeholder-workflow checklist-clearing support to `FocusChainManager` and verify the new clear path in the placeholder suite.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`

Exact edits:
1. In [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L575-L585), immediately after `clearManagedWorkflowChecklistProjection(...)`, add:

```ts
public async clearPlaceholderWorkflowChecklistProjection(): Promise<void> {
	this.taskState.currentFocusChainChecklist = null
	this.taskState.todoListWasUpdatedByUser = false
	this.taskState.apiRequestsSinceLastTodoUpdate = 0

	try {
		const todoFilePath = await this.resolveFocusChainFilePath()
		await fs.unlink(todoFilePath)
	} catch {
		// Missing focus chain file is fine when clearing projection state.
	}

	await this.postStateToWebview()
}
```

2. Do not change `clearManagedWorkflowChecklistProjection(...)`.
3. In [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts), add one new test:
   - `"clears the placeholder workflow checklist projection, resets counters, deletes the focus-chain file, and refreshes the webview"`
4. In that test:
   - create a temp directory and local placeholder workflow source
   - create a real focus-chain file path with `getFocusChainFilePath(...)`
   - write a checklist file to disk
   - set:
     - `taskState.currentFocusChainChecklist`
     - `taskState.todoListWasUpdatedByUser = true`
     - `taskState.apiRequestsSinceLastTodoUpdate = 3`
   - call `await manager.clearPlaceholderWorkflowChecklistProjection()`
   - assert:
     - `taskState.currentFocusChainChecklist === null`
     - `taskState.todoListWasUpdatedByUser === false`
     - `taskState.apiRequestsSinceLastTodoUpdate === 0`
     - `fs.access(todoFilePath)` rejects
     - the `postStateToWebview` stub in `createDependencies(...)` was called once

## Step 4
[x] Integrate the task-owned runner into the deterministic placeholder-progression seams and keep all teardown, persistence, and UI ownership in `Task`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

Exact edits:
1. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1036-L1064), change the `ToolExecutor` callback wiring so the `updateFCListFromToolResponse` callback becomes:
   - `this.updatePlaceholderWorkflowProgressAndMaybeRunCompletion.bind(this)`
   - do not pass `this.FocusChainManager?.updateFCListFromToolResponse.bind(this.FocusChainManager)` directly anymore
2. Add a new private helper in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts) named:

```ts
private async updatePlaceholderWorkflowProgressAndMaybeRunCompletion(
	taskProgress: string | undefined,
	toolContext?: DeterministicPlaceholderToolContext,
): Promise<FocusChainChecklistUpdateResult>
```

3. Implement `updatePlaceholderWorkflowProgressAndMaybeRunCompletion(...)` with this exact sequence:
   - capture:
     - `const previousChecklist = this.taskState.currentFocusChainChecklist`
     - `const noticeCountBefore = this.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.length`
   - if `this.FocusChainManager` is absent, return `{ accepted: true }`
   - call `const result = await this.FocusChainManager.updateFCListFromToolResponse(taskProgress, toolContext)`
   - if `result.accepted !== true`, return `result`
   - call `await this.maybeFinalizeCompletedPlaceholderWorkflow(previousChecklist, noticeCountBefore)`
   - return `result`
4. Add a new private helper named:

```ts
private async maybeFinalizeCompletedPlaceholderWorkflow(
	previousChecklist: string | null | undefined,
	noticeCountBefore: number,
): Promise<void>
```

5. Implement `maybeFinalizeCompletedPlaceholderWorkflow(...)` so it:
   - returns immediately if `this.toolExecutor` is falsy
   - calls `workflowCompletionRunner(...)` with:
     - `previousChecklist`
     - `currentChecklist: this.taskState.currentFocusChainChecklist`
     - `activePlaceholderWorkflowId: this.taskState.activePlaceholderWorkflowId`
     - `noticeCountBefore`
     - `noticeCountAfter: this.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.length`
     - `invokeInternalTool: this.toolExecutor.executeInternalToolSilently.bind(this.toolExecutor)`
   - returns immediately when the runner result has `kind === "no_completion"`
   - returns immediately when the runner result has `shouldTeardown === false`
   - otherwise calls `await this.teardownCompletedPlaceholderWorkflow()`
6. Add a new private helper named:

```ts
private async teardownCompletedPlaceholderWorkflow(): Promise<void>
```

7. Implement `teardownCompletedPlaceholderWorkflow()` so it clears exactly the placeholder-workflow runtime fields listed in [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/requirements.md#L10-L28):
   - `activePlaceholderWorkflowId = undefined`
   - `activePlaceholderWorkflowSource = undefined`
   - `activePlaceholderWorkflowValues = undefined`
   - `activePlaceholderWorkflowStableValues = undefined`
   - `activePlaceholderWorkflowDeterministicState = undefined`
   - `activePlaceholderWorkflowTaskWriteProofPaths = []`
   - `activeWorkflowFormSession = undefined`
   - `suppressedWorkflowFormResolverIds = []`
   - `pendingAutoCompletedPlaceholderWorkflowStepNotices = []`
   - `activeWorkflowJustStarted = false`
   - `this.pendingWorkflowFormOutcome = undefined`
8. After clearing those fields, `teardownCompletedPlaceholderWorkflow()` must call, in this exact order:
   - `await this.clearPlaceholderWorkflowChecklistProjection()`
   - `await this.persistClearedPlaceholderWorkflowMetadata()`
9. Add a new private helper named:

```ts
private async persistClearedPlaceholderWorkflowMetadata(): Promise<void>
```

10. Implement `persistClearedPlaceholderWorkflowMetadata()` by copying the placeholder-workflow metadata write contract from [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1978-L1996), but only for the workflow-related fields needed by [restoreBmadStateFromMetadata()](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2123-L2143):
    - `activeWorkflowId`
    - `activePlaceholderWorkflowId`
    - `activePlaceholderWorkflowSource`
    - `activePlaceholderWorkflowStableValues`
    - `activePlaceholderWorkflowValues`
    - `activePlaceholderWorkflowDeterministicState`
    - `activePlaceholderWorkflowTaskWriteProofPaths`
    - `activeWorkflowFormSession`
    - `suppressedWorkflowFormResolverIds`
    - `pendingAutoCompletedPlaceholderWorkflowStepNotices`
    - `managedWorkflowRun`
11. Keep the existing `try/catch` non-fatal persistence behavior used in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1978-L1998).
12. Add a new private helper named:

```ts
private async clearPlaceholderWorkflowChecklistProjection(): Promise<void>
```

13. Implement it exactly like the existing managed-workflow wrapper at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2202-L2211), except it must delegate to:
   - `this.FocusChainManager.clearPlaceholderWorkflowChecklistProjection()`
   - and the fallback branch must clear:
     - `currentFocusChainChecklist = null`
     - `todoListWasUpdatedByUser = false`
     - `apiRequestsSinceLastTodoUpdate = 0`
     - followed by `await this.postStateToWebview()`
14. In [syncDeterministicProgressionAfterWorkflowFormTool(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1439-L1474):
   - keep the existing checklist-building prelude at lines 1442-1453
   - replace the `this.FocusChainManager.updateFCListFromToolResponse(checklist, toolContext)` call with:
     - `await this.updatePlaceholderWorkflowProgressAndMaybeRunCompletion(checklist, toolContext)`
   - in the fallback branch where `applyDeterministicPlaceholderProgression(...)` is called directly, add:
     - `const noticeCountBefore = this.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.length` before calling progression
     - after the existing checklist/UI updates, call:
       - `await this.maybeFinalizeCompletedPlaceholderWorkflow(checklist, noticeCountBefore)`
15. Do not clear:
   - `activeAgentId`
   - `activeAgentSkillName`
   - `activeAgentInvokedSlashCommand`
   - `activeWorkflowId`
   - `managedWorkflowRun`
16. Do not add any workflow-specific mapping logic to `Task` in this step.

## Step 5
[x] Add focused integration coverage for the task-owned teardown path and the failure-preservation rule.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits:
1. In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), add new `Reflect.get(...)` bindings for:
   - `updatePlaceholderWorkflowProgressAndMaybeRunCompletion`
   - `clearPlaceholderWorkflowChecklistProjection`
2. Update `createFakeTask(...)` so it also provides:
   - `postStateToWebview: sinon.stub().resolves()`
3. Add one new test named:
   - `"tears down placeholder workflow state and persists cleared metadata when workflow completion finishes with no configured automation"`
4. In that test:
   - use `sandbox.stub(disk, "getTaskMetadata").resolves({} as never)`
   - stub `saveTaskMetadata`
   - build a fake task with `Object.setPrototypeOf(fakeTask, Task.prototype)`
   - assign:
     - `fakeTask.FocusChainManager = { updateFCListFromToolResponse: ..., clearPlaceholderWorkflowChecklistProjection: sinon.stub().resolves() }`
     - `fakeTask.toolExecutor = { executeInternalToolSilently: sinon.stub().resolves(true) }`
   - seed `taskState` with non-empty values for every placeholder-workflow field that the teardown must clear, plus:
     - `currentFocusChainChecklist` containing an incomplete checklist before the update
     - `pendingWorkflowFormOutcome` set to a non-undefined synthetic object
   - make the `updateFCListFromToolResponse` stub mutate `taskState.currentFocusChainChecklist` to a fully complete checklist and append one notice to `pendingAutoCompletedPlaceholderWorkflowStepNotices`
   - call `await updatePlaceholderWorkflowProgressAndMaybeRunCompletion.call(fakeTask, "__COMPLETE_NEXT_STEP__")`
   - assert:
     - all placeholder-workflow fields are cleared
     - `pendingWorkflowFormOutcome` is `undefined`
     - `fakeTask.toolExecutor.executeInternalToolSilently` was not called
     - `fakeTask.FocusChainManager.clearPlaceholderWorkflowChecklistProjection` was called once
     - the last saved metadata contains cleared placeholder-workflow fields and cleared workflow-form fields
5. Add a second new test named:
   - `"preserves placeholder workflow state when workflow completion automation reports tool_failed"`
6. In that test:
   - import `workflowCompletionHandlerRegistry` from [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts)
   - seed only the synthetic mapping:

```ts
workflowCompletionHandlerRegistry["example-workflow.md"] = {
	toolName: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE,
}
```

   - set `taskState.activePlaceholderWorkflowId = "example-workflow.md"`
   - use the same fake-task/prototype pattern as the prior test
   - make `fakeTask.toolExecutor.executeInternalToolSilently` resolve `false`
   - make the `updateFCListFromToolResponse` stub mutate the checklist to fully complete and append one notice
   - call `await updatePlaceholderWorkflowProgressAndMaybeRunCompletion.call(fakeTask, "__COMPLETE_NEXT_STEP__")`
   - assert:
     - the placeholder-workflow fields remain unchanged
     - `fakeTask.FocusChainManager.clearPlaceholderWorkflowChecklistProjection` was not called
     - `saveTaskMetadata` was not called
7. In both new tests, clear the synthetic handler registry entry in a `finally` block or sandbox cleanup path so the base handler remains unconfigured outside the test.

## Step 6
[x] Run the focused verification for the generic workflow-completion runner build.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-end-automation/workflow-completion-runner-action-plan.md`

Exact edits:
1. Run exactly:

```bash
npm run test:unit -- src/core/task/__tests__/workflowCompletionRunner.test.ts src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts --exit
```

2. Then run exactly:

```bash
npx tsc --noEmit
```

3. If both commands pass, update this step to `[x]`.
4. Do not modify any source file in this step unless the commands fail and the failure is caused by a mismatch with the explicit edits prescribed in Steps 1-5. If that happens, stop and ask for input instead of making unplanned changes.
