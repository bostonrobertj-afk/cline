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
