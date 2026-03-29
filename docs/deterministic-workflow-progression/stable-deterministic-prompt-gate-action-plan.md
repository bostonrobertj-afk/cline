---
title: Stable Deterministic Prompt Gate Action Plan
execution_instructions:
  - Read each step in full before executing that step.
  - Execute only the current step.
  - After completing a step, update that step's `[ ]` checkbox to `[x]`.
  - After updating the completed step's checkbox, return to this document and read the next step in full before making additional changes.
  - Do not execute any later step based on stale context, memory, or assumptions about what a later step might require.
  - If any ambiguity is discovered, or any necessary code or test change is not explicitly prescribed in this document, stop and ask for input before proceeding.
  - Do not widen scope beyond the files explicitly allowed in the current step.
---

# Stable Deterministic Prompt Gate Action Plan

This document is the implementation plan for fixing the remaining deterministic placeholder-workflow prompt leak described in [test-23-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-23-findings.md).

The executing agent must follow this plan literally.

## Purpose

When a supported deterministic placeholder workflow is active, prompt behavior must be gated by the canonical active workflow identity already stored in task state, not by whether `resolveActivePlaceholderWorkflowPromptContext(...)` succeeded in resolving the current step on a given turn.

This pass must ensure all of the following:

- main-thread prompt assembly stays on the deterministic branch when `taskState.activePlaceholderWorkflowSource?.name` is `code-review.md` or `dev-story.md`, even if `resolveActivePlaceholderWorkflowPromptContext(...)` returns `{}` for that turn
- subagent prompt assembly does the same for `params.state.activePlaceholderWorkflowSource?.name`
- focus-chain fallback prompting for supported deterministic workflows no longer leaks any legacy `task_progress` wording when current step details cannot be resolved
- existing unsupported placeholder workflows remain on the legacy `task_progress` path

## Locked Decisions

- The stable deterministic gate must come from the active workflow source name already stored in task state:
  - main thread: `this.taskState.activePlaceholderWorkflowSource?.name`
  - subagent thread: `params.state.activePlaceholderWorkflowSource?.name`
- Do not derive the deterministic gate from:
  - `activePlaceholderWorkflowPromptContext.activePlaceholderWorkflowName`
  - `stepDetails.sourceName`
  - any newly introduced aliasing or normalization helper
- When a deterministic workflow is active but current step details cannot be resolved, the fallback prompt must:
  - remain deterministic-safe
  - avoid all legacy `task_progress` guidance
  - continue to show the current checklist/progress context
- This plan is only for the stable deterministic prompt gate described in Item 1 of [test-23-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-23-findings.md)
- Explicitly out of scope for this pass:
  - moving primary-agent environment/focus-chain blocks out of input and into system instructions
  - workflow file edits under `/Users/robertboston/Documents/Cline/Workflows/`
  - snapshot updates

## Files To Modify

1. `src/core/task/index.ts`
2. `src/core/task/tools/subagent/SubagentRunner.ts`
3. `src/core/task/focus-chain/index.ts`
4. `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
5. `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
6. `src/core/prompts/system-prompt/__tests__/integration.test.ts`

No other files are to be modified in this pass.

## [ ] Step 1: Stabilize The Deterministic Gate In Main And Subagent Prompt Assembly

### Allowed Files

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)

### Exact Changes

#### 1A. Main thread prompt assembly must gate deterministic behavior from `taskState.activePlaceholderWorkflowSource?.name`.

In [index.ts:2810-2818](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2810), keep the existing `activePlaceholderWorkflowPromptContext` call exactly as-is.

Replace only this expression:

```ts
		const activeDeterministicPlaceholderWorkflowEnabled = isDeterministicPlaceholderWorkflowSupported(
			activePlaceholderWorkflowPromptContext.activePlaceholderWorkflowName,
		)
```

with:

```ts
		const activeDeterministicPlaceholderWorkflowEnabled = isDeterministicPlaceholderWorkflowSupported(
			this.taskState.activePlaceholderWorkflowSource?.name,
		)
```

Do not change:

- `resolveActivePlaceholderWorkflowPromptContext(...)`
- the `...activePlaceholderWorkflowPromptContext` spread
- `activeWorkflowSupportsPlaceholders`

#### 1B. Subagent prompt assembly must use the same stable gate from `params.state.activePlaceholderWorkflowSource?.name`.

In [SubagentRunner.ts:971-979](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L971), keep the existing `activePlaceholderWorkflowPromptContext` call exactly as-is.

Replace only this expression:

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

Do not change:

- `resolveActivePlaceholderWorkflowPromptContext(...)`
- the `...activePlaceholderWorkflowPromptContext` spread
- `activeWorkflowSupportsPlaceholders`

### Pause Point 1

Stop after Step 1 and report:

- the exact replacement expression now used in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- the exact replacement expression now used in [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)
- confirmation that `resolveActivePlaceholderWorkflowPromptContext(...)` was left untouched in both call sites

Do not proceed until this checkpoint is reviewed.

## [ ] Step 2: Make Focus-Chain Fallback Prompting Deterministic-Safe When Step Details Fail

### Allowed Files

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)

### Exact Changes

#### 2A. Base the checklist-level reminder on the stable active workflow source name, not on step-detail resolution.

In [focus-chain/index.ts:248-260](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L248), replace the current single-purpose `introUpdateRequired` assignment with these exact declarations, in this exact order:

```ts
			const activeDeterministicPlaceholderWorkflowEnabled = isDeterministicPlaceholderWorkflowSupported(
				this.taskState.activePlaceholderWorkflowSource?.name,
			)
			const introUpdateRequired = activeDeterministicPlaceholderWorkflowEnabled
				? "### Reminder: Detailed instructions are shown for the first incomplete checklist item. Once you correctly complete the current step, the next step's details will be shown automatically."
				: "### Reminder: Detailed instructions are shown for the first incomplete checklist item. Keep `task_progress` moving so the active step and its details stay in sync."
```

Leave `listCurrentProgress` and `userHasUpdatedList` immediately after those declarations.

#### 2B. Return a deterministic-safe fallback prompt when a supported deterministic workflow is active but current step details cannot be resolved.

In [focus-chain/index.ts:258-304](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L258), keep the existing call to `buildPlaceholderWorkflowStepPrompt(...)`.

Immediately after:

```ts
			if (placeholderWorkflowStepPrompt) {
				return placeholderWorkflowStepPrompt
			}
```

insert this exact fallback block:

```ts
			if (activeDeterministicPlaceholderWorkflowEnabled) {
				const autoCompletedNoticeSection = await this.consumeAutoCompletedPlaceholderWorkflowNoticesForPrompt()
				return this.joinPromptSections(
					introUpdateRequired,
					listCurrentProgress,
					this.renderChecklistForPrompt(this.taskState.currentFocusChainChecklist),
					this.taskState.todoListWasUpdatedByUser ? userHasUpdatedList : "",
					autoCompletedNoticeSection,
				)
			}
```

Do not include:

- `FocusChainPrompts.reminder`
- `task_progress`
- `__COMPLETE_NEXT_STEP__`
- a fabricated `# CURRENT WORKFLOW STEP` section

in this deterministic fallback block.

#### 2C. Make the resolved-step branch use the same stable deterministic gate instead of `stepDetails.sourceName`.

In [focus-chain/index.ts:376-413](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L376), replace:

```ts
			const deterministicWorkflowSupported = isDeterministicPlaceholderWorkflowSupported(stepDetails.sourceName)
```

with:

```ts
			const deterministicWorkflowSupported = isDeterministicPlaceholderWorkflowSupported(
				this.taskState.activePlaceholderWorkflowSource?.name,
			)
```

Do not change any other part of the resolved-step prompt assembly in this sub-step.

### Pause Point 2

Stop after Step 2 and report:

- the exact new stable-gate declaration added in `generateFocusChainInstructions()`
- the exact condition that now triggers the deterministic-safe fallback return
- confirmation that the deterministic fallback return does not include `FocusChainPrompts.reminder`, `task_progress`, or `__COMPLETE_NEXT_STEP__`

Do not proceed until this checkpoint is reviewed.

## [ ] Step 3: Add Regression Coverage For The Stable Deterministic Gate

### Allowed Files

- [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts)
- [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts)
- [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts)

### Exact Changes

#### 3A. Add a main-thread focus-chain regression proving deterministic-safe fallback behavior when step details cannot be resolved.

In [FocusChainManager.placeholderWorkflow.test.ts:76](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L76), insert a new test immediately after `injects current-step details for a placeholder workflow when they can be resolved`.

The new test title must be exactly:

```ts
it("uses deterministic-safe fallback prompting when step details cannot be resolved for a supported workflow", async () => {
```

The test must:

1. Create a temporary local workflow file named `code-review.md` with exactly these sections:

```md
# Review Workflow

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.
```

2. Create `taskState` with:
   - `activePlaceholderWorkflowId = "code-review.md"`
   - `activePlaceholderWorkflowSource = { type: "local", name: "code-review.md", path: workflowPath }`
   - `currentFocusChainChecklist = "- [ ] Step 99: Missing Step"`
3. Call `await manager.generateFocusChainInstructions()`
4. Assert:
   - the prompt includes:
     - `"Once you correctly complete the current step, the next step's details will be shown automatically."`
     - `"**Current Progress: 0/1 items completed (0%)**"`
     - `"- [ ] Step 99: Missing Step"`
   - the prompt does **not** include:
     - `"Keep \`task_progress\` moving so the active step and its details stay in sync."`
     - `"Do not include \`task_progress\` on a tool call until the active step's \"Done Signal\" is true."`
     - `"__COMPLETE_NEXT_STEP__"`
     - `"# CURRENT WORKFLOW STEP"`

Do not add any new helper in this test file.

#### 3B. Add a subagent regression proving the runtime prompt context keeps the deterministic flag enabled even when prompt-context step resolution returns no workflow name.

In [SubagentRunner.test.ts:1558](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1558), insert a new test immediately after `keeps continuation-turn placeholder workflow guidance out of local user content for OpenAI Responses subagents`.

The new test title must be exactly:

```ts
it("keeps deterministic placeholder workflow support enabled when subagent prompt-context step resolution fails", async () => {
```

The test must:

1. Create a one-call `createMessage` stub that yields an `attempt_completion` tool call.
2. Stub `PromptRegistry.getInstance().get(...)` and inside that stub assert:
   - `context.activePlaceholderWorkflowName === undefined`
   - `context.activePlaceholderWorkflowStepNumber === undefined`
   - `context.activeDeterministicPlaceholderWorkflowEnabled === true`
   - then return `"system prompt"`
3. Stub:
   - `skills.discoverSkills` to `[]`
   - `skills.getAvailableSkills` to `[]`
4. Use:
   - `stubApiHandler(createMessage, { modelId: "gpt-5.4-mini-2026-03-17", apiFormat: ApiFormat.OPENAI_RESPONSES })`
5. Configure `createTaskConfig(false)` and then set:
   - `config.taskState.activePlaceholderWorkflowId = "code-review.md"`
   - `config.taskState.activePlaceholderWorkflowSource = { type: "remote", name: "code-review.md", contents: "# Code Review\n\n## Step 1: Gather Context\nDetermine what to review from the user's prompt before asking follow-up questions.\n\n## Step 2: Review\nInspect the prepared review input and write findings.\n" }`
   - `config.taskState.currentFocusChainChecklist = "- [ ] Step 99: Missing Step"`
   - `config.services.stateManager.getApiConfiguration = () => ({ actModeApiProvider: "openai-native", planModeApiProvider: "openai-native" })`
6. Run:

```ts
const runner = new SubagentRunner(config)
const result = await runner.run("Continue the current review workflow.", () => {})
```

7. Assert:
   - `result.status === "completed"`
   - `createMessage.callCount === 1`

Do not activate the workflow through `use_skill` in this test. The task state must be pre-seeded so the mismatch between active workflow identity and unresolved prompt-context step details is the thing under test.

#### 3C. Add a direct continuation-turn prompt regression showing the deterministic branch remains correct when the workflow-name field is absent but the stable deterministic flag is true.

In [integration.test.ts:552-579](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L552), insert a new continuation-turn test immediately after `generates a PLAN-mode continuation prompt with multi-root and placeholder workflow`.

The new test title must be exactly:

```ts
it("uses deterministic continuation-turn guidance when the workflow-name field is absent but the deterministic flag is true", async function () {
```

The test must call `runPromptTest(...)` with this exact context override:

```ts
{
	...baseContext,
	providerInfo: { ...mockProviderInfo, mode: "act" },
	isContinuationTurn: true,
	currentFocusChainChecklist: "- [ ] Step 99: Missing Step",
	activeWorkflowSupportsPlaceholders: true,
	managedWorkflowActive: false,
	activePlaceholderWorkflowName: undefined,
	activePlaceholderWorkflowStepNumber: undefined,
	activeDeterministicPlaceholderWorkflowEnabled: true,
}
```

And must assert:

- `systemPrompt` includes:
  - `"CONTINUATION TURN"`
  - `"CURRENT TASK LIST"`
  - `"- Once you correctly complete the current step, the next step's details will be shown automatically."`
- `systemPrompt` does **not** include:
  - `"When the active step's \"Done Signal\" is true, use \`send_user_message\` tool call to briefly tell the user what step you are completing, and include \`task_progress\` with \`__COMPLETE_NEXT_STEP__\`. Use it only once in that assistant turn."`

Do not modify any snapshot assertions.

### Pause Point 3

Stop after Step 3 and report:

- the exact new `FocusChainManager` fallback test title
- the exact new `SubagentRunner` stable-gate test title
- the exact new continuation-turn integration test title
- confirmation that one test covers focus-chain fallback and one test covers subagent runtime context

Do not proceed until this checkpoint is reviewed.

## [ ] Step 4: Validation

### Allowed Files

- no source edits unless a validation failure directly identifies a defect in one of the files allowed by Steps 1-3

### Exact Commands

Run exactly these commands, in this order:

1. `npm run test:unit -- --exit src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
2. `npm run test:unit -- --exit src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
3. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/integration.test.ts`
4. `npx tsc --noEmit`

If all four pass, stop.

If any command fails:

- fix only the files already listed in Steps 1-3
- rerun only the failing command until it passes
- then rerun all four commands in the original order

Do not update snapshots during this plan. If any snapshot change appears necessary, stop and ask for input before proceeding.

### Pause Point 4

Stop after Step 4 and report:

- the pass/fail result for each command in order
- any files changed during validation repair, if any
- confirmation that no snapshots were updated

Do not proceed beyond this plan.
