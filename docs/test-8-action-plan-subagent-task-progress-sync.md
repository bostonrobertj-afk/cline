# Test 8 Action Plan: Subagent Task Progress Sync

This document tracks the remediation and implementation plan for the stale subagent focus-chain checklist problem identified in [test-8-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-8-findings.md).

# Remediation

## Subagent Task Progress Synchronization

The stale subagent checklist problem should be fixed by sharing the existing focus-chain `task_progress` update behavior between the primary-agent and subagent execution paths, rather than by re-implementing similar logic in multiple places. The current primary-agent path already applies `task_progress` updates around tool execution in [ToolExecutor.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/ToolExecutor.ts#L576) and [ToolExecutor.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/ToolExecutor.ts#L655). The subagent path already has the correct callback surface available in [SubagentRunner.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L821), but it never invokes the shared update behavior because it bypasses `ToolExecutor`.

The remediation should therefore be to extract the `task_progress` update logic out of `ToolExecutor.handleCompleteBlock()` into a shared helper, then invoke that helper from both:

- the main `ToolExecutor` path for primary agents
- the direct handler-execution path in [SubagentRunner.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L755)

This keeps the source of truth for focus-chain checklist updates in one place, fixes the missing subagent wiring, and avoids a larger architectural refactor just to restore subagent checklist freshness.

The helper should preserve current behavior for:

- extracting `task_progress` from tool params
- calling `updateFCListFromToolResponse(...)`
- respecting accepted/rejected/invalid update outcomes
- updating only the task-local focus-chain storage for the current run, so subagent checklist files remain isolated from the parent task

This approach addresses the actual deficiency directly:

- subagent markdown checklist files will update when subagent tools send `task_progress`
- subsequent subagent workflow/focus-chain prompts will reflect the new checklist state instead of repeating stale step details
- primary-agent behavior remains consistent because both paths now use the same update helper

# Action Plan

## Build & Deploy Subagent Task Progress Sync

1. Extract the existing focus-chain `task_progress` update logic out of [ToolExecutor.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/ToolExecutor.ts#L576) and [ToolExecutor.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/ToolExecutor.ts#L655) into a shared helper.

2. Save that helper in a shared location near task execution/focus-chain behavior, for example:
   - `src/core/task/focus-chain/updateFromToolResponse.ts`
   - or `src/core/task/tools/utils/taskProgressUpdate.ts`

3. Design the helper so it accepts the minimum shared inputs needed by both call sites:
   - the candidate `task_progress` value from tool params
   - the `updateFCListFromToolResponse(...)` callback
   - any tool metadata needed to preserve current pre/post execution semantics

4. Update `ToolExecutor` to call the shared helper instead of keeping its own inline `task_progress` handling logic.
   - this should preserve current primary-agent behavior exactly
   - do not change the meaning of valid/invalid/rejected focus-chain updates in the main task path

5. Update [SubagentRunner.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts) so the live subagent tool-execution path invokes the same shared helper around `handler.execute(...)`.
   - this should happen in the real execution path, not only in tests or callback setup
   - it should use the subagent-local `updateFCListFromToolResponse(...)` callback already provided in the subagent task config

6. Keep the write target task-local.
   - the helper must update the current run’s focus-chain storage only
   - subagent checklist markdown files must remain isolated from the parent task’s focus-chain file

7. Add or update primary-agent regression tests to ensure the shared-helper extraction does not change existing `task_progress` behavior for normal tool execution.

8. Add a real subagent run-loop test proving that a subagent tool call carrying `task_progress` updates the subagent markdown checklist file through the live execution path.
   - do not rely only on the existing callback-isolation test
   - the test should exercise the same path that currently bypasses `ToolExecutor`

9. Add a follow-up subagent test proving that after the checklist file updates, subsequent workflow/focus-chain prompt generation reflects the new checklist state rather than stale Step 1 content.

10. Manual verification after implementation:
    - run a subagent inside a placeholder workflow
    - have it send `task_progress` on a tool call
    - confirm the subagent focus-chain markdown file updates immediately
    - confirm the next injected workflow/current-step prompt reflects the updated checklist state

11. Acceptance criteria:
    - primary-agent `task_progress` behavior is unchanged
    - subagent tool calls with `task_progress` update their own focus-chain markdown files
    - subagent prompt injections reflect refreshed checklist state after those updates
    - no duplicate task-progress logic exists separately in `ToolExecutor` and `SubagentRunner`
