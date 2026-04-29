# Foundational Build Test 1

This document defines the correct targeted validation approach for the work tracked in [foundational-build-implementation-order.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md). It replaces the invalid earlier run that used stale and nonexistent test paths.

## Selection Rules

1. Use the latest row for each test/spec file in `foundational-build-implementation-order.md` as the source of truth.
2. Include a test in the runnable set only if its latest row is `Status: complete`.
3. Exclude any file whose latest row prescribes deleting the file. Validate those rows by confirming absence on disk, not by trying to run the deleted test.
4. Exclude any file whose latest row is still `Status: pending`.
5. Exclude any file that is absent on disk even if its latest row is `Status: complete`; those rows are not runnable until the doc and filesystem are reconciled.
6. Run `npm run protos` before root/backend unit tests so generated `@shared/proto/...` modules exist.
7. Split validation by runner:
   - repo-root/backend tests: `npm run test:unit -- ...`
   - webview tests: `cd webview-ui && npm run test -- ...`
8. Do not use `npm run test` for this checkpoint. That is a full-suite entrypoint, not the targeted foundational-build validation set.

## Current Runnable Backend Validation Set

Latest complete rows that still exist on disk:

- line `2848`: `src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts`
- line `2902`: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- line `3090`: `src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts`
- line `3210`: `src/core/task/focus-chain/__tests__/diagnostics.test.ts`
- line `3255`: `src/core/slash-commands/__tests__/index.test.ts`
- line `3320`: `src/test/slash-commands.test.ts`
- line `3378`: `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- line `3605`: `src/core/task/__tests__/prompt-refresh.test.ts`
- line `3686`: `src/core/prompts/system-prompt/__tests__/PromptBuilder.test.ts`
- line `3695`: `src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
- line `3920`: `src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`
- line `4188`: `src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`
- line `4220`: `src/core/task/workflow-form/__tests__/schema.test.ts`
- line `4301`: `src/core/controller/task/__tests__/submitWorkflowStartCard.test.ts`
- line `4321`: `src/core/prompts/system-prompt/__tests__/spec.test.ts`
- line `4409`: `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
- line `4517`: `src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`
- line `4638`: `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- line `4649`: `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`
- line `4663`: `src/core/prompts/system-prompt/__tests__/integration.test.ts`
- line `4822`: `src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts`

Run them with:

```bash
npm run protos
npm run test:unit -- \
  src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts \
  src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts \
  src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts \
  src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts \
  src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts \
  src/core/task/focus-chain/__tests__/diagnostics.test.ts \
  src/core/slash-commands/__tests__/index.test.ts \
  src/test/slash-commands.test.ts \
  src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts \
  src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts \
  src/core/task/__tests__/prompt-refresh.test.ts \
  src/core/prompts/system-prompt/__tests__/integration.test.ts \
  src/core/prompts/system-prompt/__tests__/PromptBuilder.test.ts \
  src/core/prompts/system-prompt/__tests__/response_tools.test.ts \
  src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts \
  src/core/task/workflow-form/__tests__/schema.test.ts \
  src/core/controller/task/__tests__/submitWorkflowStartCard.test.ts \
  src/core/prompts/system-prompt/__tests__/spec.test.ts \
  src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts \
  src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts \
  src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts
```

## Current Runnable Webview Validation Set

Latest complete rows that still exist on disk:

- line `3805`: `webview-ui/src/components/chat/ChatRow.test.tsx`
- line `3841`: `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`

Run them with:

```bash
cd webview-ui
npm run test -- \
  src/components/chat/ChatRow.test.tsx \
  src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx
```

## Deletion Checks

These latest rows are complete, but their validation method is filesystem absence because the row itself deletes the test file:

- line `4356`: confirm `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts` is absent
- line `4393`: confirm `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts` is absent
- line `4401`: confirm `src/core/task/tools/handlers/__tests__/SelectTargetEpicToolHandler.test.ts` is absent
- line `4593`: confirm `src/core/task/focus-chain/__tests__/FocusChainManager.managedWorkflow.test.ts` is absent
- line `4601`: confirm `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts` is absent
- line `4768`: confirm `src/core/prompts/system-prompt/__tests__/workflowPersonaRegistry.test.ts` is absent
- line `4777`: confirm `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts` is absent
- line `4785`: confirm `src/core/task/__tests__/workflowCompletionHandler.test.ts` is absent
- line `4793`: confirm `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts` is absent
- line `4845`: confirm `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts` is absent

## Complete Rows Currently Not Runnable Because The File Is Missing

These rows are marked complete and do not prescribe deletion, but the file is not present on disk, so they must not be included in the targeted test commands:

- line `3219`: `src/core/workflows/__tests__/placeholder-workflow-rendering.test.ts`
- line `3225`: `src/core/workflows/__tests__/workflow-placeholders.test.ts`
- line `3231`: `src/core/workflows/__tests__/placeholder-workflow-step-details.test.ts`
- line `3237`: `src/core/workflows/resolution/__tests__/resolveAvailableWorkflows.test.ts`
- line `3243`: `src/core/task/__tests__/workflowCompletionRunner.test.ts`
- line `3249`: `src/core/task/bmad-agent-mode.test.ts`
- line `3588`: `src/core/task/__tests__/prompt-context.test.ts`
- line `3667`: `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- line `3788`: `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
- line `3975`: `src/core/task/tools/handlers/__tests__/buildReviewInputExtraction.test.ts`
- line `4051`: `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRegistry.test.ts`
- line `4066`: `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionTriggerRegistry.test.ts`
- line `4104`: `src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`

## Pending Rows Excluded From This Validation Pack

There are currently no latest test/spec rows with `Status: pending` in `foundational-build-implementation-order.md`.
