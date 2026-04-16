# Workflow Placeholders Importers

## Purpose

This document inventories the live production files that import from [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts).

It is intended to support caller-by-caller change-map cleanup for the approved deletion of that helper file.

This list excludes importer files that are themselves already slated for deletion in the migration docs and keeps only the surviving files that still need explicit rewiring away from `workflow-placeholders.ts`.

## Live Production Importers

- [brainstormingSessionFiles.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/brainstormingSessionFiles.ts#L2)
  - imports `buildWorkflowStablePlaceholders`
  - imports `resolveWorkflowPlaceholderText`

- [placeholder-workflow-rendering.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-rendering.ts#L1)
  - imports `mergeWorkflowPlaceholderMaps`
  - imports `resolveWorkflowPlaceholderText`
  - imports `WorkflowPlaceholderMap`

- [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L16)
  - imports `findUnresolvedWorkflowPlaceholders`

- [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L35)
  - imports `extractWorkflowPlaceholderKeys`

- [workflowStartRequirements.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts#L1)
  - imports `extractWorkflowPlaceholderKeys`

- [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts#L4)
  - imports `buildWorkflowStablePlaceholders`
  - imports `resolveWorkflowPlaceholderText`

## Notes

- This inventory excludes test files.
- As of `2026-04-14`, files already slated for deletion in the migration docs have been intentionally removed from this list.
- As of `2026-04-14`, no additional surviving production importers were found under `src/` beyond the entries listed above.
