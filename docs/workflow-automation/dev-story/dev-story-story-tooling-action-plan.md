---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not make changes outside the allowed files listed for the current step.
  - If any ambiguity is discovered, or if any change is needed outside the allowed files for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup, compatibility shims, or unrelated refactors beyond what is explicitly prescribed here.
---

# Dev-Story Story Tooling Action Plan

## Scope

This plan implements the `dev-story` runtime behavior defined in [story-instruction-prompting.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/dev-story/story-instruction-prompting.md#L2).

The required end state is:

- `dev-story.md` workflow start can inject `## Acceptance Criteria` and `## Latest Review Findings` from the hidden story file exactly once at workflow start.
- `dev-story.md` Step 2 can inject the first incomplete task plus its subtasks through the existing current-step prompting seam.
- Step 2 task prompting can re-inject when the current story task changes, when a full-prompt refresh happens, and when compaction clears prompt history.
- Step 3 can inject `## Testing Requirements` when that step becomes active.
- the hidden story path is resolved from workflow placeholders, not exposed to the LLM
- the LLM can use these new step-gated native tools:
  - Step 2: `story_task_reminder`, `story_task_complete`, `story_notes_update`
  - Step 3: `story_notes_update`, `story_testing_complete`
- all story-file writes are auto-approved on the happy path, validated after write, retried once on verification failure, and fall back to `ask("followup", ...)` with an exact manual patch when automated retry still fails
- `storyTaskId` / `storySubtaskId` remain runtime-only addressing tokens and must never be written into the story markdown

This plan must not:

- edit `/Users/robertboston/Documents/Cline/Workflows/dev-story.md`
- change deterministic progression rules in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L734)
- change `write-remediation-story` workflow logic
- change unrelated prompt/tool systems outside the exact files listed below

## Verified Live Seams

The live seams this plan must extend are:

- the current-step injector in [FocusChainManager.consumeCurrentPlaceholderWorkflowStepPromptForInput()](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L380), which currently gates only on `lastPromptedPlaceholderWorkflowChecklistLabel`
- the current-step injection call site in [Task.loadContext()](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L4977-L4989), which already knows whether the current turn is a full-prompt refresh
- the workflow-start seam in [buildPlaceholderWorkflowActivationInstructions()](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2058-L2062), which is currently a stub
- persisted workflow prompt state in [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L145-L156), [ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L36-L52), and the restore/persist helpers in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1545-L1563) and [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2157-L2205)
- the subagent reuse of the same current-step prompt seam in [SubagentRunner.maybeAppendCurrentStepInputPrompt()](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1155-L1163) and [clearSubagentCurrentStepPromptMarkerForContextCompaction()](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1166-L1172)
- sibling hidden-story-path write tools in [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts#L50-L186), [CodeReviewSpecUpdateToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts#L101-L212), and [BuildReviewDiffOutputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts#L374-L434)
- tool registration seams in [shared/tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8-L77), [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L86-L123), [tools/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts#L1-L28), and [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L38-L75)
- contextual tool gating in [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L3-L39) and [contextualNativeToolFilter.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts#L109-L124)
- prompt-variant tool exposure through the `.tools(...)` arrays in the live variant configs, including [native-gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts#L56-L84), [native-next-gen/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts#L47-L72), and sibling variant configs that already surface `BUILD_REVIEW_INPUT`
- the canonical in-repo contextual tool schema doc in [docs/contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L484-L491), which is already stale for `dev-story.md`

## Action Plan

[x] Step 1: Add the shared hidden-story parser and mutator module that both runtime prompting and LLM-visible tools will use.
Allowed files: `src/core/task/story-tools/storyTaskDocument.ts`, `src/core/task/story-tools/__tests__/storyTaskDocument.test.ts`

Add a new helper module at [storyTaskDocument.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/story-tools/storyTaskDocument.ts) with these exact exports:

- `export type StoryNotesSectionHeading = "## Completion Notes List" | "## File List"`
- `export interface StoryTaskPromptPayload { storyTaskId: string; storySubtaskIds: string[]; promptKey: string; promptText: string }`
- `export function resolveActiveStoryPath(args: { cwd: string; stablePlaceholderValues?: Record<string, string>; placeholderValues?: Record<string, string> }): { ok: true; storyPath: string } | { ok: false; message: string }`
- `export function buildDevStoryWorkflowStartPrompt(storyMarkdown: string): string | undefined`
- `export function buildCurrentStoryTaskPrompt(storyMarkdown: string): StoryTaskPromptPayload | { error: string }`
- `export function buildTestingRequirementsPrompt(storyMarkdown: string): string | { error: string }`
- `export function completeStoryChecklistItem(args: { storyMarkdown: string; storyTaskId: string; storySubtaskId?: string }): { updatedMarkdown: string; manualPatch: string } | { error: string }`
- `export function appendStorySectionEntry(args: { storyMarkdown: string; sectionHeading: StoryNotesSectionHeading; entry: string }): { updatedMarkdown: string; manualPatch: string } | { error: string }`
- `export function markStoryStatusReview(storyMarkdown: string): { updatedMarkdown: string; manualPatch: string } | { error: string }`

Implement these exact parsing rules in that file:

- `buildDevStoryWorkflowStartPrompt(...)` must extract only these exact top-level `##` sections:
  - `## Acceptance Criteria`
  - `## Latest Review Findings`
- if neither section exists, return `undefined`
- when one or both sections exist, return this exact block shape:

```text
### WORKFLOW START CONTEXT

## Acceptance Criteria
...

## Latest Review Findings
...
```

- `buildCurrentStoryTaskPrompt(...)` must parse only the top-level `## Tasks / Subtasks` section and stop at the next `##` heading
- top-level task rows must match `^- \\[( |x|X)\\] `
- subtask rows must match `^  - \\[( |x|X)\\] `
- only one subtask nesting level is supported
- the first incomplete task is the first unchecked top-level task row
- the returned `storyTaskId` must be the 1-based top-level task ordinal as a string
- the returned `storySubtaskIds` must be the 1-based subtask ordinals under that parent task, in document order, as strings
- `promptKey` must be the exact string `${storyTaskId}:${storySubtaskIds.join(",")}:${taskLine}` where `taskLine` is the raw first incomplete top-level checklist line
- `promptText` must use this exact format:

```text
### CURRENT TASKS / SUBTASKS

storyTaskId: <task-id>
- [ ] <top-level task text>

storySubtaskId: <subtask-id>
  - [ ] <subtask text>
```

- emit one `storySubtaskId` stanza for every subtask belonging to that task
- do not include later tasks
- do not write or persist ids into the markdown

Implement these exact write-side rules in the same module:

- `completeStoryChecklistItem(...)` must:
  - mark the addressed row complete by replacing the matching `[ ]` with `[x]`
  - require `storyTaskId`
  - treat `storySubtaskId` as optional
  - when `storySubtaskId` is omitted, complete the top-level task row
  - when `storySubtaskId` is present, complete that subtask row under the addressed parent task
  - after completing a subtask, reparse the same parent task block and auto-complete the parent row when every subtask under it is now checked
  - return `manualPatch` as the exact checklist lines the user would need to apply manually if write validation later fails
- `appendStorySectionEntry(...)` must:
  - require the target heading to already exist
  - append the new entry at the end of that section
  - preserve existing content verbatim
  - not dedupe or rewrite prior entries
- `markStoryStatusReview(...)` must:
  - replace the first top-level `Status:` line with the exact line `Status: review`
  - return an error if no `Status:` line exists

In [storyTaskDocument.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/story-tools/__tests__/storyTaskDocument.test.ts), add focused coverage for:

- workflow-start extraction returning only `## Acceptance Criteria` and `## Latest Review Findings`
- first-incomplete-task extraction using the real checklist grammar from [story-instruction-prompting.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/dev-story/story-instruction-prompting.md#L26-L36)
- `storyTaskId` / `storySubtaskIds` numbering as 1-based strings
- parent auto-completion after the last incomplete subtask is completed
- append-only behavior for both `## Completion Notes List` and `## File List`
- `Status: review` replacement
- parse failure on unsupported nested indentation deeper than one subtask level

[x] Step 2: Wire workflow-start injection, Step 2 task injection, and persisted story-task prompt state into the existing prompt assembly path without breaking broader workflow-step automation.
Allowed files: `src/core/task/TaskState.ts`, `src/core/context/context-tracking/ContextTrackerTypes.ts`, `src/core/task/index.ts`, `src/core/task/focus-chain/index.ts`, `src/core/task/tools/subagent/SubagentRunner.ts`, `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`, `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

In [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L145-L156), insert these exact fields immediately after `lastPromptedPlaceholderWorkflowChecklistLabel?: string`:

- `activeStoryTaskId?: string`
- `activeStorySubtaskIds: string[] = []`
- `lastPromptedStoryTaskKey?: string`

In [ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L40-L51), add the matching optional metadata fields:

- `activeStoryTaskId?: string`
- `activeStorySubtaskIds?: string[]`
- `lastPromptedStoryTaskKey?: string`

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1545-L1563), [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2157-L2205), and [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1527-L1543), extend the existing placeholder-workflow metadata lifecycle exactly as follows:

- teardown must clear `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey`
- `persistClearedPlaceholderWorkflowMetadata()` must save those cleared values
- `restoreBmadStateFromMetadata()` must restore those fields, defaulting `activeStorySubtaskIds` to `[]`
- add a new private helper `persistActiveStoryTaskPromptState()` that saves only `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey`
- add a new private helper `clearLastPromptedStoryTaskKeyForContextCompaction()` that clears only `lastPromptedStoryTaskKey` and persists it
- wherever [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3234), [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3445), [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3988), and [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L4411) already clear `lastPromptedPlaceholderWorkflowChecklistLabel` for compaction, clear `lastPromptedStoryTaskKey` in the same branch

Implement the workflow-start prompt seam in [buildPlaceholderWorkflowActivationInstructions()](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2058-L2062):

- return `undefined` unless `this.taskState.activeWorkflowJustStarted === true`
- return `undefined` unless `this.taskState.activePlaceholderWorkflowSource?.name` normalizes to `dev-story.md`
- resolve the hidden `story_path` from the active placeholder workflow values using the same stable/dynamic placeholder merge pattern used by [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts#L52-L90)
- read the story file from disk
- call `buildDevStoryWorkflowStartPrompt(...)`
- return its string result or `undefined`

In [Task.loadContext()](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L4973-L4989), make these exact changes:

- after `shouldSendFullPromptAssembly` is computed at lines 4975-4978 and before the current-step prompt is consumed, call `buildPlaceholderWorkflowActivationInstructions(...)`
- if that method returns a non-empty string and `useCompactPrompt === false`, append it to `processedUserContent`
- when the current-step prompt is consumed, pass the exact options object `{ shouldForceStoryTaskPrompt: shouldSendFullPromptAssembly }`
- after current-step prompt injection, if any of `lastPromptedPlaceholderWorkflowChecklistLabel`, `activeStoryTaskId`, `activeStorySubtaskIds`, or `lastPromptedStoryTaskKey` changed, call both persistence helpers:
  - the existing `persistLastPromptedPlaceholderWorkflowChecklistLabel()`
  - the new `persistActiveStoryTaskPromptState()`

In [FocusChainManager.consumeCurrentPlaceholderWorkflowStepPromptForInput()](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L380-L452), change the signature to:

- `public async consumeCurrentPlaceholderWorkflowStepPromptForInput(options?: { shouldForceStoryTaskPrompt?: boolean }): Promise<string | undefined>`

Before changing that method body, thread the task/workspace cwd into `FocusChainManager` so hidden `story_path` resolution never uses `process.cwd()`:

- in [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L47-L58), add `cwd: string` to `FocusChainDependencies`
- in the same file, add a new private field `private cwd: string` beside the other constructor-backed state and set it from `dependencies.cwd`
- in the same file, replace both `resolveActiveStoryPath({ cwd: process.cwd(), ... })` calls in the `dev-story.md` Step 2 and Step 3 branches with `cwd: this.cwd`
- in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L867-L878), pass `cwd: this.cwd` into the main `new FocusChainManager(...)` call
- in [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L368-L381), pass `cwd: this.cwd` into `new FocusChainManager(...)` inside `getOrCreateSubagentFocusChainManager(...)`
- in [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts) and [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts), update every direct `new FocusChainManager(...)` construction or helper dependency factory to provide a stable `cwd`

Then change the method body exactly as follows:

- keep the existing `managedWorkflowRun`, missing-source, and no-active-checklist early exits
- do not return early just because `lastPromptedPlaceholderWorkflowChecklistLabel === activeChecklistLabel`
- still resolve `stepDetails` exactly as it does today
- preserve the existing `lastPromptedPlaceholderWorkflowChecklistLabel = activeChecklistLabel` write only when a step-level prompt is actually emitted
- when `stepDetails.sourceName` normalizes to `dev-story.md` and `stepDetails.checklistLabel` is the active Step 2 checklist label:
  - resolve the hidden `story_path`
  - read the story file
  - build the current task payload with `buildCurrentStoryTaskPrompt(...)`
  - update `this.taskState.activeStoryTaskId`, `this.taskState.activeStorySubtaskIds`, and compute whether the dynamic block must be emitted:
    - emit when `options?.shouldForceStoryTaskPrompt === true`
    - emit when `this.taskState.lastPromptedStoryTaskKey !== payload.promptKey`
    - otherwise suppress the dynamic block
  - when the dynamic block is emitted, set `this.taskState.lastPromptedStoryTaskKey = payload.promptKey`
  - when the static step label is also due for emission, append the dynamic block to the existing deterministic current-step block with two blank lines between them
  - when the static step label is not due but the dynamic block is due, return only `payload.promptText`
- when `stepDetails.sourceName` normalizes to `dev-story.md` and the active step is Step 3:
  - resolve the hidden `story_path`
  - read the story file
  - build the testing-requirements block with `buildTestingRequirementsPrompt(...)`
  - append that block only when the static current-step prompt is being emitted for that step
- when the active step is not `dev-story.md` Step 2:
  - clear `activeStoryTaskId`
  - clear `activeStorySubtaskIds`
  - clear `lastPromptedStoryTaskKey`
- preserve the non-`dev-story` behavior of this method exactly

Use this exact Step 3 testing block format when appended:

```text
### TESTING REQUIREMENTS

<verbatim contents of the ## Testing Requirements section>
```

In [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1155-L1172):

- change `maybeAppendCurrentStepInputPrompt(...)` so the subagent initial prompt path passes `{ shouldForceStoryTaskPrompt: true }`
- change `clearSubagentCurrentStepPromptMarkerForContextCompaction(...)` so it clears both:
  - `state.lastPromptedPlaceholderWorkflowChecklistLabel`
  - `state.lastPromptedStoryTaskKey`

In the three existing regression files, replace or add focused assertions:

- in [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L85-L135), add a `dev-story.md` Step 2 test proving:
  - first call returns the static current-step block plus the dynamic task block
  - second call returns `undefined` when the same task remains current
  - after the underlying story markdown advances to the next top-level task, the next call returns the new dynamic task block
- in the same file, add a Step 3 test proving the testing-requirements block is appended when that step first becomes active
- in [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L217-L385), add a `dev-story.md` case proving:
  - workflow-start context is appended only while `activeWorkflowJustStarted === true`
  - Step 2 dynamic task prompting is forced on full-prompt turns even when the checklist label is unchanged
- in [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L285-L309) and nearby metadata restore cases at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L255-L280), add coverage for:
  - persisting and restoring `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey`
  - clearing `lastPromptedStoryTaskKey` on compaction
  - clearing all three story-task fields on workflow teardown
- in that same file, wherever a plain-object harness directly calls `buildPlaceholderWorkflowActivationInstructions(...)`, make the harness compatible with the live method shape by either:
  - setting `Object.setPrototypeOf(fakeTask, Task.prototype)`, or
  - stubbing `fakeTask.normalizePlaceholderWorkflowSourceName = Task.prototype["normalizePlaceholderWorkflowSourceName"].bind(fakeTask)`
  so those tests exercise the real activation helper instead of failing on a missing instance method

[x] Step 3: Add the four `dev-story` native tools end to end, with happy-path auto-approval and `followup`-ask failure recovery.
Allowed files: `src/shared/tools.ts`, `src/core/prompts/system-prompt/tools/story_task_reminder.ts`, `src/core/prompts/system-prompt/tools/story_task_complete.ts`, `src/core/prompts/system-prompt/tools/story_notes_update.ts`, `src/core/prompts/system-prompt/tools/story_testing_complete.ts`, `src/core/prompts/system-prompt/tools/index.ts`, `src/core/prompts/system-prompt/tools/init.ts`, `src/core/task/tools/ToolExecutorCoordinator.ts`, `src/core/task/tools/handlers/StoryTaskReminderToolHandler.ts`, `src/core/task/tools/handlers/StoryTaskCompleteToolHandler.ts`, `src/core/task/tools/handlers/StoryNotesUpdateToolHandler.ts`, `src/core/task/tools/handlers/StoryTestingCompleteToolHandler.ts`, `src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

In [shared/tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8-L77), add these exact enum members immediately before `USE_SUBAGENTS`:

- `STORY_TASK_REMINDER = "story_task_reminder"`
- `STORY_TASK_COMPLETE = "story_task_complete"`
- `STORY_NOTES_UPDATE = "story_notes_update"`
- `STORY_TESTING_COMPLETE = "story_testing_complete"`

Then add only `ClineDefaultTool.STORY_TASK_REMINDER` to `READ_ONLY_TOOLS`.

Add four new generic tool-spec files under `src/core/prompts/system-prompt/tools/` with these exact ids, names, and params:

- [story_task_reminder.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/story_task_reminder.ts)
  - id: `ClineDefaultTool.STORY_TASK_REMINDER`
  - name: `story_task_reminder`
  - description: `Resend the current first incomplete story task and its subtasks from the workflow-owned story file at {story_path}. Resolve the story path from workflow state.`
  - parameters: `[]`
- [story_task_complete.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/story_task_complete.ts)
  - id: `ClineDefaultTool.STORY_TASK_COMPLETE`
  - name: `story_task_complete`
  - description: `Mark the addressed story task or subtask complete in the workflow-owned story file at {story_path}. Resolve the story path from workflow state.`
  - parameters:
    - required `storyTaskId`
    - optional `storySubtaskId`
- [story_notes_update.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/story_notes_update.ts)
  - id: `ClineDefaultTool.STORY_NOTES_UPDATE`
  - name: `story_notes_update`
  - description: `Append one new entry to ## Completion Notes List or ## File List in the workflow-owned story file at {story_path}. Resolve the story path from workflow state.`
  - parameters:
    - required `section`
    - required `entry`
  - `section` must describe the exact allowed values `Completion Notes List` and `File List`
- [story_testing_complete.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/story_testing_complete.ts)
  - id: `ClineDefaultTool.STORY_TESTING_COMPLETE`
  - name: `story_testing_complete`
  - description: `Mark the workflow-owned story file at {story_path} ready for review by setting Status: review. Resolve the story path from workflow state.`
  - parameters: `[]`

Register those four tool specs in both:

- [tools/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts#L1-L28)
- [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L38-L75)

In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L5-L123), import the four new handlers and register them in `toolHandlersMap`.

Implement the four handlers with these exact responsibilities:

- `StoryTaskReminderToolHandler`
  - resolve hidden `story_path`
  - read the story
  - return the same current-task payload text produced by `buildCurrentStoryTaskPrompt(...)`
  - do not write the file
  - use `handlePartialBlock()` to preview `{"tool":"storyTaskReminder"}`
- `StoryTaskCompleteToolHandler`
  - resolve hidden `story_path`
  - reparse the live story file on every call
  - call `completeStoryChecklistItem(...)`
  - perform an atomic text-file replacement
  - re-read the file and verify the requested row is now complete
  - on verification failure, rerun the same write path exactly once
  - on second failure, call:

```ts
await config.callbacks.ask(
  "followup",
  JSON.stringify({
    question: `Automatic story checklist update failed.\n\nFile: ${readablePath}\n\nApply this exact manual update:\n${manualPatch}\n\nReply continue when the file has been updated.`,
    options: ["continue"],
  }),
  false,
)
```

  - do not prepend any `say(...)` before that ask
  - after a successful write, call `recordAndPersistPlaceholderWorkflowWriteProof(...)`, clear the story path from `fileReadCache`, set `didEditFile = true`, reset `consecutiveMistakeCount = 0`, and emit a normal final `say("tool", ...)`
- `StoryNotesUpdateToolHandler`
  - same hidden-path, atomic-write, verify-on-readback, retry-once, and failure-ask flow as `StoryTaskCompleteToolHandler`
  - map `section: "Completion Notes List"` to `## Completion Notes List`
  - map `section: "File List"` to `## File List`
  - call `appendStorySectionEntry(...)`
- `StoryTestingCompleteToolHandler`
  - same hidden-path, atomic-write, verify-on-readback, retry-once, and failure-ask flow
  - call `markStoryStatusReview(...)`

For all three write handlers, preserve these exact happy-path rules:

- do not show a normal approval prompt
- do run the existing pre-tool hook path before the write, following the sibling pattern in [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts#L154-L163)
- return a JSON `toolResult` payload, not plain text
- never persist `storyTaskId` or `storySubtaskId` into the markdown

In [DevStoryStoryTools.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts), add focused coverage for:

- `story_task_reminder` returning the current task block with ids
- `story_task_complete` completing a subtask and auto-completing its parent when appropriate
- `story_notes_update` appending one entry to `## Completion Notes List`
- `story_notes_update` appending one entry to `## File List`
- `story_testing_complete` setting `Status: review`
- all write tools skipping approval prompts on the happy path
- one repeated-write-verification failure case that triggers exactly one `followup` ask with the manual patch text

[x] Step 4: Gate the new tools by `dev-story` step using two separate contextual bundles, expose them through every live prompt variant, and update the canonical contextual tool schema doc.
Allowed files: `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`, `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`, `src/core/prompts/system-prompt/variants/devstral/config.ts`, `src/core/prompts/system-prompt/variants/gemini-3/config.ts`, `src/core/prompts/system-prompt/variants/generic/config.ts`, `src/core/prompts/system-prompt/variants/glm/config.ts`, `src/core/prompts/system-prompt/variants/gpt-5/config.ts`, `src/core/prompts/system-prompt/variants/hermes/config.ts`, `src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`, `src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`, `src/core/prompts/system-prompt/variants/native-next-gen/config.ts`, `src/core/prompts/system-prompt/variants/next-gen/config.ts`, `src/core/prompts/system-prompt/variants/trinity/config.ts`, `src/core/prompts/system-prompt/variants/xs/config.ts`, `docs/contextual-tool-schema.md`, `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`, `src/core/prompts/system-prompt/__tests__/integration.test.ts`, `src/core/prompts/system-prompt/__tests__/spec.test.ts`

In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L3-L39), extend the `PlaceholderToolBundle` union with these exact bundle names:

- `"STORY_TASK_EXECUTION"`
- `"STORY_TASK_VALIDATION"`

Then add these exact bundle definitions to `PLACEHOLDER_BUILTIN_BUNDLE_TOOLS`:

- `STORY_TASK_EXECUTION: [ClineDefaultTool.STORY_NOTES_UPDATE, ClineDefaultTool.STORY_TASK_COMPLETE, ClineDefaultTool.STORY_TASK_REMINDER]`
- `STORY_TASK_VALIDATION: [ClineDefaultTool.STORY_NOTES_UPDATE, ClineDefaultTool.STORY_TESTING_COMPLETE]`

In the `dev-story.md` row at [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L211-L215), make these exact replacements:

- Step 1 stays `["DOC_READ", "PLACEHOLDER_WRITE"]`
- Step 2 becomes `["DOC_READ", "DOC_WRITE", "CODE_READ", "LOCAL_EXEC", "STORY_TASK_EXECUTION"]`
- Step 3 becomes `["DOC_READ", "DOC_WRITE", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "LOCAL_EXEC", "STORY_TASK_VALIDATION"]`
- Step 4 stays `["DOC_READ", "DOC_WRITE", "LOCAL_EXEC"]`

Do not change any other workflow row in this step.

In the canonical schema doc at [docs/contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L484-L491), replace the stale `dev-story.md` block with the exact 4-step row above, preserving the heading `### dev-story.md`.

In every live prompt variant config that already surfaces `ClineDefaultTool.BUILD_REVIEW_INPUT`, add the four new tool ids to the `.tools(...)` array so contextual gating can expose them at runtime:

- [devstral/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts)
- [gemini-3/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts)
- [generic/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts)
- [glm/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts)
- [gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts)
- [hermes/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts)
- [native-gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts)
- [native-gpt-5-1/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts)
- [native-next-gen/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts)
- [next-gen/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts)
- [trinity/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts)
- [xs/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts)

In each of those files, insert these exact entries immediately after `ClineDefaultTool.BUILD_REVIEW_INPUT` and before `ClineDefaultTool.USE_SUBAGENTS`:

- `ClineDefaultTool.STORY_TASK_REMINDER`
- `ClineDefaultTool.STORY_TASK_COMPLETE`
- `ClineDefaultTool.STORY_NOTES_UPDATE`
- `ClineDefaultTool.STORY_TESTING_COMPLETE`

Update prompt/tool coverage in the three existing test files:

- in [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L214-L260), add a new `dev-story.md` Step 2 assertion that the filtered native set includes:
  - `story_task_reminder`
  - `story_task_complete`
  - `story_notes_update`
  - the existing `DOC_READ`, `DOC_WRITE`, `CODE_READ`, and `LOCAL_EXEC` tools
  - and excludes `story_testing_complete`
- in the same file, add a `dev-story.md` Step 3 assertion that the filtered native set includes:
  - `story_notes_update`
  - `story_testing_complete`
  - the existing Step 3 built-ins and Indxr tools
  - and excludes `story_task_reminder` and `story_task_complete`
- in [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L780-L809), update the existing `dev-story` Step 2 test so the visible tool names now include the three new execution tools
- in the same file, add a `dev-story` Step 3 prompt test proving the validation tools are visible while Indxr-aware guidance still remains available for that step
- in [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L681-L717), add one new tool-schema regression for `story_task_complete` and `story_notes_update` verifying:
  - `storyTaskId` is described as the 1-based top-level task ordinal copied from the injected task block
  - `storySubtaskId` is described as the optional 1-based subtask ordinal under that parent task
  - `section` is constrained to `Completion Notes List` and `File List`

[x] Step 5: Update the existing workflow-start and current-step tests that currently assume placeholder activation instructions are always undefined.
Allowed files: `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`, `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`

In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1012-L1018), [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1095-L1101), [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2763-L2769), and [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2797-L2803), preserve the current `undefined` expectations for non-`dev-story` workflows.

Then add one new `dev-story.md` workflow-start test in that same file proving:

- `buildPlaceholderWorkflowActivationInstructions(...)` returns the exact `### WORKFLOW START CONTEXT` block when:
  - `taskState.activeWorkflowJustStarted === true`
  - `story_path` is present in active placeholder values
  - the story file contains both `## Acceptance Criteria` and `## Latest Review Findings`
- the same helper returns `undefined` after `activeWorkflowJustStarted` is cleared

In [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L217-L385), add one regression that proves:

- `buildPlaceholderWorkflowActivationInstructions(...)` content is appended to `processedUserContent` before the current-step block on the first non-compact `dev-story` turn
- that start block is absent on later turns once `activeWorkflowJustStarted` becomes `false`

[x] Step 6: Run the focused verification suite and update this plan’s checkboxes only after the suite passes.
Allowed files: `docs/workflow-automation/dev-story/dev-story-story-tooling-action-plan.md`

Run these exact commands from `/Users/robertboston/Documents/Cline Extension/cline`:

```bash
npm run test:unit -- src/core/task/story-tools/__tests__/storyTaskDocument.test.ts src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/prompts/system-prompt/__tests__/spec.test.ts --exit
```

If that command fails, stop and report the failure without making unplanned fixes.
If it passes, update this plan’s remaining `[ ]` markers to `[x]`.
