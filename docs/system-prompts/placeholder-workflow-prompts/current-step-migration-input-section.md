---
title: Placeholder Workflow Current-Step Input Migration Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, stop, then read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - Do not widen scope beyond the allowed-files list for the current step.
  - If any ambiguity is discovered, or any code/test/snapshot change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - Preserve existing prompt wording unless a step below explicitly prescribes a wording change.
---

# Context
- The OpenAI Responses API does not maintain system instructions prompting in conversation context, which means that system instructions must be re-provided each turn.
- When a placeholder workflow is active, the detailed instructions for the current step are provided in the system instructions prompt section
- Separately, the system maintains a task list for active workflows through a capability called focus chain.
- When a focus chain is active, the focus chain is enabled by a step-level checklist in a markdown file.
- That file is the source of truth for what step a workflow is on

# Problem Being Solved
- Some "current step" workflow instructions are long, and agents often work within a single step for many turns
- The "current step" instructions have to be re-sent each turn because they are currently carried in system instructions
- This repeated send of "current step" instructions is a large contributor to overall token consumption during workflows

# Desired Update
- Migrate "current step" prompting back to the input section of the prompt
- Instead of sending the "current step" prompting every turn, only send it on the first turn that the step is active
- Update the "current step" prompting so that it carries the same step number and title that gets used in the focus chain markdown file
- Implement this update for both primary agents and subagents.

# Known Risks
- Step progression must occur before prompt assembly begins
- System must be able to identify the current step from the focus chain markdown file when building the prompt
- System must be able to inject the "current step" details in the input section ONLY on the first turn in which the step is the active current step
- System must stop showing "current step" details once there is not an active current step
- Managed workflows are out of scope

## Remediation Issues
- current step details can get compacted or truncated once in conversation history
- clear lastPromptedPlaceholderWorkflowChecklistLabel when context was compacted

# Action Plan

This plan implements the current-step migration described above without redesigning placeholder-workflow prompting.

Locked decisions:
- Only the `### CURRENT WORKFLOW STEP` block moves back to input transport.
- Checklist/progress/reminder/auto-completed workflow sections stay in the existing system-prompt prompt-injection path.
- Step identity for first-turn-only injection is determined by the existing `activePlaceholderWorkflowId` plus a new retained `lastPromptedPlaceholderWorkflowChecklistLabel`.
- The retained checklist label must update only after a current-step block is successfully built; transient resolution failures must continue retrying on later turns for the same checklist label.
- The retained checklist label is persisted only for the primary task loop. Subagent step-tracking remains in subagent `TaskState` only, because `SubagentRunner` creates isolated `TaskState` instances while its `FocusChainManager` is keyed to the parent task id for checklist storage.
- Compact turns must preserve the current `!useCompactPrompt` gating and must not begin receiving current-step input blocks in this update.
- Managed workflows remain out of scope.

Out of scope:
- `src/core/prompts/system-prompt/components/continuation_turn.ts`
- changing continuation-turn reminder wording
- changing placeholder-workflow activation prompting
- changing managed-workflow prompting
- changing checklist rendering format
- changing deterministic progression rules

## Step 1
[x] Add the retained checklist-label state and wire the primary-task persistence/clear paths.

Allowed files:
- `src/core/task/TaskState.ts`
- `src/core/context/context-tracking/ContextTrackerTypes.ts`
- `src/core/task/workflow-activation.ts`
- `src/core/task/index.ts`
- `src/core/task/tools/handlers/UseSkillToolHandler.ts`

Exact edits:
1. In `src/core/task/TaskState.ts` at the task-initialization block around lines 148-158, insert this field immediately after `activePlaceholderWorkflowTaskWriteProofPaths: string[] = []`:

```ts
	lastPromptedPlaceholderWorkflowChecklistLabel?: string
```

2. In `src/core/context/context-tracking/ContextTrackerTypes.ts` at the `TaskMetadata` interface around lines 44-50, insert this field immediately after `activePlaceholderWorkflowTaskWriteProofPaths?: string[]`:

```ts
	lastPromptedPlaceholderWorkflowChecklistLabel?: string
```

3. In `src/core/task/workflow-activation.ts`:
Add `args.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined` inside `activateManagedWorkflowInTaskState(...)` immediately after `args.taskState.activePlaceholderWorkflowTaskWriteProofPaths = []`.

4. In `src/core/task/workflow-activation.ts` inside `activatePlaceholderWorkflowInTaskState(...)`, add `args.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined` inside the existing `if (workflowChanged) { ... }` block immediately after `args.taskState.activePlaceholderWorkflowTaskWriteProofPaths = []`.

5. In `src/core/task/index.ts`:
At `teardownCompletedPlaceholderWorkflow()` around lines 1529-1538, add `this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined` immediately after `this.taskState.activePlaceholderWorkflowTaskWriteProofPaths = []`.

6. In `src/core/task/index.ts` at `persistClearedPlaceholderWorkflowMetadata()` around lines 1547-1560, set the new metadata field immediately after `taskMetadata.activePlaceholderWorkflowTaskWriteProofPaths = ...`:

```ts
			taskMetadata.lastPromptedPlaceholderWorkflowChecklistLabel =
				this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel
```

7. In `src/core/task/index.ts` at `restoreBmadStateFromMetadata()` around lines 2243-2255, restore the new field immediately after `this.taskState.activePlaceholderWorkflowTaskWriteProofPaths = ...`:

```ts
			this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel =
				metadata.lastPromptedPlaceholderWorkflowChecklistLabel
```

8. In `src/core/task/index.ts` inside `applyPersistentSlashCommandAction(...)` around lines 2020-2029, add `this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined` in the `!activation` placeholder-activation fallback block immediately after `this.taskState.activePlaceholderWorkflowTaskWriteProofPaths = []`.

9. In `src/core/task/index.ts` inside the `activate_bmad_agent` branch around lines 2051-2062, add `this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined` immediately after `this.taskState.activePlaceholderWorkflowTaskWriteProofPaths = []`.

10. In `src/core/task/index.ts` inside the final `else` branch around lines 2073-2084, add `this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined` immediately after `this.taskState.activePlaceholderWorkflowTaskWriteProofPaths = []`.

11. In `src/core/task/index.ts` inside the metadata save block at lines 2091-2109, set the new metadata field immediately after `taskMetadata.activePlaceholderWorkflowTaskWriteProofPaths = ...`:

```ts
			taskMetadata.lastPromptedPlaceholderWorkflowChecklistLabel =
				this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel
```

12. In `src/core/task/tools/handlers/UseSkillToolHandler.ts`:
In the managed-workflow persistence block at lines 106-116, set `metadata.lastPromptedPlaceholderWorkflowChecklistLabel = config.taskState.lastPromptedPlaceholderWorkflowChecklistLabel` immediately after `metadata.activePlaceholderWorkflowValues = ...`.

13. In `src/core/task/tools/handlers/UseSkillToolHandler.ts`:
In the placeholder-workflow persistence block at lines 162-172, set `metadata.lastPromptedPlaceholderWorkflowChecklistLabel = config.taskState.lastPromptedPlaceholderWorkflowChecklistLabel` immediately after `metadata.activePlaceholderWorkflowValues = ...`.

14. In `src/core/task/tools/handlers/UseSkillToolHandler.ts` inside the generic-skill activation branch at lines 260-267, add `config.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined` immediately after `config.taskState.activePlaceholderWorkflowDeterministicState = undefined`.

15. Do not add the new metadata field to any other save path in this step.

## Step 2
[x] Split placeholder current-step prompting out of `generateFocusChainInstructions()` and into a reusable one-shot input helper.

Allowed files:
- `src/core/workflows/placeholder-workflow-step-details.ts`
- `src/core/task/focus-chain/index.ts`

Exact edits in `src/core/workflows/placeholder-workflow-step-details.ts`:
1. Immediately after `getActivePlaceholderWorkflowStepDetails(...)` ends at line 164, insert this exported helper exactly:

```ts
export function getActivePlaceholderWorkflowChecklistLabel(checklistMarkdown: string): string | undefined {
	return getFirstIncompleteChecklistItem(checklistMarkdown)?.label
}
```

Exact edits in `src/core/task/focus-chain/index.ts`:
1. Update the import from `@/core/workflows/placeholder-workflow-step-details` at lines 7-10 so it imports `getActivePlaceholderWorkflowChecklistLabel` together with `buildPlaceholderWorkflowChecklist` and `getActivePlaceholderWorkflowStepDetails`.

2. In `generateFocusChainInstructions()` at lines 263-268, replace:

```ts
			const placeholderWorkflowStepPrompt = await this.buildPlaceholderWorkflowStepPrompt(
				this.taskState.currentFocusChainChecklist,
				listCurrentProgress,
			)
			if (placeholderWorkflowStepPrompt) {
				return this.joinPromptSections("# CURRENT WORKFLOW STATUS", placeholderWorkflowStepPrompt)
			}
```

with:

```ts
			const placeholderWorkflowStatusPrompt = await this.buildPlaceholderWorkflowStatusPrompt(
				this.taskState.currentFocusChainChecklist,
				listCurrentProgress,
			)
			if (placeholderWorkflowStatusPrompt) {
				return this.joinPromptSections("# CURRENT WORKFLOW STATUS", placeholderWorkflowStatusPrompt)
			}
```

3. Rename `private async buildPlaceholderWorkflowStepPrompt(...)` at lines 350-438 to `private async buildPlaceholderWorkflowStatusPrompt(...)`.

4. Inside that renamed method, delete the entire `getActivePlaceholderWorkflowStepDetails(...)` resolution block, the `placeholder_step_prompt_resolution` diagnostic logging, the unresolved-placeholder logging, and the `currentStepBody` assembly. Replace the method body after the early `!this.taskState.activePlaceholderWorkflowSource` return with this exact logic:

```ts
		const userUpdatedWarning = this.taskState.todoListWasUpdatedByUser
			? "**CRITICAL INFORMATION:** I updated this checklist manually. Review the current checklist carefully before you continue."
			: ""
		const deterministicWorkflowSupported = isDeterministicPlaceholderWorkflowSupported(
			this.taskState.activePlaceholderWorkflowSource.name,
		)
		const autoCompletedNoticeSection = await this.consumeAutoCompletedPlaceholderWorkflowNoticesForPrompt()

		return this.joinPromptSections(
			deterministicWorkflowSupported
				? "### Reminder: Detailed instructions are shown for the first incomplete checklist item. Once you correctly complete the current step, the next step's details will be shown automatically."
				: "### Reminder: Detailed instructions are shown for the first incomplete checklist item. Keep `task_progress` moving so the active step and its details stay in sync.",
			listCurrentProgress,
			this.renderChecklistForPrompt(currentChecklist),
			userUpdatedWarning,
			autoCompletedNoticeSection,
		)
```

5. Immediately after `buildPlaceholderWorkflowStatusPrompt(...)`, insert this new public helper exactly:

```ts
	public async consumeCurrentPlaceholderWorkflowStepPromptForInput(): Promise<string | undefined> {
		if (this.taskState.managedWorkflowRun) {
			this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined
			return undefined
		}

		const currentChecklist = this.taskState.currentFocusChainChecklist
		if (!this.taskState.activePlaceholderWorkflowSource || !currentChecklist) {
			this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined
			return undefined
		}

		const activeChecklistLabel = getActivePlaceholderWorkflowChecklistLabel(currentChecklist)
		if (!activeChecklistLabel) {
			this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined
			return undefined
		}

		if (this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel === activeChecklistLabel) {
			return undefined
		}

		try {
			const stepDetails = await getActivePlaceholderWorkflowStepDetails({
				checklistMarkdown: currentChecklist,
				source: this.taskState.activePlaceholderWorkflowSource,
				stablePlaceholderValues: this.taskState.activePlaceholderWorkflowStableValues,
				placeholderValues: this.taskState.activePlaceholderWorkflowValues,
			})
			if (!stepDetails) {
				logFocusChainDiagnosticEvent(this.taskId, "placeholder_step_prompt_resolution", {
					entered: true,
					resolved: false,
					reason: "no_step_details",
					hasActivePlaceholderWorkflowSource: !!this.taskState.activePlaceholderWorkflowSource,
					currentChecklistItems: parseFocusChainListCounts(currentChecklist).totalItems,
				})
				return undefined
			}

			const unresolvedPlaceholders = findUnresolvedWorkflowPlaceholders(stepDetails.details)
			logFocusChainDiagnosticEvent(this.taskId, "placeholder_step_prompt_resolution", {
				entered: true,
				resolved: true,
				checklistLabel: stepDetails.checklistLabel,
				hasActivePlaceholderWorkflowSource: !!this.taskState.activePlaceholderWorkflowSource,
				currentChecklistItems: parseFocusChainListCounts(currentChecklist).totalItems,
				unresolvedPlaceholderCount: unresolvedPlaceholders.length,
				unresolvedPlaceholders: unresolvedPlaceholders.length > 0 ? unresolvedPlaceholders : undefined,
			})

			this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = activeChecklistLabel

			if (isDeterministicPlaceholderWorkflowSupported(stepDetails.sourceName)) {
				return [
					"### CURRENT WORKFLOW STEP",
					`You are currently on this step: ${stepDetails.checklistLabel}`,
					stepDetails.details.trim(),
					"Focus on correctly completing this step.",
					"Once you correctly complete this step, the next step's details will be shown automatically.",
				].join("\n\n")
			}

			return [
				"### CURRENT WORKFLOW STEP",
				`You are currently on this step: ${stepDetails.checklistLabel}`,
				stepDetails.details.trim(),
				"Focus on completing this step.",
				"I determine the active step from your latest `task_progress` update.",
				'Do not include `task_progress` on a tool call until the active step\'s "Done Signal" is true.',
				'When the active step\'s "Done Signal" is true, use `task_progress` with `__COMPLETE_NEXT_STEP__` on the next relevant tool call, and use it only once in that assistant turn.',
				"Once the checklist advances, I'll give you the next step's details.",
			].join("\n\n")
		} catch (error) {
			logFocusChainDiagnosticEvent(this.taskId, "placeholder_step_prompt_resolution", {
				entered: true,
				resolved: false,
				reason: "error",
				errorMessage: error instanceof Error ? error.message : String(error),
				hasActivePlaceholderWorkflowSource: !!this.taskState.activePlaceholderWorkflowSource,
				currentChecklistItems: parseFocusChainListCounts(currentChecklist).totalItems,
			})
			Logger.warn(`[Task ${this.taskId}] Failed to resolve workflow step details`, error)
			return undefined
		}
	}
```

6. In `shouldIncludeFocusChainInstructions()` at lines 826-827, replace the existing two-line comment:

```ts
		// Always include when a placeholder workflow is active so the checklist and current-step details
		// remain present on every turn after activation.
```

with:

```ts
		// Always include when a placeholder workflow is active so checklist guidance remains
		// present on every turn while the workflow is active.
```

7. Do not change any reminder wording, checklist rendering, or notice wording in this step.

## Step 3
[x] Inject the one-shot current-step block into main-task input and persist checklist-label changes to task metadata.

Allowed files:
- `src/core/task/index.ts`
- `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits in `src/core/task/index.ts`:
1. Immediately after `restorePlaceholderWorkflowChecklistFromDiskIfNeeded()` ends at line 2268, insert this new private helper exactly:

```ts
	private async persistLastPromptedPlaceholderWorkflowChecklistLabel(): Promise<void> {
		try {
			const metadata = await getTaskMetadata(this.taskId)
			metadata.lastPromptedPlaceholderWorkflowChecklistLabel =
				this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel
			await saveTaskMetadata(this.taskId, metadata)
		} catch {
			// Non-fatal: the in-memory current-step marker remains canonical for the active turn.
		}
	}
```

2. In `loadContext(...)` at lines 5032-5035, leave the existing `requestHasHumanAuthoredInput` and `shouldSendFullPromptAssembly` logic unchanged.

3. Immediately after `this.currentRequestShouldSendFullPromptAssembly = shouldSendFullPromptAssembly` at line 5035, insert this block exactly:

```ts
		if (!useCompactPrompt) {
			const previousPromptedChecklistLabel = this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel
			const currentStepInputPrompt = await this.FocusChainManager?.consumeCurrentPlaceholderWorkflowStepPromptForInput()
			if (currentStepInputPrompt?.trim()) {
				processedUserContent.push({
					type: "text",
					text: currentStepInputPrompt,
				})
			}
			if (this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel !== previousPromptedChecklistLabel) {
				await this.persistLastPromptedPlaceholderWorkflowChecklistLabel()
			}
		}
```

4. Do not move this block above `requestHasHumanAuthoredInput`; the current-step injection must not affect human-input detection or continuation-turn selection.

5. Do not append the current-step block to `promptInjectionBlocks`.

Exact edits in `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`:
1. In the first test at lines 214-224, keep the assertions that `ENVIRONMENT: reduced`, `# CURRENT WORKFLOW STATUS`, `### Reminder:`, `Current Progress: 0/2 items completed`, and `- [ ] Step 1: Determine Review Source` stay in `promptInjectionText`, but replace the current-step assertions so that:
   - `userText` contains `# CURRENT WORKFLOW STEP`
   - `userText` contains `You are currently on this step: Step 1: Determine Review Source`
   - `promptInjectionText` does **not** contain `# CURRENT WORKFLOW STEP`

2. In the second test at lines 250-260, make the same transport change:
   - `userText` contains `# CURRENT WORKFLOW STEP`
   - `userText` contains `You are currently on this step: Step 1: Determine Review Source`
   - `promptInjectionText` still contains `# AUTO-COMPLETED WORKFLOW STEPS`
   - `promptInjectionText` does **not** contain `# CURRENT WORKFLOW STEP`

3. Immediately after the second test, insert this new regression test exactly:

```ts
	it("does not re-inject current-step details into input when the active checklist label was already prompted", async () => {
		const fakeTask = createFakeTask()
		fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = "Step 1: Determine Review Source"
		const userContent: ClineContent[] = [
			{
				type: "tool_result",
				tool_use_id: "tool-1",
				content: [{ type: "text", text: "Review input available." }],
			},
		]

		const [processedUserContent, promptInjectionBlocks] = await loadContext.call(fakeTask, userContent, false, false, false)
		const userText = collectTextValues(processedUserContent).join("\n")
		const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")

		expect(userText).to.not.contain("# CURRENT WORKFLOW STEP")
		expect(promptInjectionText).to.not.contain("# CURRENT WORKFLOW STEP")
		expect(promptInjectionText).to.contain("# CURRENT WORKFLOW STATUS")
	})
```

4. Immediately after that new test, insert this additional regression test exactly:

```ts
	it("injects the next step into input when the checklist advances to a new active label", async () => {
		const fakeTask = createFakeTask()
		fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = "Step 1: Determine Review Source"
		fakeTask.taskState.currentFocusChainChecklist = [
			"- [x] Step 1: Determine Review Source",
			"- [ ] Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
		].join("\n")

		const userContent: ClineContent[] = [
			{
				type: "tool_result",
				tool_use_id: "tool-1",
				content: [{ type: "text", text: "Review input available." }],
			},
		]

		const [processedUserContent, promptInjectionBlocks] = await loadContext.call(fakeTask, userContent, false, false, false)
		const userText = collectTextValues(processedUserContent).join("\n")
		const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")

		expect(userText).to.contain("# CURRENT WORKFLOW STEP")
		expect(userText).to.contain(
			"You are currently on this step: Step 2: System-Owned Diff Source Resolution And Diff Output Persistence",
		)
		expect(promptInjectionText).to.not.contain("# CURRENT WORKFLOW STEP")
	})
```

5. Immediately after that new test, insert this compact-turn regression test exactly:

```ts
	it("does not inject current-step details on compact turns", async () => {
		const fakeTask = createFakeTask()
		const userContent: ClineContent[] = [
			{
				type: "tool_result",
				tool_use_id: "tool-1",
				content: [{ type: "text", text: "Review input available." }],
			},
		]

		const [processedUserContent, promptInjectionBlocks] = await loadContext.call(fakeTask, userContent, false, true, false)
		const userText = collectTextValues(processedUserContent).join("\n")
		const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")

		expect(userText).to.not.contain("# CURRENT WORKFLOW STEP")
		expect(promptInjectionText).to.not.contain("# CURRENT WORKFLOW STEP")
	})
```

6. In the workflow-form-settled test block at `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts` lines 324-350, change the destructuring to capture `processedUserContent` as well as `promptInjectionBlocks`, then:
   - build both `userText` and `promptInjectionText`
   - keep the assertion that `promptInjectionText` does not contain the fallback-path line
   - replace the existing assertion that `promptInjectionText` contains `You are currently on this step: Step 3: Construct & Persist Review Input File` with an assertion that `userText` contains that string

7. In the settled-first-AI-prompt test block at `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts` lines 424-450, change the destructuring to capture `processedUserContent` as well as `promptInjectionBlocks`, then:
   - build both `userText` and `promptInjectionText`
   - keep the existing `promptInjectionText` assertions that exclude the fallback-path line and exclude Step 1 through Step 4 current-step lines
   - add an assertion that `userText` contains `You are currently on this step: Step 5: Use Subagents for Specialized Reviews, then Collect Findings`

Exact edits in `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`:
1. In the `"restores activePlaceholderWorkflowSource from metadata and resumes step-specific prompting"` test near lines 105-173, add `lastPromptedPlaceholderWorkflowChecklistLabel: "Step 1: Gather Context",` to the fake metadata object immediately after `activePlaceholderWorkflowTaskWriteProofPaths`.

2. In that same test, immediately after the existing assertion for `activePlaceholderWorkflowTaskWriteProofPaths`, add:

```ts
			expect(fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel).to.equal("Step 1: Gather Context")
```

3. Immediately after that restore test, insert this new test exactly:

```ts
	it("persists the last prompted placeholder workflow checklist label after load-context input injection changes it", async () => {
		const sandbox = sinon.createSandbox()
		try {
			sandbox.stub(disk, "getTaskMetadata").resolves({
				files_in_context: [],
				model_usage: [],
				environment_history: [],
			} as never)
			const saveTaskMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const fakeTask = createFakeTask("task-persist-last-prompted-step") as FakeTaskBase & {
				FocusChainManager?: {
					consumeCurrentPlaceholderWorkflowStepPromptForInput: sinon.SinonStub
				}
			}
			Object.setPrototypeOf(fakeTask, Task.prototype)
			fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = "Step 1: Gather Context"
			fakeTask.FocusChainManager = {
				consumeCurrentPlaceholderWorkflowStepPromptForInput: sinon.stub().callsFake(async () => {
					fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = "Step 2: Review"
					return "### CURRENT WORKFLOW STEP\n\nYou are currently on this step: Step 2: Review"
				}),
			}

			await (Task.prototype as any).persistLastPromptedPlaceholderWorkflowChecklistLabel.call(fakeTask)

			expect(saveTaskMetadataStub.calledOnce).to.equal(true)
			expect(saveTaskMetadataStub.firstCall.args[1].lastPromptedPlaceholderWorkflowChecklistLabel).to.equal(
				"Step 2: Review",
			)
		} finally {
			sandbox.restore()
		}
	})
```

4. In the teardown/clear assertions block at lines 616-640, add expectations that both the in-memory state and saved metadata have `lastPromptedPlaceholderWorkflowChecklistLabel === undefined`.

5. In the `"restores activePlaceholderWorkflowSource from metadata and resumes step-specific prompting"` test near lines 169-175, replace the three current-step assertions with:
   - `expect(prompt).to.not.contain("# CURRENT WORKFLOW STEP")`
   - `expect(prompt).to.not.contain("You are currently on this step: Step 1: Gather Context")`
   - `expect(prompt).to.contain("# CURRENT WORKFLOW STATUS")`
   - `expect(prompt).to.contain("Current Progress: 0/2 items completed")`
   - `expect(prompt).to.contain("- [ ] Step 1: Gather Context")`

6. In the slash-activation restore test near lines 2253-2258, replace the three current-step assertions with:
   - `expect(prompt).to.not.contain("# CURRENT WORKFLOW STEP")`
   - `expect(prompt).to.not.contain("You are currently on this step: Step 1: Gather Context")`
   - `expect(prompt).to.contain("# CURRENT WORKFLOW STATUS")`
   - `expect(prompt).to.contain("Current Progress: 0/2 items completed")`
   - `expect(prompt).to.contain("- [ ] Step 1: Gather Context")`

## Step 4
[x] Inject the one-shot current-step block into subagent input turns and keep subagent state in-memory only.

Allowed files:
- `src/core/task/tools/subagent/SubagentRunner.ts`
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

Exact edits in `src/core/task/tools/subagent/SubagentRunner.ts`:
1. Immediately above `buildSubagentPromptInjectionBlocks(...)` at line 1174, insert this new helper exactly:

```ts
	private async maybeAppendCurrentStepInputPrompt(
		state: TaskState,
		content: ClineUserContent[],
	): Promise<void> {
		const prompt = await this.getOrCreateSubagentFocusChainManager(state).consumeCurrentPlaceholderWorkflowStepPromptForInput()
		if (prompt?.trim()) {
			content.push({
				type: "text",
				text: prompt,
			})
		}
	}
```

2. In the initial-conversation construction at lines 498-518, replace the inline `content: [ ... ]` array with:
   - `const initialUserContent: ClineUserContent[] = [ ...existing prompt block..., ...existing workspace metadata block if present... ]`
   - `await this.maybeAppendCurrentStepInputPrompt(state, initialUserContent)`
   - `content: initialUserContent`

3. Do not change the initial prompt text or workspace metadata block contents while making that refactor.

4. Immediately before the `conversation.push({ role: "user", content: toolResultBlocks })` call at lines 885-888, insert:

```ts
					await this.maybeAppendCurrentStepInputPrompt(state, toolResultBlocks)
```

5. Do not add any metadata persistence calls in `SubagentRunner.ts` for `lastPromptedPlaceholderWorkflowChecklistLabel`.

Exact edits in `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`:
1. In the non-Responses continuation test at lines 1345-1376:
   - change `initialTexts` assertions so it **does** match `# CURRENT WORKFLOW STEP`
   - change `firstSystemPrompt` assertions so it no longer matches `# CURRENT WORKFLOW STEP`
   - leave the continuation-turn status assertions intact
   - keep `followUpTexts` asserting no current-step block on the second turn
   - change `secondSystemPrompt` assertions so it no longer matches `# CURRENT WORKFLOW STEP`

2. In the prompt-refresh-frequency-zero test at lines 1449-1456, remove the expectation that the second system prompt contains `# CURRENT WORKFLOW STEP`.

3. In the OpenAI Responses placeholder-injection test at lines 1526-1561:
   - change `initialTexts` assertions so it matches `# CURRENT WORKFLOW STEP`
   - change `firstSystemPrompt` so it no longer matches `# CURRENT WORKFLOW STEP`
   - keep `followUpTexts` asserting no current-step block on the second turn
   - change `secondSystemPrompt` so it no longer matches `# CURRENT WORKFLOW STEP`

4. In the OpenAI Responses continuation-turn test at lines 1642-1651, remove the expectation that the second system prompt contains `# CURRENT WORKFLOW STEP`.

5. Do not change any of the existing `CONTINUATION TURN`, checklist, or reminder assertions in those tests.

## Step 5
[x] Add focused regressions for one-shot step prompting and update focus-chain expectations to status-only output.

Allowed files:
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`

Exact edits:
1. In the first test, rename the description from `"injects current-step details for a placeholder workflow when they can be resolved"` to `"renders placeholder workflow status without embedding current-step details in focus-chain instructions"`.

2. In that renamed test at lines 60-67, replace the current-step expectations so that:
   - the prompt still contains `# CURRENT WORKFLOW STATUS`
   - the prompt still contains the reminder line, fenced checklist, and `- [ ] Step 1: Gather Context`
   - the prompt does **not** contain `# CURRENT WORKFLOW STEP`
   - the prompt does **not** contain `Determine what to review from the user's prompt before asking follow-up questions.`

3. Immediately after that renamed test, insert this new regression test exactly:

```ts
	it("returns the current-step block only once per active checklist label", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-current-step-input-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		await fs.writeFile(
			workflowPath,
			`# Review Workflow

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.
`,
			"utf8",
		)

		try {
			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
			}
			taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

			const manager = new FocusChainManager(createDependencies(taskState))
			const firstPrompt = await manager.consumeCurrentPlaceholderWorkflowStepPromptForInput()
			const secondPrompt = await manager.consumeCurrentPlaceholderWorkflowStepPromptForInput()

			expect(firstPrompt).to.contain("# CURRENT WORKFLOW STEP")
			expect(firstPrompt).to.contain("You are currently on this step: Step 1: Gather Context")
			expect(secondPrompt).to.equal(undefined)
			expect(taskState.lastPromptedPlaceholderWorkflowChecklistLabel).to.equal("Step 1: Gather Context")

			taskState.currentFocusChainChecklist = "- [x] Step 1: Gather Context\n- [ ] Step 2: Review"

			const thirdPrompt = await manager.consumeCurrentPlaceholderWorkflowStepPromptForInput()

			expect(thirdPrompt).to.contain("You are currently on this step: Step 2: Review")
			expect(taskState.lastPromptedPlaceholderWorkflowChecklistLabel).to.equal("Step 2: Review")

			taskState.currentFocusChainChecklist = "- [x] Step 1: Gather Context\n- [x] Step 2: Review"

			const completedPrompt = await manager.consumeCurrentPlaceholderWorkflowStepPromptForInput()

			expect(completedPrompt).to.equal(undefined)
			expect(taskState.lastPromptedPlaceholderWorkflowChecklistLabel).to.equal(undefined)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})
```

4. Immediately after that new test, insert this additional regression test exactly:

```ts
	it("retries current-step resolution on later turns when step details were previously unresolved", async () => {
		const taskState = new TaskState()
		taskState.activePlaceholderWorkflowId = "code-review.md"
		taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "code-review.md",
			contents: "## Step 9: Ship It\nFinish the release.",
		}
		taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"

		const manager = new FocusChainManager(createDependencies(taskState))
		const firstPrompt = await manager.consumeCurrentPlaceholderWorkflowStepPromptForInput()

		expect(firstPrompt).to.equal(undefined)
		expect(taskState.lastPromptedPlaceholderWorkflowChecklistLabel).to.equal(undefined)

		taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "code-review.md",
			contents: `# Review Workflow

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.
`,
		}

		const secondPrompt = await manager.consumeCurrentPlaceholderWorkflowStepPromptForInput()

		expect(secondPrompt).to.contain("# CURRENT WORKFLOW STEP")
		expect(secondPrompt).to.contain("You are currently on this step: Step 1: Gather Context")
		expect(taskState.lastPromptedPlaceholderWorkflowChecklistLabel).to.equal("Step 1: Gather Context")
	})
```

5. Do not modify the existing deterministic-progression interception tests in this file.

## Step 6
[x] Run the consistency pass required by this document before marking the plan complete.

Allowed files:
- `docs/system-prompts/placeholder-workflow-prompts/current-step-migration-input-section.md`

Exact checks:
1. Re-read every prescribed symbol and confirm this plan uses the same spelling everywhere for:
   - `lastPromptedPlaceholderWorkflowChecklistLabel`
   - `consumeCurrentPlaceholderWorkflowStepPromptForInput`
   - `getActivePlaceholderWorkflowChecklistLabel`
   - `### CURRENT WORKFLOW STEP`

2. Re-read the plan and confirm it prescribes edits for every required runtime seam:
   - task state
   - task metadata
   - workflow activation/teardown clear paths
   - main-task input injection
   - subagent input injection
   - focus-chain status-only system prompt path
   - tests

3. Confirm the plan does **not** prescribe edits to `src/core/prompts/system-prompt/components/continuation_turn.ts`.

4. Confirm the plan preserves these current contracts:
   - checklist label remains the source of truth for step number/title
   - step progression occurs before prompt assembly
   - managed workflows remain out of scope
   - checklist/reminder/notice guidance stays in the system-prompt prompt-injection path

# Remediation Action Plan

The follow-up remediation plan for the QA findings against this migration is documented at:

- [current-step-migration-remediation-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompts/placeholder-workflow-prompts/current-step-migration-remediation-action-plan.md)
