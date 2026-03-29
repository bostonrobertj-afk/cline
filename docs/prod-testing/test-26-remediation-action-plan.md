---
title: Test 26 Placeholder Workflow Recovery Remediation Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, stop, then read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - Do not widen scope beyond the allowed-files list for the current step.
  - Do not add extra pause points or permission checks.
  - If any ambiguity is discovered, or any code/test/snapshot change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Test 26 Placeholder Workflow Recovery Remediation Action Plan

This plan remediates the placeholder-workflow recovery bug uncovered in `docs/prod-testing/test-26-chat.md`.

Locked scope:
- Preserve placeholder-workflow checklist progress across the streaming-failure auto-retry path.
- Prevent the recovered task from overwriting a progressed placeholder checklist with a freshly rebuilt Step 1 checklist.
- Restore current-step prompt continuity after recovery so the agent sees the already-progressed checklist instead of re-entering Step 1.

Out of scope:
- Changing the existing workflow-form dictionary path fix in `src/core/task/workflow-form/WorkflowFormRuntime.ts`.
- Reworking the broader auto-retry UX, retry timing, or `error_retry` UI behavior.
- Editing workflow source documents.
- Changing deterministic Step 2 completion semantics.

## Step 1
[x] Restore the saved placeholder-workflow checklist before the first resumed turn, and stop no-`task_progress` tool updates from rebuilding a fresh checklist when a saved one already exists.

Allowed files:
- `src/core/task/index.ts`
- `src/core/task/focus-chain/index.ts`

Exact edits in `src/core/task/focus-chain/index.ts`:
1. Immediately after `refreshPlaceholderWorkflowChecklistProjection(...)` ends at line 512, insert this new public helper exactly:

```ts
	public async restoreCurrentChecklistFromDisk(): Promise<string | null> {
		const markdownTodoList = await this.readFocusChainFromDisk()
		if (!markdownTodoList) {
			return null
		}

		this.taskState.currentFocusChainChecklist = markdownTodoList
		this.taskState.todoListWasUpdatedByUser = false
		this.taskState.apiRequestsSinceLastTodoUpdate = 0
		return markdownTodoList
	}
```

2. In `updateFCListFromToolResponse(...)` at lines 668-670, replace:

```ts
			if (!taskProgress && this.taskState.activePlaceholderWorkflowSource && !this.taskState.currentFocusChainChecklist) {
				await this.refreshPlaceholderWorkflowChecklistProjection()
				return { accepted: true }
			}
```

with:

```ts
			if (!taskProgress && this.taskState.activePlaceholderWorkflowSource && !this.taskState.currentFocusChainChecklist) {
				const restoredChecklist = await this.restoreCurrentChecklistFromDisk()
				if (!restoredChecklist) {
					await this.refreshPlaceholderWorkflowChecklistProjection()
					return { accepted: true }
				}
			}
```

3. Do not change any other logic inside `updateFCListFromToolResponse(...)`.

Exact edits in `src/core/task/index.ts`:
1. Immediately after `restoreBmadStateFromMetadata()` ends at line 1980, insert this new private helper exactly:

```ts
	private async restorePlaceholderWorkflowChecklistFromDiskIfNeeded(): Promise<void> {
		if (!this.taskState.activePlaceholderWorkflowSource || this.taskState.currentFocusChainChecklist) {
			return
		}

		await this.FocusChainManager?.restoreCurrentChecklistFromDisk()
	}
```

2. In `resumeTaskFromHistory(...)`, immediately after the managed-workflow refresh block at lines 2322-2325, insert this block exactly:

```ts
		await this.restorePlaceholderWorkflowChecklistFromDiskIfNeeded()
```

3. Do not change any other logic in `resumeTaskFromHistory(...)`, `refreshPlaceholderWorkflowChecklistProjection(...)`, or the streaming-failure auto-retry block.

## Step 2
[x] Add regression tests for both resume-time checklist restoration and no-`task_progress` recovery without checklist clobbering.

Allowed files:
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`

Exact edits in `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`:
1. Immediately after the existing `"persists and restores the active workflow-form session in task metadata"` test ending at line 225, insert this new test exactly:

```ts
	it("restores the placeholder checklist from disk before a resumed turn rebuilds it from source", async () => {
		const fakeTask = createFakeTask("task-restore-placeholder-checklist")
		fakeTask.taskState.activePlaceholderWorkflowId = "code-review.md"
		fakeTask.taskState.activePlaceholderWorkflowSource = {
			type: "remote",
			name: "code-review.md",
			contents: `# Code Review

## Step 1: Determine Review Source
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Construct & Persist Review Input File
Persist review_input.md.
`,
		}
		fakeTask.taskState.currentFocusChainChecklist = null

		const restoredChecklist = [
			"- [x] Step 1: Determine Review Source",
			"- [x] Step 2: Construct & Persist Review Input File",
			"- [ ] Step 3: (System-Owned) Diff Source Resolution And Diff Output Persistence",
		].join("\n")

		const restoreStub = sinon.stub().callsFake(async () => {
			fakeTask.taskState.currentFocusChainChecklist = restoredChecklist
			return restoredChecklist
		})
		;(fakeTask as any).FocusChainManager = {
			restoreCurrentChecklistFromDisk: restoreStub,
		}

		await (Task.prototype as any).restorePlaceholderWorkflowChecklistFromDiskIfNeeded.call(fakeTask)

		expect(restoreStub.calledOnce).to.equal(true)
		expect(fakeTask.taskState.currentFocusChainChecklist).to.equal(restoredChecklist)
	})
```

2. Do not modify the surrounding helper functions or any other existing test in this file.

Exact edits in `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`:
1. Immediately after the existing `"does not clobber an existing placeholder checklist when reseeding is not forced"` test ending at line 479, insert this new test exactly:

```ts
	it("restores a progressed placeholder checklist from disk instead of rebuilding it from source during no-task-progress updates", async () => {
		const sandbox = sinon.createSandbox()
		const taskId = `task-focus-chain-placeholder-restore-${Date.now()}`
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-placeholder-restore-"))
		const workflowPath = path.join(tempDir, "code-review.md")
		await fs.writeFile(
			workflowPath,
			`# Code Review

## Step 1: Determine Review Source
Determine what to review from the user's prompt before asking follow-up questions.

## Step 2: Construct & Persist Review Input File
Persist review_input.md.

## Step 3: (System-Owned) Diff Source Resolution And Diff Output Persistence
Resolve diff input through the system-owned form flow.
`,
			"utf8",
		)

		try {
			sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)
			const focusChainFilePath = getFocusChainFilePath(tempDir, taskId)
			const progressedChecklist = [
				"- [x] Step 1: Determine Review Source",
				"- [x] Step 2: Construct & Persist Review Input File",
				"- [ ] Step 3: (System-Owned) Diff Source Resolution And Diff Output Persistence",
			].join("\n")
			await fs.writeFile(
				focusChainFilePath,
				`# Focus Chain List for Task ${taskId}

${progressedChecklist}
`,
				"utf8",
			)

			const taskState = new TaskState()
			taskState.activePlaceholderWorkflowId = "code-review.md"
			taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "code-review.md",
				path: workflowPath,
			}

			const say = sinon.stub().resolves(undefined)
			const manager = new FocusChainManager({
				...createDependencies(taskState),
				taskId,
				say,
			})

			const result = await manager.updateFCListFromToolResponse(undefined)

			expect(result.accepted).to.equal(true)
			expect(taskState.currentFocusChainChecklist).to.equal(progressedChecklist)
			sinon.assert.calledWith(say, "task_progress", progressedChecklist)
			const persistedChecklist = await fs.readFile(focusChainFilePath, "utf8")
			expect(persistedChecklist).to.contain("- [x] Step 2: Construct & Persist Review Input File")
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})
```

2. Do not alter any other existing test in this file.

## Step 3
[x] Verify the focused regression coverage for the placeholder-workflow recovery path.

Allowed files:
- `src/core/task/index.ts`
- `src/core/task/focus-chain/index.ts`
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
- `docs/prod-testing/test-26-remediation-action-plan.md`

Run this command exactly from the repo root:

```sh
npm run test:unit -- src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts --exit
```

Expected result:
- The command exits successfully.
- The new tests pass.
- No additional files are changed beyond the files listed in Steps 1-2 and this action plan's checkbox updates.
