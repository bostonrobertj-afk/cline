---
title: Test 23 Deterministic Placeholder Gate Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, stop, then read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - Stop at every PAUSE POINT and provide an update so the work can be checked before continuing.
  - If any ambiguity is discovered, or any code/test change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Test 23 Deterministic Placeholder Gate Action Plan

This plan remediates the deterministic placeholder-workflow leakage described in `docs/test-23-findings.md`.

Locked scope:
- Fix the brittle deterministic gate in the main-thread prompt assembly.
- Fix the brittle deterministic gate in the subagent prompt assembly.
- Fix the focus-chain fallback text so deterministic workflows do not fall back to manual `task_progress` guidance when step details cannot be resolved.
- Add only the regression tests specified in this plan.
- Do not modify `src/core/prompts/system-prompt/components/continuation_turn.ts`.
- Do not modify `src/core/prompts/system-prompt/components/task_progress.ts`.
- Do not modify `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`.
- Do not widen this work into any other placeholder-workflow prompt behavior.

## Step 1
[x] Add a main-thread helper that derives deterministic-workflow enablement from the canonical active workflow source, then use it in prompt assembly and cover it with a unit test.

Allowed files:
- `src/core/task/index.ts`
- `src/core/task/__tests__/prompt-context.test.ts`

Exact edits:
1. In `src/core/task/index.ts` immediately after the existing `shouldIncludePersistentPromptContext(...)` helper at lines 182-184, insert this exported helper exactly:

```ts
export function isActiveDeterministicPlaceholderWorkflowEnabled(
	taskState: Pick<TaskState, "activePlaceholderWorkflowSource">,
): boolean {
	return isDeterministicPlaceholderWorkflowSupported(taskState.activePlaceholderWorkflowSource?.name)
}
```

2. In `src/core/task/index.ts` at lines 2816-2818, replace:

```ts
const activeDeterministicPlaceholderWorkflowEnabled = isDeterministicPlaceholderWorkflowSupported(
	activePlaceholderWorkflowPromptContext.activePlaceholderWorkflowName,
)
```

with:

```ts
const activeDeterministicPlaceholderWorkflowEnabled = isActiveDeterministicPlaceholderWorkflowEnabled(this.taskState)
```

3. In `src/core/task/__tests__/prompt-context.test.ts` line 2, change the import from:

```ts
import { shouldIncludePersistentPromptContext } from "../index"
```

to:

```ts
import { isActiveDeterministicPlaceholderWorkflowEnabled, shouldIncludePersistentPromptContext } from "../index"
```

4. In `src/core/task/__tests__/prompt-context.test.ts`, insert the following two `it(...)` blocks immediately before the closing `})` of the existing `describe("shouldIncludePersistentPromptContext", ...)` block at line 31:

```ts
	it("returns true for supported deterministic placeholder workflows based on activePlaceholderWorkflowSource", () => {
		expect(
			isActiveDeterministicPlaceholderWorkflowEnabled({
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "code-review.md",
					contents: "# Review Workflow",
				},
			} as any),
		).to.equal(true)
	})

	it("returns false when the active placeholder workflow source is missing or unsupported", () => {
		expect(
			isActiveDeterministicPlaceholderWorkflowEnabled({
				activePlaceholderWorkflowSource: undefined,
			} as any),
		).to.equal(false)

		expect(
			isActiveDeterministicPlaceholderWorkflowEnabled({
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "review-edge-case-hunter.md",
					contents: "# Review Workflow",
				},
			} as any),
		).to.equal(false)
	})
```

5. Do not make any other changes in either file during this step.

## Step 2
[x] PAUSE POINT: Report the Step 1 helper and main-thread wiring changes, then wait for review before continuing.

Allowed files:
- None

Execution requirements:
- Do not edit any files in this step.
- Provide a concise update that Step 1 is complete and explicitly mention that no scope has been widened beyond `src/core/task/index.ts` and `src/core/task/__tests__/prompt-context.test.ts`.
- Do not begin Step 3 until review feedback says to continue.

## Step 3
[x] Change the subagent prompt assembly to use the canonical active workflow source for the deterministic gate, then add a regression test that proves the gate stays enabled even when step details do not resolve.

Allowed files:
- `src/core/task/tools/subagent/SubagentRunner.ts`
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

Exact edits:
1. In `src/core/task/tools/subagent/SubagentRunner.ts` at lines 977-979, replace:

```ts
const activeDeterministicPlaceholderWorkflowEnabled = isDeterministicPlaceholderWorkflowSupported(
	activePlaceholderWorkflowPromptContext.activePlaceholderWorkflowName,
)
```

with:

```ts
const activeDeterministicPlaceholderWorkflowEnabled = isDeterministicPlaceholderWorkflowSupported(
	params.state.activePlaceholderWorkflowSource?.name,
)
```

2. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, insert the following new test immediately after the existing test that ends at line 368 (`"marks suppressed internal subagent turns as continuation turns and forwards the current checklist"`):

```ts
	it("keeps deterministic placeholder workflows enabled even when step details cannot be resolved", async () => {
		const runner = new SubagentRunner(createTaskConfig(false))
		const state = new TaskState()
		state.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"
		state.activePlaceholderWorkflowId = "code-review.md"
		state.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "code-review.md",
			contents: "# Review Workflow\n\n## Step 9: Ship It\nFinish the release.\n",
		}

		const context = await (runner as any).buildPromptContext({
			state,
			hostIde: "test",
			providerInfo: {
				providerId: "anthropic",
				model: { id: "anthropic/claude-sonnet-4.5", info: { contextWindow: 200_000 } },
				mode: "act",
				customPrompt: undefined,
			},
			availableSkills: [],
			configuredSkillNames: undefined,
			assignedSkillNames: [],
			nativeToolCallsRequested: false,
			shouldSendFullPromptAssembly: false,
			shouldUseContinuationPrompt: true,
		})

		assert.equal(context.activePlaceholderWorkflowName, undefined)
		assert.equal(context.activePlaceholderWorkflowStepNumber, undefined)
		assert.equal(context.activeDeterministicPlaceholderWorkflowEnabled, true)
		assert.equal(context.activeWorkflowSupportsPlaceholders, true)
	})
```

3. Do not import the helper from `src/core/task/index.ts` into `SubagentRunner.ts`. Keep the subagent fix local and limited to the line replacement above.

4. Do not modify any other subagent tests in this step.

## Step 4
[x] Make the focus-chain unresolved-step fallback deterministic-safe and add regression coverage for both deterministic and non-deterministic unresolved workflows.

Allowed files:
- `src/core/task/focus-chain/index.ts`
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`

Exact edits:
1. In `src/core/task/focus-chain/index.ts` inside `generateFocusChainInstructions()` at lines 249-254, insert a new deterministic flag and replace the hard-coded `introUpdateRequired` string. Change that block to exactly:

```ts
			const percentComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
			const activeDeterministicPlaceholderWorkflowEnabled = isDeterministicPlaceholderWorkflowSupported(
				this.taskState.activePlaceholderWorkflowSource?.name,
			)

			const introUpdateRequired = activeDeterministicPlaceholderWorkflowEnabled
				? "### Reminder: Detailed instructions are shown for the first incomplete checklist item. This turn could not resolve the current deterministic workflow step details, so do not advance the checklist manually. Continue the current step work and wait for the next step's details to be shown automatically."
				: "### Reminder: Detailed instructions are shown for the first incomplete checklist item. Keep `task_progress` moving so the active step and its details stay in sync."
```

2. In the user-updated-list return block at lines 268-274, replace the final `FocusChainPrompts.reminder` argument with:

```ts
activeDeterministicPlaceholderWorkflowEnabled ? undefined : FocusChainPrompts.reminder,
```

3. In the default unresolved-step return block at lines 298-303, replace the `FocusChainPrompts.reminder` argument with:

```ts
activeDeterministicPlaceholderWorkflowEnabled ? undefined : FocusChainPrompts.reminder,
```

4. Do not change `buildPlaceholderWorkflowStepPrompt(...)` in this step.

5. In `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`, change the existing test title at lines 245-260 from:

```ts
it("falls back to the generic reminder when step details cannot be resolved", async () => {
```

to:

```ts
it("falls back to the generic reminder for non-deterministic workflows when step details cannot be resolved", async () => {
```

Leave the rest of that existing test body unchanged.

6. In `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`, insert this new test immediately after that renamed non-deterministic fallback test:

```ts
	it("suppresses manual task_progress fallback text for deterministic workflows when step details cannot be resolved", async () => {
		const taskState = new TaskState()
		taskState.activePlaceholderWorkflowId = "code-review.md"
		taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "code-review.md",
			contents: "## Step 9: Ship It\nFinish the release.",
		}
		taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

		const manager = new FocusChainManager(createDependencies(taskState))
		const prompt = await manager.generateFocusChainInstructions()

		expect(prompt).to.contain("This turn could not resolve the current deterministic workflow step details")
		expect(prompt).to.not.contain('If you finish the current checklist step, include "task_progress" in your next tool call')
		expect(prompt).to.not.contain("Keep `task_progress` moving")
		expect(prompt).to.not.contain("# CURRENT WORKFLOW STEP")
	})
```

7. Do not add any additional focus-chain messaging changes beyond the exact string and conditional replacements above.

## Step 5
[ ] PAUSE POINT: Report the subagent and focus-chain changes, then wait for review before running verification.

Allowed files:
- None

Execution requirements:
- Do not edit any files in this step.
- Provide a concise update that Steps 3 and 4 are complete.
- Explicitly state that `continuation_turn.ts`, `task_progress.ts`, and `contextualNativeToolFilter.ts` were intentionally left unchanged because this plan fixes the leak through the stable deterministic gate and focus-chain fallback only.
- Do not begin Step 6 until review feedback says to continue.

## Step 6
[x] Run only the targeted regression tests for this remediation and stop if any failure requires an unplanned change.

Allowed files:
- None

Exact command:

```bash
npm run test:unit -- src/core/task/__tests__/prompt-context.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts --exit
```

Execution requirements:
- Do not run the full unit-test suite in this step.
- If the command passes, report that the targeted regression suite passed.
- If the command fails because of an issue inside one of the allowed files from Steps 1, 3, or 4, stop and ask for input before making any additional change.
- If the command fails because a different file now appears to require edits, stop and ask for input immediately. Do not widen scope on your own.
