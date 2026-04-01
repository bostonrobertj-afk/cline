---
title: Workflow Completion Handler Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Workflow Completion Handler Action Plan

This plan implements the base `workflowCompletionHandler` capability described in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/requirements.md#L41)
- [code-review-completion.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/code-review-completion.md#L5)

This pass is limited to the base handler build only. It does not implement:

- `workflowCompletionRunner`
- placeholder-workflow teardown
- deterministic progression trigger changes
- workflow-end automation wiring inside [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- any preconfigured workflow-specific mappings
- any prompt exposure, workflow-form behavior, or `/Users/robertboston/Documents/Cline/Workflows/**` edits

Locked decisions for this pass:

- The base handler file is [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts).
- The base test file is [workflowCompletionHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts).
- The configuration seam is an internal exported registry object in the handler module that ships empty.
- The base handler returns only the exact string union outcomes:
  - `no_op`
  - `tool_completed`
  - `tool_failed`
- The base handler must not mutate `TaskState`, persist metadata, resolve workflow placeholders, or own tool approval behavior.
- The base handler must not add any workflow-specific registry entry in production code during this pass.
- The base handler must be directly callable by a later `workflowCompletionRunner` pass through a simple call-and-await contract.

## Step 1
[x] Add the standalone base `workflowCompletionHandler` module with an empty exported registry seam and a direct-call return contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflowCompletionHandler.ts`

Exact edits:
1. Add a new file at [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts) with these exact imports and exports:

```ts
import type { ClineDefaultTool } from "@shared/tools"

export type WorkflowCompletionHandlerResult = "no_op" | "tool_completed" | "tool_failed"

export interface WorkflowCompletionHandlerRegistryEntry {
	toolName: ClineDefaultTool
}

export const workflowCompletionHandlerRegistry: Record<string, WorkflowCompletionHandlerRegistryEntry> = {}

export interface WorkflowCompletionHandlerArgs {
	completedWorkflowId: string
	invokeInternalTool: (toolName: ClineDefaultTool) => Promise<boolean>
}
```

2. In the same file, add this exact function implementation after the type exports:

```ts
export async function workflowCompletionHandler(
	args: WorkflowCompletionHandlerArgs,
): Promise<WorkflowCompletionHandlerResult> {
	const entry = workflowCompletionHandlerRegistry[args.completedWorkflowId]
	if (!entry) {
		return "no_op"
	}

	try {
		const succeeded = await args.invokeInternalTool(entry.toolName)
		return succeeded ? "tool_completed" : "tool_failed"
	} catch {
		return "tool_failed"
	}
}
```

3. Do not import `TaskState`, `TaskConfig`, `ToolExecutor`, `ToolExecutorCoordinator`, or [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts) into this file.
4. Do not add any workflow-specific registry entry to `workflowCompletionHandlerRegistry` in production code.
5. Do not add any placeholder-resolution logic, approval logic, metadata persistence, or state mutation to this file.

## Step 2
[x] Add focused unit coverage for the empty-registry base build and the generic dispatch seam.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts`

Exact edits:
1. Add a new file at [workflowCompletionHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts).
2. In that file, import exactly:
   - `assert` from `chai`
   - `describe`, `it`, `beforeEach` from `mocha`
   - `sinon` from `sinon`
   - `ClineDefaultTool` from `@shared/tools`
   - `workflowCompletionHandler`, `workflowCompletionHandlerRegistry`, and `type WorkflowCompletionHandlerResult` from [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts)
3. Add a `beforeEach` that deletes every own key from `workflowCompletionHandlerRegistry` so each test starts from an empty base registry.
4. Add these exact test cases:
   - `"ships with no workflow mappings configured in the base build"`
     - assert `Object.keys(workflowCompletionHandlerRegistry)` equals `[]`
   - `"returns no_op and does not invoke any tool when the completed workflow has no configured mapping"`
     - use `completedWorkflowId: "example-workflow.md"`
     - pass `invokeInternalTool` as a sinon stub that would resolve `true`
     - assert the result equals `"no_op"`
     - assert the stub was not called
   - `"returns tool_completed when a configured workflow mapping invokes an internal tool successfully"`
     - set `workflowCompletionHandlerRegistry["example-workflow.md"] = { toolName: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE }`
     - pass a sinon stub resolving `true`
     - assert the result equals `"tool_completed"`
     - assert the stub was called once with `ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE`
   - `"returns tool_failed when a configured workflow mapping invokes an internal tool that reports failure"`
     - seed the same synthetic registry mapping as above
     - pass a sinon stub resolving `false`
     - assert the result equals `"tool_failed"`
   - `"returns tool_failed when the mapped internal tool invocation throws"`
     - seed the same synthetic registry mapping as above
     - pass a sinon stub rejecting with `new Error("boom")`
     - assert the result equals `"tool_failed"`
5. In the success/failure tests, assign the awaited result to a variable typed as `WorkflowCompletionHandlerResult` before asserting, so the string-union return contract is checked by TypeScript in the test file.
6. Do not add any test that seeds a real production workflow id into the exported registry. Use only the synthetic workflow id `example-workflow.md` in tests so the base build remains clearly unconfigured.

## Step 3
[x] Run the focused verification for the standalone base handler build.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-end-automation/workflow-completion-handler-action-plan.md`

Exact edits:
1. Run exactly:

```bash
npm run test:unit -- src/core/task/__tests__/workflowCompletionHandler.test.ts --exit
```

2. Then run exactly:

```bash
npx tsc --noEmit
```

3. If both commands pass, update this step to `[x]`.
4. Do not modify any source file in this step unless the commands fail and the failure is caused by a mismatch with the explicit edits prescribed in Step 1 or Step 2. If that happens, stop and ask for input instead of making unplanned changes.
