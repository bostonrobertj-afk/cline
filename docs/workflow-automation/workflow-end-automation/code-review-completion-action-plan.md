---
title: Code Review Completion Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Checkbox updates to this action-plan file are allowed in every step.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Code Review Completion Action Plan

This plan implements the first workflow-specific `workflowCompletionHandler` mapping described in:

- [code-review-completion.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/code-review-completion.md#L18-L107)

It builds on the already-deployed generic infrastructure described in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/requirements.md#L2-L73)
- [workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-automation-readme.md#L39-L63)

This pass is limited to configuring the `code-review.md` workflow-end behavior inside `workflowCompletionHandler`. It does not implement:

- any new generic runner behavior
- any new internal tool
- any prompt exposure changes
- any contextual native-tool exposure
- any `/Users/robertboston/Documents/Cline/Workflows/**` edits

Locked decisions for this pass:

- The workflow id is exactly `code-review.md`.
- The mapped internal runtime tool id is exactly `code_review_spec_update`.
- The production mapping lives in [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts).
- The generic handler registry must no longer ship empty after this pass.
- `workflowCompletionHandler` must continue to rely on the mapped tool for placeholder resolution, approval behavior, file mutation, and write proof.
- The workflow-end failure preservation rule remains unchanged: `tool_failed` means `workflowCompletionRunner` leaves placeholder-workflow state intact.

## Step 1
[x] Configure the live `code-review.md` workflow-end mapping in `workflowCompletionHandler.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflowCompletionHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-end-automation/code-review-completion-action-plan.md`

Exact edits:
1. In [workflowCompletionHandler.ts:1-9](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts#L1-L9), change the import on line 1 from:
   - `import type { ClineDefaultTool } from "@shared/tools"`
   to:
   - `import { ClineDefaultTool } from "@shared/tools"`
2. In [workflowCompletionHandler.ts:9](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts#L9), replace the empty registry object with this exact object literal:

```ts
export const workflowCompletionHandlerRegistry: Record<string, WorkflowCompletionHandlerRegistryEntry> = {
	"code-review.md": {
		toolName: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE,
	},
}
```

3. Do not change:
   - `WorkflowCompletionHandlerResult`
   - `WorkflowCompletionHandlerRegistryEntry`
   - `WorkflowCompletionHandlerArgs`
   - the `workflowCompletionHandler(...)` function body
4. Do not add any other workflow mapping in this step.

## Step 2
[x] Update the handler, runner, and persistence tests so they preserve the production registry mapping and verify the live `code-review.md` behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflowCompletionRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-end-automation/code-review-completion-action-plan.md`

Exact edits for [workflowCompletionHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts):
1. Immediately after the imports at [workflowCompletionHandler.test.ts:6-10](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts#L6-L10), add:

```ts
const originalRegistryEntries = { ...workflowCompletionHandlerRegistry }
```

2. Replace the current `beforeEach` at [workflowCompletionHandler.test.ts:13-17](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts#L13-L17) with:

```ts
	beforeEach(() => {
		for (const key of Object.keys(workflowCompletionHandlerRegistry)) {
			delete workflowCompletionHandlerRegistry[key]
		}
		Object.assign(workflowCompletionHandlerRegistry, originalRegistryEntries)
	})
```

3. Replace the test at [workflowCompletionHandler.test.ts:19-21](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts#L19-L21) with a test named exactly:
   - `"ships with code-review.md mapped to code_review_spec_update in production"`
4. That replacement test must assert exactly:

```ts
assert.deepEqual(workflowCompletionHandlerRegistry, {
	"code-review.md": {
		toolName: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE,
	},
})
```

5. Replace the current success test at [workflowCompletionHandler.test.ts:35-48](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts#L35-L48) so it:
   - does not seed any registry entry
   - uses `completedWorkflowId: "code-review.md"`
   - keeps the existing `invokeInternalTool` stub resolving `true`
   - asserts the result is `"tool_completed"`
   - asserts `invokeInternalTool` was called once with `ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE`
6. Replace the current failure test at [workflowCompletionHandler.test.ts:50-62](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts#L50-L62) so it:
   - does not seed any registry entry
   - uses `completedWorkflowId: "code-review.md"`
   - keeps the existing `invokeInternalTool` stub resolving `false`
   - asserts the result is `"tool_failed"`
7. Leave the no-op test for `example-workflow.md` unchanged.
8. Leave the thrown-error test with its synthetic `example-workflow.md` registry seed unchanged.

Exact edits for [workflowCompletionRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionRunner.test.ts):
9. Immediately after the imports at [workflowCompletionRunner.test.ts:6-7](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionRunner.test.ts#L6-L7), add:

```ts
const originalRegistryEntries = { ...workflowCompletionHandlerRegistry }
```

10. Replace the current `beforeEach` at [workflowCompletionRunner.test.ts:10-14](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionRunner.test.ts#L10-L14) with:

```ts
	beforeEach(() => {
		for (const key of Object.keys(workflowCompletionHandlerRegistry)) {
			delete workflowCompletionHandlerRegistry[key]
		}
		Object.assign(workflowCompletionHandlerRegistry, originalRegistryEntries)
	})
```

11. Replace the current success test at [workflowCompletionRunner.test.ts:69-91](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionRunner.test.ts#L69-L91) so it:
   - does not seed any registry entry
   - uses `activePlaceholderWorkflowId: "code-review.md"`
   - keeps the existing `invokeInternalTool` stub resolving `true`
   - asserts the completed result uses:
     - `completedWorkflowId: "code-review.md"`
     - `handlerResult: "tool_completed"`
     - `shouldTeardown: true`
   - asserts `invokeInternalTool` was called once with `ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE`
12. Replace the current tool-failed test at [workflowCompletionRunner.test.ts:93-115](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionRunner.test.ts#L93-L115) so it:
   - does not seed any registry entry
   - uses `activePlaceholderWorkflowId: "code-review.md"`
   - keeps the existing `invokeInternalTool` stub resolving `false`
   - asserts the completed result uses:
     - `completedWorkflowId: "code-review.md"`
     - `handlerResult: "tool_failed"`
     - `shouldTeardown: false`
   - asserts `invokeInternalTool` was called once with `ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE`
13. Leave the `example-workflow.md` no-op tests unchanged.

Exact edits for [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts):
14. In the test named `"preserves placeholder workflow state when workflow completion automation reports tool_failed"` at [placeholderWorkflowPersistence.test.ts:644-778](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L644-L778):
   - delete the synthetic registry seeding block at lines 646-648:
     - `workflowCompletionHandlerRegistry["example-workflow.md"] = { ... }`
   - change [placeholderWorkflowPersistence.test.ts:687](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L687) from:
     - `"example-workflow.md"`
     to:
     - `"code-review.md"`
   - change [placeholderWorkflowPersistence.test.ts:690](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L690) from:
     - `"example-workflow.md"`
     to:
     - `"code-review.md"`
   - change the expectation at [placeholderWorkflowPersistence.test.ts:727](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L727) from:
     - `"example-workflow.md"`
     to:
     - `"code-review.md"`
   - change the expectation at [placeholderWorkflowPersistence.test.ts:730](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L730) from:
     - `"example-workflow.md"`
     to:
     - `"code-review.md"`
   - delete the cleanup line at [placeholderWorkflowPersistence.test.ts:776](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L776):
     - `delete workflowCompletionHandlerRegistry["example-workflow.md"]`
15. Do not change the rest of that test’s assertions. They already assert the correct `code-review.md` failure-preservation behavior.

## Step 3
[x] Update the workflow automation readme so it reflects the newly deployed `code-review.md` production mapping.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-automation-readme.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-end-automation/code-review-completion-action-plan.md`

Exact edits:
1. In [workflow-automation-readme.md:39-63](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-automation-readme.md#L39-L63), replace the entire `## Current Deployment Status` section body with this exact content:

```md
## Current Deployment Status

The generic infrastructure is deployed, and the first workflow-specific production mapping is now configured in:

- [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts)

The live mapping is:

- `code-review.md` -> `code_review_spec_update`

That means:

- workflow completion detection and teardown are live
- optional workflow-end automation dispatch infrastructure is live
- the `code-review.md` placeholder workflow now runs `code_review_spec_update` at workflow completion through `workflowCompletionHandler`
- workflows without a configured registry entry still resolve to `no_op`

The workflow-specific requirements for this first mapping remain documented in:

- [code-review-completion.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/code-review-completion.md)
```

2. Do not change any other section in the readme.

## Step 4
[x] Run the focused verification for the code-review workflow-completion configuration pass.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-end-automation/code-review-completion-action-plan.md`

Exact edits:
1. Run exactly:

```bash
npm run test:unit -- src/core/task/__tests__/workflowCompletionHandler.test.ts src/core/task/__tests__/workflowCompletionRunner.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts --exit
```

2. Then run exactly:

```bash
npx tsc --noEmit
```

3. If both commands pass, update this step to `[x]`.
4. Do not modify any source file in this step unless the commands fail and the failure is caused by a mismatch with the explicit edits prescribed in Steps 1-3. If that happens, stop and ask for input instead of making unplanned changes.
