# Deterministic Workflow Progression Action Plan

## Purpose

Implement deterministic placeholder-workflow progression for the first supported workflows:
- `code-review`
- `dev-story`

This plan is grounded in:
- [core-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/deterministic-workflow-progression/core-requirements.md)
- [implementation-spec.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/deterministic-workflow-progression/implementation-spec.md)

The plan is intentionally prescriptive. The executing agent must follow it exactly.

## Execution Rules

- Treat this action plan as the sole implementation authority for this feature.
- Read each step in full before executing that step.
- Execute only the current step.
- After completing a step, update that step's leading `[ ]` checkbox to `[x]`.
- After marking a completed step `[x]`, return to the action plan and read the next step in full before making any further changes.
- Never execute a later step from memory or based on potentially stale context.
- Do not widen scope.
- Do not substitute a different architecture.
- Do not move logic into unrelated modules.
- Do not parse workflow `Done Signal:` prose at runtime.
- Do not add support for any placeholder workflow other than `code-review` and `dev-story`.
- Do not modify external workflow files under `/Users/robertboston/Documents/Cline/Workflows/` as part of this action plan.
- If any ambiguity is discovered, or if any necessary change is not explicitly prescribed here, stop and ask for input before proceeding.

## Files To Create

- `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
- `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`

## Files To Modify

- `src/core/task/TaskState.ts`
- `src/core/context/context-tracking/ContextTrackerTypes.ts`
- `src/core/storage/disk.ts`
- `src/core/task/tools/types/TaskConfig.ts`
- `src/core/task/focus-chain/updateFromToolResponse.ts`
- `src/core/task/ToolExecutor.ts`
- `src/core/task/focus-chain/index.ts`
- `src/core/task/index.ts`
- `src/core/task/tools/subagent/SubagentRunner.ts`
- `src/core/prompts/system-prompt/types.ts`
- `src/core/prompts/system-prompt/components/task_progress.ts`
- `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts`
- `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`
- `src/core/prompts/system-prompt/variants/gpt-5/template.ts`
- `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`
- `src/core/task/tools/handlers/SubagentToolHandler.ts`
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
- `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
- `src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts`

## Files Explicitly Not To Modify

- any file under `src/core/task/managed-workflows/`
- any workflow file under `/Users/robertboston/Documents/Cline/Workflows/`
- native tool registry / contextual tool schema files unrelated to placeholder progression
- `src/core/prompts/system-prompt/spec.ts`
- snapshot files unless a prescribed validation command fails only because of directly expected prompt-string changes from this action plan

## Overview Of The Final Design

The completed implementation must do all of the following:

- add a central deterministic placeholder progression module under `src/core/task/focus-chain/`
- allow only `code-review` and `dev-story` to use runtime auto-completion
- keep unsupported placeholder workflows on the existing `task_progress` path
- store pending auto-completion notices in `TaskState`
- persist those notices and deterministic placeholder runtime state in task metadata
- run deterministic evaluation from the existing focus-chain update path after tool execution
- let the runtime auto-complete multiple sequential deterministic steps in one pass
- surface auto-completed-step notices in the next placeholder workflow prompt
- update all placeholder-workflow prompt guidance so supported workflows are no longer told that only `task_progress` advances steps

## Step 1: Add Runtime Types And Persistent State

### Allowed Files

- `src/core/task/TaskState.ts`
- `src/core/context/context-tracking/ContextTrackerTypes.ts`

### Exact Changes

#### 1A. `src/core/task/TaskState.ts`

At [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L16), insert these new exported interfaces immediately after `PartialResponseToolPreview` and before `TaskState`:

```ts
export type DeterministicPlaceholderWorkflowName = "code-review" | "dev-story"

export interface AutoCompletedPlaceholderWorkflowStepNotice {
	workflowName: DeterministicPlaceholderWorkflowName
	stepNumber: number
	checklistLabel: string
	reason: string
}

export type CodeReviewLayerCompletionSource = "subagent_report" | "fallback_prompt"

export interface CodeReviewDeterministicProgressState {
	completedReviewLayers: Partial<
		Record<"adversarial_general" | "edge_case_hunter", CodeReviewLayerCompletionSource>
	>
}

export interface ActivePlaceholderWorkflowDeterministicState {
	codeReview?: CodeReviewDeterministicProgressState
}
```

At [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L122), directly after `activePlaceholderWorkflowValues?: Record<string, string>`, add:

```ts
	activePlaceholderWorkflowDeterministicState?: ActivePlaceholderWorkflowDeterministicState
	pendingAutoCompletedPlaceholderWorkflowStepNotices: AutoCompletedPlaceholderWorkflowStepNotice[] = []
```

Do not add any methods in this step.

#### 1B. `src/core/context/context-tracking/ContextTrackerTypes.ts`

At [ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L1), extend the import from `TaskState` types by importing:

- `ActivePlaceholderWorkflowDeterministicState`
- `AutoCompletedPlaceholderWorkflowStepNotice`

At [ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L38), directly after `activePlaceholderWorkflowValues?: Record<string, string>`, add:

```ts
	activePlaceholderWorkflowDeterministicState?: ActivePlaceholderWorkflowDeterministicState
	pendingAutoCompletedPlaceholderWorkflowStepNotices?: AutoCompletedPlaceholderWorkflowStepNotice[]
```

### Pause Point 1

Stop after Step 1 and report:
- the exact new `TaskState` fields added
- the exact new `TaskMetadata` fields added
- confirmation that no persistence code or behavior changed yet

Do not proceed until this checkpoint is reviewed.

## Step 2: Create The Central Deterministic Progression Module

### Allowed Files

- `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`

### Exact Changes

Create `src/core/task/focus-chain/deterministicPlaceholderProgression.ts` as a new file.

The file must contain, in this exact order:

1. Imports:
- `fs/promises`
- `path`
- `evaluateFocusChainChecklistUpdate` from `./file-utils`
- `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL` from `@/shared/focus-chain-utils`
- `getActivePlaceholderWorkflowStepDetails` from `@/core/workflows/placeholder-workflow-step-details`
- `getPlaceholderWorkflowValueMap` from `@/core/workflows/placeholder-workflow-rendering`
- `TaskState` and the new exported types from `../TaskState`

2. Exported types:

```ts
export interface DeterministicPlaceholderToolContext {
	toolName: string
	toolParams?: Record<string, unknown>
	toolResult?: unknown
	toolWasExecuted: boolean
}

export interface DeterministicPlaceholderProgressionResult {
	checklist: string
	placeholderValuesChanged: boolean
	deterministicStateChanged: boolean
	noticesAdded: boolean
}
```

3. Exported support helper:

```ts
export function isDeterministicPlaceholderWorkflowSupported(
	workflowName?: string,
): workflowName is DeterministicPlaceholderWorkflowName
```

This function must return `true` only for:
- `code-review`
- `dev-story`

4. Private helpers:

- `getMergedPlaceholderValues(taskState: TaskState): Record<string, string>`
- `fileExistsAndIsFresh(filePath: string, taskStartTimeMs: number): Promise<boolean>`
- `readFileIfExists(filePath: string): Promise<string | undefined>`
- `hasTopLevelStatusValue(fileText: string, allowedValues: string[]): boolean`
- `extractMarkdownSection(fileText: string, heading: string): string | undefined`
- `sectionHasNoUncheckedChecklistItems(sectionText: string): boolean`
- `resolveOutputFolderFile(placeholders: Record<string, string>, fileName: string): string | undefined`
- `getCodeReviewFallbackPromptPath(placeholders: Record<string, string>, layer: "adversarial_general" | "edge_case_hunter"): string | undefined`
- `cloneDeterministicState(taskState: TaskState): ActivePlaceholderWorkflowDeterministicState`

Exact fallback filenames for `getCodeReviewFallbackPromptPath(...)`:
- `adversarial_general` => `review-adversarial-general.md`
- `edge_case_hunter` => `review-edge-case-hunter.md`

5. Private step evaluators with exact behavior:

#### `code-review` Step 1

Complete only if:
- `review_target` exists and is non-empty
- `spec_file` exists and is non-empty

Reason string:
- `review_target and spec_file are both present.`

#### `code-review` Step 2

Complete only if:
- `review_input` placeholder exists and points to a fresh file
- otherwise fallback path `{output_folder}/review-input.md` exists and is fresh

Reason string:
- `Fresh review-input.md exists for the current task run.`

#### `code-review` Step 3

Complete only if:
- `diff_output` placeholder exists and points to a fresh file
- otherwise fallback path `{output_folder}/review-input.diff` exists and is fresh

Reason string:
- `Fresh review-input.diff exists for the current task run.`

#### `code-review` Step 4

Complete only if one of these is true:
- fresh review input and fresh diff output => set `review_mode` to `full`
- fresh review input only => set `review_mode` to `file-scope`
- fresh diff output only => set `review_mode` to `diff`

If the step completes:
- write `review_mode` into the merged placeholder values returned by the function
- mark `placeholderValuesChanged = true`

Reason string:
- `review_mode was derived deterministically from fresh review artifacts.`

#### `code-review` Step 5

Complete only if for both required layers:
- deterministic state contains `completedReviewLayers.adversarial_general`
- deterministic state contains `completedReviewLayers.edge_case_hunter`

OR, for a given missing layer, the exact fallback prompt file exists fresh at:
- `{output_folder}/review-adversarial-general.md`
- `{output_folder}/review-edge-case-hunter.md`

If a fallback file is used to satisfy a layer:
- set that layer in deterministic state to `fallback_prompt`
- mark `deterministicStateChanged = true`

Reason string:
- `Every required review layer has a final report or a fresh fallback prompt artifact.`

#### `code-review` Step 6

Complete only if:
- `spec_file` exists
- it is fresh
- it contains a top-level `Status:` line set to `ready-for-dev` or `complete`

Reason string:
- `spec_file was updated and now contains a terminal review status.`

#### `dev-story` Step 1

Complete only if:
- `story_path` exists in placeholders
- the file exists

Reason string:
- `story_path points to an existing story file.`

#### `dev-story` Step 2

Complete only if:
- the story file exists
- `extractMarkdownSection(fileText, "## Tasks / Subtasks")` returns a section
- that section contains at least one checklist line matching `- [ ]` or `- [x]` / `- [X]`
- that section contains zero unchecked `- [ ]` lines

Reason string:
- `The ## Tasks / Subtasks section contains no unchecked items.`

#### `dev-story` Step 3

Complete only if:
- the story file exists
- it is fresh
- it contains top-level `Status: review`

Reason string:
- `The story file was updated and now contains Status: review.`

6. Exported main function:

```ts
export async function applyDeterministicPlaceholderProgression(args: {
	taskState: TaskState
	checklistMarkdown: string
	toolContext?: DeterministicPlaceholderToolContext
}): Promise<DeterministicPlaceholderProgressionResult>
```

Exact algorithm:
- if there is no active placeholder workflow source, return unchanged checklist with all booleans false
- resolve the active step using `getActivePlaceholderWorkflowStepDetails(...)`
- if the workflow is not supported, return unchanged checklist with all booleans false
- loop:
  - resolve current step details from the latest checklist
  - stop if no step details
  - stop if workflow not supported
  - evaluate the current step using the exact step rules above
  - if not complete, stop
  - if Step 4 sets `review_mode`, write it into `taskState.activePlaceholderWorkflowValues`
  - if Step 5 discovers fresh fallback files, write them into deterministic state
  - append a notice to `taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices`
  - advance the checklist exactly one step by calling `evaluateFocusChainChecklistUpdate(checklist, FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL)`
  - use the returned checklist as the next loop input
- return the final checklist and booleans reflecting whether placeholder values, deterministic state, or notices changed

The function must not:
- read or parse workflow prose for logic
- mutate managed workflow state
- mutate files on disk

### Pause Point 2

Stop after Step 2 and report:
- the exact exported API of the new module
- the exact supported workflow names
- the exact `code-review` and `dev-story` step rules implemented
- the exact fallback file names used for `code-review` Step 5

Do not proceed until this checkpoint is reviewed.

## Step 3: Wire Deterministic Progression Into Focus Chain And Tool Execution

### Allowed Files

- `src/core/task/tools/types/TaskConfig.ts`
- `src/core/task/focus-chain/updateFromToolResponse.ts`
- `src/core/task/ToolExecutor.ts`
- `src/core/task/focus-chain/index.ts`
- `src/core/context/context-tracking/ContextTrackerTypes.ts`
- `src/core/storage/disk.ts`

### Exact Changes

#### 3A. `src/core/task/tools/types/TaskConfig.ts`

At [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts#L18), import `DeterministicPlaceholderToolContext` from the new module.

At [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts#L127), change:

```ts
updateFCListFromToolResponse: (taskProgress: string | undefined) => Promise<FocusChainChecklistUpdateResult>
```

to:

```ts
updateFCListFromToolResponse: (
	taskProgress: string | undefined,
	toolContext?: DeterministicPlaceholderToolContext,
) => Promise<FocusChainChecklistUpdateResult>
```

#### 3B. `src/core/task/focus-chain/updateFromToolResponse.ts`

At [updateFromToolResponse.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/updateFromToolResponse.ts#L13), update the callback type in `TaskProgressUpdateOptions` to match the new `TaskConfig` signature.

At [updateFromToolResponse.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/updateFromToolResponse.ts#L41), keep pre-tool calls passing only `block.params?.task_progress`.

At [updateFromToolResponse.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/updateFromToolResponse.ts#L56), extend `applyPostToolTaskProgressUpdate(...)` options with a required `toolContext?: DeterministicPlaceholderToolContext`.

At [updateFromToolResponse.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/updateFromToolResponse.ts#L65), pass both:
- `block.params?.task_progress`
- `toolContext`

to `updateFCListFromToolResponse(...)`.

#### 3C. `src/core/task/ToolExecutor.ts`

At [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L774), change the post-tool focus-chain call to pass:

```ts
toolContext: {
	toolName: block.name,
	toolParams: (block.params as Record<string, unknown>) ?? undefined,
	toolResult,
	toolWasExecuted,
}
```

Do not change the pre-tool `attempt_completion` path beyond the callback signature.

#### 3D. `src/core/task/focus-chain/index.ts`

At [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L1), add imports:
- `getTaskMetadata`
- `saveTaskMetadata`
- `applyDeterministicPlaceholderProgression`
- `isDeterministicPlaceholderWorkflowSupported`
- `DeterministicPlaceholderToolContext`

Add a new private method directly before `refreshManagedWorkflowChecklistProjection()`:

```ts
private async persistPlaceholderWorkflowMetadata(): Promise<void>
```

This method must:
- return immediately if `this.taskState.managedWorkflowRun` is present
- read task metadata
- write these exact fields from task state:
  - `activeWorkflowId`
  - `activePlaceholderWorkflowId`
  - `activePlaceholderWorkflowSource`
  - `activePlaceholderWorkflowStableValues`
  - `activePlaceholderWorkflowValues`
  - `activePlaceholderWorkflowDeterministicState`
  - `pendingAutoCompletedPlaceholderWorkflowStepNotices`
  - `managedWorkflowRun`
- save metadata
- swallow persistence errors exactly the same way `SetWorkflowPlaceholdersToolHandler` currently does

Add a new private method directly before `updateFCListFromToolResponse(...)`:

```ts
private async applyDeterministicPlaceholderWorkflowProgressionIfNeeded(
	currentChecklist: string,
	toolContext?: DeterministicPlaceholderToolContext,
): Promise<string>
```

Exact behavior:
- if there is no active placeholder workflow source, return `currentChecklist`
- call `applyDeterministicPlaceholderProgression(...)`
- if the returned checklist differs from `currentChecklist`, assign it to `this.taskState.currentFocusChainChecklist`
- if any of `placeholderValuesChanged`, `deterministicStateChanged`, or `noticesAdded` are true, call `persistPlaceholderWorkflowMetadata()`
- return the final checklist

Change the signature at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L562) to:

```ts
public async updateFCListFromToolResponse(
	taskProgress: string | undefined,
	toolContext?: DeterministicPlaceholderToolContext,
): Promise<FocusChainChecklistUpdateResult>
```

Refactor the body so it writes `task_progress` to disk/UI only once per call.

Exact refactor requirements:
- preserve all current rejection logic for invalid `task_progress`
- preserve all current managed-workflow behavior
- compute the next checklist value first
- before any `writeFocusChainToDisk(...)` / `say("task_progress", ...)`, pass the computed checklist through `applyDeterministicPlaceholderWorkflowProgressionIfNeeded(...)`
- then persist and emit the final checklist exactly once
- if `taskProgress` is absent but an existing checklist is loaded from disk, still pass it through deterministic progression when a supported placeholder workflow is active

Do not leave the old behavior where deterministic progression would require a second `task_progress` emission after the normal one.

#### 3E. `src/core/context/context-tracking/ContextTrackerTypes.ts`

No further structural changes beyond Step 1 are required in this step.

#### 3F. `src/core/storage/disk.ts`

No behavioral change is required here beyond using the new persisted fields from Step 1.

### Pause Point 3

Stop after Step 3 and report:
- the exact new `updateFCListFromToolResponse(...)` signature
- whether deterministic progression now runs even when `task_progress` is absent
- whether checklist writes/emits now happen only once per call
- confirmation that metadata persistence is centralized in `FocusChainManager`

Do not proceed until this checkpoint is reviewed.

## Step 4: Capture `code-review` Step 5 Subagent Completion State

### Allowed Files

- `src/core/task/tools/handlers/SubagentToolHandler.ts`
- `src/core/task/TaskState.ts`
- `src/core/context/context-tracking/ContextTrackerTypes.ts`
- `src/core/storage/disk.ts`

### Exact Changes

#### 4A. `src/core/task/tools/handlers/SubagentToolHandler.ts`

At [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts#L1), add imports:
- `getTaskMetadata`
- `saveTaskMetadata`

Add these two private helper functions near the top of the file, after `excerpt(...)`:

```ts
function detectCodeReviewLayerFromPrompt(
	prompt: string,
): "adversarial_general" | "edge_case_hunter" | undefined
```

Exact detection rules:
- if the prompt contains `review-adversarial-general.md` or `bmad-review-adversarial-general`, return `adversarial_general`
- if the prompt contains `review-edge-case-hunter.md` or `bmad-review-edge-case-hunter`, return `edge_case_hunter`
- otherwise return `undefined`

```ts
function isActiveCodeReviewPlaceholderWorkflow(config: TaskConfig): boolean
```

Return `true` only if:
- `config.taskState.activePlaceholderWorkflowSource?.name === "code-review"`

At [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts#L275), immediately after the `settled.forEach(...)` block and before `const failures = ...`, add exact logic:

- if `isActiveCodeReviewPlaceholderWorkflow(config)` is false, do nothing
- otherwise:
  - ensure `config.taskState.activePlaceholderWorkflowDeterministicState.codeReview.completedReviewLayers` exists
  - iterate `entries`
  - for each `entry` whose `status === "completed"`:
    - detect the layer from `entry.prompt`
    - if a layer is detected, set:
      - `adversarial_general` => `"subagent_report"`
      - `edge_case_hunter` => `"subagent_report"`

After that logic and before the summary string is built, persist task metadata using the same exact field set as `persistPlaceholderWorkflowMetadata()` in Step 3.

Do not parse the final summary string.
Do not write any new files.
Do not attempt to record partial or failed subagent runs as complete.

### Pause Point 4

Stop after Step 4 and report:
- the exact prompt-to-layer mapping rules added
- the exact TaskState field written by `UseSubagentsToolHandler`
- confirmation that only completed subagent runs mark a layer as `subagent_report`

Do not proceed until this checkpoint is reviewed.

## Step 5: Update Prompt Context And Prompt Strings

### Allowed Files

- `src/core/prompts/system-prompt/types.ts`
- `src/core/task/index.ts`
- `src/core/task/tools/subagent/SubagentRunner.ts`
- `src/core/task/focus-chain/index.ts`
- `src/core/prompts/system-prompt/components/task_progress.ts`
- `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts`
- `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`
- `src/core/prompts/system-prompt/variants/gpt-5/template.ts`
- `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`
- `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`

### Exact Changes

#### 5A. `src/core/prompts/system-prompt/types.ts`

At [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L108), directly after `activePlaceholderWorkflowStepNumber?: number`, add:

```ts
	readonly activeDeterministicPlaceholderWorkflowEnabled?: boolean
```

#### 5B. `src/core/task/index.ts`

At [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2797), after `activePlaceholderWorkflowPromptContext` is computed and before `promptContext` is created, add:

```ts
const activeDeterministicPlaceholderWorkflowEnabled = isDeterministicPlaceholderWorkflowSupported(
	activePlaceholderWorkflowPromptContext.activePlaceholderWorkflowName,
)
```

At [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2816), spread `...activePlaceholderWorkflowPromptContext` as it already does, and add:

```ts
activeDeterministicPlaceholderWorkflowEnabled,
```

#### 5C. `src/core/task/tools/subagent/SubagentRunner.ts`

At [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L939), after `activePlaceholderWorkflowPromptContext` is computed and before the returned object literal, add:

```ts
const activeDeterministicPlaceholderWorkflowEnabled = isDeterministicPlaceholderWorkflowSupported(
	activePlaceholderWorkflowPromptContext.activePlaceholderWorkflowName,
)
```

At [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L955), add:

```ts
activeDeterministicPlaceholderWorkflowEnabled,
```

#### 5D. `src/core/task/focus-chain/index.ts`

At [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L350), add a new private method:

```ts
private consumeAutoCompletedPlaceholderWorkflowNoticesForPrompt(): string | undefined
```

Exact output:
- if no notices, return `undefined`
- otherwise:
  - build this exact section:

```md
# AUTO-COMPLETED WORKFLOW STEPS

The runtime auto-completed these workflow steps:
- ${checklistLabel} — ${reason}

No action was required from you for those steps.
```

- clear `this.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices`
- return the formatted string

At [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L364), change `buildPlaceholderWorkflowStepPrompt(...)` logic as follows:

1. Compute:

```ts
const deterministicWorkflowSupported = isDeterministicPlaceholderWorkflowSupported(stepDetails.sourceName)
const autoCompletedNoticeSection = this.consumeAutoCompletedPlaceholderWorkflowNoticesForPrompt()
```

2. Replace the current reminder/body strings for supported workflows with these exact strings:

Reminder section:

```ts
"### Reminder: Detailed instructions are shown for the first incomplete checklist item. The runtime may auto-complete supported workflow steps when their Done Signals are deterministically satisfied."
```

Current-step body lines, in this exact order:

```ts
"# CURRENT WORKFLOW STEP",
`You are currently on this step: ${stepDetails.checklistLabel}`,
stepDetails.details.trim(),
"Focus on completing this step.",
"The runtime may auto-complete supported workflow steps when their Done Signals are deterministically satisfied.",
"If this step is not auto-completed by the runtime, complete it normally.",
'Only use `task_progress` with `__COMPLETE_NEXT_STEP__` when this step is not auto-completed by the runtime and its "Done Signal" is true.',
"Once the checklist advances, I'll give you the next step's details.",
```

3. For unsupported workflows, keep the current strings exactly as they are now.

4. Insert `autoCompletedNoticeSection` between `userUpdatedWarning` and the current-step body.

Do not change managed-workflow prompting in this step.

#### 5E. `src/core/prompts/system-prompt/components/task_progress.ts`

At [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L31), keep the existing unsupported placeholder constant in place, but add a second constant immediately after it:

```ts
export const DETERMINISTIC_PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER =
	'If the current supported step is not auto-completed by the runtime and its "Done Signal" is true, use the next relevant `send_user_message` tool call to briefly tell the user what step you are completing, and include `task_progress` with `__COMPLETE_NEXT_STEP__`. Use it only once in that assistant turn.'
```

Then add:

```ts
const UPDATING_TASK_PROGRESS_PLACEHOLDER_WORKFLOW_DETERMINISTIC = `UPDATING TASK PROGRESS

The user has triggered a workflow with a prebuilt checklist.
- Instructions are automatically sent for the first incomplete item on the checklist each turn.
- The runtime may auto-complete supported workflow steps when their Done Signals are deterministically satisfied.
- If the current step is not auto-completed by the runtime, complete it normally.
- ${DETERMINISTIC_PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER}`
```

At [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L56), change the placeholder-workflow branch to:

```ts
if (context.activeWorkflowSupportsPlaceholders) {
	return context.activeDeterministicPlaceholderWorkflowEnabled
		? UPDATING_TASK_PROGRESS_PLACEHOLDER_WORKFLOW_DETERMINISTIC
		: UPDATING_TASK_PROGRESS_PLACEHOLDER_WORKFLOW
}
```

#### 5F. `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts`

At [template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/template.ts#L35), replace `const TASK_PROGRESS = \`...\`` with `const TASK_PROGRESS = (context: SystemPromptContext) => ...`

When `context.activeDeterministicPlaceholderWorkflowEnabled` is true, return exactly:

```ts
`UPDATING TASK PROGRESS

Use \`task_progress\` only as a checklist parameter on the next tool call, not a standalone tool.

- The user has triggered a workflow with a prebuilt checklist.
- Instructions are automatically sent for the first incomplete item on the checklist each turn.
- The runtime may auto-complete supported workflow steps when their Done Signals are deterministically satisfied.
- If the current step is not auto-completed by the runtime, use the next relevant \`send_user_message\` tool call to briefly tell the user what you finished and include \`task_progress: "__COMPLETE_NEXT_STEP__"\` on that same tool call.`
```

When false, return the current existing string unchanged.

#### 5G. `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`

At [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L52), replace `GPT5_1_TASK_PROGRESS` with a conditional function using the same exact supported-workflow string as Step 5F, except keep the function name unchanged.

When not supported, return the current string unchanged.

#### 5H. `src/core/prompts/system-prompt/variants/gpt-5/template.ts`

At [template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/template.ts#L37), replace `const TASK_PROGRESS = \`...\`` with a conditional function.

When `context.activeDeterministicPlaceholderWorkflowEnabled` is true, return exactly:

```ts
`UPDATING TASK PROGRESS

Use \`task_progress\` only as a checklist parameter on the next tool call, not a standalone tool.

- The user has triggered a workflow with a prebuilt checklist.
- Instructions are automatically sent for the first incomplete item on the checklist each turn.
- The runtime may auto-complete supported workflow steps when their Done Signals are deterministically satisfied.
- If the current step is not auto-completed by the runtime and its Done Signal is true, use the next relevant \`send_user_message\` tool call to briefly tell the user what you finished and include \`task_progress: "__COMPLETE_NEXT_STEP__"\` on that same tool call.`
```

When false, return the current string unchanged.

#### 5I. `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`

At [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L34), change `getNextStepGuidance(...)` to take a second boolean parameter:

```ts
function getNextStepGuidance(
	isManagedWorkflow: boolean,
	activeDeterministicPlaceholderWorkflowEnabled: boolean,
): string
```

Keep the managed-workflow branch unchanged.

For deterministic placeholder workflows, return exactly:

```ts
"Continue the current placeholder workflow step. The runtime may auto-complete supported workflow steps when their Done Signals are deterministically satisfied. If the current step is not auto-completed by the runtime and its Done Signal is true, use `task_progress` with `__COMPLETE_NEXT_STEP__` on the next relevant tool call, and use it only once in that assistant turn."
```

For unsupported placeholder workflows, keep the current guidance string unchanged.

At [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L136), compute:

```ts
const activeDeterministicPlaceholderWorkflowEnabled = isDeterministicPlaceholderWorkflowSupported(
	config.taskState.activePlaceholderWorkflowSource?.name,
)
```

and pass it into `getNextStepGuidance(...)`.

### Pause Point 5

Stop after Step 5 and report:
- the exact new prompt-context field name
- the exact files where placeholder-step guidance changed
- the exact supported-workflow guidance string now used for placeholder workflows
- confirmation that unsupported placeholder workflows still receive the old `task_progress` instructions

Do not proceed until this checkpoint is reviewed.

## Step 6: Add Tests

### Allowed Files

- `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
- `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
- `src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts`

### Exact Changes

#### 6A. Create `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`

Add focused tests for:

1. `isDeterministicPlaceholderWorkflowSupported(...)`
- returns true for `code-review`
- returns true for `dev-story`
- returns false for `review-edge-case-hunter.md`

2. `code-review` Step 4
- with fresh `review-input.md` and fresh `review-input.diff`, checklist advances one step and `review_mode` becomes `full`
- with only fresh `review-input.md`, `review_mode` becomes `file-scope`
- with only fresh `review-input.diff`, `review_mode` becomes `diff`

3. `code-review` Step 6
- fresh `spec_file` with `Status: ready-for-dev` completes
- stale `spec_file` does not complete

4. `dev-story` Step 2
- `## Tasks / Subtasks` section with only checked items completes
- same file with one unchecked nested subtask does not complete
- checklist items outside `## Tasks / Subtasks` do not affect the result

5. unsupported workflow
- unchanged checklist
- no notices

#### 6B. Modify `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`

Update the first prompt test at [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L27) as follows:

- change the workflow name from `local-review.md` to `code-review`
- update expectations to assert:
  - prompt contains `The runtime may auto-complete supported workflow steps when their Done Signals are deterministically satisfied.`
  - prompt does **not** contain `I determine the active step from your latest \`task_progress\` update.`

Add a new test immediately after it:
- seed one pending auto-completed notice in `taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices`
- assert the prompt contains `# AUTO-COMPLETED WORKFLOW STEPS`
- assert the notice text is rendered
- assert the notices array is cleared after prompt generation

Keep the existing unsupported-workflow behavior test intact.

#### 6C. Modify `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`

Add a new placeholder-workflow test case using:
- `activeWorkflowSupportsPlaceholders: true`
- `activeDeterministicPlaceholderWorkflowEnabled: true`

Assert the returned text contains:
- `The runtime may auto-complete supported workflow steps when their Done Signals are deterministically satisfied.`
- `If the current step is not auto-completed by the runtime`

Keep the existing placeholder-workflow test, but explicitly set:
- `activeDeterministicPlaceholderWorkflowEnabled: false`

and keep its current expectations unchanged.

#### 6D. Modify `src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts`

Add a new test after the existing execution-path tests that:

- sets:
  - `taskState.activePlaceholderWorkflowId = "code-review"`
  - `taskState.activePlaceholderWorkflowSource = { type: "remote", name: "code-review", contents: "" }`
- stubs `SubagentRunner.prototype.run` twice to return completed results
- invokes `use_subagents` with:
  - one prompt containing `review-adversarial-general.md`
  - one prompt containing `review-edge-case-hunter.md`
- asserts:
  - `taskState.activePlaceholderWorkflowDeterministicState?.codeReview?.completedReviewLayers.adversarial_general === "subagent_report"`
  - `taskState.activePlaceholderWorkflowDeterministicState?.codeReview?.completedReviewLayers.edge_case_hunter === "subagent_report"`

Do not add snapshot tests in this step.

### Pause Point 6

Stop after Step 6 and report:
- the exact new test file created
- the exact existing test files modified
- the exact behaviors now covered for `code-review` and `dev-story`

Do not proceed until this checkpoint is reviewed.

## Step 7: Validation

### Allowed Files

- no source edits unless a validation failure directly identifies a defect in one of the files already allowed above

### Exact Commands

Run exactly these commands, in this order:

1. `npm run test:unit -- --exit src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
2. `npm run test:unit -- --exit src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
3. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
4. `npm run test:unit -- --exit src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts`

If all 4 pass, stop.

If any fail:
- fix only the files already listed in this action plan
- rerun only the failing command until it passes
- then rerun all 4 commands in the original order

Do not update snapshots unless a validation command explicitly fails only because of directly expected prompt-string output changes caused by this action plan, and the changed snapshot belongs to one of the modified prompt test surfaces. If that happens, stop and ask for input before updating any snapshot.

## Final Report Requirements For The Executing Agent

The executing agent's final report must include:
- whether the implementation matched this action plan exactly
- any deviations
- the result of each pause point review
- validation results for all 4 commands
- the full changed-file list
- any ambiguity or blockers encountered

If any ambiguity was discovered and no user answer was obtained, the agent must stop before coding that portion and say exactly what was ambiguous.

## Remediation Addendum: Corrective Work Required Before Merge

This addendum is normative and overrides any conflicting instruction earlier in this document.

When this addendum conflicts with:
- Step 2
- Step 3
- Step 5
- Step 6
- Step 7

follow this addendum.

### Addendum-Wide Rules

Supported deterministic placeholder workflows are:
- `code-review`
- `dev-story`

For those supported workflows only, progression is fully backend-managed.

That means:
- the agent must never be told to manually advance the workflow
- `task_progress` must not appear in tool schema while a supported deterministic placeholder workflow is active
- `task_progress` must not appear in prompt text while a supported deterministic placeholder workflow is active
- the only supported-workflow progression guidance shown to the agent must be:
  - the current step details
  - a statement that the next step's details will be shown automatically once the current step is correctly completed
  - auto-completed-step notices when the runtime already advanced a step

If any instruction in the original plan leaves room for hybrid runtime/manual progression for supported workflows, that instruction is superseded by this addendum.

## Step 8: Tighten Deterministic Resolver Gates For `code-review`

### Allowed Files

- `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
- `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`

### Exact Changes

#### 8A. `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`

At [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L94), replace the current helper:

```ts
async function resolveCodeReviewArtifactPath(...)
```

with this new helper:

```ts
async function resolveFreshPlaceholderArtifactPath(args: {
	placeholders: Record<string, string>
	placeholderKey: "review_input" | "diff_output"
	taskStartTimeMs: number
}): Promise<string | undefined>
```

Exact behavior:
- read only `args.placeholders[args.placeholderKey]`
- trim it
- if it is empty or missing, return `undefined`
- if the referenced file is not fresh according to `fileExistsAndIsFresh(...)`, return `undefined`
- otherwise return that placeholder path

Do not fall back to `{output_folder}` filenames in this helper.

At [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L160), replace `code-review` Step 2 logic with this exact rule:

- complete only if `{review_input}` exists in merged placeholders
- and `{review_input}` points to a fresh file for the current task run

Use this exact reason string:

```ts
"review_input points to a fresh review-input.md artifact."
```

At [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L176), replace `code-review` Step 3 logic with this exact rule:

- complete only if `{diff_output}` exists in merged placeholders
- and `{diff_output}` points to a fresh file for the current task run

Use this exact reason string:

```ts
"diff_output points to a fresh review-input.diff artifact."
```

At [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L192), replace `code-review` Step 4 logic so it derives `review_mode` only from fresh placeholder-backed artifact paths returned by `resolveFreshPlaceholderArtifactPath(...)`.

Exact Step 4 rules:
- if fresh `{review_input}` and fresh `{diff_output}` both exist, set `review_mode = "full"`
- else if only fresh `{review_input}` exists, set `review_mode = "file-scope"`
- else if only fresh `{diff_output}` exists, set `review_mode = "diff"`
- else do not complete

Do not inspect `{output_folder}/review-input.md` or `{output_folder}/review-input.diff` directly in Step 4.

Do not change `code-review` Step 5 fallback prompt behavior in this step.

#### 8B. `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`

Add these exact test cases after the existing `code-review` Step 4 tests:

1. Step 2 does not complete when:
- `{output_folder}/review-input.md` exists and is fresh
- but `{review_input}` is missing

Expected result:
- checklist remains unchanged

2. Step 3 does not complete when:
- `{output_folder}/review-input.diff` exists and is fresh
- but `{diff_output}` is missing

Expected result:
- checklist remains unchanged

3. Step 4 does not complete when:
- both fallback files exist and are fresh
- but neither `{review_input}` nor `{diff_output}` is set

Expected result:
- checklist remains unchanged
- `review_mode` remains unset

Keep the existing positive Step 4 cases, but update them so the test task state explicitly sets:
- `{review_input}` to the fresh review-input path when needed
- `{diff_output}` to the fresh diff path when needed

### Pause Point 8

Stop after Step 8 and report:
- the exact new helper name introduced
- the exact new Step 2 reason string
- the exact new Step 3 reason string
- confirmation that `code-review` Steps 2, 3, and 4 no longer auto-complete from bare fallback-file existence alone

Do not proceed until this checkpoint is reviewed.

## Step 9: Persist, Restore, And Clear Deterministic Placeholder State Correctly

### Allowed Files

- `src/core/task/index.ts`
- `src/core/task/workflow-activation.ts`
- `src/core/task/tools/handlers/UseSkillToolHandler.ts`
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

### Exact Changes

#### 9A. `src/core/task/index.ts`

At [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1476), extend the metadata save block to also write:

```ts
taskMetadata.activePlaceholderWorkflowDeterministicState =
	this.taskState.activePlaceholderWorkflowDeterministicState
taskMetadata.pendingAutoCompletedPlaceholderWorkflowStepNotices =
	this.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices
```

At [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1619), extend the metadata restore block to also assign:

```ts
this.taskState.activePlaceholderWorkflowDeterministicState =
	metadata.activePlaceholderWorkflowDeterministicState
this.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices =
	metadata.pendingAutoCompletedPlaceholderWorkflowStepNotices ?? []
```

At each placeholder-workflow clearing block in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1419), [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1447), and [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1464), add these exact resets whenever placeholder workflow identity/values are cleared:

```ts
this.taskState.activePlaceholderWorkflowDeterministicState = undefined
this.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = []
```

#### 9B. `src/core/task/workflow-activation.ts`

At [workflow-activation.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts#L40), in `activateManagedWorkflowInTaskState(...)`, after the placeholder workflow fields are cleared, also clear:

```ts
args.taskState.activePlaceholderWorkflowDeterministicState = undefined
args.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = []
```

At [workflow-activation.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts#L74), in `activatePlaceholderWorkflowInTaskState(...)`, add:

- if `workflowChanged === true`, set:

```ts
args.taskState.activePlaceholderWorkflowDeterministicState = undefined
args.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = []
```

- if `workflowChanged === false`, preserve the existing in-memory deterministic state and notices

Do not introduce any new metadata persistence logic in this file.

#### 9C. `src/core/task/tools/handlers/UseSkillToolHandler.ts`

At each placeholder-workflow clearing block in [UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts#L262), add these exact resets:

```ts
config.taskState.activePlaceholderWorkflowDeterministicState = undefined
config.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = []
```

Do not modify any managed-workflow logic in this step.

#### 9D. `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

In the existing restore test at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L36), extend the stubbed metadata with:

```ts
activePlaceholderWorkflowDeterministicState: {
	codeReview: {
		completedReviewLayers: {
			adversarial_general: "subagent_report",
		},
	},
},
pendingAutoCompletedPlaceholderWorkflowStepNotices: [
	{
		workflowName: "code-review",
		stepNumber: 4,
		checklistLabel: "Step 4: Set Review Mode",
		reason: "review_mode was derived deterministically from fresh review artifacts.",
	},
],
```

Add assertions that the restored `TaskState` contains both of those fields.

Add one new test immediately after it:
- seed a `TaskState` with:
  - `activePlaceholderWorkflowId = "code-review"`
  - `activePlaceholderWorkflowDeterministicState` populated
  - `pendingAutoCompletedPlaceholderWorkflowStepNotices` populated
- call `activateManagedWorkflowInTaskState(...)`
- assert both fields are cleared

### Pause Point 9

Stop after Step 9 and report:
- the exact metadata fields now restored on task resume
- the exact files where deterministic placeholder state is cleared on workflow exit/switch
- confirmation that deterministic state is preserved only when the same placeholder workflow remains active

Do not proceed until this checkpoint is reviewed.

## Step 10: Remove `task_progress` From Supported-Workflow Schema And Prompting

### Allowed Files

- `src/core/prompts/system-prompt/types.ts`
- `src/core/prompts/system-prompt/components/task_progress.ts`
- `src/core/prompts/system-prompt/components/continuation_turn.ts`
- `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts`
- `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`
- `src/core/prompts/system-prompt/variants/gpt-5/template.ts`
- `src/core/task/focus-chain/index.ts`
- `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`
- `src/core/prompts/system-prompt/tools/attempt_completion.ts`
- `src/core/prompts/system-prompt/tools/act_mode_respond.ts`
- `src/core/prompts/system-prompt/tools/generate_plan_output.ts`
- `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
- `src/core/prompts/system-prompt/__tests__/spec.test.ts`

### Exact Changes

#### 10A. `src/core/prompts/system-prompt/types.ts`

At [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L282), extend `TASK_PROGRESS_PARAMETER` with:

```ts
	contextRequirements: (context: SystemPromptContext) =>
		context.activeDeterministicPlaceholderWorkflowEnabled !== true,
```

Do not change its `name`, `instruction`, or `usage` text in this step.

#### 10B. `src/core/prompts/system-prompt/tools/attempt_completion.ts`

At each `task_progress` parameter definition in [attempt_completion.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts#L29), [attempt_completion.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts#L62), and [attempt_completion.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts#L93), add:

```ts
contextRequirements: (context) => context.activeDeterministicPlaceholderWorkflowEnabled !== true,
```

At [attempt_completion.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts#L79), replace the `NATIVE_NEXT_GEN` / `NATIVE_GPT_5` description with this exact string:

```ts
"Once you've completed the user's task, use this tool to present the final result to the user, including a brief and very short (1-2 paragraph) summary of the task and what was done to resolve it. On success, this tool displays your message to the user, returns `[Message displayed.]`, and ends your current turn. Any later user reply arrives on the following turn as normal human-authored input. Example: result=\"Implemented the fix and verified it with tests.\" You should only call this tool when you have completed all necessary work for the user's request."
```

Do not mention `task_progress` anywhere in that replacement description.

#### 10C. `src/core/prompts/system-prompt/tools/act_mode_respond.ts`

At [act_mode_respond.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/act_mode_respond.ts#L38), add this exact `contextRequirements` to the `task_progress` parameter:

```ts
contextRequirements: (context) => context.activeDeterministicPlaceholderWorkflowEnabled !== true,
```

#### 10D. `src/core/prompts/system-prompt/tools/generate_plan_output.ts`

At each `task_progress` parameter definition in [generate_plan_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/generate_plan_output.ts#L49), [generate_plan_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/generate_plan_output.ts#L73), and [generate_plan_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/generate_plan_output.ts#L102), add:

```ts
contextRequirements: (context) => context.activeDeterministicPlaceholderWorkflowEnabled !== true,
```

Do not change any other `generate_plan_output` wording in this step.

#### 10E. `src/core/prompts/system-prompt/components/task_progress.ts`

At [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L31), remove both placeholder-workflow reminder exports:
- `PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER`
- `DETERMINISTIC_PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER`

Keep the managed-workflow text unchanged.

At [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L52), change `getUpdatingTaskProgress(...)` so that:

- if `context.activeDeterministicPlaceholderWorkflowEnabled === true`, return `undefined`
- if `context.activeWorkflowSupportsPlaceholders === true` and `activeDeterministicPlaceholderWorkflowEnabled !== true`, keep the existing unsupported placeholder workflow string unchanged
- otherwise keep the existing generic behavior unchanged

Do not emit any supported-placeholder-workflow `UPDATING TASK PROGRESS` block.

#### 10F. `src/core/prompts/system-prompt/components/continuation_turn.ts`

Remove the import of `PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER` at [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L6).

Replace `getFocusChainReminderLine(...)` with this exact branching behavior:

- if `context.activeDeterministicPlaceholderWorkflowEnabled === true`, return:

```ts
"- Once you correctly complete the current step, the next step's details will be shown automatically."
```

- else if `context.activeWorkflowSupportsPlaceholders && !context.managedWorkflowActive`, return the existing unsupported placeholder reminder line
- else return the existing generic reminder line

Do not mention `task_progress` in the supported-workflow branch.

#### 10G. `src/core/task/focus-chain/index.ts`

At [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L389), replace the supported deterministic placeholder-workflow `currentStepBody` with this exact text block:

```ts
[
	"# CURRENT WORKFLOW STEP",
	`You are currently on this step: ${stepDetails.checklistLabel}`,
	stepDetails.details.trim(),
	"Focus on correctly completing this step.",
	"Once you correctly complete this step, the next step's details will be shown automatically.",
].join("\n\n")
```

At [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L414), replace the supported deterministic reminder string with this exact string:

```ts
"### Reminder: Detailed instructions are shown for the first incomplete checklist item. Once you correctly complete the current step, the next step's details will be shown automatically."
```

Do not mention `task_progress` anywhere in the supported deterministic placeholder-workflow branch.

Keep the auto-completed notice section intact.

#### 10H. `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`

At [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L37), change the deterministic supported-workflow return string in `getNextStepGuidance(...)` to this exact text:

```ts
"Continue the current placeholder workflow step. Once you correctly complete the current step, the next step's details will be shown automatically."
```

Do not mention `task_progress`, `__COMPLETE_NEXT_STEP__`, or fallback manual advancement in that branch.

Keep the unsupported placeholder workflow guidance unchanged.

#### 10I. `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts`

At [template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/template.ts#L35), change the deterministic supported-workflow branch of `TASK_PROGRESS` to return:

```ts
""
```

Do not include any supported-workflow replacement text in this file.

Keep the non-supported branch unchanged.

#### 10J. `src/core/prompts/system-prompt/variants/gpt-5/template.ts`

At [template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/template.ts#L36), change the deterministic supported-workflow branch of `TASK_PROGRESS` to return:

```ts
""
```

Keep the non-supported branch unchanged.

#### 10K. `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`

At [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L42), change:

```ts
When switching domains or task_progress steps, you may want to provide a brief preamble explaining:
```

to:

```ts
When switching domains or major phases of work, you may want to provide a brief preamble explaining:
```

At [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L48), change:

```ts
Format: "Now that we have [very brief summary of last task_progress items that was completed], I will use [ToolName] to [specific action/goal]"
```

to:

```ts
Format: "Now that we have [very brief summary of the last completed phase], I will use [ToolName] to [specific action/goal]"
```

At [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L53), change the deterministic supported-workflow branch of `GPT5_1_TASK_PROGRESS` to return:

```ts
""
```

At [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L88), replace:

```ts
Report progress via task_progress parameter throughout the task to maintain visibility into what's been accomplished and what remains.
```

with:

```ts
Keep the user informed as you move through the task and its major phases of work.
```

At [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L111), replace both occurrences of `task_progress steps` with `major phases of work`.

Do not leave any `task_progress` mention anywhere in the deterministic supported-workflow branch or surrounding GPT-5.1 instructional prose.

### Pause Point 10

Stop after Step 10 and report:
- the exact files where `task_progress` schema exposure was removed for supported workflows
- the exact files where supported-workflow prompt text no longer mentions `task_progress`
- confirmation that the only supported-workflow progression guidance now says the next step's details will be shown automatically once the current step is correctly completed

Do not proceed until this checkpoint is reviewed.

## Step 11: Update Tests For The Remediation Rules

### Allowed Files

- `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
- `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
- `src/core/prompts/system-prompt/__tests__/spec.test.ts`

### Exact Changes

#### 11A. `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`

Keep the Step 8 test additions and ensure they assert:
- no Step 2 completion from fallback file existence alone
- no Step 3 completion from fallback file existence alone
- no Step 4 completion from fallback file existence alone without placeholders

#### 11B. `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Keep the Step 9 restore assertions and managed-workflow clearing test exactly as described in Step 9D.

#### 11C. `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`

Update the supported deterministic placeholder prompt test so it now asserts:
- prompt contains `Once you correctly complete this step, the next step's details will be shown automatically.`
- prompt does **not** contain ``task_progress``
- prompt does **not** contain `__COMPLETE_NEXT_STEP__`
- prompt still contains `# CURRENT WORKFLOW STEP`

Keep the auto-completed notice rendering test intact.

Keep the unsupported placeholder workflow behavior test intact.

#### 11D. `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`

Replace the existing deterministic supported placeholder workflow assertion from Step 6C with this exact expectation:

- when:
  - `activeWorkflowSupportsPlaceholders: true`
  - `activeDeterministicPlaceholderWorkflowEnabled: true`
- the returned value from `getUpdatingTaskProgress(...)` is exactly `undefined`

Keep the unsupported placeholder workflow test and the generic task-progress test intact.

#### 11E. `src/core/prompts/system-prompt/__tests__/spec.test.ts`

Add one new test that builds native tool definitions using a context with:
- `activeWorkflowSupportsPlaceholders: true`
- `activeDeterministicPlaceholderWorkflowEnabled: true`

In that test:
- build `write_to_file` native schema and assert `task_progress` is absent from `parameters.properties`
- build `attempt_completion` native schema and assert `task_progress` is absent from `parameters.properties`
- build `act_mode_respond` native schema and assert `task_progress` is absent from `parameters.properties`
- build `generate_plan_output` native schema and assert `task_progress` is absent from `parameters.properties`

Do not add snapshot assertions in this step.

### Pause Point 11

Stop after Step 11 and report:
- the exact tests added for stricter `code-review` Step 2/3/4 gates
- the exact tests added for deterministic-state restore/clear behavior
- the exact tests proving `task_progress` is absent from supported-workflow prompt output and native tool schema

Do not proceed until this checkpoint is reviewed.

## Step 12: Remediation Validation

### Allowed Files

- no source edits unless a validation failure directly identifies a defect in one of the files allowed by Steps 8-11

### Exact Commands

Run exactly these commands, in this order:

1. `npm run test:unit -- --exit src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
2. `npm run test:unit -- --exit src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
3. `npm run test:unit -- --exit src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
4. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
5. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/spec.test.ts`

If all 5 pass, stop.

If any fail:
- fix only the files already listed in Steps 8-11
- rerun only the failing command until it passes
- then rerun all 5 commands in the original order

Do not update snapshots during this remediation addendum. If any snapshot changes are suggested, stop and ask for input before proceeding.

## Remediation Addendum 2: Persist Consumed Auto-Completed Notices

This addendum corrects the remaining persistence defect discovered after the first remediation pass:

- `pendingAutoCompletedPlaceholderWorkflowStepNotices` are consumed in memory for prompt assembly but not persisted as cleared.
- Because task resume restores those notices from metadata, stale auto-completed-step notices can be replayed after reopening a task.

This addendum is intentionally narrow. Execute only the steps in this addendum when addressing this defect.

### Addendum 2 Execution Rules

- Do not revisit or rework the earlier implementation unless explicitly required by the steps below.
- Do not change any deterministic progression rules, prompt text, or tool schema behavior in this addendum.
- Do not widen persistence behavior beyond the specific notice-consumption defect described above.
- If any ambiguity is discovered, or if any necessary change is not explicitly prescribed here, stop and ask for input before proceeding.

## Step 13: Persist Notice Consumption In `FocusChainManager`

### Allowed Files

- `src/core/task/focus-chain/index.ts`

### Exact Changes

#### 13A. Add a dedicated helper that clears and persists consumed notices.

In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L323), replace the existing private method:

- `private consumeAutoCompletedPlaceholderWorkflowNoticesForPrompt(): string | undefined`

with this exact async signature:

```ts
private async consumeAutoCompletedPlaceholderWorkflowNoticesForPrompt(): Promise<string | undefined>
```

The method must keep the existing section text exactly the same:

- `# AUTO-COMPLETED WORKFLOW STEPS`
- `The runtime auto-completed these workflow steps:`
- one bullet per notice using:
  - ``- ${notice.checklistLabel} — ${notice.reason}``
- `No action was required from you for those steps.`

After the section string is built, the method must:

1. assign:

```ts
this.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = []
```

2. immediately persist the cleared array by calling:

```ts
await this.persistPlaceholderWorkflowMetadata()
```

3. return the already-built section string.

Do not move this persistence responsibility into another method in this step. The consumption method itself must own the clear-and-persist behavior.

#### 13B. Update the call site to await the async consumption method.

At the existing call site in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L379), change:

```ts
const autoCompletedNoticeSection = this.consumeAutoCompletedPlaceholderWorkflowNoticesForPrompt()
```

to:

```ts
const autoCompletedNoticeSection = await this.consumeAutoCompletedPlaceholderWorkflowNoticesForPrompt()
```

Do not change any surrounding prompt text or prompt-section ordering.

#### 13C. Do not change `persistPlaceholderWorkflowMetadata()` behavior.

Do not edit:

- the fields written by `persistPlaceholderWorkflowMetadata()`
- its managed-workflow early return
- its error-swallowing behavior

This step only ensures that already-existing persistence is invoked at the correct time after notice consumption.

### Pause Point 13

Stop after Step 13 and report:
- the exact method signature change made in `FocusChainManager`
- the exact line of logic that now persists consumed notices
- confirmation that no prompt strings or deterministic resolver rules were changed

Do not proceed until this checkpoint is reviewed.

## Step 14: Add Regression Coverage For Notice Consumption Persistence

### Allowed Files

- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

### Exact Changes

Add one new test case to [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts).

Place it in the existing `describe("placeholder workflow persistence", ...)` block after the current restore test and before the managed-workflow-clearing test.

The new test title must be exactly:

```ts
it("persists consumed auto-completed placeholder workflow notices as cleared after prompt generation", async () => {
```

The new test must do all of the following:

1. Create a Sinon sandbox.
2. Stub `disk.getTaskMetadata` to resolve metadata containing:
   - `activePlaceholderWorkflowId: "code-review"`
   - `activePlaceholderWorkflowSource` with a minimal remote workflow containing at least:
     - `## Step 1: Gather Context`
     - `## Step 2: Review`
   - `pendingAutoCompletedPlaceholderWorkflowStepNotices` with exactly one notice:

```ts
{
	workflowName: "code-review",
	stepNumber: 4,
	checklistLabel: "Step 4: Set Review Mode",
	reason: "review_mode was derived deterministically from fresh review artifacts.",
}
```

3. Stub `disk.saveTaskMetadata` and capture its calls.
4. Restore metadata into a fake task by calling:

```ts
await (Task.prototype as any).restoreBmadStateFromMetadata.call(fakeTask)
```

5. Set:

```ts
fakeTask.taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review"
```

6. Construct a `FocusChainManager` using the existing local `createFocusChainManager(...)` helper.
7. Call:

```ts
const prompt = await manager.generateFocusChainInstructions()
```

8. Assert that `prompt` contains:
   - `# AUTO-COMPLETED WORKFLOW STEPS`
   - `Step 4: Set Review Mode`

9. Assert that in memory, notices are cleared:

```ts
expect(fakeTask.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
```

10. Assert that `saveTaskMetadata` was called at least once after prompt generation.
11. Find the final metadata argument passed to `saveTaskMetadata` and assert:

```ts
expect(savedMetadata.pendingAutoCompletedPlaceholderWorkflowStepNotices).to.deep.equal([])
```

12. Do not assert on unrelated metadata fields in this new test.

Use the same sandbox setup/restore style already used elsewhere in this file.

### Pause Point 14

Stop after Step 14 and report:
- the exact new regression test name
- the exact prompt content assertions added
- the exact persisted-cleared-state assertion added against `saveTaskMetadata`

Do not proceed until this checkpoint is reviewed.

## Step 15: Add Focus-Chain-Level Regression Coverage

### Allowed Files

- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`

### Exact Changes

Add one new test to [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts).

The purpose of this test is to verify the prompt-level behavior directly inside the focus-chain test suite.

The new test title must be exactly:

```ts
it("shows auto-completed notices once and clears them from persisted placeholder metadata", async () => {
```

The test must:

1. Create a `TaskState` with:
   - a supported deterministic placeholder workflow source for `code-review`
   - a checklist whose first incomplete item resolves to a valid step
   - one `pendingAutoCompletedPlaceholderWorkflowStepNotices` entry matching the Step 4 notice used above

2. Stub the metadata persistence layer used by `persistPlaceholderWorkflowMetadata()` so no real disk write occurs.
   - Stub both `getTaskMetadata` and `saveTaskMetadata` from `@/core/storage/disk` in the same style used elsewhere in the repo.

3. Build a real `FocusChainManager` instance with the existing test helper pattern already used in this file.

4. Call `generateFocusChainInstructions()` once and assert:
   - the returned prompt contains `# AUTO-COMPLETED WORKFLOW STEPS`
   - the returned prompt contains `No action was required from you for those steps.`

5. Assert the in-memory notices array is now empty.

6. Assert the final metadata object passed to `saveTaskMetadata` contains:

```ts
pendingAutoCompletedPlaceholderWorkflowStepNotices: []
```

7. Call `generateFocusChainInstructions()` a second time without re-adding notices.
8. Assert the second prompt does not contain:
   - `# AUTO-COMPLETED WORKFLOW STEPS`
   - `Step 4: Set Review Mode`

Do not add any assertions unrelated to notice consumption/clear-once behavior.

### Pause Point 15

Stop after Step 15 and report:
- the exact new focus-chain regression test name
- confirmation that first prompt includes the notice section
- confirmation that second prompt omits the notice section
- the exact persisted metadata-clearing assertion added

Do not proceed until this checkpoint is reviewed.

## Step 16: Remediation Addendum 2 Validation

### Allowed Files

- no source edits unless a validation failure directly identifies a defect in one of the files allowed by Steps 13-15

### Exact Commands

Run exactly these commands, in this order:

1. `npm run test:unit -- --exit src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
2. `npm run test:unit -- --exit src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`

If both pass, stop.

If either fails:
- fix only the files already listed in Steps 13-15
- rerun only the failing command until it passes
- then rerun both commands in the original order

Do not update snapshots during this addendum. If any snapshot changes are suggested, stop and ask for input before proceeding.

## Remediation Addendum 3: Canonical `.md` Placeholder Workflow Names

This addendum fixes the regression where deterministic placeholder workflow support was implemented against bare workflow names (`code-review`, `dev-story`) instead of the canonical registered workflow names (`code-review.md`, `dev-story.md`).

This addendum is grounded in:
- [core-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/deterministic-workflow-progression/core-requirements.md)
- [implementation-spec.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/deterministic-workflow-progression/implementation-spec.md)
- [test-22-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-22-findings.md)

The executing agent must follow this addendum literally.

## [x] Remediation Step 17: Update Production Code To Use Canonical `.md` Workflow Names

### Allowed Files

- `src/core/task/TaskState.ts`
- `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
- `src/core/task/tools/handlers/SubagentToolHandler.ts`

### Exact Changes

#### 17A. Update the deterministic workflow name type in `TaskState.ts`.

At [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L32), replace:

```ts
export type DeterministicPlaceholderWorkflowName = "code-review" | "dev-story"
```

with:

```ts
export type DeterministicPlaceholderWorkflowName = "code-review.md" | "dev-story.md"
```

Do not introduce a helper type alias, normalization helper, or compatibility helper in this step.

#### 17B. Update deterministic support checks and branching in `deterministicPlaceholderProgression.ts`.

At [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L27-L30), replace:

```ts
export function isDeterministicPlaceholderWorkflowSupported(
	workflowName?: string,
): workflowName is DeterministicPlaceholderWorkflowName {
	return workflowName === "code-review" || workflowName === "dev-story"
}
```

with:

```ts
export function isDeterministicPlaceholderWorkflowSupported(
	workflowName?: string,
): workflowName is DeterministicPlaceholderWorkflowName {
	return workflowName === "code-review.md" || workflowName === "dev-story.md"
}
```

At [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L348), replace:

```ts
if (args.workflowName === "code-review") {
```

with:

```ts
if (args.workflowName === "code-review.md") {
```

Do not add any fallback handling for bare names in this file.

#### 17C. Update code-review-specific subagent detection to use the canonical name.

At [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts#L69-L70), replace:

```ts
function isActiveCodeReviewPlaceholderWorkflow(config: TaskConfig): boolean {
	return config.taskState.activePlaceholderWorkflowSource?.name === "code-review"
}
```

with:

```ts
function isActiveCodeReviewPlaceholderWorkflow(config: TaskConfig): boolean {
	return config.taskState.activePlaceholderWorkflowSource?.name === "code-review.md"
}
```

Do not modify any other production file in this step.

### Pause Point 17

Stop after Step 17 and report:
- the exact new `DeterministicPlaceholderWorkflowName` union
- the exact canonical strings now accepted by `isDeterministicPlaceholderWorkflowSupported(...)`
- confirmation that no helper, normalization layer, or workflow-file change was introduced

Do not proceed until this checkpoint is reviewed.

## [x] Remediation Step 18: Update Regression Tests To The Canonical `.md` Contract

### Allowed Files

- `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- `src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts`

### Exact Changes

#### 18A. Update deterministic progression tests to assert canonical `.md` names.

In [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L38-L43):

Replace:

```ts
expect(isDeterministicPlaceholderWorkflowSupported("code-review")).to.equal(true)
expect(isDeterministicPlaceholderWorkflowSupported("dev-story")).to.equal(true)
expect(isDeterministicPlaceholderWorkflowSupported("review-edge-case-hunter.md")).to.equal(false)
```

with:

```ts
expect(isDeterministicPlaceholderWorkflowSupported("code-review.md")).to.equal(true)
expect(isDeterministicPlaceholderWorkflowSupported("dev-story.md")).to.equal(true)
expect(isDeterministicPlaceholderWorkflowSupported("code-review")).to.equal(false)
expect(isDeterministicPlaceholderWorkflowSupported("dev-story")).to.equal(false)
expect(isDeterministicPlaceholderWorkflowSupported("review-edge-case-hunter.md")).to.equal(false)
```

Then update every `workflowName: "code-review"` in this file to `workflowName: "code-review.md"`.

Then update every `workflowName: "dev-story"` in this file to `workflowName: "dev-story.md"`.

Do not change the test titles in this file.

#### 18B. Update focus-chain placeholder prompt tests to use canonical `.md` names.

In [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts):

- At [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L45), change:

```ts
taskState.activePlaceholderWorkflowId = "code-review"
```

to:

```ts
taskState.activePlaceholderWorkflowId = "code-review.md"
```

- At [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L48), change:

```ts
name: "code-review",
```

to:

```ts
name: "code-review.md",
```

Apply that same canonical replacement to every remaining occurrence in this file for:
- `activePlaceholderWorkflowId = "code-review"`
- `name: "code-review"`
- `workflowName: "code-review"`

Every one of those values in this file must become `code-review.md`.

Do not change:
- the `workflowPath` file name `code-review.md`
- any prompt assertions
- any test titles

#### 18C. Update placeholder persistence tests to use canonical `.md` names.

In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts):

Apply these canonical replacements everywhere they appear in this file:

- `workflowName: "code-review"` -> `workflowName: "code-review.md"`
- `activePlaceholderWorkflowId: "code-review"` -> `activePlaceholderWorkflowId: "code-review.md"`
- `name: "code-review"` -> `name: "code-review.md"`
- `workflowId: "code-review"` -> `workflowId: "code-review.md"`
- `activeAgentInvokedSlashCommand` expectations that currently assert `"code-review"` -> `"code-review.md"`

Do not change:
- remote workflow contents
- test titles
- non-code-review values such as `remote-review`

#### 18D. Update the subagent handler regression test to use the canonical code-review name.

In [SubagentToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts#L441-L447):

Replace:

```ts
taskState.activePlaceholderWorkflowId = "code-review"
taskState.activePlaceholderWorkflowSource = {
	type: "remote",
	name: "code-review",
	contents: "",
}
```

with:

```ts
taskState.activePlaceholderWorkflowId = "code-review.md"
taskState.activePlaceholderWorkflowSource = {
	type: "remote",
	name: "code-review.md",
	contents: "",
}
```

Do not change the test title or the stubbed subagent result payloads.

### Pause Point 18

Stop after Step 18 and report:
- the exact new support expectations added for bare-name rejection in `deterministicPlaceholderProgression.test.ts`
- confirmation that all code-review canonical test values now use `code-review.md`
- confirmation that all dev-story canonical test values now use `dev-story.md`

Do not proceed until this checkpoint is reviewed.

## [x] Remediation Step 19: Validate Canonical `.md` Deterministic Workflow Support

### Allowed Files

- no source edits unless a validation failure directly identifies a defect in one of the files allowed by Steps 17-18

### Exact Commands

Run exactly these commands, in this order:

1. `npm run test:unit -- --exit src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
2. `npm run test:unit -- --exit src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
3. `npm run test:unit -- --exit src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
4. `npm run test:unit -- --exit src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts`

If all four pass, stop.

If any command fails:
- fix only the files already listed in Steps 17-18
- rerun only the failing command until it passes
- then rerun all four commands in the original order

Do not update snapshots during this addendum. If any snapshot changes are suggested, stop and ask for input before proceeding.

### Pause Point 19

Stop after Step 19 and report:
- the pass/fail result for each command in order
- any files changed during validation repair, if any
- confirmation that no snapshots were updated

Do not proceed beyond this addendum.
