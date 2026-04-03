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

# Dev-Story Story Tooling High-Finding Remediation Action Plan

## Scope

This plan remediates only the high-severity runtime gap identified in the `dev-story` story tooling buildout:

- `story_task_complete` must not be able to mark a top-level story task complete while any of that task's subtasks remain unchecked.
- the current-task prompting flow must therefore remain anchored to the same top-level task until the parent row and all of its subtasks are complete in the story markdown.

This plan must not:

- change the medium finding about text-tool variants
- change contextual tool exposure
- change prompt variant configs
- change `/Users/robertboston/Documents/Cline/Workflows/dev-story.md`
- change any workflow-step prompting logic outside the exact helper and tests listed below

## Verified Live Seams

The live seams this plan must modify are:

- the current-task selector in [storyTaskDocument.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/story-tools/storyTaskDocument.ts#L175-L198), which still advances solely by the first unchecked parent task row
- the write-side mutation path in [completeStoryChecklistItem(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/story-tools/storyTaskDocument.ts#L210-L257), which currently allows direct parent completion when `storySubtaskId` is omitted
- the handler consumer in [StoryTaskCompleteToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/StoryTaskCompleteToolHandler.ts#L131-L196), which already propagates helper errors via `formatResponse.toolError(...)`
- the existing shared parser/mutator tests in [storyTaskDocument.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/story-tools/__tests__/storyTaskDocument.test.ts#L40-L101)
- the existing handler regression coverage in [DevStoryStoryTools.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts#L146-L198)

## Action Plan

[x] Step 1: Block direct parent-task completion whenever that task still has unchecked subtasks.
Allowed files: `src/core/task/story-tools/storyTaskDocument.ts`

In [storyTaskDocument.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/story-tools/storyTaskDocument.ts#L210-L257), keep `buildCurrentStoryTaskPrompt(...)` unchanged and make the entire fix inside `completeStoryChecklistItem(...)`.

Apply these exact logic changes:

- Leave the existing `storyTaskId` required check and task lookup unchanged.
- Leave the existing `storySubtaskId` branch in place as the only path that may complete a subtask and then auto-complete the parent after the final unchecked subtask is completed.
- In the `else` branch where `storySubtaskId` is omitted, replace the current unconditional parent-row completion with this exact guard:
  - if `task.subtasks.length === 0`, keep the current behavior and complete the parent task row directly
  - otherwise, compute whether any subtask under that parent still matches `/\\[ \\]/`
  - if any subtask remains unchecked, return this exact error string:

```text
Cannot complete story task <storyTaskId> directly while it still has incomplete subtasks. Complete each remaining subtask first.
```

  - interpolate the actual `storyTaskId` value into that exact sentence
  - do not mutate `updatedLines`
  - do not return a `manualPatch`
- If the parent has subtasks but all of them are already checked, allow direct parent completion and preserve the existing `manualPatch` behavior for the parent row.

Do not change:

- `buildCurrentStoryTaskPrompt(...)`
- `promptKey`
- any prompt formatting
- any note/file-list mutation logic
- any status-update logic

[x] Step 2: Add focused parser/mutator regressions for the new parent-completion guard.
Allowed files: `src/core/task/story-tools/__tests__/storyTaskDocument.test.ts`

In [storyTaskDocument.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/story-tools/__tests__/storyTaskDocument.test.ts#L73-L101), keep the existing “auto-completes the parent task after the last incomplete subtask is completed” test unchanged.

Then add these two new tests immediately after it:

1. A direct-parent-completion rejection case with unchecked subtasks:

- Use a story markdown fixture with:
  - one top-level task `- [ ] Implement prompt injection`
  - one checked subtask
  - one unchecked subtask
- Call `completeStoryChecklistItem({ storyMarkdown, storyTaskId: "1" })`
- Assert the result is exactly:

```ts
{
  error: "Cannot complete story task 1 directly while it still has incomplete subtasks. Complete each remaining subtask first.",
}
```

2. A direct-parent-completion success case for a task with no subtasks:

- Use a story markdown fixture with a single top-level task and no child checklist rows
- Call `completeStoryChecklistItem({ storyMarkdown, storyTaskId: "1" })`
- Assert the result completes only the parent row and preserves the existing `manualPatch` shape for that row

Do not modify any existing unrelated tests in this file.

[x] Step 3: Add handler-level regression coverage proving the invalid parent-completion call fails without mutating the file.
Allowed files: `src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

In [DevStoryStoryTools.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts#L146-L198), keep the existing happy-path subtask completion test unchanged.

Immediately after that test, add one new regression with these exact expectations:

- Create a story fixture where task `1` has:
  - one checked subtask
  - one unchecked subtask
- Invoke `StoryTaskCompleteToolHandler.execute(...)` with:

```ts
createStoryToolBlock("story_task_complete", {
  storyTaskId: "1",
})
```

- Assert the returned tool response is exactly:

```text
The tool execution failed with the following error:
<error>
Cannot complete story task 1 directly while it still has incomplete subtasks. Complete each remaining subtask first.
</error>
```

- Assert the story file on disk still contains:
  - the unchecked parent row `- [ ] ...`
  - the unchecked subtask row `  - [ ] ...`
- Assert:
  - `config.callbacks.ask.called === false`
  - `config.callbacks.say.called === false`
  - `config.taskState.didEditFile === false`

Do not expand this step into workspace-path stubbing, snapshot updates, or any other handler concerns.

[x] Step 4: Run the focused verification suite and update this plan’s checkboxes only after the suite passes.
Allowed files: `docs/workflow-automation/dev-story/dev-story-story-tooling-high-finding-remediation-action-plan.md`

Run this exact command from `/Users/robertboston/Documents/Cline Extension/cline`:

```bash
npm run test:unit -- src/core/task/story-tools/__tests__/storyTaskDocument.test.ts src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts --exit
```

If that command fails, stop and report the failure without making unplanned fixes.
If it passes, update this plan’s remaining `[ ]` markers to `[x]`.
