---
title: Placeholder Workflow Current-Step Migration Remediation Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, stop, then read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - Do not widen scope beyond the allowed-files list for the current step.
  - If any ambiguity is discovered, or any code/test/snapshot change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Placeholder Workflow Current-Step Migration Remediation Action Plan

This plan remediates the QA findings against the current-step migration implemented from [current-step-migration-input-section.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompts/placeholder-workflow-prompts/current-step-migration-input-section.md).

Locked scope:
- Correct the stale placeholder-workflow task-progress contract so it matches the shipped runtime behavior.
- Repair the stale and invalid regression tests called out by QA.
- Add one true end-to-end persistence regression for the main-task `loadContext(...)` path.

Out of scope:
- Reworking the migrated runtime transport again.
- Changing `src/core/prompts/system-prompt/components/continuation_turn.ts`.
- Changing managed-workflow prompting or tests beyond what is necessary to keep existing suites passing.
- Adding new prompt wording beyond the one stale placeholder-workflow task-progress sentence identified by QA.

## Step 1
[x] Fix the stale placeholder-workflow task-progress contract and its direct unit test.

Allowed files:
- `src/core/prompts/system-prompt/components/task_progress.ts`
- `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`

Exact edits:
1. In [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L31), replace this line inside `UPDATING_TASK_PROGRESS_PLACEHOLDER_WORKFLOW`:

```ts
- Instructions are automatically sent for the first incomplete item on the checklist each turn.
```

with this exact line:

```ts
- Detailed instructions are automatically sent when a checklist item first becomes the active step.
```

2. Do not change any other line in `UPDATING_TASK_PROGRESS_PLACEHOLDER_WORKFLOW`.

3. In [task_progress.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts#L53), replace the stale assertion:

```ts
			expect(progress).to.contain("Instructions are automatically sent for the first incomplete item on the checklist")
```

with:

```ts
			expect(progress).to.contain("Detailed instructions are automatically sent when a checklist item first becomes the active step.")
```

4. Do not change any other assertion in `task_progress.test.ts`.

## Step 2
[x] Repair the `loadContext(...)` regression fixture, fix the stale transport assertions, and add a real persistence regression through `loadContext(...)`.

Allowed files:
- `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits in `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`:
1. In `createFakeTask(...)` at [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L102), replace the current Step 2 empty body:

```md
## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
```

with this exact Step 2 body:

```md
## Step 2: System-Owned Diff Source Resolution And Diff Output Persistence
You are in the fallback path because the system-owned workflow-form path was not completed.

Use `build_review_diff_output` whenever a supported source is discovered.
```

2. In the `"resolves a pending workflow form before generating focus-chain prompt injections"` test at [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L324), change:
   - `const [, promptInjectionBlocks] = await loadContext.call(...` to `const [processedUserContent, promptInjectionBlocks] = await loadContext.call(...`
   - add `const userText = collectTextValues(processedUserContent).join("\n")` immediately before `const promptInjectionText = ...`
   - replace the assertion that `promptInjectionText` contains `You are currently on this step: Step 3: Construct & Persist Review Input File` with an assertion that `userText` contains that exact string

3. In the `"builds the first AI prompt from the fully settled code-review system-owned chain"` test at [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L424), change:
   - `const [, promptInjectionBlocks] = await loadContext.call(...` to `const [processedUserContent, promptInjectionBlocks] = await loadContext.call(...`
   - add `const userText = collectTextValues(processedUserContent).join("\n")` immediately before `const promptInjectionText = ...`
   - keep the existing `promptInjectionText` assertions that exclude the fallback-path line and exclude Step 1 through Step 4 current-step lines
   - add this new assertion immediately after the existing Step 1 through Step 4 exclusions:

```ts
			expect(userText).to.contain(
				"You are currently on this step: Step 5: Use Subagents for Specialized Reviews, then Collect Findings",
			)
```

4. Do not change the existing compact-turn regression in this file.

5. In `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`, add `import * as disk from "@core/storage/disk"` at the top with the other imports.

6. Immediately after the existing compact-turn regression in `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`, insert this new end-to-end persistence regression exactly:

```ts
	it("persists the last prompted placeholder workflow checklist label when loadContext injects a new active step", async () => {
		const sandbox = sinon.createSandbox()
		try {
			sandbox.stub(disk, "getTaskMetadata").resolves({
				files_in_context: [],
				model_usage: [],
				environment_history: [],
			} as never)
			const saveTaskMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const fakeTask = createFakeTask()
			Object.setPrototypeOf(fakeTask, Task.prototype)
			fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = "Step 1: Determine Review Source"
			fakeTask.taskState.currentFocusChainChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
			].join("\n")

			const [processedUserContent] = await loadContext.call(
				fakeTask,
				[
					{
						type: "tool_result",
						tool_use_id: "tool-1",
						content: [{ type: "text", text: "Review input available." }],
					},
				],
				false,
				false,
				false,
			)

			const userText = collectTextValues(processedUserContent).join("\n")
			expect(userText).to.contain(
				"You are currently on this step: Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
			)
			expect(saveTaskMetadataStub.called).to.equal(true)
			const savedLabels = saveTaskMetadataStub
				.getCalls()
				.map((call) => call.args[1].lastPromptedPlaceholderWorkflowChecklistLabel)
				.filter((value) => value !== undefined)
			expect(savedLabels).to.include("Step 2: System-Owned Diff Source Resolution And Diff Output Persistence")
		} finally {
			sandbox.restore()
		}
	})
```

Exact edits in `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`:
1. Delete the entire false-confidence test at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L189) whose title currently begins:

```ts
	it("persists the last prompted placeholder workflow checklist label after load-context input injection changes it", async () => {
```

2. Do not replace that deleted test in this file. The real end-to-end persistence regression now lives in `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`, where the `loadContext(...)` harness already exists.

3. Do not leave any test title in this file claiming `loadContext` behavior unless the test actually calls `loadContext(...)`.

## Step 3
[x] Repair the `FocusChainManager` tests so status-only assertions stay on `generateFocusChainInstructions()` and step-detail assertions move to the one-shot helper.

Allowed files:
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`

Exact edits:
1. In the `"renders stored dynamic placeholder values before extracting the current step"` test at [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L254), replace:

```ts
				const prompt = await manager.generateFocusChainInstructions()
```

with:

```ts
				const prompt = await manager.consumeCurrentPlaceholderWorkflowStepPromptForInput()
```

Then add:

```ts
				expect(prompt).to.contain("# CURRENT WORKFLOW STEP")
```

before the existing rendered-value assertions.

2. In the `"renders stored stable placeholder values before extracting the current step"` test at [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L296), make the same change:
   - switch from `generateFocusChainInstructions()` to `consumeCurrentPlaceholderWorkflowStepPromptForInput()`
   - add `expect(prompt).to.contain("# CURRENT WORKFLOW STEP")` before the existing value assertions

3. In the code-review Step 3 fallback-path test at [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L505), replace:

```ts
				const prompt = await manager.generateFocusChainInstructions()
```

with:

```ts
				const prompt = await manager.consumeCurrentPlaceholderWorkflowStepPromptForInput()
```

and add:

```ts
				expect(prompt).to.contain("# CURRENT WORKFLOW STEP")
```

before the existing fallback-path content assertions.

4. In this step, do not change the tests that intentionally validate status-only fallback behavior through `generateFocusChainInstructions()`, including:
   - `"falls back to the generic reminder for non-deterministic workflows when step details cannot be resolved"`
   - `"suppresses manual task_progress fallback text for deterministic workflows when step details cannot be resolved"`

## Step 4
[x] Repair the subagent transport tests so one-shot current-step content is asserted in user input, not in the system prompt.

Allowed files:
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

Exact edits:
1. In the non-Responses placeholder-workflow continuation test at [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1340), keep the existing initial-turn transport assertions as they are now, but in the second-turn assertions:
   - keep `followUpTexts` asserting no `# CURRENT WORKFLOW STEP`
   - keep `secondSystemPrompt` asserting `CONTINUATION TURN`, `### Reminder:`, and `Current Progress: 0/2 items completed`
   - ensure `secondSystemPrompt` does **not** assert `# CURRENT WORKFLOW STEP`

2. In the OpenAI Responses placeholder-injection test at [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1528), keep the existing initial-turn transport assertions as they are now, but in the second-turn assertions:
   - keep `followUpTexts` asserting no current-step block
   - keep `secondSystemPrompt` asserting reminder/progress content
   - ensure `secondSystemPrompt` does **not** assert `# CURRENT WORKFLOW STEP`

3. In the `"uses refreshed checklist state for later subagent workflow/current-step prompt generation after task_progress updates"` test at [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L2149), change the second-turn expectations so they assert:
   - `followUpTexts` contains `You are currently on this step: Step 2: Review`
   - `followUpTexts` does **not** contain `You are currently on this step: Step 1: Gather Context`
   - `_systemPrompt` still contains `Current Progress: 1/2 items completed`
   - `_systemPrompt` does **not** contain either Step 1 or Step 2 `You are currently on this step:` lines

4. In this step, do not change the tests’ checklist-progress expectations outside the current-step transport move.

## Step 5
[x] Repair the six uncovered regression failures from the first focused regression-suite execution without widening scope beyond the already-audited seams.

Allowed files:
- `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

Exact edits in `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`:
1. In the `LoadContextTaskHarness` type at [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L12), add:

```ts
	taskId: string
```

immediately before `ulid: string`.

2. In the same type, change:

```ts
	persistLastPromptedPlaceholderWorkflowChecklistLabel: sinon.SinonStub
```

to:

```ts
	persistLastPromptedPlaceholderWorkflowChecklistLabel: () => Promise<void>
```

3. In `createFakeTask(...)` at [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L92), add:

```ts
		taskId: "task-load-context-placeholder",
```

immediately before `ulid: "test-ulid",`.

4. In the `"persists the last prompted placeholder workflow checklist label when loadContext injects a new active step"` test at [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L336), insert this exact assignment immediately after `Object.setPrototypeOf(fakeTask, Task.prototype)`:

```ts
			fakeTask.persistLastPromptedPlaceholderWorkflowChecklistLabel = Reflect.get(
				Task.prototype,
				"persistLastPromptedPlaceholderWorkflowChecklistLabel",
			).bind(fakeTask)
```

5. Do not change any other `loadContext.placeholderWorkflow.test.ts` assertion in this step.

Exact edits in `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`:
1. In the `"renders placeholder workflow status without embedding current-step details in focus-chain instructions"` test at [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L58), delete this assertion:

```ts
			expect(prompt).to.contain(
				"Once you correctly complete this step, the next step's details will be shown automatically.",
			)
```

2. In the same test, insert this assertion in its place:

```ts
			expect(prompt).to.contain(
				"Once you correctly complete the current step, the next step's details will be shown automatically.",
			)
```

3. In the same test, keep:

```ts
			expect(prompt).to.not.contain("task_progress")
```

4. In the `"falls back to the generic reminder for non-deterministic workflows when step details cannot be resolved"` test at [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L348), replace:

```ts
		expect(prompt).to.contain('If you finish the current checklist step, include "task_progress" in your next tool call')
```

with:

```ts
		expect(prompt).to.contain("Keep `task_progress` moving so the active step and its details stay in sync.")
```

5. In the `"suppresses manual task_progress fallback text for deterministic workflows when step details cannot be resolved"` test at [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L365), replace:

```ts
			expect(prompt).to.contain("This turn could not resolve the current deterministic workflow step details")
```

with:

```ts
			expect(prompt).to.contain(
				"This turn could not resolve the current deterministic workflow step details, so do not advance the checklist manually. Continue the current step work and wait for the next step's details to be shown automatically.",
			)
```

6. In the same deterministic-fallback test, keep:

```ts
			expect(prompt).to.not.contain("Keep `task_progress` moving")
```

7. Do not change the `expect(prompt).to.not.contain("# CURRENT WORKFLOW STEP")` assertions in either fallback test.

Exact edits in `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`:
1. In the `"keeps placeholder-workflow activation first-turn-only while relocating prompt injections into the system prompt for non-Responses subagents"` test at [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1346), insert these two assertions immediately after `assert.match(initialTexts, /# CURRENT WORKFLOW STEP/)`:

```ts
		assert.match(initialTexts, /Inspect the provided bundle before running tools\./)
		assert.doesNotMatch(initialTexts, /Review the changed implementation for edge cases\./)
```

2. In the same test, replace:

```ts
		assert.match(firstSystemPrompt, /Inspect the provided bundle before running tools\./)
		assert.doesNotMatch(firstSystemPrompt, /Review the changed implementation for edge cases\./)
```

with:

```ts
		assert.doesNotMatch(firstSystemPrompt, /Inspect the provided bundle before running tools\./)
		assert.doesNotMatch(firstSystemPrompt, /Review the changed implementation for edge cases\./)
```

3. In the `"moves placeholder workflow prompt injections into the system prompt for OpenAI Responses subagents"` test at [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1529), insert these two assertions immediately after `assert.match(initialTexts, /# CURRENT WORKFLOW STEP/)`:

```ts
		assert.match(initialTexts, /Inspect the provided bundle before running tools\./)
		assert.doesNotMatch(initialTexts, /Review the changed implementation for edge cases\./)
```

4. In the same OpenAI Responses test, replace:

```ts
		assert.match(firstSystemPrompt, /Inspect the provided bundle before running tools\./)
		assert.doesNotMatch(firstSystemPrompt, /Review the changed implementation for edge cases\./)
```

with:

```ts
		assert.doesNotMatch(firstSystemPrompt, /Inspect the provided bundle before running tools\./)
		assert.doesNotMatch(firstSystemPrompt, /Review the changed implementation for edge cases\./)
```

5. Do not change any second-turn continuation assertions in these two tests during this step.

## Step 6
[ ] Run the focused regression suites and update the remediation document only after the command passes.

Allowed files:
- `docs/system-prompts/placeholder-workflow-prompts/current-step-migration-remediation-action-plan.md`

Required command:

```bash
npm run test:unit -- \
  src/core/prompts/system-prompt/__tests__/task_progress.test.ts \
  src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts \
  src/core/task/__tests__/placeholderWorkflowPersistence.test.ts \
  src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts \
  src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts
```

Exact checks:
1. If the command fails for any reason not already covered by Steps 1-5, stop and ask for input before widening scope.
2. If the command passes, change this step’s checkbox to `[x]`.
3. Do not add any additional remediation steps unless a failure proves they are strictly necessary.
