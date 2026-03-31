---
title: Review Adversarial General Subagent Placeholder Inheritance Action Plan
execution_instructions:
  - Read each step in full before executing that step.
  - Execute only the current step.
  - After completing a step, update that step's `[ ]` checkbox to `[x]`.
  - After updating the completed step's checkbox, return to this document and read the next step in full before making additional changes.
  - Do not execute any later step based on stale context, memory, or assumptions about what a later step might require.
  - Follow the allowed-files list for the current step exactly.
  - Apply only the exact changes prescribed in this document.
  - If any ambiguity is discovered, or if any necessary change is not explicitly prescribed here, stop and ask for input before proceeding.
---

# Review Adversarial General Subagent Placeholder Inheritance Action Plan

This document is the implementation plan for adding parent-to-subagent placeholder inheritance during placeholder-workflow subagent activation, then using that inherited state to auto-complete `review-adversarial-general.md` Step 1 before the child workflow's first turn.

The executing agent must follow this plan literally.

## Purpose

When a parent workflow invokes a placeholder-workflow subagent, the child workflow should begin with any shared placeholder values that the parent has already resolved. For this pass, that behavior must be strong enough to support the `code-review.md` -> `review-adversarial-general.md` handoff where the parent already owns `{diff_output}`.

This pass must ensure all of the following:

- the subagent activation path copies only shared placeholder keys from the parent task into the child placeholder workflow state
- shared-key detection is based on placeholder keys actually referenced by the child workflow source, not on a blind copy of every parent placeholder
- inherited values are written only into `activePlaceholderWorkflowValues`, never into the child stable placeholder map
- child placeholder values already present in the child workflow remain authoritative and are not overwritten
- after inheritance and checklist seeding, deterministically supported child workflows are evaluated immediately so the first subagent turn starts on the true active step
- `review-adversarial-general.md` becomes a supported deterministic placeholder workflow for Step 1 only

## Locked Decisions

- Implement shared-placeholder detection by extracting normalized placeholder keys from workflow source text.
- Copy only placeholder keys that are both:
  - referenced by the child workflow source
  - already resolved in the parent's merged placeholder map
- Treat the parent task's merged placeholder map as:
  - `getPlaceholderWorkflowValueMap(this.baseConfig.taskState.activePlaceholderWorkflowStableValues, this.baseConfig.taskState.activePlaceholderWorkflowValues)`
- Treat the child task's merged placeholder map as:
  - `getPlaceholderWorkflowValueMap(state.activePlaceholderWorkflowStableValues, state.activePlaceholderWorkflowValues)`
- Write inherited values only into `state.activePlaceholderWorkflowValues`.
- Run inheritance after [activatePlaceholderWorkflowInTaskState(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts#L61) succeeds and before subagent checklist seeding.
- Run the initial deterministic progression by calling the existing subagent-local focus-chain manager after checklist seeding. Do not create a second deterministic-resolution path.
- Add deterministic support only for `review-adversarial-general.md` Step 1 in this pass.
- Do not modify workflow files under `/Users/robertboston/Documents/Cline/Workflows/` in this pass.
- Do not add deterministic support for `review-edge-case-hunter.md` in this pass.

## Files To Modify

1. [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts)
2. [workflow-placeholders.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/__tests__/workflow-placeholders.test.ts)
3. [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)
4. [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts)
5. [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
6. [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)
7. [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts)

## Files Explicitly Not To Modify

- any file under `/Users/robertboston/Documents/Cline/Workflows/`
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- [workflow-activation.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts)
- [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts)
- [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts)
- snapshot files

## [x] Step 1: Add A Workflow Placeholder Key Extraction Helper

### Allowed Files

- [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts)
- [workflow-placeholders.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/__tests__/workflow-placeholders.test.ts)

### Exact Changes

#### 1A. Export a helper that returns normalized placeholder keys rather than raw token text.

In [workflow-placeholders.ts:70](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts#L70), leave `findUnresolvedWorkflowPlaceholders(...)` unchanged.

Immediately after that function, insert this exact exported helper:

```ts
export function extractWorkflowPlaceholderKeys(text: string | undefined): string[] {
	if (!isNonEmptyString(text)) {
		return []
	}

	const keys = new Set<string>()
	for (const match of text.matchAll(WORKFLOW_PLACEHOLDER_TOKEN_REGEX)) {
		const key = String(match[1] ?? match[2] ?? "").trim()
		if (key.length > 0) {
			keys.add(key)
		}
	}

	return Array.from(keys)
}
```

Do not change:

- `WORKFLOW_PLACEHOLDER_TOKEN_REGEX`
- `findUnresolvedWorkflowPlaceholders(...)`
- any config-loading logic in this file

#### 1B. Add focused tests for the new helper.

In [workflow-placeholders.test.ts:6](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/__tests__/workflow-placeholders.test.ts#L6), extend the import to include `extractWorkflowPlaceholderKeys`.

Then append these two new tests at the end of the existing `describe("workflow placeholders", ...)` block:

```ts
	it("extracts unique normalized placeholder keys from single-curly and double-curly tokens", () => {
		expect(
			extractWorkflowPlaceholderKeys(
				"Review {diff_output}, compare {{ review_input }}, keep {diff_output}, and ignore plain text.",
			),
		).to.deep.equal(["diff_output", "review_input"])
	})

	it("returns an empty array when there are no placeholder tokens", () => {
		expect(extractWorkflowPlaceholderKeys(undefined)).to.deep.equal([])
		expect(extractWorkflowPlaceholderKeys("No placeholders here.")).to.deep.equal([])
	})
```

### Pause Point 1

Stop after Step 1 and report:

- the exact new helper name exported from `workflow-placeholders.ts`
- confirmation that `findUnresolvedWorkflowPlaceholders(...)` was left unchanged
- the exact two new test titles added in `workflow-placeholders.test.ts`

Do not proceed until this checkpoint is reviewed.

## [x] Step 2: Inherit Shared Parent Placeholder Values During Child Workflow Activation

### Allowed Files

- [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)
- [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts)

### Exact Changes

#### 2A. Add the imports needed for child-workflow placeholder inheritance.

In [SubagentRunner.ts:1](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1), add this import directly above the existing `import * as path from "node:path"` line:

```ts
import fs from "node:fs/promises"
```

In the existing `@core/workflows/...` imports near [SubagentRunner.ts:28](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L28), add:

```ts
import { getPlaceholderWorkflowValueMap } from "@core/workflows/placeholder-workflow-rendering"
import { extractWorkflowPlaceholderKeys } from "@core/workflows/workflow-placeholders"
```

Do not remove any existing imports.

#### 2B. Add a private helper that inherits only shared unresolved placeholder keys from the parent task.

In [SubagentRunner.ts:1074](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1074), insert this exact private method immediately before `seedPlaceholderChecklistIfNeeded(...)`:

```ts
	private async inheritSharedParentPlaceholdersToActivatedWorkflow(state: TaskState): Promise<void> {
		const childSource = state.activePlaceholderWorkflowSource
		if (!childSource) {
			return
		}

		const parentPlaceholders = getPlaceholderWorkflowValueMap(
			this.baseConfig.taskState.activePlaceholderWorkflowStableValues,
			this.baseConfig.taskState.activePlaceholderWorkflowValues,
		)
		if (!parentPlaceholders) {
			return
		}

		const childSourceContents =
			childSource.type === "remote"
				? childSource.contents
				: await fs.readFile(childSource.path, "utf8").catch(() => undefined)
		if (!childSourceContents) {
			return
		}

		const referencedKeys = extractWorkflowPlaceholderKeys(childSourceContents)
		if (referencedKeys.length === 0) {
			return
		}

		const childResolvedPlaceholders =
			getPlaceholderWorkflowValueMap(state.activePlaceholderWorkflowStableValues, state.activePlaceholderWorkflowValues) ?? {}

		const inheritedValues: Record<string, string> = {}
		for (const key of referencedKeys) {
			if (childResolvedPlaceholders[key] !== undefined) {
				continue
			}

			const parentValue = parentPlaceholders[key]
			if (parentValue === undefined) {
				continue
			}

			inheritedValues[key] = parentValue
		}

		if (Object.keys(inheritedValues).length === 0) {
			return
		}

		state.activePlaceholderWorkflowValues = {
			...(state.activePlaceholderWorkflowValues ?? {}),
			...inheritedValues,
		}
	}
```

This helper must:

- use the parent task from `this.baseConfig.taskState`
- read child workflow source contents from `state.activePlaceholderWorkflowSource`
- copy only keys referenced by the child workflow source
- skip any key already resolved on the child
- write inherited values only into `state.activePlaceholderWorkflowValues`

#### 2C. Call the inheritance helper during placeholder-workflow auto-activation.

In [SubagentRunner.ts:1065](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1065), keep the existing `activatePlaceholderWorkflowInTaskState(...)` call exactly as-is.

Immediately after that call and immediately before `await this.seedPlaceholderChecklistIfNeeded(state, true)`, insert:

```ts
		await this.inheritSharedParentPlaceholdersToActivatedWorkflow(state)
```

Do not move checklist seeding earlier than inheritance.

#### 2D. Add targeted tests for inheritance behavior.

In [SubagentRunner.test.ts:1723](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1723), insert these two tests immediately before the existing `it("seeds a placeholder checklist from step headings when auto-activating a subagent workflow", ...)` test:

```ts
	it("inherits only shared referenced parent placeholders into an activated subagent workflow", async () => {
		const config = createTaskConfig(false)
		config.taskState.activePlaceholderWorkflowId = "code-review.md"
		config.taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "code-review.md",
			contents: "# Code Review",
		}
		config.taskState.activePlaceholderWorkflowStableValues = { project_root: "/tmp/project" }
		config.taskState.activePlaceholderWorkflowValues = {
			diff_output: "/tmp/project/review-input.diff",
			review_input: "/tmp/project/review-input.md",
			review_mode: "full",
		}

		const runner = new SubagentRunner(config)
		const state = new TaskState()
		state.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "review-adversarial-general.md",
			contents: `# Review

## Step 1: Receive content and determine review scope
Use {diff_output} when it is available.

## Step 2: Perform adversarial analysis
Inspect only the provided diff.`,
		}

		await (runner as any).inheritSharedParentPlaceholdersToActivatedWorkflow(state)

		assert.deepEqual(state.activePlaceholderWorkflowValues, {
			diff_output: "/tmp/project/review-input.diff",
		})
	})

	it("does not overwrite child placeholder values that are already resolved", async () => {
		const config = createTaskConfig(false)
		config.taskState.activePlaceholderWorkflowValues = {
			diff_output: "/tmp/project/parent-review-input.diff",
		}

		const runner = new SubagentRunner(config)
		const state = new TaskState()
		state.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "review-adversarial-general.md",
			contents: `# Review

## Step 1: Receive content and determine review scope
Use {diff_output} when it is available.`,
		}
		state.activePlaceholderWorkflowValues = {
			diff_output: "/tmp/project/child-review-input.diff",
		}

		await (runner as any).inheritSharedParentPlaceholdersToActivatedWorkflow(state)

		assert.deepEqual(state.activePlaceholderWorkflowValues, {
			diff_output: "/tmp/project/child-review-input.diff",
		})
	})
```

Do not add any assertions about checklist state in these two tests.

### Pause Point 2

Stop after Step 2 and report:

- the exact new private helper name added to `SubagentRunner.ts`
- the exact call site where inheritance now runs during child workflow activation
- the exact two new inheritance-focused test titles added to `SubagentRunner.test.ts`

Do not proceed until this checkpoint is reviewed.

## [x] Step 3: Run Immediate Deterministic Progression After Child Checklist Seeding

### Allowed Files

- [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)
- [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts)

### Exact Changes

#### 3A. Add a private helper that runs the existing deterministic progression path for the child workflow before its first turn.

In [SubagentRunner.ts:1074](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1074), insert this exact method immediately after `inheritSharedParentPlaceholdersToActivatedWorkflow(...)` and immediately before `seedPlaceholderChecklistIfNeeded(...)`:

```ts
	private async applyInitialDeterministicPlaceholderProgressionIfNeeded(state: TaskState): Promise<void> {
		if (!state.activePlaceholderWorkflowSource || !state.currentFocusChainChecklist) {
			return
		}

		if (!isDeterministicPlaceholderWorkflowSupported(state.activePlaceholderWorkflowSource.name)) {
			return
		}

		const focusChainManager = this.getOrCreateSubagentFocusChainManager(state)
		await focusChainManager.updateFCListFromToolResponse(undefined)
	}
```

Do not introduce a new deterministic resolver entry point in `SubagentRunner.ts`. This helper must use the existing focus-chain update path.

#### 3B. Invoke the helper immediately after checklist seeding.

In [SubagentRunner.ts:1071](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1071), keep the existing `await this.seedPlaceholderChecklistIfNeeded(state, true)` line.

Immediately after that line, insert:

```ts
		await this.applyInitialDeterministicPlaceholderProgressionIfNeeded(state)
```

Do not call this helper before checklist seeding.

#### 3C. Add an end-to-end activation test that proves inherited `diff_output` advances the child workflow before its first turn.

In [SubagentRunner.test.ts:1779](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1779), insert this new test immediately before `it("routes subagent task_progress updates to subagent-local focus chain storage instead of the parent callback", ...)`:

```ts
	it("advances review-adversarial-general.md before the first subagent turn when inherited diff_output already satisfies step 1", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "subagent-review-adversarial-initial-deterministic-"))

		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)

			const config = createTaskConfig(false)
			config.taskState.activePlaceholderWorkflowId = "code-review.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "code-review.md",
				contents: "# Code Review",
			}
			config.taskState.activePlaceholderWorkflowStableValues = { project_root: tempDir }
			config.taskState.activePlaceholderWorkflowValues = {
				diff_output: path.join(tempDir, "review-input.diff"),
			}

			const runner = new SubagentRunner(config)
			const state = new TaskState()

			await (runner as any).autoActivateAssignedWorkflow(
				state,
				["review-adversarial-general.md"],
				[
					{
						name: "review-adversarial-general.md",
						source: "remote",
						description: "Remote workflow: review-adversarial-general.md",
						fileName: "review-adversarial-general.md",
						contents: `# BMAD Review: Adversarial General

## Step 1: Receive content and determine review scope
Use {diff_output} when it is already available.

## Step 2: Perform adversarial analysis
Review the provided material only.

## Step 3: Present findings
Return the findings to the user.`,
					},
				],
			)

			assert.deepEqual(state.activePlaceholderWorkflowValues, {
				diff_output: path.join(tempDir, "review-input.diff"),
			})
			assert.equal(
				state.currentFocusChainChecklist,
				"- [x] Step 1: Receive content and determine review scope\n- [ ] Step 2: Perform adversarial analysis\n- [ ] Step 3: Present findings",
			)
			assert.deepEqual(state.pendingAutoCompletedPlaceholderWorkflowStepNotices, [
				{
					workflowName: "review-adversarial-general.md",
					stepNumber: 1,
					checklistLabel: "Step 1: Receive content and determine review scope",
					reason: "review_input or diff_output is already available for this review pass.",
				},
			])
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})
```

Do not assert anything about child prompt text in this test. Keep it focused on inherited state, checklist progression, and notice creation.

### Pause Point 3

Stop after Step 3 and report:

- the exact new helper name that triggers initial deterministic progression
- the exact line added after checklist seeding in `autoActivateAssignedWorkflow(...)`
- the exact new end-to-end test title added to `SubagentRunner.test.ts`

Do not proceed until this checkpoint is reviewed.

## [x] Step 4: Add Deterministic Support For `review-adversarial-general.md` Step 1

### Allowed Files

- [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)
- [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts)

### Exact Changes

#### 4A. Extend the deterministic workflow-name union with the new canonical workflow name.

In [TaskState.ts:33](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L33), replace:

```ts
export type DeterministicPlaceholderWorkflowName = "code-review.md" | "dev-story.md"
```

with:

```ts
export type DeterministicPlaceholderWorkflowName =
	| "code-review.md"
	| "dev-story.md"
	| "review-adversarial-general.md"
```

Do not add `review-edge-case-hunter.md` here.

#### 4B. Extend the support gate and add a workflow-specific evaluator for `review-adversarial-general.md`.

In [deterministicPlaceholderProgression.ts:31](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L31), replace the current `isDeterministicPlaceholderWorkflowSupported(...)` return statement with:

```ts
	return (
		workflowName === "code-review.md" ||
		workflowName === "dev-story.md" ||
		workflowName === "review-adversarial-general.md"
	)
```

Then, in [deterministicPlaceholderProgression.ts:295](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L295), insert this exact function immediately before `evaluateDevStoryStep(...)`:

```ts
async function evaluateReviewAdversarialGeneralStep(args: {
	taskState: TaskState
	stepNumber: number
}): Promise<DeterministicStepEvaluationResult> {
	const placeholders = getMergedPlaceholderValues(args.taskState)

	switch (args.stepNumber) {
		case 1: {
			const reviewInput = placeholders.review_input?.trim()
			const diffOutput = placeholders.diff_output?.trim()
			if (!reviewInput && !diffOutput) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "review_input or diff_output is already available for this review pass.",
			}
		}
		default:
			return { completed: false }
	}
}
```

Finally, in [deterministicPlaceholderProgression.ts:376](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L376), replace the current `evaluateDeterministicStep(...)` body with this exact branch order:

```ts
	if (args.workflowName === "code-review.md") {
		return evaluateCodeReviewStep({
			taskState: args.taskState,
			stepNumber: args.stepNumber,
		})
	}

	if (args.workflowName === "dev-story.md") {
		return evaluateDevStoryStep({
			taskState: args.taskState,
			stepNumber: args.stepNumber,
		})
	}

	return evaluateReviewAdversarialGeneralStep({
		taskState: args.taskState,
		stepNumber: args.stepNumber,
	})
```

Do not change:

- any `code-review.md` step logic
- any `dev-story.md` step logic
- notice recording behavior

#### 4C. Add deterministic resolver tests for the new workflow and support gate.

In [deterministicPlaceholderProgression.test.ts:43](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L43), update the support-gate test so it also asserts:

```ts
		expect(isDeterministicPlaceholderWorkflowSupported("review-adversarial-general.md")).to.equal(true)
```

Leave the existing `review-edge-case-hunter.md` negative assertion in place.

Then insert these two new tests immediately after the support-gate test:

```ts
	it("completes review-adversarial-general step 1 when diff_output is already available", async () => {
		const taskState = createTaskState({
			workflowName: "review-adversarial-general.md",
			workflowContents: `## Step 1: Receive content and determine review scope
Use {diff_output} when it is already available.

## Step 2: Perform adversarial analysis
Review the provided material.`,
			checklistMarkdown:
				"- [ ] Step 1: Receive content and determine review scope\n- [ ] Step 2: Perform adversarial analysis",
			placeholderValues: {
				diff_output: "/tmp/review-input.diff",
			},
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: taskState.currentFocusChainChecklist!,
		})

		expect(result.checklist).to.equal(
			"- [x] Step 1: Receive content and determine review scope\n- [ ] Step 2: Perform adversarial analysis",
		)
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.at(-1)?.reason).to.equal(
			"review_input or diff_output is already available for this review pass.",
		)
	})

	it("does not complete review-adversarial-general step 1 when neither review_input nor diff_output is available", async () => {
		const taskState = createTaskState({
			workflowName: "review-adversarial-general.md",
			workflowContents: `## Step 1: Receive content and determine review scope
Wait for the review input to be provided.`,
			checklistMarkdown: "- [ ] Step 1: Receive content and determine review scope",
		})

		const result = await applyDeterministicPlaceholderProgression({
			taskState,
			checklistMarkdown: taskState.currentFocusChainChecklist!,
		})

		expect(result.checklist).to.equal("- [ ] Step 1: Receive content and determine review scope")
		expect(taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
	})
```

### Pause Point 4

Stop after Step 4 and report:

- the exact new `DeterministicPlaceholderWorkflowName` union members
- the exact reason string used for `review-adversarial-general.md` Step 1 auto-completion
- the exact two new deterministic resolver test titles added for `review-adversarial-general.md`

Do not proceed until this checkpoint is reviewed.

## [x] Step 5: Run Targeted Validation

### Allowed Files

- None. Run commands only.

### Exact Changes

Run this exact command from the repo root:

```bash
npm run test:unit -- src/core/workflows/__tests__/workflow-placeholders.test.ts src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts
```

If the command fails:

- stop immediately
- inspect only failures in the three targeted files above
- fix only failures caused by the changes prescribed in this plan
- do not widen scope

### Final Report Requirements

After Step 5, report:

- whether the targeted unit-test command passed
- the exact new helper names added
- confirmation that placeholder inheritance now runs before child checklist seeding
- confirmation that `review-adversarial-general.md` Step 1 auto-completes before the first subagent turn when `{diff_output}` is inherited
