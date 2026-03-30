---
instructions:
  - Read the frontmatter first and follow it literally.
  - Read each step in full before making any change.
  - Execute only the current step.
  - After completing a step's work and verification, change that step's checkbox from `[ ]` to `[x]`.
  - Then stop and read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - Do not widen scope beyond the allowed-files list for the current step.
  - Do not make any change that is not explicitly prescribed in this plan.
  - Use `apply_patch` for all file edits.
  - Run only the exact verification command listed in Step 5.
  - If any ambiguity is discovered, or any necessary change is not explicitly prescribed here, stop immediately and ask for input before proceeding.
---

# Deterministic Workflow Write-Proof Action Plan

## Scope

This plan replaces the current `mtimeMs >= taskStartTimeMs` advancement heuristic for `code-review.md` deterministic step progression with the user-approved trigger model:

1. this task successfully wrote the target file path
2. the file still exists at that path afterward

The plan covers every current `code-review.md` transition that still relies on `mtimeMs` or `taskStartTimeMs`, including:

- Step 2 `review_input`
- Step 3 `diff_output`
- Step 4 `review_mode` derivation from Step 2/3 artifacts
- Step 5 fallback reviewer prompt files
- Step 6 `spec_file` update detection
- the Step 3 workflow-form interception gate in `shouldInterceptWorkflowFormBeforeApiTurn(...)`

This plan does not change `dev-story.md` progression and does not redesign the broader workflow engine beyond the prescribed code-review write-proof model.

## Step 1

- [x] Add task-local write-proof state plus persistence/reset/restore plumbing for active placeholder workflows.

Allowed files:
- `src/core/task/TaskState.ts`
- `src/core/context/context-tracking/ContextTrackerTypes.ts`
- `src/core/task/workflow-activation.ts`
- `src/core/task/index.ts`
- `src/core/task/focus-chain/index.ts`
- `src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts`

Exact changes:

1. In [src/core/task/TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L143), add one new task-state field immediately after `activePlaceholderWorkflowDeterministicState`:
   - `activePlaceholderWorkflowTaskWriteProofPaths: string[] = []`

2. In [src/core/context/context-tracking/ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L36), add one new optional metadata field immediately after `activePlaceholderWorkflowDeterministicState`:
   - `activePlaceholderWorkflowTaskWriteProofPaths?: string[]`

3. Add a new file [src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts) with exactly these exports:
   - `normalizePlaceholderWorkflowWriteProofPath(filePath: string): string`
   - `taskStateHasPlaceholderWorkflowWriteProof(taskState: Pick<TaskState, "activePlaceholderWorkflowTaskWriteProofPaths">, filePath: string): boolean`
   - `fileExistsForPlaceholderWorkflowWriteProof(filePath: string): Promise<boolean>`
   - `recordAndPersistPlaceholderWorkflowWriteProof(args: { taskId: string; taskState: TaskState; filePath: string }): Promise<void>`

   Implement those exports exactly as follows:
   - `normalizePlaceholderWorkflowWriteProofPath(...)` must return `path.resolve(filePath)`.
   - `taskStateHasPlaceholderWorkflowWriteProof(...)` must normalize the candidate path, compare against the stored list with `arePathsEqual(...)`, and return `true` only for an exact task-local match.
   - `fileExistsForPlaceholderWorkflowWriteProof(...)` must return `true` only when `fs.stat(filePath)` succeeds and `stats.isFile()` is `true`.
   - `recordAndPersistPlaceholderWorkflowWriteProof(...)` must:
     - normalize the incoming path
     - append it to `taskState.activePlaceholderWorkflowTaskWriteProofPaths` only if it is not already present
     - load task metadata with `getTaskMetadata(...)`
     - write `metadata.activePlaceholderWorkflowTaskWriteProofPaths = [...taskState.activePlaceholderWorkflowTaskWriteProofPaths]`
     - save metadata with `saveTaskMetadata(...)`
     - swallow metadata persistence failures after updating in-memory state so successful writes still count in the active task

4. In [src/core/task/workflow-activation.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts#L46), clear this new field anywhere placeholder workflow state is cleared:
   - in `activateManagedWorkflowInTaskState(...)`, set `args.taskState.activePlaceholderWorkflowTaskWriteProofPaths = []` immediately after clearing `activePlaceholderWorkflowDeterministicState`
   - in `activatePlaceholderWorkflowInTaskState(...)`, inside the existing `if (workflowChanged)` block at lines 118-121, also set `args.taskState.activePlaceholderWorkflowTaskWriteProofPaths = []`

5. In [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1805), propagate the new field through every existing placeholder-workflow clear/save/restore path:
   - in each placeholder-workflow clear branch at lines 1805-1812, 1836-1843, and 1855-1863, set `this.taskState.activePlaceholderWorkflowTaskWriteProofPaths = []`
   - in the metadata save block at lines 1871-1885, write `taskMetadata.activePlaceholderWorkflowTaskWriteProofPaths = this.taskState.activePlaceholderWorkflowTaskWriteProofPaths`
   - in `restoreBmadStateFromMetadata()` at lines 2012-2029, restore `this.taskState.activePlaceholderWorkflowTaskWriteProofPaths = metadata.activePlaceholderWorkflowTaskWriteProofPaths ?? []`

6. In [src/core/task/focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L441), update `persistPlaceholderWorkflowMetadata()` so it also writes:
   - `metadata.activePlaceholderWorkflowTaskWriteProofPaths = this.taskState.activePlaceholderWorkflowTaskWriteProofPaths`

7. Do not change any deterministic progression logic in this step. This step is only for the write-proof state container plus persistence/reset/restore plumbing.

## Step 2

- [x] Record write proofs immediately after successful current-task artifact writes, including the direct `build_review_diff_output` path.

Allowed files:
- `src/core/task/tools/handlers/ApplyPatchHandler.ts`
- `src/core/task/tools/handlers/WriteToFileToolHandler.ts`
- `src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts`

Exact changes:

1. In [src/core/task/tools/handlers/ApplyPatchHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/ApplyPatchHandler.ts#L333):
   - import `recordAndPersistPlaceholderWorkflowWriteProof` from `@/core/task/focus-chain/placeholderWorkflowWriteProofs`
   - inside the `for (const changedFilePath of changedFiles)` loop, record a write proof only for entries that produced a saved file, not delete-only results
   - use the already-selected `pathToTrack` for saved files
   - resolve the absolute path with the same `resolvePath(config.cwd, pathToTrack)` utility already used for cache invalidation in this file
   - call:
     - `await recordAndPersistPlaceholderWorkflowWriteProof({ taskId: config.taskId, taskState: config.taskState, filePath: absolutePath })`
   - do not record any proof for `applyResults[path]?.deleted === true`
   - for move operations, record only the new path and not the deleted old path

2. In [src/core/task/tools/handlers/WriteToFileToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/WriteToFileToolHandler.ts#L352):
   - import `recordAndPersistPlaceholderWorkflowWriteProof` from `@/core/task/focus-chain/placeholderWorkflowWriteProofs`
   - immediately after `saveChanges()` succeeds and before any response-return branch at lines 357-410, call:
     - `await recordAndPersistPlaceholderWorkflowWriteProof({ taskId: config.taskId, taskState: config.taskState, filePath: absolutePath })`
   - keep this call inside the successful-save path only

3. In [src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts#L413):
   - import `recordAndPersistPlaceholderWorkflowWriteProof` from `@/core/task/focus-chain/placeholderWorkflowWriteProofs`
   - immediately after `await atomicReplaceTextFile(outputPath, artifactContent)` and before the success `toolResult(...)` return, call:
     - `await recordAndPersistPlaceholderWorkflowWriteProof({ taskId: config.taskId, taskState: config.taskState, filePath: outputPath })`

4. Do not add any `mtimeMs` logic in this step. The only new success signal added here is task-local write-proof recording.

## Step 3

- [x] Replace every `code-review.md` artifact/status transition that still depends on `mtimeMs` or `taskStartTimeMs` with the write-proof-plus-existence model, including the Step 3 workflow-form intercept gate.

Allowed files:
- `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
- `src/core/task/index.ts`

Exact changes:

1. In [src/core/task/focus-chain/deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L49):
   - import `fileExistsForPlaceholderWorkflowWriteProof` and `taskStateHasPlaceholderWorkflowWriteProof` from `./placeholderWorkflowWriteProofs`
   - delete `fileExistsAndIsFresh(...)` entirely
   - rename `resolveFreshPlaceholderArtifactPath(...)` at lines 136-148 to `resolveTaskWrittenPlaceholderArtifactPath(...)`
   - change its arguments to:
     - `taskState: TaskState`
     - `placeholders: Record<string, string>`
     - `placeholderKey: "review_input" | "diff_output"`
   - make that helper:
     - read the placeholder value
     - resolve it with `resolveArtifactPlaceholderPath(...)`
     - return the resolved path only when both of these are true:
       - `taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedPath)`
       - `await fileExistsForPlaceholderWorkflowWriteProof(resolvedPath)`

2. In the `code-review.md` step switch inside [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L156), update every remaining code-review `mtimeMs`-based transition:
   - Step 2 must use `resolveTaskWrittenPlaceholderArtifactPath(...)` for `review_input`
   - Step 3 must use `resolveTaskWrittenPlaceholderArtifactPath(...)` for `diff_output`
   - Step 4 must use `resolveTaskWrittenPlaceholderArtifactPath(...)` for both `review_input` and `diff_output`
   - Step 5 must stop using `fileExistsAndIsFresh(...)`; for each fallback prompt path, require:
     - `taskStateHasPlaceholderWorkflowWriteProof(args.taskState, fallbackPromptPath)`
     - `await fileExistsForPlaceholderWorkflowWriteProof(fallbackPromptPath)`
   - Step 6 must:
     - resolve `spec_file` through `resolveArtifactPlaceholderPath(placeholders, specFilePath)`
     - require the same write-proof-plus-existence check before reading the file

3. In that same switch, update the user-visible deterministic reasons to match the new source of truth exactly:
   - Step 2 reason becomes `review_input was written during this task and the artifact still exists.`
   - Step 3 reason becomes `diff_output was written during this task and the artifact still exists.`
   - Step 4 reason becomes `review_mode was derived deterministically from current-task review artifacts.`
   - Step 5 reason becomes `Every required review layer has a final report or a current-task fallback prompt artifact.`
   - Step 6 reason becomes `spec_file was updated during this task and now contains a terminal review status.`

4. Do not change `dev-story.md` progression in this step. Specifically, leave the `dev-story.md` Step 3 `story_path` freshness logic at lines 337-350 unchanged.

5. In [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L211), update `shouldInterceptWorkflowFormBeforeApiTurn(...)` so Step 3 interception no longer depends on `taskStartTimeMs`:
   - import `fileExistsForPlaceholderWorkflowWriteProof` and `taskStateHasPlaceholderWorkflowWriteProof` from `@/core/task/focus-chain/placeholderWorkflowWriteProofs`
   - change the `Pick<TaskState, ...>` at lines 213-220:
     - remove `taskStartTimeMs`
     - add `activePlaceholderWorkflowTaskWriteProofPaths`
   - after resolving `diff_output` at lines 244-249, return `false` only when:
     - `taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedDiffOutputPath)` is `true`
     - and `await fileExistsForPlaceholderWorkflowWriteProof(resolvedDiffOutputPath)` is `true`
   - otherwise return `true`

6. Do not change telemetry, `taskFirstTokenTimeMs`, or any non-code-review path in this step.

## Step 4

- [x] Update regression coverage so it proves every affected `code-review.md` transition now keys off task-local successful-write proof plus file existence instead of filesystem `mtimeMs`.

Allowed files:
- `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`

Exact changes:

1. In [src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L12):
   - add a small local helper near `createTaskState(...)` that records normalized write proofs into `taskState.activePlaceholderWorkflowTaskWriteProofPaths`
   - for every successful `code-review.md` Step 2, Step 3, Step 4, and Step 6 test currently using `taskStartTimeMs + ...` mtimes, change the file setup so the file mtime is stale relative to `taskStartTimeMs`, then add a task-local write proof for that same path before invoking `applyDeterministicPlaceholderProgression(...)`
   - update the asserted reason strings anywhere they currently mention `fresh` so they match the Step 3 reason text prescribed above

2. In that same file, add two new Step 5 tests immediately before the existing Step 6 tests:
   - one success test where both fallback prompt files exist, both paths are present in `activePlaceholderWorkflowTaskWriteProofPaths`, and the result auto-completes Step 5 while setting both deterministic review layers to `fallback_prompt`
   - one negative test where the fallback prompt files exist but no write proofs are recorded, and Step 5 remains unchecked

3. In [src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L284), rewrite the Step 3 intercept test so it no longer uses `taskStartTimeMs` or `fs.utimes(...)`:
   - keep the initial assertion that interception is `true` before any diff artifact exists
   - after creating the diff file, assert interception is still `true` while no write proof is recorded
   - then set `taskState.activePlaceholderWorkflowTaskWriteProofPaths = [diffOutputPath]`
   - assert interception becomes `false`

4. In [src/core/task/__tests__/placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L44):
   - update the metadata restore test so the stubbed metadata includes `activePlaceholderWorkflowTaskWriteProofPaths`, and assert the field restores onto `taskState`
   - update the managed-workflow activation clear test so it seeds one proof path and asserts the field is cleared
   - add one new regression test after the existing checklist-restore tests that reproduces the production Step 2 failure shape:
     - active placeholder workflow is `code-review.md`
     - checklist is at Step 2 unchecked
     - `review_input` placeholder points to the artifact path
     - the file exists with a stale pre-task mtime
     - `taskState.activePlaceholderWorkflowTaskWriteProofPaths` contains that artifact path
     - `FocusChainManager.updateFCListFromToolResponse(undefined, { toolName: "set_workflow_placeholders", toolWasExecuted: true })` advances the checklist to Step 3

5. In [src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L1480):
   - keep the existing BuildReviewDiffOutput success test
   - after handler execution, assert `config.taskState.activePlaceholderWorkflowTaskWriteProofPaths` includes the absolute `diffOutputPath`
   - in the existing no-diff-content test at lines 1517-1545, add the assertion that `config.taskState.activePlaceholderWorkflowTaskWriteProofPaths` remains empty

6. Do not add any new dev-story tests in this step. The only test expansion required here is for the affected `code-review.md` transitions and the Step 3 intercept gate.

## Step 5

- [x] Run the focused verification suite for the write-proof deterministic progression remediation.

Allowed files:
- None

Run exactly this command and no other verification commands:

```sh
npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts --exit
```

Expected result:

- The command exits successfully.
- The deterministic progression tests prove `code-review.md` Step 2, Step 3, Step 4, Step 5, and Step 6 no longer depend on `mtimeMs >= taskStartTimeMs`.
- The FocusChainManager test proves Step 3 workflow-form interception depends on current-task write proof plus file existence.
- The placeholder workflow persistence tests prove write proofs survive restore and allow Step 2 to auto-advance after placeholder resolution even when the file's `mtimeMs` is stale.
- The BuildReviewDiffOutput handler tests prove direct diff artifact writes register current-task write proof state.
